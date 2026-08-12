"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { frontendApi, ApiClientError } from "@/lib/apiClient";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
import { passwordValidationError } from "@/lib/inputValidation";

function ResetPasswordContent() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setNotice(null);
    const passwordError = passwordValidationError(password); if (passwordError) return setNotice(passwordError);
    if (password !== confirm) return setNotice("كلمتا المرور غير متطابقتين.");
    const token = params.get("token"); if (!token) return setNotice("رابط إعادة التعيين غير مكتمل.");
    setLoading(true);
    try { await frontendApi.resetPassword(token, password); setDone(true); setNotice("تم تغيير كلمة المرور بنجاح."); }
    catch (error) { setNotice(error instanceof ApiClientError ? error.message : "تعذر تغيير كلمة المرور."); }
    finally { setLoading(false); }
  }
  return <AuthShell title="تعيين كلمة مرور جديدة" subtitle="استخدم كلمة مرور من 8 أحرف على الأقل وتحتوي على حرف ورقم.">
    {notice && <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold leading-6 text-slate-700">{notice}</div>}
    {done ? <Link href="/login" className="mt-5 block rounded-2xl bg-[#00102e] py-3.5 text-center text-sm font-black text-white">تسجيل الدخول</Link> : <form onSubmit={submit} className="mt-4 space-y-4">
      {[{label:"كلمة المرور الجديدة",value:password,set:setPassword},{label:"تأكيد كلمة المرور",value:confirm,set:setConfirm}].map((field)=><label key={field.label} className="block text-xs font-black text-slate-700">{field.label}<div className="relative mt-2"><Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input type={show?"text":"password"} minLength={8} maxLength={128} required value={field.value} onChange={(e)=>field.set(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-11 text-sm outline-none focus:border-[#986410] focus:ring-2 focus:ring-[#986410]/10"/><button type="button" onClick={()=>setShow(v=>!v)} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{show?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div></label>)}
      <PasswordRequirements value={password} />
      <button disabled={loading || Boolean(passwordValidationError(password)) || password !== confirm} className="w-full rounded-2xl bg-[#00102e] py-3.5 text-sm font-black text-white disabled:opacity-60">{loading?"جاري الحفظ...":"حفظ كلمة المرور"}</button>
    </form>}
  </AuthShell>;
}
export default function ResetPasswordPage(){return <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]"/>}><ResetPasswordContent/></Suspense>}
