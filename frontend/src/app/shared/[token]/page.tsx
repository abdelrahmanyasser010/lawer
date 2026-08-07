"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, Lock, Pencil, Save, ShieldCheck } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { apiRequest } from "@/lib/apiClient";

type ShareMetadata = {
  contractTitle: string;
  serialNumber: string;
  templateSlug: "rental" | "apartment_sale" | "freelancer";
  permission: "view_only" | "edit";
  ownerName: string;
  expiresAt: string;
  requiresPublicId: boolean;
};

type ShareContent = ShareMetadata & {
  contractId: number;
  variantKey: string;
  fieldValues: Record<string, unknown>;
  selectedOptionalClauseKeys: string[];
  editableFieldKeys: string[];
};

const LABELS: Record<string, string> = {
  sale_total_price: "إجمالي ثمن البيع",
  sale_payment_method: "طريقة السداد",
  sale_handover_date: "تاريخ التسليم",
  sale_unit_governorate: "المحافظة",
  sale_unit_city: "المدينة / المركز",
  sale_unit_district: "الحي / المنطقة",
  sale_unit_street: "اسم الشارع",
  sale_unit_area: "مساحة الوحدة",
  sale_competent_court: "المحكمة المختصة",
  property_governorate: "المحافظة",
  property_city: "المدينة / المركز",
  property_district: "الحي / المنطقة",
  property_street: "اسم الشارع",
  property_area: "مساحة العين",
  start_date: "تاريخ بداية الإيجار",
  end_date: "تاريخ نهاية الإيجار",
  monthly_rent: "القيمة الإيجارية الشهرية",
  deposit_amount: "مبلغ التأمين",
  annual_increase: "نسبة الزيادة السنوية",
  competent_court: "المحكمة المختصة",
};

function labelFor(key: string) {
  return LABELS[key] || key.replaceAll("_", " ");
}

function scalar(value: unknown): value is string | number | boolean | null {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

export default function SharedContractPage() {
  const { token } = useParams<{ token: string }>();
  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [content, setContent] = useState<ShareContent | null>(null);
  const [publicId, setPublicId] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string | number | boolean | null>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const unlock = useCallback(async (id: string) => {
    setBusy(true); setError("");
    try {
      const resolved = await apiRequest<ShareContent>(`/api/v1/contracts/shared/${encodeURIComponent(token)}/access`, {
        method: "POST",
        body: JSON.stringify({ publicId: id }),
      });
      setContent(resolved);
      setEditValues(Object.fromEntries(Object.entries(resolved.fieldValues).filter(([, value]) => scalar(value))) as Record<string, string | number | boolean | null>);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر فتح رابط المشاركة");
    } finally { setBusy(false); }
  }, [token]);

  useEffect(() => {
    let active = true;
    apiRequest<ShareMetadata>(`/api/v1/contracts/shared/${encodeURIComponent(token)}`)
      .then((data) => {
        if (!active) return;
        setMetadata(data);
        if (!data.requiresPublicId) void unlock("");
      })
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : "الرابط غير صالح"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token, unlock]);

  const editable = useMemo(() => new Set(content?.editableFieldKeys ?? []), [content]);
  const visibleEntries = useMemo(() => Object.entries(content?.fieldValues ?? {}), [content]);

  async function save() {
    if (!content) return;
    const patch = Object.fromEntries(Object.entries(editValues).filter(([key]) => editable.has(key)));
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest(`/api/v1/contracts/shared/${encodeURIComponent(token)}`, {
        method: "PATCH",
        body: JSON.stringify({ publicId, fieldValues: patch }),
      });
      setNotice("تم حفظ التعديلات وإرسالها لصاحب العقد للمراجعة.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ التعديلات");
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        {loading && <div className="rounded-2xl border bg-white p-8 text-center text-sm font-bold text-slate-500">جاري التحقق من رابط المشاركة...</div>}
        {!loading && error && !metadata && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-rose-600"/><p className="mt-3 text-sm font-black text-rose-700">{error}</p></div>}

        {metadata && !content && (
          <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#986410]/10 text-[#986410]"><Lock className="h-7 w-7"/></div>
            <h1 className="mt-5 text-xl font-black text-[#00102e]">{metadata.contractTitle}</h1>
            <p className="mt-1 font-mono text-xs text-slate-400">{metadata.serialNumber}</p>
            <p className="mt-4 text-xs font-semibold leading-6 text-slate-500">الرابط صادر من {metadata.ownerName} وينتهي في {new Date(metadata.expiresAt).toLocaleString("ar-EG")}.</p>
            {metadata.requiresPublicId && <input value={publicId} onChange={(event)=>setPublicId(event.target.value.toUpperCase().slice(0,32))} placeholder="أدخل Z-ID المرسل إليه الرابط" className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-mono text-sm font-black outline-none focus:border-[#986410]"/>}
            {error && <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}
            <button disabled={busy || (metadata.requiresPublicId && !publicId.trim())} onClick={()=>void unlock(publicId)} className="mt-5 w-full rounded-xl bg-[#00102e] py-3 text-xs font-black text-white disabled:opacity-50">{busy ? "جاري التحقق..." : "فتح المستند"}</button>
          </section>
        )}

        {content && (
          <div className="space-y-6">
            <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div><div className="flex items-center gap-2"><h1 className="text-2xl font-black text-[#00102e]">{content.contractTitle}</h1>{content.permission === "edit" ? <Pencil className="h-5 w-5 text-[#986410]"/> : <Eye className="h-5 w-5 text-slate-400"/>}</div><p className="mt-1 font-mono text-xs text-slate-400">{content.serialNumber} · {content.variantKey}</p></div>
                <div className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700"><ShieldCheck className="ml-1 inline h-4 w-4"/>{content.permission === "edit" ? "تعديل حقول محددة" : "عرض فقط"}</div>
              </div>
            </header>

            {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-700"><CheckCircle2 className="ml-2 inline h-4 w-4"/>{notice}</div>}
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">{error}</div>}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-[#00102e]">بيانات العقد المشتركة</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {visibleEntries.map(([key, value]) => {
                  const canEdit = content.permission === "edit" && editable.has(key) && scalar(value);
                  return <label key={key} className="block rounded-xl border border-slate-200 p-4"><span className="mb-2 block text-xs font-black text-slate-600">{labelFor(key)}</span>{canEdit ? <input value={String(editValues[key] ?? "")} onChange={(event)=>setEditValues((current)=>({...current,[key]:event.target.value}))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#986410]"/> : <div className="min-h-9 whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{scalar(value) ? String(value ?? "—") : JSON.stringify(value, null, 2)}</div>}</label>;
                })}
              </div>
              {content.permission === "edit" && <button disabled={busy} onClick={()=>void save()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#986410] px-6 py-3 text-xs font-black text-white disabled:opacity-60"><Save className="h-4 w-4"/>{busy ? "جاري الحفظ..." : "حفظ التعديلات"}</button>}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
