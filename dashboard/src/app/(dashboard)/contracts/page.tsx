"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Clock,
  Eye,
  FileCheck,
  FileClock,
  FileText,
  Plus,
  RefreshCw,
  Search,
  User,
  UserRound,
  X,
  ExternalLink,
} from "lucide-react";
import { can, getCurrentStaff } from "@/lib/adminAccess";
import { dashboardFeatures } from "@/config/dashboardFeatures";
import { dashboardRequest, DashboardApiError } from "@/lib/apiClient";

type ContractStatus =
  | "draft"
  | "pending_payment"
  | "pending_review"
  | "assigned"
  | "in_progress"
  | "client_review"
  | "revision_requested"
  | "approved"
  | "locked"
  | "issued"
  | "cancelled";

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
  currentVersionId: number;
  updatedAt: string;
};

type Summary = {
  total: number;
  office: number;
  needs_attention: number;
  issued: number;
};

type Group = "" | "attention" | "pending_payment" | "awaiting_client" | "issued" | "cancelled";

const statusMeta: Record<
  ContractStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  draft: {
    label: "مسودة",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  pending_payment: {
    label: "بانتظار الدفع",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  pending_review: {
    label: "بانتظار المراجعة",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  assigned: {
    label: "قيد المتابعة",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
  },
  in_progress: {
    label: "قيد الصياغة",
    bg: "bg-violet-50",
    text: "text-violet-800",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  client_review: {
    label: "مراجعة العميل",
    bg: "bg-cyan-50",
    text: "text-cyan-800",
    border: "border-cyan-200",
    dot: "bg-cyan-500",
  },
  revision_requested: {
    label: "تعديلات مطلوبة",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  approved: {
    label: "معتمد للمراجعة",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  locked: {
    label: "مغلق نهائيًا",
    bg: "bg-slate-800",
    text: "text-slate-100",
    border: "border-slate-700",
    dot: "bg-slate-300",
  },
  issued: {
    label: "صادر معتمد",
    bg: "bg-[#00102e]",
    text: "text-[#d7a94f]",
    border: "border-[#d7a94f]/40",
    dot: "bg-[#d7a94f]",
  },
  cancelled: {
    label: "ملغي",
    bg: "bg-rose-100",
    text: "text-rose-900",
    border: "border-rose-200",
    dot: "bg-rose-400",
  },
};

export default function ContractsPage() {
  const paramsFromUrl = useSearchParams();
  const staff = getCurrentStaff();

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    office: 0,
    needs_attention: 0,
    issued: 0,
  });
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<Group>((paramsFromUrl.get("group") as Group) || "");
  const [channel, setChannel] = useState<"" | "customer" | "office">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const g = paramsFromUrl.get("group") as Group | null;
    if (g !== null) setGroup(g);
  }, [paramsFromUrl]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (group) params.set("group", group);
      if (channel) params.set("source", channel);
      if (query.trim()) params.set("search", query.trim());

      const [rows, sums] = await Promise.all([
        dashboardRequest<ContractRow[]>(`/api/v1/admin/contracts?${params}`),
        dashboardRequest<Summary>("/api/v1/admin/contracts/summary"),
      ]);
      setContracts(rows);
      setSummary(sums);
    } catch (caught) {
      setError(caught instanceof DashboardApiError ? caught.message : "تعذر تحميل العقود");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [group, channel]);

  function handleResetFilters() {
    setQuery("");
    setGroup("");
    setChannel("");
  }

  const hasActiveFilters = Boolean(group || channel || query.trim());

  const groupTabs: { key: Group; label: string; count?: number }[] = [
    { key: "", label: "جميع العقود", count: summary.total },
    { key: "attention", label: "تحتاج إجراء", count: summary.needs_attention },
    { key: "pending_payment", label: "بانتظار الدفع" },
    { key: "awaiting_client", label: "بانتظار العميل" },
    { key: "issued", label: "صادرة", count: summary.issued },
    { key: "cancelled", label: "ملغاة" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#00102e]/5 px-2.5 py-1 text-[11px] font-bold text-[#00102e]">
            <span>سجل العقود الموحد</span>
            <span className="text-slate-300">•</span>
            <span className="text-[#986410]">إدارة الصياغة والاعتماد</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#00102e]">
            إدارة وسجل العقود
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            متابعة شاملة لجميع العقود المنشأة من قِبل العملاء أو المكتب، وحالات الدفع والمراجعة والإصدار النهائي.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-[#986410]" : "text-slate-500"}`} />
            <span>تحديث البيانات</span>
          </button>

          {dashboardFeatures.officeContractCreation && can(staff.role, "contracts.create_office") && (
            <Link
              href="/contracts/create"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d7a94f] shadow-sm hover:bg-[#001a42] hover:shadow-md active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>إنشاء عقد من المكتب</span>
            </Link>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Interactive KPI Overview Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: All Contracts */}
        <button
          type="button"
          onClick={() => {
            setGroup("");
            setChannel("");
          }}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-right transition-all shadow-xs active:scale-[0.99] ${
            group === "" && channel === ""
              ? "border-[#00102e] bg-[#00102e] text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">إجمالي العقود</span>
            <FileText
              className={`h-4 w-4 ${group === "" && channel === "" ? "text-[#d7a94f]" : "text-[#986410]"}`}
            />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tabular-nums">{summary.total}</div>
            <div
              className={`mt-0.5 text-[11px] font-semibold ${
                group === "" && channel === "" ? "text-slate-300" : "text-slate-500"
              }`}
            >
              كافة العقود المسجلة
            </div>
          </div>
        </button>

        {/* Card 2: Needs Attention */}
        <button
          type="button"
          onClick={() => {
            setGroup("attention");
            setChannel("");
          }}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-right transition-all shadow-xs active:scale-[0.99] ${
            group === "attention"
              ? "border-amber-600 bg-amber-600 text-white"
              : "border-amber-200 bg-amber-50/50 text-amber-950 hover:border-amber-300 hover:bg-amber-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">تحتاج إجراء ومتابعة</span>
            <FileClock
              className={`h-4 w-4 ${group === "attention" ? "text-amber-200" : "text-amber-600"}`}
            />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tabular-nums">{summary.needs_attention}</div>
            <div
              className={`mt-0.5 text-[11px] font-semibold ${
                group === "attention" ? "text-amber-100" : "text-amber-700"
              }`}
            >
              قيد المراجعة أو الصياغة
            </div>
          </div>
        </button>

        {/* Card 3: Issued */}
        <button
          type="button"
          onClick={() => {
            setGroup("issued");
            setChannel("");
          }}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-right transition-all shadow-xs active:scale-[0.99] ${
            group === "issued"
              ? "border-emerald-700 bg-emerald-700 text-white"
              : "border-emerald-200 bg-emerald-50/50 text-emerald-950 hover:border-emerald-300 hover:bg-emerald-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">عقود صادرة ونافذة</span>
            <FileCheck
              className={`h-4 w-4 ${group === "issued" ? "text-emerald-200" : "text-emerald-600"}`}
            />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tabular-nums">{summary.issued}</div>
            <div
              className={`mt-0.5 text-[11px] font-semibold ${
                group === "issued" ? "text-emerald-100" : "text-emerald-700"
              }`}
            >
              صدرت للعميل رسمياً
            </div>
          </div>
        </button>

        {/* Card 4: Office Created */}
        <button
          type="button"
          onClick={() => {
            setChannel("office");
            setGroup("");
          }}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-right transition-all shadow-xs active:scale-[0.99] ${
            channel === "office"
              ? "border-indigo-700 bg-indigo-700 text-white"
              : "border-indigo-200 bg-indigo-50/50 text-indigo-950 hover:border-indigo-300 hover:bg-indigo-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">منشأة من المكتب</span>
            <Building2
              className={`h-4 w-4 ${channel === "office" ? "text-indigo-200" : "text-indigo-600"}`}
            />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tabular-nums">{summary.office}</div>
            <div
              className={`mt-0.5 text-[11px] font-semibold ${
                channel === "office" ? "text-indigo-100" : "text-indigo-700"
              }`}
            >
              عقود الشركات والمكتب
            </div>
          </div>
        </button>
      </section>

      {/* Segmented Group Tabs Navigation */}
      <nav aria-label="أقسام العقود" className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/90 p-1.5">
        {groupTabs.map((tab) => {
          const active = group === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setGroup(tab.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                active
                  ? "bg-white font-black text-[#00102e] shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums ${
                    active ? "bg-slate-100 text-[#00102e]" : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Search & Channel Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void load()}
              placeholder="بحث بالعميل، اسم العقد، أو رقم العقد (اضغط Enter)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pr-9 pl-9 text-xs font-medium text-[#00102e] outline-none transition focus:border-[#00102e] focus:bg-white focus:ring-1 focus:ring-[#986410]/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  void load();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="مسح البحث"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Channel Filter Pills */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <span className="text-[11px] font-bold text-slate-500 ml-1">المصدر:</span>
            {[
              { key: "" as const, label: "الكل" },
              { key: "customer" as const, label: "العميل" },
              { key: "office" as const, label: "المكتب" },
            ].map((c) => {
              const active = channel === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setChannel(c.key)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                    active
                      ? "bg-[#00102e] font-black text-white shadow-2xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-[#d7a94f] hover:bg-[#001a42] active:scale-95 transition shadow-xs"
            >
              تطبيق
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition active:scale-95"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
                <span>إعادة ضبط</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Contracts Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-right text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-black text-slate-500">
              <tr>
                <th className="p-4">العقد والمسار</th>
                <th className="p-4">العميل ومصدر الإنشاء</th>
                <th className="p-4">المحامي المسؤول</th>
                <th className="p-4">الحالة التشغيلية</th>
                <th className="p-4">آخر تحديث</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && contracts.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4">
                      <div className="h-4 w-32 rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-48 rounded bg-slate-100" />
                    </td>
                    <td className="p-4">
                      <div className="h-3 w-28 rounded bg-slate-200" />
                      <div className="mt-2 h-2.5 w-20 rounded bg-slate-100" />
                    </td>
                    <td className="p-4">
                      <div className="h-3 w-24 rounded bg-slate-200" />
                    </td>
                    <td className="p-4">
                      <div className="h-6 w-24 rounded-full bg-slate-100" />
                    </td>
                    <td className="p-4">
                      <div className="h-3 w-20 rounded bg-slate-100" />
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-block h-8 w-24 rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div className="mt-4 text-sm font-black text-[#00102e]">
                      لم يتم العثور على أي عقود
                    </div>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      لا توجد نتائج تطابق معايير الفلترة المحددة. يمكنك تجربة تغيير الفلاتر أو البحث بكلمات أخرى.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#00102e] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#001a42] transition"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-[#d7a94f]" />
                        <span>عرض جميع العقود</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => {
                  const meta = statusMeta[contract.status] || {
                    label: contract.status,
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                    border: "border-slate-200",
                    dot: "bg-slate-400",
                  };

                  return (
                    <tr
                      key={contract.id}
                      className="align-middle transition-colors hover:bg-slate-50/80"
                    >
                      {/* Contract Title & Serial */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                            {contract.serialNumber}
                          </span>
                          {contract.templateNameAr && (
                            <span className="rounded-md bg-[#986410]/10 px-2 py-0.5 text-[10px] font-bold text-[#986410]">
                              {contract.templateNameAr}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 max-w-sm font-black text-[#00102e] text-xs leading-5 hover:text-[#986410] transition-colors">
                          <Link href={`/contracts/${contract.id}`}>
                            {contract.title}
                          </Link>
                        </div>
                      </td>

                      {/* Client Name & Source Channel */}
                      <td className="p-4">
                        <div className="font-bold text-[#00102e]">
                          {contract.clientName || "—"}
                        </div>
                        <div className="mt-1">
                          {contract.sourceChannel === "office" ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                              <Building2 className="h-3 w-3 text-indigo-600" />
                              <span>المكتب</span>
                              {contract.createdByName && (
                                <span className="text-indigo-600">({contract.createdByName})</span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                              <UserRound className="h-3 w-3 text-teal-600" />
                              <span>العميل</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Assigned Lawyer */}
                      <td className="p-4">
                        {contract.assignedLawyerName ? (
                          <div className="flex items-center gap-1.5 font-bold text-[#00102e]">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{contract.assignedLawyerName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black ${meta.bg} ${meta.text} ${meta.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* Updated At */}
                      <td className="p-4 text-[11px] font-semibold text-slate-500 tabular-nums">
                        {new Date(contract.updatedAt).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/contracts/${contract.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#00102e] px-3 py-1.5 text-xs font-black text-white hover:bg-[#001a42] active:scale-95 transition shadow-2xs"
                          >
                            <span>إدارة</span>
                          </Link>
                          <Link
                            href={`/contracts/${contract.id}/preview?versionId=${contract.currentVersionId}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#00102e] hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition shadow-2xs"
                            title="معاينة العقد"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#986410]" />
                            <span>معاينة</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Strip */}
        {!loading && contracts.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 font-bold">
            <div>
              تم عرض <span className="font-black text-[#00102e]">{contracts.length}</span> عقداً
              {hasActiveFilters && " (مطابق للفلاتر المحددة)"}
            </div>
            <div className="text-[11px] text-slate-400">
              مرتبة حسب الأحدث تعديلاً
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
