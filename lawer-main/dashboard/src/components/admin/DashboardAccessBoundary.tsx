"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ShieldX } from "lucide-react";
import { can, getCurrentStaff } from "@/lib/adminAccess";
import { permissionForPath } from "@/lib/routePermissions";
import { dashboardFeatureLabels, disabledFeatureForPath } from "@/config/dashboardFeatures";

export default function DashboardAccessBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const staff = getCurrentStaff();
  const permission = permissionForPath(pathname);
  const disabledFeature = disabledFeatureForPath(pathname);

  if (!disabledFeature && can(staff.role, permission)) return children;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-12">
      <section className="w-full rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-700">
          <ShieldX className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-[#00102e]">{disabledFeature ? "هذه الميزة مخفية حاليًا" : "ليس لديك صلاحية لفتح هذه الصفحة"}</h1>
        <p className="mx-auto mt-3 max-w-xl text-xs font-semibold leading-6 text-slate-500">
          {disabledFeature ? `تم إخفاء ميزة «${dashboardFeatureLabels[disabledFeature]}» في وضع التشغيل الحالي مع الاحتفاظ بكودها لإتاحتها مستقبلًا.` : `دورك الحالي هو «${staff.roleLabel}». إخفاء الصفحة في الواجهة طبقة مساعدة فقط؛ ويجب أن يفرض الباك إند نفس الصلاحية على الـAPI.`}
        </p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-white">
          <ArrowRight className="h-4 w-4 text-[#986410]" /> العودة للرئيسية
        </Link>
      </section>
    </div>
  );
}
