import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle, Search, ArrowLeft, Smile, Paperclip, Camera, Send,
  Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, MoreVertical,
  Settings as SettingsIcon, LogOut, Edit2, Bell, Lock, Moon, Sun, Info,
  HelpCircle, User, Users, Check, CheckCheck, Plus, Image as ImageIcon,
  X, Mail, Eye, EyeOff, ChevronRight, Upload, Loader2, Shield, KeyRound,
  Clock, Mic, RefreshCw, Play, Pause, Square, Volume2, Film, Trash2, Sparkles,
  BookUser, UserPlus, Share2, CloudUpload, MessageSquare, Copy, Megaphone, Pencil, Globe, Compass, Heart,
  ZoomIn, ZoomOut, AlertCircle, Headphones, Download, ExternalLink
} from "lucide-react";
import { ContactsSelectionScreen } from "./components/ContactsSelectionScreen";
import { GroupCreationScreen } from "./components/GroupCreationScreen";
import { AIChatScreen } from "./components/AIChatScreen";
import { StatusEditor } from "./components/StatusEditor";
import { AddContactScreen } from "./components/AddContactScreen";
import { PrivacyScreen } from "./components/PrivacyScreen";
import { BackupRestoreScreen } from "./components/BackupRestoreScreen";
import { ChatsSettingsScreen } from "./components/ChatsSettingsScreen";
import { LiveSupportScreen } from "./components/LiveSupportScreen";
import { SupportAgentScreen } from "./components/SupportAgentScreen";
import { HelpAndSupportScreen } from "./components/HelpAndSupportScreen";
import { checkAndRunAutoBackup } from "./services/backupService";
import { openPhoneDialer, shareContentViaAndroid } from "./services/permissionService";
import { supabase } from "./lib/supabase";
import chatMeLogoAsset from "./assets/images/chatme_logo_1786875847193.jpg";

/* ------------------------------------------------------------------ */
/*  Avatar helper                                                      */
/* ------------------------------------------------------------------ */

export function getDefaultAvatar(name?: string) {
  const cleanName = (name || "User").trim();
  const encodedName = encodeURIComponent(cleanName);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=22c55e&color=fff&bold=true`;
}

export function getLocalRegisteredUsers(): any[] {
  try {
    const raw = localStorage.getItem("chatme_registered_users");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalRegisteredUser(userObj: any) {
  try {
    const list = getLocalRegisteredUsers();
    const idx = list.findIndex(
      (u: any) =>
        (u.email && userObj.email && u.email.toLowerCase() === userObj.email.toLowerCase()) ||
        (u.id && userObj.id && u.id === userObj.id)
    );
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...userObj };
    } else {
      list.push(userObj);
    }
    localStorage.setItem("chatme_registered_users", JSON.stringify(list));
  } catch (e) {}
}

export const cleanupExpiredStatuses = async () => {
  const now = new Date().toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    await supabase.from('status_posts').delete().or(`expires_at.lt.${now},created_at.lt.${twentyFourHoursAgo}`);
  } catch (e) {
    console.log("Status posts cleanup error:", e);
  }
};

export const filterFreshStatuses = (list: any[]) => {
  const now = Date.now();
  return list.filter((s: any) => {
    const expiresAt = s.expires_at ? new Date(s.expires_at).getTime() : 0;
    const createdAt = s.created_at ? new Date(s.created_at).getTime() : (expiresAt ? expiresAt - 86400000 : 0);
    const is24hOld = createdAt > 0 && (now - createdAt >= 24 * 60 * 60 * 1000);
    const isExpired = expiresAt > 0 && expiresAt <= now;
    return !is24hOld && !isExpired;
  });
};

/* ------------------------------------------------------------------ */
/*  Small shared UI pieces                                             */
/* ------------------------------------------------------------------ */

export function ChatMeSvgLogo({
  size = 64,
  className = "",
  rounded = "rounded-2xl",
  shadow = "shadow-md"
}: {
  size?: number;
  className?: string;
  rounded?: string;
  shadow?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${rounded} ${shadow} ${className}`}
      style={{ width: size, height: size }}
      aria-label="ChatMe"
      role="img"
    >
      <defs>
        <linearGradient id="chatme-gradient-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="45%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="chatme-bubble-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F0FDF4" />
        </linearGradient>
        <filter id="chatme-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.28" floodColor="#047857" />
        </filter>
      </defs>
      {/* Background rounded squircle */}
      <rect width="100" height="100" rx="22" fill="url(#chatme-gradient-bg)" />
      {/* Glossy top-left soft highlight */}
      <path
        d="M 12 12 Q 50 4 88 12 Q 75 36 50 34 Q 25 36 12 12 Z"
        fill="#FFFFFF"
        fillOpacity="0.18"
      />
      {/* Main chat bubble */}
      <path
        d="M 50 24 C 34 24 21 35.5 21 49.5 C 21 54.8 22.8 59.8 25.8 63.8 L 23 75.5 L 35.2 72.2 C 39.6 74.2 44.6 75.5 50 75.5 C 66 75.5 79 64 79 49.5 C 79 35.5 66 24 50 24 Z"
        fill="url(#chatme-bubble-grad)"
        filter="url(#chatme-shadow)"
      />
      {/* Subtle bubble outline */}
      <path
        d="M 50 24 C 34 24 21 35.5 21 49.5 C 21 54.8 22.8 59.8 25.8 63.8 L 23 75.5 L 35.2 72.2 C 39.6 74.2 44.6 75.5 50 75.5 C 66 75.5 79 64 79 49.5 C 79 35.5 66 24 50 24 Z"
        stroke="#E2E8F0"
        strokeWidth="0.8"
        fill="none"
      />
      {/* Three chat dots */}
      <circle cx="39" cy="49.5" r="4.2" fill="#059669" />
      <circle cx="50" cy="49.5" r="4.2" fill="#10B981" />
      <circle cx="61" cy="49.5" r="4.2" fill="#047857" />
    </svg>
  );
}

function Logo({
  size = 64,
  dark = false,
  className = "",
  rounded = "rounded-2xl",
  shadow = "shadow-xl"
}: {
  size?: number;
  dark?: boolean;
  className?: string;
  rounded?: string;
  shadow?: string;
}) {
  const [loadError, setLoadError] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);

  // Array of relative and local candidate paths for maximum resilience across
  // AI Studio preview, Vercel production, and Android/Capacitor webviews:
  const candidateSources = [
    chatMeLogoAsset,
    "./logo.png",
    "/logo.png",
    "./logo.jpg",
    "/logo.jpg"
  ];

  const handleImageError = () => {
    if (candidateIndex < candidateSources.length - 1) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setLoadError(true);
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {!loadError ? (
        <img
          src={candidateSources[candidateIndex]}
          alt="ChatMe"
          referrerPolicy="no-referrer"
          onError={handleImageError}
          className={`w-full h-full object-cover ${rounded} ${shadow}`}
          style={{ width: size, height: size }}
        />
      ) : (
        <ChatMeSvgLogo size={size} rounded={rounded} shadow={shadow} />
      )}
    </div>
  );
}

