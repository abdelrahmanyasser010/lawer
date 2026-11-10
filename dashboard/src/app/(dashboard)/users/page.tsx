"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Download,
  Eye,
  RefreshCw,
  Search,
  Check,
  X,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText,
  BriefcaseBusiness,
} from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { hasBackendPermission } from "@/lib/adminAccess";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { AdminDialog } from "@/components/admin/AdminDialog";
import CustomerContactActions from "@/components/admin/CustomerContactActions";
import { downloadXlsx } from "@/lib/simpleXlsx";

type Client = {
  id: number;
  publicId: string;
  name: string;
  email: string;
  phone?: string;
  whatsappNumber?: string;
  whatsappServiceConsentAt?: string | null;
  accountType: string;
  companyName?: string | null;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  contractsCount: number;
  requestsCount: number;
};

type SuspendAction = { client: Client; reason: string } | null;
type ExportPeriod = "month" | "quarter" | "year";
type CustomerExport = {
  period: ExportPeriod;
  range: { start: string; end: string };
  rows: Array<{
    publicId: string;
    name: string;
    email: string;
    phone?: string;
    whatsappNumber?: string;
    whatsappServiceConsentAt?: string | null;
    accountType: string;
    companyName?: string | null;
    status: string;
    contractsCount: number;
    requestsCount: number;
    approvedPaymentsEgp: number;
  }>;
};

const exportPeriodLabels: Record<ExportPeriod, string> = {
  month: "الشهر الحالي",
  quarter: "الربع الحالي",
  year: "السنة الحالية",
};

const accountLabels: Record<string, string> = {
  individual: "فردي",
  business: "شركة",
  company: "شركة",
};

const clientStatusLabels: Record<string, string> = {
  active: "نشط",
  suspended: "موقوف",
};

