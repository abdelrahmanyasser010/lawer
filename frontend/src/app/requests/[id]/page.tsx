"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  Scale,
  UserRound,
  Video,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GatewayCheckoutModal from "@/components/checkout/GatewayCheckoutModal";
import { apiRequest, apiUrl, ApiClientError, frontendApi } from "@/lib/apiClient";
import { communicationLabels, formatDate, formatFileSize, paymentStatusLabels } from "@/lib/labels";
import type { PaymentLineItem, ServiceRequestDetails } from "@/types/customer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

const terminalStatuses = new Set(["completed", "cancelled"]);

function paymentDue(item: ServiceRequestDetails) {
  if (item.paymentStage === "deposit") {
    return Number(item.serviceDepositEgp ?? item.lawyerDepositEgp ?? item.paymentAmountEgp ?? 0);
  }
  if (item.paymentStage === "balance") {
    return Number(item.serviceRemainingEgp ?? item.lawyerRemainingEgp ?? item.outstandingEgp ?? item.paymentAmountEgp ?? 0);
  }
  return Number(item.outstandingEgp ?? item.expectedPaymentEgp ?? item.paymentAmountEgp ?? 0);
}

function serviceName(item: ServiceRequestDetails) {
  if (item.requestType === "contract_drafting") return "صياغة بواسطة محامي";
  return item.requestPurpose === "consultation" ? "استشارة بخصوص عقد" : "مراجعة عقد";
}

function customerEventLabel(eventType: string, notes?: string | null) {
  if (notes?.trim()) return notes.trim();
  const labels: Record<string, string> = {
    request_created: "تم استلام طلبك",
    payment_confirmed: "تم تأكيد الدفعة",
    lawyer_assigned: "تم تعيين المحامي المسؤول",
    lawyer_reassigned: "تم تحديث المحامي المسؤول",
    work_started: "المحامي بدأ العمل على طلبك",
    drafting_started: "المحامي بدأ إعداد العقد",
    review_started: "بدأت مراجعة العقد",
    consultation_started: "بدأت متابعة الاستشارة",
    draft_ready: "المسودة جاهزة لمراجعتك",
    remaining_payment_due: "المبلغ المتبقي مستحق",
    result_ready: "النتيجة جاهزة",
    final_ready: "النسخة النهائية جاهزة",
    delivered: "تم التسليم",
    completed: "تم الانتهاء من الطلب",
    cancelled: "تم إلغاء الطلب",
    refund_started: "جاري رد المبلغ",
    refund_completed: "تم رد المبلغ",
  };
  return labels[eventType] || "تم تحديث الطلب";
}

