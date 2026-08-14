import { localTemplateRegistry } from "@zdraft/template-engine";
import type {
  AuthUser,
  ContractDetails,
  ContractDocumentFile,
  ContractSummary,
  CustomerNotification,
  CustomerProfile,
  PublicCatalog,
  ServiceRequestDetails,
  ServiceRequestSummary,
} from "@/types/customer";

export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";


const demoVariantPricing: Record<string, Record<string, { selfServicePriceEgp: number; lawyerAssistedPriceEgp: number }>> = {
  rental: {
    residential_lease: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 499 },
    commercial_lease: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 599 },
    administrative_lease: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 549 },
  },
  apartment_sale: {
    preliminary_sale: { selfServicePriceEgp: 139, lawyerAssistedPriceEgp: 899 },
    registrable_sale: { selfServicePriceEgp: 139, lawyerAssistedPriceEgp: 999 },
    inherited_sale: { selfServicePriceEgp: 139, lawyerAssistedPriceEgp: 1099 },
  },
  freelancer: {
    visual_identity_design: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 599 },
    website_development: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 799 },
    social_media_management: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 699 },
  },
};

function demoDefinition<T extends { slug: string; variants: Array<{ key: string }> }>(definition: T) {
  return { ...definition, priceEgp: 0, variantPricing: demoVariantPricing[definition.slug] ?? {} };
}

const now = new Date();
const iso = (offsetHours = 0) => new Date(now.getTime() + offsetHours * 60 * 60 * 1000).toISOString();

const demoUser: AuthUser = {
  id: 1,
  publicId: "58291047",
  name: "أحمد محمد حسن",
  email: "client.demo@zdraft.local",
  accountType: "individual",
  emailVerified: true,
  status: "active",
  roles: ["customer"],
  permissions: [],
};

const catalogTemplates = Object.values(localTemplateRegistry)
  .filter((definition) => definition.variants.length > 0)
  .map((definition, index) => ({
    id: index + 1,
    slug: definition.slug,
    nameAr: definition.nameAr,
    description: definition.description,
    priceEgp: 0,
    version: definition.version,
    variants: definition.variants.map((variant) => {
      const pricing = demoVariantPricing[definition.slug]?.[variant.key] ?? { selfServicePriceEgp: 0, lawyerAssistedPriceEgp: 0 };
      return {
        key: variant.key,
        nameAr: variant.nameAr,
        description: variant.description ?? "",
        documentTitleAr: variant.documentTitleAr,
        selfServicePriceEgp: pricing.selfServicePriceEgp,
        lawyerAssistedPriceEgp: pricing.lawyerAssistedPriceEgp,
        lawyerDepositEgp: 100,
      };
    }),
  }));

const catalog: PublicCatalog = {
  templates: catalogTemplates,
  services: {
    contractReviewDepositEgp: 100,
    consultationDepositEgp: 100,
    consultationFeeEgp: 100,
    contractDraftingDepositEgp: 100,
  },
  office: {
    displayName: "Z draft",
    address: "بيانات تجريبية",
    whatsappNumber: "201000000000",
    consultationWhatsappNumber: "201000000000",
    supportWhatsappNumber: "201000000000",
    supportPhone: "01000000000",
    supportEmail: "zlegaleg@gmail.com",
  },
  payment: {
    vodafoneCashNumber: "01000000000",
  },
  policies: {
    selfServiceEditHours: 24,
    communicationChannels: ["zoom", "whatsapp"],
    chatEnabled: false,
  },
};

const demoProfile: CustomerProfile = {
  id: demoUser.id,
  publicId: demoUser.publicId,
  name: demoUser.name,
  email: demoUser.email,
  phone: "01000000000",
  whatsappNumber: "01000000000",
  accountType: "individual",
  companyName: null,
  emailVerifiedAt: iso(-240),
  createdAt: iso(-360),
};

const contractSummaries: ContractSummary[] = [
  {
    id: 101,
    serialNumber: "SCP-2026-APT-000101",
    title: "عقد بيع شقة سكنية",
    status: "pending_payment",
    sourceChannel: "customer",
    variantKey: "residential_apartment_sale",
    updatedAt: iso(-2),
    templateSlug: "apartment_sale",
    templateNameAr: "عقد بيع وحدة سكنية",
  },
  {
    id: 102,
    serialNumber: "SCP-2026-RNT-000102",
    title: "عقد إيجار شقة سكنية",
    status: "client_review",
    sourceChannel: "customer",
    variantKey: "residential_lease",
    updatedAt: iso(-8),
    templateSlug: "rental",
    templateNameAr: "عقد إيجار سكني أو تجاري",
  },
];

