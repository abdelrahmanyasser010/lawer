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
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const staff = getCurrentStaff();
  const visibleGroups = adminNavigation
    .map((group) => ({ ...group, items: group.items.filter((item) => can(staff.role, item.permission) && isDashboardFeatureEnabled(item.feature)) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="relative h-10 w-10 shrink-0"><Image src="/logo.png" alt="Z draft" fill className="object-contain" /></div>
        <div><div className="text-sm font-black text-white">Z draft</div><div className="text-[10px] font-bold text-[#986410]">مكتب المحاماة</div></div>
      </div>
      <div className="border-b border-white/10 px-4 py-4">
        <Link href="/account" onClick={onNavigate} className="block rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">
          <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#986410]/20 text-xs font-black text-[#d7a94f]">{staff.name.slice(0, 1)}</div><div className="min-w-0"><div className="truncate text-xs font-black text-white">{staff.name}</div><div className="truncate text-[10px] text-slate-400">{staff.email}</div></div></div>
          <div className="mt-2 rounded-lg bg-[#986410]/10 px-2 py-1 text-center text-[9px] font-black text-[#d7a94f]">{staff.roleLabel} · حسابي</div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group) => <div key={group.label} className="mb-5"><div className="mb-2 px-3 text-[9px] font-black uppercase tracking-wider text-slate-500">{group.label}</div><div className="space-y-1">{group.items.map((item) => { const Icon=item.icon; const active=isActive(pathname,item.href); return <Link key={item.href} href={item.href} onClick={onNavigate} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition ${active?"bg-[#986410] text-white shadow-sm":"text-slate-300 hover:bg-white/8 hover:text-white"}`}><Icon className={`h-4 w-4 shrink-0 ${active?"text-white":"text-slate-400 group-hover:text-[#d7a94f]"}`} /><span className="flex-1">{item.label}</span>{active&&<ChevronLeft className="h-3 w-3 text-white/60"/>}</Link>; })}</div></div>)}
      </nav>
      <div className="border-t border-white/10 p-3"><button type="button" onClick={async()=>{try{await dashboardApi.logout();}finally{setDashboardUser(null);window.location.href="/login";}}} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-400 hover:bg-white/8 hover:text-white"><LogOut className="h-4 w-4"/> تسجيل الخروج</button></div>
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
    const load = () => dashboardRequest<{ unreadCount: number }>("/api/v1/notifications?unreadOnly=true").then((result) => setUnread(result.unreadCount)).catch(() => setUnread(0));
    load();
    const timer = window.setInterval(load, 45_000);
    return () => window.clearInterval(timer);
  }, [pathname]);

  return <>
    <aside className="hidden h-screen w-64 shrink-0 bg-[#00102e] lg:sticky lg:top-0 lg:block"><SidebarBody pathname={pathname}/></aside>
    <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3"><button type="button" onClick={()=>setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00102e] text-[#986410]" aria-label="فتح القائمة"><Menu className="h-5 w-5"/></button><div><div className="text-sm font-black text-[#00102e]">{current?.label||"لوحة التحكم"}</div><div className="text-[10px] font-bold text-slate-400">Z draft Office</div></div></div>
      <div className="flex items-center gap-2">
        <Link href="/notifications" aria-label="الإشعارات" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"><Bell className="h-4 w-4"/>{unread>0&&<span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{unread>99?"99+":unread}</span>}</Link>
        {dashboardFeatures.officeContractCreation&&can(staff.role,"contracts.create_office")&&<Link href="/contracts/create" className="rounded-xl bg-[#986410] px-3 py-2 text-[10px] font-black text-white">إنشاء عقد</Link>}
      </div>
    </header>
    {open&&<div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="إغلاق" className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" onClick={()=>setOpen(false)}/><aside className="absolute inset-y-0 right-0 w-[min(88vw,20rem)] bg-[#00102e] shadow-2xl"><button type="button" onClick={()=>setOpen(false)} className="absolute left-4 top-4 z-10 rounded-lg p-2 text-white hover:bg-white/10" aria-label="إغلاق القائمة"><X className="h-4 w-4"/></button><div className="h-full pt-10"><SidebarBody pathname={pathname} onNavigate={()=>setOpen(false)}/></div></aside></div>}
  </>;
}