export default function RequestDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { catalog } = usePublicCatalog();
  const [item, setItem] = useState<ServiceRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);

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

  const due = item ? paymentDue(item) : 0;
  const canPay = Boolean(item && due > 0 && !["paid", "approved", "refunded"].includes(item.paymentStatus || "") && item.nextCustomerAction?.type === "pay");
  const lineItems = useMemo<PaymentLineItem[]>(() => {
    if (!item || due <= 0) return [];
    const label = item.paymentStage === "balance" ? "المبلغ المتبقي" : item.paymentStage === "deposit" ? "الدفعة الأولى" : "الدفعة المطلوبة";
    return [{ key: item.paymentStage || "payment", label, amountEgp: due }];
  }, [due, item]);

  async function cancelUnpaidRequest() {
    if (!item || Number(item.approvedPaidEgp || 0) > 0) return;
    if (!window.confirm("إلغاء الطلب قبل الدفع؟")) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/v1/service-requests/${item.id}/cancel`, { method: "POST", body: JSON.stringify({}) });
      setNotice("تم إلغاء الطلب.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إلغاء الطلب");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]"><Loader2 className="h-8 w-8 animate-spin text-[#986410]" /></div>;
  }

  if (!item) {
    return <main className="p-10 text-center font-bold text-red-700">{error || "الطلب غير موجود"}</main>;
  }

  const purposeLabel = serviceName(item);
  const officialWhatsapp = item.requestType === "contract_review"
    ? catalog.office.reviewWhatsappNumber || catalog.office.supportWhatsappNumber || catalog.office.whatsappNumber
    : catalog.office.supportWhatsappNumber || catalog.office.whatsappNumber;
  const whatsappDigits = officialWhatsapp.replace(/\D/g, "").replace(/^0/, "20");
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`مرحبًا، أتابع الطلب ${item.serialNumber}`)}`
    : "";
  const paymentTotal = Number(item.serviceTotalPriceEgp ?? item.lawyerTotalPriceEgp ?? item.expectedPaymentEgp ?? item.paymentAmountEgp ?? 0);
  const paid = Number(item.approvedPaidEgp ?? (item.paymentStatus === "paid" || item.paymentStatus === "approved" ? paymentTotal : 0));
  const remaining = Number(item.outstandingEgp ?? Math.max(0, paymentTotal - paid));
  const latestDeliverable = item.currentDeliverable || item.deliverables.at(-1) || null;
  const canCancel = Number(item.approvedPaidEgp || 0) === 0 && !terminalStatuses.has(item.status);
  const ContactIcon = item.communicationChannel === "zoom" ? Video : MessageCircle;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-right" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6">
        <Link href="/requests" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#00102e]"><ArrowRight className="h-3.5 w-3.5" /> العودة لطلبات الخدمات</Link>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
        {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{notice}</div>}

        <header className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black">
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-600">{item.serialNumber}</span>
                <span className="rounded-full bg-[#986410]/10 px-2.5 py-1 text-[#7c500c]">{purposeLabel}</span>
                {item.contractTypeText && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{item.contractTypeText}</span>}
              </div>
              <h1 className="mt-3 text-xl font-black text-[#00102e] sm:text-2xl">{item.title}</h1>
              <p className="mt-2 text-sm font-bold text-slate-600">{item.customerFacingStatus || "طلبك تحت المتابعة"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span className="block text-[10px] font-bold text-slate-400">آخر تحديث</span>
              <strong className="mt-1 block text-[#00102e]">{formatDate(item.updatedAt)}</strong>
            </div>
          </div>

          <div className={`mt-5 rounded-2xl border p-4 ${item.requiresCustomerAction ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <span className="text-[10px] font-black text-slate-500">المطلوب منك دلوقتي</span>
            {item.requiresCustomerAction && item.nextCustomerAction ? (
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-sm font-black text-[#00102e]">{item.nextCustomerAction.label}</strong>
                  {item.nextCustomerAction.description && <p className="mt-1 text-xs leading-6 text-slate-600">{item.nextCustomerAction.description}</p>}
                </div>
                {canPay ? (
                  <button type="button" onClick={() => setPaymentOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white"><CreditCard className="h-4 w-4 text-[#d9a84e]" /> {item.nextCustomerAction.label}</button>
                ) : item.nextCustomerAction.actionUrl ? (
                  <Link href={item.nextCustomerAction.actionUrl} className="rounded-xl bg-[#00102e] px-4 py-2.5 text-center text-xs font-black text-white">{item.nextCustomerAction.label}</Link>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-xs font-bold text-emerald-900">مفيش إجراء مطلوب منك حاليًا، هنبلغك أول ما يكون فيه تحديث.</p>
            )}
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-[#00102e]">تفاصيل طلبك</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="الخدمة" value={purposeLabel} />
                {item.contractTypeText && <Info label="نوع العقد" value={item.contractTypeText} />}
                {item.communicationChannel && <Info label="طريقة التواصل" value={communicationLabels[item.communicationChannel] || item.communicationChannel} />}
                {item.preferredContactAt && <Info label="الموعد المفضل" value={formatDate(item.preferredContactAt)} />}
              </div>
              {item.description && <div className="mt-4 rounded-2xl bg-slate-50 p-4"><span className="text-[10px] font-black text-slate-400">{item.requestPurpose === "consultation" ? "سؤالك / المشكلة" : item.requestType === "contract_review" ? "اللي حابب المحامي يركز عليه" : "محتاج العقد في إيه؟"}</span><p className="mt-1 text-xs leading-7 text-slate-700">{item.description}</p></div>}
            </section>

            {latestDeliverable && (
              <section id="deliverables" className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-[#00102e]">{latestDeliverable.type === "final" ? "النسخة النهائية" : "آخر مسودة"}</h2>
                    <p className="mt-1 text-xs text-slate-500">{latestDeliverable.title}</p>
                    {latestDeliverable.notes && <p className="mt-2 text-xs leading-6 text-slate-600">{latestDeliverable.notes}</p>}
                  </div>
                  {latestDeliverable.attachmentId && (
                    <a href={apiUrl(`/api/v1/attachments/${latestDeliverable.attachmentId}/download`)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white"><Download className="h-4 w-4" /> تنزيل</a>
                  )}
                </div>
                {item.requestType === "contract_drafting" && latestDeliverable.type !== "final" && whatsappUrl && (
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-900">
                    لو عندك تعديل على المسودة، كلم المحامي من خلال قناة التواصل المعتمدة. بعد الاتفاق هيتم رفع النسخة المحدثة هنا.
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#00102e] px-3 py-2 font-black text-white"><MessageCircle className="h-4 w-4" /> تواصل عبر WhatsApp</a>
                  </div>
                )}
              </section>
            )}

            {item.result && (item.result.text || item.result.file) && (
              <section id="result" className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
                <h2 className="text-sm font-black text-[#00102e]">نتيجة الخدمة</h2>
                {item.result.text && <p className="mt-3 text-xs leading-7 text-slate-700">{item.result.text}</p>}
                {item.result.file?.id && <a href={apiUrl(`/api/v1/attachments/${item.result.file.id}/download`)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white"><Download className="h-4 w-4" /> تحميل النتيجة</a>}
              </section>
            )}

            {item.attachments.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-black text-[#00102e]">الملفات المرتبطة بالطلب</h2>
                <div className="mt-3 space-y-2">
                  {item.attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="min-w-0"><p className="truncate text-xs font-black text-slate-800">{file.fileName}</p><p className="mt-1 text-[10px] text-slate-400">{formatFileSize(file.sizeBytes)}</p></div>
                      <a href={apiUrl(`/api/v1/attachments/${file.id}/download`)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600" title="تنزيل"><Download className="h-4 w-4" /></a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-[#00102e]">تطور الطلب</h2>
              <div className="mt-4 space-y-4 border-r-2 border-slate-100 pr-4">
                {item.events.length === 0 ? <p className="text-xs text-slate-500">لسه مفيش تحديثات إضافية.</p> : item.events.map((event) => (
                  <div key={event.id} className="relative"><span className="absolute -right-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#986410] ring-4 ring-white" /><p className="text-xs font-black text-slate-800">{customerEventLabel(event.eventType, event.notes)}</p><p className="mt-1 text-[10px] text-slate-400">{formatDate(event.createdAt)}</p></div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#986410]" /><h2 className="text-sm font-black text-[#00102e]">المحامي المسؤول</h2></div>
              {item.assignedLawyer ? (
                <div className="mt-4"><strong className="text-sm text-[#00102e]">{item.assignedLawyer.displayName}</strong>{item.assignedLawyer.specialization && <p className="mt-1 text-xs text-slate-500">{item.assignedLawyer.specialization}</p>}</div>
              ) : <p className="mt-3 text-xs font-bold text-slate-500">جاري تعيين محامي مناسب لطلبك.</p>}
              {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-800"><MessageCircle className="h-4 w-4" /> التواصل الرسمي عبر WhatsApp</a>}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#986410]" /><h2 className="text-sm font-black text-[#00102e]">الدفعات</h2></div>
              <div className="mt-4 space-y-2 text-xs">
                {paymentTotal > 0 && <Row label="إجمالي الخدمة" value={`${paymentTotal.toLocaleString("ar-EG")} ج.م`} />}
                <Row label="المدفوع" value={`${paid.toLocaleString("ar-EG")} ج.م`} />
                <Row label="المتبقي" value={`${remaining.toLocaleString("ar-EG")} ج.م`} strong={remaining > 0} />
                <Row label="حالة الدفع" value={paymentStatusLabels[item.paymentStatus || ""] || item.paymentStatus || (paid > 0 ? "تم تسجيل دفعة" : "لم يتم الدفع")} />
              </div>
              {canPay && <button type="button" onClick={() => setPaymentOpen(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white"><CreditCard className="h-4 w-4 text-[#d9a84e]" /> {item.nextCustomerAction?.label || "ادفع دلوقتي"}</button>}
            </section>

            {(item.meetingAt || item.preferredContactAt || item.communicationChannel) && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[#986410]" /><h2 className="text-sm font-black text-[#00102e]">التواصل والموعد</h2></div>
                <div className="mt-4 space-y-3 text-xs text-slate-600">
                  {item.communicationChannel && <div className="flex items-center gap-2"><ContactIcon className="h-4 w-4" /><span>{communicationLabels[item.communicationChannel] || item.communicationChannel}</span></div>}
                  {(item.meetingAt || item.preferredContactAt) && <div className="flex items-center gap-2"><Clock3 className="h-4 w-4" /><span>{formatDate(item.meetingAt || item.preferredContactAt)}</span></div>}
                  {item.meetingProvider === "zoom" && item.meetingUrl && <a href={item.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 font-black text-white"><Video className="h-4 w-4" /> فتح Zoom</a>}
                </div>
              </section>
            )}

            {canCancel && (
              <button type="button" disabled={busy} onClick={() => void cancelUnpaidRequest()} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">إلغاء الطلب</button>
            )}
          </aside>
        </div>
      </main>

      <Footer />

      <GatewayCheckoutModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        orderTitle={item.title}
        amountEgp={due}
        serviceRequestId={item.id}
        purpose={item.paymentStage === "balance" ? "service_balance" : "service_initial_payment"}
        lineItems={lineItems}
        metadata={{ requestType: item.requestType, requestPurpose: item.requestPurpose || undefined, paymentStage: item.paymentStage || undefined }}
        onPaid={() => { setPaymentOpen(false); setNotice("تم تأكيد الدفع بنجاح."); void load(); }}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><span className="text-[10px] font-black text-slate-400">{label}</span><strong className="mt-1 block text-xs text-[#00102e]">{value}</strong></div>;
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0"><span className="text-slate-500">{label}</span><strong className={strong ? "text-[#986410]" : "text-[#00102e]"}>{value}</strong></div>;
}
