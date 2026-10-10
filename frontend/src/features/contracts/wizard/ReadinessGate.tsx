"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, HelpCircle, Upload } from "lucide-react";
import { evaluateCondition } from "@zdraft/template-engine";
import type {
  ContractFieldValue,
  ContractVariantDefinition,
  ReadinessDefinition,
  ReadinessItemDefinition,
  WizardFieldDefinition,
} from "@zdraft/template-engine";

type Props = {
  variant: ContractVariantDefinition;
  fieldValues: Record<string, ContractFieldValue>;
  attachmentRefs: Record<string, string[]>;
  onContinue: () => void;
  requireAuth?: boolean;
  authLoading?: boolean;
  authNextUrl?: string;
};

function fallbackReadiness(variant: ContractVariantDefinition): ReadinessDefinition {
  return {
    titleAr: "أنت جاهز؟",
    description: "راجع البيانات والمستندات المطلوبة قبل البدء في تعبئة العقد.",
    sections: variant.steps.map((step) => ({
      key: `readiness_${step.key}`,
      titleAr: step.titleAr,
      description: step.description,
      items: step.fields
        .filter((field) => Boolean(field.required || field.type === "attachment"))
        .map((field) => ({
          key: `readiness_${field.key}`,
          labelAr: field.labelAr,
          description: field.helpText,
          helpText: field.helpText,
          type: field.type === "attachment" ? "document" : "field",
          fieldKey: field.key,
          required: Boolean(field.required),
          attachmentRules: field.attachmentRules,
        })),
    })),
  };
}

