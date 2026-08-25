"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Loader2, RefreshCw, Trash2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { apiRequest, ApiClientError, frontendApi } from "@/lib/apiClient";
import type { CustomerNotification } from "@/types/customer";
import { formatDate } from "@/lib/labels";

export default function NotificationsPage() {
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load(autoMarkRead = true) {
    setLoading(true);
    try {
      const result = await frontendApi.notifications();
      setItems(result.items);
      if (autoMarkRead && result.unreadCount > 0) {
        await apiRequest("/api/v1/notifications/read-all", { method: "PATCH", body: JSON.stringify({}) });
        setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
        window.dispatchEvent(new Event("notifications_cleared"));
      }
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 401 ? "سجل الدخول لعرض الإشعارات." : caught instanceof Error ? caught.message : "تعذر تحميل الإشعارات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(true); }, []);

  async function readAll() {
    await apiRequest("/api/v1/notifications/read-all", { method: "PATCH", body: JSON.stringify({}) });
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    window.dispatchEvent(new Event("notifications_cleared"));
  }

  async function markRead(id: number) {
    await apiRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH", body: JSON.stringify({}) });
    setItems((current) => current.map((item) => (item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item)));
    window.dispatchEvent(new Event("notifications_cleared"));
  }

  async function deleteNotice(id: number) {
    setDeletingId(id);
    try {
      await apiRequest(`/api/v1/notifications/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== id));
      window.dispatchEvent(new Event("notifications_cleared"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف الإشعار");
    } finally {
      setDeletingId(null);
    }
  }

  async function clearAll() {
    if (!items.length) return;
    if (!window.confirm("هل تريد بالتأكيد مسح جميع الإشعارات السابقة من السجل؟")) return;
    try {
      await apiRequest("/api/v1/notifications/clear-all", { method: "DELETE" });
      setItems([]);
      window.dispatchEvent(new Event("notifications_cleared"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر مسح الإشعارات");
    }
  }

  const unreadCount = items.filter((item) => !item.readAt).length;

  const displayedItems = useMemo(() => {
    if (activeTab === "unread") {
      return items.filter((item) => !item.readAt);
    }
    return items;
  }, [activeTab, items]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-9 sm:px-6">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black text-[#00102e]">الإشعارات</h1>
            <p className="mt-2 text-sm text-slate-600">سجل تحديثات الدفع والعقود والاستشارات القانونية.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load(false)}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-slate-50"
              title="تحديث"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void readAll()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                <CheckCheck className="h-4 w-4" /> تعليم الكل كمقروء
              </button>
            )}
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => void clearAll()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                مسح السجل بالكامل
              </button>
            )}
          </div>
        </header>

        {/* Filter Tabs */}
        <div className="mt-6 flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "all" ? "bg-[#00102e] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            سجل الإشعارات ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("unread")}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "unread" ? "bg-[#00102e] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            غير المقروءة ({unreadCount})
          </button>
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border bg-white p-14">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-700" />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center font-bold text-amber-900">
            {error}
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-slate-50 mb-6">
              <Image src="/images/empty_notifications.jpg" alt="No notifications" width={100} height={100} className="opacity-80 mix-blend-multiply" />
            </div>
            <p className="text-base font-black text-[#00102e]">
              {activeTab === "unread" ? "لا توجد إشعارات غير مقروءة." : "لا توجد إشعارات مسجلة."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {displayedItems.map((item) => {
              const isRead = Boolean(item.readAt);
              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-5 transition ${
                    isRead ? "border-slate-200 bg-white opacity-90" : "border-blue-200 bg-blue-50/70 shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className={`text-sm font-black ${isRead ? "text-slate-800" : "text-[#00102e]"}`}>{item.title}</h2>
                        {isRead ? (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">سابق</span>
                        ) : (
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-900">جديد</span>
                        )}
                      </div>
                      <p className="mt-2 text-xs leading-6 text-slate-600">{item.message}</p>
                      <p className="mt-2 text-[10px] text-slate-400 font-mono">{formatDate(item.createdAt)}</p>
                    </div>
                    {!isRead && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <div className="flex gap-2">
                      {item.actionUrl && (
                        <Link
                          href={item.actionUrl}
                          onClick={() => void markRead(item.id)}
                          className="rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-white hover:bg-[#00102e]/90"
                        >
                          فتح الإجراء
                        </Link>
                      )}
                      {!isRead && (
                        <button
                          type="button"
                          onClick={() => void markRead(item.id)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                        >
                          تمت القراءة
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={() => void deleteNotice(item.id)}
                      className="inline-flex items-center gap-1 rounded-xl p-2 text-xs font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="حذف هذا الإشعار من السجل"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
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

