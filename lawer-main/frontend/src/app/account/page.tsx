"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Save, ShieldCheck, Smartphone } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { apiRequest, ApiClientError, frontendApi } from "@/lib/apiClient";
import type { CustomerProfile } from "@/types/customer";
import { formatDate } from "@/lib/labels";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
import { normalizePhoneInput, passwordValidationError, phoneValidationError } from "@/lib/inputValidation";

interface SessionItem {
  id: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  lastSeenAt?: string | null;
  expiresAt: string;
  current: boolean;
}

export default function AccountPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [loadedProfile, loadedSessions] = await Promise.all([
        frontendApi.profile(),
        apiRequest<SessionItem[]>("/api/v1/auth/sessions"),
      ]);
      setProfile(loadedProfile);
      setSessions(loadedSessions);
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 401 ? "سجل الدخول لفتح حسابك." : caught instanceof Error ? caught.message : "تعذر تحميل الحساب");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    if (!profile) return;
    const phoneError = profile.phone ? phoneValidationError(profile.phone, false) : "";
    const whatsappError = profile.whatsappNumber ? phoneValidationError(profile.whatsappNumber, false) : "";
    if (phoneError || whatsappError) { setError(phoneError || whatsappError); return; }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await frontendApi.updateProfile({
        name: profile.name,
        phone: profile.phone,
        whatsappNumber: profile.whatsappNumber,
        companyName: profile.companyName,
      });
      setProfile((current) => current ? { ...current, ...updated } : updated);
      setNotice("تم تحديث بيانات الحساب.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ البيانات");
    } finally {
      setSaving(false);
    }
  }

  async function revoke(id: number) {
    await apiRequest(`/api/v1/auth/sessions/${id}`, { method: "DELETE" });
    setSessions((items) => items.filter((item) => item.id !== id));
  }


  async function changePassword() {
    setError("");
    setNotice("");
    const passwordError = passwordValidationError(passwords.next); if (passwordError) return setError(passwordError);
    if (passwords.next !== passwords.confirm) return setError("تأكيد كلمة المرور غير مطابق.");
    setChangingPassword(true);
    try {
      await apiRequest("/api/v1/auth/password/change", {
        method: "POST",
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }),
      });
      setPasswords({ current: "", next: "", confirm: "" });
      setNotice("تم تغيير كلمة المرور وإنهاء الجلسات الأخرى.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تغيير كلمة المرور");
    } finally {
      setChangingPassword(false);
    }
  }

  async function copyId() {
    if (!profile) return;
    await navigator.clipboard.writeText(profile.publicId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-9 sm:px-6">
        <header className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-black text-[#00102e]">حسابي</h1>
          <p className="mt-2 text-sm text-slate-600">بيانات التواصل وأمان الحساب والأجهزة المسجل عليها الدخول.</p>
        </header>

        {loading ? <div className="mt-8 rounded-2xl border bg-white p-14"><Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-700" /></div> : !profile ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center font-bold text-amber-900">{error}</div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-black text-[#00102e]">البيانات الأساسية</h2>
              {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
              {notice && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{notice}</div>}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-black text-slate-700">الاسم الكامل<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#986410]" /></label>
                <label className="text-xs font-black text-slate-700">البريد الإلكتروني<input value={profile.email} readOnly className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500" /></label>
                <label className="text-xs font-black text-slate-700">رقم الهاتف<input value={profile.phone || ""} onChange={(event) => setProfile({ ...profile, phone: normalizePhoneInput(event.target.value) })} dir="ltr" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-left text-sm outline-none focus:border-[#986410]" /></label>
                <label className="text-xs font-black text-slate-700">رقم WhatsApp<input value={profile.whatsappNumber || ""} onChange={(event) => setProfile({ ...profile, whatsappNumber: normalizePhoneInput(event.target.value) })} dir="ltr" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-left text-sm outline-none focus:border-[#986410]" /></label>
                {profile.accountType === "business" && <label className="text-xs font-black text-slate-700 sm:col-span-2">اسم الشركة<input value={profile.companyName || ""} onChange={(event) => setProfile({ ...profile, companyName: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#986410]" /></label>}
              </div>
              <button type="button" disabled={saving} onClick={() => void save()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> حفظ التغييرات</button>
            </section>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <div className="flex items-center gap-2 text-emerald-900"><ShieldCheck className="h-5 w-5" /><h2 className="font-black">رقم حسابك</h2></div>
                <button type="button" onClick={() => void copyId()} className="mt-4 flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-white px-4 py-3"><span className="font-mono text-lg font-black text-emerald-900">{profile.publicId}</span>{copied ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4 text-emerald-700" />}</button>
                <p className="mt-2 text-[11px] leading-5 text-emerald-800">يُستخدم عند مشاركة عقد مع مستخدم مسجل. لا تشارك كلمة المرور أو رموز الدخول.</p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-[#986410]" /><h2 className="font-black text-[#00102e]">تغيير كلمة المرور</h2></div>
                <div className="mt-4 space-y-3">
                  <input type="password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} placeholder="كلمة المرور الحالية" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#986410]" />
                  <input type="password" minLength={8} maxLength={128} value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} placeholder="كلمة المرور الجديدة" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#986410]" />
                  <input type="password" maxLength={128} value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} placeholder="تأكيد كلمة المرور الجديدة" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#986410]" />
                  <PasswordRequirements value={passwords.next} />
                  <button type="button" disabled={changingPassword || !passwords.current || !passwords.next || !passwords.confirm} onClick={() => void changePassword()} className="w-full rounded-xl border border-[#986410] px-4 py-2.5 text-xs font-black text-[#986410] disabled:opacity-50">{changingPassword ? "جاري التغيير..." : "حفظ كلمة المرور الجديدة"}</button>
                </div>
              </section>
            </aside>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
              <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-blue-700" /><h2 className="font-black text-[#00102e]">الأجهزة المسجل عليها الدخول</h2></div>
              <div className="mt-4 space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                    <div><div className="text-xs font-black text-slate-800">{session.current ? "الجلسة الحالية" : "جلسة أخرى"}</div><div className="mt-1 text-[11px] text-slate-500">{session.ipAddress || "عنوان غير متاح"} · آخر نشاط {formatDate(session.lastSeenAt || session.createdAt)}</div><div className="mt-1 truncate text-[10px] text-slate-400">{session.userAgent || "جهاز غير معروف"}</div></div>
                    {!session.current && <button type="button" onClick={() => void revoke(session.id)} className="rounded-xl border border-red-200 px-4 py-2 text-xs font-black text-red-700">إنهاء الجلسة</button>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
