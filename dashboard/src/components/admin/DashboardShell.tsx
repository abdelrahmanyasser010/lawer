"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import DashboardHeader from "./DashboardHeader";
import DashboardAccessBoundary from "./DashboardAccessBoundary";
import { dashboardApi, type DashboardUser } from "@/lib/apiClient";
import { setDashboardUser } from "@/lib/session";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    dashboardApi.me().then(({ user: current }) => {
      if (!active) return;
      const staffRoles = current.roles.filter((role) => role !== "customer");
      if (staffRoles.length === 0) throw new Error("هذا الحساب لا يملك دخول لوحة المكتب");
      setDashboardUser(current);
      setUser(current);
      if (current.passwordChangeRequired && pathname !== "/account") router.replace("/account?changePassword=required");
    }).catch((caught) => {
      if (!active) return;
      setDashboardUser(null);
      setError(caught instanceof Error ? caught.message : "يجب تسجيل الدخول");
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    });
    return () => { active = false; };
  }, [pathname, router]);

  if (!user) return <div className="flex min-h-screen items-center justify-center bg-slate-50" dir="rtl"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-[#986410]"/><div className="mt-3 text-xs font-black text-slate-500">{error || "جاري التحقق من صلاحية الدخول..."}</div></div></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc]" dir="rtl">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <DashboardHeader />
          <main className="min-w-0"><DashboardAccessBoundary>{children}</DashboardAccessBoundary></main>
        </div>
      </div>
    </div>
  );
}
