"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FileText,
  Scale,
  FileLock2,
  Shield,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Package,
  RotateCcw,
  CreditCard,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

const footerLinks = {
  services: [
    { label: "صياغة عقد بنفسي (فوري)", href: "/create-contract?mode=self_service" },
    { label: "صياغة بواسطة محامٍ مختص", href: "/create-contract?mode=lawyer_assisted" },
    { label: "مراجعة وتدقيق عقد قائم", href: "/request-review" },
    { label: "استشارة قانونية تعاقدية", href: "/request-review" },
    { label: "سجل العقود والوثائق (Vault)", href: "/contracts" },
  ],
  legal: [
    { label: "الأسعار والخدمات", href: "/pricing" },
    { label: "من نحن", href: "/about" },
    { label: "اتصل بنا", href: "/contact" },
    { label: "الشروط والأحكام", href: "/terms" },
    { label: "سياسة الخصوصية", href: "/privacy" },
    { label: "سياسة الشحن والتسليم", href: "/delivery-policy" },
    { label: "سياسة الإلغاء والاسترداد", href: "/refund-policy" },
  ],
};

export default function Footer() {
  const { catalog } = usePublicCatalog();
  const office = catalog.office;

  const phone = office.supportPhone || "+20 100 123 4567";
  const email = office.supportEmail || "support@zdraft.io";
  const address = office.address || "القاهرة، جمهورية مصر العربية - مدينة نصر، شارع عباس العقاد";

  return (
    <footer className="bg-[#00102e] text-white font-sans text-right" dir="rtl">
      {/* Main footer body */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.8fr_1fr_1.1fr_1.2fr]">
          {/* Brand & Contact column */}
          <div>
            <Link href="/" className="mb-5 flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Z Draft"
                width={120}
                height={38}
                className="h-9 w-auto object-contain brightness-200"
              />
              <div>
                <div className="text-[16px] font-black text-white">Z Draft</div>
                <div className="text-[10px] font-bold text-[#d9a84e]">منصة العقود والخدمات القانونية</div>
              </div>
            </Link>
            <p className="max-w-xs text-[12px] font-medium leading-[1.8] text-slate-300">
              منصة قانونية مصرية متكاملة لصياغة ومراجعة وتوثيق العقود الذكية بالتعاون مع نخبة من المحامين المعتمدين والمقيدين بنقابة المحامين المصرية.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 text-[11px] font-bold text-slate-300">
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 hover:text-[#d9a84e] transition-colors"
                dir="ltr"
              >
                <Phone className="h-3.5 w-3.5 text-[#d9a84e] shrink-0" />
                <span>{phone}</span>
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 hover:text-[#d9a84e] transition-colors"
                dir="ltr"
              >
                <Mail className="h-3.5 w-3.5 text-[#d9a84e] shrink-0" />
                <span>{email}</span>
              </a>
              <span className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#d9a84e] shrink-0 mt-0.5" />
                <span>{address}</span>
              </span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="mb-5 text-[12px] font-black tracking-wide text-white uppercase">الخدمات القانونية</h4>
            <ul className="space-y-3">
              {footerLinks.services.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="group flex items-center gap-1.5 text-[12px] font-medium text-slate-300 hover:text-[#d9a84e] transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 text-[#d9a84e]" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="mb-5 text-[12px] font-black tracking-wide text-white uppercase">السياسات والامتثال</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="group flex items-center gap-1.5 text-[12px] font-medium text-slate-300 hover:text-[#d9a84e] transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 text-[#d9a84e]" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA & Payment Methods */}
          <div>
            <h4 className="mb-5 text-[12px] font-black tracking-wide text-white uppercase">طرق الدفع والأمان</h4>
            <p className="mb-4 text-[11px] font-medium leading-relaxed text-slate-300">
              دفع إلكتروني آمن ومشفر 100% متوافق مع معايير البنك المركزي المصري.
            </p>

            {/* Payment Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-6">
              <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-black text-white border border-white/15">
                Visa
              </span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-black text-white border border-white/15">
                MasterCard
              </span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-black text-[#d9a84e] border border-[#d9a84e]/30">
                ميزة Meeza
              </span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-black text-emerald-400 border border-white/15">
                محافظ إلكترونية
              </span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-black text-rose-400 border border-white/15">
                Vodafone Cash
              </span>
            </div>

            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-[#d9a84e] px-5 py-2.5 text-[12px] font-black text-[#00102e] hover:bg-white transition-colors"
            >
              استعرض الأسعار والعقود
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>

            {/* Trust badges */}
            <div className="mt-6 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <Shield className="h-3.5 w-3.5 text-[#d9a84e]" />
                <span>تشفير كامل للبيانات والمعاملات (SSL 256-Bit)</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <Scale className="h-3.5 w-3.5 text-[#d9a84e]" />
                <span>محامون معتمدون ومقيدون بنقابة المحامين المصرية</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-[11px] font-medium text-slate-400">
            جميع الحقوق محفوظة © {new Date().getFullYear()} Z Draft — منصة قانونية مصرية مرخصة
          </p>
          <div className="flex flex-wrap items-center gap-5 text-[11px] font-bold text-slate-400">
            <Link href="/privacy" className="hover:text-[#d9a84e] transition-colors flex items-center gap-1">
              <FileLock2 className="h-3 w-3" /> الخصوصية
            </Link>
            <Link href="/terms" className="hover:text-[#d9a84e] transition-colors flex items-center gap-1">
              <FileText className="h-3 w-3" /> الشروط والأحكام
            </Link>
            <Link href="/delivery-policy" className="hover:text-[#d9a84e] transition-colors flex items-center gap-1">
              <Package className="h-3 w-3" /> الشحن والتسليم
            </Link>
            <Link href="/refund-policy" className="hover:text-[#d9a84e] transition-colors flex items-center gap-1">
              <RotateCcw className="h-3 w-3" /> الإلغاء والاسترداد
            </Link>
            <Link href="/contact" className="hover:text-[#d9a84e] transition-colors flex items-center gap-1">
              <Phone className="h-3 w-3" /> اتصل بنا
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
