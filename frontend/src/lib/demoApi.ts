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
  SavedParty,
  CustomerDashboard,
  LegalContentDocument,
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
        selfServiceEnabled: true,
        lawyerDraftingEnabled: true,
        tags: [],
        suitability: {
          shortDescription: variant.description ?? "",
          suitableFor: [],
          notSuitableFor: [],
        },
        lawyerDrafting: { helpfulDocuments: [] },
        lawyerReviewAddOn: { enabled: true, priceEgp: 100 },
      };
    }),
  }));

const catalog: PublicCatalog = {
  templates: catalogTemplates,
  services: {
    contractReviewFeeEgp: 300,
    contractReviewDepositEgp: 100,
    contractDraftingDepositEgp: 100,
  },
  office: {
    displayName: "Z draft",
    address: "بيانات تجريبية",
    whatsappNumber: "201000000000",
    reviewWhatsappNumber: "201000000000",
    supportWhatsappNumber: "201000000000",
    supportPhone: "01000000000",
    supportEmail: "zlegaleg@gmail.com",
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
  reusableData: {
    fullName: demoUser.name,
    name: demoUser.name,
    phone: "01000000000",
    email: demoUser.email,
    nationality: "مصري",
    partyType: "individual"
  },
};

const contractSummaries: ContractSummary[] = [
  {
    id: 101,
    serialNumber: "SCP-2026-APT-000101",
    title: "عقد بيع شقة سكنية",
    status: "pending_payment",
    paymentStatus: null,
    paymentAmountEgp: 139,
    sourceChannel: "customer",
    variantKey: "preliminary_sale",
    updatedAt: iso(-2),
    templateSlug: "apartment_sale",
    templateNameAr: "عقد بيع وحدة سكنية",
    customerFacingStatus: "مطلوب الدفع لإصدار العقد",
    requiresCustomerAction: true,
    nextCustomerAction: { type: "pay", label: "ادفع دلوقتي", actionUrl: "/contract/101" },
    deliveryStatus: "not_ready",
  },
  {
    id: 102,
    serialNumber: "SCP-2026-RNT-000102",
    title: "عقد إيجار شقة سكنية",
    status: "client_review",
    paymentStatus: "approved",
    paymentAmountEgp: 59,
    sourceChannel: "customer",
    variantKey: "residential_lease",
    updatedAt: iso(-8),
    templateSlug: "rental",
    templateNameAr: "عقد إيجار سكني أو تجاري",
    customerFacingStatus: "العقد جاهز لمراجعتك",
    requiresCustomerAction: true,
    nextCustomerAction: { type: "review", label: "راجع العقد", actionUrl: "/contract/102" },
    deliveryStatus: "ready",
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
    lawyer_review_add_on: isRental ? {
      enabled: true,
      priceEgp: 100,
      status: "completed",
      customerFacingStatus: "مراجعة المحامي خلصت — راجع النسخة قبل الإصدار",
      assignedLawyer: { id: 25, displayName: "أ/ كريم عادل", specialization: "مراجعة العقود" },
      customerNote: "راجع بند مدة الإيجار.",
    } : null,
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
    requestPurpose: "review",
    contractTypeText: "عقد إيجار محل تجاري",
    title: "مراجعة عقد — إيجار محل تجاري",
    status: "awaiting_payment",
    priority: "normal",
    paymentStatus: null,
    paymentAmountEgp: 100,
    paymentStage: "deposit",
    communicationChannel: "whatsapp",
    preferredContactAt: iso(24),
    meetingAt: null,
    meetingProvider: "whatsapp",
    meetingUrl: null,
    linkedContractId: null,
    assignedLawyerName: "أ/ محمد علي",
    assignedLawyer: { id: 21, displayName: "أ/ محمد علي", specialization: "عقود ومعاملات" },
    deliverablesCount: 0,
    lastUpdate: iso(-1),
    createdAt: iso(-6),
    updatedAt: iso(-1),
    customerFacingStatus: "مطلوب سداد الدفعة الأولى",
    requiresCustomerAction: true,
    nextCustomerAction: { type: "pay", label: "ادفع دلوقتي", actionUrl: "/requests/501" },
    deliveryStatus: "not_ready",
  },
  {
    id: 502,
    serialNumber: "REQ-2026-00002",
    requestType: "contract_drafting",
    title: "صياغة عقد شراكة",
    status: "client_review",
    priority: "normal",
    paymentStatus: "partially_paid",
    paymentAmountEgp: 1200,
    paymentStage: "working",
    communicationChannel: "whatsapp",
    linkedContractId: null,
    assignedLawyerName: "أ/ سارة محمود",
    assignedLawyer: { id: 22, displayName: "أ/ سارة محمود", specialization: "عقود الشركات" },
    deliverablesCount: 1,
    lastUpdate: iso(-4),
    createdAt: iso(-72),
    updatedAt: iso(-4),
    customerFacingStatus: "مسودة العقد جاهزة لمراجعتك",
    requiresCustomerAction: true,
    nextCustomerAction: { type: "review_draft", label: "راجع المسودة", actionUrl: "/requests/502#deliverables" },
    deliveryStatus: "ready",
  },
];

function requestDetails(id: string): ServiceRequestDetails {
  const drafting = id === "502";
  if (drafting) {
    return {
      id: 502,
      serialNumber: "REQ-2026-00002",
      requestType: "contract_drafting",
      title: "صياغة عقد شراكة",
      description: "محتاج عقد شراكة بين شخصين لتأسيس نشاط تجاري جديد.",
      templateSlug: "freelancer",
      variantKey: "website_development",
      lawyerTotalPriceEgp: 3000,
      lawyerDepositEgp: 1200,
      lawyerRemainingEgp: 1800,
      approvedPaidEgp: 1200,
      outstandingEgp: 1800,
      paymentStage: "working",
      status: "client_review",
      priority: "normal",
      communicationChannel: "whatsapp",
      assignedLawyerName: "أ/ سارة محمود",
      assignedLawyer: { id: 22, displayName: "أ/ سارة محمود", specialization: "عقود الشركات" },
      paymentStatus: "partially_paid",
      paymentAmountEgp: 1200,
      customerFacingStatus: "مسودة العقد جاهزة لمراجعتك",
      requiresCustomerAction: true,
      nextCustomerAction: { type: "review_draft", label: "راجع المسودة", actionUrl: "/requests/502#deliverables" },
      deliveryStatus: "ready",
      currentDeliverable: { id: 901, type: "draft", versionNumber: 2, title: "مسودة عقد الشراكة", fileName: "partnership-draft-v2.pdf", fileType: "application/pdf", publishedAt: iso(-4) },
      createdAt: iso(-72),
      updatedAt: iso(-4),
      events: [
        { id: 11, eventType: "request_created", notes: "تم استلام طلبك", createdAt: iso(-72) },
        { id: 12, eventType: "payment_confirmed", notes: "تم تأكيد الدفعة الأولى", createdAt: iso(-70) },
        { id: 13, eventType: "lawyer_assigned", notes: "تم تعيين المحامي المسؤول", createdAt: iso(-68) },
        { id: 14, eventType: "draft_ready", notes: "مسودة العقد جاهزة لمراجعتك", createdAt: iso(-4) },
      ],
      attachments: [],
      deliverables: [{ id: 901, type: "draft", versionNumber: 2, title: "مسودة عقد الشراكة", notes: "آخر نسخة بعد التواصل على WhatsApp", isFinal: false, publishedAt: iso(-4), attachmentId: 9901, fileName: "partnership-draft-v2.pdf", fileType: "application/pdf", sizeBytes: 228000 }],
      permissions: { canUploadFiles: false, canRequestRevision: false, canConfirmReceipt: false },
    };
  }
  return {
    id: Number(id) || 501,
    serialNumber: "REQ-2026-00001",
    requestType: "contract_review",
    requestPurpose: "review",
    contractTypeText: "عقد إيجار محل تجاري",
    title: "مراجعة عقد — إيجار محل تجاري",
    description: "عايز المحامي يركز على مدة التجديد وشروط الإنهاء.",
    serviceTotalPriceEgp: 300,
    serviceDepositEgp: 100,
    serviceRemainingEgp: 200,
    approvedPaidEgp: 0,
    outstandingEgp: 300,
    paymentStage: "deposit",
    status: "awaiting_payment",
    priority: "normal",
    communicationChannel: "whatsapp",
    preferredContactAt: iso(24),
    meetingAt: null,
    meetingProvider: "whatsapp",
    meetingUrl: null,
    meetingLocation: null,
    assignedLawyerName: "أ/ محمد علي",
    assignedLawyer: { id: 21, displayName: "أ/ محمد علي", specialization: "عقود ومعاملات" },
    linkedContractId: null,
    linkedContractSerial: null,
    linkedContractTitle: null,
    paymentStatus: "unpaid",
    paymentAmountEgp: 100,
    paymentAdminNotes: null,
    customerFacingStatus: "مطلوب سداد الدفعة الأولى",
    requiresCustomerAction: true,
    nextCustomerAction: { type: "pay", label: "ادفع دلوقتي", actionUrl: "/requests/501" },
    deliveryStatus: "not_ready",
    createdAt: iso(-6),
    updatedAt: iso(-1),
    events: [
      { id: 1, eventType: "request_created", notes: "تم استلام طلبك", createdAt: iso(-6) },
      { id: 2, eventType: "lawyer_assigned", notes: "تم تعيين المحامي المسؤول", createdAt: iso(-5) },
    ],
    attachments: [{ id: 7010, fileName: "lease-contract.pdf", fileType: "application/pdf", sizeBytes: 212000, createdAt: iso(-6) }],
    deliverables: [],
    permissions: { canUploadFiles: false, canRequestRevision: false, canConfirmReceipt: false },
  };
}

const notifications: CustomerNotification[] = [
  { id: 1, type: "payment", title: "مطلوب سداد دفعة", message: "عندك دفعة مطلوبة علشان نكمل الطلب.", actionUrl: "/requests/501", importance: "important", readAt: null, createdAt: iso(-2) },
  { id: 2, type: "contract", title: "العقد جاهز لمراجعتك", message: "راجع النسخة الحالية قبل الإصدار النهائي.", actionUrl: "/contract/102", importance: "important", readAt: iso(-1), createdAt: iso(-12) },
  { id: 3, type: "service", title: "مسودة العقد جاهزة", message: "المحامي رفع آخر مسودة لعقد الشراكة.", actionUrl: "/requests/502#deliverables", importance: "normal", readAt: null, createdAt: iso(-4) },
];


const savedParties: SavedParty[] = [
  {
    id: 31,
    displayName: "علي حسن",
    partyKind: "individual",
    data: { name: "علي حسن", fullName: "علي حسن", nationalId: "29801011234567", nationality: "مصري", address: "مدينة نصر، القاهرة", phone: "01011112222", email: "ali@example.com", partyType: "individual" },
    sourceContractId: 102,
    sourceContractTitle: "عقد إيجار شقة سكنية",
    lastUsedAt: iso(-8),
    createdAt: iso(-240),
    updatedAt: iso(-8),
  },
  {
    id: 32,
    displayName: "شركة النور للتجارة",
    partyKind: "organization",
    data: { companyName: "شركة النور للتجارة", name: "شركة النور للتجارة", address: "التجمع الخامس، القاهرة", phone: "0222222222", email: "info@alnour.example", commercialRegister: "123456", taxNumber: "987654321", partyType: "company" },
    sourceContractId: 88,
    sourceContractTitle: "عقد تقديم خدمات",
    lastUsedAt: iso(-720),
    createdAt: iso(-1400),
    updatedAt: iso(-720),
  },
];

const legalContent: Record<string, LegalContentDocument> = {
  about_us: { key: "about_us", title: "من نحن", body: "Z Draft منصة تساعدك على إعداد ومتابعة معاملاتك التعاقدية بصورة أسهل، مع إمكانية الاستعانة بمحامٍ عند الحاجة.", publishedVersion: 1, publishedAt: iso(-720) },
  terms_and_conditions: { key: "terms_and_conditions", title: "الشروط والأحكام", body: "باستخدام المنصة أنت تقر بصحة البيانات التي تقدمها وتفهم نطاق الخدمة المختارة. تفاصيل الخدمات والأسعار تظهر لك قبل الدفع.", publishedVersion: 3, publishedAt: iso(-168) },
  privacy_policy: { key: "privacy_policy", title: "سياسة الخصوصية", body: "نستخدم بياناتك لتقديم الخدمة وإدارة العقود والطلبات المرتبطة بحسابك، مع تطبيق صلاحيات وصول مناسبة للملفات والطلبات.", publishedVersion: 2, publishedAt: iso(-240) },
  refund_cancellation_policy: { key: "refund_cancellation_policy", title: "سياسة الإلغاء والاسترداد", body: "يمكن إلغاء الطلب غير المدفوع بسهولة. بعد الدفع، يتم التعامل مع الإلغاء والاسترداد وفق حالة تنفيذ الخدمة وسياسة المنصة، ويظهر لك وضع أي استرداد بوضوح.", publishedVersion: 1, publishedAt: iso(-96) },
};

function customerDashboard(): CustomerDashboard {
  const requiredActions = [
    ...contractSummaries.filter((x) => x.requiresCustomerAction && x.nextCustomerAction).map((x) => ({ id: `contract-${x.id}`, sourceType: "contract" as const, sourceId: x.id, title: x.title || x.templateNameAr, status: x.customerFacingStatus || x.status, action: x.nextCustomerAction! })),
    ...requests.filter((x) => x.requiresCustomerAction && x.nextCustomerAction).map((x) => ({ id: `request-${x.id}`, sourceType: "service_request" as const, sourceId: x.id, title: x.title, status: x.customerFacingStatus || x.status, action: x.nextCustomerAction! })),
  ];
  return { requiredActions, recentContracts: contractSummaries.slice(0, 3), recentServiceRequests: requests.slice(0, 3) };
}

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
  if (pathname === "/api/v1/saved-parties") return savedParties as T;
  if (pathname.match(/^\/api\/v1\/saved-parties\/\d+$/)) {
    const id = Number(pathname.split("/").pop());
    if (method === "DELETE") return { deleted: true } as T;
    const item = savedParties.find((x) => x.id === id) || savedParties[0];
    return (method === "PATCH" ? { ...item, ...(bodyObject(init.body) as object) } : item) as T;
  }
  if (pathname === "/api/v1/customer/dashboard") return customerDashboard() as T;
  if (pathname.startsWith("/api/v1/public/legal-content/")) {
    const key = decodeURIComponent(pathname.split("/").pop() || "terms_and_conditions");
    return (legalContent[key] || legalContent.terms_and_conditions) as T;
  }
  if (pathname === "/api/v1/legal-acceptances") return { accepted: true } as T;
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
  if (pathname === "/api/v1/payments/checkout") return { paymentAttemptId: `demo-${Date.now()}`, status: "paid", redirectRequired: false, transactionReference: "DEMO-PAY-2026-001" } as T;
  if (pathname.match(/^\/api\/v1\/payments\/attempts\/[^/]+$/)) return { status: "paid", transactionReference: "DEMO-PAY-2026-001" } as T;
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
