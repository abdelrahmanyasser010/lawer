"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, RefreshCw } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { getCurrentStaff } from "@/lib/adminAccess";
import { dashboardFeatures } from "@/config/dashboardFeatures";

type WorkItem = { id:number; serialNumber:string; requestType:string; title:string; status:string; priority:string; dueAt?:string; clientName?:string; assignedLawyerName?:string };
type Staff = { id:number; name:string; status:string };

const statuses = ["new","assigned","awaiting_client_info","meeting_scheduled","in_progress","client_review","revision_requested","completed","cancelled"];
const statusLabels: Record<string,string> = {
  new: "جديد", awaiting_payment: "بانتظار الدفع", assigned: "قيد المتابعة", awaiting_client_info: "بانتظار بيانات العميل",
  meeting_scheduled: "موعد محدد", in_progress: "قيد التنفيذ", client_review: "مراجعة العميل", revision_requested: "تعديل مطلوب", completed: "مكتمل", cancelled: "ملغي",
};


export default function WorkQueuePage() {
  const current = getCurrentStaff();
  const canAssign = dashboardFeatures.assignment && (current.role === "super_admin" || current.permissions.includes("requests.assign"));
  const canManage = current.role === "super_admin" || current.permissions.includes("requests.manage");
  const [items,setItems] = useState<WorkItem[]>([]);
  const [staff,setStaff] = useState<Staff[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState<number|null>(null);
  const [mine,setMine]=useState(dashboardFeatures.assignment && current.role === "lawyer");
  const [loaded,setLoaded]=useState(false);

  const load=useCallback(async()=>{
    setError("");
    try{
      const queue = await dashboardRequest<WorkItem[]>(`/api/v1/dashboard/work-queue?onlyMine=${mine}`);
      setItems(queue);
      if (canAssign) {
        const lawyers = await dashboardRequest<Staff[]>("/api/v1/admin/team/assignable-lawyers");
        setStaff(lawyers);
      } else setStaff([]);
    }catch(e){setError(e instanceof Error?e.message:"تعذر تحميل قائمة العمل");}
    finally{setLoaded(true);}
  },[mine,canAssign]);
  useEffect(()=>{void load();},[load]);
  const lawyers=useMemo(()=>staff.filter(s=>s.status!=="suspended"),[staff]);

  async function assign(id:number,lawyerId:number){
    setBusy(id);
    try{await dashboardRequest(`/api/v1/admin/service-requests/${id}/assign`,{method:"POST",body:JSON.stringify({lawyerId})});await load();}
    catch(e){setError(e instanceof Error?e.message:"تعذر الإسناد");}
    finally{setBusy(null);}
  }
  async function status(id:number,value:string){
    setBusy(id);
    try{await dashboardRequest(`/api/v1/admin/service-requests/${id}/status`,{method:"POST",body:JSON.stringify({status:value})});await load();}
    catch(e){setError(e instanceof Error?e.message:"تعذر تحديث الحالة");}
    finally{setBusy(null);}
  }

  if(error&&!loaded)return <div className="p-6 sm:p-8"><PageError message={error} onRetry={load}/></div>;
  if(!loaded)return <div className="p-6 sm:p-8"><PageLoading/></div>;
  return <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
    <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-black text-[#00102e]">قائمة عمل المكتب</h1><p className="text-sm text-slate-500">إنشاء عقود، مراجعات، واستشارات مرتبة حسب الأولوية والموعد.</p></div><div className="flex gap-2">{dashboardFeatures.assignment && <button onClick={()=>setMine(v=>!v)} className={`rounded-xl border px-4 py-2 text-xs font-black ${mine?"border-[#986410] bg-[#986410]/10 text-[#986410]":"border-slate-200 bg-white"}`}>المسند لي فقط</button>}<button onClick={()=>void load()} className="rounded-xl border border-slate-200 bg-white p-2.5"><RefreshCw className="h-4 w-4"/></button></div></header>
    {error&&<div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[950px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">الطلب</th><th className="p-4">العميل</th><th className="p-4">النوع</th><th className="p-4">الأولوية/الموعد</th>{dashboardFeatures.assignment && <th className="p-4">المحامي</th>}<th className="p-4">الحالة</th><th className="p-4">إجراءات</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(item=><tr key={item.id} className="align-top hover:bg-slate-50"><td className="p-4"><div className="font-mono text-[10px] text-slate-400">{item.serialNumber}</div><div className="mt-1 max-w-xs font-black text-[#00102e]">{item.title}</div></td><td className="p-4 font-bold text-slate-700">{item.clientName||"—"}</td><td className="p-4">{item.requestType}</td><td className="p-4"><span className={item.priority==="high"?"font-black text-red-700":"font-bold text-slate-600"}>{item.priority}</span><div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><CalendarClock className="h-3 w-3"/>{item.dueAt?new Date(item.dueAt).toLocaleString("ar-EG"):"بدون موعد"}</div></td>{dashboardFeatures.assignment && <td className="p-4">{canAssign?<select disabled={busy===item.id} defaultValue="" onChange={e=>e.target.value&&void assign(item.id,Number(e.target.value))} className="w-44 rounded-lg border border-slate-200 p-2"><option value="">{item.assignedLawyerName||"إسناد لمحامٍ"}</option>{lawyers.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>:<span className="font-bold text-slate-700">{item.assignedLawyerName||"غير مسند"}</span>}</td>}<td className="p-4"><StatusBadge value={item.status}/></td><td className="p-4">{canManage?<select disabled={busy===item.id} value={item.status} onChange={e=>void status(item.id,e.target.value)} className="rounded-lg border border-slate-200 p-2">{statuses.map(s=><option key={s} value={s}>{statusLabels[s] ?? s}</option>)}</select>:<span className="text-slate-400">عرض فقط</span>}</td></tr>)}</tbody></table></div>{items.length===0&&<div className="p-12 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600"/><p className="mt-3 font-black text-slate-600">لا توجد أعمال معلقة بهذا الفلتر</p></div>}</div>
  </div>;
}
