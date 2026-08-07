import type { ElementType } from "react";
import {
  Bell,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FileCog,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  ScrollText,
  Settings,
  Tags,
  Users,
  UsersRound,
  ChartNoAxesCombined,
} from "lucide-react";
import type { AdminPermission } from "@/lib/adminAccess";
import type { DashboardFeature } from "@/config/dashboardFeatures";

export type NavigationItem = {
  href: string;
  label: string;
  icon: ElementType;
  permission: AdminPermission;
  badge?: number;
  feature?: DashboardFeature;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const adminNavigation: NavigationGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { href: "/", label: "نظرة عامة", icon: LayoutDashboard, permission: "dashboard.view" },
      { href: "/notifications", label: "الإشعارات", icon: Bell, permission: "dashboard.view" },
    ],
  },
  {
    label: "التشغيل اليومي",
    items: [
      { href: "/work", label: "قائمة العمل", icon: ClipboardList, permission: "requests.view" },
      { href: "/contracts", label: "العقود", icon: FileText, permission: "contracts.view" },
      { href: "/reviews", label: "مراجعة العقود", icon: FileCheck2, permission: "contracts.review", feature: "contractEditing" },
      { href: "/consultations", label: "الاستشارات والمواعيد", icon: MessageSquareText, permission: "consultations.manage" },
      { href: "/payments", label: "المدفوعات", icon: CreditCard, permission: "payments.review" },
      { href: "/users", label: "العملاء", icon: Users, permission: "clients.view" },
    ],
  },
  {
    label: "إدارة المنصة",
    items: [
      { href: "/templates", label: "القوالب والإصدارات", icon: FileCog, permission: "templates.manage", feature: "templateManagement" },
      { href: "/pricing", label: "الأسعار والخدمات", icon: Tags, permission: "pricing.manage" },
      { href: "/team", label: "الفريق والصلاحيات", icon: UsersRound, permission: "team.manage", feature: "teamManagement" },
      { href: "/reports", label: "التقارير", icon: ChartNoAxesCombined, permission: "reports.view" },
    ],
  },
  {
    label: "النظام",
    items: [
      { href: "/audit", label: "سجل التدقيق", icon: ScrollText, permission: "audit.view" },
      { href: "/settings", label: "الإعدادات", icon: Settings, permission: "settings.manage" },
    ],
  },
];
