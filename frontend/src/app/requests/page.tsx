"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, FileText, Loader2, Scale } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ApiClientError, frontendApi } from "@/lib/apiClient";
import { communicationLabels, formatDate, getRequestNextAction, requestStatusLabels, requestTypeLabels } from "@/lib/labels";
import type { ServiceRequestSummary } from "@/types/customer";

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  awaiting_payment: { bg: "bg-amber-500/10", text: "text-amber-800", border: "border-amber-500/25" },
  new: { bg: "bg-blue-500/10", text: "text-blue-700", border: "border-blue-500/20" },
  assigned: { bg: "bg-indigo-500/10", text: "text-indigo-700", border: "border-indigo-500/20" },
  in_progress: { bg: "bg-blue-500/10", text: "text-blue-700", border: "border-blue-500/20" },
  meeting_scheduled: { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/20" },
  awaiting_client_info: { bg: "bg-rose-500/10", text: "text-rose-700", border: "border-rose-500/20" },
  client_review: { bg: "bg-purple-500/10", text: "text-purple-700", border: "border-purple-500/20" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/20" },
  cancelled: { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-500/20" },
};

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

  const counts = useMemo(() => {
    const all = items.length;
    const active = items.filter((i) => !["completed", "cancelled"].includes(i.status)).length;
    const completed = items.filter((i) => i.status === "completed").length;
    return { all, active, completed };
  }, [items]);

  const filtered = useMemo(() => items.filter((item) => {
    if (filter === "completed") return item.status === "completed";
    if (filter === "active") return !["completed", "cancelled"].includes(item.status);
    return true;
  }), [filter, items]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-right font-sans" dir="rtl">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8 sm:px-6">

        {/* Sleek Workspace Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 pb-3.5 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-black text-[#00102e]">سجل الطلبات</h1>
            <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-black text-slate-700">
              {counts.all}
            </span>
          </div>

          {/* Filter Tabs with Live Counters */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {([
              { key: "all", label: "الكل", count: counts.all },
              { key: "active", label: "طلبات جارية", count: counts.active },
              { key: "completed", label: "مكتملة", count: counts.completed },
            ] as const).map((tab) => {
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
                    isActive
                      ? "bg-[#00102e] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-black ${
                      isActive ? "bg-[#d9a84e] text-[#00102e]" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area with min-height to balance footer position */}
        <div className="min-h-[400px] pt-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#986410]" />
              <p className="mt-2 text-xs font-bold text-slate-500">جاري تحميل طلباتك...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="font-bold text-amber-900 text-xs sm:text-sm">{error}</p>
              <Link
                href="/login?next=/requests"
                className="mt-3 inline-block rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-white shadow-sm"
              >
                تسجيل الدخول
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 mb-4">
                <Image src="/images/empty_requests.jpg" alt="No requests" width={80} height={80} className="opacity-80 mix-blend-multiply" />
              </div>
              <p className="text-sm font-black text-[#00102e]">لا توجد طلبات في هذا القسم.</p>
              <p className="mt-1 text-xs text-slate-500">يمكنك طلب إعداد عقد بواسطة محامٍ أو رفع عقدك الحالي للمراجعة.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const Icon = item.requestType === "contract_review" ? Scale : FileText;
                const nextAction = getRequestNextAction(item.status);
                const statusConfig = statusStyles[item.status] || { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
                const channelLabel = item.communicationChannel ? (communicationLabels[item.communicationChannel] || item.communicationChannel) : "";

                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                      {/* Right Section: Legal Icon + Info + Next Action */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#986410]/10 text-[#986410] border border-[#986410]/20">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h2 className="text-xs sm:text-sm font-black text-[#00102e] truncate">
                            {item.title}
                          </h2>

                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                            <span className="font-mono text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.serialNumber}
                            </span>
                            <span>•</span>
                            <span>{requestTypeLabels[item.requestType] || item.requestType}</span>
                            {item.communicationChannel && (
                              <>
                                <span>•</span>
                                <span>{channelLabel}</span>
                              </>
                            )}
                          </div>

                          {/* Status Badge + Next Action Explanation */}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                            >
                              {requestStatusLabels[item.status] || item.status}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-slate-600">
                              <b className="text-slate-800">الخطوة التالية:</b> {nextAction.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Left Section: Action Button */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0">
                        <Link
                          href={`/requests/${item.id}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#00102e] px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-[#00102e]/90 active:scale-[0.98] transition shrink-0"
                        >
                          <span>{nextAction.actionText}</span>
                          <ArrowLeft className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Bottom Details Row */}
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <Clock3 className="h-3 w-3 text-slate-400" />
                        <span>آخر تحديث: {formatDate(item.updatedAt || item.lastUpdate)}</span>
                      </div>

                      {item.deliverablesCount > 0 && (
                        <span className="inline-flex w-fit items-center justify-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                          {item.deliverablesCount} ملف متاح للتحميل
                        </span>
                      )}
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
