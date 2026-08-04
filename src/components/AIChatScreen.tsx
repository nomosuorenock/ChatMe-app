import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Sparkles, Send, Bot, User, Loader2, Trash2 } from "lucide-react";

export function AIChatScreen({ currentUser, dark, onBack, showToast }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I am your ChatMe Assistant powered by Gemini. Ask me anything or chat with me!",
      timestamp: "Just now"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      const aiMsg = {
        id: Date.now() + 1,
        sender: "ai",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error connecting to AI");
      const errorMsg = {
        id: Date.now() + 1,
        sender: "ai",
        text: "Sorry, I encountered an error connecting to the ChatMe Assistant service. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-100"}`}>
        {onBack && (
          <button onClick={onBack} className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <ArrowLeft size={20} className={dark ? "text-white" : "text-gray-700"} />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center text-white shadow-md">
          <Sparkles size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-base font-bold truncate ${dark ? "text-white" : "text-gray-900"}`}>ChatMe Assistant</h2>
          <p className="text-[11px] text-green-500 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span> Online & Ready
          </p>
        </div>
        <button
          onClick={() => {
            setMessages([{ id: Date.now(), sender: "ai", text: "Chat history cleared. How can I help you?", timestamp: "Just now" }]);
            showToast("AI chat history cleared");
          }}
          className={`p-2 rounded-xl transition ${dark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
          title="Clear chat"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Message List */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${dark ? "bg-[#0b141a]" : "bg-[#efeae2]"}`}>
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-600 to-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm mb-1">
                  <Bot size={16} />
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm relative ${
                  isUser
                    ? "bg-[#005c4b] text-white rounded-br-xs"
                    : dark
                    ? "bg-gray-800 text-gray-100 rounded-bl-xs"
                    : "bg-white text-gray-900 rounded-bl-xs"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                <div className={`text-[10px] mt-1 text-right ${isUser ? "text-green-200" : "text-gray-400"}`}>
                  {m.timestamp}
                </div>
              </div>
              {isUser && (
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 overflow-hidden shrink-0 shadow-sm mb-1">
                  <img src={currentUser?.photo || "https://i.pravatar.cc/150?img=1"} alt="User" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-600 to-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm mb-1">
              <Bot size={16} />
            </div>
            <div className={`px-4 py-3 rounded-2xl rounded-bl-xs text-sm shadow-sm flex items-center gap-2 ${dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600"}`}>
              <Loader2 size={16} className="animate-spin text-green-500" />
              <span>Gemini is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className={`p-3 border-t flex items-center gap-2 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Gemini AI anything..."
          className={`flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
            dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"
          }`}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="w-11 h-11 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-xl flex items-center justify-center text-white shadow-md transition shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
