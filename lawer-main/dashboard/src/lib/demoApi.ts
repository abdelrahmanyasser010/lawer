import { createSampleFieldValues, localTemplateRegistry, type ContractTemplateDefinition } from "@zdraft/template-engine";
import type { DashboardUser } from "./apiClient";

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

function withDemoPricing<T extends { slug: string; variants: Array<{ key: string }> }>(definition: T) {
  return { ...definition, priceEgp: 0, variantPricing: demoVariantPricing[definition.slug] ?? {} };
}

const now = new Date();
const iso = (offsetHours = 0) => new Date(now.getTime() + offsetHours * 60 * 60 * 1000).toISOString();

const backendPermissions = [
  "dashboard.view",
  "requests.view_all",
  "requests.view_assigned",
  "requests.assign",
  "requests.manage",
  "contracts.view_all",
  "contracts.view_assigned",
  "contracts.create_office",
  "contracts.assign",
  "contracts.manage_status",
  "contracts.edit_legal",
  "contracts.waive_payment",
  "contracts.lock",
  "contracts.issue",
  "consultations.manage",
  "payments.review",
  "clients.view",
  "clients.manage",
  "templates.view",
  "templates.edit",
  "templates.publish",
  "templates.manage",
  "pricing.manage",
  "team.manage",
  "reports.view",
  "audit.view",
  "settings.manage",
  "attachments.view_all",
];

export const demoDashboardUser: DashboardUser = {
  id: 1,
  publicId: "STF-SUPERADMIN",
  name: "Z draft Super Admin",
  email: "admin.demo@zdraft.local",
  emailVerified: true,
  roles: ["super_admin"],
  permissions: backendPermissions,
  status: "active",
  passwordChangeRequired: false,
};

const templates = Object.values(localTemplateRegistry).map((definition, index) => ({
  id: index + 1,
  slug: definition.slug,
  nameAr: definition.nameAr,
  description: definition.description,
  priceEgp: 0,
  isActive: definition.variants.length > 0,
  variants: definition.variants.map((variant) => {
    const pricing = demoVariantPricing[definition.slug]?.[variant.key] ?? { selfServicePriceEgp: 0, lawyerAssistedPriceEgp: 0 };
    return { key: variant.key, nameAr: variant.nameAr, description: variant.description ?? "", ...pricing };
  }),
  currentPublishedVersionId: (index + 1) * 100,
  versions: [
    {
      id: (index + 1) * 100,
      versionNumber: definition.version,
      status: definition.variants.length > 0 ? "published" : "draft",
      changeSummary: "نسخة ديمو من القالب المحلي",
      legalReference: "Template engine shared package",
      createdAt: iso(-240),
      publishedAt: definition.variants.length > 0 ? iso(-120) : undefined,
    },
  ],
}));

const team = [
  { id: 1, publicId: "STF-SUPERADMIN", name: "Z draft Super Admin", email: "admin.demo@zdraft.local", phone: "01023817658", status: "active", staffStatus: "active", jobTitle: "مالك النظام", lastLoginAt: iso(-1), roles: ["super_admin"] },
  { id: 2, publicId: "STF-LAWYER", name: "أ. مريم سامي", email: "lawyer.demo@zdraft.local", phone: "01000000001", status: "active", staffStatus: "active", jobTitle: "محامية عقود", lastLoginAt: iso(-4), roles: ["lawyer"] },
  { id: 3, publicId: "STF-FINANCE", name: "أحمد المالية", email: "finance.demo@zdraft.local", phone: "01000000002", status: "active", staffStatus: "active", jobTitle: "مراجعة مدفوعات", lastLoginAt: iso(-6), roles: ["finance"] },
];

const roles = [
  { id: 1, roleKey: "super_admin", nameAr: "المشرف العام", permissions: backendPermissions.map((key) => ({ key, nameAr: key })) },
  { id: 2, roleKey: "lawyer", nameAr: "محامي", permissions: [] },
  { id: 3, roleKey: "finance", nameAr: "الحسابات", permissions: [] },
  { id: 4, roleKey: "operations", nameAr: "إدارة التشغيل", permissions: [] },
  { id: 5, roleKey: "support", nameAr: "خدمة العملاء", permissions: [] },
  { id: 6, roleKey: "template_manager", nameAr: "مسؤول القوالب", permissions: [] },
];

