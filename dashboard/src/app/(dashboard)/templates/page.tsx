"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, CopyPlus, Edit3, Eye, Plus, RefreshCw, Search } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { AdminDialog } from "@/components/admin/AdminDialog";

type Version = {
  id: number;
  versionNumber: number;
  status: string;
  changeSummary?: string;
  legalReference?: string;
  createdAt: string;
  publishedAt?: string;
};

type Category = {
  id: number;
  slug: string;
  nameAr: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  templatesCount: number;
};

type Template = {
  id: number;
  slug: string;
  nameAr: string;
  description: string;
  priceEgp: number;
  isActive: boolean;
  selfServiceEnabled?: boolean;
  lawyerDraftingEnabled?: boolean;
  categoryId?: number | null;
  categoryNameAr?: string | null;
  currentPublishedVersionId?: number;
  versions: Version[];
};

type FilterKey = "all" | `category:${number}`;
type CategoryDialog = { mode: "create" } | { mode: "edit"; category: Category } | null;

export default function TemplatesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createCategoryId, setCreateCategoryId] = useState("");
  const [createSelfServiceEnabled, setCreateSelfServiceEnabled] = useState(true);
  const [createLawyerDraftingEnabled, setCreateLawyerDraftingEnabled] = useState(true);
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialog>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const visibleCategories = useMemo(
    () => categories.filter((category) => {
      const isGeneral = category.slug === "general" || category.nameAr.trim() === "عقود عامة";
      return category.isActive && !isGeneral;
    }),
    [categories],
  );

  const selectedCategoryForCreate = useMemo(() => {
    if (selectedFilter.startsWith("category:")) return Number(selectedFilter.replace("category:", ""));
    return undefined;
  }, [selectedFilter]);

  const activeCategory = useMemo(() => {
    if (!selectedFilter.startsWith("category:")) return null;
    const categoryId = Number(selectedFilter.replace("category:", ""));
    return visibleCategories.find((category) => category.id === categoryId) ?? null;
  }, [selectedFilter, visibleCategories]);

  const filteredItems = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return items.filter((template) => {
      const matchesFilter =
        selectedFilter === "all" ||
        (selectedFilter.startsWith("category:") && template.categoryId === Number(selectedFilter.replace("category:", "")));

      const matchesQuery =
        !cleanQuery ||
        template.nameAr.toLowerCase().includes(cleanQuery) ||
        template.description?.toLowerCase().includes(cleanQuery) ||
        template.categoryNameAr?.toLowerCase().includes(cleanQuery);

      return matchesFilter && matchesQuery;
    });
  }, [items, query, selectedFilter]);

  const selectedTitle = useMemo(() => {
    if (selectedFilter === "all") return "كل أنواع العقود";

    const categoryId = Number(selectedFilter.replace("category:", ""));
    return categories.find((category) => category.id === categoryId)?.nameAr ?? "تصنيف محدد";
  }, [categories, selectedFilter]);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل أنواع العقود");
    } finally {
      setLoading(false);
    }
  }, []);

  // The loader synchronizes the page with the API when the route is mounted.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function openTemplateDialog(categoryId?: number) {
    const initialCategory = categoryId ? String(categoryId) : "";
    setCreateStep(1);
    setCreateName("");
    setCreateDescription("");
    setCreateCategoryId(initialCategory);
    setCreateSelfServiceEnabled(true);
    setCreateLawyerDraftingEnabled(true);
    setOpen(true);
  }

  function openTemplateDialogForCurrentFilter() {
    openTemplateDialog(selectedCategoryForCreate);
  }

  function closeTemplateDialog() {
    setOpen(false);
    setCreateStep(1);
    setCreateName("");
    setCreateDescription("");
    setCreateCategoryId("");
    setCreateSelfServiceEnabled(true);
    setCreateLawyerDraftingEnabled(true);
  }

  function requestCloseTemplateDialog() {
    const hasDraftInput = Boolean(createName.trim() || createDescription.trim() || createCategoryId || createStep > 1);
    if (hasDraftInput && !window.confirm("إلغاء إنشاء العقد؟ البيانات التي أدخلتها لن تُحفظ.")) return;
    closeTemplateDialog();
  }

  async function cloneVersion(template: Template) {
    const existingDraft = [...template.versions]
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .find((version) => version.status === "draft");

    if (existingDraft) {
      router.push(`/templates/versions/${existingDraft.id}`);
      return;
    }

    setBusy(template.id);
    try {
      const previousVersionIds = new Set(template.versions.map((version) => version.id));
      await dashboardRequest(`/api/v1/admin/templates/${template.id}/versions`, {
        method: "POST",
        body: JSON.stringify({ sourceVersionId: template.currentPublishedVersionId, changeSummary: "تحديث قانوني جديد" }),
      });
      const templates = await dashboardRequest<Template[]>("/api/v1/admin/templates");
      setItems(templates);

      const refreshedTemplate = templates.find((item) => item.id === template.id);
      const createdVersion = [...(refreshedTemplate?.versions ?? [])]
        .sort((a, b) => b.versionNumber - a.versionNumber)
        .find((version) => !previousVersionIds.has(version.id))
        ?? refreshedTemplate?.versions.find((version) => version.status === "draft");

      if (createdVersion) router.push(`/templates/versions/${createdVersion.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إنشاء الإصدار");
    } finally {
      setBusy(null);
    }
  }

  async function createTemplate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError("");
    setNotice("");
    if (!createName.trim()) {
      setError("اكتب اسم العقد.");
      setCreateStep(1);
      return;
    }
    if (!createCategoryId) {
      setError("اختار التصنيف.");
      setCreateStep(1);
      return;
    }
    if (!createSelfServiceEnabled && !createLawyerDraftingEnabled) {
      setError("فعّل طريقة تقديم واحدة على الأقل.");
      setCreateStep(2);
      return;
    }
    setBusy(-1);
    try {
      const previousTemplateIds = new Set(items.map((item) => item.id));
      const createdResponse = await dashboardRequest<Partial<Template> & { id?: number }>("/api/v1/admin/templates", {
        method: "POST",
        body: JSON.stringify({
          nameAr: fd.get("nameAr"),
          description: fd.get("description"),
          priceEgp: 0,
          categoryId: Number(fd.get("categoryId")),
          selfServiceEnabled: createSelfServiceEnabled,
          lawyerDraftingEnabled: createLawyerDraftingEnabled,
        }),
      });

      const [initialTemplates, categoryRows] = await Promise.all([
        dashboardRequest<Template[]>("/api/v1/admin/templates"),
        dashboardRequest<Category[]>("/api/v1/admin/templates/categories"),
      ]);
      let templates = initialTemplates;

      let createdTemplate = createdResponse?.id
        ? templates.find((template) => template.id === createdResponse.id)
        : undefined;

      createdTemplate ??= [...templates]
        .sort((a, b) => b.id - a.id)
        .find((template) => !previousTemplateIds.has(template.id))
        ?? [...templates]
          .sort((a, b) => b.id - a.id)
          .find((template) => template.nameAr.trim() === createName.trim());

      // Some backends create only the catalog row first. Make sure the user
      // lands in a real draft editor instead of a dead-end card with no version.
      if (createdTemplate && !createdTemplate.versions.length) {
        await dashboardRequest(`/api/v1/admin/templates/${createdTemplate.id}/versions`, {
          method: "POST",
          body: JSON.stringify({ changeSummary: "الإصدار الأول" }),
        });
        templates = await dashboardRequest<Template[]>("/api/v1/admin/templates");
        createdTemplate = templates.find((template) => template.id === createdTemplate?.id) ?? createdTemplate;
      }

      setItems(templates);
      setCategories(categoryRows);
      if (createdTemplate?.categoryId) setSelectedFilter(`category:${createdTemplate.categoryId}`);
      closeTemplateDialog();

      const draftVersion = [...(createdTemplate?.versions ?? [])]
        .sort((a, b) => b.versionNumber - a.versionNumber)
        .find((version) => version.status === "draft")
        ?? [...(createdTemplate?.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber)[0];

      if (draftVersion) router.push(`/templates/versions/${draftVersion.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إنشاء نوع العقد");
    } finally {
      setBusy(null);
    }
  }

  async function submitCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nameAr = String(fd.get("nameAr") || "").trim();
    if (!nameAr) {
      setError("اكتب اسم التصنيف.");
      return;
    }
    setBusy(-2);
    setError("");
    setNotice("");
    try {
      if (categoryDialog?.mode === "edit") {
        await dashboardRequest(`/api/v1/admin/templates/categories/${categoryDialog.category.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            nameAr,
            description: fd.get("description"),
            sortOrder: Number(fd.get("sortOrder") || 0),
            isActive: fd.get("isActive") === "on",
          }),
        });
        setNotice("تم حفظ تعديل التصنيف.");
        setSelectedFilter(`category:${categoryDialog.category.id}`);
      } else {
        const created = await dashboardRequest<Partial<Category> & { id?: number }>("/api/v1/admin/templates/categories", {
          method: "POST",
          body: JSON.stringify({ nameAr, description: fd.get("description"), sortOrder: Number(fd.get("sortOrder") || 0) }),
        });
        setNotice("تم إنشاء التصنيف.");
        if (created?.id) setSelectedFilter(`category:${created.id}`);
      }
      setCategoryDialog(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ التصنيف");
    } finally {
      setBusy(null);
    }
  }

  async function updateTemplate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingTemplate) return;
    const fd = new FormData(e.currentTarget);
    const nameAr = String(fd.get("nameAr") || "").trim();
    const categoryId = String(fd.get("categoryId") || "");
    if (!nameAr) {
      setError("اكتب اسم العقد.");
      return;
    }
    if (!categoryId) {
      setError("اختار التصنيف.");
      return;
    }
    const selfServiceEnabled = fd.get("selfServiceEnabled") === "on";
    const lawyerDraftingEnabled = fd.get("lawyerDraftingEnabled") === "on";
    if (!selfServiceEnabled && !lawyerDraftingEnabled) {
      setError("فعّل طريقة تقديم واحدة على الأقل.");
      return;
    }

    setBusy(editingTemplate.id);
    setError("");
    setNotice("");
    try {
      await dashboardRequest(`/api/v1/admin/templates/${editingTemplate.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nameAr,
          description: fd.get("description"),
          categoryId: Number(categoryId),
          isActive: fd.get("isActive") === "on",
          selfServiceEnabled,
          lawyerDraftingEnabled,
        }),
      });
      await load();
      setEditingTemplate(null);
      setNotice("تم حفظ تعديل نوع العقد.");
    } catch {
      setError("تعذر حفظ تعديل نوع العقد.");
    } finally {
      setBusy(null);
    }
  }

  if (loading && !items.length) return <div className="p-8"><PageLoading /></div>;
  if (error && !items.length) return <div className="p-8"><PageError message={error} onRetry={load} /></div>;

  const editingVersions = editingTemplate ? [...editingTemplate.versions].sort((a, b) => b.versionNumber - a.versionNumber) : [];
  const editingLatestVersion = editingVersions[0];
  const editingDraftVersion = editingVersions.find((version) => version.status === "draft");
  const editingReviewVersion = editingVersions.find((version) => version.status === "legal_review");
  const editingBuilderVersion = editingDraftVersion ?? editingReviewVersion ?? editingLatestVersion;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-end">
        <div>
          <span className="inline-flex rounded-full bg-[#986410]/10 px-3 py-1 text-[11px] font-bold text-[#986410]">تصنيف → نوع عقد → قالب / إصدار</span>
          <h1 className="mt-2 text-xl font-bold text-[#00102e]">أنواع العقود</h1>
          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">
            إدارة أنواع العقود وتصنيفاتها، ثم فتح كل عقد لتعديل القالب والإصدارات.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700" aria-label="تحديث">
            <RefreshCw className="h-4 w-4" />تحديث
          </button>
          <button onClick={() => setCategoryDialog({ mode: "create" })} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold">
            <Plus className="h-4 w-4" />إضافة تصنيف
          </button>
          <button onClick={openTemplateDialogForCurrentFilter} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-sm font-bold text-[#d7a94f]">
            <Plus className="h-4 w-4" />إضافة نوع عقد
          </button>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{notice}</div>}

      <section className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFilter("all")}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition ${selectedFilter === "all" ? "bg-[#00102e] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  الكل <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{items.length}</span>
                </button>
                {visibleCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedFilter(`category:${category.id}`)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition ${selectedFilter === `category:${category.id}` ? "bg-[#986410] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {category.nameAr}
                    <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{category.templatesCount}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {selectedTitle} · ظاهر {filteredItems.length} من {items.length} نوع عقد.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث باسم العقد"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-9 text-xs font-medium text-[#00102e] outline-none focus:border-[#986410] focus:bg-white"
                />
              </label>
              {activeCategory && (
                <button type="button" onClick={() => setCategoryDialog({ mode: "edit", category: activeCategory })} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  <Edit3 className="h-3.5 w-3.5" />تعديل التصنيف
                </button>
              )}
            </div>
          </div>
        </div>

          {filteredItems.length ? (
            <div className="grid gap-3">
              {filteredItems.map((template) => {
                const orderedVersions = [...template.versions].sort((a, b) => b.versionNumber - a.versionNumber);
                const latestVersion = orderedVersions[0];
                const draftVersion = orderedVersions.find((version) => version.status === "draft");
                const reviewVersion = orderedVersions.find((version) => version.status === "legal_review");
                const managementVersion = draftVersion ?? reviewVersion ?? latestVersion;
                return (
                  <article key={template.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="p-3">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15px] font-bold text-[#00102e]">{template.nameAr}</h3>
                            <StatusBadge value={template.isActive ? "active" : "suspended"} />
                            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">{template.categoryNameAr || "غير مصنف"}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${template.selfServiceEnabled!==false&&template.currentPublishedVersionId?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>إنشاء ذاتي</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${template.lawyerDraftingEnabled!==false?"bg-blue-50 text-blue-700":"bg-slate-100 text-slate-500"}`}>صياغة بمحامي</span>
                            {draftVersion && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">مسودة</span>}
                            {!draftVersion && reviewVersion && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800">مراجعة</span>}
                          </div>
                          <p className="mt-1.5 line-clamp-1 max-w-3xl text-xs font-medium leading-5 text-slate-500">{template.description || "لا يوجد وصف لهذا العقد بعد."}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                            <span>{latestVersion ? `آخر إصدار v${latestVersion.versionNumber}` : "لا يوجد إصدار بعد"}</span>
                            <span>{template.versions.length} إصدار</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {managementVersion ? (
                            <Link href={`/templates/versions/${managementVersion.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-[#00102e] px-3.5 py-2 text-xs font-bold text-white">
                              <Eye className="h-3.5 w-3.5" />فتح وإدارة
                            </Link>
                          ) : (
                            <button disabled={busy === template.id} onClick={() => void cloneVersion(template)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#00102e] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50">
                              <CopyPlus className="h-3.5 w-3.5" />فتح وإدارة
                            </button>
                          )}
                          <details className="relative">
                            <summary className="inline-flex cursor-pointer list-none items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 [&::-webkit-details-marker]:hidden">⋯</summary>
                            <div className="absolute left-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold shadow-xl">
                              <button type="button" onClick={() => setEditingTemplate(template)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-[#00102e] hover:bg-slate-50">
                                <Edit3 className="h-4 w-4" />تعديل بيانات نوع العقد
                              </button>
                              <button type="button" disabled={busy === template.id} onClick={() => void cloneVersion(template)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                                <CopyPlus className="h-4 w-4" />إنشاء إصدار جديد
                              </button>
                            </div>
                          </details>
                        </div>
                      </div>

                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-xl font-bold text-slate-500">+</div>
              <h3 className="mt-3 text-base font-bold text-[#00102e]">لا توجد عقود هنا</h3>
              <p className="mt-1 text-xs font-bold text-slate-500">غيّر البحث أو أضف نوع عقد داخل هذا التصنيف.</p>
              <button onClick={openTemplateDialogForCurrentFilter} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#00102e] px-4 py-2 text-xs font-bold text-[#d7a94f]">
                <Plus className="h-3.5 w-3.5" />إضافة نوع عقد
              </button>
            </div>
          )}
      </section>

      <AdminDialog open={open} title="إضافة نوع عقد" description="أضف العقد للكتالوج أولًا، وبعد الإنشاء افتح القالب لإعداد الأسئلة والبنود." onClose={requestCloseTemplateDialog} maxWidth="max-w-3xl">
        <form onSubmit={createTemplate} className="space-y-5">
          <input type="hidden" name="nameAr" value={createName} />
          <input type="hidden" name="description" value={createDescription} />
          <input type="hidden" name="categoryId" value={createCategoryId} />

          <div className="grid gap-2 rounded-2xl bg-slate-50 p-2 sm:grid-cols-2">
            {[
              [1, "معلومات العقد"],
              [2, "طرق التقديم"],
            ].map(([step, label]) => {
              const numericStep = Number(step);
              const active = createStep === numericStep;
              const done = createStep > numericStep;
              return (
                <div key={numericStep} className={`rounded-xl px-3 py-2.5 text-center text-xs font-bold ${active ? "bg-[#00102e] text-white shadow-sm" : done ? "bg-emerald-50 text-emerald-800" : "text-slate-500"}`}>
                  <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border border-current/20">{done ? <CheckCircle2 className="h-4 w-4" /> : numericStep}</div>
                  {label}
                </div>
              );
            })}
          </div>

          {createStep === 1 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-[#00102e]">معلومات نوع العقد</div>
                <p className="mt-1 text-xs font-medium leading-6 text-slate-500">نوع العقد هو المنتج القانوني الذي يختاره العميل، مثل عقد إيجار سكني أو عقد بيع ابتدائي.</p>
              </div>
              <label className="block text-sm font-bold text-slate-700">اسم العقد
                <input value={createName} onChange={(event) => setCreateName(event.target.value)} autoFocus required placeholder="مثال: عقد إيجار سكني" className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-[#986410]" />
              </label>
              <label className="block text-sm font-bold text-slate-700">التصنيف
                <select value={createCategoryId} onChange={(event) => setCreateCategoryId(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal">
                  <option value="">اختار التصنيف...</option>
                  {visibleCategories.map((category) => <option key={category.id} value={category.id}>{category.nameAr}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700">وصف قصير للعميل
                <textarea value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} rows={3} placeholder="مثال: عقد لتنظيم إيجار وحدة سكنية بين المؤجر والمستأجر." className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal leading-7" />
              </label>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-[#00102e]">طرق تقديم العقد</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">يمكن تفعيل طريقة واحدة أو الطريقتين. السعر يُدار من صفحة الأسعار.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className={`rounded-2xl border p-4 text-right transition ${createSelfServiceEnabled ? "border-[#986410] bg-[#986410]/5 ring-2 ring-[#986410]/10" : "border-slate-200"}`}>
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-sm font-bold text-[#00102e]">العميل ينشئه بنفسه</span>
                      <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">بعد الإنشاء ستفتح محرر القالب لإعداد خطوات وأسئلة العقد.</span>
                    </span>
                    <input type="checkbox" checked={createSelfServiceEnabled} onChange={(event) => setCreateSelfServiceEnabled(event.target.checked)} className="mt-1 h-4 w-4 accent-[#986410]" />
                  </span>
                </label>
                <label className={`rounded-2xl border p-4 text-right transition ${createLawyerDraftingEnabled ? "border-[#986410] bg-[#986410]/5 ring-2 ring-[#986410]/10" : "border-slate-200"}`}>
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-sm font-bold text-[#00102e]">محامي يكتبه للعميل</span>
                      <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">يظهر كخدمة صياغة بواسطة محامٍ حسب إعدادات الخدمات والأسعار.</span>
                    </span>
                    <input type="checkbox" checked={createLawyerDraftingEnabled} onChange={(event) => setCreateLawyerDraftingEnabled(event.target.checked)} className="mt-1 h-4 w-4 accent-[#986410]" />
                  </span>
                </label>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">ملخص قبل الإنشاء</div>
                <h3 className="mt-1 text-base font-bold text-[#00102e]">{createName || "بدون اسم"}</h3>
                <div className="mt-3 grid gap-2 text-xs font-medium text-slate-600 sm:grid-cols-3">
                  <span>التصنيف: <b className="text-[#00102e]">{categories.find((category) => String(category.id) === createCategoryId)?.nameAr || "غير محدد"}</b></span>
                  <span>إنشاء ذاتي: <b className="text-[#00102e]">{createSelfServiceEnabled ? "مفعّل" : "غير مفعّل"}</b></span>
                  <span>صياغة بمحامي: <b className="text-[#00102e]">{createLawyerDraftingEnabled ? "مفعّلة" : "غير مفعّلة"}</b></span>
                </div>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-bold leading-6 text-blue-900">بعد الإنشاء ستفتح محرر القالب لإعداد الخطوات والأسئلة والبنود. السعر يُدار من صفحة الأسعار بشكل منفصل.</div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={createStep === 1 ? requestCloseTemplateDialog : () => setCreateStep(1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700">
              {createStep === 1 ? "إلغاء" : <><ArrowRight className="h-4 w-4" />السابق</>}
            </button>
            {createStep === 1 ? (
              <button type="button" disabled={!createName.trim() || !createCategoryId} onClick={() => setCreateStep(2)} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">التالي<ArrowLeft className="h-4 w-4" /></button>
            ) : (
              <button disabled={busy === -1 || !createName.trim() || !createCategoryId} className="inline-flex items-center gap-2 rounded-xl bg-[#986410] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{busy === -1 ? "جاري الإنشاء..." : "إنشاء وفتح القالب"}</button>
            )}
          </div>
        </form>
      </AdminDialog>

      <AdminDialog
        open={Boolean(editingTemplate)}
        title="تعديل نوع العقد"
        description="تعديل بيانات الكتالوج فقط. الأسئلة والبنود لها محرر قالب مستقل."
        onClose={() => setEditingTemplate(null)}
        maxWidth="max-w-3xl"
      >
        {editingTemplate && (
          <form onSubmit={updateTemplate} className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-base font-bold text-[#00102e]">بيانات العقد</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-bold text-slate-700">اسم العقد
                  <input name="nameAr" required defaultValue={editingTemplate.nameAr} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" />
                </label>
                <label className="block text-sm font-bold text-slate-700">التصنيف
                  <select name="categoryId" required defaultValue={editingTemplate.categoryId ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal">
                    <option value="">اختار التصنيف...</option>
                    {visibleCategories.map((category) => <option key={category.id} value={category.id}>{category.nameAr}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-bold text-slate-700 sm:col-span-2">وصف قصير للعميل
                  <textarea name="description" rows={2} defaultValue={editingTemplate.description} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal leading-6" />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700">
                  <span>الحالة: نشط في الكتالوج</span>
                  <input name="isActive" type="checkbox" defaultChecked={editingTemplate.isActive} className="h-4 w-4 accent-[#986410]" />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-base font-bold text-[#00102e]">طرق تقديم العقد</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                  <span><span className="block">العميل ينشئه بنفسه</span><span className="mt-1 block text-xs font-medium text-slate-500">يتطلب إصدارًا منشورًا ليظهر للعميل.</span></span>
                  <input name="selfServiceEnabled" type="checkbox" defaultChecked={editingTemplate.selfServiceEnabled !== false} className="mt-1 h-4 w-4 accent-[#986410]" />
                </label>
                <label className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                  <span><span className="block">محامي يكتبه للعميل</span><span className="mt-1 block text-xs font-medium text-slate-500">يظهر ضمن خدمات الصياغة.</span></span>
                  <input name="lawyerDraftingEnabled" type="checkbox" defaultChecked={editingTemplate.lawyerDraftingEnabled !== false} className="mt-1 h-4 w-4 accent-[#986410]" />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#00102e]">القالب والإصدارات</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    آخر إصدار: {editingLatestVersion ? `v${editingLatestVersion.versionNumber}` : "لا يوجد"} · الحالة: {editingLatestVersion?.status ?? "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingBuilderVersion ? (
                    <Link href={`/templates/versions/${editingBuilderVersion.id}`} className="rounded-xl bg-[#00102e] px-4 py-2.5 text-sm font-bold text-white">فتح محرر القالب</Link>
                  ) : (
                    <button type="button" disabled={busy === editingTemplate.id} onClick={() => void cloneVersion(editingTemplate)} className="rounded-xl bg-[#00102e] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">إنشاء أول إصدار</button>
                  )}
                </div>
              </div>
              {editingVersions.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold text-[#00102e]">إدارة الإصدارات</summary>
                  <div className="mt-3 space-y-2">
                    {editingVersions.map((version) => (
                      <div key={version.id} className="grid gap-2 rounded-xl bg-white p-3 text-sm sm:grid-cols-[60px_115px_minmax(0,1fr)_90px] sm:items-center">
                        <div className="font-bold text-[#00102e]">v{version.versionNumber}</div>
                        <StatusBadge value={version.status} />
                        <div className="min-w-0 truncate font-medium text-slate-600">{version.changeSummary || "بدون ملخص"}</div>
                        <Link href={`/templates/versions/${version.id}`} className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-[#00102e]">فتح</Link>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </section>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setEditingTemplate(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">إلغاء</button>
              <button disabled={busy === editingTemplate.id} className="rounded-xl bg-[#00102e] px-5 py-2.5 text-sm font-bold text-[#d7a94f]">حفظ التعديل</button>
            </div>
          </form>
        )}
      </AdminDialog>

      <AdminDialog
        open={Boolean(categoryDialog)}
        title={categoryDialog?.mode === "edit" ? "تعديل التصنيف" : "إضافة تصنيف"}
        description="التصنيف هو القسم الرئيسي اللي العميل بيشوف تحته أنواع العقود. مثال: بيع – إيجار – خدمات."
        onClose={() => setCategoryDialog(null)}
      >
        <form onSubmit={submitCategory} className="space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            اسم التصنيف
            <input name="nameAr" required defaultValue={categoryDialog?.mode === "edit" ? categoryDialog.category.nameAr : ""} placeholder="مثال: بيع" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            وصف قصير <span className="text-xs font-medium text-slate-400">(اختياري)</span>
            <textarea name="description" defaultValue={categoryDialog?.mode === "edit" ? categoryDialog.category.description : ""} placeholder="مثال: عقود بيع العقارات والمنقولات." className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            ترتيب الظهور
            <input name="sortOrder" type="number" min="0" defaultValue={categoryDialog?.mode === "edit" ? categoryDialog.category.sortOrder : 0} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" />
          </label>
          {categoryDialog?.mode === "edit" && (
            <>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700">
                <span>الحالة: نشط</span>
                <input name="isActive" type="checkbox" defaultChecked={categoryDialog.category.isActive} className="h-4 w-4 accent-[#986410]" />
              </label>
              {categoryDialog.category.templatesCount > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
                  لا يمكن حذف التصنيف قبل نقل أنواع العقود التابعة له. يمكنك تعطيله بدل الحذف إذا كان مستخدمًا تاريخيًا.
                </div>
              )}
            </>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCategoryDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">إلغاء</button>
            <button disabled={busy === -2} className="rounded-xl bg-[#00102e] px-5 py-2.5 text-sm font-bold text-[#d7a94f]">{categoryDialog?.mode === "edit" ? "حفظ التعديل" : "إنشاء التصنيف"}</button>
          </div>
        </form>
      </AdminDialog>
    </div>
  );
}
