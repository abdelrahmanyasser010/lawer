"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { getCurrentStaff } from "@/lib/adminAccess";
import { dashboardFeatures } from "@/config/dashboardFeatures";

type WorkItem={
  id:number; serialNumber:string; requestType:string; requestPurpose?:"review"|"consultation"|null; title:string;
  contractTypeText?:string|null; selectedContractTypeName?:string|null; status:string; customerFacingStatus?:string|null;
  paymentStatus?:string|null; deliveryStatus?:string|null; nextCustomerAction?:{label:string}|null; priority:string;
  updatedAt?:string; createdAt?:string; clientName?:string; assignedLawyerId?:number|null; assignedLawyerName?:string|null;
};
type Staff={id:number;name:string;status:string};
const serviceLabels:Record<string,string>={contract_review:"مراجعة / استشارة بخصوص عقد",contract_drafting:"صياغة بواسطة محامي",self_service_lawyer_review:"مراجعة محامي قبل إصدار Self-Service"};

export default function WorkQueuePage(){
  const searchParams=useSearchParams();
  const current=getCurrentStaff();
  const canAssign=dashboardFeatures.assignment&&(current.role==="super_admin"||current.permissions.includes("requests.assign"));
  const [items,setItems]=useState<WorkItem[]>([]),[staff,setStaff]=useState<Staff[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState<number|null>(null),[loaded,setLoaded]=useState(false);
  const [mine,setMine]=useState(dashboardFeatures.assignment&&current.role==="lawyer");
  const [queue,setQueue]=useState(searchParams.get("queue")||"");
  const [serviceType,setServiceType]=useState(searchParams.get("serviceType")||"");
  const [lawyerId,setLawyerId]=useState("");
  const [paymentStatus,setPaymentStatus]=useState("");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const [query,setQuery]=useState("");

  useEffect(()=>{setQueue(searchParams.get("queue")||"");setServiceType(searchParams.get("serviceType")||"");},[searchParams]);
  const load=useCallback(async()=>{
    setError("");
    try{
      const params=new URLSearchParams({onlyMine:String(mine)});
      if(queue)params.set("queue",queue); if(serviceType)params.set("serviceType",serviceType); if(lawyerId)params.set("assignedLawyerId",lawyerId);
      if(paymentStatus)params.set("paymentStatus",paymentStatus); if(from)params.set("from",from); if(to)params.set("to",to); if(query.trim())params.set("search",query.trim());
      setItems(await dashboardRequest<WorkItem[]>(`/api/v1/dashboard/work-queue?${params.toString()}`));
      if(canAssign)setStaff(await dashboardRequest<Staff[]>("/api/v1/admin/team/assignable-lawyers")); else setStaff([]);
    }catch(e){setError(e instanceof Error?e.message:"تعذر تحميل مركز المتابعة");}
    finally{setLoaded(true);}
  },[mine,canAssign,queue,serviceType,lawyerId,paymentStatus,from,to,query]);
  useEffect(()=>{void load();},[mine,queue,serviceType,lawyerId,paymentStatus,from,to]);
  const lawyers=useMemo(()=>staff.filter(item=>item.status!=="suspended"),[staff]);
  async function assign(id:number,lawyer:number){setBusy(id);try{await dashboardRequest(`/api/v1/admin/service-requests/${id}/assign`,{method:"POST",body:JSON.stringify({lawyerId:lawyer})});await load();}catch(e){setError(e instanceof Error?e.message:"تعذر تحديث المسؤول");}finally{setBusy(null);}}

  if(error&&!loaded)return <div className="p-6 sm:p-8"><PageError message={error} onRetry={load}/></div>;
  if(!loaded)return <div className="p-6 sm:p-8"><PageLoading/></div>;

  return <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
    <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center"><div><h1 className="text-2xl sm:text-3xl font-black text-[#00102e]">مركز تشغيل الخدمات</h1><p className="text-sm text-slate-500">قائمة واحدة لصياغة المحامي والمراجعة/الاستشارة ومراجعة Self-Service، من غير شاشات مكررة.</p></div><div className="flex gap-2">{dashboardFeatures.assignment&&<button onClick={()=>setMine(v=>!v)} className={`rounded-xl border px-4 py-2 text-xs font-black ${mine?"border-[#986410] bg-[#986410]/10 text-[#986410]":"border-slate-200 bg-white"}`}>المسؤول عنها أنا فقط</button>}<button onClick={()=>void load()} className="rounded-xl border border-slate-200 bg-white p-2.5" aria-label="تحديث"><RefreshCw className="h-4 w-4"/></button></div></header>
    {error&&<div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_170px_190px_170px_170px_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void load()} placeholder="اسم العميل أو رقم الطلب" className="w-full bg-transparent py-2.5 text-xs outline-none"/></label>
        <select value={queue} onChange={e=>setQueue(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"><option value="">كل الحالات</option><option value="new">جديدة</option><option value="unassigned">تنتظر تعيين</option><option value="with_lawyer">عند المحامي</option><option value="awaiting_payment">تنتظر دفع</option><option value="ready_delivery">جاهزة للتسليم</option><option value="completed">مكتملة</option><option value="cancelled">ملغاة</option></select>
        <select value={serviceType} onChange={e=>setServiceType(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"><option value="">كل الخدمات</option>{Object.entries(serviceLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        <select value={lawyerId} onChange={e=>setLawyerId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"><option value="">كل المحامين</option>{lawyers.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"><option value="">كل حالات الدفع</option><option value="unpaid">غير مدفوع</option><option value="partially_paid">مدفوع جزئيًا</option><option value="paid">مدفوع</option><option value="refund_pending">جاري الاسترداد</option><option value="refunded">مسترد</option></select>
        <button type="button" onClick={()=>void load()} className="rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-white">بحث</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"><span className="text-[10px] font-black text-slate-400">التاريخ</span><label className="flex items-center gap-2 text-xs font-bold text-slate-500">من<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"/></label><label className="flex items-center gap-2 text-xs font-bold text-slate-500">إلى<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"/></label>{(from||to)&&<button type="button" onClick={()=>{setFrom("");setTo("");}} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-500">مسح التاريخ</button>}</div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">الطلب</th><th className="p-4">العميل</th><th className="p-4">الخدمة</th><th className="p-4">نوع العقد</th>{dashboardFeatures.assignment&&<th className="p-4">المحامي</th>}<th className="p-4">حالة الخدمة</th><th className="p-4">الدفع</th><th className="p-4">المطلوب حاليًا</th><th className="p-4">آخر تحديث</th><th className="p-4"></th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(item=>{const purpose=item.requestType==="contract_review"?(item.requestPurpose==="consultation"?"استشارة":"مراجعة"):null;const contractType=item.requestType==="contract_review"?item.contractTypeText:item.selectedContractTypeName;return <tr key={item.id} className="align-top hover:bg-slate-50"><td className="p-4"><div className="font-mono text-xs text-slate-500">{item.serialNumber}</div><div className="mt-1 max-w-xs font-black text-[#00102e]">{item.title}</div></td><td className="p-4 font-bold text-slate-700">{item.clientName||"—"}</td><td className="p-4"><div className="font-black text-slate-700">{serviceLabels[item.requestType]||"طلب خدمة"}</div>{purpose&&<span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-black ${purpose==="استشارة"?"bg-blue-50 text-blue-700":"bg-amber-50 text-amber-800"}`}>{purpose}</span>}</td><td className="p-4 font-bold text-slate-600">{contractType||"—"}</td>{dashboardFeatures.assignment&&<td className="p-4">{canAssign?<select disabled={busy===item.id} value={item.assignedLawyerId||""} onChange={e=>e.target.value&&void assign(item.id,Number(e.target.value))} className="w-44 rounded-lg border border-slate-200 p-2"><option value="">{item.assignedLawyerName||"اختيار المحامي"}</option>{lawyers.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>:<span className="font-bold text-slate-700">{item.assignedLawyerName||"غير محدد"}</span>}</td>}<td className="p-4"><div className="font-black text-[#00102e]">{item.customerFacingStatus||item.status}</div><div className="mt-1"><StatusBadge value={item.status}/></div></td><td className="p-4"><StatusBadge value={item.paymentStatus||"unpaid"}/></td><td className="p-4 font-bold text-slate-600">{item.nextCustomerAction?.label||"لا يوجد إجراء مطلوب"}</td><td className="p-4 whitespace-nowrap text-slate-500">{new Date(item.updatedAt||item.createdAt||Date.now()).toLocaleString("ar-EG")}</td><td className="p-4"><Link href={`/work/${item.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-black text-[#00102e]"><ExternalLink className="h-3.5 w-3.5"/>فتح</Link></td></tr>})}</tbody></table></div>{items.length===0&&<div className="p-12 text-center text-sm font-bold text-slate-500">لا توجد طلبات مطابقة للفلاتر الحالية.</div>}</div>
  </div>;
}
