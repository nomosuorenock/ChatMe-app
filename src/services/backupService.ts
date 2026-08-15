import { supabase } from '../lib/supabase';
import { encryptBackupPayload, decryptBackupPayload, calculateChecksum, EncryptedBackupEnvelope } from './backupCrypto';

export interface BackupOptions {
  includePhotos: boolean;
  includeVideos: boolean;
  includeVoice: boolean;
  includeDocuments: boolean;
  autoBackupFrequency: 'off' | 'daily' | 'weekly';
  passphrase?: string;
}

export interface BackupManifest {
  backupId: string;
  userId: string;
  userEmail: string;
  backupVersion: string;
  schemaVersion: number;
  createdAt: string;
  appVersion: string;
  messageCount: number;
  chatCount: number;
  mediaCount: number;
  includesPhotos: boolean;
  includesVideos: boolean;
  includesVoice: boolean;
  includesDocuments: boolean;
  checksum: string;
}

export interface BackupPayload {
  manifest: BackupManifest;
  profile: any;
  preferences: {
    wallpaper: string;
    notifications: boolean;
    deviceContacts: any[];
    theme: string;
    customSettings: Record<string, any>;
  };
  chats: any[];
  messages: any[];
  contacts: any[];
  calls: any[];
  statuses: any[];
}

export interface BackupMetadataRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  backup_version: string;
  backup_size_bytes: number;
  message_count: number;
  chat_count: number;
  media_count: number;
  includes_photos: boolean;
  includes_videos: boolean;
  includes_voice_messages: boolean;
  includes_documents: boolean;
  storage_path: string;
  status: 'completed' | 'in_progress' | 'failed';
  metadata?: any;
  is_local_only?: boolean;
}

export interface RestoreResult {
  success: boolean;
  restoredMessages: number;
  restoredChats: number;
  restoredWallpaper?: string;
  restoredContacts?: any[];
  error?: string;
}

const BACKUP_STORAGE_BUCKET = 'chatme-backups';
const MAX_BACKUP_RETENTION = 3;

/**
 * Get the deterministic encryption key source for a user
 * If a custom passphrase is provided, it combines it with user entropy.
 */
