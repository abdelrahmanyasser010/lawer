import type {
  ConditionDefinition,
  ContractDraftData,
  ContractFieldValue,
  ContractTemplateDefinition,
  ResolvedWizardDefinition,
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

  for (const clauseKey of selectedOptionalClauseKeys) {
    const clause = template.optionalClauses.find(
      (item) =>
        item.key === clauseKey &&
        variant.allowedOptionalClauseKeys.includes(item.key) &&
        item.applicableVariantKeys.includes(variant.key),
    );
    if (!clause) continue;
    steps = insertStepsBefore(steps, clause.insertedSteps, clause.insertBeforeStepKey);
    clause.legalClauseKeys.forEach((key) => activeClauseKeys.add(key));
  }

  steps = steps
    .filter((step) => evaluateCondition(step.visibleWhen, fieldValues))
    .map((step) => ({
      ...step,
      fields: step.fields.filter((field) => evaluateCondition(field.visibleWhen, fieldValues)),
    }));

  return { template, variant, steps, activeClauseKeys: [...activeClauseKeys] };
}
