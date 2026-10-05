import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Bot,
  Loader2,
  Trash2,
  Globe,
  ExternalLink,
  Search,
  MapPin,
  Music,
  Compass,
  Zap,
  Brain,
  MessageSquare,
  Play,
  Pause,
  Volume2,
  Share2,
  Check,
  Navigation,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GroundingSource {
  title: string;
  url: string;
}

interface MapLocationSource {
  title: string;
  url: string;
  reviews?: string[];
}

interface ChatMessage {
  id: number;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  roleUsed?: string;
  modelUsed?: string;
  sources?: GroundingSource[];
  mapsSources?: MapLocationSource[];
  searchQueries?: string[];
  audioData?: {
    url: string;
    lyrics?: string;
    prompt?: string;
  };
}

type ChatRole = "general" | "complex" | "fast" | "maps" | "search";

interface RoleConfig {
  key: ChatRole;
  label: string;
  modelBadge: string;
  description: string;
  icon: any;
  taskType: "general" | "complex" | "fast";
  tool?: "search" | "maps" | "none";
  systemInstruction: string;
  suggestedPrompts: string[];
}

const ROLES: RoleConfig[] = [
  {
    key: "general",
    label: "General Assistant",
    modelBadge: "gemini-3.5-flash",
    description: "Balanced, versatile intelligence with web-grounded accuracy",
    icon: Sparkles,
    taskType: "general",
    tool: "search",
    systemInstruction: "You are ChatMe Assistant, a versatile, friendly, and helpful AI companion. Answer questions clearly, accurately, and politely.",
    suggestedPrompts: [
      "Explain quantum computing in simple terms",
      "Give me 5 productive morning habits",
      "Write a short thoughtful text to an old friend"
    ]
  },
  {
    key: "complex",
    label: "Complex Reasoning",
    modelBadge: "gemini-3.1-pro-preview",
    description: "Deep problem solving, STEM, algorithms, and step-by-step logic",
    icon: Brain,
    taskType: "complex",
    tool: "none",
    systemInstruction: "You are ChatMe Deep Reasoning Expert. Provide rigorous, step-by-step breakdowns, math derivations, optimal code structures, and comprehensive architectural analysis.",
    suggestedPrompts: [
      "Compare PostgreSQL vs DynamoDB trade-offs",
      "Write a TypeScript debounce function with tests",
      "Solve a puzzle: 3 light switches and 3 bulbs"
    ]
  },
  {
    key: "fast",
    label: "Fast Responder",
    modelBadge: "gemini-3.1-flash-lite",
    description: "Ultra-fast, concise answers for quick lookups and summary",
    icon: Zap,
    taskType: "fast",
    tool: "none",
    systemInstruction: "You are ChatMe Fast Responder. Deliver immediate, high-density, concise answers. Avoid filler words and preamble.",
    suggestedPrompts: [
      "Quick summary: What is WebRTC?",
      "Convert 75 Fahrenheit to Celsius",
      "List top 3 rules of typography"
    ]
  },
  {
    key: "maps",
    label: "Maps & Places",
    modelBadge: "gemini-3.5-flash + Google Maps",
    description: "Find local restaurants, cafes, attractions, routes, and reviews",
    icon: MapPin,
    taskType: "general",
    tool: "maps",
    systemInstruction: "You are ChatMe Local Guide & Navigator. Recommend nearby places, cafes, landmarks, and travel routes using real Google Maps data. Always detail ambiance, address, and top reviews.",
    suggestedPrompts: [
      "Best coffee shops with good Wi-Fi nearby",
      "Top Italian restaurants with outdoor seating",
      "Fun weekend places to visit with friends"
    ]
  },
  {
    key: "search",
    label: "Live Web Search",
    modelBadge: "gemini-3.5-flash + Google Search",
    description: "Real-time facts, breaking news, sports scores, and live queries",
    icon: Globe,
    taskType: "general",
    tool: "search",
    systemInstruction: "You are ChatMe Research Assistant. Use Google Search grounding to retrieve real-time facts, live updates, and verified web citations.",
    suggestedPrompts: [
      "Latest tech news headlines today",
      "Current weather and 3-day forecast",
      "Recent space exploration discoveries"
    ]
  }
];

function formatFriendlyError(raw: string): string {
  if (!raw) return "Google Search took longer than expected to respond. Please try asking again.";
  let msg = raw;
  try {
    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw);
      if (parsed?.error?.message) {
        msg = parsed.error.message;
      }
    }
  } catch {}

  if (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.toLowerCase().includes("high demand")
  ) {
    return "This AI model is currently experiencing high demand from Google. Please try asking again in a few moments.";
  }
  if (
    msg.includes("DEADLINE_EXCEEDED") ||
    msg.includes("Deadline expired") ||
    msg.includes("504") ||
    msg.toLowerCase().includes("timed out")
  ) {
    return "Request took longer than expected to respond (Timed out). Please try asking again.";
  }
  if (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota")
  ) {
    return "Gemini API rate limit or quota reached. Please wait a few moments and try again.";
  }
  if (msg.includes("API key") || msg.includes("API_KEY") || msg.includes("invalid")) {
    return "Gemini API key is not configured or unauthorized. Please verify your GEMINI_API_KEY in Settings.";
  }
  return msg;
}

