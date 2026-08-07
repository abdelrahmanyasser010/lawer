"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarPlus, Download, Link2, MessageSquareText, RefreshCw, Save, Upload, UserRoundCheck } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { getCurrentStaff } from "@/lib/adminAccess";
import { dashboardFeatures } from "@/config/dashboardFeatures";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const statuses = ["new", "awaiting_payment", "assigned", "awaiting_client_info", "meeting_scheduled", "in_progress", "client_review", "revision_requested", "completed", "cancelled"];
const statusLabels: Record<string,string> = {
  new: "جديد", awaiting_payment: "بانتظار الدفع", assigned: "قيد المتابعة", awaiting_client_info: "بانتظار بيانات العميل",
  meeting_scheduled: "موعد محدد", in_progress: "قيد التنفيذ", client_review: "مراجعة العميل", revision_requested: "تعديل مطلوب", completed: "مكتمل", cancelled: "ملغي",
};


type Staff = { id: number; name: string; status: string };
type FileRow = { id?: number; attachmentId?: number; fileName: string; fileType: string; sizeBytes: number; createdAt?: string; publishedAt?: string; title?: string; type?: string; versionNumber?: number; isFinal?: boolean; notes?: string };
type Details = {
  id: number; serialNumber: string; requestType: string; title: string; status: string; priority: string; description: string;
  templateSlug?: string | null; communicationChannel?: string | null; preferredContactAt?: string | null; meetingAt?: string | null;
  meetingProvider?: string | null; meetingUrl?: string | null; meetingLocation?: string | null; dueAt?: string | null;
  assignedLawyerId?: number | null; assignedLawyerName?: string | null; clientUserId?: number | null; clientName?: string | null;
  clientPhone?: string | null; clientWhatsappNumber?: string | null; linkedContractId?: number | null; linkedContractSerial?: string | null;
  linkedContractTitle?: string | null; paymentStatus?: string | null; paymentAmountEgp?: number | null; paymentAdminNotes?: string | null;
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
  const activeLawyers = useMemo(() => lawyers.filter((item) => item.status !== "suspended"), [lawyers]);

  async function action(path: string, body: Record<string, unknown>, message: string) {
    setBusy(true); setError(""); setNotice("");
    try { await dashboardRequest(`/api/v1/admin/service-requests/${id}${path}`, { method: "POST", body: JSON.stringify(body) }); setNotice(message); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر تنفيذ الإجراء"); }
    finally { setBusy(false); }
  }

  async function assign(lawyerId: number) { await action("/assign", { lawyerId }, "تم إسناد الطلب."); }
  async function updateStatus(status: string) {
    const notes = window.prompt("ملاحظة التحديث للعميل (اتركها فارغة عند عدم الحاجة)") || undefined;
    await action("/status", { status, notes, visibleToClient: true }, "تم تحديث حالة الطلب.");
  }
  async function addClientUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const note = String(values.get("note") || "").trim();
    if (!note) return; await action("/client-update", { note }, "تم نشر التحديث في حساب العميل."); form.reset();
  }
  async function scheduleMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    const rawScheduledAt = String(values.get("scheduledAt") || "");
    const parsedScheduledAt = new Date(rawScheduledAt);
    if (!rawScheduledAt || Number.isNaN(parsedScheduledAt.getTime())) { setError("موعد التواصل غير صالح"); return; }
    await action("/meeting", { provider: values.get("provider"), scheduledAt: parsedScheduledAt.toISOString(), meetingUrl: values.get("meetingUrl") || undefined, meetingLocation: values.get("meetingLocation") || undefined }, "تم تحديد الموعد وإشعار العميل.");
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

  return <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start">
      <div><Link href="/work" className="inline-flex items-center gap-1 text-xs font-black text-slate-500"><ArrowRight className="h-3.5 w-3.5" />العودة لقائمة العمل</Link><div className="mt-3 flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] text-slate-400">{data.serialNumber}</span><StatusBadge value={data.status} />{data.priority === "high" && <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-700">عاجل</span>}</div><h1 className="mt-2 text-3xl font-black text-[#00102e]">{data.title}</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{data.description || "لا توجد تفاصيل إضافية."}</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white p-2.5"><RefreshCw className="h-4 w-4" /></button>{canAssign && <select disabled={busy} value={data.assignedLawyerId ?? ""} onChange={(event) => event.target.value && void assign(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black"><option value="">إسناد لمحامٍ</option>{activeLawyers.map((lawyer) => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}</select>}{canManage && <select disabled={busy} value={data.status} onChange={(event) => void updateStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black">{statuses.map((status) => <option key={status} value={status}>{statusLabels[status] ?? status}</option>)}</select>}</div>
    </header>

    {error && <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
    {notice && <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{notice}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card label="العميل" value={data.clientName || "—"} note={data.clientPhone || data.clientWhatsappNumber || "لا يوجد رقم"} />
      {dashboardFeatures.assignment ? <Card label="المحامي المسؤول" value={data.assignedLawyerName || "غير مسند"} note={data.communicationChannel || "طريقة التواصل غير محددة"} /> : <Card label="إدارة الطلب" value={current.name} note={data.communicationChannel || "طريقة التواصل غير محددة"} />}
      <Card label="الدفع" value={data.paymentStatus || "لا توجد عملية"} note={data.paymentAmountEgp ? `${Number(data.paymentAmountEgp).toLocaleString("ar-EG")} ج.م` : "—"} status={data.paymentStatus || undefined} />
      <Card label="الموعد" value={data.meetingAt ? new Date(data.meetingAt).toLocaleString("ar-EG") : "غير محدد"} note={data.meetingProvider || data.meetingLocation || "—"} />
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-black text-[#00102e]">الخط الزمني</h2><div className="mt-5 space-y-4">{data.events.map((event, index) => <div key={event.id} className="relative pr-8"><span className="absolute right-0 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#00102e] text-[9px] font-black text-[#d5a84c]">{index + 1}</span>{index < data.events.length - 1 && <span className="absolute right-[9px] top-6 h-[calc(100%+8px)] w-px bg-slate-200" />}<div className="rounded-xl bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b className="font-mono text-[10px] text-[#986410]">{event.eventType}</b><span className="text-[9px] text-slate-400">{new Date(event.createdAt).toLocaleString("ar-EG")}</span></div><p className="mt-2 text-xs leading-6 text-slate-600">{event.notes || "تم تحديث الطلب"}</p></div></div>)}{data.events.length === 0 && <Empty />}</div></section>

      <div className="space-y-5">
        {canManage && <form onSubmit={addClientUpdate} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-[#986410]" /><h2 className="font-black text-[#00102e]">تحديث يظهر للعميل</h2></div><textarea name="note" required maxLength={2000} placeholder="مثال: تمت مراجعة المستندات ونحتاج صورة أوضح للبطاقة..." className="mt-4 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-xs" /><button disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d5a84c]"><Save className="h-4 w-4" />نشر التحديث</button></form>}
        {canSchedule && <form onSubmit={scheduleMeeting} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><CalendarPlus className="h-4 w-4 text-[#986410]" /><h2 className="font-black text-[#00102e]">تحديد موعد تواصل</h2></div><div className="mt-4 grid gap-3"><select name="provider" required className="rounded-xl border border-slate-200 p-3 text-xs"><option value="zoom">Zoom</option><option value="office">المكتب</option><option value="whatsapp">واتساب</option></select><input name="scheduledAt" type="datetime-local" required className="rounded-xl border border-slate-200 p-3 text-xs" /><input name="meetingUrl" placeholder="رابط Zoom عند استخدامه" className="rounded-xl border border-slate-200 p-3 text-xs" /><input name="meetingLocation" placeholder="عنوان أو تفاصيل الموعد بالمكتب" className="rounded-xl border border-slate-200 p-3 text-xs" /></div><button disabled={busy} className="mt-3 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d5a84c]">حفظ الموعد</button></form>}
      </div>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <FilePanel title="مستندات العميل" rows={data.attachments} />
      <FilePanel title="الملفات المسلّمة للعميل" rows={data.deliverables} deliverables />
    </div>

    {canManage && <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={publishDeliverable} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-2"><Upload className="h-5 w-5 text-[#986410]" /><div><h2 className="font-black text-[#00102e]">رفع نسخة أو تقرير للعميل</h2><p className="text-[10px] text-slate-400">كل رفع ينشئ إصدارًا جديدًا ولا يستبدل الملفات القديمة.</p></div></div><div className="mt-5 grid gap-3"><input name="title" required placeholder="عنوان الملف" className="rounded-xl border border-slate-200 p-3 text-xs" /><select name="type" required className="rounded-xl border border-slate-200 p-3 text-xs"><option value="review_report">تقرير مراجعة</option><option value="revised_document">نسخة معدلة</option><option value="final_document">نسخة نهائية</option><option value="supporting_document">مستند داعم</option></select><input name="file" type="file" required accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="rounded-xl border border-slate-200 p-3 text-xs" /><textarea name="notes" placeholder="ملاحظات تظهر للعميل" className="min-h-24 rounded-xl border border-slate-200 p-3 text-xs" /><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input name="isFinal" type="checkbox" />اعتبارها النسخة النهائية</label></div><button disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d5a84c]"><Upload className="h-4 w-4" />رفع وإتاحة الملف</button></form>
      <form onSubmit={linkContract} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-2"><Link2 className="h-5 w-5 text-[#986410]" /><div><h2 className="font-black text-[#00102e]">ربط عقد بهذا الطلب</h2><p className="text-[10px] text-slate-400">اربط الطلب بعقد أنشأه العميل بالفعل. إنشاء العقود من لوحة التحكم مخفي حاليًا.</p></div></div>{data.linkedContractId ? <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800"><div>{data.linkedContractTitle || "عقد مرتبط"}</div><div className="mt-1 font-mono text-[10px]">{data.linkedContractSerial}</div><Link href={`/contracts/${data.linkedContractId}`} className="mt-3 inline-block text-blue-700">فتح العقد</Link></div> : <><input name="contractId" type="number" min="1" required placeholder="رقم العقد الداخلي" className="mt-5 w-full rounded-xl border border-slate-200 p-3 text-xs" /><button disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d5a84c]"><Link2 className="h-4 w-4" />ربط العقد</button></>}</form>
    </div>}
  </div>;
}

function Card({ label, value, note, status }: { label: string; value: string; note: string; status?: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[10px] font-black text-slate-400">{label}</div><div className="mt-2 font-black text-[#00102e]">{status ? <StatusBadge value={status} /> : value}</div><div className="mt-2 text-[10px] text-slate-500">{note}</div></div>; }
function FilePanel({ title, rows, deliverables = false }: { title: string; rows: FileRow[]; deliverables?: boolean }) { return <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-black text-[#00102e]">{title}</h2><div className="mt-4 space-y-3">{rows.map((row) => { const attachmentId = row.attachmentId ?? row.id; return <div key={`${attachmentId}-${row.versionNumber ?? 0}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="min-w-0"><div className="truncate text-xs font-black text-[#00102e]">{deliverables ? row.title || row.fileName : row.fileName}</div><div className="mt-1 text-[9px] text-slate-400">{deliverables && row.versionNumber ? `الإصدار ${row.versionNumber} · ` : ""}{Math.ceil(Number(row.sizeBytes || 0) / 1024)} KB{row.isFinal ? " · نهائي" : ""}</div></div>{attachmentId && <a href={`${API_BASE_URL}/api/v1/attachments/${attachmentId}/download`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white p-2 text-blue-700" title="تنزيل"><Download className="h-4 w-4" /></a>}</div>; })}{rows.length === 0 && <Empty />}</div></section>; }
function Empty() { return <div className="rounded-xl bg-slate-50 p-8 text-center text-xs font-bold text-slate-400"><UserRoundCheck className="mx-auto mb-2 h-5 w-5" />لا توجد بيانات.</div>; }
