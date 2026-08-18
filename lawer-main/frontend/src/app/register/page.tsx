"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { frontendApi, ApiClientError } from "@/lib/apiClient";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
import { apiFieldErrors, normalizePhoneInput, passwordValidationError, phoneValidationError, type FieldErrors } from "@/lib/inputValidation";

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

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", whatsappServiceConsent: true, agreedToTerms: false });

  function focusFirst(errors: FieldErrors) {
    const first = ["fullName", "email", "phone", "password", "agreedToTerms"].find((key) => errors[key]);
    if (!first) return;
    window.setTimeout(() => {
      const element = document.querySelector<HTMLElement>(`[data-field="${first}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.querySelector<HTMLInputElement>("input")?.focus();
    }, 0);
  }

  async function register(event: React.FormEvent) {
    event.preventDefault();
    const errors: FieldErrors = {};
    if (!form.fullName.trim()) errors.fullName = "الاسم الكامل مطلوب.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "اكتب بريدًا إلكترونيًا صحيحًا.";
    const phoneError = phoneValidationError(form.phone, true); if (phoneError) errors.phone = phoneError;
    const passwordError = passwordValidationError(form.password); if (passwordError) errors.password = passwordError;
    if (!form.agreedToTerms) errors.agreedToTerms = "يجب الموافقة على شروط الاستخدام للمتابعة.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) { setError("راجع الحقول الموضحة أدناه."); focusFirst(errors); return; }
    setLoading(true);
    setError("");
    try {
      await frontendApi.register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: normalizePhoneInput(form.phone),
        whatsappNumber: normalizePhoneInput(form.phone),
        password: form.password,
        accountType: "individual",
        whatsappServiceConsent: form.whatsappServiceConsent,
        agreedToTerms: form.agreedToTerms,
      });
      window.dispatchEvent(new Event("zdraft-auth-changed"));
      window.location.href = "/verify-email?sent=1";
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        const backendErrors = apiFieldErrors(caught.details);
        if (Object.keys(backendErrors).length) { setFieldErrors(backendErrors); focusFirst(backendErrors); }
        setError(Object.keys(backendErrors).length ? "راجع الحقول الموضحة أدناه." : caught.message);
      } else setError("تعذر إنشاء الحساب الآن.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]" dir="rtl">
      <aside className="hidden w-1/2 items-center justify-center bg-[#00102e] p-12 lg:flex">
        <div className="max-w-md">
          <BrandLogo />
          <h1 className="mt-10 text-3xl font-black leading-tight text-white">أنشئ حسابك واحفظ كل معاملاتك القانونية</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">الحساب يتيح لك حفظ العقود والمسودات، متابعة الاستشارات والمدفوعات، واستلام المستندات من مكان واحد.</p>
          <div className="mt-8 space-y-3">
            {["حفظ العقود والمسودات تلقائيًا", "متابعة الاستشارات والإشعارات", "الرجوع لسجل المدفوعات والمستندات"].map((text) => (
              <div key={text} className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-[#d9a84e]" /> {text}</div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:py-12">
        <div className="w-full max-w-md">
          <div className="mb-7 lg:hidden"><BrandLogo compact /></div>
          <h2 className="text-2xl font-black text-[#00102e]">إنشاء حساب</h2>
          <p className="mt-2 text-sm text-slate-500">لديك حساب بالفعل؟ <Link href="/login" className="font-black text-[#986410]">تسجيل الدخول</Link></p>
          {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}

          <form onSubmit={register} className="mt-6 space-y-4">
            <AuthField field="fullName" label="الاسم الكامل" icon={User} error={fieldErrors.fullName}>
              <input required autoComplete="name" value={form.fullName} onChange={(event) => { setForm({ ...form, fullName: event.target.value }); setFieldErrors((e) => ({...e, fullName:""})); }} placeholder="الاسم كما سيظهر في حسابك" className={`auth-input ${fieldErrors.fullName ? "auth-input-error" : ""}`} />
            </AuthField>

            <AuthField field="email" label="البريد الإلكتروني" icon={Mail} error={fieldErrors.email}>
              <input type="email" required autoComplete="email" value={form.email} onChange={(event) => { setForm({ ...form, email: event.target.value }); setFieldErrors((e) => ({...e, email:""})); }} placeholder="example@email.com" className={`auth-input ${fieldErrors.email ? "auth-input-error" : ""}`} />
            </AuthField>

            <AuthField field="phone" label="رقم الهاتف وWhatsApp" icon={Phone} error={fieldErrors.phone}>
              <input type="tel" required autoComplete="tel" inputMode="tel" dir="ltr" placeholder="01XXXXXXXXX" value={form.phone} onChange={(event) => { setForm({ ...form, phone: normalizePhoneInput(event.target.value) }); setFieldErrors((e) => ({...e, phone:""})); }} className={`auth-input text-left ${fieldErrors.phone ? "auth-input-error" : ""}`} />
            </AuthField>

            <label data-field="password" className="block text-xs font-black text-slate-700">
              كلمة المرور
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type={showPassword ? "text" : "password"} minLength={8} maxLength={128} required autoComplete="new-password" value={form.password} onChange={(event) => { setForm({ ...form, password: event.target.value }); setFieldErrors((e) => ({...e, password:""})); }} placeholder="8 أحرف على الأقل + حرف + رقم" className={`auth-input auth-input-password ${fieldErrors.password ? "auth-input-error" : ""}`} />
                <button type="button" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => setShowPassword((value) => !value)} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#986410]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
              <PasswordRequirements value={form.password} />
              {fieldErrors.password && <span className="mt-1 block text-[10px] font-bold text-red-600">{fieldErrors.password}</span>}
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600">
              <input type="checkbox" checked={form.whatsappServiceConsent} onChange={(event) => setForm({ ...form, whatsappServiceConsent: event.target.checked })} className="mt-1 h-4 w-4 shrink-0 accent-[#00102e]" />
              <span>أوافق على تواصل المكتب معي عبر WhatsApp بخصوص الطلبات التي أبدأها. الرقم وسيلة تواصل ولا يتم اعتباره موثقًا بدون تحقق مستقل.</span>
            </label>

            <label data-field="agreedToTerms" className={`flex items-start gap-3 text-xs leading-6 ${fieldErrors.agreedToTerms ? "text-red-700" : "text-slate-600"}`}>
              <input type="checkbox" checked={form.agreedToTerms} onChange={(event) => { setForm({ ...form, agreedToTerms: event.target.checked }); setFieldErrors((e) => ({...e, agreedToTerms:""})); }} className="mt-1 h-4 w-4 shrink-0 accent-[#00102e]" />
              <span>أوافق على <Link href="/declaration" target="_blank" className="font-black text-[#986410]">شروط الاستخدام والإقرار القانوني</Link> و<Link href="/privacy" target="_blank" className="font-black text-[#986410]">سياسة الخصوصية</Link>.</span>
            </label>

            <button disabled={loading} className="w-full rounded-2xl bg-[#00102e] py-3.5 text-sm font-black text-white transition hover:bg-[#071b43] disabled:opacity-60">{loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}</button>
          </form>

          <Link href="/" className="mt-7 flex items-center justify-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft className="h-4 w-4" /> العودة إلى الصفحة الرئيسية</Link>
        </div>
      </main>

      <style jsx global>{`
        .auth-input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 1rem;
          background: #fff;
          padding: .75rem 1rem .75rem 1rem;
          padding-right: 2.75rem;
          font-size: .875rem;
          outline: none;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .auth-input-password {
          padding-left: 2.75rem;
        }
        .auth-input-error { border-color: #dc2626; background: #fffafa; }
        .auth-input:focus {
          border-color: #986410;
          box-shadow: 0 0 0 3px rgba(152,100,16,.09);
        }
      `}</style>
    </div>
  );
}

function AuthField({ field, label, icon: Icon, children, error }: { field: string; label: string; icon: typeof User; children: React.ReactNode; error?: string }) {
  return (
    <label data-field={field} className="block text-xs font-black text-slate-700">
      {label}
      <div className="relative mt-2">
        <Icon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
      {error && <span className="mt-1 block text-[10px] font-bold text-red-600">{error}</span>}
    </label>
  );
}
