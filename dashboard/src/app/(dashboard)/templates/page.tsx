"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CopyPlus, Edit3, Plus, RefreshCw, Rocket } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { AdminDialog } from "@/components/admin/AdminDialog";

type Version = { id: number; versionNumber: number; status: string; changeSummary?: string; legalReference?: string; createdAt: string; publishedAt?: string };
type Category = { id: number; slug: string; nameAr: string; description: string; isActive: boolean; sortOrder: number; templatesCount: number };
type Template = { id: number; slug: string; nameAr: string; description: string; priceEgp: number; isActive: boolean; categoryId?: number | null; categoryNameAr?: string | null; currentPublishedVersionId?: number; versions: Version[] };

export default function TemplatesPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [templates, categoryRows] = await Promise.all([
        dashboardRequest<Template[]>("/api/v1/admin/templates"),
        dashboardRequest<Category[]>("/api/v1/admin/templates/categories"),
      ]);
      setItems(templates);
      setCategories(categoryRows);
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تحميل القوالب"); } finally { setLoading(false); }
  }, []);

  // The loader synchronizes the page with the API when the route is mounted.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function cloneVersion(template: Template) {
    setBusy(template.id);
    try {
      await dashboardRequest(`/api/v1/admin/templates/${template.id}/versions`, { method: "POST", body: JSON.stringify({ sourceVersionId: template.currentPublishedVersionId, changeSummary: "تحديث قانوني جديد" }) });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر إنشاء الإصدار"); } finally { setBusy(null); }
  }

  async function createTemplate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(-1);
    try {
      const source = String(fd.get("sourceTemplateId") || "");
      await dashboardRequest("/api/v1/admin/templates", { method: "POST", body: JSON.stringify({ slug: fd.get("slug"), nameAr: fd.get("nameAr"), description: fd.get("description"), priceEgp: Number(fd.get("priceEgp") || 0), categoryId: fd.get("categoryId") ? Number(fd.get("categoryId")) : null, sourceTemplateId: source ? Number(source) : null }) });
      setOpen(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر إنشاء القالب"); } finally { setBusy(null); }
  }

  async function createCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(-2);
    try {
      await dashboardRequest("/api/v1/admin/templates/categories", { method: "POST", body: JSON.stringify({ slug: fd.get("slug"), nameAr: fd.get("nameAr"), description: fd.get("description"), sortOrder: Number(fd.get("sortOrder") || 0) }) });
      setCategoryOpen(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر إنشاء التصنيف"); } finally { setBusy(null); }
  }

  if (loading && !items.length) return <div className="p-8"><PageLoading /></div>;
  if (error && !items.length) return <div className="p-8"><PageError message={error} onRetry={load} /></div>;

  return <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-black text-[#00102e]">القوالب والتصنيفات</h1><p className="text-sm text-slate-500">أنشئ تصنيفًا يضم عدة عائلات عقود، أو انسخ قالبًا قائمًا كنقطة بداية لعائلة جديدة.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white p-2.5" aria-label="تحديث"><RefreshCw className="h-4 w-4" /></button><button onClick={() => setCategoryOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black"><Plus className="h-4 w-4" />تصنيف جديد</button><button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-[#d5a84c]"><Plus className="h-4 w-4" />قالب جديد</button></div></header>
    {error && <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{categories.map((category) => <article key={category.id} className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4"><div className="flex items-center justify-between gap-2"><h2 className="font-black text-[#00102e]">{category.nameAr}</h2><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-violet-700">{category.templatesCount} قوالب</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{category.description || "بدون وصف"}</p></article>)}</div>
    <div className="space-y-5">{items.map((template) => <section key={template.id} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-[#00102e]">{template.nameAr}</h2><StatusBadge value={template.isActive ? "active" : "suspended"} />{template.categoryNameAr && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700">{template.categoryNameAr}</span>}</div><p className="mt-1 max-w-2xl text-sm text-slate-500">{template.description}</p></div><div className="flex flex-wrap gap-2"><Link href="/pricing" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black"><Edit3 className="h-3.5 w-3.5" />الأسعار</Link><button disabled={busy === template.id} onClick={() => void cloneVersion(template)} className="inline-flex items-center gap-1 rounded-lg bg-[#00102e] px-3 py-2 text-xs font-black text-white"><CopyPlus className="h-3.5 w-3.5" />إصدار قانوني جديد</button></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">الإصدار</th><th className="p-3">الحالة</th><th className="p-3">ملخص التغيير</th><th className="p-3">المرجع القانوني</th><th className="p-3">التاريخ</th><th className="p-3">إجراء</th></tr></thead><tbody className="divide-y divide-slate-100">{template.versions.map((version) => <tr key={version.id}><td className="p-3 font-black">v{version.versionNumber}</td><td className="p-3"><StatusBadge value={version.status} /></td><td className="p-3">{version.changeSummary || "—"}</td><td className="p-3">{version.legalReference || "—"}</td><td className="p-3">{new Date(version.publishedAt || version.createdAt).toLocaleDateString("ar-EG")}</td><td className="p-3"><Link href={`/templates/versions/${version.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-black">{version.status === "published" ? <Rocket className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}{version.status === "published" ? "عرض" : "تحرير ومراجعة"}</Link></td></tr>)}</tbody></table></div></section>)}</div>
    <AdminDialog open={open} title="إنشاء قالب عقد" description="يمكن البدء من الصفر أو نسخ إصدار من عائلة أخرى ثم تعديله." onClose={() => setOpen(false)}><form onSubmit={createTemplate} className="space-y-4"><label className="block"><span className="mb-2 block text-xs font-black text-slate-600">الرمز الداخلي</span><input name="slug" required pattern="[a-z0-9_]+" placeholder="مثال: employment" className="w-full rounded-xl border border-slate-200 p-3" /></label><label className="block"><span className="mb-2 block text-xs font-black text-slate-600">الاسم العربي</span><input name="nameAr" required className="w-full rounded-xl border border-slate-200 p-3" /></label><label className="block"><span className="mb-2 block text-xs font-black text-slate-600">التصنيف</span><select name="categoryId" className="w-full rounded-xl border border-slate-200 bg-white p-3"><option value="">بدون تصنيف</option>{categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.nameAr}</option>)}</select></label><label className="block"><span className="mb-2 block text-xs font-black text-slate-600">النسخ من قالب موجود (اختياري)</span><select name="sourceTemplateId" className="w-full rounded-xl border border-slate-200 bg-white p-3"><option value="">بدء من الصفر</option>{items.map((template) => <option key={template.id} value={template.id}>{template.nameAr}</option>)}</select></label><label className="block"><span className="mb-2 block text-xs font-black text-slate-600">الوصف</span><textarea name="description" className="min-h-24 w-full rounded-xl border border-slate-200 p-3" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black">إلغاء</button><button disabled={busy === -1} className="rounded-xl bg-[#00102e] px-5 py-2 text-xs font-black text-[#d5a84c]">إنشاء مسودة</button></div></form></AdminDialog>
    <AdminDialog open={categoryOpen} title="إنشاء تصنيف عقود" description="التصنيف يجمع عائلات عقود متعددة في الكتالوج." onClose={() => setCategoryOpen(false)}><form onSubmit={createCategory} className="space-y-4"><label className="block"><span className="mb-2 block text-xs font-black text-slate-600">الرمز الداخلي</span><input name="slug" required pattern="[a-z0-9_]+" placeholder="مثال: business" className="w-full rounded-xl border border-slate-200 p-3" /></label><label className="block"><span className="mb-2 block text-xs font-black text-slate-600">اسم التصنيف</span><input name="nameAr" required className="w-full rounded-xl border border-slate-200 p-3" /></label><label className="block"><span className="mb-2 block text-xs font-black text-slate-600">الوصف</span><textarea name="description" className="min-h-24 w-full rounded-xl border border-slate-200 p-3" /></label><label className="block"><span className="mb-2 block text-xs font-black text-slate-600">الترتيب</span><input name="sortOrder" type="number" min="0" defaultValue="0" className="w-full rounded-xl border border-slate-200 p-3" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setCategoryOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black">إلغاء</button><button disabled={busy === -2} className="rounded-xl bg-[#00102e] px-5 py-2 text-xs font-black text-[#d5a84c]">إنشاء التصنيف</button></div></form></AdminDialog>
  </div>;
}
