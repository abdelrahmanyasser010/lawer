"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { frontendApi, ApiClientError } from "@/lib/apiClient";

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<"individual" | "business">("individual");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", companyName: "", email: "", phone: "", password: "", whatsappServiceConsent: true, agreedToTerms: false });

  async function register(event: React.FormEvent) {
    event.preventDefault();
    if (!form.agreedToTerms) return setError("يجب الموافقة على شروط الاستخدام للمتابعة.");
    setLoading(true);
    setError("");
    try {
      await frontendApi.register({
        fullName: form.fullName,
        companyName: accountType === "business" ? form.companyName : undefined,
        email: form.email,
        phone: form.phone,
        whatsappNumber: form.phone,
        password: form.password,
        accountType,
        whatsappServiceConsent: form.whatsappServiceConsent,
        agreedToTerms: form.agreedToTerms,
      });
      window.dispatchEvent(new Event("zdraft-auth-changed"));
      window.location.href = "/verify-email?sent=1";
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "تعذر إنشاء الحساب الآن.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-5 py-10" dir="rtl">
      <main className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00102e] font-black text-[#d9a84e]">Z</div><div><h1 className="text-2xl font-black text-[#00102e]">إنشاء حساب</h1><p className="mt-1 text-xs text-slate-500">الحساب مطلوب لحفظ العقود والطلبات والملفات.</p></div></div>

        <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
          <button type="button" onClick={() => setAccountType("individual")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-black ${accountType === "individual" ? "bg-white text-[#00102e] shadow-sm" : "text-slate-500"}`}><User className="h-4 w-4" /> فرد</button>
          <button type="button" onClick={() => setAccountType("business")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-black ${accountType === "business" ? "bg-white text-[#00102e] shadow-sm" : "text-slate-500"}`}><Building2 className="h-4 w-4" /> شركة أو مؤسسة</button>
        </div>

        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
        <form onSubmit={register} className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="الاسم الكامل" icon={User}><input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="field-input" /></Field>
          {accountType === "business" && <Field label="اسم الشركة أو المؤسسة" icon={Building2}><input required value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} className="field-input" /></Field>}
          <Field label="البريد الإلكتروني" icon={Mail}><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field-input" /></Field>
          <Field label="رقم الهاتف وWhatsApp" icon={Phone}><input type="tel" required dir="ltr" placeholder="01XXXXXXXXX" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="field-input text-left" /></Field>
          <label className="block text-xs font-black text-slate-700 sm:col-span-2">كلمة المرور
            <div className="relative mt-2"><Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" /><input type={showPassword ? "text" : "password"} minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="8 أحرف على الأقل" className="field-input pl-11 pr-11" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute left-3.5 top-3.5 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600 sm:col-span-2"><input type="checkbox" checked={form.whatsappServiceConsent} onChange={(event) => setForm({ ...form, whatsappServiceConsent: event.target.checked })} className="mt-1" /><span>أوافق على تواصل المكتب معي عبر WhatsApp بخصوص الطلبات التي أبدأها. الرقم وسيلة تواصل ولا يتم اعتباره موثقًا بدون تحقق مستقل.</span></label>
          <label className="flex items-start gap-3 text-xs leading-6 text-slate-600 sm:col-span-2"><input type="checkbox" checked={form.agreedToTerms} onChange={(event) => setForm({ ...form, agreedToTerms: event.target.checked })} className="mt-1" /><span>أوافق على <Link href="/declaration" target="_blank" className="font-black text-[#986410]">شروط الاستخدام والإقرار القانوني</Link>.</span></label>
          <button disabled={loading} className="rounded-2xl bg-[#00102e] py-3.5 text-sm font-black text-white disabled:opacity-60 sm:col-span-2">{loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}</button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">لديك حساب بالفعل؟ <Link href="/login" className="font-black text-[#986410]">تسجيل الدخول</Link></p>
        <Link href="/" className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft className="h-4 w-4" /> العودة إلى الصفحة الرئيسية</Link>
      </main>
      <style jsx global>{`.field-input{margin-top:.5rem;width:100%;border:1px solid #cbd5e1;border-radius:1rem;background:#fff;padding:.75rem 1rem .75rem 2.75rem;font-size:.875rem;outline:none}.field-input:focus{border-color:#986410}`}</style>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof User; children: React.ReactNode }) {
  return <label className="block text-xs font-black text-slate-700">{label}<div className="relative"><Icon className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />{children}</div></label>;
}
