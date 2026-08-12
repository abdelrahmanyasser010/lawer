export type CreationMode = "self_service" | "lawyer_assisted" | "office_assisted";
export type KnownContractSlug = "rental" | "apartment_sale" | "freelancer";
export type ContractSlug = string;

export type PrimitiveFieldValue = string | number | boolean | null;
export type RepeaterRowValue = Record<string, PrimitiveFieldValue>;
export type ContractFieldValue = PrimitiveFieldValue | string[] | RepeaterRowValue[];

export type WizardFieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "attachment"
  | "repeater";

export interface FieldOptionDefinition {
  value: string;
  labelAr: string;
}

export interface FieldValidationDefinition {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  expectedDigits?: number;
}

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "truthy"
  | "falsy"
  | "includes";

export interface AtomicConditionDefinition {
  fieldKey: string;
  operator: ConditionOperator;
  value?: PrimitiveFieldValue;
}

/**
 * Conditions can be atomic or composed. Composite conditions are useful for
 * nested contract rules such as: “enable e-mail notices AND do not reuse the
 * party e-mail addresses”.
 */
export type ConditionDefinition =
  | AtomicConditionDefinition
  | { all: ConditionDefinition[] }
  | { any: ConditionDefinition[] }
  | { not: ConditionDefinition };

export interface RepeaterColumnDefinition {
  key: string;
  labelAr: string;
  type: Exclude<WizardFieldType, "repeater" | "attachment">;
  required?: boolean;
  /** For repeater rows: condition is evaluated against the current row values. */
  requiredWhen?: ConditionDefinition;
  /** For repeater rows: controls whether the column is visible for the current row. */
  visibleWhen?: ConditionDefinition;
  placeholder?: string;
  options?: FieldOptionDefinition[];
}

export interface WizardFieldDefinition {
  key: string;
  type: WizardFieldType;
  labelAr: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  /** Becomes required only when the condition is true. The field may still be visible while optional. */
  requiredWhen?: ConditionDefinition;
  /** Controls whether the field is visible in the wizard and document data section. */
  visibleWhen?: ConditionDefinition;
  /** UI/control-only fields can opt out of the generated contract data table. */
  printInDocument?: boolean;
  /** For blank manual annexes, print an unticked box beside a free-text line. */
  manualCheckbox?: boolean;
  options?: FieldOptionDefinition[];
  validation?: FieldValidationDefinition;
  columns?: RepeaterColumnDefinition[];
  minRows?: number;
  /** Number of blank rows to print for a manual-fill annex repeater. */
  blankRows?: number;
  /** Optional fixed labels for the first column of manual-fill annex rows. */
  blankRowLabels?: string[];
}

export interface WizardStepDefinition {
  key: string;
  titleAr: string;
  articleRange?: string;
  description?: string;
  fields: WizardFieldDefinition[];
  visibleWhen?: ConditionDefinition;
  sourceClauseKey?: string;
}

export interface ContractVariantDefinition {
  key: string;
  nameAr: string;
  description?: string;
  documentTitleAr?: string;
  sourceDocumentName?: string;
  steps: WizardStepDefinition[];
  requiredClauseKeys: string[];
  allowedOptionalClauseKeys: string[];
  /** Annexes that are part of the contract by definition and are always issued; the user cannot remove them. */
  requiredAnnexKeys?: string[];
  defaultFieldValues?: Record<string, ContractFieldValue>;
}

export interface OptionalClauseDefinition {
  key: string;
  nameAr: string;
  description: string;
  documentTitleAr?: string;
  sourceDocumentName?: string;
  outputMode?: "inline" | "separate_annex";
  /** When true the annex is selected in the wizard but its fields are printed blank for manual completion after printing. */
  manualFillAnnex?: boolean;
  /** Makes an otherwise optional annex mandatory when the supplied draft condition becomes true. */
  requiredWhen?: ConditionDefinition;
  applicableVariantKeys: string[];
  insertedSteps: WizardStepDefinition[];
  insertBeforeStepKey: string;
  legalClauseKeys: string[];
  defaultFieldValues?: Record<string, ContractFieldValue>;
}


export interface LegalClauseDefinition {
  key: string;
  titleAr: string;
  bodyAr: string;
  variables?: string[];
  enabled?: boolean;
  visibleWhen?: ConditionDefinition;
  sourceDocumentName?: string;
  sourcePageStart?: number;
  sourcePageEnd?: number;
}

export interface ContractTemplateDefinition {
  slug: ContractSlug;
  version: number;
  nameAr: string;
  description: string;
  /** @deprecated Family-level pricing is disabled; use variantPricing per contract variant. */
  priceEgp: number;
  variantPricing?: Record<string, { selfServicePriceEgp: number; lawyerAssistedPriceEgp: number }>;
  variants: ContractVariantDefinition[];
  optionalClauses: OptionalClauseDefinition[];
  legalClauses?: LegalClauseDefinition[];
}

export interface ContractDraftData {
  templateSlug: ContractSlug;
  templateVersion: number;
  backendContractId?: number;
  backendVersionId?: number;
  serialNumber?: string;
  variantKey: string | null;
  selectedOptionalClauseKeys: string[];
  fieldValues: Record<string, ContractFieldValue>;
  touchedFieldKeys?: string[];
  attachmentRefs: Record<string, string[]>;
  currentStepKey: string;
  creationMode: CreationMode;
  coreIdentityLocked: boolean;
  updatedAt: string;
}

export interface ResolvedWizardDefinition {
  template: ContractTemplateDefinition;
  variant: ContractVariantDefinition;
  steps: WizardStepDefinition[];
  activeClauseKeys: string[];
}
