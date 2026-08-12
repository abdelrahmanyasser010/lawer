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
): DraftValidationIssue[] {
  const issues: DraftValidationIssue[] = [];

  if (field.required) {
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
): DraftValidationIssue[] {
  const rows = Array.isArray(value) ? (value as RepeaterRowValue[]) : [];
  const minimumRows = field.minRows ?? (field.required ? 1 : 0);

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
      const value = field.type === "attachment"
        ? (draft.attachmentRefs[field.key] ?? draft.fieldValues[field.key])
        : draft.fieldValues[field.key];
      return field.type === "repeater"
        ? validateRepeaterField(step.key, field, value)
        : validateScalarField(step.key, field, value);
    }),
  );

  if (definition.template.slug === "apartment_sale" && draft.fieldValues.sale_payment_plan !== "installments" && draft.selectedOptionalClauseKeys.includes("sale_installment_schedule")) {
    issues.push({ stepKey: "sale_payment", fieldKey: "sale_payment_plan", labelAr: "ملحق جدول الأقساط يُستخدم فقط عند اختيار السداد بالتقسيط" });
  }

  if (definition.template.slug === "apartment_sale" && draft.fieldValues.sale_payment_plan === "installments") {
    const total = Number(draft.fieldValues.sale_total_price ?? 0);
    const down = Number(draft.fieldValues.sale_down_payment ?? 0);
    const remaining = Number(draft.fieldValues.sale_remaining_amount ?? 0);
    if (total > 0 && Number.isFinite(total) && Math.abs(total - (down + remaining)) > 0.01) {
      issues.push({ stepKey: "sale_payment", fieldKey: "sale_total_price", labelAr: "إجمالي الثمن يجب أن يساوي الدفعة المقدمة + باقي الثمن" });
    }
  }

  return issues;
}
