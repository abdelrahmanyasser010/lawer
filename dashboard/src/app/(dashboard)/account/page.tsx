"use client";

import { useEffect, useState } from "react";
import { KeyRound, Laptop2, LogOut, Save, ShieldCheck, Smartphone } from "lucide-react";
import { getCurrentStaff } from "@/lib/adminAccess";
import { dashboardApi, DashboardApiError } from "@/lib/apiClient";
import { passwordValidationError } from "@/lib/inputValidation";

type SessionRow = {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string;
  lastSeenAt?: string | null;
  expiresAt?: string;
  current?: boolean;
};

function deviceLabel(userAgent?: string) {
  const ua = userAgent || "";
  const device = /Android|iPhone|iPad/i.test(ua) ? "هاتف / جهاز لوحي" : "كمبيوتر";
  const browser = /Firefox/i.test(ua) ? "Firefox" : /Edg/i.test(ua) ? "Edge" : /Chrome/i.test(ua) ? "Chrome" : /Safari/i.test(ua) ? "Safari" : "متصفح";
  return `${device} · ${browser}`;
}

export default function AccountPage() {
  const staff = getCurrentStaff();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadSessions() {
    try { setSessions(await dashboardApi.sessions() as SessionRow[]); }
    catch (caught) { setError(caught instanceof DashboardApiError ? caught.message : "تعذر تحميل الجلسات"); }
  }
  useEffect(() => { void loadSessions(); }, []);

  async function changePassword() {
    setNotice(null); setError(null);
    const passwordError=passwordValidationError(newPassword); if(passwordError){setError(passwordError);return;}
    if (newPassword !== confirmPassword) { setError("تأكيد كلمة المرور غير مطابق."); return; }
    setLoading(true);
    try {
      await dashboardApi.changePassword(currentPassword, newPassword);
      setNotice("تم تغيير كلمة المرور وإلغاء الجلسات الأخرى.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      await loadSessions();
    } catch (caught) { setError(caught instanceof DashboardApiError ? caught.message : "تعذر تغيير كلمة المرور"); }
    finally { setLoading(false); }
  }

  async function revoke(id: string) {
    setNotice(null); setError(null);
    try { await dashboardApi.revokeSession(id); setNotice("تم إلغاء الجلسة."); await loadSessions(); }
    catch (caught) { setError(caught instanceof DashboardApiError ? caught.message : "تعذر إلغاء الجلسة"); }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div><h1 className="text-2xl font-black text-[#00102e]">حسابي والأمان</h1><p className="mt-1 text-xs font-semibold text-slate-500">إعدادات الحساب الشخصي والجلسات الفعلية المرتبطة بحسابك.</p></div>
      {notice && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-900">{notice}</div>}
      {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700">{error}</div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00102e] text-sm font-black text-[#986410]">{staff.name[0]}</div><div><h2 className="text-sm font-black text-[#00102e]">{staff.name}</h2><p className="text-[10px] font-bold text-slate-400">{staff.email} · {staff.roleLabel}</p></div></div>
          <div className="mt-5 space-y-3">
            <label className="block"><span className="mb-1 block text-xs font-black text-slate-700">كلمة المرور الحالية</span><input type="password" value={currentPassword} onChange={(event)=>setCurrentPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-[#986410]" /></label>
            <label className="block"><span className="mb-1 block text-xs font-black text-slate-700">كلمة المرور الجديدة</span><input type="password" minLength={8} maxLength={128} value={newPassword} onChange={(event)=>setNewPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-[#986410]" /></label>
            <label className="block"><span className="mb-1 block text-xs font-black text-slate-700">تأكيد كلمة المرور</span><input type="password" minLength={8} maxLength={128} value={confirmPassword} onChange={(event)=>setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-[#986410]" /></label>
          </div>
          <button type="button" disabled={loading || !currentPassword || !newPassword || !confirmPassword} onClick={() => void changePassword()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Save className="h-4 w-4 text-[#986410]" /> {loading ? "جاري الحفظ..." : "تغيير كلمة المرور"}</button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#986410]" /><h2 className="text-sm font-black text-[#00102e]">الجلسات والأجهزة</h2></div>
          <div className="mt-4 space-y-3">
            {sessions.map((session) => {
              const MobileIcon = /Android|iPhone|iPad/i.test(session.userAgent || "") ? Smartphone : Laptop2;
              return <div key={session.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${session.current ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><div className="flex items-center gap-3"><MobileIcon className={`h-5 w-5 ${session.current ? "text-emerald-700" : "text-slate-500"}`} /><div><div className={`text-xs font-black ${session.current ? "text-emerald-900" : "text-slate-800"}`}>{deviceLabel(session.userAgent)}</div><div className="text-[10px] font-bold text-slate-400">{session.ipAddress || "IP غير متاح"} · {session.lastSeenAt ? new Date(session.lastSeenAt).toLocaleString("ar-EG") : "نشاط غير مسجل"}</div></div></div>{session.current ? <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-emerald-700">حالي</span> : <button type="button" onClick={()=>void revoke(session.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[10px] font-black text-rose-700"><LogOut className="h-3.5 w-3.5" /> إلغاء</button>}</div>;
            })}
            {sessions.length === 0 && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">لا توجد جلسات فعالة ظاهرة.</div>}
          </div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold leading-6 text-amber-900"><KeyRound className="ml-1 inline h-4 w-4" />الأساس مجهز لإضافة 2FA لاحقًا لحساب السوبر أدمن دون تغيير نظام الجلسات.</div>
        </section>
      </div>
    </div>
  );
}
