"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, Clock3, FileText, Loader2, MessageCircle, Phone, Scale, Trash2, Upload, Video, X } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { apiRequest, ApiClientError, frontendApi } from "@/lib/apiClient";
import { compressMultipleFiles } from "@/lib/compression";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import type { CommunicationChannel } from "@/types/customer";
import { normalizePhoneInput, phoneValidationError } from "@/lib/inputValidation";
import GatewayCheckoutModal from "@/components/checkout/GatewayCheckoutModal";
import { formatFileSize } from "@/lib/labels";

const MAX_MAIN_CONTRACT_FILES = 5;
const MAX_SUPPORTING_FILES = 30;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const channels: Array<{ key: CommunicationChannel; label: string; icon: typeof Video }> = [
  { key: "zoom", label: "Zoom", icon: Video },
  { key: "whatsapp", label: "WhatsApp", icon: Phone },
];

function isPreviewableImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name);
}

export default function RequestReviewPage() {
  const router = useRouter();
  const { catalog, loading: catalogLoading, loadError: catalogLoadError } = usePublicCatalog();

  const [requestPurpose, setRequestPurpose] = useState<"review" | "consultation">("review");
  const [contractTypeText, setContractTypeText] = useState("");
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

  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdRequest, setCreatedRequest] = useState<{ id: number; serialNumber: string } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const totalReviewPrice = catalog?.services?.contractReviewFeeEgp || 0;
  const reviewDeposit = totalReviewPrice > 0 ? Math.min(catalog?.services?.contractReviewDepositEgp || 0, totalReviewPrice) : (catalog?.services?.contractReviewDepositEgp || 0);
  const remainingPrice = Math.max(0, totalReviewPrice - reviewDeposit);
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
      const remainingSlots = Math.max(0, MAX_MAIN_CONTRACT_FILES - mainContracts.length);
      if (remainingSlots <= 0) {
        setError(`الحد الأقصى للعقود الأساسية هو ${MAX_MAIN_CONTRACT_FILES} ملفات.`);
        return;
      }
      const compressed = await compressMultipleFiles(incoming.slice(0, remainingSlots));
      const prepared = compressed.map(c => c.file);
      const tooLarge = prepared.find((file) => file.size > MAX_FILE_BYTES);
      if (tooLarge) {
        setError(`الملف ${tooLarge.name} أكبر من الحد المسموح 20MB.`);
        return;
      }
      setMainContracts((current) => [...current, ...prepared]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر قراءة ملفات العقد.");
    } finally {
      setPreparing(false);
    }
  }

  async function addSupportingFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPreparing(true); setError("");
    try {
      const incoming = Array.from(files);
      const remainingSlots = Math.max(0, MAX_SUPPORTING_FILES - attachments.length);
      if (remainingSlots <= 0) {
        setError(`الحد الأقصى للمستندات المساعدة هو ${MAX_SUPPORTING_FILES} ملفًا.`);
        return;
      }
      const compressed = await compressMultipleFiles(incoming.slice(0, remainingSlots));
      const prepared = compressed.map(c => c.file);
      const tooLarge = prepared.find((file) => file.size > MAX_FILE_BYTES);
      if (tooLarge) {
        setError(`الملف ${tooLarge.name} أكبر من الحد المسموح 20MB.`);
        return;
      }
      setAttachments((current) => [...current, ...prepared]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر قراءة المستندات.");
    } finally {
      setPreparing(false);
    }
  }


  async function submit() {
    setError("");
    if (!contractTypeText.trim()) return setError("اكتب نوع العقد.");
    if (requestPurpose === "consultation" && description.trim().length < 10) return setError("اكتب سؤالك أو المشكلة بما لا يقل عن 10 أحرف.");
    const phoneError = phoneValidationError(phone, true); if (phoneError) return setError(phoneError);
    if (!selectedSlotKey) return setError(requestPurpose === "review" ? "اختر يومًا وموعدًا مناسبًا لمناقشة نتيجة المراجعة." : "اختر يومًا وموعدًا مناسبًا للاستشارة.");
    if (mainContracts.length === 0) return setError(requestPurpose === "review" ? "ارفع العقد اللي عايز تراجعه." : "ارفع العقد اللي الاستشارة بخصوصه.");

    setSubmitting(true);
    try {
      const attachmentIds: number[] = [];
      for (const file of [...mainContracts, ...attachments]) {
        const body = new FormData(); body.append("file", file);
        const uploaded = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body });
        attachmentIds.push(uploaded.id);
      }
      const generatedTitle = `${requestPurpose === "review" ? "مراجعة عقد" : "استشارة بخصوص عقد"} — ${contractTypeText.trim()}`;
      const request = await apiRequest<{ id: number; serialNumber: string; paymentAmountEgp?: number }>("/api/v1/service-requests", {
        method: "POST",
        body: JSON.stringify({
          requestType: "contract_review",
          requestPurpose,
          contractTypeText: contractTypeText.trim(),
          title: generatedTitle,
          description: description.trim(),
          communicationChannel: channel,
          availabilitySlotKey: selectedSlotKey,
          attachmentIds,
          paymentRequired: reviewDeposit > 0,
          clientContactSnapshot: { phone: normalizePhoneInput(phone) },
        }),
      });
      const created = { id: request.id, serialNumber: request.serialNumber };
      setCreatedRequest(created);
      if (reviewDeposit > 0) setCheckoutOpen(true);
      else router.push(`/requests/${request.id}`);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/request-review")}`);
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
                  <Scale className="h-4 w-4" /> راجع عقدك أو اسأل محامي
                </div>
                <h2 className="mt-4 text-xl sm:text-2xl font-black text-white">
                  مراجعة أو استشارة بخصوص عقد موجود
                </h2>
                <p className="mt-3 text-[12px] leading-6 text-slate-300">
                  اختار محتاج مراجعة للعقد ولا استشارة بخصوصه، وارفع العقد، وبعدها اختار وسيلة التواصل والموعد المناسب.
                </p>

                {/* Pricing Box */}
                <div className="mt-5 rounded-2xl border border-[#986410]/35 bg-[#986410]/10 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[11px] font-bold text-[#d9a84e]">سعر الخدمة</span>
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
                        <span>المتبقي بعد انتهاء الخدمة:</span>
                        <span className="text-white font-bold">{remainingPrice.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    </div>
                  )}

                  <p className="mt-2 text-[10px] leading-5 text-slate-400 border-t border-white/10 pt-2">
                    يُدفع المبلغ المطلوب الآن لبدء الخدمة، وسيظهر المتبقي ({remainingPrice.toLocaleString("ar-EG")} ج.م) داخل الطلب في المرحلة المحددة من الخدمة.
                  </p>
                </div>

                <div className="mt-6 space-y-3 text-[11px] leading-5 text-slate-300">
                  <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#d9a84e]" /> العقد الأساسي مطلوب، ويمكنك إرفاق أي مستندات مساعدة لو موجودة.
                  </div>
                  <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> حالة الطلب والمواعيد وأي ملفات يتيحها المكتب تظل محفوظة داخل حسابك.
                  </div>
                  <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" /> موعدك يُحجز حسب المواعيد المتاحة ويظهر داخل الطلب.
                  </div>
                  {reviewNumber && (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <MessageCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span>رقم WhatsApp للخدمة:</span>
                      </div>
                      <b dir="ltr" className="font-mono text-white">{reviewNumber}</b>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Form */}
              <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5 sm:p-6">

                {/* Purpose + contract type */}
                <div className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-[11px] font-bold text-slate-300">محتاج إيه؟ <span className="text-red-400">*</span></p>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setRequestPurpose("review")} className={`rounded-xl border px-3 py-2.5 text-[11px] font-black transition ${requestPurpose === "review" ? "border-[#986410] bg-[#986410]/15 text-[#d9a84e]" : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"}`}>مراجعة العقد</button>
                      <button type="button" onClick={() => setRequestPurpose("consultation")} className={`rounded-xl border px-3 py-2.5 text-[11px] font-black transition ${requestPurpose === "consultation" ? "border-[#986410] bg-[#986410]/15 text-[#d9a84e]" : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"}`}>استشارة بخصوص العقد</button>
                    </div>
                  </div>

                  <label className="block text-[11px] font-bold text-slate-300">نوع العقد <span className="text-red-400">*</span>
                    <input value={contractTypeText} onChange={(event) => setContractTypeText(event.target.value)} placeholder="مثال: عقد إيجار شقة، عقد بيع عربية، عقد شراكة..." className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[12px] text-white placeholder:text-slate-500 focus:border-[#986410] outline-none" />
                  </label>

                  <label className="block text-[11px] font-bold text-slate-300">
                    {requestPurpose === "review" ? "عايز المحامي يراجعلك إيه أو يركز على إيه؟" : <>احكيلنا سؤالك أو المشكلة <span className="text-red-400">*</span></>}
                    <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder={requestPurpose === "review" ? "اختياري — اكتب أي نقطة معينة حابب المحامي يركز عليها." : "احكيلنا بشكل بسيط سؤالك أو المشكلة المرتبطة بالعقد."} className="mt-1.5 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-3 text-[12px] text-white placeholder:text-slate-500 focus:border-[#986410] outline-none" />
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

                <div className="grid gap-3 pt-1 sm:grid-cols-2">
                  {/* Main Contract Upload (Required) */}
                  <div>
                    <div className="flex justify-between gap-2 text-[10px] font-bold text-slate-300 mb-1"><span>{requestPurpose === "review" ? "العقد اللي عايز تراجعه" : "العقد اللي الاستشارة بخصوصه"} <span className="text-red-400">*</span></span><span>{mainContracts.length}/{MAX_MAIN_CONTRACT_FILES}</span></div>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#986410]/50 bg-[#986410]/10 p-3 text-center transition hover:bg-[#986410]/20 min-h-[70px]">
                      <input type="file" multiple accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp" className="hidden" disabled={preparing} onChange={(event) => void addMainContracts(event.target.files)} />
                      {preparing ? <Loader2 className="h-4 w-4 animate-spin text-[#d9a84e]" /> : <Upload className="h-4 w-4 text-[#d9a84e]" />}
                      <span className="mt-1 text-[10px] font-black text-white">{requestPurpose === "review" ? "ارفع العقد" : "ارفع عقد الاستشارة"}</span>
                    </label>
                  </div>

                  {/* Supporting Documents (Optional) */}
                  <div>
                    <div className="flex justify-between gap-2 text-[10px] font-bold text-slate-300 mb-1"><span>مستندات مساعدة</span><span>{attachments.length}/{MAX_SUPPORTING_FILES}</span></div>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 p-3 text-center transition hover:bg-slate-800 min-h-[70px]">
                      <input type="file" multiple accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp" className="hidden" disabled={preparing} onChange={(event) => void addSupportingFiles(event.target.files)} />
                      {preparing ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Upload className="h-4 w-4 text-slate-400" />}
                      <span className="mt-1 text-[10px] font-black text-slate-300">مستندات إضافية</span>
                    </label>
                  </div>
                </div>

                {/* Selected Files List */}
                {(mainContracts.length > 0 || attachments.length > 0) && (
                  <div className="grid max-h-80 gap-2 overflow-y-auto pt-1 sm:grid-cols-2">
                    {mainContracts.map((file, index) => (
                      <ReviewUploadCard key={`main-${file.name}-${index}`} file={file} label="العقد الأساسي" tone="gold" onRemove={() => setMainContracts((items) => items.filter((_, i) => i !== index))} />
                    ))}
                    {attachments.map((file, index) => (
                      <ReviewUploadCard key={`supp-${file.name}-${index}`} file={file} label="مستند مساعد" tone="slate" onRemove={() => setAttachments((items) => items.filter((_, i) => i !== index))} />
                    ))}
                  </div>
                )}

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-[10px] font-bold leading-5 text-blue-100">
                  بعد إنشاء الطلب هتدفع المبلغ المطلوب من خلال بوابة الدفع الإلكترونية. مراجعة العقد والاستشارة بخصوص عقد لهم نفس إعداد السعر والدفع.
                </div>

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] font-bold text-red-300">{error}</div>}

                <button type="button" disabled={submitting || preparing || catalogLoading || catalogLoadError || Boolean(createdRequest)} onClick={() => void submit()} className="mt-2 w-full rounded-xl bg-[#986410] py-3 text-[12px] font-black text-white transition hover:bg-[#986410]/90 disabled:opacity-60">
                  {submitting ? "جاري إنشاء الطلب..." : reviewDeposit > 0 ? "أنشئ الطلب وادفع" : requestPurpose === "review" ? "إرسال طلب المراجعة" : "إرسال طلب الاستشارة"}
                </button>
              </div>

            </div>
          </section>
        </div>
      </main>

      <Footer />
      {createdRequest && reviewDeposit > 0 && (
        <GatewayCheckoutModal
          isOpen={checkoutOpen}
          onClose={() => { setCheckoutOpen(false); router.push(`/requests/${createdRequest.id}`); }}
          orderTitle={`${requestPurpose === "review" ? "مراجعة عقد" : "استشارة بخصوص عقد"} — ${contractTypeText.trim()}`}
          amountEgp={reviewDeposit}
          serviceRequestId={createdRequest.id}
          serialNumber={createdRequest.serialNumber}
          purpose="review_consultation_initial"
          lineItems={[{ key: "initial", label: "الدفعة المطلوبة الآن", amountEgp: reviewDeposit }]}
          metadata={{ requestPurpose, contractTypeText: contractTypeText.trim(), totalPriceEgp: totalReviewPrice, remainingEgp: remainingPrice }}
          onPaid={() => router.push(`/requests/${createdRequest.id}?payment=success`)}
        />
      )}
    </div>
  );
}

