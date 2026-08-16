"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, MessageSquareText, Save, Tag } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";

type VariantPrice = { key:string; nameAr:string; description?:string; selfServicePriceEgp:number; lawyerAssistedPriceEgp:number };
type Template = { id:number; slug:string; nameAr:string; description:string; isActive:boolean; variants:VariantPrice[] };
type Setting = { key:string; value:unknown; isSecret:boolean; updatedAt:string };
type Toast = { kind:"success"|"error"; text:string } | null;

const servicePriceDefs = [
  { key:"services.consultation.fee_egp", label:"إجمالي مراجعة العقد", description:"المبلغ الكامل المطلوب لقيمة مراجعة العقد.", icon:MessageSquareText },
  { key:"services.consultation.deposit_egp", label:"عربون مراجعة العقد", description:"المبلغ المطلوب دفعه كعربون مبدئي لحجز موعد المراجعة.", icon:MessageSquareText },
  { key:"services.contract_drafting.deposit_egp", label:"عربون إعداد عقد بواسطة محامي", description:"العربون الموحد الذي يدفعه العميل عند طلب صياغة عقد بواسطة محامي المكتب.", icon:BriefcaseBusiness },
] as const;

function parseMoney(value:string) { const clean=value.replace(/[^0-9.]/g,""); const n=Number(clean); return Number.isFinite(n)&&n>=0?n:0; }
function keyOf(templateId:number,variantKey:string,kind:"self"|"lawyer"){return `${templateId}:${variantKey}:${kind}`;}

