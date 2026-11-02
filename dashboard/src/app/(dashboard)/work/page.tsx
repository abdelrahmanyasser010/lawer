"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  User,
  X,
  Scale,
  BriefcaseBusiness,
} from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { getCurrentStaff } from "@/lib/adminAccess";
import { dashboardFeatures } from "@/config/dashboardFeatures";

type WorkItem = {
  id: number;
  serialNumber: string;
  requestType: string;
  requestPurpose?: "review" | "consultation" | null;
  title: string;
  contractTypeText?: string | null;
  selectedContractTypeName?: string | null;
  status: string;
  customerFacingStatus?: string | null;
  paymentStatus?: string | null;
  deliveryStatus?: string | null;
  nextCustomerAction?: { label: string } | null;
  priority: string;
  dueAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
  clientName?: string;
  assignedLawyerId?: number | null;
  assignedLawyerName?: string | null;
};

type Staff = { id: number; name: string; status: string };

type DashboardSummary = {
  requests: {
    total: number;
    needs_attention: number;
    unassigned: number;
    awaiting_client: number;
    meetings_today: number;
    overdue: number;
  };
};

const serviceLabels: Record<string, string> = {
  contract_review: "مراجعة / استشارة بخصوص عقد",
  contract_drafting: "صياغة بواسطة محامي",
  self_service_lawyer_review: "مراجعة محامي قبل إصدار Self-Service",
};

