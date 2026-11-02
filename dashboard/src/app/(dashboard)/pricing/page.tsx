"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Save,
  Scale,
  Search,
  Tag,
} from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";

type VariantPrice = {
  key: string;
  nameAr: string;
  description?: string;
  selfServicePriceEgp: number;
  lawyerAssistedPriceEgp: number;
  lawyerReviewAddOnPriceEgp?: number;
};

type Template = {
  id: number;
  slug: string;
  nameAr: string;
  description: string;
  isActive: boolean;
  variants: VariantPrice[];
};

type Setting = { key: string; value: unknown; isSecret: boolean; updatedAt: string };
type Toast = { kind: "success" | "error"; text: string } | null;
type PricingTab = "all" | "contracts" | "services";

const servicePriceDefs = [
  {
    key: "services.contract_review.fee_egp",
    label: "إجمالي المراجعة والاستشارة",
    description: "سعر خدمة مراجعة عقد مرفوع أو طلب استشارة قانونية متخصصة من محامي المكتب.",
    badge: "رسوم الخدمة الكاملة",
    icon: MessageSquareText,
  },
  {
    key: "services.contract_review.deposit_egp",
    label: "الدفعة الأولى للمراجعة / الاستشارة",
    description: "المبلغ المطلوب سداده إلكترونياً عند حجز موعد الاستشارة وبدء دراسة الملف.",
    badge: "دفعة أولى",
    icon: MessageSquareText,
  },
  {
    key: "services.contract_drafting.deposit_egp",
    label: "العربون الموحد لإعداد عقد بواسطة محامي",
    description: "العربون الموحد الذي يدفعه العميل عبر بوابة Paymob عند طلب صياغة عقد بواسطة محامي المكتب.",
    badge: "العربون الموحد",
    icon: BriefcaseBusiness,
  },
] as const;

