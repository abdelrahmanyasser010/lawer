"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight, FileText, Loader2, ShieldCheck } from "lucide-react";
import {
  renderLegalClauses,
  resolveWizardDefinition,
  type ContractTemplateDefinition,
  type WizardFieldDefinition,
} from "@zdraft/template-engine";
import { DashboardApiError, dashboardRequest } from "@/lib/apiClient";
import { StatusBadge } from "@/components/admin/PageFeedback";

type LegalClause = { key: string; titleAr: string; bodyAr: string };
type PreviewPayload = {
  contractId: number;
  versionId: number;
  versionNumber: number;
  versionStatus: string;
  serialNumber: string;
  title: string;
  templateSlug: string;
  templateNameAr: string;
  templateDefinition: ContractTemplateDefinition;
  variantKey: string;
  selectedOptionalClauseKeys: string[];
  fieldValues: Record<string, unknown>;
  touchedFieldKeys: string[];
  legalClauseSnapshot: LegalClause[];
  documentHash?: string | null;
  lockedAt?: string | null;
  issuedAt?: string | null;
};

function displayValue(field: WizardFieldDefinition, value: unknown): string {
  if (value === null || value === undefined || value === "") return "....................";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value)) return value.map((entry) => typeof entry === "object" && entry ? Object.values(entry).filter(Boolean).join(" — ") : String(entry ?? "")).filter(Boolean).join("، ");
  const option = field.options?.find((entry) => String(entry.value) === String(value));
  if (option) return option.labelAr;
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.split("-").reverse().join("/");
  return text;
}

function paragraphLines(body: string) {
  return body.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}

