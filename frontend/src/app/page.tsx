"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, Scale } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

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
            
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-1.5 text-[11px] font-black text-[#986410] border border-[#d9a84e]/30 shadow-sm">
                <Scale className="h-4 w-4" /> منصة Z Draft لإعداد العقود القانونية
              </span>
              
              <h1 className="mx-auto mt-8 max-w-4xl text-[36px] font-black leading-[1.3] text-[#00102e] sm:text-[48px] lg:text-[56px] tracking-tight">
                جهّز عقدك من بيانات واضحة 
                <br className="hidden sm:block" />
                وبخطوات <span className="relative whitespace-nowrap">
                  <span className="relative z-10">منظمة.</span>
                  <span className="absolute bottom-1 left-0 right-0 z-0 h-3 rounded-full bg-[#d9a84e]" />
                </span>
              </h1>
              
              <p className="mx-auto mt-6 max-w-2xl text-[15px] font-medium leading-[1.8] text-slate-500">
                اختر القالب أو خدمة المراجعة، املأ البيانات المطلوبة، وتابع الطلبات والمستندات من حسابك 
                <br className="hidden sm:block" />
                بدون تعقيد
              </p>
            </div>
          </div>
        </section>

        {/* 
          2. OVERLAPPING MODE CARDS 
        */}
        <section className="relative z-20 mx-auto max-w-6xl px-4 sm:px-6 -mt-36">
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
        <section className="bg-white py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4 divide-x divide-x-reverse divide-slate-100">
              
              <div className="flex flex-col items-center justify-center">
                <div className="text-[32px] font-black text-[#00102e]">+15,000</div>
                <div className="mt-2 text-[12px] font-bold text-slate-500">عقد تم إنشاؤه</div>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <div className="text-[32px] font-black text-[#00102e]">+8,500</div>
                <div className="mt-2 text-[12px] font-bold text-slate-500">عميل موثوق</div>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="text-[32px] font-black text-[#00102e]">+25</div>
                <div className="mt-2 text-[12px] font-bold text-slate-500">نوع عقد جاهز</div>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="text-[32px] font-black text-[#00102e]">+98%</div>
                <div className="mt-2 text-[12px] font-bold text-slate-500">رضا العملاء</div>
              </div>

            </div>
          </div>
        </section>

        {/* 
          4. LAWYERS (SPECIALISTS) SECTION
          - Avatar style design (men only per instructions)
        */}
        <section className="bg-white pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            
            <div className="text-center">
              <span className="text-[11px] font-black text-[#986410]">الخبرة القانونية</span>
              <h2 className="mt-3 text-3xl font-black text-[#00102e] sm:text-4xl">محامون مختصون حسب نوع الطلب</h2>
              <p className="mt-4 text-[13px] font-medium text-slate-500">
                في مسارات الإعداد والمراجعة يمكن توجيه الطلب إلى محام مختص مناسب لنوع العقد والبيانات المرفوعة.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-3">
              {[
                { 
                  name: "أ. أحمد محمود",
                  title: "محامي بالنقض والإدارية العليا",
                  desc: "خبير في صياغة عقود الشركات والنزاعات التجارية المعقدة.",
                  cases: "+450",
                  exp: "15",
                  image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&q=80" 
                },
                { 
                  name: "أ. كريم فؤاد",
                  title: "مستشار قانوني تجاري",
                  desc: "متخصص في تأسيس الشركات ومراجعة عقود الشراكة والملكية الفكرية.",
                  cases: "+320",
                  exp: "12",
                  image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&q=80" 
                },
                { 
                  name: "أ. طارق إبراهيم",
                  title: "محامي مدني وعقاري",
                  desc: "خبرة واسعة في عقود البيع، الإيجارات، والنزاعات العقارية.",
                  cases: "+500",
                  exp: "18",
                  image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&q=80" 
                },
              ].map((p) => (
                <div key={p.name} className="flex flex-col items-center rounded-[2rem] border border-slate-100 bg-white p-8 shadow-lg shadow-slate-200/40 transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50">
                  <div className="relative mb-5 h-28 w-28 shrink-0 rounded-full border-4 border-[#fdf5e4] bg-slate-50 p-1">
                    <img src={p.image} alt={p.name} className="h-full w-full rounded-full object-cover object-top" />
                    <span className="absolute bottom-1 right-2 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" title="متاح الآن"></span>
                  </div>
                  <h3 className="text-[19px] font-black text-[#00102e]">{p.name}</h3>
                  <p className="mt-1 text-[13px] font-black text-[#d9a84e]">{p.title}</p>
                  
                  <p className="mt-4 min-h-[44px] text-center text-[13px] font-medium leading-[1.8] text-slate-500">
                    {p.desc}
                  </p>
                  
                  <hr className="my-6 w-full border-slate-100" />
                  
                  <div className="flex w-full justify-around text-center text-[12px] font-bold text-slate-500">
                    <div>
                      <span className="block text-[16px] font-black text-[#00102e]">{p.cases}</span>
                      قضية وعقد
                    </div>
                    <div className="h-8 w-px bg-slate-100"></div>
                    <div>
                      <span className="block text-[16px] font-black text-[#00102e]">{p.exp}</span>
                      سنة خبرة
                    </div>
                  </div>
                </div>
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