function ReviewUploadCard({ file, label, tone, onRemove }: { file: File; label: string; tone: "gold" | "slate"; onRemove: () => void }) {
  const canPreview = isPreviewableImage(file);
  const previewUrl = useMemo(() => {
    if (!canPreview || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return "";
    return URL.createObjectURL(file);
  }, [canPreview, file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const borderClass = tone === "gold" ? "border-[#986410]/35 bg-[#986410]/10" : "border-slate-700 bg-slate-900";
  const labelClass = tone === "gold" ? "text-[#d9a84e]" : "text-slate-400";

  return (
    <article className={`rounded-xl border p-2 ${borderClass}`}>
      <div
        className="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950 bg-cover bg-center"
        style={previewUrl ? { backgroundImage: `url("${previewUrl}")` } : undefined}
      >
        {!previewUrl && (
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <FileText className="h-6 w-6" />
            <span className="text-[10px] font-bold">ملف مرفوع</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={`block text-[9px] font-black ${labelClass}`}>{label}</span>
          <p className="truncate text-[10px] font-black text-white" title={file.name}>{file.name}</p>
          <p className="mt-0.5 text-[9px] font-bold text-slate-500">{formatFileSize(file.size)}</p>
        </div>
        <button type="button" onClick={onRemove} aria-label={`حذف ${file.name}`} className="shrink-0 rounded-lg p-1.5 text-red-300 hover:bg-red-500/10">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
