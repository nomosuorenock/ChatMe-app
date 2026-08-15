import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Clock,
  Check,
  ChevronRight,
  Settings,
  BookUser,
  Camera,
  Mic,
  Image as ImageIcon,
  Bell,
  MapPin,
  HelpCircle,
  X,
  RefreshCw,
  Info,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  Sliders,
  Sparkles
} from "lucide-react";
import {
  checkAllPermissions,
  requestPermission,
  openAndroidAppSettings,
  PERMISSION_DEFINITIONS,
  type PermissionType
} from "../services/permissionService";
import { supabase } from "../lib/supabase";

export interface PrivacySettings {
  lastSeen: "everyone" | "contacts" | "contacts_except" | "nobody";
  online: "everyone" | "same_as_last_seen";
  profilePhoto: "everyone" | "contacts" | "contacts_except" | "nobody";
  about: "everyone" | "contacts" | "contacts_except" | "nobody";
  status: "contacts" | "contacts_except" | "only_share_with";
  readReceipts: boolean;
  defaultDisappearingTimer: "off" | "24h" | "7d" | "90d";
  groups: "everyone" | "contacts" | "contacts_except";
  linkPreviews: boolean;
  protectIpInCalls: boolean;
  blockedUsers: string[];
}

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  lastSeen: "contacts",
  online: "same_as_last_seen",
  profilePhoto: "everyone",
  about: "everyone",
  status: "contacts",
  readReceipts: true,
  defaultDisappearingTimer: "off",
  groups: "everyone",
  linkPreviews: true,
  protectIpInCalls: false,
  blockedUsers: []
};

interface PrivacyScreenProps {
  currentUser: any;
  users: any[];
  onBack: () => void;
  dark: boolean;
  showToast?: (msg: string) => void;
  onUpdateUser?: (updated: any) => void;
}

