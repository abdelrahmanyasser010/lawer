"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SupportContactLink from "@/components/support/SupportContactLink";
import { FileQuestion, ArrowRight, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 mb-6">
            <FileQuestion className="h-8 w-8" />
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 font-mono">
            الخطأ 404 — الصفحة غير موجودة
          </span>

          <h1 className="text-2xl font-extrabold text-slate-900 mt-4">عذراً، لم يتم العثور على الوثيقة أو الرابط المطلوبة</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            قد يكون الرابط غير صحيح، أو تم نقل الصفحة، أو أن صلاحية مشاركة العقد عبر معرف Z-ID قد انتهت.
          </p>

          <div className="mt-8 space-y-3">
            <Link
              href="/"
              className="w-full rounded-xl bg-blue-700 px-5 py-3 text-xs font-bold text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Home className="h-4 w-4" />
              <span>العودة إلى الصفحة الرئيسية</span>
            </Link>

            <Link
              href="/create-contract?mode=self_service"
              className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>تصفح قوالب العقود الرسمية</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <SupportContactLink message="مرحبًا، أحتاج مساعدة من الدعم الفني في منصة Z draft" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
