export type DashboardFeature =
  | "teamManagement"
  | "assignment"
  | "officeContractCreation"
  | "contractEditing"
  | "templateManagement";

function publicFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
}

/**
 * Features are intentionally hidden for the current single-super-admin launch.
 * Their routes, components and backend APIs remain in the codebase and can be
 * restored later through environment flags without rebuilding the workflows.
 */
export const dashboardFeatures: Record<DashboardFeature, boolean> = {
  teamManagement: publicFlag(process.env.NEXT_PUBLIC_ENABLE_TEAM_MANAGEMENT, false),
  assignment: publicFlag(process.env.NEXT_PUBLIC_ENABLE_ASSIGNMENT, false),
  officeContractCreation: publicFlag(process.env.NEXT_PUBLIC_ENABLE_OFFICE_CONTRACT_CREATION, false),
  contractEditing: publicFlag(process.env.NEXT_PUBLIC_ENABLE_CONTRACT_EDITING, false),
  templateManagement: publicFlag(process.env.NEXT_PUBLIC_ENABLE_TEMPLATE_MANAGEMENT, false),
};

export function isDashboardFeatureEnabled(feature?: DashboardFeature): boolean {
  return feature ? dashboardFeatures[feature] : true;
}

export function disabledFeatureForPath(pathname: string): DashboardFeature | null {
  if (pathname.startsWith("/team") || pathname.startsWith("/lawyers") || pathname.startsWith("/roles")) return dashboardFeatures.teamManagement ? null : "teamManagement";
  if (pathname.startsWith("/contracts/create")) return dashboardFeatures.officeContractCreation ? null : "officeContractCreation";
  if (/^\/contracts\/[^/]+\/versions\//.test(pathname) || pathname.startsWith("/reviews")) return dashboardFeatures.contractEditing ? null : "contractEditing";
  if (pathname.startsWith("/templates")) return dashboardFeatures.templateManagement ? null : "templateManagement";
  return null;
}

export const dashboardFeatureLabels: Record<DashboardFeature, string> = {
  teamManagement: "إدارة الفريق والمحامين",
  assignment: "إسناد الأعمال لمحامين",
  officeContractCreation: "إنشاء عقد من لوحة التحكم",
  contractEditing: "تعديل العقود من لوحة التحكم",
  templateManagement: "إضافة أو تعديل قوالب العقود",
};
