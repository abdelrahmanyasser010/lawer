"use client";

import { AlertTriangle, Clock3, FileCheck2, Scale, ShieldCheck } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

const sections = [
  {
    icon: FileCheck2,
    title: "مسؤولية صحة البيانات",
    items: [
      "أنت مسؤول عن صحة بيانات الأطراف والعقار أو محل التعاقد والمستندات التي ترفعها.",
      "لا تتحقق المنصة تلقائيًا من ملكية العقار أو صحة المستندات أو صفة الأطراف إلا إذا طلبت خدمة قانونية مستقلة واتفق المكتب على نطاقها.",
      "يجب مراجعة المعاينة بعناية قبل رفع إثبات الدفع وقبل إصدار النسخة النهائية.",
    ],
  },
  {
    icon: Clock3,
    title: "مهلة تعديل العقد الذاتي",
    items: [
      "تبدأ مهلة التعديل بعد اعتماد الدفع من الإدارة، وليس عند رفع الإيصال.",
      "خلال المهلة يمكنك تعديل البيانات غير الأساسية فقط؛ بيانات الأطراف ومحل العقد الأساسية تُثبت بعد اعتماد الدفع.",
      "بعد انتهاء المهلة أو طلب الإصدار المبكر، لا تُعدل النسخة الصادرة مباشرة. أي تصحيح لاحق يتم بطلب جديد وإصدار مستقل عند الحاجة.",
    ],
  },
  {
    icon: Scale,
    title: "الفرق بين الإنشاء الذاتي وخدمة المحامي",
    items: [
      "العقد الذاتي يُنشأ من إجاباتك على القالب، ولا يُعد تلقائيًا استشارة قانونية مخصصة لحالتك.",
      "خدمة المحامي تُطلب بصورة مستقلة، ويحدد المكتب وسيلة التواصل والموعد ونطاق العمل بعد مراجعة الطلب.",
      "التواصل مع المحامي يتم في المكتب أو عبر Zoom أو WhatsApp؛ لا توجد محادثات داخل المنصة.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "الحساب والملفات",
    items: [
      "التحقق من البريد يثبت القدرة على الوصول إلى البريد فقط، ولا يثبت الهوية القانونية ولا يُعد توقيعًا إلكترونيًا.",
      "المنصة تحفظ نسخ الطلبات والعقود والملفات المرتبطة بها بحسب صلاحيات الحساب وسياسة الاحتفاظ بالبيانات.",
      "عند مراجعة عقد مرفوع، يحتفظ النظام بالملف الأصلي وبكل تقرير أو نسخة معدلة يتيحها المكتب بدل استبدال الملفات السابقة.",
    ],
  },
];

export default function DeclarationPage() {
  const { catalog } = usePublicCatalog();

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <header className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00102e] text-[#986410]"><Scale className="h-7 w-7" /></div>
          <h1 className="mt-5 text-3xl font-black text-[#00102e]">إقرار استخدام خدمة إعداد العقود</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-slate-600">اقرأ النقاط التالية قبل الدفع أو طلب إصدار العقد. هذه الصفحة توضح طريقة عمل الخدمة ولا تستبدل مراجعة محامٍ عند وجود حالة خاصة أو مخاطرة قانونية.</p>
        </header>

        <div className="mt-10 space-y-5">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#986410]/10 text-[#986410]"><Icon className="h-5 w-5" /></div><h2 className="font-black text-[#00102e]">{section.title}</h2></div>
                <ul className="mt-5 space-y-3 text-xs leading-7 text-slate-700">
                  {section.items.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#986410]" /> <span>{item}</span></li>)}
                </ul>
              </section>
            );
          })}
        </div>

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-700" /><div><h2 className="font-black text-amber-950">قبل المتابعة</h2><p className="mt-2 text-xs leading-7 text-amber-900">مهلة تعديل العقد الذاتي الحالية هي {catalog.policies.selfServiceEditHours} ساعة بعد اعتماد الدفع. السعر وسياسة الاسترداد وأي تكلفة إضافية لخدمة المحامي يجب أن تظهر لك قبل تأكيد الطلب. لا تعتبر المعاينة أو زر تأكيد الاستلام توقيعًا إلكترونيًا.</p></div></div>
        </section>

        <div className="mt-8 text-center"><button type="button" onClick={() => window.history.back()} className="rounded-xl bg-[#00102e] px-8 py-3 text-sm font-black text-white">العودة</button></div>
      </main>
      <Footer />
    </div>
  );
}
