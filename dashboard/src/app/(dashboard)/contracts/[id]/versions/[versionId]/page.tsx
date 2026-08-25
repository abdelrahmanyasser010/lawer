"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Save, ShieldAlert } from "lucide-react";
import {
  resolveWizardDefinition,
  validateDynamicDefinition,
  type ContractDraftData,
  type ContractFieldValue,
  type ContractTemplateDefinition,
} from "@zdraft/template-engine";
import DynamicFieldRenderer from "@/features/contracts/components/DynamicFieldRenderer";
import { DashboardApiError, dashboardRequest } from "@/lib/apiClient";
import LegalDocumentSheet from "@/components/contract/LegalDocumentSheet";

type ContractApiDetails = {
  id: number;
  serial_number: string;
  title: string;
  status: string;
  current_version_id: number;
  template_definition: ContractTemplateDefinition;
  template_version: number;
  variant_key: string;
  selected_optional_clause_keys: string[];
  field_values_json: Record<string, ContractFieldValue>;
  attachment_refs_json?: Record<string, string[]>;
  current_step_key?: string;
  creation_mode?: ContractDraftData["creationMode"];
  core_identity_locked?: boolean;
  versions: Array<{ id: number; versionNumber: number; status: string }>;
};

export default function ContractVersionEditorPage() {
  const params = useParams<{ id: string; versionId: string }>();
  const router = useRouter();
  const contractId = Number(params.id);
  const versionId = Number(params.versionId);
  const [contract, setContract] = useState<ContractApiDetails | null>(null);
  const [draft, setDraft] = useState<ContractDraftData | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeField, setActiveField] = useState<{ key: string; labelAr: string } | null>(null);

  useEffect(() => {
    let active = true;
    dashboardRequest<ContractApiDetails>(`/api/v1/contracts/${contractId}`)
      .then((details) => {
        if (!active) return;
        if (details.current_version_id !== versionId) throw new Error("يمكن تحرير الإصدار الحالي فقط");
        const current = details.versions.find((item) => item.id === versionId);
        if (!current || ["locked", "issued"].includes(current.status)) {
          throw new Error("هذا الإصدار مقفول أو غير قابل للتعديل");
        }
        setContract(details);
        setDraft({
          templateSlug: details.template_definition.slug,
          templateVersion: details.template_version,
          variantKey: details.variant_key,
          selectedOptionalClauseKeys: details.selected_optional_clause_keys ?? [],
          fieldValues: details.field_values_json ?? {},
          attachmentRefs: details.attachment_refs_json ?? {},
          currentStepKey: details.current_step_key ?? details.template_definition.variants.find((v) => v.key === details.variant_key)?.steps[0]?.key ?? "",
          creationMode: details.creation_mode ?? "office_assisted",
          coreIdentityLocked: Boolean(details.core_identity_locked),
          updatedAt: new Date().toISOString(),
        });
      })
      .catch((caught) => {
        if (active) setError(caught instanceof DashboardApiError ? caught.message : caught instanceof Error ? caught.message : "تعذر تحميل العقد");
      });
    return () => { active = false; };
  }, [contractId, versionId]);

  const resolved = useMemo(() => {
    if (!contract || !draft?.variantKey) return null;
    return resolveWizardDefinition(
      contract.template_definition,
      draft.variantKey,
      draft.selectedOptionalClauseKeys,
      draft.fieldValues,
    );
  }, [contract, draft]);

  const allowedOptionalClauses = useMemo(() => {
    if (!contract || !draft?.variantKey) return [];
    return contract.template_definition.optionalClauses.filter((clause) =>
      clause.applicableVariantKeys.includes(draft.variantKey!) &&
      contract.template_definition.variants.find((v) => v.key === draft.variantKey)?.allowedOptionalClauseKeys.includes(clause.key)
    );
  }, [contract, draft]);


  function setField(key: string, value: ContractFieldValue) {
    setDraft((current) => current ? { ...current, fieldValues: { ...current.fieldValues, [key]: value }, updatedAt: new Date().toISOString() } : current);
  }

  function toggleOptional(key: string) {
    if (!contract) return;
    const clause = contract.template_definition.optionalClauses.find((item) => item.key === key);
    setDraft((current) => {
      if (!current) return current;
      const selected = current.selectedOptionalClauseKeys.includes(key);
      return {
        ...current,
        selectedOptionalClauseKeys: selected ? current.selectedOptionalClauseKeys.filter((item) => item !== key) : [...current.selectedOptionalClauseKeys, key],
        fieldValues: !selected && clause?.defaultFieldValues ? { ...clause.defaultFieldValues, ...current.fieldValues } : current.fieldValues,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function uploadFiles(fieldKey: string, files: File[]) {
    if (!files.length || !draft) return;
    setUploadingField(fieldKey); setError(""); setNotice("");
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const body = new FormData();
        body.append("file", file, file.name);
        const item = await dashboardRequest<{ id: number; fileName: string }>("/api/v1/attachments", { method: "POST", body });
        await dashboardRequest(`/api/v1/attachments/${item.id}/link`, { method: "POST", body: JSON.stringify({ attachableType: "contract", attachableId: contractId }) });
        return item;
      }));
      const ids = uploaded.map((item) => String(item.id));
      setDraft((current) => current ? {
        ...current,
        attachmentRefs: { ...current.attachmentRefs, [fieldKey]: [...(current.attachmentRefs[fieldKey] ?? []), ...ids] },
        fieldValues: { ...current.fieldValues, [fieldKey]: [...(current.attachmentRefs[fieldKey] ?? []), ...ids] },
        updatedAt: new Date().toISOString(),
      } : current);
      setNotice("تم رفع المرفقات وربطها بالعقد.");
    } catch (caught) {
      setError(caught instanceof DashboardApiError ? caught.message : caught instanceof Error ? caught.message : "تعذر رفع الملفات");
    } finally {
      setUploadingField(null);
    }
  }

  async function save() {
    if (!draft || !resolved) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const issues = validateDynamicDefinition(resolved, draft);
      const result = await dashboardRequest<{ issues: string[] }>(`/api/v1/admin/contracts/${contractId}/versions/${versionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          variantKey: draft.variantKey,
          selectedOptionalClauseKeys: draft.selectedOptionalClauseKeys,
          fieldValues: draft.fieldValues,
          attachmentRefs: draft.attachmentRefs,
          currentStepKey: draft.currentStepKey,
          notes: "تعديل من محرر مكتب المحاماة",
        }),
      });
      const count = result.issues?.length ?? issues.length;
      setNotice(count ? `تم الحفظ، وما زال هناك ${count} حقل/قيمة مطلوبة قبل القفل.` : "تم حفظ إصدار العقد بنجاح.");
    } catch (caught) {
      setError(caught instanceof DashboardApiError ? caught.message : caught instanceof Error ? caught.message : "تعذر حفظ الإصدار");
    } finally {
      setSaving(false);
    }
  }

  if (error && !contract) return <div className="p-8"><div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-black text-rose-800">{error}</div></div>;
  if (!contract || !draft || !resolved) return <div className="p-10 text-center text-xs font-black text-slate-500">جاري تحميل محرر الإصدار...</div>;

  return (
    <div className="mx-auto max-w-[1550px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <Link href={`/contracts/${contractId}`} className="inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-[#986410]"><ArrowRight className="h-4 w-4"/> تفاصيل العقد</Link>
          <h1 className="mt-2 text-2xl font-black text-[#00102e]">{contract.title}</h1>
          <p className="mt-1 font-mono text-xs font-bold text-slate-400">{contract.serial_number} · إصدار #{versionId}</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>router.push(`/contracts/${contractId}`)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700">إلغاء</button>
          <button type="button" disabled={saving} onClick={()=>void save()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00102e] px-6 py-2.5 text-xs font-black text-[#d9a84e] shadow-md hover:bg-[#00102e]/90 disabled:opacity-50"><Save className="h-4 w-4 text-[#986410]"/>{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</button>
        </div>
      </header>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-900"><ShieldAlert className="ml-1 inline h-4 w-4"/>هذا المحرر يغيّر بيانات العقد داخل الإصدار الحالي مباشرة، وتنعكس التغييرات في ورقة العقد المجاورة فوراً.</div>
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-black text-emerald-800">{notice}</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-black text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Right Column: Form Sections */}
        <div className="xl:col-span-6 space-y-5">
          {allowedOptionalClauses.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-black text-[#00102e]">الملاحق الاختيارية</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {allowedOptionalClauses.map((clause)=>(
                  <label key={clause.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 transition">
                    <input type="checkbox" checked={draft.selectedOptionalClauseKeys.includes(clause.key)} onChange={()=>toggleOptional(clause.key)} className="mt-1 h-4 w-4 accent-[#986410]"/>
                    <span>
                      <span className="block text-xs font-black text-[#00102e]">{clause.nameAr}</span>
                      <span className="mt-0.5 block text-[10px] font-bold leading-5 text-slate-500">{clause.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {resolved.steps.map((step) => (
            <section key={step.key} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-[#00102e]">{step.titleAr}</h2>
                {step.description && <p className="mt-1 text-xs font-semibold text-slate-500">{step.description}</p>}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {step.fields.map((field) => (
                  <div
                    key={field.key}
                    onFocus={() => setActiveField({ key: field.key, labelAr: field.labelAr })}
                    className={field.type === "textarea" || field.type === "repeater" || field.type === "attachment" ? "sm:col-span-2" : ""}
                  >
                    <DynamicFieldRenderer
                      field={field}
                      value={field.type === "attachment" ? (draft.attachmentRefs[field.key]?.length ? [`${draft.attachmentRefs[field.key].length} ملف مرفوع`] : []) : draft.fieldValues[field.key]}
                      onChange={(value) => {
                        setActiveField({ key: field.key, labelAr: field.labelAr });
                        setField(field.key, value);
                      }}
                      onFilesSelected={field.type === "attachment" ? (files)=>uploadFiles(field.key, files) : undefined}
                      uploading={uploadingField === field.key}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={()=>router.push(`/contracts/${contractId}`)} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black text-slate-700">رجوع بدون حفظ</button>
            <button type="button" disabled={saving} onClick={()=>void save()} className="inline-flex items-center gap-2 rounded-2xl bg-[#00102e] px-8 py-3 text-xs font-black text-[#d9a84e] shadow-lg hover:bg-[#00102e]/90 disabled:opacity-50"><Save className="h-4 w-4 text-[#986410]"/>حفظ التعديلات</button>
          </div>
        </div>

        {/* Left Column: Live A4 Legal Document Sheet */}
        <div className="xl:col-span-6 space-y-4">
          <div className="sticky top-20 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#00102e] px-4 py-3 text-white">
              <span className="text-xs font-black text-white">ورقة العقد الحية (A4)</span>
              <span className="text-[10px] font-bold text-[#d9a84e]">
                {activeField ? `تعديل: ${activeField.labelAr}` : "تحديث مباشر أثناء التعديل"}
              </span>
            </div>
            <div className="overflow-hidden bg-slate-100/70 p-3 sm:p-5 max-h-[calc(100vh-140px)] overflow-y-auto">
              <LegalDocumentSheet
                serialNumber={contract.serial_number}
                templateSlug={draft.templateSlug}
                variantKey={draft.variantKey}
                selectedOptionalClauseKeys={draft.selectedOptionalClauseKeys}
                templateNameAr={contract.title}
                fieldValues={draft.fieldValues}
                status={contract.status}
                activeFieldKey={activeField?.key}
                activeFieldLabel={activeField?.labelAr}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
