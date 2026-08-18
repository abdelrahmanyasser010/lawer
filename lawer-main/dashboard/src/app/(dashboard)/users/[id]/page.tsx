"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, BriefcaseBusiness, CreditCard, FileText, Mail, Phone, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { hasBackendPermission } from "@/lib/adminAccess";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { dashboardFeatures } from "@/config/dashboardFeatures";
import { AdminDialog } from "@/components/admin/AdminDialog";
import CustomerContactActions from "@/components/admin/CustomerContactActions";

const requestTypeLabels:Record<string,string>={consultation:"استشارة قانونية",contract_drafting:"إعداد عقد بواسطة محامي المكتب",contract_review:"مراجعة عقد أو مستند"};

type CustomerDetails = {
  profile: {
    id: number; publicId: string; name: string; email: string; phone?: string; whatsappNumber?: string;
    accountType: string; companyName?: string | null; status: string; emailVerifiedAt?: string | null;
    whatsappServiceConsentAt?: string | null; suspensionReason?: string | null; suspendedAt?: string | null; createdAt: string; updatedAt: string; activeSessions: number;
    attachmentsCount: number; approvedPaymentsEgp: number;
  };
  contracts: Array<{ id: number; serialNumber: string; title: string; status: string; sourceChannel: string; billingMode: string; priceEgp: number; createdAt: string; updatedAt: string; issuedAt?: string | null; templateNameAr: string; assignedLawyerName?: string | null }>;
  requests: Array<{ id: number; serialNumber: string; requestType: string; title: string; status: string; priority: string; communicationChannel?: string; meetingAt?: string | null; createdAt: string; updatedAt: string; assignedLawyerName?: string | null }>;
  payments: Array<{ id: number; serialNumber: string; amountEgp: number; status: string; paymentMethod: string; contractId?: number | null; serviceRequestId?: number | null; adminNotes?: string | null; createdAt: string; reviewedAt?: string | null }>;
  activity: Array<{ id: number; action: string; entityType: string; entityId: string; createdAt: string; actorName?: string | null }>;
};

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CustomerDetails | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [notice, setNotice] = useState("");
  const canManage = hasBackendPermission("clients.manage");

  const load = useCallback(async () => {
    setError("");
    try { setData(await dashboardRequest<CustomerDetails>(`/api/v1/admin/users/${id}`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر تحميل ملف العميل"); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function reactivate() {
    if (!data) return;
    setBusy(true); setError("");
    try { await dashboardRequest(`/api/v1/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "active" }) }); setNotice("تمت إعادة تفعيل حساب العميل."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر تحديث الحساب"); }
    finally { setBusy(false); }
  }

  async function suspendAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason=suspensionReason.trim(); if(!reason){setError("سبب تعليق الحساب مطلوب");return;}
    setBusy(true); setError("");
    try { await dashboardRequest(`/api/v1/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "suspended", reason }) }); setNotice("تم تعليق الحساب وإلغاء الجلسات النشطة."); setSuspendOpen(false); setSuspensionReason(""); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر تعليق الحساب"); }
    finally { setBusy(false); }
  }

  if (error && !data) return <div className="p-8"><PageError message={error} onRetry={load} /></div>;
  if (!data) return <div className="p-8"><PageLoading /></div>;
  const profile = data.profile;

  return <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center">
      <div><Link href="/users" className="inline-flex items-center gap-1 text-xs font-black text-slate-500"><ArrowRight className="h-3.5 w-3.5" />العودة للعملاء</Link><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-black text-[#00102e]">{profile.name}</h1><StatusBadge value={profile.status} /></div><div className="mt-1 font-mono text-xs text-slate-400">{profile.publicId}</div></div>
      <div className="flex gap-2"><button onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white p-2.5"><RefreshCw className="h-4 w-4" /></button>{canManage && (profile.status === "suspended" ? <button disabled={busy} onClick={() => void reactivate()} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white">إعادة تفعيل الحساب</button> : <button disabled={busy} onClick={() => setSuspendOpen(true)} className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-700">تعليق الحساب</button>)}</div>
    </div>

    {error && <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
    {notice && <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{notice}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={FileText} label="العقود" value={data.contracts.length} />
      <Stat icon={BriefcaseBusiness} label="الطلبات" value={data.requests.length} />
      <Stat icon={CreditCard} label="مدفوعات معتمدة" value={`${Number(profile.approvedPaymentsEgp).toLocaleString("ar-EG")} ج.م`} />
      <Stat icon={ShieldCheck} label="جلسات نشطة" value={profile.activeSessions} />
    </div>

    <section className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-black text-[#00102e]">بيانات الحساب</h2><div className="mt-5 space-y-3 text-xs"><Info icon={UserRound} label="نوع الحساب" value={profile.accountType === "business" ? `شركة${profile.companyName ? ` — ${profile.companyName}` : ""}` : "فرد"} /><Info icon={Mail} label="البريد" value={profile.email} /><Info icon={Phone} label="الهاتف" value={profile.phone || "—"} /><Info icon={Phone} label="واتساب" value={profile.whatsappNumber || "—"} /><div className="rounded-xl bg-slate-50 p-3"><div className="mb-2 text-[9px] font-black text-slate-400">التواصل السريع</div><CustomerContactActions phone={profile.phone} whatsapp={profile.whatsappNumber} whatsappAllowed={Boolean(profile.whatsappServiceConsentAt)}/></div><Info icon={ShieldCheck} label="تأكيد البريد" value={profile.emailVerifiedAt ? new Date(profile.emailVerifiedAt).toLocaleString("ar-EG") : "غير مؤكد"} /><Info icon={FileText} label="الملفات المرفوعة" value={String(profile.attachmentsCount)} /><Info icon={UserRound} label="تاريخ التسجيل" value={new Date(profile.createdAt).toLocaleString("ar-EG")} />{profile.status === "suspended" && <Info icon={ShieldCheck} label="سبب التعليق" value={profile.suspensionReason || "غير مسجل"} />}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-black text-[#00102e]">آخر النشاط</h2><div className="mt-5 space-y-3">{data.activity.slice(0, 12).map((item) => <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] font-black text-[#986410]">{item.action}</span><span className="text-[9px] text-slate-400">{new Date(item.createdAt).toLocaleString("ar-EG")}</span></div><div className="mt-1 text-[10px] text-slate-500">{item.entityType} #{item.entityId} · {item.actorName || "النظام"}</div></div>)}{data.activity.length === 0 && <Empty />}</div></div>
    </section>

    <TableSection title="العقود" empty="لا توجد عقود لهذا العميل."><table className="w-full min-w-[820px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">العقد</th><th className="p-4">القالب</th><th className="p-4">الحالة</th>{dashboardFeatures.assignment && <th className="p-4">المحامي</th>}<th className="p-4">السعر</th><th className="p-4">آخر تحديث</th></tr></thead><tbody className="divide-y divide-slate-100">{data.contracts.map((row) => <tr key={row.id}><td className="p-4"><Link href={`/contracts/${row.id}`} className="font-black text-blue-700">{row.title}</Link><div className="font-mono text-[9px] text-slate-400">{row.serialNumber}</div></td><td className="p-4">{row.templateNameAr}</td><td className="p-4"><StatusBadge value={row.status} /></td>{dashboardFeatures.assignment && <td className="p-4">{row.assignedLawyerName || "—"}</td>}<td className="p-4">{Number(row.priceEgp).toLocaleString("ar-EG")} ج.م</td><td className="p-4">{new Date(row.updatedAt).toLocaleString("ar-EG")}</td></tr>)}</tbody></table>{data.contracts.length === 0 && <Empty />}</TableSection>

    <TableSection title="الطلبات والاستشارات" empty="لا توجد طلبات."><table className="w-full min-w-[760px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">الطلب</th><th className="p-4">النوع</th><th className="p-4">الحالة</th>{dashboardFeatures.assignment && <th className="p-4">المحامي</th>}<th className="p-4">آخر تحديث</th></tr></thead><tbody className="divide-y divide-slate-100">{data.requests.map((row) => <tr key={row.id}><td className="p-4"><Link href={`/work/${row.id}`} className="font-black text-blue-700">{row.title}</Link><div className="font-mono text-[9px] text-slate-400">{row.serialNumber}</div></td><td className="p-4">{requestTypeLabels[row.requestType] || "طلب خدمة"}</td><td className="p-4"><StatusBadge value={row.status} /></td>{dashboardFeatures.assignment && <td className="p-4">{row.assignedLawyerName || "—"}</td>}<td className="p-4">{new Date(row.updatedAt).toLocaleString("ar-EG")}</td></tr>)}</tbody></table>{data.requests.length === 0 && <Empty />}</TableSection>

    <TableSection title="المدفوعات" empty="لا توجد مدفوعات."><table className="w-full min-w-[850px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">العملية</th><th className="p-4">المبلغ</th><th className="p-4">الحالة</th><th className="p-4">الارتباط</th><th className="p-4">التاريخ</th><th className="p-4">ملاحظات</th></tr></thead><tbody className="divide-y divide-slate-100">{data.payments.map((row) => <tr key={row.id}><td className="p-4 font-mono text-[10px]">{row.serialNumber}</td><td className="p-4 font-black">{Number(row.amountEgp).toLocaleString("ar-EG")} ج.م</td><td className="p-4"><StatusBadge value={row.status} /></td><td className="p-4">{row.contractId ? `عقد #${row.contractId}` : `طلب #${row.serviceRequestId}`}</td><td className="p-4">{new Date(row.createdAt).toLocaleString("ar-EG")}</td><td className="p-4">{row.adminNotes || "—"}</td></tr>)}</tbody></table>{data.payments.length === 0 && <Empty />}</TableSection>
    <AdminDialog open={suspendOpen} title="تعليق حساب العميل" description="سيتم تسجيل خروج العميل ومنعه من الدخول حتى إعادة التفعيل. سبب التعليق مطلوب ويُحفظ في سجل النظام." onClose={() => !busy && setSuspendOpen(false)}><form onSubmit={suspendAccount} className="space-y-4"><textarea required maxLength={1000} value={suspensionReason} onChange={e=>setSuspensionReason(e.target.value)} placeholder="سبب التعليق" className="min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm"/><button disabled={busy} className="w-full rounded-xl bg-red-700 px-5 py-3 text-xs font-black text-white">تأكيد تعليق الحساب</button></form></AdminDialog>
  </div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string | number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><Icon className="h-5 w-5 text-[#986410]" /><div className="mt-3 text-2xl font-black text-[#00102e]">{value}</div><div className="mt-1 text-[10px] font-bold text-slate-500">{label}</div></div>; }
function Info({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) { return <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><Icon className="h-4 w-4 text-[#986410]" /><div><div className="text-[9px] font-black text-slate-400">{label}</div><div className="mt-0.5 font-bold text-slate-700">{value}</div></div></div>; }
function TableSection({ title, children }: { title: string; empty: string; children: ReactNode }) { return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h2 className="border-b border-slate-100 p-5 font-black text-[#00102e]">{title}</h2><div className="overflow-x-auto">{children}</div></section>; }
function Empty() { return <div className="p-8 text-center text-xs font-bold text-slate-400">لا توجد بيانات.</div>; }