const contracts = [
  { id: 101, serialNumber: "SCP-2026-APT-000101", title: "عقد بيع شقة سكنية", templateSlug: "apartment_sale", templateNameAr: "عقد بيع وحدة سكنية", clientName: "أحمد محمد حسن", createdByName: "واجهة العميل", assignedLawyerName: "أ. مريم سامي", sourceChannel: "customer", billingMode: "client_invoice", status: "pending_review", currentVersionId: 1001, updatedAt: iso(-2) },
  { id: 102, serialNumber: "SCP-2026-RNT-000102", title: "عقد إيجار شقة سكنية", templateSlug: "rental", templateNameAr: "عقد إيجار سكني أو تجاري", clientName: "علي حسن", createdByName: "Z draft Super Admin", assignedLawyerName: "أ. مريم سامي", sourceChannel: "office", billingMode: "office_waiver", status: "client_review", currentVersionId: 1001, updatedAt: iso(-8) },
  { id: 103, serialNumber: "SCP-2026-SALE-000103", title: "عقد بيع بالتقسيط", templateSlug: "apartment_sale", templateNameAr: "عقد بيع وحدة سكنية", clientName: "شركة النيل", createdByName: "واجهة العميل", assignedLawyerName: "", sourceChannel: "customer", billingMode: "client_invoice", status: "pending_payment", currentVersionId: 1001, updatedAt: iso(-14) },
];

const requests = [
  { id: 501, serialNumber: "REQ-2026-DEMO01", requestType: "contract_drafting", title: "إعداد عقد بيع مع محامي", status: "awaiting_payment", priority: "normal", createdAt: iso(-6), dueAt: iso(18), clientName: "أحمد محمد حسن", clientPhone: "01023817658", assignedLawyerName: "أ. مريم سامي" },
  { id: 502, serialNumber: "CON-2026-DEMO02", requestType: "consultation", title: "استشارة حول عقد إيجار", status: "meeting_scheduled", priority: "high", createdAt: iso(-12), dueAt: iso(5), clientName: "علي حسن", clientPhone: "01011111111", assignedLawyerName: "أ. مريم سامي", meetingUrl: "https://zoom.us/j/demo" },
  { id: 503, serialNumber: "REV-2026-DEMO03", requestType: "contract_review", title: "مراجعة عقد قديم قبل التوقيع", status: "new", priority: "normal", createdAt: iso(-18), dueAt: iso(30), clientName: "منى محمود", clientPhone: "01022222222", assignedLawyerName: "" },
];

const payments = [
  { id: 701, clientId: 1, serialNumber: "PAY-2026-DEMO01", amountEgp: 139, status: "pending_verification", senderPhone: "01023817658", receiptAttachmentId: 9001, contractId: 101, serviceRequestId: null, createdAt: iso(-1), clientName: "أحمد محمد حسن", clientEmail: "client.demo@zdraft.local", clientPhone: "01023817658" },
  { id: 702, clientId: 2, serialNumber: "PAY-2026-DEMO02", amountEgp: 100, status: "approved", senderPhone: "01011111111", receiptAttachmentId: 9002, contractId: null, serviceRequestId: 502, createdAt: iso(-20), clientName: "علي حسن", clientEmail: "ali.demo@zdraft.local", clientPhone: "01011111111" },
];

const settings = [
  { key: "office.display_name", value: "Z draft", isSecret: false, updatedAt: iso(-24) },
  { key: "office.support_email", value: "support@zdraft.com", isSecret: false, updatedAt: iso(-24) },
  { key: "office.whatsapp_number", value: "201023817658", isSecret: false, updatedAt: iso(-24) },
  { key: "office.consultation_whatsapp_number", value: "201023817658", isSecret: false, updatedAt: iso(-24) },
  { key: "office.support_whatsapp_number", value: "201023817658", isSecret: false, updatedAt: iso(-24) },
  { key: "office.support_phone", value: "01023817658", isSecret: false, updatedAt: iso(-24) },
  { key: "payments.vodafone_cash_number", value: "01023817658", isSecret: false, updatedAt: iso(-24) },
  { key: "services.consultation.fee_egp", value: 300, isSecret: false, updatedAt: iso(-24) },
  { key: "services.contract_review.fee_egp", value: 300, isSecret: false, updatedAt: iso(-24) },
  { key: "services.contract_review.deposit_egp", value: 100, isSecret: false, updatedAt: iso(-24) },
  { key: "services.contract_drafting.deposit_egp", value: 100, isSecret: false, updatedAt: iso(-24) },
  { key: "contracts.require_email_verification", value: true, isSecret: false, updatedAt: iso(-24) },
  { key: "notifications.whatsapp_mode", value: "manual_wa_me", isSecret: false, updatedAt: iso(-24) },
  { key: "notifications.web_push_enabled", value: false, isSecret: false, updatedAt: iso(-24) },
];

