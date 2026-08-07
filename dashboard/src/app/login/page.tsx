"use client";

import { FormEvent, Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { dashboardApi, DashboardApiError } from "@/lib/apiClient";
import { setDashboardUser } from "@/lib/session";

function DashboardLoginContent() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null);
    try {
      const { user } = await dashboardApi.login(email, password);
      if (!user.roles.some((role) => role !== "customer")) {
        await dashboardApi.logout();
        throw new Error("هذا الحساب لا يملك صلاحية دخول لوحة المكتب");
      }
      setDashboardUser(user);
      window.location.href = user.passwordChangeRequired ? "/account?changePassword=required" : (params.get("next") || "/");
    } catch (caught) {
      setError(caught instanceof DashboardApiError || caught instanceof Error ? caught.message : "تعذر تسجيل الدخول");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4" dir="rtl">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[1fr_1.1fr]">
        <div className="hidden bg-[#00102e] p-10 text-white lg:block">
          <div className="relative h-16 w-32"><Image src="/logo.png" alt="Z draft" fill className="object-contain object-right" /></div>
          <h1 className="mt-12 text-3xl font-black leading-tight">لوحة تشغيل مكتب المحاماة</h1>
          <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">إدارة العقود والمراجعات والاستشارات والمدفوعات بصلاحيات منفصلة وسجل تدقيق لكل إجراء.</p>
          <div className="mt-10 space-y-4 text-xs font-bold text-slate-300">
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#986410]"/> حساب مستقل لكل عضو فريق</div>
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#986410]"/> الصلاحيات تُفرض من الباك إند</div>
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#986410]"/> العقود النهائية لا تُعدّل دون إصدار جديد</div>
          </div>
        </div>
        <div className="p-7 sm:p-10">
          <div className="lg:hidden"><div className="relative h-14 w-28"><Image src="/logo.png" alt="Z draft" fill className="object-contain object-right" /></div></div>
          <h2 className="mt-6 text-2xl font-black text-[#00102e]">تسجيل دخول فريق المكتب</h2>
          <p className="mt-2 text-xs font-semibold text-slate-500">استخدم حساب الموظف أو المحامي المخصص لك.</p>
          {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block"><span className="mb-2 block text-xs font-black text-slate-700">البريد الإلكتروني</span><div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3"><Mail className="h-4 w-4 text-slate-400"/><input type="email" required value={email} onChange={(event)=>setEmail(event.target.value)} className="w-full py-3 text-sm outline-none"/></div></label>
            <label className="block"><span className="mb-2 block text-xs font-black text-slate-700">كلمة المرور</span><div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3"><Lock className="h-4 w-4 text-slate-400"/><input type={showPassword ? "text" : "password"} required value={password} onChange={(event)=>setPassword(event.target.value)} className="w-full py-3 text-sm outline-none"/><button type="button" onClick={()=>setShowPassword((value)=>!value)} className="text-slate-400">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div><Link href="/forgot-password" className="mt-2 inline-block text-[11px] font-black text-[#986410]">نسيت كلمة المرور؟</Link></label>
            <button disabled={loading} className="w-full rounded-xl bg-[#00102e] py-3.5 text-xs font-black text-white disabled:opacity-60">{loading ? "جاري التحقق..." : "دخول لوحة التحكم"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function DashboardLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <DashboardLoginContent />
    </Suspense>
  );
}
