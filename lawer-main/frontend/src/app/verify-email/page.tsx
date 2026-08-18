"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MailWarning, RefreshCw, ShieldCheck } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { frontendApi, ApiClientError } from "@/lib/apiClient";
import { safeInternalRedirect } from "@/lib/safeRedirect";

type ViewState = "waiting" | "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [code,setCode]=useState("");
  const [state,setState]=useState<ViewState>("waiting");
  const [message,setMessage]=useState("أدخل رمز التأكيد المكوّن من 6 أرقام المرسل إلى بريدك. الرمز صالح لمدة 10 دقائق.");
  const [resending,setResending]=useState(false);
  const [resendAfter,setResendAfter]=useState(60);
  const nextUrl=useMemo(()=>{
    if(typeof window==="undefined")return "/contracts";
    const raw=new URLSearchParams(window.location.search).get("next");
    return safeInternalRedirect(raw,"/contracts");
  },[]);

  useEffect(()=>{
    if(resendAfter<=0)return;
    const timer=window.setInterval(()=>setResendAfter((value)=>Math.max(0,value-1)),1000);
    return()=>window.clearInterval(timer);
  },[resendAfter]);

  async function verify(event:React.FormEvent){
    event.preventDefault();
    if(!/^\d{6}$/.test(code)){setState("error");setMessage("أدخل رمز التأكيد المكوّن من 6 أرقام.");return;}
    setState("loading");setMessage("جاري التحقق من الرمز...");
    try{
      await frontendApi.verifyEmail(code);setState("success");setMessage("تم تأكيد بريدك الإلكتروني بنجاح.");window.dispatchEvent(new Event("zdraft-auth-changed"));
    }catch(caught){setState("error");setMessage(caught instanceof ApiClientError?caught.message:"تعذر تأكيد البريد.");}
  }

  async function resend(){
    if(resendAfter>0)return;
    setResending(true);
    try{
      const result=await frontendApi.requestVerification();
      if(result.alreadyVerified){setState("success");setMessage("البريد الإلكتروني مؤكد بالفعل.");}
      else{setCode("");setState("waiting");setResendAfter(Math.max(30,Number(result.resendAfterSeconds||60)));setMessage(`تم إرسال رمز جديد. صلاحيته ${result.expiresMinutes??10} دقائق. راجع البريد الوارد والرسائل غير المرغوب فيها.`);}
    }catch(caught){setState("error");setMessage(caught instanceof Error?caught.message:"تعذر إعادة إرسال الرمز.");}
    finally{setResending(false);}
  }

  return <AuthShell title="تأكيد البريد الإلكتروني" subtitle="هذه الخطوة مطلوبة قبل الدفع أو إرسال طلب للمكتب، بينما يمكنك حفظ مسودة العقد قبل التأكيد.">
    <div className={`rounded-2xl border p-4 text-xs font-bold leading-6 ${state==="error"?"border-red-200 bg-red-50 text-red-700":state==="success"?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-slate-200 bg-white text-slate-600"}`}>{state==="error"&&<MailWarning className="mb-2 h-5 w-5"/>}{state==="success"&&<CheckCircle2 className="mb-2 h-5 w-5"/>}{message}</div>
    {state!=="success"&&<form onSubmit={verify} className="mt-5 space-y-4">
      <label className="block text-xs font-black text-slate-700">رمز التأكيد<div className="relative mt-2"><ShieldCheck className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/><input autoFocus value={code} onChange={(e)=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} placeholder="000000" className="w-full rounded-2xl border border-slate-300 py-3.5 pl-4 pr-12 text-center text-2xl font-black tracking-[.35em] text-[#00102e] outline-none focus:border-[#986410]"/></div></label>
      <button disabled={state==="loading"||code.length!==6} className="inline-flex w-full items-center justify-center rounded-2xl bg-[#00102e] px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">{state==="loading"?<><Loader2 className="ml-2 h-4 w-4 animate-spin"/> جاري التحقق...</>:"تأكيد البريد"}</button>
    </form>}
    <div className="mt-5 text-center">{state==="success"?<Link href={nextUrl} className="inline-flex rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-white">متابعة</Link>:<button disabled={resending||state==="loading"||resendAfter>0} onClick={()=>void resend()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black text-[#00102e] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${resending?"animate-spin":""}`}/>{resendAfter>0?`إعادة الإرسال بعد ${resendAfter} ث`:`إعادة إرسال الرمز`}</button>}</div>
  </AuthShell>;
}
