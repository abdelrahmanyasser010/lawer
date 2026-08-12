"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmOnly?: boolean;
  tone?: "default" | "warning" | "success";
  onConfirm: () => void;
  onClose: () => void;
}

export default function ActionDialog({
  open,
  title = "تنبيه",
  message,
  confirmLabel = "متابعة",
  cancelLabel = "إلغاء",
  confirmOnly = false,
  tone = "default",
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#00102e]/65 p-4 backdrop-blur-sm" dir="rtl" role="dialog" aria-modal="true">
      <section className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-right shadow-2xl">
        <button type="button" aria-label="إغلاق" onClick={onClose} className="absolute left-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone === "success" ? "bg-emerald-50 text-emerald-600" : tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-[#00102e]"}`}><Icon className="h-5 w-5" /></div>
        <h2 className="mt-4 text-lg font-black text-[#00102e]">{title}</h2>
        <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-slate-600">{message}</p>
        <div className="mt-6 flex gap-2">
          {!confirmOnly && <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600">{cancelLabel}</button>}
          <button type="button" onClick={onConfirm} className="flex-1 rounded-xl bg-[#00102e] px-4 py-3 text-xs font-black text-white">{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