export async function demoDashboardRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 120));
  const url = new URL(path, "https://demo.local");
  const pathname = url.pathname;
  const method = (init.method || "GET").toUpperCase();

  if (pathname === "/api/v1/auth/login" || pathname === "/api/v1/auth/me") return { user: demoDashboardUser } as T;
  if (pathname === "/api/v1/auth/logout") return null as T;
  if (pathname === "/api/v1/auth/sessions") return demoSessions() as T;
  if (pathname.startsWith("/api/v1/auth/")) return { ok: true, reset: true, changed: true, revoked: true } as T;

  if (pathname === "/api/v1/dashboard/summary") return summary() as T;
  if (pathname === "/api/v1/dashboard/work-queue") return requests as T;
  if (pathname === "/api/v1/admin/reports/overview") return demoReports(url.searchParams.get("period")) as T;
  if (pathname === "/api/v1/admin/reports/customer-export") return { rows: demoClients(url).map((client) => ({ ...client, approvedPaymentsEgp: client.id === 1 ? 249 : 0 })) } as T;
  if (pathname === "/api/v1/admin/payments") {
    const statusFiltered = filterByStatus(payments, url.searchParams.get("status"));
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const filtered = search ? statusFiltered.filter((payment) => `${payment.serialNumber} ${payment.clientName} ${payment.clientEmail} ${payment.contractId || ""} ${payment.serviceRequestId || ""}`.toLowerCase().includes(search)) : statusFiltered;
    if (url.searchParams.get("paginate") === "1") {
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const perPage = Math.max(20, Number(url.searchParams.get("perPage") || 50));
      const start = (page - 1) * perPage;
      return { items: filtered.slice(start, start + perPage), pagination: { page, perPage, total: filtered.length, pages: Math.max(1, Math.ceil(filtered.length / perPage)) } } as T;
    }
    return filtered as T;
  }
  if (pathname === "/api/v1/admin/contracts") return filterContracts(url) as T;
  if (pathname.match(/^\/api\/v1\/contracts\/\d+$/)) return contractDetails(Number(pathname.split("/").pop())) as T;
  const previewMatch = pathname.match(/^\/api\/v1\/admin\/contracts\/(\d+)\/versions\/(\d+)\/preview$/);
  if (previewMatch) return contractVersionPreview(Number(previewMatch[1]), Number(previewMatch[2])) as T;
  if (pathname.match(/^\/api\/v1\/admin\/contracts\/\d+/)) return { ok: true, versionId: 1001, versionNumber: 2 } as T;
  if (pathname.match(/^\/api\/v1\/contracts\/\d+\/shares$/)) return { shareUrl: "https://customer-demo.vercel.app/shared/demo-share-token" } as T;
  if (pathname === "/api/v1/admin/service-requests") return requests.filter((item) => item.requestType === url.searchParams.get("type")) as T;
  if (pathname.match(/^\/api\/v1\/service-requests\/\d+$/)) return demoRequestDetails(Number(pathname.split("/").pop())) as T;
  if (pathname.startsWith("/api/v1/admin/service-requests/")) return { ok: true } as T;
  if (pathname === "/api/v1/admin/users") return demoClients(url) as T;
  if (pathname.match(/^\/api\/v1\/admin\/users\/\d+$/) && method === "GET") return demoCustomerDetails(Number(pathname.split("/").pop())) as T;
  if (pathname.startsWith("/api/v1/admin/users/")) return { ok: true } as T;
  if (pathname === "/api/v1/admin/team") return team as T;
  if (pathname === "/api/v1/admin/team/roles") return roles as T;
  if (pathname === "/api/v1/admin/team/assignable-lawyers") return team.filter((member) => member.roles.includes("lawyer")) as T;
  if (pathname === "/api/v1/admin/team/invite") return { userId: 9, temporaryPassword: "DemoPass123!" } as T;
  if (pathname.startsWith("/api/v1/admin/team/")) return { ok: true } as T;
  if (pathname === "/api/v1/admin/templates") return templates as T;
  if (pathname.match(/^\/api\/v1\/admin\/templates\/versions\/\d+$/)) return templateVersion(Number(pathname.split("/").pop())) as T;
  if (pathname.match(/^\/api\/v1\/admin\/templates\/versions\/\d+\/validation$/)) return templateInspection() as T;
  if (pathname.match(/^\/api\/v1\/admin\/templates\/versions\/\d+\/preview$/)) return templatePreview() as T;
  if (pathname.startsWith("/api/v1/admin/templates/")) return { ok: true } as T;
  if (pathname === "/api/v1/templates/apartment_sale/definition") return withDemoPricing(localTemplateRegistry.apartment_sale) as T;
  if (pathname === "/api/v1/templates/rental/definition") return withDemoPricing(localTemplateRegistry.rental) as T;
  if (pathname === "/api/v1/templates/freelancer/definition") return withDemoPricing(localTemplateRegistry.freelancer) as T;
  if (pathname === "/api/v1/admin/settings") return (method === "GET" ? settings : { ok: true }) as T;
  if (pathname === "/api/v1/admin/audit/verify") return { valid: true, checked: auditRows().length, total: auditRows().length, fullyVerified: auditRows().length, legacyUnverifiable: 0, firstBroken: null } as T;
  if (pathname === "/api/v1/admin/audit") { const rows = auditRows(); return { items: rows, pagination: { page: 1, perPage: 50, total: rows.length, pages: 1 } } as T; }
  if (pathname === "/api/v1/notifications") return { items: notifications(), unreadCount: 2 } as T;
  if (pathname.startsWith("/api/v1/notifications/")) return { ok: true } as T;
  if (pathname === "/api/v1/attachments") return { id: Math.floor(Math.random() * 10000), fileName: "demo-upload.png" } as T;
  if (pathname.startsWith("/api/v1/attachments/")) return { ok: true } as T;

  return (method === "GET" ? [] : { ok: true }) as T;
}

