"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  FilePenLine,
  FileText,
  Loader2,
  LockKeyhole,
  Printer,
  RefreshCw,
  Scale,
  Share2,
  Upload,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VodafoneCashModal from "@/components/checkout/VodafoneCashModal";
import ActionDialog from "@/components/ui/ActionDialog";
import ZShareModal from "@/components/sharing/ZShareModal";
import LegalDocumentSheet, { formatLegalValue, legalLabelDictionary } from "@/components/contract/LegalDocumentSheet";
import { apiRequest, apiUrl, ApiClientError, frontendApi } from "@/lib/apiClient";
import { contractStatusLabels, formatDate } from "@/lib/labels";
import type { ContractDetails, ContractDocumentFile } from "@/types/customer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

function formatRemaining(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const pdfStatusLabels: Record<string, string> = {
  queued: "قيد تجهيز ملف PDF",
  processing: "جارٍ تجهيز ملف PDF",
  ready: "النسخة المعتمدة جاهزة",
  failed: "تعذر تجهيز ملف PDF",
};

export default function ContractPage() {
  const { id } = useParams<{ id: string }>();
  const { catalog } = usePublicCatalog();
  const editHours = catalog.policies.selfServiceEditHours;
  const router = useRouter();
  const [item, setItem] = useState<ContractDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [documents, setDocuments] = useState<ContractDocumentFile[]>([]);
  const [finalizeConfirmOpen, setFinalizeConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"document" | "data" | "history">("document");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const contract = await frontendApi.contract(id);
      setItem(contract);
      setRemaining(contract.editWindow?.remainingSeconds ?? 0);
      if (contract.pdf_status === "ready") {
        const files = await apiRequest<ContractDocumentFile[]>(`/api/v1/contracts/${id}/documents`).catch(() => []);
        setDocuments(files);
      } else {
        setDocuments([]);
      }
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.replace(`/login?next=/contract/${id}`);
        return;
      }
      setError(caught instanceof Error ? caught.message : "تعذر تحميل العقد.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!item?.editWindow.active || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [item?.editWindow.active, remaining]);
  useEffect(() => {
    if (item?.editWindow.active && remaining === 0) void load();
  }, [item?.editWindow.active, load, remaining]);

  const contractTitle = item?.title || item?.template_name_ar || "عقد قانوني";
  const isSelfService = item?.creation_mode === "self_service";
  const fields = item?.field_values_json || {};

  // Group fields logically for human review
  const groupedData = useMemo(() => {
    const parties: Array<{ key: string; label: string; value: string }> = [];
    const subject: Array<{ key: string; label: string; value: string }> = [];
    const financials: Array<{ key: string; label: string; value: string }> = [];
    const others: Array<{ key: string; label: string; value: string }> = [];

    Object.entries(fields).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "" || Array.isArray(v) || typeof v === "object") return;
      const label = legalLabelDictionary[k] || item?.fieldMetadata?.[k]?.labelAr || k;
      const formattedVal = formatLegalValue(k, v);

      if (k.includes("seller") || k.includes("buyer") || k.includes("landlord") || k.includes("tenant") || k.includes("party") || k.includes("employer") || k.includes("employee") || k.includes("client") || k.includes("provider")) {
        parties.push({ key: k, label, value: formattedVal });
      } else if (k.includes("unit") || k.includes("property") || k.includes("city") || k.includes("governorate") || k.includes("address") || k.includes("area") || k.includes("building") || k.includes("floor") || k.includes("street")) {
        subject.push({ key: k, label, value: formattedVal });
      } else if (k.includes("price") || k.includes("rent") || k.includes("plan") || k.includes("amount") || k.includes("deposit") || k.includes("fee") || k.includes("salary")) {
        financials.push({ key: k, label, value: formattedVal });
      } else {
        others.push({ key: k, label, value: formattedVal });
      }
    });

    return { parties, subject, financials, others };
  }, [fields, item?.fieldMetadata]);

  async function performFinalizeEarly() {
    if (!item) return;
    setFinalizeConfirmOpen(false);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/v1/contracts/${item.id}/finalize`, {
        method: "POST",
        body: JSON.stringify({ confirmEarlyFinalization: true }),
      });
      setNotice("تم اعتماد النسخة وإضافتها إلى قائمة تجهيز ملف PDF.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر اعتماد النسخة النهائية.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-[#986410]" /></div>;
  if (!item) return <main className="p-10 text-center"><p className="font-bold text-red-700">{error || "العقد غير موجود"}</p></main>;

  const platformFee = Number(item.original_price_egp || item.payment_amount_egp || 100);

  let primaryMobileAction = null;
  if (item.status === "pending_payment" && item.payment_status !== "pending_verification") {
    primaryMobileAction = (
      <button type="button" onClick={() => setPaymentOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-4 py-3.5 text-sm font-black text-white shadow-md active:scale-95 transition">
        <Upload className="h-4 w-4 text-[#d9a84e]" /> إرفاق إيصال الدفع
      </button>
    );
  } else if (isSelfService && item.status === "client_review" && item.permissions.canFinalize) {
    primaryMobileAction = (
      <button type="button" disabled={busy} onClick={() => setFinalizeConfirmOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-4 py-3.5 text-sm font-black text-white shadow-md active:scale-95 transition disabled:opacity-50">
        <LockKeyhole className="h-4 w-4 text-[#d9a84e]" /> اعتماد النسخة النهائية
      </button>
    );
  } else if (item.permissions.canDownloadPdf && item.pdf_status === "ready") {
    primaryMobileAction = (
      <a href={apiUrl(`/api/v1/contracts/${item.id}/pdf`)} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-4 py-3.5 text-sm font-black text-white shadow-md active:scale-95 transition">
        <Download className="h-4 w-4 text-[#d9a84e]" /> تحميل ملف الـ PDF
      </a>
    );
  } else if (item.status === "draft" && item.permissions.canEdit) {
    primaryMobileAction = (
      <Link href={`/wizard/${item.template_slug}?contractId=${item.id}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-4 py-3.5 text-sm font-black text-white shadow-md active:scale-95 transition">
        <FilePenLine className="h-4 w-4 text-[#d9a84e]" /> متابعة الصياغة
      </Link>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-right font-sans" dir="rtl">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8 sm:px-6">

        {/* Breadcrumb */}
        <Link href="/contracts" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#00102e] transition mb-3">
          <ArrowRight className="h-3.5 w-3.5" /> العودة إلى عقودي
        </Link>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
        {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{notice}</div>}

        {/* Compact Legal Workspace Header */}
        <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {item.serial_number}
                </span>
                <span className="text-xs text-[#986410] font-bold">• ملف العقد</span>
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl font-black text-[#00102e]">{contractTitle}</h1>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                العقد محفوظ في حسابك ويمكنك مراجعة بياناته قبل الاعتماد.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <span className="rounded-full bg-blue-50 border border-blue-200/60 px-3.5 py-1.5 text-xs font-black text-blue-700">
                {contractStatusLabels[item.status] || item.status}
              </span>
              {item.permissions.canShare && (
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#986410]/30 bg-[#986410]/5 px-3.5 py-1.5 text-xs font-black text-[#00102e] hover:bg-[#986410]/10 transition"
                >
                  <Share2 className="h-3.5 w-3.5 text-[#986410]" />
                  <span>مشاركة</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                title="طباعة"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>طباعة</span>
              </button>
            </div>
          </div>

          {/* Contextual Next Action: Pending Payment */}
          {item.status === "pending_payment" && (
            <div className={`mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border p-3.5 ${
              item.payment_status === "rejected" ? "bg-red-50 border-red-200 text-red-950" :
              item.payment_status === "needs_client_info" ? "bg-amber-50 border-amber-200 text-amber-950" :
              item.payment_status === "pending_verification" ? "bg-blue-50 border-blue-200 text-blue-950" :
              "bg-amber-50/90 border-amber-200 text-amber-950"
            }`}>
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#00102e] text-white">
                    الخطوة المطلوبة الآن
                  </span>
                  <span className="text-xs font-black">
                    {item.payment_status === "pending_verification" ? "إيصال سداد الرسوم قيد المراجعة" : "استكمال سداد رسوم إعداد العقد"}
                  </span>
                </div>
                <p className="text-xs leading-5 opacity-90">
                  {item.payment_status === "pending_verification"
                    ? "تم استلام إيصال التحويل ويجري مراجعته لتثبيت النسخة المعتمدة."
                    : `يرجى إرفاق إيصال تحويل رسوم الإعداد (${platformFee} ج.م) ليتم اعتماد النسخة النهائية للعقد.`}
                </p>
              </div>

              {item.payment_status !== "pending_verification" && (
                <button
                  type="button"
                  onClick={() => setPaymentOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-white hover:bg-[#00102e]/90 shadow-sm transition shrink-0"
                >
                  <Upload className="h-3.5 w-3.5 text-[#d9a84e]" />
                  <span>إرفاق إيصال سداد الرسوم</span>
                </button>
              )}
            </div>
          )}

          {/* Contextual Next Action: Edit Window Active */}
          {isSelfService && item.status === "client_review" && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-700 text-white">
                      متاح للمراجعة والتعديل
                    </span>
                    <h2 className="text-sm font-black text-amber-950">متاح تعديل بعض بيانات العقد</h2>
                  </div>
                  <p className="text-xs leading-5 text-amber-900">
                    يمكنك تعديل البيانات المسموح بها حتى {formatDate(item.editWindow.expiresAt)}. بعد انتهاء المهلة يتم تثبيت النسخة الحالية من العقد.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs font-bold text-amber-800">الوقت المتبقي للتعديل:</span>
                    <span className="font-mono text-sm font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded-md" dir="ltr">
                      {formatRemaining(remaining)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {item.permissions.canEdit && (
                    <Link
                      href={`/wizard/${item.template_slug}?contractId=${item.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition shadow-sm"
                    >
                      <FilePenLine className="h-3.5 w-3.5 text-[#986410]" />
                      <span>تعديل البيانات المتاحة</span>
                    </Link>
                  )}
                  {item.permissions.canFinalize && <button
                      type="button"
                      disabled={busy}
                      onClick={() => setFinalizeConfirmOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-white hover:bg-[#00102e]/90 shadow-sm transition disabled:opacity-50"
                    >
                      <LockKeyhole className="h-3.5 w-3.5 text-[#d9a84e]" />
                      <span>اعتماد النسخة الحالية الآن</span>
                    </button>
                  }
                </div>
              </div>
            </div>
          )}

          {isSelfService && item.status === "client_review" && item.permissions.canFinalize && !item.editWindow.active && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/90 p-4 text-blue-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-700 px-2 py-0.5 text-[10px] font-black text-white">
                      جاهز للاعتماد
                    </span>
                    <h2 className="text-sm font-black text-blue-950">انتهت مهلة التعديل ويمكن اعتماد النسخة</h2>
                  </div>
                  <p className="text-xs leading-5 text-blue-900">
                    يمكنك تثبيت النسخة الحالية وتجهيز ملف PDF النهائي من حسابك.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setFinalizeConfirmOpen(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#00102e]/90 disabled:opacity-50"
                >
                  <LockKeyhole className="h-3.5 w-3.5 text-[#d9a84e]" />
                  <span>اعتماد النسخة وتجهيز PDF</span>
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Workspace Layout: Tabs (Main ~70%) vs Sidebar (~30%) */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.22fr_0.78fr] items-start">

          {/* Main Column: Tabs & Document Preview */}
          <div className="space-y-4">

            {/* View Mode Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("document")}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
                    activeTab === "document"
                      ? "bg-[#00102e] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>العقد (معاينة A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("data")}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
                    activeTab === "data"
                      ? "bg-[#00102e] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Scale className="h-3.5 w-3.5" />
                  <span>البيانات الأساسية للعقد</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
                    activeTab === "history"
                      ? "bg-[#00102e] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>سجل نسخ العقد</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">
                منصة Z Draft للخدمات القانونية
              </span>
            </div>

            {/* Tab 1: Full Authentic Legal Document Sheet */}
            {activeTab === "document" && (
              <LegalDocumentSheet
                serialNumber={item.serial_number}
                templateSlug={item.template_slug}
                variantKey={item.variant_key}
                selectedOptionalClauseKeys={item.selected_optional_clause_keys}
                templateNameAr={item.template_name_ar}
                fieldValues={fields}
                status={item.status}
                isPaid={item.payment_status === "approved"}
              />
            )}

            {/* Tab 2: Grouped Data Breakdown (Clean Legal Categories) */}
            {activeTab === "data" && (
              <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">

                {/* 1. أطراف التعاقد */}
                <div>
                  <h3 className="text-sm font-black text-[#00102e] border-b border-slate-100 pb-2">
                    بيانات أطراف التعاقد
                  </h3>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    {groupedData.parties.map((row) => (
                      <div key={row.key} className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                        <dt className="text-[11px] font-bold text-slate-500">{row.label}</dt>
                        <dd className="mt-1 text-xs font-black text-slate-900">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* 2. محل العقد */}
                <div>
                  <h3 className="text-sm font-black text-[#00102e] border-b border-slate-100 pb-2">
                    بيانات العين محل العقد (العين المؤجرة / المبيعة)
                  </h3>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    {groupedData.subject.map((row) => (
                      <div key={row.key} className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                        <dt className="text-[11px] font-bold text-slate-500">{row.label}</dt>
                        <dd className="mt-1 text-xs font-black text-slate-900">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* 3. البيانات المالية */}
                <div>
                  <h3 className="text-sm font-black text-[#00102e] border-b border-slate-100 pb-2">
                    البيانات المالية للعقد وآلية السداد
                  </h3>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    {groupedData.financials.map((row) => (
                      <div key={row.key} className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                        <dt className="text-[11px] font-bold text-slate-500">{row.label}</dt>
                        <dd className="mt-1 text-xs font-black text-[#00102e]">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {groupedData.others.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-[#00102e] border-b border-slate-100 pb-2">
                      بيانات وشروط إضافية
                    </h3>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      {groupedData.others.map((row) => (
                        <div key={row.key} className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                          <dt className="text-[11px] font-bold text-slate-500">{row.label}</dt>
                          <dd className="mt-1 text-xs font-black text-slate-900">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Detailed Versions Timeline */}
            {activeTab === "history" && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h3 className="text-sm font-black text-[#00102e] border-b border-slate-100 pb-2">
                  سجل نسخ العقد وتاريخ التعديلات
                </h3>
                <div className="mt-4 space-y-3">
                  {item.versions.map((ver) => (
                    <div key={ver.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-black text-slate-800">النسخة {ver.versionNumber}</strong>
                          <span className="rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-[10px] font-black text-blue-700">
                            {contractStatusLabels[ver.status] || ver.status}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          تم الحفظ في: {formatDate(ver.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("document")}
                        className="rounded-xl bg-[#00102e] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#00102e]/90 transition"
                      >
                        معاينة
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column: Actions & Meta */}
          <aside className="space-y-6">

            {/* 1. Official Document (PDF) Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-[#00102e]">
                {item.status === "issued" ? "النسخة المعتمدة للعقد" : "نسخة المعاينة (PDF)"}
              </h2>

              <div className="mt-3 flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                {item.pdf_status === "ready" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                ) : item.pdf_status === "failed" ? (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                ) : (
                  <Clock3 className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" />
                )}
                <div>
                  <div className="text-xs font-black text-slate-800">
                    {item.status === "issued" ? "النسخة المعتمدة جاهزة للتحميل" : "ملف PDF متاح للمراجعة"}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                    {item.status === "issued"
                      ? "النسخة الموثقة المعتمدة بصيغة PDF محفوظة بحسابك."
                      : "يمكنك الاطلاع على مسودة العقد وتدقيق بنودها."}
                  </p>
                </div>
              </div>

              {item.permissions.canDownloadPdf && documents.length === 0 && (
                <a
                  href={apiUrl(`/api/v1/contracts/${item.id}/pdf`)}
                  className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-black text-white shadow-sm transition"
                >
                  <Download className="h-4 w-4" />
                  <span>{item.status === "issued" ? "تحميل النسخة المعتمدة (PDF)" : "تحميل نسخة المعاينة (PDF)"}</span>
                </a>
              )}

              {documents.length > 0 && (
                <div className="mt-3 space-y-2">
                  {documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={apiUrl(`/api/v1/contracts/${item.id}/documents/${doc.id}/download`)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-black text-emerald-900 hover:bg-emerald-100/70 transition"
                    >
                      <span>{doc.titleAr}</span>
                      <Download className="h-4 w-4 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Platform Fee / Payment Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-[#00102e]">رسوم إعداد العقد</h2>

              <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3.5 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-600">رسوم الخدمة:</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-[#00102e]">{platformFee.toLocaleString("ar-EG")}</span>
                    <span className="text-xs font-bold text-[#986410]">ج.م</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/60 pt-2">
                  <span>حالة الرسوم:</span>
                  <span className="font-bold text-slate-800">
                    {item.payment_status === "approved"
                      ? "تم سداد الرسوم"
                      : item.payment_status === "pending_verification"
                      ? "الإيصال قيد المراجعة"
                      : "لم يتم السداد بعد"}
                  </span>
                </div>
              </div>

              {item.status === "pending_payment" && item.payment_status !== "pending_verification" && (
                <button
                  type="button"
                  onClick={() => setPaymentOpen(true)}
                  className="mt-3.5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#00102e] hover:bg-[#00102e]/90 py-2.5 text-xs font-black text-white shadow-sm transition"
                >
                  <Upload className="h-3.5 w-3.5 text-[#d9a84e]" />
                  <span>إرفاق إيصال سداد الرسوم</span>
                </button>
              )}
            </section>

            {/* 3. Versions History Widget */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-[#00102e]">سجل نسخ العقد</h2>
              <div className="mt-3 space-y-2">
                {item.versions.map((ver) => (
                  <div key={ver.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <strong className="font-black text-slate-800">النسخة {ver.versionNumber}</strong>
                      <span className="rounded bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {contractStatusLabels[ver.status] || ver.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {formatDate(ver.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Post-issuance note */}
            {item.status === "issued" && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
                <h3 className="text-xs font-black text-amber-950">هل تحتاج تعديلاً بعد الاعتماد؟</h3>
                <p className="mt-1 text-[11px] leading-5 text-amber-900">
                  النسخة المعتمدة تظل ثابتة للحفاظ على الحجية القانونية. لطلب صياغة ملحق أو مراجعة إضافية يمكنك طلب استشارة من المكتب.
                </p>
                <Link
                  href="/#consultation"
                  className="mt-3 inline-block rounded-xl bg-amber-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-800 transition"
                >
                  طلب استشارة قانونية
                </Link>
              </section>
            )}

          </aside>

        </div>

        {/* Mobile Sticky Action Bar */}
        {primaryMobileAction && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 p-4 border-t border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md sm:hidden pb-6">
            {primaryMobileAction}
          </div>
        )}
      </main>

      <ActionDialog
        open={finalizeConfirmOpen}
        title="اعتماد وتثبيت النسخة الحالية"
        message={item.editWindow.active ? "سيتم إنهاء مهلة التعديل الآن واعتماد النسخة الحالية، ثم يبدأ تجهيز ملف PDF المعتمد." : "سيتم اعتماد النسخة الحالية وتجهيز ملف PDF المعتمد."}
        confirmLabel="تأكيد الاعتماد"
        onClose={() => setFinalizeConfirmOpen(false)}
        onConfirm={() => void performFinalizeEarly()}
      />

      <Footer />

      <ZShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        contractId={item.id}
        documentTitle={contractTitle}
        serialNumber={item.serial_number}
        allowEdit={item.status === "client_review" && item.editWindow.active}
      />

      <VodafoneCashModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        orderTitle={contractTitle}
        amountEgp={platformFee}
        contractId={item.id}
        serialNumber={item.serial_number}
        onSubmitted={() => { void load(); }}
      />
    </div>
  );
}