function contractDetails(id: string): ContractDetails {
  const isRental = id === "102";
  return {
    id: Number(id) || 101,
    serial_number: isRental ? "SCP-2026-RNT-000102" : "SCP-2026-APT-000101",
    title: isRental ? "عقد إيجار شقة سكنية" : "عقد بيع شقة سكنية",
    status: isRental ? "client_review" : "pending_payment",
    creation_mode: "self_service",
    source_channel: "customer",
    template_slug: isRental ? "rental" : "apartment_sale",
    template_name_ar: isRental ? "عقد إيجار سكني أو تجاري" : "عقد بيع وحدة سكنية",
    variant_key: isRental ? "residential_lease" : "preliminary_sale",
    version_number: 1,
    current_version_id: 1001,
    template_version: 1,
    current_step_key: "",
    attachment_refs_json: {},
    field_values_json: isRental
      ? {
          landlord_name: "أحمد محمد حسن",
          tenant_name: "علي حسن",
          property_governorate: "القاهرة",
          property_city: "مدينة نصر",
          property_street: "شارع 9",
          rent_monthly_amount: 5000,
          deposit_amount: 10000,
        }
      : {
          sale_seller_party_type: "individual",
          sale_seller_name: "أحمد محمد حسن",
          sale_buyer_party_type: "individual",
          sale_buyer_name: "علي حسن",
          sale_unit_governorate: "القاهرة",
          sale_unit_city: "مدينة نصر",
          sale_total_price: 3500000,
          sale_payment_plan: "full",
        },
    selected_optional_clause_keys: [],
    core_identity_locked: false,
    edit_expires_at: isRental ? iso(20) : null,
    pdf_status: isRental ? "ready" : "queued",
    pdf_path: null,
    original_price_egp: 139,
    payment_status: isRental ? "approved" : null,
    payment_amount_egp: 139,
    payment_admin_notes: null,
    payment_serial_number: isRental ? "PAY-2026-00077" : null,
    versions: [
      { id: 1001, versionNumber: 1, status: isRental ? "client_review" : "draft", createdAt: iso(-10), lockedAt: null, documentHash: null, pdfPath: null },
    ],
    coreIdentityFieldKeys: [],
    fieldMetadata: {},
    editWindow: {
      active: isRental,
      expired: false,
      remainingSeconds: isRental ? 20 * 3600 : 0,
      expiresAt: isRental ? iso(20) : null,
    },
    permissions: {
      canEdit: true,
      canEditCoreIdentity: false,
      canFinalize: isRental,
      canRequestRevision: false,
      canShare: isRental,
      canDownloadPdf: isRental,
    },
  };
}

const requests: ServiceRequestSummary[] = [
  {
    id: 501,
    serialNumber: "REQ-2026-00001",
    requestType: "contract_review",
    title: "مراجعة عقد إيجار قبل التوقيع",
    status: "awaiting_payment",
    priority: "normal",
    communicationChannel: "whatsapp",
    preferredContactAt: iso(24),
    meetingAt: null,
    meetingProvider: "whatsapp",
    meetingUrl: null,
    linkedContractId: null,
    assignedLawyerName: null,
    deliverablesCount: 0,
    lastUpdate: iso(-1),
    createdAt: iso(-6),
    updatedAt: iso(-1),
  },
];

function requestDetails(id: string): ServiceRequestDetails {
  return {
    id: Number(id) || 501,
    serialNumber: "REQ-2026-00001",
    requestType: "contract_review",
    title: "مراجعة عقد إيجار قبل التوقيع",
    description: "طلب مراجعة وتدقيق قانوني لبنود عقد إيجار تجاري قبل التوقيع والاعتماد.",
    status: "awaiting_payment",
    priority: "normal",
    communicationChannel: "whatsapp",
    preferredContactAt: iso(24),
    meetingAt: null,
    meetingProvider: "whatsapp",
    meetingUrl: null,
    meetingLocation: null,
    assignedLawyerName: null,
    linkedContractId: null,
    linkedContractSerial: null,
    linkedContractTitle: null,
    paymentStatus: null,
    paymentAmountEgp: 100,
    paymentAdminNotes: null,
    createdAt: iso(-6),
    updatedAt: iso(-1),
    events: [
      { id: 1, eventType: "request_created", notes: "تم إنشاء الطلب التجريبي", createdAt: iso(-6) },
    ],
    attachments: [],
    deliverables: [],
    permissions: {
      canUploadFiles: true,
      canRequestRevision: false,
      canConfirmReceipt: false,
    },
  };
}

const notifications: CustomerNotification[] = [
  { id: 1, type: "payment", title: "إثبات الدفع قيد المراجعة", message: "هذه رسالة ديمو توضح شكل إشعارات العميل.", actionUrl: "/contracts", readAt: null, createdAt: iso(-2) },
  { id: 2, type: "contract", title: "العقد جاهز للمراجعة", message: "يمكن للعميل مراجعة النسخة قبل الإصدار النهائي.", actionUrl: "/contract/102", readAt: iso(-1), createdAt: iso(-12) },
];

