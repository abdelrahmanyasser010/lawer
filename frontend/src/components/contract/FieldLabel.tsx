"use client";

import React, { useState } from "react";
import { HelpCircle, Play, X } from "lucide-react";

interface FieldLabelProps {
  label: string;
  required?: boolean;
  helpText?: string;
  videoUrl?: string;
}

export default function FieldLabel({ label, required, helpText, videoUrl }: FieldLabelProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="flex items-center gap-1.5 mb-1 relative">
      <label className="block text-xs font-bold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {helpText && (
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="rounded-full p-0.5 text-slate-400 hover:text-[#986410] hover:bg-[#986410]/10 transition-all"
          title="مساعدة"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      )}

      {videoUrl && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-red-50 p-0.5 text-red-500 hover:bg-red-100 transition-all flex items-center gap-0.5"
          title="شاهد الفيديو التوضيحي"
        >
          <Play className="h-3 w-3" />
          <span className="text-[9px] font-bold pr-1">فيديو</span>
        </a>
      )}

      {/* Help tooltip popup */}
      {showHelp && helpText && (
        <div className="absolute top-full right-0 z-30 mt-1 w-64 sm:w-80 rounded-xl border border-[#986410]/30 bg-white shadow-lg p-3 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs text-slate-700 leading-relaxed">
              <span className="font-bold text-[#986410] block mb-1">💡 توجيه:</span>
              {helpText}
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-slate-600 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
