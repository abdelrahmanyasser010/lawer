"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { apiRequest, ApiClientError, frontendApi } from "@/lib/apiClient";
import type { CustomerNotification } from "@/types/customer";
import { formatDate } from "@/lib/labels";

export default function NotificationsPage() {
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await frontendApi.notifications();
      setItems(result.items);
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 401 ? "سجل الدخول لعرض الإشعارات." : caught instanceof Error ? caught.message : "تعذر تحميل الإشعارات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function readAll() {
    await apiRequest("/api/v1/notifications/read-all", { method: "PATCH", body: JSON.stringify({}) });
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
  }

  async function markRead(id: number) {
    await apiRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH", body: JSON.stringify({}) });
    setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-9 sm:px-6">
        <header className="flex items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div><h1 className="text-3xl font-black text-[#00102e]">الإشعارات</h1><p className="mt-2 text-sm text-slate-600">تحديثات الدفع والعقود والاستشارات القانونية.</p></div>
          <button type="button" onClick={() => void readAll()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"><CheckCheck className="h-4 w-4" /> تعليم الكل كمقروء</button>
        </header>

        {loading ? <div className="mt-8 rounded-2xl border bg-white p-14"><Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-700" /></div> : error ? <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center font-bold text-amber-900">{error}</div> : items.length === 0 ? <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm"><div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-slate-50 mb-6"><Image src="/images/empty_notifications.jpg" alt="No notifications" width={100} height={100} className="opacity-80 mix-blend-multiply" /></div><p className="text-base font-black text-[#00102e]">لا توجد إشعارات.</p></div> : (
          <div className="mt-8 space-y-3">
            {items.map((item) => (
              <article key={item.id} className={`rounded-2xl border p-5 ${item.readAt ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"}`}>
                <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-black text-[#00102e]">{item.title}</h2><p className="mt-2 text-xs leading-6 text-slate-600">{item.message}</p><p className="mt-2 text-[10px] text-slate-400">{formatDate(item.createdAt)}</p></div>{!item.readAt && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />}</div>
                <div className="mt-4 flex gap-2">{item.actionUrl && <Link href={item.actionUrl} onClick={() => void markRead(item.id)} className="rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-white">فتح</Link>}{!item.readAt && <button type="button" onClick={() => void markRead(item.id)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">تمت القراءة</button>}</div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
