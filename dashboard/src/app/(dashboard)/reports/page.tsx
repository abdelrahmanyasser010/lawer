"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
  AlertCircle,
} from "lucide-react";
import { downloadXlsx } from "@/lib/simpleXlsx";
import { dashboardRequest } from "@/lib/apiClient";
import { dashboardFeatures } from "@/config/dashboardFeatures";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";

type Period = "month" | "quarter" | "year";

type Report = {
  period: Period;
  range: { start: string; end: string; bucket: "day" | "month"; timezone?: string };
  metrics: {
    currentRevenue: number;
    previousRevenue: number;
    revenueGrowthPercent: number;
    approvedPayments: number;
    pendingPayments: number;
    contractsCreated: number;
    contractsIssued: number;
    contractIssueRatePercent: number;
    officeContracts: number;
    requestsCreated: number;
    requestsCompleted: number;
    averageCompletionHours: number;
    averageFirstResponseHours: number;
    slaCompliancePercent: number;
    unansweredOver24: number;
    overdueRequests: number;
    newCustomers: number;
  };
  revenueSeries: Array<{ bucketStart: string; amount: number; paymentsCount: number }>;
  templateDistribution: Array<{ slug: string; nameAr: string; count: number; issued: number }>;
  serviceDistribution: Array<{ requestType: string; count: number; completed: number; active: number }>;
  lawyerPerformance: Array<{
    id: number;
    name: string;
    assignedCount: number;
    completedCount: number;
    activeCount: number;
    overdueCount: number;
    averageCompletionHours: number;
  }>;
  contractStatuses: Array<{ status: string; count: number }>;
  requestStatuses: Array<{ status: string; count: number }>;
  generatedAt: string;
};

const periodLabels: Record<Period, string> = {
  month: "الشهر الحالي",
  quarter: "الربع الحالي",
  year: "السنة الحالية",
};

const serviceLabels: Record<string, string> = {
  contract_drafting: "صياغة عقد",
  contract_review: "مراجعة عقد",
};

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  pending_payment: "بانتظار الدفع",
  pending_review: "قيد المراجعة",
  assigned: "قيد المتابعة",
  in_progress: "قيد التنفيذ",
  client_review: "مراجعة العميل",
  revision_requested: "تعديل مطلوب",
  approved: "معتمد",
  locked: "مقفل",
  issued: "صادر",
  cancelled: "ملغي",
  awaiting_payment: "بانتظار الدفع",
  new: "جديد",
  awaiting_client_info: "بانتظار بيانات العميل",
  meeting_scheduled: "موعد محدد",
  completed: "مكتمل",
};

