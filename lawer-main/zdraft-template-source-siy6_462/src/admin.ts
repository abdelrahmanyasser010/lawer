import type {
  ConditionDefinition,
  ContractFieldValue,
  ContractTemplateDefinition,
  ContractVariantDefinition,
  LegalClauseDefinition,
  OptionalClauseDefinition,
  WizardFieldDefinition,
  WizardStepDefinition,
} from "./types.ts";

export type TemplateIssueSeverity = "error" | "warning";

export interface TemplateDefinitionIssue {
  severity: TemplateIssueSeverity;
  code: string;
  messageAr: string;
  path: string;
}

export interface TemplateDefinitionInspection {
  errors: TemplateDefinitionIssue[];
  warnings: TemplateDefinitionIssue[];
  stats: {
    variants: number;
    steps: number;
    fields: number;
    legalClauses: number;
    optionalClauses: number;
  };
}

const knownFieldTypes = new Set([
  "text",
  "textarea",
  "number",
  "money",
  "date",
  "select",
  "radio",
  "checkbox",
  "attachment",
  "repeater",
]);

function issue(
  list: TemplateDefinitionIssue[],
  severity: TemplateIssueSeverity,
  code: string,
  messageAr: string,
  path: string,
): void {
  list.push({ severity, code, messageAr, path });
}

export function extractClauseVariables(clause: LegalClauseDefinition): string[] {
  const found = new Set<string>(clause.variables ?? []);
  const pattern = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(clause.bodyAr)) !== null) found.add(match[1]);
  return [...found].sort();
}

function validateCondition(
  condition: ConditionDefinition | undefined,
  knownFields: Set<string>,
  issues: TemplateDefinitionIssue[],
  path: string,
): void {
  if (!condition) return;
  if ("all" in condition) {
    if (condition.all.length === 0) issue(issues, "error", "EMPTY_COMPOSITE_CONDITION", "شرط all يجب أن يحتوي شرطًا واحدًا على الأقل", path);
    condition.all.forEach((item, index) => validateCondition(item, knownFields, issues, `${path}.all[${index}]`));
    return;
  }
  if ("any" in condition) {
    if (condition.any.length === 0) issue(issues, "error", "EMPTY_COMPOSITE_CONDITION", "شرط any يجب أن يحتوي شرطًا واحدًا على الأقل", path);
    condition.any.forEach((item, index) => validateCondition(item, knownFields, issues, `${path}.any[${index}]`));
    return;
  }
  if ("not" in condition) {
    validateCondition(condition.not, knownFields, issues, `${path}.not`);
    return;
  }
  if (!knownFields.has(condition.fieldKey)) {
    issue(issues, "error", "UNKNOWN_CONDITION_FIELD", `الشرط يعتمد على حقل غير موجود: ${condition.fieldKey}`, path);
  }
  if (["equals", "not_equals", "includes"].includes(condition.operator) && condition.value === undefined) {
    issue(issues, "error", "CONDITION_VALUE_REQUIRED", "الشرط يحتاج قيمة للمقارنة", path);
  }
}

function validateField(
  field: WizardFieldDefinition,
  knownFields: Set<string>,
  issues: TemplateDefinitionIssue[],
  path: string,
): void {
  if (!field.key.trim()) issue(issues, "error", "FIELD_KEY_REQUIRED", "مفتاح الحقل مطلوب", path);
  if (!field.labelAr.trim()) issue(issues, "error", "FIELD_LABEL_REQUIRED", "اسم الحقل العربي مطلوب", path);
  if (!knownFieldTypes.has(field.type)) issue(issues, "error", "FIELD_TYPE_INVALID", `نوع الحقل غير مدعوم: ${field.type}`, path);
  if ((field.type === "select" || field.type === "radio") && !(field.options?.length)) {
    issue(issues, "error", "FIELD_OPTIONS_REQUIRED", "حقول الاختيار تحتاج خيارًا واحدًا على الأقل", path);
  }
  if (field.options?.length) {
    const values = new Set<string>();
    field.options.forEach((option, index) => {
      if (!option.value.trim() || !option.labelAr.trim()) {
        issue(issues, "error", "FIELD_OPTION_INVALID", "قيمة واسم كل خيار مطلوبان", `${path}.options[${index}]`);
      }
      if (values.has(option.value)) issue(issues, "error", "FIELD_OPTION_DUPLICATE", `قيمة الخيار مكررة: ${option.value}`, `${path}.options[${index}]`);
      values.add(option.value);
    });
  }
  if (field.type === "repeater") {
    if (!(field.columns?.length)) issue(issues, "error", "REPEATER_COLUMNS_REQUIRED", "الجدول المتكرر يحتاج أعمدة", path);
    const columnKeys = new Set<string>();
    (field.columns ?? []).forEach((column, index) => {
      if (!column.key.trim() || !column.labelAr.trim()) {
        issue(issues, "error", "REPEATER_COLUMN_INVALID", "مفتاح واسم العمود مطلوبان", `${path}.columns[${index}]`);
      }
      if (columnKeys.has(column.key)) issue(issues, "error", "REPEATER_COLUMN_DUPLICATE", `مفتاح العمود مكرر: ${column.key}`, `${path}.columns[${index}]`);
      columnKeys.add(column.key);
    });
  }
  validateCondition(field.visibleWhen, knownFields, issues, `${path}.visibleWhen`);
  validateCondition(field.requiredWhen, knownFields, issues, `${path}.requiredWhen`);
}

