import React, { useState, useRef } from "react";
import { ArrowLeft, Camera, Users, Check, Calendar, Video, Phone, Clock } from "lucide-react";

function ScreenHeader({ title, onBack, dark }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-4 border-b ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
      {onBack && (
        <button onClick={onBack}>
          <ArrowLeft size={20} className={dark ? "text-white" : "text-gray-700"} />
        </button>
      )}
      <h1 className={`text-base font-bold flex-1 ${dark ? "text-white" : "text-gray-900"}`}>{title}</h1>
    </div>
  );
}

export function GroupCreationScreen({ users, currentUser, editingGroup, initialSelectedContacts, onSave, onBack, onScheduleCall, dark }) {
  const [name, setName] = useState(editingGroup ? editingGroup.fullname : "");
  const [photo, setPhoto] = useState(editingGroup ? editingGroup.photo : null);
  const [members, setMembers] = useState(
    editingGroup
      ? (editingGroup.members || [])
      : (initialSelectedContacts || [])
  );

  // Schedule Call Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [callType, setCallType] = useState("video");
  const [callDate, setCallDate] = useState(new Date().toISOString().split("T")[0]);
  const [callTime, setCallTime] = useState("14:00");

  const fileRef = useRef(null);

  const toggleMember = (userId) => {
    setMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) setPhoto(URL.createObjectURL(file));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      photo,
      members
    });
  };

  const handleConfirmSchedule = () => {
    if (onScheduleCall) {
      onScheduleCall({
        type: callType,
        date: callDate,
        time: callTime
      });
    }
    setShowScheduleModal(false);
  };

  return (
    <div className={`flex flex-col h-full ${dark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      <ScreenHeader title={editingGroup ? "Manage Group & Calls" : "New Group"} onBack={onBack} dark={dark} />
      
      <div className="flex flex-col items-center py-6 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => fileRef.current?.click()}
          className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center overflow-hidden relative group shadow-sm"
        >
          {photo ? (
            <img src={photo} alt="group" className="w-full h-full object-cover" />
          ) : (
            <Camera size={32} className="text-gray-400" />
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
            <Camera size={24} className="text-white" />
          </div>
        </button>
        <input type="file" accept="image/*" ref={fileRef} onChange={handlePhoto} className="hidden" />
        <span className="text-xs text-gray-400 mt-2">Tap to change group photo</span>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Group Name</label>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 text-xs text-green-500 hover:text-green-600 font-semibold px-2 py-1 rounded-lg bg-green-50 dark:bg-green-950/40 transition"
          >
            <Calendar size={14} /> Schedule Group Call
          </button>
        </div>
        <input
          type="text"
          placeholder="Group name (e.g. Project Team)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full p-3 rounded-xl border ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-green-500`}
        />
      </div>

      <div className="px-6 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Group Members ({members.length} selected)
        </span>
        <span className="text-[11px] text-gray-400">Tap to add or remove</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 divide-y divide-gray-100 dark:divide-gray-800">
        {users
          .filter((u) => u.id !== currentUser.id)
          .map((u) => {
            const isSelected = members.includes(u.id);
            return (
              <div
                key={u.id}
                onClick={() => toggleMember(u.id)}
                className={`flex items-center gap-3 py-3 px-2 rounded-xl cursor-pointer transition my-1 ${isSelected ? (dark ? "bg-gray-800/60" : "bg-green-50/70") : "hover:bg-gray-50 dark:hover:bg-gray-800/30"}`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition ${isSelected ? "bg-green-500 border-green-500 text-white" : "border-gray-300 dark:border-gray-700"}`}>
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
                <img src={u.photo} alt={u.fullname} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}>{u.fullname}</p>
                  <p className="text-xs text-gray-400 truncate">{u.bio || u.email || "Online"}</p>
                </div>
              </div>
            );
          })}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 shadow-sm"
        >
          {editingGroup ? "Save Changes" : "Create Group"}
        </button>
      </div>

      {/* Schedule Call Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl ${dark ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Calendar className="text-green-500" size={20} /> Schedule Group Call
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Call Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCallType("video")}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-xs transition ${callType === "video" ? "bg-green-500 border-green-500 text-white" : dark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"}`}
                  >
                    <Video size={16} /> Video Call
                  </button>
                  <button
                    type="button"
                    onClick={() => setCallType("voice")}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-xs transition ${callType === "voice" ? "bg-green-500 border-green-500 text-white" : dark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"}`}
                  >
                    <Phone size={16} /> Voice Call
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={callDate}
                    onChange={(e) => setCallDate(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-sm ${dark ? "bg-gray-900 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-green-500`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Time</label>
                <div className="relative">
                  <input
                    type="time"
                    value={callTime}
                    onChange={(e) => setCallTime(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-sm ${dark ? "bg-gray-900 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-green-500`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm border transition ${dark ? "border-gray-700 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-100"}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSchedule}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold text-sm transition shadow-sm"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