export default function UsersPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [suspend, setSuspend] = useState<SuspendAction>(null);
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>("month");
  const [exporting, setExporting] = useState(false);

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

  async function exportCustomers() {
    setExporting(true);
    setError("");
    try {
      const result = await dashboardRequest<CustomerExport>(
        `/api/v1/admin/reports/customer-export?period=${exportPeriod}`
      );
      downloadXlsx(
        `zdraft-customers-${exportPeriod}-${new Date().toISOString().slice(0, 10)}.xlsx`,
        [
          {
            name: "العملاء والنشاط",
            widths: [18, 28, 32, 18, 18, 16, 26, 14, 14, 14, 20],
            freezeHeader: true,
            autoFilter: true,
            rows: [
              [
                "Z-ID",
                "الاسم",
                "البريد",
                "الهاتف",
                "واتساب",
                "نوع الحساب",
                "الشركة",
                "الحالة",
                "العقود",
                "الطلبات",
                "المدفوعات المسددة ج.م",
              ],
              ...result.rows.map((row) => [
                row.publicId,
                row.name,
                row.email,
                row.phone || "",
                row.whatsappNumber || "",
                accountLabels[row.accountType] || row.accountType,
                row.companyName || "",
                clientStatusLabels[row.status] || row.status,
                row.contractsCount,
                row.requestsCount,
                Number(row.approvedPaymentsEgp || 0),
              ]),
            ],
          },
        ]
      );
      setNotice(`تم تجهيز ملف العملاء ونشاطهم خلال ${exportPeriodLabels[exportPeriod]}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تصدير العملاء");
    } finally {
      setExporting(false);
    }
  }

  async function reactivate(client: Client) {
    setBusy(client.id);
    setError("");
    try {
      await dashboardRequest(`/api/v1/admin/users/${client.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      });
      setNotice("تمت إعادة تفعيل حساب العميل بنجاح.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحديث الحساب");
    } finally {
      setBusy(null);
    }
  }

  async function confirmSuspend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!suspend) return;
    const reason = suspend.reason.trim();
    if (!reason) {
      setError("سبب تعليق الحساب مطلوب");
      return;
    }
    setBusy(suspend.client.id);
    setError("");
    try {
      await dashboardRequest(`/api/v1/admin/users/${suspend.client.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "suspended", reason }),
      });
      setNotice("تم تعليق الحساب وإلغاء جلساته النشطة.");
      setSuspend(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تعليق الحساب");
    } finally {
      setBusy(null);
    }
  }

  if (!loaded)
    return (
      <div className="p-8">
        <PageLoading label="جاري تحميل سجل العملاء..." />
      </div>
    );
  if (error && !items.length)
    return (
      <div className="p-8">
        <PageError message={error} onRetry={load} />
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#00102e]/5 px-2.5 py-1 text-[11px] font-bold text-[#00102e]">
            <span>إدارة المنصة</span>
            <span className="text-slate-300">•</span>
            <span className="text-[#986410]">سجل العملاء والشركات</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#00102e]">
            العملاء والشركات
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            ملف موحد لكل عميل مع بيانات التواصل، حجم النشاط التعاقدي، والمدفوعات وحالة الحساب.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <select
              aria-label="فترة تصدير العملاء"
              value={exportPeriod}
              onChange={(e) => setExportPeriod(e.target.value as ExportPeriod)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-[#00102e] outline-none shadow-2xs hover:border-slate-400"
            >
              {Object.entries(exportPeriodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <button
              disabled={exporting}
              onClick={() => void exportCustomers()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-[#d7a94f] shadow-xs hover:bg-[#001a42] transition active:scale-95 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{exporting ? "جاري التصدير..." : "تصدير Excel"}</span>
            </button>
          </div>

          <button
            onClick={() => void load()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs active:scale-95"
            aria-label="تحديث"
            title="تحديث البيانات"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Search & Filter Container */}
      <div className="rounded-2xl border border-slate-300 bg-white p-3.5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم العميل، البريد الإلكتروني، أو رقم الهاتف..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2.5 pr-9 pl-9 text-xs font-medium text-[#00102e] outline-none transition hover:border-slate-400 focus:border-[#00102e] focus:bg-white focus:ring-1 focus:ring-[#986410]/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="مسح البحث"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="تصفية العملاء حسب الحالة"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50/70 px-4 py-2.5 text-xs font-bold text-[#00102e] outline-none transition hover:border-slate-400 focus:border-[#00102e]"
            >
              <option value="">كافة الحالات</option>
              <option value="active">نشط</option>
              <option value="suspended">موقوف</option>
            </select>

            {(search || status) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition active:scale-95"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
                <span>إعادة ضبط</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main High-Contrast Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-right text-xs">
            <thead className="bg-slate-100 font-black text-slate-800 border-b border-slate-300">
              <tr>
                <th className="p-4">العميل</th>
                <th className="p-4">بيانات التواصل السريعة</th>
                <th className="p-4">نوع الحساب</th>
                <th className="p-4">النشاط التعاقدي</th>
                <th className="p-4">التحقق</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((client) => (
                <tr
                  key={client.id}
                  className="align-middle hover:bg-slate-50/80 transition-colors"
                >
                  {/* Client Info (Without technical user_id) */}
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00102e]/5 border border-slate-200 text-[#00102e] font-black text-xs">
                        {client.name ? client.name.slice(0, 1) : "ع"}
                      </div>
                      <div>
                        <Link
                          href={`/users/${client.id}`}
                          className="font-black text-[#00102e] hover:text-[#986410] transition-colors text-xs"
                        >
                          {client.name}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-slate-500 font-medium">
                          {client.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact Actions */}
                  <td className="p-4">
                    <CustomerContactActions
                      phone={client.phone}
                      whatsapp={client.whatsappNumber}
                      whatsappAllowed={Boolean(client.whatsappServiceConsentAt)}
                      compact
                    />
                  </td>

                  {/* Account Type */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 font-bold text-[#00102e]">
                      {client.accountType === "business" || client.accountType === "company" ? (
                        <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <span>{accountLabels[client.accountType] || "غير محدد"}</span>
                    </div>
                    {client.companyName && (
                      <div className="mt-0.5 text-[11px] text-slate-500 font-medium">
                        {client.companyName}
                      </div>
                    )}
                  </td>

                  {/* Activity */}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        <FileText className="h-3 w-3 text-slate-400" />
                        <b className="font-black text-[#00102e]">{client.contractsCount}</b> عقود
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        <BriefcaseBusiness className="h-3 w-3 text-slate-400" />
                        <b className="font-black text-[#00102e]">{client.requestsCount}</b> طلبات
                      </span>
                    </div>
                  </td>

                  {/* Email Verification */}
                  <td className="p-4">
                    {client.emailVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>مؤكد</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-800">
                        <span>غير مؤكد</span>
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <StatusBadge value={client.status} />
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/users/${client.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-[#00102e] hover:bg-slate-50 hover:border-slate-300 transition active:scale-95 shadow-2xs"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#986410]" />
                        <span>الملف</span>
                      </Link>

                      {canManage && (
                        client.status === "suspended" ? (
                          <button
                            type="button"
                            disabled={busy === client.id}
                            onClick={() => void reactivate(client)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-800 transition active:scale-95 shadow-2xs disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>تفعيل</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy === client.id}
                            onClick={() => setSuspend({ client, reason: "" })}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 transition active:scale-95 shadow-2xs disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>تعليق</span>
                          </button>
                        )
                      )}
                    </div>
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
              <User className="h-6 w-6" />
            </div>
            <div className="mt-3 text-sm font-black text-[#00102e]">
              لم يتم العثور على أي عملاء
            </div>
            <p className="mt-1 text-slate-500">
              جرب تغيير عبارة البحث أو اختيار حالة حساب أخرى.
            </p>
          </div>
        )}

        {/* Footer Summary */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-600">
          <div>
            تم عرض <span className="font-black text-[#00102e]">{items.length}</span> عميلاً
          </div>
          <div className="text-[11px] text-slate-400">
            مرتبين حسب الأحدث تسجيلاً
          </div>
        </div>
      </div>

      {/* Suspend Account Dialog */}
      <AdminDialog
        open={Boolean(suspend)}
        title="تعليق حساب العميل"
        description="سيتم تسجيل خروج العميل من كل الجلسات ومنعه من الدخول حتى إعادة التفعيل. اكتب سببًا واضحًا يُحفظ في سجل النظام."
        onClose={() => !busy && setSuspend(null)}
      >
        {suspend && (
          <form onSubmit={confirmSuspend} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سبب تعليق الحساب (إلزامي للتوثيق الإداري)
              </label>
              <textarea
                aria-label="سبب تعليق حساب العميل"
                required
                maxLength={1000}
                value={suspend.reason}
                onChange={(e) =>
                  setSuspend({ ...suspend, reason: e.target.value })
                }
                placeholder="اكتب سبب التعليق..."
                className="min-h-24 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-[#00102e]"
              />
            </div>
            <button
              disabled={busy === suspend.client.id}
              className="w-full rounded-xl bg-rose-700 px-5 py-2.5 text-xs font-black text-white shadow-xs hover:bg-rose-800 transition disabled:opacity-50"
            >
              {busy === suspend.client.id ? "جاري التعليق..." : "تأكيد تعليق الحساب"}
            </button>
          </form>
        )}
      </AdminDialog>
    </div>
  );
}
