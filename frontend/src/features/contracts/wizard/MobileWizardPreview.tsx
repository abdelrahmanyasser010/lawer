"use client";

import { FileText, X } from "lucide-react";

export interface MobilePreviewRow { label: string; value: string; }

export default function MobileWizardPreview({ open, onClose, title, serial, contractDate, court, rows, annexes }: {
  open:boolean; onClose:()=>void; title:string; serial:string; contractDate:string; court:string; rows:MobilePreviewRow[]; annexes:string[];
}) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#00102e]/75 p-0 backdrop-blur-sm sm:items-center sm:p-4 xl:hidden" dir="rtl">
    <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 pb-4 backdrop-blur">
        <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-[#986410]"/><div><h2 className="text-sm font-black text-[#00102e]">معاينة بيانات العقد</h2><p className="font-mono text-[9px] text-slate-400">{serial}</p></div></div>
        <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-600"><X className="h-4 w-4"/></button>
      </header>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs leading-7 text-slate-700">
        <div className="border-b-2 border-[#00102e] pb-4 text-center"><div className="text-[9px] font-black text-[#986410]">Z draft</div><h3 className="mt-1 text-lg font-black text-[#00102e]">{title}</h3></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <PreviewItem label="تاريخ العقد" value={contractDate || "لم يتم تحديده"}/>
          <PreviewItem label="المحكمة المختصة" value={court || "لم يتم اختيارها"}/>
          {rows.slice(0,24).map((row,index)=><PreviewItem key={`${row.label}-${index}`} label={row.label} value={row.value}/>) }
        </div>
        {annexes.length>0&&<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><div className="text-[10px] font-black text-emerald-900">الملاحق التي ستُطبع مع العقد كقوالب فارغة</div><div className="mt-2 flex flex-wrap gap-1.5">{annexes.map(name=><span key={name} className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-emerald-800">{name}</span>)}</div></div>}
        <p className="mt-4 text-[10px] leading-5 text-slate-500">هذه معاينة عند الطلب وليست Live Preview دائمًا. النسخة القانونية النهائية تُنشأ بعد إكمال البيانات واعتماد الدفع.</p>
      </div>
      <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl bg-[#00102e] py-3 text-xs font-black text-[#d9a84e]">العودة لإدخال البيانات</button>
    </section>
  </div>;
}

function PreviewItem({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><span className="block text-[9px] font-bold text-slate-400">{label}</span><strong className="mt-0.5 block break-words text-[11px] text-[#00102e]">{value}</strong></div>;}