export default function PricingPage() {
  const [templates,setTemplates]=useState<Template[]>([]);
  const [settings,setSettings]=useState<Setting[]>([]);
  const [variantDraft,setVariantDraft]=useState<Record<string,string>>({});
  const [serviceDraft,setServiceDraft]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [toast,setToast]=useState<Toast>(null);

  const settingMap=useMemo(()=>Object.fromEntries(settings.map(item=>[item.key,item.value])),[settings]);
  const lawyerDeposit=parseMoney(serviceDraft["services.contract_drafting.deposit_egp"]??"0");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const [rows,settingRows]=await Promise.all([
        dashboardRequest<Template[]>("/api/v1/admin/templates"),
        dashboardRequest<Setting[]>("/api/v1/admin/settings"),
      ]);
      setTemplates(rows); setSettings(settingRows);
      const drafts:Record<string,string>={};
      rows.forEach(template=>template.variants.forEach(variant=>{
        drafts[keyOf(template.id,variant.key,"self")]=String(variant.selfServicePriceEgp);
        drafts[keyOf(template.id,variant.key,"lawyer")]=String(variant.lawyerAssistedPriceEgp);
      }));
      setVariantDraft(drafts);
      setServiceDraft(Object.fromEntries(servicePriceDefs.map(item=>[item.key,String(settingRows.find(row=>row.key===item.key)?.value ?? 0)])));
    }catch(caught){setError(caught instanceof Error?caught.message:"تعذر تحميل الأسعار");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(null),4500);return()=>window.clearTimeout(timer);},[toast]);

  async function save(){
    setBusy(true);setError("");setToast(null);
    try{
      let changed=false;
      for(const template of templates){
        const rows=template.variants.map(variant=>({
          variantKey:variant.key,
          selfServicePriceEgp:parseMoney(variantDraft[keyOf(template.id,variant.key,"self")]??"0"),
          lawyerAssistedPriceEgp:parseMoney(variantDraft[keyOf(template.id,variant.key,"lawyer")]??"0"),
        }));
        const hasChange=template.variants.some((variant,index)=>rows[index].selfServicePriceEgp!==Number(variant.selfServicePriceEgp)||rows[index].lawyerAssistedPriceEgp!==Number(variant.lawyerAssistedPriceEgp));
        if(hasChange){await dashboardRequest(`/api/v1/admin/templates/${template.id}`,{method:"PATCH",body:JSON.stringify({variantPrices:rows})});changed=true;}
      }
      const settingChanges=servicePriceDefs.map(def=>({key:def.key,value:parseMoney(serviceDraft[def.key]??"0"),isSecret:false})).filter(item=>Number(settingMap[item.key]??0)!==item.value);
      if(settingChanges.length){await dashboardRequest("/api/v1/admin/settings",{method:"PATCH",body:JSON.stringify({settings:settingChanges})});changed=true;}
      setToast({kind:"success",text:changed?"تم حفظ الأسعار. أي طلب أو عقد جديد سيأخذ Snapshot بالقيم الجديدة.":"لا توجد تغييرات جديدة للحفظ."});
      await load();
    }catch(caught){const message=caught instanceof Error?caught.message:"تعذر حفظ الأسعار";setError(message);setToast({kind:"error",text:message});}
    finally{setBusy(false);}
  }

  if(loading)return <div className="p-8"><PageLoading/></div>;
  if(error&&!templates.length&&!settings.length)return <div className="p-8"><PageError message={error} onRetry={load}/></div>;

  return <div className="mx-auto max-w-7xl space-y-5 p-5 sm:p-7">
    <header className="border-b border-slate-200 pb-4"><div className="flex items-center gap-2 text-[#986410]"><Tag className="h-4 w-4"/><span className="text-[11px] font-black">مركز التسعير</span></div><h1 className="mt-1 text-2xl font-black text-[#00102e]">أسعار العقود الفرعية</h1></header>
    {error&&<div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}

    <section className="grid gap-3 md:grid-cols-2">
      {servicePriceDefs.map(def=>{const Icon=def.icon;return <article key={def.key} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#986410]/10"><Icon className="h-5 w-5 text-[#986410]"/></div><div className="min-w-0 flex-1"><h3 className="text-xs font-black text-[#00102e]">{def.label}</h3><p className="mt-0.5 text-[9px] leading-4 text-slate-500">{def.description}</p></div><div className="w-36"><MoneyInput compact value={serviceDraft[def.key]??"0"} onChange={value=>setServiceDraft(old=>({...old,[def.key]:value}))}/></div></article>;})}
    </section>

    <section className="space-y-4">
      {templates.map(template=><article key={template.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3"><div><h2 className="text-sm font-black text-[#00102e]">{template.nameAr}</h2><p className="mt-0.5 text-[9px] leading-4 text-slate-500">{template.description}</p></div><StatusBadge value={template.isActive?"active":"suspended"}/></header>
        <div className="divide-y divide-slate-100">
          {template.variants.map(variant=>{
            const self=variantDraft[keyOf(template.id,variant.key,"self")]??"0";
            const lawyer=variantDraft[keyOf(template.id,variant.key,"lawyer")]??"0";
            const total=parseMoney(lawyer); const effectiveDeposit=Math.min(lawyerDeposit,total||lawyerDeposit); const remaining=total>0?Math.max(0,total-effectiveDeposit):0;
            return <div key={variant.key} className="grid items-center gap-4 px-4 py-3 lg:grid-cols-[minmax(200px,1fr)_120px_120px_180px]">
              <div><h3 className="text-xs font-black text-[#00102e]">{variant.nameAr}</h3><p className="mt-0.5 line-clamp-2 text-[9px] leading-4 text-slate-500">{variant.description}</p></div>
              <MoneyInput label="إعداد ذاتي" compact value={self} onChange={value=>setVariantDraft(old=>({...old,[keyOf(template.id,variant.key,"self")]:value}))}/>
              <MoneyInput label="بواسطة محامي" compact value={lawyer} onChange={value=>setVariantDraft(old=>({...old,[keyOf(template.id,variant.key,"lawyer")]:value}))}/>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-[9px] text-slate-500"><div className="flex justify-between gap-2"><span>العربون</span><b className="text-[#986410]">{effectiveDeposit.toLocaleString("ar-EG")} ج.م</b></div><div className="mt-1 flex justify-between gap-2"><span>المتبقي</span><b className="text-[#00102e]">{remaining.toLocaleString("ar-EG")} ج.م</b></div></div>
            </div>;
          })}
        </div>
      </article>)}
    </section>

    <div className="sticky bottom-4 flex justify-end"><button disabled={busy} onClick={()=>void save()} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-6 py-3 text-xs font-black text-[#d5a84c] shadow-xl disabled:opacity-60"><Save className="h-4 w-4"/>{busy?"جاري الحفظ...":"حفظ الأسعار"}</button></div>
    {toast&&<div role="status" className={`fixed bottom-5 left-5 right-5 z-[100] rounded-xl px-4 py-3 text-xs font-black shadow-2xl sm:right-auto sm:min-w-80 ${toast.kind==="success"?"bg-emerald-700 text-white":"bg-red-700 text-white"}`}>{toast.text}</div>}
  </div>;
}

function MoneyInput({value,onChange,label="السعر",compact=false}:{value:string;onChange:(value:string)=>void;label?:string;compact?:boolean}){return <label className="block text-[10px] font-black text-slate-500 text-center">{label}<div className="relative mt-2"><input type="text" inputMode="decimal" value={value} onChange={e=>onChange(e.target.value.replace(/[^0-9.]/g,""))} className={`w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-center font-black text-[#00102e] outline-none focus:border-[#986410] transition-colors ${compact?"py-2 text-sm":"py-3 text-lg"}`}/><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">ج.م</span></div></label>;}