function filterByStatus<T extends { status: string }>(items: T[], status: string | null): T[] {
  return status ? items.filter((item) => item.status === status) : items;
}

function filterContracts(url: URL) {
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  return contracts.filter((item) => (!status || item.status === status) && (!source || item.sourceChannel === source));
}

function summary() {
  return {
    contracts: { total: contracts.length, active: 2, issued: 1, office: contracts.filter((item) => item.sourceChannel === "office").length },
    requests: { total: requests.length, needs_attention: 1, unassigned: 1, awaiting_client: 1, meetings_today: 1, overdue: 0 },
    payments: { pending: payments.filter((item) => item.status === "pending_verification").length, approved_month: 249 },
    notifications: { unread: 2 },
  };
}

function contractDetails(id: number) {
  const row = contracts.find((item) => item.id === id) || contracts[0];
  const definition = localTemplateRegistry[row.templateSlug] as ContractTemplateDefinition;
  const variantKey = definition.variants[0]?.key || "";
  return {
    id: row.id,
    serial_number: row.serialNumber,
    title: row.title,
    status: row.status,
    current_version_id: 1001,
    assigned_lawyer_id: row.assignedLawyerName ? 2 : null,
    template_name_ar: row.templateNameAr,
    client_name: row.clientName,
    assigned_lawyer_name: row.assignedLawyerName,
    source_channel: row.sourceChannel,
    billing_mode: row.billingMode,
    template_definition: definition,
    template_version: definition.version,
    variant_key: variantKey,
    selected_optional_clause_keys: [],
    field_values_json: createSampleFieldValues(definition, variantKey),
    attachment_refs_json: {},
    current_step_key: definition.variants[0]?.steps[0]?.key || "",
    creation_mode: row.sourceChannel === "office" ? "office_assisted" : "self_service",
    core_identity_locked: false,
    versions: [
      { id: 1001, versionNumber: 1, status: "draft", createdAt: iso(-12), lockedAt: null, documentHash: null },
    ],
  };
}

