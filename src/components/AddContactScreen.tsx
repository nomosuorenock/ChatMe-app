import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  UserPlus,
  Phone,
  MessageSquare,
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  BookUser,
  Plus,
  X,
  User,
  Mail,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Check,
  UserCheck,
  Settings,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Info
} from "lucide-react";
import { Contacts } from "@capacitor-community/contacts";
import { supabase } from "../lib/supabase";
import {
  loadDeviceContacts,
  normalizePhoneNumber,
  isPhoneMatch,
  getFirstLetter,
  requestContactsPermission,
  checkContactsPermission,
  type DeviceContactItem
} from "../services/contactService";

export { loadDeviceContacts, normalizePhoneNumber, isPhoneMatch, getFirstLetter };
export type { DeviceContactItem };

export interface AddContactScreenProps {
  currentUser: any;
  users: any[];
  openChat: (userId: string | number) => void;
  onBack: () => void;
  dark: boolean;
  showToast?: (msg: string) => void;
}

export function AddContactScreen({
  currentUser,
  users,
  openChat,
  onBack,
  dark,
  showToast
}: AddContactScreenProps) {
  const [contacts, setContacts] = useState<DeviceContactItem[]>([]);
  const [query, setQuery] = useState("");
  const [directPhoneQuery, setDirectPhoneQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | "unsupported">("prompt");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [iframeNotice, setIframeNotice] = useState<string | null>(null);

  // States for user lookup per contact
  const [checkingContactId, setCheckingContactId] = useState<string | null>(null);
  const [matchedUsersMap, setMatchedUsersMap] = useState<Record<string, any>>({});
  const [nonChatMeSet, setNonChatMeSet] = useState<Record<string, boolean>>({});

  // Modal state for manual contact
  const [showManualModal, setShowManualModal] = useState(false);
  const [showSettingsGuide, setShowSettingsGuide] = useState(false);
  const [retryingPermission, setRetryingPermission] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");

  // Direct phone search result state
  const [searchingDirect, setSearchingDirect] = useState(false);
  const [directSearchResult, setDirectSearchResult] = useState<{ searched: boolean; user: any | null; phone: string }>({
    searched: false,
    user: null,
    phone: ""
  });

  const getFirstLetter = (name: string): string => {
    const trimmed = (name || "").trim();
    if (!trimmed) return "?";
    const char = trimmed.charAt(0).toUpperCase();
    return /[A-Z0-9]/.test(char) ? char : "?";
  };

  // Pre-fill local matches from users array without network requests
  const matchWithLocalUsers = useCallback((contactList: DeviceContactItem[]) => {
    const matches: Record<string, any> = {};
    const nonMatches: Record<string, boolean> = {};

    contactList.forEach((c) => {
      const found = (users || []).find((u) => {
        if (currentUser && String(u.id) === String(currentUser.id)) return false;
        return isPhoneMatch(c.phone, u.phone);
      });

      if (found) {
        matches[c.id] = found;
      }
    });

    setMatchedUsersMap((prev) => ({ ...prev, ...matches }));
  }, [users, currentUser]);

  const loadContactsFromDevice = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // Check Capacitor permission
      let permStatus;
      try {
        permStatus = await Contacts.checkPermissions();
      } catch (e) {
        console.log("Capacitor Contacts not natively available, checking Web/Fallback:", e);
      }

      if (permStatus) {
        if (permStatus.contacts === "denied") {
          setPermissionState("denied");
          setLoading(false);
          return;
        }

        if (permStatus.contacts !== "granted") {
          const req = await Contacts.requestPermissions();
          if (req.contacts !== "granted") {
            setPermissionState("denied");
            setLoading(false);
            return;
          }
        }

        setPermissionState("granted");

        // Fetch contacts using Capacitor
        const result = await Contacts.getContacts({
          projection: {
            name: true,
            phones: true,
            emails: true
          }
        });

        if (result && result.contacts && result.contacts.length > 0) {
          const parsed: DeviceContactItem[] = [];

          result.contacts.forEach((c, index) => {
            const name = c.name?.display || [c.name?.given, c.name?.family].filter(Boolean).join(" ") || "Contact";
            const phone = c.phones?.[0]?.number || "";
            const email = c.emails?.[0]?.address || "";

            if (phone && phone.trim().length > 0) {
              parsed.push({
                id: c.contactId || `cap_${Date.now()}_${index}`,
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                firstLetter: getFirstLetter(name)
              });
            }
          });

          parsed.sort((a, b) => a.name.localeCompare(b.name));
          setContacts(parsed);
          matchWithLocalUsers(parsed);
          setLoading(false);
          return;
        }
      }

      // Fallback: Web Contacts API or sample contacts for browser testing
      const isTopFrame = typeof window !== "undefined" && window.self === window.top;
      const hasWebContacts = typeof navigator !== "undefined" && "contacts" in navigator && typeof (navigator.contacts as any)?.select === "function";

      if (hasWebContacts && isTopFrame) {
        setPermissionState("granted");
        try {
          const props = ["name", "tel", "email"];
          const imported = await (navigator.contacts as any).select(props, { multiple: true });
          if (imported && imported.length > 0) {
            const parsed: DeviceContactItem[] = imported
              .map((c: any, idx: number) => ({
                id: `web_${Date.now()}_${idx}`,
                name: c.name?.[0] || "Device Contact",
                phone: c.tel?.[0] || "",
                email: c.email?.[0] || "",
                firstLetter: getFirstLetter(c.name?.[0] || "D")
              }))
              .filter((c: DeviceContactItem) => c.phone.trim().length > 0);

            setContacts(parsed);
            matchWithLocalUsers(parsed);
            setLoading(false);
            return;
          }
        } catch (err: any) {
          console.log("Web Contact Picker notice:", err?.message || "dismissed");
        }
      } else if (!isTopFrame) {
        setIframeNotice("Device contact sync requires the native ChatMe app or opening in a top-level browser tab (unavailable in iframe preview). You can add contacts manually using the '+ Add' button or quick phone search below.");
      }

      // Default sample contacts for browser preview / empty states
      setPermissionState("granted");
      const sampleContacts: DeviceContactItem[] = [
        { id: "sample_1", name: "Alice Johnson", phone: "+1 (555) 019-2831", email: "alice@example.com", firstLetter: "A" },
        { id: "sample_2", name: "Bob Smith", phone: "+1 (555) 012-3456", email: "bob@example.com", firstLetter: "B" },
        { id: "sample_3", name: "Charlie Davis", phone: "+1 (555) 018-9988", email: "charlie@example.com", firstLetter: "C" },
        { id: "sample_4", name: "Diana Prince", phone: "+1 (555) 014-7722", email: "diana@example.com", firstLetter: "D" }
      ];

      setContacts(sampleContacts);
      matchWithLocalUsers(sampleContacts);
    } catch (err: any) {
      console.error("Error loading contacts:", err);
      setErrorMessage(err?.message || "Failed to access device contacts");
      setPermissionState("denied");
    } finally {
      setLoading(false);
    }
  }, [matchWithLocalUsers]);

  useEffect(() => {
    loadContactsFromDevice();
  }, [loadContactsFromDevice]);

  const requestPermissionAndLoad = async () => {
    setRetryingPermission(true);
    setLoading(true);
    setErrorMessage(null);
    try {
      let req;
      try {
        req = await Contacts.requestPermissions();
      } catch (err: any) {
        console.warn("Contacts.requestPermissions failed natively:", err);
      }

      if (req && req.contacts === "granted") {
        setPermissionState("granted");
        if (showToast) showToast("Contacts access granted!");
        await loadContactsFromDevice();
      } else if (req && req.contacts === "denied") {
        setPermissionState("denied");
        setLoading(false);
      } else {
        // Fallback for web or browser preview
        await loadContactsFromDevice();
      }
    } catch (e: any) {
      console.log("Permission request error:", e);
      setErrorMessage(e?.message || "Contacts permission request failed");
      setPermissionState("denied");
      setLoading(false);
    } finally {
      setRetryingPermission(false);
    }
  };

  const handleOpenSettings = () => {
    // Attempt native app settings intent if available, otherwise open guide modal
    try {
      if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform()) {
        // In native Capacitor Android/iOS, trigger App settings if URL scheme available or display guide
        if ("cordova" in window && (window as any).cordova?.plugins?.settings) {
          (window as any).cordova.plugins.settings.open("application_details");
          return;
        }
      }
    } catch (e) {
      console.log("Unable to open native settings directly:", e);
    }
    setShowSettingsGuide(true);
  };

  // Query Supabase profiles table strictly for the single selected contact
  const checkContactOnChatMe = async (contact: DeviceContactItem) => {
    if (matchedUsersMap[contact.id]) {
      openChat(matchedUsersMap[contact.id].id);
      return;
    }

    setCheckingContactId(contact.id);
    const cleanPhone = normalizePhoneNumber(contact.phone);

    try {
      // 1. Check local users state first
      const localMatch = (users || []).find((u) => {
        if (currentUser && String(u.id) === String(currentUser.id)) return false;
        return isPhoneMatch(contact.phone, u.phone);
      });

      if (localMatch) {
        setMatchedUsersMap((prev) => ({ ...prev, [contact.id]: localMatch }));
        setCheckingContactId(null);
        if (showToast) showToast(`${contact.name} is on ChatMe!`);
        openChat(localMatch.id);
        return;
      }

      // 2. Query Supabase profiles table for matching phone
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*");

      if (!error && profiles) {
        const found = profiles.find((p: any) => {
          if (currentUser && String(p.id) === String(currentUser.id)) return false;
          return isPhoneMatch(contact.phone, p.phone || p.phoneNumber || p.mobile);
        });

        if (found) {
          const matchedUser = {
            id: found.id || found.user_id,
            fullname: found.full_name || found.fullname || contact.name,
            phone: found.phone || contact.phone,
            photo: found.avatar_url || found.photo,
            bio: found.bio || "Hey there! I am using ChatMe"
          };

          setMatchedUsersMap((prev) => ({ ...prev, [contact.id]: matchedUser }));
          if (showToast) showToast(`${contact.name} is registered on ChatMe!`);
          openChat(matchedUser.id);
          return;
        }
      }

      // 3. Not found on ChatMe
      setNonChatMeSet((prev) => ({ ...prev, [contact.id]: true }));
      if (showToast) showToast(`${contact.name} is not on ChatMe yet. Send an invite!`);
    } catch (err) {
      console.error("Error checking contact on ChatMe:", err);
    } finally {
      setCheckingContactId(null);
    }
  };

  const handleDirectPhoneSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPhoneQuery.trim()) return;

    setSearchingDirect(true);
    setDirectSearchResult({ searched: false, user: null, phone: directPhoneQuery.trim() });

    const cleanInput = normalizePhoneNumber(directPhoneQuery);

    try {
      // Check local users array first
      const localMatch = (users || []).find((u) => {
        if (currentUser && String(u.id) === String(currentUser.id)) return false;
        return isPhoneMatch(directPhoneQuery, u.phone);
      });

      if (localMatch) {
        setDirectSearchResult({ searched: true, user: localMatch, phone: directPhoneQuery.trim() });
        setSearchingDirect(false);
        return;
      }

      // Query Supabase profiles
      const { data: profiles, error } = await supabase.from("profiles").select("*");

      if (!error && profiles) {
        const found = profiles.find((p: any) => {
          if (currentUser && String(p.id) === String(currentUser.id)) return false;
          return isPhoneMatch(directPhoneQuery, p.phone || p.phoneNumber);
        });

        if (found) {
          const matched = {
            id: found.id || found.user_id,
            fullname: found.full_name || found.fullname || "ChatMe User",
            phone: found.phone || directPhoneQuery,
            photo: found.avatar_url || found.photo,
            bio: found.bio || "Hey there! I am using ChatMe"
          };
          setDirectSearchResult({ searched: true, user: matched, phone: directPhoneQuery.trim() });
          setSearchingDirect(false);
          return;
        }
      }

      setDirectSearchResult({ searched: true, user: null, phone: directPhoneQuery.trim() });
    } catch (err) {
      console.error("Error searching direct phone:", err);
      setDirectSearchResult({ searched: true, user: null, phone: directPhoneQuery.trim() });
    } finally {
      setSearchingDirect(false);
    }
  };

  const handleInvite = (c: { name: string; phone: string }) => {
    const shareText = `Hey ${c.name}! Join me on ChatMe to chat for free: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({
        title: "Join me on ChatMe",
        text: shareText,
        url: window.location.origin
      }).catch(() => {});
    } else {
      const smsUrl = `sms:${encodeURIComponent(c.phone)}?body=${encodeURIComponent(shareText)}`;
      window.open(smsUrl, "_blank");
    }
    if (showToast) showToast(`Invite link created for ${c.name}`);
  };

  const handleAddManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) {
      if (showToast) showToast("Name and phone number are required");
      return;
    }

    const newContact: DeviceContactItem = {
      id: `manual_${Date.now()}`,
      name: manualName.trim(),
      phone: manualPhone.trim(),
      email: manualEmail.trim(),
      firstLetter: getFirstLetter(manualName.trim())
    };

    setContacts((prev) => [newContact, ...prev]);
    setManualName("");
    setManualPhone("");
    setManualEmail("");
    setShowManualModal(false);
    if (showToast) showToast(`Added ${newContact.name} to contacts!`);
  };

  const filteredContacts = contacts.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const cleanQ = normalizePhoneNumber(query);
    const cleanPhone = normalizePhoneNumber(c.phone);

    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (cleanQ.length > 0 && cleanPhone.includes(cleanQ))
    );
  });

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      {/* Header */}
      <div className={`shrink-0 px-4 py-3.5 border-b flex items-center justify-between gap-3 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className={`p-2 rounded-xl shrink-0 transition ${dark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-lg leading-snug flex items-center gap-2 truncate">
              <span>Add Contact</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#25D366]/10 text-[#25D366] font-semibold shrink-0">
                Phone Book
              </span>
            </h1>
            <p className="text-xs text-gray-400 truncate">Find friends from your device contacts on ChatMe</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowManualModal(true)}
            className="p-2.5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] active:scale-95 transition shadow-sm flex items-center gap-1 text-xs font-semibold"
            title="Add Contact Manually"
          >
            <UserPlus size={18} />
            <span className="hidden sm:inline">Add</span>
          </button>
          <button
            onClick={loadContactsFromDevice}
            className={`p-2.5 rounded-xl transition ${dark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`}
            title="Refresh Device Contacts"
          >
            <RefreshCw size={18} className={loading ? "animate-spin text-[#25D366]" : ""} />
          </button>
        </div>
      </div>

      {/* Main Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full px-4 py-4 space-y-4">

        {/* Notice for preview / iframe environments */}
        {iframeNotice && (
          <div className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${
            dark ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-200" : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
          }`}>
            <Info size={18} className="text-[#25D366] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Device Contacts Notice</span>
              <span>{iframeNotice}</span>
            </div>
            <button
              onClick={() => setIframeNotice(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Direct Phone Lookup Box */}
        <div className={`p-4 rounded-2xl border ${dark ? "bg-gray-800/50 border-gray-800" : "bg-gray-50 border-gray-200/80"} shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <Smartphone size={18} className="text-[#25D366] shrink-0" />
            <h3 className="text-sm font-semibold">Quick Phone Search</h3>
          </div>
          <form onSubmit={handleDirectPhoneSearch} className="flex gap-2">
            <input
              type="tel"
              placeholder="Enter phone number (e.g. +1 555-0199)"
              value={directPhoneQuery}
              onChange={(e) => setDirectPhoneQuery(e.target.value)}
              className={`flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-xs outline-none border transition ${
                dark
                  ? "bg-gray-900 border-gray-700 text-white focus:border-[#25D366]"
                  : "bg-white border-gray-300 text-gray-900 focus:border-[#25D366]"
              }`}
            />
            <button
              type="submit"
              disabled={searchingDirect || !directPhoneQuery.trim()}
              className="px-4 py-2.5 bg-[#25D366] text-white text-xs font-semibold rounded-xl hover:bg-[#20bd5a] active:scale-95 transition disabled:opacity-50 flex items-center gap-1 shrink-0"
            >
              {searchingDirect ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span>Check</span>
            </button>
          </form>

          {/* Direct search result box */}
          {directSearchResult.searched && (
            <div className={`mt-3 p-3 rounded-xl border text-xs animate-fadeIn ${
              directSearchResult.user
                ? "bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366]"
                : dark ? "bg-gray-900 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-700"
            }`}>
              {directSearchResult.user ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center text-sm shadow">
                      {getFirstLetter(directSearchResult.user.fullname)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">
                        {directSearchResult.user.fullname}
                      </p>
                      <p className="text-[11px] text-[#25D366] font-medium">ChatMe Registered User</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openChat(directSearchResult.user.id)}
                    className="px-3 py-1.5 bg-[#25D366] text-white font-semibold rounded-lg hover:bg-[#20bd5a] transition flex items-center gap-1 shadow-sm"
                  >
                    <MessageSquare size={14} />
                    <span>Message</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-500 shrink-0" />
                    <span>{directSearchResult.phone} is not registered on ChatMe yet.</span>
                  </div>
                  <button
                    onClick={() => handleInvite({ name: "Friend", phone: directSearchResult.phone })}
                    className="px-3 py-1.5 border border-[#25D366] text-[#25D366] font-semibold rounded-lg hover:bg-[#25D366]/10 transition shrink-0"
                  >
                    Invite
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contacts Search Box */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search phone contacts by name or number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs outline-none border transition ${
              dark
                ? "bg-gray-800 border-gray-700 text-white focus:border-[#25D366]"
                : "bg-gray-100 border-gray-200 text-gray-900 focus:border-[#25D366]"
            }`}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Security / Privacy Banner */}
        <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-[11px] ${
          dark ? "bg-gray-800/30 border-gray-800 text-gray-400" : "bg-gray-50 border-gray-200/60 text-gray-600"
        }`}>
          <ShieldCheck size={18} className="text-[#25D366] shrink-0" />
          <span>Privacy protected: ChatMe queries selected contact phone numbers locally. Your address book is never uploaded to external servers.</span>
        </div>

        {/* Permission Denied State */}
        {permissionState === "denied" && (
          <div className={`p-5 rounded-2xl border text-left my-4 shadow-sm ${
            dark ? "bg-gray-800/80 border-amber-500/30" : "bg-amber-50/70 border-amber-200"
          }`}>
            <div className="flex items-start gap-3.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                <ShieldAlert size={22} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Contacts Access Needed</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                    Permission Denied
                  </span>
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  ChatMe needs access to your contacts to match your address book with friends already registered on ChatMe and help you start conversations instantly.
                </p>
              </div>
            </div>

            {/* Why we need it & privacy explanation */}
            <div className={`p-3 rounded-xl mb-4 text-[11px] space-y-1.5 ${
              dark ? "bg-gray-900/60 text-gray-400 border border-gray-700/60" : "bg-white/80 text-gray-600 border border-amber-100"
            }`}>
              <div className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
                <ShieldCheck size={14} className="text-[#25D366]" />
                <span>Why contact access is safe:</span>
              </div>
              <p className="pl-5">
                • Contacts are queried locally on your device to check for matching numbers.
              </p>
              <p className="pl-5">
                • Your entire contact book is never exported or shared with third parties.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={requestPermissionAndLoad}
                disabled={retryingPermission}
                className="px-3.5 py-2.5 bg-[#25D366] text-white text-xs font-semibold rounded-xl hover:bg-[#20bd5a] active:scale-95 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {retryingPermission ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
                <span>Retry Permission</span>
              </button>

              <button
                onClick={handleOpenSettings}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  dark
                    ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Settings size={15} className="text-gray-400" />
                <span>Open App Settings</span>
              </button>

              <button
                onClick={() => setShowManualModal(true)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  dark
                    ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <UserPlus size={15} className="text-[#25D366]" />
                <span>Add Manually</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Loader2 size={32} className="animate-spin text-[#25D366] mb-3" />
            <p className="text-xs font-medium">Accessing device contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          /* Empty State */
          <div className={`p-8 rounded-2xl border text-center my-6 ${dark ? "bg-gray-800/40 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <BookUser size={40} className="mx-auto mb-3 text-gray-400 opacity-60" />
            <h3 className="font-semibold text-sm mb-1">No contacts found</h3>
            <p className="text-xs text-gray-400 mb-4">
              {query ? `No contacts match "${query}"` : "Add contacts manually or sync your device address book."}
            </p>
            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2 bg-[#25D366] text-white text-xs font-semibold rounded-xl hover:bg-[#20bd5a] transition shadow"
            >
              + Add Phone Contact Manually
            </button>
          </div>
        ) : (
          /* Device Contacts List */
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Device Contacts ({filteredContacts.length})
              </h3>
              <span className="text-[11px] text-[#25D366]">Tap contact to check</span>
            </div>

            <div className={`rounded-2xl border overflow-hidden divider-y ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200/80"}`}>
              {filteredContacts.map((c) => {
                const isChecking = checkingContactId === c.id;
                const matchedUser = matchedUsersMap[c.id];
                const isNotOnChatMe = nonChatMeSet[c.id];

                return (
                  <div
                    key={c.id}
                    className={`p-3.5 flex items-center justify-between gap-3 border-b last:border-b-0 transition ${
                      dark ? "border-gray-800/80 hover:bg-gray-800/50" : "border-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* First Letter Avatar */}
                      <div className="w-11 h-11 rounded-full bg-[#25D366]/15 text-[#25D366] font-extrabold flex items-center justify-center text-base shrink-0 shadow-sm border border-[#25D366]/20">
                        {c.firstLetter}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{c.name}</p>
                          {matchedUser && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#25D366]/15 text-[#25D366] flex items-center gap-0.5">
                              <Check size={10} /> ChatMe
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-mono truncate">{c.phone}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-2">
                      {isChecking ? (
                        <div className="px-3 py-1.5 text-xs text-gray-400 flex items-center gap-1.5">
                          <Loader2 size={14} className="animate-spin text-[#25D366]" />
                          <span>Checking...</span>
                        </div>
                      ) : matchedUser ? (
                        <button
                          onClick={() => openChat(matchedUser.id)}
                          className="px-3.5 py-1.5 bg-[#25D366] text-white text-xs font-semibold rounded-xl hover:bg-[#20bd5a] active:scale-95 transition shadow-sm flex items-center gap-1"
                        >
                          <MessageSquare size={14} />
                          <span>Message</span>
                        </button>
                      ) : isNotOnChatMe ? (
                        <button
                          onClick={() => handleInvite(c)}
                          className="px-3 py-1.5 border border-[#25D366] text-[#25D366] text-xs font-semibold rounded-xl hover:bg-[#25D366]/10 active:scale-95 transition flex items-center gap-1"
                        >
                          <Share2 size={14} />
                          <span>Invite</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => checkContactOnChatMe(c)}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl hover:bg-[#25D366] hover:text-white transition flex items-center gap-1"
                        >
                          <UserCheck size={14} />
                          <span>Check</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Manual Contact Add Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl p-5 ${dark ? "bg-gray-900 text-white border border-gray-800" : "bg-white text-gray-900"} shadow-2xl animate-fadeIn`}>
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <UserPlus size={20} className="text-[#25D366]" />
                <h3 className="font-bold text-base">Add Contact</h3>
              </div>
              <button onClick={() => setShowManualModal(false)}>
                <X size={20} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleAddManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Name *</label>
                <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl ${dark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <User size={16} className="text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="bg-transparent w-full outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Phone Number *</label>
                <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl ${dark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <Phone size={16} className="text-gray-400" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +1 555-0199"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="bg-transparent w-full outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Email (Optional)</label>
                <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl ${dark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <Mail size={16} className="text-gray-400" />
                  <input
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="bg-transparent w-full outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${
                    dark ? "border-gray-800 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition shadow-md"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System Settings Guide Modal */}
      {showSettingsGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[#25D366]">
                  <Settings size={18} />
                </div>
                <h3 className="font-bold text-sm">System Settings Guide</h3>
              </div>
              <button
                onClick={() => setShowSettingsGuide(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <p className="text-gray-600 dark:text-gray-300">
                To allow ChatMe to load your phone contacts on Android or iOS:
              </p>

              <div className={`p-3 rounded-2xl space-y-2.5 ${dark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                  <span>Open your device <strong>Settings</strong> app.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                  <span>Tap <strong>Apps</strong> (or Application Manager).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                  <span>Select <strong>ChatMe</strong> from the app list.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center text-[10px] shrink-0">4</span>
                  <span>Tap <strong>Permissions</strong> &gt; <strong>Contacts</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center text-[10px] shrink-0">5</span>
                  <span>Choose <strong>Allow</strong> (READ_CONTACTS).</span>
                </div>
              </div>

              <div className={`p-2.5 rounded-xl flex items-center gap-2 text-[11px] ${dark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                <HelpCircle size={14} className="shrink-0" />
                <span>After granting permission, return to ChatMe and tap "Retry Permission".</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSettingsGuide(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${
                  dark ? "border-gray-800 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSettingsGuide(false);
                  requestPermissionAndLoad();
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition shadow-md flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Retry Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
