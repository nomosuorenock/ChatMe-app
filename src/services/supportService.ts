import { supabase } from "../lib/supabase";

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_id: string; // user UUID or 'support-agent'
  sender_name: string;
  sender_role: 'user' | 'agent' | 'system';
  message: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface SupportConversation {
  id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  user_avatar?: string;
  status: 'open' | 'pending' | 'resolved';
  last_message?: string;
  last_message_at: string;
  created_at: string;
  unread_by_user?: number;
  unread_by_agent?: number;
}

// Local cache and storage key for persistent support sessions
const SUPPORT_STORAGE_KEY = "chatme_support_store_v1";

interface SupportStore {
  conversations: Record<string, SupportConversation>; // keyed by conversation_id
  messages: Record<string, SupportMessage[]>; // keyed by conversation_id
  userToConvMap: Record<string, string>; // keyed by user_id -> conversation_id
}

function loadLocalStore(): SupportStore {
  try {
    const raw = localStorage.getItem(SUPPORT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        conversations: parsed.conversations || {},
        messages: parsed.messages || {},
        userToConvMap: parsed.userToConvMap || {}
      };
    }
  } catch (e) {
    console.warn("Could not parse local support store", e);
  }
  return { conversations: {}, messages: {}, userToConvMap: {} };
}

function saveLocalStore(store: SupportStore) {
  try {
    localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("Could not save local support store", e);
  }
}

/**
 * Get or create a support conversation for an authenticated user UUID
 */
export async function getOrCreateSupportConversation(
  userId: string,
  userProfile?: { fullname?: string; username?: string; email?: string; photo?: string; avatar_url?: string }
): Promise<SupportConversation> {
  if (!userId) {
    throw new Error("Authenticated user ID is required for Live Support.");
  }

  // 1. Try fetching from server/Supabase proxy first
  try {
    const res = await fetch(`/api/support/conversation?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.conversation) {
        // Cache locally
        const store = loadLocalStore();
        store.conversations[data.conversation.id] = data.conversation;
        store.userToConvMap[userId] = data.conversation.id;
        saveLocalStore(store);
        return data.conversation;
      }
    }
  } catch (err) {
    // Network fallback
  }

  // 2. Local fallback / client generation
  const store = loadLocalStore();
  let convId = store.userToConvMap[userId];
  let conv = convId ? store.conversations[convId] : undefined;

  const displayName = userProfile?.fullname || userProfile?.username || "ChatMe User";
  const displayAvatar = userProfile?.photo || userProfile?.avatar_url || "";
  const displayEmail = userProfile?.email || "";

  if (!conv) {
    convId = `supp_conv_${userId}`;
    const now = new Date().toISOString();
    conv = {
      id: convId,
      user_id: userId,
      user_name: displayName,
      user_email: displayEmail,
      user_avatar: displayAvatar,
      status: "open",
      last_message: "Support conversation started",
      last_message_at: now,
      created_at: now,
      unread_by_user: 0,
      unread_by_agent: 0,
    };
    store.conversations[convId] = conv;
    store.userToConvMap[userId] = convId;

    // Seed initial greeting message
    if (!store.messages[convId] || store.messages[convId].length === 0) {
      const welcomeMsg: SupportMessage = {
        id: `supp_msg_welcome_${Date.now()}`,
        conversation_id: convId,
        sender_id: "support-agent",
        sender_name: "ChatMe Support Team",
        sender_role: "agent",
        message: "👋 Hello and welcome to ChatMe Live Support! How can we assist you today? Our agents typically respond within a few moments.",
        created_at: now,
        status: "delivered",
      };
      store.messages[convId] = [welcomeMsg];
    }
    saveLocalStore(store);

    // Sync to server asynchronously
    fetch("/api/support/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conv),
    }).catch(() => {});
  } else {
    // Update profile details if changed
    let changed = false;
    if (displayName && conv.user_name !== displayName) {
      conv.user_name = displayName;
      changed = true;
    }
    if (displayAvatar && conv.user_avatar !== displayAvatar) {
      conv.user_avatar = displayAvatar;
      changed = true;
    }
    if (displayEmail && conv.user_email !== displayEmail) {
      conv.user_email = displayEmail;
      changed = true;
    }
    if (changed) {
      store.conversations[convId] = conv;
      saveLocalStore(store);
    }
  }

  return conv;
}

/**
 * Get support messages for a conversation
 * Security check: ensures user only views messages if they own the conversation or are an agent
 */
export async function getSupportMessages(
  conversationId: string,
  userId?: string,
  isAgent: boolean = false
): Promise<SupportMessage[]> {
  if (!conversationId) return [];

  // Try server API first
  try {
    const res = await fetch(`/api/support/messages?conversationId=${encodeURIComponent(conversationId)}&userId=${encodeURIComponent(userId || "")}&isAgent=${isAgent}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        const store = loadLocalStore();
        store.messages[conversationId] = data.messages;
        saveLocalStore(store);
        return data.messages;
      }
    }
  } catch (e) {
    // fallback
  }

  const store = loadLocalStore();
  const conv = store.conversations[conversationId];

  // Security Check: Normal users can ONLY access messages of their own conversation
  if (!isAgent && conv && userId && conv.user_id !== userId) {
    console.error("Security violation: User cannot access other users' support conversations");
    return [];
  }

  return store.messages[conversationId] || [];
}

