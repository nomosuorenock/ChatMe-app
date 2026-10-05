import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronRight,
  Headphones,
  ShieldCheck,
  HelpCircle,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Star,
  Lock,
  UserX,
  Shield,
  Upload,
  Image as ImageIcon,
  X,
  Check,
  Copy,
  Send,
  Share2,
  ExternalLink,
  MessageCircle,
  FileText,
  Smartphone,
  PhoneCall,
  History,
  CloudUpload,
  User,
  Radio,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HelpAndSupportScreenProps {
  dark: boolean;
  onBack: () => void;
  onOpenLiveSupport: () => void;
  onOpenAgentPortal?: () => void;
  onGoPrivacy?: () => void;
  showToast: (msg: string) => void;
}

interface FaqItem {
  id: string;
  category: "account" | "messages" | "status" | "backup" | "privacy";
  q: string;
  a: string;
}

const FAQ_DATA: FaqItem[] = [
  // ACCOUNT
  {
    id: "acc-1",
    category: "account",
    q: "How do I create a ChatMe account?",
    a: "To create an account, enter your username, email, and password on the Sign Up screen. Once registered, your profile is automatically set up with secure end-to-end authentication.",
  },
  {
    id: "acc-2",
    category: "account",
    q: "How do I change my name or profile photo?",
    a: "Go to Profile (bottom tab or profile icon) and tap 'Edit Profile' or click directly on your avatar photo to upload a new image, update your display name, and modify your status About bio.",
  },
  {
    id: "acc-3",
    category: "account",
    q: "I forgot my password. What should I do?",
    a: "On the Sign In screen, click 'Forgot Password' to receive a secure password recovery code via your registered email address, or change your password directly from Settings → Change Password when logged in.",
  },
  {
    id: "acc-4",
    category: "account",
    q: "How do I log out?",
    a: "Navigate to Settings (via Profile or top menu), scroll down to the bottom, and tap the 'Log Out' button to safely end your current session on this device.",
  },

  // MESSAGES
  {
    id: "msg-1",
    category: "messages",
    q: "How do I send a message?",
    a: "Open any conversation from the Chats tab, or tap the New Chat button (+ / pencil icon) to choose a contact. Type your text in the input box at the bottom and click the Send button.",
  },
  {
    id: "msg-2",
    category: "messages",
    q: "Why aren't my messages sending?",
    a: "Check your internet connection (Wi-Fi or mobile data). If a clock icon appears next to your message, ChatMe will automatically retry and deliver it as soon as your network reconnects.",
  },
  {
    id: "msg-3",
    category: "messages",
    q: "How do I know if a message was read?",
    a: "ChatMe uses delivery checkmarks next to each message: a single grey tick means sent, double grey ticks mean delivered, and double blue/cyan ticks indicate the recipient has read the message.",
  },
  {
    id: "msg-4",
    category: "messages",
    q: "How do I delete a message?",
    a: "Long-press or hover over the message you want to remove, click the trash icon or action menu, and choose 'Delete for me' or 'Delete for everyone'.",
  },

  // STATUS
  {
    id: "sta-1",
    category: "status",
    q: "How do I post a status?",
    a: "Navigate to the Status tab and tap 'My Status' or the camera icon. You can post photos, videos, or compose custom text updates with colored backgrounds.",
  },
  {
    id: "sta-2",
    category: "status",
    q: "How long does a status remain visible?",
    a: "Status updates automatically expire and disappear 24 hours after being posted to keep your updates private and ephemeral.",
  },
  {
    id: "sta-3",
    category: "status",
    q: "How do I delete my status?",
    a: "Open the Status tab, tap the three dots or view your active status story, and select the 'Delete' option to instantly remove it for all viewers.",
  },
  {
    id: "sta-4",
    category: "status",
    q: "Why can't I upload a photo or video?",
    a: "Verify that ChatMe has been granted media and camera permissions on your device. Ensure the video format is standard (MP4/WebM) and doesn't exceed the upload size limit.",
  },

  // BACKUP
  {
    id: "bak-1",
    category: "backup",
    q: "How do I back up my ChatMe data?",
    a: "Go to Settings → Chats → Chat Backup (or Settings → Backup & Restore). Tap 'Back Up Now' to generate an encrypted snapshot of all your conversations and settings.",
  },
  {
    id: "bak-2",
    category: "backup",
    q: "How do I restore my backup?",
    a: "Go to Settings → Backup & Restore, choose from your saved cloud or local backups, and click 'Restore Backup' to reinstate all message history.",
  },
  {
    id: "bak-3",
    category: "backup",
    q: "Where is my backup stored?",
    a: "Backups can be synchronized to your secure private cloud database account and exported locally as encrypted backup files to keep your data under your control.",
  },

  // PRIVACY & SECURITY
  {
    id: "pri-1",
    category: "privacy",
    q: "Who can see my status?",
    a: "You can configure your status audience in Settings → Privacy → Status Privacy. Choose between 'My Contacts', 'My Contacts Except...', or 'Only Share With...'.",
  },
  {
    id: "pri-2",
    category: "privacy",
    q: "How does ChatMe protect my account?",
    a: "ChatMe uses row-level database security, client-side encryption, secure session tokens, and optional app lock features to keep your personal chats private.",
  },
  {
    id: "pri-3",
    category: "privacy",
    q: "How do I report someone?",
    a: "Open the contact's chat or profile, tap the options menu, and choose 'Report Contact', or use the 'Report a Problem' button below with user details.",
  },
  {
    id: "pri-4",
    category: "privacy",
    q: "How do I block someone?",
    a: "Open the contact's chat, click on their header to view their contact card, and tap 'Block Contact'. You can also manage blocked users in Settings → Privacy → Blocked Contacts.",
  },
];