function fieldKeysForVariant(variant: ContractVariantDefinition): Set<string> {
  const keys = new Set<string>(Object.keys(variant.defaultFieldValues ?? {}));
  for (const step of variant.steps) for (const field of step.fields) keys.add(field.key);
  return keys;
}

function fieldKeysForOptional(optional: OptionalClauseDefinition): Set<string> {
  const keys = new Set<string>(Object.keys(optional.defaultFieldValues ?? {}));
  for (const step of optional.insertedSteps) for (const field of step.fields) keys.add(field.key);
  return keys;
}

function fieldKeysForOptionalWithVariants(
  optional: OptionalClauseDefinition,
  variantByKey: Map<string, ContractVariantDefinition>,
): Set<string> {
  const keys = fieldKeysForOptional(optional);
  for (const variantKey of optional.applicableVariantKeys) {
    const variant = variantByKey.get(variantKey);
    if (!variant) continue;
    for (const key of fieldKeysForVariant(variant)) keys.add(key);
  }
  return keys;
}

export function inspectTemplateDefinition(definition: ContractTemplateDefinition): TemplateDefinitionInspection {
  const issues: TemplateDefinitionIssue[] = [];
  const legalClauses = definition.legalClauses ?? [];
  const clauseByKey = new Map(legalClauses.map((clause) => [clause.key, clause]));
  const enabledClauseKeys = new Set(legalClauses.filter((clause) => clause.enabled !== false).map((clause) => clause.key));
  const optionalByKey = new Map(definition.optionalClauses.map((optional) => [optional.key, optional]));
  const variantByKey = new Map(definition.variants.map((variant) => [variant.key, variant]));

  if (!definition.slug.trim()) issue(issues, "error", "TEMPLATE_SLUG_REQUIRED", "مفتاح القالب مطلوب", "slug");
  if (!definition.nameAr.trim()) issue(issues, "error", "TEMPLATE_NAME_REQUIRED", "اسم القالب مطلوب", "nameAr");
  if (!definition.variants.length) issue(issues, "error", "TEMPLATE_VARIANTS_REQUIRED", "يجب إضافة نوع عقد واحد على الأقل قبل النشر", "variants");

  const variantKeys = new Set<string>();
  definition.variants.forEach((variant, variantIndex) => {
    const variantPath = `variants[${variantIndex}]`;
    if (!variant.key.trim() || !variant.nameAr.trim()) issue(issues, "error", "VARIANT_INVALID", "مفتاح واسم نوع العقد مطلوبان", variantPath);
    if (variantKeys.has(variant.key)) issue(issues, "error", "VARIANT_DUPLICATE", `مفتاح نوع العقد مكرر: ${variant.key}`, variantPath);
    variantKeys.add(variant.key);
    if (!variant.steps.length) issue(issues, "error", "VARIANT_STEPS_REQUIRED", `نوع العقد «${variant.nameAr}» لا يحتوي خطوات`, `${variantPath}.steps`);

    const stepKeys = new Set<string>();
    const fieldKeys = fieldKeysForVariant(variant);
    const seenFieldKeys = new Set<string>();
    variant.steps.forEach((step, stepIndex) => {
      const stepPath = `${variantPath}.steps[${stepIndex}]`;
      if (!step.key.trim() || !step.titleAr.trim()) issue(issues, "error", "STEP_INVALID", "مفتاح واسم الخطوة مطلوبان", stepPath);
      if (stepKeys.has(step.key)) issue(issues, "error", "STEP_DUPLICATE", `مفتاح الخطوة مكرر: ${step.key}`, stepPath);
      stepKeys.add(step.key);
      if (!step.fields.length) issue(issues, "warning", "STEP_EMPTY", `الخطوة «${step.titleAr}» لا تحتوي حقولًا`, `${stepPath}.fields`);
      validateCondition(step.visibleWhen, fieldKeys, issues, `${stepPath}.visibleWhen`);
      step.fields.forEach((field, fieldIndex) => {
        const fieldPath = `${stepPath}.fields[${fieldIndex}]`;
        if (seenFieldKeys.has(field.key)) issue(issues, "error", "FIELD_DUPLICATE_IN_VARIANT", `مفتاح الحقل مكرر داخل نوع العقد: ${field.key}`, fieldPath);
        seenFieldKeys.add(field.key);
        validateField(field, fieldKeys, issues, fieldPath);
      });
    });

    variant.requiredClauseKeys.forEach((clauseKey, index) => {
      if (!enabledClauseKeys.has(clauseKey)) issue(issues, "error", "REQUIRED_CLAUSE_MISSING", `النص القانوني المطلوب غير موجود أو معطل: ${clauseKey}`, `${variantPath}.requiredClauseKeys[${index}]`);
    });

    variant.allowedOptionalClauseKeys.forEach((optionalKey, index) => {
      const optional = optionalByKey.get(optionalKey);
      if (!optional) issue(issues, "error", "OPTIONAL_CLAUSE_UNKNOWN", `الإضافة الاختيارية غير موجودة: ${optionalKey}`, `${variantPath}.allowedOptionalClauseKeys[${index}]`);
      else if (!optional.applicableVariantKeys.includes(variant.key)) issue(issues, "error", "OPTIONAL_VARIANT_MISMATCH", `الإضافة ${optionalKey} غير مفعلة لهذا النوع`, `${variantPath}.allowedOptionalClauseKeys[${index}]`);
    });

    (variant.requiredAnnexKeys ?? []).forEach((annexKey, index) => {
      if (!variant.allowedOptionalClauseKeys.includes(annexKey)) {
        issue(issues, "error", "REQUIRED_ANNEX_NOT_ALLOWED", `الملحق الأساسي غير موجود ضمن ملاحق النوع: ${annexKey}`, `${variantPath}.requiredAnnexKeys[${index}]`);
        return;
      }
      const annex = optionalByKey.get(annexKey);
      if (!annex || annex.outputMode !== "separate_annex") {
        issue(issues, "error", "REQUIRED_ANNEX_INVALID", `الملحق الأساسي يجب أن يكون ملحقًا مستقلاً صالحًا: ${annexKey}`, `${variantPath}.requiredAnnexKeys[${index}]`);
      }
    });
  });

  const optionalKeys = new Set<string>();
  definition.optionalClauses.forEach((optional, optionalIndex) => {
    const optionalPath = `optionalClauses[${optionalIndex}]`;
    if (!optional.key.trim() || !optional.nameAr.trim()) issue(issues, "error", "OPTIONAL_INVALID", "مفتاح واسم الإضافة الاختيارية مطلوبان", optionalPath);
    if (optionalKeys.has(optional.key)) issue(issues, "error", "OPTIONAL_DUPLICATE", `مفتاح الإضافة مكرر: ${optional.key}`, optionalPath);
    optionalKeys.add(optional.key);
    if (!optional.applicableVariantKeys.length) issue(issues, "error", "OPTIONAL_VARIANTS_REQUIRED", "يجب تحديد أنواع العقد التي تقبل هذه الإضافة", `${optionalPath}.applicableVariantKeys`);
    optional.applicableVariantKeys.forEach((variantKey, index) => {
      const variant = variantByKey.get(variantKey);
      if (!variant) {
        issue(issues, "error", "OPTIONAL_VARIANT_UNKNOWN", `نوع العقد غير موجود: ${variantKey}`, `${optionalPath}.applicableVariantKeys[${index}]`);
        return;
      }
      if (optional.insertBeforeStepKey && !variant.steps.some((step) => step.key === optional.insertBeforeStepKey)) {
        issue(issues, "warning", "OPTIONAL_INSERT_TARGET_UNKNOWN", `الخطوة المحددة لإدراج الإضافة غير موجودة في ${variant.nameAr}; ستُضاف في النهاية`, `${optionalPath}.insertBeforeStepKey`);
      }
    });
    const optionalFields = fieldKeysForOptionalWithVariants(optional, variantByKey);
    optional.insertedSteps.forEach((step, stepIndex) => {
      const stepPath = `${optionalPath}.insertedSteps[${stepIndex}]`;
      validateCondition(step.visibleWhen, optionalFields, issues, `${stepPath}.visibleWhen`);
      step.fields.forEach((field, fieldIndex) => validateField(field, optionalFields, issues, `${stepPath}.fields[${fieldIndex}]`));
    });
    optional.legalClauseKeys.forEach((clauseKey, index) => {
      if (!enabledClauseKeys.has(clauseKey)) issue(issues, "error", "OPTIONAL_LEGAL_CLAUSE_MISSING", `نص الإضافة القانوني غير موجود أو معطل: ${clauseKey}`, `${optionalPath}.legalClauseKeys[${index}]`);
    });
  });

  const clauseKeys = new Set<string>();
  legalClauses.forEach((clause, clauseIndex) => {
    const clausePath = `legalClauses[${clauseIndex}]`;
    if (!clause.key.trim() || !clause.titleAr.trim() || !clause.bodyAr.trim()) issue(issues, "error", "LEGAL_CLAUSE_INVALID", "مفتاح وعنوان ونص البند القانوني مطلوبة", clausePath);
    if (clauseKeys.has(clause.key)) issue(issues, "error", "LEGAL_CLAUSE_DUPLICATE", `مفتاح البند القانوني مكرر: ${clause.key}`, clausePath);
    clauseKeys.add(clause.key);
    if (clause.enabled === false) return;

    const usedByVariants = definition.variants.filter((variant) => variant.requiredClauseKeys.includes(clause.key));
    const usedByOptionals = definition.optionalClauses.filter((optional) => optional.legalClauseKeys.includes(clause.key));
    const variables = extractClauseVariables(clause);
    const applicableFieldSets: Array<{ name: string; fields: Set<string> }> = [
      ...usedByVariants.map((variant) => ({ name: variant.nameAr, fields: fieldKeysForVariant(variant) })),
      ...usedByOptionals.flatMap((optional) => optional.applicableVariantKeys.map((variantKey) => {
        const variant = variantByKey.get(variantKey);
        const fields = new Set([...(variant ? fieldKeysForVariant(variant) : []), ...fieldKeysForOptional(optional)]);
        return { name: `${optional.nameAr} / ${variant?.nameAr ?? variantKey}`, fields };
      })),
    ];
    for (const variable of variables) {
      for (const target of applicableFieldSets) {
        if (!target.fields.has(variable)) issue(issues, "error", "CLAUSE_VARIABLE_UNKNOWN", `المتغير {{${variable}}} غير موجود في حقول ${target.name}`, `${clausePath}.bodyAr`);
      }
    }
    const allKnownFields = new Set(definition.variants.flatMap((variant) => [...fieldKeysForVariant(variant)]));
    validateCondition(clause.visibleWhen, allKnownFields, issues, `${clausePath}.visibleWhen`);
    if (!usedByVariants.length && !usedByOptionals.length) issue(issues, "warning", "LEGAL_CLAUSE_UNUSED", `البند «${clause.titleAr}» غير مرتبط بأي نوع عقد أو إضافة`, clausePath);
  });

  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");
  return {
    errors,
    warnings,
    stats: {
      variants: definition.variants.length,
      steps: definition.variants.reduce((sum, variant) => sum + variant.steps.length, 0),
      fields: definition.variants.reduce((sum, variant) => sum + variant.steps.reduce((stepSum, step) => stepSum + step.fields.length, 0), 0),
      legalClauses: legalClauses.length,
      optionalClauses: definition.optionalClauses.length,
    },
  };
}

