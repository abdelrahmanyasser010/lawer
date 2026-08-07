"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Clock3, FileText, Loader2, Phone, Scale, Upload, Video, X } from "lucide-react";
import { apiRequest, ApiClientError } from "@/lib/apiClient";
import { compressMultipleFiles, compressUploadFile } from "@/lib/compression";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import type { CommunicationChannel } from "@/types/customer";

const channels: Array<{ key: CommunicationChannel; label: string; icon: typeof Building2 }> = [
  { key: "office", label: "في المكتب", icon: Building2 },
  { key: "zoom", label: "Zoom", icon: Video },
  { key: "whatsapp", label: "WhatsApp", icon: Phone },
];

export default function LegalConsultationCard() {
  const router = useRouter();
  const { catalog } = usePublicCatalog();
  const [requestType, setRequestType] = useState<"contract_review" | "consultation" | "contract_drafting">("contract_review");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");
  const [preferredAt, setPreferredAt] = useState("");
  const [phone, setPhone] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const serviceDeposit = requestType === "contract_review"
    ? catalog.services.contractReviewDepositEgp
    : requestType === "consultation"
      ? catalog.services.consultationDepositEgp
      : catalog.services.contractDraftingDepositEgp;
  const cashNumber = catalog.payment.vodafoneCashNumber;

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (attachments.length + selected.length > 30) {
      setError("الحد الأقصى 30 ملفًا لكل طلب.");
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
    if (!title.trim() || description.trim().length < 10) {
      setError("اكتب عنوانًا واضحًا وتفاصيل كافية عن الطلب.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("اكتب رقم الهاتف أو WhatsApp بصورة صحيحة.");
      return;
    }
    if (!cashNumber) {
      setError("رقم الدفع لم يتم ضبطه بعد من إدارة المكتب.");
      return;
    }
    if (!receipt) {
      setError("ارفع إثبات تحويل عربون فتح الطلب.");
      return;
    }
    if (requestType === "contract_review" && attachments.length === 0) {
      setError("ارفع العقد المراد مراجعته على الأقل.");
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

      const request = await apiRequest<{ id: number; serialNumber: string }>("/api/v1/service-requests", {
        method: "POST",
        body: JSON.stringify({
          requestType,
          title: title.trim(),
          description: description.trim(),
          communicationChannel: channel,
          preferredAt: preferredAt ? new Date(preferredAt).toISOString() : undefined,
          attachmentIds,
          paymentRequired: true,
          clientContactSnapshot: { phone: phone.trim() },
        }),
      });
      createdRequestId = request.id;

      const receiptBody = new FormData();
      receiptBody.append("file", receipt);
      const receiptAttachment = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body: receiptBody });
      await apiRequest("/api/v1/payments/receipts", {
        method: "POST",
        body: JSON.stringify({ serviceRequestId: request.id, amountEgp: serviceDeposit, senderPhone: phone, attachmentId: receiptAttachment.id }),
      });
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
      setError(caught instanceof Error ? caught.message : "تعذر إرسال الطلب الآن.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="consultation" className="mt-14 scroll-mt-24 overflow-hidden rounded-3xl border border-slate-800 bg-[#00102e] p-6 text-white shadow-2xl sm:p-9">
      <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#986410]/40 bg-[#986410]/10 px-3 py-1.5 text-xs font-black text-[#d9a84e]"><Scale className="h-4 w-4" /> خدمات المكتب القانونية</div>
          <h2 className="mt-5 text-2xl font-black">مراجعة عقد أو طلب استشارة</h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">ارفع مستنداتك وحدد طريقة التواصل. لا توجد محادثة داخل المنصة؛ يستخدم الحساب لمتابعة حالة الطلب والمواعيد وتنزيل التقارير والنسخ التي يتيحها المكتب.</p>
          <div className="mt-6 space-y-3 text-xs leading-6 text-slate-300">
            <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#d9a84e]" /> العقد المرفوع يمكن مراجعته وتعديله خارجيًا حتى لو لم يكن له قالب داخل المنصة.</div>
            <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> كل تقرير أو نسخة معدلة تظهر في حسابك مع الاحتفاظ بالنسخ السابقة.</div>
            <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" /> الموعد النهائي يُحدد بعد مراجعة الطلب والمستندات وإسناده للمحامي المناسب.</div>
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/60 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-300">نوع الخدمة
              <select value={requestType} onChange={(event) => setRequestType(event.target.value as typeof requestType)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white">
                <option value="contract_review">مراجعة عقد مرفوع</option>
                <option value="consultation">استشارة قانونية</option>
                <option value="contract_drafting">إعداد عقد مع محامٍ</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-300">عنوان الطلب
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: مراجعة عقد إيجار تجاري" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white" />
            </label>
          </div>

          <label className="block text-xs font-bold text-slate-300">تفاصيل الطلب
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="اشرح النقاط المهمة وما الذي تنتظره من المكتب." className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white" />
          </label>

          <div>
            <p className="text-xs font-bold text-slate-300">طريقة التواصل</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {channels.map((option) => {
                const Icon = option.icon;
                return <button key={option.key} type="button" onClick={() => setChannel(option.key)} className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[11px] font-black sm:flex-row sm:justify-center ${channel === option.key ? "border-[#986410] bg-[#986410]/15 text-[#d9a84e]" : "border-slate-700 bg-slate-900 text-slate-400"}`}><Icon className="h-4 w-4" /> {option.label}</button>;
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-300">رقم الهاتف أو WhatsApp
              <input value={phone} onChange={(event) => setPhone(event.target.value)} dir="ltr" placeholder="01XXXXXXXXX" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-left text-sm text-white" />
            </label>
            <label className="text-xs font-bold text-slate-300">موعد مفضل للتواصل
              <input type="datetime-local" value={preferredAt} onChange={(event) => setPreferredAt(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white" />
            </label>
          </div>

          <div>
            <div className="flex justify-between gap-3 text-xs font-bold text-slate-300"><span>المستندات</span><span>{attachments.length} / 30</span></div>
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 p-5 text-center">
              <input type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png,.webp" className="hidden" disabled={preparing} onChange={(event) => void addFiles(event.target.files)} />
              {preparing ? <Loader2 className="h-5 w-5 animate-spin text-[#d9a84e]" /> : <Upload className="h-5 w-5 text-[#d9a84e]" />}
              <span className="mt-2 text-xs font-black">اختيار الملفات</span>
              <span className="mt-1 text-[10px] text-slate-400">PDF أو Word أو صور</span>
            </label>
            {attachments.length > 0 && <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto">{attachments.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-[10px]"><span className="max-w-40 truncate">{file.name}</span><button type="button" onClick={() => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X className="h-3 w-3 text-red-300" /></button></span>)}</div>}
          </div>

          <div className="rounded-xl border border-[#986410]/30 bg-[#986410]/10 p-4 text-xs leading-6 text-slate-200">
            <span className="block text-slate-400">عربون فتح الطلب</span>
            <strong className="text-base text-white">{serviceDeposit} ج.م</strong>
            <span className="mt-2 block">رقم Vodafone Cash: <b dir="ltr" className="font-mono text-[#d9a84e]">{cashNumber || "غير محدد بعد"}</b></span>
          </div>

          <label className="block cursor-pointer rounded-xl border border-dashed border-[#986410]/50 bg-[#986410]/10 p-4 text-center">
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(event) => void selectReceipt(event.target.files?.[0] || null)} />
            <Upload className="mx-auto h-5 w-5 text-[#d9a84e]" />
            <span className="mt-2 block text-xs font-black">{receipt?.name || `رفع إثبات تحويل العربون — ${serviceDeposit} ج.م`}</span>
          </label>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</div>}
          <button type="button" disabled={submitting || preparing || !cashNumber} onClick={() => void submit()} className="w-full rounded-xl bg-[#986410] py-3.5 text-sm font-black text-white disabled:opacity-60">{submitting ? "جاري رفع الملفات وإرسال الطلب..." : "إرسال الطلب للمكتب"}</button>
        </div>
      </div>
    </section>
  );
}
