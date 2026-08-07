"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Building2, CreditCard, Mail, MessageCircle, Save, Scale, Send, ShieldCheck } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading } from "@/components/admin/PageFeedback";

type Setting = { key: string; value: unknown; isSecret: boolean; updatedAt: string };

export default function SettingsPage() {
  const [items, setItems] = useState<Setting[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try { setItems(await dashboardRequest<Setting[]>("/api/v1/admin/settings")); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر تحميل الإعدادات"); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const map = useMemo(() => Object.fromEntries(items.map((item) => [item.key, item.value])), [items]);
  const current = (key: string, fallback: unknown = "") => map[key] ?? fallback;
  const formKey = items.map((item) => `${item.key}:${item.updatedAt}`).join("|");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const channels = ["office", "zoom", "whatsapp"].filter((value) => form.get(`channel_${value}`) === "on");
    const settings = [
      { key: "office.display_name", value: form.get("office.display_name") ?? "", isSecret: false },
      { key: "office.support_email", value: form.get("office.support_email") ?? "", isSecret: false },
      { key: "office.address", value: form.get("office.address") ?? "", isSecret: false },
      { key: "office.whatsapp_number", value: form.get("office.whatsapp_number") ?? "", isSecret: false },
      { key: "payments.vodafone_cash_number", value: form.get("payments.vodafone_cash_number") ?? "", isSecret: false },
      { key: "contracts.require_email_verification", value: form.get("contracts.require_email_verification") === "on", isSecret: false },
      { key: "contracts.self_service_edit_hours", value: Number(form.get("contracts.self_service_edit_hours")), isSecret: false },
      { key: "services.contract_review.deposit_egp", value: Number(form.get("services.contract_review.deposit_egp")), isSecret: false },
      { key: "services.consultation.deposit_egp", value: Number(form.get("services.consultation.deposit_egp")), isSecret: false },
      { key: "services.contract_drafting.deposit_egp", value: Number(form.get("services.contract_drafting.deposit_egp")), isSecret: false },
      { key: "customer_portal.communication_channels", value: channels, isSecret: false },
      { key: "notifications.whatsapp_mode", value: form.get("notifications.whatsapp_mode") ?? "manual_wa_me", isSecret: false },
      { key: "notifications.web_push_enabled", value: false, isSecret: false },
    ];
    try {
      await dashboardRequest("/api/v1/admin/settings", { method: "PATCH", body: JSON.stringify({ settings }) });
      setMessage("تم حفظ إعدادات المكتب والدفع والخدمات، وسُجلت العملية في سجل التدقيق.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ الإعدادات");
    } finally { setBusy(false); }
  }

  async function sendTestEmail() {
    setTestingEmail(true); setError(""); setMessage("");
    try {
      const result = await dashboardRequest<{ recipient: string; provider: string }>("/api/v1/admin/settings/test-email", { method: "POST" });
      setMessage(`تمت إضافة رسالة اختبار إلى الطابور لإرسالها إلى ${result.recipient} عبر ${result.provider}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إرسال رسالة الاختبار");
    } finally { setTestingEmail(false); }
  }

  if (error && !items.length) return <div className="p-8"><PageError message={error} onRetry={load} /></div>;
  if (!items.length) return <div className="p-8"><PageLoading /></div>;
  const selectedChannels = Array.isArray(current("customer_portal.communication_channels", ["office", "zoom", "whatsapp"])) ? current("customer_portal.communication_channels") as string[] : [];

  return <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-8">
    <header className="border-b border-slate-200 pb-5"><h1 className="text-3xl font-black text-[#00102e]">إعدادات تشغيل المنصة</h1><p className="mt-1 text-sm text-slate-500">الأرقام والعناوين وسياسات الخدمة المستخدمة فعليًا في واجهة العميل والدفع. مفاتيح قاعدة البيانات وApp Password وResend لا تدخل من هنا.</p></header>
    {error && <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
    {message && <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{message}</div>}

    <form key={formKey} onSubmit={save} className="space-y-6">
      <Section icon={Building2} title="هوية المكتب والتواصل" description="تظهر هذه البيانات للعميل وفي كتالوج الخدمات.">
        <Field label="اسم المكتب الظاهر" name="office.display_name" defaultValue={String(current("office.display_name", "Z draft"))} required />
        <Field label="بريد الدعم" name="office.support_email" type="email" defaultValue={String(current("office.support_email", ""))} />
        <Field label="رقم واتساب المكتب" name="office.whatsapp_number" defaultValue={String(current("office.whatsapp_number", ""))} placeholder="مثال: 2010xxxxxxxx" />
        <label className="sm:col-span-2"><span className="mb-2 block text-xs font-black text-slate-600">عنوان المكتب</span><textarea name="office.address" defaultValue={String(current("office.address", ""))} maxLength={500} className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" /></label>
      </Section>

      <Section icon={CreditCard} title="الدفع والعربون" description="القيم التالية تظهر للعميل ويتم التحقق منها في الباك إند عند رفع الإيصال.">
        <Field label="رقم Vodafone Cash" name="payments.vodafone_cash_number" defaultValue={String(current("payments.vodafone_cash_number", ""))} />
        <Field label="عربون صياغة عقد مع محامٍ" name="services.contract_drafting.deposit_egp" type="number" min="0" defaultValue={String(current("services.contract_drafting.deposit_egp", 100))} suffix="ج.م" />
        <Field label="عربون مراجعة عقد" name="services.contract_review.deposit_egp" type="number" min="0" defaultValue={String(current("services.contract_review.deposit_egp", 100))} suffix="ج.م" />
        <Field label="عربون الاستشارة" name="services.consultation.deposit_egp" type="number" min="0" defaultValue={String(current("services.consultation.deposit_egp", 100))} suffix="ج.م" />
      </Section>

      <Section icon={Scale} title="سياسات العقود" description="تُطبق من الباك إند وليست نصوصًا إرشادية فقط.">
        <Field label="مدة تعديل العقد بعد اعتماد الدفع" name="contracts.self_service_edit_hours" type="number" min="1" max="168" defaultValue={String(current("contracts.self_service_edit_hours", 24))} suffix="ساعة" />
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input name="contracts.require_email_verification" type="checkbox" defaultChecked={Boolean(current("contracts.require_email_verification", true))} className="h-5 w-5 accent-[#986410]" /><div><div className="text-xs font-black text-[#00102e]">اشتراط تأكيد البريد</div><div className="mt-1 text-[10px] text-slate-400">قبل الدفع وإنشاء الطلبات الحساسة.</div></div></label>
      </Section>

      <Section icon={MessageCircle} title="قنوات التواصل" description="لا يوجد Chat داخل المنصة أو إرسال واتساب تلقائي في إصدار MVP.">
        <div className="sm:col-span-2"><div className="mb-2 text-xs font-black text-slate-600">القنوات المتاحة للعميل</div><div className="grid gap-3 sm:grid-cols-3">{[["office", "مقابلة بالمكتب"], ["zoom", "Zoom"], ["whatsapp", "واتساب"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-xl border border-slate-200 p-4 text-xs font-black text-slate-700"><input name={`channel_${value}`} type="checkbox" defaultChecked={selectedChannels.includes(value)} className="h-4 w-4 accent-[#986410]" />{label}</label>)}</div></div>
        <label><span className="mb-2 block text-xs font-black text-slate-600">وضع واتساب</span><select name="notifications.whatsapp_mode" defaultValue={String(current("notifications.whatsapp_mode", "manual_wa_me"))} className="w-full rounded-xl border border-slate-200 p-3 text-sm"><option value="manual_wa_me">فتح wa.me يدويًا من الداشبورد</option><option value="disabled">معطل</option></select></label>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><b>ثابت حاليًا:</b> Web Push وWhatsApp Business API غير مفعلين. إشعارات النظام المهمة تدخل Outbox وتُرسل عبر Gmail SMTP أو Resend حسب متغيرات البيئة.</div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><ShieldCheck className="h-5 w-5 text-emerald-600" />الأسرار لا تُرسل من المتصفح ولا تُحفظ في جدول الإعدادات.</div><div className="flex gap-2"><button type="button" onClick={() => void sendTestEmail()} disabled={testingEmail} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black text-[#00102e] disabled:opacity-50"><Send className="h-4 w-4" />{testingEmail ? "جاري الإضافة..." : "إرسال بريد اختبار"}</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-6 py-3 text-xs font-black text-[#d5a84c]"><Save className="h-4 w-4" />{busy ? "جاري الحفظ..." : "حفظ الإعدادات"}</button></div></div>
    </form>
  </div>;
}

function Section({ icon: Icon, title, description, children }: { icon: typeof Mail; title: string; description: string; children: ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-[#986410]/10 p-2 text-[#986410]"><Icon className="h-5 w-5" /></div><div><h2 className="font-black text-[#00102e]">{title}</h2><p className="mt-1 text-[10px] leading-5 text-slate-400">{description}</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{children}</div></section>; }
function Field({ label, name, type = "text", defaultValue, required = false, min, max, placeholder, suffix }: { label: string; name: string; type?: string; defaultValue: string; required?: boolean; min?: string; max?: string; placeholder?: string; suffix?: string }) { return <label><span className="mb-2 block text-xs font-black text-slate-600">{label}</span><div className="relative"><input name={name} type={type} defaultValue={defaultValue} required={required} min={min} max={max} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />{suffix && <span className="absolute left-3 top-3.5 text-[10px] font-bold text-slate-400">{suffix}</span>}</div><span className="mt-1 block font-mono text-[9px] text-slate-300">{name}</span></label>; }
