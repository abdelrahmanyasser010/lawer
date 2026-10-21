"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, LogOut, Menu, X } from "lucide-react";
import { adminNavigation } from "@/config/adminNavigation";
import { can, getCurrentStaff } from "@/lib/adminAccess";
import { dashboardApi, dashboardRequest } from "@/lib/apiClient";
import { setDashboardUser } from "@/lib/session";
import { dashboardFeatures, isDashboardFeatureEnabled } from "@/config/dashboardFeatures";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (href === "/contracts") return pathname.startsWith("/contracts") && !pathname.startsWith("/contracts/create");
  return pathname.startsWith(href);
}


function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const staff = getCurrentStaff();
  const visibleGroups = adminNavigation
    .map((group) => ({ ...group, items: group.items.filter((item) => can(staff.role, item.permission) && isDashboardFeatureEnabled(item.feature)) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3.5 border-b border-white/[0.08] px-5 py-4">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-1.5 shadow-inner">
          <Image src="/logo.png" alt="Z draft" fill className="object-contain p-1" />
        </div>
        <div>
          <div className="text-base font-black tracking-tight text-white">Z draft</div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#d7a94f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7a94f]" />
            <span>مكتب المحاماة</span>
          </div>
        </div>
      </div>
      <div className="border-b border-white/[0.08] px-3.5 py-3.5">
        <Link
          href="/account"
          onClick={onNavigate}
          className="group block rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-all duration-200 hover:border-[#d7a94f]/30 hover:bg-white/[0.06] hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#d7a94f] to-[#986410] text-xs font-black text-[#00102e] shadow-sm">
              {staff.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-black text-white transition-colors group-hover:text-[#d7a94f]">
                {staff.name}
              </div>
              <div className="truncate text-[11px] font-medium text-slate-400">
                {staff.email}
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between rounded-lg border border-[#d7a94f]/20 bg-[#d7a94f]/10 px-2.5 py-1 text-[11px] font-black text-[#d7a94f] transition group-hover:bg-[#d7a94f]/15">
            <span>{staff.roleLabel}</span>
            <span className="text-[10px] text-[#d7a94f]/80">إعدادات الحساب ←</span>
          </div>
        </Link>
      </div>
      <nav
        className="no-scrollbar flex-1 overflow-y-auto px-3 py-3"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-1">
            <div className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150 active:scale-[0.99] ${
                      active
                        ? "border border-[#d7a94f]/30 bg-gradient-to-l from-[#986410] to-[#b37a1f] font-black text-white shadow-md shadow-[#986410]/25"
                        : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                        active
                          ? "text-white"
                          : "text-slate-400 group-hover:scale-110 group-hover:text-[#d7a94f]"
                      }`}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active && <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-white/90" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.08] p-3">
        <button
          type="button"
          onClick={async () => {
            try {
              await dashboardApi.logout();
            } finally {
              setDashboardUser(null);
              window.location.href = "/login";
            }
          }}
          className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-400 transition-all duration-150 hover:bg-rose-500/10 hover:text-rose-300 active:scale-[0.99]"
        >
          <LogOut className="h-4 w-4 text-slate-400 transition-colors group-hover:text-rose-300" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const current = adminNavigation.flatMap((group) => group.items).find((item) => isActive(pathname, item.href));
  const staff = getCurrentStaff();

  useEffect(() => {
    if (pathname === "/notifications") {
      setUnread(0);
    } else {
      dashboardRequest<{ unreadCount: number }>("/api/v1/notifications?unreadOnly=true")
        .then((result) => setUnread(result.unreadCount))
        .catch(() => setUnread(0));
    }
    const handleCleared = () => setUnread(0);
    window.addEventListener("notifications_cleared", handleCleared);
    const timer = window.setInterval(() => {
      if (pathname !== "/notifications") {
        dashboardRequest<{ unreadCount: number }>("/api/v1/notifications?unreadOnly=true")
          .then((result) => setUnread(result.unreadCount))
          .catch(() => setUnread(0));
      }
    }, 45_000);
    return () => {
      window.removeEventListener("notifications_cleared", handleCleared);
      window.clearInterval(timer);
    };
  }, [pathname]);


  return <>
    <aside className="hidden h-screen w-64 shrink-0 overflow-hidden border-l border-white/[0.08] bg-[#00102e] select-none shadow-sm lg:sticky lg:top-0 lg:block">
      <SidebarBody pathname={pathname}/>
    </aside>
    <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <button type="button" onClick={()=>setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00102e] text-[#986410] active:scale-95 transition" aria-label="فتح القائمة">
          <Menu className="h-5 w-5"/>
        </button>
        <div>
          <div className="text-base font-black text-[#00102e]">{current?.label||"لوحة التحكم"}</div>
          <div className="text-xs font-bold text-slate-500">Z draft Office</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/notifications" aria-label="الإشعارات" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95 transition">
          <Bell className="h-4 w-4"/>
          {unread>0&&<span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-black text-white">{unread>99?"99+":unread}</span>}
        </Link>
        {dashboardFeatures.officeContractCreation&&can(staff.role,"contracts.create_office")&& (
          <Link href="/contracts/create" className="rounded-xl border border-white/10 bg-[#00102e] px-3.5 py-2 text-xs font-black text-[#d7a94f] shadow-sm hover:bg-[#0a1f4d] active:scale-95 transition">
            إنشاء عقد
          </Link>
        )}
      </div>
    </header>
    {open&&<div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="إغلاق" className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" onClick={()=>setOpen(false)}/><aside className="absolute inset-y-0 right-0 w-[min(88vw,20rem)] overflow-hidden bg-[#00102e] shadow-2xl"><button type="button" onClick={()=>setOpen(false)} className="absolute left-4 top-4 z-10 rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white transition" aria-label="إغلاق القائمة"><X className="h-4 w-4"/></button><div className="h-full pt-10"><SidebarBody pathname={pathname} onNavigate={()=>setOpen(false)}/></div></aside></div>}
  </>;
}