/**
 * Send a user message to Live Support
 */
export async function sendUserSupportMessage(
  conversationId: string,
  userId: string,
  userName: string,
  text: string
): Promise<SupportMessage> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty");
  }

  const now = new Date().toISOString();
  const newMsg: SupportMessage = {
    id: `msg_usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    conversation_id: conversationId,
    sender_id: userId,
    sender_name: userName || "User",
    sender_role: "user",
    message: trimmed,
    created_at: now,
    status: "sent",
  };

  // 1. Update local cache
  const store = loadLocalStore();
  if (!store.messages[conversationId]) {
    store.messages[conversationId] = [];
  }
  store.messages[conversationId].push(newMsg);

  if (store.conversations[conversationId]) {
    store.conversations[conversationId].last_message = trimmed;
    store.conversations[conversationId].last_message_at = now;
    store.conversations[conversationId].status = "open";
    store.conversations[conversationId].unread_by_agent =
      (store.conversations[conversationId].unread_by_agent || 0) + 1;
  }
  saveLocalStore(store);

  // 2. Broadcast via Supabase Realtime channel
  try {
    const channel = supabase.channel(`support_room_${conversationId}`);
    channel.send({
      type: "broadcast",
      event: "new_message",
      payload: newMsg,
    });

    // Also notify agent inbox channel
    const inboxChannel = supabase.channel("support_inbox_feed");
    inboxChannel.send({
      type: "broadcast",
      event: "conversation_updated",
      payload: {
        conversationId,
        last_message: trimmed,
        last_message_at: now,
        status: "open",
        sender_name: userName,
      },
    });
  } catch (e) {
    console.warn("Supabase Realtime broadcast error:", e);
  }

  // 3. Persist to server API & Supabase backend
  fetch("/api/support/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newMsg),
  }).catch(() => {});

  return newMsg;
}

/**
 * Send an Agent reply to a user's support conversation
 */
export async function sendAgentSupportReply(
  conversationId: string,
  agentId: string,
  agentName: string,
  text: string
): Promise<SupportMessage> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Reply message cannot be empty");
  }

  const now = new Date().toISOString();
  const replyMsg: SupportMessage = {
    id: `msg_agt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    conversation_id: conversationId,
    sender_id: agentId || "support-agent",
    sender_name: agentName || "ChatMe Support Agent",
    sender_role: "agent",
    message: trimmed,
    created_at: now,
    status: "delivered",
  };

  // 1. Update local store
  const store = loadLocalStore();
  if (!store.messages[conversationId]) {
    store.messages[conversationId] = [];
  }
  store.messages[conversationId].push(replyMsg);

  if (store.conversations[conversationId]) {
    store.conversations[conversationId].last_message = `Support: ${trimmed}`;
    store.conversations[conversationId].last_message_at = now;
    store.conversations[conversationId].unread_by_user =
      (store.conversations[conversationId].unread_by_user || 0) + 1;
  }
  saveLocalStore(store);

  // 2. Broadcast to user via Supabase Realtime channel
  try {
    const channel = supabase.channel(`support_room_${conversationId}`);
    channel.send({
      type: "broadcast",
      event: "new_message",
      payload: replyMsg,
    });

    const inboxChannel = supabase.channel("support_inbox_feed");
    inboxChannel.send({
      type: "broadcast",
      event: "conversation_updated",
      payload: {
        conversationId,
        last_message: `Support: ${trimmed}`,
        last_message_at: now,
        status: store.conversations[conversationId]?.status || "open",
      },
    });
  } catch (e) {
    console.warn("Supabase Realtime broadcast error:", e);
  }

  // 3. Persist to server API
  fetch("/api/support/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(replyMsg),
  }).catch(() => {});

  return replyMsg;
}

