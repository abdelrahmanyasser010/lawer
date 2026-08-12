"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, CreditCard, Phone, Scale, Upload, User, Video, X } from "lucide-react";
import type { ContractTemplate } from "@/types/zdraft";
import { useWizardStore } from "@/store/wizardStore";
import { apiRequest, ApiClientError } from "@/lib/apiClient";
import type { CommunicationChannel } from "@/types/customer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

interface Props {
  template: ContractTemplate | null;
  isOpen: boolean;
  onClose: () => void;
}

const channelOptions: Array<{ key: CommunicationChannel; label: string; icon: typeof Video }> = [
  { key: "zoom", label: "اجتماع عبر Zoom", icon: Video },
  { key: "whatsapp", label: "تواصل عبر WhatsApp", icon: Phone },
];

export default function CreationModeModal({ template: initialTemplate, isOpen, onClose }: Props) {
  const router = useRouter();
  const { catalog } = usePublicCatalog();
  const resetWizard = useWizardStore((state) => state.resetWizard);
  const [step, setStep] = useState<"select" | "lawyer" | "success">("select");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [createdRequestId, setCreatedRequestId] = useState<number | null>(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const draftingDeposit = catalog.services.contractDraftingDepositEgp;
  const cashNumber = catalog.payment.vodafoneCashNumber;
  const editHours = catalog.policies.selfServiceEditHours;
  const enabledChannels = useMemo(() => channelOptions.filter((option) => catalog.policies.communicationChannels.includes(option.key)), [catalog.policies.communicationChannels]);
  useEffect(() => { if (enabledChannels.length && !enabledChannels.some((option) => option.key === channel)) setChannel(enabledChannels[0].key); }, [channel, enabledChannels]);

  if (!isOpen || !initialTemplate) return null;
  const template = initialTemplate;

  function close() {
    setStep("select");
    setError("");
    setReference("");
    setCreatedRequestId(null);
    setPaymentSubmitted(false);
    onClose();
  }

  function startSelfService() {
    resetWizard(template.slug);
    onClose();
    router.push(`/wizard/${template.slug}?mode=self_service`);
  }

  async function submitLawyerRequest(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!fullName.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("اكتب الاسم ورقم الهاتف بصورة صحيحة.");
      return;
    }
    if (enabledChannels.length === 0) {
      setError("لا توجد قناة تواصل مفعلة حاليًا. تواصل مع المكتب أو حاول لاحقًا.");
      return;
    }
    if (draftingDeposit > 0 && !cashNumber) {
      setError("بيانات الدفع غير متاحة حاليًا من إدارة المكتب.");
      return;
    }
    if (draftingDeposit > 0 && !receipt) {
      setError("ارفع إثبات تحويل عربون الحجز أولًا.");
      return;
    }

    setSubmitting(true);
    try {
      let receiptAttachmentId: number | null = null;
      if (draftingDeposit > 0 && receipt) {
        const receiptBody = new FormData();
        receiptBody.append("file", receipt);
        const attachment = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body: receiptBody });
        receiptAttachmentId = attachment.id;
      }
      const request = await apiRequest<{ id: number; serialNumber: string }>("/api/v1/service-requests", {
        method: "POST",
        body: JSON.stringify({
          requestType: "contract_drafting",
          title: `إعداد ${template.nameAr} مع محامٍ`,
          description: notes.trim() || `أرغب في أن يتولى محامي المكتب إعداد ${template.nameAr}.`,
          communicationChannel: channel,
          templateSlug: template.slug,
          paymentRequired: draftingDeposit > 0,
          clientContactSnapshot: { fullName: fullName.trim(), phone: phone.trim() },
        }),
      });
      setReference(request.serialNumber);
      setCreatedRequestId(request.id);
      if (draftingDeposit > 0 && receiptAttachmentId) {
        try {
          await apiRequest("/api/v1/payments/receipts", {
            method: "POST",
            body: JSON.stringify({ serviceRequestId: request.id, amountEgp: draftingDeposit, senderPhone: phone, attachmentId: receiptAttachmentId }),
          });
          setPaymentSubmitted(true);
        } catch {
          setPaymentSubmitted(false);
        }
      } else {
        setPaymentSubmitted(true);
      }
      setStep("success");
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.push("/login?next=/#templates");
        close();
        return;
      }
      setError(caught instanceof Error ? caught.message : "تعذر إرسال الطلب الآن.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00102e]/85 p-4 backdrop-blur-sm" dir="rtl">
      <section className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 p-6 text-right shadow-2xl sm:p-8">
        <button type="button" onClick={close} aria-label="إغلاق" className="absolute left-5 top-5 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>

        {step === "select" && (
          <div>
            <p className="text-xs font-black text-[#d9a84e]">{template.nameAr}</p>
            <h2 className="mt-2 text-2xl font-black text-white">اختر طريقة إعداد العقد</h2>
            <p className="mt-2 text-sm leading-7 text-slate-400">يمكنك إدخال البيانات بنفسك، أو إرسال طلب للمكتب ليتولى محامٍ إعداد العقد بعد التواصل معك.</p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <button type="button" onClick={startSelfService} className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-5 text-right transition hover:border-blue-400">
                <div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-blue-500/15 p-3 text-blue-300"><CheckCircle2 className="h-5 w-5" /></div><span className="text-sm font-black text-blue-300">{template.priceEgp} ج.م</span></div>
                <h3 className="mt-5 text-lg font-black text-white">أُدخل البيانات بنفسي</h3>
                <p className="mt-2 text-xs leading-6 text-slate-300">استكمل خطوات العقد وراجِع البيانات قبل رفع إثبات الدفع. بعد اعتماد الدفع تتاح {editHours} ساعة لتعديل البيانات غير الأساسية.</p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-black text-blue-300">ابدأ الآن <ArrowLeft className="h-4 w-4" /></span>
              </button>

              <button type="button" onClick={() => setStep("lawyer")} className="rounded-2xl border border-[#986410]/50 bg-[#986410]/10 p-5 text-right transition hover:border-[#d9a84e]">
                <div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-[#986410]/15 p-3 text-[#d9a84e]"><Scale className="h-5 w-5" /></div><span className="text-xs font-black text-[#d9a84e]">{draftingDeposit > 0 ? `عربون ${draftingDeposit.toLocaleString("ar-EG")} ج.م` : "بدون عربون حاليًا"}</span></div>
                <h3 className="mt-5 text-lg font-black text-white">يتولى محامي المكتب الإعداد</h3>
                <p className="mt-2 text-xs leading-6 text-slate-300">اختر طريقة التواصل وارفع إثبات العربون. بعد مراجعة الدفع يبدأ المكتب تجهيز الطلب، وتظهر التحديثات والنسخ الجاهزة داخل حسابك.</p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-black text-[#d9a84e]">إرسال طلب للمكتب <ArrowLeft className="h-4 w-4" /></span>
              </button>
            </div>
          </div>
        )}

        {step === "lawyer" && (
          <form onSubmit={submitLawyerRequest} className="space-y-5">
            <button type="button" onClick={() => setStep("select")} className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><ArrowLeft className="h-4 w-4 rotate-180" /> العودة</button>
            <div>
              <h2 className="text-xl font-black text-white">طلب إعداد {template.nameAr}</h2>
              <p className="mt-2 text-xs leading-6 text-slate-400">لا توجد محادثات داخل المنصة. التواصل يكون بالطريقة التي تختارها، وتظهر المواعيد والمستندات والنسخ الناتجة داخل حسابك.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-300">الاسم الكامل
                <div className="relative mt-2"><User className="absolute right-3 top-3 h-4 w-4 text-slate-500" /><input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-3 pr-10 text-sm text-white outline-none focus:border-[#986410]" /></div>
              </label>
              <label className="text-xs font-bold text-slate-300">رقم WhatsApp
                <div className="relative mt-2"><Phone className="absolute right-3 top-3 h-4 w-4 text-slate-500" /><input value={phone} onChange={(event) => setPhone(event.target.value)} required dir="ltr" placeholder="01XXXXXXXXX" className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-3 pr-10 text-left text-sm text-white outline-none focus:border-[#986410]" /></div>
              </label>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-300">طريقة التواصل المفضلة</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {enabledChannels.map((option) => {
                  const Icon = option.icon;
                  return <button key={option.key} type="button" onClick={() => setChannel(option.key)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-black ${channel === option.key ? "border-[#986410] bg-[#986410]/15 text-[#d9a84e]" : "border-slate-700 bg-slate-900 text-slate-400"}`}><Icon className="h-4 w-4" /> {option.label}</button>;
                })}
              </div>
            </div>

            <label className="block text-xs font-bold text-slate-300">تفاصيل أو ملاحظات أولية
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="اكتب باختصار نوع التعامل وأي نقاط مهمة للمحامي." className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white outline-none focus:border-[#986410]" />
            </label>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-xs leading-6 text-slate-300">
              <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#d9a84e]" /> عربون الحجز</span><strong className="text-white">{draftingDeposit > 0 ? `${draftingDeposit.toLocaleString("ar-EG")} ج.م` : "غير مطلوب"}</strong></div>
              {draftingDeposit > 0 ? <><p className="mt-2">حوّل المبلغ إلى رقم Vodafone Cash التالي، ثم ارفع صورة أو PDF لإثبات التحويل. يتم تأكيد الطلب بعد مراجعة الإدارة.</p><div className="mt-3 rounded-xl border border-[#986410]/30 bg-slate-950 px-4 py-3 text-center font-mono text-base font-black text-[#d9a84e]" dir="ltr">{cashNumber || "غير محدد بعد"}</div></> : <p className="mt-2">يمكن إرسال طلب الصياغة بدون عربون وفق السعر الحالي المضبوط من المكتب.</p>}
            </div>

            {draftingDeposit > 0 && <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-600 bg-slate-900 p-5 text-center">
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(event) => setReceipt(event.target.files?.[0] || null)} />
              <Upload className="mx-auto h-6 w-6 text-[#d9a84e]" />
              <span className="mt-2 block text-xs font-black text-white">{receipt?.name || "رفع إثبات تحويل العربون"}</span>
            </label>}

            {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</div>}
            <button disabled={submitting || enabledChannels.length === 0 || (draftingDeposit > 0 && !cashNumber)} className="w-full rounded-xl bg-[#986410] py-3.5 text-sm font-black text-white disabled:opacity-60">{submitting ? "جاري إرسال الطلب..." : draftingDeposit > 0 ? "إرسال الطلب وإثبات الدفع" : "إرسال طلب الصياغة"}</button>
            {draftingDeposit > 0 && !cashNumber && <p className="text-center text-[10px] font-bold text-red-300">الخدمة متوقفة مؤقتًا حتى تضبط الإدارة بيانات الدفع.</p>}
          </form>
        )}

        {step === "success" && (
          <div className="py-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"><Check className="h-8 w-8" /></div>
            <h2 className="mt-5 text-xl font-black text-white">تم استلام الطلب</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">مرجع الطلب: <strong className="font-mono text-[#d9a84e]">{reference}</strong>. {paymentSubmitted ? "تم استلام إثبات الدفع ويمكنك متابعة مراجعته وتحديثات المكتب من حسابك." : "تم حفظ الطلب، لكن إثبات الدفع لم يكتمل. يمكنك رفعه من صفحة الطلب بدون إنشاء طلب جديد."}</p>
            <button type="button" onClick={() => { const target = createdRequestId ? `/requests/${createdRequestId}${paymentSubmitted ? "" : "?payment=retry"}` : "/requests"; close(); router.push(target); }} className="mt-6 rounded-xl bg-[#986410] px-6 py-3 text-sm font-black text-white">{paymentSubmitted ? "فتح الطلب" : "استكمال إثبات الدفع"}</button>
          </div>
        )}
      </section>
    </div>
  );
}
