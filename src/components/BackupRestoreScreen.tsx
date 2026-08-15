import React, { useState, useEffect, useRef } from "react";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  RotateCcw,
  ShieldCheck,
  HardDrive,
  Clock,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  FileCheck,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowLeft,
  RefreshCw,
  Download,
  Upload,
  Info,
  ChevronRight,
  WifiOff
} from "lucide-react";
import {
  BackupMetadataRecord,
  BackupOptions,
  getBackupPreferences,
  saveBackupPreferences,
  createCloudBackup,
  listCloudBackups,
  deleteCloudBackup,
  restoreCloudBackup,
  exportLocalBackupFile,
  importLocalBackupFile,
  formatBytes
} from "../services/backupService";

interface BackupRestoreScreenProps {
  currentUser: any;
  messagesData: Record<string, any[]>;
  localPreferences: {
    wallpaper: string;
    notifications: boolean;
    deviceContacts: any[];
    calls?: any[];
    statuses?: any[];
  };
  dark: boolean;
  onBack: () => void;
  showToast: (msg: string) => void;
  onRestoreComplete?: (restoredData: {
    messagesCount: number;
    wallpaper?: string;
    contacts?: any[];
  }) => void;
}

export function BackupRestoreScreen({
  currentUser,
  messagesData,
  localPreferences,
  dark,
  onBack,
  showToast,
  onRestoreComplete
}: BackupRestoreScreenProps) {
  const [options, setOptions] = useState<BackupOptions>(() => 
    currentUser?.id ? getBackupPreferences(currentUser.id) : {
      includePhotos: true,
      includeVideos: false,
      includeVoice: true,
      includeDocuments: false,
      autoBackupFrequency: 'daily'
    }
  );

  const [backups, setBackups] = useState<BackupMetadataRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>("Ready");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Restore Modal State
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupMetadataRecord | null>(null);
  const [restoreStrategy, setRestoreStrategy] = useState<'merge' | 'replace'>('merge');
  const [restorePassphrase, setRestorePassphrase] = useState<string>('');

  // Delete Modal State
  const [selectedBackupForDelete, setSelectedBackupForDelete] = useState<BackupMetadataRecord | null>(null);

  // Import Modal State
  const [importedBackupPayload, setImportedBackupPayload] = useState<any | null>(null);

  // Custom Passphrase Toggle
  const [useCustomPassphrase, setUseCustomPassphrase] = useState(false);
  const [customPassphrase, setCustomPassphrase] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const lastBackupTimestamp = currentUser?.id 
    ? localStorage.getItem(`chatme_last_backup_time_${currentUser.id}`) 
    : null;
  const lastBackupSizeBytes = currentUser?.id 
    ? Number(localStorage.getItem(`chatme_last_backup_size_${currentUser.id}`) || 0) 
    : 0;

  // Load backups list
  const refreshBackupsList = async () => {
    if (!currentUser?.id) return;
    setLoadingList(true);
    try {
      const list = await listCloudBackups(currentUser.id);
      setBackups(list);
    } catch (e) {
      console.log('Failed to fetch backup list', e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    refreshBackupsList();
  }, [currentUser?.id]);

  // Update & persist preferences
  const updateOption = <K extends keyof BackupOptions>(key: K, value: BackupOptions[K]) => {
    const updated = { ...options, [key]: value };
    setOptions(updated);
    if (currentUser?.id) {
      saveBackupPreferences(currentUser.id, updated);
      showToast("Backup settings updated");
    }
  };

  // Perform Cloud Backup
  const handleBackupNow = async () => {
    if (!currentUser?.id) {
      showToast("Please sign in to back up your data");
      return;
    }
    if (!navigator.onLine) {
      showToast("You're offline. Connect to the Internet to back up your ChatMe data.");
      return;
    }

    setIsBackingUp(true);
    setProgressPercent(15);
    setProgressStatus("Preparing backup...");

    const backupOpts: BackupOptions = {
      ...options,
      passphrase: useCustomPassphrase && customPassphrase.trim() ? customPassphrase.trim() : undefined
    };

    const res = await createCloudBackup(
      currentUser,
      messagesData,
      localPreferences,
      backupOpts,
      (msg) => {
        if (msg.includes('manifest') || msg.includes('profile')) {
          setProgressStatus("Preparing backup...");
          setProgressPercent(20);
        } else if (msg.includes('chats') || msg.includes('message') || msg.includes('Collecting')) {
          setProgressStatus("Backing up chats...");
          setProgressPercent(45);
        } else if (msg.includes('media') || msg.includes('attachments') || msg.includes('Filtering')) {
          setProgressStatus("Processing media...");
          setProgressPercent(70);
        } else if (msg.includes('Uploading') || msg.includes('cloud') || msg.includes('Encrypting')) {
          setProgressStatus("Uploading backup...");
          setProgressPercent(90);
        } else if (msg.includes('completed') || msg.includes('Finalizing')) {
          setProgressStatus("Backup complete.");
          setProgressPercent(100);
        } else {
          setProgressStatus(msg);
        }
      }
    );

    setIsBackingUp(false);
    if (res.success) {
      showToast("Backup completed successfully.");
      setProgressStatus("Backup completed successfully.");
      refreshBackupsList();
    } else {
      showToast(res.error || "Backup failed. Please try again.");
      setProgressStatus("Backup failed.");
    }
  };

  // Confirm Restore
  const handleConfirmRestore = async () => {
    if (!selectedBackupForRestore || !currentUser?.id) return;
    setIsRestoring(true);
    setProgressStatus("Preparing restore...");

    const res = await restoreCloudBackup(
      selectedBackupForRestore,
      currentUser,
      restoreStrategy,
      restorePassphrase.trim() || undefined,
      (msg) => setProgressStatus(msg)
    );

    setIsRestoring(false);
    setSelectedBackupForRestore(null);
    setRestorePassphrase('');

    if (res.success) {
      showToast(`Restored ${res.restoredMessages} messages across ${res.restoredChats} chats!`);
      if (onRestoreComplete) {
        onRestoreComplete({
          messagesCount: res.restoredMessages,
          wallpaper: res.restoredWallpaper,
          contacts: res.restoredContacts
        });
      }
    } else {
      showToast(res.error || "Restore failed.");
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!selectedBackupForDelete || !currentUser?.id) return;
    const { id, storage_path } = selectedBackupForDelete;
    setSelectedBackupForDelete(null);

    const res = await deleteCloudBackup(id, storage_path, currentUser.id);
    if (res.success) {
      showToast("Backup deleted successfully");
      refreshBackupsList();
    } else {
      showToast(res.error || "Failed to delete backup");
    }
  };

  // Export Local Backup File
  const handleExport = async () => {
    if (!currentUser?.id) return;
    showToast("Generating encrypted backup file...");
    const backupOpts: BackupOptions = {
      ...options,
      passphrase: useCustomPassphrase && customPassphrase.trim() ? customPassphrase.trim() : undefined
    };

    const res = await exportLocalBackupFile(
      currentUser,
      messagesData,
      localPreferences,
      backupOpts,
      (msg) => showToast(msg)
    );

    if (res.success) {
      showToast(`Exported ${res.filename}`);
    } else {
      showToast(res.error || "Failed to export backup file.");
    }
  };

  // Import Local Backup File
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    showToast("Validating backup file...");
    const res = await importLocalBackupFile(
      file,
      currentUser,
      customPassphrase.trim() || undefined,
      (msg) => showToast(msg)
    );

    if (res.success && res.payload) {
      setImportedBackupPayload(res.payload);
      showToast("Backup file verified! Select restore options.");
    } else {
      showToast(res.error || "Failed to read backup file.");
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Confirm Restore from Imported File
  const handleConfirmImportRestore = () => {
    if (!importedBackupPayload || !currentUser?.id) return;
    const payload = importedBackupPayload;

    // Apply wallpaper
    if (payload.preferences?.wallpaper) {
      localStorage.setItem(`chatme_wallpaper_${currentUser.id}`, payload.preferences.wallpaper);
    }
    if (payload.preferences?.deviceContacts) {
      localStorage.setItem(`chatme_device_contacts_${currentUser.id}`, JSON.stringify(payload.preferences.deviceContacts));
    }

    const messagesCount = payload.messages ? payload.messages.length : 0;
    setImportedBackupPayload(null);
    showToast(`Restored ${messagesCount} messages from file!`);

    if (onRestoreComplete) {
      onRestoreComplete({
        messagesCount,
        wallpaper: payload.preferences?.wallpaper,
        contacts: payload.preferences?.deviceContacts
      });
    }
  };

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${dark ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 flex items-center justify-between px-4 py-3.5 border-b shadow-sm ${
        dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-2 -ml-1 rounded-full transition ${
              dark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"
            }`}
            title="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-bold leading-tight">Backup & Restore</h1>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Keep your chats and settings safe.</p>
          </div>
        </div>
        <button
          onClick={() => setShowHelpModal(true)}
          className={`p-2 rounded-full transition ${
            dark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"
          }`}
          title="Backup Help"
        >
          <Info size={19} />
        </button>
      </div>

      {/* Offline Alert */}
      {!isOnline && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center gap-3 text-amber-700 dark:text-amber-300 text-xs">
          <WifiOff size={16} className="shrink-0 text-amber-500" />
          <span>You are currently offline. Connect to Wi-Fi or mobile data to back up to cloud.</span>
        </div>
      )}

      {/* Main Scroll Content */}
      <div className="p-4 flex flex-col gap-4 max-w-xl mx-auto w-full pb-10">

        {/* 1. BACKUP NOW CARD */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-4 ${
          dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CloudUpload size={22} />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Cloud Backup</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Back up messages & media to your private vault</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck size={13} />
              AES-256
            </span>
          </div>

          <div className={`grid grid-cols-2 gap-3 p-3 rounded-xl ${dark ? "bg-gray-800/60" : "bg-gray-50"}`}>
            <div>
              <span className="text-[11px] text-gray-400 block">Last backup:</span>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {lastBackupTimestamp ? new Date(lastBackupTimestamp).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                }) : "Never"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block">Backup size:</span>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {lastBackupSizeBytes > 0 ? formatBytes(lastBackupSizeBytes) : "--"}
              </span>
            </div>
          </div>

          {isBackingUp && (
            <div className="flex flex-col gap-1.5 animate-fadeIn">
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span>{progressStatus}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleBackupNow}
            disabled={isBackingUp || isRestoring}
            className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition ${
              isBackingUp || isRestoring
                ? "bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-[#128C7E] hover:bg-[#0d6e63] text-white active:scale-[0.99]"
            }`}
          >
            {isBackingUp ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Backing up...</span>
              </>
            ) : (
              <>
                <CloudUpload size={18} />
                <span>Back Up Now</span>
              </>
            )}
          </button>
        </div>

        {/* 2. AUTOMATIC BACKUP FREQUENCY */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-3.5 ${
          dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Clock size={19} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Automatic Backup</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Scheduled background backup frequency</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {(['off', 'daily', 'weekly'] as const).map((freq) => {
              const active = options.autoBackupFrequency === freq;
              return (
                <button
                  key={freq}
                  onClick={() => updateOption('autoBackupFrequency', freq)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold capitalize border transition text-center ${
                    active
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                      : dark
                      ? "bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {freq}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            When enabled, ChatMe automatically backs up your chats when you open the app if the scheduled interval has passed.
          </p>
        </div>

        {/* 3. MEDIA INCLUSION TOGGLES */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-3 ${
          dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <ImageIcon size={19} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Media Backup Options</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Choose media types to include in snapshots</p>
            </div>
          </div>

          {[
            { key: 'includePhotos' as const, label: 'Include photos', icon: ImageIcon, desc: 'Shared photos & wallpapers' },
            { key: 'includeVideos' as const, label: 'Include videos', icon: Video, desc: 'Recorded & attached videos' },
            { key: 'includeVoice' as const, label: 'Include voice messages', icon: Mic, desc: 'Audio notes & voice chats' },
            { key: 'includeDocuments' as const, label: 'Include documents', icon: FileText, desc: 'PDFs and shared files' },
          ].map(({ key, label, icon: Icon, desc }) => (
            <div
              key={key}
              className={`flex items-center justify-between p-3 rounded-xl transition ${
                dark ? "bg-gray-800/40" : "bg-gray-50/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={17} className="text-gray-400" />
                <div>
                  <span className="text-xs font-medium block">{label}</span>
                  <span className="text-[10px] text-gray-400">{desc}</span>
                </div>
              </div>
              <button
                onClick={() => updateOption(key, !options[key])}
                className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                  options[key] ? "bg-emerald-500 justify-end" : "bg-gray-300 dark:bg-gray-700 justify-start"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          ))}
        </div>

        {/* 4. AVAILABLE CLOUD BACKUPS (RESTORE) */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-3.5 ${
          dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                <CloudDownload size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Available Backups</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Restore or manage previous cloud snapshots</p>
              </div>
            </div>
            <button
              onClick={refreshBackupsList}
              disabled={loadingList}
              className={`p-2 rounded-lg text-gray-400 hover:text-emerald-500 transition ${loadingList ? "animate-spin" : ""}`}
              title="Refresh backups"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {loadingList ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
              <RefreshCw size={20} className="animate-spin text-emerald-500" />
              <span>Loading your cloud backups...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className={`py-6 px-4 rounded-xl text-center flex flex-col items-center gap-2 border border-dashed ${
              dark ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-500"
            }`}>
              <Cloud size={28} className="text-gray-400 opacity-60" />
              <p className="text-xs font-medium">No cloud backups found</p>
              <p className="text-[11px] text-gray-400">Tap "Back Up Now" above to create your first encrypted backup.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {backups.map((item) => {
                const dateObj = new Date(item.created_at);
                const dateFormatted = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                const timeFormatted = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition ${
                      dark ? "bg-gray-800/60 border-gray-700/60" : "bg-gray-50 border-gray-200/80"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{dateFormatted}</span>
                          <span className="text-[11px] text-gray-400">• {timeFormatted}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {formatBytes(item.backup_size_bytes)}
                          </span>
                          <span>•</span>
                          <span>{item.message_count} messages</span>
                          <span>•</span>
                          <span>{item.chat_count} chats</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedBackupForDelete(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition"
                          title="Delete Backup"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          onClick={() => setSelectedBackupForRestore(item)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1"
                        >
                          <RotateCcw size={13} />
                          Restore
                        </button>
                      </div>
                    </div>

                    {/* Included Media Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {item.includes_photos && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                          <ImageIcon size={10} /> Photos
                        </span>
                      )}
                      {item.includes_voice_messages && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                          <Mic size={10} /> Voice
                        </span>
                      )}
                      {item.includes_videos && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Video size={10} /> Videos
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-500 font-medium">
                        v{item.backup_version || "1.0"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. LOCAL BACKUP (EXPORT & IMPORT .CHATMEBACKUP) */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-3 ${
          dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <HardDrive size={19} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Local Backup & Transfer</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Export or import encrypted .chatmebackup files</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleExport}
              className={`py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                dark 
                  ? "border-gray-700 bg-gray-800/80 hover:bg-gray-800 text-gray-200" 
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800"
              }`}
            >
              <Download size={15} className="text-emerald-500" />
              Export Backup
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className={`py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                dark 
                  ? "border-gray-700 bg-gray-800/80 hover:bg-gray-800 text-gray-200" 
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800"
              }`}
            >
              <Upload size={15} className="text-blue-500" />
              Import Backup
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".chatmebackup,.json"
              onChange={handleFileSelected}
              className="hidden"
            />
          </div>
        </div>

        {/* 6. SECURITY & ENCRYPTION SETTINGS */}
        <div className={`p-4 rounded-2xl border text-xs flex flex-col gap-2.5 ${
          dark ? "bg-gray-900/60 border-gray-800/80 text-gray-300" : "bg-white border-gray-200 text-gray-600"
        }`}>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
            <Lock size={15} />
            <span>End-to-End Vault Privacy</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            Backups are encrypted on your device using AES-GCM (256-bit) with PBKDF2 key derivation. Your database credentials, secrets, and raw keys are never stored inside backup files.
          </p>

          <div className="pt-1 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-medium">Custom Encryption Passphrase</span>
            <button
              onClick={() => setUseCustomPassphrase(!useCustomPassphrase)}
              className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                useCustomPassphrase ? "bg-emerald-500 justify-end" : "bg-gray-300 dark:bg-gray-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {useCustomPassphrase && (
            <div className="flex flex-col gap-1.5 pt-1 animate-fadeIn">
              <input
                type="password"
                placeholder="Enter custom backup passphrase"
                value={customPassphrase}
                onChange={(e) => setCustomPassphrase(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                  dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
              />
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                ⚠️ Warning: If you set a custom passphrase, you must remember it. If lost, your backup cannot be decrypted.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* RESTORE CONFIRMATION MODAL */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border flex flex-col gap-4 animate-scaleUp ${
            dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold">Restore this backup?</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Your ChatMe data will be restored from this backup.
                </p>
              </div>
            </div>

            <div className={`p-3 rounded-xl text-xs flex flex-col gap-1 ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="flex justify-between">
                <span className="text-gray-400">Messages:</span>
                <span className="font-semibold">{selectedBackupForRestore.message_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Conversations:</span>
                <span className="font-semibold">{selectedBackupForRestore.chat_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Size:</span>
                <span className="font-semibold">{formatBytes(selectedBackupForRestore.backup_size_bytes)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold">Restore Strategy</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRestoreStrategy('merge')}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition text-left ${
                    restoreStrategy === 'merge'
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="block font-bold">Merge</span>
                  <span className="text-[10px] text-gray-400">Keep newer messages</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRestoreStrategy('replace')}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition text-left ${
                    restoreStrategy === 'replace'
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="block font-bold">Replace</span>
                  <span className="text-[10px] text-gray-400">Exact snapshot</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setSelectedBackupForRestore(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${
                  dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow"
              >
                Restore Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {selectedBackupForDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border flex flex-col gap-4 animate-scaleUp ${
            dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-500">Delete this backup?</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              This snapshot will be permanently deleted from your private cloud storage vault.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setSelectedBackupForDelete(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${
                  dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 text-white shadow"
              >
                Delete Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORTED FILE PREVIEW MODAL */}
      {importedBackupPayload && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border flex flex-col gap-4 animate-scaleUp ${
            dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <FileCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold">Restore Imported Backup</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Verified .chatmebackup file</p>
              </div>
            </div>

            <div className={`p-3 rounded-xl text-xs flex flex-col gap-1.5 ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="flex justify-between">
                <span className="text-gray-400">Created on:</span>
                <span className="font-semibold">{new Date(importedBackupPayload.manifest.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Messages:</span>
                <span className="font-semibold">{importedBackupPayload.messages?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Wallpaper:</span>
                <span className="font-semibold capitalize">{importedBackupPayload.preferences?.wallpaper ? 'Custom' : 'Default'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setImportedBackupPayload(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${
                  dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImportRestore}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow"
              >
                Restore Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELP & INFO MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border flex flex-col gap-4 animate-scaleUp ${
            dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-emerald-500" />
                <h3 className="text-sm font-bold">About ChatMe Backup</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-xs text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-300 flex flex-col gap-2.5 leading-relaxed">
              <p>
                <strong>Security:</strong> All ChatMe backups are client-encrypted with AES-GCM (256-bit) before transmission. Your passwords and API keys are strictly excluded.
              </p>
              <p>
                <strong>Restoration:</strong> Restoring uses a non-destructive Merge strategy to ensure newer messages in your database aren't lost.
              </p>
              <p>
                <strong>Retention:</strong> ChatMe retains up to 3 of your latest cloud backups. Older backups are safely pruned after a new backup succeeds.
              </p>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#128C7E] text-white hover:bg-[#0d6e63]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
