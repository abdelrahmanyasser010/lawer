import type {
  ConditionDefinition,
  ContractDraftData,
  ContractFieldValue,
  ContractTemplateDefinition,
  LegalClauseDefinition,
  ResolvedWizardDefinition,
  WizardFieldDefinition,
  WizardStepDefinition,
} from "./types";

function primitiveValue(value: ContractFieldValue | undefined): string | number | boolean | null | undefined {
  if (Array.isArray(value)) return undefined;
  return value;
}

export function evaluateCondition(
  condition: ConditionDefinition | undefined,
  fieldValues: ContractDraftData["fieldValues"],
): boolean {
  if (!condition) return true;
  if ("all" in condition) return condition.all.every((item) => evaluateCondition(item, fieldValues));
  if ("any" in condition) return condition.any.some((item) => evaluateCondition(item, fieldValues));
  if ("not" in condition) return !evaluateCondition(condition.not, fieldValues);

  const current = primitiveValue(fieldValues[condition.fieldKey]);
  switch (condition.operator) {
    case "equals":
      return current === condition.value;
    case "not_equals":
      return current !== condition.value;
    case "truthy":
      return Boolean(current);
    case "falsy":
      return !current;
    case "includes":
      return String(current ?? "").includes(String(condition.value ?? ""));
    default:
      return true;
  }
}

function insertStepsBefore(
  steps: WizardStepDefinition[],
  insertedSteps: WizardStepDefinition[],
  beforeKey: string,
): WizardStepDefinition[] {
  const index = steps.findIndex((step) => step.key === beforeKey);
  if (index < 0) return [...steps, ...insertedSteps];
  return [...steps.slice(0, index), ...insertedSteps, ...steps.slice(index)];
}

export function findInvalidOptionalClauseKeys(
  template: ContractTemplateDefinition,
  variantKey: string,
  selectedOptionalClauseKeys: string[],
): string[] {
  const variant = template.variants.find((item) => item.key === variantKey);
  if (!variant) return [...selectedOptionalClauseKeys];

  return selectedOptionalClauseKeys.filter((clauseKey) => {
    const clause = template.optionalClauses.find((item) => item.key === clauseKey);
    return !clause ||
      !variant.allowedOptionalClauseKeys.includes(clause.key) ||
      !clause.applicableVariantKeys.includes(variant.key);
  });
}

export function resolveWizardDefinition(
  template: ContractTemplateDefinition,
  variantKey: string,
  selectedOptionalClauseKeys: string[],
  fieldValues: ContractDraftData["fieldValues"],
): ResolvedWizardDefinition {
  const variant = template.variants.find((item) => item.key === variantKey);
  if (!variant) {
    throw new Error(`Variant ${variantKey} is not available for ${template.slug}`);
  }

  let steps = variant.steps.map((step) => ({ ...step, fields: [...step.fields] }));
  const activeClauseKeys = new Set(variant.requiredClauseKeys);
  const effectiveClauseKeys = [...new Set(selectedOptionalClauseKeys)];

  for (const clauseKey of effectiveClauseKeys) {
    const clause = template.optionalClauses.find(
      (item) =>
        item.key === clauseKey &&
        variant.allowedOptionalClauseKeys.includes(item.key) &&
        item.applicableVariantKeys.includes(variant.key),
    );
    if (!clause) continue;
    if (!clause.manualFillAnnex) {
      steps = insertStepsBefore(steps, clause.insertedSteps, clause.insertBeforeStepKey);
    }
    clause.legalClauseKeys.forEach((key) => activeClauseKeys.add(key));
  }

  steps = steps
    .filter((step) => evaluateCondition(step.visibleWhen, fieldValues))
    .map((step) => ({
      ...step,
      fields: step.fields
        .filter((field) => evaluateCondition(field.visibleWhen, fieldValues))
        .map((field) => ({
          ...field,
          required: Boolean(field.required || (field.requiredWhen && evaluateCondition(field.requiredWhen, fieldValues))),
        })),
    }));

  return { template, variant, steps, activeClauseKeys: [...activeClauseKeys] };
}

export interface RenderedLegalClause {
  key: string;
  titleAr: string;
  bodyAr: string;
  sourceDocumentName?: string;
  sourcePageStart?: number;
  sourcePageEnd?: number;
}

function formatClauseVariable(
  fieldKey: string,
  value: unknown,
  field: WizardFieldDefinition | undefined,
  fieldValues: Record<string, any>,
): string {
  if (value === "أخرى") {
    const other = fieldValues[`${fieldKey}_other`];
    if (other !== undefined && other !== null && String(other).trim() !== "") return String(other).trim();
  }
  const option = field?.options?.find((item) => String(item.value) === String(value));
  if (option) return option.labelAr;
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number") return value.toLocaleString("ar-EG");
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === "object") return Object.values(item).filter(Boolean).join(" — ");
      return String(item ?? "");
    }).filter(Boolean).join("، ");
  }
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.split("-").reverse().join("/");
  return text;
}

export function renderLegalClauses(
  template: ContractTemplateDefinition,
  variantKey: string,
  selectedOptionalClauseKeys: string[] = [],
  fieldValues: Record<string, any> = {},
): RenderedLegalClause[] {
  const resolved = resolveWizardDefinition(template, variantKey, selectedOptionalClauseKeys, fieldValues);
  const variant = resolved.variant;

  const availableClauseMap = new Map<string, LegalClauseDefinition>();
  for (const clause of template.legalClauses || []) {
    if (clause.enabled !== false) {
      availableClauseMap.set(clause.key, clause);
    }
  }

  const manualClauseKeys = new Set<string>();
  const effectiveClauseKeys = [...new Set(selectedOptionalClauseKeys)];
  for (const optional of template.optionalClauses) {
    if (effectiveClauseKeys.includes(optional.key) && optional.manualFillAnnex) {
      for (const k of optional.legalClauseKeys) {
        manualClauseKeys.add(k);
      }
    }
  }

  const rendered: RenderedLegalClause[] = [];
  const fieldMap = new Map<string, WizardFieldDefinition>(
    resolved.steps.flatMap((step) => step.fields).map((field) => [field.key, field] as const),
  );

  for (const key of resolved.activeClauseKeys) {
    const clause = availableClauseMap.get(key);
    if (!clause) continue;
    if (clause.visibleWhen && !evaluateCondition(clause.visibleWhen, fieldValues)) continue;

    let body = clause.bodyAr || "";
    const isManual = manualClauseKeys.has(key);
    const variables = isManual ? [] : (clause.variables || []);

    for (const v of variables) {
      const token = `{{${v}}}`;
      let val = fieldValues[v];
      if (val === undefined || val === null || val === "") {
        val = "بيان مطلوب";
      } else {
        val = formatClauseVariable(v, val, fieldMap.get(v), fieldValues);
      }
      body = body.split(token).join(String(val));
    }

    rendered.push({
      key,
      titleAr: clause.titleAr || key,
      bodyAr: body,
      sourceDocumentName: clause.sourceDocumentName,
      sourcePageStart: clause.sourcePageStart,
      sourcePageEnd: clause.sourcePageEnd,
    });
  }

  return rendered;
}
