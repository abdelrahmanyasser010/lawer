"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Save,
  ShieldCheck,
  Scale,
  RefreshCw,
  Truck,
  Building2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";

export type LegalKey =
  | "about_us"
  | "terms_and_conditions"
  | "privacy_policy"
  | "refund_cancellation_policy"
  | "delivery_shipping_policy";

export type LegalRow = {
  key: LegalKey;
  title: string;
  body: string;
  isPublished: boolean;
  publishedVersion?: number | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

const policyMeta: Record<LegalKey, { label: string; icon: typeof FileText; desc: string }> = {
  terms_and_conditions: {
    label: "الشروط والأحكام",
    icon: Scale,
    desc: "شروط استخدام المنصة والتعاقد وحقوق والتزامات الأطراف",
  },
  privacy_policy: {
    label: "سياسة الخصوصية",
    icon: ShieldCheck,
    desc: "سياسة جمع واستخدام وحماية البيانات الشخصية للعملاء",
  },
  refund_cancellation_policy: {
    label: "سياسة الإلغاء والاسترداد",
    icon: RefreshCw,
    desc: "ضوابط إلغاء الطلبات واسترداد المبالغ المدفوعة",
  },
  delivery_shipping_policy: {
    label: "سياسة الشحن والتسليم",
    icon: Truck,
    desc: "آلية تسليم العقود الرقمية والخدمات والاستشارات القانونية",
  },
  about_us: {
    label: "من نحن",
    icon: Building2,
    desc: "نبذة عن مكتب المحاماة والرسالة والخبرات القانونية",
  },
};

export default function LegalContentSettings() {
  const [items, setItems] = useState<LegalRow[]>([]);
  const [selected, setSelected] = useState<LegalKey>("terms_and_conditions");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setItems(await dashboardRequest<LegalRow[]>("/api/v1/admin/legal-content"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل المحتوى القانوني");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current =
    items.find((x) => x.key === selected) ?? {
      key: selected,
      title: policyMeta[selected].label,
      body: "",
      isPublished: false,
      publishedVersion: null,
      publishedAt: null,
    };

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await dashboardRequest(`/api/v1/admin/legal-content/${selected}`, {
        method: "PUT",
        body: JSON.stringify({
          title: current.title,
          body: current.body,
          isPublished: current.isPublished,
        }),
      });
      setNotice(
        current.isPublished
          ? "تم حفظ ونشر النسخة الجديدة بنجاح. تظل النسخ السابقة محفوظة في سجل الموافقات."
          : "تم حفظ مسودة المحتوى كغير منشور."
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ المحتوى");
    } finally {
      setBusy(false);
    }
  }

  function patch(next: Partial<LegalRow>) {
    setItems((old) => {
      const exists = old.some((x) => x.key === selected);
      const base = current;
      return exists
        ? old.map((x) => (x.key === selected ? { ...x, ...next } : x))
        : [...old, { ...base, ...next }];
    });
  }

  const selectedMeta = policyMeta[selected];
  const SelectedIcon = selectedMeta.icon;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#986410]/10 text-[#986410]">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-[#00102e]">المحتوى والصفحات القانونية للمنصة</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            تُنشر هذه الوثائق في صفحات الواجهة وتُعرض للعملاء عند التسجيل وطلب الخدمات وسداد المدفوعات.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Policy Selector Column */}
        <div className="space-y-2">
          {(Object.keys(policyMeta) as LegalKey[]).map((key) => {
            const meta = policyMeta[key];
            const Icon = meta.icon;
            const item = items.find((x) => x.key === key);
            const isPublished = item?.isPublished ?? false;
            const isCurrent = selected === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelected(key);
                  setNotice("");
                  setError("");
                }}
                className={`w-full flex items-start gap-3 rounded-xl border p-3 text-right transition-all duration-150 ${
                  isCurrent
                    ? "border-[#d7a94f]/40 bg-[#00102e] text-white shadow-xs"
                    : "border-slate-200/90 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:text-[#00102e]"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    isCurrent ? "bg-[#d7a94f]/20 text-[#d7a94f]" : "bg-white text-slate-500 shadow-2xs"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={`text-xs font-black truncate ${isCurrent ? "text-white" : "text-[#00102e]"}`}>
                      {meta.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                        isPublished
                          ? isCurrent
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isCurrent
                            ? "bg-slate-800 text-slate-400"
                            : "bg-slate-200/60 text-slate-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isPublished ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {isPublished ? "منشور" : "مسودة"}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 text-[10px] leading-4 truncate ${
                      isCurrent ? "text-slate-300" : "text-slate-400"
                    }`}
                  >
                    {meta.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor Area */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#986410]/15 text-[#986410]">
                <SelectedIcon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#00102e]">{selectedMeta.label}</h3>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                  {current.publishedVersion ? (
                    <span className="font-bold text-emerald-700">
                      الإصدار v{current.publishedVersion}
                    </span>
                  ) : (
                    <span>لم يُنشر إصدار بعد</span>
                  )}
                  {current.publishedAt && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        آخر نشر: {new Date(current.publishedAt).toLocaleString("ar-EG")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-2xs cursor-pointer select-none hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={current.isPublished}
                onChange={(e) => patch({ isPublished: e.target.checked })}
                className="h-4 w-4 accent-[#986410] rounded"
              />
              <span>منشور للعملاء</span>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-slate-600">عنوان الوثيقة</span>
            <input
              value={current.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="عنوان الوثيقة (مثال: الشروط والأحكام)"
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-bold text-[#00102e] shadow-2xs outline-none transition hover:border-slate-400 focus:border-[#00102e] focus:ring-2 focus:ring-[#00102e]/10"
            />
          </label>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-black text-slate-600">نص الوثيقة القانونية</span>
              <span className="font-bold text-slate-400 tabular-nums">
                {current.body.length.toLocaleString("ar-EG")} حرف
              </span>
            </div>
            <textarea
              value={current.body}
              onChange={(e) => patch({ body: e.target.value })}
              placeholder="اكتب بنود ومحتوى السياسة هنا..."
              className="min-h-80 w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm leading-7 text-[#00102e] shadow-2xs outline-none transition hover:border-slate-400 focus:border-[#00102e] focus:ring-2 focus:ring-[#00102e]/10 resize-y"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              {error}
            </div>
          )}

          {notice && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{notice}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
            <span className="text-[11px] text-slate-400 font-medium">
              يتم حفظ التعديلات ونشرها فوراً على الموقع والفرونت
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-6 py-2.5 text-xs font-black text-[#d7a94f] shadow-xs transition hover:bg-[#001a42] disabled:opacity-50 active:scale-95"
            >
              <Save className="h-4 w-4" />
              {busy ? "جاري الحفظ..." : "حفظ ونشر المحتوى"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
