import { FileCheck2, Scale, ShieldCheck, WalletCards } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const sections = [
  {
    icon: FileCheck2,
    title: "نطاق خدمات المنصة",
    items: [
      "تتيح Z Draft إنشاء عقود ذاتيًا من القوالب المتاحة، وطلب إعداد عقد بواسطة محامي المكتب، ورفع عقد قائم لمراجعته.",
      "خدمة مراجعة العقد تشمل الطلب والمستندات والمخرجات ومناقشة تقرير المراجعة وفق المواعيد المتاحة؛ ولا توجد خدمة استشارة مستقلة داخل المنصة.",
      "أي خدمة أو مخرج يعتمد على البيانات والمستندات التي يقدمها العميل وعلى النطاق الظاهر له قبل تأكيد الطلب.",
    ],
  },
  {
    icon: WalletCards,
    title: "الأسعار والدفع",
    items: [
      "يظهر السعر أو العربون المطلوب قبل التحويل، ويجب رفع إثبات الدفع من الحساب المسجل بعد تأكيد البريد الإلكتروني.",
      "مراجعة العقد قد تتضمن إجماليًا وعربونًا ومبلغًا متبقيًا، ويظهر المبلغ المستحق في كل مرحلة داخل الطلب.",
      "لا يُعد رفع الإيصال اعتمادًا للدفع؛ يبدأ أثر الدفع بعد مراجعته واعتماده من الإدارة.",
    ],
  },
  {
    icon: Scale,
    title: "العقود والمراجعة",
    items: [
      "العميل مسؤول عن صحة البيانات والمستندات التي يدخلها أو يرفعها، وعن مراجعة المعاينة قبل الدفع والإصدار.",
      "تظل القواعد القانونية الآمرة وقواعد الاختصاص القضائي واجبة التطبيق حتى عند اختيار محكمة مختصة داخل العقد.",
      "الملاحق الاختيارية تظهر كقوالب مستقلة عند اختيارها، ولا تُعد جزءًا إلزاميًا من العقد ما لم يختَرها المستخدم أو يتفق الطرفان عليها.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "الحساب والخصوصية والاستخدام المقبول",
    items: [
      "يجب الحفاظ على بيانات الدخول وعدم مشاركة الحساب أو استخدامه للوصول غير المصرح به إلى عقود أو ملفات الغير.",
      "تُحفظ السجلات والملفات المرتبطة بالطلبات والعقود وفق صلاحيات الحساب وسياسة الخصوصية وإجراءات التشغيل المعتمدة.",
      "يجوز للمنصة منع أو تعليق أي استخدام يضر بأمن النظام أو يتضمن بيانات مضللة أو محاولة تجاوز الصلاحيات أو آليات الدفع.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <header className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00102e] text-[#d9a84e]"><Scale className="h-7 w-7" /></div>
          <h1 className="mt-5 text-3xl font-black text-[#00102e]">الشروط والأحكام</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-slate-600">تنظم هذه الشروط استخدام خدمات Z Draft وحساب العميل ودورة العقود وطلبات مراجعة العقود والدفع داخل المنصة.</p>
        </header>

        <div className="mt-10 space-y-5">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#986410]/10 text-[#986410]"><Icon className="h-5 w-5" /></div><h2 className="font-black text-[#00102e]">{section.title}</h2></div>
                <ul className="mt-5 space-y-3 text-xs leading-7 text-slate-700">
                  {section.items.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#986410]" /><span>{item}</span></li>)}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mt-7 text-center text-[11px] leading-6 text-slate-500">استمرارك في استخدام المنصة يعني موافقتك على الشروط المعروضة وقت الاستخدام، مع مراعاة أي حقوق أو التزامات لا يجوز الاتفاق على مخالفتها قانونًا.</p>
      </main>
      <Footer />
    </div>
  );
}
