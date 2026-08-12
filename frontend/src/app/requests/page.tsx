"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, FileText, Loader2, Scale } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ApiClientError, frontendApi } from "@/lib/apiClient";
import { communicationLabels, formatDate, requestStatusLabels, requestTypeLabels } from "@/lib/labels";
import type { ServiceRequestSummary } from "@/types/customer";

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

  const filtered = useMemo(() => items.filter((item) => {
    if (filter === "completed") return item.status === "completed";
    if (filter === "active") return !["completed", "cancelled"].includes(item.status);
    return true;
  }), [filter, items]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-9 sm:px-6">
        <header className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-black text-[#00102e]">طلباتي</h1>
          <p className="mt-2 text-sm text-slate-600">تابع الاستشارات وطلبات إعداد العقود ومراجعة المستندات والملفات التي يتيحها المكتب لك من مكان واحد.</p>
        </header>

        <div className="mt-6 flex gap-2 overflow-x-auto">
          {([ ["all", "الكل"], ["active", "طلبات جارية"], ["completed", "مكتملة"] ] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-xl px-4 py-2 text-xs font-black ${filter === key ? "bg-[#00102e] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border bg-white p-14"><Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-700" /></div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center"><p className="font-bold text-amber-900">{error}</p><Link href="/login?next=/requests" className="mt-4 inline-block rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-white">تسجيل الدخول</Link></div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed bg-white p-14 text-center"><Scale className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-black text-slate-600">لا توجد طلبات في هذا القسم.</p></div>
        ) : (
          <div className="mt-8 space-y-4">
            {filtered.map((item) => {
              const Icon = item.requestType === "consultation" ? Scale : FileText;
              return (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#986410]/10 text-[#986410]"><Icon className="h-5 w-5" /></div>
                      <div>
                        <div className="font-mono text-[10px] text-slate-400">{item.serialNumber}</div>
                        <h2 className="mt-1 font-black text-[#00102e]">{item.title}</h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                          <span>{requestTypeLabels[item.requestType] || item.requestType}</span>
                          {item.communicationChannel && <span>• {communicationLabels[item.communicationChannel]}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">{requestStatusLabels[item.status] || item.status}</span>
                      <Link href={`/requests/${item.id}`} className="inline-flex items-center gap-1 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white">التفاصيل <ArrowLeft className="h-4 w-4" /></Link>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-[11px] text-slate-500"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {formatDate(item.updatedAt)}</span>{item.lastUpdate && <span>آخر تحديث: {item.lastUpdate}</span>}{item.deliverablesCount > 0 && <span className="font-black text-emerald-700">{item.deliverablesCount} ملف متاح</span>}</div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
