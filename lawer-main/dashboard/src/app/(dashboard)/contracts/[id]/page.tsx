"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Copy, FileLock2, FilePlus2, Link2, Send, ShieldCheck, UserRoundCheck } from "lucide-react";
import { dashboardRequest, DashboardApiError } from "@/lib/apiClient";
import { AdminDialog } from "@/components/admin/AdminDialog";
import { StatusBadge } from "@/components/admin/PageFeedback";
import { getCurrentStaff } from "@/lib/adminAccess";
import { dashboardFeatures } from "@/config/dashboardFeatures";

type ContractDetails = {
  id: number;
  serial_number: string;
  title: string;
  status: string;
  current_version_id?: number;
  assigned_lawyer_id?: number;
  template_name_ar?: string;
  client_name?: string;
  client_user_id?: number | null;
  assigned_lawyer_name?: string;
  source_channel?: string;
  billing_mode?: string;
  payment_status?: string;
  permissions?: { canShare?: boolean; canDownloadPdf?: boolean; canEdit?: boolean };
  versions: Array<{ id: number; versionNumber: number; status: string; createdAt: string; lockedAt?: string; issuedAt?: string | null; documentHash?: string }>;
};
type TeamMember = { id: number; name: string; roles: string[]; status: string };

export default function ContractDetailsPage() {
  const staff = getCurrentStaff();
  const hasPermission = (permission: string) => staff.role === "super_admin" || staff.permissions.includes(permission);
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [lawyerId, setLawyerId] = useState("");
  const [status, setStatus] = useState("");
  const [waiverReason, setWaiverReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [sharePermission, setSharePermission] = useState<"view_only" | "edit">("view_only");
  const [shareTargetPublicId, setShareTargetPublicId] = useState("");
  const [shareEditableFields, setShareEditableFields] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");

  async function load() {
    setLoading(true); setError(null);
    try {
      const details = await dashboardRequest<ContractDetails>(`/api/v1/contracts/${id}`);
      setContract(details);
      setLawyerId(details.assigned_lawyer_id ? String(details.assigned_lawyer_id) : "");
      setStatus(allowedStatuses(details)[0]?.value || "");
      if (dashboardFeatures.assignment && hasPermission("contracts.assign")) {
        try {
          const members = await dashboardRequest<TeamMember[]>("/api/v1/admin/team/assignable-lawyers");
          setTeam(members.filter((member) => member.roles.includes("lawyer") && member.status !== "suspended"));
        } catch {
          setTeam([]);
        }
      }
    } catch (caught) { setError(caught instanceof DashboardApiError ? caught.message : "تعذر تحميل العقد"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [id]);

  async function action(path: string, body?: Record<string, unknown>) {
    setNotice(null); setError(null);
    try {
      const result = await dashboardRequest<Record<string, unknown>>(`/api/v1/admin/contracts/${id}${path}`, { method: "POST", body: JSON.stringify(body ?? {}) });
      setNotice("تم تنفيذ الإجراء بنجاح.");
      await load();
      return result;
    } catch (caught) { setError(caught instanceof DashboardApiError ? caught.message : "تعذر تنفيذ الإجراء"); }
  }

  async function createRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contract) return;
    const reason = revisionReason.trim();
    if (["locked","issued"].includes(contract.status) && !reason) { setError("سبب إنشاء تعديل جديد مطلوب للعقد المقفول أو الصادر."); return; }
    const result = await action("/versions", reason ? { reason } : {});
    if (result) { setRevisionOpen(false); setRevisionReason(""); }
  }

  async function createShareLink() {
    setNotice(null); setError(null); setShareUrl("");
    try {
      const editableFieldKeys = sharePermission === "edit"
        ? shareEditableFields.split(",").map((value) => value.trim()).filter(Boolean)
        : [];
      if (sharePermission === "edit" && editableFieldKeys.length === 0) {
        setError("حدد مفاتيح الحقول التي يسمح للطرف الآخر بتعديلها. لا يتم فتح كل الحقول تلقائيًا.");
        return;
      }
      const result = await dashboardRequest<{ shareUrl: string }>(`/api/v1/contracts/${id}/shares`, {
        method: "POST",
        body: JSON.stringify({
          permission: sharePermission,
          targetPublicId: shareTargetPublicId.trim() || undefined,
          editableFieldKeys,
          expiresInDays: 7,
        }),
      });
      setShareUrl(result.shareUrl);
      setNotice("تم إنشاء رابط مشاركة صالح لمدة 7 أيام.");
    } catch (caught) {
      setError(caught instanceof DashboardApiError ? caught.message : "تعذر إنشاء رابط المشاركة");
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setNotice("تم نسخ رابط المشاركة.");
  }

  if (loading) return <div className="p-10 text-center text-xs font-black text-slate-500">جاري تحميل تفاصيل العقد...</div>;
  if (!contract) return <div className="p-10 text-center text-xs font-black text-rose-600">{error || "العقد غير موجود"}</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><Link href="/contracts" className="inline-flex items-center gap-1 text-xs font-black text-slate-500"><ArrowRight className="h-4 w-4"/> العقود</Link><h1 className="mt-3 text-2xl font-black text-[#00102e]">{contract.title}</h1><p className="mt-1 font-mono text-xs font-bold text-slate-400">{contract.serial_number}</p></div><Link href={`/contracts/${id}/preview${contract.current_version_id ? `?versionId=${contract.current_version_id}` : ""}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-[#00102e]">فتح المعاينة</Link></div>
      {notice && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black text-emerald-800">{notice}</div>}
      {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-black text-rose-700">{error}</div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#00102e]">بيانات التشغيل</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["الحالة", contractStatusLabel(contract.status)], ["نوع القالب", contract.template_name_ar], ["العميل", contract.client_name || "استخدام داخلي"], ...(dashboardFeatures.assignment ? [["المحامي", contract.assigned_lawyer_name || "غير مسند"]] : []), ["مصدر الإنشاء", contract.source_channel === "office" ? "المكتب" : "العميل"], ["نظام التحصيل", billingLabel(contract.billing_mode)],
            ].map(([label,value]) => <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black text-slate-400">{label}</div><div className="mt-1 text-xs font-black text-slate-800">{String(value || "—")}</div></div>)}
          </div>
          <h3 className="mt-6 text-xs font-black text-[#00102e]">إصدارات العقد</h3>
          <div className="mt-3 space-y-2">{contract.versions.map((version) => <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><div className="text-xs font-black text-slate-800">الإصدار {version.versionNumber}</div><div className="mt-1 text-[10px] font-bold text-slate-400">{new Date(version.createdAt).toLocaleString("ar-EG")}</div></div><div className="text-left"><div className="flex items-center justify-end gap-2"><StatusBadge value={version.status}/><Link href={`/contracts/${id}/preview?versionId=${version.id}`} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-black text-slate-700">معاينة</Link>{dashboardFeatures.contractEditing && hasPermission("contracts.edit_legal") && contract.current_version_id === version.id && ["draft","internal_review","revision_requested","client_review","approved"].includes(version.status) && <Link href={`/contracts/${id}/versions/${version.id}`} className="rounded-lg border border-[#986410]/30 bg-[#986410]/5 px-2 py-1 text-[9px] font-black text-[#986410]">تحرير الإصدار</Link>}</div>{version.documentHash && <div className="mt-1 max-w-56 truncate font-mono text-[8px] text-slate-400">{version.documentHash}</div>}</div></div>)}</div>
        </section>

        <aside className="space-y-4">
          {dashboardFeatures.assignment && hasPermission("contracts.assign") && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><UserRoundCheck className="h-5 w-5 text-[#986410]"/><h2 className="text-sm font-black text-[#00102e]">إسناد لمحامٍ</h2></div><select value={lawyerId} onChange={(event)=>setLawyerId(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold"><option value="">اختر محاميًا</option>{team.map((member)=><option key={member.id} value={member.id}>{member.name}</option>)}</select><button type="button" disabled={!lawyerId} onClick={()=>void action("/assign",{lawyerId:Number(lawyerId)})} className="mt-3 w-full rounded-xl bg-[#00102e] py-2.5 text-xs font-black text-white disabled:opacity-50">تأكيد الإسناد</button></section>}

          {hasPermission("contracts.manage_status") && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-[#00102e]">تغيير سير العمل</h2>{allowedStatuses(contract).length?<><select value={status} onChange={(event)=>setStatus(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold">{allowedStatuses(contract).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" disabled={!status} onClick={()=>void action("/status",{status})} className="mt-3 w-full rounded-xl border border-slate-300 py-2.5 text-xs font-black text-slate-700 disabled:opacity-50">حفظ الحالة</button></>:<div className="mt-4 rounded-xl bg-slate-50 p-3 text-[10px] font-bold leading-5 text-slate-500">لا توجد نقلة تشغيلية متاحة من الحالة الحالية. استخدم إجراءات الإصدار/التعديل المخصصة عند الحاجة.</div>}</section>}

          {hasPermission("contracts.waive_payment") && contract.billing_mode === "client_invoice" && contract.payment_status !== "approved" && !["locked","issued"].includes(contract.status) && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="text-sm font-black text-amber-950">إعفاء من الدفع</h2><textarea value={waiverReason} onChange={(event)=>setWaiverReason(event.target.value)} placeholder="سبب واضح ومسجل في Audit Log" className="mt-3 min-h-20 w-full rounded-xl border border-amber-200 bg-white p-3 text-xs outline-none"/><button type="button" disabled={!waiverReason.trim()} onClick={()=>void action("/payment-waiver",{reason:waiverReason})} className="mt-3 w-full rounded-xl bg-amber-900 py-2.5 text-xs font-black text-white disabled:opacity-50">تسجيل الإعفاء</button></section>}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><Link2 className="h-5 w-5 text-[#986410]"/><h2 className="text-sm font-black text-[#00102e]">مشاركة آمنة</h2></div>
            <select value={sharePermission} onChange={(event)=>setSharePermission(event.target.value as "view_only" | "edit")} className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold">
              <option value="view_only">عرض فقط</option>{dashboardFeatures.contractEditing && <option value="edit">تعديل حقول محددة</option>}
            </select>
            <input value={shareTargetPublicId} onChange={(event)=>setShareTargetPublicId(event.target.value)} placeholder="Z-ID للطرف المدعو — اختياري" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold"/>
            {dashboardFeatures.contractEditing && sharePermission === "edit" && <textarea value={shareEditableFields} onChange={(event)=>setShareEditableFields(event.target.value)} placeholder="مفاتيح الحقول المسموح بها مفصولة بفواصل، مثال: buyer_name,buyer_address" className="mt-2 min-h-20 w-full rounded-xl border border-slate-300 p-3 text-xs outline-none"/>}
            {contract.permissions?.canShare !== false ? <button type="button" onClick={()=>void createShareLink()} className="mt-3 w-full rounded-xl bg-[#00102e] py-2.5 text-xs font-black text-white">إنشاء رابط لمدة 7 أيام</button> : <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[10px] font-black leading-5 text-amber-800">المشاركة غير متاحة لهذا العقد قبل اعتماد الدفع.</div>}
            {shareUrl && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><div className="break-all text-[10px] font-bold text-emerald-900">{shareUrl}</div><button type="button" onClick={()=>void copyShareLink()} className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-emerald-900"><Copy className="h-3.5 w-3.5"/> نسخ الرابط</button></div>}
            <p className="mt-3 text-[10px] font-bold leading-5 text-slate-500">{dashboardFeatures.contractEditing ? "رابط التعديل لا يفتح إلا الحقول المحددة، ويمكن ربطه بـ Z-ID ومنعه تلقائيًا بعد انتهاء الصلاحية." : "المشاركة من لوحة التحكم للعرض فقط في وضع التشغيل الحالي."}</p>
          </section>

          {(hasPermission("contracts.edit_legal") || hasPermission("contracts.lock") || hasPermission("contracts.issue")) && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-[#00102e]">الإصدارات والاعتماد</h2><div className="mt-4 grid gap-2">{dashboardFeatures.contractEditing && hasPermission("contracts.edit_legal") && ["locked","issued"].includes(contract.status) && <button type="button" onClick={()=>setRevisionOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-xs font-black text-slate-700"><FilePlus2 className="h-4 w-4"/> إنشاء تعديل / إصدار جديد</button>}{hasPermission("contracts.lock") && ["approved","client_review","in_progress"].includes(contract.status) && <button type="button" onClick={()=>void action("/lock")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-xs font-black text-white"><FileLock2 className="h-4 w-4"/> قفل النسخة</button>}{hasPermission("contracts.issue") && contract.status === "locked" && <button type="button" onClick={()=>void action("/issue")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#986410] py-2.5 text-xs font-black text-white"><Send className="h-4 w-4"/> إصدار PDF النهائي</button>}</div><div className="mt-4 rounded-xl bg-slate-50 p-3 text-[10px] font-bold leading-5 text-slate-500"><ShieldCheck className="ml-1 inline h-4 w-4"/>القفل ينشئ Snapshot وHash. أي تعديل بعده يبدأ إصدارًا جديدًا.</div></section>}
        </aside>
      </div>
      <AdminDialog open={revisionOpen} title="إنشاء إصدار تعديل جديد" description={contract.status === "issued" || contract.status === "locked" ? "الإصدار الحالي سيظل محفوظًا كما هو. اكتب سبب التعديل ثم سيُنشأ إصدار جديد قابل للتحرير." : "سيُنشأ إصدار جديد من بيانات العقد الحالية مع الاحتفاظ بسجل الإصدارات."} onClose={()=>setRevisionOpen(false)}>
        <form onSubmit={createRevision} className="space-y-4"><textarea required={contract.status === "issued" || contract.status === "locked"} value={revisionReason} onChange={e=>setRevisionReason(e.target.value)} placeholder={contract.status === "issued" || contract.status === "locked" ? "سبب التعديل — مطلوب" : "سبب التعديل — اختياري"} className="min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm"/><button className="w-full rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-white">إنشاء الإصدار الجديد</button></form>
      </AdminDialog>
    </div>
  );
}

function contractStatusLabel(value:string){return ({draft:"مسودة",pending_payment:"بانتظار الدفع",pending_review:"قيد المراجعة",assigned:"قيد المتابعة",in_progress:"قيد الصياغة",client_review:"مراجعة العميل",revision_requested:"تعديلات مطلوبة",approved:"معتمد",locked:"مقفل",issued:"صادر",cancelled:"ملغي"} as Record<string,string>)[value]||value;}
function billingLabel(value?:string){return ({client_invoice:"مطالبة العميل بالدفع",office_waiver:"بدون مطالبة دفع — إعفاء مسجل",external_collection:"تحصيل خارجي مسجل"} as Record<string,string>)[value||""]||value||"—";}
function allowedStatuses(contract:ContractDetails){
  const maps:Record<string,Array<{value:string;label:string}>>={
    draft:[{value:"in_progress",label:"قيد الصياغة"},{value:"pending_review",label:"قيد المراجعة"},{value:"cancelled",label:"ملغي"}],
    pending_payment:[{value:"pending_review",label:"قيد المراجعة"},{value:"cancelled",label:"ملغي"}],
    pending_review:[{value:"in_progress",label:"قيد الصياغة"},{value:"cancelled",label:"ملغي"}],
    assigned:[{value:"in_progress",label:"قيد الصياغة"},{value:"cancelled",label:"ملغي"}],
    in_progress:[{value:"client_review",label:"مراجعة العميل"},{value:"revision_requested",label:"تعديلات مطلوبة"},{value:"approved",label:"معتمد"},{value:"cancelled",label:"ملغي"}],
    client_review:[{value:"revision_requested",label:"تعديلات مطلوبة"},{value:"approved",label:"معتمد"},{value:"cancelled",label:"ملغي"}],
    revision_requested:[{value:"in_progress",label:"قيد الصياغة"},{value:"client_review",label:"مراجعة العميل"},{value:"cancelled",label:"ملغي"}],
    approved:[{value:"revision_requested",label:"تعديلات مطلوبة"},{value:"in_progress",label:"قيد الصياغة"},{value:"cancelled",label:"ملغي"}],
  };
  let options=maps[contract.status]||[];
  if(!dashboardFeatures.assignment)options=options.filter(option=>option.value!=="assigned");
  const billingSettled=contract.payment_status==="approved"||["office_waiver","external_collection"].includes(contract.billing_mode||"")||(contract.source_channel==="office"&&!contract.client_user_id);
  if(!billingSettled&&["draft","pending_payment"].includes(contract.status))options=options.filter(option=>option.value==="cancelled");
  return options;
}
