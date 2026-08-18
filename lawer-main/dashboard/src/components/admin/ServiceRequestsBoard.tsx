"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, ExternalLink, RefreshCw, UserRoundCheck } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { getCurrentStaff } from "@/lib/adminAccess";
import { dashboardFeatures } from "@/config/dashboardFeatures";
import { AdminDialog } from "@/components/admin/AdminDialog";

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
  communicationChannel?:"zoom"|"whatsapp";
  preferredContactAt?:string|null;
  meetingAt?:string|null;
  meetingProvider?:"zoom"|"whatsapp"|null;
  meetingUrl?:string;
  allowedStatusTransitions?:string[];
};
type Staff = { id:number; name:string; status:string };

type StatusDialogState = { id:number; status:string; allowed:string[]; notes:string; visibleToClient:boolean } | null;
type AvailabilitySlot = { slotKey:string; start:string; end:string; label:string; remaining:number; limited?:boolean };
type AvailabilityDay = { date:string; label:string; slots:AvailabilitySlot[] };
type AvailabilityResponse = { timezone:string; days:AvailabilityDay[] };
type MeetingDialogState = { id:number; provider:"zoom"|"whatsapp"; meetingUrl:string; preferredAt?:string|null } | null;

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
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState<number|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [statusDialog,setStatusDialog]=useState<StatusDialogState>(null);
  const [meetingDialog,setMeetingDialog]=useState<MeetingDialogState>(null);
  const [meetingDays,setMeetingDays]=useState<AvailabilityDay[]>([]);
  const [meetingDay,setMeetingDay]=useState("");
  const [meetingStart,setMeetingStart]=useState("");
  const [meetingAvailabilityLoading,setMeetingAvailabilityLoading]=useState(false);
  const [meetingAvailabilityError,setMeetingAvailabilityError]=useState("");

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
  useEffect(()=>{
    if(!meetingDialog){setMeetingDays([]);setMeetingDay("");setMeetingStart("");setMeetingAvailabilityError("");return;}
    let cancelled=false;
    setMeetingAvailabilityLoading(true);setMeetingAvailabilityError("");
    dashboardRequest<AvailabilityResponse>(`/api/v1/admin/service-requests/${meetingDialog.id}/availability?channel=${meetingDialog.provider}`)
      .then((response)=>{
        if(cancelled)return;
        setMeetingDays(response.days);
        const preferredMs=meetingDialog.preferredAt?new Date(meetingDialog.preferredAt).getTime():Number.NaN;
        let day=response.days[0]?.date??"";
        let start=response.days[0]?.slots[0]?.start??"";
        if(!Number.isNaN(preferredMs)){
          for(const candidate of response.days){
            const match=candidate.slots.find((slot)=>new Date(slot.start).getTime()===preferredMs);
            if(match){day=candidate.date;start=match.start;break;}
          }
        }
        setMeetingDay(day);setMeetingStart(start);
      })
      .catch((caught)=>{if(!cancelled){setMeetingDays([]);setMeetingDay("");setMeetingStart("");setMeetingAvailabilityError(caught instanceof Error?caught.message:"تعذر تحميل المواعيد المتاحة");}})
      .finally(()=>{if(!cancelled)setMeetingAvailabilityLoading(false);});
    return()=>{cancelled=true;};
  },[meetingDialog?.id,meetingDialog?.provider,meetingDialog?.preferredAt]);
  const lawyers=useMemo(()=>team.filter(x=>x.status!=="suspended"),[team]);
  const selectedMeetingDay=useMemo(()=>meetingDays.find((day)=>day.date===meetingDay)??null,[meetingDays,meetingDay]);

  async function assign(id:number,lawyerId:number){
    setBusy(id); setError(""); setNotice("");
    try{await dashboardRequest(`/api/v1/admin/service-requests/${id}/assign`,{method:"POST",body:JSON.stringify({lawyerId})});setNotice("تم تحديث المسؤول عن الطلب.");await load();}
    catch(e){setError(e instanceof Error?e.message:"تعذر الإسناد");}
    finally{setBusy(null);}
  }

  async function submitStatus(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!statusDialog)return;
    setBusy(statusDialog.id); setError(""); setNotice("");
    try{
      await dashboardRequest(`/api/v1/admin/service-requests/${statusDialog.id}/status`,{method:"POST",body:JSON.stringify({status:statusDialog.status,notes:statusDialog.notes.trim()||undefined,visibleToClient:statusDialog.visibleToClient})});
      setStatusDialog(null); setNotice("تم تحديث حالة الاستشارة."); await load();
    }catch(e){setError(e instanceof Error?e.message:"تعذر تحديث الحالة");}
    finally{setBusy(null);}
  }

  async function submitMeeting(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!meetingDialog)return;
    if(!meetingStart){setError("اختر موعدًا متاحًا من جدول المكتب");return;}
    if(meetingDialog.provider==="zoom"&&!meetingDialog.meetingUrl.trim()){setError("أدخل رابط Zoom قبل حفظ الموعد");return;}
    setBusy(meetingDialog.id); setError(""); setNotice("");
    try{
      await dashboardRequest(`/api/v1/admin/service-requests/${meetingDialog.id}/meeting`,{method:"POST",body:JSON.stringify({scheduledAt:meetingStart,provider:meetingDialog.provider,meetingUrl:meetingDialog.provider==="zoom"?meetingDialog.meetingUrl.trim():undefined})});
      setMeetingDialog(null); setNotice("تم تحديد الموعد وإشعار العميل."); await load();
    }catch(e){setError(e instanceof Error?e.message:"تعذر تحديد الموعد");}
    finally{setBusy(null);}
  }

  if(error&&!loaded)return <PageError message={error} onRetry={load}/>;
  if(!loaded)return <PageLoading/>;
  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-black text-[#00102e]">{title}</h1><p className="text-sm text-slate-500">{description}</p></div><button onClick={()=>void load()} className="self-start rounded-xl border border-slate-200 bg-white p-2.5" aria-label="تحديث"><RefreshCw className="h-4 w-4"/></button></header>
    {error&&<div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
    {notice&&<div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{notice}</div>}
    <div className="space-y-4">{items.map(item=><article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] text-slate-400">{item.serialNumber}</span><StatusBadge value={item.status}/>{item.priority==="high"&&<span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">عاجل</span>}</div><h2 className="mt-2 text-lg font-black text-[#00102e]">{item.title}</h2><p className="mt-1 text-xs text-slate-500">العميل: {item.clientName||"—"} · {item.clientPhone||"لا يوجد هاتف"} · {new Date(item.createdAt).toLocaleString("ar-EG")}</p>{item.meetingUrl&&<a href={item.meetingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-black text-blue-700">فتح رابط Zoom</a>}</div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{canAssign && <select disabled={busy===item.id} defaultValue="" onChange={e=>e.target.value&&void assign(item.id,Number(e.target.value))} className="rounded-xl border border-slate-200 p-2.5 text-xs"><option value="">{item.assignedLawyerName||"اختيار المسؤول"}</option>{lawyers.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>}{canManage && (item.allowedStatusTransitions?.length ?? 0) > 0 ? <button type="button" disabled={busy===item.id} onClick={()=>{const allowed=(item.allowedStatusTransitions||[]).filter((value)=>dashboardFeatures.assignment||value!=="assigned");if(allowed.length)setStatusDialog({id:item.id,status:allowed[0],allowed,notes:"",visibleToClient:true});}} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-[#00102e]">تحديث الحالة</button>:<div className="rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-400">{canManage?"لا انتقال متاح":"عرض فقط"}</div>}<Link href={`/work/${item.id}`} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-[#00102e]"><ExternalLink className="h-4 w-4"/>فتح الطلب</Link>{meetings&&canSchedule&&<button disabled={busy===item.id} onClick={()=>setMeetingDialog({id:item.id,provider:item.meetingProvider||item.communicationChannel||"zoom",meetingUrl:item.meetingProvider==="zoom"?item.meetingUrl||"":"",preferredAt:item.meetingAt||item.preferredContactAt||null})} className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#00102e] px-3 py-2.5 text-xs font-black text-[#d5a84c]"><CalendarPlus className="h-4 w-4"/>تحديد موعد</button>}</div></div></article>)}{items.length===0&&<div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><UserRoundCheck className="mx-auto h-8 w-8 text-emerald-600"/><p className="mt-3 text-sm font-black text-slate-500">لا توجد استشارات حاليًا.</p></div>}</div>

    <AdminDialog open={Boolean(statusDialog)} title="تحديث حالة الاستشارة" description="اختر الحالة الجديدة، وأضف ملاحظة عند الحاجة. يمكنك تحديد ما إذا كانت الملاحظة ستظهر للعميل." onClose={()=>!busy&&setStatusDialog(null)}>
      {statusDialog&&<form onSubmit={submitStatus} className="space-y-4">
        <label className="block"><span className="mb-2 block text-xs font-black text-slate-600">الحالة</span><select value={statusDialog.status} onChange={e=>setStatusDialog({...statusDialog,status:e.target.value})} className="w-full rounded-xl border border-slate-200 p-3 text-sm">{statusDialog.allowed.map(s=><option key={s} value={s}>{statusLabels[s]??s}</option>)}</select></label>
        <label className="block"><span className="mb-2 block text-xs font-black text-slate-600">ملاحظة</span><textarea value={statusDialog.notes} onChange={e=>setStatusDialog({...statusDialog,notes:e.target.value})} maxLength={2000} placeholder="مثال: تم استلام المستندات وسيتم التواصل معك..." className="min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-xs font-bold text-slate-700"><input type="checkbox" checked={statusDialog.visibleToClient} onChange={e=>setStatusDialog({...statusDialog,visibleToClient:e.target.checked})} className="h-4 w-4 accent-[#986410]"/>إظهار الملاحظة للعميل وإرسال إشعار له</label>
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setStatusDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black">إلغاء</button><button disabled={busy===statusDialog.id} className="rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-[#d5a84c]">{busy===statusDialog.id?"جاري الحفظ...":"حفظ التحديث"}</button></div>
      </form>}
    </AdminDialog>

    <AdminDialog open={Boolean(meetingDialog)} title="تحديد موعد الاستشارة" description="اختر من المواعيد الفعلية المتاحة حسب جدول المكتب والسعة. العميل سيصله إشعار بعد الحفظ." onClose={()=>!busy&&setMeetingDialog(null)}>
      {meetingDialog&&<form onSubmit={submitMeeting} className="space-y-4">
        <label className="block"><span className="mb-2 block text-xs font-black text-slate-600">طريقة التواصل</span><div className="grid grid-cols-2 gap-2">{(["zoom","whatsapp"] as const).map(provider=><button key={provider} type="button" onClick={()=>setMeetingDialog({...meetingDialog,provider})} className={`rounded-xl border p-3 text-xs font-black ${meetingDialog.provider===provider?"border-[#986410] bg-[#986410]/10 text-[#986410]":"border-slate-200 text-slate-600"}`}>{provider==="zoom"?"Zoom":"واتساب"}</button>)}</div></label>
        {meetingAvailabilityLoading?<div className="rounded-xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-500">جاري تحميل المواعيد المتاحة...</div>:meetingAvailabilityError?<div className="rounded-xl bg-red-50 p-4 text-xs font-bold text-red-700">{meetingAvailabilityError}</div>:meetingDays.length===0?<div className="rounded-xl bg-amber-50 p-4 text-xs font-bold text-amber-800">لا توجد مواعيد متاحة لهذه القناة. راجع جدول الاستشارات في الإعدادات.</div>:<>
          <label className="block"><span className="mb-2 block text-xs font-black text-slate-600">اليوم</span><select value={meetingDay} onChange={e=>{const day=e.target.value;setMeetingDay(day);setMeetingStart(meetingDays.find((item)=>item.date===day)?.slots[0]?.start??"");}} className="w-full rounded-xl border border-slate-200 p-3 text-sm">{meetingDays.map((day)=><option key={day.date} value={day.date}>{day.label}</option>)}</select></label>
          <div><span className="mb-2 block text-xs font-black text-slate-600">الموعد المتاح</span><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{selectedMeetingDay?.slots.map((slot)=><button key={slot.slotKey} type="button" onClick={()=>setMeetingStart(slot.start)} className={`rounded-xl border p-3 text-xs font-black ${meetingStart===slot.start?"border-[#986410] bg-[#986410]/10 text-[#986410]":"border-slate-200 text-slate-600"}`}><span className="block">{slot.label}</span><span className="mt-1 block text-[9px] font-bold text-slate-400">متبقي {slot.remaining}</span></button>)}</div></div>
        </>}
        {meetingDialog.provider==="zoom"&&<label className="block"><span className="mb-2 block text-xs font-black text-slate-600">رابط Zoom</span><input type="url" value={meetingDialog.meetingUrl} onChange={e=>setMeetingDialog({...meetingDialog,meetingUrl:e.target.value})} required placeholder="https://zoom.us/j/..." className="w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>}
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setMeetingDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black">إلغاء</button><button disabled={busy===meetingDialog.id||meetingAvailabilityLoading||!meetingStart} className="rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-[#d5a84c] disabled:cursor-not-allowed disabled:opacity-50">{busy===meetingDialog.id?"جاري الحفظ...":"تأكيد الموعد"}</button></div>
      </form>}
    </AdminDialog>
  </div>;
}
