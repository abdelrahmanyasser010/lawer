"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Download, FilePenLine, FileText, Loader2, LockKeyhole, RefreshCw } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VodafoneCashModal from "@/components/checkout/VodafoneCashModal";
import { apiRequest, apiUrl, ApiClientError, frontendApi } from "@/lib/apiClient";
import { contractStatusLabels, formatDate } from "@/lib/labels";
import type { ContractDetails, ContractDocumentFile } from "@/types/customer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

function formatContractValue(
  value: string | number | boolean | null,
  metadata?: { type: string; options: Array<{ value: string; labelAr: string }> },
) {
  if (value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  const option = metadata?.options.find((item) => item.value === String(value));
  if (option) return option.labelAr;
  if (metadata?.type === "money" || metadata?.type === "number") {
    const number = Number(value);
    if (Number.isFinite(number)) return new Intl.NumberFormat("ar-EG").format(number);
  }
  if (metadata?.type === "date") {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("ar-EG");
  }
  return String(value);
}

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
  ready: "ملف PDF جاهز",
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

  const title = item?.title || item?.template_name_ar || "العقد";
  const isSelfService = item?.creation_mode === "self_service";
  const dataRows = useMemo(() => {
    if (!item) return [];
    return Object.entries(item.field_values_json || {})
      .filter(([, value]) => value !== null && value !== "" && !Array.isArray(value) && typeof value !== "object")
      .slice(0, 18);
  }, [item]);

  async function finalizeEarly() {
    if (!item) return;
    const message = item.editWindow.active
      ? "سيتم إنهاء مهلة التعديل الآن وتثبيت النسخة الحالية. هل تريد المتابعة؟"
      : "هل تريد إصدار النسخة النهائية الآن؟";
    if (!window.confirm(message)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/v1/contracts/${item.id}/finalize`, {
        method: "POST",
        body: JSON.stringify({ confirmEarlyFinalization: true }),
      });
      setNotice("تم تثبيت النسخة وإضافتها إلى قائمة تجهيز ملف PDF.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إصدار النسخة النهائية.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-[#986410]" /></div>;
  if (!item) return <main className="p-10 text-center"><p className="font-bold text-red-700">{error || "العقد غير موجود"}</p></main>;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/contracts" className="inline-flex items-center gap-2 text-xs font-black text-[#00102e]"><ArrowRight className="h-4 w-4" /> العودة إلى عقودي</Link>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
        {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{notice}</div>}

        <header className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <div className="font-mono text-[11px] text-slate-400">{item.serial_number}</div>
              <h1 className="mt-2 text-2xl font-black text-[#00102e]">{title}</h1>
              <p className="mt-2 text-xs font-bold text-slate-500">{item.source_channel === "office" ? "أعده المكتب لصالحك" : "أنشأته بنفسك"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">{contractStatusLabels[item.status] || item.status}</span>
              <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 p-2.5" aria-label="تحديث"><RefreshCw className="h-4 w-4" /></button>
            </div>
          </div>
        </header>

        {isSelfService && item.status === "client_review" && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-1 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <h2 className="font-black text-amber-950">مهلة تعديل البيانات غير الأساسية</h2>
                  <p className="mt-2 text-xs leading-6 text-amber-900">يمكنك التعديل حتى {formatDate(item.editWindow.expiresAt)}. بيانات الأطراف والعين محل العقد ثبتت بعد اعتماد الدفع ولا تتغير من الواجهة.</p>
                  {item.editWindow.active && <div className="mt-3 font-mono text-xl font-black text-amber-800" dir="ltr">{formatRemaining(remaining)}</div>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.permissions.canEdit && <Link href={`/wizard/${item.template_slug}?contractId=${item.id}`} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-3 text-xs font-black text-white"><FilePenLine className="h-4 w-4" /> تعديل البيانات المسموحة</Link>}
                <button type="button" disabled={busy} onClick={() => void finalizeEarly()} className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-xs font-black text-white disabled:opacity-50"><LockKeyhole className="h-4 w-4" /> إصدار النسخة الحالية الآن</button>
              </div>
            </div>
          </section>
        )}

        {isSelfService && item.status === "pending_payment" && (
          <section className={`mt-6 rounded-2xl border p-5 sm:p-6 ${item.payment_status === "rejected" ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}`}>
            <h2 className={`font-black ${item.payment_status === "rejected" ? "text-red-900" : "text-blue-950"}`}>
              {item.payment_status === "rejected" ? "تعذر اعتماد إثبات الدفع" : item.payment_status === "pending_verification" ? "إثبات الدفع قيد المراجعة" : "استكمال الدفع"}
            </h2>
            <p className={`mt-2 text-xs leading-6 ${item.payment_status === "rejected" ? "text-red-800" : "text-blue-900"}`}>
              {item.payment_status === "rejected"
                ? (item.payment_admin_notes || "راجع بيانات التحويل وارفع إثباتًا جديدًا.")
                : item.payment_status === "pending_verification"
                  ? `تبدأ مهلة تعديل البيانات غير الأساسية لمدة ${editHours} ساعة بعد اعتماد الدفع، وليس بمجرد رفع الإيصال.`
                  : "ارفع إثبات التحويل حتى تبدأ الإدارة مراجعته."}
            </p>
            {(!item.payment_status || item.payment_status === "rejected") && (
              <button type="button" onClick={() => setPaymentOpen(true)} className="mt-4 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-white">
                {item.payment_status === "rejected" ? "رفع إثبات دفع جديد" : "رفع إثبات الدفع"}
              </button>
            )}
          </section>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-[#00102e]">ملخص البيانات</h2><p className="mt-1 text-xs text-slate-500">هذا ملخص للبيانات المحفوظة، وليس نسخة PDF النهائية.</p></div><FileText className="h-5 w-5 text-[#986410]" /></div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {dataRows.length === 0 ? <p className="text-xs font-bold text-slate-500">لا توجد بيانات ظاهرة في الملخص.</p> : dataRows.map(([key, value]) => (
                <div key={key} className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-bold text-slate-500">{item.fieldMetadata?.[key]?.labelAr || key}</dt><dd className="mt-1 break-words text-xs font-black text-slate-800">{formatContractValue(value, item.fieldMetadata?.[key])}</dd></div>
              ))}
            </dl>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-black text-[#00102e]">النسخة النهائية</h2>
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                {item.pdf_status === "ready" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : item.pdf_status === "failed" ? <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" /> : <Clock3 className="h-5 w-5 shrink-0 text-blue-600" />}
                <div><div className="text-xs font-black text-slate-800">{pdfStatusLabels[item.pdf_status || ""] || (item.status === "issued" ? "بانتظار تجهيز الملف" : "لم يتم إصدار النسخة النهائية بعد")}</div><p className="mt-1 text-[11px] leading-5 text-slate-500">يظهر زر التنزيل فقط بعد انتهاء خدمة توليد PDF بنجاح.</p></div>
              </div>
              {item.permissions.canDownloadPdf && documents.length === 0 && <a href={apiUrl(`/api/v1/contracts/${item.id}/pdf`)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-black text-white"><Download className="h-4 w-4" /> تحميل العقد النهائي</a>}
              {documents.length > 0 && <div className="mt-4 space-y-2">{documents.map((document) => <a key={document.id} href={apiUrl(`/api/v1/contracts/${item.id}/documents/${document.id}/download`)} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-900"><span>{document.titleAr}</span><Download className="h-4 w-4 shrink-0" /></a>)}</div>}
              {item.status === "client_review" && !item.editWindow.active && <button type="button" disabled={busy} onClick={() => void finalizeEarly()} className="mt-4 w-full rounded-xl bg-[#00102e] px-4 py-3 text-xs font-black text-white">إصدار النسخة النهائية</button>}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-black text-[#00102e]">الإصدارات</h2>
              <div className="mt-4 space-y-2">{item.versions.map((version) => <div key={version.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex justify-between gap-3 text-xs"><strong>الإصدار {version.versionNumber}</strong><span className="text-slate-500">{contractStatusLabels[version.status] || version.status}</span></div><p className="mt-1 text-[10px] text-slate-400">{formatDate(version.createdAt)}</p></div>)}</div>
            </section>

            {item.status === "issued" && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="font-black text-amber-950">تحتاج تصحيحًا بعد الإصدار؟</h2>
                <p className="mt-2 text-xs leading-6 text-amber-900">لا يتم تغيير النسخة الصادرة مباشرة. أرسل طلب مراجعة أو تصحيح للمكتب ليتم تسجيل التعديل وإصدار نسخة جديدة عند الحاجة.</p>
                <Link href="/#consultation" className="mt-4 inline-block rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-black text-white">طلب مراجعة أو تصحيح</Link>
              </section>
            )}
          </aside>
        </div>
      </main>
      <Footer />
      <VodafoneCashModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        orderTitle={title}
        amountEgp={Number(item.original_price_egp || item.payment_amount_egp || 0)}
        contractId={item.id}
        serialNumber={item.serial_number}
        onSubmitted={() => { void load(); }}
      />
    </div>
  );
}