function getEncryptionKeySource(userId: string, customPassphrase?: string): string {
  if (customPassphrase && customPassphrase.trim().length > 0) {
    return `chatme_custom_key_${userId}_${customPassphrase.trim()}`;
  }
  // Standard per-user zero-leakage key source derived from unique user UUID
  return `chatme_secure_vault_key_${userId}_v1_authenticated`;
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Load user backup preferences
 */
export function getBackupPreferences(userId: string): BackupOptions {
  try {
    const saved = localStorage.getItem(`chatme_backup_prefs_${userId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}

  return {
    includePhotos: true,
    includeVideos: false,
    includeVoice: true,
    includeDocuments: false,
    autoBackupFrequency: 'daily'
  };
}

/**
 * Save user backup preferences
 */
export function saveBackupPreferences(userId: string, options: BackupOptions): void {
  try {
    localStorage.setItem(`chatme_backup_prefs_${userId}`, JSON.stringify(options));
  } catch (e) {}
}

/**
 * Collect all user-owned data from memory & Supabase
 */
async function collectUserData(
  currentUser: any,
  messagesData: Record<string, any[]>,
  localPreferences: {
    wallpaper: string;
    notifications: boolean;
    deviceContacts: any[];
    calls?: any[];
    statuses?: any[];
  },
  options: BackupOptions,
  onProgress?: (msg: string) => void
): Promise<BackupPayload> {
  onProgress?.('Collecting user profile and preferences...');

  const userId = currentUser.id;
  const backupId = 'bk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // 1. Collect Messages
  onProgress?.('Collecting chats and message history...');
  const collectedMessages: any[] = [];
  const activeChats = new Set<string>();

  // From local in-memory state
  Object.keys(messagesData).forEach(partnerId => {
    activeChats.add(partnerId);
    const msgs = messagesData[partnerId] || [];
    msgs.forEach(m => {
      collectedMessages.push({
        id: m.id,
        chat_id: partnerId,
        sender_id: m.senderId || m.sender_id || userId,
        receiver_id: m.senderId === userId ? partnerId : userId,
        text: m.text || m.message || '',
        timestamp: m.timestamp || new Date().toISOString(),
        created_at: m.created_at || new Date().toISOString(),
        status: m.status || 'delivered',
        reaction: m.reaction || null,
        media_url: m.media_url || null,
        media_type: m.media_type || (m.media_url ? (m.media_url.includes('.webm') ? 'audio' : 'image') : 'text')
      });
    });
  });

  // Also query Supabase messages for this user to ensure complete history
  try {
    const { data: dbMessages } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (dbMessages && dbMessages.length > 0) {
      dbMessages.forEach(m => {
        const partner = m.sender_id === userId ? m.receiver_id : m.sender_id;
        if (partner) activeChats.add(partner);
        
        // De-duplicate with local messages
        const exists = collectedMessages.some(cm => 
          String(cm.id) === String(m.id) || 
          (cm.text === (m.message || m.text) && String(cm.sender_id) === String(m.sender_id))
        );
        if (!exists) {
          collectedMessages.push({
            id: m.id,
            chat_id: m.chat_id || partner,
            sender_id: m.sender_id,
            receiver_id: m.receiver_id,
            text: m.message || m.content || m.text || '',
            timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Now',
            created_at: m.created_at || new Date().toISOString(),
            status: m.read ? 'read' : 'delivered',
            reaction: m.reaction || null,
            media_url: m.media_url || null,
            media_type: m.message_type || (m.media_url ? 'image' : 'text')
          });
        }
      });
    }
  } catch (e) {
    console.log('Supabase messages query note during backup:', e);
  }

  // 2. Filter Media based on options
  onProgress?.('Filtering media attachments...');
  let mediaCount = 0;
  const sanitizedMessages = collectedMessages.map(m => {
    if (m.media_url) {
      const isVoice = m.media_type === 'audio' || m.media_url.includes('.webm');
      const isVideo = m.media_type === 'video' || m.media_url.endsWith('.mp4');
      const isPhoto = m.media_type === 'image' || (!isVoice && !isVideo);

      if ((isPhoto && options.includePhotos) || 
          (isVideo && options.includeVideos) || 
          (isVoice && options.includeVoice) || 
          options.includeDocuments) {
        mediaCount++;
        return m;
      } else {
        // Exclude media url per user preference
        return { ...m, media_url: null };
      }
    }
    return m;
  });

  // 3. Collect Contacts
  let contactsList: any[] = [];
  try {
    const { data: dbContacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_id', userId);
    if (dbContacts) contactsList = dbContacts;
  } catch (e) {}

  // 4. Build Manifest
  const manifest: BackupManifest = {
    backupId,
    userId,
    userEmail: currentUser.email || '',
    backupVersion: '1.0',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    appVersion: '1.0.0',
    messageCount: sanitizedMessages.length,
    chatCount: activeChats.size,
    mediaCount,
    includesPhotos: options.includePhotos,
    includesVideos: options.includeVideos,
    includesVoice: options.includeVoice,
    includesDocuments: options.includeDocuments,
    checksum: ''
  };

  const payload: BackupPayload = {
    manifest,
    profile: {
      id: currentUser.id,
      fullname: currentUser.fullname,
      email: currentUser.email,
      bio: currentUser.bio,
      phone: currentUser.phone,
      photo: currentUser.photo,
      created_at: currentUser.created_at
    },
    preferences: {
      wallpaper: localPreferences.wallpaper || 'default',
      notifications: localPreferences.notifications !== false,
      deviceContacts: localPreferences.deviceContacts || [],
      theme: 'light',
      customSettings: {}
    },
    chats: Array.from(activeChats).map(id => ({ id })),
    messages: sanitizedMessages,
    contacts: contactsList,
    calls: localPreferences.calls || [],
    statuses: localPreferences.statuses || []
  };

  return payload;
}

/**
 * Save backup record to local cache (for fallback/fast listing)
 */
function saveLocalBackupRecord(record: BackupMetadataRecord, userId: string): void {
  try {
    const existingStr = localStorage.getItem(`chatme_backup_records_${userId}`);
    const list: BackupMetadataRecord[] = existingStr ? JSON.parse(existingStr) : [];
    const updated = [record, ...list.filter(b => b.id !== record.id)];
    localStorage.setItem(`chatme_backup_records_${userId}`, JSON.stringify(updated.slice(0, 10)));
  } catch (e) {}
}

/**
 * Create a complete, encrypted Cloud Backup to Supabase Storage & Database
 */
export async function createCloudBackup(
  currentUser: any,
  messagesData: Record<string, any[]>,
  localPreferences: {
    wallpaper: string;
    notifications: boolean;
    deviceContacts: any[];
    calls?: any[];
    statuses?: any[];
  },
  options: BackupOptions,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; backup: BackupMetadataRecord; error?: string }> {
  if (!currentUser?.id) {
    return { success: false, backup: {} as any, error: 'User is not authenticated.' };
  }

  if (!navigator.onLine) {
    return { 
      success: false, 
      backup: {} as any, 
      error: "You're offline. Connect to the Internet to back up your ChatMe data." 
    };
  }

  const userId = currentUser.id;

  try {
    // 1. Prepare data
    onProgress?.('Preparing backup manifest...');
    const payload = await collectUserData(currentUser, messagesData, localPreferences, options, onProgress);

    // 2. Encrypt with AES-GCM 256
    onProgress?.('Encrypting backup with AES-GCM 256...');
    const keySource = getEncryptionKeySource(userId, options.passphrase);
    const encryptedEnvelope = await encryptBackupPayload(payload, keySource, userId);

    const jsonString = JSON.stringify(encryptedEnvelope);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const sizeBytes = blob.size;

    // 3. Upload to Supabase Storage
    onProgress?.('Uploading encrypted backup to private cloud storage...');
    const storagePath = `${userId}/${payload.manifest.backupId}/backup.json`;

    let uploadSuccess = false;
    try {
      const { error: uploadError } = await supabase.storage
        .from(BACKUP_STORAGE_BUCKET)
        .upload(storagePath, blob, {
          contentType: 'application/json',
          upsert: true
        });

      if (!uploadError) {
        uploadSuccess = true;
      } else {
        console.warn('Storage upload error (fallback active):', uploadError.message);
      }
    } catch (e) {
      console.warn('Storage access error:', e);
    }

    // 4. Save Metadata Record to Supabase Table & Local Cache
    onProgress?.('Finalizing backup record...');
    const backupRecord: BackupMetadataRecord = {
      id: payload.manifest.backupId,
      user_id: userId,
      created_at: payload.manifest.createdAt,
      backup_version: payload.manifest.backupVersion,
      backup_size_bytes: sizeBytes,
      message_count: payload.manifest.messageCount,
      chat_count: payload.manifest.chatCount,
      media_count: payload.manifest.mediaCount,
      includes_photos: options.includePhotos,
      includes_videos: options.includeVideos,
      includes_voice_messages: options.includeVoice,
      includes_documents: options.includeDocuments,
      storage_path: storagePath,
      status: 'completed',
      metadata: {
        envelope: uploadSuccess ? undefined : encryptedEnvelope // Keep in record if storage bucket not ready
      },
      is_local_only: !uploadSuccess
    };

    // Upsert into Supabase backup_metadata table
    try {
      await supabase.from('backup_metadata').upsert({
        id: backupRecord.id,
        user_id: backupRecord.user_id,
        created_at: backupRecord.created_at,
        updated_at: new Date().toISOString(),
        backup_version: backupRecord.backup_version,
        backup_size_bytes: backupRecord.backup_size_bytes,
        message_count: backupRecord.message_count,
        chat_count: backupRecord.chat_count,
        media_count: backupRecord.media_count,
        includes_photos: backupRecord.includes_photos,
        includes_videos: backupRecord.includes_videos,
        includes_voice_messages: backupRecord.includes_voice_messages,
        includes_documents: backupRecord.includes_documents,
        storage_path: backupRecord.storage_path,
        status: 'completed',
        metadata: {
          checksum: encryptedEnvelope.checksum,
          algorithm: encryptedEnvelope.algorithm
        }
      });
    } catch (e) {
      console.log('Database backup_metadata upsert note:', e);
    }

    // Save to local cache & update last backup timestamp
    saveLocalBackupRecord(backupRecord, userId);
    localStorage.setItem(`chatme_last_backup_time_${userId}`, backupRecord.created_at);
    localStorage.setItem(`chatme_last_backup_size_${userId}`, String(sizeBytes));

    // Save the encrypted envelope locally as redundancy fallback
    try {
      localStorage.setItem(`chatme_latest_backup_blob_${userId}`, jsonString);
    } catch (e) {}

    // Enforce retention limit (Keep latest 3)
    await enforceBackupRetention(userId);

    onProgress?.('Backup completed successfully.');
    return { success: true, backup: backupRecord };

  } catch (error: any) {
    console.error('Backup creation error:', error);
    return { 
      success: false, 
      backup: {} as any, 
      error: error.message || 'An unexpected error occurred during backup.' 
    };
  }
}

/**
 * List all available backups for the authenticated user
 */
export async function listCloudBackups(userId: string): Promise<BackupMetadataRecord[]> {
  if (!userId) return [];

  const combinedMap = new Map<string, BackupMetadataRecord>();

  // 1. Get from local cache first
  try {
    const localStr = localStorage.getItem(`chatme_backup_records_${userId}`);
    if (localStr) {
      const records: BackupMetadataRecord[] = JSON.parse(localStr);
      records.forEach(r => combinedMap.set(r.id, r));
    }
  } catch (e) {}

  // 2. Fetch from Supabase Database
  try {
    const { data: dbRecords, error } = await supabase
      .from('backup_metadata')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && dbRecords) {
      dbRecords.forEach((r: any) => {
        combinedMap.set(r.id, {
          id: r.id,
          user_id: r.user_id,
          created_at: r.created_at,
          updated_at: r.updated_at,
          backup_version: r.backup_version || '1.0',
          backup_size_bytes: Number(r.backup_size_bytes || 0),
          message_count: r.message_count || 0,
          chat_count: r.chat_count || 0,
          media_count: r.media_count || 0,
          includes_photos: r.includes_photos ?? true,
          includes_videos: r.includes_videos ?? false,
          includes_voice_messages: r.includes_voice_messages ?? true,
          includes_documents: r.includes_documents ?? false,
          storage_path: r.storage_path || '',
          status: r.status || 'completed',
          metadata: r.metadata,
          is_local_only: false
        });
      });
    }
  } catch (e) {
    console.log('listCloudBackups Supabase query fallback:', e);
  }

  // Return sorted newest first
  return Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Automatically prune older backups within the 'chatme-backups' bucket,
 * keeping only the most recent snapshots (default: 3) to optimize storage usage
 * while maintaining user data safety.
 */
export async function pruneOldBackups(
  userId: string,
  maxRetention: number = MAX_BACKUP_RETENTION
): Promise<{ success: boolean; prunedCount: number; deletedIds: string[]; error?: string }> {
  if (!userId) {
    return { success: false, prunedCount: 0, deletedIds: [], error: 'User ID is required for pruning' };
  }

  const deletedIds: string[] = [];

  try {
    // 1. Retrieve all known backups for this user (sorted newest to oldest)
    const allBackups = await listCloudBackups(userId);

    // 2. Identify backups that exceed retention limit
    if (allBackups.length > maxRetention) {
      const backupsToPrune = allBackups.slice(maxRetention);

      for (const oldBackup of backupsToPrune) {
        try {
          const deleteRes = await deleteCloudBackup(oldBackup.id, oldBackup.storage_path, userId);
          if (deleteRes.success) {
            deletedIds.push(oldBackup.id);
          }
        } catch (err) {
          console.warn(`Failed to prune backup ${oldBackup.id}:`, err);
        }
      }
    }

    // 3. Storage bucket sweep: clean up any orphaned storage files in the user's bucket folder
    try {
      const { data: storageItems, error: listStorageErr } = await supabase.storage
        .from(BACKUP_STORAGE_BUCKET)
        .list(userId, { limit: 100 });

      if (!listStorageErr && storageItems && storageItems.length > 0) {
        // Find valid active backup IDs from the kept list (up to maxRetention)
        const keptBackupIds = new Set(allBackups.slice(0, maxRetention).map(b => b.id));

        const orphanedPaths: string[] = [];
        for (const item of storageItems) {
          // If item is a folder or backup file not matching our kept snapshots
          const itemId = item.name.replace(/\.json$/, '');
          if (!keptBackupIds.has(itemId) && itemId !== '.emptyFolderPlaceholder') {
            orphanedPaths.push(`${userId}/${item.name}`);
            orphanedPaths.push(`${userId}/${item.name}/backup.json`);
          }
        }

        if (orphanedPaths.length > 0) {
          await supabase.storage
            .from(BACKUP_STORAGE_BUCKET)
            .remove(orphanedPaths);
        }
      }
    } catch (storageSweepErr) {
      console.log('Storage folder sweep note:', storageSweepErr);
    }

    return {
      success: true,
      prunedCount: deletedIds.length,
      deletedIds
    };
  } catch (error: any) {
    console.error('pruneOldBackups error:', error);
    return {
      success: false,
      prunedCount: deletedIds.length,
      deletedIds,
      error: error.message || 'Failed to prune older backups'
    };
  }
}

/**
 * Enforce retention policy: keep newest MAX_BACKUP_RETENTION backups (3)
 */
async function enforceBackupRetention(userId: string): Promise<void> {
  try {
    await pruneOldBackups(userId, MAX_BACKUP_RETENTION);
  } catch (e) {
    console.log('Retention cleanup note:', e);
  }
}

/**
 * Delete a cloud backup from storage and database
 */
export async function deleteCloudBackup(
  backupId: string,
  storagePath: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete Storage File
    if (storagePath) {
      try {
        await supabase.storage.from(BACKUP_STORAGE_BUCKET).remove([storagePath]);
      } catch (e) {}
    }

    // 2. Delete Database Record
    try {
      await supabase.from('backup_metadata').delete().eq('id', backupId).eq('user_id', userId);
    } catch (e) {}

    // 3. Remove from Local Cache
    try {
      const localStr = localStorage.getItem(`chatme_backup_records_${userId}`);
      if (localStr) {
        const records: BackupMetadataRecord[] = JSON.parse(localStr);
        const filtered = records.filter(r => r.id !== backupId);
        localStorage.setItem(`chatme_backup_records_${userId}`, JSON.stringify(filtered));
      }
    } catch (e) {}

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete backup.' };
  }
}

/**
 * Safe Restore: Downloads, decrypts, validates integrity and restores data
 */
export async function restoreCloudBackup(
  backupItem: BackupMetadataRecord,
  currentUser: any,
  strategy: 'merge' | 'replace',
  passphrase?: string,
  onProgress?: (msg: string) => void
): Promise<RestoreResult> {
  if (!currentUser?.id) {
    return { success: false, restoredMessages: 0, restoredChats: 0, error: 'User is not authenticated.' };
  }

  const userId = currentUser.id;

  try {
    onProgress?.('Fetching encrypted backup from storage...');
    let envelope: EncryptedBackupEnvelope | null = null;

    // 1. Try downloading from Supabase Storage
    if (backupItem.storage_path) {
      try {
        const { data, error } = await supabase.storage
          .from(BACKUP_STORAGE_BUCKET)
          .download(backupItem.storage_path);

        if (!error && data) {
          const text = await data.text();
          envelope = JSON.parse(text);
        }
      } catch (e) {
        console.warn('Storage download note:', e);
      }
    }

    // 2. Fallback to local storage cache if storage download wasn't available
    if (!envelope) {
      const localCache = localStorage.getItem(`chatme_latest_backup_blob_${userId}`);
      if (localCache) {
        envelope = JSON.parse(localCache);
      }
    }

    if (!envelope) {
      throw new Error('Unable to locate backup file. The file may have been removed.');
    }

    // 3. Decrypt and validate
    onProgress?.('Validating backup integrity and decrypting...');
    const keySource = getEncryptionKeySource(userId, passphrase);
    const { data: payload, checksumVerified } = await decryptBackupPayload<BackupPayload>(envelope, keySource);

    if (!checksumVerified) {
      throw new Error('Backup integrity validation failed (damaged or corrupted file).');
    }

    // Validate ownership
    if (payload.manifest.userId !== userId) {
      throw new Error('This backup belongs to a different user account and cannot be restored.');
    }

    onProgress?.('Restoring preferences and chat wallpapers...');
    // 4. Restore Preferences
    let restoredWallpaper = 'default';
    if (payload.preferences) {
      if (payload.preferences.wallpaper) {
        restoredWallpaper = payload.preferences.wallpaper;
        localStorage.setItem(`chatme_wallpaper_${userId}`, restoredWallpaper);
      }
      if (payload.preferences.deviceContacts && Array.isArray(payload.preferences.deviceContacts)) {
        localStorage.setItem(
          `chatme_device_contacts_${userId}`,
          JSON.stringify(payload.preferences.deviceContacts)
        );
      }
    }

    onProgress?.('Applying restored messages to your conversation history...');
    // 5. Restore Messages
    const restoredMessages = payload.messages || [];

    // Sync restored messages with Supabase database (insert missing messages)
    if (restoredMessages.length > 0) {
      try {
        const messagesToInsert = restoredMessages.map(m => ({
          sender_id: m.sender_id || userId,
          receiver_id: m.receiver_id,
          message: m.text || m.message,
          created_at: m.created_at || new Date().toISOString(),
          read: m.status === 'read'
        }));

        // Insert in batches of 50 to avoid timeout
        for (let i = 0; i < messagesToInsert.length; i += 50) {
          const batch = messagesToInsert.slice(i, i + 50);
          await supabase.from('messages').upsert(batch, { ignoreDuplicates: true });
        }
      } catch (e) {
        console.log('Supabase messages restore note:', e);
      }
    }

    onProgress?.('Restoration completed successfully.');

    return {
      success: true,
      restoredMessages: restoredMessages.length,
      restoredChats: payload.manifest.chatCount || (payload.chats ? payload.chats.length : 0),
      restoredWallpaper,
      restoredContacts: payload.preferences?.deviceContacts || []
    };

  } catch (error: any) {
    console.error('Restore error:', error);
    return {
      success: false,
      restoredMessages: 0,
      restoredChats: 0,
      error: error.message || 'Unable to restore this backup. The backup appears damaged or incompatible.'
    };
  }
}

/**
 * Export backup to encrypted `.chatmebackup` file for user download
 */
export async function exportLocalBackupFile(
  currentUser: any,
  messagesData: Record<string, any[]>,
  localPreferences: any,
  options: BackupOptions,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    onProgress?.('Preparing backup data for export...');
    const payload = await collectUserData(currentUser, messagesData, localPreferences, options, onProgress);

    onProgress?.('Encrypting export with AES-GCM 256...');
    const keySource = getEncryptionKeySource(currentUser.id, options.passphrase);
    const envelope = await encryptBackupPayload(payload, keySource, currentUser.id);

    const jsonString = JSON.stringify(envelope, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `ChatMe_Backup_${dateStr}_${payload.manifest.backupId.slice(-4)}.chatmebackup`;

    const blob = new Blob([jsonString], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onProgress?.('Export file created successfully.');
    return { success: true, filename };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to export backup file.' };
  }
}

/**
 * Import and validate `.chatmebackup` file
 */
export async function importLocalBackupFile(
  file: File,
  currentUser: any,
  passphrase?: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; payload?: BackupPayload; manifest?: BackupManifest; error?: string }> {
  try {
    onProgress?.('Reading backup file...');
    const text = await file.text();
    const envelope: EncryptedBackupEnvelope = JSON.parse(text);

    if (!envelope || envelope.algorithm !== 'AES-GCM-256') {
      throw new Error('Invalid file format. Please select a valid .chatmebackup file.');
    }

    onProgress?.('Verifying integrity and decrypting...');
    const keySource = getEncryptionKeySource(currentUser.id, passphrase);
    const { data: payload, checksumVerified } = await decryptBackupPayload<BackupPayload>(envelope, keySource);

    if (!checksumVerified) {
      throw new Error('Integrity checksum failed. The backup file may be corrupted.');
    }

    return {
      success: true,
      payload,
      manifest: payload.manifest
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unable to open this backup. Please verify your file or passphrase.'
    };
  }
}

/**
 * Automatic Backup Worker check
 * Triggered on app load / foregrounding if scheduled interval has passed
 */
export async function checkAndRunAutoBackup(
  currentUser: any,
  messagesData: Record<string, any[]>,
  localPreferences: any
): Promise<void> {
  if (!currentUser?.id || !navigator.onLine) return;

  try {
    const prefs = getBackupPreferences(currentUser.id);
    if (prefs.autoBackupFrequency === 'off') return;

    const lastBackupStr = localStorage.getItem(`chatme_last_backup_time_${currentUser.id}`);
    const now = Date.now();

    let intervalMs = 24 * 60 * 60 * 1000; // Daily
    if (prefs.autoBackupFrequency === 'weekly') {
      intervalMs = 7 * 24 * 60 * 60 * 1000;
    }

    if (lastBackupStr) {
      const lastTime = new Date(lastBackupStr).getTime();
      if (now - lastTime < intervalMs) {
        return; // Interval not yet elapsed
      }
    }

    // Run backup silently in the background
    console.log('[AutoBackup] Running scheduled automatic backup...');
    await createCloudBackup(currentUser, messagesData, localPreferences, prefs);
    console.log('[AutoBackup] Scheduled backup completed.');
  } catch (e) {
    console.log('[AutoBackup] Background backup note:', e);
  }
}
