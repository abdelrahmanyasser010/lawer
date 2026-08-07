"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { FileText, Link2, Lock, UserRoundCheck } from "lucide-react";
import { frontendApi } from "@/lib/apiClient";

type CurrentUser = { publicId: string; name: string; email: string };

export default function SharedDocumentsPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    frontendApi.me()
      .then((result) => setUser(result.user as CurrentUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <div className="border-b border-slate-200 pb-6">
          <span className="rounded-full border border-[#986410]/20 bg-[#986410]/10 px-3 py-1 text-xs font-bold text-[#986410]">
            مساحة التعاون — Z draft
          </span>
          <h1 className="mt-3 text-2xl font-extrabold text-[#00102e] sm:text-3xl">فتح دعوات العقود المشتركة</h1>
          <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">
            رابط الدعوة يصل إليك من صاحب العقد أو من مكتب المحاماة. افتح الرابط نفسه، ثم أدخل Z-ID المطابق للدعوة عند الطلب.
          </p>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00102e] text-[#986410]"><UserRoundCheck className="h-5 w-5" /></div>
            <h2 className="mt-4 text-base font-black text-[#00102e]">معرفك المستخدم في الدعوات</h2>
            {loading ? (
              <p className="mt-3 text-xs font-bold text-slate-400">جارٍ تحميل الحساب...</p>
            ) : user ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-[10px] font-black text-emerald-700">Z-ID</div>
                <div className="mt-1 font-mono text-lg font-black text-emerald-900" dir="ltr">{user.publicId}</div>
                <div className="mt-2 text-[11px] font-bold text-emerald-800">{user.name}</div>
              </div>
            ) : (
              <a href="/login" className="mt-4 inline-flex rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white">سجّل الدخول لعرض Z-ID</a>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#986410]/10 text-[#986410]"><Link2 className="h-5 w-5" /></div>
            <h2 className="mt-4 text-base font-black text-[#00102e]">لماذا لا تظهر روابط عامة هنا؟</h2>
            <p className="mt-3 text-xs font-semibold leading-6 text-slate-600">
              روابط المشاركة تحمل رمز وصول سريًا محدود المدة، لذلك لا نعرض أمثلة أو روابط تجريبية ثابتة. يحتفظ النظام ببصمة الرمز فقط، ويُفتح العقد من الرابط الذي أنشأه صاحبه فعليًا.
            </p>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <div>
              <h2 className="text-sm font-black text-blue-950">طريقة الاستخدام</h2>
              <p className="mt-2 text-xs font-bold leading-6 text-blue-900">صاحب العقد يفتح مسودته، يحدد صلاحية عرض أو تعديل، يربطها بـZ-ID الخاص بك، ثم يرسل لك الرابط الناتج. يمكنك فتحه من أي جهاز خلال مدة الصلاحية.</p>
            </div>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
          <Lock className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-xs font-bold">لا تفتح أي رابط غير صادر من نطاق Z draft الرسمي.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