/**
 * Update conversation status (open, pending, resolved)
 */
export async function updateSupportConversationStatus(
  conversationId: string,
  status: 'open' | 'pending' | 'resolved'
): Promise<void> {
  const store = loadLocalStore();
  if (store.conversations[conversationId]) {
    store.conversations[conversationId].status = status;
    saveLocalStore(store);
  }

  try {
    const channel = supabase.channel(`support_room_${conversationId}`);
    channel.send({
      type: "broadcast",
      event: "status_changed",
      payload: { conversationId, status },
    });

    const inboxChannel = supabase.channel("support_inbox_feed");
    inboxChannel.send({
      type: "broadcast",
      event: "conversation_updated",
      payload: { conversationId, status },
    });
  } catch (e) {}

  fetch("/api/support/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, status }),
  }).catch(() => {});
}

/**
 * Get all support conversations for Support Agent Dashboard
 */
export async function getAllSupportConversations(
  filterStatus?: 'all' | 'open' | 'pending' | 'resolved'
): Promise<SupportConversation[]> {
  try {
    const res = await fetch(`/api/support/conversations?filter=${filterStatus || "all"}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.conversations)) {
        // Sync local cache
        const store = loadLocalStore();
        data.conversations.forEach((c: SupportConversation) => {
          store.conversations[c.id] = c;
          if (c.user_id) store.userToConvMap[c.user_id] = c.id;
        });
        saveLocalStore(store);
        return data.conversations;
      }
    }
  } catch (e) {
    // fallback
  }

  const store = loadLocalStore();
  let list = Object.values(store.conversations);

  if (filterStatus && filterStatus !== "all") {
    list = list.filter((c) => c.status === filterStatus);
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  return list;
}

/**
 * Subscribe to realtime messages for a specific support conversation using Supabase Realtime
 */
export function subscribeToSupportMessages(
  conversationId: string,
  onNewMessage: (msg: SupportMessage) => void,
  onStatusChange?: (status: 'open' | 'pending' | 'resolved') => void
) {
  const channelName = `support_room_${conversationId}`;
  const channel = supabase.channel(channelName);

  channel
    .on("broadcast", { event: "new_message" }, (payload: any) => {
      if (payload?.payload) {
        onNewMessage(payload.payload as SupportMessage);
      }
    })
    .on("broadcast", { event: "status_changed" }, (payload: any) => {
      if (payload?.payload?.status && onStatusChange) {
        onStatusChange(payload.payload.status);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to agent inbox realtime updates
 */
export function subscribeToAgentInbox(
  onUpdate: (payload: any) => void
) {
  const channel = supabase.channel("support_inbox_feed");

  channel
    .on("broadcast", { event: "conversation_updated" }, (payload: any) => {
      if (payload?.payload) {
        onUpdate(payload.payload);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
