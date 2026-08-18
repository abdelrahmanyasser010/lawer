import type { AdminPermission } from "@/lib/adminAccess";

type RoutePermission = {
  prefix: string;
  permission: AdminPermission;
};

const routePermissions: RoutePermission[] = [
  { prefix: "/contracts/create", permission: "contracts.create_office" },
  { prefix: "/contracts", permission: "contracts.view" },
  { prefix: "/work", permission: "requests.view" },
  { prefix: "/reviews", permission: "contracts.review" },
  { prefix: "/payments", permission: "payments.review" },
  { prefix: "/users", permission: "clients.view" },
  { prefix: "/templates", permission: "templates.manage" },
  { prefix: "/pricing", permission: "pricing.manage" },
  { prefix: "/team", permission: "team.manage" },
  { prefix: "/reports", permission: "reports.view" },
  { prefix: "/audit", permission: "audit.view" },
  { prefix: "/settings", permission: "settings.manage" },
  { prefix: "/notifications", permission: "dashboard.view" },
  { prefix: "/account", permission: "dashboard.view" },
  { prefix: "/", permission: "dashboard.view" },
];

export function permissionForPath(pathname: string): AdminPermission {
  if (/^\/contracts\/[^/]+\/versions\/[^/]+/.test(pathname)) return "contracts.review";
  return routePermissions.find((route) =>
    route.prefix === "/" ? pathname === "/" : pathname.startsWith(route.prefix),
  )?.permission ?? "dashboard.view";
}
