import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Send,
  Headphones,
  ShieldCheck,
  CheckCheck,
  Check,
  HelpCircle,
  Sparkles,
  Loader2,
  Lock,
  UserCheck,
  Info,
  Clock,
  MessageCircle,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  SupportMessage,
  SupportConversation,
  getOrCreateSupportConversation,
  getSupportMessages,
  sendUserSupportMessage,
  subscribeToSupportMessages
} from "../services/supportService";

interface LiveSupportScreenProps {
  currentUser: any;
  dark: boolean;
  onBack: () => void;
  onOpenAgentPortal?: () => void;
  showToast: (msg: string) => void;
}

export function LiveSupportScreen({
  currentUser,
  dark,
  onBack,
  onOpenAgentPortal,
  showToast
}: LiveSupportScreenProps) {
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick suggestions for empty state / starter
  const quickQuestions = [
    "How do I back up my chats?",
    "Need help with end-to-end encryption",
    "How to manage group permissions?",
    "I have an issue with audio/video calls"
  ];

  // 1. Initialize or load support conversation for authenticated user UUID
  useEffect(() => {
    if (!currentUser?.id) return;
    let isMounted = true;

    async function initSupport() {
      setLoading(true);
      try {
        const conv = await getOrCreateSupportConversation(currentUser.id, {
          fullname: currentUser.fullname || currentUser.name,
          username: currentUser.username,
          email: currentUser.email,
          photo: currentUser.photo || currentUser.avatar_url,
          avatar_url: currentUser.avatar_url || currentUser.photo,
        });

        if (isMounted) {
          setConversation(conv);
          // Fetch messages for user's own conversation
          const msgs = await getSupportMessages(conv.id, currentUser.id, false);
          setMessages(msgs);
        }
      } catch (err: any) {
        console.error("Failed to initialize Live Support:", err);
        showToast("Could not load support conversation");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSupport();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // 2. Realtime subscription via Supabase Realtime channel
  useEffect(() => {
    if (!conversation?.id) return;

    const unsubscribe = subscribeToSupportMessages(
      conversation.id,
      (newMsg) => {
        // Prevent duplicate messages
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        if (newMsg.sender_role === "agent") {
          setIsAgentTyping(false);
        }
      },
      (newStatus) => {
        setConversation((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [conversation?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isAgentTyping]);

  // Send user message
  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || !currentUser?.id || !conversation?.id || sending) return;

    setInput("");
    setSending(true);

    const userName = currentUser.fullname || currentUser.name || currentUser.username || "User";

    // Optimistic message creation
    const tempId = `temp_usr_${Date.now()}`;
    const optimisticMsg: SupportMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      sender_name: userName,
      sender_role: "user",
      message: textToSend,
      created_at: new Date().toISOString(),
      status: "sent",
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const savedMsg = await sendUserSupportMessage(
        conversation.id,
        currentUser.id,
        userName,
        textToSend
      );

      // Replace temp optimistic message with actual saved ID
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? savedMsg : m))
      );

      // Simulate helpful immediate acknowledgment if first inquiry
      if (messages.length <= 1) {
        setIsAgentTyping(true);
        setTimeout(() => {
          setIsAgentTyping(false);
        }, 2200);
      }
    } catch (err: any) {
      console.error("Error sending support message:", err);
      showToast(err.message || "Failed to send message to support");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "Now";
    }
  };

  return (
    <div className={`flex flex-col h-full ${dark ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>
      {/* 1. Header (WhatsApp style Support Banner) */}
      <div
        className={`flex items-center justify-between px-3.5 py-3 border-b shrink-0 z-10 shadow-xs ${
          dark ? "bg-gray-950 border-gray-800" : "bg-emerald-700 text-white border-emerald-800"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className={`p-1.5 rounded-full transition ${
              dark ? "hover:bg-gray-800 text-gray-200" : "hover:bg-emerald-600 text-white"
            }`}
            title="Back to Settings"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Support Avatar */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md border-2 border-white/20">
              <Headphones size={20} className="drop-shadow-sm" />
            </div>
            {/* Verified Badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center border border-white">
              <ShieldCheck size={10} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-bold truncate leading-tight">ChatMe Support</h2>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded-sm font-semibold uppercase tracking-wider hidden sm:inline-block">
                Official
              </span>
            </div>
            <p className="text-[11px] text-emerald-300 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              Online • 24/7 Live Assistance
            </p>
          </div>
        </div>

        {/* Right Action: Agent Portal Switcher */}
        {onOpenAgentPortal && (
          <button
            onClick={onOpenAgentPortal}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              dark
                ? "bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-gray-700"
                : "bg-emerald-800/80 hover:bg-emerald-800 text-white border border-emerald-600/40"
            }`}
            title="Open Support Agent Desk"
          >
            <UserCheck size={14} />
            <span className="hidden sm:inline">Agent Portal</span>
          </button>
        )}
      </div>

      {/* 2. Chat Area with WhatsApp style Canvas */}
      <div
        className={`flex-1 overflow-y-auto px-4 py-3 space-y-3.5 ${
          dark ? "bg-[#0b141a]" : "bg-[#efeae2]"
        }`}
        style={{
          backgroundImage: dark
            ? "radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0)"
            : "radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px"
        }}
      >
        {/* Security & Official Notice */}
        <div className="flex justify-center my-2">
          <div
            className={`flex items-center gap-2 max-w-sm px-3.5 py-2 rounded-xl text-[11px] shadow-xs text-center border ${
              dark
                ? "bg-gray-900/90 text-amber-300/90 border-amber-900/40"
                : "bg-amber-50 text-amber-900 border-amber-200/80"
            }`}
          >
            <Lock size={13} className="shrink-0 text-amber-500" />
            <span>Messages are encrypted & handled directly by ChatMe verified support personnel.</span>
          </div>
        </div>

        {/* Ticket Status Banner if conversation exists */}
        {conversation && (
          <div className="flex justify-center">
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full shadow-xs ${
                conversation.status === "resolved"
                  ? "bg-gray-600 text-white"
                  : conversation.status === "pending"
                  ? "bg-amber-600 text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              Ticket Status: {conversation.status}
            </span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-600"}`}>
              Connecting to ChatMe Live Support...
            </p>
          </div>
        ) : messages.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center text-center py-10 px-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-1">
              <MessageCircle size={32} />
            </div>
            <div>
              <h3 className={`text-base font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                Welcome to Live Support!
              </h3>
              <p className={`text-xs max-w-xs mt-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                Need assistance with your account, backup, privacy, or chat settings? Ask us below!
              </p>
            </div>

            {/* Starter Suggestion Chips */}
            <div className="w-full max-w-md pt-2 space-y-2">
              <p className={`text-[11px] font-semibold uppercase tracking-wider ${dark ? "text-gray-400" : "text-gray-500"}`}>
                Frequently Asked Inquiries
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition border flex items-center justify-between ${
                      dark
                        ? "bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 border-gray-700"
                        : "bg-white hover:bg-emerald-50 text-gray-800 border-gray-200 shadow-xs"
                    }`}
                  >
                    <span className="truncate mr-1">{q}</span>
                    <Sparkles size={12} className="text-emerald-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Messages List */
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const isUser = m.sender_role === "user" || m.sender_id === currentUser.id;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[9px] font-bold">
                          <Headphones size={9} />
                        </div>
                        <span className={`text-[11px] font-semibold ${dark ? "text-emerald-400" : "text-emerald-800"}`}>
                          {m.sender_name || "ChatMe Support Team"}
                        </span>
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm shadow-xs relative ${
                        isUser
                          ? "bg-[#005c4b] text-white rounded-br-xs"
                          : dark
                          ? "bg-[#202c33] text-gray-100 rounded-bl-xs border border-gray-700/50"
                          : "bg-white text-gray-900 rounded-bl-xs border border-gray-200/80 shadow-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed text-[13.5px]">{m.message}</p>
                      
                      <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isUser ? "text-emerald-200" : "text-gray-400"}`}>
                        <span>{formatTime(m.created_at)}</span>
                        {isUser && (
                          m.status === "read" ? (
                            <CheckCheck size={13} className="text-cyan-300 inline" />
                          ) : m.status === "delivered" ? (
                            <CheckCheck size={13} className="text-emerald-200 inline" />
                          ) : (
                            <Check size={13} className="text-emerald-200 inline" />
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Agent Typing Indicator */}
              {isAgentTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs">
                    <Headphones size={12} />
                  </div>
                  <div className={`px-3.5 py-2 rounded-2xl text-xs rounded-bl-xs flex items-center gap-1.5 ${
                    dark ? "bg-[#202c33] text-gray-300" : "bg-white text-gray-600 shadow-xs"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></span>
                    <span className="ml-1 text-[11px] font-medium text-emerald-500">Support is typing...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Bottom Message Input Bar */}
      <div
        className={`px-3 py-2.5 border-t shrink-0 ${
          dark ? "bg-gray-950 border-gray-800" : "bg-gray-50 border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Type your message to ChatMe Support..."
            className={`flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 ${
              dark
                ? "bg-gray-800 text-white placeholder-gray-400 border border-gray-700"
                : "bg-white text-gray-900 placeholder-gray-500 border border-gray-300 shadow-inner"
            }`}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending || loading}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow-md shrink-0 ${
              input.trim() && !sending && !loading
                ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95"
                : "bg-gray-300 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
            }`}
            title="Send Message"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
