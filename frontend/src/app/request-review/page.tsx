"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LegalConsultationCard from "@/components/home/LegalConsultationCard";

export default function RequestReviewPage() {
  return (
    <div className="flex min-h-screen flex-col font-sans text-right" dir="rtl">
      <Navbar />
      
      <main className="flex-1 bg-slate-50 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <LegalConsultationCard />
        </div>
      </main>

      <Footer />
    </div>
  );
}
