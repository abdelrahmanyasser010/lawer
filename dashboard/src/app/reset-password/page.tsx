"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { dashboardApi, DashboardApiError } from "@/lib/apiClient";

function DashboardResetPasswordContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null); setMessage(null);
    if (!token) return setError("رابط إعادة التعيين غير مكتمل.");
    if (password !== confirmation) return setError("كلمتا المرور غير متطابقتين.");
    setLoading(true);
    try {
      await dashboardApi.resetPassword(token, password);
      setMessage("تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.");
    } catch (caught) {
      setError(caught instanceof DashboardApiError ? caught.message : "تعذر تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4" dir="rtl">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00102e] text-white"><LockKeyhole className="h-6 w-6"/></div>
        <h1 className="mt-5 text-2xl font-black text-[#00102e]">تعيين كلمة مرور جديدة</h1>
        <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">استخدم كلمة قوية لا تقل عن 10 أحرف وتضم حروفًا وأرقامًا.</p>
        {message && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black text-emerald-800">{message}</div>}
        {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-black text-rose-700">{error}</div>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="mb-2 block text-xs font-black text-slate-700">كلمة المرور الجديدة</span><input type="password" minLength={10} required value={password} onChange={(event)=>setPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none"/></label>
          <label className="block"><span className="mb-2 block text-xs font-black text-slate-700">تأكيد كلمة المرور</span><input type="password" minLength={10} required value={confirmation} onChange={(event)=>setConfirmation(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none"/></label>
          <button disabled={loading || Boolean(message)} className="w-full rounded-xl bg-[#00102e] py-3 text-xs font-black text-white disabled:opacity-60">{loading ? "جاري الحفظ..." : "حفظ كلمة المرور"}</button>
        </form>
        <Link href="/login" className="mt-5 inline-flex items-center gap-1 text-xs font-black text-[#986410]"><ArrowRight className="h-4 w-4"/> العودة لتسجيل الدخول</Link>
      </section>
    </main>
  );
}

export default function DashboardResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <DashboardResetPasswordContent />
    </Suspense>
  );
}
