import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { FileLock2, ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00102e] text-[#d9a84e]"><FileLock2 className="h-5 w-5" /></div><div><h1 className="text-2xl font-black text-[#00102e]">سياسة الخصوصية وحفظ المستندات</h1><p className="mt-1 text-xs font-semibold text-slate-500">ملخص واضح لطريقة تعامل المنصة مع بيانات الحساب والعقود والمرفقات.</p></div></div>
          <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
            <section><h2 className="font-black text-[#00102e]">البيانات التي تُحفظ</h2><p className="mt-2">يحفظ النظام بيانات الحساب، بيانات العقود التي تدخلها، المستندات والمرفقات، إيصالات الدفع، وسجل الحالات والإشعارات اللازمة لتقديم الخدمة ومتابعتها.</p></section>
            <section><h2 className="font-black text-[#00102e]">الوصول إلى المستندات</h2><p className="mt-2">المستندات ليست روابط عامة. الوصول إليها مرتبط بالحساب والصلاحيات، وروابط مشاركة العقود تكون مقيدة ومحددة الصلاحية عند استخدامها.</p></section>
            <section><h2 className="font-black text-[#00102e]">الصور والمرفقات</h2><p className="mt-2">تُراجع أنواع الملفات على الخادم، وتُعالج الصور لتقليل الحجم وإزالة البيانات الوصفية غير اللازمة قبل الحفظ التشغيلي.</p></section>
            <section><h2 className="font-black text-[#00102e]">المسودات على جهازك</h2><p className="mt-2">قد تُحفظ مسودة مؤقتة داخل جلسة المتصفح لتجنب فقد العمل أثناء الإعداد. تنتهي هذه النسخة المؤقتة تلقائيًا، بينما الحفظ الدائم للعقد يتم داخل حسابك على الخادم.</p></section>
            <section><h2 className="font-black text-[#00102e]">مدة الاحتفاظ والطلبات المتعلقة بالبيانات</h2><p className="mt-2">تُحتفظ البيانات بالقدر اللازم لتشغيل الخدمة وحفظ السجل القانوني والتشغيلي، ووفق المتطلبات النظامية وسياسة المكتب. للاستفسار عن بياناتك أو طلب إجراء متاح قانونًا بشأنها استخدم بيانات الدعم الظاهرة داخل المنصة.</p></section>
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-emerald-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> لا تُستخدم هذه الصفحة بدل الاستشارة القانونية بشأن التزامات حماية البيانات؛ وهي توضح سلوك المنصة التشغيلي للمستخدم.</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