function contractVersionPreview(id: number, versionId: number) {
  const details = contractDetails(id);
  return {
    contractId: details.id,
    versionId,
    versionNumber: 1,
    versionStatus: "draft",
    serialNumber: details.serial_number,
    title: details.title,
    templateSlug: contracts.find((item) => item.id === details.id)?.templateSlug || "rental",
    templateNameAr: details.template_name_ar,
    templateDefinition: details.template_definition,
    variantKey: details.variant_key,
    selectedOptionalClauseKeys: details.selected_optional_clause_keys,
    fieldValues: details.field_values_json,
    touchedFieldKeys: [],
    legalClauseSnapshot: [],
    documentHash: null,
    lockedAt: null,
    issuedAt: null,
  };
}

function templateVersion(id: number) {
  const index = Math.max(0, Math.floor(id / 100) - 1);
  const definition = Object.values(localTemplateRegistry)[index] || localTemplateRegistry.rental;
  return {
    id,
    templateId: index + 1,
    versionNumber: definition.version,
    status: definition.variants.length > 0 ? "published" : "draft",
    definition,
    changeSummary: "نسخة ديمو للمعاينة",
    legalReference: "Shared template engine",
    effectiveFrom: iso(-100),
  };
}

function templateInspection() {
  return {
    publishErrors: [],
    warnings: [],
    missingLegalClauseKeys: [],
    duplicateFieldKeys: [],
    unreachableSteps: [],
  };
}

function templatePreview() {
  return {
    clauses: [
      { key: "demo_clause", titleAr: "بند تجريبي", bodyAr: "هذا نص تجريبي لمعاينة شكل إخراج البنود القانونية داخل الداشبورد." },
    ],
    missingVariables: [],
    missingClauseKeys: [],
    definitionVersion: 1,
  };
}

function demoClients(url: URL) {
  const rows = [
    { id: 1, publicId: "58291047", name: "أحمد محمد حسن", email: "client.demo@zdraft.local", phone: "01023817658", whatsappNumber: "01023817658", accountType: "individual", companyName: null, status: "active", emailVerified: true, createdAt: iso(-240), contractsCount: 2, requestsCount: 1 },
    { id: 2, publicId: "Z-2001", name: "شركة النيل", email: "company.demo@zdraft.local", phone: "01033333333", whatsappNumber: "01033333333", accountType: "business", companyName: "شركة النيل", status: "active", emailVerified: true, createdAt: iso(-120), contractsCount: 1, requestsCount: 0 },
  ];
  const status = url.searchParams.get("status");
  return status ? rows.filter((item) => item.status === status) : rows;
}

function demoSessions() {
  return [
    { id: "current", ip_address: "127.0.0.1", user_agent: "Chrome Demo", created_at: iso(-2), last_seen_at: iso(-0.1), expires_at: iso(168), current: true },
  ];
}

function auditRows() {
  return [
    { id: 1, requestId: "demo-001", action: "payment.approved", entityType: "payment", entityId: "701", oldValues: { status: "pending_verification" }, newValues: { status: "approved" }, ipAddress: "127.0.0.1", recordHash: "demo-hash-001234567890", createdAt: iso(-2), actorName: "Z draft Super Admin", actorEmail: "admin.demo@zdraft.local" },
    { id: 2, requestId: "demo-002", action: "contract.version_created", entityType: "contract", entityId: "101", oldValues: null, newValues: { version: 2 }, ipAddress: "127.0.0.1", recordHash: "demo-hash-009876543210", createdAt: iso(-5), actorName: "أ. مريم سامي", actorEmail: "lawyer.demo@zdraft.local" },
  ];
}

function notifications() {
  return [
    { id: 1, type: "payment", title: "إيصال جديد يحتاج مراجعة", message: "عميل رفع إثبات دفع لعقد بيع شقة.", actionUrl: "/payments", readAt: null, createdAt: iso(-1) },
    { id: 2, type: "request", title: "طلب محامي جديد", message: "طلب إعداد عقد يحتاج إسناد ومتابعة.", actionUrl: "/work", readAt: null, createdAt: iso(-4) },
  ];
}