function hasValue(value: ContractFieldValue | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function itemCompleted(item: ReadinessItemDefinition, fieldValues: Record<string, ContractFieldValue>, attachmentRefs: Record<string, string[]>): boolean {
  if (!item.fieldKey) return false;
  const attachments = attachmentRefs[item.fieldKey];
  return attachments?.length > 0 || hasValue(fieldValues[item.fieldKey]);
}

function fieldForItem(item: ReadinessItemDefinition, variant: ContractVariantDefinition): WizardFieldDefinition | undefined {
  if (!item.fieldKey) return undefined;
  return variant.steps.flatMap((step) => step.fields).find((field) => field.key === item.fieldKey);
}

function acceptedTypesLabel(types?: string[]): string | null {
  if (!types?.length) return null;
  const normalized = [...types].sort().join(",");
  if (normalized === ["application/pdf", "image/*"].sort().join(",")) return "صور أو PDF";
  if (normalized === "image/*") return "صور فقط";
  if (normalized === "application/pdf") return "PDF فقط";
  return "صيغ ملفات محددة";
}

function attachmentDescription(item: ReadinessItemDefinition): string | null {
  const rules = item.attachmentRules;
  if (!rules) return null;
  const parts: string[] = [];
  const typeLabel = acceptedTypesLabel(rules.acceptedTypes);
  if (typeLabel) parts.push(`الصيغ: ${typeLabel}`);
  if (rules.maxFiles) parts.push(`حتى ${rules.maxFiles} ملف`);
  if (rules.maxBytes) parts.push(`حجم الملف حتى ${Math.round(rules.maxBytes / 1024 / 1024)} ميجابايت`);
  if (rules.requireFrontBack) parts.push("وجه وظهر عند الحاجة");
  return parts.length ? parts.join(" · ") : null;
}

export default function ReadinessGate({ variant, fieldValues, attachmentRefs, onContinue, requireAuth = false, authLoading = false, authNextUrl = "/contracts" }: Props) {
  const readiness = variant.readiness ?? fallbackReadiness(variant);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const encodedNext = encodeURIComponent(authNextUrl);
  const visibleSections = useMemo(() => readiness.sections.filter((section) => !section.visibleWhen || evaluateCondition(section.visibleWhen, fieldValues)), [fieldValues, readiness.sections]);
  const visibleItems = visibleSections.flatMap((section) => section.items.filter((item) => !item.visibleWhen || evaluateCondition(item.visibleWhen, fieldValues)));
  const requiredItems = visibleItems.filter((item) => item.required);
  const incompleteRequired = requiredItems.filter((item) => !itemCompleted(item, fieldValues, attachmentRefs) && !acknowledged[item.key]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]" dir="rtl">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <span className="inline-flex rounded-full bg-[#986410]/10 px-3 py-1 text-xs font-black text-[#986410]">تجهيز العقد</span>
          <h1 className="mt-3 text-2xl font-black text-[#00102e]">{readiness.titleAr || "أنت جاهز؟"}</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-slate-500">{readiness.description || "راجع البيانات والمستندات المطلوبة قبل البدء."}</p>
        </div>

        <div className="space-y-4">
          {visibleSections.map((section) => (
            <section key={section.key} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-black text-[#00102e]">{section.titleAr}</h2>
                {section.description && <p className="mt-1 text-xs leading-6 text-slate-500">{section.description}</p>}
              </div>
              <div className="divide-y divide-slate-100">
                {section.items.filter((item) => !item.visibleWhen || evaluateCondition(item.visibleWhen, fieldValues)).map((item) => {
                  const field = fieldForItem(item, variant);
                  const completed = itemCompleted(item, fieldValues, attachmentRefs);
                  const checked = completed || Boolean(acknowledged[item.key]);
                  const attachmentInfo = attachmentDescription(item) ?? attachmentDescription({ ...item, attachmentRules: field?.attachmentRules });
                  return (
                    <label key={item.key} className={`flex cursor-pointer items-start gap-3 px-5 py-4 transition ${checked ? "bg-emerald-50/50" : "hover:bg-slate-50"}`}>
                      <input type="checkbox" checked={checked} onChange={(event) => setAcknowledged((current) => ({ ...current, [item.key]: event.target.checked }))} className="mt-1 h-4 w-4 accent-[#986410]" />
                      <span className="flex min-w-0 flex-1 items-start justify-between gap-3">
                        <span>
                          <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                            {item.type === "document" ? <Upload className="h-4 w-4 text-[#986410]" /> : <FileText className="h-4 w-4 text-[#986410]" />}
                            {item.labelAr}
                            {item.required && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-800">مطلوب</span>}
                          </span>
                          {item.description && <span className="mt-1 block text-xs leading-6 text-slate-500">{item.description}</span>}
                          {attachmentInfo && <span className="mt-1 block text-[10px] font-bold text-slate-400">{attachmentInfo}</span>}
                        </span>
                        {item.helpText && <span title={item.helpText} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-800"><HelpCircle className="h-3.5 w-3.5" />!</span>}
                      </span>
                      {completed && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                    </label>
                  );
                })}
                {!section.items.length && <div className="px-5 py-5 text-xs font-semibold text-slate-400">لا توجد متطلبات لهذه الصفحة.</div>}
              </div>
            </section>
          ))}
          {!visibleSections.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500"><AlertCircle className="mx-auto mb-2 h-5 w-5" />لا توجد متطلبات إضافية. يمكنك بدء العقد.</div>}
        </div>

        {incompleteRequired.length > 0 && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-900">راجع المتطلبات المعلّمة «مطلوب» قبل المتابعة. يمكنك تأكيد جاهزيتك من خلال العلامة بجانب كل متطلب.</div>}
        <button
          type="button"
          onClick={() => {
            if (requireAuth) { setShowAuthPrompt(true); return; }
            onContinue();
          }}
          disabled={incompleteRequired.length > 0 || authLoading}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-sm font-black text-[#d5a84c] shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          {authLoading ? "جاري التحقق من الحساب..." : "ابدأ تعبئة العقد الآن"} <ArrowLeft className="h-4 w-4" />
        </button>
      </main>

      {showAuthPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#00102e]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-right shadow-2xl">
            <span className="inline-flex rounded-full bg-[#986410]/10 px-3 py-1 text-[10px] font-black text-[#986410]">قبل إدخال البيانات</span>
            <h2 className="mt-4 text-lg font-black text-[#00102e]">خلّينا نحفظ شغلك الأول</h2>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">سجل دخول أو اعمل حساب علشان عقدك يتحفظ تلقائيًا وتقدر ترجع تكمله في أي وقت.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Link href={`/register?next=${encodedNext}`} className="rounded-xl bg-[#00102e] px-4 py-3 text-center text-xs font-black text-white">اعمل حساب</Link>
              <Link href={`/login?next=${encodedNext}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-xs font-black text-[#00102e]">عندي حساب</Link>
            </div>
            <button type="button" onClick={() => setShowAuthPrompt(false)} className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-50">رجوع</button>
          </section>
        </div>
      )}
    </div>
  );
}
