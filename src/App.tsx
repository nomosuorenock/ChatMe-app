import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle, Search, ArrowLeft, Smile, Paperclip, Camera, Send,
  Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, MoreVertical,
  Settings as SettingsIcon, LogOut, Edit2, Bell, Lock, Moon, Sun, Info,
  HelpCircle, User, Users, Check, CheckCheck, Plus, Image as ImageIcon,
  X, Mail, Eye, EyeOff, ChevronRight, Upload, Loader2, Shield, KeyRound,
  Clock, Mic, RefreshCw, Play, Pause, Square, Volume2, Film, Trash2, Sparkles,
} from "lucide-react";
import { ContactsSelectionScreen } from "./components/ContactsSelectionScreen";
import { GroupCreationScreen } from "./components/GroupCreationScreen";
import { AIChatScreen } from "./components/AIChatScreen";
import { supabase } from "./lib/supabase";

/* ------------------------------------------------------------------ */
/*  Seed / mock data                                                   */
/* ------------------------------------------------------------------ */

const REPLIES = [
  "Sounds good to me!",
  "Haha true 😄",
  "Let me check and get back to you",
  "That works for me",
  "No way, really?",
  "On it 👍",
];

/* ------------------------------------------------------------------ */
/*  Small shared UI pieces                                             */
/* ------------------------------------------------------------------ */

function Logo({ size = 64, dark = false }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-blue-500 shadow-lg"
        style={{ width: size, height: size }}
      >
        <MessageCircle color="white" size={size * 0.55} strokeWidth={2.2} />
      </div>
    </div>
  );
}

function TextField({ icon: Icon, type = "text", placeholder, value, onChange, error, rightElement, dark }) {
  return (
    <div className="w-full">
      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-3 ${
          error ? "border-red-400" : dark ? "border-gray-700" : "border-gray-200"
        } ${dark ? "bg-gray-800" : "bg-gray-50"}`}
      >
        {Icon && <Icon size={18} className={dark ? "text-gray-400" : "text-gray-400"} />}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`flex-1 bg-transparent outline-none text-sm ${dark ? "text-white placeholder-gray-500" : "text-gray-800 placeholder-gray-400"}`}
        />
        {rightElement}
      </div>
      {error && <p className="mt-1 text-xs text-red-500 pl-1">{error}</p>}
    </div>
  );
}

function PrimaryButton({ children, onClick, color = "green", disabled, type = "button" }) {
  const bg = color === "green" ? "bg-green-500 active:bg-green-600" : "bg-blue-500 active:bg-blue-600";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl py-3.5 text-white font-semibold text-sm shadow-md transition-colors ${bg} ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {children}
    </button>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs px-4 py-2 rounded-xl shadow-lg">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screens: Auth                                                      */
/* ------------------------------------------------------------------ */

function SplashScreen({ dark }) {
  return (
    <div className={`flex flex-col items-center justify-center h-full gap-4 ${dark ? "bg-gray-900" : "bg-white"}`}>
      <Logo size={88} />
      <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>ChatMe</h1>
      <Loader2 className="animate-spin text-green-500 mt-6" size={26} />
    </div>
  );
}

function SignUpScreen({ onSignUp, goSignIn, dark }) {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [photo, setPhoto] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) setPhoto(URL.createObjectURL(file));
  };

  const submit = () => {
    const errs = {};
    if (!fullname.trim()) errs.fullname = "Full name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "Use at least 6 characters";
    if (confirm !== password) errs.confirm = "Passwords do not match";
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      onSignUp({ fullname: fullname.trim(), email: email.trim(), password, photo, bio: "", phone: "" });
    }
  };

  return (
    <div className={`h-full overflow-y-auto px-6 py-8 ${dark ? "bg-gray-900" : "bg-white"}`}>
      <div className="flex flex-col items-center mb-6">
        <Logo size={56} />
        <h1 className={`text-xl font-bold mt-4 ${dark ? "text-white" : "text-gray-900"}`}>Create Account</h1>
        <p className="text-sm text-gray-400 mt-1">Join ChatMe today</p>
      </div>

      <div className="flex flex-col items-center mb-5">
        <button
          onClick={() => fileRef.current?.click()}
          className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden"
        >
          {photo ? (
            <img src={photo} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <Upload size={22} className="text-gray-400" />
          )}
        </button>
        <input type="file" accept="image/*" ref={fileRef} onChange={handlePhoto} className="hidden" />
        <span className="text-xs text-green-600 font-medium mt-2">Upload Profile Photo</span>
      </div>

      <div className="flex flex-col gap-3">
        <TextField icon={User} placeholder="Full Name" value={fullname} onChange={(e) => setFullname(e.target.value)} error={errors.fullname} dark={dark} />
        <TextField icon={Mail} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} dark={dark} />
        <TextField
          icon={Lock}
          type={showPw ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          dark={dark}
          rightElement={
            <button type="button" onClick={() => setShowPw((s) => !s)}>
              {showPw ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-gray-400" />}
            </button>
          }
        />
        <TextField
          icon={Lock}
          type={showPw ? "text" : "password"}
          placeholder="Confirm Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          dark={dark}
        />
      </div>

      <div className="mt-6">
        <PrimaryButton onClick={submit} color="green">Sign Up</PrimaryButton>
      </div>

      <p className={`text-center text-sm mt-5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
        Already have an account?{" "}
        <button onClick={goSignIn} className="text-blue-500 font-semibold">Sign In</button>
      </p>
    </div>
  );
}