function TextField({ icon: Icon, type = "text", placeholder, value, onChange, error, rightElement, dark }: any) {
  return (
    <div className="w-full">
      <div
        className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 transition-all ${
          error
            ? "border-red-500 bg-red-950/20"
            : dark
            ? "border-slate-700/80 bg-slate-800/80 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20"
            : "border-slate-200 bg-slate-50 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20"
        }`}
      >
        {Icon && <Icon size={18} className={dark ? "text-slate-400" : "text-slate-400"} />}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`flex-1 bg-transparent outline-none text-sm ${
            dark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
          }`}
        />
        {rightElement}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400 pl-1 font-medium">{error}</p>}
    </div>
  );
}

function PrimaryButton({ children, onClick, color = "green", disabled, type = "button" }: any) {
  const bg =
    color === "green"
      ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 active:scale-[0.98] shadow-emerald-500/25 text-white"
      : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 active:scale-[0.98] shadow-blue-500/25 text-white";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl py-3.5 font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${bg} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {children}
    </button>
  );
}

function Toast({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A] border border-slate-700 text-white text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>{message}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screens: Auth                                                      */
/* ------------------------------------------------------------------ */

function SplashScreen({ dark }: { dark?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 bg-[#0B101B] text-white">
      <div className="relative">
        <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
        <Logo size={96} rounded="rounded-3xl" shadow="shadow-2xl shadow-emerald-500/30" />
      </div>
      <div className="flex flex-col items-center mt-2">
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
          ChatMe
        </h1>
        <p className="text-xs font-semibold tracking-widest text-emerald-400 mt-1 uppercase">
          Connect • Chat • Share
        </p>
      </div>
      <Loader2 className="animate-spin text-emerald-400 mt-6" size={28} />
    </div>
  );
}

function SignUpScreen({ onSignUp, goSignIn, dark }: any) {
  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [serverErrorDetails, setServerErrorDetails] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: any) => {
    const file = e.target.files?.[0];
    if (file) setPhoto(URL.createObjectURL(file));
  };

  const submit = async () => {
    setServerErrorDetails(null);
    const errs: any = {};
    if (!fullname.trim()) errs.fullname = "Full name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address";
    if (!password) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "Use at least 6 characters";
    if (confirm !== password) errs.confirm = "Passwords do not match";
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setLoading(true);
      try {
        const cleanEmail = email.trim().toLowerCase();
        const derivedUsername = (username.trim() || cleanEmail.split('@')[0] || 'user')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '');

        await onSignUp({
          fullname: fullname.trim(),
          username: derivedUsername,
          email: cleanEmail,
          phone: phone.trim(),
          password,
          photo,
          bio: ""
        });
      } catch (error: any) {
        console.warn('Signup notice:', error?.message || error);
        const errorMessage =
          error?.message ||
          "Could not complete registration. Please check your information and try again.";
        setServerErrorDetails(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto px-6 py-8 flex flex-col items-center justify-center bg-[#0B101B] text-white">
      <div className="w-full max-w-sm my-auto">
        <div className="flex flex-col items-center mb-6">
          <Logo size={68} rounded="rounded-2xl" shadow="shadow-2xl shadow-emerald-500/20" />
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              ChatMe
            </span>
          </div>
          <h1 className="text-2xl font-extrabold mt-3 text-white">Create Account</h1>
          <p className="text-sm text-slate-400 mt-1">Join ChatMe today</p>
        </div>

        {serverErrorDetails && (
          <div className="p-3.5 mb-4 rounded-2xl bg-red-950/40 text-red-400 text-xs border border-red-800/60 font-sans break-words leading-relaxed">
            <div className="font-semibold mb-1 flex items-center justify-between">
              <span>REGISTRATION NOTICE:</span>
              <button type="button" onClick={() => setServerErrorDetails(null)} className="text-red-400 hover:text-red-300">✕</button>
            </div>
            <div>{serverErrorDetails}</div>
          </div>
        )}

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center mb-5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 hover:border-emerald-400 flex items-center justify-center overflow-hidden transition-colors relative group"
            >
              {photo ? (
                <img src={photo} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload size={20} className="text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span className="text-[10px] text-slate-400">Photo</span>
                </div>
              )}
            </button>
            <input type="file" accept="image/*" ref={fileRef} onChange={handlePhoto} className="hidden" />
            <span className="text-xs text-emerald-400 font-medium mt-2">Upload Profile Photo</span>
          </div>

          <div className="flex flex-col gap-3">
            <TextField icon={User} placeholder="Full Name" value={fullname} onChange={(e: any) => setFullname(e.target.value)} error={errors.fullname} dark={true} />
            <TextField icon={User} placeholder="Username (optional)" value={username} onChange={(e: any) => setUsername(e.target.value)} error={errors.username} dark={true} />
            <TextField icon={Mail} placeholder="Email" value={email} onChange={(e: any) => setEmail(e.target.value)} error={errors.email} dark={true} />
            <TextField icon={Phone} placeholder="Phone Number (e.g. +1 555-0199)" value={phone} onChange={(e: any) => setPhone(e.target.value)} dark={true} />
            <TextField
              icon={Lock}
              type={showPw ? "text" : "password"}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
              error={errors.password}
              dark={true}
              rightElement={
                <button type="button" onClick={() => setShowPw((s) => !s)} className="p-1 text-slate-400 hover:text-white">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <TextField
              icon={Lock}
              type={showPw ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e: any) => setConfirm(e.target.value)}
              error={errors.confirm}
              dark={true}
            />
          </div>

          <div className="mt-6">
            <PrimaryButton onClick={submit} color="green" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </PrimaryButton>
          </div>
        </div>

        <p className="text-center text-sm mt-6 text-slate-400">
          Already have an account?{" "}
          <button onClick={goSignIn} className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

function SignInScreen({ onSignIn, goSignUp, goReset, dark }: any) {
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
    <div className="h-full w-full overflow-y-auto px-6 py-10 flex flex-col items-center justify-center bg-[#0B101B] text-white">
      <div className="w-full max-w-sm my-auto">
        <div className="flex flex-col items-center mb-8">
          <Logo size={76} rounded="rounded-2xl" shadow="shadow-2xl shadow-emerald-500/20" />
          <div className="mt-3.5 flex items-center gap-1.5">
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              ChatMe
            </span>
          </div>
          <h1 className="text-2xl font-extrabold mt-4 text-white">Welcome Back</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to continue</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 pl-1">Email address</label>
              <TextField icon={Mail} placeholder="name@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} dark={true} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 pl-1">Password</label>
              <TextField
                icon={Lock}
                type={showPw ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                dark={true}
                rightElement={
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="p-1 text-slate-400 hover:text-white">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>
            {error && <p className="text-xs text-red-400 pl-1 font-medium">{error}</p>}
          </div>

          <div className="flex justify-end mt-2.5">
            <button onClick={goReset} className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Forgot Password?
            </button>
          </div>

          <div className="mt-6">
            <PrimaryButton onClick={submit} color="green">
              Sign In
            </PrimaryButton>
          </div>
        </div>

        <p className="text-center text-sm mt-6 text-slate-400">
          Don't have an account?{" "}
          <button onClick={goSignUp} className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}

function ResetPasswordScreen({ goSignIn, onReset, dark }: any) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (email.trim()) {
      onReset(email.trim());
      setSent(true);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto px-6 py-10 flex flex-col items-center justify-center bg-[#0B101B] text-white">
      <div className="w-full max-w-sm my-auto">
        <div className="flex flex-col items-center mb-8">
          <Logo size={68} rounded="rounded-2xl" shadow="shadow-2xl shadow-emerald-500/20" />
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              ChatMe
            </span>
          </div>
          <h1 className="text-2xl font-extrabold mt-3 text-white">Reset Password</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">Enter your email and we'll send you a reset link</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Check size={28} strokeWidth={2.5} />
              </div>
              <p className="text-sm text-slate-200">Reset link sent to <span className="font-semibold text-emerald-400">{email}</span></p>
              <p className="text-xs text-slate-400 mt-2">Check your inbox or spam folder for password recovery instructions.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 pl-1">Email address</label>
                <TextField icon={Mail} placeholder="name@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} dark={true} />
              </div>
              <div className="mt-6">
                <PrimaryButton onClick={submit} color="green">Send Reset Link</PrimaryButton>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-sm mt-6 text-slate-400">
          <button onClick={goSignIn} className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
            Back to Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bottom Nav + Top Bar                                                */
/* ------------------------------------------------------------------ */

function BottomNav({ active, onChange, dark }: { active: string; onChange: (key: string) => void; dark: boolean }) {
  const items = [
    { key: "chats", label: "Chats", icon: MessageCircle },
    { key: "updates", label: "Updates", icon: RefreshCw },
    { key: "contacts", label: "Contacts", icon: Users },
    { key: "profile", label: "Profile", icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 lg:left-1/2 lg:-translate-x-1/2 lg:max-w-md xl:max-w-lg z-30 border-t border-slate-800/80 bg-[#0B101B]/95 backdrop-blur-md text-white flex items-center justify-around px-2 py-2 shadow-2xl"
      style={{
        paddingBottom: "max(10px, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {items.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 ${
              isActive
                ? "text-emerald-400 font-bold"
                : "text-slate-400 hover:text-slate-200 font-medium"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-emerald-500/15" : "bg-transparent"}`}>
              <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[11px] tracking-tight ${isActive ? "text-emerald-400" : "text-slate-400"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function ScreenHeader({ title, onBack, dark, right, subtitle }: any) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b bg-[#0B101B] border-slate-800/80 text-white shrink-0 sticky top-0 z-20 shadow-sm">
      {onBack && (
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold text-white truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function isMediaUrl(str?: string) {
  if (!str || typeof str !== "string") return false;
  const s = str.trim().toLowerCase();
  return (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("blob:") ||
    s.startsWith("data:") ||
    s.includes("supabase") ||
    s.includes("storage/v1")
  );
}

function getValidMediaUrl(url?: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("blob:")) return null; // Never display a blob: URL from database!
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  return null;
}

function formatStatusTime(createdAtStr?: string): string {
  if (!createdAtStr) return "";
  const d = new Date(createdAtStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function cleanStatusCaption(caption?: string) {
  if (caption && !isMediaUrl(caption)) {
    return caption;
  }
  return "";
}

function StatusViewScreen({
  status,
  statuses = [],
  currentUser,
  onBack,
  dark,
  onDelete,
  onReply,
  showToast,
  onIndexChange
}: any) {
  // Ordered statuses list from Supabase/parent
  const statusesList = useMemo(() => {
    if (Array.isArray(statuses) && statuses.length > 0) {
      if (status && !statuses.some((s: any) => String(s.id) === String(status.id))) {
        return [status, ...statuses];
      }
      return statuses;
    }
    return status ? [status] : [];
  }, [statuses, status]);

  // Active post index in the ordered list
  const initialIdx = useMemo(() => {
    if (!status) return 0;
    const found = statusesList.findIndex((s: any) => String(s.id) === String(status.id));
    return found >= 0 ? found : 0;
  }, [statusesList, status]);

  const [currentIndex, setCurrentIndex] = useState(initialIdx);

  // Sync if external status prop changes
  useEffect(() => {
    if (status) {
      const found = statusesList.findIndex((s: any) => String(s.id) === String(status.id));
      if (found >= 0 && found !== currentIndex) {
        setCurrentIndex(found);
      }
    }
  }, [status?.id]);

  const currentStatus = statusesList[currentIndex] || status;

  const [isPlaying, setIsPlaying] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [viewers, setViewers] = useState<any[]>(currentStatus?.viewers || ["Alice", "Bob"]);
  const [replyText, setReplyText] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedMediaUrl, setCopiedMediaUrl] = useState(false);
  const [centerFeedback, setCenterFeedback] = useState<"play" | "pause" | null>(null);
  const [transitionClass, setTransitionClass] = useState<string>("");

  const [reactions, setReactions] = useState<Array<{
    id: string;
    emoji: string;
    left: number;
    size: number;
    duration: number;
    delay: number;
    drift: number;
  }>>([]);

  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Video element ref
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Pinch-to-zoom state for image status
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });

  const touchStartDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);

  const isCreator = currentUser && currentStatus?.user_id === currentUser.id;
  const isImage = (currentStatus?.media_type === "image" || (!currentStatus?.media_type && isMediaUrl(currentStatus?.media_url))) && !mediaError;
  const isVideo = currentStatus?.media_type === "video" && !mediaError;
  const isVoice = currentStatus?.media_type === "voice";
  const isText = currentStatus?.media_type === "text";
  const validMediaUrl = getValidMediaUrl(currentStatus?.media_url);
  const cleanCaption = cleanStatusCaption(currentStatus?.caption);
  const statusDeepLink = `${window.location.origin}${window.location.pathname}#status-${currentStatus?.id}`;

  const resetZoom = () => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    setIsHolding(false);
  };

  // Reset transient state whenever current status changes
  useEffect(() => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    setProgress(0);
    setMediaError(false);
    setIsPlaying(true);
    setIsHolding(false);
    setViewers(currentStatus?.viewers || ["Alice", "Bob"]);
  }, [currentStatus?.id]);

  // Record view in Supabase & local storage
  useEffect(() => {
    if (!currentStatus?.id) return;
    try {
      const saved = localStorage.getItem("chatme_viewed_statuses");
      const next = new Set(saved ? JSON.parse(saved) : []);
      next.add(String(currentStatus.id));
      localStorage.setItem("chatme_viewed_statuses", JSON.stringify(Array.from(next)));
    } catch {}

    const recordView = async () => {
      try {
        if (currentUser && currentStatus.id) {
          await supabase.from("status_views").upsert({
            status_id: currentStatus.id,
            user_id: currentUser.id,
            user_name: currentUser.fullname,
            viewed_at: new Date().toISOString()
          }, { onConflict: "status_id,user_id" });
        }
      } catch (e) {}
    };
    recordView();
  }, [currentStatus?.id, currentUser]);

  const triggerTransition = (direction: "next" | "prev") => {
    setTransitionClass(direction === "next" ? "animate-status-next" : "animate-status-prev");
    setTimeout(() => {
      setTransitionClass("");
    }, 240);
  };

  // Navigation handlers
  const goToPrevPost = () => {
    if (currentIndex > 0) {
      triggerTransition("prev");
      const nextIdx = currentIndex - 1;
      setCurrentIndex(nextIdx);
      setProgress(0);
      setMediaError(false);
      resetZoom();
      if (onIndexChange) onIndexChange(nextIdx, statusesList[nextIdx]);
    } else {
      // Index 0: Left tap keeps on first post and rewinds progress, no error
      setProgress(0);
      resetZoom();
      if (videoRef.current) {
        try { videoRef.current.currentTime = 0; } catch {}
      }
    }
  };

  const goToNextPost = () => {
    if (currentIndex < statusesList.length - 1) {
      triggerTransition("next");
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setProgress(0);
      setMediaError(false);
      resetZoom();
      if (onIndexChange) onIndexChange(nextIdx, statusesList[nextIdx]);
    } else {
      // Final post: Right tap closes viewer without error
      onBack();
    }
  };

  // Keyboard accessibility: ArrowLeft, ArrowRight, Escape (Requirement 12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShareModalOpen) {
        if (e.key === "Escape") {
          setIsShareModalOpen(false);
          setIsHolding(false);
        }
        return;
      }
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        if (e.key === "Escape") {
          (activeEl as HTMLElement).blur();
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevPost();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNextPost();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isShareModalOpen, currentIndex, statusesList.length]);

  // Video playback synchronization
  useEffect(() => {
    if (videoRef.current && isVideo) {
      if (isPlaying && !isHolding && !isShareModalOpen) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isHolding, isShareModalOpen, isVideo, currentIndex]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && isVideo) {
      const { currentTime, duration } = videoRef.current;
      if (duration && duration > 0 && !isNaN(duration)) {
        setProgress(Math.min(100, (currentTime / duration) * 100));
      }
    }
  };

  const handleVideoEnded = () => {
    goToNextPost();
  };

  // Non-video timer progress bar
  useEffect(() => {
    let timer: any;
    if (!isVideo) {
      if (isPlaying && !isHolding && !isShareModalOpen) {
        timer = setInterval(() => {
          setProgress((p) => {
            if (p >= 100) {
              clearInterval(timer);
              goToNextPost();
              return 0;
            }
            return p + 2;
          });
        }, 100);
      }
    }
    return () => clearInterval(timer);
  }, [isPlaying, isHolding, isShareModalOpen, isVideo, currentIndex, statusesList.length]);

  // Touch gesture & tap handling: distinguishes tap from swipe/drag (Requirement 1, 4, 7)
  const touchStartRef = useRef<{ x: number; y: number; time: number; zone: "left" | "center" | "right" } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastTouchTimeRef = useRef<number>(0);

  const handleZoneTouchStart = (e: React.TouchEvent, zone: "left" | "center" | "right") => {
    if (isShareModalOpen) return;
    if (e.touches.length > 1) {
      isDraggingRef.current = true;
      return;
    }
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), zone };
    isDraggingRef.current = false;
    lastTouchTimeRef.current = Date.now();
    setIsHolding(true);
  };

  const handleZoneTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    if (dx > 12 || dy > 12) {
      isDraggingRef.current = true;
    }
  };

  const handleZoneTouchEnd = (e: React.TouchEvent, zone: "left" | "center" | "right") => {
    lastTouchTimeRef.current = Date.now();
    setIsHolding(false);
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start) return;

    // Distinguish a tap from a swipe or scroll drag (Requirement 4)
    if (isDraggingRef.current) return;

    // Long press hold (> 400ms) pauses status, not a tap
    const duration = Date.now() - start.time;
    if (duration > 400) return;

    // If zoomed in on image, don't change posts
    if (zoomScale > 1.05) return;

    // Execute tap action
    if (zone === "left") {
      goToPrevPost();
    } else if (zone === "right") {
      goToNextPost();
    } else if (zone === "center") {
      // Center 30%: do not change posts (Requirement 1 & 7)
      if (isVideo && videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
          setCenterFeedback("play");
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
          setCenterFeedback("pause");
        }
        setTimeout(() => setCenterFeedback(null), 600);
      }
    }
  };

  // Mouse gestures for desktop preview
  const mouseStartRef = useRef<{ x: number; y: number; time: number; zone: "left" | "center" | "right" } | null>(null);

  const handleZoneMouseDown = (e: React.MouseEvent, zone: "left" | "center" | "right") => {
    if (Date.now() - lastTouchTimeRef.current < 600) return;
    if (e.button !== 0) return;
    if (isShareModalOpen) return;
    mouseStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now(), zone };
    isDraggingRef.current = false;
    setIsHolding(true);
  };

  const handleZoneMouseMove = (e: React.MouseEvent) => {
    if (!mouseStartRef.current) return;
    const dx = Math.abs(e.clientX - mouseStartRef.current.x);
    const dy = Math.abs(e.clientY - mouseStartRef.current.y);
    if (dx > 12 || dy > 12) {
      isDraggingRef.current = true;
    }
  };

  const handleZoneMouseUp = (e: React.MouseEvent, zone: "left" | "center" | "right") => {
    if (Date.now() - lastTouchTimeRef.current < 600) return;
    setIsHolding(false);
    const start = mouseStartRef.current;
    mouseStartRef.current = null;

    if (!start) return;
    if (isDraggingRef.current) return;

    const duration = Date.now() - start.time;
    if (duration > 400) return;

    if (zoomScale > 1.05) return;

    if (zone === "left") {
      goToPrevPost();
    } else if (zone === "right") {
      goToNextPost();
    } else if (zone === "center") {
      // Center 30%: do not change posts
      if (isVideo && videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
          setCenterFeedback("play");
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
          setCenterFeedback("pause");
        }
        setTimeout(() => setCenterFeedback(null), 600);
      }
    }
  };

  // Pinch-to-zoom handlers for images
  const handlePinchTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = d;
      initialScaleRef.current = zoomScale;
      initialOffsetRef.current = { ...zoomOffset };
      setIsHolding(true);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      initialOffsetRef.current = { ...zoomOffset };

      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        if (zoomScale > 1.05) {
          resetZoom();
        } else {
          setZoomScale(2.5);
          setZoomOffset({ x: 0, y: 0 });
          setIsHolding(true);
        }
      } else {
        if (zoomScale > 1.05) {
          setIsHolding(true);
        }
      }
      lastTapRef.current = now;
    }
  };

  const handlePinchTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = d / touchStartDistRef.current;
      const nextScale = Math.min(Math.max(1, initialScaleRef.current * scaleFactor), 4);
      setZoomScale(nextScale);
      if (nextScale <= 1) {
        setZoomOffset({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && zoomScale > 1.05 && touchStartPosRef.current) {
      const dx = e.touches[0].clientX - touchStartPosRef.current.x;
      const dy = e.touches[0].clientY - touchStartPosRef.current.y;
      setZoomOffset({
        x: initialOffsetRef.current.x + dx,
        y: initialOffsetRef.current.y + dy,
      });
    }
  };

  const handlePinchTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      touchStartDistRef.current = null;
    }
    if (e.touches.length === 0) {
      touchStartPosRef.current = null;
      if (zoomScale <= 1.05) {
        resetZoom();
      }
    }
  };

  // 24h countdown
  useEffect(() => {
    const updateCountdown = () => {
      const createdAtMs = currentStatus?.created_at ? new Date(currentStatus.created_at).getTime() : Date.now();
      const expiresAtMs = currentStatus?.expires_at ? new Date(currentStatus.expires_at).getTime() : createdAtMs + 24 * 60 * 60 * 1000;
      const diffMs = expiresAtMs - Date.now();

      if (diffMs <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${mins}m left`);
      } else if (mins > 0) {
        setTimeRemaining(`${mins}m ${secs}s left`);
      } else {
        setTimeRemaining(`${secs}s left`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [currentStatus]);

  const triggerReaction = (emoji: string) => {
    const newParticles = Array.from({ length: 14 }).map((_, i) => ({
      id: `${Date.now()}-${i}-${Math.random()}`,
      emoji,
      left: Math.floor(Math.random() * 76) + 12,
      size: Math.floor(Math.random() * 22) + 30,
      duration: 1.5 + Math.random() * 1.1,
      delay: i * 0.05,
      drift: (Math.random() - 0.5) * 70,
    }));

    setReactions((prev) => [...prev, ...newParticles]);

    if (onReply && currentStatus?.user_id) {
      onReply(currentStatus.user_id, emoji);
    }

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => !newParticles.some((np) => np.id === r.id)));
    }, 3200);
  };

  const handleShareClick = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsHolding(true);

    const authorName = currentStatus?.user_name || "ChatMe User";
    let shareTitle = `ChatMe Status from ${authorName}`;
    let shareText = cleanCaption ? `"${cleanCaption}" — ${authorName} on ChatMe` : `Check out ${authorName}'s status update on ChatMe!`;

    if (isImage) {
      shareTitle = `Photo Status by ${authorName}`;
      shareText = cleanCaption ? `📷 "${cleanCaption}" (ChatMe Photo Status)` : `📷 Check out ${authorName}'s photo status on ChatMe!`;
    } else if (isVideo) {
      shareTitle = `Video Status by ${authorName}`;
      shareText = cleanCaption ? `🎥 "${cleanCaption}" (ChatMe Video Status)` : `🎥 Watch ${authorName}'s video status on ChatMe!`;
    } else if (isVoice) {
      shareTitle = `Voice Status by ${authorName}`;
      shareText = `🎙️ Listen to ${authorName}'s voice status update on ChatMe!`;
    } else if (isText) {
      shareTitle = `Status by ${authorName}`;
      shareText = `💬 "${cleanCaption || "Status"}" — ${authorName} on ChatMe`;
    }

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: statusDeepLink,
        });
        if (showToast) showToast("Status shared successfully!");
        setIsHolding(false);
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          setIsHolding(false);
          return;
        }
      }
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(statusDeepLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
        if (showToast) showToast("Status deep link copied to clipboard!");
      }
    } catch (err) {}

    setIsShareModalOpen(true);
  };

  const copyDeepLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(statusDeepLink);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = statusDeepLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      if (showToast) showToast("Status deep link copied to clipboard!");
    } catch (err) {
      if (showToast) showToast("Failed to copy link");
    }
  };

  const copyCaption = async () => {
    if (!cleanCaption) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(cleanCaption);
      }
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
      if (showToast) showToast("Caption copied to clipboard!");
    } catch (err) {}
  };

  const copyMediaLink = async () => {
    if (!validMediaUrl) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(validMediaUrl);
      }
      setCopiedMediaUrl(true);
      setTimeout(() => setCopiedMediaUrl(false), 2500);
      if (showToast) showToast("Media link copied to clipboard!");
    } catch (err) {}
  };

  const handleDownloadMedia = () => {
    if (!validMediaUrl) return;
    const a = document.createElement("a");
    a.href = validMediaUrl;
    a.download = `chatme_status_${currentStatus.id}.${isVideo ? "mp4" : "jpg"}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (showToast) showToast("Starting media download / open...");
  };

  if (!currentStatus) {
    return (
      <div className="flex flex-col h-full bg-gray-950 text-white items-center justify-center p-6 text-center gap-4">
        <p className="text-gray-400 text-sm">Status update unavailable.</p>
        <button onClick={onBack} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all">
          Back to Updates
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-black text-white relative select-none overflow-hidden">
      {/* Floating Emoji Reactions Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-20 animate-float-reaction select-none drop-shadow-2xl"
            style={{
              left: `${r.left}%`,
              fontSize: `${r.size}px`,
              animationDuration: `${r.duration}s`,
              animationDelay: `${r.delay}s`,
              transform: `translateX(${r.drift}px)`,
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Top segmented progress bars for stories */}
      <div className="flex gap-1.5 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] z-30">
        {statusesList.map((s: any, idx: number) => {
          let segWidth = 0;
          if (idx < currentIndex) {
            segWidth = 100;
          } else if (idx === currentIndex) {
            segWidth = progress;
          } else {
            segWidth = 0;
          }
          return (
            <div key={s.id || idx} className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden">
              <div
                className={`h-full bg-white ${idx === currentIndex ? "transition-all duration-100 ease-linear" : ""}`}
                style={{ width: `${segWidth}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-b from-black/80 to-transparent z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="text-white p-1 hover:opacity-80 active:scale-95 transition cursor-pointer"
            title="Back to updates"
            aria-label="Back to updates"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 shrink-0">
            <img
              src={currentStatus.user_photo || getDefaultAvatar(currentStatus.user_name)}
              alt="avatar"
              className="w-full h-full object-cover"
              onError={(e: any) => { e.target.src = getDefaultAvatar(currentStatus.user_name); }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{currentStatus.user_name || "Contact"}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{new Date(currentStatus.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <span>•</span>
              {timeRemaining && (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-500/30 text-[11px] shadow-sm">
                  <Clock size={11} className="animate-pulse text-emerald-400 shrink-0" />
                  {timeRemaining}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Share Button */}
          <button
            onClick={handleShareClick}
            className="p-2 text-white hover:text-emerald-400 hover:bg-white/10 active:scale-95 rounded-full transition-all cursor-pointer"
            title="Share status"
            aria-label="Share status"
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 text-white hover:text-emerald-400 hover:bg-white/10 active:scale-95 rounded-full transition-all cursor-pointer"
            title={isPlaying ? "Pause status" : "Play status"}
            aria-label={isPlaying ? "Pause status" : "Play status"}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          {isCreator && (
            <button
              onClick={() => {
                onDelete(currentStatus.id);
                if (statusesList.length > 1) {
                  goToNextPost();
                } else {
                  onBack();
                }
              }}
              className="p-2 text-red-400 hover:bg-red-500/10 active:scale-95 rounded-full transition-all cursor-pointer"
              title="Delete status"
              aria-label="Delete status"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Content Viewport Area */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background audio if present */}
        {currentStatus.audio_url && (
          <audio src={currentStatus.audio_url} autoPlay loop />
        )}

        {/* Media Container with smooth transition */}
        <div className={`w-full h-full flex items-center justify-center relative select-none ${transitionClass}`}>
          {currentStatus.media_type === "image" || (isImage && !mediaError) ? (
            <div
              className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
              onTouchStart={handlePinchTouchStart}
              onTouchMove={handlePinchTouchMove}
              onTouchEnd={handlePinchTouchEnd}
              onWheel={(e) => {
                if (e.deltaY < 0) {
                  setZoomScale((s) => Math.min(4, s + 0.3));
                  setIsHolding(true);
                } else {
                  setZoomScale((s) => {
                    const next = Math.max(1, s - 0.3);
                    if (next <= 1) {
                      setZoomOffset({ x: 0, y: 0 });
                      setIsHolding(false);
                    }
                    return next;
                  });
                }
              }}
            >
              <img
                src={validMediaUrl || currentStatus.media_url}
                alt="Status update"
                onError={() => setMediaError(true)}
                className="max-h-full max-w-full object-contain rounded-lg shadow-xl transition-transform duration-75 ease-out select-none cursor-grab active:cursor-grabbing"
                style={{
                  transform: `translate3d(${zoomOffset.x}px, ${zoomOffset.y}px, 0) scale(${zoomScale})`,
                  transformOrigin: "center center",
                }}
              />
              {zoomScale > 1.05 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetZoom();
                  }}
                  className="absolute top-3 right-3 bg-black/80 hover:bg-black text-emerald-400 border border-emerald-500/40 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xl z-40 flex items-center gap-1.5 transition active:scale-95 cursor-pointer backdrop-blur-md"
                >
                  <ZoomOut size={14} />
                  <span>{zoomScale.toFixed(1)}x • Reset</span>
                </button>
              )}
            </div>
          ) : currentStatus.media_type === "video" && currentStatus.media_url && !mediaError ? (
            <video
              ref={videoRef}
              src={validMediaUrl || currentStatus.media_url}
              playsInline
              autoPlay
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              onError={() => setMediaError(true)}
              className="max-h-full max-w-full object-contain rounded-lg shadow-xl select-none"
            />
          ) : currentStatus.media_type === "voice" ? (
            <div className="flex flex-col items-center gap-4 bg-gray-900/80 p-8 rounded-2xl border border-gray-700 shadow-2xl">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white animate-pulse">
                <Mic size={36} />
              </div>
              <p className="text-lg font-medium">Voice Status</p>
              <audio src={validMediaUrl || currentStatus.media_url} controls className="w-64 max-w-full" />
            </div>
          ) : currentStatus.media_type === "text" ? (
            <div className={`w-full max-w-md p-8 rounded-3xl text-center text-xl font-bold shadow-2xl border border-white/10 ${currentStatus.bg_color || "bg-gradient-to-br from-purple-600 to-indigo-800 text-white"}`}>
              <p className="mb-2 leading-relaxed">{cleanCaption || "Status Update"}</p>
              <span className="text-xs font-normal text-white/80 uppercase tracking-widest mt-2 block">ChatMe Status</span>
            </div>
          ) : (
            <div className="w-full max-w-sm p-8 rounded-3xl bg-gradient-to-br from-emerald-950 via-gray-900 to-slate-950 border border-emerald-500/20 text-center flex flex-col items-center gap-3 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1">
                <Sparkles size={28} />
              </div>
              <h4 className="text-lg font-bold text-white">ChatMe Status</h4>
              <p className="text-sm text-gray-300 font-medium">{cleanCaption || "Status update"}</p>
              <span className="text-[11px] text-emerald-400/70 uppercase tracking-widest mt-2">ChatMe Updates</span>
            </div>
          )}
        </div>

        {/* Center Feedback Indicator for Video Pause/Play */}
        {centerFeedback && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white animate-scaleUp">
              {centerFeedback === "play" ? <Play size={28} className="ml-1" /> : <Pause size={28} />}
            </div>
          </div>
        )}

        {/* Invisible Tap Navigation Zones (Left 35%, Center 30%, Right 35%) */}
        {/* Requirements: Invisible zones, no large buttons, responsive on phone/tablet */}
        <div
          className={`absolute inset-0 z-20 flex select-none ${zoomScale > 1.05 ? "pointer-events-none" : "pointer-events-auto"}`}
        >
          {/* Left Zone: 35% -> Previous Post */}
          <div
            className="w-[35%] h-full bg-transparent cursor-pointer select-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
            onTouchStart={(e) => handleZoneTouchStart(e, "left")}
            onTouchMove={handleZoneTouchMove}
            onTouchEnd={(e) => handleZoneTouchEnd(e, "left")}
            onMouseDown={(e) => handleZoneMouseDown(e, "left")}
            onMouseMove={handleZoneMouseMove}
            onMouseUp={(e) => handleZoneMouseUp(e, "left")}
            title="Previous post"
            aria-label="Previous status post"
            role="button"
            tabIndex={-1}
          />

          {/* Center Zone: 30% -> Do not change posts (video play/pause) */}
          <div
            className="w-[30%] h-full bg-transparent select-none cursor-default"
            style={{ WebkitTapHighlightColor: "transparent" }}
            onTouchStart={(e) => handleZoneTouchStart(e, "center")}
            onTouchMove={handleZoneTouchMove}
            onTouchEnd={(e) => handleZoneTouchEnd(e, "center")}
            onMouseDown={(e) => handleZoneMouseDown(e, "center")}
            onMouseMove={handleZoneMouseMove}
            onMouseUp={(e) => handleZoneMouseUp(e, "center")}
            title="Status center"
            aria-label="Status center"
            role="presentation"
          />

          {/* Right Zone: 35% -> Next Post */}
          <div
            className="w-[35%] h-full bg-transparent cursor-pointer select-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
            onTouchStart={(e) => handleZoneTouchStart(e, "right")}
            onTouchMove={handleZoneTouchMove}
            onTouchEnd={(e) => handleZoneTouchEnd(e, "right")}
            onMouseDown={(e) => handleZoneMouseDown(e, "right")}
            onMouseMove={handleZoneMouseMove}
            onMouseUp={(e) => handleZoneMouseUp(e, "right")}
            title="Next post"
            aria-label="Next status post"
            role="button"
            tabIndex={-1}
          />
        </div>
      </div>

      {/* Music tag if present */}
      {currentStatus.music_track && (
        <div className="px-4 py-1.5 bg-black/70 text-green-400 text-xs font-semibold flex items-center justify-center gap-2 border-t border-gray-800 z-30">
          <Sparkles size={14} className="animate-pulse" />
          <span>{currentStatus.music_track}</span>
        </div>
      )}

      {/* Caption if any */}
      {currentStatus.media_type !== "text" && cleanCaption && !mediaError && (
        <div className="p-4 text-center bg-black/60 text-sm font-medium z-30">
          {cleanCaption}
        </div>
      )}

      {/* Quick Emoji Reaction Bar */}
      <div 
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 mx-auto mb-2 shadow-2xl z-30"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {["❤️", "😂", "😮", "😢", "🙏", "🔥", "👏", "🎉"].map((emoji) => (
          <button
            key={emoji}
            onClick={() => triggerReaction(emoji)}
            className="p-1 text-lg sm:text-xl hover:scale-130 active:scale-150 transition-transform duration-150 cursor-pointer select-none"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Viewers bar for creator */}
      {isCreator && (
        <div className="p-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-gray-400" />
            <span className="text-sm font-medium">{viewers.length} views</span>
          </div>
          <div className="flex -space-x-2 overflow-hidden">
            {viewers.map((v, i) => (
              <div key={i} className="inline-block h-7 w-7 rounded-full ring-2 ring-gray-900 bg-gray-700 flex items-center justify-center text-xs text-white font-bold">
                {typeof v === "string" ? v[0] : (v.user_name?.[0] || "U")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reply bar for viewers */}
      {!isCreator && (
        <div 
          className="p-3 bg-black/80 backdrop-blur-md flex items-center gap-2 z-30"
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
              if (e.key === "Enter" && replyText.trim()) {
                const text = replyText.trim();
                triggerReaction(text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)?.[0] || "❤️");
                onReply(currentStatus.user_id, text);
                setReplyText("");
              }
            }}
            placeholder="Reply to status..."
            className="flex-1 bg-gray-800 text-white placeholder-gray-400 px-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleShareClick}
            className="w-10 h-10 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer"
            title="Share status"
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={() => {
              if (replyText.trim()) {
                const text = replyText.trim();
                triggerReaction(text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)?.[0] || "❤️");
                onReply(currentStatus.user_id, text);
                setReplyText("");
              }
            }}
            className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white hover:bg-green-600 transition shrink-0 cursor-pointer"
          >
            <Send size={18} />
          </button>
        </div>
      )}

      {/* Share Modal Sheet */}
      {isShareModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => { setIsShareModalOpen(false); setIsHolding(false); }}
        >
          <div 
            className="w-full sm:max-w-md bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white animate-slideUp sm:animate-scaleUp select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 border border-emerald-500/40">
                  <img 
                    src={currentStatus.user_photo || getDefaultAvatar(currentStatus.user_name)} 
                    alt="Author" 
                    className="w-full h-full object-cover" 
                    onError={(e: any) => { e.target.src = getDefaultAvatar(currentStatus.user_name); }} 
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Share Status Update</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-400">by {currentStatus.user_name || "Contact"}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {isVideo ? "Video" : isImage ? "Photo" : isVoice ? "Voice" : "Text"}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setIsShareModalOpen(false); setIsHolding(false); }}
                className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Status Preview Card */}
            <div className="bg-gray-950/80 border border-gray-800/80 rounded-2xl p-3.5 flex items-center gap-3">
              {isImage && validMediaUrl ? (
                <img src={validMediaUrl} alt="Preview" className="w-12 h-12 object-cover rounded-xl shrink-0 border border-gray-800" />
              ) : isVideo && validMediaUrl ? (
                <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                  <Film size={20} className="text-emerald-400" />
                </div>
              ) : isVoice ? (
                <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                  <Mic size={20} className="text-red-400" />
                </div>
              ) : (
                <div className={`w-12 h-12 rounded-xl ${currentStatus.bg_color || "bg-emerald-600"} flex items-center justify-center shrink-0 text-white font-bold text-xs`}>
                  Aa
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {cleanCaption || (isImage ? "Photo Status" : isVideo ? "Video Status" : isVoice ? "Voice Status" : "Text Status")}
                </p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  {statusDeepLink}
                </p>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col gap-2">
              {/* Copy Deep Link */}
              <button
                onClick={copyDeepLink}
                className={`w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-between transition cursor-pointer ${
                  copiedLink
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-500 hover:bg-emerald-400 text-gray-950"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {copiedLink ? <Check size={18} className="stroke-[2.5]" /> : <Copy size={18} />}
                  <span>{copiedLink ? "Status Link Copied!" : "Copy Status Deep Link"}</span>
                </div>
                <span className="text-xs font-normal opacity-90">#status-{currentStatus.id}</span>
              </button>

              {/* Share via Apps (Native Sheet) */}
              {typeof navigator !== "undefined" && (
                <button
                  onClick={async () => {
                    const authorName = currentStatus.user_name || "ChatMe User";
                    const title = `ChatMe Status from ${authorName}`;
                    const text = cleanCaption ? `"${cleanCaption}" — ${authorName} on ChatMe` : `Check out this status on ChatMe!`;
                    if (navigator.share) {
                      try {
                        await navigator.share({ title, text, url: statusDeepLink });
                        if (showToast) showToast("Status shared successfully!");
                        setIsShareModalOpen(false);
                        setIsHolding(false);
                      } catch (e) {}
                    } else {
                      await shareContentViaAndroid({ title, text, url: statusDeepLink });
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Share2 size={18} className="text-emerald-400" />
                  <span>Share with Other Apps</span>
                </button>
              )}

              {/* Media Actions for Image or Video */}
              {(isImage || isVideo) && validMediaUrl && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={copyMediaLink}
                    className="py-2.5 px-3 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer border border-gray-700/50"
                  >
                    {copiedMediaUrl ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} className="text-emerald-400" />}
                    <span>{copiedMediaUrl ? "URL Copied" : "Copy Media URL"}</span>
                  </button>
                  <button
                    onClick={handleDownloadMedia}
                    className="py-2.5 px-3 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer border border-gray-700/50"
                  >
                    <Download size={15} className="text-emerald-400" />
                    <span>Download Media</span>
                  </button>
                </div>
              )}

              {/* Copy Caption */}
              {cleanCaption && (
                <button
                  onClick={copyCaption}
                  className="w-full py-2.5 px-4 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-xl text-xs font-medium flex items-center justify-between transition cursor-pointer border border-gray-800"
                >
                  <span className="truncate mr-2">Caption: "{cleanCaption}"</span>
                  <span className="text-emerald-400 font-semibold shrink-0">
                    {copiedCaption ? "Copied!" : "Copy Text"}
                  </span>
                </button>
              )}
            </div>

            {/* Footer close */}
            <button
              onClick={() => { setIsShareModalOpen(false); setIsHolding(false); }}
              className="w-full py-2.5 bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white text-xs font-semibold rounded-xl transition cursor-pointer mt-1"
            >
              Done & Resume Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UpdatesScreen({ dark, currentUser, statuses, onAddStatus, onViewStatus, onDeleteStatus, onUpdateStatuses }: any) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any | null>(null);

  // Real Status Feed states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realStatuses, setRealStatuses] = useState<any[]>([]);

  const [viewedStatusIds, setViewedStatusIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("chatme_viewed_statuses");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Selected media for StatusEditor
  const [selectedEditorMedia, setSelectedEditorMedia] = useState<{
    file: File;
    objectUrl: string;
    mediaType: "image" | "video";
  } | null>(null);

  // File input refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Helper to format raw status rows from Supabase
  const formatStatusRow = (row: any, pMap: Map<string, any>) => {
    const uid = String(row.user_id || "");
    const profile = pMap.get(uid) || {};
    const isMe = currentUser && String(currentUser.id) === uid;

    const displayName = isMe
      ? (currentUser?.fullname || currentUser?.email || "Me")
      : (profile.full_name || profile.fullname || profile.name || profile.display_name || row.user_name || "Contact");

    const displayPhoto = isMe
      ? (currentUser?.photo || getDefaultAvatar(displayName))
      : (profile.avatar_url || profile.photo || profile.avatar || row.user_photo || getDefaultAvatar(displayName));

    const validMediaUrl = getValidMediaUrl(row.media_url);

    return {
      ...row,
      id: row.id,
      user_id: row.user_id,
      user_name: displayName,
      user_photo: displayPhoto,
      media_type: row.media_type || "image",
      media_url: validMediaUrl,
      caption: row.caption || "",
      created_at: row.created_at,
      expires_at: row.expires_at,
      time_posted: formatStatusTime(row.created_at)
    };
  };

  // Fetch real unexpired status posts from Supabase
  const fetchRealStatuses = async () => {
    setLoading(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();

      // 1. Fetch unexpired status posts from status_posts
      const { data: posts, error: postsError } = await supabase
        .from("status_posts")
        .select("*")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("Error fetching status posts:", postsError);
        setError("Couldn't load statuses. Tap to retry.");
        setLoading(false);
        return;
      }

      // 2. Fetch profiles to display profile photo & name
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*");

      const pMap = new Map<string, any>();
      if (profiles) {
        profiles.forEach((p: any) => {
          const idVal = String(p.id || p.user_id || "");
          if (idVal) pMap.set(idVal, p);
        });
      }

      // 3. Format & filter by expires_at > now()
      const nowMs = Date.now();
      const formattedList = (posts || [])
        .map((p: any) => formatStatusRow(p, pMap))
        .filter((s: any) => {
          const expMs = s.expires_at ? new Date(s.expires_at).getTime() : 0;
          return expMs > nowMs;
        });

      // 4. Deduplicate statuses by ID
      const uniqueMap = new Map<string, any>();
      formattedList.forEach((s: any) => {
        const key = String(s.id);
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, s);
        }
      });

      const finalStatuses = Array.from(uniqueMap.values());
      setRealStatuses(finalStatuses);
      if (typeof onUpdateStatuses === "function") {
        onUpdateStatuses(finalStatuses);
      }
    } catch (err: any) {
      console.error("Failed to load statuses:", err);
      setError("Couldn't load statuses. Tap to retry.");
    } finally {
      setLoading(false);
    }
  };

  // Automatic refresh & Realtime subscription on mount
  useEffect(() => {
    fetchRealStatuses();

    // Supabase Realtime subscription for status_posts
    const channel = supabase
      .channel("updates-status-posts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "status_posts" },
        async (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new;
            if (!newRow) return;

            const nowMs = Date.now();
            const expMs = newRow.expires_at ? new Date(newRow.expires_at).getTime() : 0;
            if (expMs > 0 && expMs <= nowMs) return;

            // Fetch profile for user
            let pObj: any = null;
            try {
              const { data: p } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", newRow.user_id)
                .single();
              pObj = p;
            } catch (e) {}

            const pMap = new Map<string, any>();
            if (pObj) pMap.set(String(newRow.user_id), pObj);

            const formattedNew = formatStatusRow(newRow, pMap);

            setRealStatuses((prev) => {
              // Prevent duplicates when initial fetch and Realtime event return same row
              if (prev.some((item) => String(item.id) === String(formattedNew.id))) {
                return prev;
              }
              return [formattedNew, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new;
            if (!updatedRow) return;

            let pObj: any = null;
            try {
              const { data: p } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", updatedRow.user_id)
                .single();
              pObj = p;
            } catch (e) {}

            const pMap = new Map<string, any>();
            if (pObj) pMap.set(String(updatedRow.user_id), pObj);

            const formattedUpdated = formatStatusRow(updatedRow, pMap);

            setRealStatuses((prev) =>
              prev.map((item) => (String(item.id) === String(formattedUpdated.id) ? formattedUpdated : item))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setRealStatuses((prev) => prev.filter((item) => String(item.id) !== String(deletedId)));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const handleFileSelected = (e: any, defaultType: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type?.startsWith("video") || defaultType === "video";
    const mediaType: "image" | "video" = isVideo ? "video" : "image";

    const objectUrl = URL.createObjectURL(file);
    setSelectedEditorMedia({
      file,
      objectUrl,
      mediaType
    });
    setSheetOpen(false);

    if (e.target) e.target.value = "";
  };

  const handleStatusClick = (statusItem: any, listOverride?: any[]) => {
    if (statusItem?.id) {
      setViewedStatusIds(prev => {
        const next = new Set(prev);
        next.add(String(statusItem.id));
        try {
          localStorage.setItem("chatme_viewed_statuses", JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });
    }
    const targetList = listOverride || activeStatusList;
    onViewStatus(statusItem, targetList);
  };

  // Channels state
  const [channels, setChannels] = useState([
    {
      id: "ch-1",
      name: "Jobs and Internship Opportunities",
      photo: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=150&auto=format&fit=crop&q=80",
      latestMsg: "RTX is hiring Associate Engineer For 2021, 2022, 2023, 2024 grads Location: Hyderabad https://careers.rtx.com/global...",
      time: "7:45 PM",
      unread: 87,
      verified: true,
      followers: "1.2M",
      following: true,
      description: "Official tech career updates, job openings, and internship opportunities worldwide."
    },
    {
      id: "ch-2",
      name: "Motivational Quotes",
      photo: "https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=150&auto=format&fit=crop&q=80",
      latestMsg: "Mr SrK 💫: 📷 Agree?? Yes ❤️ No 🥺",
      time: "6:58 PM",
      unread: 48,
      verified: true,
      followers: "890K",
      following: true,
      description: "Daily motivation, life quotes, and inspirational thoughts."
    },
    {
      id: "ch-3",
      name: "Dubai Info Hub",
      photo: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=150&auto=format&fit=crop&q=80",
      latestMsg: "🔗 Get ready for a high-energy night as Punjabi music star Jasmine Sandlas brings The Dream Girl Tour to Coca-Cola Arena...",
      time: "6:00 PM",
      unread: 165,
      verified: true,
      followers: "2.4M",
      following: true,
      description: "Latest news, events, concerts, and attractions across Dubai and UAE."
    },
    {
      id: "ch-4",
      name: "WHATSAPP STATUS | IMAGINE WORLD | ROMANTIC STATUS LOVE SAD HINDI MUSIC HD VIDEO...",
      photo: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=150&auto=format&fit=crop&q=80",
      latestMsg: "📷 Every moment spent with you, The most beautiful story of my life.🖤✨",
      time: "5:31 PM",
      unread: 108,
      verified: false,
      followers: "540K",
      following: true,
      description: "Trending status videos, music clips, and aesthetic edits."
    },
    {
      id: "ch-5",
      name: "Ayomidate",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      latestMsg: "💻 5+ ODDS ON 1XBET 👆👆👆 1XBET CODE 👉 DNHGR REGISTER 💥💥💥 WITH THE LINK BELOW 👆👇 https://crop...",
      time: "4:58 PM",
      unread: 29,
      verified: false,
      followers: "310K",
      following: true,
      description: "Daily sports predictions, match analysis, and updates."
    },
    {
      id: "ch-6",
      name: "Dubai Media Office - مكتب دبي الإعلامي",
      photo: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=150&auto=format&fit=crop&q=80",
      latestMsg: "📷 Thought leaders, decision-makers, and the most influential media voices from the Arab world and beyond... coming together in Dubai.",
      time: "3:06 PM",
      unread: 105,
      verified: true,
      followers: "3.1M",
      following: true,
      description: "Official news and press releases from Dubai Media Office."
    },
    {
      id: "ch-7",
      name: "Motivation Quotes Hindi English Shyari Suvichar Funny Video Status Success Story UPSC IAS Motivation...",
      photo: "https://images.unsplash.com/photo-1499209974431-9dac3ada00d7?w=150&auto=format&fit=crop&q=80",
      latestMsg: "🔗 https://whatsapp.com/channel/0029VaHq3k62kNFu5tptxx3X",
      time: "2:13 PM",
      unread: 52,
      verified: false,
      followers: "420K",
      following: true,
      description: "UPSC IAS motivation, study quotes, and success stories."
    },
    {
      id: "ch-8",
      name: "Quotes Motivational | Quotes Real Life Stories Motivation",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      latestMsg: "🔗 https://whatsapp.com/channel/0029VbDEs7M65yDEPvWybK2r",
      time: "2:06 PM",
      unread: 48,
      verified: false,
      followers: "280K",
      following: true,
      description: "Real life stories and inspirational quotes."
    },
    {
      id: "ch-9",
      name: "1win",
      photo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop&q=80",
      latestMsg: "📷 Red or blue? Who starts the season with a trophy? Arsenal face Manchester City in the Community Shield tonight. P...",
      time: "1:45 PM",
      unread: 35,
      verified: true,
      followers: "1.8M",
      following: true,
      description: "Official sports news, fixture highlights, and community updates."
    },
    {
      id: "ch-10",
      name: "BrodaseunTv",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      latestMsg: "🎙️ Voice message (1:21)",
      time: "1:12 PM",
      unread: 72,
      verified: false,
      followers: "190K",
      following: true,
      description: "Entertainment news, podcasts, and trending comedy clips."
    },
    {
      id: "ch-11",
      name: "Lovin Dubai",
      photo: "https://images.unsplash.com/photo-1526495124232-a04e1849168c?w=150&auto=format&fit=crop&q=80",
      latestMsg: "📷 POV: You're chilling on the weekend, but then remember you got work tomorrow 😭",
      time: "12:40 PM",
      unread: 187,
      verified: true,
      followers: "2.9M",
      following: true,
      description: "Everything you need to know about life, food, and fun in Dubai."
    }
  ]);

  // Combine realStatuses with parent statuses fallback if realStatuses empty & not loading
  const activeStatusList = realStatuses.length > 0 || !loading ? realStatuses : (statuses || []);

  const myStatuses = activeStatusList.filter((s: any) => currentUser && String(s.user_id) === String(currentUser.id));
  const otherStatuses = activeStatusList.filter((s: any) => !currentUser || String(s.user_id) !== String(currentUser.id));

  // Filter channels based on search
  const filteredChannels = channels.filter(ch => 
    !searchQuery || 
    ch.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ch.latestMsg.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full relative bg-gray-950 text-white overflow-hidden select-none">
      {/* 1. UPDATES PAGE HEADER */}
      <div className="px-4 py-3 bg-gray-950 border-b border-gray-800/60 flex items-center justify-between shrink-0 z-10">
        <h1 className="text-xl font-bold text-white tracking-tight">Updates</h1>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => galleryInputRef.current?.click()}
            className="p-1.5 text-gray-300 hover:text-white transition active:scale-95 cursor-pointer"
            title="Camera"
          >
            <Camera size={21} />
          </button>
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className="p-1.5 text-gray-300 hover:text-white transition active:scale-95 cursor-pointer"
            title="Search"
          >
            <Search size={21} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-300 hover:text-white transition active:scale-95 cursor-pointer"
              title="More options"
            >
              <MoreVertical size={21} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl z-50 py-1 text-sm font-medium animate-fadeIn">
                <button 
                  onClick={() => { setShowMenu(false); setSheetOpen(true); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-800 text-gray-200 transition cursor-pointer"
                >
                  Status privacy
                </button>
                <button 
                  onClick={() => { setShowMenu(false); setShowCreateChannelModal(true); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-800 text-gray-200 transition cursor-pointer"
                >
                  Create Channel
                </button>
                <button 
                  onClick={() => { setShowMenu(false); setShowExploreModal(true); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-800 text-gray-200 transition border-t border-gray-800/80 cursor-pointer"
                >
                  Explore Channels
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optional Search Bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-gray-900 border-b border-gray-800/80 flex items-center gap-2 animate-fadeIn">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search status updates & channels..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>
      )}

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-24 space-y-4">
        {/* 2. STATUS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-base font-bold text-white tracking-wide">Status</h2>
            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Loader2 size={13} className="animate-spin" />
                <span>Refreshing...</span>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && !loading && (
            <div className="mb-3">
              <button
                onClick={fetchRealStatuses}
                className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-xl text-xs text-red-400 transition cursor-pointer"
              >
                <AlertCircle size={15} className="shrink-0" />
                <span>Couldn't load statuses. Tap to retry.</span>
              </button>
            </div>
          )}

          {/* Horizontally Scrollable Status Carousel */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 pt-0.5 scroll-smooth">
            {/* 3. ADD STATUS CARD */}
            <div 
              onClick={() => setSheetOpen(true)}
              className="w-[130px] sm:w-[150px] shrink-0 h-[190px] sm:h-[210px] rounded-2xl overflow-hidden relative border border-gray-800/80 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 cursor-pointer group shadow-md flex flex-col justify-between p-3 select-none hover:border-emerald-500/50 transition-all"
            >
              <div className="relative w-11 h-11 rounded-full border border-gray-700/80 bg-gray-800 overflow-visible p-0.5 mt-1">
                <img 
                  src={currentUser?.photo || getDefaultAvatar(currentUser?.fullname)} 
                  alt="Me" 
                  className="w-full h-full object-cover rounded-full" 
                  onError={(e: any) => { e.target.src = getDefaultAvatar(currentUser?.fullname); }}
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-gray-950 shadow-md group-hover:scale-110 transition-transform">
                  <Plus size={12} strokeWidth={3} />
                </div>
              </div>

              <div className="mt-auto">
                <p className="text-xs font-bold text-white tracking-wide">Add status</p>
              </div>
            </div>

            {/* MY POSTED STATUSES (IF ANY) */}
            {myStatuses.map((s: any) => {
              const isViewed = viewedStatusIds.has(String(s.id));
              const validUrl = getValidMediaUrl(s.media_url);
              return (
                <div
                  key={s.id}
                  onClick={() => handleStatusClick(s)}
                  className="w-[130px] sm:w-[150px] shrink-0 h-[190px] sm:h-[210px] rounded-2xl overflow-hidden relative border border-white/10 shadow-lg cursor-pointer group hover:scale-[1.02] transition-transform bg-gray-900 select-none"
                >
                  {/* Background Media */}
                  {validUrl && (s.media_type === "image" || !s.media_type) ? (
                    <img 
                      src={validUrl} 
                      alt="My status" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      onError={(e: any) => { e.target.style.display = 'none'; }} 
                    />
                  ) : validUrl && s.media_type === "video" ? (
                    <video src={validUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full p-3 flex items-center justify-center text-center font-bold text-xs leading-relaxed ${s.bg_color || "bg-gradient-to-br from-purple-800 via-indigo-900 to-gray-950 text-white"}`}>
                      <p className="line-clamp-4">{cleanStatusCaption(s.caption) || "My Status"}</p>
                    </div>
                  )}

                  {/* Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                  {/* Top Profile Avatar + Ring */}
                  <div className={`w-9 h-9 rounded-full p-0.5 border-2 ${isViewed ? "border-gray-500/80" : "border-emerald-500"} bg-gray-950 shadow-md absolute top-2.5 left-2.5 z-10 overflow-hidden`}>
                    <img src={currentUser?.photo || getDefaultAvatar(currentUser?.fullname)} alt="avatar" className="w-full h-full object-cover rounded-full" />
                  </div>

                  {/* Bottom User Name & Time */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 drop-shadow-md">
                    <p className="text-xs font-semibold text-white truncate">
                      My Status
                    </p>
                    {s.time_posted && (
                      <p className="text-[10px] text-gray-300 font-medium truncate">
                        {s.time_posted}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* CONTACT STATUS CARDS */}
            {otherStatuses.map((s: any) => {
              const isViewed = viewedStatusIds.has(String(s.id));
              const validUrl = getValidMediaUrl(s.media_url);
              return (
                <div
                  key={s.id}
                  onClick={() => handleStatusClick(s)}
                  className="w-[130px] sm:w-[150px] shrink-0 h-[190px] sm:h-[210px] rounded-2xl overflow-hidden relative border border-white/10 shadow-lg cursor-pointer group hover:scale-[1.02] transition-transform bg-gray-900 select-none"
                >
                  {/* Background Media */}
                  {validUrl && (s.media_type === "image" || !s.media_type) ? (
                    <img 
                      src={validUrl} 
                      alt="Status update" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      onError={(e: any) => { e.target.style.display = 'none'; }} 
                    />
                  ) : validUrl && s.media_type === "video" ? (
                    <video src={validUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full p-3 flex items-center justify-center text-center font-bold text-xs leading-relaxed ${s.bg_color || "bg-gradient-to-br from-emerald-800 via-teal-900 to-gray-950 text-white"}`}>
                      <p className="line-clamp-4">{cleanStatusCaption(s.caption) || "Status Update"}</p>
                    </div>
                  )}

                  {/* Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                  {/* Top Profile Avatar + Ring */}
                  <div className={`w-9 h-9 rounded-full p-0.5 border-2 ${isViewed ? "border-gray-500/80" : "border-emerald-500"} bg-gray-950 shadow-md absolute top-2.5 left-2.5 z-10 overflow-hidden`}>
                    <img 
                      src={s.user_photo || getDefaultAvatar(s.user_name || "Contact")} 
                      alt={s.user_name || "Contact"} 
                      className="w-full h-full object-cover rounded-full"
                      onError={(e: any) => { e.target.src = getDefaultAvatar(s.user_name); }} 
                    />
                  </div>

                  {/* Bottom User Name & Time */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 drop-shadow-md">
                    <p className="text-xs font-semibold text-white truncate">
                      {s.user_name || "Contact"}
                    </p>
                    {s.time_posted && (
                      <p className="text-[10px] text-gray-300 font-medium truncate">
                        {s.time_posted}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty State Message */}
            {!loading && !error && myStatuses.length === 0 && otherStatuses.length === 0 && (
              <div className="flex items-center justify-center p-4 border border-dashed border-gray-800 rounded-2xl shrink-0 text-xs text-gray-500 italic font-medium">
                No status updates yet.
              </div>
            )}
          </div>
        </div>

        {/* 8. BOOST STATUS BUTTON */}
        <button 
          onClick={() => setShowBoostModal(true)}
          className="w-full py-2.5 px-4 bg-gray-900/90 hover:bg-gray-800 border border-gray-800/80 rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-gray-200 hover:text-white transition active:scale-98 shadow-sm cursor-pointer"
        >
          <Megaphone size={16} className="text-emerald-400 shrink-0" />
          <span>Boost status</span>
        </button>

        {/* 9. CHANNELS SECTION */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white tracking-wide">Channels</h2>
            <button 
              onClick={() => setShowExploreModal(true)}
              className="px-3.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-full border border-gray-700/80 transition cursor-pointer"
            >
              Explore
            </button>
          </div>

          {/* 10. CHANNEL LIST */}
          <div className="flex flex-col">
            {filteredChannels.map((ch) => (
              <div
                key={ch.id}
                onClick={() => setSelectedChannel(ch)}
                className="flex items-center gap-3 py-3 px-1 rounded-xl hover:bg-gray-900/80 active:bg-gray-800/90 transition cursor-pointer border-b border-gray-900/60 last:border-0"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 shrink-0 border border-gray-800 relative">
                  <img 
                    src={ch.photo} 
                    alt={ch.name} 
                    className="w-full h-full object-cover"
                    onError={(e: any) => { e.target.src = getDefaultAvatar(ch.name); }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-sm font-bold text-white truncate flex items-center gap-1">
                      <span className="truncate">{ch.name}</span>
                      {ch.verified && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 fill-emerald-400" />}
                    </h3>
                    <span className="text-[11px] font-medium text-gray-400 shrink-0 ml-2">{ch.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 truncate pr-2 font-normal">
                      {ch.latestMsg}
                    </p>
                    {ch.unread > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-gray-950 font-bold text-[11px] rounded-full shrink-0 shadow-sm">
                        {ch.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 11. FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-2.5 z-40">
        <button
          onClick={() => setTextModalOpen(true)}
          title="Create Text Status"
          className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center shadow-lg border border-gray-700 active:scale-95 transition cursor-pointer"
        >
          <Pencil size={18} />
        </button>
        <button
          onClick={() => galleryInputRef.current?.click()}
          title="Create Media Status"
          className="w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-2xl active:scale-95 transition border border-emerald-400/30 cursor-pointer"
        >
          <Camera size={24} />
        </button>
      </div>

      {/* Hidden file inputs */}
      <input type="file" ref={cameraInputRef} accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => handleFileSelected(e, 'image')} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" className="hidden" onChange={(e) => handleFileSelected(e, 'image')} />
      <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleFileSelected(e, 'video')} />

      {/* Full Screen Status Editor when media is picked */}
      {selectedEditorMedia && (
        <StatusEditor
          file={selectedEditorMedia.file}
          objectUrl={selectedEditorMedia.objectUrl}
          mediaType={selectedEditorMedia.mediaType}
          dark={dark}
          currentUser={currentUser}
          onClose={() => {
            if (selectedEditorMedia.objectUrl) {
              URL.revokeObjectURL(selectedEditorMedia.objectUrl);
            }
            setSelectedEditorMedia(null);
          }}
          onPostSuccess={async (newStatus) => {
            await onAddStatus(newStatus);
            if (selectedEditorMedia.objectUrl) {
              URL.revokeObjectURL(selectedEditorMedia.objectUrl);
            }
            setSelectedEditorMedia(null);
          }}
        />
      )}

      {/* Bottom Sheet for Status Options */}
      {sheetOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end animate-fadeIn">
          <div className="p-6 rounded-t-3xl bg-gray-900 text-white border-t border-gray-800 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Add Status Update</h3>
              <button onClick={() => setSheetOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-4 gap-4 text-center">
              <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-800 hover:bg-emerald-950/40 border border-gray-700/80 transition">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white"><Camera size={22} /></div>
                <span className="text-xs font-medium">Camera</span>
              </button>
              <button onClick={() => galleryInputRef.current?.click()} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-800 hover:bg-blue-950/40 border border-gray-700/80 transition">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white"><ImageIcon size={22} /></div>
                <span className="text-xs font-medium">Gallery</span>
              </button>
              <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-800 hover:bg-purple-950/40 border border-gray-700/80 transition">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white"><Film size={22} /></div>
                <span className="text-xs font-medium">Video</span>
              </button>
              <button onClick={() => { setSheetOpen(false); setVoiceModalOpen(true); }} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-800 hover:bg-orange-950/40 border border-gray-700/80 transition">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white"><Mic size={22} /></div>
                <span className="text-xs font-medium">Voice</span>
              </button>
            </div>

            <button onClick={() => { setSheetOpen(false); setTextModalOpen(true); }} className="w-full mt-5 py-3 bg-emerald-500 text-gray-950 font-bold rounded-2xl shadow-lg hover:bg-emerald-400 transition">
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
              user_photo: currentUser?.photo || getDefaultAvatar(currentUser?.fullname),
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
              user_photo: currentUser?.photo || getDefaultAvatar(currentUser?.fullname),
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

      {/* Boost Status Modal */}
      {showBoostModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <Megaphone size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Boost Your Status</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Promote your status updates across ChatMe channels and reach thousands of contacts and local followers instantly.
              </p>
            </div>
            <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-gray-200">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span>Feature on top of Updates discovery</span>
              </div>
              <div className="flex items-center gap-2 text-gray-200">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span>Auto-broadcast to channel subscribers</span>
              </div>
              <div className="flex items-center gap-2 text-gray-200">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span>Real-time audience analytics</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setShowBoostModal(false)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs rounded-xl transition"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setShowBoostModal(false);
                  setSheetOpen(true);
                }}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs rounded-xl transition shadow-lg"
              >
                Create Boosted Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Details View Modal */}
      {selectedChannel && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col animate-fadeIn">
          {/* Header */}
          <div className="p-4 bg-gray-950 border-b border-gray-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setSelectedChannel(null)} className="p-1 text-gray-300 hover:text-white">
                <ArrowLeft size={22} />
              </button>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 shrink-0">
                <img src={selectedChannel.photo} alt={selectedChannel.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white truncate flex items-center gap-1">
                  <span>{selectedChannel.name}</span>
                  {selectedChannel.verified && <Check className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 shrink-0" />}
                </h3>
                <p className="text-xs text-gray-400">{selectedChannel.followers} followers</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setChannels(prev => prev.map(c => c.id === selectedChannel.id ? { ...c, following: !c.following } : c));
                setSelectedChannel(prev => prev ? { ...prev, following: !prev.following } : null);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${selectedChannel.following ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-emerald-500 text-gray-950 hover:bg-emerald-400"}`}
            >
              {selectedChannel.following ? "Following" : "Follow"}
            </button>
          </div>

          {/* Posts Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Latest Update</span>
                <span className="text-xs text-gray-400">{selectedChannel.time}</span>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed font-normal">
                {selectedChannel.latestMsg}
              </p>
              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1 hover:text-emerald-400 transition">
                    <Heart size={16} />
                    <span>2.4K</span>
                  </button>
                  <button className="flex items-center gap-1 hover:text-emerald-400 transition">
                    <MessageSquare size={16} />
                    <span>180</span>
                  </button>
                </div>
                <button className="hover:text-white transition">
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explore Channels Modal */}
      {showExploreModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col animate-fadeIn">
          <div className="p-4 bg-gray-950 border-b border-gray-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowExploreModal(false)} className="p-1 text-gray-300 hover:text-white">
                <ArrowLeft size={22} />
              </button>
              <h2 className="text-lg font-bold text-white">Explore Channels</h2>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-lg mx-auto w-full">
            <p className="text-xs text-gray-400 mb-2">Find and follow popular channels on ChatMe:</p>
            {channels.map((ch) => (
              <div key={ch.id} className="p-3 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={ch.photo} alt={ch.name} className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-800" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white truncate flex items-center gap-1">
                      <span className="truncate">{ch.name}</span>
                      {ch.verified && <Check className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 shrink-0" />}
                    </h4>
                    <p className="text-xs text-gray-400 truncate">{ch.followers} followers • {ch.description}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, following: !c.following } : c));
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${ch.following ? "bg-gray-800 text-gray-300" : "bg-emerald-500 text-gray-950 hover:bg-emerald-400"}`}
                >
                  {ch.following ? "Following" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannelModal && (
        <CreateChannelModal
          onClose={() => setShowCreateChannelModal(false)}
          onCreate={(newCh) => {
            setChannels(prev => [newCh, ...prev]);
            setShowCreateChannelModal(false);
          }}
        />
      )}
    </div>
  );
}

function CreateChannelModal({ onClose, onCreate }: { onClose: () => void; onCreate: (ch: any) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreate({
      id: `ch-${Date.now()}`,
      name: name.trim(),
      photo: `https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80`,
      latestMsg: "Welcome to our new channel! Updates will be posted here.",
      time: "Just now",
      unread: 1,
      verified: true,
      followers: "1 follower",
      following: true,
      description: description.trim() || "Official ChatMe broadcast channel."
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <h3 className="text-lg font-bold text-white">Create Channel</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Channel Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daily Tech Updates"
              required
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your channel is about..."
              rows={3}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs rounded-xl transition shadow-lg"
            >
              Create
            </button>
          </div>
        </form>
      </div>
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
/*  Presence & Last Seen Helpers                                       */
/* ------------------------------------------------------------------ */

export function isUserOnline(user: any, onlinePresenceSet: Set<string>): boolean {
  if (!user) return false;
  if (user.isGroup) return false;
  const userIdStr = String(user.id);
  if (onlinePresenceSet && onlinePresenceSet.has(userIdStr)) {
    return true;
  }
  if (user.online && (user.last_seen || user.lastSeenRaw)) {
    const lastSeenTime = new Date(user.last_seen || user.lastSeenRaw).getTime();
    const now = Date.now();
    if (!isNaN(lastSeenTime) && (now - lastSeenTime) < 45000) {
      return true;
    }
  }
  return false;
}

export function formatLastSeen(isoStr: string | null | undefined): string {
  if (!isoStr) return "Offline";
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return "Offline";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return `Last seen today at ${timeStr}`;
  } else if (isYesterday) {
    return `Last seen yesterday at ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `Last seen ${dateStr} at ${timeStr}`;
  }
}

export function timeAgoLabel(ts: any): string {
  if (!ts) return "";
  if (typeof ts === "string" && !ts.includes("-") && !ts.includes("T")) return ts;
  return formatLastSeen(ts);
}

/* ------------------------------------------------------------------ */
/*  Wallpaper Helpers                                                 */
/* ------------------------------------------------------------------ */

export const BUILTIN_WALLPAPERS: Record<string, { name: string; class: string; previewBg: string }> = {
  default: {
    name: "ChatMe Futuristic Dark",
    class: "bg-[#0b131e] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950 to-gray-950 text-white bg-cover bg-center",
    previewBg: "bg-slate-950 text-emerald-400"
  },
  emerald: {
    name: "Emerald Mint",
    class: "bg-emerald-50 dark:bg-emerald-950/90",
    previewBg: "bg-emerald-200 dark:bg-emerald-900"
  },
  ocean: {
    name: "Deep Ocean Blue",
    class: "bg-sky-50 dark:bg-sky-950/90",
    previewBg: "bg-sky-200 dark:bg-sky-900"
  },
  sunset: {
    name: "Sunset Warmth",
    class: "bg-amber-50 dark:bg-amber-950/90",
    previewBg: "bg-amber-200 dark:bg-amber-900"
  },
  charcoal: {
    name: "Dark Charcoal",
    class: "bg-gray-900 text-white",
    previewBg: "bg-gray-900 text-white"
  },
  purple: {
    name: "Soft Lavender",
    class: "bg-purple-50 dark:bg-purple-950/90",
    previewBg: "bg-purple-200 dark:bg-purple-900"
  }
};

export function compressWallpaperImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1080;
        const MAX_HEIGHT = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          resolve(dataUrl);
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */
/*  Home Screen                                                        */
/* ------------------------------------------------------------------ */

function HomeScreen({
  users,
  currentUser,
  messagesData,
  unread,
  openChat,
  dark,
  onlinePresenceSet,
  calls = [],
  onCall,
  onStartChat,
  onNewGroup,
  onAddContact,
  onAddStatus,
  onOpenAI,
  onOpenSupport,
  onOpenSettings,
  onToggleDark,
  showToast
}: any) {
  const [homeTab, setHomeTab] = useState<"chats" | "groups" | "calls">("chats");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  // Group conversations
  const groupUsers = users.filter((u: any) => u.isGroup);
  // Direct conversations
  const directUsers = users.filter((u: any) => !u.isGroup && u.id !== currentUser?.id);

  // Filtered rows for chats
  const chatRows = directUsers
    .map((u: any) => {
      const msgs = messagesData[u.id] || [];
      const last = msgs[msgs.length - 1];
      return { user: u, last, unread: unread[u.id] || 0 };
    })
    .filter((r: any) => r.user.fullname.toLowerCase().includes(query.toLowerCase()));

  // Filtered groups
  const groupRows = groupUsers
    .map((u: any) => {
      const msgs = messagesData[u.id] || [];
      const last = msgs[msgs.length - 1];
      return { user: u, last, unread: unread[u.id] || 0 };
    })
    .filter((r: any) => r.user.fullname.toLowerCase().includes(query.toLowerCase()));

  // Filtered calls
  const filteredCalls = (calls || []).filter((c: any) => {
    if (!query.trim()) return true;
    const u = users.find((usr: any) => usr.id === c.userId);
    return u?.fullname?.toLowerCase().includes(query.toLowerCase());
  });

  const totalUnreadChats = Object.values(unread || {}).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);

  return (
    <div className="flex flex-col h-full relative">
      {/* Top Header */}
      <header className="px-4 pt-3.5 pb-2.5 bg-[#0B101B] border-b border-slate-800/80 text-white shrink-0 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Logo size={36} rounded="rounded-xl" shadow="shadow-md shadow-emerald-500/10" />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                ChatMe
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(s => !s)}
              className={`p-2 rounded-xl transition-colors ${searchOpen ? "bg-white/15 text-emerald-400" : "text-slate-300 hover:text-white hover:bg-white/10"}`}
              title="Search"
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(s => !s)}
                className={`p-2 rounded-xl transition-colors ${menuOpen ? "bg-white/15 text-white" : "text-slate-300 hover:text-white hover:bg-white/10"}`}
                title="More options"
                aria-label="More options"
              >
                <MoreVertical size={20} />
              </button>

              {/* Three-dot dropdown menu */}
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl bg-[#0F172A] border border-slate-700/80 shadow-2xl py-1.5 z-50 text-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => { setMenuOpen(false); onNewGroup?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium hover:bg-white/10 text-left transition-colors"
                    >
                      <Users size={16} className="text-emerald-400" />
                      <span>New Group</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onAddContact?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium hover:bg-white/10 text-left transition-colors"
                    >
                      <UserPlus size={16} className="text-teal-400" />
                      <span>Add Contact</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onOpenAI?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium hover:bg-white/10 text-left transition-colors"
                    >
                      <Sparkles size={16} className="text-cyan-400" />
                      <span>AI Assistant</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onOpenSupport?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium hover:bg-white/10 text-left transition-colors"
                    >
                      <Headphones size={16} className="text-emerald-400" />
                      <span>Live Support</span>
                    </button>
                    <div className="my-1 border-t border-slate-800" />
                    <button
                      onClick={() => { setMenuOpen(false); onToggleDark?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium hover:bg-white/10 text-left transition-colors"
                    >
                      {dark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-400" />}
                      <span>{dark ? "Light Mode" : "Dark Mode"}</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onOpenSettings?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium hover:bg-white/10 text-left transition-colors"
                    >
                      <SettingsIcon size={16} className="text-slate-400" />
                      <span>Settings</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search input (when opened) */}
        {searchOpen && (
          <div className="mt-2.5 mb-1 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search messages, contacts, groups..."
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 outline-none"
                autoFocus
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Header Tabs: Chats, Groups, Calls */}
        <div className="flex items-center gap-2 mt-3 pt-1 border-t border-slate-800/60">
          <button
            onClick={() => setHomeTab("chats")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              homeTab === "chats"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <span>Chats</span>
            {totalUnreadChats > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${homeTab === "chats" ? "bg-white text-emerald-700" : "bg-emerald-500 text-white"}`}>
                {totalUnreadChats}
              </span>
            )}
          </button>

          <button
            onClick={() => setHomeTab("groups")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              homeTab === "groups"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <span>Groups</span>
            {groupUsers.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${homeTab === "groups" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"}`}>
                {groupUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setHomeTab("calls")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              homeTab === "calls"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <span>Calls</span>
            {filteredCalls.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${homeTab === "calls" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"}`}>
                {filteredCalls.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <div className={`flex-1 overflow-y-auto ${dark ? "bg-[#0B101B]" : "bg-white"}`}>
        {/* TAB 1: CHATS */}
        {homeTab === "chats" && (
          <div>
            {chatRows.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                  <MessageCircle size={32} />
                </div>
                <h3 className={`text-base font-bold mb-1 ${dark ? "text-white" : "text-slate-900"}`}>No conversations found</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-6">
                  {query ? "No messages or contacts match your search." : "Start chatting with your contacts and friends on ChatMe."}
                </p>
                <button
                  onClick={onStartChat}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition-transform"
                >
                  Start a Chat
                </button>
              </div>
            )}

            {chatRows.map(({ user, last, unread: u }) => {
              const online = isUserOnline(user, onlinePresenceSet);
              return (
                <button
                  key={user.id}
                  onClick={() => openChat(user.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left border-b transition-colors ${
                    dark
                      ? "border-slate-800/80 hover:bg-slate-800/40 active:bg-slate-800/70"
                      : "border-slate-100 hover:bg-slate-50/80 active:bg-slate-100/70"
                  }`}
                >
                  {/* Circular profile picture with online indicator */}
                  <div className="relative shrink-0">
                    <img
                      src={user.photo || getDefaultAvatar(user.fullname)}
                      alt={user.fullname}
                      onError={(e: any) => { e.target.src = getDefaultAvatar(user.fullname); }}
                      className="w-13 h-13 rounded-full object-cover ring-2 ring-emerald-500/15"
                      style={{ width: "50px", height: "50px" }}
                    />
                    {online && (
                      <span
                        title="Online"
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0B101B] shadow-sm"
                      />
                    )}
                  </div>

                  {/* Name, last message, time, unread badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[15px] font-bold truncate ${dark ? "text-white" : "text-slate-900"}`}>
                        {user.fullname}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2">
                        {last ? timeAgoLabel(last.timestamp) : ""}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        {last && last.senderId === currentUser?.id && (
                          <span className="shrink-0">
                            {last.status === "read" ? (
                              <CheckCheck size={15} className="text-cyan-500 stroke-[2.5]" />
                            ) : last.status === "delivered" ? (
                              <CheckCheck size={15} className="text-slate-400 stroke-[2]" />
                            ) : (
                              <Check size={15} className="text-slate-400 stroke-[2]" />
                            )}
                          </span>
                        )}
                        <p className={`text-xs truncate leading-snug ${
                          u > 0
                            ? (dark ? "text-slate-200 font-semibold" : "text-slate-800 font-semibold")
                            : "text-slate-400 dark:text-slate-400"
                        }`}>
                          {last ? (last.senderId === currentUser?.id ? "You: " : "") + last.text : "Tap to start chatting"}
                        </p>
                      </div>

                      {u > 0 && (
                        <span className="ml-2 shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-black flex items-center justify-center shadow-sm shadow-emerald-500/30">
                          {u}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* TAB 2: GROUPS */}
        {homeTab === "groups" && (
          <div>
            <div className={`p-4 border-b flex items-center justify-between ${dark ? "border-slate-800 bg-slate-900/40" : "border-slate-100 bg-slate-50/70"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Users size={20} />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Group Chats</h4>
                  <p className="text-xs text-slate-400">{groupUsers.length} active groups</p>
                </div>
              </div>
              <button
                onClick={onNewGroup}
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                + New Group
              </button>
            </div>

            {groupRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                <div className="w-16 h-16 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center mb-4">
                  <Users size={32} />
                </div>
                <h3 className={`text-base font-bold mb-1 ${dark ? "text-white" : "text-slate-900"}`}>No groups yet</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-6">
                  Create a group chat to connect, share, and message with multiple friends at once.
                </p>
                <button
                  onClick={onNewGroup}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition-transform"
                >
                  Create Group
                </button>
              </div>
            ) : (
              groupRows.map(({ user, last, unread: u }) => (
                <button
                  key={user.id}
                  onClick={() => openChat(user.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left border-b transition-colors ${
                    dark
                      ? "border-slate-800/80 hover:bg-slate-800/40 active:bg-slate-800/70"
                      : "border-slate-100 hover:bg-slate-50/80 active:bg-slate-100/70"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={user.photo || getDefaultAvatar(user.fullname)}
                      alt={user.fullname}
                      onError={(e: any) => { e.target.src = getDefaultAvatar(user.fullname); }}
                      className="w-13 h-13 rounded-full object-cover ring-2 ring-teal-500/20"
                      style={{ width: "50px", height: "50px" }}
                    />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-[#0B101B]">
                      👥
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[15px] font-bold truncate ${dark ? "text-white" : "text-slate-900"}`}>
                        {user.fullname}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2">
                        {last ? timeAgoLabel(last.timestamp) : ""}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-400 truncate leading-snug">
                        {last ? (last.senderId === currentUser?.id ? "You: " : "") + last.text : `${(user.members || []).length + 1} members`}
                      </p>

                      {u > 0 && (
                        <span className="ml-2 shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-black flex items-center justify-center shadow-sm shadow-emerald-500/30">
                          {u}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* TAB 3: CALLS */}
        {homeTab === "calls" && (
          <div>
            <div className={`p-4 border-b flex items-center justify-between ${dark ? "border-slate-800 bg-slate-900/40" : "border-slate-100 bg-slate-50/70"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
                  <Phone size={20} />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Call History</h4>
                  <p className="text-xs text-slate-400">{filteredCalls.length} recent calls</p>
                </div>
              </div>
            </div>

            {filteredCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-4">
                  <Phone size={32} />
                </div>
                <h3 className={`text-base font-bold mb-1 ${dark ? "text-white" : "text-slate-900"}`}>No calls yet</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-6">
                  Reach out to your contacts with crystal-clear voice and video calls.
                </p>
                <button
                  onClick={onStartChat}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition-transform"
                >
                  Call a Contact
                </button>
              </div>
            ) : (
              filteredCalls.map((c: any) => {
                const u = users.find((usr: any) => usr.id === c.userId);
                if (!u) return null;
                const DirIcon = c.missed ? PhoneMissed : c.direction === "incoming" ? PhoneIncoming : PhoneOutgoing;
                const dirColor = c.missed ? "text-red-500" : "text-emerald-500";
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-3.5 px-4 py-3.5 border-b transition-colors ${
                      dark ? "border-slate-800/80 hover:bg-slate-800/30" : "border-slate-100 hover:bg-slate-50/60"
                    }`}
                  >
                    <img
                      src={u.photo || getDefaultAvatar(u.fullname)}
                      alt={u.fullname}
                      onError={(e: any) => { e.target.src = getDefaultAvatar(u.fullname); }}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-700/20"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-bold truncate ${c.missed ? "text-red-400" : dark ? "text-white" : "text-slate-900"}`}>
                        {u.fullname}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <DirIcon size={14} className={dirColor} />
                        <span className="text-xs text-slate-400">
                          {c.timestamp}{c.duration ? ` · ${c.duration}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onCall?.(u, "voice")}
                        className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors"
                        title="Voice Call"
                      >
                        <Phone size={15} />
                      </button>
                      <button
                        onClick={() => onCall?.(u, "video")}
                        className="w-9 h-9 rounded-full bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500 hover:text-white flex items-center justify-center transition-colors"
                        title="Video Call"
                      >
                        <Video size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-20 right-5 z-40">
        <button
          onClick={() => setFabMenuOpen(s => !s)}
          aria-label="New chat or action"
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus size={26} strokeWidth={2.8} className={`transition-transform duration-200 ${fabMenuOpen ? "rotate-45" : ""}`} />
        </button>
      </div>

      {/* Floating Action Menu Modal / Sheet */}
      {fabMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setFabMenuOpen(false)}
          />
          <div className="fixed bottom-24 right-5 z-50 w-64 rounded-3xl bg-[#0F172A] border border-slate-700/80 shadow-2xl p-2.5 text-white animate-in slide-in-from-bottom-5 duration-200">
            <div className="px-3 pt-2 pb-1.5 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</span>
              <button onClick={() => setFabMenuOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={15} />
              </button>
            </div>
            <div className="flex flex-col gap-1 mt-1.5">
              <button
                onClick={() => { setFabMenuOpen(false); onStartChat?.(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/10 active:bg-white/15 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold">New Chat</div>
                  <div className="text-[10px] text-slate-400">Message a contact</div>
                </div>
              </button>

              <button
                onClick={() => { setFabMenuOpen(false); onNewGroup?.(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/10 active:bg-white/15 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold">New Group</div>
                  <div className="text-[10px] text-slate-400">Create a group chat</div>
                </div>
              </button>

              <button
                onClick={() => { setFabMenuOpen(false); onAddContact?.(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/10 active:bg-white/15 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold">Add Contact</div>
                  <div className="text-[10px] text-slate-400">Import or add manually</div>
                </div>
              </button>

              <button
                onClick={() => { setFabMenuOpen(false); onAddStatus?.(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/10 active:bg-white/15 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Camera size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold">Create Status</div>
                  <div className="text-[10px] text-slate-400">Share photo, video or audio</div>
                </div>
              </button>

              <button
                onClick={() => { setFabMenuOpen(false); onOpenAI?.(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/10 active:bg-white/15 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold">AI Assistant</div>
                  <div className="text-[10px] text-slate-400">Ask Gemini anything</div>
                </div>
              </button>

              <button
                onClick={() => { setFabMenuOpen(false); onOpenSupport?.(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/10 active:bg-white/15 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Headphones size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold">Live Support</div>
                  <div className="text-[10px] text-slate-400">24/7 Agent help</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
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

function ChatScreen({ contact, currentUser, messages, onSend, onReact, onBack, typing, dark, wallpaper, onEditGroup, onlinePresenceSet, onCall, showToast }: any) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [showEmojis, setShowEmojis] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [menuOpenForId, setMenuOpenForId] = useState<any>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const timerRef = useRef<any>(null);

  const isImageUrl = (t: string) => /\.(jpeg|jpg|gif|png|webp)$/i.test(t) || (typeof t === 'string' && t.startsWith("data:image/"));
  const isVideoUrl = (t: string) => /\.(mp4|webm|mov)$/i.test(t) || (typeof t === 'string' && t.startsWith("data:video/"));

  const images = messages.filter((m: any) => isImageUrl(m.text)).map((m: any) => m.text);

  const startRecording = () => {
    setIsRecording(true);
    setStartTime(Date.now());
  };

  const stopRecording = () => {
    setIsRecording(false);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onSend(`[VOICE:${duration > 0 ? duration : 1}s]`);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onSend(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing]);

  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
    setShowEmojis(false);
  };

  const startLongPress = (id: any) => {
    timerRef.current = setTimeout(() => {
      setMenuOpenForId(id);
    }, 500);
  };
  
  const clearTimer = () => clearTimeout(timerRef.current);

  const online = isUserOnline(contact, onlinePresenceSet);
  const isCustomWallpaper = wallpaper && (wallpaper.startsWith("data:") || wallpaper.startsWith("http://") || wallpaper.startsWith("https://") || wallpaper.startsWith("blob:"));
  const wallpaperPreset = BUILTIN_WALLPAPERS[wallpaper] || BUILTIN_WALLPAPERS.default;

  return (
    <div className="flex flex-col h-full relative">
      <input type="file" ref={fileInputRef} accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleMediaUpload} />

      <div className="flex items-center gap-3 px-3 py-3 border-b bg-[#0B101B] border-slate-800/80 text-white shrink-0 sticky top-0 z-20 shadow-sm">
        <button onClick={onBack} className="p-1.5 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div 
          className="relative shrink-0 cursor-pointer"
          onClick={() => contact.isGroup && onEditGroup && onEditGroup(contact)}
        >
          <img src={contact.photo || getDefaultAvatar(contact.fullname)} alt={contact.fullname} className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/25" />
          <AnimatePresence>
            {online && !contact.isGroup && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0B101B]"
              />
            )}
          </AnimatePresence>
        </div>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => contact.isGroup && onEditGroup && onEditGroup(contact)}
        >
          <p className="text-sm font-bold truncate text-white">{contact.fullname}</p>
          <p className="text-[11px] text-slate-300">
            {typing
              ? <span className="text-emerald-400 font-medium">{contact.fullname} is typing…</span>
              : contact.isGroup
              ? `${(contact.members || []).length + 1} members`
              : online
              ? <span className="text-emerald-400 font-medium">Online</span>
              : formatLastSeen(contact.last_seen || contact.lastSeenRaw)}
          </p>
        </div>
        {contact.isGroup && (
          <button 
            onClick={() => onEditGroup && onEditGroup(contact)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Manage Group Members"
          >
            <Users size={18} />
          </button>
        )}
        <button
          onClick={() => {
            if (contact?.phone) {
              openPhoneDialer(contact.phone);
            } else if (onCall) {
              onCall(contact, "voice");
            } else if (showToast) {
              showToast(`Calling ${contact?.fullname || 'contact'}…`);
            }
          }}
          className="p-2 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-white/10 transition"
          title="Voice Call"
        >
          <Phone size={18} />
        </button>
        <button
          onClick={() => {
            if (onCall) {
              onCall(contact, "video");
            } else if (showToast) {
              showToast(`Starting video call with ${contact?.fullname || 'contact'}…`);
            }
          }}
          className="p-2 rounded-xl text-cyan-400 hover:text-cyan-300 hover:bg-white/10 transition"
          title="Video Call"
        >
          <Video size={18} />
        </button>
        <button onClick={() => setShowGallery(true)} className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition" title="View Gallery">
          <ImageIcon size={18} />
        </button>
      </div>

      <div 
        className={`flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 relative ${!isCustomWallpaper ? (wallpaperPreset?.class || WALLPAPERS[wallpaper] || WALLPAPERS.default) : ""}`}
        style={isCustomWallpaper ? {
          backgroundImage: `url(${wallpaper})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        } : undefined}
      >
        {isCustomWallpaper && (
          <div className="absolute inset-0 bg-black/15 dark:bg-black/40 pointer-events-none z-0" />
        )}
        <div className="relative z-10 flex flex-col gap-2 flex-1">
          <AnimatePresence initial={false}>
            {messages.map((m: any) => {
              const mine = m.senderId === currentUser.id;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: mine ? 20 : -20, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                >
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
                    ) : isVideoUrl(m.text) ? (
                      <video src={m.text} controls className="max-w-xs rounded-lg" />
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
                </motion.div>
              );
            })}
            {typing && (
              <motion.div
                initial={{ opacity: 0, x: -20, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -16, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="flex items-start"
              >
                <div className={`rounded-xl rounded-bl-sm px-3 py-2 ${dark ? "bg-gray-800" : "bg-white shadow-sm"}`}>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
      </div>

      {menuOpenForId && (
        <AnimatePresence>
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4" onClick={() => setMenuOpenForId(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={`rounded-2xl p-3 flex flex-col gap-2 shadow-2xl min-w-[240px] ${dark ? "bg-gray-800 text-white border border-gray-700" : "bg-white text-gray-900 border border-gray-100"}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Quick Reactions */}
              <div className="flex items-center justify-between gap-1 pb-2 border-b border-gray-200 dark:border-gray-700">
                {["❤️", "👍", "😂", "😮", "😢", "😡"].map(emoji => (
                  <button 
                    key={emoji} 
                    onClick={() => { onReact(menuOpenForId, emoji); setMenuOpenForId(null); }} 
                    className="text-xl hover:scale-125 transition-transform p-1"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Copy Text Option */}
              <button
                onClick={() => {
                  const targetMsg = messages.find((m: any) => m.id === menuOpenForId);
                  if (targetMsg) {
                    let textToCopy = targetMsg.text || "";
                    if (textToCopy.startsWith("[VOICE:")) {
                      textToCopy = "Voice Note: " + textToCopy.replace("[VOICE:", "").replace("]", "");
                    }
                    navigator.clipboard.writeText(textToCopy);
                    if (showToast) {
                      showToast("Message text copied to clipboard!");
                    }
                  }
                  setMenuOpenForId(null);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  dark ? "hover:bg-gray-700 text-gray-200" : "hover:bg-gray-100 text-gray-800"
                }`}
              >
                <Copy size={16} className="text-green-500 shrink-0" />
                <span>Copy Text</span>
              </button>
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      {showEmojis && (
        <div className={`px-3 py-2 border-t flex flex-wrap gap-2 z-20 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
          {["😊", "😂", "❤️", "👍", "🔥", "🎉", "🙏", "😍", "🙌", "😎"].map((em) => (
            <button key={em} onClick={() => { setText(t => t + em); }} className="text-lg hover:scale-125 transition">
              {em}
            </button>
          ))}
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
            {images.map((src: string) => <img src={src} key={src} className="w-full aspect-square object-cover rounded-lg" onClick={() => setLightbox(src)} />)}
          </div>
        </div>
      )}

      <div
        className={`flex items-center gap-2 px-3 py-2.5 border-t z-20 ${dark ? "bg-[#0B101B] border-slate-800" : "bg-white border-slate-100"}`}
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom, 0px))" }}
      >
        <button onClick={() => setShowEmojis(s => !s)} className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors"><Smile size={20} /></button>
        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors"><Paperclip size={20} /></button>
        <button onClick={() => cameraInputRef.current?.click()} className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors"><Camera size={20} /></button>
        <button onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${isRecording ? "bg-red-500" : "bg-slate-200 dark:bg-slate-800"}`}>
          <Mic size={16} className={isRecording ? "text-white animate-pulse" : "text-slate-600 dark:text-slate-300"} />
        </button>
        <input
          value={isRecording ? "Recording..." : text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
          className={`flex-1 rounded-full px-4 py-2 text-sm outline-none transition-all ${dark ? "bg-slate-800 text-white placeholder-slate-400 focus:ring-1 focus:ring-emerald-500" : "bg-slate-100 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500"}`}
        />
        <button onClick={send} className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25 active:scale-90 transition-transform">
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Phone Normalization & Matching Helpers                             */
/* ------------------------------------------------------------------ */

export interface DeviceContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photo?: string;
}

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }
  return cleaned;
}

export function isPhoneMatch(p1: string | null | undefined, p2: string | null | undefined): boolean {
  if (!p1 || !p2) return false;
  const norm1 = normalizePhone(p1);
  const norm2 = normalizePhone(p2);
  if (!norm1 || !norm2) return false;
  if (norm1 === norm2) return true;

  const digits1 = norm1.replace(/\D/g, "");
  const digits2 = norm2.replace(/\D/g, "");
  if (digits1.length >= 7 && digits2.length >= 7) {
    const minLen = Math.min(10, digits1.length, digits2.length);
    return digits1.slice(-minLen) === digits2.slice(-minLen);
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Contacts Screen                                                    */
/* ------------------------------------------------------------------ */

function ContactsScreen({
  users,
  currentUser,
  deviceContacts,
  contactsPermissionGranted,
  onRequestPermission,
  onAddManualContact,
  openChat,
  dark,
  setScreen,
  setEditingGroup,
  onlinePresenceSet,
  showToast
}: any) {
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) {
      if (showToast) showToast("Name and phone number are required");
      return;
    }
    onAddManualContact(manualName.trim(), manualPhone.trim(), manualEmail.trim());
    setManualName("");
    setManualPhone("");
    setManualEmail("");
    setShowAddModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const contacts: DeviceContact[] = [];
      const blocks = text.split(/END:VCARD/i);

      blocks.forEach((block, idx) => {
        const nameMatch = block.match(/FN[;:]([^\r\n]+)/i) || block.match(/N[;:]([^\r\n]+)/i);
        const telMatch = block.match(/TEL[;:]([^\r\n]+)/i);
        const emailMatch = block.match(/EMAIL[;:]([^\r\n]+)/i);

        let name = nameMatch ? nameMatch[1].replace(/^;+/, '').replace(/;/g, ' ').trim() : '';
        let phone = telMatch ? telMatch[1].replace(/[^0-9\+\-\s\(\)]/g, '').trim() : '';
        let email = emailMatch ? emailMatch[1].trim() : '';

        if (phone) {
          if (!name) name = "Contact " + (contacts.length + 1);
          contacts.push({
            id: 'vcard_' + Date.now() + '_' + idx,
            name,
            phone,
            email
          });
        }
      });

      if (contacts.length > 0) {
        contacts.forEach(c => onAddManualContact(c.name, c.phone, c.email));
        if (showToast) showToast(`Imported ${contacts.length} contacts!`);
      } else {
        if (showToast) showToast("No valid contacts found in file");
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = "";
  };

  const handleInvite = (c: DeviceContact) => {
    const shareText = `Hey ${c.name}! Join me on ChatMe to chat for free: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({
        title: "Join me on ChatMe",
        text: shareText,
        url: window.location.origin,
      }).catch(() => {});
    } else {
      const smsUrl = `sms:${encodeURIComponent(c.phone)}?body=${encodeURIComponent(shareText)}`;
      window.open(smsUrl, "_blank");
    }
    if (showToast) showToast(`Invite link prepared for ${c.name}`);
  };

  const processedContacts = (deviceContacts || [])
    .map((c: DeviceContact) => {
      const matchedUser = (users || []).find((u: any) => {
        if (currentUser && u.id === currentUser.id) return false;
        return isPhoneMatch(c.phone, u.phone) || (c.email && u.email && c.email.toLowerCase() === u.email.toLowerCase());
      });

      if (matchedUser) {
        const online = isUserOnline(matchedUser, onlinePresenceSet);
        return {
          id: c.id,
          name: matchedUser.fullname || c.name,
          phone: c.phone || matchedUser.phone,
          photo: matchedUser.photo || getDefaultAvatar(matchedUser.fullname),
          isOnChatMe: true,
          registeredUser: matchedUser,
          isOnline: online,
          statusText: online ? "Online" : formatLastSeen(matchedUser.last_seen || matchedUser.lastSeenRaw)
        };
      } else {
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          photo: getDefaultAvatar(c.name),
          isOnChatMe: false,
          registeredUser: null,
          isOnline: false,
          statusText: "Not on ChatMe"
        };
      }
    })
    .filter((c: any) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
      );
    })
    .sort((a: any, b: any) => {
      if (a.isOnChatMe !== b.isOnChatMe) return a.isOnChatMe ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  if (!contactsPermissionGranted && (!deviceContacts || deviceContacts.length === 0)) {
    return (
      <div className={`flex flex-col h-full ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
        <ScreenHeader title="Contacts" dark={dark} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto my-auto">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${dark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600"}`}>
            <BookUser size={40} />
          </div>
          <h2 className="text-xl font-bold mb-2">Allow Contacts Access</h2>
          <p className={`text-sm mb-6 ${dark ? "text-gray-400" : "text-gray-600"}`}>
            ChatMe needs access to your device phone book to find friends and family who are registered on ChatMe.
          </p>

          <button
            onClick={onRequestPermission}
            className="w-full py-3.5 px-4 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition mb-3"
          >
            <BookUser size={18} />
            <span>Allow Contacts Access</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className={`w-full py-3 px-4 border rounded-xl text-xs font-semibold transition ${
              dark ? "border-gray-800 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Add Phone Contact Manually
          </button>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className={`w-full max-w-sm rounded-2xl p-5 ${dark ? "bg-gray-900 text-white border border-gray-800" : "bg-white text-gray-900"} shadow-2xl animate-fadeIn`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-base">Add Phone Contact</h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X size={20} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="flex flex-col gap-3">
                <TextField icon={User} placeholder="Contact Name" value={manualName} onChange={(e) => setManualName(e.target.value)} dark={dark} />
                <TextField icon={Phone} placeholder="Phone Number (e.g. +1 555-0199)" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} dark={dark} />
                <TextField icon={Mail} placeholder="Email (Optional)" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} dark={dark} />

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${dark ? "border-gray-800 hover:bg-gray-800 text-gray-300" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition shadow"
                  >
                    Save Contact
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      <ScreenHeader
        title="Contacts"
        dark={dark}
        right={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowAddModal(true)}
              className={`p-2 rounded-xl transition ${dark ? "hover:bg-gray-800 text-green-400" : "hover:bg-green-50 text-green-600"}`}
              title="Add Contact"
            >
              <UserPlus size={20} />
            </button>
            <button
              onClick={onRequestPermission}
              className={`p-2 rounded-xl transition ${dark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`}
              title="Sync Device Contacts"
            >
              <RefreshCw size={18} />
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

      <input type="file" ref={fileInputRef} accept=".vcf,text/vcard,text/plain" onChange={handleFileUpload} className="hidden" />

      <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        <div className="flex-1">
          <TextField
            icon={Search}
            placeholder="Search phone contacts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            dark={dark}
          />
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${dark ? "bg-gray-900" : "bg-white"}`}>
        {processedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-6 text-center my-auto">
            <BookUser size={44} className="mb-3 opacity-40 text-green-500" />
            <p className="text-sm font-semibold">No device contacts found</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Sync your phone address book or add phone contacts manually to match friends on ChatMe.
            </p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-semibold hover:bg-green-600 transition shadow"
              >
                + Add Phone Contact
              </button>
              <button
                onClick={onRequestPermission}
                className={`px-4 py-2 border rounded-xl text-xs font-semibold transition ${dark ? "border-gray-800 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-100"}`}
              >
                Sync Device
              </button>
            </div>
          </div>
        ) : (
          <div>
            {processedContacts.map((c: any) => {
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (c.isOnChatMe && c.registeredUser) {
                      openChat(c.registeredUser.id);
                    } else {
                      handleInvite(c);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b cursor-pointer transition ${
                    dark ? "border-gray-800 hover:bg-gray-800/60 active:bg-gray-800" : "border-gray-50 hover:bg-gray-50/80 active:bg-gray-100"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img src={c.photo} alt={c.name} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                    <AnimatePresence>
                      {c.isOnline && (
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
                      <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}>
                        {c.name}
                      </p>
                      <span className="text-[11px] text-gray-400 shrink-0">
                        {c.statusText}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className={`text-xs truncate ${dark ? "text-gray-400" : "text-gray-500"}`}>
                        {c.phone}
                      </p>
                      {c.isOnChatMe ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 dark:bg-green-500/20">
                          On ChatMe
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          Invite
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {c.isOnChatMe && c.registeredUser ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openChat(c.registeredUser.id);
                        }}
                        className={`p-2 rounded-xl transition ${dark ? "hover:bg-gray-700 text-green-400" : "hover:bg-green-50 text-green-600"}`}
                        title="Message"
                      >
                        <MessageCircle size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInvite(c);
                        }}
                        className={`p-2 rounded-xl transition ${dark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
                        title="Invite to ChatMe"
                      >
                        <Share2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl p-5 ${dark ? "bg-gray-900 text-white border border-gray-800" : "bg-white text-gray-900"} shadow-2xl animate-fadeIn`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base">Add Phone Contact</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X size={20} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3">
              <TextField icon={User} placeholder="Contact Name" value={manualName} onChange={(e) => setManualName(e.target.value)} dark={dark} />
              <TextField icon={Phone} placeholder="Phone Number (e.g. +1 555-0199)" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} dark={dark} />
              <TextField icon={Mail} placeholder="Email (Optional)" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} dark={dark} />

              <div className="flex justify-between items-center my-1 pt-1 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-green-500 font-semibold hover:underline flex items-center gap-1.5"
                >
                  <Upload size={14} /> Import vCard File
                </button>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${dark ? "border-gray-800 hover:bg-gray-800 text-gray-300" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition shadow"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

function ProfileScreen({ user, goEdit, goSettings, goPrivacy, goNotifications, goHelpAndSupport, onLogout, dark }: any) {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${dark ? "bg-[#0B101B]" : "bg-slate-50"}`}>
      <ScreenHeader title="My Profile" dark={dark} />

      <div className="p-4 flex flex-col gap-4 pb-24">
        {/* Profile Card */}
        <div className={`rounded-3xl p-6 flex flex-col items-center text-center shadow-lg border relative ${
          dark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-100"
        }`}>
          {/* Avatar with emerald ring */}
          <div className="relative mb-3.5">
            <img
              src={user.photo || getDefaultAvatar(user.fullname)}
              alt={user.fullname}
              onError={(e: any) => { e.target.src = getDefaultAvatar(user.fullname); }}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-500/25 shadow-xl"
            />
            <button
              onClick={goEdit}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform border-2 border-white dark:border-[#0F172A]"
              title="Edit Profile"
            >
              <Edit2 size={13} />
            </button>
          </div>

          <h2 className={`text-xl font-extrabold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
            {user.fullname}
          </h2>
          <p className="text-xs font-semibold text-emerald-500 mt-0.5">
            @{user.username || user.email?.split("@")[0] || "user"}
          </p>
          <p className="text-xs text-slate-400 mt-1">{user.email}</p>

          {user.bio && (
            <p className={`text-xs mt-3 px-4 py-2 rounded-2xl italic max-w-xs ${
              dark ? "bg-slate-800/60 text-slate-300" : "bg-slate-50 text-slate-600"
            }`}>
              "{user.bio}"
            </p>
          )}

          {user.phone && (
            <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-400">
              <Phone size={12} className="text-emerald-500" />
              <span>{user.phone}</span>
            </div>
          )}

          {/* QR code toggle button */}
          <button
            onClick={() => setShowQr(s => !s)}
            className={`mt-4 px-4 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 transition-colors ${
              dark ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>{showQr ? "Hide QR Code" : "Show My QR Code"}</span>
          </button>

          {showQr && (
            <div className="mt-4 p-4 rounded-2xl bg-white shadow-md flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
              <QRCodeSVG value={`chatme://user/${user.id || user.email}`} size={140} />
              <span className="text-[10px] text-slate-500 font-semibold mt-2.5">Scan to chat with me on ChatMe</span>
            </div>
          )}
        </div>

        {/* Action Menu List */}
        <div className={`rounded-3xl p-2 shadow-sm border flex flex-col divide-y ${
          dark ? "bg-slate-900/80 border-slate-800 divide-slate-800" : "bg-white border-slate-100 divide-slate-100"
        }`}>
          <button
            onClick={goEdit}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left text-sm font-semibold rounded-2xl transition-colors ${
              dark ? "hover:bg-slate-800/60 text-slate-200" : "hover:bg-slate-50 text-slate-800"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">Edit Profile</div>
              <div className="text-xs text-slate-400 font-normal">Change name, photo, bio, and phone</div>
            </div>
            <ChevronRight size={16} className="text-slate-400 shrink-0" />
          </button>

          <button
            onClick={goSettings}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left text-sm font-semibold rounded-2xl transition-colors ${
              dark ? "hover:bg-slate-800/60 text-slate-200" : "hover:bg-slate-50 text-slate-800"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center shrink-0">
              <SettingsIcon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">Settings</div>
              <div className="text-xs text-slate-400 font-normal">Wallpaper, backup, restore & dark mode</div>
            </div>
            <ChevronRight size={16} className="text-slate-400 shrink-0" />
          </button>

          <button
            onClick={goPrivacy || goSettings}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left text-sm font-semibold rounded-2xl transition-colors ${
              dark ? "hover:bg-slate-800/60 text-slate-200" : "hover:bg-slate-50 text-slate-800"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0">
              <Shield size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">Privacy</div>
              <div className="text-xs text-slate-400 font-normal">Online status, last seen & read receipts</div>
            </div>
            <ChevronRight size={16} className="text-slate-400 shrink-0" />
          </button>

          <button
            onClick={goNotifications || goSettings}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left text-sm font-semibold rounded-2xl transition-colors ${
              dark ? "hover:bg-slate-800/60 text-slate-200" : "hover:bg-slate-50 text-slate-800"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <Bell size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">Notifications</div>
              <div className="text-xs text-slate-400 font-normal">Sounds, previews & alerts</div>
            </div>
            <ChevronRight size={16} className="text-slate-400 shrink-0" />
          </button>

          <button
            onClick={goHelpAndSupport || goSettings}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left text-sm font-semibold rounded-2xl transition-colors ${
              dark ? "hover:bg-slate-800/60 text-slate-200" : "hover:bg-slate-50 text-slate-800"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
              <HelpCircle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">Help & Support</div>
              <div className="text-xs text-slate-400 font-normal">FAQ, live agent chat & contact</div>
            </div>
            <ChevronRight size={16} className="text-slate-400 shrink-0" />
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left text-sm font-semibold rounded-2xl text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
              <LogOut size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">Logout</div>
              <div className="text-xs text-red-400 font-normal">Sign out of ChatMe on this device</div>
            </div>
          </button>
        </div>

        {/* Brand Footer */}
        <div className="flex flex-col items-center justify-center gap-1.5 pt-4 pb-2 opacity-80">
          <Logo size={28} rounded="rounded-lg" shadow="shadow-none" />
          <span className="text-xs font-bold text-slate-400">ChatMe • v1.0.0</span>
        </div>
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
/*  Wallpaper Screen                                                  */
/* ------------------------------------------------------------------ */

function WallpaperScreen({ dark, wallpaper, setWallpaper, onBack, showToast }: any) {
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressWallpaperImage(file);
      setPendingImage(compressedDataUrl);
      setIsPreviewModalOpen(true);
    } catch (err) {
      if (showToast) showToast("Failed to process selected image");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const applyPendingImage = () => {
    if (pendingImage) {
      setWallpaper(pendingImage);
      setIsPreviewModalOpen(false);
      setPendingImage(null);
      if (showToast) showToast("Chat wallpaper updated!");
    }
  };

  const selectPreset = (key: string) => {
    setWallpaper(key);
    if (showToast) showToast(`Wallpaper set to ${BUILTIN_WALLPAPERS[key]?.name || key}`);
  };

  const isCustom = wallpaper && (wallpaper.startsWith("data:") || wallpaper.startsWith("http://") || wallpaper.startsWith("https://") || wallpaper.startsWith("blob:"));

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      <ScreenHeader title="Chat Wallpaper" onBack={onBack} dark={dark} />

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="p-4 flex flex-col gap-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
          Wallpaper Preview
        </div>

        <div
          className={`relative h-52 rounded-2xl overflow-hidden border shadow-inner flex flex-col justify-end p-3 ${
            !isCustom ? (BUILTIN_WALLPAPERS[wallpaper]?.class || BUILTIN_WALLPAPERS.default.class) : ""
          }`}
          style={isCustom ? {
            backgroundImage: `url(${wallpaper})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          } : undefined}
        >
          {isCustom && <div className="absolute inset-0 bg-black/30 pointer-events-none" />}

          <div className="relative z-10 flex flex-col gap-2">
            <div className="self-start max-w-[80%] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-1.5 rounded-xl rounded-bl-sm text-xs shadow">
              Hey! This is a preview of your chat wallpaper.
            </div>
            <div className="self-end max-w-[80%] bg-green-500 text-white px-3 py-1.5 rounded-xl rounded-br-sm text-xs shadow">
              Looks great & readable!
            </div>
          </div>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3.5 px-4 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition"
        >
          <ImageIcon size={20} />
          <span>Choose from Photos / Gallery</span>
        </button>

        <div className="mt-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1 mb-2">
            Preset Wallpapers
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.keys(BUILTIN_WALLPAPERS).map((key) => {
              const item = BUILTIN_WALLPAPERS[key];
              const isSelected = wallpaper === key;
              return (
                <button
                  key={key}
                  onClick={() => selectPreset(key)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left ${
                    isSelected
                      ? "border-green-500 bg-green-500/10 font-bold"
                      : dark ? "border-gray-800 bg-gray-800/60 hover:bg-gray-800" : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg border shadow-inner shrink-0 ${item.previewBg}`} />
                  <span className="text-xs flex-1 truncate">{item.name}</span>
                  {isSelected && <Check size={16} className="text-green-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            setWallpaper("default");
            if (showToast) showToast("Reset wallpaper to default");
          }}
          className={`w-full py-3 border rounded-xl text-xs font-medium transition mt-1 ${
            dark ? "border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-100"
          }`}
        >
          Reset to Default
        </button>
      </div>

      {isPreviewModalOpen && pendingImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fadeIn">
          <div className={`w-full max-w-xs rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xl ${dark ? "bg-gray-900 border border-gray-800 text-white" : "bg-white text-gray-900"}`}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Preview Wallpaper</h3>
              <button onClick={() => { setIsPreviewModalOpen(false); setPendingImage(null); }}>
                <X size={18} />
              </button>
            </div>

            <div
              className="relative h-60 rounded-xl overflow-hidden border shadow-inner flex flex-col justify-end p-3"
              style={{
                backgroundImage: `url(${pendingImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
            >
              <div className="absolute inset-0 bg-black/30 pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-2">
                <div className="self-start bg-white text-gray-800 px-3 py-1.5 rounded-xl text-xs shadow">
                  Sample incoming message
                </div>
                <div className="self-end bg-green-500 text-white px-3 py-1.5 rounded-xl text-xs shadow">
                  Looks perfect on chat!
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setIsPreviewModalOpen(false); setPendingImage(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${
                  dark ? "border-gray-700 hover:bg-gray-800 text-gray-300" : "border-gray-300 hover:bg-gray-100 text-gray-700"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={applyPendingImage}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition shadow"
              >
                Apply Wallpaper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Screen                                                    */
/* ------------------------------------------------------------------ */

function Toggle({ on, onChange }: any) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${on ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"}`}
    >
      <span className="w-5 h-5 rounded-full bg-white shadow" />
    </button>
  );
}

function SettingsScreen({ dark, setDark, notifications, setNotifications, onBack, goChangePw, goInfo, goPrivacy, onLogout, wallpaper, goWallpaper, goChats, goBackupRestore, goLiveSupport, goHelpAndSupport }: any) {
  const wpLabel = wallpaper?.startsWith("data:")
    ? "Custom Photo"
    : (BUILTIN_WALLPAPERS[wallpaper]?.name || "Default");

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

        {/* Live Support Direct Banner */}
        <button
          onClick={() => (goLiveSupport ? goLiveSupport() : goHelpAndSupport?.())}
          className={`flex items-center justify-between rounded-xl px-4 py-3.5 border transition ${
            dark
              ? "bg-gradient-to-r from-emerald-950/70 to-gray-800 border-emerald-800/60 hover:bg-emerald-900/40"
              : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:bg-emerald-100/70"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <Headphones size={18} />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-bold block ${dark ? "text-white" : "text-emerald-950"}`}>Live Support</span>
                <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase">Online</span>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Chat with support agents 24/7</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-emerald-500" />
        </button>
        
        {/* Chats Settings (Wallpaper, Backup & Restore) */}
        <button
          onClick={() => (goChats ? goChats() : goWallpaper?.())}
          className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${dark ? "bg-gray-800 hover:bg-gray-700/60" : "bg-gray-50 hover:bg-gray-100"}`}
        >
          <div className="flex items-center gap-3">
            <MessageSquare size={18} className="text-emerald-500" />
            <div className="text-left">
              <span className={`text-sm font-medium block ${dark ? "text-gray-100" : "text-gray-800"}`}>Chats</span>
              <span className="text-[11px] text-gray-400">Theme, wallpaper, backup & restore</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>

        {/* Dedicated Backup & Restore Shortcut */}
        <button
          onClick={() => (goBackupRestore ? goBackupRestore() : goChats?.())}
          className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${dark ? "bg-gray-800 hover:bg-gray-700/60" : "bg-gray-50 hover:bg-gray-100"}`}
        >
          <div className="flex items-center gap-3">
            <CloudUpload size={18} className="text-teal-500" />
            <div className="text-left">
              <span className={`text-sm font-medium block ${dark ? "text-gray-100" : "text-gray-800"}`}>Backup & Restore</span>
              <span className="text-[11px] text-gray-400">Back up and restore your ChatMe data</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>

        <button
          onClick={() => goWallpaper && goWallpaper()}
          className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${dark ? "bg-gray-800 hover:bg-gray-700/60" : "bg-gray-50 hover:bg-gray-100"}`}
        >
          <div className="flex items-center gap-3">
            <ImageIcon size={18} className="text-purple-500" />
            <span className={`text-sm font-medium ${dark ? "text-gray-100" : "text-gray-800"}`}>Chat Wallpaper</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{wpLabel}</span>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </button>

        <div className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-blue-500" />
            <span className={`text-sm font-medium ${dark ? "text-gray-100" : "text-gray-800"}`}>Notifications</span>
          </div>
          <Toggle on={notifications} onChange={setNotifications} />
        </div>

        {[
          { icon: Shield, label: "Privacy", action: () => (goPrivacy ? goPrivacy() : goInfo("privacy")) },
          { icon: KeyRound, label: "Change Password", action: goChangePw },
          { icon: HelpCircle, label: "Help & Support", action: () => (goHelpAndSupport ? goHelpAndSupport() : goInfo("help")) },
          { icon: Info, label: "About", action: () => goInfo("about") },
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

        <div className="flex flex-col items-center justify-center pt-6 pb-4 gap-2">
          <Logo size={48} rounded="rounded-xl" shadow="shadow-md" className="w-12 h-12" />
          <span className={`text-xs font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>ChatMe v1.0.0</span>
        </div>
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
      {kind === "about" && (
        <div className="flex flex-col items-center pt-8 pb-2">
          <Logo size={80} dark={dark} />
          <h2 className={`text-lg font-bold mt-3 ${dark ? "text-white" : "text-gray-900"}`}>ChatMe</h2>
          <p className="text-xs text-emerald-500 font-semibold mt-0.5">CONNECT • CHAT • SHARE</p>
        </div>
      )}
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
  const [statuses, setStatuses] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("chatme_statuses");
      if (saved) {
        return filterFreshStatuses(JSON.parse(saved));
      }
    } catch (e) {}
    return [];
  });
  const [onlinePresenceSet, setOnlinePresenceSet] = useState<Set<string>>(new Set());
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [contactsPermissionGranted, setContactsPermissionGranted] = useState<boolean>(false);
  const presenceChannelRef = useRef<any>(null);

  const saveDeviceContacts = (newContacts: DeviceContact[]) => {
    setDeviceContacts(newContacts);
    setContactsPermissionGranted(true);
    if (currentUser?.id) {
      try {
        localStorage.setItem(`chatme_device_contacts_${currentUser.id}`, JSON.stringify(newContacts));
        localStorage.setItem(`chatme_contacts_perm_${currentUser.id}`, "true");
      } catch (e) {}
    }
  };

  const handleAccessDeviceContacts = async () => {
    const isTopFrame = typeof window !== 'undefined' && window.self === window.top;
    const hasWebContacts = typeof navigator !== 'undefined' && 'contacts' in navigator && typeof (navigator.contacts as any)?.select === 'function';

    if (hasWebContacts && isTopFrame) {
      try {
        const props = ['name', 'tel', 'email'];
        const opts = { multiple: true };
        const imported = await (navigator.contacts as any).select(props, opts);
        if (imported && imported.length > 0) {
          const parsed: DeviceContact[] = imported.map((c: any, index: number) => ({
            id: 'dev_contact_' + Date.now() + '_' + index,
            name: c.name?.[0] || 'Device Contact',
            phone: c.tel?.[0] || '',
            email: c.email?.[0] || ''
          })).filter(c => c.phone.trim().length > 0);

          const merged = [...deviceContacts];
          parsed.forEach(p => {
            if (!merged.some(m => isPhoneMatch(m.phone, p.phone))) {
              merged.push(p);
            }
          });

          saveDeviceContacts(merged);
          showToast(`Synced ${parsed.length} contacts from your device!`);
          return true;
        }
      } catch (e: any) {
        const errMsg = e?.message || String(e);
        if (errMsg.includes('top frame') || errMsg.includes('SecurityError')) {
          showToast("Device contact sync is available in the native app or top-level browser tab.");
        } else {
          console.log('Contact Picker cancelled or dismissed');
        }
      }
    } else if (!isTopFrame) {
      showToast("Device contact sync is available in the native ChatMe app or top-level browser tab. You can add contacts manually.");
    }

    setContactsPermissionGranted(true);
    if (currentUser?.id) {
      try {
        localStorage.setItem(`chatme_contacts_perm_${currentUser.id}`, "true");
      } catch (e) {}
    }
    return false;
  };

  const handleAddManualContact = (name: string, phone: string, email?: string) => {
    if (!name.trim() || !phone.trim()) {
      showToast("Name and phone number are required");
      return;
    }
    const newContact: DeviceContact = {
      id: 'dev_contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || ''
    };

    const updated = [newContact, ...deviceContacts.filter(c => !isPhoneMatch(c.phone, phone))];
    saveDeviceContacts(updated);
    showToast(`Added ${name.trim()} to device contacts!`);
  };

  const handleSetWallpaper = (wp: string) => {
    setWallpaper(wp);
    if (currentUser?.id) {
      try {
        localStorage.setItem(`chatme_wallpaper_${currentUser.id}`, wp);
      } catch (e) {}
    }
  };

  const mergeAndSetUsers = async (activeUser?: any) => {
    const userMap = new Map<string, any>();

    const localUsers = getLocalRegisteredUsers();
    localUsers.forEach((u) => {
      const uid = u.id || `usr_${u.email}`;
      const emailKey = u.email ? u.email.toLowerCase() : uid;
      userMap.set(emailKey, {
        id: uid,
        fullname: u.fullname || u.full_name || "User",
        email: u.email || "",
        photo: u.photo || u.avatar_url || getDefaultAvatar(u.fullname || u.email),
        bio: u.bio || "Hey there! I am using ChatMe",
        phone: u.phone || "",
        online: u.online !== undefined ? Boolean(u.online) : false,
        last_seen: u.last_seen || null,
        lastSeenRaw: u.last_seen || null,
        lastSeen: formatLastSeen(u.last_seen)
      });
    });

    try {
      const { data: allProfiles } = await supabase.from('profiles').select('*');
      if (allProfiles && allProfiles.length > 0) {
        allProfiles.forEach((p) => {
          const uid = p.id || p.user_id;
          const emailKey = p.email ? p.email.toLowerCase() : uid;
          const existing = userMap.get(emailKey) || {};

          userMap.set(emailKey, {
            ...existing,
            id: uid || existing.id,
            fullname: p.full_name || p.fullname || p.name || existing.fullname || "User",
            email: p.email || existing.email || "",
            photo: p.avatar_url || p.photo || existing.photo || getDefaultAvatar(p.full_name || p.fullname),
            bio: p.bio || existing.bio || "Hey there! I am using ChatMe",
            phone: p.phone || existing.phone || "",
            online: p.online !== undefined ? Boolean(p.online) : (existing.online ?? false),
            last_seen: p.last_seen || existing.last_seen || null,
            lastSeenRaw: p.last_seen || existing.last_seen || null,
            lastSeen: formatLastSeen(p.last_seen || existing.last_seen)
          });
        });
      }
    } catch (e) {}

    const targetUser = activeUser || currentUser;
    if (targetUser?.email) {
      const emailKey = targetUser.email.toLowerCase();
      const existing = userMap.get(emailKey) || {};
      userMap.set(emailKey, {
        ...existing,
        ...targetUser,
        id: targetUser.id || existing.id
      });
    } else if (targetUser?.id) {
      userMap.set(targetUser.id, targetUser);
    }

    setUsers(Array.from(userMap.values()));
  };

  const loadUserData = async (authUser) => {
    try {
      let profile: any = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        profile = data;
      } catch (e) {}

      if (!profile) {
        try {
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', authUser.email)
            .single();
          if (profileByEmail) profile = profileByEmail;
        } catch (e) {}
      }

      if (!profile) {
        profile = {
          id: authUser.id,
          user_id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.fullname || authUser.email?.split('@')[0] || 'User',
          fullname: authUser.user_metadata?.full_name || authUser.user_metadata?.fullname || authUser.email?.split('@')[0] || 'User',
          email: authUser.email,
          avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.photo || getDefaultAvatar(authUser.email),
          photo: authUser.user_metadata?.avatar_url || authUser.user_metadata?.photo || getDefaultAvatar(authUser.email),
          bio: "Hey there! I am using ChatMe",
          phone: "",
          online: true,
          created_at: new Date().toISOString()
        };
        try {
          await supabase.from('profiles').upsert(profile);
        } catch (e) {}
      }

      const formattedUser = {
        id: profile.id || authUser.id,
        fullname: profile.full_name || profile.fullname || authUser.user_metadata?.full_name || authUser.user_metadata?.fullname || "User",
        email: profile.email || authUser.email,
        photo: profile.avatar_url || profile.photo || authUser.user_metadata?.avatar_url || authUser.user_metadata?.photo || getDefaultAvatar(profile.full_name || authUser.email),
        bio: profile.bio || "",
        phone: profile.phone || "",
        online: true,
        created_at: profile.created_at || new Date().toISOString()
      };

      setCurrentUser(formattedUser);
      saveLocalRegisteredUser(formattedUser);
      try {
        localStorage.setItem("chatme_current_user", JSON.stringify(formattedUser));
      } catch (e) {}

      try {
        const savedWp = localStorage.getItem(`chatme_wallpaper_${formattedUser.id}`);
        if (savedWp) {
          setWallpaper(savedWp);
        }
        const savedContacts = localStorage.getItem(`chatme_device_contacts_${formattedUser.id}`);
        if (savedContacts) {
          setDeviceContacts(JSON.parse(savedContacts));
        }
        const savedPerm = localStorage.getItem(`chatme_contacts_perm_${formattedUser.id}`);
        setContactsPermissionGranted(savedPerm === "true" || (savedContacts && JSON.parse(savedContacts).length > 0));
      } catch (e) {}

      const nowIso = new Date().toISOString();
      try {
        await supabase
          .from('profiles')
          .update({ online: true, last_seen: nowIso })
          .eq('id', profile.id || authUser.id);
      } catch (e) {}

      await mergeAndSetUsers(formattedUser);

      await cleanupExpiredStatuses();
      try {
        const { data: statusData } = await supabase.from('status_posts').select('*');
        if (statusData && statusData.length > 0) {
          setStatuses(filterFreshStatuses(statusData));
        } else {
          setStatuses([]);
        }
      } catch (e) {}

      try {
        checkAndRunAutoBackup(formattedUser, messagesData, {
          wallpaper: wallpaper || 'default',
          notifications,
          deviceContacts: deviceContacts || []
        });
      } catch (e) {}

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
        try {
          const savedCurrent = localStorage.getItem("chatme_current_user");
          if (savedCurrent) {
            const parsed = JSON.parse(savedCurrent);
            setCurrentUser(parsed);
            mergeAndSetUsers(parsed);
            setScreen("home");
            return;
          }
        } catch (e) {}
        setScreen("signin");
      }
    }).catch(() => {
      try {
        const savedCurrent = localStorage.getItem("chatme_current_user");
        if (savedCurrent) {
          const parsed = JSON.parse(savedCurrent);
          setCurrentUser(parsed);
          mergeAndSetUsers(parsed);
          setScreen("home");
          return;
        }
      } catch (e) {}
      setScreen("signin");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData(session.user);
      } else {
        try {
          const savedCurrent = localStorage.getItem("chatme_current_user");
          if (!savedCurrent) {
            setCurrentUser(null);
            setScreen("signin");
          }
        } catch (e) {}
      }
    });

    return () => {
      try {
        subscription?.unsubscribe?.();
      } catch (e) {}
    };
  }, []);

  // Redirect authenticated users away from auth screens (SignIn/SignUp) to the home screen
  useEffect(() => {
    if (screen === "signin" || screen === "signup") {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          loadUserData(session.user);
          setScreen("home");
        } else if (currentUser) {
          setScreen("home");
        }
      }).catch(() => {});
    }
  }, [screen, currentUser]);

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
              photo: p.photo || p.avatar_url || getDefaultAvatar(p.full_name || p.fullname),
              bio: p.bio || "Hey there! I am using ChatMe",
              phone: p.phone || "",
              online: p.online !== undefined ? Boolean(p.online) : false,
              last_seen: p.last_seen || null,
              lastSeenRaw: p.last_seen || null,
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

  useEffect(() => {
    const handleStatusHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#status-")) {
        const sid = hash.replace("#status-", "");
        if (sid) {
          setScreen("statusView:" + sid);
        }
      }
    };
    handleStatusHash();
    window.addEventListener("hashchange", handleStatusHash);
    return () => window.removeEventListener("hashchange", handleStatusHash);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      cleanupExpiredStatuses();
      setStatuses(prev => filterFreshStatuses(prev));
    }, 60000);

    try {
      const statusChannel = supabase
        .channel('public:status_posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'status_posts' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newStatus = payload.new as any;
            setStatuses(prev => {
              if (prev.some(s => s.id === newStatus.id)) return prev;
              return filterFreshStatuses([newStatus, ...prev]);
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setStatuses(prev => prev.filter(s => s.id !== deletedId));
          }
        })
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(statusChannel);
      };
    } catch (e) {
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    const currentUserId = String(currentUser.id);

    const presenceChannel = supabase.channel('online-presence', {
      config: { presence: { key: currentUserId } }
    });

    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set<string>();
        Object.keys(state).forEach(key => {
          onlineIds.add(key);
        });
        setOnlinePresenceSet(onlineIds);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlinePresenceSet(prev => new Set(prev).add(key));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlinePresenceSet(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: currentUserId,
            online_at: new Date().toISOString()
          });
        }
      });

    const heartbeatInterval = setInterval(async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        const nowIso = new Date().toISOString();
        await supabase
          .from('profiles')
          .update({ online: true, last_seen: nowIso })
          .eq('id', currentUser.id);

        if (presenceChannelRef.current) {
          presenceChannelRef.current.track({
            user_id: currentUserId,
            online_at: nowIso
          });
        }
      }
    }, 15000);

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        const nowIso = new Date().toISOString();
        await supabase
          .from('profiles')
          .update({ online: false, last_seen: nowIso })
          .eq('id', currentUser.id);

        if (presenceChannelRef.current) {
          presenceChannelRef.current.untrack();
        }
      } else if (document.visibilityState === 'visible') {
        const nowIso = new Date().toISOString();
        await supabase
          .from('profiles')
          .update({ online: true, last_seen: nowIso })
          .eq('id', currentUser.id);

        if (presenceChannelRef.current) {
          presenceChannelRef.current.track({
            user_id: currentUserId,
            online_at: nowIso
          });
        }
      }
    };

    const handleOffline = async () => {
      const nowIso = new Date().toISOString();
      await supabase
        .from('profiles')
        .update({ online: false, last_seen: nowIso })
        .eq('id', currentUser.id);

      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack();
      }
    };

    const handleOnline = async () => {
      const nowIso = new Date().toISOString();
      await supabase
        .from('profiles')
        .update({ online: true, last_seen: nowIso })
        .eq('id', currentUser.id);

      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({
          user_id: currentUserId,
          online_at: nowIso
        });
      }
    };

    const handleUnload = () => {
      const nowIso = new Date().toISOString();
      supabase
        .from('profiles')
        .update({ online: false, last_seen: nowIso })
        .eq('id', currentUser.id);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('beforeunload', handleUnload);

      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack();
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [currentUser?.id]);

  const handleAddStatus = async (newStatus: any) => {
    const statusWithId = {
      ...newStatus,
      id: newStatus.id || Date.now(),
      user_id: newStatus.user_id || currentUser?.id,
      user_name: newStatus.user_name || currentUser?.fullname || "Me",
      user_photo: newStatus.user_photo || currentUser?.photo || getDefaultAvatar(currentUser?.fullname)
    };

    setStatuses(prev => {
      const filtered = prev.filter(s => String(s.id) !== String(statusWithId.id));
      const updated = [statusWithId, ...filtered];
      try {
        localStorage.setItem("chatme_statuses", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    showToast("Status posted successfully!");

    // If the status was already persisted to Supabase status_posts (e.g. by StatusEditor), do not duplicate insert
    if (newStatus.alreadyPersisted) {
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;
      if (authUser) {
        await supabase.from('status_posts').insert({
          user_id: authUser.id,
          media_type: statusWithId.media_type || (statusWithId.bg_color ? 'text' : 'image'),
          media_url: statusWithId.media_url || null,
          caption: statusWithId.caption || "",
          created_at: statusWithId.created_at || new Date().toISOString(),
          expires_at: statusWithId.expires_at || new Date(Date.now() + 86400000).toISOString()
        });
      }
    } catch (e) {
      console.log("Supabase insert status notice", e);
    }
  };

  const handleDeleteStatus = async (id: any) => {
    setStatuses(prev => {
      const updated = prev.filter(s => String(s.id) !== String(id));
      try {
        localStorage.setItem("chatme_statuses", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
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

  const handleSignUp = async ({ fullname, username, email, password, photo, bio, phone }: any) => {
    // Check if a user session is already active in Supabase before proceeding with sign up
    try {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      if (activeSession?.user) {
        showToast("You are already signed in.");
        await loadUserData(activeSession.user);
        setScreen("home");
        return;
      }
    } catch (e) {}

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (fullname || "").trim();
    const cleanUsername = (username || cleanEmail.split('@')[0] || 'user').trim();
    const avatarUrl = photo || getDefaultAvatar(cleanName);

    if (!cleanName) {
      showToast("Please enter your full name.");
      return;
    }
    if (!cleanEmail) {
      showToast("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      showToast("Password must be at least 6 characters long.");
      return;
    }

    // Check if an account already exists locally with this email
    const localUsers = getLocalRegisteredUsers();
    const existingLocal = localUsers.find(
      (u: any) => u.email?.toLowerCase() === cleanEmail
    );

    // Ensure any lingering Supabase auth session is cleared to prevent session state collision
    try {
      await supabase.auth.signOut();
    } catch (e) {}

    let supabaseSignUpSuccess = false;
    let authUser: any = null;
    let authSession: any = null;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            fullname: cleanName,
            full_name: cleanName,
            avatar_url: avatarUrl,
            phone: phone || ""
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        const isNetworkOrFetchError =
          error.name === "AuthRetryableFetchError" ||
          msg.includes("failed to fetch") ||
          error.status === 0 ||
          msg.includes("network") ||
          msg.includes("fetch");

        if (isNetworkOrFetchError) {
          console.warn("Supabase auth service unreachable (offline or network error); proceeding with local account registration.");
        } else if (
          msg.includes("already registered") ||
          msg.includes("already exists") ||
          (error.status === 400 && msg.includes("user"))
        ) {
          const err: any = new Error("An account with this email address already exists. Please sign in.");
          err.status = 400;
          throw err;
        } else {
          throw error;
        }
      } else if (data?.user) {
        if (data.user.identities && data.user.identities.length === 0) {
          const existingUserError: any = new Error("An account with this email address already exists. Please sign in.");
          existingUserError.status = 400;
          throw existingUserError;
        }
        supabaseSignUpSuccess = true;
        authUser = data.user;
        authSession = data.session;
      }
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      const isNetworkOrFetchError =
        err?.name === "AuthRetryableFetchError" ||
        msg.includes("failed to fetch") ||
        err?.status === 0 ||
        msg.includes("network") ||
        msg.includes("load failed") ||
        err instanceof TypeError;

      if (isNetworkOrFetchError) {
        console.warn("Supabase auth network unreachable; proceeding with local account registration.");
      } else {
        throw err;
      }
    }

    // If Supabase remote signup succeeded:
    if (supabaseSignUpSuccess && authUser) {
      if (authSession) {
        await loadUserData(authUser);
        setScreen("home");
        setActiveTab("chats");
        showToast("Account created successfully!");
      } else {
        showToast("Registration successful! Please check your email to confirm your account before signing in.");
        setScreen("signin");
      }
      return;
    }

    // Local / Offline fallback registration
    if (existingLocal) {
      const err: any = new Error("An account with this email address already exists. Please sign in.");
      err.status = 400;
      throw err;
    }

    const newLocalUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      fullname: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      password: password,
      photo: avatarUrl,
      avatar_url: avatarUrl,
      bio: bio || "Hey there! I am using ChatMe",
      phone: phone || "",
      online: true,
      created_at: new Date().toISOString()
    };

    saveLocalRegisteredUser(newLocalUser);
    setCurrentUser(newLocalUser);
    try {
      localStorage.setItem("chatme_current_user", JSON.stringify(newLocalUser));
    } catch (e) {}

    await mergeAndSetUsers(newLocalUser);
    setScreen("home");
    setActiveTab("chats");
    showToast("Account created successfully!");
  };

  const handleSignIn = async ({ email, password }: any) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          showToast("Please confirm your email address before signing in.");
          return;
        }
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          showToast("Invalid email or password.");
          return;
        }
      } else if (data?.user) {
        await loadUserData(data.user);
        showToast("Signed in successfully!");
        return;
      }
    } catch (e: any) {}

    const localUsers = getLocalRegisteredUsers();
    const match = localUsers.find(
      (u: any) => u.email?.toLowerCase() === cleanEmail && (!u.password || u.password === password)
    );

    if (match) {
      const formattedUser = {
        id: match.id || `usr_${match.email}`,
        fullname: match.fullname || match.full_name || "User",
        email: match.email,
        photo: match.photo || match.avatar_url || getDefaultAvatar(match.fullname || match.email),
        bio: match.bio || "Hey there! I am using ChatMe",
        phone: match.phone || "",
        online: true,
        created_at: match.created_at || new Date().toISOString()
      };
      setCurrentUser(formattedUser);
      try {
        localStorage.setItem("chatme_current_user", JSON.stringify(formattedUser));
      } catch (e) {}
      await mergeAndSetUsers(formattedUser);
      setScreen("home");
      setActiveTab("chats");
      showToast("Signed in successfully!");
    } else {
      showToast("Invalid email or password.");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    try {
      localStorage.removeItem("chatme_current_user");
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

  const handleSend = async (text: string) => {
    if (!currentUser || !activeChatId) return;
    updateLastSeen();
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const localId = Date.now();
    const newMsg = { id: localId, senderId: currentUser.id, text, timestamp, status: "sent", reaction: null };

    setMessagesData((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg],
    }));

    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: activeChatId,
        message: text,
        created_at: now.toISOString(),
        read: false
      }).select().single();

      if (data && !error) {
        setMessagesData((prev) => ({
          ...prev,
          [activeChatId]: (prev[activeChatId] || []).map((m) =>
            m.id === localId ? { ...m, id: data.id, status: "delivered" } : m
          ),
        }));
      } else {
        setTimeout(() => {
          setMessagesData((prev) => ({
            ...prev,
            [activeChatId]: (prev[activeChatId] || []).map((m) =>
              m.id === localId ? { ...m, status: "delivered" } : m
            ),
          }));
        }, 500);
      }
    } catch (e) {
      console.log("Supabase send message error", e);
    }
  };

  const handleUpdateProfile = async (updates: any) => {
    if (!currentUser?.id) return;
    try {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

      await supabase.from('profiles').upsert({
        id: currentUser.id,
        user_id: currentUser.id,
        full_name: updates.fullname || currentUser.fullname,
        fullname: updates.fullname || currentUser.fullname,
        bio: updates.bio ?? currentUser.bio,
        phone: updates.phone ?? currentUser.phone,
        avatar_url: updates.photo ?? currentUser.photo,
        photo: updates.photo ?? currentUser.photo,
        updated_at: new Date().toISOString()
      });

      showToast("Profile updated successfully!");
      setScreen("profile");
    } catch (e: any) {
      showToast(e.message || "Failed to update profile");
    }
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
        onlinePresenceSet={onlinePresenceSet}
        onCall={handleCall}
        showToast={showToast}
      />
    );
  } else if (screen === "contactsSelection") {
    body = <ContactsSelectionScreen users={users} currentUser={currentUser} onNext={(s) => { setSelectedContactsForGroup(s); setScreen("groupCreation"); }} onBack={() => { setEditingGroup(null); setScreen("home"); }} dark={dk} />;
  } else if (screen === "wallpaper") {
    body = (
      <WallpaperScreen
        dark={dk}
        wallpaper={wallpaper}
        setWallpaper={handleSetWallpaper}
        onBack={() => setScreen("settings")}
        showToast={showToast}
      />
    );
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
        onSave={handleUpdateProfile}
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
        goInfo={(kind) => (kind === "privacy" ? setScreen("privacy") : setScreen("info:" + kind))}
        goPrivacy={() => setScreen("privacy")}
        onLogout={handleLogout}
        wallpaper={wallpaper}
        setWallpaper={handleSetWallpaper}
        goWallpaper={() => setScreen("wallpaper")}
        goChats={() => setScreen("chatsSettings")}
        goBackupRestore={() => setScreen("backupRestore")}
        goLiveSupport={() => setScreen("liveSupport")}
        goHelpAndSupport={() => setScreen("helpAndSupport")}
      />
    );
  } else if (screen === "helpAndSupport") {
    body = (
      <HelpAndSupportScreen
        dark={dk}
        onBack={() => setScreen("settings")}
        onOpenLiveSupport={() => setScreen("liveSupport")}
        onOpenAgentPortal={() => setScreen("supportAgent")}
        onGoPrivacy={() => setScreen("privacy")}
        showToast={showToast}
      />
    );
  } else if (screen === "liveSupport") {
    body = (
      <LiveSupportScreen
        currentUser={currentUser}
        dark={dk}
        onBack={() => setScreen("helpAndSupport")}
        onOpenAgentPortal={() => setScreen("supportAgent")}
        showToast={showToast}
      />
    );
  } else if (screen === "supportAgent") {
    body = (
      <SupportAgentScreen
        currentUser={currentUser}
        dark={dk}
        onBack={() => setScreen("helpAndSupport")}
        showToast={showToast}
      />
    );
  } else if (screen === "chatsSettings") {
    const wpLabel = wallpaper?.startsWith("data:")
      ? "Custom Photo"
      : (BUILTIN_WALLPAPERS[wallpaper]?.name || "Default");
    body = (
      <ChatsSettingsScreen
        dark={dk}
        onBack={() => setScreen("settings")}
        goWallpaper={() => setScreen("wallpaper")}
        goBackupRestore={() => setScreen("backupRestore")}
        wallpaperLabel={wpLabel}
        currentUser={currentUser}
      />
    );
  } else if (screen === "backupRestore") {
    body = (
      <BackupRestoreScreen
        currentUser={currentUser}
        messagesData={messagesData}
        localPreferences={{
          wallpaper,
          notifications,
          deviceContacts,
          calls,
          statuses
        }}
        dark={dk}
        onBack={() => setScreen("chatsSettings")}
        showToast={showToast}
        onRestoreComplete={(restored) => {
          if (restored.wallpaper) {
            setWallpaper(restored.wallpaper);
          }
          if (restored.contacts) {
            setDeviceContacts(restored.contacts);
          }
          if (currentUser?.id) {
            if (activeChatId) {
              fetchMessagesForUser(activeChatId);
            }
            loadUserData(currentUser);
          }
        }}
      />
    );
  } else if (screen === "privacy") {
    body = (
      <PrivacyScreen
        currentUser={currentUser}
        users={users}
        onBack={() => setScreen("settings")}
        dark={dk}
        showToast={showToast}
        onUpdateUser={(updated) => {
          setCurrentUser(updated);
          setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        }}
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
    body = (
      <StatusViewScreen
        status={targetStatus}
        statuses={statuses}
        currentUser={currentUser}
        onBack={() => { setScreen("home"); setActiveTab("updates"); }}
        dark={dk}
        onDelete={handleDeleteStatus}
        onReply={handleReplyStatus}
        showToast={showToast}
        onIndexChange={(newIdx: number, newStatus: any) => {
          if (newStatus?.id) {
            window.history.replaceState(null, "", `#status-${newStatus.id}`);
          }
        }}
      />
    );
  } else if (currentUser) {
    // main tabbed area
    let tabBody = null;
    if (activeTab === "chats")
      tabBody = (
        <HomeScreen
          users={users}
          currentUser={currentUser}
          messagesData={messagesData}
          unread={unread}
          openChat={openChat}
          dark={dk}
          onlinePresenceSet={onlinePresenceSet}
          calls={calls}
          onCall={handleCall}
          onStartChat={() => { setActiveTab("contacts"); setScreen("home"); }}
          onNewGroup={() => setScreen("contactsSelection")}
          onAddContact={() => { setActiveTab("add-contact"); setScreen("add-contact"); }}
          onAddStatus={() => { setActiveTab("updates"); setScreen("home"); }}
          onOpenAI={() => { setActiveTab("ai"); setScreen("home"); }}
          onOpenSupport={() => setScreen("liveSupport")}
          onOpenSettings={() => setScreen("settings")}
          onToggleDark={() => setDark((d: boolean) => !d)}
          showToast={showToast}
        />
      );
    else if (activeTab === "updates")
      tabBody = (
        <UpdatesScreen
          dark={dk}
          currentUser={currentUser}
          statuses={statuses}
          onAddStatus={handleAddStatus}
          onViewStatus={(s: any, list?: any[]) => {
            if (list && Array.isArray(list) && list.length > 0) {
              setStatuses(list);
            }
            setScreen("statusView:" + s.id);
          }}
          onDeleteStatus={handleDeleteStatus}
          onUpdateStatuses={setStatuses}
        />
      );
    else if (activeTab === "add-contact")
      tabBody = (
        <AddContactScreen
          currentUser={currentUser}
          users={users}
          openChat={openChat}
          onBack={() => { setActiveTab("chats"); setScreen("home"); }}
          dark={dk}
          showToast={showToast}
        />
      );
    else if (activeTab === "contacts")
      tabBody = (
        <ContactsScreen
          users={users}
          currentUser={currentUser}
          deviceContacts={deviceContacts}
          contactsPermissionGranted={contactsPermissionGranted}
          onRequestPermission={handleAccessDeviceContacts}
          onAddManualContact={handleAddManualContact}
          openChat={openChat}
          dark={dk}
          setScreen={setScreen}
          setEditingGroup={setEditingGroup}
          onlinePresenceSet={onlinePresenceSet}
          showToast={showToast}
        />
      );
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
          goPrivacy={() => setScreen("privacy")}
          goNotifications={() => setScreen("settings")}
          goHelpAndSupport={() => setScreen("helpAndSupport")}
          onLogout={handleLogout}
          dark={dk}
        />
      );
    body = (
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0">{tabBody}</div>
      </div>
    );
  }

  const isAuthScreen = screen === "splash" || screen === "signin" || screen === "signup" || screen === "reset";
  const isFullView = screen.startsWith("statusView:");
  const isSubScreen = screen === "chat" || screen === "editProfile" || screen === "wallpaper" || screen === "groupCreation" || screen === "contactsSelection" || screen === "changePassword";
  const showNav = Boolean(currentUser) && !isAuthScreen && !isFullView && !isSubScreen;

  return (
    <div
      className={`w-full h-[100dvh] min-h-[100dvh] flex flex-col items-center justify-center bg-[#070B14] text-white overflow-hidden relative ${
        dk ? "dark" : ""
      }`}
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      <Toast message={toast} />
      <div className="w-full lg:max-w-md xl:max-w-lg h-full flex flex-col relative bg-white dark:bg-[#0B101B] text-slate-900 dark:text-white shadow-2xl overflow-hidden border-x border-slate-800/80">
        <div className={`flex-1 w-full h-full min-h-0 overflow-y-auto relative ${showNav ? "pb-16" : ""}`}>
          {body}
        </div>
        {showNav && (
          <BottomNav
            active={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              if (key === "add-contact") {
                setScreen("add-contact");
              } else {
                setScreen("home");
              }
            }}
            dark={dk}
          />
        )}
      </div>
    </div>
  );
}
