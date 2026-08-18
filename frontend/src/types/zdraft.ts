export type { CreationMode, ContractSlug } from '@zdraft/template-engine';
import type { CreationMode, ContractSlug } from '@zdraft/template-engine';

export type FieldValue = string | number | boolean | null | string[];

export interface User {
  id: number;
  pubgId: string; // e.g. "58291047"
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'lawyer' | 'admin' | 'super_admin';
  createdAt: string;
}

export interface ContractTemplate {
  id: number;
  name: string;
  nameAr: string;
  slug: ContractSlug;
  description: string;
  priceEgp: number;
  icon: string;
  sections: ContractSection[];
}

export interface ContractSection {
  id: number;
  templateId: number;
  title: string;
  titleAr: string;
  order: number;
  fields: ContractField[];
}

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'date';

export interface ContractField {
  id: number;
  sectionId: number;
  fieldName: string;
  label: string;
  placeholder: string;
  type: FieldType;
  required: boolean;
  validationRule: string;
  helpDescription?: string;
  options?: string[]; // for select fields
  isCoreIdentityField: boolean; // Immutable after creation
}

export interface ContractDraft {
  id: number;
  serialNumber: string;
  templateSlug: ContractSlug;
  creationMode: CreationMode;
  status: 'draft' | 'pending_payment_verification' | 'pending_lawyer_drafting' | 'paid' | 'issued';
  fieldValues: Record<string, FieldValue>;
  coreDataLocked: boolean; // True once initialized
  priceEgp: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  previewUrl?: string;
  compressed: boolean;
}

export interface VodafoneCashPayment {
  id: number;
  serialNumber: string;
  amountEgp: number;
  senderPhone?: string;
  paymentProofImageUrl: string;
  status: 'pending_verification' | 'approved' | 'rejected';
  createdAt: string;
}

export interface SharedCollaboration {
  id: number;
  pubgId: string;
  targetUserNameMasked: string;
  permissionLevel: 'view_download' | 'edit';
}

