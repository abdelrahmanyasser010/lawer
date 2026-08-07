"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Eye, FileClock, FileText, Filter, Plus, RefreshCw, Search, UserRound } from "lucide-react";
import { frontendContractUrl } from "@/lib/urls";
import { can, getCurrentStaff } from "@/lib/adminAccess";
import { dashboardFeatures } from "@/config/dashboardFeatures";
import { dashboardRequest, DashboardApiError } from "@/lib/apiClient";

type ContractStatus = "draft" | "pending_payment" | "pending_review" | "assigned" | "in_progress" | "client_review" | "revision_requested" | "approved" | "locked" | "issued" | "cancelled";
type ContractRow = {
  id: number;
  serialNumber: string;
  title: string;
  templateSlug: string;
  templateNameAr: string;
  clientName: string;
  createdByName?: string;
  assignedLawyerName?: string;
  sourceChannel: "customer" | "office";
  billingMode: string;
  status: ContractStatus;
  updatedAt: string;
};

const statusLabels: Record<ContractStatus, string> = {
  draft: "مسودة",
  pending_payment: "بانتظار الدفع",
  pending_review: "بانتظار المراجعة",
  assigned: "قيد المتابعة",
  in_progress: "قيد الصياغة",
  client_review: "مراجعة العميل",
  revision_requested: "تعديلات مطلوبة",
  approved: "معتمد",
  locked: "مقفول",
  issued: "صدر",
  cancelled: "ملغي",
};

const statusClass: Record<ContractStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_payment: "bg-amber-50 text-amber-800",
  pending_review: "bg-blue-50 text-blue-800",
  assigned: "bg-indigo-50 text-indigo-800",
  in_progress: "bg-violet-50 text-violet-800",
  client_review: "bg-cyan-50 text-cyan-800",
  revision_requested: "bg-rose-50 text-rose-800",
  approved: "bg-emerald-50 text-emerald-800",
  locked: "bg-slate-800 text-white",
  issued: "bg-[#00102e] text-white",
  cancelled: "bg-rose-100 text-rose-900",
};

export default function ContractsPage() {
  const staff = getCurrentStaff();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ContractStatus>("all");
  const [channel, setChannel] = useState<"all" | "customer" | "office">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (channel !== "all") params.set("source", channel);
      if (query.trim()) params.set("search", query.trim());
      const rows = await dashboardRequest<ContractRow[]>(`/api/v1/admin/contracts?${params.toString()}`);
      setContracts(rows);
    } catch (caught) {
      setError(caught instanceof DashboardApiError ? caught.message : "تعذر تحميل العقود");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [status, channel]);

  const visible = useMemo(() => contracts.filter((contract) => `${contract.serialNumber} ${contract.title} ${contract.clientName}`.toLowerCase().includes(query.toLowerCase())), [contracts, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-black text-[#00102e]">إدارة العقود</h1><p className="mt-1 text-xs font-semibold text-slate-500">العقود التي أنشأها العملاء أو المكتب، مع مصدر الإنشاء والإصدار والحالة، وتدار حاليًا بالكامل من حساب السوبر أدمن.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث</button>
          {dashboardFeatures.templateManagement && <Link href="/templates" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"><FileText className="h-4 w-4" /> القوالب</Link>}
          {dashboardFeatures.officeContractCreation && can(staff.role, "contracts.create_office") && <Link href="/contracts/create" className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white"><Plus className="h-4 w-4 text-[#986410]" /> إنشاء عقد من المكتب</Link>}
        </div>
      </div>

      {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700">{error}</div>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["إجمالي العقود", contracts.length, FileText],
          ["من المكتب", contracts.filter((item) => item.sourceChannel === "office").length, UserRound],
          ["تحتاج متابعة", contracts.filter((item) => ["pending_review","assigned","in_progress","revision_requested"].includes(item.status)).length, FileClock],
          ["صدرت", contracts.filter((item) => item.status === "issued").length, Archive],
        ].map(([label, value, Icon]) => { const CardIcon = Icon as typeof FileText; return <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><CardIcon className="h-5 w-5 text-[#986410]" /><div className="mt-3 text-2xl font-black text-[#00102e]">{String(value)}</div><div className="text-[10px] font-bold text-slate-500">{String(label)}</div></div>; })}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_190px_180px_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input className="w-full bg-transparent text-xs outline-none" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(); }} placeholder="بحث بالعميل أو رقم العقد" /></label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3"><Filter className="h-4 w-4 text-slate-400" /><select className="w-full bg-transparent py-2 text-xs font-bold outline-none" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">كل الحالات</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none" value={channel} onChange={(event) => setChannel(event.target.value as typeof channel)}><option value="all">كل مصادر الإنشاء</option><option value="customer">واجهة العميل</option><option value="office">مكتب المحاماة</option></select>
          <button type="button" onClick={() => void load()} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-[#00102e]">بحث</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-right">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-500"><tr><th className="px-4 py-3">العقد</th><th className="px-4 py-3">العميل</th><th className="px-4 py-3">المصدر</th><th className="px-4 py-3">الحالة</th><th className="px-4 py-3">آخر تحديث</th><th className="px-4 py-3">إجراء</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((contract) => <tr key={contract.id} className="text-xs hover:bg-slate-50/70"><td className="px-4 py-4"><div className="font-black text-[#00102e]">{contract.title}</div><div className="mt-1 font-mono text-[9px] font-bold text-slate-400">{contract.serialNumber}</div></td><td className="px-4 py-4 font-bold text-slate-700">{contract.clientName}</td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-[9px] font-black text-slate-700">{contract.sourceChannel === "office" ? `المكتب${contract.createdByName ? ` — ${contract.createdByName}` : ""}` : "العميل"}</span></td><td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-[9px] font-black ${statusClass[contract.status]}`}>{statusLabels[contract.status]}</span></td><td className="px-4 py-4 text-[10px] font-bold text-slate-400">{new Date(contract.updatedAt).toLocaleString("ar-EG")}</td><td className="px-4 py-4"><div className="flex gap-2"><Link href={`/contracts/${contract.id}`} className="inline-flex items-center gap-1 rounded-lg bg-[#00102e] px-3 py-2 text-[10px] font-black text-white">إدارة</Link><a href={frontendContractUrl(String(contract.id))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-[#00102e]"><Eye className="h-3.5 w-3.5" /> معاينة</a></div></td></tr>)}
              {!loading && visible.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-xs font-bold text-slate-400">لا توجد عقود مطابقة.</td></tr>}
              {loading && <tr><td colSpan={6} className="px-4 py-12 text-center text-xs font-bold text-slate-400">جاري تحميل العقود...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