function demoReports(periodValue: string | null) {
  const period = periodValue === "quarter" || periodValue === "year" ? periodValue : "month";
  const seriesLength = period === "month" ? 12 : period === "quarter" ? 3 : 6;
  const revenueSeries = Array.from({ length: seriesLength }, (_, index) => ({
    bucketStart: iso(-(seriesLength - index) * (period === "month" ? 48 : 720)),
    amount: [4500, 6100, 8200, 7500, 9600, 11200, 10200, 13400, 14800, 12600, 15900, 17200][index] ?? 8200 + index * 1400,
    paymentsCount: 2 + (index % 5),
  }));
  return {
    period,
    range: { start: iso(-720), end: iso(24), bucket: period === "month" ? "day" : "month" },
    metrics: {
      currentRevenue: revenueSeries.reduce((sum, item) => sum + item.amount, 0), previousRevenue: 98000, revenueGrowthPercent: 18.4,
      approvedPayments: 23, pendingPayments: 1, contractsCreated: 31, contractsIssued: 24, contractIssueRatePercent: 77.4,
      officeContracts: 8, requestsCreated: 17, requestsCompleted: 12, averageCompletionHours: 19.3,
      averageFirstResponseHours: 4.8, slaCompliancePercent: 92.6, overdueRequests: 1, newCustomers: 14,
    },
    revenueSeries,
    templateDistribution: templates.map((item, index) => ({ slug: item.slug, nameAr: item.nameAr, count: [13, 11, 7][index] ?? 0, issued: [10, 9, 5][index] ?? 0 })),
    serviceDistribution: [
      { requestType: "contract_drafting", count: 7, completed: 5, active: 2 },
      { requestType: "contract_review", count: 6, completed: 4, active: 2 },
      { requestType: "consultation", count: 4, completed: 3, active: 1 },
    ],
    lawyerPerformance: [
      { id: 2, name: "أ. مريم سامي", assignedCount: 9, completedCount: 7, activeCount: 2, overdueCount: 0, averageCompletionHours: 17.2 },
    ],
    contractStatuses: [{ status: "issued", count: 24 }, { status: "pending_review", count: 4 }, { status: "client_review", count: 3 }],
    requestStatuses: [{ status: "completed", count: 12 }, { status: "in_progress", count: 3 }, { status: "meeting_scheduled", count: 2 }],
    generatedAt: iso(),
  };
}

function demoRequestDetails(id: number) {
  const row = requests.find((item) => item.id === id) || requests[0];
  return {
    ...row,
    description: "طلب تجريبي يعرض دورة العمل الكاملة بين العميل ومكتب المحاماة.",
    templateSlug: "apartment_sale",
    communicationChannel: "whatsapp",
    preferredContactAt: iso(12), meetingAt: row.dueAt ?? null, meetingProvider: row.meetingUrl ? "zoom" : null,
    meetingLocation: null, assignedLawyerId: row.assignedLawyerName ? 2 : null, clientUserId: 1,
    clientWhatsappNumber: row.clientPhone, dueAt: row.dueAt, linkedContractId: null, linkedContractSerial: null,
    linkedContractTitle: null, paymentStatus: row.status === "awaiting_payment" ? "pending_verification" : "approved",
    paymentAmountEgp: 100, paymentAdminNotes: null, updatedAt: iso(-1),
    events: [
      { id: 1, eventType: "request_created", notes: "تم إنشاء الطلب", payload: {}, createdAt: row.createdAt },
      { id: 2, eventType: "assigned", notes: "تم إسناد الطلب للمحامي", payload: { lawyerId: 2 }, createdAt: iso(-4) },
    ],
    attachments: [{ id: 9001, fileName: "contract-source.pdf", fileType: "application/pdf", sizeBytes: 245000, createdAt: iso(-5) }],
    deliverables: [],
    permissions: { canUploadFiles: false, canRequestRevision: false, canConfirmReceipt: false },
  };
}

function demoCustomerDetails(id: number) {
  const client = demoClients(new URL("https://demo.local" as string)).find((item) => item.id === id) || demoClients(new URL("https://demo.local" as string))[0];
  return {
    profile: { ...client, emailVerifiedAt: iso(-220), updatedAt: iso(-1), activeSessions: 1, attachmentsCount: 3, approvedPaymentsEgp: 249 },
    contracts: contracts.filter((item) => item.clientName === client.name).map((item) => ({ ...item, priceEgp: 139, templateNameAr: item.templateNameAr, issuedAt: item.status === "issued" ? iso(-12) : null })),
    requests: requests.filter((item) => item.clientName === client.name),
    payments: payments.filter((item) => item.clientName === client.name).map((item) => ({ ...item, paymentMethod: "vodafone_cash", reviewedAt: item.status === "approved" ? iso(-10) : null })),
    activity: auditRows(),
  };
}