export function PrivacyScreen({
  currentUser,
  users,
  onBack,
  dark,
  showToast,
  onUpdateUser
}: PrivacyScreenProps) {
  // Privacy options state
  const [privacy, setPrivacy] = useState<PrivacySettings>(() => {
    const saved = localStorage.getItem(`chatme_privacy_${currentUser?.id || "local"}`);
    if (saved) {
      try {
        return { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_PRIVACY_SETTINGS;
      }
    }
    return DEFAULT_PRIVACY_SETTINGS;
  });

  // Active submodal / subscreen
  const [subView, setSubView] = useState<
    | null
    | "lastSeen"
    | "profilePhoto"
    | "about"
    | "status"
    | "groups"
    | "disappearing"
    | "blocked"
    | "checkup"
    | "permissionSettingsGuide"
  >(null);

  // Permission statuses
  const [permissions, setPermissions] = useState<Record<PermissionType, "granted" | "denied" | "prompt">>({
    contacts: "prompt",
    camera: "prompt",
    microphone: "prompt",
    photos: "granted",
    notifications: "prompt",
    location: "prompt"
  });

  const [loadingPerm, setLoadingPerm] = useState<string | null>(null);
  const [selectedPermForDetail, setSelectedPermForDetail] = useState<PermissionType | null>(null);

  // Refresh permissions on mount
  const refreshPermissions = useCallback(async () => {
    const res = await checkAllPermissions();
    setPermissions(res);
  }, []);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // Persist privacy settings
  const updatePrivacySetting = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    setPrivacy((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(`chatme_privacy_${currentUser?.id || "local"}`, JSON.stringify(next));
      return next;
    });

    // Optional sync to supabase profile metadata
    if (currentUser?.id && supabase) {
      supabase
        .from("profiles")
        .update({ privacy_settings: { ...privacy, [key]: value } })
        .eq("id", currentUser.id)
        .then(() => {})
        .catch(() => {});
    }

    if (showToast) {
      showToast("Privacy setting updated");
    }
  };

  const handleRequestPermission = async (type: PermissionType) => {
    setLoadingPerm(type);
    try {
      const res = await requestPermission(type);
      setPermissions((prev) => ({ ...prev, [type]: res }));
      if (res === "granted") {
        if (showToast) showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} permission granted`);
      } else {
        if (showToast) showToast(`Permission not granted. You can manage this in App Settings.`);
      }
    } catch (err: any) {
      console.warn(`Error requesting ${type}:`, err);
    } finally {
      setLoadingPerm(null);
    }
  };

  const handleToggleBlockUser = (targetUserId: string) => {
    const isBlocked = privacy.blockedUsers.includes(targetUserId);
    const updated = isBlocked
      ? privacy.blockedUsers.filter((id) => id !== targetUserId)
      : [...privacy.blockedUsers, targetUserId];

    updatePrivacySetting("blockedUsers", updated);
    if (showToast) {
      showToast(isBlocked ? "Contact unblocked" : "Contact blocked");
    }
  };

  const blockedUsersList = users.filter((u) => privacy.blockedUsers.includes(String(u.id)));

  // Label helpers
  const getAudienceLabel = (val: string) => {
    switch (val) {
      case "everyone":
        return "Everyone";
      case "contacts":
        return "My contacts";
      case "contacts_except":
        return "My contacts except...";
      case "nobody":
        return "Nobody";
      case "same_as_last_seen":
        return "Same as last seen";
      case "only_share_with":
        return "Only share with...";
      default:
        return val;
    }
  };

  const getTimerLabel = (val: string) => {
    switch (val) {
      case "24h":
        return "24 hours";
      case "7d":
        return "7 days";
      case "90d":
        return "90 days";
      case "off":
      default:
        return "Off";
    }
  };

  const getPermissionIcon = (type: PermissionType) => {
    switch (type) {
      case "contacts":
        return <BookUser size={18} />;
      case "camera":
        return <Camera size={18} />;
      case "microphone":
        return <Mic size={18} />;
      case "photos":
        return <ImageIcon size={18} />;
      case "notifications":
        return <Bell size={18} />;
      case "location":
        return <MapPin size={18} />;
    }
  };

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      {/* Top Header */}
      <div className={`shrink-0 px-4 py-3.5 border-b flex items-center justify-between gap-3 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-2 rounded-xl transition ${dark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-lg leading-snug flex items-center gap-2">
              <span>Privacy</span>
              <Shield size={16} className="text-[#25D366]" />
            </h1>
            <p className="text-xs text-gray-400">Control your visibility, security & permissions</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full px-4 py-4 space-y-5">
        
        {/* Privacy Checkup Card */}
        <div
          onClick={() => setSubView("checkup")}
          className={`p-4 rounded-2xl border cursor-pointer transition active:scale-[0.99] ${
            dark
              ? "bg-gradient-to-r from-emerald-950/40 via-gray-900 to-gray-900 border-emerald-800/40 hover:border-emerald-700/60"
              : "bg-gradient-to-r from-emerald-50 via-white to-white border-emerald-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shrink-0 border border-[#25D366]/30">
              <ShieldCheck size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span>Privacy checkup</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#25D366] text-white font-semibold">
                    New
                  </span>
                </h3>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Control who can contact you, choose your personal visibility, and secure your chats.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Personal Info Visibility */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#25D366] px-1">
            Who can see my personal info
          </h2>

          <div className={`rounded-2xl border overflow-hidden divide-y ${
            dark ? "bg-gray-800/60 border-gray-800 divide-gray-800/70" : "bg-gray-50 border-gray-100 divide-gray-100"
          }`}>
            {/* Last seen and online */}
            <button
              onClick={() => setSubView("lastSeen")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:opacity-80 transition"
            >
              <div>
                <p className="text-sm font-medium">Last seen and online</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {getAudienceLabel(privacy.lastSeen)}, {getAudienceLabel(privacy.online)}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </button>

            {/* Profile photo */}
            <button
              onClick={() => setSubView("profilePhoto")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:opacity-80 transition"
            >
              <div>
                <p className="text-sm font-medium">Profile photo</p>
                <p className="text-xs text-gray-400 mt-0.5">{getAudienceLabel(privacy.profilePhoto)}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </button>

            {/* About */}
            <button
              onClick={() => setSubView("about")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:opacity-80 transition"
            >
              <div>
                <p className="text-sm font-medium">About</p>
                <p className="text-xs text-gray-400 mt-0.5">{getAudienceLabel(privacy.about)}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </button>

            {/* Status */}
            <button
              onClick={() => setSubView("status")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:opacity-80 transition"
            >
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-gray-400 mt-0.5">{getAudienceLabel(privacy.status)}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </button>

            {/* Read Receipts */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="pr-4">
                <p className="text-sm font-medium">Read receipts</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  If turned off, you won't send or receive Read receipts. Read receipts are always sent for group chats.
                </p>
              </div>
              <button
                onClick={() => updatePrivacySetting("readReceipts", !privacy.readReceipts)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                  privacy.readReceipts ? "bg-[#25D366]" : dark ? "bg-gray-700" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    privacy.readReceipts ? "transform translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Disappearing Messages */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#25D366] px-1">
            Messaging
          </h2>

          <div className={`rounded-2xl border overflow-hidden ${
            dark ? "bg-gray-800/60 border-gray-800" : "bg-gray-50 border-gray-100"
          }`}>
            <button
              onClick={() => setSubView("disappearing")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:opacity-80 transition"
            >
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-[#25D366]" />
                <div>
                  <p className="text-sm font-medium">Default message timer</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Start new chats with disappearing messages: {getTimerLabel(privacy.defaultDisappearingTimer)}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* Section 3: Groups */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#25D366] px-1">
            Groups
          </h2>

          <div className={`rounded-2xl border overflow-hidden ${
            dark ? "bg-gray-800/60 border-gray-800" : "bg-gray-50 border-gray-100"
          }`}>
            <button
              onClick={() => setSubView("groups")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:opacity-80 transition"
            >
              <div>
                <p className="text-sm font-medium">Who can add me to groups</p>
                <p className="text-xs text-gray-400 mt-0.5">{getAudienceLabel(privacy.groups)}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* Section 4: Contacts */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#25D366] px-1">
            Contacts
          </h2>

          <div className={`rounded-2xl border overflow-hidden divide-y ${
            dark ? "bg-gray-800/60 border-gray-800 divide-gray-800/70" : "bg-gray-50 border-gray-100 divide-gray-100"
          }`}>
            <button
              onClick={() => setSelectedPermForDetail("contacts")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:opacity-80 transition"
            >
              <div className="flex items-center gap-3">
                <BookUser size={18} className="text-[#25D366]" />
                <div>
                  <p className="text-sm font-medium">Contacts access</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {permissions.contacts === "granted" ? "Device contacts synced on demand" : "Not allowed - tap to grant"}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </button>

            <button
              onClick={() => setSubView("blocked")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:opacity-80 transition"
            >
              <div className="flex items-center gap-3">
                <UserX size={18} className="text-rose-500" />
                <div>
                  <p className="text-sm font-medium">Blocked contacts</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {privacy.blockedUsers.length === 0
                      ? "None"
                      : `${privacy.blockedUsers.length} contact${privacy.blockedUsers.length > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* Section 4: Android App Permissions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#25D366]">
              Android App Permissions
            </h2>
            <button
              onClick={refreshPermissions}
              className="text-[11px] text-gray-400 hover:text-[#25D366] flex items-center gap-1 transition"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 px-1 leading-relaxed">
            ChatMe only requests permissions when you actively use corresponding features. Private data is never accessed silently or shared with other apps.
          </p>

          <div className={`rounded-2xl border overflow-hidden divide-y ${
            dark ? "bg-gray-800/60 border-gray-800 divide-gray-800/70" : "bg-gray-50 border-gray-100 divide-gray-100"
          }`}>
            {PERMISSION_DEFINITIONS.map((def) => {
              const status = permissions[def.id];
              const isAllowed = status === "granted";
              const isLoading = loadingPerm === def.id;

              return (
                <div
                  key={def.id}
                  className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-800/20 dark:hover:bg-gray-800/40 transition"
                >
                  <div
                    onClick={() => setSelectedPermForDetail(def.id)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isAllowed
                        ? "bg-[#25D366]/15 text-[#25D366]"
                        : dark ? "bg-gray-700/60 text-gray-400" : "bg-gray-200 text-gray-500"
                    }`}>
                      {getPermissionIcon(def.id)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{def.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          isAllowed
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-gray-500/15 text-gray-500 dark:text-gray-400"
                        }`}>
                          {isAllowed ? "Allowed" : "Not allowed"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{def.requiredFor}</p>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isAllowed ? (
                      <span className="text-xs text-[#25D366] font-semibold flex items-center gap-1">
                        <CheckCircle2 size={16} />
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRequestPermission(def.id)}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] active:scale-95 transition disabled:opacity-50 flex items-center gap-1"
                      >
                        {isLoading ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <span>Allow</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-1">
            <button
              onClick={() => {
                openAndroidAppSettings();
                setSubView("permissionSettingsGuide");
              }}
              className={`w-full p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition ${
                dark
                  ? "bg-gray-800/40 border-gray-800 text-gray-200 hover:bg-gray-800"
                  : "bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings size={16} className="text-[#25D366]" />
                <span>Manage ChatMe permissions</span>
              </div>
              <ExternalLink size={14} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Section 6: Advanced */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#25D366] px-1">
            Advanced
          </h2>

          <div className={`rounded-2xl border overflow-hidden divide-y ${
            dark ? "bg-gray-800/60 border-gray-800 divide-gray-800/70" : "bg-gray-50 border-gray-100 divide-gray-100"
          }`}>
            {/* Link previews */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="pr-4">
                <p className="text-sm font-medium">Disable link previews</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  To protect your IP address, links you send won't automatically generate rich previews.
                </p>
              </div>
              <button
                onClick={() => updatePrivacySetting("linkPreviews", !privacy.linkPreviews)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                  !privacy.linkPreviews ? "bg-[#25D366]" : dark ? "bg-gray-700" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    !privacy.linkPreviews ? "transform translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            {/* Protect IP address in calls */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="pr-4">
                <p className="text-sm font-medium">Protect IP address in calls</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Relay all calls through secure ChatMe servers to hide your device IP address from other participants.
                </p>
              </div>
              <button
                onClick={() => updatePrivacySetting("protectIpInCalls", !privacy.protectIpInCalls)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                  privacy.protectIpInCalls ? "bg-[#25D366]" : dark ? "bg-gray-700" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    privacy.protectIpInCalls ? "transform translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Security & Privacy Commitment */}
        <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
          dark ? "bg-gray-800/40 border-gray-800 text-gray-400" : "bg-gray-50 border-gray-100 text-gray-500"
        }`}>
          <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 mb-1">
            <ShieldCheck size={16} className="text-[#25D366]" />
            <span>ChatMe Privacy Guarantee</span>
          </div>
          <p>
            Your chats and calls are protected. ChatMe never reads data from other apps, does not run background spyware, and only uses permissions you authorize.
          </p>
        </div>

      </div>

      {/* ---------------- Subview Modal: Last Seen & Online ---------------- */}
      {subView === "lastSeen" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm">Last seen and online</h3>
              <button onClick={() => setSubView(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div>
                <p className="font-bold text-gray-700 dark:text-gray-300 mb-2">Who can see my last seen</p>
                <div className="space-y-1.5">
                  {(["everyone", "contacts", "contacts_except", "nobody"] as const).map((opt) => (
                    <label
                      key={opt}
                      onClick={() => updatePrivacySetting("lastSeen", opt)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                        privacy.lastSeen === opt
                          ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <span>{getAudienceLabel(opt)}</span>
                      {privacy.lastSeen === opt && <Check size={16} />}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="font-bold text-gray-700 dark:text-gray-300 mb-2">Who can see when I'm online</p>
                <div className="space-y-1.5">
                  {(["everyone", "same_as_last_seen"] as const).map((opt) => (
                    <label
                      key={opt}
                      onClick={() => updatePrivacySetting("online", opt)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                        privacy.online === opt
                          ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <span>{getAudienceLabel(opt)}</span>
                      {privacy.online === opt && <Check size={16} />}
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                If you don't share when you were last seen or online, you won't be able to see when other people were last seen or online.
              </p>
            </div>

            <button
              onClick={() => setSubView(null)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Subview Modal: Profile Photo ---------------- */}
      {subView === "profilePhoto" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm">Profile Photo Visibility</h3>
              <button onClick={() => setSubView(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <p className="text-gray-500 dark:text-gray-400 mb-2">Who can see my profile photo</p>
              {(["everyone", "contacts", "contacts_except", "nobody"] as const).map((opt) => (
                <label
                  key={opt}
                  onClick={() => updatePrivacySetting("profilePhoto", opt)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                    privacy.profilePhoto === opt
                      ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  <span>{getAudienceLabel(opt)}</span>
                  {privacy.profilePhoto === opt && <Check size={16} />}
                </label>
              ))}
            </div>

            <button
              onClick={() => setSubView(null)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Subview Modal: About ---------------- */}
      {subView === "about" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm">About Visibility</h3>
              <button onClick={() => setSubView(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <p className="text-gray-500 dark:text-gray-400 mb-2">Who can see my About info</p>
              {(["everyone", "contacts", "contacts_except", "nobody"] as const).map((opt) => (
                <label
                  key={opt}
                  onClick={() => updatePrivacySetting("about", opt)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                    privacy.about === opt
                      ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  <span>{getAudienceLabel(opt)}</span>
                  {privacy.about === opt && <Check size={16} />}
                </label>
              ))}
            </div>

            <button
              onClick={() => setSubView(null)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Subview Modal: Status Privacy ---------------- */}
      {subView === "status" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm">Status Privacy</h3>
              <button onClick={() => setSubView(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <p className="text-gray-500 dark:text-gray-400 mb-2">Who can see my status updates</p>
              {(["contacts", "contacts_except", "only_share_with"] as const).map((opt) => (
                <label
                  key={opt}
                  onClick={() => updatePrivacySetting("status", opt)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                    privacy.status === opt
                      ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  <span>{getAudienceLabel(opt)}</span>
                  {privacy.status === opt && <Check size={16} />}
                </label>
              ))}
              <p className="text-[11px] text-gray-400 leading-relaxed pt-2">
                Changes to your privacy settings won't affect status updates that you've already sent.
              </p>
            </div>

            <button
              onClick={() => setSubView(null)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Subview Modal: Groups Privacy ---------------- */}
      {subView === "groups" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm">Groups Privacy</h3>
              <button onClick={() => setSubView(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <p className="text-gray-500 dark:text-gray-400 mb-2">Who can add me to groups</p>
              {(["everyone", "contacts", "contacts_except"] as const).map((opt) => (
                <label
                  key={opt}
                  onClick={() => updatePrivacySetting("groups", opt)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                    privacy.groups === opt
                      ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  <span>{getAudienceLabel(opt)}</span>
                  {privacy.groups === opt && <Check size={16} />}
                </label>
              ))}
              <p className="text-[11px] text-gray-400 leading-relaxed pt-2">
                Admins who can't add you to a group will have the option of inviting you privately instead.
              </p>
            </div>

            <button
              onClick={() => setSubView(null)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Subview Modal: Default Disappearing Timer ---------------- */}
      {subView === "disappearing" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm">Default Message Timer</h3>
              <button onClick={() => setSubView(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                Start new individual chats with disappearing messages set to:
              </p>
              {(["24h", "7d", "90d", "off"] as const).map((opt) => (
                <label
                  key={opt}
                  onClick={() => updatePrivacySetting("defaultDisappearingTimer", opt)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                    privacy.defaultDisappearingTimer === opt
                      ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  <span>{getTimerLabel(opt)}</span>
                  {privacy.defaultDisappearingTimer === opt && <Check size={16} />}
                </label>
              ))}
              <p className="text-[11px] text-gray-400 leading-relaxed pt-2">
                When turned on, all new individual chats will start with disappearing messages set to the duration you select.
              </p>
            </div>

            <button
              onClick={() => setSubView(null)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Subview Modal: Blocked Contacts ---------------- */}
      {subView === "blocked" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border flex flex-col max-h-[85vh] ${
            dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <UserX size={18} className="text-rose-500" />
                <h3 className="font-bold text-sm">Blocked Contacts</h3>
              </div>
              <button onClick={() => setSubView(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {blockedUsersList.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs font-medium text-gray-500">No blocked contacts</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-[200px] mx-auto">
                    Blocked contacts can no longer call you or send you messages.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedUsersList.map((u) => (
                    <div
                      key={u.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between ${
                        dark ? "bg-gray-800/60 border-gray-800" : "bg-gray-50 border-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={u.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullname || "User")}&background=ef4444&color=fff`}
                          alt={u.fullname}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{u.fullname || "Contact"}</p>
                          <p className="text-[10px] text-gray-400 truncate">{u.phone || u.email || "Blocked"}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleBlockUser(String(u.id))}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Block a contact list selector */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Block a contact:</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {users
                    .filter((u) => u.id !== currentUser?.id && !privacy.blockedUsers.includes(String(u.id)))
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleToggleBlockUser(String(u.id))}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/60 transition ${
                          dark ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        <span className="text-xs truncate">{u.fullname || u.email}</span>
                        <span className="text-[11px] text-rose-500 font-medium">Block</span>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="pt-2 shrink-0">
              <button
                onClick={() => setSubView(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:opacity-80 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Subview Modal: Privacy Checkup ---------------- */}
      {subView === "checkup" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border flex flex-col max-h-[85vh] ${
            dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#25D366]" />
                <h3 className="font-bold text-sm">Privacy Checkup</h3>
              </div>
              <button onClick={() => setSubView(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs">
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                Take a quick guided review to configure who can see your info and control message retention.
              </p>

              {/* Step 1 */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${dark ? "bg-gray-800/60 border-gray-800" : "bg-emerald-50/50 border-emerald-100"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[10px]">1</span>
                    Choose who can see personal info
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Profile photo ({getAudienceLabel(privacy.profilePhoto)}), Last seen ({getAudienceLabel(privacy.lastSeen)}).
                </p>
                <button
                  onClick={() => setSubView("profilePhoto")}
                  className="px-3 py-1.5 rounded-lg bg-[#25D366]/15 text-[#25D366] font-semibold text-[11px]"
                >
                  Adjust Visibility
                </button>
              </div>

              {/* Step 2 */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${dark ? "bg-gray-800/60 border-gray-800" : "bg-emerald-50/50 border-emerald-100"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[10px]">2</span>
                    Add more privacy to your chats
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Default disappearing messages timer ({getTimerLabel(privacy.defaultDisappearingTimer)}) and read receipts ({privacy.readReceipts ? "On" : "Off"}).
                </p>
                <button
                  onClick={() => setSubView("disappearing")}
                  className="px-3 py-1.5 rounded-lg bg-[#25D366]/15 text-[#25D366] font-semibold text-[11px]"
                >
                  Adjust Chat Privacy
                </button>
              </div>

              {/* Step 3 */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${dark ? "bg-gray-800/60 border-gray-800" : "bg-emerald-50/50 border-emerald-100"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[10px]">3</span>
                    Device Permissions Check
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Ensure camera, microphone, and contacts permissions are granted only when necessary.
                </p>
              </div>
            </div>

            <div className="pt-2 shrink-0">
              <button
                onClick={() => setSubView(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition"
              >
                Finished Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Subview Modal: Permission Detail & Android App Settings Guide ---------------- */}
      {selectedPermForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            {(() => {
              const def = PERMISSION_DEFINITIONS.find((d) => d.id === selectedPermForDetail)!;
              const isAllowed = permissions[def.id] === "granted";

              return (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center">
                        {getPermissionIcon(def.id)}
                      </div>
                      <h3 className="font-bold text-sm">{def.title} Permission</h3>
                    </div>
                    <button onClick={() => setSelectedPermForDetail(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="py-4 space-y-3 text-xs leading-relaxed">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                      <span className="text-gray-500 dark:text-gray-400">Current Status:</span>
                      <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                        isAllowed ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-gray-500/15 text-gray-500"
                      }`}>
                        {isAllowed ? "Allowed" : "Not allowed"}
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300">
                      {def.description}
                    </p>

                    <div className={`p-3 rounded-xl space-y-1 text-[11px] ${dark ? "bg-gray-800/40 text-gray-400" : "bg-emerald-50/50 text-emerald-800"}`}>
                      <p className="font-semibold flex items-center gap-1">
                        <ShieldCheck size={14} className="text-[#25D366]" />
                        <span>Privacy Standard:</span>
                      </p>
                      <p>• Used only on-demand when activating the feature.</p>
                      <p>• Never collected silently in the background.</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedPermForDetail(null)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${
                        dark ? "border-gray-800 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Close
                    </button>
                    {!isAllowed && (
                      <button
                        type="button"
                        onClick={async () => {
                          await handleRequestPermission(def.id);
                          setSelectedPermForDetail(null);
                        }}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition"
                      >
                        Request Permission
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ---------------- Subview Modal: Android Settings Guide ---------------- */}
      {subView === "permissionSettingsGuide" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-[#25D366]" />
                <h3 className="font-bold text-sm">Android App Settings Guide</h3>
              </div>
              <button onClick={() => setSubView(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                If a permission was previously denied or you wish to manage app-level access:
              </p>

              <div className={`p-3.5 rounded-2xl space-y-2.5 ${dark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                  <span>Open your Android device <strong>Settings</strong> app.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                  <span>Tap <strong>Apps</strong> &gt; <strong>ChatMe</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                  <span>Tap <strong>Permissions</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center text-[10px] shrink-0">4</span>
                  <span>Enable <strong>Contacts, Camera, Microphone, or Notifications</strong>.</span>
                </div>
              </div>

              <div className={`p-2.5 rounded-xl flex items-center gap-2 text-[11px] ${dark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
                <CheckCircle2 size={14} className="shrink-0 text-[#25D366]" />
                <span>Return to ChatMe after changing settings and permissions will update immediately.</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSubView(null);
                refreshPermissions();
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
