"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Scale } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { frontendApi } from "@/lib/apiClient";
import type { LegalContentDocument } from "@/types/customer";

export default function PublicLegalPage({ contentKey, fallbackTitle }: { contentKey: string; fallbackTitle: string }) {
  const [doc, setDoc] = useState<LegalContentDocument | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    frontendApi.legalContent(contentKey)
      .then((value) => { if (active) setDoc(value); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "تعذر تحميل المحتوى حاليًا."); });
    return () => { active = false; };
  }, [contentKey]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-right" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#00102e]"><ArrowRight className="h-3.5 w-3.5" /> الرئيسية</Link>
        <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 bg-[#00102e] px-6 py-7 text-white sm:px-8">
            <div className="flex items-center gap-2 text-[#d9a84e]"><Scale className="h-4 w-4" /><span className="text-[10px] font-black">Z Draft</span></div>
            <h1 className="mt-3 text-2xl font-black">{doc?.title || fallbackTitle}</h1>
            {doc && <p className="mt-2 text-[10px] text-slate-400">الإصدار المنشور {doc.publishedVersion}{doc.publishedAt ? ` — ${new Date(doc.publishedAt).toLocaleDateString("ar-EG")}` : ""}</p>}
          </header>
          <div className="p-6 sm:p-8">
            {!doc && !error ? <div className="flex items-center justify-center gap-2 py-14 text-sm font-bold text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-[#986410]" /> جاري تحميل المحتوى...</div> : error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">{error}</div> : <div className="whitespace-pre-wrap text-sm leading-8 text-slate-700">{doc?.body}</div>}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
