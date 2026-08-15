import { Contacts } from "@capacitor-community/contacts";

export type PermissionType = "contacts" | "camera" | "microphone" | "photos" | "notifications" | "location";

export interface PermissionDetail {
  id: PermissionType;
  title: string;
  description: string;
  iconName: string;
  requiredFor: string;
}

export const PERMISSION_DEFINITIONS: PermissionDetail[] = [
  {
    id: "contacts",
    title: "Contacts",
    description: "Used to find which of your phone contacts use ChatMe and quickly start chats.",
    iconName: "BookUser",
    requiredFor: "Contact discovery and starting conversations"
  },
  {
    id: "camera",
    title: "Camera",
    description: "Used to take photos and videos for status updates, chat media, and video calls.",
    iconName: "Camera",
    requiredFor: "Photos, video sharing, and video calls"
  },
  {
    id: "microphone",
    title: "Microphone",
    description: "Used to record voice messages, voice notes, and make audio/video calls.",
    iconName: "Mic",
    requiredFor: "Voice notes and voice/video calling"
  },
  {
    id: "photos",
    title: "Photos & Media",
    description: "Used to send images, videos, and documents from your device gallery.",
    iconName: "Image",
    requiredFor: "Sharing photos and media from gallery"
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Used to notify you of incoming messages, calls, and status updates.",
    iconName: "Bell",
    requiredFor: "Message alerts and call notifications"
  },
  {
    id: "location",
    title: "Location",
    description: "Used only when you explicitly choose to share your location in chat.",
    iconName: "MapPin",
    requiredFor: "Live or static location sharing in chats"
  }
];

export async function checkPermission(type: PermissionType): Promise<"granted" | "denied" | "prompt"> {
  try {
    if (type === "contacts") {
      try {
        const res = await Contacts.checkPermissions();
        if (res?.contacts === "granted") return "granted";
        if (res?.contacts === "denied") return "denied";
        return "prompt";
      } catch {
        const saved = localStorage.getItem("perm_contacts");
        return saved === "granted" ? "granted" : saved === "denied" ? "denied" : "prompt";
      }
    }

    if (type === "notifications") {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") return "granted";
        if (Notification.permission === "denied") return "denied";
        return "prompt";
      }
      return "granted";
    }

    if (type === "camera") {
      if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
        try {
          const res = await navigator.permissions.query({ name: "camera" as any });
          if (res.state === "granted") return "granted";
          if (res.state === "denied") return "denied";
          return "prompt";
        } catch {
          // fall through
        }
      }
      const saved = localStorage.getItem("perm_camera");
      return saved === "granted" ? "granted" : saved === "denied" ? "denied" : "prompt";
    }

    if (type === "microphone") {
      if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
        try {
          const res = await navigator.permissions.query({ name: "microphone" as any });
          if (res.state === "granted") return "granted";
          if (res.state === "denied") return "denied";
          return "prompt";
        } catch {
          // fall through
        }
      }
      const saved = localStorage.getItem("perm_microphone");
      return saved === "granted" ? "granted" : saved === "denied" ? "denied" : "prompt";
    }

    if (type === "location") {
      if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
        try {
          const res = await navigator.permissions.query({ name: "geolocation" as any });
          if (res.state === "granted") return "granted";
          if (res.state === "denied") return "denied";
          return "prompt";
        } catch {
          // fall through
        }
      }
      const saved = localStorage.getItem("perm_location");
      return saved === "granted" ? "granted" : saved === "denied" ? "denied" : "prompt";
    }

    if (type === "photos") {
      const saved = localStorage.getItem("perm_photos");
      return saved === "denied" ? "denied" : "granted";
    }
  } catch (err) {
    console.warn(`checkPermission error for ${type}:`, err);
  }
  return "prompt";
}

export async function requestPermission(type: PermissionType): Promise<"granted" | "denied"> {
  try {
    if (type === "contacts") {
      try {
        const res = await Contacts.requestPermissions();
        const granted = res?.contacts === "granted";
        localStorage.setItem("perm_contacts", granted ? "granted" : "denied");
        return granted ? "granted" : "denied";
      } catch {
        localStorage.setItem("perm_contacts", "granted");
        return "granted";
      }
    }

    if (type === "notifications") {
      if (typeof window !== "undefined" && "Notification" in window) {
        const res = await Notification.requestPermission();
        return res === "granted" ? "granted" : "denied";
      }
      return "granted";
    }

    if (type === "camera") {
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((track) => track.stop());
          localStorage.setItem("perm_camera", "granted");
          return "granted";
        } catch (err: any) {
          localStorage.setItem("perm_camera", "denied");
          return "denied";
        }
      }
      localStorage.setItem("perm_camera", "granted");
      return "granted";
    }

    if (type === "microphone") {
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
          localStorage.setItem("perm_microphone", "granted");
          return "granted";
        } catch (err: any) {
          localStorage.setItem("perm_microphone", "denied");
          return "denied";
        }
      }
      localStorage.setItem("perm_microphone", "granted");
      return "granted";
    }

    if (type === "location") {
      if (typeof navigator !== "undefined" && "geolocation" in navigator) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              localStorage.setItem("perm_location", "granted");
              resolve("granted");
            },
            () => {
              localStorage.setItem("perm_location", "denied");
              resolve("denied");
            },
            { timeout: 8000 }
          );
        });
      }
      localStorage.setItem("perm_location", "granted");
      return "granted";
    }

    if (type === "photos") {
      localStorage.setItem("perm_photos", "granted");
      return "granted";
    }
  } catch (err) {
    console.warn(`requestPermission error for ${type}:`, err);
  }
  return "denied";
}

export async function checkAllPermissions(): Promise<Record<PermissionType, "granted" | "denied" | "prompt">> {
  const result: Record<PermissionType, "granted" | "denied" | "prompt"> = {
    contacts: "prompt",
    camera: "prompt",
    microphone: "prompt",
    photos: "granted",
    notifications: "prompt",
    location: "prompt"
  };

  const keys: PermissionType[] = ["contacts", "camera", "microphone", "photos", "notifications", "location"];
  for (const k of keys) {
    result[k] = await checkPermission(k);
  }
  return result;
}

/**
 * Launches the Android phone dialer intent for the provided phone number.
 */
export function openPhoneDialer(phoneNumber: string): void {
  const cleaned = (phoneNumber || "").replace(/[^0-9+]/g, "");
  if (!cleaned) return;
  window.location.href = `tel:${cleaned}`;
}

/**
 * Launches the Android system share sheet or web fallback.
 */
export async function shareContentViaAndroid(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      if ((err as any)?.name !== "AbortError") {
        console.warn("Share failed:", err);
      }
    }
  }
  return false;
}

/**
 * Attempts to launch Android App Settings for ChatMe or returns instructions.
 */
export function openAndroidAppSettings(): void {
  try {
    // Standard mobile app settings intent URI
    window.location.href = "app-settings:";
  } catch (err) {
    console.log("Could not open native app settings directly:", err);
  }
}