export default function StaffContractPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [error, setError] = useState("");
  const requestedVersionId = Number(searchParams.get("versionId") || 0);

  useEffect(() => {
    let active = true;
    async function load() {
      setError("");
      setPayload(null);
      try {
        const versionId = requestedVersionId;
        if (!versionId) throw new Error("حدد إصدار العقد المطلوب معاينته من صفحة الإدارة.");
        const result = await dashboardRequest<PreviewPayload>(`/api/v1/admin/contracts/${id}/versions/${versionId}/preview`);
        if (active) setPayload(result);
      } catch (caught) {
        if (active) setError(caught instanceof DashboardApiError ? caught.message : caught instanceof Error ? caught.message : "تعذر تحميل المعاينة");
      }
    }
    void load();
    return () => { active = false; };
  }, [id, requestedVersionId]);

  const resolved = useMemo(() => {
    if (!payload) return null;
    try {
      return resolveWizardDefinition(payload.templateDefinition, payload.variantKey, payload.selectedOptionalClauseKeys, payload.fieldValues);
    } catch {
      return null;
    }
  }, [payload]);

  const clauses = useMemo<LegalClause[]>(() => {
    if (!payload) return [];
    if (payload.legalClauseSnapshot?.length) return payload.legalClauseSnapshot;
    try {
      return renderLegalClauses(payload.templateDefinition, payload.variantKey, payload.selectedOptionalClauseKeys, payload.fieldValues) as LegalClause[];
    } catch {
      return [];
    }
  }, [payload]);

  const manualAnnexes = useMemo(() => {
    if (!payload) return [];
    const selected = new Set(payload.selectedOptionalClauseKeys);
    return (payload.templateDefinition.optionalClauses || []).filter((clause) => selected.has(clause.key) && clause.manualFillAnnex);
  }, [payload]);

  if (error) return <div className="mx-auto max-w-4xl p-8"><Link href={`/contracts/${id}`} className="text-xs font-black text-slate-500">العودة للعقد</Link><div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-black text-rose-800">{error}</div></div>;
  if (!payload || !resolved) return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-xs font-black text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> جاري تجهيز معاينة الإصدار...</div>;

  const variantTitle = resolved.variant.documentTitleAr || resolved.variant.nameAr || payload.title;

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6 sm:px-6" dir="rtl">
      <div className="mx-auto mb-5 flex max-w-[900px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div>
          <Link href={`/contracts/${id}`} className="inline-flex items-center gap-1 text-xs font-black text-slate-500"><ArrowRight className="h-4 w-4" /> تفاصيل العقد</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2"><strong className="text-sm text-[#00102e]">معاينة موظف — الإصدار {payload.versionNumber}</strong><StatusBadge value={payload.versionStatus} /></div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-800"><ShieldCheck className="h-4 w-4" /> المعاينة تعمل بجلسة الإدارة ولا تستخدم جلسة العميل</div>
      </div>

      <article className="relative mx-auto min-h-[1123px] w-full max-w-[794px] overflow-hidden bg-white px-[58px] py-[54px] text-[#111827] shadow-xl print:min-h-0 print:max-w-none print:shadow-none" style={{ fontFamily: 'Arial, "Tahoma", sans-serif' }}>
        {!(["locked", "issued"].includes(payload.versionStatus)) && <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.045]"><span className="-rotate-45 whitespace-nowrap text-7xl font-black">معاينة موظف — غير نهائي</span></div>}

        <header className="relative border-b-2 border-[#00102e] pb-5 text-center">
          <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-slate-500"><span>{payload.templateNameAr}</span><span className="font-mono" dir="ltr">{payload.serialNumber}</span></div>
          <h1 className="mt-5 text-[25px] font-black leading-10 text-[#00102e]">{variantTitle}</h1>
          <p className="mt-2 text-[11px] font-bold text-slate-500">الإصدار {payload.versionNumber} · {payload.versionStatus === "issued" ? "نسخة صادرة" : payload.versionStatus === "locked" ? "نسخة مقفلة" : "معاينة تشغيلية"}</p>
        </header>

        <section className="relative mt-7">
          <h2 className="border-r-4 border-[#986410] pr-3 text-[15px] font-black text-[#00102e]">بيانات العقد</h2>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-[11.5px] leading-6">
            {resolved.steps.flatMap((step) => step.fields.map((field) => ({ step, field }))).filter(({ field }) => field.type !== "file").map(({ step, field }) => (
              <div key={`${step.key}:${field.key}`} className="break-inside-avoid border-b border-slate-200 pb-2">
                <div className="text-[9.5px] font-black text-slate-500">{field.labelAr}</div>
                <div className="mt-0.5 font-bold text-slate-900">{displayValue(field, payload.fieldValues[field.key])}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative mt-8">
          <h2 className="border-r-4 border-[#986410] pr-3 text-[15px] font-black text-[#00102e]">بنود العقد</h2>
          <div className="mt-4 space-y-5">
            {clauses.length ? clauses.map((clause, index) => (
              <section key={clause.key || index} className="break-inside-avoid-page">
                <h3 className="text-[12.5px] font-black leading-6 text-[#00102e]">{index + 1}. {clause.titleAr}</h3>
                <div className="mt-1.5 space-y-2 text-justify text-[11.5px] leading-[1.9] text-slate-800">
                  {paragraphLines(clause.bodyAr || "").map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
                </div>
              </section>
            )) : <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs font-bold text-slate-500">لا توجد لقطة قانونية قابلة للعرض لهذا الإصدار.</div>}
          </div>
        </section>

        {manualAnnexes.length > 0 && (
          <section className="relative mt-9 border-t border-slate-300 pt-6">
            <h2 className="text-[15px] font-black text-[#00102e]">الملاحق الاختيارية</h2>
            <p className="mt-1 text-[10px] font-bold text-slate-500">هذه الملاحق تطبع كقوالب فارغة ويُستكمل محتواها يدويًا.</p>
            <div className="mt-4 space-y-5">
              {manualAnnexes.map((annex) => <div key={annex.key} className="break-inside-avoid rounded-xl border border-slate-300 p-4"><h3 className="text-[12px] font-black text-[#00102e]">{annex.nameAr}</h3><p className="mt-2 text-[11px] leading-6 text-slate-600">{annex.description}</p><div className="mt-4 h-24 rounded-lg border border-dashed border-slate-300" /></div>)}
            </div>
          </section>
        )}

        <footer className="relative mt-10 border-t border-slate-300 pt-4 text-[9px] leading-5 text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> معاينة داخلية للإصدار {payload.versionNumber}</span>{payload.documentHash && <span className="max-w-[420px] truncate font-mono" dir="ltr">SHA-256: {payload.documentHash}</span>}</div>
        </footer>
      </article>
    </div>
  );
}
