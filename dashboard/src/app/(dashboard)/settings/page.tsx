"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  LayoutDashboard,
  MessageCircle,
  Plus,
  Save,
  Scale,
  ShieldCheck,
  Trash2,
  FileText,
} from "lucide-react";
import { DashboardApiError, dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading } from "@/components/admin/PageFeedback";
import LegalContentSettings from "@/components/admin/LegalContentSettings";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { TimePickerInput } from "@/components/ui/TimePickerInput";

type Setting = { key: string; value: unknown; isSecret: boolean; updatedAt: string };
type WindowRow = {
  id?: number;
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  totalCapacity: number;
  zoomCapacity: number;
  whatsappCapacity: number;
  isActive: boolean;
};
type ScheduleException = {
  id: number;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  isClosed: boolean;
  reason?: string | null;
};
type SchedulePayload = { timezone: string; windows: WindowRow[]; exceptions: ScheduleException[] };
type Toast = { kind: "success" | "error"; text: string } | null;

type TabKey = "all" | "office" | "policies" | "schedule" | "legal";

const dayLabels: Record<number, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};
const dayOrder = [6, 0, 1, 2, 3, 4, 5];

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function asText(value: FormDataEntryValue | null) {
  return String(value ?? "");
}
function asNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function SettingsPage() {
  const [items, setItems] = useState<Setting[]>([]);
  const [initialError, setInitialError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [schedule, setSchedule] = useState<SchedulePayload | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [blockDate, setBlockDate] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const loadSettings = useCallback(async () => {
    setInitialError("");
    try {
      setItems(await dashboardRequest<Setting[]>("/api/v1/admin/settings"));
    } catch (caught) {
      setInitialError(caught instanceof Error ? caught.message : "تعذر تحميل الإعدادات");
    }
  }, []);

  const loadSchedule = useCallback(async () => {
    setScheduleError("");
    try {
      setSchedule(await dashboardRequest<SchedulePayload>("/api/v1/admin/review-schedule"));
    } catch (caught) {
      setScheduleError(
        caught instanceof Error ? caught.message : "تعذر تحميل جدول مواعيد المراجعة والاستشارة"
      );
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadSettings(), loadSchedule()]);
  }, [loadSettings, loadSchedule]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const map = useMemo(() => Object.fromEntries(items.map((item) => [item.key, item.value])), [items]);
  const current = (key: string, fallback: unknown = "") => map[key] ?? fallback;
  const rawSelectedChannels = current("customer_portal.communication_channels", ["zoom", "whatsapp"]);
  const selectedChannels = Array.isArray(rawSelectedChannels) ? (rawSelectedChannels as string[]) : [];
  const formKey = items.map((item) => `${item.key}:${item.updatedAt}`).join("|");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFieldError({});
    setToast(null);
    const form = new FormData(event.currentTarget);
    const channels = ["zoom", "whatsapp"].filter((value) => form.get(`channel_${value}`) === "on");
    const candidates = [
      { key: "office.display_name", value: asText(form.get("office.display_name")), isSecret: false },
      { key: "office.support_email", value: asText(form.get("office.support_email")), isSecret: false },
      { key: "office.address", value: asText(form.get("office.address")), isSecret: false },
      {
        key: "office.review_whatsapp_number",
        value: asText(form.get("office.review_whatsapp_number")),
        isSecret: false,
      },
      {
        key: "office.support_whatsapp_number",
        value: asText(form.get("office.support_whatsapp_number")),
        isSecret: false,
      },
      { key: "office.support_phone", value: asText(form.get("office.support_phone")), isSecret: false },
      {
        key: "contracts.self_service_edit_hours",
        value: asNumber(form.get("contracts.self_service_edit_hours"), 24),
        isSecret: false,
      },
      { key: "customer_portal.communication_channels", value: channels, isSecret: false },
      {
        key: "notifications.whatsapp_mode",
        value: asText(form.get("notifications.whatsapp_mode")) || "manual_wa_me",
        isSecret: false,
      },
      { key: "notifications.web_push_enabled", value: false, isSecret: false },
    ];
    const settings = candidates.filter(
      (item) => !same(item.value, current(item.key, item.key === "notifications.web_push_enabled" ? false : ""))
    );
    if (!settings.length) {
      setBusy(false);
      setToast({ kind: "success", text: "لا توجد تغييرات جديدة للحفظ." });
      return;
    }
    try {
      await dashboardRequest("/api/v1/admin/settings", { method: "PATCH", body: JSON.stringify({ settings }) });
      setToast({ kind: "success", text: "تم حفظ الإعدادات بنجاح." });
      await loadSettings();
    } catch (caught) {
      const apiError = caught instanceof DashboardApiError ? caught : null;
      const details = apiError?.details as { settingKey?: string } | undefined;
      if (details?.settingKey) setFieldError({ [details.settingKey]: apiError?.message || "قيمة غير صحيحة" });
      setToast({ kind: "error", text: caught instanceof Error ? caught.message : "تعذر حفظ الإعدادات" });
    } finally {
      setBusy(false);
    }
  }

  function updateWindow(index: number, patch: Partial<WindowRow>) {
    setSchedule((old) =>
      old
        ? {
            ...old,
            windows: old.windows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
          }
        : old
    );
  }

  function addWindow(weekday: number) {
    setSchedule((old) =>
      old
        ? {
            ...old,
            windows: [
              ...old.windows,
              {
                weekday,
                startTime: "09:00",
                endTime: "17:00",
                slotMinutes: 60,
                totalCapacity: 10,
                zoomCapacity: 5,
                whatsappCapacity: 5,
                isActive: true,
              },
            ],
          }
        : old
    );
  }

  function removeWindow(index: number) {
    setSchedule((old) =>
      old ? { ...old, windows: old.windows.filter((_, i) => i !== index) } : old
    );
  }

  function copyDayToOthers(weekday: number) {
    setSchedule((old) => {
      if (!old) return old;
      const source = old.windows.filter((row) => row.weekday === weekday);
      if (!source.length) {
        setToast({ kind: "error", text: "أضف فترة واحدة على الأقل لهذا اليوم قبل النسخ." });
        return old;
      }
      const untouched = old.windows.filter((row) => row.weekday === weekday);
      const copies = dayOrder
        .filter((day) => day !== weekday)
        .flatMap((day) => source.map((row) => ({ ...row, id: undefined, weekday: day })));
      setToast({
        kind: "success",
        text: `تم نسخ إعدادات ${dayLabels[weekday]} إلى باقي الأيام. اضغط "حفظ الجدول" لتأكيد التغيير.`,
      });
      return { ...old, windows: [...untouched, ...copies] };
    });
  }

  async function saveSchedule() {
    if (!schedule) return;
    const invalidCapacity = schedule.windows.find(
      (row) => row.zoomCapacity + row.whatsappCapacity > row.totalCapacity
    );
    if (invalidCapacity) {
      const message = "مجموع سعة Zoom وواتساب يجب ألا يتجاوز السعة الإجمالية للفترة.";
      setScheduleError(message);
      setToast({ kind: "error", text: message });
      return;
    }
    setScheduleBusy(true);
    setScheduleError("");
    setToast(null);
    try {
      await dashboardRequest("/api/v1/admin/review-schedule", {
        method: "PUT",
        body: JSON.stringify({ windows: schedule.windows.map(({ id: _, ...row }) => row) }),
      });
      setToast({ kind: "success", text: "تم حفظ جدول مواعيد المراجعة والاستشارة والسعة بنجاح." });
      await loadSchedule();
    } catch (caught) {
      setScheduleError(
        caught instanceof Error ? caught.message : "تعذر حفظ جدول مواعيد المراجعة والاستشارة"
      );
      setToast({
        kind: "error",
        text: caught instanceof Error ? caught.message : "تعذر حفظ جدول مواعيد المراجعة والاستشارة",
      });
    } finally {
      setScheduleBusy(false);
    }
  }

  async function addBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blockDate) return;
    setScheduleBusy(true);
    setScheduleError("");
    try {
      await dashboardRequest("/api/v1/admin/review-schedule/exceptions", {
        method: "POST",
        body: JSON.stringify({
          date: blockDate,
          startTime: blockStart || null,
          endTime: blockEnd || null,
          reason: blockReason || null,
        }),
      });
      setBlockDate("");
      setBlockStart("");
      setBlockEnd("");
      setBlockReason("");
      setToast({ kind: "success", text: "تمت إضافة الإغلاق الاستثنائي بنجاح." });
      await loadSchedule();
    } catch (caught) {
      setScheduleError(caught instanceof Error ? caught.message : "تعذر إضافة الإغلاق الاستثنائي");
      setToast({
        kind: "error",
        text: caught instanceof Error ? caught.message : "تعذر إضافة الإغلاق الاستثنائي",
      });
    } finally {
      setScheduleBusy(false);
    }
  }

  async function deleteBlock(id: number) {
    setScheduleBusy(true);
    try {
      await dashboardRequest(`/api/v1/admin/review-schedule/exceptions/${id}`, { method: "DELETE" });
      setToast({ kind: "success", text: "تم حذف الإغلاق الاستثنائي." });
      await loadSchedule();
    } catch (caught) {
      setToast({
        kind: "error",
        text: caught instanceof Error ? caught.message : "تعذر حذف الإغلاق الاستثنائي",
      });
    } finally {
      setScheduleBusy(false);
    }
  }

  if (initialError && !items.length) {
    return (
      <div className="p-8">
        <PageError message={initialError} onRetry={loadSettings} />
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="p-8">
        <PageLoading label="جاري تحميل إعدادات المنصة..." />
      </div>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Building2 }> = [
    { key: "all", label: "جميع الأقسام", icon: LayoutDashboard },
    { key: "office", label: "هوية وبيانات المكتب", icon: Building2 },
    { key: "policies", label: "سياسات العقود والقنوات", icon: Scale },
    { key: "schedule", label: "جدول مواعيد المراجعة", icon: CalendarClock },
    { key: "legal", label: "المحتوى القانوني", icon: FileText },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-8">
      {/* Header */}
      <header className="border-b border-slate-200 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#00102e]">إعدادات تشغيل المنصة</h1>
            <p className="mt-1 text-sm text-slate-500">
              بيانات المكتب وسياسات التشغيل والمحتوى القانوني. أسعار الخدمات تُدار من صفحة الأسعار، والدفع الإلكتروني من صفحة المدفوعات.
            </p>
          </div>
          <Link
            href="/audit"
            className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-[#00102e] underline decoration-slate-300 underline-offset-4 shrink-0 transition"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            سجل العمليات والأمان
          </Link>
        </div>

        {/* Section Filter Tabs */}
        <div className="no-scrollbar mt-5 flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs transition-all duration-150 active:scale-95 ${
                  active
                    ? "border border-[#d7a94f]/30 bg-[#00102e] font-extrabold text-[#d7a94f] shadow-xs"
                    : "border border-slate-200/90 bg-white font-bold text-slate-700 hover:bg-slate-50 hover:text-[#00102e]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? "text-[#d7a94f]" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Settings Form (Office & Policies) */}
      {(activeTab === "all" || activeTab === "office" || activeTab === "policies") && (
        <form key={formKey} onSubmit={save} className="space-y-6">
          {(activeTab === "all" || activeTab === "office") && (
            <Section
              icon={Building2}
              title="هوية المكتب وبيانات التواصل"
              description="تظهر هذه البيانات للعميل في الهيدر والفوتر وكتالوج الخدمات وفواتير العقود."
            >
              <Field
                error={fieldError["office.display_name"]}
                label="اسم المكتب الظاهر"
                name="office.display_name"
                defaultValue={String(current("office.display_name", "Z draft"))}
                placeholder="اسم المكتب أو الشركة"
                required
              />
              <Field
                error={fieldError["office.support_email"]}
                label="بريد الدعم الفني والمراسلات"
                name="office.support_email"
                type="email"
                defaultValue={String(current("office.support_email", ""))}
                placeholder="support@example.com"
              />
              <Field
                error={fieldError["office.support_phone"]}
                label="هاتف الدعم والمكتب"
                name="office.support_phone"
                defaultValue={String(current("office.support_phone", ""))}
                placeholder="مثال: 010xxxxxxxx"
              />
              <Field
                error={fieldError["office.review_whatsapp_number"]}
                label="واتساب مراجعة العقود (المحامين)"
                name="office.review_whatsapp_number"
                defaultValue={String(
                  current("office.review_whatsapp_number", current("office.whatsapp_number", ""))
                )}
                placeholder="مثال: 2010xxxxxxxx"
              />
              <Field
                error={fieldError["office.support_whatsapp_number"]}
                label="واتساب الدعم الفني وخدمة العملاء"
                name="office.support_whatsapp_number"
                defaultValue={String(
                  current("office.support_whatsapp_number", current("office.whatsapp_number", ""))
                )}
                placeholder="مثال: 2010xxxxxxxx"
              />
              <label className="sm:col-span-2 block">
                <span className="mb-2 block text-xs font-black text-slate-700">عنوان المقر الفعلي للمكتب</span>
                <textarea
                  name="office.address"
                  defaultValue={String(current("office.address", ""))}
                  maxLength={500}
                  placeholder="العنوان بالكامل يظهر في أسفل وثائق العقود الرسمية وتواصل العملاء"
                  className="min-h-24 w-full rounded-xl border border-slate-300 bg-slate-50/60 p-3 text-sm font-medium text-[#00102e] outline-none transition hover:border-slate-400 focus:bg-white focus:border-[#00102e] focus:ring-2 focus:ring-[#00102e]/10"
                />
                {fieldError["office.address"] && <FieldError text={fieldError["office.address"]} />}
              </label>
            </Section>
          )}

          {(activeTab === "all" || activeTab === "policies") && (
            <>
              <Section
                icon={Scale}
                title="سياسات تشغيل العقود"
                description="تنطبق مدة التعديل التالية على عقود الإعداد الذاتي بعد سداد القيمة."
              >
                <Field
                  error={fieldError["contracts.self_service_edit_hours"]}
                  label="مدة تعديل عقد الإعداد الذاتي بعد اعتماد الدفع"
                  name="contracts.self_service_edit_hours"
                  numeric
                  min={1}
                  max={168}
                  defaultValue={String(current("contracts.self_service_edit_hours", 24))}
                  suffix="ساعة"
                />
                <div className="flex items-center gap-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-950">تأكيد البريد الإلكتروني إلزامي</div>
                    <div className="mt-0.5 text-xs leading-5 text-emerald-800 font-medium">
                      مطلوب قبل الدفع وإنشاء الطلبات الحساسة لحماية حسابات العملاء.
                    </div>
                  </div>
                </div>
              </Section>

              <Section
                icon={MessageCircle}
                title="قنوات مناقشة ومراجعة العقود"
                description="حدد القنوات التي يتاح للعميل الاختيار من بينها عند حجز جلسة استشارة مع المحامي."
              >
                <div className="sm:col-span-2">
                  <div className="mb-2 text-xs font-black text-slate-700">القنوات المتاحة للعميل</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["zoom", "جلسة مرئية عبر Zoom"],
                      ["whatsapp", "محادثة نصية وصوتية عبر واتساب"],
                    ].map(([value, label]) => (
                      <label
                        key={value}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-xs font-black text-[#00102e] shadow-2xs cursor-pointer hover:border-[#986410]/40 transition"
                      >
                        <input
                          name={`channel_${value}`}
                          type="checkbox"
                          defaultChecked={selectedChannels.includes(value)}
                          className="h-4 w-4 accent-[#986410] rounded"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  {fieldError["customer_portal.communication_channels"] && (
                    <FieldError text={fieldError["customer_portal.communication_channels"]} />
                  )}
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-700">وضع استخدام واتساب</span>
                  <select
                    name="notifications.whatsapp_mode"
                    defaultValue={String(current("notifications.whatsapp_mode", "manual_wa_me"))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-[#00102e] outline-none transition focus:border-[#00102e] focus:ring-2 focus:ring-[#986410]/20"
                  >
                    <option value="manual_wa_me">فتح محادثة واتساب المباشرة عند الحاجة</option>
                    <option value="disabled">معطل مؤقتًا</option>
                  </select>
                </label>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-950 font-medium">
                  <b className="font-black">توضيح وضع واتساب:</b> يفتح رابط المحادثة المباشر مع رقم الدعم فقط، ولا يتم إرسال رسائل آلية تلقائية باسم المكتب.
                </div>
              </Section>
            </>
          )}

          {/* Save Bar for Office & Policies */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>بيانات الاتصال والسياسات مشفرة ومحمية بسجلات النظام.</span>
            </div>
            <button
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-7 py-3 text-xs font-black text-[#d7a94f] shadow-xs transition hover:bg-[#001a42] disabled:opacity-60 active:scale-95"
            >
              <Save className="h-4 w-4" />
              {busy ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </button>
          </div>
        </form>
      )}

      {/* Legal CMS Section */}
      {(activeTab === "all" || activeTab === "legal") && <LegalContentSettings />}

      {/* Review Schedule & Working Hours Section */}
      {(activeTab === "all" || activeTab === "schedule") && (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:border-slate-300 transition">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#986410]/10 text-[#986410]">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#00102e]">مواعيد المراجعة والاستشارة الأسبوعية</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  حدد فترات العمل اليومية، مدة الموعد، والحد الأقصى لحجوزات Zoom وواتساب. المنطقة الزمنية المعتمدة:{" "}
                  <span className="font-bold text-[#00102e] font-mono">{schedule?.timezone || "Africa/Cairo"}</span>.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={scheduleBusy || !schedule}
              onClick={() => void saveSchedule()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-6 py-2.5 text-xs font-black text-[#d7a94f] shadow-xs transition hover:bg-[#001a42] disabled:opacity-50 active:scale-95"
            >
              <Save className="h-4 w-4" />
              حفظ الجدول
            </button>
          </div>

          {scheduleError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{scheduleError}</span>
            </div>
          )}

          {!schedule && !scheduleError && (
            <div className="mt-5">
              <PageLoading label="جاري تحميل جدول المواعيد..." />
            </div>
          )}

          {schedule && (
            <div className="mt-6 space-y-4">
              {dayOrder.map((day) => {
                const rows = schedule.windows
                  .map((row, index) => ({ row, index }))
                  .filter((x) => x.row.weekday === day);
                const isDayOpen = rows.length > 0;

                return (
                  <div key={day} className="rounded-xl border border-slate-200/90 p-4 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-[#00102e]">{dayLabels[day]}</span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${
                            isDayOpen
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isDayOpen ? "bg-emerald-600" : "bg-slate-400"
                            }`}
                          />
                          {isDayOpen ? `${rows.length} فترة عمل` : "مغلق طوال اليوم"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyDayToOthers(day)}
                          disabled={!rows.length}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition shadow-2xs"
                          title="نسخ ساعات وسعة هذا اليوم إلى كافة أيام الأسبوع الأخرى"
                        >
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          <span>نسخ لباقي الأيام</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addWindow(day)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#00102e]/20 bg-slate-50 px-3 py-1.5 text-xs font-black text-[#00102e] hover:bg-slate-100 transition shadow-2xs"
                        >
                          <Plus className="h-3.5 w-3.5 text-[#986410]" />
                          <span>إضافة فترة</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-3">
                      {rows.map(({ row, index }) => {
                        const totalChannels = row.zoomCapacity + row.whatsappCapacity;
                        const isOverCapacity = totalChannels > row.totalCapacity;
                        const spareGeneral = row.totalCapacity - totalChannels;

                        return (
                          <div
                            key={`${day}-${index}`}
                            className={`flex flex-wrap items-end gap-3 rounded-xl p-3.5 transition-all ${
                              isOverCapacity
                                ? "border border-rose-300 bg-rose-50/40"
                                : "border border-slate-200/60 bg-slate-50"
                            }`}
                          >
                            <div className="w-28 shrink-0">
                              <MiniField
                                label="من"
                                type="time"
                                value={row.startTime}
                                onChange={(v) => updateWindow(index, { startTime: v })}
                              />
                            </div>
                            <div className="w-28 shrink-0">
                              <MiniField
                                label="إلى"
                                type="time"
                                value={row.endTime}
                                onChange={(v) => updateWindow(index, { endTime: v })}
                              />
                            </div>
                            <div className="w-24 shrink-0">
                              <MiniNumber
                                label="مدة الموعد"
                                suffix="د"
                                value={row.slotMinutes}
                                onChange={(v) => updateWindow(index, { slotMinutes: v })}
                              />
                            </div>
                            <div className="w-20 shrink-0">
                              <MiniNumber
                                label="الإجمالي"
                                value={row.totalCapacity}
                                onChange={(v) => updateWindow(index, { totalCapacity: v })}
                              />
                            </div>
                            <div className="w-20 shrink-0">
                              <MiniNumber
                                label="Zoom"
                                value={row.zoomCapacity}
                                onChange={(v) => updateWindow(index, { zoomCapacity: v })}
                              />
                            </div>
                            <div className="w-20 shrink-0">
                              <MiniNumber
                                label="واتساب"
                                value={row.whatsappCapacity}
                                onChange={(v) => updateWindow(index, { whatsappCapacity: v })}
                              />
                            </div>

                            {/* Live Capacity Indicator */}
                            <div className="flex h-10 items-center px-1">
                              {isOverCapacity ? (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-100/80 px-2 py-1 text-[10px] font-black text-rose-900">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  تجاوز السعة ({totalChannels} / {row.totalCapacity})
                                </span>
                              ) : (
                                <span className="rounded-lg bg-slate-200/70 px-2 py-1 text-[10px] font-bold text-slate-600">
                                  سعة عامة: {spareGeneral}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeWindow(index)}
                              className="ms-auto self-end flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition shadow-2xs"
                              aria-label="حذف الفترة"
                              title="حذف هذه الفترة"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}

                      {!rows.length && (
                        <div className="rounded-xl bg-slate-50/80 py-5 text-center text-xs font-bold text-slate-500 border border-dashed border-slate-200">
                          لا توجد ساعات عمل في هذا اليوم. اضغط "إضافة فترة" لبدء استقبال المواعيد.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Exceptional Closures */}
          {schedule && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#00102e]">إغلاق استثنائي أو إجازة رسمية</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    أضف يوماً أو فترة محددة لمنع حجز الاستشارات بها. اترك البداية والنهاية فارغتين لإغلاق اليوم بالكامل.
                  </p>
                </div>
              </div>

              <form onSubmit={addBlock} className="mt-4 grid gap-2.5 md:grid-cols-[180px_130px_130px_minmax(0,1fr)_auto]">
                <DatePickerInput
                  aria-label="تاريخ الإغلاق الاستثنائي"
                  required
                  value={blockDate}
                  onChange={setBlockDate}
                  placeholder="تاريخ الإغلاق"
                />
                <TimePickerInput
                  aria-label="وقت بداية الإغلاق"
                  value={blockStart}
                  onChange={setBlockStart}
                  placeholder="البداية (--:--)"
                  clearable
                />
                <TimePickerInput
                  aria-label="وقت نهاية الإغلاق"
                  value={blockEnd}
                  onChange={setBlockEnd}
                  placeholder="النهاية (--:--)"
                  clearable
                />
                <input
                  aria-label="سبب الإغلاق الاستثنائي"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="السبب (مثال: إجازة عيد الفطر — اختياري)"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#00102e] outline-none transition focus:border-[#00102e] focus:ring-1 focus:ring-[#986410]/30"
                />
                <button
                  disabled={scheduleBusy || !blockDate}
                  className="rounded-xl bg-[#986410] px-5 py-2 text-xs font-black text-white hover:bg-[#7e520c] transition shadow-xs disabled:opacity-50"
                >
                  إضافة إغلاق
                </button>
              </form>

              {/* Exceptions List */}
              <div className="mt-4 space-y-2">
                {schedule.exceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500">
                        <CalendarClock className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <b className="text-[#00102e]">
                          {new Date(`${ex.date}T12:00:00`).toLocaleDateString("ar-EG", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </b>
                        <span className="mr-2 text-slate-500 font-medium">
                          {ex.startTime && ex.endTime ? `${ex.startTime} — ${ex.endTime}` : "اليوم بالكامل"}
                          {ex.reason ? ` · ${ex.reason}` : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteBlock(ex.id)}
                      className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition"
                      aria-label="حذف الإغلاق الاستثنائي"
                      title="حذف هذا الإغلاق"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {schedule.exceptions.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs font-bold text-slate-500">
                    لا توجد استثناءات أو عطلات مجدولة حالياً.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 left-5 right-5 z-[100] flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-black shadow-2xl sm:right-auto sm:min-w-80 ${
            toast.kind === "success" ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"
          }`}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:border-slate-300 transition">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#986410]/10 text-[#986410]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-[#00102e]">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
  suffix,
  numeric,
  min,
  max,
  error,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  suffix?: string;
  numeric?: boolean;
  min?: number;
  max?: number;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-700">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={numeric ? "text" : type}
          inputMode={numeric ? "numeric" : undefined}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          min={numeric ? undefined : min}
          max={numeric ? undefined : max}
          pattern={numeric ? "[0-9]+" : undefined}
          className={`w-full rounded-xl border p-3 text-sm font-medium text-[#00102e] outline-none transition focus:bg-white focus:border-[#00102e] focus:ring-2 focus:ring-[#00102e]/10 ${
            suffix ? "pl-16" : ""
          } ${
            error
              ? "border-rose-400 bg-rose-50/40"
              : "border-slate-300 bg-slate-50/60 hover:border-slate-400"
          }`}
        />
        {suffix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
            {suffix}
          </span>
        )}
      </div>
      {error && <FieldError text={error} />}
    </label>
  );
}

function FieldError({ text }: { text: string }) {
  return <div className="mt-1 text-xs font-black text-rose-700">{text}</div>;
}

function MiniField({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}) {
  if (type === "time") {
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-black text-slate-500">{label}</span>
        <TimePickerInput value={value} onChange={onChange} className="h-10 text-xs font-bold" />
      </label>
    );
  }
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-[#00102e] outline-none transition focus:border-[#00102e] focus:ring-1 focus:ring-[#986410]/20"
      />
    </label>
  );
}

function MiniNumber({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-xs font-black text-slate-500">
        <span>{label}</span>
        {suffix && <span className="text-[10px] text-slate-400 font-bold">{suffix}</span>}
      </div>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]+"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-center text-xs font-bold tabular-nums text-[#00102e] outline-none transition focus:border-[#00102e] focus:ring-1 focus:ring-[#986410]/20"
      />
    </label>
  );
}
