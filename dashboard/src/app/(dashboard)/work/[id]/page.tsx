"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarPlus, Download, Upload as FileUp, Link2, MessageSquareText, RefreshCw, Save, UserRoundCheck } from "lucide-react";
import { dashboardApiUrl, dashboardRequest } from "@/lib/apiClient";
import { getCurrentStaff } from "@/lib/adminAccess";
import { dashboardFeatures } from "@/config/dashboardFeatures";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { AdminDialog } from "@/components/admin/AdminDialog";
import CustomerContactActions from "@/components/admin/CustomerContactActions";
import { DateTimePickerInput } from "@/components/ui/DateTimePickerInput";

const statusLabels: Record<string,string> = {
  new: "جديد", awaiting_payment: "بانتظار الدفع", assigned: "قيد المتابعة", awaiting_client_info: "بانتظار بيانات العميل",
  meeting_scheduled: "موعد محدد", in_progress: "قيد التنفيذ", client_review: "مراجعة العميل", revision_requested: "تعديل مطلوب", completed: "مكتمل", cancelled: "ملغي",
};
const eventLabels: Record<string,string> = {
  request_created: "تم استلام الطلب", status_changed: "تحديث الحالة", meeting_scheduled: "تم تحديد موعد", client_update: "تحديث للعميل",
  client_files_added: "رفع العميل مستندات", deliverable_published: "إتاحة ملف للعميل", contract_linked: "ربط عقد بالطلب", assigned: "تحديث المسؤول",
  revision_requested: "طلب تعديل", receipt_confirmed: "تأكيد الاستلام",
};
const channelLabels: Record<string,string> = { zoom: "Zoom", whatsapp: "واتساب" };


type Staff = { id: number; name: string; status: string };
type AvailabilitySlot = { slotKey: string; start: string; end: string; label: string; remaining: number; limited?: boolean };
type AvailabilityDay = { date: string; label: string; slots: AvailabilitySlot[] };
type AvailabilityResponse = { timezone: string; days: AvailabilityDay[] };
type FileRow = { id?: number; attachmentId?: number; fileName: string; fileType: string; sizeBytes: number; createdAt?: string; publishedAt?: string; title?: string; type?: string; versionNumber?: number; isFinal?: boolean; notes?: string };
type Details = {
  id: number; serialNumber: string; requestType: string; title: string; status: string; priority: string; description: string;
  requestPurpose?: "review"|"consultation"|null; contractTypeText?: string|null; selectedContractTypeName?: string|null;
  customerFacingStatus?: string|null; deliveryStatus?: string|null; nextCustomerAction?: {label:string}|null;
  selfServiceLawyerReview?: { enabled:boolean; priceEgp?:number|null; customerNote?:string|null; issuanceBlocked?:boolean }|null;
  templateSlug?: string | null; communicationChannel?: string | null; preferredContactAt?: string | null; meetingAt?: string | null;
  meetingProvider?: string | null; meetingUrl?: string | null; meetingLocation?: string | null; dueAt?: string | null;
  assignedLawyerId?: number | null; assignedLawyerName?: string | null; clientUserId?: number | null; clientName?: string | null;
  clientPhone?: string | null; clientWhatsappNumber?: string | null; clientWhatsappConsentAt?: string | null; linkedContractId?: number | null; linkedContractSerial?: string | null;
  linkedContractTitle?: string | null; paymentStatus?: string | null; paymentAmountEgp?: number | null; paymentAdminNotes?: string | null;
  variantKey?: string | null; expectedPaymentEgp?: number; lawyerTotalPriceEgp?: number | null; lawyerDepositEgp?: number | null;
  lawyerRemainingEgp?: number | null; serviceTotalPriceEgp?: number | null; serviceDepositEgp?: number | null; serviceRemainingEgp?: number | null; approvedPaidEgp?: number; outstandingEgp?: number; paymentStage?: string | null; allowedStatusTransitions?: string[];
  createdAt: string; updatedAt: string;
  events: Array<{ id: number; eventType: string; notes?: string | null; payload?: Record<string, unknown>; createdAt: string }>;
  attachments: FileRow[]; deliverables: FileRow[];
};