function parseMoney(value: string) {
  const clean = value.replace(/[^0-9.]/g, "");
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function keyOf(templateId: number, variantKey: string, kind: "self" | "lawyer" | "review") {
  return `${templateId}:${variantKey}:${kind}`;
}

export default function PricingPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [variantDraft, setVariantDraft] = useState<Record<string, string>>({});
  const [originalVariantDraft, setOriginalVariantDraft] = useState<Record<string, string>>({});
  const [serviceDraft, setServiceDraft] = useState<Record<string, string>>({});
  const [originalServiceDraft, setOriginalServiceDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [activeTab, setActiveTab] = useState<PricingTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const settingMap = useMemo(
    () => Object.fromEntries(settings.map((item) => [item.key, item.value])),
    [settings]
  );

  const lawyerDeposit = parseMoney(serviceDraft["services.contract_drafting.deposit_egp"] ?? "0");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, settingRows] = await Promise.all([
        dashboardRequest<Template[]>("/api/v1/admin/templates"),
        dashboardRequest<Setting[]>("/api/v1/admin/settings"),
      ]);
      setTemplates(rows);
      setSettings(settingRows);

      const drafts: Record<string, string> = {};
      rows.forEach((template) =>
        template.variants.forEach((variant) => {
          drafts[keyOf(template.id, variant.key, "self")] = String(variant.selfServicePriceEgp);
          drafts[keyOf(template.id, variant.key, "lawyer")] = String(variant.lawyerAssistedPriceEgp);
          drafts[keyOf(template.id, variant.key, "review")] = String(variant.lawyerReviewAddOnPriceEgp ?? 0);
        })
      );
      setVariantDraft(drafts);
      setOriginalVariantDraft(drafts);

      const sDrafts = Object.fromEntries(
        servicePriceDefs.map((item) => [
          item.key,
          String(settingRows.find((row) => row.key === item.key)?.value ?? 0),
        ])
      );
      setServiceDraft(sDrafts);
      setOriginalServiceDraft(sDrafts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل الأسعار");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Compute number of modified prices
  const modifiedCount = useMemo(() => {
    let count = 0;
    Object.keys(variantDraft).forEach((k) => {
      if (parseMoney(variantDraft[k] ?? "0") !== parseMoney(originalVariantDraft[k] ?? "0")) {
        count++;
      }
    });
    servicePriceDefs.forEach((def) => {
      if (parseMoney(serviceDraft[def.key] ?? "0") !== parseMoney(originalServiceDraft[def.key] ?? "0")) {
        count++;
      }
    });
    return count;
  }, [variantDraft, originalVariantDraft, serviceDraft, originalServiceDraft]);

  async function save() {
    setBusy(true);
    setError("");
    setToast(null);
    try {
      let changed = false;
      for (const template of templates) {
        const rows = template.variants.map((variant) => ({
          variantKey: variant.key,
          selfServicePriceEgp: parseMoney(variantDraft[keyOf(template.id, variant.key, "self")] ?? "0"),
          lawyerAssistedPriceEgp: parseMoney(variantDraft[keyOf(template.id, variant.key, "lawyer")] ?? "0"),
          lawyerReviewAddOnPriceEgp: parseMoney(variantDraft[keyOf(template.id, variant.key, "review")] ?? "0"),
        }));
        const hasChange = template.variants.some(
          (variant, index) =>
            rows[index].selfServicePriceEgp !== Number(variant.selfServicePriceEgp) ||
            rows[index].lawyerAssistedPriceEgp !== Number(variant.lawyerAssistedPriceEgp) ||
            rows[index].lawyerReviewAddOnPriceEgp !== Number(variant.lawyerReviewAddOnPriceEgp ?? 0)
        );
        if (hasChange) {
          await dashboardRequest(`/api/v1/admin/templates/${template.id}`, {
            method: "PATCH",
            body: JSON.stringify({ variantPrices: rows }),
          });
          changed = true;
        }
      }
      const settingChanges = servicePriceDefs
        .map((def) => ({
          key: def.key,
          value: parseMoney(serviceDraft[def.key] ?? "0"),
          isSecret: false,
        }))
        .filter((item) => Number(settingMap[item.key] ?? 0) !== item.value);
      if (settingChanges.length) {
        await dashboardRequest("/api/v1/admin/settings", {
          method: "PATCH",
          body: JSON.stringify({ settings: settingChanges }),
        });
        changed = true;
      }
      setToast({
        kind: "success",
        text: changed
          ? "تم حفظ الأسعار بنجاح. أي طلب أو عقد جديد سيأخذ Snapshot بالقيم المحدثة فورياً."
          : "لا توجد تغييرات جديدة للحفظ.",
      });
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "تعذر حفظ الأسعار";
      setError(message);
      setToast({ kind: "error", text: message });
    } finally {
      setBusy(false);
    }
  }

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!busy) void save();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.trim().toLowerCase();
    return templates.filter(
      (t) =>
        t.nameAr.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.variants.some(
          (v) =>
            v.nameAr.toLowerCase().includes(q) || (v.description && v.description.toLowerCase().includes(q))
        )
    );
  }, [templates, searchQuery]);

  if (loading) {
    return (
      <div className="p-8">
        <PageLoading label="جاري تحميل مصفوفة الأسعار وقنوات العقود..." />
      </div>
    );
  }

  if (error && !templates.length && !settings.length) {
    return (
      <div className="p-8">
        <PageError message={error} onRetry={load} />
      </div>
    );
  }

  const tabs = [
    { key: "all", label: "جميع الأسعار", icon: LayoutDashboard },
    { key: "contracts", label: "أسعار قوالب العقود", icon: Scale },
    { key: "services", label: "خدمات المراجعة والاستشارة", icon: MessageSquareText },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-7">
      {/* Header with Segmented Navigation Tabs */}
      <header className="space-y-4 border-b border-slate-200 pb-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-[#986410]">
              <Tag className="h-4 w-4" />
              <span>مركز تسعير العقود والخدمات</span>
            </div>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-black text-[#00102e]">
              إدارة أسعار العقود والخدمات القانونية
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              تسعير كل مسار تعاقدي بدقة: 9 عقود فرعية × مسارين = 18 سعرًا مستقلًا، بالإضافة لخدمات المراجعة والاستشارة والعربون الموحد.
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#00102e] px-6 py-2.5 text-xs font-black text-[#d7a94f] shadow-xs transition hover:bg-[#001a42] disabled:opacity-50 active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>{busy ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
          </button>
        </div>

        {/* Segmented Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                  active
                    ? "bg-white font-black text-[#00102e] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? "text-[#d7a94f]" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Services & Consultations Section */}
      {(activeTab === "all" || activeTab === "services") && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-[#00102e]">خدمات المراجعة والاستشارة القانونية</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                الأسعار الموحدة لخدمات دراسة العقود الخارجية ومقابلات الاستشارة عبر Zoom أو واتساب.
              </p>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {servicePriceDefs.length} إعدادات عامة
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {servicePriceDefs.map((def) => {
              const Icon = def.icon;
              const currentValue = serviceDraft[def.key] ?? "0";
              const isModified =
                parseMoney(currentValue) !== parseMoney(originalServiceDraft[def.key] ?? "0");

              return (
                <article
                  key={def.key}
                  className={`flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-xs transition hover:border-slate-300 ${
                    isModified ? "border-[#986410]/60 ring-1 ring-[#986410]/20" : "border-slate-200"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#986410]/10 text-[#986410]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                        {def.badge}
                      </span>
                    </div>

                    <h3 className="mt-3 text-xs font-black text-[#00102e]">{def.label}</h3>
                    <p className="mt-1 text-xs leading-4 text-slate-500 font-medium">{def.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <MoneyInput
                      compact
                      isChanged={isModified}
                      value={currentValue}
                      onChange={(value) =>
                        setServiceDraft((old) => ({ ...old, [def.key]: value }))
                      }
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Contract Templates Pricing Section */}
      {(activeTab === "all" || activeTab === "contracts") && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-black text-[#00102e]">أسعار قوالب العقود الفرعية</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                تسعير مسار إعداد ذاتي ومسار بواسطة محامي ومراجعة ما قبل الإصدار لكل عقد فرعي.
              </p>
            </div>

            {/* Template Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم القالب أو العقد..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3 text-xs font-medium text-[#00102e] outline-none transition focus:border-[#00102e] focus:ring-1 focus:ring-[#986410]/20"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredTemplates.map((template) => (
              <article
                key={template.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-[#986410]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#00102e]">{template.nameAr}</h3>
                      <p className="mt-0.5 text-xs text-slate-500 font-medium">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      {template.variants.length} أنواع فرعية
                    </span>
                    <StatusBadge value={template.isActive ? "active" : "suspended"} />
                  </div>
                </header>

                <div className="divide-y divide-slate-100">
                  {template.variants.map((variant) => {
                    const selfKey = keyOf(template.id, variant.key, "self");
                    const lawyerKey = keyOf(template.id, variant.key, "lawyer");
                    const reviewKey = keyOf(template.id, variant.key, "review");

                    const self = variantDraft[selfKey] ?? "0";
                    const lawyer = variantDraft[lawyerKey] ?? "0";
                    const review = variantDraft[reviewKey] ?? "0";

                    const isSelfChanged =
                      parseMoney(self) !== parseMoney(originalVariantDraft[selfKey] ?? "0");
                    const isLawyerChanged =
                      parseMoney(lawyer) !== parseMoney(originalVariantDraft[lawyerKey] ?? "0");
                    const isReviewChanged =
                      parseMoney(review) !== parseMoney(originalVariantDraft[reviewKey] ?? "0");

                    const total = parseMoney(lawyer);
                    const effectiveDeposit = Math.min(lawyerDeposit, total || lawyerDeposit);
                    const remaining = total > 0 ? Math.max(0, total - effectiveDeposit) : 0;

                    return (
                      <div
                        key={variant.key}
                        className="grid items-center gap-4 p-4 lg:grid-cols-[minmax(200px,1.2fr)_130px_130px_130px_200px]"
                      >
                        <div>
                          <div className="text-xs font-black text-[#00102e]">{variant.nameAr}</div>
                          {variant.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-500 font-medium">
                              {variant.description}
                            </p>
                          )}
                        </div>

                        <MoneyInput
                          label="إعداد ذاتي"
                          compact
                          isChanged={isSelfChanged}
                          value={self}
                          onChange={(value) =>
                            setVariantDraft((old) => ({ ...old, [selfKey]: value }))
                          }
                        />

                        <MoneyInput
                          label="بواسطة محامي"
                          compact
                          isChanged={isLawyerChanged}
                          value={lawyer}
                          onChange={(value) =>
                            setVariantDraft((old) => ({ ...old, [lawyerKey]: value }))
                          }
                        />

                        <MoneyInput
                          label="مراجعة قبل الإصدار"
                          compact
                          isChanged={isReviewChanged}
                          value={review}
                          onChange={(value) =>
                            setVariantDraft((old) => ({ ...old, [reviewKey]: value }))
                          }
                        />

                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 font-medium">العربون الموحد</span>
                            <b className="font-black text-[#986410]">
                              {effectiveDeposit.toLocaleString("ar-EG")} ج.م
                            </b>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-slate-200/60 pt-1.5">
                            <span className="text-slate-500 font-medium">المتبقي</span>
                            <b className="font-black text-[#00102e]">
                              {remaining.toLocaleString("ar-EG")} ج.م
                            </b>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}

            {filteredTemplates.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs font-bold text-slate-500">
                لا توجد قوالب عقود مطابقة لكلمة البحث "{searchQuery}".
              </div>
            )}
          </div>
        </section>
      )}

      {/* Floating Save Bar with Changes Counter */}
      <div className="sticky bottom-4 z-40 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
          {modifiedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 font-black text-amber-900">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              يوجد {modifiedCount} أسعار معدلة بانتظار الحفظ
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              جميع الأسعار متزامنة ومحفوظة بالنظام (Ctrl+S للحفظ السريع)
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={busy || modifiedCount === 0}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-7 py-2.5 text-xs font-black text-[#d7a94f] shadow-xs transition hover:bg-[#001a42] disabled:opacity-40 active:scale-95"
        >
          <Save className="h-4 w-4" />
          <span>{busy ? "جاري الحفظ..." : "حفظ الأسعار"}</span>
        </button>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 left-5 right-5 z-[100] flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-black shadow-2xl sm:right-auto sm:min-w-80 ${
            toast.kind === "success" ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"
          }`}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-200" />
          )}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  label,
  compact = false,
  isChanged = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  compact?: boolean;
  isChanged?: boolean;
}) {
  return (
    <label className="block text-center">
      {label && <span className="mb-1 block text-xs font-black text-slate-500">{label}</span>}
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          className={`w-full rounded-xl border bg-white pr-3 pl-9 text-center font-black text-[#00102e] tabular-nums outline-none transition focus:border-[#00102e] focus:ring-1 focus:ring-[#986410]/20 ${
            compact ? "py-2 text-xs" : "py-2.5 text-sm"
          } ${
            isChanged
              ? "border-[#986410] bg-amber-50/20 text-[#986410]"
              : "border-slate-200 text-[#00102e]"
          }`}
        />
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
          ج.م
        </span>
      </div>
    </label>
  );
}
