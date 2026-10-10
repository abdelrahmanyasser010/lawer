"use client";

import { X } from "lucide-react";
import { ReactNode, useCallback, useEffect, useState } from "react";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
};

export function AdminDialog({ open, title, description, children, onClose, maxWidth = "max-w-lg" }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={onClose}>
      <div className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-3xl bg-white shadow-2xl`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-lg font-black text-[#00102e]">{title}</h2>
            {description && <p className="mt-1 text-xs leading-6 text-slate-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
};

type ConfirmState = ConfirmOptions & { resolve: (value: boolean) => void };

export function useAdminConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...options, resolve })), []);
  const close = (value: boolean) => {
    const current = state;
    setState(null);
    current?.resolve(value);
  };
  const dialog = state ? (
    <AdminDialog open title={state.title || "تأكيد الإجراء"} description={state.message} onClose={() => close(false)}>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => close(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600">إلغاء</button>
        <button type="button" onClick={() => close(true)} className={`rounded-xl px-5 py-2.5 text-xs font-black text-white ${state.danger ? "bg-red-700" : "bg-[#00102e]"}`}>{state.confirmLabel || "تأكيد"}</button>
      </div>
    </AdminDialog>
  ) : null;
  return { confirm, dialog };
}
