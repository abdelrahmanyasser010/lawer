export interface AuthUser {
  id: number;
  publicId: string;
  name: string;
  email: string;
  accountType: "individual" | "business";
  emailVerified: boolean;
  status: "active" | "invited" | "suspended";
  roles: string[];
  permissions: string[];
}

export interface CustomerProfile {
  id: number;
  publicId: string;
  name: string;
  email: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  accountType: "individual" | "business";
  companyName?: string | null;
  emailVerifiedAt?: string | null;
  createdAt: string;
}

export interface ContractSummary {
  id: number;
  serialNumber: string;
  title?: string;
  status: string;
  sourceChannel: "customer" | "office";
  variantKey?: string;
  updatedAt: string;
  templateSlug: string;
  templateNameAr: string;
}

export interface ContractDetails {
  id: number;
  serial_number: string;
  title?: string;
  status: string;
  creation_mode: string;
  source_channel: string;
  template_slug: string;
  template_name_ar: string;
  variant_key: string;
  version_number?: number;
  current_version_id?: number;
  template_version?: number;
  current_step_key?: string;
  attachment_refs_json?: Record<string, string[]>;
  field_values_json: Record<string, string | number | boolean | null>;
  touched_field_keys_json?: string[];
  selected_optional_clause_keys: string[];
  core_identity_locked: boolean;
  edit_expires_at?: string | null;
  pdf_status?: string;
  pdf_path?: string | null;
  original_price_egp?: number | string;
  payment_status?: string | null;
  payment_amount_egp?: number | string | null;
  payment_admin_notes?: string | null;
  payment_serial_number?: string | null;
  versions: Array<{
    id: number;
    versionNumber: number;
    status: string;
    createdAt: string;
    lockedAt?: string | null;
    documentHash?: string | null;
    pdfPath?: string | null;
  }>;
  coreIdentityFieldKeys: string[];
  fieldMetadata: Record<string, {
    labelAr: string;
    type: string;
    options: Array<{ value: string; labelAr: string }>;
  }>;
  editWindow: {
    active: boolean;
    expired: boolean;
    remainingSeconds: number;
    expiresAt?: string | null;
  };
  permissions: {
    canEdit: boolean;
    canEditCoreIdentity: boolean;
    canFinalize: boolean;
    canRequestRevision: boolean;
    canShare: boolean;
    canDownloadPdf: boolean;
  };
}


export interface ContractDocumentFile {
  id: number;
  fileKey: string;
  documentType: "main" | "annex";
  optionalClauseKey?: string | null;
  titleAr: string;
  fileSizeBytes: number;
  sha256: string;
  createdAt: string;
}

export type CommunicationChannel = "zoom" | "whatsapp";

export interface ServiceRequestSummary {
  id: number;
  serialNumber: string;
  requestType: "contract_drafting" | "contract_review" | "consultation";
  title: string;
  status: string;
  priority: string;
  communicationChannel?: CommunicationChannel | null;
  preferredContactAt?: string | null;
  preferredContactPeriodLabel?: string | null;
  bookingExpiresAt?: string | null;
  bookingStatus?: string | null;
  meetingAt?: string | null;
  meetingProvider?: CommunicationChannel | null;
  meetingUrl?: string | null;
  linkedContractId?: number | null;
  assignedLawyerName?: string | null;
  deliverablesCount: number;
  lastUpdate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequestDetails {
  id: number;
  serialNumber: string;
  requestType: ServiceRequestSummary["requestType"];
  title: string;
  description: string;
  templateSlug?: string | null;
  variantKey?: string | null;
  expectedPaymentEgp?: number;
  lawyerTotalPriceEgp?: number | null;
  lawyerDepositEgp?: number | null;
  lawyerRemainingEgp?: number | null;
  approvedPaidEgp?: number;
  outstandingEgp?: number;
  paymentStage?: "deposit" | "working" | "balance" | "paid" | "single" | null;
  status: string;
  priority: string;
  communicationChannel?: CommunicationChannel | null;
  preferredContactAt?: string | null;
  preferredContactPeriodLabel?: string | null;
  bookingExpiresAt?: string | null;
  bookingStatus?: string | null;
  meetingAt?: string | null;
  meetingProvider?: CommunicationChannel | null;
  meetingUrl?: string | null;
  meetingLocation?: string | null;
  assignedLawyerName?: string | null;
  linkedContractId?: number | null;
  linkedContractSerial?: string | null;
  linkedContractTitle?: string | null;
  paymentStatus?: string | null;
  paymentAmountEgp?: number | null;
  paymentAdminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  events: Array<{ id: number; eventType: string; notes?: string | null; payload?: Record<string, unknown>; createdAt: string }>;
  attachments: Array<{ id: number; fileName: string; fileType: string; sizeBytes: number; createdAt: string }>;
  deliverables: Array<{
    id: number;
    type: string;
    versionNumber: number;
    title: string;
    notes?: string | null;
    isFinal: boolean;
    publishedAt: string;
    attachmentId: number;
    fileName: string;
    fileType: string;
    sizeBytes: number;
  }>;
  permissions: {
    canUploadFiles: boolean;
    canRequestRevision: boolean;
    canConfirmReceipt: boolean;
  };
}

export interface CustomerNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface PublicCatalog {
  templates: Array<{
    id: number;
    slug: string;
    nameAr: string;
    description: string;
    priceEgp: number;
    version: number;
    variants: Array<{
      key: string;
      nameAr: string;
      description: string;
      documentTitleAr?: string;
      selfServicePriceEgp: number;
      lawyerAssistedPriceEgp: number;
      lawyerDepositEgp: number;
    }>;
  }>;
  services: {
    contractReviewDepositEgp: number;
    consultationDepositEgp: number;
    consultationFeeEgp: number;
    contractDraftingDepositEgp: number;
  };
  office: {
    displayName: string;
    address: string;
    whatsappNumber: string;
    consultationWhatsappNumber: string;
    supportWhatsappNumber: string;
    supportPhone: string;
    supportEmail: string;
  };
  payment: {
    vodafoneCashNumber: string;
  };
  policies: {
    selfServiceEditHours: number;
    communicationChannels: string[];
    chatEnabled: boolean;
  };
}
