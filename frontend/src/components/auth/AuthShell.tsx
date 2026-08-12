import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f8fafc]" dir="rtl">
      <aside className="hidden w-1/2 items-center justify-center bg-[#00102e] p-12 lg:flex">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-white/10"><Image src="/logo.png" alt="Z draft" width={96} height={96} className="h-full w-full object-contain" priority /></div>
            <span className="text-3xl font-black text-white">Z draft</span>
          </div>
          <h1 className="mt-10 text-3xl font-black leading-tight text-white">حساب واحد لعقودك واستشاراتك</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">تأكيد البريد وحماية الحساب جزء من حفظ العقود والمدفوعات والمستندات بصورة آمنة.</p>
          <div className="mt-8 space-y-3">{["تأكيد البريد برمز OTP", "سجل عقود واستشارات مرتبط بحسابك", "إشعارات داخل المنصة وعلى البريد"].map((text) => <div key={text} className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-[#d9a84e]" /> {text}</div>)}</div>
        </div>
      </aside>
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden"><div className="h-12 w-12 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"><Image src="/logo.png" alt="Z draft" width={80} height={80} className="h-full w-full object-contain" priority /></div><span className="text-xl font-black text-[#00102e]">Z draft</span></div>
          <h2 className="text-2xl font-black text-[#00102e]">{title}</h2>
          {subtitle && <p className="mt-2 text-sm leading-7 text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          <Link href="/" className="mt-7 flex items-center justify-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft className="h-4 w-4" /> العودة إلى الصفحة الرئيسية</Link>
        </div>
      </main>
    </div>
  );
}
