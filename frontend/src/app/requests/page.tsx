"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, FileText, Loader2, Scale } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ApiClientError, frontendApi } from "@/lib/apiClient";
import { formatDate } from "@/lib/labels";
import type { ServiceRequestSummary } from "@/types/customer";

const statusStyles: Record<string, string> = {
  awaiting_payment: "border-amber-200 bg-amber-50 text-amber-800",
  new: "border-blue-200 bg-blue-50 text-blue-700",
  assigned: "border-indigo-200 bg-indigo-50 text-indigo-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  client_review: "border-purple-200 bg-purple-50 text-purple-700",
  awaiting_balance: "border-amber-200 bg-amber-50 text-amber-800",
  final_delivery: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-slate-200 bg-slate-50 text-slate-600",
};

function serviceLabel(item: ServiceRequestSummary) {
  if (item.requestType === "contract_drafting") return "صياغة بواسطة محامي";
  return item.requestPurpose === "consultation" ? "استشارة" : "مراجعة";
}

export default function RequestsPage() {
  const [items, setItems] = useState<ServiceRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    frontendApi.requests()
      .then(setItems)
      .catch((caught) => setError(caught instanceof ApiClientError && caught.status === 401 ? "سجل الدخول لعرض طلباتك." : caught instanceof Error ? caught.message : "تعذر تحميل الطلبات"))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    all: items.length,
    active: items.filter((item) => !["completed", "cancelled"].includes(item.status)).length,
    completed: items.filter((item) => item.status === "completed").length,
  }), [items]);

  const filtered = useMemo(() => items.filter((item) => {
    if (filter === "completed") return item.status === "completed";
    if (filter === "active") return !["completed", "cancelled"].includes(item.status);
    return true;
  }), [filter, items]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-right" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-7 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#00102e]">خدماتي مع المحامين</h1>
            <p className="mt-1 text-xs leading-6 text-slate-500">طلبات صياغة العقود أو مراجعة واستشارة بخصوص عقد. العقود اللي بتعملها بنفسك موجودة في سجل العقود.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {([
              ["all", "الكل", counts.all],
              ["active", "تحت المتابعة", counts.active],
              ["completed", "مكتملة", counts.completed],
            ] as const).map(([key, label, count]) => (
              <button key={key} type="button" onClick={() => setFilter(key)} className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-black ${filter === key ? "bg-[#00102e] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{label} ({count})</button>
            ))}
          </div>
        </header>

        <div className="min-h-[400px] pt-5">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#986410]" /><p className="mt-2 text-xs font-bold text-slate-500">جاري تحميل طلباتك...</p></div>
          ) : error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7 text-center"><p className="text-sm font-bold text-amber-900">{error}</p><Link href="/login?next=/requests" className="mt-3 inline-block rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-white">تسجيل الدخول</Link></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm"><div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-slate-50"><Image src="/images/empty_requests.jpg" alt="No requests" width={80} height={80} className="opacity-80 mix-blend-multiply" /></div><p className="text-sm font-black text-[#00102e]">لا توجد طلبات في هذا القسم.</p><p className="mt-1 text-xs text-slate-500">تقدر تطلب صياغة عقد بواسطة محامي أو مراجعة/استشارة بخصوص عقد.</p></div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const Icon = item.requestType === "contract_review" ? Scale : FileText;
                const action = item.nextCustomerAction;
                return (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#986410]/20 bg-[#986410]/10 text-[#986410]"><Icon className="h-4 w-4" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-sm font-black text-[#00102e]">{item.title}</h2>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600">{serviceLabel(item)}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold">{item.serialNumber}</span>{item.contractTypeText && <><span>•</span><span>{item.contractTypeText}</span></>}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${statusStyles[item.status] || "border-slate-200 bg-slate-50 text-slate-600"}`}>{item.customerFacingStatus || "الطلب تحت المتابعة"}</span>
                            {action && <span className="text-[10px] text-slate-600"><b className="text-slate-800">المطلوب منك:</b> {action.label}</span>}
                          </div>
                        </div>
                      </div>
                      <Link href={`/requests/${item.id}`} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#00102e] px-3 py-2 text-xs font-black text-white"><span>{action?.label || "متابعة الطلب"}</span><ArrowLeft className="h-3 w-3" /></Link>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3 w-3" /> آخر تحديث: {formatDate(item.updatedAt || item.lastUpdate)}</span>
                      {item.assignedLawyer?.displayName && <span className="font-bold text-slate-600">{item.assignedLawyer.displayName}</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
