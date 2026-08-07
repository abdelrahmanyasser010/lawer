"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, ExternalLink, RefreshCw, UserRoundCheck } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { getCurrentStaff } from "@/lib/adminAccess";
import { dashboardFeatures } from "@/config/dashboardFeatures";

type RequestItem = {
  id:number;
  serialNumber:string;
  title:string;
  status:string;
  priority:string;
  createdAt:string;
  clientName?:string;
  clientPhone?:string;
  assignedLawyerName?:string;
  meetingUrl?:string;
};
type Staff = { id:number; name:string; status:string };

const statuses = ["new","awaiting_payment","assigned","awaiting_client_info","meeting_scheduled","in_progress","client_review","revision_requested","completed","cancelled"];
const statusLabels: Record<string,string> = {
  new: "جديد", awaiting_payment: "بانتظار الدفع", assigned: "قيد المتابعة", awaiting_client_info: "بانتظار بيانات العميل",
  meeting_scheduled: "موعد محدد", in_progress: "قيد التنفيذ", client_review: "مراجعة العميل", revision_requested: "تعديل مطلوب", completed: "مكتمل", cancelled: "ملغي",
};


export default function ServiceRequestsBoard({type,title,description,meetings=false}:{type:"contract_review"|"consultation"|"contract_drafting";title:string;description:string;meetings?:boolean}){
  const current = getCurrentStaff();
  const canAssign = dashboardFeatures.assignment && (current.role === "super_admin" || current.permissions.includes("requests.assign"));
  const canManage = current.role === "super_admin" || current.permissions.includes("requests.manage");
  const canSchedule = current.role === "super_admin" || current.permissions.includes("consultations.manage");
  const [items,setItems]=useState<RequestItem[]>([]);
  const [team,setTeam]=useState<Staff[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState<number|null>(null);
  const [loaded,setLoaded]=useState(false);

  const load=useCallback(async()=>{
    setError("");
    try{
      const requests=await dashboardRequest<RequestItem[]>(`/api/v1/admin/service-requests?type=${type}`);
      setItems(requests);
      if(canAssign){
        const lawyers=await dashboardRequest<Staff[]>("/api/v1/admin/team/assignable-lawyers");
        setTeam(lawyers);
      } else setTeam([]);
    }catch(e){setError(e instanceof Error?e.message:"تعذر تحميل الطلبات");}
    finally{setLoaded(true);}
  },[type,canAssign]);
  useEffect(()=>{void load();},[load]);
  const lawyers=useMemo(()=>team.filter(x=>x.status!=="suspended"),[team]);

  async function assign(id:number,lawyerId:number){
    setBusy(id);
    try{await dashboardRequest(`/api/v1/admin/service-requests/${id}/assign`,{method:"POST",body:JSON.stringify({lawyerId})});await load();}
    catch(e){setError(e instanceof Error?e.message:"تعذر الإسناد");}
    finally{setBusy(null);}
  }
  async function status(id:number,value:string){
    const notes=window.prompt("ملاحظات للعميل أو سجل الطلب (اختياري)")||undefined;
    setBusy(id);
    try{await dashboardRequest(`/api/v1/admin/service-requests/${id}/status`,{method:"POST",body:JSON.stringify({status:value,notes})});await load();}
    catch(e){setError(e instanceof Error?e.message:"تعذر تحديث الحالة");}
    finally{setBusy(null);}
  }
  async function meeting(id:number){
    const scheduledAt=window.prompt("موعد التواصل بصيغة 2026-08-05T18:00");
    if(!scheduledAt)return;
    const provider=(window.prompt("الطريقة: zoom / office / whatsapp","zoom")||"zoom").trim();
    if(!["zoom","office","whatsapp"].includes(provider)){setError("طريقة التواصل غير مدعومة");return;}
    const meetingUrl=provider==="zoom"?window.prompt("رابط Zoom")||undefined:undefined;
    const meetingLocation=provider==="office"?window.prompt("عنوان أو تفاصيل الموعد بالمكتب")||undefined:undefined;
    if(provider==="zoom"&&!meetingUrl)return;
    if(provider==="office"&&!meetingLocation)return;
    setBusy(id);
    const parsedScheduledAt=new Date(scheduledAt);
    if(Number.isNaN(parsedScheduledAt.getTime())){setError("موعد التواصل غير صالح");return;}
    try{await dashboardRequest(`/api/v1/admin/service-requests/${id}/meeting`,{method:"POST",body:JSON.stringify({scheduledAt:parsedScheduledAt.toISOString(),provider,meetingUrl,meetingLocation})});await load();}
    catch(e){setError(e instanceof Error?e.message:"تعذر جدولة الاجتماع");}
    finally{setBusy(null);}
  }

  if(error&&!loaded)return <PageError message={error} onRetry={load}/>;
  if(!loaded)return <PageLoading/>;
  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-black text-[#00102e]">{title}</h1><p className="text-sm text-slate-500">{description}</p></div><button onClick={()=>void load()} className="self-start rounded-xl border border-slate-200 bg-white p-2.5"><RefreshCw className="h-4 w-4"/></button></header>
    {error&&<div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
    <div className="space-y-4">{items.map(item=><article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] text-slate-400">{item.serialNumber}</span><StatusBadge value={item.status}/>{item.priority==="high"&&<span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">عاجل</span>}</div><h2 className="mt-2 text-lg font-black text-[#00102e]">{item.title}</h2><p className="mt-1 text-xs text-slate-500">العميل: {item.clientName||"—"} · {item.clientPhone||"لا يوجد هاتف"} · {new Date(item.createdAt).toLocaleString("ar-EG")}</p>{item.meetingUrl&&<a href={item.meetingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-black text-blue-700">فتح رابط الاجتماع</a>}</div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{canAssign && <select disabled={busy===item.id} defaultValue="" onChange={e=>e.target.value&&void assign(item.id,Number(e.target.value))} className="rounded-xl border border-slate-200 p-2.5 text-xs"><option value="">{item.assignedLawyerName||"إسناد لمحامٍ"}</option>{lawyers.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>}{canManage?<select disabled={busy===item.id} value={item.status} onChange={e=>void status(item.id,e.target.value)} className="rounded-xl border border-slate-200 p-2.5 text-xs">{statuses.map(s=><option key={s} value={s}>{statusLabels[s] ?? s}</option>)}</select>:<div className="rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-400">عرض فقط</div>}<Link href={`/work/${item.id}`} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-[#00102e]"><ExternalLink className="h-4 w-4"/>فتح الطلب</Link>{meetings&&canSchedule&&<button disabled={busy===item.id} onClick={()=>void meeting(item.id)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#00102e] px-3 py-2.5 text-xs font-black text-[#d5a84c]"><CalendarPlus className="h-4 w-4"/>جدولة اجتماع</button>}</div></div></article>)}{items.length===0&&<div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><UserRoundCheck className="mx-auto h-8 w-8 text-emerald-600"/><p className="mt-3 text-sm font-black text-slate-500">لا توجد طلبات حاليًا.</p></div>}</div>
  </div>;
}
