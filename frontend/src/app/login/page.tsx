"use client";

import Image from "next/image";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { frontendApi, ApiClientError } from "@/lib/apiClient";
import { safeInternalRedirect } from "@/lib/safeRedirect";

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${compact ? "h-12 w-12" : "h-16 w-16"}`}>
        <Image src="/logo.png" alt="Z draft" width={96} height={96} className="h-full w-full object-contain" priority />
      </div>
      <span className={`${compact ? "text-xl text-[#00102e]" : "text-3xl text-white"} font-black`}>Z draft</span>
    </div>
  );
}

function LoginContent() {
  const params = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await frontendApi.login(email, password);
      window.dispatchEvent(new Event("zdraft-auth-changed"));
      const next = params.get("next");
      window.location.href = safeInternalRedirect(next, "/contracts");
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "تعذر تسجيل الدخول الآن.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]" dir="rtl">
      <aside className="hidden w-1/2 items-center justify-center bg-[#00102e] p-12 lg:flex">
        <div className="max-w-md">
          <BrandLogo />
          <h1 className="mt-10 text-3xl font-black leading-tight text-white">عقودك وطلبات المكتب في حساب واحد</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">تابع المسودات، حالة الدفع، مواعيد التواصل، والمستندات التي يتيحها المكتب لك.</p>
          <div className="mt-8 space-y-3">{["حفظ العقود والمسودات", "متابعة طلبات مراجعة وإعداد العقود", "تنزيل النسخ والتقارير المتاحة"].map((text) => <div key={text} className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-[#d9a84e]" /> {text}</div>)}</div>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><BrandLogo compact /></div>
          <h2 className="text-2xl font-black text-[#00102e]">تسجيل الدخول</h2>
          <p className="mt-2 text-sm text-slate-500">ليس لديك حساب؟ <Link href="/register" className="font-black text-[#986410]">إنشاء حساب جديد</Link></p>

          {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
          <form onSubmit={login} className="mt-6 space-y-4">
            <label className="block text-xs font-black text-slate-700">البريد الإلكتروني
              <div className="relative mt-2"><Mail className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@email.com" className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-4 pr-11 text-sm outline-none transition focus:border-[#986410] focus:ring-2 focus:ring-[#986410]/10" /></div>
            </label>
            <label className="block text-xs font-black text-slate-700">
              <span className="flex items-center justify-between"><span>كلمة المرور</span><Link href="/forgot-password" className="text-[#986410]">نسيت كلمة المرور؟</Link></span>
              <div className="relative mt-2"><Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-11 text-sm outline-none transition focus:border-[#986410] focus:ring-2 focus:ring-[#986410]/10" /><button type="button" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => setShowPassword((value) => !value)} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#986410]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            </label>
            <button disabled={loading} className="w-full rounded-2xl bg-[#00102e] py-3.5 text-sm font-black text-white transition hover:bg-[#071b43] disabled:opacity-60">{loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}</button>
          </form>
          <p className="mt-5 text-center text-[11px] leading-6 text-slate-400">باستخدام الحساب أنت توافق على <Link href="/declaration" className="font-bold text-[#986410]">شروط الاستخدام والإقرار القانوني</Link> و<Link href="/privacy" className="font-bold text-[#986410]">سياسة الخصوصية</Link>.</p>
          <Link href="/" className="mt-7 flex items-center justify-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft className="h-4 w-4" /> العودة إلى الصفحة الرئيسية</Link>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <LoginContent />
    </Suspense>
  );
}
