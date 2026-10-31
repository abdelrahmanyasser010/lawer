"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, FileText, Plus } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { apiRequest, ApiClientError } from "@/lib/apiClient";
import { PageLoading } from "@/components/ui/PageFeedback";

type Contract = {
  id: number;
  serialNumber: string;
  title: string;
  status: string;
  sourceChannel: string;
  variantKey: string;
  updatedAt: string;
  templateSlug: string;
  templateNameAr: string;
};

export default function DraftsPage() {
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<Contract[]>("/api/v1/contracts/my");
      setItems(data.filter((c) => ["draft", "revision_requested"].includes(c.status)));
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 401) {
        setError("سجل الدخول لعرض المسودات المحفوظة على حسابك.");
      } else {
        setError(e instanceof Error ? e.message : "تعذر تحميل المسودات");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
          <div>
            <span className="rounded-full border border-[#986410]/20 bg-[#986410]/10 px-3 py-1 text-xs font-black text-[#986410]">
              مسودات الحساب
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#00102e]">العقود غير المكتملة</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              المسودات التي حفظتها في حسابك ويمكنك الرجوع إليها واستكمالها لاحقًا.
            </p>
          </div>
          <Link
            href="/create-contract?mode=self_service"
            className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-white hover:bg-[#001a42] transition"
          >
            <Plus className="h-4 w-4 text-[#d9a84e]" />
            عقد جديد
          </Link>
        </header>

        {loading ? (
          <PageLoading label="جاري تحميل المسودات..." skeletonType="cards" />
        ) : error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="font-bold text-amber-900">{error}</p>
            <Link
              href="/login?next=/drafts"
              className="mt-4 inline-block rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-white"
            >
              تسجيل الدخول
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <FileText className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 font-black text-slate-600">لا توجد مسودات حالية.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {items.map((c) => (
              <article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-[#986410]/30 transition">
                <div className="font-mono text-[10px] text-slate-400">{c.serialNumber}</div>
                <h2 className="mt-2 text-lg font-black text-[#00102e]">{c.title || c.templateNameAr}</h2>
                <p className="mt-1 text-xs text-slate-500">مسودة محفوظة وقابلة للاستكمال</p>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-[#986410]" />
                  <span>{new Date(c.updatedAt).toLocaleString("ar-EG")}</span>
                </div>
                <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                  <Link
                    href={`/wizard/${c.templateSlug}?contractId=${c.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-white hover:bg-[#001a42] transition"
                  >
                    <span>استكمال العقد</span>
                    <ArrowLeft className="h-4 w-4 text-[#d9a84e]" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
