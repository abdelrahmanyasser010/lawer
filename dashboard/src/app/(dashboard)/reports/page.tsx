"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Clock, Download, FileText, RefreshCw, TrendingUp, Users, WalletCards } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { dashboardFeatures } from "@/config/dashboardFeatures";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";

type Period = "month" | "quarter" | "year";

type Report = {
  period: Period;
  range: { start: string; end: string; bucket: "day" | "month" };
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
    overdueRequests: number;
    newCustomers: number;
  };
  revenueSeries: Array<{ bucketStart: string; amount: number; paymentsCount: number }>;
  templateDistribution: Array<{ slug: string; nameAr: string; count: number; issued: number }>;
  serviceDistribution: Array<{ requestType: string; count: number; completed: number; active: number }>;
  lawyerPerformance: Array<{ id: number; name: string; assignedCount: number; completedCount: number; activeCount: number; overdueCount: number; averageCompletionHours: number }>;
  contractStatuses: Array<{ status: string; count: number }>;
  requestStatuses: Array<{ status: string; count: number }>;
  generatedAt: string;
};

const periodLabels: Record<Period, string> = { month: "الشهر الحالي", quarter: "الربع الحالي", year: "السنة الحالية" };
const serviceLabels: Record<string, string> = { contract_drafting: "صياغة عقد", contract_review: "مراجعة عقد", consultation: "استشارة قانونية" };

