"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, FileText, Scale, ShieldCheck } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LegalConsultationCard from "@/components/home/LegalConsultationCard";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

export default function HomePage() {
  const { catalog, loading, loadError } = usePublicCatalog();
  const consultationFee = catalog.services.consultationFeeEgp;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-slate-200 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#986410]/25 bg-[#986410]/10 px-4 py-2 text-xs font-black text-[#986410]">
              <Scale className="h-4 w-4" /> عقود واستشارات قانونية من مكتب محاماة
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-3xl font-black leading-tight text-[#00102e] sm:text-5xl">اختر الخدمة التي تحتاجها وابدأ من المسار الصحيح مباشرة</h1>
            <p className="mx-auto mt-5 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">إما أن تُعد العقد بنفسك من خلال خطوات منظمة، أو تطلب من محامي المكتب إعداده بعد رفع المستندات، أو تحجز استشارة قانونية في موعد متاح.</p>

            <div className="mx-auto mt-10 grid max-w-5xl gap-4 text-right lg:grid-cols-3">
              <ServiceCard
                href="/create-contract?mode=self_service"
                icon={<FileText className="h-6 w-6" />}
                eyebrow="المسار الأول"
                title="إنشاء عقد بنفسي"
                description="ابحث عن العقد المناسب، اعرف استخدامه وسعره، ثم أدخل بياناته خطوة بخطوة وراجعه قبل الدفع."
                action="اختيار العقد"
              />
              <ServiceCard
                href="/create-contract?mode=lawyer_assisted"
                icon={<Scale className="h-6 w-6" />}
                eyebrow="المسار الثاني"
                title="إنشاء عقد بواسطة محامي المكتب"
                description="اختر نوع العقد، ارفع المستندات المتاحة، واعرف السعر الكامل والعربون قبل إرسال الطلب للمكتب."
                action="اختيار العقد"
                accent
              />
              <a href="#consultation" className="group rounded-3xl border border-amber-200 bg-amber-50/60 p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#986410] text-white"><Scale className="h-6 w-6" /></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#986410]">{loading ? "..." : loadError ? "السعر غير متاح" : `${consultationFee.toLocaleString("ar-EG")} ج.م`}</span></div>
                <span className="mt-5 block text-[10px] font-black text-[#986410]">المسار الثالث</span>
                <h2 className="mt-1 text-xl font-black text-[#00102e]">استشارة قانونية</h2>
                <p className="mt-3 min-h-20 text-xs leading-7 text-slate-600">اكتب موضوع الاستشارة، ارفع المستندات إن وجدت، واختر وسيلة التواصل واليوم والموعد المتاح.</p>
                <span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-[#986410]">طلب استشارة <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /></span>
              </a>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-[#f8fafc] py-10">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-3">
            <Info icon={<CheckCircle2 className="h-5 w-5" />} title="اختيار واضح من البداية" text="لا توجد نافذة لاحقة لتغيير طريقة الإعداد؛ تختار بنفسك أو بواسطة المحامي قبل اختيار العقد." />
            <Info icon={<ShieldCheck className="h-5 w-5" />} title="الأسعار من مصدر واحد" text="سعر كل عقد وخدمات المكتب تأتي من الإدارة، وتُثبت على الطلب عند إنشائه." />
            <Info icon={<FileText className="h-5 w-5" />} title="كل شيء داخل حسابك" text="المسودات والطلبات وإثباتات الدفع والمستندات والنسخ النهائية تبقى مرتبطة بحسابك." />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <LegalConsultationCard />
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ServiceCard({ href, icon, eyebrow, title, description, action, accent = false }: { href: string; icon: ReactNode; eyebrow: string; title: string; description: string; action: string; accent?: boolean }) {
  return <Link href={href} className={`group rounded-3xl border p-6 transition hover:-translate-y-0.5 hover:shadow-lg ${accent ? "border-[#986410]/25 bg-[#00102e] text-white" : "border-slate-200 bg-white"}`}>
    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent ? "bg-[#986410] text-white" : "bg-[#00102e] text-[#d9a84e]"}`}>{icon}</div>
    <span className={`mt-5 block text-[10px] font-black ${accent ? "text-[#d9a84e]" : "text-[#986410]"}`}>{eyebrow}</span>
    <h2 className={`mt-1 text-xl font-black ${accent ? "text-white" : "text-[#00102e]"}`}>{title}</h2>
    <p className={`mt-3 min-h-20 text-xs leading-7 ${accent ? "text-slate-300" : "text-slate-600"}`}>{description}</p>
    <span className={`mt-5 inline-flex items-center gap-2 text-xs font-black ${accent ? "text-[#d9a84e]" : "text-[#00102e]"}`}>{action}<ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /></span>
  </Link>;
}

function Info({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[#986410]">{icon}</div><h3 className="mt-3 text-sm font-black text-[#00102e]">{title}</h3><p className="mt-2 text-xs leading-6 text-slate-500">{text}</p></div>;
}
