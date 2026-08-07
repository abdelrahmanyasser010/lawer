import { getDashboardUser } from "./session";
import { demoDashboardUser, demoMode } from "./demoApi";

export type StaffRole = "super_admin" | "operations" | "lawyer" | "finance" | "support" | "template_manager";

export type AdminPermission =
  | "dashboard.view"
  | "requests.view"
  | "contracts.view"
  | "contracts.create_office"
  | "contracts.review"
  | "consultations.manage"
  | "payments.review"
  | "clients.view"
  | "templates.manage"
  | "pricing.manage"
  | "team.manage"
  | "reports.view"
  | "audit.view"
  | "settings.manage";

const backendPermission: Record<AdminPermission, string[]> = {
  "dashboard.view": ["dashboard.view"],
  "requests.view": ["requests.view_all", "requests.view_assigned"],
  "contracts.view": ["contracts.view_all", "contracts.view_assigned"],
  "contracts.create_office": ["contracts.create_office"],
  "contracts.review": ["contracts.edit_legal"],
  "consultations.manage": ["consultations.manage"],
  "payments.review": ["payments.review"],
  "clients.view": ["clients.view"],
  "templates.manage": ["templates.view", "templates.edit", "templates.publish", "templates.manage"],
  "pricing.manage": ["pricing.manage"],
  "team.manage": ["team.manage"],
  "reports.view": ["reports.view"],
  "audit.view": ["audit.view"],
  "settings.manage": ["settings.manage"],
};

const permissionsByRole: Record<StaffRole, AdminPermission[]> = {
  super_admin: Object.keys(backendPermission) as AdminPermission[],
  operations: ["dashboard.view","requests.view","contracts.view","contracts.create_office","contracts.review","consultations.manage","payments.review","clients.view","reports.view"],
  lawyer: ["dashboard.view","requests.view","contracts.view","contracts.create_office","contracts.review","consultations.manage","clients.view"],
  finance: ["dashboard.view","payments.review","reports.view","clients.view"],
  support: ["dashboard.view","requests.view","contracts.view","consultations.manage","clients.view"],
  template_manager: ["dashboard.view","contracts.view","templates.manage","audit.view"],
};

export const staffRoleLabels: Record<StaffRole, string> = {
  super_admin: "المشرف العام",
  operations: "إدارة التشغيل",
  lawyer: "محامٍ",
  finance: "الحسابات",
  support: "خدمة العملاء",
  template_manager: "مسؤول القوالب القانونية",
};

export function getCurrentStaffRole(): StaffRole {
  const stored = getDashboardUser();
  const role = stored?.roles.find((item) => item in permissionsByRole) as StaffRole | undefined;
  if (role) return role;
  const demoRole = process.env.NEXT_PUBLIC_DASHBOARD_DEMO_ROLE as StaffRole | undefined;
  return demoRole && demoRole in permissionsByRole ? demoRole : "support";
}

export function can(role: StaffRole, permission: AdminPermission): boolean {
  const user = getDashboardUser();
  if (user?.roles.includes("super_admin")) return true;
  if (user && user.roles.includes(role)) return backendPermission[permission].some((item) => user.permissions.includes(item));
  return permissionsByRole[role]?.includes(permission) ?? false;
}

export function hasBackendPermission(...permissions: string[]): boolean {
  if (demoMode) return permissions.length === 0 || permissions.some((permission) => demoDashboardUser.permissions.includes(permission));
  const user = getDashboardUser();
  return Boolean(user && (user.roles.includes("super_admin") || permissions.some((permission) => user.permissions.includes(permission))));
}

export function getCurrentStaff() {
  const user = getDashboardUser() ?? (demoMode ? demoDashboardUser : null);
  const role = getCurrentStaffRole();
  return {
    id: String(user?.id ?? "staff-loading"),
    name: user?.name ?? "عضو الفريق",
    email: user?.email ?? "",
    role,
    roleLabel: staffRoleLabels[role],
    permissions: user?.permissions ?? [],
  };
}
