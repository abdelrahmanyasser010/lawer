"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Mail, MailWarning, RefreshCw, ShieldCheck } from "lucide-react";
import { frontendApi, ApiClientError } from "@/lib/apiClient";

type ViewState = "waiting" | "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<ViewState>("waiting");
  const [message, setMessage] = useState("أرسلنا رمزًا من 6 أرقام إلى بريدك الإلكتروني. الرمز صالح لمدة 10 دقائق.");
  const [resending, setResending] = useState(false);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setState("error");
      setMessage("أدخل رمز التأكيد المكوّن من 6 أرقام.");
      return;
    }
    setState("loading");
    setMessage("جاري التحقق من الرمز...");
    try {
      await frontendApi.verifyEmail(code);
      setState("success");
      setMessage("تم تأكيد بريدك الإلكتروني بنجاح.");
      window.dispatchEvent(new Event("zdraft-auth-changed"));
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof ApiClientError ? caught.message : "تعذر تأكيد البريد.");
    }
  }

  async function resend() {
    setResending(true);
    try {
      const result = await frontendApi.requestVerification();
      if (result.alreadyVerified) {
        setState("success");
        setMessage("البريد الإلكتروني مؤكد بالفعل.");
      } else {
        setCode("");
        setState("waiting");
        setMessage(`تم إرسال رمز جديد. صلاحيته ${result.expiresMinutes ?? 10} دقائق. راجع البريد الوارد والرسائل غير المرغوب فيها.`);
      }
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "تعذر إعادة إرسال الرمز.");
    } finally {
      setResending(false);
    }
  }

  const Icon = state === "loading" ? Loader2 : state === "success" ? CheckCircle2 : state === "error" ? MailWarning : Mail;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4" dir="rtl">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Icon className={`mx-auto h-12 w-12 ${state === "loading" ? "animate-spin text-[#986410]" : state === "success" ? "text-emerald-600" : state === "error" ? "text-red-600" : "text-blue-600"}`} />
        <h1 className="mt-5 text-xl font-black text-[#00102e]">تأكيد البريد الإلكتروني</h1>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">{message}</p>

        {state !== "success" && (
          <form onSubmit={verify} className="mt-6 space-y-4">
            <label className="block text-right text-xs font-black text-slate-700">رمز التأكيد
              <div className="relative mt-2">
                <ShieldCheck className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  maxLength={6}
                  placeholder="000000"
                  className="w-full rounded-2xl border border-slate-300 py-3.5 pl-4 pr-12 text-center text-2xl font-black tracking-[.4em] text-[#00102e] outline-none focus:border-[#986410]"
                />
              </div>
            </label>
            <button type="submit" disabled={state === "loading" || code.length !== 6} className="inline-flex w-full items-center justify-center rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-white disabled:opacity-50">
              {state === "loading" ? "جاري التحقق..." : "تأكيد البريد"}
            </button>
          </form>
        )}

        <div className="mt-5 space-y-3">
          {state === "success" ? (
            <Link href="/contracts" className="inline-flex rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-white">الانتقال إلى حسابي</Link>
          ) : (
            <button type="button" disabled={resending || state === "loading"} onClick={() => void resend()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black text-[#00102e] disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} /> إعادة إرسال الرمز
            </button>
          )}
          <div><Link href="/login" className="text-xs font-bold text-[#986410]">العودة لتسجيل الدخول</Link></div>
        </div>
      </section>
    </main>
  );
}