export default function WorkQueuePage() {
  const searchParams = useSearchParams();
  const current = getCurrentStaff();
  const canAssign =
    dashboardFeatures.assignment &&
    (current.role === "super_admin" || current.permissions.includes("requests.assign"));

  const [items, setItems] = useState<WorkItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary["requests"] | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mine, setMine] = useState(dashboardFeatures.assignment && current.role === "lawyer");
  const [queue, setQueue] = useState(searchParams.get("queue") || "");
  const [serviceType, setServiceType] = useState(searchParams.get("serviceType") || "");
  const [lawyerId, setLawyerId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQueue(searchParams.get("queue") || "");
    setServiceType(searchParams.get("serviceType") || "");
  }, [searchParams]);

  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams({ onlyMine: String(mine) });
      if (queue) params.set("queue", queue);
      if (serviceType) params.set("serviceType", serviceType);
      if (lawyerId) params.set("assignedLawyerId", lawyerId);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (query.trim()) params.set("search", query.trim());

      const [workItems, summaryRes] = await Promise.all([
        dashboardRequest<WorkItem[]>(`/api/v1/dashboard/work-queue?${params.toString()}`),
        dashboardRequest<{ requests: DashboardSummary["requests"] }>("/api/v1/dashboard/summary").catch(
          () => null
        ),
      ]);

      setItems(workItems);
      if (summaryRes?.requests) {
        setSummary(summaryRes.requests);
      }

      if (canAssign) {
        setStaff(await dashboardRequest<Staff[]>("/api/v1/admin/team/assignable-lawyers"));
      } else {
        setStaff([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل مركز المتابعة");
    } finally {
      setLoaded(true);
    }
  }, [mine, canAssign, queue, serviceType, lawyerId, paymentStatus, from, to, query]);

  useEffect(() => {
    void load();
  }, [mine, queue, serviceType, lawyerId, paymentStatus, from, to]);

  const lawyers = useMemo(() => staff.filter((item) => item.status !== "suspended"), [staff]);

  async function assign(id: number, lawyer: number) {
    setBusy(id);
    try {
      await dashboardRequest(`/api/v1/admin/service-requests/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ lawyerId: lawyer }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحديث المحامي المسؤول");
    } finally {
      setBusy(null);
    }
  }

  function resetFilters() {
    setQueue("");
    setServiceType("");
    setLawyerId("");
    setPaymentStatus("");
    setFrom("");
    setTo("");
    setQuery("");
  }

  const hasActiveFilters = Boolean(
    queue || serviceType || lawyerId || paymentStatus || from || to || query.trim()
  );

  if (error && !loaded) {
    return (
      <div className="p-6 sm:p-8">
        <PageError message={error} onRetry={load} />
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="p-6 sm:p-8">
        <PageLoading label="جاري تنظيم طلبات مركز المتابعة..." />
      </div>
    );
  }

  // Quick queue navigation tabs
  const queueTabs = [
    { key: "", label: "جميع الطلبات", count: summary?.total },
    { key: "needs_attention", label: "تحتاج إجراء", count: summary?.needs_attention, alert: true },
    { key: "with_lawyer", label: "عند المحامي", count: undefined },
    { key: "awaiting_client", label: "بانتظار العميل", count: summary?.awaiting_client },
    { key: "meetings_today", label: "مواعيد اليوم", count: summary?.meetings_today },
    { key: "overdue", label: "متأخرة", count: summary?.overdue, danger: true },
    { key: "completed", label: "المكتملة", count: undefined },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-7">
      {/* Header with Title and Global Actions */}
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-[#986410]">
            <ClipboardList className="h-4 w-4" />
            <span>مركز المتابعة والتشغيل الموحد</span>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-black text-[#00102e]">
            متابعة طلبات الخدمات والاستشارات
          </h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            شاشة موحدة لمتابعة صياغة العقود، المراجعات الخارجية، والاستشارات القانونية، ومراجعة Self-Service قبل الإصدار.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dashboardFeatures.assignment && (
            <button
              type="button"
              onClick={() => setMine((v) => !v)}
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                mine
                  ? "border-[#986410] bg-[#986410]/10 text-[#986410] font-black"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              طلباتي فقط
            </button>
          )}

          <button
            type="button"
            onClick={() => void load()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs active:scale-95"
            aria-label="تحديث"
            title="تحديث البيانات"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Operational Stat Cards (Interactive Overview Strip) */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => setQueue("")}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-right transition-all hover:border-slate-300 shadow-xs ${
              queue === ""
                ? "border-[#00102e] bg-[#00102e] text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>إجمالي الطلبات</span>
              <BriefcaseBusiness className={`h-4 w-4 ${queue === "" ? "text-[#d7a94f]" : "text-slate-400"}`} />
            </div>
            <div className="mt-3 text-2xl font-black tabular-nums">{summary.total}</div>
          </button>

          <button
            type="button"
            onClick={() => setQueue("needs_attention")}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-right transition-all hover:border-amber-300 shadow-xs ${
              queue === "needs_attention"
                ? "border-amber-600 bg-amber-600 text-white"
                : "border-amber-200 bg-amber-50/60 text-amber-950"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>تحتاج إجراء فوري</span>
              <Clock
                className={`h-4 w-4 ${queue === "needs_attention" ? "text-amber-200" : "text-amber-600"}`}
              />
            </div>
            <div className="mt-3 text-2xl font-black tabular-nums">{summary.needs_attention}</div>
          </button>

          <button
            type="button"
            onClick={() => setQueue("awaiting_client")}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-right transition-all hover:border-slate-300 shadow-xs ${
              queue === "awaiting_client"
                ? "border-[#00102e] bg-[#00102e] text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>بانتظار العميل</span>
              <User
                className={`h-4 w-4 ${queue === "awaiting_client" ? "text-[#d7a94f]" : "text-slate-400"}`}
              />
            </div>
            <div className="mt-3 text-2xl font-black tabular-nums">{summary.awaiting_client}</div>
          </button>

          <button
            type="button"
            onClick={() => setQueue("meetings_today")}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-right transition-all hover:border-blue-300 shadow-xs ${
              queue === "meetings_today"
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-blue-200 bg-blue-50/60 text-blue-950"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>مواعيد اليوم</span>
              <Calendar
                className={`h-4 w-4 ${queue === "meetings_today" ? "text-blue-200" : "text-blue-600"}`}
              />
            </div>
            <div className="mt-3 text-2xl font-black tabular-nums">{summary.meetings_today}</div>
          </button>

          <button
            type="button"
            onClick={() => setQueue("overdue")}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-right transition-all hover:border-rose-300 shadow-xs ${
              queue === "overdue"
                ? "border-rose-700 bg-rose-700 text-white"
                : "border-rose-200 bg-rose-50/60 text-rose-950"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>طلبات متأخرة</span>
              <AlertCircle
                className={`h-4 w-4 ${queue === "overdue" ? "text-rose-200" : "text-rose-600"}`}
              />
            </div>
            <div className="mt-3 text-2xl font-black tabular-nums">{summary.overdue}</div>
          </button>
        </div>
      )}

      {/* Segmented Queue Filter Navigation Pills */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1">
        {queueTabs.map((tab) => {
          const active = queue === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setQueue(tab.key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                active
                  ? "bg-white font-black text-[#00102e] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums ${
                    active
                      ? "bg-slate-100 text-[#00102e]"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Structured Filters Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1.5fr)_180px_180px_170px_auto]">
          {/* Search Input */}
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void load()}
              placeholder="بحث بالعميل، رقم الطلب، أو الموضوع..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-9 pl-3 text-xs font-medium text-[#00102e] outline-none transition focus:border-[#00102e] focus:bg-white focus:ring-1 focus:ring-[#986410]/20"
            />
          </div>

          {/* Service Type Select */}
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#00102e] outline-none transition focus:border-[#00102e]"
          >
            <option value="">جميع الخدمات</option>
            {Object.entries(serviceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Lawyer Filter (if available) */}
          <select
            value={lawyerId}
            onChange={(e) => setLawyerId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#00102e] outline-none transition focus:border-[#00102e]"
          >
            <option value="">جميع المحامين</option>
            {lawyers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* Payment Status Select */}
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#00102e] outline-none transition focus:border-[#00102e]"
          >
            <option value="">جميع حالات الدفع</option>
            <option value="unpaid">غير مدفوع</option>
            <option value="partially_paid">عربون مسدد</option>
            <option value="paid">مسدد بالكامل</option>
            <option value="refund_pending">جاري الاسترداد</option>
            <option value="refunded">مسترد</option>
          </select>

          {/* Search Button */}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-[#00102e] px-6 py-2.5 text-xs font-black text-[#d7a94f] hover:bg-[#001a42] active:scale-95 transition shadow-xs"
          >
            بحث
          </button>
        </div>

        {/* Date Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-500">نطاق التحديث:</span>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-[11px] font-bold">من</span>
              <DatePickerInput
                value={from}
                onChange={setFrom}
                showTodayButton={false}
                clearable
                placeholder="من تاريخ"
                className="py-1 text-xs"
                wrapperClassName="w-36"
              />
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-[11px] font-bold">إلى</span>
              <DatePickerInput
                value={to}
                onChange={setTo}
                showTodayButton={false}
                clearable
                placeholder="إلى تاريخ"
                className="py-1 text-xs"
                wrapperClassName="w-36"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Operations Queue Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-right text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-black text-slate-500">
              <tr>
                <th className="p-4">الطلب والعميل</th>
                <th className="p-4">الخدمة ونوع العقد</th>
                {dashboardFeatures.assignment && <th className="p-4">المحامي المسؤول</th>}
                <th className="p-4">حالة الخدمة</th>
                <th className="p-4">حالة الدفع</th>
                <th className="p-4">المطلوب حاليًا</th>
                <th className="p-4">آخر تحديث</th>
                <th className="p-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const purpose =
                  item.requestType === "contract_review"
                    ? item.requestPurpose === "consultation"
                      ? "استشارة"
                      : "مراجعة"
                    : null;
                const contractType =
                  item.requestType === "contract_review"
                    ? item.contractTypeText
                    : item.selectedContractTypeName;

                const isOverdue =
                  item.priority === "high" ||
                  (item.dueAt && new Date(item.dueAt).getTime() < Date.now());

                return (
                  <tr
                    key={item.id}
                    className={`align-top transition-colors hover:bg-slate-50/80 ${
                      isOverdue ? "bg-rose-50/25" : ""
                    }`}
                  >
                    {/* Request Serial & Title & Client */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                          {item.serialNumber}
                        </span>
                        {item.priority === "high" && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800">
                            أولوية عاجلة
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 max-w-xs font-black text-[#00102e] text-xs leading-5">
                        {item.title}
                      </div>
                      <div className="mt-1 text-slate-500 font-bold text-[11px]">
                        العميل: {item.clientName || "—"}
                      </div>
                    </td>

                    {/* Service & Contract Type */}
                    <td className="p-4">
                      <div className="font-bold text-[#00102e]">
                        {serviceLabels[item.requestType] || "طلب خدمة"}
                      </div>
                      {purpose && (
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                            purpose === "استشارة"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-amber-50 text-amber-900 border border-amber-200"
                          }`}
                        >
                          {purpose}
                        </span>
                      )}
                      {contractType && (
                        <div className="mt-1 text-slate-500 font-medium text-[11px]">
                          العقد: {contractType}
                        </div>
                      )}
                    </td>

                    {/* Assigned Lawyer (with quick assign dropdown if privileged) */}
                    {dashboardFeatures.assignment && (
                      <td className="p-4">
                        {canAssign ? (
                          <select
                            disabled={busy === item.id}
                            value={item.assignedLawyerId || ""}
                            onChange={(e) =>
                              e.target.value && void assign(item.id, Number(e.target.value))
                            }
                            className="w-40 rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-[#00102e] outline-none transition focus:border-[#00102e]"
                          >
                            <option value="">
                              {item.assignedLawyerName || "تعيين محامي..."}
                            </option>
                            {lawyers.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-1.5 font-bold text-[#00102e]">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{item.assignedLawyerName || "غير محدد"}</span>
                          </div>
                        )}
                      </td>
                    )}

                    {/* Operational Status */}
                    <td className="p-4">
                      <StatusBadge value={item.status} />
                    </td>

                    {/* Payment Status */}
                    <td className="p-4">
                      <StatusBadge value={item.paymentStatus || "unpaid"} />
                    </td>

                    {/* Current Required Action */}
                    <td className="p-4">
                      <span className="font-bold text-slate-600 text-xs">
                        {item.nextCustomerAction?.label || "قيد المتابعة القانونية"}
                      </span>
                    </td>

                    {/* Last Updated Timestamp */}
                    <td className="p-4 whitespace-nowrap text-slate-500 tabular-nums text-[11px]">
                      {new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleDateString(
                        "ar-EG",
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="p-4 text-center">
                      <Link
                        href={`/work/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-[#00102e] hover:bg-[#00102e] hover:text-[#d7a94f] hover:border-[#00102e] transition shadow-2xs active:scale-95"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-[#986410]" />
                        <span>فتح الطلب</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className="p-12 text-center text-xs font-bold text-slate-400">
            لا توجد طلبات مطابقة للفلاتر المحددة حاليًا.
          </div>
        )}
      </div>
    </div>
  );
}
