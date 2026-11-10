"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  ExternalLink,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  User,
  WalletCards,
  X,
} from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { AdminDialog } from "@/components/admin/AdminDialog";

type Payment = {
  id: number;
  clientId: number;
  serialNumber: string;
  amountEgp: number;
  status: string;
  source?: "gateway" | "admin_manual_collection" | string;
  provider?: string | null;
  transactionReference?: string | null;
  providerReference?: string | null;
  paymentStage?: "initial" | "balance" | "full" | string;
  contractId?: number | null;
  serviceRequestId?: number | null;
  contractSerial?: string | null;
  serviceRequestSerial?: string | null;
  serviceRequestTitle?: string | null;
  createdAt: string;
  clientName: string;
  clientEmail: string;
  recordedByName?: string | null;
  adminNotes?: string | null;
};

type PaginatedPayments = {
  items: Payment[];
  pagination: { page: number; perPage: number; total: number; pages: number };
};

type RefundDraft = {
  id: number;
  maxAmount: number;
  amount: string;
  reason: string;
} | null;

type RemainingDraft = {
  serviceRequestId: string;
  amount: string;
  reason: string;
  externalReference: string;
};

const sourceLabels: Record<string, string> = {
  gateway: "بوابة Paymob",
  admin_manual_collection: "تحصيل مسجل يدويًا",
};

