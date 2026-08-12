"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Upload,
  Video,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VodafoneCashModal from "@/components/checkout/VodafoneCashModal";
import ActionDialog from "@/components/ui/ActionDialog";
import { apiRequest, apiUrl, ApiClientError, frontendApi } from "@/lib/apiClient";
import {
  communicationLabels,
  formatDate,
  formatFileSize,
  paymentStatusLabels,
  requestStatusLabels,
  requestTypeLabels,
} from "@/lib/labels";
import type { ServiceRequestDetails } from "@/types/customer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import { compressMultipleFiles } from "@/lib/compression";

function RequestDetailsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { catalog } = usePublicCatalog();
  const [item, setItem] = useState<ServiceRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptConfirmOpen, setReceiptConfirmOpen] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItem(await frontendApi.request(params.id));
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.replace(`/login?next=/requests/${params.id}`);
        return;
      }
      setError(caught instanceof Error ? caught.message : "تعذر تحميل الطلب");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const timer=window.setInterval(()=>setClockNow(Date.now()),1000); return()=>window.clearInterval(timer); }, []);
  useEffect(() => {
    if (searchParams.get("payment") !== "retry" || !item) return;
    const canRetry = item.status === "awaiting_payment" && !["pending_verification", "approved"].includes(item.paymentStatus || "");
    if (canRetry) setPaymentOpen(true);
    router.replace(`/requests/${params.id}`, { scroll: false });
  }, [item, params.id, router, searchParams]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || !item) return;
    const remainingSlots = Math.max(0, 30 - item.attachments.length);
    if (remainingSlots <= 0) {
      setError("وصلت للحد الأقصى وهو 30 ملفًا لهذا الطلب.");
      return;
    }
    const picked = Array.from(files);
    if (picked.length > remainingSlots) {
      setError(`يمكنك إضافة ${remainingSlots} ملفًا فقط قبل الوصول للحد الأقصى.`);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const prepared = await compressMultipleFiles(picked);
      const filesToUpload = prepared.map((result) => result.file);
      const tooLarge = filesToUpload.find((file) => file.size > 20 * 1024 * 1024);
      if (tooLarge) {
        setError(`الملف ${tooLarge.name} أكبر من 20MB بعد التجهيز.`);
        return;
      }
      const ids: number[] = [];
      for (const file of filesToUpload) {
        const body = new FormData();
        body.append("file", file);
        const uploaded = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body });
        ids.push(uploaded.id);
      }
      await apiRequest(`/api/v1/service-requests/${params.id}/attachments`, { method: "POST", body: JSON.stringify({ attachmentIds: ids }) });
      setNotice("تمت إضافة الملفات إلى الطلب.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر رفع الملفات");
    } finally {
      setBusy(false);
    }
  }

  async function requestRevision() {
    if (!revisionNote.trim()) {
      setError("اكتب التعديلات المطلوبة باختصار.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/v1/service-requests/${params.id}/revision-request`, { method: "POST", body: JSON.stringify({ note: revisionNote.trim() }) });
      setRevisionNote("");
      setNotice("تم تسجيل طلب التعديل وسيظهر للمكتب.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تسجيل طلب التعديل");
    } finally {
      setBusy(false);
    }
  }

  async function performConfirmReceipt() {
    setReceiptConfirmOpen(false);
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/v1/service-requests/${params.id}/confirm-receipt`, { method: "POST", body: JSON.stringify({}) });
      setNotice("تم تأكيد الاستلام وإنهاء الطلب.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تأكيد الاستلام");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>;
  if (!item) return <div className="p-10 text-center font-bold text-red-700">{error || "الطلب غير موجود"}</div>;

  const ContactIcon = item.communicationChannel === "zoom" ? Video : MessageCircle;
  const contactWhatsapp = item.requestType === "consultation"
    ? catalog.office.consultationWhatsappNumber
    : catalog.office.supportWhatsappNumber || catalog.office.whatsappNumber;
  const whatsappDigits = contactWhatsapp.replace(/\D/g, "").replace(/^0/, "20");
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`مرحبًا، أتابع الطلب ${item.serialNumber}`)}`
    : "";
  const fallbackServicePrice = item.requestType === "consultation"
    ? catalog.services.consultationFeeEgp
    : item.requestType === "contract_review"
      ? catalog.services.contractReviewDepositEgp
      : catalog.services.contractDraftingDepositEgp;
  const paymentDue = item.status === "awaiting_payment"
    ? Number(item.expectedPaymentEgp ?? item.paymentAmountEgp ?? fallbackServicePrice)
    : 0;
  const approvedPaid = Number(item.approvedPaidEgp ?? (item.paymentStatus === "approved" ? item.paymentAmountEgp ?? 0 : 0));
  const outstanding = Number(item.outstandingEgp ?? item.lawyerRemainingEgp ?? 0);
  const canSubmitPayment = item.status === "awaiting_payment"
    && paymentDue > 0
    && !["pending_verification"].includes(item.paymentStatus || "");
  const bookingSeconds = item.bookingExpiresAt ? Math.max(0, Math.floor((new Date(item.bookingExpiresAt).getTime()-clockNow)/1000)) : null;
  const bookingCountdown = bookingSeconds === null ? null : `${Math.floor(bookingSeconds/60)}:${String(bookingSeconds%60).padStart(2,"0")}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/requests" className="inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-[#00102e]"><ArrowRight className="h-4 w-4" /> العودة إلى طلباتي</Link>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
        {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{notice}</div>}
        {item.requestType === "consultation" && item.status === "awaiting_payment" && bookingCountdown !== null && <div className={`mt-4 rounded-xl border p-3 text-xs font-bold ${bookingSeconds===0?"border-red-200 bg-red-50 text-red-700":"border-amber-200 bg-amber-50 text-amber-900"}`}>{bookingSeconds===0?"انتهت مهلة حفظ الموعد. عند محاولة الدفع سيُطلب منك اختيار موعد جديد.":<>الموعد محفوظ مؤقتًا لحين رفع إثبات الدفع — الوقت المتبقي <span dir="ltr" className="font-mono font-black">{bookingCountdown}</span></>}</div>}

        <header className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="font-mono text-[11px] text-slate-400">{item.serialNumber}</div>
              <h1 className="mt-2 text-2xl font-black text-[#00102e]">{item.title}</h1>
              <p className="mt-2 text-xs font-bold text-slate-500">{requestTypeLabels[item.requestType]}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">{requestStatusLabels[item.status] || item.status}</span>
              <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 p-2.5"><RefreshCw className="h-4 w-4" /></button>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-black text-[#00102e]">تفاصيل الطلب</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{item.description}</p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-black text-[#00102e]">المستندات المرفوعة</h2>
                  <p className="mt-1 text-xs text-slate-500">ارفع المستندات المطلوبة فقط. حد أقصى 30 ملفًا، والصور تُضغط تلقائيًا قبل الرفع.</p>
                </div>
                {item.permissions.canUploadFiles && (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white">
                    <Upload className="h-4 w-4" /> إضافة ملفات
                    <input type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png,.webp" className="hidden" disabled={busy} onChange={(event) => void uploadFiles(event.target.files)} />
                  </label>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {item.attachments.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-xs font-bold text-slate-500">لا توجد ملفات مرفوعة.</p> : item.attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex min-w-0 items-center gap-3"><Paperclip className="h-4 w-4 shrink-0 text-blue-700" /><div className="min-w-0"><div className="truncate text-xs font-black text-slate-800">{file.fileName}</div><div className="text-[10px] text-slate-400">{formatFileSize(file.sizeBytes)}</div></div></div>
                    <a href={apiUrl(`/api/v1/attachments/${file.id}/download`)} className="rounded-lg border border-slate-200 p-2" title="تنزيل"><Download className="h-4 w-4" /></a>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-200 bg-white p-6">
              <h2 className="font-black text-[#00102e]">النسخ والنتائج المتاحة</h2>
              <p className="mt-1 text-xs text-slate-500">كل نسخة تُحفظ مستقلة، ولا يتم استبدال الملفات السابقة.</p>
              <div className="mt-4 space-y-3">
                {item.deliverables.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-xs font-bold text-slate-500">لم يرفع المكتب نتيجة بعد.</p> : item.deliverables.map((file) => (
                  <article key={file.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-700" /><h3 className="text-sm font-black text-emerald-950">{file.title}</h3>{file.isFinal && <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[9px] font-black text-white">نسخة نهائية</span>}</div><p className="mt-1 text-[11px] text-emerald-800">الإصدار {file.versionNumber} · {formatDate(file.publishedAt)}</p>{file.notes && <p className="mt-2 text-xs leading-6 text-slate-600">{file.notes}</p>}</div>
                      <a href={apiUrl(`/api/v1/attachments/${file.attachmentId}/download`)} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white"><Download className="h-4 w-4" /> تنزيل</a>
                    </div>
                  </article>
                ))}
              </div>

              {item.permissions.canRequestRevision && (
                <div className="mt-5 border-t border-slate-200 pt-5">
                  <label className="text-xs font-black text-slate-700">التعديلات المطلوبة</label>
                  <textarea value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} rows={3} placeholder="اكتب التعديلات المطلوبة باختصار، أو تواصل مع المكتب بالطريقة المحددة للطلب." className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-[#986410]" />
                  <button type="button" disabled={busy} onClick={() => void requestRevision()} className="mt-3 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">طلب تعديل</button>
                </div>
              )}

              {item.permissions.canConfirmReceipt && (
                <button type="button" disabled={busy} onClick={() => setReceiptConfirmOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> تأكيد استلام ومراجعة النسخة</button>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-black text-[#00102e]">التواصل والموعد</h2>
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 p-4"><ContactIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#986410]" /><div><div className="text-xs font-black text-slate-800">{communicationLabels[item.communicationChannel || "whatsapp"]}</div><div className="mt-1 text-[11px] leading-5 text-slate-500">لا توجد محادثات داخل المنصة. المتابعة والملفات تظهر هنا، والتواصل يتم بالطريقة المختارة.</div></div></div>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">جهة المتابعة</dt><dd className="font-black text-slate-800">مكتب Z draft</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">الموعد</dt><dd className="text-left font-black text-slate-800">{item.meetingAt ? formatDate(item.meetingAt) : `${formatDate(item.preferredContactAt, false)}${item.preferredContactPeriodLabel ? ` · ${item.preferredContactPeriodLabel}` : " · مبدئي"}`}</dd></div>

              </dl>
              {item.meetingProvider === "zoom" && item.meetingUrl && <a href={item.meetingUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-xs font-black text-white"><Video className="h-4 w-4" /> فتح رابط Zoom</a>}
              {item.communicationChannel === "whatsapp" && whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white"><MessageCircle className="h-4 w-4" /> فتح WhatsApp</a>}

            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-black text-[#00102e]">الدفع</h2>
              <div className="mt-4 text-sm font-black text-slate-800">{paymentStatusLabels[item.paymentStatus || ""] || (approvedPaid > 0 ? "تم تسجيل دفعة سابقة" : "لم تُسجل عملية دفع")}</div>
              {item.requestType === "contract_drafting" && item.lawyerTotalPriceEgp != null ? (
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-4">
                  <PaymentStat label="السعر الكامل" value={Number(item.lawyerTotalPriceEgp)} />
                  <PaymentStat label="العربون" value={Number(item.lawyerDepositEgp ?? 0)} />
                  <PaymentStat label="المدفوع المعتمد" value={approvedPaid} />
                  <PaymentStat label="المتبقي" value={outstanding} strong />
                </div>
              ) : null}
              {paymentDue > 0 && <p className="mt-3 text-xs font-black text-[#986410]">المطلوب حاليًا: {paymentDue.toLocaleString("ar-EG")} ج.م</p>}
              {item.requestType === "contract_drafting" && item.paymentStage === "balance" && paymentDue > 0 && <p className="mt-2 text-[11px] leading-5 text-slate-500">اكتمل إعداد العقد. بعد اعتماد المبلغ المتبقي تظهر النسخة النهائية داخل حسابك.</p>}
              {item.paymentAdminNotes && <div className={`mt-3 rounded-xl border p-3 text-xs font-bold leading-6 ${item.paymentStatus === "needs_client_info" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`}>{item.paymentAdminNotes}</div>}
              {canSubmitPayment && <button type="button" onClick={() => setPaymentOpen(true)} className="mt-4 w-full rounded-xl bg-[#00102e] px-4 py-3 text-xs font-black text-white">{item.paymentStatus === "rejected" ? "رفع إثبات دفع جديد" : item.paymentStatus === "needs_client_info" ? "رفع إثبات بديل" : "رفع إثبات الدفع"}</button>}
            </section>

            {item.linkedContractId && (
              <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <h2 className="font-black text-blue-950">عقد مرتبط بالطلب</h2>
                <p className="mt-2 text-xs text-blue-800">{item.linkedContractTitle || item.linkedContractSerial}</p>
                <Link href={`/contract/${item.linkedContractId}`} className="mt-4 inline-block rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white">فتح العقد</Link>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-black text-[#00102e]">سجل متابعة الطلب</h2>
              <div className="mt-4 space-y-4">
                {item.events.map((event) => (
                  <div key={event.id} className="relative border-r-2 border-slate-200 pr-4">
                    <span className="absolute -right-[5px] top-1 h-2 w-2 rounded-full bg-[#986410]" />
                    <p className="text-xs font-bold leading-6 text-slate-700">{event.notes || requestStatusLabels[String(event.payload?.status || "")] || "تم تحديث الطلب"}</p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><Clock3 className="h-3 w-3" /> {formatDate(event.createdAt)}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
      <ActionDialog open={receiptConfirmOpen} title="تأكيد استلام النسخة" message="هل تؤكد أنك راجعت النسخة المتاحة ولا تحتاج إلى تعديلات أخرى؟ سيؤدي التأكيد إلى إنهاء الطلب الحالي." confirmLabel="تأكيد الاستلام" onClose={() => setReceiptConfirmOpen(false)} onConfirm={() => void performConfirmReceipt()} />
      <Footer />
      <VodafoneCashModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        orderTitle={item.title}
        amountEgp={paymentDue}
        serviceRequestId={item.id}
        serialNumber={item.serialNumber}
        onSubmitted={() => { void load(); }}
      />
    </div>
  );
}

function PaymentStat({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div><span className="block text-[10px] font-bold text-slate-500">{label}</span><strong className={`mt-1 block ${strong ? "text-[#986410]" : "text-[#00102e]"}`}>{value.toLocaleString("ar-EG")} ج.م</strong></div>;
}

export default function RequestDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <RequestDetailsContent />
    </Suspense>
  );
}
