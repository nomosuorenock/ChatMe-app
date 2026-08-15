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
  Sliders
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
  file: File;
  objectUrl: string;
  mediaType: "image" | "video";
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
  const [privacyOption, setPrivacyOption] = useState("My contacts");
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);

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

  // Final Publish Handler
  const handleSendStatus = async () => {
    setIsPosting(true);
    try {
      let finalMediaUrl = objectUrl;
      let finalAudioUrl: string | null = null;

      // 1. Upload audio file if selected from device
      if (selectedAudioFile) {
        try {
          const cleanAudioName = selectedAudioFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const audioFileName = `status_audio_${Date.now()}_${cleanAudioName}`;

          const { data: audioData, error: audioErr } = await supabase.storage
            .from("status-media")
            .upload(audioFileName, selectedAudioFile, { cacheControl: "3600", upsert: true });

          if (!audioErr && audioData) {
            const { data: pubUrlData } = supabase.storage
              .from("status-media")
              .getPublicUrl(audioFileName);
            if (pubUrlData?.publicUrl) {
              finalAudioUrl = pubUrlData.publicUrl;
            }
          }
        } catch (err) {
          console.log("Audio storage upload fallback", err);
        }
      }

      // 2. Upload photo/video file
      try {
        const cleanName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, "_") : `status_${Date.now()}.jpg`;
        const fileName = `status_${Date.now()}_${cleanName}`;
        
        const { data, error } = await supabase.storage
          .from("status-media")
          .upload(fileName, file, { cacheControl: "3600", upsert: true });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from("status-media")
            .getPublicUrl(fileName);
          if (publicUrlData?.publicUrl) {
            finalMediaUrl = publicUrlData.publicUrl;
          }
        }
      } catch (err) {
        console.log("Supabase storage upload fallback to local URL", err);
      }

      const newStatus = {
        user_id: currentUser?.id || 1,
        user_name: currentUser?.fullname || "Me",
        user_photo: currentUser?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.fullname || "Me")}&background=22c55e&color=fff&bold=true`,
        media_type: mediaType,
        media_url: finalMediaUrl,
        caption: caption.trim(),
        music_track: selectedMusic !== "None" ? selectedMusic : null,
        audio_url: finalAudioUrl,
        privacy: privacyOption,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        viewers: []
      };

      await onPostSuccess(newStatus);
      if (showToast) showToast("Status published successfully!");
    } catch (err: any) {
      console.error("Error posting status:", err);
      if (showToast) showToast("Failed to post status. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none">
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

      {/* Loading Overlay */}
      {isPosting && (
        <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-4 text-white">
          <Loader2 className="animate-spin text-green-500" size={42} />
          <p className="font-semibold text-lg">Posting status to ChatMe...</p>
          <p className="text-xs text-gray-400">Uploading media to Supabase</p>
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
      <div className="relative z-30 p-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-3">
        {/* Audience / Privacy Selector Pill */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/80 border border-gray-700 rounded-full text-xs text-gray-300 hover:text-white transition"
          >
            <Users size={14} className="text-green-400" />
            <span className="font-medium">Status ({privacyOption})</span>
          </button>

          {/* Privacy Menu Dropdown */}
          {showPrivacyMenu && (
            <div className="absolute bottom-16 left-4 z-40 bg-gray-900 border border-gray-800 rounded-xl p-2 text-xs text-white shadow-2xl flex flex-col gap-1 w-52">
              <button
                onClick={() => {
                  setPrivacyOption("My contacts");
                  setShowPrivacyMenu(false);
                }}
                className={`p-2 rounded-lg text-left hover:bg-gray-800 flex items-center justify-between ${
                  privacyOption === "My contacts" ? "text-green-400 font-bold" : ""
                }`}
              >
                <span>My contacts</span>
                {privacyOption === "My contacts" && <Check size={14} />}
              </button>
              <button
                onClick={() => {
                  setPrivacyOption("My contacts except...");
                  setShowPrivacyMenu(false);
                }}
                className={`p-2 rounded-lg text-left hover:bg-gray-800 flex items-center justify-between ${
                  privacyOption === "My contacts except..." ? "text-green-400 font-bold" : ""
                }`}
              >
                <span>My contacts except...</span>
                {privacyOption === "My contacts except..." && <Check size={14} />}
              </button>
              <button
                onClick={() => {
                  setPrivacyOption("Only share with...");
                  setShowPrivacyMenu(false);
                }}
                className={`p-2 rounded-lg text-left hover:bg-gray-800 flex items-center justify-between ${
                  privacyOption === "Only share with..." ? "text-green-400 font-bold" : ""
                }`}
              >
                <span>Only share with...</span>
                {privacyOption === "Only share with..." && <Check size={14} />}
              </button>
            </div>
          )}
        </div>

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
            className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white hover:bg-green-600 transition shrink-0 shadow-xl disabled:opacity-50"
            title="Publish Status"
          >
            <Send size={20} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
