"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, RefreshCw, Trash2 } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading } from "@/components/admin/PageFeedback";

type Notice = {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  readAt?: string;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async (autoMarkRead = false) => {
    setLoading(true);
    setError("");
    try {
      const r = await dashboardRequest<{ items: Notice[]; unreadCount: number }>("/api/v1/notifications");
      setItems(r.items);
      setUnread(r.unreadCount);
      if (autoMarkRead && r.unreadCount > 0) {
        await dashboardRequest("/api/v1/notifications/read-all", { method: "PATCH" });
        setUnread(0);
        window.dispatchEvent(new Event("notifications_cleared"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل الإشعارات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  async function read(id: number) {
    await dashboardRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
    setItems((cur) => cur.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
    window.dispatchEvent(new Event("notifications_cleared"));
  }

  async function readAll() {
    await dashboardRequest("/api/v1/notifications/read-all", { method: "PATCH" });
    setItems((cur) => cur.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    setUnread(0);
    window.dispatchEvent(new Event("notifications_cleared"));
  }

  async function deleteNotice(id: number) {
    setDeletingId(id);
    try {
      await dashboardRequest(`/api/v1/notifications/${id}`, { method: "DELETE" });
      setItems((cur) => cur.filter((item) => item.id !== id));
      window.dispatchEvent(new Event("notifications_cleared"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حذف الإشعار");
    } finally {
      setDeletingId(null);
    }
  }

  async function clearAll() {
    if (!items.length) return;
    if (!window.confirm("هل تريد بالتأكيد مسح جميع الإشعارات السابقة من السجل؟")) return;
    try {
      await dashboardRequest("/api/v1/notifications/clear-all", { method: "DELETE" });
      setItems([]);
      setUnread(0);
      window.dispatchEvent(new Event("notifications_cleared"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر مسح الإشعارات");
    }
  }

  const displayedItems = useMemo(() => {
    if (activeTab === "unread") {
      return items.filter((item) => !item.readAt);
    }
    return items;
  }, [activeTab, items]);

  if (loading && !items.length) return <div className="p-8"><PageLoading /></div>;
  if (error && !items.length) return <div className="p-8"><PageError message={error} onRetry={() => load(false)} /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 sm:p-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#00102e]">الإشعارات</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            سجل التنبيهات والإجراءات المتخذة في النظام ({items.length} إشعار مسجل).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load(false)}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
            title="تحديث"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void readAll()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d7a94f] hover:bg-[#00102e]/90"
            >
              <CheckCheck className="h-4 w-4" />
              تعليم الكل كمقروء
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "all"
              ? "bg-[#00102e] text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          سجل الإشعارات ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("unread")}
          className={`rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "unread"
              ? "bg-[#00102e] text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          غير المقروءة ({unread})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {displayedItems.map((n) => {
          const isRead = Boolean(n.readAt);
          return (
            <article
              key={n.id}
              className={`rounded-2xl border p-5 transition ${
                isRead ? "border-slate-200 bg-white opacity-90" : "border-[#986410]/30 bg-[#986410]/5 shadow-xs"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`rounded-xl p-2.5 ${isRead ? "bg-slate-100 text-slate-500" : "bg-[#00102e] text-[#d7a94f]"}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className={`font-black text-sm ${isRead ? "text-slate-800" : "text-[#00102e]"}`}>{n.title}</h2>
                      {isRead ? (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">سجل سابق</span>
                      ) : (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900">جديد</span>
                      )}
                    </div>
                    <time className="text-xs font-semibold text-slate-500 font-mono">
                      {new Date(n.createdAt).toLocaleString("ar-EG")}
                    </time>
                  </div>
                  <p className="mt-1.5 text-xs leading-6 text-slate-600">{n.message}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      {n.actionUrl && (
                        <Link href={n.actionUrl} className="rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-white hover:bg-[#00102e]/90">
                          فتح الإجراء
                        </Link>
                      )}
                      {!isRead && (
                        <button
                          type="button"
                          onClick={() => void read(n.id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          تمت القراءة
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === n.id}
                      onClick={() => void deleteNotice(n.id)}
                      className="inline-flex items-center gap-1 rounded-xl p-2 text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="حذف هذا الإشعار من السجل"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {displayedItems.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs font-bold text-slate-500">
            {activeTab === "unread" ? "لا توجد إشعارات غير مقروءة حالياً." : "لا توجد إشعارات مسجلة."}
          </div>
        )}
      </div>
    </div>
  );
}


