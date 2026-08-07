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

export interface ConditionDefinition {
  fieldKey: string;
  operator: ConditionOperator;
  value?: PrimitiveFieldValue;
}

export interface RepeaterColumnDefinition {
  key: string;
  labelAr: string;
  type: Exclude<WizardFieldType, "repeater" | "attachment">;
  required?: boolean;
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
  options?: FieldOptionDefinition[];
  validation?: FieldValidationDefinition;
  visibleWhen?: ConditionDefinition;
  columns?: RepeaterColumnDefinition[];
  minRows?: number;
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
  defaultFieldValues?: Record<string, ContractFieldValue>;
}

export interface OptionalClauseDefinition {
  key: string;
  nameAr: string;
  description: string;
  documentTitleAr?: string;
  sourceDocumentName?: string;
  outputMode?: "inline" | "separate_annex";
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
  priceEgp: number;
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
