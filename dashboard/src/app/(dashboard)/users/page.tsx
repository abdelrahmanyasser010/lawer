"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye, RefreshCw, Search, UserX } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { hasBackendPermission } from "@/lib/adminAccess";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";

type Client = {
  id: number;
  publicId: string;
  name: string;
  email: string;
  phone?: string;
  whatsappNumber?: string;
  accountType: string;
  companyName?: string | null;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  contractsCount: number;
  requestsCount: number;
};

export default function UsersPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const canManage = hasBackendPermission("clients.manage");

  const load = useCallback(async () => {
    setError("");
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    try {
      setItems(await dashboardRequest<Client[]>(`/api/v1/admin/users?${query}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل العملاء");
    } finally {
      setLoaded(true);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function toggle(client: Client) {
    setBusy(client.id);
    try {
      await dashboardRequest(`/api/v1/admin/users/${client.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: client.status === "suspended" ? "active" : "suspended" }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحديث الحساب");
    } finally {
      setBusy(null);
    }
  }

  if (!loaded) return <div className="p-8"><PageLoading /></div>;
  if (error && !items.length) return <div className="p-8"><PageError message={error} onRetry={load} /></div>;

  return <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
      <div><h1 className="text-3xl font-black text-[#00102e]">العملاء</h1><p className="text-sm text-slate-500">ملف موحد لكل عميل يشمل العقود والطلبات والمدفوعات والنشاط.</p></div>
      <button onClick={() => void load()} className="self-start rounded-xl border border-slate-200 bg-white p-2.5"><RefreshCw className="h-4 w-4" /></button>
    </header>

    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
      <label className="relative flex-1"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالاسم أو البريد أو الهاتف" className="w-full rounded-xl border border-slate-200 py-2.5 pr-10 pl-3 text-sm" /></label>
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black"><option value="">كل الحالات</option><option value="active">نشط</option><option value="suspended">موقوف</option></select>
    </div>

    {error && <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">العميل</th><th className="p-4">التواصل</th><th className="p-4">نوع الحساب</th><th className="p-4">النشاط</th><th className="p-4">التحقق</th><th className="p-4">الحالة</th><th className="p-4">الإجراءات</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((client) => <tr key={client.id}><td className="p-4"><div className="font-black text-[#00102e]">{client.name}</div><div className="font-mono text-[10px] text-slate-400">{client.publicId}</div></td><td className="p-4"><div>{client.email}</div><div className="text-[10px] text-slate-400">{client.phone || client.whatsappNumber || "—"}</div></td><td className="p-4">{client.accountType}{client.companyName && <div className="text-[10px] text-slate-400">{client.companyName}</div>}</td><td className="p-4"><b>{client.contractsCount}</b> عقد · <b>{client.requestsCount}</b> طلب</td><td className="p-4">{client.emailVerified ? <span className="font-black text-emerald-700">البريد مؤكد</span> : <span className="font-black text-amber-700">غير مؤكد</span>}</td><td className="p-4"><StatusBadge value={client.status} /></td><td className="p-4"><div className="flex gap-2"><Link href={`/users/${client.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-black text-[#00102e]"><Eye className="h-3.5 w-3.5" />فتح الملف</Link>{canManage && <button disabled={busy === client.id} onClick={() => void toggle(client)} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 font-black ${client.status === "suspended" ? "bg-emerald-700 text-white" : "bg-red-50 text-red-700"}`}><UserX className="h-3.5 w-3.5" />{client.status === "suspended" ? "تفعيل" : "تعليق"}</button>}</div></td></tr>)}</tbody></table></div>
      {items.length === 0 && <div className="p-12 text-center text-sm font-bold text-slate-500">لا توجد نتائج.</div>}
    </div>
  </div>;
}
