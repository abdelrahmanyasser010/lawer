"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, BriefcaseBusiness, CreditCard, FileText, Plus } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading } from "@/components/admin/PageFeedback";
import { dashboardFeatures } from "@/config/dashboardFeatures";

type Summary = {
  contracts:{total:number;active:number;issued:number;office:number};
  requests:{total:number;needs_attention:number;unassigned:number;awaiting_client:number;meetings_today:number;overdue:number};
  payments:{pending:number;approved_month:number};
  notifications:{unread:number};
};

export default function AdminOverviewPage(){
  const [data,setData]=useState<Summary|null>(null),[error,setError]=useState("");
  const load=useCallback(()=>{setError("");dashboardRequest<Summary>("/api/v1/dashboard/summary").then(setData).catch(e=>setError(e instanceof Error?e.message:"تعذر تحميل المؤشرات"));},[]);
  useEffect(load,[load]);
  if(error)return <div className="p-6 sm:p-8"><PageError message={error} onRetry={load}/></div>;
  if(!data)return <div className="p-6 sm:p-8"><PageLoading/></div>;
  const cards=[
    ["إجمالي العقود",data.contracts.total,FileText,`${data.contracts.active} قيد العمل`,"/contracts"],
    ["العقود النشطة",data.contracts.active,BriefcaseBusiness,`${data.contracts.issued} عقد صادر`,"/contracts?group=attention"],
    ["مدفوعات تحتاج مراجعة",data.payments.pending,CreditCard,`${Number(data.payments.approved_month).toLocaleString("ar-EG")} ج.م هذا الشهر`,"/payments?status=pending_verification"],
    ["إشعارات غير مقروءة",data.notifications.unread,Bell,"متابعة تنبيهات العمل","/notifications"],
  ] as const;
  return <div className="mx-auto max-w-7xl space-y-7 p-6 sm:p-8">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center"><div><p className="text-xs font-black text-[#986410]">مركز تشغيل Z draft</p><h1 className="mt-1 text-3xl font-black text-[#00102e]">الأعمال التي تحتاج انتباهك الآن</h1><p className="mt-1 text-sm text-slate-500">مؤشرات تشغيلية حقيقية، وكل مؤشر يفتح نفس مجموعة البيانات المرتبطة به.</p></div>{dashboardFeatures.officeContractCreation&&<Link href="/contracts/create" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-sm font-black text-[#d5a84c]"><Plus className="h-4 w-4"/>إنشاء عقد من المكتب</Link>}</div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title,value,Icon,note,href])=><Link href={href} key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#986410]/40"><div className="flex items-center justify-between"><span className="text-xs font-black text-slate-500">{title}</span><Icon className="h-5 w-5 text-[#986410]"/></div><div className="mt-4 text-3xl font-black text-[#00102e]">{value}</div><div className="mt-2 text-xs font-bold text-slate-400">{note}</div></Link>)}</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-[#00102e]">مركز المتابعة</h2><p className="mt-1 text-[10px] font-bold text-slate-400">اضغط على أي حالة لفتح الطلبات المفلترة بنفس تعريف العداد.</p></div><Link href="/work" className="text-xs font-black text-[#986410]">عرض الكل</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="تحتاج إجراء من الإدارة" value={data.requests.needs_attention??data.requests.unassigned} href="/work?queue=needs_attention"/><Metric label="بانتظار العميل" value={data.requests.awaiting_client} href="/work?queue=awaiting_client"/><Metric label="مواعيد اليوم" value={data.requests.meetings_today} href="/work?queue=meetings_today"/><Metric label="طلبات متأخرة" value={data.requests.overdue} href="/work?queue=overdue" danger/></div></section>
  </div>;
}
function Metric({label,value,href,danger=false}:{label:string;value:number;href:string;danger?:boolean}){return <Link href={href} className={`rounded-xl border p-4 transition hover:-translate-y-0.5 ${danger?"border-red-200 bg-red-50":"border-slate-200 bg-slate-50"}`}><div className={`text-2xl font-black ${danger?"text-red-700":"text-[#00102e]"}`}>{value}</div><div className="mt-1 text-xs font-bold text-slate-500">{label}</div></Link>;}
