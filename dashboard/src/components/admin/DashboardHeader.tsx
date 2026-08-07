"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell,Plus } from "lucide-react";
import { adminNavigation } from "@/config/adminNavigation";
import { can,getCurrentStaff } from "@/lib/adminAccess";
import { dashboardRequest } from "@/lib/apiClient";
import { dashboardFeatures } from "@/config/dashboardFeatures";
export default function DashboardHeader(){const pathname=usePathname();const current=adminNavigation.flatMap(g=>g.items).find(i=>i.href==="/"?pathname==="/":pathname.startsWith(i.href));const staff=getCurrentStaff();const [unread,setUnread]=useState(0);useEffect(()=>{dashboardRequest<{unreadCount:number}>("/api/v1/notifications?unreadOnly=true").then(x=>setUnread(x.unreadCount)).catch(()=>setUnread(0));},[pathname]);return <header className="sticky top-0 z-30 hidden min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur lg:flex"><div><h1 className="text-sm font-black text-[#00102e]">{current?.label||"لوحة التحكم"}</h1><p className="mt-0.5 text-[10px] font-bold text-slate-400">تشغيل مكتب المحاماة وإدارة خدمات العملاء</p></div><div className="flex items-center gap-2"><Link href="/notifications" aria-label="الإشعارات" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"><Bell className="h-4 w-4"/>{unread>0&&<span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{unread>99?"99+":unread}</span>}</Link>{dashboardFeatures.officeContractCreation&&can(staff.role,"contracts.create_office")&&<Link href="/contracts/create" className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white"><Plus className="h-4 w-4 text-[#986410]"/>إنشاء عقد من المكتب</Link>}</div></header>}