const CATEGORIES = [
  { key: "all", label: "All Questions", icon: HelpCircle },
  { key: "account", label: "Account", icon: User },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "status", label: "Status", icon: Radio },
  { key: "backup", label: "Backup", icon: CloudUpload },
  { key: "privacy", label: "Privacy & Security", icon: Shield },
];

export function HelpAndSupportScreen({
  dark,
  onBack,
  onOpenLiveSupport,
  onOpenAgentPortal,
  onGoPrivacy,
  showToast,
}: HelpAndSupportScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("acc-1");
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Report Form State
  const [reportCategory, setReportCategory] = useState("Messages");
  const [reportDescription, setReportDescription] = useState("");
  const [reportAttachment, setReportAttachment] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback Form State
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Share & Deep link State
  const [copiedFaqId, setCopiedFaqId] = useState<string | null>(null);

  // Auto-expand and scroll if URL has a deep link hash or query param
  useEffect(() => {
    try {
      const hash = window.location.hash;
      let targetId = "";
      if (hash && hash.startsWith("#faq-")) {
        targetId = hash.replace("#faq-", "");
      } else {
        const params = new URLSearchParams(window.location.search);
        const faqParam = params.get("faq");
        if (faqParam) targetId = faqParam;
      }

      if (targetId) {
        const found = FAQ_DATA.find((f) => f.id === targetId);
        if (found) {
          setSelectedCategory("all");
          setExpandedFaqId(found.id);
          setTimeout(() => {
            const el = document.getElementById(`faq-item-${found.id}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 350);
        }
      }
    } catch (err) {
      console.error("Deep link parse error:", err);
    }
  }, []);

  // Filter FAQs based on search & category
  const filteredFaqs = FAQ_DATA.filter((faq) => {
    const matchesCategory =
      selectedCategory === "all" || faq.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      faq.q.toLowerCase().includes(q) ||
      faq.a.toLowerCase().includes(q) ||
      faq.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleToggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText("support@chatme.com");
    setCopiedEmail(true);
    showToast("Support email copied to clipboard");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Copy deep link to clipboard for sharing
  const handleShareFaq = (faq: FaqItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    try {
      // Construct deep link URL
      const origin = window.location.origin || "";
      const pathname = window.location.pathname || "";
      const deepLink = `${origin}${pathname}#faq-${faq.id}`;

      const finishCopy = () => {
        setCopiedFaqId(faq.id);
        showToast(`Deep link copied! You can now share this FAQ.`);
        setTimeout(() => setCopiedFaqId(null), 2500);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(deepLink)
          .then(() => {
            finishCopy();
          })
          .catch(() => {
            // Fallback for iframe clipboard restrictions
            fallbackCopy(deepLink);
            finishCopy();
          });
      } else {
        fallbackCopy(deepLink);
        finishCopy();
      }
    } catch (err) {
      showToast("Unable to copy link to clipboard");
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    } catch (err) {
      console.warn("Fallback copy failed:", err);
    }
  };

  // Image upload handler for report problem
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReportAttachment(reader.result as string);
      showToast("Screenshot attached successfully");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setReportAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit Report
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) {
      showToast("Please describe the issue before submitting");
      return;
    }

    setReportSubmitting(true);
    setTimeout(() => {
      try {
        const existingReports = JSON.parse(
          localStorage.getItem("chatme_problem_reports") || "[]"
        );
        const newReport = {
          id: `rep_${Date.now()}`,
          category: reportCategory,
          description: reportDescription.trim(),
          hasAttachment: !!reportAttachment,
          createdAt: new Date().toISOString(),
          status: "received",
        };
        existingReports.push(newReport);
        localStorage.setItem(
          "chatme_problem_reports",
          JSON.stringify(existingReports)
        );
      } catch (err) {
        console.error("Local storage error:", err);
      }

      setReportSubmitting(false);
      setShowReportModal(false);
      setReportDescription("");
      setReportAttachment(null);
      setReportCategory("Messages");
      showToast("Report submitted successfully. Our team will look into it!");
    }, 450);
  };

  // Submit Feedback
  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSubmitting(true);
    setTimeout(() => {
      try {
        const existingFeedback = JSON.parse(
          localStorage.getItem("chatme_user_feedback") || "[]"
        );
        const newFb = {
          id: `fb_${Date.now()}`,
          rating: feedbackRating,
          feedback: feedbackText.trim(),
          createdAt: new Date().toISOString(),
        };
        existingFeedback.push(newFb);
        localStorage.setItem(
          "chatme_user_feedback",
          JSON.stringify(existingFeedback)
        );
      } catch (err) {
        console.error("Feedback local storage error:", err);
      }

      setFeedbackSubmitting(false);
      setShowFeedbackModal(false);
      setFeedbackText("");
      setFeedbackRating(5);
      showToast("Thanks for helping us improve ChatMe!");
    }, 400);
  };

  return (
    <div
      id="help-and-support-page"
      className={`flex flex-col h-full overflow-y-auto ${
        dark ? "bg-[#0b141a] text-white" : "bg-[#f0f2f5] text-gray-900"
      }`}
    >
      {/* 1. Top WhatsApp Style Header */}
      <div
        id="help-support-header"
        className={`flex items-center justify-between px-4 py-3.5 border-b shrink-0 sticky top-0 z-20 shadow-xs ${
          dark ? "bg-[#111b21] border-gray-800" : "bg-[#008069] text-white border-[#00705c]"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            id="help-back-button"
            onClick={onBack}
            className={`p-1.5 rounded-full transition ${
              dark
                ? "hover:bg-gray-800 text-gray-200"
                : "hover:bg-emerald-700 text-white"
            }`}
            title="Back to Settings"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2">
              Help & Support
            </h1>
            <p
              className={`text-xs ${
                dark ? "text-emerald-400" : "text-emerald-100"
              }`}
            >
              FAQs, Troubleshooting & Support
            </p>
          </div>
        </div>

        {/* Quick link to Live Chat */}
        <button
          id="help-header-live-chat"
          onClick={onOpenLiveSupport}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition shadow-xs ${
            dark
              ? "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30"
              : "bg-white/20 hover:bg-white/30 text-white border border-white/30"
          }`}
          title="Open Live Chat"
        >
          <Headphones size={14} />
          <span className="hidden sm:inline">Live Chat</span>
        </button>
      </div>

      {/* Main Content Container */}
      <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full pb-12">
        {/* 1. SEARCH HELP SECTION */}
        <div
          id="help-search-section"
          className={`rounded-2xl p-4 sm:p-5 border transition shadow-xs ${
            dark ? "bg-[#111b21] border-gray-800" : "bg-white border-gray-200"
          }`}
        >
          <label
            htmlFor="faq-search-input"
            className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
              dark ? "text-emerald-400" : "text-emerald-800"
            }`}
          >
            How can we help you?
          </label>
          <div className="relative flex items-center">
            <Search
              size={18}
              className={`absolute left-3.5 pointer-events-none ${
                dark ? "text-gray-400" : "text-gray-500"
              }`}
            />
            <input
              id="faq-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help..."
              className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none border transition focus:ring-2 focus:ring-emerald-500 ${
                dark
                  ? "bg-[#202c33] border-gray-700 text-white placeholder-gray-400"
                  : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
              }`}
            />
            {searchQuery && (
              <button
                id="help-search-clear"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 p-1 rounded-full text-gray-400 hover:text-gray-200"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar">
            {CATEGORIES.map(({ key, label, icon: CatIcon }) => {
              const isSelected = selectedCategory === key;
              return (
                <button
                  key={key}
                  id={`help-cat-chip-${key}`}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 border ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : dark
                      ? "bg-[#202c33] text-gray-300 border-gray-700 hover:bg-gray-800"
                      : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  <CatIcon size={13} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. CONTACT SUPPORT CARD (Prominent) */}
        <div
          id="contact-support-card"
          className={`rounded-2xl p-5 border transition relative overflow-hidden shadow-sm ${
            dark
              ? "bg-gradient-to-br from-emerald-950/70 via-[#111b21] to-[#111b21] border-emerald-800/50"
              : "bg-gradient-to-br from-[#008069] to-[#005c4b] text-white border-emerald-700 shadow-md"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner shrink-0">
                <Headphones size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold leading-tight">
                    Still need help?
                  </h2>
                  <span className="bg-emerald-400 text-emerald-950 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                    24/7
                  </span>
                </div>
                <p
                  className={`text-xs sm:text-sm mt-0.5 ${
                    dark ? "text-emerald-300" : "text-emerald-100"
                  }`}
                >
                  Contact ChatMe Support and we'll help you.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="contact-support-button"
                onClick={onOpenLiveSupport}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-md active:scale-95 ${
                  dark
                    ? "bg-emerald-500 hover:bg-emerald-400 text-emerald-950"
                    : "bg-white hover:bg-emerald-50 text-emerald-900"
                }`}
              >
                <MessageCircle size={16} />
                <span>Contact Support</span>
              </button>

              {onOpenAgentPortal && (
                <button
                  id="agent-desk-portal-button"
                  onClick={onOpenAgentPortal}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-center ${
                    dark
                      ? "bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-300"
                      : "bg-white/20 hover:bg-white/30 border-white/30 text-white"
                  }`}
                  title="Agent Support Desk"
                >
                  <UserCheck size={16} />
                </button>
              )}
            </div>
          </div>

          <div
            className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
              dark
                ? "border-gray-800/80 text-emerald-400"
                : "border-white/20 text-emerald-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Average response time: <strong>under 2 minutes</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span>Direct: <strong>support@chatme.com</strong></span>
              <button
                onClick={handleCopyEmail}
                className="hover:underline flex items-center gap-1 opacity-90 hover:opacity-100"
              >
                {copiedEmail ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedEmail ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. FREQUENTLY ASKED QUESTIONS SECTION */}
        <div id="faq-section" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <HelpCircle size={18} className="text-emerald-500" />
              <h2
                className={`text-sm font-bold uppercase tracking-wider ${
                  dark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Frequently Asked Questions
              </h2>
            </div>
            <span
              className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
            >
              {filteredFaqs.length} {filteredFaqs.length === 1 ? "article" : "articles"}
            </span>
          </div>

          {filteredFaqs.length === 0 ? (
            <div
              id="faq-empty-state"
              className={`rounded-2xl p-8 border text-center space-y-3 ${
                dark
                  ? "bg-[#111b21] border-gray-800 text-gray-400"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <Search size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  No matching questions found
                </p>
                <p className="text-xs mt-1">
                  Try searching for keywords like "password", "backup", "status", or contact our support team.
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="text-xs text-emerald-500 font-bold hover:underline"
              >
                Clear search filters
              </button>
            </div>
          ) : (
            <div
              id="faq-list-container"
              className={`rounded-2xl border divide-y overflow-hidden shadow-xs ${
                dark
                  ? "bg-[#111b21] border-gray-800 divide-gray-800"
                  : "bg-white border-gray-200 divide-gray-100"
              }`}
            >
              {filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    id={`faq-item-${faq.id}`}
                    className={`transition ${
                      isExpanded
                        ? dark
                          ? "bg-[#202c33]/40"
                          : "bg-emerald-50/40"
                        : ""
                    }`}
                  >
                    <div className="w-full px-4 py-3.5 flex items-center justify-between text-left gap-3 group">
                      <button
                        type="button"
                        id={`faq-toggle-${faq.id}`}
                        onClick={() => handleToggleFaq(faq.id)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                      >
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm border shrink-0 ${
                            faq.category === "account"
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : faq.category === "messages"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : faq.category === "status"
                              ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                              : faq.category === "backup"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
                          }`}
                        >
                          {faq.category}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-semibold transition group-hover:text-emerald-500 ${
                            isExpanded
                              ? "text-emerald-500 font-bold"
                              : dark
                              ? "text-gray-200"
                              : "text-gray-800"
                          }`}
                        >
                          {faq.q}
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Share deep link button */}
                        <button
                          type="button"
                          id={`faq-share-btn-${faq.id}`}
                          onClick={(e) => handleShareFaq(faq, e)}
                          className={`p-1.5 rounded-lg transition flex items-center justify-center ${
                            copiedFaqId === faq.id
                              ? "bg-emerald-500/20 text-emerald-500 scale-105"
                              : dark
                              ? "text-gray-400 hover:text-emerald-400 hover:bg-[#202c33]"
                              : "text-gray-400 hover:text-emerald-600 hover:bg-gray-100"
                          }`}
                          title="Share FAQ (Copy link to clipboard)"
                          aria-label={`Share ${faq.q}`}
                        >
                          {copiedFaqId === faq.id ? (
                            <Check size={15} className="text-emerald-500" />
                          ) : (
                            <Share2 size={15} />
                          )}
                        </button>

                        {/* Accordion toggle trigger icon */}
                        <button
                          type="button"
                          id={`faq-chevron-${faq.id}`}
                          onClick={() => handleToggleFaq(faq.id)}
                          className={`p-1 rounded-full transition shrink-0 ${
                            isExpanded
                              ? "bg-emerald-500/20 text-emerald-500 rotate-180"
                              : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200"
                          }`}
                          title={isExpanded ? "Collapse" : "Expand"}
                          aria-label={isExpanded ? "Collapse answer" : "Expand answer"}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          id={`faq-answer-${faq.id}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`px-4 pb-4 pt-1 text-xs sm:text-[13px] leading-relaxed border-t ${
                            dark
                              ? "text-gray-300 border-gray-800/60"
                              : "text-gray-600 border-gray-100"
                          }`}
                        >
                          <p>{faq.a}</p>

                          {/* Quick Share Link in answer footer */}
                          <div className="mt-3 pt-2.5 flex items-center justify-between border-t dark:border-gray-800/60 border-gray-100 text-[11px]">
                            <span className="text-gray-400 dark:text-gray-500">
                              Direct deep link
                            </span>
                            <button
                              type="button"
                              id={`faq-answer-share-btn-${faq.id}`}
                              onClick={(e) => handleShareFaq(faq, e)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
                                copiedFaqId === faq.id
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : dark
                                  ? "text-emerald-400 hover:bg-emerald-500/10"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {copiedFaqId === faq.id ? (
                                <>
                                  <Check size={13} className="text-emerald-500" />
                                  <span>Link Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Share2 size={13} />
                                  <span>Share this answer</span>
                                </>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. ACTION GRID: REPORT A PROBLEM & SEND FEEDBACK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Report a Problem Card */}
          <div
            id="report-problem-card"
            className={`rounded-2xl p-4.5 border flex flex-col justify-between transition shadow-xs ${
              dark
                ? "bg-[#111b21] border-gray-800 hover:border-gray-700"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="space-y-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-sm font-bold leading-tight">Report a Problem</h3>
              <p
                className={`text-xs ${
                  dark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Encountering an issue with calls, messages, or login? Let us know with details.
              </p>
            </div>
            <button
              id="open-report-problem-btn"
              onClick={() => setShowReportModal(true)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                dark
                  ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30"
                  : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
              }`}
            >
              <AlertTriangle size={14} />
              <span>Report a Problem</span>
            </button>
          </div>

          {/* Send Feedback Card */}
          <div
            id="send-feedback-card"
            className={`rounded-2xl p-4.5 border flex flex-col justify-between transition shadow-xs ${
              dark
                ? "bg-[#111b21] border-gray-800 hover:border-gray-700"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="space-y-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <h3 className="text-sm font-bold leading-tight">Send Feedback</h3>
              <p
                className={`text-xs ${
                  dark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Help us improve ChatMe! Share your rating, thoughts, or feature suggestions.
              </p>
            </div>
            <button
              id="open-send-feedback-btn"
              onClick={() => setShowFeedbackModal(true)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                dark
                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
              }`}
            >
              <Star size={14} />
              <span>Send Feedback</span>
            </button>
          </div>
        </div>

        {/* 6. SAFETY & PRIVACY SECTION */}
        <div
          id="safety-privacy-section"
          className={`rounded-2xl p-4 sm:p-5 border transition shadow-xs ${
            dark ? "bg-[#111b21] border-gray-800" : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-3.5 px-1">
            <ShieldCheck size={18} className="text-emerald-500" />
            <h3
              className={`text-xs font-bold uppercase tracking-wider ${
                dark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Safety & Privacy
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Privacy Settings Button */}
            <button
              id="safety-privacy-settings-btn"
              onClick={() => (onGoPrivacy ? onGoPrivacy() : showToast("Opening Privacy Settings..."))}
              className={`p-3.5 rounded-xl border flex items-center justify-between text-left transition ${
                dark
                  ? "bg-[#202c33] hover:bg-gray-800 border-gray-700 text-gray-200"
                  : "bg-gray-50 hover:bg-emerald-50/60 border-gray-200 text-gray-800"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <Shield size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Privacy Settings</span>
                  <span className="text-[10px] text-gray-400 truncate block">Last seen & status</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-gray-400 shrink-0 ml-1" />
            </button>

            {/* Blocked Users Button */}
            <button
              id="safety-blocked-users-btn"
              onClick={() => (onGoPrivacy ? onGoPrivacy() : showToast("Opening Blocked Contacts in Privacy..."))}
              className={`p-3.5 rounded-xl border flex items-center justify-between text-left transition ${
                dark
                  ? "bg-[#202c33] hover:bg-gray-800 border-gray-700 text-gray-200"
                  : "bg-gray-50 hover:bg-emerald-50/60 border-gray-200 text-gray-800"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                  <UserX size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Blocked Users</span>
                  <span className="text-[10px] text-gray-400 truncate block">Manage blocked list</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-gray-400 shrink-0 ml-1" />
            </button>

            {/* Report a User Button */}
            <button
              id="safety-report-user-btn"
              onClick={() => {
                setReportCategory("Profile");
                setReportDescription("Reporting user abuse / spam behavior: ");
                setShowReportModal(true);
              }}
              className={`p-3.5 rounded-xl border flex items-center justify-between text-left transition ${
                dark
                  ? "bg-[#202c33] hover:bg-gray-800 border-gray-700 text-gray-200"
                  : "bg-gray-50 hover:bg-emerald-50/60 border-gray-200 text-gray-800"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                  <Lock size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Report a User</span>
                  <span className="text-[10px] text-gray-400 truncate block">Submit safety flag</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-gray-400 shrink-0 ml-1" />
            </button>
          </div>
        </div>

        {/* 7. APP INFO & FOOTER */}
        <div className="text-center pt-2 pb-6 text-gray-400 dark:text-gray-500 text-[11px] space-y-1">
          <p className="font-semibold text-gray-500 dark:text-gray-400">
            ChatMe Messenger • Build 1.0.0
          </p>
          <p>Protected by end-to-end security & 24/7 dedicated support</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: REPORT A PROBLEM */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showReportModal && (
          <div
            id="report-problem-modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              id="report-problem-modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
                dark ? "bg-[#111b21] border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              {/* Modal Header */}
              <div
                className={`flex items-center justify-between px-4 py-3.5 border-b ${
                  dark ? "bg-[#202c33] border-gray-700" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-rose-500" />
                  <h3 className="text-sm font-bold">Report a Problem</h3>
                </div>
                <button
                  id="close-report-modal-btn"
                  onClick={() => setShowReportModal(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-200 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSubmitReport} className="p-4 space-y-4 overflow-y-auto">
                {/* Category Dropdown */}
                <div>
                  <label
                    htmlFor="report-category-select"
                    className="block text-xs font-bold mb-1 text-gray-400"
                  >
                    Problem Category
                  </label>
                  <select
                    id="report-category-select"
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold outline-none border transition ${
                      dark
                        ? "bg-[#202c33] border-gray-700 text-white"
                        : "bg-gray-50 border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="Login">Login</option>
                    <option value="Messages">Messages</option>
                    <option value="Calls">Calls</option>
                    <option value="Status">Status</option>
                    <option value="Profile">Profile</option>
                    <option value="Backup">Backup</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Description Textarea */}
                <div>
                  <label
                    htmlFor="report-description-textarea"
                    className="block text-xs font-bold mb-1 text-gray-400"
                  >
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="report-description-textarea"
                    rows={4}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Please explain what happened and how to reproduce it..."
                    className={`w-full px-3 py-2.5 rounded-xl text-xs outline-none border transition focus:ring-2 focus:ring-emerald-500 ${
                      dark
                        ? "bg-[#202c33] border-gray-700 text-white placeholder-gray-500"
                        : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400"
                    }`}
                    required
                  />
                  <div className="flex justify-end text-[10px] text-gray-400 mt-1">
                    {reportDescription.length}/1000 characters
                  </div>
                </div>

                {/* Optional Screenshot Attachment */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-400">
                    Screenshot / Attachment (Optional)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAttachmentChange}
                    className="hidden"
                    id="report-file-input"
                  />

                  {reportAttachment ? (
                    <div className="relative rounded-xl border border-emerald-500/30 overflow-hidden bg-black/20 p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={reportAttachment}
                          alt="Attachment preview"
                          className="w-12 h-12 object-cover rounded-lg shrink-0 border border-gray-600"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold block text-emerald-400 truncate">
                            Screenshot attached
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            Image ready to send
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition"
                        title="Remove image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full py-3 px-4 rounded-xl border border-dashed text-xs font-medium flex items-center justify-center gap-2 transition ${
                        dark
                          ? "bg-[#202c33]/50 hover:bg-[#202c33] border-gray-700 text-gray-300"
                          : "bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-600"
                      }`}
                    >
                      <ImageIcon size={16} className="text-emerald-500" />
                      <span>Attach a screenshot (PNG, JPG)</span>
                    </button>
                  )}
                </div>

                {/* Submit Actions */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t dark:border-gray-800 border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      dark
                        ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-problem-report-btn"
                    type="submit"
                    disabled={reportSubmitting || !reportDescription.trim()}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                      !reportDescription.trim() || reportSubmitting
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                    }`}
                  >
                    <Send size={13} />
                    <span>{reportSubmitting ? "Sending..." : "Send Report"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. MODAL: SEND FEEDBACK */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div
            id="send-feedback-modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              id="send-feedback-modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
                dark ? "bg-[#111b21] border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              {/* Modal Header */}
              <div
                className={`flex items-center justify-between px-4 py-3.5 border-b ${
                  dark ? "bg-[#202c33] border-gray-700" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  <h3 className="text-sm font-bold">Send Feedback</h3>
                </div>
                <button
                  id="close-feedback-modal-btn"
                  onClick={() => setShowFeedbackModal(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-200 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Feedback Form */}
              <form onSubmit={handleSubmitFeedback} className="p-4 space-y-4">
                {/* 1-5 Star Rating */}
                <div className="text-center space-y-2 py-1">
                  <label className="block text-xs font-bold text-gray-400">
                    How would you rate your ChatMe experience?
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active =
                        (feedbackHoverRating || feedbackRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          id={`feedback-star-${star}`}
                          onMouseEnter={() => setFeedbackHoverRating(star)}
                          onMouseLeave={() => setFeedbackHoverRating(0)}
                          onClick={() => setFeedbackRating(star)}
                          className="p-1.5 transition transform hover:scale-125 focus:outline-none"
                        >
                          <Star
                            size={28}
                            className={`transition ${
                              active
                                ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                                : "text-gray-500 stroke-1"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs font-bold text-amber-400">
                    {feedbackRating === 5
                      ? "★★★★★ Excellent!"
                      : feedbackRating === 4
                      ? "★★★★☆ Good"
                      : feedbackRating === 3
                      ? "★★★☆☆ Average"
                      : feedbackRating === 2
                      ? "★★☆☆☆ Needs Improvement"
                      : "★☆☆☆☆ Poor"}
                  </p>
                </div>

                {/* Feedback text */}
                <div>
                  <label
                    htmlFor="feedback-textarea"
                    className="block text-xs font-bold mb-1 text-gray-400"
                  >
                    Your Feedback & Thoughts
                  </label>
                  <textarea
                    id="feedback-textarea"
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us what you love or what we can do better..."
                    className={`w-full px-3 py-2.5 rounded-xl text-xs outline-none border transition focus:ring-2 focus:ring-emerald-500 ${
                      dark
                        ? "bg-[#202c33] border-gray-700 text-white placeholder-gray-500"
                        : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400"
                    }`}
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t dark:border-gray-800 border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      dark
                        ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-feedback-btn"
                    type="submit"
                    disabled={feedbackSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md"
                  >
                    <Send size={13} />
                    <span>{feedbackSubmitting ? "Submitting..." : "Submit Feedback"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