function formatNumber(value: number, digits = 0) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await dashboardRequest<Report>(`/api/v1/admin/reports/overview?period=${period}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل التقارير");
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxRevenue = useMemo(
    () => Math.max(0, ...(data?.revenueSeries.map((item) => Number(item.amount)) ?? [0])),
    [data]
  );

  const totalTemplates = useMemo(
    () => data?.templateDistribution.reduce((sum, item) => sum + Number(item.count), 0) ?? 0,
    [data]
  );

  function exportReport() {
    if (!data) return;
    setExporting(true);
    try {
      const metrics = data.metrics;
      downloadXlsx(`zdraft-report-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`, [
        {
          name: "ملخص التقرير والأداء",
          widths: [36, 26],
          freezeHeader: true,
          rows: [
            ["المؤشر", "القيمة"],
            ["الفترة المحددة", periodLabels[period]],
            ["تاريخ البداية", new Date(data.range.start).toLocaleString("ar-EG")],
            ["تاريخ النهاية", new Date(data.range.end).toLocaleString("ar-EG")],
            ["الإيرادات المحصلة (Paymob)", metrics.currentRevenue],
            ["المدفوعات المسددة بنجاح", metrics.approvedPayments],
            ["العقود المنشأة", metrics.contractsCreated],
            ["العقود الصادرة خلال الفترة", metrics.contractsIssued],
            ["نسبة إصدار العقود المنشأة %", metrics.contractIssueRatePercent],
            ["طلبات الخدمات المنشأة", metrics.requestsCreated],
            ["طلبات مكتملة", metrics.requestsCompleted],
            ["متوسط أول رد رسمي (بالساعات)", metrics.averageFirstResponseHours],
            ["الالتزام باتفاقية SLA داخل 24 ساعة %", metrics.slaCompliancePercent],
            ["بدون رد لأكثر من 24 ساعة", metrics.unansweredOver24],
            ["عملاء جدد", metrics.newCustomers],
            ["جلسات دفع بانتظار إتمام العميل", metrics.pendingPayments],
            ["طلبات متأخرة حاليًا", metrics.overdueRequests],
          ],
        },
        {
          name: "حركة الإيرادات والتحصيل",
          widths: [22, 20, 18],
          freezeHeader: true,
          autoFilter: true,
          rows: [
            ["التاريخ", "الإيراد المحصل (ج.م)", "عدد العمليات المسددة"],
            ...data.revenueSeries.map((item) => [
              new Date(item.bucketStart).toLocaleDateString("ar-EG"),
              Number(item.amount),
              item.paymentsCount,
            ]),
          ],
        },
        {
          name: "توزيع القوالب",
          widths: [38, 16, 16],
          freezeHeader: true,
          autoFilter: true,
          rows: [
            ["القالب القانوني", "العقود المنشأة", "العقود الصادرة"],
            ...data.templateDistribution.map((item) => [item.nameAr, item.count, item.issued]),
          ],
        },
        {
          name: "الخدمات القانونية",
          widths: [30, 16, 16, 16],
          freezeHeader: true,
          autoFilter: true,
          rows: [
            ["الخدمة", "إجمالي الطلبات", "مكتمل", "نشط"],
            ...data.serviceDistribution.map((item) => [
              serviceLabels[item.requestType] ?? item.requestType,
              item.count,
              item.completed,
              item.active,
            ]),
          ],
        },
        {
          name: "حالات العقود",
          widths: [26, 14],
          freezeHeader: true,
          autoFilter: true,
          rows: [
            ["الحالة", "العدد"],
            ...data.contractStatuses.map((item) => [statusLabels[item.status] ?? item.status, item.count]),
          ],
        },
        {
          name: "حالات الطلبات",
          widths: [26, 14],
          freezeHeader: true,
          autoFilter: true,
          rows: [
            ["الحالة", "العدد"],
            ...data.requestStatuses.map((item) => [statusLabels[item.status] ?? item.status, item.count]),
          ],
        },
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تصدير التقرير");
    } finally {
      setExporting(false);
    }
  }

  if (!data && error) {
    return (
      <div className="p-6 sm:p-8">
        <PageError message={error} onRetry={load} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 sm:p-8">
        <PageLoading label="جاري استخراج مؤشرات الأداء والتحصيل..." />
      </div>
    );
  }

  const metrics = data.metrics;
  const isRevenueGrowthPositive = metrics.revenueGrowthPercent >= 0;

  const topCards = [
    {
      label: "الإيرادات المحصلة",
      value: `${formatNumber(metrics.currentRevenue)} ج.م`,
      note: `${isRevenueGrowthPositive ? "+" : ""}${formatNumber(metrics.revenueGrowthPercent, 1)}% مقارنة بالفترة السابقة`,
      notePositive: isRevenueGrowthPositive,
      icon: WalletCards,
    },
    {
      label: "المدفوعات المسددة بنجاح",
      value: `${formatNumber(metrics.approvedPayments)} عملية`,
      note: "سداد إلكتروني مؤتمت بالكامل عبر Paymob",
      notePositive: true,
      icon: CreditCard,
    },
    {
      label: "العقود الصادرة رسمياً",
      value: formatNumber(metrics.contractsIssued),
      note: `${formatNumber(metrics.contractIssueRatePercent, 1)}% من عقود الفترة اكتمل إصدارها`,
      notePositive: true,
      icon: FileText,
    },
    {
      label: "طلبات الخدمات المكتملة",
      value: formatNumber(metrics.requestsCompleted),
      note: `متوسط زمن الإنجاز ${formatNumber(metrics.averageCompletionHours, 1)} ساعة`,
      notePositive: true,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-6 sm:p-8">
      {/* Header & Filter Controls */}
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-[#986410]">
            <BarChart3 className="h-4 w-4" />
            <span>تقارير تشغيلية وإحصائيات موثقة</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#00102e]">
            الأداء المالي والإيرادات وسرعة إنجاز المكتب
          </h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            تعتمد مؤشرات الفترة على توقيت القاهرة. كافة المدفوعات محصلة ومؤكدة إلكترونياً عبر بوابة الدفع (Paymob).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
            {(Object.entries(periodLabels) as [Period, string][]).map(([value, label]) => {
              const active = period === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                    active
                      ? "bg-white font-black text-[#00102e] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => void load()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
            title="تحديث البيانات"
            aria-label="تحديث التقرير"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            disabled={exporting}
            onClick={exportReport}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-[#d7a94f] hover:bg-[#001a42] transition shadow-xs active:scale-95 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{exporting ? "جاري التصدير..." : "تصدير التقرير Excel"}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {topCards.map(({ label, value, note, notePositive, icon: Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
          >
            <div className="flex items-center justify-between text-xs font-black text-slate-500">
              <span>{label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#986410]/10 text-[#986410]">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-[#00102e] tabular-nums">{value}</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              {label === "الإيرادات المحصلة" ? (
                <TrendingUp
                  className={`h-3.5 w-3.5 shrink-0 ${
                    notePositive ? "text-emerald-600" : "text-rose-600 rotate-180"
                  }`}
                />
              ) : null}
              <span>{note}</span>
            </div>
          </article>
        ))}
      </div>

      {/* Revenue Dynamics & Period Summary */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#00102e]">حركة الإيرادات والتحصيل الإلكتروني</h2>
              <p className="mt-1 text-xs text-slate-500">
                إجمالي المدفوعات المسددة بنجاح عبر بوابة Paymob داخل الفترة المحددة.
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          {maxRevenue <= 0 ? (
            <div className="flex min-h-64 items-center justify-center text-xs font-bold text-slate-400">
              لا توجد عمليات تحصيل مسجلة داخل الفترة المحددة.
            </div>
          ) : (
            <div className="mt-6 flex min-h-64 items-end gap-2.5 overflow-x-auto pb-2">
              {data.revenueSeries.map((item) => {
                const height = (Number(item.amount) / maxRevenue) * 100;
                const label = new Date(item.bucketStart).toLocaleDateString(
                  "ar-EG",
                  data.range.bucket === "month" ? { month: "short" } : { day: "numeric", month: "short" }
                );
                return (
                  <div
                    key={item.bucketStart}
                    className="group flex min-w-12 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div className="text-[11px] font-black tabular-nums text-slate-600 group-hover:text-[#986410] transition">
                      {Number(item.amount) ? formatNumber(Number(item.amount)) : ""}
                    </div>
                    <div
                      className="w-full rounded-t-xl bg-[#986410] transition-all group-hover:bg-[#7e520c]"
                      style={{
                        height: `${height}%`,
                        minHeight: Number(item.amount) > 0 ? "6px" : "0",
                      }}
                      title={`${formatNumber(Number(item.amount))} ج.م · ${item.paymentsCount} عملية مسددة`}
                    />
                    <div className="whitespace-nowrap text-[11px] font-bold text-slate-500">{label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Period Summary & SLA Compliance */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div>
            <h2 className="text-base font-black text-[#00102e]">ملخص الفترة</h2>
            <p className="mt-1 text-xs text-slate-500">حجم الإنتاج القانوني ونشاط العملاء المسجل.</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="عقود منشأة" value={metrics.contractsCreated} />
              <MiniStat label="من المكتب" value={metrics.officeContracts} />
              <MiniStat label="طلبات جديدة" value={metrics.requestsCreated} />
              <MiniStat label="عملاء جدد" value={metrics.newCustomers} />
              <MiniStat label="مدفوعات مسددة" value={metrics.approvedPayments} />
              <MiniStat label="عقود صادرة" value={metrics.contractsIssued} />
            </div>
          </div>

          <div className="mt-5 space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-xs font-medium text-slate-600">
            <div className="flex items-center justify-between">
              <span>متوسط أول رد رسمي:</span>
              <b className="text-[#00102e] font-black">{formatNumber(metrics.averageFirstResponseHours, 1)} ساعة</b>
            </div>
            <div className="flex items-center justify-between">
              <span>الالتزام بـ SLA الـ 24 ساعة:</span>
              <b className="text-emerald-700 font-black">{formatNumber(metrics.slaCompliancePercent, 1)}%</b>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
              <span>متوسط إكمال الخدمة:</span>
              <b className="text-[#00102e] font-black">{formatNumber(metrics.averageCompletionHours, 1)} ساعة</b>
            </div>
          </div>
        </section>
      </div>

      {/* Operational Live Status — No Manual Review */}
      <section className="rounded-2xl border border-amber-200/90 bg-amber-50/70 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-amber-950">متابعة العمليات المباشرة (تحديث لحظي)</h2>
            <p className="mt-0.5 text-xs text-amber-900 font-medium">
              الدفع مؤتمت بالكامل فور السداد عبر بوابة Paymob دون الحاجة لأي اعتماد أو تأكيد يدوي من الإدارة.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/60 px-3 py-1 text-[11px] font-black text-amber-900">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-800" />
            <span>بوابة Paymob نشطة ومؤتمتة</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniStat
            label="جلسات دفع بانتظار إتمام العميل"
            value={metrics.pendingPayments}
            danger={metrics.pendingPayments > 0}
            hint="طلبات أو جلسات سداد مفتوحة بالبوابة"
          />
          <MiniStat
            label="طلبات متأخرة حالياً عن الموعد"
            value={metrics.overdueRequests}
            danger={metrics.overdueRequests > 0}
            hint="طلبات تجاوزت موعد التسليم المحدد"
          />
          <MiniStat
            label="استشارات بدون رد لأكثر من 24 ساعة"
            value={metrics.unansweredOver24}
            danger={metrics.unansweredOver24 > 0}
            hint="تجاوزت مهلة الاستجابة الأولى"
          />
        </div>
      </section>

      {/* Templates & Service Breakdown */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-black text-[#00102e]">القوالب الأكثر استخدامًا</h2>
          <p className="mt-0.5 text-xs text-slate-500">العقود المنشأة ونسبة وصولها للإصدار الرسمي.</p>

          <div className="mt-5 space-y-4">
            {data.templateDistribution.map((item) => {
              const percent = totalTemplates ? (Number(item.count) / totalTemplates) * 100 : 0;
              return (
                <div key={item.slug}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div>
                      <b className="text-[#00102e] font-black">{item.nameAr}</b>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {item.issued} إصدار خلال الفترة · {item.count} عقد منشأ
                      </div>
                    </div>
                    <span className="font-black tabular-nums text-[#986410]">{formatNumber(percent, 1)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#986410] transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {data.templateDistribution.length === 0 && <EmptyState text="لا توجد بيانات قوالب داخل الفترة." />}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-black text-[#00102e]">طلبات الخدمات القانونية</h2>
          <p className="mt-0.5 text-xs text-slate-500">تصنيف الطلبات بين الصياغة والمراجعة المتخصصة.</p>

          <div className="mt-5 space-y-3">
            {data.serviceDistribution.map((item) => (
              <div
                key={item.requestType}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-slate-300"
              >
                <div>
                  <div className="text-xs font-black text-[#00102e]">
                    {serviceLabels[item.requestType] ?? item.requestType}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 font-medium">
                    {item.active} نشط حالياً · {item.completed} مكتمل
                  </div>
                </div>
                <div className="text-2xl font-black text-[#986410] tabular-nums">{item.count}</div>
              </div>
            ))}
            {data.serviceDistribution.length === 0 && <EmptyState text="لا توجد طلبات خدمات داخل الفترة." />}
          </div>
        </section>
      </div>

      {/* Lawyers Performance (if Assignment Feature Enabled) */}
      {dashboardFeatures.assignment && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 p-5">
            <Users className="h-5 w-5 text-[#986410]" />
            <div>
              <h2 className="font-black text-[#00102e]">أداء فريق المحامين</h2>
              <p className="text-xs text-slate-500">متابعة إسناد الطلبات ومعدل الإنجاز والالتزام بالوقت.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black">
                <tr>
                  <th className="p-4">المحامي</th>
                  <th className="p-4">مسند</th>
                  <th className="p-4">مكتمل</th>
                  <th className="p-4">نشط</th>
                  <th className="p-4">متأخر</th>
                  <th className="p-4">متوسط الإنجاز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lawyerPerformance.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-black text-[#00102e]">{row.name}</td>
                    <td className="p-4 tabular-nums">{row.assignedCount}</td>
                    <td className="p-4 font-black text-emerald-700 tabular-nums">{row.completedCount}</td>
                    <td className="p-4 tabular-nums">{row.activeCount}</td>
                    <td
                      className={`p-4 font-black tabular-nums ${
                        row.overdueCount > 0 ? "text-rose-700" : "text-slate-400"
                      }`}
                    >
                      {row.overdueCount}
                    </td>
                    <td className="p-4 tabular-nums font-bold text-slate-700">
                      {formatNumber(row.averageCompletionHours, 1)} ساعة
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Contract & Request Status Summaries */}
      <div className="grid gap-5 lg:grid-cols-2">
        <StatusPanel title="حالات العقود المسجلة" rows={data.contractStatuses} />
        <StatusPanel title="حالات طلبات الخدمات" rows={data.requestStatuses} />
      </div>

      {/* Footer Timestamp */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
        <span>توقيت الحساب: بتوقيت القاهرة (Africa/Cairo)</span>
        <span>آخر تحديث: {new Date(data.generatedAt).toLocaleString("ar-EG")}</span>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  danger = false,
  hint,
}: {
  label: string;
  value: number;
  danger?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        danger ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`text-2xl font-black tabular-nums ${
          danger ? "text-rose-700" : "text-[#00102e]"
        }`}
      >
        {formatNumber(value)}
      </div>
      <div className="mt-1 text-xs font-bold text-slate-600">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}

function StatusPanel({ title, rows }: { title: string; rows: Array<{ status: string; count: number }> }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <h2 className="text-base font-black text-[#00102e]">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {rows.map((row) => (
          <div
            key={row.status}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs"
          >
            <StatusBadge value={row.status} />
            <b className="text-sm font-black text-[#00102e] tabular-nums">{row.count}</b>
          </div>
        ))}
        {rows.length === 0 && <EmptyState text="لا توجد حالات مسجلة داخل الفترة." />}
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs font-bold text-slate-400">
      {text}
    </div>
  );
}
