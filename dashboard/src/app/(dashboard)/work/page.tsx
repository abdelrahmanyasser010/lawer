"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarClock, CheckCircle2, ExternalLink, RefreshCw, Search } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { getCurrentStaff } from "@/lib/adminAccess";
import { dashboardFeatures } from "@/config/dashboardFeatures";

type WorkItem={id:number;serialNumber:string;requestType:string;title:string;status:string;priority:string;dueAt?:string;meetingAt?:string;clientName?:string;assignedLawyerName?:string};
type Staff={id:number;name:string;status:string};
const requestTypeLabels:Record<string,string>={consultation:"استشارة قانونية",contract_review:"مراجعة عقد أو مستند",contract_drafting:"إعداد عقد بواسطة محامي المكتب"};
const priorityLabels:Record<string,string>={normal:"عادية",high:"عاجلة"};
const queueLabels:Record<string,string>={needs_attention:"تحتاج إجراء من الإدارة",awaiting_client:"بانتظار العميل",meetings_today:"مواعيد اليوم",overdue:"متأخرة"};

export default function WorkQueuePage(){
  const searchParams=useSearchParams();
  const current=getCurrentStaff();
  const canAssign=dashboardFeatures.assignment&&(current.role==="super_admin"||current.permissions.includes("requests.assign"));
  const [items,setItems]=useState<WorkItem[]>([]),[staff,setStaff]=useState<Staff[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState<number|null>(null),[loaded,setLoaded]=useState(false);
  const [mine,setMine]=useState(dashboardFeatures.assignment&&current.role==="lawyer");
  const [queue,setQueue]=useState(searchParams.get("queue")||"");
  const [requestType,setRequestType]=useState("");
  const [priority,setPriority]=useState("");
  const [query,setQuery]=useState("");

  useEffect(()=>{setQueue(searchParams.get("queue")||"");},[searchParams]);
  const load=useCallback(async()=>{
    setError("");
    try{
      const params=new URLSearchParams({onlyMine:String(mine)});if(queue)params.set("queue",queue);if(requestType)params.set("requestType",requestType);if(priority)params.set("priority",priority);if(query.trim())params.set("search",query.trim());
      setItems(await dashboardRequest<WorkItem[]>(`/api/v1/dashboard/work-queue?${params.toString()}`));
      if(canAssign)setStaff(await dashboardRequest<Staff[]>("/api/v1/admin/team/assignable-lawyers"));else setStaff([]);
    }catch(e){setError(e instanceof Error?e.message:"تعذر تحميل مركز المتابعة");}
    finally{setLoaded(true);}
  },[mine,canAssign,queue,requestType,priority,query]);
  useEffect(()=>{void load();},[mine,queue,requestType,priority]);
  const lawyers=useMemo(()=>staff.filter(item=>item.status!=="suspended"),[staff]);
  async function assign(id:number,lawyerId:number){setBusy(id);try{await dashboardRequest(`/api/v1/admin/service-requests/${id}/assign`,{method:"POST",body:JSON.stringify({lawyerId})});await load();}catch(e){setError(e instanceof Error?e.message:"تعذر تحديث المسؤول");}finally{setBusy(null);}}
  if(error&&!loaded)return <div className="p-6 sm:p-8"><PageError message={error} onRetry={load}/></div>;if(!loaded)return <div className="p-6 sm:p-8"><PageLoading/></div>;
  return <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
    <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-black text-[#00102e]">مركز المتابعة</h1><p className="text-sm text-slate-500">صندوق موحد لطلبات الخدمات النشطة، مع فلاتر توضح من عليه الإجراء الآن.</p></div><div className="flex gap-2">{dashboardFeatures.assignment&&<button onClick={()=>setMine(v=>!v)} className={`rounded-xl border px-4 py-2 text-xs font-black ${mine?"border-[#986410] bg-[#986410]/10 text-[#986410]":"border-slate-200 bg-white"}`}>المسؤول عنها أنا فقط</button>}<button onClick={()=>void load()} className="rounded-xl border border-slate-200 bg-white p-2.5" aria-label="تحديث"><RefreshCw className="h-4 w-4"/></button></div></header>
    {error&&<div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_190px_190px_160px_auto]"><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void load()} placeholder="بحث برقم الطلب أو العميل" className="w-full bg-transparent py-2.5 text-xs outline-none"/></label><select value={queue} onChange={e=>setQueue(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"><option value="">كل الطلبات النشطة</option>{Object.entries(queueLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><select value={requestType} onChange={e=>setRequestType(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"><option value="">كل أنواع الخدمات</option>{Object.entries(requestTypeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><select value={priority} onChange={e=>setPriority(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"><option value="">كل الأولويات</option><option value="high">عاجلة</option><option value="normal">عادية</option></select><button onClick={()=>void load()} className="rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white">بحث</button></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">الطلب</th><th className="p-4">العميل</th><th className="p-4">النوع</th><th className="p-4">الأولوية والموعد</th>{dashboardFeatures.assignment&&<th className="p-4">المسؤول</th>}<th className="p-4">الحالة</th><th className="p-4">المتابعة</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(item=><tr key={item.id} className="align-top hover:bg-slate-50"><td className="p-4"><div className="font-mono text-[10px] text-slate-400">{item.serialNumber}</div><div className="mt-1 max-w-xs font-black text-[#00102e]">{item.title}</div></td><td className="p-4 font-bold text-slate-700">{item.clientName||"—"}</td><td className="p-4 font-bold text-slate-600">{requestTypeLabels[item.requestType]||"طلب خدمة"}</td><td className="p-4"><span className={item.priority==="high"?"font-black text-red-700":"font-bold text-slate-600"}>{priorityLabels[item.priority]||"عادية"}</span><div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><CalendarClock className="h-3 w-3"/>{(item.meetingAt||item.dueAt)?new Date(item.meetingAt||item.dueAt||"").toLocaleString("ar-EG"):"لا يوجد موعد مؤكد"}</div></td>{dashboardFeatures.assignment&&<td className="p-4">{canAssign?<select disabled={busy===item.id} defaultValue="" onChange={e=>e.target.value&&void assign(item.id,Number(e.target.value))} className="w-44 rounded-lg border border-slate-200 p-2"><option value="">{item.assignedLawyerName||"اختيار المسؤول"}</option>{lawyers.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>:<span className="font-bold text-slate-700">{item.assignedLawyerName||"غير محدد"}</span>}</td>}<td className="p-4"><StatusBadge value={item.status}/></td><td className="p-4"><Link href={`/work/${item.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-black text-[#00102e]"><ExternalLink className="h-3.5 w-3.5"/>فتح ومتابعة</Link></td></tr>)}</tbody></table></div>{items.length===0&&<div className="p-12 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600"/><p className="mt-3 font-black text-slate-600">لا توجد طلبات مطابقة للفلاتر الحالية.</p></div>}</div>
  </div>;
}
