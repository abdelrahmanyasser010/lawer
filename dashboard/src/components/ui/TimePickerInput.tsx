"use client";

import React, { useRef } from "react";
import { Clock, X } from "lucide-react";

export interface TimePickerInputProps {
  value: string; // e.g. "09:00" or "20:30"
  onChange: (val: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  className?: string;
  wrapperClassName?: string;
  "aria-label"?: string;
  name?: string;
  id?: string;
}

export function TimePickerInput({
  value,
  onChange,
  placeholder = "--:--",
  hasError = false,
  disabled = false,
  required = false,
  clearable = false,
  className = "",
  wrapperClassName = "",
  "aria-label": ariaLabel,
  name,
  id,
}: TimePickerInputProps) {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  // Format "09:00" / "20:30" to 12h Arabic string "9:00 ص" / "8:30 م"
  const formatDisplayTime = (val: string) => {
    if (!val || !val.includes(":")) return val;
    const [hStr, mStr] = val.split(":");
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return val;
    const period = h >= 12 ? "م" : "ص";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${mStr} ${period}`;
  };

  const displayTime = formatDisplayTime(value);

  const handleClick = () => {
    if (disabled) return;
    const el = hiddenInputRef.current;
    if (!el) return;
    try {
      const anyEl = el as unknown as { showPicker?: () => void; focus?: () => void };
      if (typeof anyEl.showPicker === "function") {
        anyEl.showPicker();
      } else {
        anyEl.focus?.();
      }
    } catch {
      (el as unknown as { focus?: () => void }).focus?.();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange("");
  };

  const baseClasses = hasError
    ? "border-rose-400 bg-rose-50/20 text-rose-950 focus:border-rose-600 focus:ring-rose-500/20"
    : "border-slate-200 bg-white text-slate-900 focus:border-[#00102e] focus:ring-[#986410]/30";

  return (
    <div className={`relative inline-block w-full ${disabled ? "opacity-70" : ""} ${wrapperClassName}`}>
      <div
        onClick={handleClick}
        className={`relative flex items-center ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <input
          type="text"
          readOnly
          id={id}
          name={name}
          aria-label={ariaLabel}
          required={required}
          value={displayTime || ""}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full rounded-xl border px-3 py-2 text-xs font-medium transition-all outline-none focus:ring-1 ${baseClasses} ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          } pl-8 ${className}`}
        />

        {/* Clock Icon on Left */}
        <Clock
          className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${
            hasError ? "text-rose-500" : "text-slate-400"
          }`}
        />

        {/* Clear Button */}
        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-7 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
            title="مسح الوقت"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Hidden Native Time Picker */}
        <input
          ref={hiddenInputRef}
          type="time"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="absolute inset-0 h-full w-full pointer-events-none opacity-0"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
