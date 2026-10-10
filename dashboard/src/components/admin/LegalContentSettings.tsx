"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Save } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";

type LegalKey="about_us"|"terms_and_conditions"|"privacy_policy"|"refund_cancellation_policy";
type LegalRow={key:LegalKey;title:string;body:string;isPublished:boolean;publishedVersion?:number|null;publishedAt?:string|null;updatedAt?:string|null};
const labels:Record<LegalKey,string>={about_us:"من نحن",terms_and_conditions:"الشروط والأحكام",privacy_policy:"سياسة الخصوصية",refund_cancellation_policy:"سياسة الإلغاء والاسترداد"};

export default function LegalContentSettings(){
  const [items,setItems]=useState<LegalRow[]>([]),[selected,setSelected]=useState<LegalKey>("terms_and_conditions"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const load=useCallback(async()=>{setError("");try{setItems(await dashboardRequest<LegalRow[]>("/api/v1/admin/legal-content"));}catch(caught){setError(caught instanceof Error?caught.message:"تعذر تحميل المحتوى القانوني");}},[]);
  useEffect(()=>{void load();},[load]);
  const current=items.find(x=>x.key===selected)??{key:selected,title:labels[selected],body:"",isPublished:false,publishedVersion:null,publishedAt:null};
  async function save(){setBusy(true);setError("");setNotice("");try{await dashboardRequest(`/api/v1/admin/legal-content/${selected}`,{method:"PUT",body:JSON.stringify({title:current.title,body:current.body,isPublished:current.isPublished})});setNotice(current.isPublished?"تم حفظ ونشر النسخة الجديدة. النسخة المنشورة السابقة تظل محفوظة لسجل الموافقات.":"تم حفظ المحتوى كغير منشور.");await load();}catch(caught){setError(caught instanceof Error?caught.message:"تعذر حفظ المحتوى");}finally{setBusy(false);}}
  function patch(next:Partial<LegalRow>){setItems(old=>{const exists=old.some(x=>x.key===selected);const base=current;return exists?old.map(x=>x.key===selected?{...x,...next}:x):[...old,{...base,...next}];});}
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#986410]/10"><FileText className="h-5 w-5 text-[#986410]"/></div><div><h2 className="text-lg font-black text-[#00102e]">المحتوى القانوني للمنصة</h2><p className="mt-1 text-xs leading-5 text-slate-500">النسخة المنشورة تظهر تلقائيًا في الفرونت. التسجيل يستخدم الشروط والخصوصية، والدفع يعرض الشروط وسياسة الإلغاء والاسترداد.</p></div></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="space-y-2">{(Object.keys(labels) as LegalKey[]).map(key=><button key={key} type="button" onClick={()=>setSelected(key)} className={`w-full rounded-xl border px-4 py-3 text-right text-xs font-black ${selected===key?"border-[#986410] bg-[#986410]/10 text-[#986410]":"border-slate-200 text-slate-600"}`}>{labels[key]}</button>)}</div>
      <div className="space-y-4 rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs font-black text-slate-500">{labels[selected]}</div><div className="mt-1 text-[11px] text-slate-500">{current.publishedVersion?`النسخة المنشورة v${current.publishedVersion}`:"لم تُنشر نسخة بعد"}{current.publishedAt?` · ${new Date(current.publishedAt).toLocaleString("ar-EG")}`:""}</div></div><label className="flex items-center gap-2 text-xs font-black text-slate-700"><input type="checkbox" checked={current.isPublished} onChange={e=>patch({isPublished:e.target.checked})} className="h-4 w-4 accent-[#986410]"/>منشور</label></div><input value={current.title} onChange={e=>patch({title:e.target.value})} placeholder="العنوان" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold"/><textarea value={current.body} onChange={e=>patch({body:e.target.value})} placeholder="اكتب المحتوى هنا..." className="min-h-72 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-7"/>{error&&<div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}{notice&&<div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{notice}</div>}<div className="flex justify-end"><button type="button" disabled={busy} onClick={()=>void save()} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-[#d7a94f] disabled:opacity-50"><Save className="h-4 w-4"/>{busy?"جاري الحفظ...":"حفظ المحتوى"}</button></div></div>
    </div>
  </section>;
}
