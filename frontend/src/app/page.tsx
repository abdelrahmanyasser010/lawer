"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, Scale, ShieldCheck, QrCode, Lock, Shield, Zap, FileBadge2, Building2, Headset, FolderLock, BarChart3, Database, Users } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col font-sans text-right" dir="rtl">
      
      {/* Top Banner */}
      <div className="bg-[#fffdf5] py-2 text-center border-b border-[#f0e8d9]">
        <p className="text-[11px] font-black text-[#986410]">
          نسخة تجريبية للمعاينة — عمليات التسجيل والدفع والإرسال هنا وهمية تماماً
        </p>
      </div>

      <Navbar />
      
      <main className="flex-1">
        
        {/* 
          1. HERO SECTION 
          - Math notebook grid background 
          - Gold underline under "منظمة."
          - Overlapping cards
        */}
        <section className="relative overflow-hidden bg-[#fdfcf9]">
          {/* Grid Background */}
          <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="relative z-10 mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:pt-24 pb-48">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              {/* Text Side (Right) */}
              <div className="text-right z-30">
                <h1 className="text-[32px] font-black leading-[1.4] text-[#00102e] sm:text-[40px] lg:text-[48px] tracking-tight">
                  صياغة قانونية موثوقة، 
                  <br />
                  <span className="bg-gradient-to-l from-[#986410] via-[#d9a84e] to-[#986410] bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-x">
                    بذكاء واحترافية
                  </span>
                </h1>
                
                <p className="mt-6 max-w-lg text-[14px] font-bold leading-[1.8] text-slate-500">
                  المنصة الأولى لإعداد العقود الذكية وتقديم الاستشارات القانونية. احصل على عقودك جاهزة في دقائق، أو اعتمد على نخبة من المحامين المختصين لضمان حماية حقوقك بأعلى المعايير.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href="/create-contract?mode=self_service" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#00102e] px-8 text-[13px] font-black text-white transition hover:bg-[#001a42]">
                    <FileText className="h-4 w-4" /> ابدأ بصياغة عقد الآن
                  </Link>
                  <Link href="/create-contract?mode=lawyer_assisted" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-transparent px-8 text-[13px] font-black text-[#00102e] transition hover:bg-slate-50">
                    <Scale className="h-4 w-4" /> اطلب من محامٍ مختص
                  </Link>
                </div>

                <div className="mt-8 flex items-center gap-6 text-[11px] font-black text-[#986410]">
                  <span className="flex items-center gap-1.5"><Scale className="h-4 w-4" /> معتمد قانونياً</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> متوافق مع الأنظمة</span>
                  <span className="flex items-center gap-1.5"><Lock className="h-4 w-4" /> بياناتك محمية</span>
                </div>
              </div>

              {/* Mockup Side (Left) */}
              <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none animate-fade-in-up delay-200">
                {/* Decorative background shape */}
                <div className="absolute -inset-4 z-0 rounded-[3rem] bg-[#00102e] transform rotate-[-3deg] shadow-2xl" />
                <div className="absolute -inset-4 z-0 rounded-[3rem] bg-[#001a42] transform rotate-[3deg] opacity-50" />
                
                {/* Contract Mockup Card */}
                <div className="relative z-10 flex flex-col rounded-[2rem] bg-white p-6 shadow-xl border border-slate-100 min-h-[340px]">
                  
                  {/* Centered Logo at top */}
                  <div className="flex justify-center mb-6 pb-6 border-b border-slate-100 overflow-visible">
                    <Image src="/logo.png" alt="Z draft" width={240} height={80} className="h-16 w-auto object-contain scale-125" />
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[22px] font-black text-[#00102e]">عقد اتفاقية شراكة</h3>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> تم إنشاؤه بنجاح
                      </div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fdf5e4] text-[#d9a84e]">
                      <Shield className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="mt-8 space-y-4 rounded-xl bg-slate-50 p-4">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-slate-500">رقم العقد</span>
                      <span className="font-black text-[#00102e] font-mono">ZD-2024-0001258</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-slate-500">تاريخ الإنشاء</span>
                      <span className="font-black text-[#00102e] font-mono">2024-05-12</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-slate-500">الحالة</span>
                      <span className="font-black text-emerald-600">موثق وفعّال</span>
                    </div>
                  </div>


                </div>

                {/* Floating Badges */}
                <div className="absolute -left-12 top-6 z-20 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl border border-slate-100 animate-pulse">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[#00102e]">أسرع</span>
                    <span className="text-[8px] font-bold text-slate-500">في دقائق معدودة</span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                    <Zap className="h-4 w-4" />
                  </div>
                </div>
                
                <div className="absolute -left-16 top-32 z-20 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[#00102e]">آمن</span>
                    <span className="text-[8px] font-bold text-slate-500">موثق بتقنية Blockchain</span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
                
                <div className="absolute -left-12 top-56 z-20 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[#00102e]">احترافي</span>
                    <span className="text-[8px] font-bold text-slate-500">معتمد وجاهز للاستخدام</span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                    <FileBadge2 className="h-4 w-4" />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 
          2. OVERLAPPING MODE CARDS 
        */}
        <section className="relative z-20 mx-auto max-w-6xl px-4 sm:px-6 -mt-36 animate-fade-in-up delay-300">
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Card 1: Self Service */}
            <div className="flex flex-col rounded-[2rem] bg-[#00102e] p-8 text-white shadow-2xl shadow-[#00102e]/20 transition-transform hover:-translate-y-2">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <FileText className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black text-white uppercase">
                  الأسرع والأوفر
                </span>
              </div>
              <h3 className="mt-8 text-[22px] font-black">صياغة فورية بنفسي</h3>
              <p className="mt-4 text-[13px] font-medium leading-[1.8] text-slate-300">
                اختر القالب، املأ البيانات بنفسك، وشاهد العقد يتكون أمامك خطوة بخطوة قبل الاعتماد والتوقيع.
              </p>
              <Link href="/create-contract?mode=self_service" className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d9a84e] text-[13px] font-black text-[#00102e] transition hover:bg-white">
                ابدأ الصياغة الآن <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>

            {/* Card 2: Lawyer Assisted */}
            <div className="flex flex-col rounded-[2rem] bg-[#fffbf2] border border-[#d9a84e]/30 p-8 text-[#00102e] shadow-xl shadow-[#d9a84e]/5 transition-transform hover:-translate-y-2">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#986410] text-white">
                  <Scale className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <span className="rounded-full bg-[#fdf5e4] px-3 py-1.5 text-[10px] font-black text-[#986410] uppercase border border-[#d9a84e]/30">
                  للحالات المعقدة
                </span>
              </div>
              <h3 className="mt-8 text-[22px] font-black">إعداد بواسطة محام</h3>
              <p className="mt-4 text-[13px] font-medium leading-[1.8] text-slate-600">
                ارفع المستندات، واطلب من محامي متخصص إعداد عقد مفصل ومخصص يحمي كافة حقوقك القانونية.
              </p>
              <Link href="/create-contract?mode=lawyer_assisted" className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] text-[13px] font-black text-white transition hover:bg-[#001a42]">
                اطلب محامي <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>

            {/* Card 3: Review */}
            <div className="flex flex-col rounded-[2rem] bg-white border border-slate-200 p-8 text-[#00102e] shadow-xl shadow-slate-200/50 transition-transform hover:-translate-y-2">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-[#00102e]">
                  <CheckCircle2 className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-500 uppercase">
                  حماية قبل التوقيع
                </span>
              </div>
              <h3 className="mt-8 text-[22px] font-black">مراجعة عقد قائم</h3>
              <p className="mt-4 text-[13px] font-medium leading-[1.8] text-slate-500">
                لا توقع قبل المراجعة. ارفع العقد واحصل على تقرير قانوني بالمخاطر والبنود المجحفة التي تحتاج تعديل.
              </p>
              <Link href="/create-contract?mode=review" className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[13px] font-black text-[#00102e] transition hover:bg-slate-50">
                اطلب مراجعة <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </section>

        {/* 
          3. STATISTICS SECTION
        */}
        <section className="bg-white py-20 border-t border-slate-100">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 animate-fade-in-up delay-300">
              {[
                { value: 15000, suffix: "+", label: "عقد تم إنشاؤه", icon: FileText },
                { value: 8500, suffix: "+", label: "عميل موثوق", icon: Users },
                { value: 25, suffix: "+", label: "نوع عقد جاهز", icon: BarChart3 },
                { value: 98, suffix: "%", label: "رضا العملاء", icon: ShieldCheck },
              ].map(({ value, suffix, label, icon: Icon }, i) => (
                <div key={label} className={`flex flex-col items-center justify-center py-10 px-6 ${i < 3 ? "border-l border-slate-100" : ""}`}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf5e4] mb-4">
                    <Icon className="h-5 w-5 text-[#986410]" />
                  </div>
                  <div className="text-[36px] font-black text-[#00102e] leading-none">
                    <AnimatedCounter value={value} suffix={suffix} />
                  </div>
                  <div className="mt-2 text-[12px] font-bold text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 
          SERVICES GRID + TRUST — unified section, light-to-dark gradient background 
        */}
        <section className="bg-gradient-to-b from-[#f8f9fc] to-[#00102e] py-24 relative overflow-hidden">
          {/* decorative grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10">

            {/* Services header */}
            <div className="text-center mb-14 animate-fade-in-up">
              <span className="inline-block rounded-full bg-[#fdf5e4] px-4 py-1.5 text-[11px] font-black text-[#986410] mb-4">خدماتنا</span>
              <h2 className="text-[30px] font-black text-[#00102e]">كل ما تحتاجه في مكان واحد</h2>
              <p className="mt-3 text-[13px] font-medium text-slate-500">اختر الخدمة المناسبة وابدأ الآن</p>
            </div>

            {/* Services 3+3 grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in-up delay-200">
              {[
                { icon: FileText, title: "صياغة فورية بنفسك", desc: "اختر القالب، أجب عن الأسئلة، واستلم عقدك في دقائق.", link: "/create-contract?mode=self_service", cta: "ابدأ الآن" },
                { icon: Users, title: "صياغة بواسطة محام", desc: "محامٍ مختص يصوغ لك عقداً احترافياً مخصصاً.", link: "/create-contract?mode=lawyer_assisted", cta: "اطلب الآن" },
                { icon: CheckCircle2, title: "مراجعة عقد قائم", desc: "ارفع عقدك واحصل على تقرير قانوني شامل بالمخاطر.", link: "/request-review", cta: "اطلب مراجعة" },
                { icon: Headset, title: "استشارة قانونية", desc: "احجز جلسة مع محامٍ مختص للإجابة على استفساراتك.", link: "/requests", cta: "احجز جلسة" },
                { icon: FolderLock, title: "Z Draft Vault", desc: "خزنة عقودك الآمنة — احفظ وشارك وتحقق بسهولة.", link: "/contracts", cta: "اكتشف الآن" },
                { icon: BarChart3, title: "عقود جاهزة للاستخدام", desc: "أكثر من 25 قالب عقد محدّث ومعتمد من خبرائنا.", link: "/create-contract?mode=self_service", cta: "تصفح القوالب" },
              ].map(({ icon: Icon, title, desc, link, cta }) => (
                <Link key={title} href={link} className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg hover:border-[#d9a84e]/40 hover:-translate-y-1 transition-all duration-300">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 group-hover:bg-[#fdf5e4] group-hover:text-[#986410] transition">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-[#00102e]">{title}</h3>
                    <p className="mt-1 text-[11px] font-medium text-slate-500 leading-relaxed">{desc}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-[#986410]">
                      {cta} <ArrowLeft className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Separator */}
            <div className="mt-20 mb-16 border-t border-white/10" />

            {/* Trust + Security — on the dark part of the gradient */}
            <div className="text-center mb-10 animate-fade-in-up delay-300">
              <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-black text-[#d9a84e] mb-3">الأمان والموثوقية</span>
              <h2 className="text-[24px] font-black text-white">منصة قانونية موثوقة وآمنة</h2>
            </div>

            {/* Trust logos */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-10 animate-fade-in-up delay-400">
              {[
                { icon: Scale, label: "نقابة المحامين المصريين" },
                { icon: Building2, label: "وزارة العدل" },
                { icon: ShieldCheck, label: "التوثيق الرسمي للعقود" },
                { icon: FileBadge2, label: "مجلس الدولة" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 hover:border-[#d9a84e]/30 hover:bg-white/10 transition">
                  <Icon className="h-4 w-4 text-[#d9a84e]" />
                  <span className="text-[11px] font-bold text-slate-200">{label}</span>
                </div>
              ))}
            </div>

            {/* Security pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in-up delay-500">
              {[
                { icon: Lock, label: "تشفير AES-256" },
                { icon: Database, label: "توثيق Blockchain" },
                { icon: Shield, label: "سرية تامة" },
                { icon: Zap, label: "نسخ احتياطية فورية" },
                { icon: ShieldCheck, label: "متوافق مع أنظمة وزارة العدل" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.04] px-4 py-1.5 text-[11px] font-bold text-slate-400">
                  <Icon className="h-3.5 w-3.5 text-[#986410]" />
                  {label}
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* 
          4. LAWYERS (SPECIALISTS) SECTION — Slider
        */}
        <section className="bg-[#00102e] py-24 relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
            
            <div className="text-center animate-fade-in-up mb-16">
              <span className="inline-block rounded-full bg-[#d9a84e]/10 px-4 py-1.5 text-[11px] font-black text-[#d9a84e] mb-4">فريقنا القانوني</span>
              <h2 className="text-[32px] font-black text-white sm:text-[36px]">محامون مختصون حسب نوع الطلب</h2>
              <p className="mt-4 text-[14px] font-medium text-slate-400 max-w-2xl mx-auto leading-relaxed">
                يتولى طلبك محامٍ مختص حسب نوع العقد وطبيعة النزاع، لضمان أعلى درجات الاحترافية والدقة القانونية.
              </p>
            </div>

            {/* Slider — horizontal scroll snap */}
            <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scroll-smooth no-scrollbar animate-fade-in-up delay-200">
              {[
                { 
                  name: "أ. أحمد محمود",
                  title: "محامي بالنقض والإدارية العليا",
                  desc: "خبير في صياغة عقود الشركات والنزاعات التجارية المعقدة والتحكيم الدولي.",
                  cases: "450", exp: "15",
                  tags: ["تجاري", "نزاعات", "شركات"],
                  image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&h=820&q=80"
                },
                { 
                  name: "أ. كريم فؤاد",
                  title: "مستشار قانوني تجاري",
                  desc: "متخصص في تأسيس الشركات، صياغة لوائح الحوكمة، ومراجعة عقود الشراكة.",
                  cases: "320", exp: "12",
                  tags: ["حوكمة", "تأسيس", "عقود"],
                  image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&h=820&q=80"
                },
                { 
                  name: "أ. طارق إبراهيم",
                  title: "محامي مدني وعقاري",
                  desc: "خبرة واسعة في عقود البيع، الإيجارات، الاستثمار العقاري، والنزاعات المدنية.",
                  cases: "500", exp: "18",
                  tags: ["عقاري", "مدني", "استثمار"],
                  image: "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=600&h=820&q=80"
                },
                { 
                  name: "أ. مصطفى كمال",
                  title: "محامي عمالي وتأمينات",
                  desc: "متخصص في صياغة عقود العمل، لوائح تنظيم العمل، وتسوية النزاعات العمالية.",
                  cases: "280", exp: "10",
                  tags: ["عمالي", "تأمينات", "لوائح"],
                  image: "https://images.unsplash.com/photo-1583900985737-6d0425556126?auto=format&fit=crop&w=600&h=820&q=80"
                },
              ].map((p) => (
                <div key={p.name} className="group relative shrink-0 w-[280px] sm:w-[300px] snap-start overflow-hidden rounded-[1.5rem] border border-white/8 bg-white/[0.03] hover:border-[#d9a84e]/30 transition-all duration-500 hover:-translate-y-2">
                  {/* Gold top border */}
                  <div className="h-[2px] w-full bg-gradient-to-l from-[#986410] to-[#d9a84e]" />
                  
                  {/* Full photo — no crop, full height with contain */}
                  <div className="relative bg-[#000d20]" style={{height: "340px"}}>
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]" 
                    />
                    {/* Bottom gradient for text readability */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#00102e] to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {p.tags.map(t => (
                        <span key={t} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-slate-300 group-hover:border-[#d9a84e]/20 group-hover:text-[#d9a84e] transition-colors">{t}</span>
                      ))}
                    </div>

                    <h3 className="text-[17px] font-black text-white">{p.name}</h3>
                    <p className="mt-0.5 text-[11px] font-bold text-[#d9a84e]">{p.title}</p>
                    <p className="mt-2 text-[11px] font-medium leading-[1.7] text-slate-400">{p.desc}</p>

                    {/* Stats */}
                    <div className="mt-4 grid grid-cols-2 divide-x divide-x-reverse divide-white/8 border-t border-white/8 pt-4">
                      <div className="text-center">
                        <div className="text-[18px] font-black text-white">+{p.cases}</div>
                        <div className="text-[9px] font-bold text-slate-500 mt-0.5">قضية وعقد</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[18px] font-black text-white">{p.exp}</div>
                        <div className="text-[9px] font-bold text-slate-500 mt-0.5">سنة خبرة</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Scroll hint dots */}
            <div className="flex justify-center gap-2 mt-6">
              {[0,1,2,3].map(i => (
                <div key={i} className={`h-1.5 rounded-full bg-white/20 transition-all ${i === 0 ? "w-6 bg-[#d9a84e]" : "w-1.5"}`} />
              ))}
            </div>

          </div>
        </section>

        {/* 
          5. HOW IT WORKS SECTION (Navy background)
        */}
        <section className="bg-[#00102e] py-24 text-white">
          <div className="mx-auto grid max-w-6xl gap-16 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center">
            
            {/* Steps on the right (RTL, so it's the first div in source) */}
            <div className="space-y-6">
              {[
                { n: "1", title: "حدد المسار المناسب لطلبك", text: "سواء كنت تريد إعداد عقد بنفسك، أو ترغب في توكيل محام، أو حتى مراجعة عقد مكتوب مسبقاً." },
                { n: "2", title: "أدخل البيانات وارفع المستندات", text: "نظامنا الذكي يوجهك خطوة بخطوة لإدخال التفاصيل الأساسية للمستندات المطلوبة بطريقة سلسة ومحمية." },
                { n: "3", title: "راجع واستلم نسختك النهائية", text: "بمجرد الانتهاء ستجد النسخة النهائية جاهزة للمراجعة أو التحميل ومحفوظة بأمان في حسابك." },
              ].map((step) => (
                <div key={step.n} className="relative rounded-[2rem] bg-white/5 p-8 pr-16 transition hover:bg-white/10">
                  <span className="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-[#d9a84e] text-[13px] font-black text-[#00102e] shadow-lg">
                    {step.n}
                  </span>
                  <h3 className="text-[17px] font-black">{step.title}</h3>
                  <p className="mt-3 text-[13px] font-medium leading-[1.8] text-slate-400">{step.text}</p>
                </div>
              ))}
            </div>

            {/* Text on the left */}
            <div className="text-right">
              <span className="inline-flex rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-black text-[#d9a84e]">
                آلية العمل
              </span>
              <h2 className="mt-6 text-[32px] font-black leading-[1.3] sm:text-[40px]">
                من البداية للاستلام
                <br />
                <span className="text-[#d9a84e]">في ٣ خطوات فقط</span>
              </h2>
              <p className="mt-6 text-[14px] font-medium leading-[1.8] text-slate-300">
                صممنا المنصة لتختصر عليك الوقت والجهد. لا حاجة لزيارات ميدانية أو اجتماعات طويلة. اختر المسار، أدخل بياناتك، واترك الباقي لتقنياتنا وفريقنا القانوني لضمان حماية حقوقك بالكامل.
              </p>
              <Link href="/create-contract?mode=self_service" className="mt-10 inline-flex h-14 items-center justify-center gap-3 rounded-[1rem] bg-white px-8 text-[14px] font-black text-[#00102e] transition hover:bg-slate-200">
                تصفح قوالب العقود
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

