"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, CheckCircle2, FileText, Loader2, Scale, UserRound, UsersRound } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { frontendApi } from "@/lib/apiClient";
import type { CustomerDashboard } from "@/types/customer";
import { formatDate } from "@/lib/labels";

export default function DashboardPage() {
  const [data, setData] = useState<CustomerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    frontendApi.dashboard().then((result) => { if (active) setData(result); }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "تعذر تحميل ملخص حسابك."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6">
          <p className="text-xs font-black text-[#986410]">حسابك في Z Draft</p>
          <h1 className="mt-2 text-2xl font-black text-[#00102e] sm:text-3xl">محتاج تعمل إيه دلوقتي؟</h1>
        </header>

        {loading ? <div className="rounded-2xl border bg-white p-14"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#986410]" /></div> : error || !data ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs font-bold text-red-700">{error || "تعذر تحميل البيانات"}</div> : <>
          <section className="rounded-3xl border border-[#986410]/25 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#986410]" /><h2 className="text-base font-black text-[#00102e]">مطلوب منك دلوقتي</h2></div>
            {data.requiredActions.length === 0 ? <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-800">تمام، مفيش حاجة مطلوبة منك دلوقتي.</div> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.requiredActions.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="text-sm font-black text-[#00102e]">{item.title}</h3><p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">{item.status}</p>{item.action.description && <p className="mt-2 text-[10px] leading-5 text-slate-500">{item.action.description}</p>}<Link href={item.action.actionUrl || (item.sourceType === "contract" ? `/contract/${item.sourceId}` : `/requests/${item.sourceId}`)} className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#00102e] px-4 py-2 text-[11px] font-black text-white">{item.action.label}<ArrowLeft className="h-3.5 w-3.5 text-[#d9a84e]" /></Link></article>)}</div>}
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-[#986410]" /><h2 className="font-black text-[#00102e]">عقودي</h2></div><Link href="/contracts" className="text-[11px] font-black text-[#986410]">عرض كل العقود</Link></div><div className="mt-4 space-y-2">{data.recentContracts.length ? data.recentContracts.map((item) => <Link key={item.id} href={`/contract/${item.id}`} className="block rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-[#986410]/30"><div className="flex items-center justify-between gap-3"><strong className="text-xs font-black text-[#00102e]">{item.title || item.templateNameAr}</strong><span className="text-[9px] text-slate-400">{formatDate(item.updatedAt)}</span></div><p className="mt-1 text-[10px] font-bold text-slate-500">{item.customerFacingStatus || item.status}</p></Link>) : <p className="py-5 text-center text-xs text-slate-400">لسه مفيش عقود.</p>}</div></section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Scale className="h-5 w-5 text-[#986410]" /><h2 className="font-black text-[#00102e]">خدماتي مع المحامين</h2></div><Link href="/requests" className="text-[11px] font-black text-[#986410]">عرض كل الطلبات</Link></div><div className="mt-4 space-y-2">{data.recentServiceRequests.length ? data.recentServiceRequests.map((item) => <Link key={item.id} href={`/requests/${item.id}`} className="block rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-[#986410]/30"><div className="flex items-center justify-between gap-3"><strong className="text-xs font-black text-[#00102e]">{item.title}</strong><span className="text-[9px] text-slate-400">{formatDate(item.updatedAt)}</span></div><p className="mt-1 text-[10px] font-bold text-slate-500">{item.customerFacingStatus || item.status}</p></Link>) : <p className="py-5 text-center text-xs text-slate-400">لسه مفيش طلبات خدمات.</p>}</div></section>
          </div>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5"><h2 className="font-black text-[#00102e]">حسابي</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{[
            { href: "/account", label: "بياناتي", icon: UserRound },
            { href: "/saved-parties", label: "الأطراف المحفوظة", icon: UsersRound },
            { href: "/notifications", label: "الإشعارات", icon: Bell },
          ].map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-[#00102e] hover:border-[#986410]/40"><Icon className="h-5 w-5 text-[#986410]" />{item.label}</Link>; })}</div></section>
        </>}
      </main>
      <Footer />
    </div>
  );
}
