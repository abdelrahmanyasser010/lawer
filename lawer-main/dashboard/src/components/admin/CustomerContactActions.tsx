"use client";

import { useEffect, useState } from "react";
import { Check, Copy as Clipboard, MessageCircle, Phone } from "lucide-react";

type Props={phone?:string|null;whatsapp?:string|null;whatsappAllowed?:boolean;compact?:boolean};

export default function CustomerContactActions({phone,whatsapp,whatsappAllowed=true,compact=false}:Props){
  const [copied,setCopied]=useState(false);
  const wa=whatsappAllowed?(whatsapp||"").replace(/\D/g,""):"";
  useEffect(()=>{if(!copied)return;const t=window.setTimeout(()=>setCopied(false),1800);return()=>window.clearTimeout(t);},[copied]);
  async function copyPhone(){if(!phone)return;await navigator.clipboard.writeText(phone);setCopied(true);}
  if(!phone&&!wa)return <span className="text-[10px] font-bold text-slate-400">لا توجد وسيلة تواصل مسجلة</span>;
  return <div className="relative flex flex-wrap items-center gap-1.5">
    {!!wa&&<a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 font-black text-emerald-800 ${compact?"px-2 py-1.5 text-[9px]":"px-3 py-2 text-xs"}`}><MessageCircle className={compact?"h-3 w-3":"h-4 w-4"}/>واتساب</a>}
    {!!phone&&<><a href={`tel:${phone}`} className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white font-black text-slate-700 ${compact?"px-2 py-1.5 text-[9px]":"px-3 py-2 text-xs"}`}><Phone className={compact?"h-3 w-3":"h-4 w-4"}/>اتصال</a><button type="button" onClick={()=>void copyPhone()} title="نسخ الرقم" aria-label="نسخ الرقم" className={`rounded-lg border border-slate-200 bg-white text-slate-500 ${compact?"p-1.5":"p-2"}`}>{copied?<Check className={`${compact?"h-3 w-3":"h-4 w-4"} text-emerald-600`}/>:<Clipboard className={compact?"h-3 w-3":"h-4 w-4"}/>}</button></>}
    {copied&&<span role="status" className="absolute -bottom-7 left-0 z-30 rounded-lg bg-[#00102e] px-2.5 py-1.5 text-[9px] font-black text-white shadow-lg">تم نسخ الرقم</span>}
  </div>;
}
