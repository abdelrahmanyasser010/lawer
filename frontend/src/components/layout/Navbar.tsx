"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
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
  const [counts, setCounts] = useState({ contracts: 0, requests: 0, notifications: 0 });
  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState("");

  useEffect(() => {
    setMobileOpen(false);
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

  const navItems = useMemo<NavItem[]>(() => {
    const base: NavItem[] = [
      { href: "/#templates", label: "إنشاء عقد", icon: Sparkles },
      { href: "/#consultation", label: "خدمات المحامي", icon: Scale },
    ];
    if (!user) return base;
    return [
      ...base,
      { href: "/contracts", label: "عقودي", icon: FileText, badge: counts.contracts },
      { href: "/requests", label: "طلباتي", icon: Scale, badge: counts.requests },
      { href: "/notifications", label: "الإشعارات", icon: Bell, badge: counts.notifications },
    ];
  }, [counts, user]);

  const active = (href: string) => {
    if (href.startsWith("/#")) return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };


  async function resendVerification() {
    setVerificationSending(true);
    setVerificationNotice("");
    try {
      await frontendApi.requestVerification();
      setVerificationNotice("تم إرسال رمز التأكيد إلى بريدك.");
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
        className={`${mobile ? "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm" : "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs"} font-extrabold transition-all ${
          isActive
            ? "border-[#986410]/30 bg-[#986410]/10 text-[#00102e]"
            : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-[#00102e]"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {!!item.badge && item.badge > 0 && (
          <span className="rounded-full bg-[#00102e] px-2 py-0.5 text-[10px] font-black text-white">{item.badge}</span>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-3 px-3 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-[#00102e] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Z draft" width={140} height={44} className="h-11 w-auto object-contain" priority />
            <div className="hidden sm:block">
              <div className="text-base font-black text-[#00102e]">Z draft</div>
              <div className="text-[10px] font-bold text-[#986410]">عقود وخدمات قانونية</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">{navItems.map((item) => navLink(item))}</nav>
        </div>

        <div className="flex items-center gap-2">
          {!loading && user ? (
            <>
              <button
                type="button"
                onClick={copyPublicId}
                className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 sm:flex"
                title="نسخ رقم الحساب"
              >
                <span className="text-[10px] text-slate-400">Z-ID</span>
                <span className="font-mono text-blue-700">{user.publicId}</span>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <Link href="/account" className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-[#00102e]">
                <UserRound className="h-4 w-4" />
                <span className="hidden md:inline">{user.name.split(" ")[0]}</span>
              </Link>
              <button type="button" onClick={() => void logout()} aria-label="تسجيل الخروج" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-red-600">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : !loading ? (
            <>
              <Link href="/login" className="hidden items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-[#00102e] sm:flex">
                <LogIn className="h-4 w-4" /> تسجيل الدخول
              </Link>
              <Link href="/register" className="rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-[#986410]">إنشاء حساب</Link>
            </>
          ) : null}
        </div>
      </div>


      {user && !user.emailVerified && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-950">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 text-xs sm:flex-row sm:items-center">
            <span className="flex items-center gap-2 font-bold"><MailCheck className="h-4 w-4 shrink-0" /> أكد بريدك قبل حفظ عقد أو إرسال طلب للمكتب.</span>
            <div className="flex items-center gap-3">
              {verificationNotice && <span className="text-[11px]">{verificationNotice}</span>}
              <button type="button" disabled={verificationSending} onClick={() => void resendVerification()} className="rounded-lg bg-amber-700 px-3 py-1.5 font-black text-white disabled:opacity-50">{verificationSending ? "جاري الإرسال..." : "إرسال رمز التأكيد"}</button>
            </div>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-[#00102e]/50" aria-label="إغلاق القائمة" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-[min(88vw,23rem)] overflow-y-auto bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="font-black text-[#00102e]">القائمة</div>
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-xl bg-slate-100 p-2"><X className="h-4 w-4" /></button>
            </div>

            {user && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-black text-[#00102e]">{user.name}</div>
                <button type="button" onClick={copyPublicId} className="mt-2 flex items-center gap-2 text-xs font-bold text-blue-700">
                  <span className="font-mono">{user.publicId}</span>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}

            <nav className="mt-4 space-y-2">{navItems.map((item) => navLink(item, true))}</nav>

            <div className="mt-5 border-t border-slate-200 pt-4">
              {user ? (
                <div className="space-y-2">
                  <Link href="/account" className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black"><UserRound className="h-4 w-4" /> حسابي</Link>
                  <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-black text-red-700"><LogOut className="h-4 w-4" /> تسجيل الخروج</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-black">تسجيل الدخول</Link>
                  <Link href="/register" className="rounded-xl bg-[#00102e] px-4 py-3 text-center text-sm font-black text-[#986410]">إنشاء حساب</Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
