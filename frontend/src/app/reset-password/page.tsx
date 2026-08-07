"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { frontendApi, ApiClientError } from "@/lib/apiClient";

function ResetPasswordContent() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setNotice(null);
    if (password !== confirm) { setNotice("كلمتا المرور غير متطابقتين."); return; }
    const token = params.get("token");
    if (!token) { setNotice("رابط إعادة التعيين غير مكتمل."); return; }
    try { await frontendApi.resetPassword(token, password); setDone(true); setNotice("تم تغيير كلمة المرور بنجاح."); }
    catch (error) { setNotice(error instanceof ApiClientError ? error.message : "تعذر تغيير كلمة المرور."); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4" dir="rtl"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><Lock className="h-9 w-9 text-[#986410]"/><h1 className="mt-4 text-2xl font-black text-[#00102e]">تعيين كلمة مرور جديدة</h1>{notice && <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">{notice}</div>}{done ? <Link href="/login" className="mt-6 block rounded-xl bg-[#00102e] py-3 text-center text-xs font-black text-white">تسجيل الدخول</Link> : <form onSubmit={submit} className="mt-5 space-y-4"><input type="password" minLength={8} required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="كلمة المرور الجديدة" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none"/><input type="password" minLength={8} required value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="تأكيد كلمة المرور" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none"/><button className="w-full rounded-xl bg-[#00102e] py-3 text-xs font-black text-white">حفظ كلمة المرور</button></form>}</section></main>;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
