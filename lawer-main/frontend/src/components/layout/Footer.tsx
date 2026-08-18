import Image from "next/image";
import Link from "next/link";
import { FileText, Scale, FileLock2, Shield, Mail, Phone, MapPin, ArrowLeft } from "lucide-react";

const footerLinks = {
  services: [
    { label: "صياغة عقد بنفسي", href: "/create-contract?mode=self_service" },
    { label: "صياغة بواسطة محام", href: "/create-contract?mode=lawyer_assisted" },
    { label: "مراجعة عقد قائم", href: "/request-review" },
    { label: "استشارة قانونية", href: "/requests" },
    { label: "Z Draft Vault", href: "/contracts" },
  ],
  legal: [
    { label: "الأسعار", href: "/pricing" },
    { label: "إقرار الاستخدام", href: "/declaration" },
    { label: "سياسة الخصوصية", href: "/privacy" },
    { label: "الشروط والأحكام", href: "/terms" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#00102e] text-white" dir="rtl">
      {/* Main footer body */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr_1fr_1.2fr]">

          {/* Brand column */}
          <div>
            <Link href="/" className="flex items-center gap-3 mb-5">
              <Image src="/logo.png" alt="Z Draft" width={100} height={32} className="h-8 w-auto object-contain brightness-200" />
              <div>
                <div className="text-[15px] font-black text-white">Z Draft</div>
                <div className="text-[10px] font-bold text-[#d9a84e]">عقود وخدمات قانونية</div>
              </div>
            </Link>
            <p className="text-[12px] font-medium leading-[1.8] text-slate-400 max-w-xs">
              منصة قانونية متكاملة لإعداد العقود والاستشارات القانونية بأعلى معايير الأمان والاحترافية.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-[#d9a84e]" /> support@zdraft.io</span>
              <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#d9a84e]" /> القاهرة، مصر</span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="mb-5 text-[12px] font-black text-white tracking-wide uppercase">الخدمات</h4>
            <ul className="space-y-3">
              {footerLinks.services.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-[#d9a84e] transition-colors group">
                    <ArrowLeft className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#d9a84e]" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-5 text-[12px] font-black text-white tracking-wide uppercase">قانوني</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-[#d9a84e] transition-colors group">
                    <ArrowLeft className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#d9a84e]" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h4 className="mb-5 text-[12px] font-black text-white tracking-wide uppercase">ابدأ الآن</h4>
            <p className="text-[12px] font-medium text-slate-400 leading-relaxed mb-6">
              استمتع بخدمات قانونية احترافية في دقائق، واحمي حقوقك بكل أمان وموثوقية.
            </p>
            <Link
              href="/create-contract?mode=self_service"
              className="inline-flex items-center gap-2 rounded-xl bg-[#d9a84e] px-5 py-2.5 text-[12px] font-black text-[#00102e] hover:bg-white transition-colors"
            >
              اطلب خدمتك الآن
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>

            {/* Trust badges */}
            <div className="mt-8 flex flex-col gap-2">
              {[
                { icon: Shield, label: "تشفير AES-256" },
                { icon: Scale, label: "متوافق مع وزارة العدل" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                  <Icon className="h-3.5 w-3.5 text-[#986410]" />
                  {label}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-[11px] font-medium text-slate-500">
            جميع الحقوق محفوظة © {new Date().getFullYear()} Z Draft — منصة قانونية مصرية
          </p>
          <div className="flex items-center gap-5 text-[11px] font-bold text-slate-500">
            <Link href="/privacy" className="hover:text-[#d9a84e] transition-colors flex items-center gap-1"><FileLock2 className="h-3 w-3" /> الخصوصية</Link>
            <Link href="/declaration" className="hover:text-[#d9a84e] transition-colors flex items-center gap-1"><FileText className="h-3 w-3" /> الشروط</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
