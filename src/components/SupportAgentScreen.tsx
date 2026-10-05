import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Send,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Headphones,
  ShieldCheck,
  Mail,
  Fingerprint,
  ChevronRight,
  Loader2,
  CheckCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  SupportConversation,
  SupportMessage,
  getAllSupportConversations,
  getSupportMessages,
  sendAgentSupportReply,
  updateSupportConversationStatus,
  subscribeToSupportMessages,
  subscribeToAgentInbox
} from "../services/supportService";

interface SupportAgentScreenProps {
  currentUser: any;
  dark: boolean;
  onBack: () => void;
  showToast: (msg: string) => void;
}

export function SupportAgentScreen({
  currentUser,
  dark,
  onBack,
  showToast,
}: SupportAgentScreenProps) {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "pending" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const agentName =
    currentUser?.fullname || currentUser?.name || currentUser?.username || "Support Agent";
  const agentId = currentUser?.id || "support-agent-admin";

  const quickReplies = [
    "Hello! How can I assist you today?",
    "Thank you for reporting this. I am looking into your account details now.",
    "Could you please clarify what device and connection you are using?",
    "This issue has been resolved. Please let us know if you need any other help!",
  ];

  // 1. Fetch conversations
  const loadConversations = async () => {
    setLoadingList(true);
    try {
      const list = await getAllSupportConversations(filter);
      setConversations(list);
      // If there's an active conversation that was removed or none selected on wide screens, pick the first
      if (list.length > 0 && !activeConvId && window.innerWidth >= 768) {
        setActiveConvId(list[0].id);
      }
    } catch (err: any) {
      console.error("Error loading conversations:", err);
      showToast("Could not load support tickets");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [filter]);

  // 2. Realtime listener for Agent Inbox feed
  useEffect(() => {
    const unsubInbox = subscribeToAgentInbox((payload) => {
      // Refresh list or update in place
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === payload.conversationId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            last_message: payload.last_message || updated[idx].last_message,
            last_message_at: payload.last_message_at || new Date().toISOString(),
            status: payload.status || updated[idx].status,
          };
          return updated.sort(
            (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          );
        }
        return prev;
      });
    });

    return () => {
      unsubInbox();
    };
  }, []);

  // 3. Load active conversation messages
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    async function loadMsgs() {
      setLoadingMessages(true);
      try {
        const msgs = await getSupportMessages(activeConvId!, undefined, true);
        if (isMounted) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error("Error loading messages:", err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    }

    loadMsgs();

    // Subscribe to active room realtime
    const unsubRoom = subscribeToSupportMessages(
      activeConvId,
      (newMsg) => {
        if (!isMounted) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      },
      (newStatus) => {
        if (!isMounted) return;
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, status: newStatus } : c))
        );
      }
    );

    return () => {
      isMounted = false;
      unsubRoom();
    };
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages]);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Send agent reply
  const handleSendReply = async (customText?: string) => {
    const text = (customText || replyText).trim();
    if (!text || !activeConvId || sendingReply) return;

    setReplyText("");
    setSendingReply(true);

    try {
      const savedReply = await sendAgentSupportReply(activeConvId, agentId, agentName, text);
      setMessages((prev) => {
        if (prev.some((m) => m.id === savedReply.id)) return prev;
        return [...prev, savedReply];
      });

      // Update in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, last_message: `Support: ${text}`, last_message_at: new Date().toISOString() }
            : c
        )
      );

      showToast("Reply sent to user");
    } catch (err: any) {
      console.error("Failed to send agent reply:", err);
      showToast(err.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
      replyInputRef.current?.focus();
    }
  };

  // Change conversation status
  const handleStatusChange = async (newStatus: "open" | "pending" | "resolved") => {
    if (!activeConvId) return;
    try {
      await updateSupportConversationStatus(activeConvId, newStatus);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, status: newStatus } : c))
      );
      showToast(`Ticket status updated to ${newStatus}`);
    } catch (err: any) {
      showToast("Failed to update status");
    }
  };

  // Filter & Search
  const filteredConversations = conversations.filter((c) => {
    const matchesFilter = filter === "all" || c.status === filter;
    const matchesSearch =
      !searchQuery ||
      c.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.user_email && c.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.last_message && c.last_message.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "Recent";
    }
  };

  return (
    <div className={`flex flex-col h-full ${dark ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>
      {/* 1. Portal Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-1.5 rounded-full transition ${
              dark ? "hover:bg-gray-800 text-gray-200" : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
            <Headphones size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold leading-tight">Support Agent Desk</h2>
              <span className="bg-emerald-500/15 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Agent Live
              </span>
            </div>
            <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Signed in as: <span className="font-semibold text-emerald-500">{agentName}</span>
            </p>
          </div>
        </div>

        <button
          onClick={loadConversations}
          className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-semibold ${
            dark
              ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700"
              : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
          }`}
          title="Refresh ticket list"
        >
          <RefreshCw size={14} className={loadingList ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r shrink-0 ${
            activeConvId && "hidden md:flex"
          } ${dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-200"}`}
        >
          {/* Search & Filters */}
          <div className="p-3 space-y-2 border-b dark:border-gray-800 border-gray-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user, email, msg..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none border transition ${
                  dark
                    ? "bg-gray-900 border-gray-800 text-white placeholder-gray-500"
                    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"
                }`}
              />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {(["all", "open", "pending", "resolved"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`px-3 py-1 rounded-lg font-semibold capitalize transition shrink-0 ${
                    filter === st
                      ? "bg-emerald-600 text-white shadow-xs"
                      : dark
                      ? "bg-gray-900 text-gray-400 hover:bg-gray-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List Items */}
          <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-900 divide-gray-100">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                <span className="text-xs text-gray-400">Loading support conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto text-gray-400">
                  <MessageSquare size={20} />
                </div>
                <p className="text-xs font-semibold text-gray-500">No support tickets found</p>
                <p className="text-[11px] text-gray-400">
                  {searchQuery ? "Try altering your search keywords" : "Incoming user inquiries will appear here"}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === activeConvId;
                const statusColor =
                  c.status === "open"
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    : c.status === "pending"
                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                    : "bg-gray-500/15 text-gray-400 border-gray-500/30";

                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className={`w-full p-3 text-left flex items-start gap-3 transition ${
                      isSelected
                        ? dark
                          ? "bg-gray-800/90 border-l-4 border-emerald-500"
                          : "bg-emerald-50/80 border-l-4 border-emerald-600"
                        : dark
                        ? "hover:bg-gray-900"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-white shrink-0 overflow-hidden shadow-xs">
                      {c.user_avatar ? (
                        <img src={c.user_avatar} alt={c.user_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-sm">{c.user_name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold truncate leading-tight">{c.user_name}</h4>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatTimestamp(c.last_message_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-400 truncate mb-1.5">
                        {c.last_message || "No messages yet"}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm border ${statusColor}`}
                        >
                          {c.status}
                        </span>
                        {c.user_email && (
                          <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                            {c.user_email}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Conversation Detail & Reply Console */}
        <div
          className={`flex-1 flex flex-col ${
            !activeConvId && "hidden md:flex"
          } ${dark ? "bg-[#0b141a]" : "bg-[#efeae2]"}`}
        >
          {activeConv ? (
            <>
              {/* Active Conversation Top Bar */}
              <div
                className={`flex items-center justify-between px-4 py-3 border-b shrink-0 shadow-xs z-10 ${
                  dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 overflow-hidden">
                    {activeConv.user_avatar ? (
                      <img src={activeConv.user_avatar} alt={activeConv.user_name} className="w-full h-full object-cover" />
                    ) : (
                      activeConv.user_name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold leading-tight">{activeConv.user_name}</h3>
                      <span className="text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono">
                        UUID: {activeConv.user_id?.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {activeConv.user_email && <span>{activeConv.user_email}</span>}
                    </div>
                  </div>
                </div>

                {/* Status Switcher Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 hidden sm:inline">Status:</span>
                  <select
                    value={activeConv.status}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as "open" | "pending" | "resolved")
                    }
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border outline-none cursor-pointer ${
                      activeConv.status === "open"
                        ? "bg-emerald-600 text-white border-emerald-700"
                        : activeConv.status === "pending"
                        ? "bg-amber-600 text-white border-amber-700"
                        : "bg-gray-700 text-gray-200 border-gray-600"
                    }`}
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12 space-y-2">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAgent = m.sender_role === "agent" || m.sender_id === agentId;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAgent ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span
                            className={`text-[11px] font-semibold ${
                              isAgent ? "text-emerald-500" : dark ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {m.sender_name || (isAgent ? "Support Agent" : activeConv.user_name)}
                          </span>
                        </div>

                        <div
                          className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm shadow-xs relative ${
                            isAgent
                              ? "bg-emerald-700 text-white rounded-br-xs"
                              : dark
                              ? "bg-[#202c33] text-gray-100 rounded-bl-xs border border-gray-700/50"
                              : "bg-white text-gray-900 rounded-bl-xs border border-gray-200 shadow-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed text-[13.5px]">{m.message}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isAgent ? "text-emerald-200" : "text-gray-400"
                            }`}
                          >
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                            {isAgent && <CheckCheck size={13} className="inline" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Replies */}
              <div
                className={`p-2 border-t flex gap-1.5 overflow-x-auto ${
                  dark ? "bg-gray-950/80 border-gray-800" : "bg-gray-100/90 border-gray-200"
                }`}
              >
                {quickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendReply(qr)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition shrink-0 border truncate max-w-[220px] ${
                      dark
                        ? "bg-gray-900 hover:bg-gray-800 text-gray-300 border-gray-800"
                        : "bg-white hover:bg-emerald-50 text-gray-700 border-gray-200 shadow-xs"
                    }`}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Agent Reply Box */}
              <div
                className={`p-3 border-t shrink-0 ${
                  dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    ref={replyInputRef}
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder={`Reply to ${activeConv.user_name} as ${agentName}...`}
                    className={`flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none border transition focus:ring-2 focus:ring-emerald-500 ${
                      dark
                        ? "bg-gray-900 text-white placeholder-gray-500 border-gray-800"
                        : "bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200"
                    }`}
                  />
                  <button
                    onClick={() => handleSendReply()}
                    disabled={!replyText.trim() || sendingReply}
                    className={`px-4 py-2.5 rounded-2xl font-semibold text-xs flex items-center gap-1.5 transition shadow-md ${
                      replyText.trim() && !sendingReply
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        : "bg-gray-300 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    <span>Send Reply</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Headphones size={32} />
              </div>
              <h3 className="text-base font-bold">Select a Support Conversation</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Choose a customer from the left sidebar to inspect their inquiry history and send instant real-time replies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
