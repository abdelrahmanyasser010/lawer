"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { dashboardApi, DashboardApiError } from "@/lib/apiClient";

export default function DashboardForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    try {
      await dashboardApi.forgotPassword(email);
      setMessage("إذا كان البريد مسجلًا فسيصل رابط إعادة التعيين إلى صندوق البريد.");
    } catch (caught) {
      setError(caught instanceof DashboardApiError ? caught.message : "تعذر إرسال طلب الاستعادة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4" dir="rtl">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00102e] text-white"><ShieldCheck className="h-6 w-6"/></div>
        <h1 className="mt-5 text-2xl font-black text-[#00102e]">استعادة حساب الإدارة</h1>
        <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">أدخل بريد حساب السوبر أدمن، وسنرسل رابطًا محدود الصلاحية.</p>
        {message && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black text-emerald-800">{message}</div>}
        {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-black text-rose-700">{error}</div>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="mb-2 block text-xs font-black text-slate-700">البريد الإلكتروني</span><div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3"><Mail className="h-4 w-4 text-slate-400"/><input type="email" required value={email} onChange={(event)=>setEmail(event.target.value)} className="w-full py-3 text-sm outline-none"/></div></label>
          <button disabled={loading} className="w-full rounded-xl bg-[#00102e] py-3 text-xs font-black text-white disabled:opacity-60">{loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}</button>
        </form>
        <Link href="/login" className="mt-5 inline-flex items-center gap-1 text-xs font-black text-[#986410]"><ArrowRight className="h-4 w-4"/> العودة لتسجيل الدخول</Link>
      </section>
    </main>
  );
}
