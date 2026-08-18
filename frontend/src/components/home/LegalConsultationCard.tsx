"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, ChevronDown, Clock3, FileText, Loader2, MessageCircle, Phone, Scale, Upload, Video, X } from "lucide-react";
import { apiRequest, ApiClientError, frontendApi } from "@/lib/apiClient";
import { compressMultipleFiles, compressUploadFile } from "@/lib/compression";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import type { CommunicationChannel } from "@/types/customer";
import { normalizePhoneInput, phoneValidationError } from "@/lib/inputValidation";

const channels: Array<{ key: CommunicationChannel; label: string; icon: typeof Video }> = [
  { key: "zoom", label: "Zoom", icon: Video },
  { key: "whatsapp", label: "WhatsApp", icon: Phone },
];


export default function LegalConsultationCard() {
  const router = useRouter();
  const { catalog, loading: catalogLoading, loadError: catalogLoadError } = usePublicCatalog();
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const consultationFee = catalog.services.consultationFeeEgp ?? catalog.services.contractReviewFeeEgp;
  const consultationDeposit = catalog.services.consultationDepositEgp ?? catalog.services.contractReviewDepositEgp;
  const hasDepositSplit = consultationDeposit > 0 && consultationDeposit < consultationFee;
  const requiredAmount = hasDepositSplit ? consultationDeposit : consultationFee;
  const remainingAmount = Math.max(0, consultationFee - requiredAmount);
  const cashNumber = catalog.payment.vodafoneCashNumber;
  const consultationNumber = catalog.office.consultationWhatsappNumber || catalog.office.reviewWhatsappNumber || catalog.office.whatsappNumber;
  const enabledChannels = useMemo(() => channels.filter((option) => catalog.policies.communicationChannels.includes(option.key)), [catalog.policies.communicationChannels]);
  useEffect(() => {
    if (enabledChannels.length && !enabledChannels.some((option) => option.key === channel)) setChannel(enabledChannels[0].key);
  }, [channel, enabledChannels]);
  useEffect(() => {
    let cancelled = false;
    setAvailabilityLoading(true); setAvailabilityError(""); setSelectedDate(""); setSelectedSlotKey("");
    apiRequest<{ days: Array<{ date: string; label: string; slots: Array<{ slotKey: string; start: string; end: string; label: string; remaining: number; limited?: boolean }> }> }>(`/api/v1/consultation-availability?channel=${encodeURIComponent(channel)}`)
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


  async function addFiles(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (attachments.length + selected.length > 30) {
      setError("الحد الأقصى 30 ملفًا لكل استشارة.");
      return;
    }
    setPreparing(true);
    setError("");
    try {
      const results = await compressMultipleFiles(selected);
      setAttachments((current) => [...current, ...results.map((item) => item.file)]);
    } catch {
      setAttachments((current) => [...current, ...selected]);
    } finally {
      setPreparing(false);
    }
  }

  async function selectReceipt(file: File | null) {
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


  async function submit() {
    setError("");
    if (catalogLoadError) {
      setError("تعذر تحميل سعر الاستشارة وبيانات الدفع حاليًا. حاول مرة أخرى بعد قليل.");
      return;
    }
    if (!title.trim() || description.trim().length < 10) {
      setError("اكتب موضوعًا واضحًا وتفاصيل كافية عن الاستشارة.");
      return;
    }
    const phoneError = phoneValidationError(phone, true);
    if (phoneError) { setError(phoneError); return; }
    if (!selectedSlotKey) {
      setError("اختر يومًا وموعدًا متاحًا للتواصل.");
      return;
    }
    if (requiredAmount > 0 && !cashNumber) {
      setError("بيانات الدفع غير متاحة حاليًا. تواصل مع الدعم إذا استمرت المشكلة.");
      return;
    }
    if (requiredAmount > 0 && !receipt) {
      setError(`ارفع إثبات دفع ${hasDepositSplit ? "عربون الاستشارة" : "سعر الاستشارة"}.`);
      return;
    }

    setSubmitting(true);
    let createdRequestId: number | null = null;
    try {
      const attachmentIds: number[] = [];
      for (const file of attachments) {
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
          requestType: "consultation",
          title: title.trim(),
          description: description.trim(),
          communicationChannel: channel,
          availabilitySlotKey: selectedSlotKey,
          attachmentIds,
          paymentRequired: requiredAmount > 0,
          clientContactSnapshot: {
            phone: normalizePhoneInput(phone),
            preferredDate: selectedDate,
            preferredSlotStart: selectedSlot?.start || null,
            preferredPeriodLabel: selectedSlot ? `${selectedDay?.label || selectedDate} — ${selectedSlot.label}` : null,
          },
        }),
      });
      createdRequestId = request.id;

      if (requiredAmount > 0 && receipt) {
        const receiptBody = new FormData();
        receiptBody.append("file", receipt);
        const receiptAttachment = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body: receiptBody });
        await apiRequest("/api/v1/payments/receipts", {
          method: "POST",
          body: JSON.stringify({ serviceRequestId: request.id, amountEgp: requiredAmount, senderPhone: normalizePhoneInput(phone), attachmentId: receiptAttachment.id }),
        });
      }
      router.push(`/requests/${request.id}`);
    } catch (caught) {
      if (createdRequestId) {
        router.push(`/requests/${createdRequestId}?payment=retry`);
        return;
      }
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.push("/login?next=/#consultation");
        return;
      }
      setError(caught instanceof Error ? caught.message : "تعذر إرسال الاستشارة الآن.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="consultation" className="mt-14 scroll-mt-24 overflow-hidden rounded-3xl border border-slate-800 bg-[#00102e] p-6 text-white shadow-2xl sm:p-9">
      <div className="grid gap-8 lg:grid-cols-[.82fr_1.18fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#986410]/40 bg-[#986410]/10 px-3 py-1.5 text-xs font-black text-[#d9a84e]"><Scale className="h-4 w-4" /> استشارة قانونية</div>
          <h2 className="mt-5 text-2xl font-black">اطلب استشارة من المكتب</h2>
          <p className="mt-4 text-[13px] leading-7 text-slate-300">اكتب موضوع الاستشارة وارفع أي مستندات تساعد على فهم الحالة، ثم اختر وسيلة التواصل واليوم والموعد المتاح من جدول المكتب. يُحجز الموعد مبدئيًا لحين مراجعة الدفع.</p>

          <div className="mt-5 rounded-2xl border border-[#986410]/35 bg-[#986410]/10 p-5">
            <span className="text-[11px] font-bold text-[#d9a84e]">{hasDepositSplit ? "عربون حجز الاستشارة" : "سعر الاستشارة"}</span>
            {catalogLoading ? (
              <div className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-slate-300"><Loader2 className="h-4 w-4 animate-spin" /> جاري تحميل السعر...</div>
            ) : catalogLoadError ? (
              <div className="mt-2 text-sm font-black text-red-200">السعر غير متاح مؤقتًا</div>
            ) : (
              <div className="mt-1">
                <div className="text-3xl font-black text-white">{requiredAmount.toLocaleString("ar-EG")} <span className="text-sm">ج.م</span></div>
                {hasDepositSplit && (
                  <div className="mt-1 text-xs font-bold text-slate-300">
                    من إجمالي قيمة الاستشارة: <span className="line-through text-slate-400">{consultationFee.toLocaleString("ar-EG")} ج.م</span> (المتبقي: {remainingAmount.toLocaleString("ar-EG")} ج.م يُسدد لاحقًا)
                  </div>
                )}
              </div>
            )}
            <p className="mt-2 text-[10px] leading-5 text-slate-400">يتم اعتماد الطلب بعد مراجعة إثبات الدفع، وتظهر حالته داخل حسابك.</p>
          </div>

          <div className="mt-6 space-y-3 text-[11px] leading-5 text-slate-300">
            <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#d9a84e]" /> يمكنك إرفاق عقد أو مستند أو صورة ضمن الاستشارة دون اختيار نوع خدمة منفصل.</div>
            <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> حالة الاستشارة والمواعيد وأي ملفات يتيحها المكتب تظل محفوظة داخل حسابك.</div>
            <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" /> موعدك يُحجز مبدئيًا عند إرسال الطلب، ويُثبت بعد مراجعة الدفع.</div>
            {consultationNumber && <div className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> رقم WhatsApp المخصص للاستشارات: <b dir="ltr" className="font-mono text-white">{consultationNumber}</b></div>}
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/60 p-5 sm:p-6">
          <label className="block text-[11px] font-bold text-slate-300">موضوع الاستشارة
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: استشارة قبل توقيع عقد إيجار تجاري" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-[13px] text-white placeholder:text-[11px] placeholder:text-slate-500" />
          </label>

          <label className="block text-[11px] font-bold text-slate-300">تفاصيل الاستشارة
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="اشرح السؤال أو المشكلة والنقاط التي تريد من المكتب توضيحها." className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-[13px] text-white placeholder:text-[11px] placeholder:text-slate-500" />
          </label>

          <div>
            <p className="text-[11px] font-bold text-slate-300">طريقة التواصل</p>
            <div className={`mt-2 grid gap-2 ${enabledChannels.length >= 3 ? "grid-cols-3" : enabledChannels.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
              {enabledChannels.map((option) => {
                const Icon = option.icon;
                return <button key={option.key} type="button" onClick={() => setChannel(option.key)} className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-3 text-[11px] font-black ${channel === option.key ? "border-[#986410] bg-[#986410]/15 text-[#d9a84e]" : "border-slate-700 bg-slate-900 text-slate-400"}`}><Icon className="h-4 w-4" /> {option.label}</button>;
              })}
            </div>
          </div>

          <label className="block text-[11px] font-bold text-slate-300">رقم الهاتف أو WhatsApp
            <input value={phone} onChange={(event) => setPhone(normalizePhoneInput(event.target.value))} dir="ltr" placeholder="01XXXXXXXXX" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-left text-[13px] text-white placeholder:text-[11px] placeholder:text-slate-500" />
          </label>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-xs font-black text-slate-200"><Calendar className="h-4 w-4 text-[#d9a84e]" /> اليوم والموعد المتاح</div>
            <p className="mt-1 text-[10px] leading-5 text-slate-400">اختر من الأيام والمواعيد المتاحة فعليًا حسب جدول المكتب وسعة الحجوزات.</p>
            <div className="mt-4 grid items-end gap-3 sm:grid-cols-2">
              <div className="relative">
                <span className="mb-2 block text-[11px] font-bold text-slate-300">اليوم المناسب</span>
                <button type="button" onClick={() => setDayMenuOpen((v) => !v)} disabled={availabilityLoading || availabilityDays.length === 0} className="flex h-[46px] w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white disabled:opacity-50">
                  <span className={selectedDate ? "text-white" : "text-slate-400"}>{availabilityDays.find((day) => day.date === selectedDate)?.label || (availabilityLoading ? "جاري تحميل الأيام..." : "اختر اليوم")}</span>
                  <Calendar className="h-4 w-4 shrink-0 text-white" />
                </button>
                {dayMenuOpen && <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-2xl">{availabilityDays.map((day) => <button key={day.date} type="button" onClick={() => { setSelectedDate(day.date); setSelectedSlotKey(""); setDayMenuOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-right text-xs font-bold text-slate-200 hover:bg-slate-800"><span>{day.label}</span><span className="text-[10px] text-slate-500">{day.slots.length} موعد</span></button>)}</div>}
              </div>
              <div>
                <span className="mb-2 block text-[11px] font-bold text-slate-300">الوقت المتاح</span>
                <div className="flex min-h-[46px] gap-2 overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 p-1.5">
                  {!selectedDate ? <span className="m-auto px-2 text-[11px] text-slate-500">اختر اليوم أولًا</span> : (availabilityDays.find((day) => day.date === selectedDate)?.slots || []).map((slot) => <button key={slot.slotKey} type="button" onClick={() => setSelectedSlotKey(slot.slotKey)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-black ${selectedSlotKey === slot.slotKey ? "bg-[#986410] text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}>{slot.label}</button>)}
                </div>
              </div>
            </div>
            {availabilityError && <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-bold text-red-200">{availabilityError}</div>}
            {!availabilityLoading && !availabilityError && availabilityDays.length === 0 && <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-bold text-amber-100">لا توجد مواعيد متاحة حاليًا. تواصل مع المكتب أو حاول لاحقًا.</div>}
          </div>

          <div>
            <div className="flex justify-between gap-3 text-xs font-bold text-slate-300"><span>مستندات مساعدة <span className="text-slate-500">(اختياري)</span></span><span>{attachments.length} / 30</span></div>
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 p-5 text-center">
              <input type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png,.webp" className="hidden" disabled={preparing} onChange={(event) => void addFiles(event.target.files)} />
              {preparing ? <Loader2 className="h-5 w-5 animate-spin text-[#d9a84e]" /> : <Upload className="h-5 w-5 text-[#d9a84e]" />}
              <span className="mt-2 text-xs font-black">اختيار الملفات</span>
              <span className="mt-1 text-[10px] text-slate-400">PDF أو Word أو صور</span>
            </label>
            {attachments.length > 0 && <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto">{attachments.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-[10px]"><span className="max-w-40 truncate">{file.name}</span><button type="button" onClick={() => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X className="h-3 w-3 text-red-300" /></button></span>)}</div>}
          </div>

          {requiredAmount > 0 && <>
            <div className="rounded-xl border border-[#986410]/30 bg-[#986410]/10 p-4 text-xs leading-6 text-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{hasDepositSplit ? "العربون المطلوب الآن" : "المبلغ المطلوب"}</span>
                <strong className="text-base text-white">{requiredAmount.toLocaleString("ar-EG")} ج.م</strong>
              </div>
              <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">حوّل إلى رقم فودافون كاش:</span>
                {catalogLoading ? (
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-300"><Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري التحميل...</span>
                ) : cashNumber ? (
                  <b dir="ltr" className="font-mono text-base tracking-wider text-[#d9a84e] bg-black/40 px-2.5 py-0.5 rounded border border-[#986410]/30">{cashNumber}</b>
                ) : (
                  <span className="text-xs font-bold text-red-300">غير متاح مؤقتًا.</span>
                )}
              </div>
              {!catalogLoading && !cashNumber && (
                <p className="mt-2 text-[10px] leading-5 text-red-200">{catalogLoadError ? "تعذر تحميل بيانات الدفع حاليًا. حاول مرة أخرى أو تواصل مع الدعم الفني." : "بيانات الدفع غير متاحة حاليًا. تواصل مع الدعم الفني إذا استمرت المشكلة."}</p>
              )}
            </div>

            <label className={`block rounded-xl border border-dashed border-[#986410]/50 bg-[#986410]/10 p-4 text-center transition hover:bg-[#986410]/20 ${catalogLoading || !cashNumber ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
              <input type="file" accept="image/*,.pdf" className="hidden" disabled={catalogLoading || !cashNumber} onChange={(event) => void selectReceipt(event.target.files?.[0] || null)} />
              <Upload className="mx-auto h-5 w-5 text-[#d9a84e]" />
              <span className="mt-2 block text-xs font-black">{receipt?.name || `رفع إثبات دفع ${hasDepositSplit ? "عربون الاستشارة" : "الاستشارة"} — ${requiredAmount.toLocaleString("ar-EG")} ج.م`}</span>
            </label>
          </>}

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</div>}
          <button type="button" disabled={submitting || preparing || catalogLoading || catalogLoadError || (consultationFee > 0 && !cashNumber)} onClick={() => void submit()} className="w-full rounded-xl bg-[#986410] py-3.5 text-sm font-black text-white disabled:opacity-60">{submitting ? "جاري رفع الملفات وإرسال الاستشارة..." : "إرسال الاستشارة للمكتب"}</button>
        </div>
      </div>
    </section>
  );
}