function SignInScreen({ onSignIn, goSignUp, goReset, dark }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }
    setError("");
    onSignIn({ email: email.trim(), password });
  };

  return (
    <div className={`h-full overflow-y-auto px-6 py-10 ${dark ? "bg-gray-900" : "bg-white"}`}>
      <div className="flex flex-col items-center mb-8">
        <Logo size={64} />
        <h1 className={`text-xl font-bold mt-4 ${dark ? "text-white" : "text-gray-900"}`}>Welcome Back</h1>
        <p className="text-sm text-gray-400 mt-1">Sign in to continue</p>
      </div>

      <div className="flex flex-col gap-3">
        <TextField icon={Mail} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} dark={dark} />
        <TextField
          icon={Lock}
          type={showPw ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          dark={dark}
          rightElement={
            <button type="button" onClick={() => setShowPw((s) => !s)}>
              {showPw ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-gray-400" />}
            </button>
          }
        />
        {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
      </div>

      <div className="flex justify-end mt-2">
        <button onClick={goReset} className="text-xs text-blue-500 font-medium">Forgot Password?</button>
      </div>

      <div className="mt-6">
        <PrimaryButton onClick={submit} color="blue">Sign In</PrimaryButton>
      </div>

      <p className={`text-center text-sm mt-5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
        Don't have an account?{" "}
        <button onClick={goSignUp} className="text-green-600 font-semibold">Sign Up</button>
      </p>
    </div>
  );
}

function ResetPasswordScreen({ goSignIn, onReset, dark }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (email.trim()) {
      onReset(email.trim());
      setSent(true);
    }
  };

  return (
    <div className={`h-full overflow-y-auto px-6 py-10 ${dark ? "bg-gray-900" : "bg-white"}`}>
      <div className="flex flex-col items-center mb-8">
        <Logo size={56} />
        <h1 className={`text-xl font-bold mt-4 ${dark ? "text-white" : "text-gray-900"}`}>Reset Password</h1>
        <p className="text-sm text-gray-400 mt-1 text-center">Enter your email and we'll send you a reset link</p>
      </div>

      {sent ? (
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
            <Check className="text-green-500" size={26} />
          </div>
          <p className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>Reset link sent to {email}</p>
        </div>
      ) : (
        <>
          <TextField icon={Mail} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} dark={dark} />
          <div className="mt-6">
            <PrimaryButton onClick={submit} color="green">Send Reset Link</PrimaryButton>
          </div>
        </>
      )}

      <p className="text-center text-sm mt-6">
        <button onClick={goSignIn} className="text-blue-500 font-semibold">Back to Sign In</button>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bottom Nav + Top Bar                                                */
/* ------------------------------------------------------------------ */

function BottomNav({ active, onChange, dark }) {
  const items = [
    { key: "chats", label: "Chats", icon: MessageCircle },
    { key: "updates", label: "Updates", icon: RefreshCw },
    { key: "contacts", label: "Contacts", icon: Users },
    { key: "calls", label: "Calls", icon: Phone },
    { key: "ai", label: "Assistant", icon: Sparkles },
    { key: "profile", label: "Profile", icon: User },
  ];
  return (
    <div className={`flex border-t ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
      {items.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5"
          >
            <Icon size={20} className={isActive ? "text-green-500" : "text-gray-400"} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${isActive ? "text-green-500" : "text-gray-400"}`}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ScreenHeader({ title, onBack, dark, right }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-4 border-b ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
      {onBack && (
        <button onClick={onBack}>
          <ArrowLeft size={20} className={dark ? "text-white" : "text-gray-700"} />
        </button>
      )}
      <h1 className={`text-base font-bold flex-1 ${dark ? "text-white" : "text-gray-900"}`}>{title}</h1>
      {right}
    </div>
  );
}

function StatusViewScreen({ status, currentUser, onBack, dark, onDelete, onReply }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState<any[]>(status.viewers || ["Alice", "Bob"]);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    // Record view in supabase if available
    const recordView = async () => {
      try {
        if (currentUser && status.id) {
          await supabase.from("status_views").upsert({
            status_id: status.id,
            user_id: currentUser.id,
            user_name: currentUser.fullname,
            viewed_at: new Date().toISOString()
          }, { onConflict: 'status_id,user_id' });
        }
      } catch (e) {
        // Fallback local
      }
    };
    recordView();
  }, [status, currentUser]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && !isHolding) {
      timer = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            clearInterval(timer);
            setTimeout(() => onBack(), 0);
            return 100;
          }
          return p + 2;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlaying, isHolding, onBack]);

  const isCreator = currentUser && status.user_id === currentUser.id;

  return (
    <div 
      className="flex flex-col h-full bg-black text-white relative select-none"
      onMouseDown={() => setIsHolding(true)}
      onMouseUp={() => setIsHolding(false)}
      onMouseLeave={() => setIsHolding(false)}
      onTouchStart={() => setIsHolding(true)}
      onTouchEnd={() => setIsHolding(false)}
    >
      {/* Top progress bars */}
      <div className="flex gap-1 p-2">
        <div className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
          <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white">
            <ArrowLeft size={24} />
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700">
            <img src={status.user_photo || "https://i.pravatar.cc/150?img=5"} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-semibold text-sm">{status.user_name || "Contact"}</p>
            <p className="text-xs text-gray-400">{new Date(status.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-2">
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          {isCreator && (
            <button onClick={() => { onDelete(status.id); onBack(); }} className="p-2 text-red-400">
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {status.media_type === "image" && (
          <img src={status.media_url} alt="Status" className="max-h-[70vh] max-w-full object-contain rounded-lg" />
        )}
        {status.media_type === "video" && (
          <video src={status.media_url} controls autoPlay className="max-h-[70vh] max-w-full object-contain rounded-lg" />
        )}
        {status.media_type === "voice" && (
          <div className="flex flex-col items-center gap-4 bg-gray-900/80 p-8 rounded-2xl border border-gray-700 shadow-2xl">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white animate-pulse">
              <Mic size={36} />
            </div>
            <p className="text-lg font-medium">Voice Status</p>
            <audio src={status.media_url} controls className="w-64" />
          </div>
        )}
        {status.media_type === "text" && (
          <div className={`w-full h-full flex items-center justify-center p-8 rounded-2xl text-center text-2xl font-bold ${status.bg_color || "bg-gradient-to-br from-purple-600 to-indigo-800"}`}>
            {status.caption || status.media_url}
          </div>
        )}
      </div>

      {/* Caption if any */}
      {status.media_type !== "text" && status.caption && (
        <div className="p-4 text-center bg-black/60 text-sm">
          {status.caption}
        </div>
      )}

      {/* Viewers bar for creator */}
      {isCreator && (
        <div className="p-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-gray-400" />
            <span className="text-sm font-medium">{viewers.length} views</span>
          </div>
          <div className="flex -space-x-2 overflow-hidden">
            {viewers.map((v, i) => (
              <div key={i} className="inline-block h-7 w-7 rounded-full ring-2 ring-gray-900 bg-gray-700 flex items-center justify-center text-xs text-white font-bold">
                {typeof v === 'string' ? v[0] : (v.user_name?.[0] || 'U')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reply bar for viewers */}
      {!isCreator && (
        <div 
          className="p-3 bg-black/80 backdrop-blur-md flex items-center gap-2 z-20"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && replyText.trim()) {
                onReply(status.user_id, replyText);
              }
            }}
            placeholder="Reply to status..."
            className="flex-1 bg-gray-800 text-white placeholder-gray-400 px-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={() => {
              if (replyText.trim()) {
                onReply(status.user_id, replyText);
              }
            }}
            className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white hover:bg-green-600 transition shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

function UpdatesScreen({ dark, currentUser, statuses, onAddStatus, onViewStatus, onDeleteStatus }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // File input refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: any, mediaType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let mediaUrl = URL.createObjectURL(file);
      
      // Try uploading to Supabase Storage bucket 'status-media'
      try {
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage.from('status-media').upload(fileName, file);
        if (!error && data) {
          const { data: publicUrlData } = supabase.storage.from('status-media').getPublicUrl(fileName);
          if (publicUrlData?.publicUrl) {
            mediaUrl = publicUrlData.publicUrl;
          }
        }
      } catch (err) {
        console.log("Supabase storage upload fallback to local URL", err);
      }

      await onAddStatus({
        user_id: currentUser?.id || 1,
        user_name: currentUser?.fullname || "Me",
        user_photo: currentUser?.photo || "https://i.pravatar.cc/150?img=5",
        media_type: mediaType,
        media_url: mediaUrl,
        caption: file.name,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        viewers: []
      });
    } finally {
      setUploading(false);
      setSheetOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <ScreenHeader title="Updates" dark={dark} />
      
      <div className={`p-4 flex-1 overflow-y-auto ${dark ? "bg-gray-950 text-white" : "bg-white text-gray-900"}`}>
        {/* My Status */}
        <div className="flex items-center gap-4 mb-6 cursor-pointer" onClick={() => setSheetOpen(true)}>
          <div className="relative">
            <div className="w-14 h-14 bg-gray-300 rounded-full overflow-hidden border-2 border-green-500 p-0.5">
              <img src={currentUser?.photo || "https://i.pravatar.cc/150?img=5"} alt="Me" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-white dark:border-gray-950">
              <Plus size={12} />
            </div>
          </div>
          <div>
            <p className="font-semibold text-base">My Status</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tap to add status update</p>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Recent updates</p>

        {/* Status List */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statuses.map((status: any) => (
            <div key={status.id} className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer" onClick={() => onViewStatus(status)}>
              <div className="w-16 h-16 rounded-full border-2 border-green-500 p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                  <img src={status.user_photo || "https://i.pravatar.cc/150?img=12"} alt={status.user_name} className="w-full h-full object-cover" />
                </div>
              </div>
              <p className="text-xs font-medium truncate w-16 text-center">{status.user_name?.split(' ')[0]}</p>
            </div>
          ))}
          {statuses.length === 0 && (
            <p className="text-sm text-gray-500 italic py-4">No recent status updates from contacts.</p>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input type="file" ref={cameraInputRef} accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => handleFileSelected(e, 'image')} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" className="hidden" onChange={(e) => handleFileSelected(e, 'image')} />
      <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleFileSelected(e, 'video')} />

      {/* Bottom Sheet for Status Options */}
      {sheetOpen && (
        <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end animate-fadeIn">
          <div className={`p-6 rounded-t-3xl ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"} shadow-2xl`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Create Status</h3>
              <button onClick={() => setSheetOpen(false)}><X size={20} /></button>
            </div>

            {uploading ? (
              <div className="flex items-center justify-center py-12 gap-3">
                <Loader2 className="animate-spin text-green-500" size={28} />
                <span className="font-medium">Uploading status to Supabase...</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 text-center">
                <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/30 transition">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white"><Camera size={22} /></div>
                  <span className="text-xs font-medium">Camera</span>
                </button>
                <button onClick={() => galleryInputRef.current?.click()} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/30 transition">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white"><ImageIcon size={22} /></div>
                  <span className="text-xs font-medium">Gallery</span>
                </button>
                <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/30 transition">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white"><Film size={22} /></div>
                  <span className="text-xs font-medium">Video</span>
                </button>
                <button onClick={() => { setSheetOpen(false); setVoiceModalOpen(true); }} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/30 transition">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white"><Mic size={22} /></div>
                  <span className="text-xs font-medium">Voice</span>
                </button>
              </div>
            )}

            <button onClick={() => { setSheetOpen(false); setTextModalOpen(true); }} className="w-full mt-4 py-3 bg-green-600 text-white font-medium rounded-xl shadow-md hover:bg-green-700 transition">
              Create Text Status
            </button>
          </div>
        </div>
      )}

      {/* Voice Recorder Modal */}
      {voiceModalOpen && (
        <VoiceRecorderModal
          currentUser={currentUser}
          onClose={() => setVoiceModalOpen(false)}
          onSave={async (audioUrl, duration) => {
            await onAddStatus({
              user_id: currentUser?.id || 1,
              user_name: currentUser?.fullname || "Me",
              user_photo: currentUser?.photo || "https://i.pravatar.cc/150?img=5",
              media_type: "voice",
              media_url: audioUrl,
              caption: `Voice status (${duration}s)`,
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 86400000).toISOString(),
              viewers: []
            });
            setVoiceModalOpen(false);
          }}
          dark={dark}
        />
      )}

      {/* Text Status Modal */}
      {textModalOpen && (
        <TextStatusModal
          currentUser={currentUser}
          onClose={() => setTextModalOpen(false)}
          onSave={async (text, bgColor) => {
            await onAddStatus({
              user_id: currentUser?.id || 1,
              user_name: currentUser?.fullname || "Me",
              user_photo: currentUser?.photo || "https://i.pravatar.cc/150?img=5",
              media_type: "text",
              media_url: text,
              caption: text,
              bg_color: bgColor,
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 86400000).toISOString(),
              viewers: []
            });
            setTextModalOpen(false);
          }}
          dark={dark}
        />
      )}
    </div>
  );
}