export function AIChatScreen({ currentUser, dark, onBack, showToast }: any) {
  const [selectedRole, setSelectedRole] = useState<ChatRole>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I am your ChatMe Assistant powered by Gemini. You can switch roles above for General chat, Deep Reasoning, Fast answers, Google Maps locations, or live Google Search. How can I help you today?",
      timestamp: "Just now",
      roleUsed: "general",
      modelUsed: "gemini-3.5-flash"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationActive, setLocationActive] = useState(false);

  // Music Studio Modal State
  const [musicModalOpen, setMusicModalOpen] = useState(false);
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicMode, setMusicMode] = useState<"clip" | "full">("clip");
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [generatedTrack, setGeneratedTrack] = useState<{ url: string; lyrics?: string; prompt: string; model: string } | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeRoleConfig = ROLES.find(r => r.key === selectedRole) || ROLES[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Request location when Maps role is selected
  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          setLocationActive(true);
          if (showToast) showToast("Location enabled for accurate Maps Grounding!");
        },
        (err) => {
          console.log("Geolocation permission notice:", err.message);
          setLocationActive(false);
        }
      );
    }
  };

  const handleRoleSelect = (roleKey: ChatRole) => {
    setSelectedRole(roleKey);
    if (roleKey === "maps" && !locationActive) {
      requestLocation();
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || loading) return;
    setInput("");

    const nowTime = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    const userMsg: ChatMessage = {
      id: Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: nowTime
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build conversation history (excluding initial greeting)
      const history = messages
        .filter(m => m.id !== 1)
        .slice(-10) // Keep last 10 messages for prompt efficiency
        .map(m => ({
          role: m.sender === "user" ? "user" : "model",
          text: m.text
        }));

      const payload: any = {
        message: textToSend,
        history,
        role: selectedRole,
        taskType: activeRoleConfig.taskType,
        tool: activeRoleConfig.tool,
        systemInstruction: activeRoleConfig.systemInstruction
      };

      if (selectedRole === "maps" && userLocation) {
        payload.location = userLocation;
      }

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: "ai",
        text: data.reply,
        sources: data.sources || [],
        mapsSources: data.mapsSources || [],
        searchQueries: data.searchQueries || [],
        roleUsed: selectedRole,
        modelUsed: data.modelUsed || activeRoleConfig.modelBadge,
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      const friendlyError = formatFriendlyError(err?.message || "");
      if (showToast) showToast(friendlyError);
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: "ai",
        text: friendlyError,
        roleUsed: selectedRole,
        modelUsed: activeRoleConfig.modelBadge,
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: Date.now(),
        sender: "ai",
        text: `Conversation cleared. I am ready in ${activeRoleConfig.label} mode (${activeRoleConfig.modelBadge}).`,
        timestamp: "Just now",
        roleUsed: selectedRole,
        modelUsed: activeRoleConfig.modelBadge
      }
    ]);
    if (showToast) showToast("Chat history cleared");
  };

  // Music Generation Handler
  const handleGenerateMusic = async (presetPrompt?: string) => {
    const promptToUse = (presetPrompt || musicPrompt).trim();
    if (!promptToUse || generatingMusic) return;

    setGeneratingMusic(true);
    if (showToast) showToast(`Generating ${musicMode === "clip" ? "30s clip" : "full track"} with Lyria...`);

    try {
      const res = await fetch("/api/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToUse,
          mode: musicMode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requiresPaidKey) {
          if (showToast) showToast("Lyria music generation requires a paid Gemini API key with billing enabled.");
        }
        throw new Error(data.error || "Music generation failed");
      }

      if (data.audioBase64) {
        const binary = atob(data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
        const audioUrl = URL.createObjectURL(blob);

        setGeneratedTrack({
          url: audioUrl,
          lyrics: data.lyrics,
          prompt: promptToUse,
          model: data.model
        });

        if (showToast) showToast("Music generated successfully!");
      }
    } catch (err: any) {
      console.warn("Music generation error:", err);
      if (showToast) showToast(err?.message || "Music generation currently unavailable");
    } finally {
      setGeneratingMusic(false);
    }
  };

  const togglePlayMusic = () => {
    if (!audioPlayerRef.current || !generatedTrack) return;
    if (isPlayingMusic) {
      audioPlayerRef.current.pause();
      setIsPlayingMusic(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingMusic(true);
    }
  };

  return (
    <div className={`flex flex-col h-full ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      {/* Header */}
      <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b shrink-0 ${dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-100"}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button onClick={onBack} className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ArrowLeft size={20} className={dark ? "text-white" : "text-gray-700"} />
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-sm shrink-0">
            <activeRoleConfig.icon size={19} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold truncate">ChatMe Assistant</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 truncate">
                {activeRoleConfig.modelBadge}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 truncate">
              {activeRoleConfig.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setMusicModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition flex items-center gap-1 shadow-sm"
            title="Open AI Music Studio (Lyria)"
          >
            <Music size={14} />
            <span className="hidden sm:inline">Music Studio</span>
          </button>
          <button
            onClick={handleClearHistory}
            className={`p-2 rounded-xl transition ${dark ? "hover:bg-gray-800 text-gray-400 hover:text-red-400" : "hover:bg-gray-100 text-gray-500 hover:text-red-500"}`}
            title="Clear Chat History"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Role / Persona Selector Bar */}
      <div className={`px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${dark ? "bg-gray-900/90 border-gray-800" : "bg-gray-50/90 border-gray-200/60"}`}>
        {ROLES.map((r) => {
          const Icon = r.icon;
          const isSelected = selectedRole === r.key;
          return (
            <button
              key={r.key}
              onClick={() => handleRoleSelect(r.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition active:scale-95 shrink-0 ${
                isSelected
                  ? "bg-emerald-500 text-white shadow-sm font-semibold"
                  : dark
                  ? "bg-gray-800/80 text-gray-300 hover:bg-gray-800 border border-gray-700/60"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-2xs"
              }`}
            >
              <Icon size={14} className={isSelected ? "text-white" : "text-emerald-500"} />
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Location Bar for Maps Mode */}
      {selectedRole === "maps" && (
        <div className={`px-4 py-2 border-b flex items-center justify-between text-xs shrink-0 ${
          dark ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-300" : "bg-emerald-50/70 border-emerald-100 text-emerald-800"
        }`}>
          <div className="flex items-center gap-1.5">
            <Navigation size={14} className={locationActive ? "text-emerald-500 animate-pulse" : "text-gray-400"} />
            <span>
              {locationActive
                ? `Using live location (${userLocation?.latitude.toFixed(2)}°, ${userLocation?.longitude.toFixed(2)}°)`
                : "Location disabled. Tap to enable local recommendations."}
            </span>
          </div>
          {!locationActive && (
            <button
              onClick={requestLocation}
              className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[11px] font-semibold hover:bg-emerald-600 active:scale-95 transition"
            >
              Enable
            </button>
          )}
        </div>
      )}

      {/* Messages Scrollable Thread */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-xs text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-emerald-500 text-white rounded-br-xs"
                  : dark
                  ? "bg-gray-800 text-gray-100 rounded-bl-xs border border-gray-700/50"
                  : "bg-gray-100 text-gray-900 rounded-bl-xs border border-gray-200/60"
              }`}
            >
              {/* AI Role Badge */}
              {msg.sender === "ai" && msg.modelUsed && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold mb-1">
                  <Bot size={12} />
                  <span>{msg.modelUsed}</span>
                </div>
              )}

              {/* Message Content */}
              <div className="whitespace-pre-wrap break-words">{msg.text}</div>

              {/* Google Maps Grounding Place Cards */}
              {msg.mapsSources && msg.mapsSources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-gray-200/40 dark:border-gray-700/50 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <MapPin size={13} />
                    <span>Google Maps Locations</span>
                  </div>
                  <div className="grid gap-2">
                    {msg.mapsSources.map((loc, idx) => (
                      <a
                        key={idx}
                        href={loc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block p-2.5 rounded-xl border text-xs transition group ${
                          dark
                            ? "bg-gray-900/60 border-gray-700 hover:border-emerald-500/50 text-gray-200"
                            : "bg-white border-gray-200 hover:border-emerald-500/50 text-gray-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="truncate group-hover:underline">{loc.title}</span>
                          <ExternalLink size={12} className="shrink-0" />
                        </div>
                        {loc.reviews && loc.reviews.length > 0 && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            "{loc.reviews[0]}"
                          </p>
                        )}
                        <span className="text-[10px] text-gray-400 mt-1 block">Open in Google Maps →</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Google Search Grounding Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-gray-200/40 dark:border-gray-700/50">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    <Globe size={12} className="text-emerald-500" />
                    <span>Search Sources & References</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border transition ${
                          dark
                            ? "bg-gray-900/80 border-gray-700 text-gray-300 hover:border-emerald-500"
                            : "bg-white border-gray-200 text-gray-700 hover:border-emerald-500 shadow-2xs"
                        }`}
                      >
                        <span className="truncate max-w-[150px]">{src.title}</span>
                        <ExternalLink size={10} className="shrink-0 text-emerald-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`text-[10px] mt-1.5 text-right ${
                  msg.sender === "user" ? "text-emerald-100" : "text-gray-400"
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Bot size={16} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/50">
              <Loader2 size={14} className="animate-spin text-emerald-500" />
              <span>Thinking with {activeRoleConfig.modelBadge}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Pill Carousel */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {activeRoleConfig.suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition active:scale-95 shrink-0 ${
                dark
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-750 border border-gray-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className={`p-3 border-t shrink-0 ${dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-100"}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${activeRoleConfig.label} (${activeRoleConfig.modelBadge})...`}
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-2xl text-sm outline-none border transition ${
              dark
                ? "bg-gray-900 border-gray-800 text-white placeholder-gray-500 focus:border-emerald-500"
                : "bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-500"
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 active:scale-95 disabled:opacity-40 transition shadow-sm shrink-0"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>

      {/* Music Studio Modal (Lyria) */}
      <AnimatePresence>
        {musicModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl overflow-hidden ${
                dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                    <Music size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">AI Music Studio</h3>
                    <p className="text-xs text-gray-400">Powered by Google Lyria Models</p>
                  </div>
                </div>
                <button
                  onClick={() => setMusicModalOpen(false)}
                  className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                >
                  ✕
                </button>
              </div>

              {/* Mode Toggle: Clip (30s) vs Full Track */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setMusicMode("clip")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                    musicMode === "clip"
                      ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                      : dark
                      ? "bg-gray-800 border-gray-700 text-gray-300"
                      : "bg-gray-100 border-gray-200 text-gray-700"
                  }`}
                >
                  30s Music Clip (lyria-3-clip-preview)
                </button>
                <button
                  onClick={() => setMusicMode("full")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                    musicMode === "full"
                      ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                      : dark
                      ? "bg-gray-800 border-gray-700 text-gray-300"
                      : "bg-gray-100 border-gray-200 text-gray-700"
                  }`}
                >
                  Full Track (lyria-3-pro-preview)
                </button>
              </div>

              {/* Preset Moods */}
              <div className="mb-3">
                <label className="text-xs text-gray-400 block mb-1.5">Preset Genres & Styles</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Lofi chill beats with soft piano",
                    "Acoustic guitar summer vibe",
                    "Upbeat electronic synthwave",
                    "Cinematic emotional orchestra",
                    "Deep ambient meditation drone"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMusicPrompt(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                        musicPrompt === preset
                          ? "bg-violet-500/20 border-violet-500 text-violet-400 font-semibold"
                          : dark
                          ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Input */}
              <div className="mb-4">
                <textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder="Describe the track, mood, instruments, rhythm, and style..."
                  rows={3}
                  className={`w-full p-3 rounded-2xl text-xs outline-none border transition resize-none ${
                    dark
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-violet-500"
                      : "bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-500"
                  }`}
                />
              </div>

              {/* Player if generated */}
              {generatedTrack && (
                <div className={`p-4 rounded-2xl border mb-4 ${
                  dark ? "bg-gray-800/80 border-gray-700" : "bg-violet-50 border-violet-200"
                }`}>
                  <audio
                    ref={audioPlayerRef}
                    src={generatedTrack.url}
                    onEnded={() => setIsPlayingMusic(false)}
                    className="hidden"
                  />
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePlayMusic}
                        className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 active:scale-95 transition shadow-sm"
                      >
                        {isPlayingMusic ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                      </button>
                      <div>
                        <p className="text-xs font-bold truncate max-w-[200px]">{generatedTrack.prompt}</p>
                        <span className="text-[10px] text-gray-400">{generatedTrack.model}</span>
                      </div>
                    </div>
                    <a
                      href={generatedTrack.url}
                      download={`chatme_ai_music_${Date.now()}.wav`}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-semibold hover:bg-emerald-600 transition"
                    >
                      Download
                    </a>
                  </div>
                  {generatedTrack.lyrics && (
                    <p className="text-xs italic text-gray-400 mt-2 border-t pt-2 border-gray-200 dark:border-gray-700">
                      Lyrics: "{generatedTrack.lyrics}"
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateMusic()}
                  disabled={generatingMusic || !musicPrompt.trim()}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-xs hover:opacity-90 active:scale-95 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
                >
                  {generatingMusic ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Synthesizing Audio ({musicMode === "clip" ? "lyria-3-clip-preview" : "lyria-3-pro-preview"})...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Generate {musicMode === "clip" ? "30s Clip" : "Full Track"}</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-gray-400 text-center mt-3">
                Generated audio can be attached to ChatMe status updates or shared directly in chats.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
