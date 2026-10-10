"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Pencil, Save, Trash2, UserRound, X } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { frontendApi } from "@/lib/apiClient";
import type { SavedParty } from "@/types/customer";
import { formatDate } from "@/lib/labels";

const editableFields = [
  { key: "name", label: "الاسم" },
  { key: "companyName", label: "اسم الشركة" },
  { key: "nationalId", label: "الرقم القومي" },
  { key: "phone", label: "الهاتف" },
  { key: "email", label: "البريد الإلكتروني" },
  { key: "address", label: "العنوان" },
  { key: "commercialRegister", label: "السجل التجاري" },
  { key: "taxNumber", label: "الرقم الضريبي" },
] as const;

export default function SavedPartiesPage() {
  const [items, setItems] = useState<SavedParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SavedParty | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setItems(await frontendApi.savedParties()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر تحميل الأطراف المحفوظة."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    if (!editing) return;
    setBusy(true); setError("");
    try {
      const updated = await frontendApi.updateSavedParty(editing.id, { displayName: editing.displayName, data: editing.data });
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر حفظ الطرف."); }
    finally { setBusy(false); }
  }

  async function remove(item: SavedParty) {
    if (!window.confirm(`حذف ${item.displayName} من الأطراف المحفوظة؟ العقود القديمة مش هتتأثر.`)) return;
    setBusy(true); setError("");
    try {
      await frontendApi.deleteSavedParty(item.id);
      setItems((current) => current.filter((x) => x.id !== item.id));
      if (editing?.id === item.id) setEditing(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر حذف الطرف من المحفوظين."); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-9 sm:px-6">
        <header className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-black text-[#00102e]">الأطراف المحفوظة</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">الأشخاص أو الشركات اللي اخترت تحتفظ ببياناتهم من عقود مكتملة، علشان تستخدمهم أسرع في عقود جديدة.</p>
        </header>

        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
        {loading ? <div className="mt-8 rounded-2xl border bg-white p-14"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#986410]" /></div> : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 text-sm font-black text-[#00102e]">لسه مفيش أطراف محفوظة</h2><p className="mt-2 text-xs text-slate-500">لما تختار حفظ طرف جديد من عقد ويتم إصدار/اكتمال العقد، هيظهر هنا.</p></div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const Icon = item.partyKind === "organization" ? Building2 : UserRound;
              return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3"><div className="rounded-xl bg-slate-100 p-2 text-[#00102e]"><Icon className="h-5 w-5" /></div><div><h2 className="text-sm font-black text-[#00102e]">{item.displayName}</h2><p className="mt-1 text-[10px] font-bold text-slate-400">{item.sourceContractTitle || "طرف محفوظ"}{item.lastUsedAt ? ` — آخر استخدام ${formatDate(item.lastUsedAt)}` : ""}</p></div></div>
                  <div className="flex gap-1"><button type="button" onClick={() => setEditing(structuredClone(item))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button><button type="button" disabled={busy} onClick={() => void remove(item)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>
                </div>
                <div className="mt-4 grid gap-2 text-[11px]">
                  {["phone", "email", "address", "nationalId", "commercialRegister"].map((key) => item.data[key] ? <div key={key} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600"><strong className="text-[#00102e]">{editableFields.find((f) => f.key === key)?.label || key}: </strong>{String(item.data[key])}</div> : null)}
                </div>
              </article>;
            })}
          </div>
        )}
      </main>
      <Footer />

      {editing && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#00102e]/70 p-4 backdrop-blur-sm"><section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-[#00102e]">تعديل الطرف المحفوظ</h2><p className="mt-1 text-[10px] text-slate-500">التعديل هنا للعقود الجاية فقط؛ العقود الصادرة القديمة مش هتتغير.</p></div><button type="button" onClick={() => setEditing(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <label className="mt-5 block text-xs font-black text-slate-600">الاسم الظاهر<input value={editing.displayName} onChange={(event) => setEditing({ ...editing, displayName: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#986410]" /></label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{editableFields.map((field) => <label key={field.key} className="text-[10px] font-black text-slate-600">{field.label}<input value={String(editing.data[field.key] ?? "")} onChange={(event) => setEditing({ ...editing, data: { ...editing.data, [field.key]: event.target.value } })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-[#986410]" /></label>)}</div>
        <button type="button" disabled={busy} onClick={() => void save()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-white disabled:opacity-50"><Save className="h-4 w-4" />حفظ التغييرات</button>
      </section></div>}
    </div>
  );
}
