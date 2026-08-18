"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { frontendApi, ApiClientError } from "@/lib/apiClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setNotice(null);
    try { await frontendApi.forgotPassword(email); setNotice("إذا كان البريد مسجلًا فسيصلك رابط مؤقت لإعادة تعيين كلمة المرور."); }
    catch (error) { setNotice(error instanceof ApiClientError ? error.message : "تعذر تنفيذ الطلب."); }
    finally { setLoading(false); }
  }
  return <AuthShell title="استعادة كلمة المرور" subtitle="أدخل بريد حسابك وسنرسل رابطًا مؤقتًا لإعادة التعيين.">
    {notice && <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold leading-6 text-slate-700">{notice}</div>}
    <form onSubmit={submit} className="mt-4 space-y-4">
      <label className="block text-xs font-black text-slate-700">البريد الإلكتروني<div className="relative mt-2"><Mail className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="example@email.com" className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-4 pr-11 text-sm outline-none focus:border-[#986410] focus:ring-2 focus:ring-[#986410]/10"/></div></label>
      <button disabled={loading} className="w-full rounded-2xl bg-[#00102e] py-3.5 text-sm font-black text-white disabled:opacity-60">{loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}</button>
    </form>
    <Link href="/login" className="mt-5 block text-center text-xs font-black text-[#986410]">العودة لتسجيل الدخول</Link>
  </AuthShell>;
}