export function createSampleFieldValues(
  definition: ContractTemplateDefinition,
  variantKey: string,
  optionalKeys: string[] = [],
): Record<string, ContractFieldValue> {
  const variant = definition.variants.find((item) => item.key === variantKey);
  if (!variant) return {};
  const optionalSteps = definition.optionalClauses
    .filter((optional) => optionalKeys.includes(optional.key) && optional.applicableVariantKeys.includes(variantKey))
    .flatMap((optional) => optional.insertedSteps);
  const fields = [...variant.steps, ...optionalSteps].flatMap((step) => step.fields);
  const output: Record<string, ContractFieldValue> = { ...(variant.defaultFieldValues ?? {}) };
  for (const optional of definition.optionalClauses.filter((item) => optionalKeys.includes(item.key))) {
    Object.assign(output, optional.defaultFieldValues ?? {});
  }
  for (const field of fields) {
    if (output[field.key] !== undefined) continue;
    switch (field.type) {
      case "number": output[field.key] = Math.max(field.validation?.min ?? 1, 1); break;
      case "money": output[field.key] = Math.max(field.validation?.min ?? 1000, 1000); break;
      case "date": output[field.key] = "2026-01-01"; break;
      case "checkbox": output[field.key] = true; break;
      case "radio":
      case "select": output[field.key] = field.options?.[0]?.value ?? "sample"; break;
      case "repeater": output[field.key] = field.columns?.length ? [{ ...Object.fromEntries(field.columns.map((column) => [column.key, column.type === "number" || column.type === "money" ? 1 : "بيان تجريبي"])) }] : []; break;
      case "attachment": output[field.key] = []; break;
      default: output[field.key] = `بيان ${field.labelAr}`;
    }
  }
  return output;
}

export function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) return [...items];
  const copy = [...items];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return copy;
}

export function cloneTemplateDefinition(definition: ContractTemplateDefinition): ContractTemplateDefinition {
  return structuredClone(definition);
}
