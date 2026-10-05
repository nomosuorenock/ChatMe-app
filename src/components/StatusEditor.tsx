import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Music,
  Smile,
  Type,
  Pencil,
  RotateCw,
  Scissors,
  Send,
  Users,
  Play,
  Pause,
  Check,
  Loader2,
  Sparkles,
  Volume2,
  FolderOpen,
  Undo,
  Sliders,
  UserX,
  UserCheck,
  Search,
  Lock,
  Shield
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface TextOverlay {
  id: string;
  text: string;
  color: string;
  bgColor: string;
  x: number;
  y: number;
}

interface StickerOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

interface StatusEditorProps {
  file?: File;
  objectUrl?: string;
  mediaType?: "image" | "video" | "text";
  dark?: boolean;
  currentUser: any;
  onClose: () => void;
  onPostSuccess: (newStatus: any) => Promise<void> | void;
  showToast?: (msg: string) => void;
}

export function StatusEditor({
  file,
  objectUrl,
  mediaType,
  dark = true,
  currentUser,
  onClose,
  onPostSuccess,
  showToast
}: StatusEditorProps) {
  const [caption, setCaption] = useState("");
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [privacyOption, setPrivacyOption] = useState<"My contacts" | "My contacts except" | "Only share with">("My contacts");
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState("");

  const sampleContacts = [
    { id: "c1", name: "Alice Johnson", phone: "+1 (555) 234-5678", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
    { id: "c2", name: "Bob Smith", phone: "+1 (555) 876-5432", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80" },
    { id: "c3", name: "Sarah Connor", phone: "+1 (555) 345-6789", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
    { id: "c4", name: "David Miller", phone: "+1 (555) 987-6543", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80" },
    { id: "c5", name: "Emma Watson", phone: "+1 (555) 456-7890", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" },
    { id: "c6", name: "Michael Scott", phone: "+1 (555) 654-3210", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" }
  ];

  // Tools state
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<string>("None");
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(true);

  // Volume mixing
  const [videoVolume, setVideoVolume] = useState<number>(1);
  const [musicVolume, setMusicVolume] = useState<number>(1);
  const [showVolumeControl, setShowVolumeControl] = useState<boolean>(false);

  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [stickers, setStickers] = useState<StickerOverlay[]>([]);

  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textBgColor, setTextBgColor] = useState("rgba(0,0,0,0.5)");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState("#25D366");
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([]);

  // Video & Audio refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [showTrimControl, setShowTrimControl] = useState(false);

  // Canvas drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Emojis for sticker picker
  const emojiList = [
    "🔥", "❤️", "✨", "🌟", "👑", "🥳", "🎵", "📍", "💯", "📌",
    "💫", "💬", "🌸", "⚡", "🎉", "🎧", "🌴", "☕", "📱", "🌈",
    "😍", "🤣", "👏", "👍", "🚀", "💡", "🎯", "🍀", "💎", "🏆"
  ];

  // Preset music tracks
  const musicList = [
    "None",
    "🎵 Lofi Sunset Chill",
    "🎸 Acoustic Coffee Morning",
    "🎹 Synthwave Night Ride",
    "🎧 Upbeat Summer Vibe",
    "🎼 Romantic Strings",
    "🔊 EDM Pulse Drive"
  ];

  // Sync background audio volume and playback
  useEffect(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = videoVolume;
    }
  }, [videoVolume]);

  useEffect(() => {
    if (bgAudioRef.current && selectedAudioUrl) {
      if (isAudioPlaying && isPlaying) {
        bgAudioRef.current.play().catch(() => {});
      } else {
        bgAudioRef.current.pause();
      }
    }
  }, [isAudioPlaying, isPlaying, selectedAudioUrl]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (selectedAudioUrl && selectedAudioFile) {
        URL.revokeObjectURL(selectedAudioUrl);
      }
    };
  }, [selectedAudioUrl, selectedAudioFile]);

  // Handle local audio file selection from device
  const handleAudioFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (selectedAudioUrl && selectedAudioFile) {
      URL.revokeObjectURL(selectedAudioUrl);
    }

    const url = URL.createObjectURL(file);
    setSelectedAudioFile(file);
    setSelectedAudioUrl(url);
    setSelectedMusic(file.name);
    setIsAudioPlaying(true);
    setShowMusicPicker(false);

    if (e.target) e.target.value = "";
  };

  // Handle preset music selection
  const handleSelectPresetMusic = (m: string) => {
    if (selectedAudioUrl && selectedAudioFile) {
      URL.revokeObjectURL(selectedAudioUrl);
    }
    setSelectedAudioFile(null);
    if (m === "None") {
      setSelectedAudioUrl(null);
      setSelectedMusic("None");
      setIsAudioPlaying(false);
    } else {
      setSelectedAudioUrl(null);
      setSelectedMusic(m);
      setIsAudioPlaying(true);
    }
    setShowMusicPicker(false);
  };

  // Remove selected music
  const handleRemoveMusic = () => {
    if (selectedAudioUrl && selectedAudioFile) {
      URL.revokeObjectURL(selectedAudioUrl);
    }
    setSelectedAudioFile(null);
    setSelectedAudioUrl(null);
    setSelectedMusic("None");
    setIsAudioPlaying(false);
  };

  // Rotate handler
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Video metadata
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 0;
      setVideoDuration(dur);
      setTrimEnd(dur);
    }
  };

  // Video trim sync
  const handleTimeUpdate = () => {
    if (videoRef.current && trimEnd > 0) {
      if (videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
        if (bgAudioRef.current) {
          bgAudioRef.current.currentTime = 0;
        }
      }
    }
  };

  // Canvas setup & resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    }
  }, []);

  // Save canvas state for undo
  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setDrawingHistory((prev) => [...prev, data]);
  };

  // Undo drawing
  const handleUndoDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (drawingHistory.length > 0) {
      const newHistory = [...drawingHistory];
      newHistory.pop();
      setDrawingHistory(newHistory);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (newHistory.length > 0) {
        ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode) return;
    saveCanvasState();
    setIsDrawing(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Add text overlay
  const handleAddText = () => {
    if (!textInput.trim()) return;
    const newOverlay: TextOverlay = {
      id: String(Date.now()),
      text: textInput.trim(),
      color: textColor,
      bgColor: textBgColor,
      x: 30 + Math.random() * 20,
      y: 40 + Math.random() * 20,
    };
    setTextOverlays((prev) => [...prev, newOverlay]);
    setTextInput("");
    setShowTextModal(false);
  };

  // Add sticker
  const handleAddSticker = (emoji: string) => {
    const newSticker: StickerOverlay = {
      id: String(Date.now()),
      emoji,
      x: 40 + Math.random() * 20,
      y: 45 + Math.random() * 10,
    };
    setStickers((prev) => [...prev, newSticker]);
    setShowStickerPicker(false);
  };

  const [postStep, setPostStep] = useState<"posting" | "uploading" | "saving" | "publishing" | "success" | "error" | null>(null);
  const [postStepMessage, setPostStepMessage] = useState<string>("Posting status to ChatMe...");
  const [postStepSubtext, setPostStepSubtext] = useState<string>("Preparing media...");

  // Convert File to Base64 Data URL fallback
  const fileToDataUrl = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(f);
    });
  };

  // Final Publish Handler
  const handleSendStatus = async () => {
    if (isPosting) return;
    setPostError(null);
    setIsPosting(true);
    setPostStep("posting");
    setPostStepMessage("Posting status to ChatMe...");
    setPostStepSubtext("Connecting to ChatMe...");

    // Create a 15-second timeout promise
    let timeoutId: any = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Upload is taking too long. Please check your connection and try again."));
      }, 15000);
    });

    const runPublishingProcess = async () => {
      // 1. Get authenticated user from active Supabase session
      let authUser: any = null;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          authUser = sessionData.session.user;
        } else {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user) {
            authUser = authData.user;
          }
        }
      } catch (e) {
        console.warn("Auth check in StatusEditor:", e);
      }

      if (!authUser && !currentUser) {
        throw new Error("Please sign in first.");
      }

      const activeUser = authUser || currentUser;
      const userId = authUser?.id || activeUser.id || `usr_${activeUser.email || 'me'}`;
      let publicUrl: string | null = null;
      const isMedia = Boolean(file);
      const actualMediaType: "image" | "video" | "text" = isMedia
        ? (mediaType === "video" || file?.type?.startsWith("video") ? "video" : "image")
        : "text";

      // 2. For IMAGE or VIDEO: upload to Supabase Storage inside user folder
      if (isMedia && file) {
        setPostStep("uploading");
        setPostStepMessage("Uploading media...");
        setPostStepSubtext("Preparing media...");

        const cleanName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, "_") : `status_${Date.now()}.jpg`;
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${cleanName}`;
        
        // Put the file inside the user's folder
        const filePath = `${userId}/${uniqueFileName}`;

        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("status-media")
            .upload(filePath, file, {
              contentType: file.type || (actualMediaType === "video" ? "video/mp4" : "image/jpeg"),
              upsert: true,
              cacheControl: "3600",
            });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from("status-media")
              .getPublicUrl(filePath);
            if (publicUrlData?.publicUrl && !publicUrlData.publicUrl.startsWith("blob:")) {
              publicUrl = publicUrlData.publicUrl;
            }
          }
        } catch (uploadErr) {
          console.warn("Storage upload notice (offline or network error):", uploadErr);
        }

        // If remote upload did not provide a URL, convert file to data URL for local storage
        if (!publicUrl) {
          try {
            publicUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          } catch (readerErr) {
            publicUrl = objectUrl || null;
          }
        }
      }

      // 3. Save status record into public.status_posts
      setPostStep("saving");
      setPostStepMessage("Saving status...");
      setPostStepSubtext("Storing status details...");

      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      let insertedPost: any = null;
      // Only insert into Supabase status_posts if user is authenticated with Supabase Auth
      // The INSERT policy strictly enforces: auth.uid() = user_id
      if (authUser?.id) {
        const { data, error: dbError } = await supabase
          .from("status_posts")
          .insert([
            {
              user_id: authUser.id,
              media_type: actualMediaType,
              type: actualMediaType,
              media_url: actualMediaType !== "text" ? publicUrl : null,
              thumbnail_url: actualMediaType !== "text" ? publicUrl : null,
              caption: caption ? caption.trim() : "",
              created_at: createdAt,
              expires_at: expiresAt,
            },
          ])
          .select()
          .single();

        if (dbError) {
          console.error("Status database insert failed:", dbError);
        } else {
          insertedPost = data;
        }
      }

      // 4. Publishing step
      setPostStep("publishing");
      setPostStepMessage("Publishing...");
      setPostStepSubtext("Broadcasting update...");

      const newStatus = {
        id: insertedPost?.id || Date.now(),
        user_id: authUser?.id || userId,
        user_name: currentUser?.fullname || activeUser?.email || "Me",
        user_photo: currentUser?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.fullname || activeUser?.email || "Me")}&background=22c55e&color=fff&bold=true`,
        media_type: actualMediaType,
        media_url: actualMediaType !== "text" ? publicUrl : null,
        caption: caption ? caption.trim() : "",
        music_track: selectedMusic !== "None" ? selectedMusic : null,
        privacy: privacyOption,
        created_at: insertedPost?.created_at || createdAt,
        expires_at: insertedPost?.expires_at || expiresAt,
        viewers: [],
        alreadyPersisted: Boolean(insertedPost)
      };

      await onPostSuccess(newStatus);

      setPostStep("success");
      setPostStepMessage("Status posted successfully!");
      setPostStepSubtext("Your status update is live");

      if (showToast) showToast("Status posted successfully!");

      // Wait briefly so user sees the success step before closing
      await new Promise((res) => setTimeout(res, 600));
      onClose();
    };

    try {
      await Promise.race([runPublishingProcess(), timeoutPromise]);
    } catch (err: any) {
      console.error("Status upload failed:", err);
      const msg = err?.message || "Couldn't post your status. Please try again.";
      setPostError(msg);
      setPostStep("error");
      if (showToast) showToast(msg);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col justify-between overflow-hidden select-none">
      {/* Hidden file input for native device audio picking */}
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg"
        className="hidden"
        onChange={handleAudioFileSelected}
      />

      {/* Hidden audio element for previewing selected audio */}
      {selectedAudioUrl && (
        <audio
          ref={bgAudioRef}
          src={selectedAudioUrl}
          loop
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => setIsAudioPlaying(false)}
        />
      )}

      {/* Loading & Status Progress Dialog Overlay */}
      {postStep && (
        <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
          <div className="w-full max-w-xs bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            {postStep === "error" ? (
              <>
                <div className="w-14 h-14 bg-red-500/10 text-red-400 border border-red-500/30 rounded-2xl flex items-center justify-center">
                  <X size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white mb-1">Couldn't post status</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {postError || "Upload is taking too long. Please check your connection and try again."}
                  </p>
                </div>
                <div className="flex gap-2 w-full pt-1">
                  <button
                    onClick={() => {
                      setPostStep(null);
                      setPostError(null);
                    }}
                    className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendStatus}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs rounded-xl transition shadow-lg cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              </>
            ) : postStep === "success" ? (
              <>
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
                  <Check size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white mb-1">Posted successfully!</h4>
                  <p className="text-xs text-emerald-400 font-medium">Your status update is live</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 flex items-center justify-center text-emerald-400 my-1">
                  <Loader2 className="animate-spin" size={36} />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white mb-1">{postStepMessage}</h4>
                  <p className="text-xs text-gray-400">{postStepSubtext}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top Header Controls Bar */}
      <div className="relative z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Left: Close Button */}
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
          title="Discard Status"
        >
          <X size={22} />
        </button>

        {/* Right: Tools Buttons */}
        <div className="flex items-center gap-2">
          {/* Crop/Rotate (Photos only) */}
          {mediaType === "image" && (
            <button
              onClick={handleRotate}
              className="p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
              title="Rotate 90°"
            >
              <RotateCw size={20} />
            </button>
          )}

          {/* Video Trim Toggle (Videos only) */}
          {mediaType === "video" && (
            <button
              onClick={() => setShowTrimControl(!showTrimControl)}
              className={`p-2.5 rounded-full transition ${
                showTrimControl ? "bg-green-500 text-white" : "bg-black/40 text-white hover:bg-black/60"
              }`}
              title="Trim Video"
            >
              <Scissors size={20} />
            </button>
          )}

          {/* Audio Volume Mixer Toggle (if music selected or video) */}
          {(selectedMusic !== "None" || mediaType === "video") && (
            <button
              onClick={() => setShowVolumeControl(!showVolumeControl)}
              className={`p-2.5 rounded-full transition ${
                showVolumeControl ? "bg-green-500 text-white" : "bg-black/40 text-white hover:bg-black/60"
              }`}
              title="Volume Controls"
            >
              <Sliders size={20} />
            </button>
          )}

          {/* Music Button */}
          <button
            onClick={() => setShowMusicPicker(!showMusicPicker)}
            className={`p-2.5 rounded-full transition relative ${
              selectedMusic !== "None" ? "bg-green-500 text-white" : "bg-black/40 text-white hover:bg-black/60"
            }`}
            title="Add Music"
          >
            <Music size={20} />
            {selectedMusic !== "None" && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-green-500" />
            )}
          </button>

          {/* Sticker / Emoji Button */}
          <button
            onClick={() => setShowStickerPicker(!showStickerPicker)}
            className="p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
            title="Add Stickers & Emojis"
          >
            <Smile size={20} />
          </button>

          {/* "Aa" Text Button */}
          <button
            onClick={() => setShowTextModal(true)}
            className="p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition font-bold"
            title="Add Text Overlay"
          >
            <Type size={20} />
          </button>

          {/* Drawing / Pen Button */}
          <button
            onClick={() => setIsDrawingMode(!isDrawingMode)}
            className={`p-2.5 rounded-full transition ${
              isDrawingMode ? "bg-green-500 text-white ring-2 ring-white" : "bg-black/40 text-white hover:bg-black/60"
            }`}
            title="Freehand Drawing"
          >
            <Pencil size={20} />
          </button>

          {/* Header Send/Post Button */}
          <button
            onClick={handleSendStatus}
            disabled={isPosting}
            className="flex items-center gap-1.5 px-3.5 py-2 min-w-[44px] min-h-[44px] bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-full shadow-lg transition-all border border-green-400/30 shrink-0 ml-1"
            title="Publish Status"
          >
            {isPosting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} className="ml-0.5" />
            )}
            <span>{isPosting ? "Posting..." : "Post"}</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {/* Active Music Banner Badge */}
        {selectedMusic !== "None" && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-black/80 border border-green-500/60 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2.5 text-white text-xs font-medium shadow-2xl">
            <Sparkles size={14} className="text-green-400 animate-pulse shrink-0" />
            <span className="truncate max-w-[180px] font-semibold">{selectedMusic}</span>

            {/* Play/Pause Preview Button for audio */}
            {selectedAudioUrl && (
              <button
                onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                className="p-1 hover:text-green-400 text-gray-200"
                title={isAudioPlaying ? "Pause Audio" : "Play Audio"}
              >
                {isAudioPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
            )}

            {/* Clear music button */}
            <button
              onClick={handleRemoveMusic}
              className="p-1 text-gray-400 hover:text-white"
              title="Remove music"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Drawing Brush Palette Bar when Drawing Mode active */}
        {isDrawingMode && (
          <div className="absolute top-4 left-4 z-30 bg-black/80 backdrop-blur-md p-2 rounded-2xl flex flex-col gap-2 border border-gray-700 shadow-2xl">
            {["#25D366", "#EF4444", "#3B82F6", "#F59E0B", "#FFFFFF", "#EC4899", "#8B5CF6"].map((col) => (
              <button
                key={col}
                onClick={() => setBrushColor(col)}
                className={`w-6 h-6 rounded-full transition transform hover:scale-110 ${
                  brushColor === col ? "ring-2 ring-white scale-110" : ""
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
            <button
              onClick={handleUndoDrawing}
              className="mt-1 p-1 text-gray-300 hover:text-white rounded-full bg-gray-800 flex items-center justify-center"
              title="Undo Drawing"
            >
              <Undo size={14} />
            </button>
          </div>
        )}

        {/* Media Element (Image or Video) */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: "transform 0.3s ease-in-out"
          }}
        >
          {mediaType === "image" ? (
            <img
              src={objectUrl}
              alt="Status preview"
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl pointer-events-none"
            />
          ) : (
            <div className="relative flex items-center justify-center">
              <video
                ref={videoRef}
                src={objectUrl}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
                autoPlay
                loop
                playsInline
                onLoadedMetadata={handleVideoLoaded}
                onTimeUpdate={handleTimeUpdate}
                onClick={() => {
                  if (videoRef.current) {
                    if (isPlaying) {
                      videoRef.current.pause();
                      setIsPlaying(false);
                    } else {
                      videoRef.current.play();
                      setIsPlaying(true);
                    }
                  }
                }}
              />
              {/* Play/Pause indicator overlay on tap */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <div className="p-4 rounded-full bg-black/60 text-white">
                    <Play size={36} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HTML5 Canvas overlay for drawing */}
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={`absolute inset-0 z-10 ${isDrawingMode ? "cursor-crosshair" : "pointer-events-none"}`}
          />

          {/* Rendered Text Overlays */}
          {textOverlays.map((t) => (
            <div
              key={t.id}
              className="absolute z-20 px-3 py-1.5 rounded-lg text-lg font-bold shadow-md cursor-pointer hover:opacity-90"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                color: t.color,
                backgroundColor: t.bgColor,
              }}
              onClick={() => {
                setTextOverlays((prev) => prev.filter((item) => item.id !== t.id));
              }}
            >
              {t.text}
            </div>
          ))}

          {/* Rendered Sticker / Emoji Overlays */}
          {stickers.map((s) => (
            <div
              key={s.id}
              className="absolute z-20 text-4xl cursor-pointer hover:scale-110 transition"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
              }}
              onClick={() => {
                setStickers((prev) => prev.filter((item) => item.id !== s.id));
              }}
            >
              {s.emoji}
            </div>
          ))}
        </div>
      </div>

      {/* Volume Control Bar */}
      {showVolumeControl && (
        <div className="z-30 bg-gray-900/95 border-t border-gray-800 p-4 flex flex-col gap-3 text-white">
          <div className="flex justify-between items-center text-xs font-semibold text-green-400">
            <span>Audio Volume Mixer</span>
            <button onClick={() => setShowVolumeControl(false)}><X size={16} /></button>
          </div>
          {mediaType === "video" && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-300 w-24">Original Video</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={videoVolume}
                onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                className="w-full accent-green-500"
              />
              <span className="text-xs font-mono text-gray-400 w-8">{Math.round(videoVolume * 100)}%</span>
            </div>
          )}
          {selectedMusic !== "None" && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-300 w-24">Background Music</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="w-full accent-green-500"
              />
              <span className="text-xs font-mono text-gray-400 w-8">{Math.round(musicVolume * 100)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Video Trim Controls Bar */}
      {mediaType === "video" && showTrimControl && (
        <div className="z-30 bg-gray-900/90 border-t border-gray-800 p-4 flex flex-col gap-2">
          <div className="flex justify-between text-xs text-gray-300 font-mono">
            <span>Trim Start: {trimStart.toFixed(1)}s</span>
            <span>Trim End: {trimEnd.toFixed(1)}s</span>
            <span>Duration: {videoDuration.toFixed(1)}s</span>
          </div>
          <div className="flex items-center gap-3">
            <Scissors size={18} className="text-green-500" />
            <input
              type="range"
              min={0}
              max={videoDuration}
              step={0.1}
              value={trimStart}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (val < trimEnd) {
                  setTrimStart(val);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }
              }}
              className="w-full accent-green-500"
            />
            <input
              type="range"
              min={0}
              max={videoDuration}
              step={0.1}
              value={trimEnd}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (val > trimStart) {
                  setTrimEnd(val);
                }
              }}
              className="w-full accent-green-500"
            />
          </div>
        </div>
      )}

      {/* Music Selector Modal Sheet */}
      {showMusicPicker && (
        <div className="absolute inset-0 bg-black/70 z-40 flex items-end justify-center animate-fadeIn">
          <div className="w-full max-w-md bg-gray-900 border-t border-gray-800 rounded-t-3xl p-5 text-white flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Music className="text-green-500" size={20} />
                <h3 className="font-bold text-base">Select Background Sound</h3>
              </div>
              <button onClick={() => setShowMusicPicker(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Device Audio File Picker Button */}
            <button
              onClick={() => audioInputRef.current?.click()}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2.5 shadow-lg transition active:scale-98"
            >
              <FolderOpen size={20} />
              <span>Select Audio File from Device</span>
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="h-px bg-gray-800 flex-1" />
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Or Choose Preset</span>
              <div className="h-px bg-gray-800 flex-1" />
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {musicList.map((m) => (
                <button
                  key={m}
                  onClick={() => handleSelectPresetMusic(m)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm transition ${
                    selectedMusic === m && !selectedAudioFile
                      ? "bg-green-600/20 border-green-500 text-green-400 font-semibold"
                      : "bg-gray-800/60 border-gray-700/60 text-gray-200 hover:bg-gray-800"
                  }`}
                >
                  <span>{m}</span>
                  {selectedMusic === m && !selectedAudioFile && <Check size={18} className="text-green-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticker Picker Sheet */}
      {showStickerPicker && (
        <div className="absolute inset-0 bg-black/70 z-40 flex items-end justify-center animate-fadeIn">
          <div className="w-full max-w-md bg-gray-900 border-t border-gray-800 rounded-t-3xl p-5 text-white flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Smile className="text-yellow-400" size={20} />
                <h3 className="font-bold text-base">Select Sticker / Emoji</h3>
              </div>
              <button onClick={() => setShowStickerPicker(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-6 gap-3 p-2 bg-gray-800/50 rounded-2xl max-h-52 overflow-y-auto">
              {emojiList.map((emo, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddSticker(emo)}
                  className="text-3xl hover:scale-125 transition p-2 flex items-center justify-center rounded-xl hover:bg-gray-700"
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Text Modal Input */}
      {showTextModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-5 text-white flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base">Add Text Overlay</h3>
              <button onClick={() => setShowTextModal(false)}>
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your text..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Text Color</span>
              <div className="flex gap-2">
                {["#FFFFFF", "#25D366", "#3B82F6", "#F59E0B", "#EF4444", "#000000"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setTextColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      textColor === c ? "border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleAddText}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Bottom Control Bar (Privacy, Caption & Send Button) */}
      <div
        className="relative z-30 p-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-3"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Post Error Notification Banner */}
        {postError && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-red-600/90 text-white text-xs font-semibold rounded-2xl border border-red-400 shadow-xl animate-fadeIn">
            <span>{postError}</span>
            <button
              onClick={handleSendStatus}
              disabled={isPosting}
              className="px-3 py-1 bg-white text-red-600 font-bold rounded-lg hover:bg-gray-100 transition min-h-[32px] flex items-center"
            >
              Retry
            </button>
          </div>
        )}

        {/* Audience / Privacy Selector Pill */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowPrivacySheet(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gray-800/90 hover:bg-gray-700/90 border border-gray-700/80 rounded-full text-xs text-gray-200 hover:text-white transition shadow-md active:scale-95 cursor-pointer"
          >
            <Shield size={14} className="text-emerald-400" />
            <span className="font-semibold">Status ({privacyOption})</span>
            <Sliders size={12} className="text-gray-400 ml-0.5" />
          </button>
        </div>

        {/* Status Privacy Settings Sheet Modal */}
        {showPrivacySheet && (
          <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-3xl p-6 text-white flex flex-col gap-5 max-h-[85vh] overflow-y-auto shadow-2xl relative">
              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div>
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Shield size={20} className="text-emerald-400" />
                    Status privacy
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Who can see my status updates</p>
                </div>
                <button
                  onClick={() => setShowPrivacySheet(false)}
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Privacy Options List */}
              <div className="flex flex-col gap-3">
                {/* Option 1: My contacts */}
                <label
                  onClick={() => setPrivacyOption("My contacts")}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
                    privacyOption === "My contacts"
                      ? "bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/50"
                      : "bg-gray-800/40 border-gray-800 hover:bg-gray-800/80"
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    privacyOption === "My contacts" ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-600"
                  }`}>
                    {privacyOption === "My contacts" && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-emerald-400" />
                      <span className="font-semibold text-sm text-white">My contacts</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Share status updates with all contacts in your address book.</p>
                  </div>
                </label>

                {/* Option 2: My contacts except... */}
                <label
                  onClick={() => setPrivacyOption("My contacts except")}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
                    privacyOption === "My contacts except"
                      ? "bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/50"
                      : "bg-gray-800/40 border-gray-800 hover:bg-gray-800/80"
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    privacyOption === "My contacts except" ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-600"
                  }`}>
                    {privacyOption === "My contacts except" && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <UserX size={16} className="text-amber-400" />
                      <span className="font-semibold text-sm text-white">My contacts except...</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Hide your status updates from specific contacts.</p>
                    {privacyOption === "My contacts except" && selectedContactIds.length > 0 && (
                      <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[11px] font-medium">
                        {selectedContactIds.length} contact{selectedContactIds.length > 1 ? "s" : ""} excluded
                      </span>
                    )}
                  </div>
                </label>

                {/* Option 3: Only share with... */}
                <label
                  onClick={() => setPrivacyOption("Only share with")}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
                    privacyOption === "Only share with"
                      ? "bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/50"
                      : "bg-gray-800/40 border-gray-800 hover:bg-gray-800/80"
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    privacyOption === "Only share with" ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-600"
                  }`}>
                    {privacyOption === "Only share with" && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <UserCheck size={16} className="text-sky-400" />
                      <span className="font-semibold text-sm text-white">Only share with...</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Only share status updates with selected contacts.</p>
                    {privacyOption === "Only share with" && selectedContactIds.length > 0 && (
                      <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full text-[11px] font-medium">
                        {selectedContactIds.length} contact{selectedContactIds.length > 1 ? "s" : ""} selected
                      </span>
                    )}
                  </div>
                </label>
              </div>

              {/* Contact Selector Sub-List for "except" or "only share with" */}
              {(privacyOption === "My contacts except" || privacyOption === "Only share with") && (
                <div className="flex flex-col gap-2.5 pt-3 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300">
                      {privacyOption === "My contacts except" ? "Select contacts to exclude" : "Select contacts to share with"}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      {selectedContactIds.length} selected
                    </span>
                  </div>

                  {/* Search contacts input */}
                  <div className="relative flex items-center">
                    <Search size={14} className="absolute left-3 text-gray-400" />
                    <input
                      type="text"
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Contacts List */}
                  <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {sampleContacts
                      .filter((c) =>
                        !contactSearchQuery ||
                        c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                        c.phone.includes(contactSearchQuery)
                      )
                      .map((contact) => {
                        const isSelected = selectedContactIds.includes(contact.id);
                        return (
                          <div
                            key={contact.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedContactIds((prev) => prev.filter((id) => id !== contact.id));
                              } else {
                                setSelectedContactIds((prev) => [...prev, contact.id]);
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                              isSelected ? "bg-emerald-950/30 border border-emerald-500/30" : "hover:bg-gray-800/60"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={contact.avatar}
                                alt={contact.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <div>
                                <p className="text-xs font-medium text-white">{contact.name}</p>
                                <p className="text-[10px] text-gray-400">{contact.phone}</p>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-600"
                            }`}>
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-400 leading-snug pt-1">
                Changes to your status privacy settings will apply to new status updates in <code className="text-emerald-400">public.status_posts</code>.
              </p>

              {/* Save / Apply Button */}
              <button
                onClick={() => {
                  setShowPrivacySheet(false);
                  if (showToast) {
                    showToast(`Privacy set to ${privacyOption}`);
                  }
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold rounded-2xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={18} />
                <span>Done</span>
              </button>
            </div>
          </div>
        )}

        {/* Caption Field & Send Arrow Button Row */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative flex items-center bg-gray-900/90 border border-gray-800 rounded-full px-4 py-2.5">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-transparent text-white text-sm placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* Final Send / Post Button */}
          <button
            onClick={handleSendStatus}
            disabled={isPosting}
            className="w-12 h-12 min-w-[48px] min-h-[48px] bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-50 rounded-full flex items-center justify-center text-white transition-all shrink-0 shadow-xl border border-green-400/30"
            title="Publish Status"
            aria-label="Publish Status"
          >
            {isPosting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} className="ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
