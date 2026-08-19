import { evaluateCondition } from "./resolver";
import type {
  ContractDraftData,
  RepeaterRowValue,
  ResolvedWizardDefinition,
  WizardFieldDefinition,
} from "./types";

export interface DraftValidationIssue {
  stepKey: string;
  fieldKey: string;
  labelAr: string;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function validateScalarField(
  stepKey: string,
  field: WizardFieldDefinition,
  value: unknown,
  fieldValues: ContractDraftData["fieldValues"],
): DraftValidationIssue[] {
  const issues: DraftValidationIssue[] = [];

  const requiredNow = field.required || Boolean(field.requiredWhen && evaluateCondition(field.requiredWhen, fieldValues));

  if (requiredNow) {
    const missing = field.type === "checkbox" ? value !== true : isEmpty(value);
    if (missing) {
      issues.push({ stepKey, fieldKey: field.key, labelAr: field.labelAr });
      return issues;
    }
  }

  if (isEmpty(value)) return issues;

  if (field.type === "number" || field.type === "money") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      issues.push({ stepKey, fieldKey: field.key, labelAr: `${field.labelAr} — قيمة رقمية غير صحيحة` });
      return issues;
    }
    if (field.validation?.min !== undefined && numeric < field.validation.min) {
      issues.push({ stepKey, fieldKey: field.key, labelAr: `${field.labelAr} — الحد الأدنى ${field.validation.min}` });
    }
    if (field.validation?.max !== undefined && numeric > field.validation.max) {
      issues.push({ stepKey, fieldKey: field.key, labelAr: `${field.labelAr} — الحد الأقصى ${field.validation.max}` });
    }
  }

  const text = String(value);
  if (field.validation?.minLength !== undefined && text.length < field.validation.minLength) {
    issues.push({ stepKey, fieldKey: field.key, labelAr: `${field.labelAr} — أقصر من المطلوب` });
  }
  if (field.validation?.maxLength !== undefined && text.length > field.validation.maxLength) {
    issues.push({ stepKey, fieldKey: field.key, labelAr: `${field.labelAr} — أطول من المسموح` });
  }
  if (field.validation?.expectedDigits !== undefined) {
    const digitCount = text.replace(/\D/g, "").length;
    if (digitCount !== field.validation.expectedDigits) {
      issues.push({
        stepKey,
        fieldKey: field.key,
        labelAr: `${field.labelAr} — مطلوب ${field.validation.expectedDigits} رقمًا`,
      });
    }
  }
  if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(text)) {
    issues.push({ stepKey, fieldKey: field.key, labelAr: `${field.labelAr} — التنسيق غير صحيح` });
  }

  return issues;
}

function validateRepeaterField(
  stepKey: string,
  field: WizardFieldDefinition,
  value: unknown,
  fieldValues: ContractDraftData["fieldValues"],
): DraftValidationIssue[] {
  const rows = Array.isArray(value) ? (value as RepeaterRowValue[]) : [];
  const requiredNow = field.required || Boolean(field.requiredWhen && evaluateCondition(field.requiredWhen, fieldValues));
  const minimumRows = field.minRows ?? (requiredNow ? 1 : 0);

  if (rows.length < minimumRows) {
    return [{ stepKey, fieldKey: field.key, labelAr: field.labelAr }];
  }

  return rows.flatMap((row, rowIndex) =>
    (field.columns ?? [])
      .filter((column) => !column.visibleWhen || evaluateCondition(column.visibleWhen, row))
      .filter((column) => (column.required || Boolean(column.requiredWhen && evaluateCondition(column.requiredWhen, row))) && isEmpty(row[column.key]))
      .map((column) => ({
        stepKey,
        fieldKey: `${field.key}.${rowIndex}.${column.key}`,
        labelAr: `${field.labelAr} — ${column.labelAr} في العنصر رقم ${rowIndex + 1}`,
      })),
  );
}

