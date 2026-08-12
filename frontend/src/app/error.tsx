"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SupportContactLink from "@/components/support/SupportContactLink";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Z draft Runtime Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-8 sm:p-10 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200 mb-6">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-200">
            خطأ في النظام
          </span>

          <h2 className="text-sm font-extrabold text-red-700 mb-1">حدث عطل مؤقت في المنصة</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            تم تسجيل الخطأ في سجلات المراقبة الفنية. يمكنك المحاولة مرة أخرى أو الاتصال بنا فوراً للمساعدة.
          </p>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => reset()}
              className="w-full rounded-xl bg-blue-700 px-5 py-3 text-xs font-bold text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <RefreshCw className="h-4 w-4" />
              <span>إعادة المحاولة الآن</span>
            </button>

            <Link
              href="/"
              className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              <span>العودة للرئيسية</span>
            </Link>

            <SupportContactLink message="مرحبًا، أحتاج مساعدة من الدعم الفني في منصة Z draft" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
