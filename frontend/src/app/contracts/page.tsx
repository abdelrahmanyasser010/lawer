"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, FilePlus2, FileText, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ApiClientError, frontendApi } from "@/lib/apiClient";
import { contractStatusLabels, formatDate, getContractNextAction } from "@/lib/labels";
import type { ContractSummary } from "@/types/customer";

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: "bg-slate-500/10", text: "text-slate-700", border: "border-slate-500/20" },
  pending_payment: { bg: "bg-amber-500/10", text: "text-amber-800", border: "border-amber-500/25" },
  pending_review: { bg: "bg-blue-500/10", text: "text-blue-700", border: "border-blue-500/20" },
  assigned: { bg: "bg-indigo-500/10", text: "text-indigo-700", border: "border-indigo-500/20" },
  in_progress: { bg: "bg-blue-500/10", text: "text-blue-700", border: "border-blue-500/20" },
  client_review: { bg: "bg-purple-500/10", text: "text-purple-700", border: "border-purple-500/20" },
  revision_requested: { bg: "bg-rose-500/10", text: "text-rose-700", border: "border-rose-500/20" },
  approved: { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/20" },
  locked: { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/20" },
  issued: { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/20" },
  cancelled: { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-500/20" },
};

export default function ContractsPage() {
  const [items, setItems] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "issued">("all");

  useEffect(() => {
    frontendApi.contracts()
      .then(setItems)
      .catch((caught) => setError(caught instanceof ApiClientError && caught.status === 401 ? "سجل الدخول لعرض عقودك." : caught instanceof Error ? caught.message : "تعذر تحميل العقود"))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const all = items.length;
    const active = items.filter((i) => !["issued", "cancelled"].includes(i.status)).length;
    const issued = items.filter((i) => i.status === "issued").length;
    return { all, active, issued };
  }, [items]);

  const filtered = useMemo(() => items.filter((item) => {
    if (filter === "issued") return item.status === "issued";
    if (filter === "active") return !["issued", "cancelled"].includes(item.status);
    return true;
  }), [filter, items]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-right font-sans" dir="rtl">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8 sm:px-6">

        {/* Header with Title and Create Contract CTA */}
        <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#00102e]">عقودي</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              مسوداتك وعقودك المحفوظة في حسابك، من بداية الإعداد حتى الإصدار النهائي.
            </p>
          </div>
          <Link
            href="/create-contract?mode=self_service"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white hover:bg-[#00102e]/90 shadow-sm transition self-start sm:self-auto shrink-0"
          >
            <FilePlus2 className="h-4 w-4 text-[#d9a84e]" />
            <span>إنشاء عقد جديد</span>
          </Link>
        </header>

        {/* Filter Tabs with Live Counters */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto">
          {([
            { key: "all", label: "الكل", count: counts.all },
            { key: "active", label: "قيد الإعداد", count: counts.active },
            { key: "issued", label: "الصادرة", count: counts.issued },
          ] as const).map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                  isActive
                    ? "bg-[#00102e] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black ${
                    isActive ? "bg-[#d9a84e] text-[#00102e]" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area with min-height */}
        <div className="min-h-[440px] pt-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#986410]" />
              <p className="mt-3 text-xs font-bold text-slate-500">جاري تحميل عقودك...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
              <p className="font-bold text-amber-900 text-xs sm:text-sm">{error}</p>
              <Link
                href="/login?next=/contracts"
                className="mt-4 inline-block rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-white shadow-sm"
              >
                تسجيل الدخول
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-slate-50 mb-6">
                <Image src="/images/empty_contracts.jpg" alt="No contracts" width={100} height={100} className="opacity-80 mix-blend-multiply" />
              </div>
              <p className="text-base font-black text-[#00102e]">لا توجد عقود في هذا القسم.</p>
              <p className="mt-2 text-sm text-slate-500">يمكنك البدء في صياغة عقد جديد عبر الضغط على زر إنشاء عقد جديد.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((item) => {
                const nextAction = getContractNextAction(item.status);
                const statusConfig = statusStyles[item.status] || { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };

                return (
                  <article
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                            {item.serialNumber}
                          </span>
                          <h2 className="mt-2 text-base sm:text-lg font-black text-[#00102e] truncate">
                            {item.title || item.templateNameAr}
                          </h2>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.status === "issued" ? "نسخة صادرة ومحفوظة بحسابك" : "مسودة محفوظة بحسابك"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          {contractStatusLabels[item.status] || item.status}
                        </span>
                      </div>

                      {/* Next Action Box */}
                      <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-600">
                        <b className="text-slate-800">الخطوة التالية:</b> {nextAction.label}
                      </div>
                    </div>

                    {/* Card Footer: Date & Contextual CTA */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                        <span>آخر تحديث: {formatDate(item.updatedAt)}</span>
                      </div>

                      <Link
                        href={`/contract/${item.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#00102e] px-3.5 py-2 text-xs font-black text-white shadow-sm hover:bg-[#00102e]/90 active:scale-[0.98] transition"
                      >
                        <span>{nextAction.actionText}</span>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Link>
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
