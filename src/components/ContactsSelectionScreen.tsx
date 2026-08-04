import React, { useState } from "react";
import { ArrowLeft, Search, ChevronRight } from "lucide-react";

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

export function ContactsSelectionScreen({ users, currentUser, onNext, onBack, dark }) {
  const [selected, setSelected] = useState([]);

  const toggleSelect = (userId) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className={`flex flex-col h-full ${dark ? "bg-gray-900" : "bg-white"}`}>
      <ScreenHeader title="Select Contacts" onBack={onBack} dark={dark} />
      <div className={`flex-1 overflow-y-auto`}>
        {users
          .filter((u) => u.id !== currentUser.id)
          .map((u) => (
            <div
              key={u.id}
              onClick={() => toggleSelect(u.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b ${dark ? "border-gray-800" : "border-gray-50"} ${selected.includes(u.id) ? "bg-green-50" : ""}`}
            >
              <div className={`w-5 h-5 rounded border ${selected.includes(u.id) ? "bg-green-500 border-green-500" : "border-gray-300"}`} />
              <img src={u.photo} alt={u.fullname} className="w-11 h-11 rounded-xl object-cover" />
              <span className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{u.fullname}</span>
            </div>
          ))}
      </div>
      <div className="p-4 border-t">
        <button
          onClick={() => onNext(selected)}
          disabled={selected.length === 0}
          className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
