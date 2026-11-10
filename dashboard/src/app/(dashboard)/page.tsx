"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  BriefcaseBusiness,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  UserRound,
  ArrowLeft,
  Scale,
} from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading } from "@/components/admin/PageFeedback";

type Summary = {
  contracts: { total: number; active: number; issued: number; office: number };
  requests: {
    total: number;
    needs_attention: number;
    unassigned: number;
    awaiting_client: number;
    meetings_today: number;
    overdue: number;
  };
  payments: { pending: number; approved_month: number };
  notifications: { unread: number };
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    dashboardRequest<Summary>("/api/v1/dashboard/summary")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "تعذر تحميل المؤشرات"));
  }, []);

  useEffect(load, [load]);

  if (error)
    return (
      <div className="p-6 sm:p-8">
        <PageError message={error} onRetry={load} />
      </div>
    );
  if (!data)
    return (
      <div className="p-6 sm:p-8">
        <PageLoading />
      </div>
    );

  const cards = [
    {
      title: "إجمالي العقود",
      value: data.contracts.total,
      Icon: FileText,
      note: `${data.contracts.active} قيد العمل والمراجعة`,
      href: "/contracts",
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-200/80",
    },
    {
      title: "العقود النشطة",
      value: data.contracts.active,
      Icon: BriefcaseBusiness,
      note: `${data.contracts.issued} عقد صادر ومعتمد`,
      href: "/contracts?group=attention",
      iconColor: "text-amber-600 bg-amber-50 border-amber-200/80",
    },
    {
      title: "تحصيل هذا الشهر",
      value: `${Number(data.payments.approved_month).toLocaleString("en-US")} ج.م`,
      Icon: CreditCard,
      note: "سداد إلكتروني مؤتمت عبر Paymob",
      href: "/payments",
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200/80",
    },
    {
      title: "تنبيهات العمل",
      value: data.notifications.unread,
      Icon: Bell,
      note: data.notifications.unread > 0 ? "تنبيهات تحتاج متابعة فورية" : "لا توجد تنبيهات جديدة",
      href: "/notifications",
      iconColor: "text-sky-600 bg-sky-50 border-sky-200/80",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-6 sm:p-8">
      {/* Page Header */}
      <div className="border-b border-slate-200/80 pb-5">
        <div className="inline-flex items-center gap-1.5 rounded-md bg-[#00102e]/5 px-2.5 py-1 text-[11px] font-bold text-[#00102e]">
          <span>مركز تشغيل Z draft</span>
          <span className="text-slate-300">•</span>
          <span className="text-[#986410]">نظرة عامة على سير العمل</span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#00102e]">
          الأعمال التي تحتاج انتباهك الآن
        </h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          مؤشرات تشغيلية حية محدثة فورياً، وكل مؤشر يفتح مجموعة البيانات المرتبطة به مباشرة.
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.Icon;
          return (
            <Link
              href={card.href}
              key={card.title}
              className="group flex flex-col justify-between rounded-2xl border border-slate-300 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#986410]/50 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">{card.title}</span>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border ${card.iconColor} shadow-2xs transition group-hover:scale-105`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black tracking-tight text-[#00102e] tabular-nums">
                  {card.value}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="font-semibold text-slate-500">{card.note}</span>
                <span className="font-black text-[#986410] opacity-0 transition group-hover:opacity-100 flex items-center gap-1">
                  <span>عرض</span>
                  <ArrowLeft className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Work Center Operations Card */}
      <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#986410]" />
              <h2 className="text-base font-black text-[#00102e]">طوابير مركز المتابعة</h2>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">
              اضغط على أي طابور للانتقال مباشرة إلى الطلبات المفلترة بنفس المعيار.
            </p>
          </div>
          <Link
            href="/work"
            className="inline-flex items-center gap-1 self-start sm:self-auto rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-black text-[#00102e] hover:bg-slate-100 hover:border-slate-400 transition active:scale-95 shadow-2xs"
          >
            <span>فتح مركز المتابعة بالكامل</span>
            <ArrowLeft className="h-3.5 w-3.5 text-[#986410]" />
          </Link>
        </div>

        {/* 4 Colored Distinct Metric Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="تحتاج إجراء من الإدارة"
            value={data.requests.needs_attention ?? data.requests.unassigned}
            href="/work?queue=needs_attention"
            subtitle="طلبات جديدة أو طلبات تعديل"
            Icon={Clock}
            tone="amber"
          />
          <MetricCard
            label="بانتظار العميل"
            value={data.requests.awaiting_client}
            href="/work?queue=awaiting_client"
            subtitle="مراجعة مسودة أو استكمال بيانات"
            Icon={UserRound}
            tone="blue"
          />
          <MetricCard
            label="مواعيد اليوم"
            value={data.requests.meetings_today}
            href="/work?queue=meetings_today"
            subtitle="استشارات قانونية مجدولة اليوم"
            Icon={Calendar}
            tone="indigo"
          />
          <MetricCard
            label="طلبات متأخرة"
            value={data.requests.overdue}
            href="/work?queue=overdue"
            subtitle="تجاوزت وقت التسليم المتوقع"
            Icon={AlertCircle}
            tone="rose"
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  href,
  subtitle,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  subtitle: string;
  Icon: typeof Clock;
  tone: "amber" | "blue" | "indigo" | "rose";
}) {
  const tones = {
    amber: {
      card: "border-amber-300 bg-amber-50 hover:bg-amber-100/70 hover:border-amber-400 text-amber-950",
      num: "text-amber-950",
      icon: "text-amber-700 bg-amber-100",
      sub: "text-amber-800",
    },
    blue: {
      card: "border-blue-300 bg-blue-50 hover:bg-blue-100/70 hover:border-blue-400 text-blue-950",
      num: "text-blue-950",
      icon: "text-blue-700 bg-blue-100",
      sub: "text-blue-800",
    },
    indigo: {
      card: "border-indigo-300 bg-indigo-50 hover:bg-indigo-100/70 hover:border-indigo-400 text-indigo-950",
      num: "text-indigo-950",
      icon: "text-indigo-700 bg-indigo-100",
      sub: "text-indigo-800",
    },
    rose: {
      card: "border-rose-300 bg-rose-50 hover:bg-rose-100/70 hover:border-rose-400 text-rose-950",
      num: "text-rose-950",
      icon: "text-rose-700 bg-rose-100",
      sub: "text-rose-800",
    },
  }[tone];

  return (
    <Link
      href={href}
      className={`group flex flex-col justify-between rounded-xl border p-4 transition-all hover:-translate-y-0.5 shadow-2xs ${tones.card}`}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold">{label}</span>
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${tones.icon}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className={`mt-2 text-2xl font-black tabular-nums ${tones.num}`}>{value}</div>
      </div>
      <div className={`mt-3 border-t border-black/5 pt-2 text-[11px] font-semibold ${tones.sub}`}>
        {subtitle}
      </div>
    </Link>
  );
}
