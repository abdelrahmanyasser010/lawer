"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Copy, Loader2, Upload, X } from "lucide-react";
import { apiRequest, ApiClientError, frontendApi } from "@/lib/apiClient";
import { compressUploadFile } from "@/lib/compression";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import { normalizePhoneInput, phoneValidationError } from "@/lib/inputValidation";
import { usePaymentAccess } from "@/hooks/usePaymentAccess";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderTitle: string;
  amountEgp: number;
  contractId?: number;
  serviceRequestId?: number;
  serialNumber?: string;
  onSubmitted?: (payment: { id: number; serialNumber: string; status: string }) => void;
}


export default function VodafoneCashModal({
  isOpen,
  onClose,
  orderTitle,
  amountEgp,
  contractId,
  serviceRequestId,
  serialNumber,
  onSubmitted,
}: Props) {
  const router = useRouter();
  const { catalog, loading: catalogLoading, loadError: catalogLoadError } = usePublicCatalog();
  const cashNumber = paymentCashNumber;
  const editHours = catalog.policies.selfServiceEditHours;
  const targetPath = contractId ? `/contract/${contractId}` : serviceRequestId ? `/requests/${serviceRequestId}` : "/";
  const { paymentAccess, paymentVerified, paymentCashNumber, requireVerified } = usePaymentAccess(targetPath);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [senderPhone, setSenderPhone] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReceipt(null);
      setSenderPhone("");
      setError("");
      setPaymentReference("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    frontendApi.profile().then((profile) => {
      if (!active) return;
      const phone = profile.whatsappNumber || profile.phone || "";
      if (phone) setSenderPhone((current) => current || phone);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  async function chooseReceipt(file: File | null) {
    if (!file) return setReceipt(null);
    setPreparing(true);
    try {
      const result = await compressUploadFile(file);
      setReceipt(result.file);
    } catch {
      setReceipt(file);
    } finally {
      setPreparing(false);
    }
  }

  async function copyNumber() {
    if (!cashNumber) return;
    await navigator.clipboard.writeText(cashNumber);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function submitReceipt() {
    setError("");
    if (!(await requireVerified())) { onClose(); return; }
    if (catalogLoading || catalogLoadError || !cashNumber) {
      setError("بيانات الدفع غير متاحة الآن. حاول مرة أخرى بعد قليل أو تواصل مع الدعم الفني.");
      return;
    }
    if (!contractId && !serviceRequestId) {
      setError("تعذر تحديد العقد أو الطلب المرتبط بالدفع.");
      return;
    }
    const phoneError = phoneValidationError(senderPhone, true);
    if (phoneError) { setError("اكتب رقم المحفظة التي تم التحويل منها بصورة صحيحة."); return; }
    if (!receipt) {
      setError("ارفع صورة أو ملف إثبات التحويل.");
      return;
    }

    setSubmitting(true);
    try {
      const upload = new FormData();
      upload.append("file", receipt);
      const attachment = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body: upload });
      const payment = await apiRequest<{ id: number; serialNumber: string; status: string }>("/api/v1/payments/receipts", {
        method: "POST",
        body: JSON.stringify({ contractId, serviceRequestId, amountEgp, senderPhone: normalizePhoneInput(senderPhone), attachmentId: attachment.id }),
      });
      setPaymentReference(payment.serialNumber);
      onSubmitted?.(payment);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.push(`/login?next=${encodeURIComponent(targetPath)}`);
        onClose();
        return;
      }
      setError(caught instanceof Error ? caught.message : "تعذر إرسال إثبات التحويل.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00102e]/85 p-4 backdrop-blur-sm" dir="rtl">
      <section className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-950 p-6 text-right shadow-2xl sm:p-8">
        <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-5 top-5 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>

        {paymentReference ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"><CheckCircle2 className="h-8 w-8" /></div>
            <h2 className="mt-5 text-xl font-black text-white">تم استلام إثبات التحويل</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">مرجع الدفع: <strong className="font-mono text-[#d9a84e]">{paymentReference}</strong>. ستظهر حالة الدفع داخل العقد بعد مراجعة الإدارة.</p>
            <button type="button" onClick={() => { onClose(); router.push(targetPath); }} className="mt-6 rounded-xl bg-[#986410] px-6 py-3 text-sm font-black text-white">{contractId ? "فتح العقد" : "فتح الطلب"}</button>
          </div>
        ) : !paymentVerified ? (
          <div className="py-5 text-center">
            <p className="text-sm font-black text-white">تأكيد الحساب مطلوب قبل عرض بيانات التحويل</p>
            <p className="mt-2 text-xs leading-6 text-slate-400">لن تظهر بيانات الدفع قبل تسجيل الدخول وتأكيد البريد الإلكتروني.</p>
            <button type="button" onClick={() => void requireVerified().then((ok) => { if (!ok) onClose(); })} className="mt-5 rounded-xl bg-[#986410] px-5 py-3 text-xs font-black text-white">{paymentAccess === "unverified" ? "تأكيد البريد الإلكتروني" : "تسجيل الدخول والمتابعة"}</button>
          </div>
        ) : (
          <div>
            <p className="text-xs font-black text-[#d9a84e]">رفع إثبات الدفع</p>
            <h2 className="mt-2 pr-0 text-xl font-black text-white">{orderTitle}</h2>
            {serialNumber && <p className="mt-1 font-mono text-[10px] text-slate-500">{serialNumber}</p>}
            <p className="mt-3 text-sm text-slate-300">المبلغ المطلوب: <strong className="text-white">{amountEgp} ج.م</strong></p>

            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <div><span className="block text-[10px] text-slate-400">رقم Vodafone Cash</span><strong className="mt-1 block font-mono text-base text-emerald-400" dir="ltr">{catalogLoading ? "جاري التحميل..." : cashNumber || "غير متاح"}</strong></div>
                {cashNumber && <button type="button" onClick={() => void copyNumber()} className="rounded-xl border border-slate-700 p-2 text-slate-300"><Copy className="h-4 w-4" /></button>}
              </div>
              {copied && <p className="mt-2 text-[10px] font-bold text-emerald-400">تم نسخ الرقم.</p>}
              <p className="mt-3 text-[11px] leading-6 text-slate-400">بعد التحويل ارفع الإثبات واكتب رقم المحفظة المحول منها حتى تتم مطابقة العملية.</p>
            </div>

            <label className="mt-5 block text-xs font-bold text-slate-300">رقم المحفظة المحول منها
              <input value={senderPhone} onChange={(event) => setSenderPhone(normalizePhoneInput(event.target.value))} dir="ltr" placeholder="01XXXXXXXXX" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-left text-sm text-white outline-none focus:border-emerald-500" />
            </label>

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600 bg-slate-900 p-5 text-center">
              <input type="file" accept="image/*,.pdf" className="hidden" disabled={preparing} onChange={(event) => void chooseReceipt(event.target.files?.[0] || null)} />
              {preparing ? <Loader2 className="h-6 w-6 animate-spin text-emerald-400" /> : receipt ? <CheckCircle2 className="h-6 w-6 text-emerald-400" /> : <Upload className="h-6 w-6 text-emerald-400" />}
              <span className="mt-2 text-xs font-black text-white">{receipt?.name || "اختيار إثبات التحويل"}</span>
            </label>

            {contractId && <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] leading-6 text-amber-100"><Clock3 className="mt-1 h-4 w-4 shrink-0" /> يبدأ احتساب مهلة تعديل البيانات غير الأساسية لمدة {editHours} ساعة بعد اعتماد الدفع، وليس بمجرد رفع الإيصال.</div>}
            {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</div>}
            <button type="button" disabled={submitting || preparing || catalogLoading || catalogLoadError || !cashNumber} onClick={() => void submitReceipt()} className="mt-5 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-black text-white disabled:opacity-50">{submitting ? "جاري إرسال الإثبات..." : "إرسال إثبات التحويل للمراجعة"}</button>
            {!catalogLoading && (catalogLoadError || !cashNumber) && <p className="mt-2 text-center text-[10px] text-red-300">{catalogLoadError ? "تعذر تحميل بيانات الدفع حاليًا. حاول مرة أخرى بعد قليل." : "رقم Vodafone Cash غير مضبوط في إعدادات المكتب."}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
