"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Clock,
  ShieldCheck,
  Send,
  CheckCircle2,
  Scale,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

export default function ContactPage() {
  const { catalog } = usePublicCatalog();
  const office = catalog.office;

  const phone = office.supportPhone || "+20 100 123 4567";
  const email = office.supportEmail || "support@zdraft.io";
  const address = office.address || "القاهرة، جمهورية مصر العربية - مدينة نصر، شارع عباس العقاد";
  const whatsapp = office.supportWhatsappNumber || office.whatsappNumber || "201001234567";
  const cleanWhatsapp = whatsapp.replace(/[^0-9]/g, "");

  const [formSent, setFormSent] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "استفسار عن خدمة صياغة عقد",
    message: "",
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormSent(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-right font-sans" dir="rtl">
      <Navbar />

      <main className="flex-1">
        {/* Header Hero */}
        <section className="relative overflow-hidden bg-[#00102e] py-16 text-white sm:py-20">
          <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:28px_28px]" />
          <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d9a84e]/30 bg-[#d9a84e]/10 px-4 py-1.5 text-xs font-black text-[#d9a84e]">
              <Scale className="h-4 w-4" /> تواصل مع فريق المحامين والدعم الفني
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              نحن هنا لمساعدتك في كل خطوة قانونية
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs font-bold leading-relaxed text-slate-300 sm:text-sm">
              يسعدنا تلقي استفساراتك حول صياغة العقود، المراجعات القانونية، أو شؤون الفواتير والدفع على مدار الأسبوع عبر القنوات الرسمية.
            </p>
          </div>
        </section>

        {/* Contact Cards Grid */}
        <section className="relative z-20 -mt-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Phone Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-[#986410]">
                <Phone className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-black text-[#00102e]">اتصال هاتفي</h3>
              <p className="mt-1 text-xs text-slate-500">فريق الاستقبال والدعم المباشر</p>
              <a
                href={`tel:${phone}`}
                dir="ltr"
                className="mt-3 block text-sm font-black text-[#986410] hover:underline"
              >
                {phone}
              </a>
              <span className="mt-2 inline-block text-[11px] font-bold text-slate-400">
                من الأحد إلى الخميس: 9ص - 6م
              </span>
            </div>

            {/* Email Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-black text-[#00102e]">البريد الإلكتروني</h3>
              <p className="mt-1 text-xs text-slate-500">للاستفسارات والوثائق الرسمية</p>
              <a
                href={`mailto:${email}`}
                dir="ltr"
                className="mt-3 block text-sm font-black text-blue-700 hover:underline"
              >
                {email}
              </a>
              <span className="mt-2 inline-block text-[11px] font-bold text-slate-400">
                الرد خلال 24 ساعة عمل
              </span>
            </div>

            {/* WhatsApp Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-black text-[#00102e]">واتساب سريع</h3>
              <p className="mt-1 text-xs text-slate-500">محادثة فورية للاستفسار والحجز</p>
              <a
                href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent("مرحباً، أود الاستفسار عن خدمات منصة Z Draft القانونية.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-black text-emerald-600 hover:underline"
              >
                بدء محادثة واتساب <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              </a>
              <span className="mt-2 block text-[11px] font-bold text-slate-400">
                متاح طوال أيام الأسبوع
              </span>
            </div>

            {/* Address Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-black text-[#00102e]">المقر الرئيسي</h3>
              <p className="mt-1 text-xs text-slate-500">مكتب المحاماة والاستشارات</p>
              <p className="mt-3 text-xs font-bold leading-relaxed text-slate-700">
                {address}
              </p>
              <span className="mt-2 inline-block text-[11px] font-bold text-slate-400">
                جمهورية مصر العربية
              </span>
            </div>
          </div>
        </section>

        {/* Contact Form & Office Info */}
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Form Column */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                <div className="flex items-center gap-2 text-xs font-black text-[#986410]">
                  <Send className="h-4 w-4" /> نموذج التواصل والاستفسار
                </div>
                <h2 className="mt-2 text-2xl font-black text-[#00102e]">
                  أرسل لنا رسالة أو استفساراً
                </h2>
                <p className="mt-2 text-xs font-bold text-slate-500">
                  سيتواصل معك أحد محامينا أو ممثلي الدعم الفني لمتابعة طلبك بالتفصيل.
                </p>

                {formSent ? (
                  <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 text-lg font-black text-emerald-900">
                      تم استلام رسالتك بنجاح!
                    </h3>
                    <p className="mt-2 text-xs font-bold leading-relaxed text-emerald-800">
                      شكراً لتواصلك معنا. سنقوم بمراجعة استفسارك والرد عليك على البريد أو الهاتف خلال ساعات العمل.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFormSent(false);
                        setFormData({ name: "", email: "", phone: "", subject: "استفسار عن خدمة صياغة عقد", message: "" });
                      }}
                      className="mt-5 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-800"
                    >
                      إرسال رسالة أخرى
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700">الاسم بالكامل *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="مثال: أحمد محمود"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#986410] focus:ring-1 focus:ring-[#986410]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700">رقم الهاتف *</label>
                        <input
                          type="tel"
                          required
                          dir="ltr"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="01xxxxxxxxx"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#986410] focus:ring-1 focus:ring-[#986410]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700">البريد الإلكتروني *</label>
                        <input
                          type="email"
                          required
                          dir="ltr"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="name@example.com"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#986410] focus:ring-1 focus:ring-[#986410]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700">نوع الخدمة / الموضوع</label>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#986410] focus:ring-1 focus:ring-[#986410]"
                        >
                          <option value="استفسار عن خدمة صياغة عقد">صياغة عقد جديد</option>
                          <option value="طلب مراجعة عقد قائم">طلب مراجعة وتدقيق عقد</option>
                          <option value="حجز استشارة قانونية">حجز استشارة قانونية</option>
                          <option value="استفسار عن الدفع والفواتير">الدفع والفواتير وبوابات الدفع</option>
                          <option value="ملاحظات أو شكاوى">ملاحظات أو شكاوى</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700">تفاصيل الرسالة أو الاستفسار *</label>
                      <textarea
                        rows={5}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="يرجى كتابة تفاصيل استفسارك أو نوع العقد المطلوب..."
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-3.5 text-sm font-bold text-slate-800 outline-none focus:border-[#986410] focus:ring-1 focus:ring-[#986410]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] py-3.5 text-sm font-black text-[#d9a84e] transition hover:bg-[#001a42]"
                    >
                      <Send className="h-4 w-4" /> إرسال الرسالة الآن
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Information Column */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              {/* Working Hours & Commitments Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-2 text-xs font-black text-[#986410]">
                  <Clock className="h-4 w-4" /> ساعات العمل والاستجابة
                </div>
                <h3 className="mt-2 text-lg font-black text-[#00102e]">
                  أوقات عمل المكتب والدعم
                </h3>
                <ul className="mt-4 space-y-3 text-xs font-bold text-slate-600">
                  <li className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span>الأحد — الخميس:</span>
                    <strong className="text-[#00102e]">9:00 ص — 6:00 م</strong>
                  </li>
                  <li className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span>الجمعة والسبت:</span>
                    <span className="text-slate-400">عطلة أسبوعية (الدعم عبر واتساب للحالات العاجلة)</span>
                  </li>
                  <li className="flex items-center justify-between pt-1">
                    <span>الصياغة الذاتية للموقع:</span>
                    <strong className="text-emerald-600">متاحة 24/7 دون توقف</strong>
                  </li>
                </ul>
              </div>

              {/* Guarantees & Credentials */}
              <div className="rounded-3xl border border-slate-200 bg-[#00102e] p-6 text-white shadow-sm sm:p-7">
                <div className="flex items-center gap-2 text-xs font-black text-[#d9a84e]">
                  <ShieldCheck className="h-4 w-4" /> ضمانات ومصداقية المنصة
                </div>
                <h3 className="mt-2 text-lg font-black text-white">
                  معاملاتك القانونية في أيدٍ أمينة
                </h3>
                <ul className="mt-4 space-y-3 text-xs font-medium text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d9a84e]" />
                    <span>محامون مقيدون رسمياً بنقابة المحامين المصرية بخبرات تعاقدية موثوقة.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d9a84e]" />
                    <span>توافق كامل مع أحكام القانون المدني وقانون التجارة المصري.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d9a84e]" />
                    <span>بوابات دفع إلكترونية آمنة ومشفرة تماماً تدعم البطاقات والمحافظ المصرية.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d9a84e]" />
                    <span>سرية تامة لجميع المستندات والمعلومات وفق تقاليد المحاماة المصرية.</span>
                  </li>
                </ul>

                <div className="mt-6 border-t border-white/10 pt-4 text-center">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#d9a84e] hover:underline"
                  >
                    استعرض قائمة العقود والأسعار الكاملة <ArrowRight className="h-3 w-3 rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
