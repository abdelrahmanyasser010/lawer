"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, Clock3, FileText, Loader2, MessageCircle, Phone, Scale, Upload, Video, X } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { apiRequest, ApiClientError, frontendApi } from "@/lib/apiClient";
import { compressMultipleFiles, compressUploadFile } from "@/lib/compression";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import type { CommunicationChannel } from "@/types/customer";
import { normalizePhoneInput, phoneValidationError } from "@/lib/inputValidation";
import { usePaymentAccess } from "@/hooks/usePaymentAccess";

const channels: Array<{ key: CommunicationChannel; label: string; icon: typeof Video }> = [
  { key: "zoom", label: "Zoom", icon: Video },
  { key: "whatsapp", label: "WhatsApp", icon: Phone },
];

export default function RequestReviewPage() {
  const router = useRouter();
  const { catalog, loading: catalogLoading, loadError: catalogLoadError } = usePublicCatalog();
  const { paymentAccess, paymentVerified, paymentCashNumber, requireVerified } = usePaymentAccess("/request-review");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");

  const [availabilityDays, setAvailabilityDays] = useState<Array<{ date: string; label: string; slots: Array<{ slotKey: string; start: string; end: string; label: string; remaining: number; limited?: boolean }> }>>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [dayMenuOpen, setDayMenuOpen] = useState(false);

  const [phone, setPhone] = useState("");

  const [mainContracts, setMainContracts] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  const [receipt, setReceipt] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalReviewPrice = catalog?.services?.contractReviewFeeEgp || 0;
  const reviewDeposit = totalReviewPrice > 0 ? Math.min(catalog?.services?.contractReviewDepositEgp || 0, totalReviewPrice) : (catalog?.services?.contractReviewDepositEgp || 0);
  const remainingPrice = Math.max(0, totalReviewPrice - reviewDeposit);
  const cashNumber = paymentCashNumber;
  const reviewNumber = catalog?.office?.reviewWhatsappNumber || "";

  const enabledChannels = useMemo(() => {
    if (!catalog) return [];
    return channels.filter((option) => catalog.policies.communicationChannels.includes(option.key));
  }, [catalog]);

  useEffect(() => {
    if (enabledChannels.length && !enabledChannels.some((option) => option.key === channel)) {
      setChannel(enabledChannels[0].key);
    }
  }, [channel, enabledChannels]);

  useEffect(() => {
    let cancelled = false;
    setAvailabilityLoading(true); setAvailabilityError(""); setSelectedDate(""); setSelectedSlotKey("");
    apiRequest<{ days: Array<{ date: string; label: string; slots: Array<{ slotKey: string; start: string; end: string; label: string; remaining: number; limited?: boolean }> }> }>(`/api/v1/review-availability?channel=${encodeURIComponent(channel)}`)
      .then((result) => { if (!cancelled) setAvailabilityDays(result.days || []); })
      .catch((error) => { if (!cancelled) { setAvailabilityDays([]); setAvailabilityError(error instanceof Error ? error.message : "تعذر تحميل المواعيد المتاحة."); } })
      .finally(() => { if (!cancelled) setAvailabilityLoading(false); });
    return () => { cancelled = true; };
  }, [channel]);

  useEffect(() => {
    let active = true;
    frontendApi.profile().then((profile) => {
      if (!active) return;
      const savedPhone = profile.whatsappNumber || profile.phone || "";
      if (savedPhone) setPhone((current) => current || savedPhone);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function addMainContracts(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPreparing(true); setError("");
    try {
      const incoming = Array.from(files);
      const remainingSlots = Math.max(0, 5 - mainContracts.length);
      if (remainingSlots <= 0) {
        setError("الحد الأقصى للعقود الأساسية هو 5 ملفات.");
        return;
      }
      const compressed = await compressMultipleFiles(incoming.slice(0, remainingSlots));
      setMainContracts((current) => [...current, ...compressed.map(c => c.file)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تجهيز ملفات العقد.");
    } finally {
      setPreparing(false);
    }
  }

  async function addSupportingFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPreparing(true); setError("");
    try {
      const incoming = Array.from(files);
      const remainingSlots = Math.max(0, 30 - attachments.length);
      if (remainingSlots <= 0) {
        setError("الحد الأقصى للمستندات المساعدة هو 30 ملفًا.");
        return;
      }
      const compressed = await compressMultipleFiles(incoming.slice(0, remainingSlots));
      setAttachments((current) => [...current, ...compressed.map(c => c.file)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تجهيز المستندات.");
    } finally {
      setPreparing(false);
    }
  }

  async function selectReceipt(file: File | null) {
    if (!file) { setReceipt(null); return; }
    setPreparing(true); setError("");
    try {
      const compressed = await compressUploadFile(file);
      setReceipt(compressed.file);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تجهيز إثبات الدفع.");
    } finally {
      setPreparing(false);
    }
  }

  async function submit() {
    setError("");
    if (!(await requireVerified())) return;
    if (!title.trim()) {
      setError("اكتب موضوع المراجعة باختصار.");
      return;
    }
    if (description.trim().length < 10) {
      setError("اكتب تفاصيل المراجعة بما لا يقل عن 10 أحرف.");
      return;
    }
    const phoneError = phoneValidationError(phone, true);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    if (!selectedSlotKey) {
      setError("اختر يومًا وموعدًا متاحًا للتواصل ومناقشة تقرير المراجعة.");
      return;
    }
    if (mainContracts.length === 0) {
      setError("يجب رفع العقد الأساسي المراد مراجعته.");
      return;
    }
    if (reviewDeposit > 0 && !cashNumber) {
      setError("بيانات الدفع غير متاحة حاليًا.");
      return;
    }
    if (reviewDeposit > 0 && !receipt) {
      setError("ارفع إثبات دفع عربون مراجعة العقد.");
      return;
    }

    setSubmitting(true);
    let createdRequestId: number | null = null;
    try {
      const attachmentIds: number[] = [];
      const allFiles = [...mainContracts, ...attachments];
      for (const file of allFiles) {
        const body = new FormData();
        body.append("file", file);
        const uploaded = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body });
        attachmentIds.push(uploaded.id);
      }

      const selectedDay = availabilityDays.find((item) => item.date === selectedDate);
      const selectedSlot = selectedDay?.slots.find((item) => item.slotKey === selectedSlotKey);

      const request = await apiRequest<{ id: number; serialNumber: string }>("/api/v1/service-requests", {
        method: "POST",
        body: JSON.stringify({
          requestType: "contract_review",
          title: title.trim(),
          description: description.trim(),
          communicationChannel: channel,
          availabilitySlotKey: selectedSlotKey,
          attachmentIds,
          paymentRequired: reviewDeposit > 0,
          clientContactSnapshot: {
            phone: normalizePhoneInput(phone),
            preferredDate: selectedDate,
            preferredSlotStart: selectedSlot?.start || null,
            preferredPeriodLabel: selectedSlot ? `${selectedDay?.label || selectedDate} — ${selectedSlot.label}` : null,
          },
        }),
      });
      createdRequestId = request.id;

      if (reviewDeposit > 0 && receipt) {
        const receiptBody = new FormData();
        receiptBody.append("file", receipt);
        const receiptAttachment = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body: receiptBody });
        await apiRequest("/api/v1/payments/receipts", {
          method: "POST",
          body: JSON.stringify({ serviceRequestId: request.id, amountEgp: reviewDeposit, senderPhone: normalizePhoneInput(phone), attachmentId: receiptAttachment.id }),
        });
      }
      router.push(`/requests/${request.id}`);
    } catch (caught) {
      if (createdRequestId) {
        router.push(`/requests/${createdRequestId}?payment=retry`);
        return;
      }
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.push("/login?next=%2Frequest-review");
        return;
      }
      setError(caught instanceof Error ? caught.message : "تعذر إرسال الطلب الآن.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col font-sans text-right bg-[#f8fafc]" dir="rtl">
      <Navbar />

      <main className="flex-1 py-10 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#00102e] p-6 text-white shadow-2xl sm:p-9">
            <div className="grid gap-8 lg:grid-cols-[.82fr_1.18fr] items-start">

              {/* Left Column: Summary */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#986410]/40 bg-[#986410]/10 px-3 py-1.5 text-xs font-black text-[#d9a84e]">
                  <Scale className="h-4 w-4" /> مراجعة عقد
                </div>
                <h2 className="mt-4 text-xl sm:text-2xl font-black text-white">
                  مراجعة وتدقيق العقد بواسطة محامٍ
                </h2>
                <p className="mt-3 text-[12px] leading-6 text-slate-300">
                  اكتب باختصار ما الذي تريد مراجعته في العقد، وارفع العقد الأساسي مع أي مستندات داعمة، ثم اختر وسيلة التواصل والموعد من جدول المكتب لمناقشة التقرير.
                </p>

                {/* Pricing Box */}
                <div className="mt-5 rounded-2xl border border-[#986410]/35 bg-[#986410]/10 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[11px] font-bold text-[#d9a84e]">تسعير مراجعة العقد</span>
                    <span className="text-[10px] text-slate-300">الإجمالي: <b>{totalReviewPrice.toLocaleString("ar-EG")} ج.م</b></span>
                  </div>

                  {catalogLoading ? (
                    <div className="py-2 inline-flex items-center gap-2 text-xs font-bold text-slate-300">
                      <Loader2 className="h-4 w-4 animate-spin text-[#d9a84e]" /> جاري تحميل الرسوم...
                    </div>
                  ) : catalogLoadError ? (
                    <div className="text-xs font-black text-red-400">الرسوم غير متاحة مؤقتًا</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-slate-300">العربون المطلوب دفعه الآن:</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">{reviewDeposit.toLocaleString("ar-EG")}</span>
                          <span className="text-xs font-bold text-[#d9a84e]">ج.م</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-1.5">
                        <span>المتبقي عند إتمام المراجعة:</span>
                        <span className="text-white font-bold">{remainingPrice.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    </div>
                  )}

                  <p className="mt-2 text-[10px] leading-5 text-slate-400 border-t border-white/10 pt-2">
                    يُدفع العربون لتأكيد حجز الموعد والبدء في دراسة العقد، وسيظهر المبلغ المتبقي ({remainingPrice.toLocaleString("ar-EG")} ج.م) داخل الطلب عند اكتمال المراجعة وقبل إتاحة المخرج النهائي.
                  </p>
                </div>

                <div className="mt-6 space-y-3 text-[11px] leading-5 text-slate-300">
                  <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#d9a84e]" /> يمكنك إرفاق العقد الأساسي بالإضافة لأي مستندات مساعدة.
                  </div>
                  <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> حالة الطلب والمواعيد وأي ملفات يتيحها المكتب تظل محفوظة داخل حسابك.
                  </div>
                  <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" /> موعدك يُحجز مبدئيًا عند إرسال الطلب، ويُثبت بعد مراجعة الدفع.
                  </div>
                  {reviewNumber && (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <MessageCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span>رقم WhatsApp للمراجعات:</span>
                      </div>
                      <b dir="ltr" className="font-mono text-white">{reviewNumber}</b>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Form */}
              <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5 sm:p-6">

                {/* Compact Fields Group */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-bold text-slate-300">موضوع المراجعة
                    <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: مراجعة قبل توقيع عقد إيجار تجاري" className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[12px] text-white placeholder:text-slate-500 focus:border-[#986410] outline-none" />
                  </label>

                  <label className="block text-[11px] font-bold text-slate-300">تفاصيل المراجعة
                    <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="اكتب باختصار ما الذي تريد مراجعته في العقد، والنقاط التي تريد التركيز عليها." className="mt-1.5 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-3 text-[12px] text-white placeholder:text-slate-500 focus:border-[#986410] outline-none" />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <p className="text-[11px] font-bold text-slate-300 mb-1.5">طريقة التواصل</p>
                    <div className={`grid gap-1.5 ${enabledChannels.length >= 3 ? "grid-cols-3" : enabledChannels.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {enabledChannels.map((option) => {
                        const Icon = option.icon;
                        return <button key={option.key} type="button" onClick={() => setChannel(option.key)} className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[10px] font-black transition ${channel === option.key ? "border-[#986410] bg-[#986410]/15 text-[#d9a84e]" : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"}`}><Icon className="h-3.5 w-3.5" /> {option.label}</button>;
                      })}
                    </div>
                  </div>
                  <label className="block text-[11px] font-bold text-slate-300">رقم التواصل
                    <input value={phone} onChange={(event) => setPhone(normalizePhoneInput(event.target.value))} dir="ltr" placeholder="01XXXXXXXXX" className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-left text-[12px] text-white placeholder:text-slate-500 focus:border-[#986410] outline-none font-mono" />
                  </label>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-200"><Calendar className="h-4 w-4 text-[#d9a84e]" /> الموعد المتاح</div>
                  <div className="mt-2.5 grid items-end gap-2 sm:grid-cols-2">
                    <div className="relative">
                      <span className="mb-1 block text-[10px] font-bold text-slate-400">اليوم المناسب</span>
                      <button type="button" onClick={() => setDayMenuOpen((v) => !v)} disabled={availabilityLoading || availabilityDays.length === 0} className="flex h-[38px] w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-3 text-[11px] font-bold text-white disabled:opacity-50">
                        <span className={selectedDate ? "text-white" : "text-slate-500"}>{availabilityDays.find((day) => day.date === selectedDate)?.label || (availabilityLoading ? "جاري التحميل..." : "اختر اليوم")}</span>
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </button>
                      {dayMenuOpen && <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-2xl">{availabilityDays.map((day) => <button key={day.date} type="button" onClick={() => { setSelectedDate(day.date); setSelectedSlotKey(""); setDayMenuOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-right text-[11px] font-bold text-slate-200 hover:bg-slate-800"><span>{day.label}</span><span className="text-[9px] text-slate-500">{day.slots.length} موعد</span></button>)}</div>}
                    </div>
                    <div>
                      <span className="mb-1 block text-[10px] font-bold text-slate-400">الوقت المتاح</span>
                      <div className="flex h-[38px] items-center gap-1 overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 p-1 scrollbar-hide">
                        {!selectedDate ? <span className="m-auto px-2 text-[10px] text-slate-500">اختر اليوم أولًا</span> : (availabilityDays.find((day) => day.date === selectedDate)?.slots || []).map((slot) => <button key={slot.slotKey} type="button" onClick={() => setSelectedSlotKey(slot.slotKey)} className={`shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-black transition ${selectedSlotKey === slot.slotKey ? "bg-[#986410] text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{slot.label}</button>)}
                      </div>
                    </div>
                  </div>
                  {availabilityError && <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[10px] font-bold text-red-300">{availabilityError}</div>}
                  {!availabilityLoading && !availabilityError && availabilityDays.length === 0 && <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold text-amber-200">لا توجد مواعيد متاحة حاليًا. تواصل مع المكتب.</div>}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Main Contract Upload (Required) */}
                  <div>
                    <div className="flex justify-between gap-2 text-[10px] font-bold text-slate-300 mb-1"><span>العقد الأساسي <span className="text-red-400">*</span></span><span>{mainContracts.length}/5</span></div>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#986410]/50 bg-[#986410]/10 p-3 text-center transition hover:bg-[#986410]/20 min-h-[70px]">
                      <input type="file" multiple accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp" className="hidden" disabled={preparing} onChange={(event) => void addMainContracts(event.target.files)} />
                      {preparing ? <Loader2 className="h-4 w-4 animate-spin text-[#d9a84e]" /> : <Upload className="h-4 w-4 text-[#d9a84e]" />}
                      <span className="mt-1 text-[10px] font-black text-white">رفع العقد</span>
                    </label>
                  </div>

                  {/* Supporting Documents (Optional) */}
                  <div>
                    <div className="flex justify-between gap-2 text-[10px] font-bold text-slate-300 mb-1"><span>مستندات مساعدة</span><span>{attachments.length}/30</span></div>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 p-3 text-center transition hover:bg-slate-800 min-h-[70px]">
                      <input type="file" multiple accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp" className="hidden" disabled={preparing} onChange={(event) => void addSupportingFiles(event.target.files)} />
                      {preparing ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Upload className="h-4 w-4 text-slate-400" />}
                      <span className="mt-1 text-[10px] font-black text-slate-300">مستندات إضافية</span>
                    </label>
                  </div>
                </div>

                {/* Selected Files List */}
                {(mainContracts.length > 0 || attachments.length > 0) && (
                  <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pt-1">
                    {mainContracts.map((file, index) => <span key={`main-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#986410]/30 bg-[#986410]/20 px-2 py-1 text-[9px] text-[#d9a84e]"><span className="max-w-[100px] truncate">{file.name}</span><button type="button" onClick={() => setMainContracts((items) => items.filter((_, i) => i !== index))}><X className="h-3 w-3 text-[#d9a84e] hover:text-red-300" /></button></span>)}
                    {attachments.map((file, index) => <span key={`supp-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-800 px-2 py-1 text-[9px] text-slate-300"><span className="max-w-[100px] truncate">{file.name}</span><button type="button" onClick={() => setAttachments((items) => items.filter((_, i) => i !== index))}><X className="h-3 w-3 text-red-300" /></button></span>)}
                  </div>
                )}

                {reviewDeposit > 0 && !paymentVerified && <button type="button" onClick={() => void requireVerified()} className="w-full rounded-xl border border-[#986410]/30 bg-[#986410]/10 px-4 py-3 text-xs font-black text-[#d9a84e]">{paymentAccess === "unverified" ? "أكد بريدك الإلكتروني لعرض تعليمات الدفع" : "سجّل الدخول وأكد بريدك لعرض تعليمات الدفع"}</button>}
              {reviewDeposit > 0 && paymentVerified && <>
                  <div className="rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 flex items-center justify-between mt-3">
                    <span className="text-[11px] font-bold text-slate-300">حوّل العربون إلى رقم فودافون كاش:</span>
                    {catalogLoading ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> جاري التحميل...</span>
                    ) : paymentVerified && cashNumber ? (
                      <b dir="ltr" className="font-mono text-xs tracking-wide text-[#d9a84e]">{cashNumber}</b>
                    ) : (
                      <span className="text-[10px] font-bold text-red-300">غير متاح مؤقتًا.</span>
                    )}
                  </div>

                  <label className={`block rounded-xl border border-dashed border-[#986410]/50 bg-[#986410]/10 p-3 text-center transition hover:bg-[#986410]/20 ${catalogLoading || !cashNumber || !paymentVerified ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                    <input type="file" accept="image/*,.pdf" className="hidden" disabled={catalogLoading || !cashNumber || !paymentVerified} onChange={(event) => void selectReceipt(event.target.files?.[0] || null)} />
                    <Upload className="mx-auto h-4 w-4 text-[#d9a84e]" />
                    <span className="mt-1.5 block text-[10px] font-black text-white">{receipt?.name || `رفع إثبات دفع عربون المراجعة — ${reviewDeposit.toLocaleString("ar-EG")} ج.م`}</span>
                  </label>
                </>}

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] font-bold text-red-300">{error}</div>}

                <button type="button" disabled={submitting || preparing || catalogLoading || catalogLoadError || (reviewDeposit > 0 && !cashNumber)} onClick={() => void submit()} className="mt-2 w-full rounded-xl bg-[#986410] py-3 text-[12px] font-black text-white transition hover:bg-[#986410]/90 disabled:opacity-60">
                  {submitting ? "جاري رفع الملفات وإرسال الطلب..." : "إرسال طلب مراجعة العقد"}
                </button>
              </div>

            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
