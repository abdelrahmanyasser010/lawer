"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, FilePlus2, FileText, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ApiClientError, frontendApi } from "@/lib/apiClient";
import { contractStatusLabels, formatDate } from "@/lib/labels";
import type { ContractSummary } from "@/types/customer";

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

  const filtered = useMemo(() => items.filter((item) => {
    if (filter === "issued") return item.status === "issued";
    if (filter === "active") return !["issued", "cancelled"].includes(item.status);
    return true;
  }), [filter, items]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-9 sm:px-6">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black text-[#00102e]">عقودي</h1>
            <p className="mt-2 text-sm text-slate-600">مسوداتك وعقودك المحفوظة في حسابك، من بداية الإعداد حتى الإصدار النهائي.</p>
          </div>
          <Link href="/create-contract?mode=self_service" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-[#986410]">
            <FilePlus2 className="h-4 w-4" /> إنشاء عقد جديد
          </Link>
        </header>

        <div className="mt-6 flex gap-2 overflow-x-auto">
          {([ ["all", "الكل"], ["active", "قيد الإعداد"], ["issued", "الصادرة"] ] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-xl px-4 py-2 text-xs font-black ${filter === key ? "bg-[#00102e] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-14 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-700" /></div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="font-bold text-amber-900">{error}</p>
            <Link href="/login?next=/contracts" className="mt-4 inline-block rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-white">تسجيل الدخول</Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
            <FileText className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 font-black text-slate-600">لا توجد عقود في هذا القسم.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {filtered.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[10px] text-slate-400">{item.serialNumber}</div>
                    <h2 className="mt-2 text-lg font-black text-[#00102e]">{item.title || item.templateNameAr}</h2>
                    <p className="mt-1 text-xs text-slate-500">{item.status === "issued" ? "نسخة صادرة ومحفوظة بحسابك" : "مسودة محفوظة بحسابك"}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">{contractStatusLabels[item.status] || item.status}</span>
                </div>
                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><Clock3 className="h-4 w-4" /> آخر تحديث: {formatDate(item.updatedAt)}</div>
                <div className="mt-5 flex justify-end">
                  <Link href={`/contract/${item.id}`} className="inline-flex items-center gap-1 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white">فتح العقد <ArrowLeft className="h-4 w-4" /></Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