export async function demoApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 120));
  const url = new URL(path, "https://demo.local");
  const pathname = url.pathname;
  const method = (init.method || "GET").toUpperCase();

  if (pathname === "/api/v1/catalog") return catalog as T;
  if (pathname === "/api/v1/templates") return catalog.templates as T;
  if (pathname.startsWith("/api/v1/templates/") && pathname.endsWith("/definition")) {
    const slug = pathname.split("/")[4];
    return demoDefinition(localTemplateRegistry[slug]) as T;
  }
  if (pathname === "/api/v1/auth/login" || pathname === "/api/v1/auth/register" || pathname === "/api/v1/auth/me") {
    return { user: demoUser, verificationRequired: false } as T;
  }
  if (pathname.startsWith("/api/v1/auth/")) return { ok: true, verified: true, reset: true, changed: true } as T;
  if (pathname === "/api/v1/users/profile") return (method === "PATCH" ? { ...demoProfile, ...(bodyObject(init.body) as object) } : demoProfile) as T;
  if (pathname === "/api/v1/contracts/my") return contractSummaries as T;
  if (pathname.match(/^\/api\/v1\/contracts\/\d+$/)) return contractDetails(pathname.split("/").pop() || "101") as T;
  if (pathname.match(/^\/api\/v1\/contracts\/\d+\/documents$/)) return demoDocuments() as T;
  if (pathname === "/api/v1/contracts/draft" || pathname.match(/^\/api\/v1\/contracts\/\d+\/draft$/)) {
    return { id: 101, serialNumber: "SCP-2026-00001", status: "pending_payment", currentVersionId: 1001 } as T;
  }
  if (pathname.match(/^\/api\/v1\/contracts\/\d+\/finalize$/)) return { status: "issued" } as T;
  if (pathname.match(/^\/api\/v1\/contracts\/\d+\/shares$/)) {
    const origin = typeof window === "undefined" ? "https://customer-demo.vercel.app" : window.location.origin;
    return { shareUrl: `${origin}/shared/demo-share-token` } as T;
  }
  if (pathname === "/api/v1/service-requests/my") return requests as T;
  if (pathname.match(/^\/api\/v1\/service-requests\/\d+$/)) return requestDetails(pathname.split("/").pop() || "501") as T;
  if (pathname === "/api/v1/service-requests") return { id: 501, serialNumber: "REQ-2026-00001" } as T;
  if (pathname.startsWith("/api/v1/service-requests/")) return { ok: true } as T;
  if (pathname === "/api/v1/attachments") return { id: Math.floor(Math.random() * 10000), fileName: "document.pdf" } as T;
  if (pathname === "/api/v1/payments/receipts") return { id: 701, serialNumber: "PAY-2026-00001", status: "pending_verification" } as T;
  if (pathname === "/api/v1/payments/my") return [] as T;
  if (pathname === "/api/v1/notifications") return { items: notifications, unreadCount: notifications.filter((item) => !item.readAt).length } as T;
  if (pathname.startsWith("/api/v1/notifications/")) return { ok: true } as T;
  if (pathname.startsWith("/api/v1/contracts/shared/")) return sharedResponse(pathname, method) as T;

  return (method === "GET" ? [] : { ok: true }) as T;
}

function bodyObject(body: BodyInit | null | undefined): Record<string, unknown> {
  if (typeof body !== "string") return {};
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function demoDocuments(): ContractDocumentFile[] {
  return [
    {
      id: 1,
      fileKey: "doc-main",
      documentType: "main",
      optionalClauseKey: null,
      titleAr: "نسخة العقد المعتمدة (PDF)",
      fileSizeBytes: 184000,
      sha256: "doc",
      createdAt: iso(-1),
    },
  ];
}

function sharedResponse(pathname: string, method: string) {
  if (pathname.endsWith("/access")) {
    return {
      contractId: 102,
      contractTitle: "عقد إيجار شقة سكنية",
      serialNumber: "SCP-2026-RNT-000102",
      templateSlug: "rental",
      variantKey: "residential_lease",
      permission: "view_only",
      ownerName: "أحمد م***",
      expiresAt: iso(168),
      fieldValues: contractDetails("102").field_values_json,
      selectedOptionalClauseKeys: [],
      editableFieldKeys: [],
    };
  }
  if (method === "PATCH") return { ok: true };
  return {
    contractTitle: "عقد إيجار شقة سكنية",
    serialNumber: "SCP-2026-RNT-000102",
    templateSlug: "rental",
    permission: "view_only",
    ownerName: "أحمد م***",
    expiresAt: iso(168),
    requiresPublicId: false,
  };
}
