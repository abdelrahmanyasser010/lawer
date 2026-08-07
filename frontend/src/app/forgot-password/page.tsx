"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { frontendApi, ApiClientError } from "@/lib/apiClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setNotice(null);
    try { await frontendApi.forgotPassword(email); setNotice("إذا كان البريد مسجلًا فسيصلك رابط إعادة التعيين."); }
    catch (error) { setNotice(error instanceof ApiClientError ? error.message : "تعذر تنفيذ الطلب."); }
    finally { setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4" dir="rtl"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-black text-[#00102e]">استعادة كلمة المرور</h1><p className="mt-2 text-xs font-semibold leading-6 text-slate-500">أدخل بريدك وسنرسل رابطًا مؤقتًا لإعادة التعيين.</p>{notice && <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">{notice}</div>}<form onSubmit={submit} className="mt-5 space-y-4"><label className="block"><span className="mb-2 block text-xs font-black text-slate-700">البريد الإلكتروني</span><div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3"><Mail className="h-4 w-4 text-slate-400"/><input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full py-3 text-sm outline-none"/></div></label><button disabled={loading} className="w-full rounded-xl bg-[#00102e] py-3 text-xs font-black text-white disabled:opacity-60">{loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}</button></form><Link href="/login" className="mt-5 block text-center text-xs font-black text-[#986410]">العودة لتسجيل الدخول</Link></section></main>;
}