export function validateDynamicDefinition(
  definition: ResolvedWizardDefinition,
  draft: ContractDraftData,
): DraftValidationIssue[] {
  const issues = definition.steps.flatMap((step) =>
    step.fields.flatMap((field) => {
      if (field.visibleWhen && !evaluateCondition(field.visibleWhen, draft.fieldValues)) return [];
      const value = field.type === "attachment"
        ? (draft.attachmentRefs[field.key] ?? draft.fieldValues[field.key])
        : draft.fieldValues[field.key];
      return field.type === "repeater"
        ? validateRepeaterField(step.key, field, value, draft.fieldValues)
        : validateScalarField(step.key, field, value, draft.fieldValues);
    }),
  );

  if (definition.template.slug === "freelancer" && draft.variantKey === "social_media_management") {
    const serviceKeys = [
      "social_service_account_management", "social_service_strategy", "social_service_copywriting", "social_service_design",
      "social_service_content_production", "social_service_publishing", "social_service_paid_ads", "social_service_reports",
      "social_service_community_management", "social_service_coordination", "social_service_photography", "social_service_influencers",
      "social_service_other_enabled",
    ];
    if (!serviceKeys.some((key) => Boolean(draft.fieldValues[key]))) {
      issues.push({
        stepKey: "social_services",
        fieldKey: "social_service_account_management",
        labelAr: "يجب اختيار خدمة واحدة على الأقل ضمن نطاق خدمات إدارة حسابات ومنصات التواصل الاجتماعي",
      });
    }

    if (draft.fieldValues.social_fee_nature === "total" && draft.fieldValues.social_payment_mode === "installments") {
      const total = Number(draft.fieldValues.social_fee ?? 0);
      const rows = Array.isArray(draft.fieldValues.social_payment_schedule) ? draft.fieldValues.social_payment_schedule : [];
      const installmentsTotal = rows.reduce((sum, row) => sum + Number((row as RepeaterRowValue).amount ?? 0), 0);
      if (total > 0 && rows.length > 0 && Math.abs(installmentsTotal - total) > 0.01) {
        issues.push({
          stepKey: "social_term_finance",
          fieldKey: "social_payment_schedule",
          labelAr: `مجموع الدفعات (${installmentsTotal}) يجب أن يساوي إجمالي المقابل المالي (${total})`,
        });
      }
    }
  }

  if (definition.template.slug === "freelancer" && draft.variantKey === "visual_identity_design" && draft.fieldValues.visual_payment_mode === "installments") {
    const total = Number(draft.fieldValues.visual_contract_value ?? 0);
    const rows = Array.isArray(draft.fieldValues.visual_main_payment_schedule) ? draft.fieldValues.visual_main_payment_schedule : [];
    const installmentsTotal = rows.reduce((sum, row) => sum + Number((row as RepeaterRowValue).amount ?? 0), 0);
    if (total > 0 && rows.length > 0 && Math.abs(installmentsTotal - total) > 0.01) {
      issues.push({
        stepKey: "visual_execution_finance",
        fieldKey: "visual_main_payment_schedule",
        labelAr: `مجموع الدفعات (${installmentsTotal}) يجب أن يساوي إجمالي المقابل المالي (${total})`,
      });
    }
  }

  if (definition.template.slug === "freelancer" && draft.variantKey === "website_development" && draft.fieldValues.website_payment_mode === "installments") {
    const total = Number(draft.fieldValues.website_total_price ?? 0);
    const rows = Array.isArray(draft.fieldValues.website_payment_schedule) ? draft.fieldValues.website_payment_schedule : [];
    const installmentsTotal = rows.reduce((sum, row) => sum + Number((row as RepeaterRowValue).amount ?? 0), 0);
    if (total > 0 && rows.length > 0 && Math.abs(installmentsTotal - total) > 0.01) {
      issues.push({
        stepKey: "website_finance_acceptance",
        fieldKey: "website_payment_schedule",
        labelAr: `مجموع الدفعات (${installmentsTotal}) يجب أن يساوي إجمالي المقابل المالي (${total})`,
      });
    }
  }

  if (definition.template.slug === "rental") {
    const fv = draft.fieldValues;

    const start = String(fv.start_date ?? "");
    const end = String(fv.end_date ?? "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && end <= start) {
      issues.push({ stepKey: "lease_term", fieldKey: "end_date", labelAr: "تاريخ نهاية الإيجار يجب أن يكون بعد تاريخ بداية الإيجار" });
    }

    const checkCountIssue = (prefix: "commercial" | "administrative", stepKey: string) => {
      if (!Boolean(fv[`${prefix}_guarantee_checks_enabled`])) return;
      const expected = Number(fv[`${prefix}_guarantee_checks_count`] ?? 0);
      const raw = String(fv[`${prefix}_guarantee_check_numbers`] ?? "").trim();
      if (!Number.isFinite(expected) || expected <= 0 || !raw) return;
      const numbers = raw.split(/[،,;؛\n]+/).map((item) => item.trim()).filter(Boolean);
      if (numbers.length !== expected) {
        issues.push({
          stepKey,
          fieldKey: `${prefix}_guarantee_check_numbers`,
          labelAr: `عدد أرقام شيكات الضمان المدخلة (${numbers.length}) يجب أن يساوي عدد الشيكات المحدد (${expected})`,
        });
      }
    };
    checkCountIssue("commercial", "rental_commercial_details");
    checkCountIssue("administrative", "rental_administrative_details");
  }

  if (definition.template.slug === "apartment_sale" && draft.fieldValues.sale_payment_plan !== "installments" && draft.selectedOptionalClauseKeys.includes("sale_installment_schedule")) {
    issues.push({ stepKey: "sale_payment", fieldKey: "sale_payment_plan", labelAr: "ملحق جدول الأقساط يُستخدم فقط عند اختيار السداد بالتقسيط" });
  }

  if (definition.template.slug === "apartment_sale" && draft.fieldValues.sale_payment_plan === "installments") {
    const total = Number(draft.fieldValues.sale_total_price ?? 0);
    const down = Number(draft.fieldValues.sale_down_payment ?? 0);
    const remaining = total - down;
    const rows = Array.isArray(draft.fieldValues.sale_installment_schedule_rows) ? draft.fieldValues.sale_installment_schedule_rows : [];
    const installmentsTotal = rows.reduce((sum, row) => sum + Number((row as RepeaterRowValue).amount ?? 0), 0);

    if (Number.isFinite(total) && total > 0 && Number.isFinite(down) && (down < 0 || down > total)) {
      issues.push({ stepKey: "sale_payment", fieldKey: "sale_down_payment", labelAr: "الدفعة المقدمة يجب ألا تتجاوز إجمالي ثمن البيع" });
    }
    if (Number.isFinite(remaining) && remaining >= 0 && rows.length > 0 && Math.abs(installmentsTotal - remaining) > 0.01) {
      issues.push({
        stepKey: "sale_payment",
        fieldKey: "sale_installment_schedule_rows",
        labelAr: `مجموع الأقساط (${installmentsTotal}) يجب أن يساوي باقي الثمن (${remaining})`,
      });
    }
  }

  // Identity-document validation is driven by the user's explicit choice, not nationality.
  // Legacy drafts without the selector keep a nationality-based fallback for compatibility.
  for (const step of definition.steps) {
    for (const field of step.fields) {
      if (!field.key.endsWith("_national_id")) continue;

      const typeKey = field.key.replace(/_national_id$/, "_identity_document_type");
      const natKey = field.key.replace(/_national_id$/, "_nationality");
      const selectedType = String(draft.fieldValues[typeKey] ?? "").trim();
      const nationalityVal = String(draft.fieldValues[natKey] ?? "").trim().toLowerCase();
      const idVal = String(draft.fieldValues[field.key] ?? "").trim();
      if (!idVal) continue;

      const legacyEgyptian = ["مصري", "egyptian", "مصرية", "مصري الجنسية"].includes(nationalityVal);
      const effectiveType = selectedType || (nationalityVal ? (legacyEgyptian ? "national_id" : "passport") : "");
      const digitsOnly = idVal.replace(/\D/g, "");

      if (effectiveType === "national_id" && (digitsOnly.length !== 14 || digitsOnly !== idVal)) {
        issues.push({
          stepKey: step.key,
          fieldKey: field.key,
          labelAr: "الرقم القومي — مطلوب 14 رقمًا بدون مسافات أو حروف",
        });
      } else if (effectiveType === "passport" && idVal.length < 5) {
        issues.push({
          stepKey: step.key,
          fieldKey: field.key,
          labelAr: "رقم جواز السفر — يجب ألا يقل عن 5 خانات",
        });
      }
    }
  }

  return issues;
}