export default function WorkRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const current = getCurrentStaff();
  const canAssign = dashboardFeatures.assignment && (current.role === "super_admin" || current.permissions.includes("requests.assign"));
  const canManage = current.role === "super_admin" || current.permissions.includes("requests.manage");
  const canSchedule = current.role === "super_admin" || current.permissions.includes("consultations.manage");
  const [data, setData] = useState<Details | null>(null);
  const [lawyers, setLawyers] = useState<Staff[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusDialog, setStatusDialog] = useState<{ status:string; notes:string; visibleToClient:boolean } | null>(null);
  const [meetingProvider, setMeetingProvider] = useState<"zoom"|"whatsapp">("zoom");
  const [meetingDays, setMeetingDays] = useState<AvailabilityDay[]>([]);
  const [selectedMeetingDay, setSelectedMeetingDay] = useState("");
  const [selectedMeetingStart, setSelectedMeetingStart] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [details, team] = await Promise.all([
        dashboardRequest<Details>(`/api/v1/service-requests/${id}`),
        canAssign ? dashboardRequest<Staff[]>("/api/v1/admin/team/assignable-lawyers") : Promise.resolve([]),
      ]);
      setData(details);
      setLawyers(team);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل الطلب");
    }
  }, [id, canAssign]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!data) return;
    const provider = data.meetingProvider === "whatsapp" || data.communicationChannel === "whatsapp" ? "whatsapp" : "zoom";
    setMeetingProvider(provider);
  }, [data?.id, data?.meetingProvider, data?.communicationChannel]);
  useEffect(() => {
    if (!data || data.requestType !== "contract_review" || !canSchedule) {
      setMeetingDays([]); setSelectedMeetingDay(""); setSelectedMeetingStart(""); setAvailabilityError("");
      return;
    }
    let cancelled = false;
    setAvailabilityLoading(true); setAvailabilityError("");
    dashboardRequest<AvailabilityResponse>(`/api/v1/admin/service-requests/${id}/availability?channel=${meetingProvider}`)
      .then((response) => {
        if (cancelled) return;
        setMeetingDays(response.days);
        const preferred = data.meetingAt || data.preferredContactAt || "";
        const preferredMs = preferred ? new Date(preferred).getTime() : Number.NaN;
        let chosenDay = response.days[0]?.date ?? "";
        let chosenStart = response.days[0]?.slots[0]?.start ?? "";
        if (!Number.isNaN(preferredMs)) {
          for (const day of response.days) {
            const match = day.slots.find((slot) => new Date(slot.start).getTime() === preferredMs);
            if (match) { chosenDay = day.date; chosenStart = match.start; break; }
          }
        }
        setSelectedMeetingDay(chosenDay);
        setSelectedMeetingStart(chosenStart);
      })
      .catch((caught) => { if (!cancelled) { setMeetingDays([]); setSelectedMeetingDay(""); setSelectedMeetingStart(""); setAvailabilityError(caught instanceof Error ? caught.message : "تعذر تحميل المواعيد المتاحة"); } })
      .finally(() => { if (!cancelled) setAvailabilityLoading(false); });
    return () => { cancelled = true; };
  }, [canSchedule, data?.id, data?.meetingAt, data?.preferredContactAt, data?.requestType, id, meetingProvider]);
  const activeLawyers = useMemo(() => lawyers.filter((item) => item.status !== "suspended"), [lawyers]);
  const selectedMeetingDayData = useMemo(() => meetingDays.find((day) => day.date === selectedMeetingDay) ?? null, [meetingDays, selectedMeetingDay]);
  const allowedTransitions = useMemo(() => (data?.allowedStatusTransitions || []).filter((status) => dashboardFeatures.assignment || status !== "assigned"), [data?.allowedStatusTransitions]);
  const requestClosed = Boolean(data && ["completed","cancelled"].includes(data.status));
  const meetingSupported = Boolean(data && data.requestType === "contract_review");
  const meetingAllowed = Boolean(data && meetingSupported && !["awaiting_payment","completed","cancelled"].includes(data.status));
  const deliverableAllowed = Boolean(data && ["in_progress","revision_requested","client_review"].includes(data.status));
  const linkContractAllowed = Boolean(data && data.requestType === "contract_drafting" && ["new","assigned","in_progress"].includes(data.status));

  async function action(path: string, body: Record<string, unknown>, message: string): Promise<boolean> {
    setBusy(true); setError(""); setNotice("");
    try { await dashboardRequest(`/api/v1/admin/service-requests/${id}${path}`, { method: "POST", body: JSON.stringify(body) }); setNotice(message); await load(); return true; }
    catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر تنفيذ الإجراء"); return false; }
    finally { setBusy(false); }
  }

  async function assign(lawyerId: number) { await action("/assign", { lawyerId }, "تم إسناد الطلب."); }
  async function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!statusDialog) return;
    const paidState = Boolean(data && ["paid","approved","admin_recorded","partially_paid"].includes(data.paymentStatus || ""));
    if (statusDialog.status === "cancelled" && paidState && !statusDialog.notes.trim()) { setError("اكتب سبب الإلغاء للطلب المدفوع قبل الحفظ."); return; }
    const done = await action("/status", { status: statusDialog.status, notes: statusDialog.notes.trim() || undefined, visibleToClient: statusDialog.visibleToClient }, "تم تحديث حالة الطلب.");
    if (done) setStatusDialog(null);
  }
  async function addClientUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const note = String(values.get("note") || "").trim();
    if (!note) return; await action("/client-update", { note }, "تم نشر التحديث في حساب العميل."); form.reset();
  }
  async function scheduleMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    let scheduledAt = "";
    if (data && data.requestType === "contract_review") {
      scheduledAt = selectedMeetingStart;
      if (!scheduledAt) { setError("اختر موعدًا متاحًا من جدول المكتب"); return; }
    } else {
      const rawScheduledAt = String(values.get("scheduledAt") || "");
      const parsedScheduledAt = new Date(rawScheduledAt);
      if (!rawScheduledAt || Number.isNaN(parsedScheduledAt.getTime())) { setError("موعد التواصل غير صالح"); return; }
      scheduledAt = parsedScheduledAt.toISOString();
    }
    const meetingUrl = meetingProvider === "zoom" ? String(values.get("meetingUrl") || "").trim() : "";
    if (meetingProvider === "zoom" && !meetingUrl) { setError("رابط Zoom مطلوب"); return; }
    await action("/meeting", { provider: meetingProvider, scheduledAt, meetingUrl: meetingUrl || undefined }, "تم تحديد الموعد وإشعار العميل.");
  }
  async function linkContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const contractId = Number(new FormData(form).get("contractId"));
    if (!Number.isInteger(contractId)) return; await action("/link-contract", { contractId }, "تم ربط العقد بالطلب."); form.reset();
  }
  async function publishDeliverable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const file = values.get("file");
    if (!(file instanceof File) || file.size === 0) { setError("اختر الملف الناتج أولًا"); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const upload = new FormData(); upload.set("file", file);
      const attachment = await dashboardRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body: upload });
      await dashboardRequest(`/api/v1/admin/service-requests/${id}/deliverables`, { method: "POST", body: JSON.stringify({ attachmentId: attachment.id, type: values.get("type"), title: values.get("title"), notes: values.get("notes") || undefined, isFinal: values.get("isFinal") === "on" }) });
      setNotice("تم رفع الملف وإتاحته للعميل."); form.reset(); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر رفع الملف الناتج"); }
    finally { setBusy(false); }
  }

  if (error && !data) return <div className="p-8"><PageError message={error} onRetry={load} /></div>;
  if (!data) return <div className="p-8"><PageLoading /></div>;

  const requestPurposeLabel = data.requestType === "contract_review" ? (data.requestPurpose === "consultation" ? "استشارة" : "مراجعة") : null;
  const contractTypeLabel = data.requestType === "contract_review" ? data.contractTypeText : data.selectedContractTypeName;
  const serviceLabel = data.requestType === "contract_drafting" ? "صياغة بواسطة محامي" : data.requestType === "contract_review" ? "مراجعة / استشارة بخصوص عقد" : data.requestType === "self_service_lawyer_review" ? "مراجعة محامي قبل إصدار Self-Service" : "طلب خدمة";

  return <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start">
      <div><Link href="/work" className="inline-flex items-center gap-1 text-xs font-black text-slate-500"><ArrowRight className="h-3.5 w-3.5" />العودة لقائمة العمل</Link><div className="mt-3 flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-slate-500">{data.serialNumber}</span><StatusBadge value={data.status} />{requestPurposeLabel&&<span className={`rounded-full px-2.5 py-1 text-xs font-black ${requestPurposeLabel==="استشارة"?"bg-blue-50 text-blue-700":"bg-amber-50 text-amber-800"}`}>{requestPurposeLabel}</span>}{data.priority === "high" && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">عاجل</span>}</div><h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#00102e]">{data.title}</h1><p className="mt-1 text-xs font-black text-[#986410]">{serviceLabel}{contractTypeLabel?` · ${contractTypeLabel}`:""}</p><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{data.description || "لا توجد تفاصيل إضافية."}</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => void load()} aria-label="تحديث الطلب" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"><RefreshCw className="h-4 w-4" /></button>{canAssign && <select aria-label="المحامي المسؤول عن الطلب" disabled={busy} value={data.assignedLawyerId ?? ""} onChange={(event) => event.target.value && void assign(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black"><option value="">اختيار المسؤول</option>{activeLawyers.map((lawyer) => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}</select>}{canManage && allowedTransitions.length > 0 && <button type="button" disabled={busy} onClick={() => setStatusDialog({ status: allowedTransitions[0], notes: "", visibleToClient: true })} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-[#00102e]">تحديث الحالة</button>}</div>
    </header>

    {error && <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
    {notice && <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{notice}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs font-black text-slate-500">العميل</div><div className="mt-2 text-sm font-black text-[#00102e]">{data.clientName || "—"}</div><div className="mt-3"><CustomerContactActions phone={data.clientPhone} whatsapp={data.clientWhatsappNumber} whatsappAllowed={Boolean(data.clientWhatsappConsentAt)} compact /></div></div>
      <Card label="نوع الخدمة" value={serviceLabel} note={requestPurposeLabel ? `الغرض: ${requestPurposeLabel}` : (contractTypeLabel ? `نوع العقد: ${contractTypeLabel}` : "—")} />
      {dashboardFeatures.assignment ? <Card label="المحامي المسؤول" value={data.assignedLawyerName || "غير محدد"} note={channelLabels[data.communicationChannel || ""] || "طريقة التواصل غير محددة"} /> : <Card label="متابعة الطلب" value="السوبر أدمن" note={channelLabels[data.communicationChannel || ""] || "طريقة التواصل غير محددة"} />}
      <Card label="الحالة عند العميل" value={data.customerFacingStatus || statusLabels[data.status] || data.status} note={`الحالة الداخلية: ${statusLabels[data.status] || data.status}`} />
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card label="نوع العقد" value={contractTypeLabel || "غير محدد"} note={data.requestType === "contract_review" ? "كما أدخله العميل" : "من نوع العقد المختار"} />
      {data.serviceTotalPriceEgp != null && Number(data.serviceTotalPriceEgp) > 0
        ? <FinancialCard total={Number(data.serviceTotalPriceEgp)} deposit={Number(data.serviceDepositEgp ?? data.lawyerDepositEgp ?? 0)} paid={Number(data.approvedPaidEgp ?? 0)} remaining={Number(data.outstandingEgp ?? data.serviceRemainingEgp ?? data.lawyerRemainingEgp ?? 0)} status={data.paymentStatus || undefined} />
        : <Card label="الدفع" value={data.paymentStatus || "لا توجد عملية"} note={data.paymentAmountEgp ? `${Number(data.paymentAmountEgp).toLocaleString("ar-EG")} ج.م` : "—"} status={data.paymentStatus || undefined} />}
      <Card label="المطلوب من العميل" value={data.nextCustomerAction?.label || "لا يوجد إجراء مطلوب"} note={data.deliveryStatus ? `التسليم: ${data.deliveryStatus}` : "—"} />
      <Card label="الموعد" value={data.meetingAt ? new Date(data.meetingAt).toLocaleString("ar-EG") : "غير محدد"} note={channelLabels[data.meetingProvider || ""] || "—"} />
    </div>

    {data.requestType === "self_service_lawyer_review" && data.selfServiceLawyerReview && <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="text-xs font-black text-amber-800">مراجعة محامي قبل إصدار Self-Service</div><h2 className="mt-1 font-black text-[#00102e]">Add-on مرتبط بالعقد وليس مراجعة عقد خارجي</h2><p className="mt-2 text-xs leading-6 text-slate-600">{data.selfServiceLawyerReview.customerNote || "لا توجد ملاحظة خاصة من العميل."}</p></div><div className="rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-700"><div>سعر الإضافة: {Number(data.selfServiceLawyerReview.priceEgp || 0).toLocaleString("ar-EG")} ج.م</div><div className="mt-1 text-amber-800">{data.selfServiceLawyerReview.issuanceBlocked ? "الإصدار متوقف لحين انتهاء المراجعة" : "الإصدار غير متوقف"}</div></div></div></section>}

    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-black text-[#00102e]">الخط الزمني</h2><div className="mt-5 space-y-4">{data.events.map((event, index) => <div key={event.id} className="relative pr-8"><span className="absolute right-0 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#00102e] text-xs font-black text-[#d7a94f]">{index + 1}</span>{index < data.events.length - 1 && <span className="absolute right-[9px] top-6 h-[calc(100%+8px)] w-px bg-slate-200" />}<div className="rounded-xl bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-xs text-[#986410]">{eventLabels[event.eventType] || "تحديث على الطلب"}</b><span className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString("ar-EG")}</span></div><p className="mt-2 text-xs leading-6 text-slate-600">{event.notes || "تم تحديث الطلب"}</p></div></div>)}{data.events.length === 0 && <Empty />}</div></section>

      <div className="space-y-5">
        {canManage && !requestClosed && <form onSubmit={addClientUpdate} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-[#986410]" /><div><h2 className="font-black text-[#00102e]">تحديث مختصر يظهر للعميل</h2><p className="mt-1 text-xs text-slate-500">للتحديثات المرتبطة بالحالة فقط. جمع التفاصيل والتعديلات يتم عبر قناة التواصل المعتمدة مثل واتساب.</p></div></div><textarea aria-label="ملاحظة للعميل" name="note" required maxLength={2000} placeholder="مثال: تم الانتهاء من مراجعة الطلب وسيظهر لك التحديث التالي قريبًا." className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-xs" /><button disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d7a94f]"><Save className="h-4 w-4" />نشر التحديث</button></form>}
        {canSchedule && meetingAllowed && <form onSubmit={scheduleMeeting} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><CalendarPlus className="h-4 w-4 text-[#986410]" /><div><h2 className="font-black text-[#00102e]">تحديد موعد التواصل</h2><p className="mt-1 text-xs text-slate-500">مناقشة مراجعة العقد تستخدم المواعيد المتاحة في جدول المكتب وتراعي السعة والحظر.</p></div></div>
          <div className="mt-4 grid gap-3">
            <div><span className="mb-2 block text-xs font-black text-slate-500">طريقة التواصل</span><div className="grid grid-cols-2 gap-2">{(["zoom","whatsapp"] as const).map(provider=><button key={provider} type="button" onClick={()=>setMeetingProvider(provider)} className={`rounded-xl border p-3 text-xs font-black ${meetingProvider===provider?"border-[#986410] bg-[#986410]/10 text-[#986410]":"border-slate-200 text-slate-600"}`}>{provider==="zoom"?"Zoom":"واتساب"}</button>)}</div></div>
            {meetingSupported ? <>
              {availabilityLoading ? <div className="rounded-xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-500">جاري تحميل المواعيد المتاحة...</div> : availabilityError ? <div className="rounded-xl bg-red-50 p-4 text-xs font-bold text-red-700">{availabilityError}</div> : meetingDays.length === 0 ? <div className="rounded-xl bg-amber-50 p-4 text-xs font-bold text-amber-800">لا توجد مواعيد متاحة لهذه القناة خلال الفترة القادمة. راجع جدول مواعيد مراجعة العقود في الإعدادات.</div> : <>
                <label><span className="mb-2 block text-xs font-black text-slate-500">اليوم</span><select value={selectedMeetingDay} onChange={(event)=>{ const day=event.target.value; setSelectedMeetingDay(day); setSelectedMeetingStart(meetingDays.find((item)=>item.date===day)?.slots[0]?.start ?? ""); }} className="w-full rounded-xl border border-slate-200 p-3 text-xs">{meetingDays.map((day)=><option key={day.date} value={day.date}>{day.label}</option>)}</select></label>
                <div><span className="mb-2 block text-xs font-black text-slate-500">الموعد المتاح</span><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{selectedMeetingDayData?.slots.map((slot)=><button key={slot.slotKey} type="button" onClick={()=>setSelectedMeetingStart(slot.start)} className={`rounded-xl border p-3 text-xs font-black ${selectedMeetingStart===slot.start?"border-[#986410] bg-[#986410]/10 text-[#986410]":"border-slate-200 text-slate-600"}`}><span className="block">{slot.label}</span><span className="mt-1 block text-xs font-bold text-slate-500">متبقي {slot.remaining}</span></button>)}</div></div>
              </>}
            </> : <div><span className="mb-2 block text-xs font-black text-slate-500">التاريخ والوقت</span><DateTimePickerInput name="scheduledAt" required className="py-2.5" /></div>}
            {meetingProvider==="zoom"&&<label><span className="mb-2 block text-xs font-black text-slate-500">رابط Zoom</span><input name="meetingUrl" type="url" required defaultValue={data.meetingProvider === "zoom" ? data.meetingUrl ?? "" : ""} placeholder="https://zoom.us/j/..." className="w-full rounded-xl border border-slate-200 p-3 text-xs" /></label>}
          </div>
          <button disabled={busy || (meetingSupported && (!selectedMeetingStart || availabilityLoading))} className="mt-4 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d7a94f] disabled:cursor-not-allowed disabled:opacity-50">حفظ الموعد وإشعار العميل</button>
        </form>}
      </div>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <FilePanel title="مستندات العميل" rows={data.attachments} />
      <FilePanel title="الملفات المسلّمة للعميل" rows={data.deliverables} deliverables />
    </div>

    {canManage && (deliverableAllowed || linkContractAllowed) && <div className="grid gap-5 lg:grid-cols-2">
      {deliverableAllowed && <form onSubmit={publishDeliverable} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-2"><FileUp className="h-5 w-5 text-[#986410]" /><div><h2 className="font-black text-[#00102e]">رفع نسخة أو تقرير للعميل</h2><p className="text-xs text-slate-500">كل رفع ينشئ إصدارًا جديدًا ولا يستبدل الملفات القديمة.</p></div></div><div className="mt-5 grid gap-3"><input aria-label="عنوان الملف" name="title" required placeholder="عنوان الملف" className="rounded-xl border border-slate-200 p-3 text-xs" /><select aria-label="نوع الملف" name="type" required className="rounded-xl border border-slate-200 p-3 text-xs"><option value="draft">مسودة حالية</option><option value="review_report">تقرير مراجعة</option><option value="revised_document">نسخة معدلة</option><option value="final_document">نسخة نهائية</option><option value="supporting_document">مستند داعم</option></select><input aria-label="اختيار الملف" name="file" type="file" required accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="rounded-xl border border-slate-200 p-3 text-xs" /><textarea aria-label="ملاحظات الملف للعميل" name="notes" placeholder="ملاحظات تظهر للعميل" className="min-h-24 rounded-xl border border-slate-200 p-3 text-xs" /><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input name="isFinal" type="checkbox" />اعتبارها النسخة النهائية</label></div><button disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d7a94f]"><FileUp className="h-4 w-4" />رفع وإتاحة الملف</button></form>}
      {linkContractAllowed && <form onSubmit={linkContract} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-2"><Link2 className="h-5 w-5 text-[#986410]" /><div><h2 className="font-black text-[#00102e]">ربط عقد بهذا الطلب</h2><p className="text-xs text-slate-500">اربط الطلب بعقد موجود، أو أنشئ عقدًا جديدًا من صفحة العقود ثم اربطه بهذا الطلب.</p></div></div>{data.linkedContractId ? <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800"><div>{data.linkedContractTitle || "عقد مرتبط"}</div><div className="mt-1 font-mono text-xs">{data.linkedContractSerial}</div><Link href={`/contracts/${data.linkedContractId}`} className="mt-3 inline-block text-blue-700">فتح العقد</Link></div> : <><input aria-label="رقم العقد الداخلي" name="contractId" type="text" inputMode="numeric" pattern="[0-9]+" required placeholder="رقم العقد الداخلي" className="mt-5 w-full rounded-xl border border-slate-200 p-3 text-xs" /><button disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d7a94f]"><Link2 className="h-4 w-4" />ربط العقد</button></>}</form>}
    </div>}
    <AdminDialog open={Boolean(statusDialog)} title="تحديث حالة الطلب" description="اختر الحالة الجديدة وأضف ملاحظة عند الحاجة. يمكنك إبقاء الملاحظة داخلية أو إظهارها للعميل." onClose={() => !busy && setStatusDialog(null)}>
      {statusDialog && <form onSubmit={submitStatus} className="space-y-4">
        <label className="block"><span className="mb-2 block text-xs font-black text-slate-600">الحالة</span><select value={statusDialog.status} onChange={(event) => setStatusDialog({ ...statusDialog, status: event.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm">{allowedTransitions.map((status) => <option key={status} value={status}>{statusLabels[status] ?? status}</option>)}</select></label>
        <label className="block"><span className="mb-2 block text-xs font-black text-slate-600">ملاحظة {statusDialog.status==="cancelled"&&["paid","approved","admin_recorded","partially_paid"].includes(data.paymentStatus||"")?"— مطلوبة للإلغاء بعد الدفع":""}</span><textarea value={statusDialog.notes} onChange={(event) => setStatusDialog({ ...statusDialog, notes: event.target.value })} maxLength={2000} placeholder="مثال: تم تحديث الطلب وسيتم التواصل معك عبر القناة المعتمدة عند الحاجة." className="min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm" /></label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-xs font-bold text-slate-700"><input type="checkbox" checked={statusDialog.visibleToClient} onChange={(event) => setStatusDialog({ ...statusDialog, visibleToClient: event.target.checked })} className="h-4 w-4 accent-[#986410]" />إظهار الملاحظة للعميل وإرسال إشعار له</label>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setStatusDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black">إلغاء</button><button disabled={busy} className="rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-[#d7a94f]">{busy ? "جاري الحفظ..." : "حفظ التحديث"}</button></div>
      </form>}
    </AdminDialog>

  </div>;
}

function FinancialCard({ total, deposit, paid, remaining, status }: { total:number; deposit:number; paid:number; remaining:number; status?:string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><div className="text-xs font-black text-slate-500">الحساب المالي</div>{status && <StatusBadge value={status} />}</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><span className="text-slate-500">السعر الكامل</span><b className="block text-[#00102e]">{total.toLocaleString("ar-EG")} ج.م</b></div><div><span className="text-slate-500">العربون</span><b className="block text-[#986410]">{deposit.toLocaleString("ar-EG")} ج.م</b></div><div><span className="text-slate-500">المدفوع</span><b className="block text-emerald-700">{paid.toLocaleString("ar-EG")} ج.م</b></div><div><span className="text-slate-500">المتبقي</span><b className="block text-red-700">{remaining.toLocaleString("ar-EG")} ج.م</b></div></div></div>; }

function Card({ label, value, note, status }: { label: string; value: string; note: string; status?: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-black text-slate-500">{label}</div><div className="mt-2 font-black text-[#00102e]">{status ? <StatusBadge value={status} /> : value}</div><div className="mt-2 text-xs text-slate-500">{note}</div></div>; }
function FilePanel({ title, rows, deliverables = false }: { title: string; rows: FileRow[]; deliverables?: boolean }) { return <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-black text-[#00102e]">{title}</h2><div className="mt-4 space-y-3">{rows.map((row) => { const attachmentId = row.attachmentId ?? row.id; return <div key={`${attachmentId}-${row.versionNumber ?? 0}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="min-w-0"><div className="truncate text-xs font-black text-[#00102e]">{deliverables ? row.title || row.fileName : row.fileName}</div><div className="mt-1 text-xs text-slate-500">{deliverables && row.versionNumber ? `الإصدار ${row.versionNumber} · ` : ""}{Math.ceil(Number(row.sizeBytes || 0) / 1024)} KB{row.isFinal ? " · نهائي" : ""}</div></div>{attachmentId && <a href={dashboardApiUrl(`/api/v1/attachments/${attachmentId}/download`)} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white p-2 text-blue-700" title="تنزيل"><Download className="h-4 w-4" /></a>}</div>; })}{rows.length === 0 && <Empty />}</div></section>; }
function Empty() { return <div className="rounded-xl bg-slate-50 p-8 text-center text-xs font-bold text-slate-500"><UserRoundCheck className="mx-auto mb-2 h-5 w-5" />لا توجد بيانات.</div>; }