function number(value: number, digits = 0) {
  return Number(value || 0).toLocaleString("ar-EG", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function csvCell(value: unknown) {
  let text = String(value ?? "");
  // Prevent spreadsheet formula injection when an exported customer value
  // starts with a formula control character.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
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

  useEffect(() => { void load(); }, [load]);

  const maxRevenue = useMemo(() => Math.max(1, ...(data?.revenueSeries.map((item) => Number(item.amount)) ?? [1])), [data]);
  const totalTemplates = useMemo(() => data?.templateDistribution.reduce((sum, item) => sum + Number(item.count), 0) ?? 0, [data]);

  async function exportCustomers() {
    setExporting(true);
    setError("");
    try {
      const result = await dashboardRequest<{ rows: Array<Record<string, unknown>> }>(`/api/v1/admin/reports/customer-export?period=${period}`);
      const headers = ["Z-ID", "الاسم", "البريد", "الهاتف", "واتساب", "نوع الحساب", "الشركة", "الحالة", "العقود", "الطلبات", "المدفوعات المعتمدة"];
      const rows = result.rows.map((row) => [row.publicId, row.name, row.email, row.phone, row.whatsappNumber, row.accountType, row.companyName, row.status, row.contractsCount, row.requestsCount, row.approvedPaymentsEgp]);
      const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `zdraft-customers-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تصدير التقرير");
    } finally {
      setExporting(false);
    }
  }

  if (!data && error) return <div className="p-6 sm:p-8"><PageError message={error} onRetry={load} /></div>;
  if (!data) return <div className="p-6 sm:p-8"><PageLoading label="جاري حساب مؤشرات التشغيل الحقيقية..." /></div>;

  const metrics = data.metrics;
  const cards = [
    { label: "الإيرادات المعتمدة", value: `${number(metrics.currentRevenue)} ج.م`, note: `${metrics.revenueGrowthPercent >= 0 ? "+" : ""}${number(metrics.revenueGrowthPercent, 1)}% عن الفترة السابقة`, icon: WalletCards },
    { label: "متوسط أول رد", value: `${number(metrics.averageFirstResponseHours, 1)} ساعة`, note: `${number(metrics.slaCompliancePercent, 1)}% داخل 24 ساعة`, icon: Clock },
    { label: "العقود الصادرة", value: number(metrics.contractsIssued), note: `${number(metrics.contractIssueRatePercent, 1)}% من العقود المنشأة`, icon: FileText },
    { label: "طلبات مكتملة", value: number(metrics.requestsCompleted), note: `${metrics.overdueRequests} طلب متأخر حاليًا`, icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-6 sm:p-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-[#986410]"><BarChart3 className="h-4 w-4" /> تقارير من قاعدة البيانات</div>
          <h1 className="mt-2 text-3xl font-black text-[#00102e]">الأداء والإيرادات وسرعة إنجاز المكتب</h1>
          <p className="mt-1 text-sm text-slate-500">لا توجد أرقام تجريبية في هذه الصفحة. كل مؤشر محسوب من العقود والطلبات والمدفوعات الفعلية.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black">
            {Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white p-2.5" title="تحديث"><RefreshCw className="h-4 w-4" /></button>
          <button disabled={exporting} onClick={() => void exportCustomers()} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#d5a84c]"><Download className="h-4 w-4" />{exporting ? "جاري التصدير..." : "تصدير العملاء CSV"}</button>
        </div>
      </header>

      {error && <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between text-xs font-black text-slate-500"><span>{label}</span><Icon className="h-5 w-5 text-[#986410]" /></div><div className="mt-4 text-3xl font-black text-[#00102e]">{value}</div><div className="mt-2 text-xs font-bold text-slate-400">{note}</div></article>)}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-[#00102e]">حركة الإيرادات</h2><p className="mt-1 text-xs text-slate-500">المدفوعات التي اعتمدتها الإدارة داخل الفترة المحددة.</p></div><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
          <div className="mt-6 flex min-h-64 items-end gap-2 overflow-x-auto pb-2">
            {data.revenueSeries.map((item) => {
              const height = Math.max(3, (Number(item.amount) / maxRevenue) * 100);
              const label = new Date(item.bucketStart).toLocaleDateString("ar-EG", data.range.bucket === "month" ? { month: "short" } : { day: "numeric", month: "short" });
              return <div key={item.bucketStart} className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2"><div className="text-[9px] font-black text-slate-500">{Number(item.amount) ? number(Number(item.amount)) : ""}</div><div className="w-full rounded-t-lg bg-gradient-to-t from-[#00102e] to-[#986410]" style={{ height: `${height}%`, minHeight: "8px" }} title={`${number(Number(item.amount))} ج.م · ${item.paymentsCount} عملية`} /><div className="whitespace-nowrap text-[9px] font-bold text-slate-400">{label}</div></div>;
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-black text-[#00102e]">ملخص الفترة</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Mini label="عقود منشأة" value={metrics.contractsCreated} />
            <Mini label="من المكتب" value={metrics.officeContracts} />
            <Mini label="طلبات جديدة" value={metrics.requestsCreated} />
            <Mini label="عملاء جدد" value={metrics.newCustomers} />
            <Mini label="مدفوعات معتمدة" value={metrics.approvedPayments} />
            <Mini label="تحتاج مراجعة" value={metrics.pendingPayments} danger={metrics.pendingPayments > 0} />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">متوسط إكمال طلب الخدمة: <b className="text-[#00102e]">{number(metrics.averageCompletionHours, 1)} ساعة</b>. المؤشر يُحسب للطلبات التي اكتملت داخل الفترة.</div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-black text-[#00102e]">القوالب الأكثر استخدامًا</h2>
          <div className="mt-5 space-y-4">{data.templateDistribution.map((item) => {
            const percent = totalTemplates ? (Number(item.count) / totalTemplates) * 100 : 0;
            return <div key={item.slug}><div className="flex items-center justify-between gap-3 text-xs"><div><b className="text-[#00102e]">{item.nameAr}</b><div className="mt-0.5 text-[10px] text-slate-400">{item.issued} صادر من {item.count}</div></div><span className="font-black text-[#986410]">{number(percent, 1)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#986410]" style={{ width: `${percent}%` }} /></div></div>;
          })}{data.templateDistribution.length === 0 && <Empty />}</div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-black text-[#00102e]">طلبات الخدمات القانونية</h2>
          <div className="mt-5 space-y-3">{data.serviceDistribution.map((item) => <div key={item.requestType} className="flex items-center justify-between rounded-xl border border-slate-200 p-4"><div><div className="text-xs font-black text-[#00102e]">{serviceLabels[item.requestType] ?? item.requestType}</div><div className="mt-1 text-[10px] text-slate-400">{item.active} قيد التنفيذ · {item.completed} مكتمل</div></div><div className="text-2xl font-black text-[#986410]">{item.count}</div></div>)}{data.serviceDistribution.length === 0 && <Empty />}</div>
        </section>
      </div>

      {dashboardFeatures.assignment && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 p-5"><Users className="h-5 w-5 text-[#986410]" /><div><h2 className="font-black text-[#00102e]">أداء المحامين</h2><p className="text-[10px] text-slate-400">الحساب يعتمد على الطلبات المسندة خلال الفترة.</p></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">المحامي</th><th className="p-4">مسند</th><th className="p-4">مكتمل</th><th className="p-4">نشط</th><th className="p-4">متأخر</th><th className="p-4">متوسط الإنجاز</th></tr></thead><tbody className="divide-y divide-slate-100">{data.lawyerPerformance.map((row) => <tr key={row.id}><td className="p-4 font-black text-[#00102e]">{row.name}</td><td className="p-4">{row.assignedCount}</td><td className="p-4 font-black text-emerald-700">{row.completedCount}</td><td className="p-4">{row.activeCount}</td><td className="p-4 font-black text-red-700">{row.overdueCount}</td><td className="p-4">{number(row.averageCompletionHours, 1)} ساعة</td></tr>)}</tbody></table></div>
        {data.lawyerPerformance.length === 0 && <div className="p-10"><Empty /></div>}
      </section>}

      <div className="grid gap-5 lg:grid-cols-2">
        <StatusPanel title="حالات العقود" rows={data.contractStatuses} />
        <StatusPanel title="حالات طلبات الخدمة" rows={data.requestStatuses} />
      </div>

      <div className="text-left text-[10px] font-bold text-slate-400">آخر حساب: {new Date(data.generatedAt).toLocaleString("ar-EG")}</div>
    </div>
  );
}

function Mini({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div className={`rounded-xl border p-4 ${danger ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}><div className={`text-2xl font-black ${danger ? "text-red-700" : "text-[#00102e]"}`}>{number(value)}</div><div className="mt-1 text-[10px] font-bold text-slate-500">{label}</div></div>;
}

function StatusPanel({ title, rows }: { title: string; rows: Array<{ status: string; count: number }> }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-black text-[#00102e]">{title}</h2><div className="mt-4 flex flex-wrap gap-2">{rows.map((row) => <div key={row.status} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><StatusBadge value={row.status} /><b className="text-sm text-[#00102e]">{row.count}</b></div>)}{rows.length === 0 && <Empty />}</div></section>;
}

function Empty() {
  return <div className="text-center text-xs font-bold text-slate-400">لا توجد بيانات داخل الفترة المحددة.</div>;
}
