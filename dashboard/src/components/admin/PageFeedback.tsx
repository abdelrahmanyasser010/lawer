"use client";

import { AlertCircle, Loader2 } from "lucide-react";

export function PageLoading({ label = "جاري تحميل البيانات..." }: { label?: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#986410]"/><p className="mt-3 text-sm font-bold text-slate-500">{label}</p></div>;
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800"><AlertCircle className="mx-auto h-6 w-6"/><p className="mt-2 text-sm font-bold">{message}</p>{onRetry && <button onClick={onRetry} className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white">إعادة المحاولة</button>}</div>;
}

const statusLabels: Record<string, string> = {
  active: "نشط", approved: "معتمد", issued: "صادر", completed: "مكتمل", published: "منشور", locked: "مقفل",
  draft: "مسودة", legal_review: "مراجعة قانونية", archived: "مؤرشف", pending: "قيد الانتظار", in_progress: "قيد التنفيذ",
  pending_review: "قيد المراجعة", pending_payment: "بانتظار الدفع", pending_verification: "مراجعة الدفع", awaiting_payment: "بانتظار الدفع",
  assigned: "قيد المتابعة", awaiting_client_info: "بانتظار بيانات العميل", meeting_scheduled: "موعد محدد", client_review: "مراجعة العميل",
  revision_requested: "تعديل مطلوب", internal_review: "مراجعة داخلية", superseded: "إصدار سابق", retry: "إعادة محاولة",
  suspended: "موقوف", rejected: "مرفوض", cancelled: "ملغي", overdue: "متأخر",
};

export function StatusBadge({ value }: { value: string }) {
  const positive = ["active","approved","issued","completed","published","locked"].includes(value);
  const danger = ["suspended","rejected","cancelled","overdue"].includes(value);
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${positive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : danger ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{statusLabels[value] ?? value}</span>;
}
