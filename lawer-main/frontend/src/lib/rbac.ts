export type UserRole = "USER" | "LAWYER" | "ADMIN";

export interface PermissionRule {
  role: UserRole;
  canManagePrices: boolean;
  canApproveVodafoneCash: boolean;
  canAnswerConsultations: boolean;
  canViewSecurityAuditLog: boolean;
  canEditContractFields: boolean;
}

export const RBAC_PERMISSIONS: Record<UserRole, PermissionRule> = {
  USER: {
    role: "USER",
    canManagePrices: false,
    canApproveVodafoneCash: false,
    canAnswerConsultations: false,
    canViewSecurityAuditLog: false,
    canEditContractFields: false,
  },
  LAWYER: {
    role: "LAWYER",
    canManagePrices: false,
    canApproveVodafoneCash: false,
    canAnswerConsultations: true,
    canViewSecurityAuditLog: false,
    canEditContractFields: false,
  },
  ADMIN: {
    role: "ADMIN",
    canManagePrices: true,
    canApproveVodafoneCash: true,
    canAnswerConsultations: true,
    canViewSecurityAuditLog: true,
    canEditContractFields: true,
  },
};

/**
 * Checks access to role-restricted customer frontend routes.
 */
export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (pathname.startsWith("/lawyer")) {
    return role === "LAWYER" || role === "ADMIN";
  }
  return true;
}
