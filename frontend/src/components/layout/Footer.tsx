import Image from "next/image";
import Link from "next/link";
import { FileText, Scale } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3"><Image src="/logo.png" alt="Z draft" width={112} height={28} className="h-7 w-auto object-contain" /><span className="text-xs font-black text-[#00102e]">منصة لإعداد العقود وطلب خدمات مكتب المحاماة</span></div>
            <p className="mt-2 text-[11px] leading-6 text-slate-500">الإنشاء الذاتي يعتمد على البيانات التي تدخلها. مراجعة المحامي خدمة مستقلة تُطلب عند الحاجة.</p>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-xs font-bold">
            <Link href="/pricing" className="inline-flex items-center gap-1.5 hover:text-[#00102e]"><FileText className="h-4 w-4" /> الأسعار</Link>
            <Link href="/declaration" className="inline-flex items-center gap-1.5 hover:text-[#00102e]"><Scale className="h-4 w-4" /> إقرار الاستخدام</Link>
          </nav>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-5 text-[10px] text-slate-400">جميع الحقوق محفوظة © {new Date().getFullYear()} Z draft</div>
      </div>
    </footer>
  );
}
