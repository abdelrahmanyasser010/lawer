"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Copy,
  FileText,
  LogIn,
  LogOut,
  Menu,
  MailCheck,
  Scale,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { frontendApi } from "@/lib/apiClient";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface NavItem {
  href: string;
  label: string;
  icon: typeof FileText;
  badge?: number;
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, loading } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [counts, setCounts] = useState({ contracts: 0, requests: 0, notifications: 0 });
  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState("");

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) {
      setCounts({ contracts: 0, requests: 0, notifications: 0 });
      return;
    }
    let cancelled = false;
    Promise.allSettled([frontendApi.contracts(), frontendApi.requests(), frontendApi.notifications()]).then((results) => {
      if (cancelled) return;
      const contracts = results[0].status === "fulfilled"
        ? results[0].value.filter((item) => !["issued", "cancelled", "archived"].includes(item.status)).length
        : 0;
      const requests = results[1].status === "fulfilled"
        ? results[1].value.filter((item) => !["completed", "cancelled"].includes(item.status)).length
        : 0;
      const notifications = results[2].status === "fulfilled" ? results[2].value.unreadCount : 0;
      setCounts({ contracts, requests, notifications });
    });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  const navItems = useMemo<NavItem[]>(() => {
    const base: NavItem[] = [
      { href: "/create-contract?mode=self_service", label: "إنشاء عقد", icon: Sparkles },
      { href: "/request-review", label: "مراجعة عقد", icon: Scale },
    ];
    if (!user) return base;
    return [
      ...base,
      { href: "/contracts", label: "عقودي", icon: FileText, badge: counts.contracts },
      { href: "/requests", label: "طلباتي", icon: Scale, badge: counts.requests },
    ];
  }, [counts, user]);

  const active = (href: string) => {
    if (href.startsWith("/#")) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };


  async function resendVerification() {
    setVerificationSending(true);
    setVerificationNotice("");
    try {
      await frontendApi.requestVerification();
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/verify-email?sent=1&next=${encodeURIComponent(next)}`;
      return;
    } catch (caught) {
      setVerificationNotice(caught instanceof Error ? caught.message : "تعذر إرسال رمز التأكيد.");
    } finally {
      setVerificationSending(false);
    }
  }

  async function copyPublicId() {
    if (!user?.publicId) return;
    await navigator.clipboard.writeText(user.publicId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function logout() {
    await frontendApi.logout();
    window.dispatchEvent(new Event("zdraft-auth-changed"));
    window.location.href = "/";
  }

  const navLink = (item: NavItem, mobile = false) => {
    const Icon = item.icon;
    const isActive = active(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => { if (mobile) setMobileOpen(false); }}
        className={`${mobile ? "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[14px]" : "flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px]"} font-black transition-all ${
          isActive
            ? "bg-[#00102e] text-white shadow-md"
            : "text-slate-500 hover:bg-slate-50 hover:text-[#00102e]"
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#d9a84e]" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
        <span className="flex-1">{item.label}</span>
        {!!item.badge && item.badge > 0 && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isActive ? 'bg-[#d9a84e] text-[#00102e]' : 'bg-slate-200 text-slate-700'}`}>{item.badge}</span>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        
        {/* Right side: Logo & Mobile Menu */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#00102e] hover:bg-slate-100 transition lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Z draft" width={140} height={44} className="h-10 w-auto object-contain" priority />
            <div className="hidden sm:block border-r border-slate-200 pr-3">
              <div className="text-[15px] font-black text-[#00102e] leading-tight">Z Draft</div>
              <div className="text-[9px] font-black tracking-widest text-[#986410]">للعقود القانونية</div>
            </div>
          </Link>
        </div>

        {/* Center: Nav links */}
        <nav className="hidden lg:flex items-center gap-2 bg-slate-50/80 p-1.5 rounded-full border border-slate-100">
          {navItems.map((item) => navLink(item))}
        </nav>

        {/* Left side: Auth & Actions */}
        <div className="flex items-center gap-3">
          {!loading && user ? (
            <>
              <Link href="/notifications" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-[#00102e] transition" aria-label="الإشعارات">
                <Bell className="h-5 w-5" />
                {counts.notifications > 0 && (
                  <span className="absolute top-0 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-sm ring-2 ring-white">
                    {counts.notifications}
                  </span>
                )}
              </Link>
              
              <div className="relative">
                <button type="button" onClick={() => setProfileOpen((value) => !value)} className="flex h-11 items-center gap-3 rounded-full bg-slate-50 pl-3 pr-4 text-[13px] font-black text-[#00102e] hover:bg-slate-100 transition" aria-expanded={profileOpen}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00102e] text-white">
                    <UserRound className="h-4 w-4 text-[#d9a84e]" />
                  </div>
                  <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition ${profileOpen ? "rotate-180" : ""}`} />
                </button>
              {profileOpen && (
                <>
                  <button type="button" aria-label="إغلاق قائمة الحساب" className="fixed inset-0 z-40 cursor-default" onClick={() => setProfileOpen(false)} />
                  <div className="absolute left-0 z-50 mt-3 w-64 overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white p-2 text-right shadow-2xl">
                    <div className="px-4 py-4 border-b border-slate-50">
                      <div className="text-[14px] font-black text-[#00102e]">{user.name}</div>
                      <button type="button" onClick={() => void copyPublicId()} className="mt-3 flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 transition">
                        <span>Z-ID <span className="font-mono font-black text-blue-600">{user.publicId}</span></span>
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="p-2 space-y-1">
                      <Link href="/account" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-black text-slate-600 hover:bg-slate-50 hover:text-[#00102e] transition">
                        <UserRound className="h-4 w-4" /> حسابي
                      </Link>
                      <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-black text-red-600 hover:bg-red-50 transition">
                        <LogOut className="h-4 w-4" /> تسجيل الخروج
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            </>
          ) : !loading ? (
            <>
              <Link href="/login" className="hidden items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-black text-slate-500 hover:text-[#00102e] hover:bg-slate-50 transition sm:flex">
                 تسجيل الدخول
              </Link>
              <Link href="/register" className="flex items-center gap-2 rounded-full bg-[#00102e] px-6 py-2.5 text-[12px] font-black text-white hover:bg-[#0a1f4d] transition shadow-lg shadow-[#00102e]/20">
                إنشاء حساب <Sparkles className="h-3.5 w-3.5 text-[#d9a84e]" />
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {user && !user.emailVerified && (
        <div className="bg-amber-50 px-4 py-3 border-t border-amber-100">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-[12px] sm:flex-row sm:items-center">
            <span className="flex items-center gap-2 font-bold text-amber-900">
              <MailCheck className="h-4 w-4 shrink-0 text-amber-600" /> 
              يرجى تأكيد بريدك الإلكتروني لتتمكن من الدفع أو إرسال طلب للمكتب.
            </span>
            <div className="flex items-center gap-3">
              {verificationNotice && <span className="text-[11px] text-amber-700">{verificationNotice}</span>}
              <button type="button" disabled={verificationSending} onClick={() => void resendVerification()} className="rounded-lg bg-amber-600 px-4 py-2 font-black text-white hover:bg-amber-700 transition disabled:opacity-50">
                {verificationSending ? "جاري الإرسال..." : "إرسال رمز التأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="القائمة الرئيسية">
          <button type="button" className="absolute inset-0 bg-[#00102e]/40 backdrop-blur-sm" aria-label="إغلاق القائمة" onClick={() => setMobileOpen(false)} />
          <aside className="absolute bottom-0 right-0 top-0 flex h-dvh w-[min(86vw,22rem)] flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-6">
              <div className="text-[16px] font-black text-[#00102e]">القائمة الرئيسية</div>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="إغلاق القائمة" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-[#00102e] transition"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-6">

            {user && (
              <div className="mb-6 rounded-2xl bg-slate-50 p-5 border border-slate-100">
                <div className="text-[15px] font-black text-[#00102e]">{user.name}</div>
                <button type="button" onClick={copyPublicId} className="mt-3 flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-500 border border-slate-100">
                  <span>Z-ID <span className="font-mono text-blue-600 font-black">{user.publicId}</span></span>
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}

            <nav className="space-y-1.5">{navItems.map((item) => navLink(item, true))}</nav>

            <div className="mt-8 border-t border-slate-100 pt-6">
              {user ? (
                <div className="space-y-2">
                  <Link href="/account" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-black text-slate-600 hover:bg-slate-50 transition">
                    <UserRound className="h-5 w-5" /> حسابي
                  </Link>
                  <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-black text-red-600 hover:bg-red-50 transition">
                    <LogOut className="h-5 w-5" /> تسجيل الخروج
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/login" className="flex justify-center rounded-2xl bg-slate-50 px-4 py-3.5 text-[13px] font-black text-[#00102e] hover:bg-slate-100 transition">
                    تسجيل الدخول
                  </Link>
                  <Link href="/register" className="flex justify-center rounded-2xl bg-[#00102e] px-4 py-3.5 text-[13px] font-black text-[#d9a84e] shadow-lg shadow-[#00102e]/20 hover:bg-[#0a1f4d] transition">
                    إنشاء حساب
                  </Link>
                </div>
              )}
            </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

