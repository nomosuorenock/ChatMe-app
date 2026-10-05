import { Contacts, PermissionStatus } from "@capacitor-community/contacts";

export interface DeviceContactItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  firstLetter: string;
  photoThumbnail?: string;
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

export function isPhoneMatch(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const n1 = normalizePhoneNumber(p1);
  const n2 = normalizePhoneNumber(p2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (n1.length >= 7 && n2.length >= 7) {
    return n1.slice(-10) === n2.slice(-10);
  }
  return false;
}

export function getFirstLetter(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  const char = trimmed.charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(char) ? char : "?";
}

export async function checkContactsPermission(): Promise<PermissionStatus | null> {
  try {
    return await Contacts.checkPermissions();
  } catch (err) {
    console.warn("Capacitor Contacts checkPermissions not available:", err);
    return null;
  }
}

export async function requestContactsPermission(): Promise<boolean> {
  try {
    const res = await Contacts.requestPermissions();
    return res.contacts === "granted";
  } catch (err) {
    console.warn("Capacitor Contacts requestPermissions failed:", err);
    return false;
  }
}

/**
 * Loads device contacts using @capacitor-community/contacts.
 * Falls back to Web Contacts API if available, or returns mock/test entries for preview.
 */
export async function loadDeviceContacts(): Promise<DeviceContactItem[]> {
  try {
    // 1. Try Capacitor Native Contacts
    let perm = await checkContactsPermission();
    if (!perm || perm.contacts !== "granted") {
      const granted = await requestContactsPermission();
      if (!granted && perm?.contacts === "denied") {
        throw new Error("READ_CONTACTS permission denied by user");
      }
    }

    const result = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
        emails: true,
        image: true
      }
    });

    if (result && result.contacts && result.contacts.length > 0) {
      const parsed: DeviceContactItem[] = [];

      result.contacts.forEach((c, index) => {
        const name =
          c.name?.display ||
          [c.name?.given, c.name?.family].filter(Boolean).join(" ") ||
          "Contact";
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
      return parsed;
    }
  } catch (nativeErr: any) {
    console.log("Capacitor native contact fetch error or unsupported:", nativeErr);
  }

  // 2. Try Web Contacts Picker API (only available in top-level browsing contexts, forbidden in iframes)
  const isTopFrame = typeof window !== "undefined" && window.self === window.top;
  if (isTopFrame && typeof navigator !== "undefined" && "contacts" in navigator && typeof (navigator.contacts as any)?.select === "function") {
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

        parsed.sort((a, b) => a.name.localeCompare(b.name));
        return parsed;
      }
    } catch (webErr: any) {
      // Gracefully handle cancellation or top-frame restriction
      console.log("Web contacts picker notice:", webErr?.message || "dismissed");
    }
  }

  // 3. Realistic mock contacts for preview testing in browser environments
  const fallbackContacts: DeviceContactItem[] = [
    { id: "cnt_1", name: "Alice Johnson", phone: "+1 (555) 019-2831", email: "alice@example.com", firstLetter: "A" },
    { id: "cnt_2", name: "Bob Smith", phone: "+1 (555) 012-3456", email: "bob@example.com", firstLetter: "B" },
    { id: "cnt_3", name: "Charlie Davis", phone: "+1 (555) 018-9988", email: "charlie@example.com", firstLetter: "C" },
    { id: "cnt_4", name: "Diana Prince", phone: "+1 (555) 014-7722", email: "diana@example.com", firstLetter: "D" },
    { id: "cnt_5", name: "Elena Rostova", phone: "+1 (555) 017-3344", email: "elena@example.com", firstLetter: "E" },
    { id: "cnt_6", name: "Frank Miller", phone: "+1 (555) 013-6677", email: "frank@example.com", firstLetter: "F" }
  ];

  return fallbackContacts;
}
