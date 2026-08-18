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
  const [rebookOpen, setRebookOpen] = useState(false);
  const [rebookChannel, setRebookChannel] = useState<"whatsapp" | "zoom">("whatsapp");
  const [rebookDays, setRebookDays] = useState<Array<{ date: string; label: string; slots: Array<{ slotKey: string; start: string; end: string; label: string; remaining: number; limited?: boolean }> }>>([]);
  const [rebookDate, setRebookDate] = useState("");
  const [rebookSlotKey, setRebookSlotKey] = useState("");
  const [rebookLoading, setRebookLoading] = useState(false);

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
    const bookingExpired = ["consultation", "contract_review"].includes(item.requestType)
      && (item.bookingStatus === "expired" || (item.bookingExpiresAt ? new Date(item.bookingExpiresAt).getTime() <= Date.now() : false));
    const canRetry = item.status === "awaiting_payment"
      && !bookingExpired
      && !["pending_verification", "approved"].includes(item.paymentStatus || "");
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

  async function loadRebookAvailability(channel: "whatsapp" | "zoom") {
    setRebookLoading(true);
    setError("");
    setRebookDate("");
    setRebookSlotKey("");
    try {
      const result = await apiRequest<{ days: Array<{ date: string; label: string; slots: Array<{ slotKey: string; start: string; end: string; label: string; remaining: number; limited?: boolean }> }> }>(
        `/api/v1/consultation-availability?channel=${encodeURIComponent(channel)}`,
      );
      setRebookDays(result.days || []);
    } catch (caught) {
      setRebookDays([]);
      setError(caught instanceof Error ? caught.message : "تعذر تحميل المواعيد المتاحة.");
    } finally {
      setRebookLoading(false);
    }
  }

  async function openRebook() {
    const channel = item?.communicationChannel === "zoom" ? "zoom" : "whatsapp";
    setRebookChannel(channel);
    setRebookOpen(true);
    await loadRebookAvailability(channel);
  }

  async function changeRebookChannel(channel: "whatsapp" | "zoom") {
    setRebookChannel(channel);
    await loadRebookAvailability(channel);
  }

  async function submitRebook() {
    if (!rebookSlotKey) {
      setError("اختر موعدًا متاحًا جديدًا أولًا.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/v1/service-requests/${params.id}/rebook`, {
        method: "POST",
        body: JSON.stringify({
          communicationChannel: rebookChannel,
          availabilitySlotKey: rebookSlotKey,
        }),
      });
      setRebookOpen(false);
      setNotice("تم حفظ الموعد الجديد مؤقتًا. ارفع إثبات الدفع قبل انتهاء المهلة.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ الموعد الجديد.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]"><Loader2 className="h-8 w-8 animate-spin text-[#986410]" /></div>;
  if (!item) return <div className="p-10 text-center font-bold text-red-700">{error || "الطلب غير موجود"}</div>;

  const ContactIcon = item.communicationChannel === "zoom" ? Video : MessageCircle;
  const contactWhatsapp = item.requestType === "consultation"
    ? catalog.office.consultationWhatsappNumber
    : catalog.office.supportWhatsappNumber || catalog.office.whatsappNumber;
  const whatsappDigits = contactWhatsapp.replace(/\D/g, "").replace(/^0/, "20");
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`مرحبًا، أتابع الطلب ${item.serialNumber}`)}`
    : "";
  const serviceCopy = item.requestType === "consultation"
    ? {
        attachmentsSubtitle: "المستندات التي أرفقتها لدعم الاستشارة.",
        primaryAttachmentBadge: null,
        uploadLabel: "إضافة مستندات داعمة",
        deliverablesTitle: "ملفات الاستشارة",
        deliverablesSubtitle: "أي مذكرة أو مستند يرسله المختص بعد الاستشارة.",
        deliverablesEmpty: "سيظهر هنا أي ملف أو مذكرة يشاركها المختص معك.",
        confirmTitle: "تأكيد إنهاء الاستشارة",
        confirmMessage: "هل تؤكد أن الاستشارة انتهت ولا تحتاج إلى متابعة أخرى على هذا الطلب؟",
        paymentTitle: "رسوم الاستشارة",
        workNoun: "الاستشارة",
      }
    : item.requestType === "contract_drafting"
      ? {
          attachmentsSubtitle: "المستندات المرجعية والبيانات التي أرفقتها لإعداد العقد.",
          primaryAttachmentBadge: null,
          uploadLabel: "إضافة مستندات مرجعية",
          deliverablesTitle: "مخرجات إعداد العقد",
          deliverablesSubtitle: "مسودات العقد والنسخ التي ينشرها المختص للمراجعة.",
          deliverablesEmpty: "ستظهر هنا مسودة العقد أو النسخة المعدلة عند نشرها.",
          confirmTitle: "تأكيد استلام العقد",
          confirmMessage: "هل تؤكد أنك راجعت النسخة المتاحة ولا تحتاج إلى تعديلات أخرى؟ سيؤدي التأكيد إلى إنهاء الطلب الحالي.",
          paymentTitle: "دفعات إعداد العقد",
          workNoun: "إعداد العقد",
        }
      : {
          attachmentsSubtitle: "العقد الأساسي وأي مستندات داعمة للمراجعة.",
          primaryAttachmentBadge: "العقد الأساسي",
          uploadLabel: "إضافة مستندات داعمة",
          deliverablesTitle: "مخرجات مراجعة العقد",
          deliverablesSubtitle: "تقرير المراجعة أو النسخة المعدلة من قبل المختص.",
          deliverablesEmpty: "سيظهر تقرير المراجعة أو النسخة المعدلة هنا بعد اكتمال العمل.",
          confirmTitle: "تأكيد استلام المراجعة",
          confirmMessage: "هل تؤكد أنك راجعت تقرير ونسخة المراجعة ولا تحتاج إلى تعديلات أخرى؟ سيؤدي التأكيد إلى إنهاء الطلب الحالي.",
          paymentTitle: "دفعات مراجعة العقد",
          workNoun: "مراجعة العقد",
        };
  const fallbackServicePrice = item.requestType === "consultation"
    ? catalog.services.consultationFeeEgp
    : item.requestType === "contract_review"
      ? catalog.services.contractReviewDepositEgp
      : catalog.services.contractDraftingDepositEgp;
  const paymentDue = item.status === "awaiting_payment"
    ? Number(item.expectedPaymentEgp ?? item.paymentAmountEgp ?? fallbackServicePrice)
    : 0;
  const approvedPaid = Number(item.approvedPaidEgp ?? (item.paymentStatus === "approved" ? item.paymentAmountEgp ?? 0 : 0));
  const outstanding = Number(item.outstandingEgp ?? item.serviceRemainingEgp ?? item.lawyerRemainingEgp ?? 0);
  const supportsBooking = ["consultation", "contract_review"].includes(item.requestType);
  const bookingSeconds = item.bookingExpiresAt ? Math.max(0, Math.floor((new Date(item.bookingExpiresAt).getTime() - clockNow) / 1000)) : null;
  const bookingCountdown = bookingSeconds === null ? null : `${Math.floor(bookingSeconds / 60)}:${String(bookingSeconds % 60).padStart(2, "0")}`;
  const bookingExpired = supportsBooking
    && item.status === "awaiting_payment"
    && item.paymentStage !== "balance"
    && (item.bookingStatus === "expired" || bookingSeconds === 0);
  const canSubmitPayment = item.status === "awaiting_payment"
    && paymentDue > 0
    && !bookingExpired
    && !["pending_verification"].includes(item.paymentStatus || "");
  const paymentPanelTitle = serviceCopy.paymentTitle;
  const communicationIsFollowUpOnly = item.status === "awaiting_payment" && item.paymentStatus !== "approved";

  function getDetailedNextStep() {
    if (item.status === "awaiting_payment") {
      if (bookingExpired) {
        return {
          title: "انتهت مهلة حفظ الموعد",
          description: `اختر موعدًا جديدًا قبل رفع إثبات الدفع حتى يظل ${serviceCopy.workNoun} مرتبطًا بموعد صالح.`,
          actionText: "اختيار موعد جديد",
          actionType: "rebook",
          bg: "bg-red-50 border-red-200 text-red-950",
          badge: "bg-red-600 text-white",
        };
      }
      if (item.paymentStatus === "pending_verification") {
        return {
          title: "جاري مراجعة إيصال الدفع",
          description: `تم استلام إثبات الدفع ويجري تدقيقه بواسطة الإدارة. يبدأ ${serviceCopy.workNoun} بعد اعتماد الدفعة، ولا يلزم إجراء منك الآن.`,
          actionText: null,
          actionType: null,
          bg: "bg-blue-50 border-blue-200 text-blue-950",
          badge: "bg-blue-600 text-white",
        };
      }
      return {
        title: item.paymentStage === "balance" ? "المتبقي مطلوب قبل التسليم النهائي" : "ارفع إثبات الدفع لتأكيد الطلب",
        description: `يرجى سداد المبلغ المطلوب (${paymentDue.toLocaleString("ar-EG")} ج.م) ورفع إيصال التحويل. بعد اعتماد الدفعة يستكمل المكتب ${serviceCopy.workNoun}.`,
        actionText: "رفع إثبات الدفع",
        actionType: "payment",
        bg: "bg-amber-50/90 border-amber-200 text-amber-950",
        badge: "bg-amber-600 text-white",
      };
    }
    if (item.status === "awaiting_client_info") {
      return {
        title: "مطلوب مستندات أو بيانات إضافية",
        description: `يحتاج المختص إلى معلومات إضافية لاستكمال ${serviceCopy.workNoun}.`,
        actionText: serviceCopy.uploadLabel,
        actionType: "upload",
        bg: "bg-rose-50/90 border-rose-200 text-rose-950",
        badge: "bg-rose-600 text-white",
      };
    }
    if (item.status === "meeting_scheduled") {
      return {
        title: "الموعد محدد ومؤكد في جدول المكتب",
        description: `تم تثبيت موعد الاستشارة عبر ${communicationLabels[item.communicationChannel || "whatsapp"]}.`,
        actionText: item.communicationChannel === "whatsapp" ? "فتح WhatsApp للمتابعة" : item.communicationChannel === "zoom" ? "فتح Zoom" : null,
        actionType: "contact",
        bg: "bg-emerald-50/90 border-emerald-200 text-emerald-950",
        badge: "bg-emerald-600 text-white",
      };
    }
    if (item.status === "client_review") {
      return {
        title: item.requestType === "contract_review" ? "نتيجة مراجعة العقد جاهزة" : "مسودة العقد جاهزة لمراجعتك",
        description: item.requestType === "contract_review"
          ? "أنهى المختص المراجعة ونشر النتيجة؛ يمكنك الاطلاع عليها وتأكيد الاستلام أو طلب تعديل."
          : "نشر المختص نسخة العقد للمراجعة؛ يمكنك الاطلاع عليها وتأكيد الاستلام أو طلب تعديل.",
        actionText: "الاطلاع على الملفات",
        actionType: "scroll_deliverables",
        bg: "bg-purple-50/90 border-purple-200 text-purple-950",
        badge: "bg-purple-600 text-white",
      };
    }
    if (item.status === "completed") {
      return {
        title: `اكتمل ${serviceCopy.workNoun} بنجاح`,
        description: item.requestType === "consultation"
          ? "تم إنهاء الاستشارة وتسجيل الطلب كمكتمل."
          : "تم تسليم الملفات النهائية وتأكيد استلامها بنجاح.",
        actionText: null,
        actionType: null,
        bg: "bg-emerald-50/80 border-emerald-200 text-emerald-950",
        badge: "bg-emerald-700 text-white",
      };
    }
    if (item.status === "cancelled") {
      return {
        title: "تم إلغاء الطلب",
        description: "هذا الطلب مغلق ولا يمكن تنفيذ إجراءات تشغيلية جديدة عليه.",
        actionText: null,
        actionType: null,
        bg: "bg-slate-50 border-slate-200 text-slate-800",
        badge: "bg-slate-700 text-white",
      };
    }
    return {
      title: "الطلب قيد المتابعة",
      description: `يعمل المختص حاليًا على ${serviceCopy.workNoun}، وسيتم إشعارك عند الحاجة إلى إجراء منك أو عند توفر مخرجات جديدة.`,
      actionText: null,
      actionType: null,
      bg: "bg-slate-50 border-slate-200 text-slate-800",
      badge: "bg-slate-700 text-white",
    };
  }

  const nextStep = getDetailedNextStep();
  const paymentIsPrimaryNextAction = nextStep.actionType === "payment" && canSubmitPayment;

  let primaryMobileAction = null;
  if (nextStep.actionType === "rebook") {
    primaryMobileAction = (
      <button type="button" onClick={() => void openRebook()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3.5 text-sm font-black text-white shadow-md active:scale-95 transition">
        <RefreshCw className="h-4 w-4" /> اختيار موعد جديد
      </button>
    );
  } else if (paymentIsPrimaryNextAction) {
    primaryMobileAction = (
      <button type="button" onClick={() => setPaymentOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-4 py-3.5 text-sm font-black text-white shadow-md active:scale-95 transition">
        <Upload className="h-4 w-4 text-[#d9a84e]" /> رفع إثبات الدفع
      </button>
    );
  } else if (nextStep.actionType === "scroll_deliverables") {
    primaryMobileAction = (
      <button type="button" onClick={() => document.getElementById("deliverables-section")?.scrollIntoView({ behavior: "smooth" })} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-4 py-3.5 text-sm font-black text-white shadow-md active:scale-95 transition">
        <Download className="h-4 w-4 text-[#d9a84e]" /> {nextStep.actionText}
      </button>
    );
  } else if (item.status === "meeting_scheduled" && whatsappUrl) {
    primaryMobileAction = (
      <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-4 py-3.5 text-sm font-black text-white shadow-md active:scale-95 transition">
        <ContactIcon className="h-4 w-4 text-[#d9a84e]" /> المتابعة عبر الواتساب
      </a>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-right font-sans" dir="rtl">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8 sm:px-6">

        {/* Clean Breadcrumb */}
        <Link href="/requests" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#00102e] transition mb-3">
          <ArrowRight className="h-3.5 w-3.5" /> العودة إلى طلباتي
        </Link>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
        {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{notice}</div>}
        {supportsBooking && item.status === "awaiting_payment" && item.paymentStage !== "balance" && (bookingCountdown !== null || item.bookingStatus === "expired") && (
          <div className={`mb-4 rounded-xl border p-3 text-xs font-bold ${bookingExpired ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            {bookingExpired ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>انتهت مهلة حفظ الموعد. يجب اختيار موعد جديد قبل رفع إثبات الدفع.</span>
                <button type="button" onClick={() => void openRebook()} className="rounded-lg bg-red-700 px-3 py-2 text-[11px] font-black text-white">اختيار موعد جديد</button>
              </div>
            ) : (
              <>الموعد محفوظ مؤقتًا لحين رفع إثبات الدفع — الوقت المتبقي <span dir="ltr" className="font-mono font-black">{bookingCountdown}</span></>
            )}
          </div>
        )}

        {rebookOpen && (
          <section className="mb-4 rounded-2xl border border-red-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#00102e]">اختيار موعد جديد</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">اختر وسيلة التواصل ثم يومًا وموعدًا متاحًا. سيبدأ مؤقت الحجز من جديد بعد الحفظ.</p>
              </div>
              <button type="button" onClick={() => setRebookOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-600">إغلاق</button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {["whatsapp", "zoom"].filter((channel) => catalog.policies.communicationChannels.includes(channel)).map((channel) => (
                <button
                  key={channel}
                  type="button"
                  disabled={rebookLoading || busy}
                  onClick={() => void changeRebookChannel(channel as "whatsapp" | "zoom")}
                  className={`rounded-xl border px-3 py-2 text-xs font-black ${rebookChannel === channel ? "border-[#986410] bg-[#986410]/10 text-[#7c500c]" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {communicationLabels[channel]}
                </button>
              ))}
            </div>

            {rebookLoading ? (
              <div className="mt-5 flex items-center gap-2 text-xs font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> جاري تحميل المواعيد...</div>
            ) : rebookDays.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-500">لا توجد مواعيد متاحة حاليًا لهذه الوسيلة.</div>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-black text-slate-700">
                    اليوم
                    <select
                      value={rebookDate}
                      onChange={(event) => { setRebookDate(event.target.value); setRebookSlotKey(""); }}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#986410]"
                    >
                      <option value="">اختر اليوم</option>
                      {rebookDays.map((day) => <option key={day.date} value={day.date}>{day.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-black text-slate-700">
                    الموعد
                    <select
                      value={rebookSlotKey}
                      disabled={!rebookDate}
                      onChange={(event) => setRebookSlotKey(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#986410] disabled:bg-slate-100"
                    >
                      <option value="">اختر الموعد</option>
                      {(rebookDays.find((day) => day.date === rebookDate)?.slots || []).map((slot) => (
                        <option key={slot.slotKey} value={slot.slotKey}>{slot.label}{slot.limited ? " · متبقي قليل" : ""}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  disabled={busy || !rebookSlotKey}
                  onClick={() => void submitRebook()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  حفظ الموعد الجديد
                </button>
              </>
            )}
          </section>
        )}

        {/* Compact Workspace Header */}
        <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {item.serialNumber}
                </span>
                <span className="text-xs text-slate-500 font-bold">• {requestTypeLabels[item.requestType]}</span>
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl font-black text-[#00102e]">{item.title}</h1>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="rounded-full bg-blue-50 border border-blue-200/60 px-3.5 py-1 text-xs font-black text-blue-700">
                {requestStatusLabels[item.status] || item.status}
              </span>
            </div>
          </div>

          {/* Prominent Next Action Banner */}
          <div className={`mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border p-3.5 ${nextStep.bg}`}>
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${nextStep.badge}`}>
                  الخطوة التالية
                </span>
                <span className="text-xs font-black">{nextStep.title}</span>
              </div>
              <p className="text-xs leading-5 opacity-90">{nextStep.description}</p>
            </div>

            {nextStep.actionType === "rebook" && (
              <button
                type="button"
                onClick={() => void openRebook()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white hover:bg-red-800 shadow-sm transition shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{nextStep.actionText}</span>
              </button>
            )}
            {nextStep.actionType === "payment" && canSubmitPayment && (
              <button
                type="button"
                onClick={() => setPaymentOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-white hover:bg-[#00102e]/90 shadow-sm transition shrink-0"
              >
                <Upload className="h-3.5 w-3.5 text-[#d9a84e]" />
                <span>{nextStep.actionText}</span>
              </button>
            )}
            {nextStep.actionType === "contact" && (
              <a
                href={item.communicationChannel === "zoom" ? item.meetingUrl || "#" : whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white hover:bg-emerald-800 shadow-sm transition shrink-0"
              >
                <ContactIcon className="h-3.5 w-3.5" />
                <span>{nextStep.actionText}</span>
              </a>
            )}
            {nextStep.actionType === "upload" && (
              <a
                href="#supporting-documents"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-white hover:bg-[#00102e]/90 shadow-sm transition shrink-0"
              >
                <Upload className="h-3.5 w-3.5 text-[#d9a84e]" />
                <span>{nextStep.actionText}</span>
              </a>
            )}
          </div>
        </header>

        {/* 2-Column Responsive Workspace */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.18fr_0.82fr] items-start">

          {/* Main Column (Right in RTL) */}
          <div className="space-y-6">

            {/* 1. Request Details */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="text-base font-black text-[#00102e]">تفاصيل الطلب</h2>
              <p className="mt-3 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-700">{item.description}</p>
            </section>

            {/* 2. Uploaded Documents */}
            <section id="supporting-documents" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm scroll-mt-28">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-[#00102e]">المستندات المرفوعة</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{serviceCopy.attachmentsSubtitle}</p>
                </div>
                  {item.permissions.canUploadFiles && (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#00102e] px-3.5 py-2 text-xs font-black text-white hover:bg-[#00102e]/90 transition">
                      <Upload className="h-3.5 w-3.5 text-[#d9a84e]" />
                    <span>{serviceCopy.uploadLabel}</span>
                    <input type="file" multiple accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp" className="hidden" disabled={busy} onChange={(event) => void uploadFiles(event.target.files)} />
                  </label>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {item.attachments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                    <FileText className="mx-auto h-7 w-7 text-slate-300" />
                    <p className="mt-2 text-xs font-bold text-slate-500">لم يتم رفع مستندات بعد.</p>
                  </div>
                ) : (
                  item.attachments.map((file, index) => {
                    const isMainContract = index === 0 && Boolean(serviceCopy.primaryAttachmentBadge);
                    return (
                      <div key={file.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${isMainContract ? "border-[#986410]/30 bg-[#986410]/5" : "border-slate-200 bg-white"}`}>
                        <div className="flex min-w-0 items-center gap-3">
                          <Paperclip className={`h-4 w-4 shrink-0 ${isMainContract ? "text-[#986410]" : "text-slate-400"}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-xs font-black text-slate-800">{file.fileName}</span>
                              {isMainContract && (
                                <span className="rounded bg-[#986410]/15 px-1.5 py-0.5 text-[9px] font-black text-[#986410]">
                                  {serviceCopy.primaryAttachmentBadge}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">{formatFileSize(file.sizeBytes)}</div>
                          </div>
                        </div>
                        <a href={apiUrl(`/api/v1/attachments/${file.id}/download`)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition" title="تنزيل"><Download className="h-4 w-4" /></a>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* 3. Deliverables & Results */}
            <section className={`rounded-2xl border bg-white p-5 sm:p-6 shadow-sm transition ${item.deliverables.length > 0 ? "border-emerald-300" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[#00102e]">{serviceCopy.deliverablesTitle}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{serviceCopy.deliverablesSubtitle}</p>
                </div>
                {item.deliverables.length > 0 && (
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-black text-emerald-700">
                    {item.deliverables.length} نتيجة متاحة
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {item.deliverables.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                    <Clock3 className="mx-auto h-7 w-7 text-slate-300" />
                    <p className="mt-2 text-xs font-bold text-slate-500">لم يرفع المكتب نتيجة بعد.</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{serviceCopy.deliverablesEmpty}</p>
                  </div>
                ) : (
                  item.deliverables.map((file) => (
                    <article key={file.id} className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-emerald-700" />
                            <h3 className="text-xs sm:text-sm font-black text-emerald-950">{file.title}</h3>
                            {file.isFinal && <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[9px] font-black text-white">نسخة نهائية</span>}
                          </div>
                          <p className="mt-1 text-[11px] text-emerald-800">الإصدار {file.versionNumber} · {formatDate(file.publishedAt)}</p>
                          {file.notes && <p className="mt-2 text-xs leading-6 text-slate-600">{file.notes}</p>}
                        </div>
                        <a href={apiUrl(`/api/v1/attachments/${file.attachmentId}/download`)} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white hover:bg-emerald-800 transition"><Download className="h-4 w-4" /> تنزيل</a>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {item.permissions.canRequestRevision && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <label className="text-xs font-black text-slate-700">التعديلات المطلوبة</label>
                  <textarea value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} rows={3} placeholder="اكتب التعديلات المطلوبة باختصار..." className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-xs outline-none focus:border-[#986410]" />
                  <button type="button" disabled={busy} onClick={() => void requestRevision()} className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">طلب تعديل</button>
                </div>
              )}

              {item.permissions.canConfirmReceipt && (
                <button type="button" disabled={busy} onClick={() => setReceiptConfirmOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {item.requestType === "contract_review" ? "تأكيد استلام المراجعة" : "تأكيد استلام النسخة"}</button>
              )}
            </section>
          </div>

          {/* Sidebar Column (Left in RTL) */}
          <aside className="space-y-6">

            {/* 1. Payment Card - Placed first as top priority in active flow */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="text-base font-black text-[#00102e]">{paymentPanelTitle}</h2>

              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                {paymentDue > 0 ? (
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-slate-600">المبلغ المطلوب:</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-[#00102e]">{paymentDue.toLocaleString("ar-EG")}</span>
                      <span className="text-xs font-bold text-[#986410]">ج.م</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-emerald-700">لا توجد مبالغ مستحقة حاليًا.</div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/60 pt-2">
                  <span>حالة الدفع:</span>
                  <span className="font-bold text-slate-700">
                    {paymentStatusLabels[item.paymentStatus || ""] || (approvedPaid > 0 ? "تم اعتماد الدفع" : "لم يتم رفع إثبات الدفع بعد")}
                  </span>
                </div>
              </div>

              {item.serviceTotalPriceEgp != null || item.lawyerTotalPriceEgp != null ? (
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs">
                  <PaymentStat label="السعر الكامل" value={Number(item.serviceTotalPriceEgp ?? item.lawyerTotalPriceEgp ?? 0)} />
                  <PaymentStat label={item.requestType === "consultation" ? "المطلوب" : "العربون"} value={Number(item.serviceDepositEgp ?? item.lawyerDepositEgp ?? 0)} />
                  <PaymentStat label="المدفوع" value={approvedPaid} />
                  <PaymentStat label="المتبقي" value={outstanding} strong />
                </div>
              ) : null}

              {item.paymentAdminNotes && (
                <div className={`mt-3 rounded-xl border p-3 text-xs font-bold leading-6 ${item.paymentStatus === "needs_client_info" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {item.paymentAdminNotes}
                </div>
              )}

              {canSubmitPayment && (
                <button
                  type="button"
                  onClick={() => setPaymentOpen(true)}
                  className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black shadow-sm transition ${
                    paymentIsPrimaryNextAction
                      ? "border border-[#00102e]/15 bg-slate-50 text-[#00102e] hover:bg-slate-100"
                      : "bg-[#00102e] text-white hover:bg-[#00102e]/90"
                  }`}
                >
                  <Upload className={`h-4 w-4 ${paymentIsPrimaryNextAction ? "text-[#986410]" : "text-[#d9a84e]"}`} />
                  <span>{item.paymentStatus === "rejected" ? "رفع إثبات دفع جديد" : item.paymentStatus === "needs_client_info" ? "رفع إثبات بديل" : "رفع إثبات الدفع"}</span>
                </button>
              )}
            </section>

            {/* 2. Communication & Scheduled Meeting */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="text-base font-black text-[#00102e]">التواصل والموعد</h2>
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <ContactIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#986410]" />
                <div>
                  <div className="text-xs font-black text-slate-800">{communicationLabels[item.communicationChannel || "whatsapp"]}</div>
                  <div className="mt-0.5 text-[11px] leading-5 text-slate-500">
                    {communicationIsFollowUpOnly
                      ? `للمتابعة والاستفسار فقط. يبدأ ${serviceCopy.workNoun} بعد اعتماد الدفع من الإدارة.`
                      : "التواصل يتم مباشرة مع المختص بالطريقة المحددة لمتابعة الطلب."}
                  </div>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">جهة المتابعة</dt>
                  <dd className="font-black text-slate-800">مكتب Z Draft</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">الموعد</dt>
                  <dd className="text-left font-black text-slate-800">
                    {item.meetingAt ? formatDate(item.meetingAt) : `${formatDate(item.preferredContactAt, false)}${item.preferredContactPeriodLabel ? ` · ${item.preferredContactPeriodLabel}` : " · مبدئي"}`}
                  </dd>
                </div>
              </dl>

              {item.meetingProvider === "zoom" && item.meetingUrl && (
                <a href={item.meetingUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-800 transition">
                  <Video className="h-4 w-4" /> فتح رابط Zoom
                </a>
              )}
              {item.communicationChannel === "whatsapp" && whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                    communicationIsFollowUpOnly
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  <MessageCircle className="h-4 w-4" /> فتح WhatsApp للمتابعة
                </a>
              )}
            </section>

            {/* 3. Linked Contract if any */}
            {item.linkedContractId && (
              <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm">
                <h2 className="text-sm font-black text-blue-950">عقد مرتبط بالطلب</h2>
                <p className="mt-1.5 text-xs text-blue-800">{item.linkedContractTitle || item.linkedContractSerial}</p>
                <Link href={`/contract/${item.linkedContractId}`} className="mt-3 inline-block rounded-xl bg-blue-700 px-4 py-2 text-xs font-black text-white hover:bg-blue-800 transition">فتح العقد</Link>
              </section>
            )}

            {/* 4. Timeline History */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="text-base font-black text-[#00102e]">سجل متابعة الطلب</h2>
              <div className="mt-4 space-y-3.5">
                {item.events.map((event) => (
                  <div key={event.id} className="relative border-r-2 border-slate-200 pr-3.5">
                    <span className="absolute -right-[5px] top-1.5 h-2 w-2 rounded-full bg-[#986410]" />
                    <p className="text-xs font-bold leading-5 text-slate-700">{event.notes || requestStatusLabels[String(event.payload?.status || "")] || "تم تحديث الطلب"}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400"><Clock3 className="h-3 w-3" /> {formatDate(event.createdAt)}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>

        </div>

        {/* Mobile Sticky Action Bar */}
        {primaryMobileAction && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 p-4 border-t border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md sm:hidden pb-6">
            {primaryMobileAction}
          </div>
        )}
      </main>

      <ActionDialog open={receiptConfirmOpen} title={serviceCopy.confirmTitle} message={serviceCopy.confirmMessage} confirmLabel="تأكيد الاستلام" onClose={() => setReceiptConfirmOpen(false)} onConfirm={() => void performConfirmReceipt()} />

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
