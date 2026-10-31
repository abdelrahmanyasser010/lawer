"use client";

import { AlertCircle, Loader2 } from "lucide-react";

export function PageLoading({
  label = "جاري تحميل البيانات...",
  withSkeleton = true,
}: {
  label?: string;
  withSkeleton?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-xs">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#986410]/10 text-[#986410]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="mt-3.5 text-xs font-extrabold text-[#00102e]">{label}</p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">يرجى الانتظار لحظات، جاري مزامنة أحدث البيانات من الخادم...</p>
        <div className="mt-4 h-1 w-28 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-[#986410]/40 via-[#986410] to-[#986410]/40" />
        </div>
      </div>

      {withSkeleton && (
        <div className="animate-pulse space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl border border-slate-100 bg-white/70 p-4">
                <div className="h-3 w-16 rounded-md bg-slate-200" />
                <div className="mt-4 h-6 w-24 rounded-md bg-slate-200/80" />
              </div>
            ))}
          </div>
          <div className="h-48 rounded-2xl border border-slate-100 bg-white/70 p-4">
            <div className="h-4 w-32 rounded-md bg-slate-200" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded-md bg-slate-100" />
              <div className="h-3 w-5/6 rounded-md bg-slate-100" />
              <div className="h-3 w-4/6 rounded-md bg-slate-100" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse p-4 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={`h-3.5 rounded-md bg-slate-200/80 ${c === 0 ? "w-40" : "flex-1"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center text-rose-900 shadow-xs">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
        <AlertCircle className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-extrabold">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-5 py-2.5 text-xs font-black text-white shadow-xs transition hover:bg-rose-800 active:scale-95"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

const statusLabels: Record<string, string> = {
  active: "نشط",
  approved: "معتمد",
  issued: "صادر",
  completed: "مكتمل",
  published: "منشور",
  locked: "مقفل",
  draft: "مسودة",
  legal_review: "مراجعة قانونية",
  archived: "مؤرشف",
  pending: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  pending_review: "قيد المراجعة",
  pending_payment: "بانتظار الدفع",
  pending_verification: "مراجعة الدفع",
  needs_client_info: "بانتظار توضيح العميل",
  replaced: "تم استبداله",
  awaiting_payment: "بانتظار الدفع",
  assigned: "قيد المتابعة",
  awaiting_client_info: "بانتظار بيانات العميل",
  meeting_scheduled: "موعد محدد",
  client_review: "مراجعة العميل",
  revision_requested: "تعديل مطلوب",
  internal_review: "مراجعة داخلية",
  superseded: "إصدار سابق",
  retry: "إعادة محاولة",
  suspended: "موقوف",
  rejected: "مرفوض",
  cancelled: "ملغي",
  overdue: "متأخر",
};

export function StatusBadge({ value }: { value: string }) {
  const positive = ["active", "approved", "issued", "completed", "published", "locked"].includes(value);
  const danger = ["suspended", "rejected", "cancelled", "overdue"].includes(value);
  const warning = ["draft", "pending", "pending_review", "pending_payment", "awaiting_payment", "revision_requested"].includes(value);

  const colorClasses = positive
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : danger
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : warning
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${colorClasses}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          positive ? "bg-emerald-600" : danger ? "bg-rose-600" : warning ? "bg-amber-600" : "bg-slate-500"
        }`}
      />
      <span>{statusLabels[value] ?? value}</span>
    </span>
  );
}