const stageLabels: Record<string, string> = {
  initial: "عربون / دفعة أولى",
  balance: "الدفعة المتبقية",
  full: "سداد كامل",
};

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Payment[]>([]);
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 50,
    total: 0,
    pages: 1,
  });
  const [refund, setRefund] = useState<RefundDraft>(null);
  const [remainingOpen, setRemainingOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<RemainingDraft>({
    serviceRequestId: "",
    amount: "",
    reason: "",
    externalReference: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        paginate: "1",
        page: String(page),
        perPage: "50",
      });
      if (status) params.set("status", status);
      if (query.trim()) params.set("search", query.trim());

      const result = await dashboardRequest<PaginatedPayments>(
        `/api/v1/admin/payments?${params}`
      );
      setItems(result.items);
      setPagination(result.pagination);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل المدفوعات");
    } finally {
      setLoading(false);
    }
  }, [status, query, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!refund) return;
    const amount = Number(refund.amount);
    if (!amount || amount <= 0 || amount > refund.maxAmount) {
      setError("اكتب مبلغ استرداد صحيحًا.");
      return;
    }
    if (!refund.reason.trim()) {
      setError("سبب الاسترداد مطلوب.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await dashboardRequest(`/api/v1/admin/payments/${refund.id}/refund`, {
        method: "POST",
        body: JSON.stringify({
          amountEgp: amount,
          reason: refund.reason.trim(),
        }),
      });
      setRefund(null);
      setNotice(
        "تم إرسال طلب الاسترداد للبوابة بنجاح. تتحدث الحالة تلقائياً بعد تأكيد مزود الدفع."
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر بدء الاسترداد");
    } finally {
      setBusy(false);
    }
  }

  async function submitRemaining(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = Number(remaining.serviceRequestId);
    const amount = Number(remaining.amount);
    if (!id || !amount) {
      setError("حدد طلب الخدمة والمبلغ المحصل.");
      return;
    }
    if (!remaining.reason.trim()) {
      setError("سبب / بيان التحصيل مطلوب.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await dashboardRequest(
        `/api/v1/admin/service-requests/${id}/record-remaining-payment`,
        {
          method: "POST",
          body: JSON.stringify({
            amountEgp: amount,
            reason: remaining.reason.trim(),
            externalReference: remaining.externalReference.trim() || undefined,
          }),
        }
      );
      setRemainingOpen(false);
      setRemaining({
        serviceRequestId: "",
        amount: "",
        reason: "",
        externalReference: "",
      });
      setNotice("تم تسجيل تحصيل الدفعة المتبقية بنجاح وربطها بالطلب.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تسجيل التحصيل");
    } finally {
      setBusy(false);
    }
  }

  const kpis = useMemo(() => {
    let paidTotal = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let refundCount = 0;

    for (const item of items) {
      if (item.status === "paid") {
        paidTotal += Number(item.amountEgp || 0);
        paidCount++;
      } else if (item.status === "pending" || item.status === "pending_verification") {
        pendingCount++;
      } else if (item.status === "refunded" || item.status === "partially_refunded" || item.status === "refund_pending") {
        refundCount++;
      }
    }

    return { paidTotal, paidCount, pendingCount, refundCount };
  }, [items]);

  const statusTabs = [
    { key: "", label: "كل العمليات" },
    { key: "paid", label: "ناجحة ومسددة" },
    { key: "pending", label: "قيد التنفيذ" },
    { key: "refund_pending", label: "جاري الاسترداد" },
    { key: "refunded", label: "مستردة" },
    { key: "failed", label: "فاشلة" },
  ];

  if (loading && items.length === 0) {
    return (
      <div className="p-8">
        <PageLoading label="جاري تحميل سجل المعاملات المالية..." />
      </div>
    );
  }

  if (error && !items.length) {
    return (
      <div className="p-8">
        <PageError message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#00102e]/5 px-2.5 py-1 text-[11px] font-bold text-[#00102e]">
            <span>الإدارة المالية والتحصيل</span>
            <span className="text-slate-300">•</span>
            <span className="text-[#986410]">بوابة Paymob</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#00102e]">
            سجل المدفوعات والمعاملات
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            جميع عمليات السداد مؤتمتة وموثقة إلكترونياً. تسجيل الدفعات المتبقية بصلاحية للإدارة للحالات الاستثنائية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void load()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs active:scale-95"
            title="تحديث البيانات"
            aria-label="تحديث"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setRemainingOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d7a94f] hover:bg-[#001a42] shadow-xs transition active:scale-95"
          >
            <CircleDollarSign className="h-4 w-4" />
            <span>تسجيل تحصيل دفعة متبقية</span>
          </button>
        </div>
      </header>

      {/* Notifications / Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs font-bold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* KPI Overview Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Collected */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">محصل الصفحة الحالية</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700">
              <WalletCards className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#00102e] tabular-nums">
            {kpis.paidTotal.toLocaleString("en-US")} <span className="text-xs font-bold text-slate-500">ج.م</span>
          </div>
        </div>

        {/* Successful Transactions */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">عمليات مسددة بنجاح</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-200/80 bg-indigo-50 text-indigo-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#00102e] tabular-nums">
            {kpis.paidCount}
          </div>
        </div>

        {/* Pending Transactions */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">قيد التنفيذ / المراجعة</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50 text-amber-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-950 tabular-nums">
            {kpis.pendingCount}
          </div>
        </div>

        {/* Refunded */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">استردادات مسجلة</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50 text-rose-700">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-950 tabular-nums">
            {kpis.refundCount}
          </div>
        </div>
      </section>

      {/* Segmented Status Tabs */}
      <nav aria-label="تصفية العمليات" className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-300 bg-slate-100 p-1.5">
        {statusTabs.map((tab) => {
          const active = status === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                active
                  ? "border border-slate-300 bg-white font-black text-[#00102e] shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Search Bar Container */}
      <div className="rounded-2xl border border-slate-300 bg-white p-3.5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="بحث باسم العميل، البريد، رقم العملية، أو مرجع البوابة..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2.5 pr-9 pl-9 text-xs font-medium text-[#00102e] outline-none transition hover:border-slate-400 focus:border-[#00102e] focus:bg-white focus:ring-1 focus:ring-[#986410]/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="مسح البحث"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {(status || query) && (
            <button
              type="button"
              onClick={() => {
                setStatus("");
                setQuery("");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition active:scale-95"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>

      {/* Main High-Contrast Payments Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-right text-xs">
            <thead className="bg-slate-100 font-black text-slate-800 border-b border-slate-300">
              <tr>
                <th className="p-4">العملية والمرجع</th>
                <th className="p-4">العميل</th>
                <th className="p-4">المبلغ</th>
                <th className="p-4">المصدر والمرحلة</th>
                <th className="p-4">الارتباط بالنظام</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((payment) => (
                <tr
                  key={payment.id}
                  className="align-middle hover:bg-slate-50/80 transition-colors"
                >
                  {/* Serial & Date */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                        {payment.serialNumber}
                      </span>
                    </div>
                    {payment.transactionReference && (
                      <div className="mt-1 font-mono text-[11px] text-slate-500 font-medium">
                        مرجع: {payment.transactionReference}
                      </div>
                    )}
                    <div className="mt-1 text-[11px] text-slate-400 tabular-nums font-semibold">
                      {new Date(payment.createdAt).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>

                  {/* Client */}
                  <td className="p-4">
                    <Link
                      href={`/users/${payment.clientId}`}
                      className="font-black text-[#00102e] hover:text-[#986410] transition-colors"
                    >
                      {payment.clientName}
                    </Link>
                    <div className="mt-1 text-[11px] text-slate-500 font-medium">
                      {payment.clientEmail}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="p-4">
                    <div className="text-base font-black text-[#00102e] tabular-nums">
                      {payment.amountEgp.toLocaleString("en-US")} <span className="text-xs font-bold text-slate-500">ج.م</span>
                    </div>
                  </td>

                  {/* Source & Stage */}
                  <td className="p-4">
                    <div className="font-bold text-[#00102e]">
                      {sourceLabels[payment.source || ""] || payment.source || "بوابة Paymob"}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <span>{stageLabels[payment.paymentStage || ""] || payment.paymentStage || "—"}</span>
                      {payment.provider && <span>· {payment.provider}</span>}
                    </div>
                    {payment.recordedByName && (
                      <div className="mt-0.5 text-[10px] text-slate-400">
                        سجلها: {payment.recordedByName}
                      </div>
                    )}
                  </td>

                  {/* Linked Resource */}
                  <td className="p-4">
                    {payment.contractId ? (
                      <Link
                        href={`/contracts/${payment.contractId}`}
                        className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50/70 px-2 py-0.5 text-[11px] font-bold text-indigo-900 hover:bg-indigo-100 transition"
                      >
                        <span>{payment.contractSerial || `عقد #${payment.contractId}`}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : payment.serviceRequestId ? (
                      <div>
                        <Link
                          href={`/work/${payment.serviceRequestId}`}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/70 px-2 py-0.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition"
                        >
                          <span>{payment.serviceRequestSerial || `طلب #${payment.serviceRequestId}`}</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        {payment.serviceRequestTitle && (
                          <div className="mt-1 max-w-44 truncate text-[11px] text-slate-500 font-medium">
                            {payment.serviceRequestTitle}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-medium">—</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="p-4">
                    <StatusBadge value={payment.status} />
                    {payment.adminNotes && (
                      <div className="mt-1.5 max-w-48 text-[11px] text-slate-500">
                        {payment.adminNotes}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-center">
                    {["paid", "partially_refunded"].includes(payment.status) &&
                    payment.source !== "admin_manual_collection" ? (
                      <button
                        type="button"
                        onClick={() =>
                          setRefund({
                            id: payment.id,
                            maxAmount: payment.amountEgp,
                            amount: String(payment.amountEgp),
                            reason: "",
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 hover:border-rose-300 transition active:scale-95 shadow-2xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                        <span>استرداد</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 font-medium">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className="p-12 text-center text-xs font-bold text-slate-500">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="mt-3 text-sm font-black text-[#00102e]">
              لا توجد عمليات دفع مطابقة
            </div>
            <p className="mt-1 text-slate-500">
              يمكنك تجربة تغيير فلاتر البحث أو اختيار حالة دفع أخرى.
            </p>
          </div>
        )}

        {/* Footer Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-600">
          <div>
            إجمالي العمليات: <span className="font-black text-[#00102e]">{pagination.total}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40 shadow-2xs transition"
            >
              السابق
            </button>
            <span className="tabular-nums">
              صفحة {pagination.page.toLocaleString("en-US")} من {pagination.pages.toLocaleString("en-US")}
            </span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((v) => Math.min(pagination.pages, v + 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40 shadow-2xs transition"
            >
              التالي
            </button>
          </div>
        </div>
      </div>

      {/* Record Remaining Payment Dialog */}
      <AdminDialog
        open={remainingOpen}
        title="تسجيل تحصيل الدفعة المتبقية"
        description="إجراء إداري داخلي للحالات الاستثنائية لربط التحصيل بطلب الخدمة."
        onClose={() => !busy && setRemainingOpen(false)}
      >
        <form onSubmit={submitRemaining} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم طلب الخدمة الداخلي (ID)
            </label>
            <input
              aria-label="رقم طلب الخدمة"
              required
              type="text"
              inputMode="numeric"
              value={remaining.serviceRequestId}
              onChange={(e) =>
                setRemaining((x) => ({
                  ...x,
                  serviceRequestId: e.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="مثال: 14"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-[#00102e]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المبلغ المحصل (ج.م)
            </label>
            <input
              aria-label="المبلغ المحصل"
              required
              type="text"
              inputMode="decimal"
              value={remaining.amount}
              onChange={(e) =>
                setRemaining((x) => ({
                  ...x,
                  amount: e.target.value.replace(/[^0-9.]/g, ""),
                }))
              }
              placeholder="مثال: 500"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-[#00102e]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              بيان / سبب التحصيل (إلزامي)
            </label>
            <textarea
              aria-label="سبب التحصيل"
              required
              value={remaining.reason}
              onChange={(e) =>
                setRemaining((x) => ({ ...x, reason: e.target.value }))
              }
              placeholder="اكتب سبب التحصيل الإداري..."
              className="min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-[#00102e]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مرجع خارجي (اختياري)
            </label>
            <input
              aria-label="مرجع خارجي"
              value={remaining.externalReference}
              onChange={(e) =>
                setRemaining((x) => ({
                  ...x,
                  externalReference: e.target.value,
                }))
              }
              placeholder="رقم إيصال أو تحويل بنكي"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-[#00102e]"
            />
          </div>

          <button
            disabled={busy}
            className="w-full rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-[#d7a94f] shadow-xs hover:bg-[#001a42] transition disabled:opacity-50"
          >
            {busy ? "جاري التسجيل..." : "تسجيل التحصيل"}
          </button>
        </form>
      </AdminDialog>

      {/* Refund Dialog */}
      <AdminDialog
        open={Boolean(refund)}
        title="طلب استرداد مالي عبر البوابة"
        description="الاسترداد لا يعتبر نافذاً إلا بعد تأكيد بوابة Paymob للبنوك."
        onClose={() => !busy && setRefund(null)}
      >
        {refund && (
          <form onSubmit={submitRefund} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                مبلغ الاسترداد (الحد الأقصى: {refund.maxAmount} ج.م)
              </label>
              <input
                aria-label="مبلغ الاسترداد"
                required
                type="text"
                inputMode="decimal"
                value={refund.amount}
                onChange={(e) =>
                  setRefund({
                    ...refund,
                    amount: e.target.value.replace(/[^0-9.]/g, ""),
                  })
                }
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-[#00102e]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سبب الاسترداد (مطلوب للتوثيق والتدقيق)
              </label>
              <textarea
                aria-label="سبب الاسترداد"
                required
                value={refund.reason}
                onChange={(e) =>
                  setRefund({ ...refund, reason: e.target.value })
                }
                placeholder="بيان سبب الاسترداد المالي..."
                className="min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-[#00102e]"
              />
            </div>

            <button
              disabled={busy}
              className="w-full rounded-xl bg-rose-700 px-5 py-2.5 text-xs font-black text-white shadow-xs hover:bg-rose-800 transition disabled:opacity-50"
            >
              {busy ? "جاري الإرسال..." : "إرسال طلب الاسترداد للبوابة"}
            </button>
          </form>
        )}
      </AdminDialog>
    </div>
  );
}
