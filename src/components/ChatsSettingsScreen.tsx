import React from "react";
import {
  ArrowLeft,
  Image as ImageIcon,
  CloudUpload,
  ChevronRight,
  HardDrive,
  MessageSquare,
  Sparkles
} from "lucide-react";
import { formatBytes } from "../services/backupService";

interface ChatsSettingsScreenProps {
  dark: boolean;
  onBack: () => void;
  goWallpaper: () => void;
  goBackupRestore: () => void;
  wallpaperLabel: string;
  currentUser: any;
}

export function ChatsSettingsScreen({
  dark,
  onBack,
  goWallpaper,
  goBackupRestore,
  wallpaperLabel,
  currentUser
}: ChatsSettingsScreenProps) {
  const lastBackupStr = currentUser?.id 
    ? localStorage.getItem(`chatme_last_backup_time_${currentUser.id}`)
    : null;
  const lastBackupFormatted = lastBackupStr
    ? new Date(lastBackupStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : 'Never';

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${dark ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 flex items-center gap-3 px-4 py-3.5 border-b shadow-sm ${
        dark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
      }`}>
        <button
          onClick={onBack}
          className={`p-2 -ml-1 rounded-full transition ${
            dark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"
          }`}
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-base font-bold leading-tight">Chats</h1>
          <p className="text-[11px] text-gray-400">Themes, wallpapers & chat backups</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 max-w-xl mx-auto w-full">
        {/* Display Settings */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-gray-400 px-1 uppercase tracking-wider">Display</span>
          
          <button
            onClick={goWallpaper}
            className={`flex items-center justify-between rounded-2xl p-4 transition border shadow-sm ${
              dark 
                ? "bg-gray-900 border-gray-800 hover:bg-gray-800/80" 
                : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <ImageIcon size={20} />
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold block">Chat Wallpaper</span>
                <span className="text-xs text-gray-400">Custom background or preset colors</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">{wallpaperLabel}</span>
              <ChevronRight size={17} className="text-gray-400" />
            </div>
          </button>
        </div>

        {/* Backup & Vault */}
        <div className="flex flex-col gap-1 mt-2">
          <span className="text-[11px] font-semibold text-gray-400 px-1 uppercase tracking-wider">Storage & Vault</span>
          
          <button
            onClick={goBackupRestore}
            className={`flex items-center justify-between rounded-2xl p-4 transition border shadow-sm ${
              dark 
                ? "bg-gray-900 border-gray-800 hover:bg-gray-800/80" 
                : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CloudUpload size={20} />
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold block">Backup & Restore</span>
                <span className="text-xs text-gray-400">Back up and restore your ChatMe data</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {lastBackupStr ? `Last: ${lastBackupFormatted}` : 'Setup'}
              </span>
              <ChevronRight size={17} className="text-gray-400" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