function VoiceRecorderModal({ currentUser, onClose, onSave, dark }) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (recording && !paused) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording, paused]);

  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setRecording(true);
      setPaused(false);
      setSeconds(0);
    } catch (e) {
      // Fallback timer simulation if mic permission denied
      setRecording(true);
      setPaused(false);
      setSeconds(0);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }
    setPaused(true);
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }
    setPaused(false);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setPaused(false);
  };

  const handleUpload = async () => {
    let finalUrl = audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    try {
      if (audioBlob) {
        const fileName = `voice_${Date.now()}.webm`;
        const { data, error } = await supabase.storage.from('status-media').upload(fileName, audioBlob);
        if (!error && data) {
          const { data: pub } = supabase.storage.from('status-media').getPublicUrl(fileName);
          if (pub?.publicUrl) finalUrl = pub.publicUrl;
        }
      }
    } catch (e) {
      console.log("Storage upload error", e);
    }
    onSave(finalUrl, seconds);
  };

  return (
    <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-md p-6 rounded-2xl ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"} shadow-2xl flex flex-col items-center gap-6`}>
        <div className="flex justify-between w-full items-center">
          <h3 className="font-bold text-lg">Record Voice Status</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="w-28 h-28 rounded-full bg-red-500/10 flex items-center justify-center border-4 border-red-500 animate-pulse">
          <Mic size={48} className="text-red-500" />
        </div>

        <div className="text-3xl font-mono font-bold">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </div>

        {!recording && !audioUrl && (
          <button onClick={startRecording} className="px-6 py-3 bg-red-500 text-white font-semibold rounded-xl shadow-lg hover:bg-red-600 transition">
            Start Recording
          </button>
        )}

        {recording && (
          <div className="flex gap-4">
            {paused ? (
              <button onClick={resumeRecording} className="px-4 py-2 bg-green-500 text-white rounded-lg">Resume</button>
            ) : (
              <button onClick={pauseRecording} className="px-4 py-2 bg-yellow-500 text-white rounded-lg">Pause</button>
            )}
            <button onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white rounded-lg">Stop</button>
          </div>
        )}

        {audioUrl && !recording && (
          <div className="flex flex-col gap-3 w-full">
            <audio src={audioUrl} controls className="w-full" />
            <button onClick={handleUpload} className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl shadow hover:bg-green-700 transition">
              Post Voice Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TextStatusModal({ currentUser, onClose, onSave, dark }) {
  const [text, setText] = useState("");
  const [bgColor, setBgColor] = useState("bg-gradient-to-br from-purple-600 to-indigo-800");

  const colors = [
    "bg-gradient-to-br from-purple-600 to-indigo-800",
    "bg-gradient-to-br from-green-500 to-emerald-700",
    "bg-gradient-to-br from-pink-500 to-rose-600",
    "bg-gradient-to-br from-amber-500 to-orange-600",
    "bg-gradient-to-br from-blue-600 to-cyan-700",
  ];

  return (
    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-md p-6 rounded-2xl ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"} shadow-2xl flex flex-col gap-6`}>
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Create Text Status</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className={`w-full h-48 rounded-2xl flex items-center justify-center p-6 text-white text-center font-bold text-xl ${bgColor}`}>
          {text || "Type your status here..."}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a status..."
          className={`w-full p-3 rounded-xl border ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} resize-none h-24 focus:outline-none focus:ring-2 focus:ring-green-500`}
        />

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Background Color</span>
          <div className="flex gap-2">
            {colors.map((c, i) => (
              <button key={i} onClick={() => setBgColor(c)} className={`w-7 h-7 rounded-full ${c} border-2 ${bgColor === c ? "border-white" : "border-transparent"}`} />
            ))}
          </div>
        </div>

        <button onClick={() => { if (text.trim()) onSave(text, bgColor); }} className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl shadow hover:bg-green-700 transition">
          Post Text Status
        </button>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Home Screen                                                        */
/* ------------------------------------------------------------------ */

function formatLastSeen(isoStr) {
  if (!isoStr) return "recently";
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function timeAgoLabel(ts) {
  return formatLastSeen(ts);
}

function HomeScreen({ users, currentUser, messagesData, unread, openChat, dark }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const rows = users
    .filter((u) => u.id !== currentUser.id && messagesData[u.id])
    .map((u) => {
      const msgs = messagesData[u.id] || [];
      const last = msgs[msgs.length - 1];
      return { user: u, last, unread: unread[u.id] || 0 };
    })
    .filter((r) => r.user.fullname.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <div className={`px-4 py-4 border-b flex items-center gap-3 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        <h1 className={`text-xl font-bold flex-1 ${dark ? "text-white" : "text-gray-900"}`}>ChatMe</h1>
        <button onClick={() => setSearchOpen((s) => !s)}>
          <Search size={20} className="text-green-500" />
        </button>
      </div>
      {searchOpen && (
        <div className={`px-4 py-2 border-b ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
          <TextField icon={Search} placeholder="Search chats" value={query} onChange={(e) => setQuery(e.target.value)} dark={dark} />
        </div>
      )}
      <div className={`flex-1 overflow-y-auto ${dark ? "bg-gray-900" : "bg-white"}`}>
        {rows.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-10">No chats found</p>
        )}
        {rows.map(({ user, last, unread: u }) => (
          <button
            key={user.id}
            onClick={() => openChat(user.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 border-b ${dark ? "border-gray-800 active:bg-gray-800" : "border-gray-50 active:bg-gray-50"}`}
          >
            <div className="relative shrink-0">
              <img src={user.photo} alt={user.fullname} className="w-12 h-12 rounded-xl object-cover" />
              <AnimatePresence>
                {user.online && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white"
                  />
                )}
              </AnimatePresence>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}>{user.fullname}</span>
                <span className="text-[11px] text-gray-400 shrink-0 ml-2">{last ? timeAgoLabel(last.timestamp) : ""}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className={`text-xs truncate ${u > 0 ? (dark ? "text-gray-200" : "text-gray-700") : "text-gray-400"}`}>
                  {last ? (last.senderId === currentUser.id ? "You: " : "") + last.text : "Say hi 👋"}
                </span>
                {u > 0 && (
                  <span className="ml-2 shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {u}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const WALLPAPERS = {
  default: "bg-gray-50 dark:bg-gray-950",
  blue: "bg-blue-50 dark:bg-blue-950",
  green: "bg-green-50 dark:bg-green-950",
  gray: "bg-gray-100 dark:bg-gray-900",
};

/* ------------------------------------------------------------------ */
/*  Chat Screen                                                        */
/* ------------------------------------------------------------------ */

function ChatScreen({ contact, currentUser, messages, onSend, onReact, onBack, typing, dark, wallpaper, onEditGroup }) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const endRef = useRef(null);
  const [menuOpenForId, setMenuOpenForId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const timerRef = useRef(null);

  const isImageUrl = (text) => /\.(jpeg|jpg|gif|png)$/i.test(text);
  const images = messages.filter(m => isImageUrl(m.text)).map(m => m.text);

  const startRecording = () => {
    setIsRecording(true);
    setStartTime(Date.now());
  };

  const stopRecording = () => {
    setIsRecording(false);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onSend(`[VOICE:${duration}s]`);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing]);

  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  const startLongPress = (id) => {
    timerRef.current = setTimeout(() => {
      setMenuOpenForId(id);
    }, 500);
  };
  
  const clearTimer = () => clearTimeout(timerRef.current);

  return (
    <div className="flex flex-col h-full relative">
      <div className={`flex items-center gap-3 px-3 py-3 border-b ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        <button onClick={onBack}>
          <ArrowLeft size={20} className={dark ? "text-white" : "text-gray-700"} />
        </button>
        <div 
          className="relative shrink-0 cursor-pointer"
          onClick={() => contact.isGroup && onEditGroup && onEditGroup(contact)}
        >
          <img src={contact.photo} alt={contact.fullname} className="w-9 h-9 rounded-xl object-cover" />
          <AnimatePresence>
            {contact.online && !contact.isGroup && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"
              />
            )}
          </AnimatePresence>
        </div>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => contact.isGroup && onEditGroup && onEditGroup(contact)}
        >
          <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}>{contact.fullname}</p>
          <p className="text-[11px] text-gray-400">
            {typing ? <span className="text-green-500">{contact.fullname} is typing…</span> : contact.isGroup ? `${(contact.members || []).length + 1} members (Tap to manage)` : contact.online ? "Online" : `Last seen ${contact.lastSeen || "recently"}`}
          </p>
        </div>
        {contact.isGroup && (
          <button 
            onClick={() => onEditGroup && onEditGroup(contact)}
            className={`p-2 rounded-xl transition ${dark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`}
            title="Manage Group Members"
          >
            <Users size={18} />
          </button>
        )}
        <Phone size={18} className="text-blue-500" />
        <Video size={18} className="text-blue-500" />
        <button onClick={() => setShowGallery(true)}><ImageIcon size={18} className={dark ? "text-white" : "text-gray-700"} /></button>
      </div>

      <div className={`flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 ${WALLPAPERS[wallpaper] || WALLPAPERS.default}`}>
        {messages.map((m) => {
          const mine = m.senderId === currentUser.id;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[75%] rounded-xl px-3 py-2 text-sm relative ${
                  mine ? "bg-green-500 text-white rounded-br-sm" : dark ? "bg-gray-800 text-gray-100 rounded-bl-sm" : "bg-white text-gray-800 rounded-bl-sm shadow-sm"
                }`}
                onMouseDown={() => startLongPress(m.id)}
                onMouseUp={clearTimer}
                onMouseLeave={clearTimer}
                onTouchStart={() => startLongPress(m.id)}
                onTouchEnd={clearTimer}
              >
                {isImageUrl(m.text) ? (
                  <img src={m.text} alt="chat" className="max-w-xs rounded-lg cursor-pointer" onClick={() => setLightbox(m.text)} />
                ) : m.text.startsWith("[VOICE:") ? (
                  <div className="flex items-center gap-2">
                    <Mic size={16} />
                    <span>{m.text.replace("[VOICE:", "").replace("]", "")}</span>
                  </div>
                ) : (
                  m.text
                )}
                {m.reaction && <span className="absolute -bottom-2 -right-1 text-xs bg-white dark:bg-gray-800 px-0.5 rounded-full border shadow-sm">{m.reaction}</span>}
              </div>
              <div className="flex items-center gap-1 mt-0.5 px-1">
                <span className="text-[10px] text-gray-400">{m.timestamp}</span>
                 {mine && (
                   m.status === "read" ? <CheckCheck size={12} className="text-blue-500" /> :
                   m.status === "delivered" ? <CheckCheck size={12} className="text-gray-400" /> :
                   <Check size={12} className="text-gray-400" />
                 )}
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex items-start">
            <div className={`rounded-xl rounded-bl-sm px-3 py-2 ${dark ? "bg-gray-800" : "bg-white shadow-sm"}`}>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {menuOpenForId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setMenuOpenForId(null)}>
          <div className={`rounded-xl p-3 flex gap-2 shadow-xl ${dark ? "bg-gray-800" : "bg-white"}`}>
            {["❤️", "👍", "😂", "😮", "😢", "😡"].map(emoji => (
              <button key={emoji} onClick={() => { onReact(menuOpenForId, emoji); setMenuOpenForId(null); }} className="text-xl hover:scale-125 transition-transform">{emoji}</button>
            ))}
          </div>
        </div>
      )}

      {lightbox && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="full" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}

      {showGallery && (
        <div className={`absolute inset-0 z-50 flex flex-col p-4 ${dark ? "bg-gray-900" : "bg-white"}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`font-bold ${dark ? "text-white" : "text-gray-900"}`}>Gallery</h2>
            <button onClick={() => setShowGallery(false)} className="text-green-500">Close</button>
          </div>
          <div className="grid grid-cols-3 gap-2 overflow-y-auto">
            {images.map(src => <img src={src} key={src} className="w-full aspect-square object-cover rounded-lg" onClick={() => setLightbox(src)} />)}
          </div>
        </div>
      )}

      <div className={`flex items-center gap-2 px-3 py-2.5 border-t ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        <button><Smile size={20} className="text-gray-400" /></button>
        <button><Paperclip size={20} className="text-gray-400" /></button>
        <button><Camera size={20} className="text-gray-400" /></button>
        <button onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isRecording ? "bg-red-500" : "bg-gray-200"}`}>
          <Mic size={16} className={isRecording ? "text-white" : "text-gray-600"} />
        </button>
        <input
          value={isRecording ? "Recording..." : text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message"
          className={`flex-1 rounded-xl px-3 py-2 text-sm outline-none ${dark ? "bg-gray-800 text-white placeholder-gray-500" : "bg-gray-100 text-gray-800 placeholder-gray-400"}`}
        />
        <button onClick={send} className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contacts Screen                                                    */
/* ------------------------------------------------------------------ */

function ContactsScreen({ users, currentUser, openChat, dark, setScreen, setEditingGroup, onSyncGoogleContacts }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name"); // "name" | "active"

  const contacts = users
    .filter((u) => {
      if (currentUser && u.id === currentUser.id) return false;
      const q = query.toLowerCase();
      return (
        u.fullname.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.bio && u.bio.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.fullname.localeCompare(b.fullname);
      if (a.online !== b.online) return a.online ? -1 : 1;
      return 0;
    });

  return (
    <div className={`flex flex-col h-full ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      <ScreenHeader 
        title="Contacts" 
        dark={dark} 
        right={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSortBy(s => s === "name" ? "active" : "name")} 
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${dark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
               Sort: {sortBy === "name" ? "Name" : "Active"}
            </button>
            <button 
              onClick={() => { setEditingGroup(null); setScreen("contactsSelection"); }}
              className={`p-2 rounded-xl transition ${dark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`}
              title="New Group"
            >
              <Users size={20} />
            </button>
          </div>
        } 
      />
      <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        <div className="flex-1">
          <TextField 
            icon={Search} 
            placeholder="Search by name, username, or bio..." 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            dark={dark} 
          />
        </div>
        <button
          onClick={onSyncGoogleContacts}
          className="shrink-0 flex items-center gap-1.5 text-xs text-green-500 hover:text-green-600 font-semibold px-3 py-2 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200/50 dark:border-green-800/50 transition shadow-sm"
          title="Sync Google Contacts"
        >
          <Users size={15} /> Sync Google
        </button>
      </div>
      <div className={`flex-1 overflow-y-auto ${dark ? "bg-gray-900" : "bg-white"}`}>
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-6 text-center">
            <Users size={40} className="mb-2 opacity-40" />
            <p className="text-sm font-medium">No contacts found</p>
            <p className="text-xs text-gray-400 mt-1">Try searching with a different keyword</p>
          </div>
        ) : (
          contacts.map((u) => (
            <div
              key={u.id}
              onClick={() => openChat(u.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 border-b cursor-pointer transition ${
                dark ? "border-gray-800 hover:bg-gray-800/60 active:bg-gray-800" : "border-gray-50 hover:bg-gray-50/80 active:bg-gray-100"
              }`}
            >
              <div className="relative shrink-0">
                <img src={u.photo} alt={u.fullname} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                <AnimatePresence>
                  {u.online && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"
                    />
                  )}
                </AnimatePresence>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}>{u.fullname}</p>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {u.online ? "Online" : u.lastSeen || "Offline"}
                  </span>
                </div>
                <p className={`text-xs truncate ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  {u.bio || u.email || "Hey there! I am using ChatMe"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openChat(u.id);
                  }}
                  className={`p-2 rounded-xl transition ${dark ? "hover:bg-gray-700 text-green-400" : "hover:bg-green-50 text-green-600"}`}
                  title="Message"
                >
                  <MessageCircle size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Calls Screen                                                       */
/* ------------------------------------------------------------------ */

function CallsScreen({ calls, users, dark, onCall }) {
  const [tab, setTab] = useState("all");
  const filtered = calls.filter((c) => {
    if (tab === "missed") return c.missed;
    if (tab === "voice") return c.type === "voice";
    if (tab === "video") return c.type === "video";
    return true;
  });

  const tabs = [
    { key: "all", label: "All" },
    { key: "voice", label: "Voice" },
    { key: "video", label: "Video" },
    { key: "missed", label: "Missed" },
  ];

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Calls" dark={dark} />
      <div className={`flex gap-2 px-4 py-3 border-b overflow-x-auto ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 ${
              tab === t.key ? "bg-green-500 text-white" : dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={`flex-1 overflow-y-auto ${dark ? "bg-gray-900" : "bg-white"}`}>
        {filtered.length === 0 && <p className="text-center text-sm text-gray-400 mt-10">No calls yet</p>}
        {filtered.map((c) => {
          const u = users.find((usr) => usr.id === c.userId);
          if (!u) return null;
          const DirIcon = c.missed ? PhoneMissed : c.direction === "incoming" ? PhoneIncoming : PhoneOutgoing;
          const dirColor = c.missed ? "text-red-500" : "text-green-500";
          return (
            <div key={c.id} className={`flex items-center gap-3 px-4 py-3 border-b ${dark ? "border-gray-800" : "border-gray-50"}`}>
              <img src={u.photo} alt={u.fullname} className="w-11 h-11 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${c.missed ? "text-red-500" : dark ? "text-white" : "text-gray-900"}`}>{u.fullname}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <DirIcon size={12} className={dirColor} />
                  <span className="text-[11px] text-gray-400">{c.timestamp}{c.duration ? ` · ${c.duration}` : ""}</span>
                </div>
              </div>
              <button onClick={() => onCall(u, c.type)} className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
                {c.type === "video" ? <Video size={14} className="text-white" /> : <Phone size={14} className="text-white" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile Screen                                                     */
/* ------------------------------------------------------------------ */

import { QRCodeSVG } from "qrcode.react";

function ProfileScreen({ user, goEdit, goSettings, onLogout, dark }) {
  return (
    <div className={`flex flex-col h-full overflow-y-auto ${dark ? "bg-gray-900" : "bg-white"}`}>
      <ScreenHeader title="Profile" dark={dark} />
      <div className="flex flex-col items-center py-8 px-6">
        <img src={user.photo} alt={user.fullname} className="w-24 h-24 rounded-xl object-cover shadow-md" />
        <h2 className={`text-lg font-bold mt-4 ${dark ? "text-white" : "text-gray-900"}`}>{user.fullname}</h2>
        <p className="text-sm text-gray-400">{user.email}</p>
        <div className={`mt-6 p-3 rounded-xl ${dark ? "bg-white" : "bg-white"}`}>
           <QRCodeSVG value={`${user.fullname} | ${user.email}`} size={128} />
        </div>
        {user.bio && <p className={`text-sm text-center mt-3 ${dark ? "text-gray-300" : "text-gray-600"}`}>{user.bio}</p>}
        {user.phone && <p className="text-sm text-gray-400 mt-1">{user.phone}</p>}
      </div>

      <div className="px-6 flex flex-col gap-3 pb-8">
        <PrimaryButton onClick={goEdit} color="green">Edit Profile</PrimaryButton>
        <button
          onClick={goSettings}
          className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${dark ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"}`}
        >
          <SettingsIcon size={18} className="text-blue-500" /> Settings
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-500"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );
}

function EditProfileScreen({ user, onSave, onBack, dark }) {
  const [fullname, setFullname] = useState(user.fullname);
  const [bio, setBio] = useState(user.bio || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [photo, setPhoto] = useState(user.photo);
  const fileRef = useRef(null);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) setPhoto(URL.createObjectURL(file));
  };

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${dark ? "bg-gray-900" : "bg-white"}`}>
      <ScreenHeader title="Edit Profile" onBack={onBack} dark={dark} />
      <div className="px-6 py-6 flex flex-col gap-4">
        <div className="flex flex-col items-center">
          <button onClick={() => fileRef.current?.click()} className="relative">
            <img src={photo} alt="profile" className="w-20 h-20 rounded-xl object-cover" />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center">
              <Camera size={12} className="text-white" />
            </span>
          </button>
          <input type="file" accept="image/*" ref={fileRef} onChange={handlePhoto} className="hidden" />
        </div>
        <TextField icon={User} placeholder="Full Name" value={fullname} onChange={(e) => setFullname(e.target.value)} dark={dark} />
        <TextField icon={Info} placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} dark={dark} />
        <TextField icon={Phone} placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} dark={dark} />
        <PrimaryButton color="green" onClick={() => onSave({ fullname, bio, phone, photo })}>Save Changes</PrimaryButton>
      </div>
    </div>
  );
}

function ChangePasswordScreen({ onBack, onSave, dark }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!current || !next || !confirm) return setError("All fields are required");
    if (next !== confirm) return setError("New passwords do not match");
    setError("");
    onSave(next);
  };

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${dark ? "bg-gray-900" : "bg-white"}`}>
      <ScreenHeader title="Change Password" onBack={onBack} dark={dark} />
      <div className="px-6 py-6 flex flex-col gap-4">
        <TextField icon={KeyRound} type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} dark={dark} />
        <TextField icon={Lock} type="password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} dark={dark} />
        <TextField icon={Lock} type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} dark={dark} />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <PrimaryButton color="blue" onClick={submit}>Update Password</PrimaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Screen                                                    */
/* ------------------------------------------------------------------ */

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${on ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"}`}
    >
      <span className="w-5 h-5 rounded-full bg-white shadow" />
    </button>
  );
}

function SettingsScreen({ dark, setDark, notifications, setNotifications, onBack, goChangePw, goInfo, onLogout, wallpaper, setWallpaper }) {
  return (
    <div className={`flex flex-col h-full overflow-y-auto ${dark ? "bg-gray-900" : "bg-white"}`}>
      <ScreenHeader title="Settings" onBack={onBack} dark={dark} />
      <div className="px-4 py-4 flex flex-col gap-2">
        <div className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
          <div className="flex items-center gap-3">
            <Moon size={18} className="text-blue-500" />
            <span className={`text-sm font-medium ${dark ? "text-gray-100" : "text-gray-800"}`}>Dark Mode</span>
          </div>
          <Toggle on={dark} onChange={setDark} />
        </div>
        
        <div className={`rounded-xl px-4 py-3.5 ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
           <span className={`text-sm font-medium ${dark ? "text-gray-100" : "text-gray-800"}`}>Wallpaper</span>
           <div className="flex gap-2 mt-2">
             {Object.keys(WALLPAPERS).map(key => (
               <button 
                 key={key} 
                 onClick={() => setWallpaper(key)}
                 className={`w-8 h-8 rounded-full border-2 ${wallpaper === key ? 'border-green-500' : 'border-transparent'} ${WALLPAPERS[key].split(" ")[0].replace("bg-", "bg-")}`}
               />
             ))}
           </div>
        </div>

        <div className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-blue-500" />
            <span className={`text-sm font-medium ${dark ? "text-gray-100" : "text-gray-800"}`}>Notifications</span>
          </div>
          <Toggle on={notifications} onChange={setNotifications} />
        </div>

        {[
          { icon: Shield, label: "Privacy", action: () => goInfo("privacy") },
          { icon: KeyRound, label: "Change Password", action: goChangePw },
          { icon: Info, label: "About", action: () => goInfo("about") },
          { icon: HelpCircle, label: "Help", action: () => goInfo("help") },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${dark ? "bg-gray-800" : "bg-gray-50"}`}
          >
            <div className="flex items-center gap-3">
              <Icon size={18} className="text-blue-500" />
              <span className={`text-sm font-medium ${dark ? "text-gray-100" : "text-gray-800"}`}>{label}</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        ))}

        <button onClick={onLogout} className="flex items-center gap-3 rounded-xl px-4 py-3.5 mt-2 border border-red-200">
          <LogOut size={18} className="text-red-500" />
          <span className="text-sm font-medium text-red-500">Logout</span>
        </button>
      </div>
    </div>
  );
}

function InfoScreen({ kind, onBack, dark }) {
  const content = {
    privacy: {
      title: "Privacy",
      body: "Control who can see your online status, last seen, and read receipts. Your messages are only visible to you and the people you chat with.",
    },
    about: {
      title: "About",
      body: "ChatMe v1.0.0 — a simple, modern way to stay in touch. Built with care for fast, clean conversations.",
    },
    help: {
      title: "Help",
      body: "Need a hand? Reach out to support@chatme.com or browse frequently asked questions in the community forum.",
    },
  }[kind];

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${dark ? "bg-gray-900" : "bg-white"}`}>
      <ScreenHeader title={content.title} onBack={onBack} dark={dark} />
      <p className={`px-6 py-6 text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>{content.body}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root App                                                           */
/* ------------------------------------------------------------------ */

export default function App() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [screen, setScreen] = useState("splash");
  const [activeTab, setActiveTab] = useState("chats");
  const [activeChatId, setActiveChatId] = useState(null);
  const [messagesData, setMessagesData] = useState<Record<string, any[]>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [calls, setCalls] = useState<any[]>([]);
  const [dark, setDark] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [typingFor, setTypingFor] = useState(null);
  const [toast, setToast] = useState("");
  const [wallpaper, setWallpaper] = useState("default");
  const [selectedContactsForGroup, setSelectedContactsForGroup] = useState([]);
  const [editingGroup, setEditingGroup] = useState(null);
  const [statuses, setStatuses] = useState<any[]>([]);

  const loadUserData = async (authUser) => {
    try {
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!profile) {
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', authUser.email)
          .single();

        if (profileByEmail) {
          profile = profileByEmail;
        } else {
          const newProfile = {
            id: authUser.id,
            user_id: authUser.id,
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.fullname || authUser.email?.split('@')[0] || 'User',
            fullname: authUser.user_metadata?.full_name || authUser.user_metadata?.fullname || authUser.email?.split('@')[0] || 'User',
            email: authUser.email,
            avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.photo || "https://i.pravatar.cc/150?img=68",
            photo: authUser.user_metadata?.avatar_url || authUser.user_metadata?.photo || "https://i.pravatar.cc/150?img=68",
            bio: "Hey there! I am using ChatMe",
            phone: "",
            online: true,
            created_at: new Date().toISOString()
          };
          await supabase.from('profiles').upsert(newProfile);
          profile = newProfile;
        }
      }

      const formattedUser = {
        id: profile.id || authUser.id,
        fullname: profile.full_name || profile.fullname || authUser.user_metadata?.full_name || authUser.user_metadata?.fullname || "User",
        email: profile.email || authUser.email,
        photo: profile.avatar_url || profile.photo || authUser.user_metadata?.avatar_url || authUser.user_metadata?.photo || "https://i.pravatar.cc/150?img=68",
        bio: profile.bio || "",
        phone: profile.phone || "",
        online: true,
        created_at: profile.created_at || new Date().toISOString()
      };

      setCurrentUser(formattedUser);

      const nowIso = new Date().toISOString();
      await supabase
        .from('profiles')
        .update({ online: true, last_seen: nowIso })
        .eq('id', profile.id || authUser.id);

      const { data: allProfiles } = await supabase.from('profiles').select('*');
      if (allProfiles && allProfiles.length > 0) {
        setUsers(allProfiles.map(p => ({
          id: p.id || p.user_id,
          fullname: p.full_name || p.fullname || p.name || "User",
          email: p.email || "",
          photo: p.avatar_url || p.photo || "https://i.pravatar.cc/150?img=1",
          bio: p.bio || "Hey there! I am using ChatMe",
          phone: p.phone || "",
          online: p.online !== undefined ? p.online : true,
          lastSeen: formatLastSeen(p.last_seen)
        })));
      } else {
        setUsers([formattedUser]);
      }

      const { data: statusData } = await supabase.from('status_posts').select('*');
      if (statusData && statusData.length > 0) {
        setStatuses(statusData.filter(s => new Date(s.expires_at) > new Date()));
      } else {
        setStatuses([]);
      }

      setScreen("home");
      setActiveTab("chats");
    } catch (e) {
      console.error("Error loading user data:", e);
      setScreen("signin");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setScreen("signin");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setCurrentUser(null);
        setScreen("signin");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const channel = supabase
        .channel('public:profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          if (payload.new) {
            const p = payload.new as any;
            const updatedUser = {
              id: p.id || p.user_id,
              fullname: p.fullname || p.name || "User",
              email: p.email || "",
              photo: p.photo || p.avatar_url || "https://i.pravatar.cc/150?img=1",
              bio: p.bio || "Hey there! I am using ChatMe",
              phone: p.phone || "",
              online: p.online !== undefined ? p.online : true,
              lastSeen: formatLastSeen(p.last_seen)
            };
            setUsers(prev => {
              const idx = prev.findIndex(u => u.id === updatedUser.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...updatedUser };
                return copy;
              } else {
                return [...prev, updatedUser];
              }
            });
          }
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {}
  }, []);

  const handleAddStatus = async (newStatus) => {
    const statusWithId = { ...newStatus, id: Date.now() };
    setStatuses(prev => [statusWithId, ...prev]);
    showToast("Status posted successfully!");

    try {
      await supabase.from('status_posts').insert({
        user_id: newStatus.user_id,
        media_type: newStatus.media_type,
        media_url: newStatus.media_url,
        caption: newStatus.caption,
        bg_color: newStatus.bg_color || null,
        created_at: newStatus.created_at,
        expires_at: newStatus.expires_at
      });
    } catch (e) {
      console.log("Supabase insert status fallback", e);
    }
  };

  const handleDeleteStatus = async (id) => {
    setStatuses(prev => prev.filter(s => s.id !== id));
    showToast("Status deleted");
    try {
      await supabase.from('status_posts').delete().eq('id', id);
    } catch (e) {}
  };

  const handleReplyStatus = (contactId, replyText) => {
    const newMsg = {
      id: Date.now(),
      senderId: currentUser.id,
      text: `Replied to status: "${replyText}"`,
      timestamp: "Just now",
      status: "sent",
      reaction: null
    };
    setMessagesData(prev => ({
      ...prev,
      [contactId]: [...(prev[contactId] || []), newMsg]
    }));
    const contactObj = users.find(u => u.id === contactId);
    showToast(`Reply sent to ${contactObj?.fullname || "contact"}!`);
    setScreen("home");
    setActiveTab("chats");
    openChat(contactId);
  };

  useEffect(() => {
    if (screen === "splash") {
      const t = setTimeout(() => {
        if (!currentUser) setScreen("signin");
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [screen, currentUser]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const handleSignUp = async ({ fullname, email, password, photo, bio, phone }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullname,
            avatar_url: photo || "https://i.pravatar.cc/150?img=68"
          }
        }
      });
      if (error) {
        showToast(error.message);
        return;
      }
      if (data.user) {
        const profileData = {
          id: data.user.id,
          user_id: data.user.id,
          full_name: fullname,
          fullname,
          email,
          avatar_url: photo || "https://i.pravatar.cc/150?img=68",
          photo: photo || "https://i.pravatar.cc/150?img=68",
          bio: bio || "Hey there! I am using ChatMe",
          phone: phone || "",
          online: true,
          created_at: new Date().toISOString()
        };
        await supabase.from('profiles').upsert(profileData);
        showToast("Account created successfully!");
        if (data.session) {
          loadUserData(data.user);
        } else {
          setScreen("signin");
        }
      }
    } catch (e: any) {
      showToast(e.message || "Sign up failed");
    }
  };

  const handleSignIn = async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        showToast(error.message);
        return;
      }
      if (data.user) {
        loadUserData(data.user);
      }
    } catch (e: any) {
      showToast(e.message || "Sign in failed");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setCurrentUser(null);
    setScreen("signin");
    setActiveChatId(null);
  };

  const handleResetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        showToast(error.message);
      } else {
        showToast("Password reset email sent!");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to send reset email");
    }
  };

  const handleSyncGoogleContacts = async () => {
    if ('contacts' in navigator && (navigator.contacts as any).select) {
      try {
        const props = ['name', 'tel', 'email'];
        const opts = { multiple: true };
        const imported = await (navigator.contacts as any).select(props, opts);
        if (imported && imported.length > 0) {
          const newUsers = imported.map((c: any, index: number) => ({
            id: Date.now() + index,
            fullname: c.name?.[0] || 'Device Contact',
            username: (c.name?.[0] || 'contact').toLowerCase().replace(/\s+/g, ''),
            phone: c.tel?.[0] || '+1 555-0199',
            email: c.email?.[0] || '',
            photo: 'https://i.pravatar.cc/150?img=' + ((index % 70) + 1),
            online: true,
            bio: 'Imported from device contacts'
          }));
          setUsers(prev => [...prev, ...newUsers]);
          showToast(`Successfully imported ${newUsers.length} device contacts!`);
          return;
        }
      } catch (e) {
        console.log('Contact Picker cancelled or not supported', e);
      }
    }

    // Simulate Google Contacts sync with professional contacts
    const googleContactsPool = [
      { fullname: "Sarah Jenkins", username: "sarahj", phone: "+1 555-0142", email: "sarah.jenkins@gmail.com", photo: "https://i.pravatar.cc/150?img=32", bio: "Product Designer | Google Contacts" },
      { fullname: "David Miller", username: "dmiller", phone: "+1 555-0188", email: "david.miller@work.com", photo: "https://i.pravatar.cc/150?img=12", bio: "Software Engineer | Google Contacts" },
      { fullname: "Priya Patel", username: "priyap", phone: "+1 555-0193", email: "priya.patel@gmail.com", photo: "https://i.pravatar.cc/150?img=45", bio: "Marketing Director | Google Contacts" },
      { fullname: "Marcus Vance", username: "mvance", phone: "+1 555-0167", email: "marcus.vance@tech.io", photo: "https://i.pravatar.cc/150?img=68", bio: "Engineering Lead | Google Contacts" },
      { fullname: "Elena Rostova", username: "elena_r", phone: "+1 555-0121", email: "elena.rostova@design.co", photo: "https://i.pravatar.cc/150?img=25", bio: "UX Researcher | Google Contacts" }
    ];

    const timestamp = Date.now();
    const syncedUsers = googleContactsPool.map((c, idx) => ({
      id: timestamp + idx,
      ...c,
      online: true
    }));

    setUsers(prev => {
      // avoid duplicates by username
      const existingUsernames = new Set(prev.map(u => u.username));
      const uniqueNew = syncedUsers.filter(u => !existingUsernames.has(u.username));
      return [...prev, ...uniqueNew];
    });

    showToast(`Successfully synced 5 Google Contacts!`);
  };

  const fetchMessagesForUser = async (otherUserId) => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        const mapped = data.map(m => ({
          id: m.id || Date.parse(m.created_at) + Math.random(),
          senderId: m.sender_id,
          text: m.message || m.text,
          timestamp: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          status: m.read ? 'read' : 'delivered',
          reaction: m.reaction || null
        }));
        if (mapped.length > 0) {
          setMessagesData(prev => ({ ...prev, [otherUserId]: mapped }));
        }
      }

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', currentUser.id);
    } catch (e) {
      console.log("Fetch messages fallback", e);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    try {
      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
          const m = payload.new;
          if (!m) return;
          const partnerId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
          if (!partnerId) return;

          const formattedMsg = {
            id: m.id || Date.now(),
            senderId: m.sender_id,
            text: m.message || m.text,
            timestamp: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            status: m.read ? 'read' : 'delivered',
            reaction: m.reaction || null
          };

          if (payload.eventType === 'INSERT') {
            setMessagesData(prev => {
              const existing = prev[partnerId] || [];
              if (existing.some(item => item.id === formattedMsg.id || (item.text === formattedMsg.text && item.senderId === formattedMsg.senderId && Math.abs(new Date(item.timestamp).getTime() - new Date(formattedMsg.timestamp).getTime()) < 5000))) {
                return prev;
              }
              return {
                ...prev,
                [partnerId]: [...existing, formattedMsg]
              };
            });

            if (m.receiver_id === currentUser.id && m.sender_id !== activeChatId) {
              setUnread(prev => ({ ...prev, [m.sender_id]: (prev[m.sender_id] || 0) + 1 }));
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessagesData(prev => {
              const existing = prev[partnerId] || [];
              return {
                ...prev,
                [partnerId]: existing.map(item => item.id === formattedMsg.id ? { ...item, ...formattedMsg } : item)
              };
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {}
  }, [currentUser, activeChatId]);

  const updateLastSeen = async () => {
    if (currentUser?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ online: true, last_seen: new Date().toISOString() })
          .eq('id', currentUser.id);
      } catch (e) {}
    }
  };

  const openChat = (userId) => {
    setActiveChatId(userId);
    setUnread((prev) => ({ ...prev, [userId]: 0 }));
    setScreen("chat");
    fetchMessagesForUser(userId);
    updateLastSeen();
  };

  const handleSend = async (text) => {
    if (!currentUser || !activeChatId) return;
    updateLastSeen();
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const newMsg = { id: Date.now(), senderId: currentUser.id, text, timestamp, status: "sent", reaction: null };
    setMessagesData((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg],
    }));

    try {
      await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: activeChatId,
        message: text,
        created_at: now.toISOString(),
        read: false
      });
    } catch (e) {
      console.log("Supabase send message fallback", e);
    }

    setTimeout(() => {
      setMessagesData((prev) => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).map((m) => (m.id === newMsg.id ? { ...m, status: "delivered" } : m)),
      }));
    }, 700);

    setTimeout(() => setTypingFor(activeChatId), 1200);

    setTimeout(() => {
      setTypingFor(null);
      const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      const replyTime = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      setMessagesData((prev) => ({
        ...prev,
        [activeChatId]: [
          ...(prev[activeChatId] || []).map((m) => (m.id === newMsg.id ? { ...m, status: "read" } : m)),
          { id: Date.now() + 1, senderId: activeChatId, text: reply, timestamp: replyTime, status: "delivered", reaction: null },
        ],
      }));
    }, 2800);
  };

  const handleReact = async (messageId, emoji) => {
    setMessagesData((prev) => ({
      ...prev,
      [activeChatId]: (prev[activeChatId] || []).map((m) => (m.id === messageId ? { ...m, reaction: emoji } : m)),
    }));

    try {
      await supabase
        .from('messages')
        .update({ reaction: emoji })
        .eq('id', messageId);
    } catch (e) {
      console.log("Supabase reaction update fallback", e);
    }
  };


  const handleCall = (user, type) => {
    showToast(`Calling ${user.fullname}… (${type})`);
  };

  let body = null;
  const dk = dark;

  if (screen === "splash") body = <SplashScreen dark={dk} />;
  else if (screen === "signup")
    body = <SignUpScreen onSignUp={handleSignUp} goSignIn={() => setScreen("signin")} dark={dk} />;
  else if (screen === "signin")
    body = (
      <SignInScreen
        onSignIn={handleSignIn}
        goSignUp={() => setScreen("signup")}
        goReset={() => setScreen("reset")}
        dark={dk}
      />
    );
  else if (screen === "reset") body = <ResetPasswordScreen goSignIn={() => setScreen("signin")} onReset={handleResetPassword} dark={dk} />;
  else if (screen === "chat" && activeChatId) {
    const contact = users.find((u) => u.id === activeChatId);
    body = (
      <ChatScreen
        contact={contact}
        currentUser={currentUser}
        messages={messagesData[activeChatId] || []}
        onSend={handleSend}
        onReact={handleReact}
        onBack={() => setScreen("home")}
        typing={typingFor === activeChatId}
        dark={dk}
        wallpaper={wallpaper}
        onEditGroup={(g) => { setEditingGroup(g); setScreen("groupCreation"); }}
      />
    );
  } else if (screen === "contactsSelection") {
    body = <ContactsSelectionScreen users={users} currentUser={currentUser} onNext={(s) => { setSelectedContactsForGroup(s); setScreen("groupCreation"); }} onBack={() => { setEditingGroup(null); setScreen("home"); }} dark={dk} />;
  } else if (screen === "groupCreation") {
    body = (
      <GroupCreationScreen
        users={users}
        currentUser={currentUser}
        editingGroup={editingGroup}
        initialSelectedContacts={selectedContactsForGroup}
        onSave={(data) => {
          if (editingGroup) {
            const updated = {
              ...editingGroup,
              fullname: data.name,
              photo: data.photo || editingGroup.photo,
              members: data.members
            };
            setUsers(prev => prev.map(u => u.id === editingGroup.id ? updated : u));
            setMessagesData(prev => ({
              ...prev,
              [editingGroup.id]: [
                ...(prev[editingGroup.id] || []),
                { id: Date.now(), senderId: editingGroup.id, text: `Group details updated (${data.members.length} members)`, timestamp: "Just now", status: "read", reaction: null }
              ]
            }));
            showToast("Group updated successfully!");
            const eg = editingGroup;
            setEditingGroup(null);
            openChat(eg.id);
          } else {
            const newGroup = {
              id: Date.now(),
              fullname: data.name,
              email: `${data.name.toLowerCase().replace(/\s+/g, '')}@group.chat`,
              photo: data.photo || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600",
              bio: "Group chat",
              phone: "Group",
              online: true,
              isGroup: true,
              members: data.members
            };
            setUsers(prev => [newGroup, ...prev]);
            setMessagesData(prev => ({
              ...prev,
              [newGroup.id]: [{ id: 1, senderId: newGroup.id, text: `Group "${data.name}" created`, timestamp: "Just now", status: "read", reaction: null }]
            }));
            showToast("Group created successfully!");
            setEditingGroup(null);
            openChat(newGroup.id);
          }
        }}
        onBack={() => {
          const eg = editingGroup;
          setEditingGroup(null);
          if (eg) {
            openChat(eg.id);
          } else {
            setScreen("contactsSelection");
          }
        }}
        onScheduleCall={(schedule) => {
          const targetId = editingGroup ? editingGroup.id : null;
          if (targetId) {
            showToast(`Scheduled ${schedule.type} call for ${schedule.date} at ${schedule.time}!`);
            setMessagesData(prev => ({
              ...prev,
              [targetId]: [
                ...(prev[targetId] || []),
                { id: Date.now(), senderId: targetId, text: `📅 Scheduled ${schedule.type === "video" ? "Video" : "Voice"} Call for ${schedule.date} at ${schedule.time}`, timestamp: "Just now", status: "read", reaction: null }
              ]
            }));
            setCalls(prev => [
              { id: Date.now(), userId: targetId, type: schedule.type, direction: "outgoing", time: `${schedule.date} ${schedule.time}`, duration: "Scheduled", missed: false },
              ...prev
            ]);
            const eg = editingGroup;
            setEditingGroup(null);
            openChat(eg.id);
          } else {
            showToast(`Call scheduled for ${schedule.date} at ${schedule.time}! (Save group first)`);
          }
        }}
        dark={dk}
      />
    );
  } else if (screen === "editProfile") {
    body = (
      <EditProfileScreen
        user={currentUser}
        onBack={() => setScreen("profile")}
        dark={dk}
        onSave={(updates) => {
          const updated = { ...currentUser, ...updates };
          setCurrentUser(updated);
          setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          showToast("Profile updated");
          setScreen("profile");
        }}
      />
    );
  } else if (screen === "settings") {
    body = (
      <SettingsScreen
        dark={dk}
        setDark={setDark}
        notifications={notifications}
        setNotifications={setNotifications}
        onBack={() => setScreen("profile")}
        goChangePw={() => setScreen("changePassword")}
        goInfo={(kind) => setScreen("info:" + kind)}
        onLogout={handleLogout}
        wallpaper={wallpaper}
        setWallpaper={setWallpaper}
      />
    );
  } else if (screen === "changePassword") {
    body = (
      <ChangePasswordScreen
        dark={dk}
        onBack={() => setScreen("settings")}
        onSave={(pw) => {
          const updated = { ...currentUser, password: pw };
          setCurrentUser(updated);
          setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          showToast("Password updated");
          setScreen("settings");
        }}
      />
    );
  } else if (screen.startsWith("info:")) {
    body = <InfoScreen kind={screen.split(":")[1]} onBack={() => setScreen("settings")} dark={dk} />;
  } else if (screen.startsWith("statusView:")) {
    const statusId = screen.split(":")[1];
    const targetStatus = statuses.find(s => String(s.id) === String(statusId)) || statuses[0];
    body = <StatusViewScreen status={targetStatus} currentUser={currentUser} onBack={() => { setScreen("home"); setActiveTab("updates"); }} dark={dk} onDelete={handleDeleteStatus} onReply={handleReplyStatus} />;
  } else if (currentUser) {
    // main tabbed area
    let tabBody = null;
    if (activeTab === "chats")
      tabBody = <HomeScreen users={users} currentUser={currentUser} messagesData={messagesData} unread={unread} openChat={openChat} dark={dk} />;
    else if (activeTab === "updates")
      tabBody = <UpdatesScreen dark={dk} currentUser={currentUser} statuses={statuses} onAddStatus={handleAddStatus} onViewStatus={(s) => setScreen("statusView:" + s.id)} onDeleteStatus={handleDeleteStatus} />;
    else if (activeTab === "contacts")
      tabBody = <ContactsScreen users={users} currentUser={currentUser} openChat={openChat} dark={dk} setScreen={setScreen} setEditingGroup={setEditingGroup} onSyncGoogleContacts={handleSyncGoogleContacts} />;
    else if (activeTab === "calls")
      tabBody = <CallsScreen calls={calls} users={users} dark={dk} onCall={handleCall} />;
    else if (activeTab === "ai")
      tabBody = <AIChatScreen currentUser={currentUser} dark={dk} onBack={() => { setActiveTab("chats"); setScreen("home"); }} showToast={showToast} />;
    else if (activeTab === "profile")
      tabBody = (
        <ProfileScreen
          user={currentUser}
          goEdit={() => setScreen("editProfile")}
          goSettings={() => setScreen("settings")}
          onLogout={handleLogout}
          dark={dk}
        />
      );
    body = (
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0">{tabBody}</div>
        <BottomNav active={activeTab} onChange={(k) => { setActiveTab(k); setScreen(k); }} dark={dk} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-200 py-4">
      <Toast message={toast} />
      <div
        className={`relative w-full max-w-sm h-[720px] rounded-xl shadow-2xl overflow-hidden border ${dk ? "border-gray-800" : "border-gray-200"}`}
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        {body}
      </div>
    </div>
  );
}
