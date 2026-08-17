"use client";

import { useState } from "react";
import { CheckCircle2, FileText, X } from "lucide-react";
import LegalDocumentSheet from "@/components/contract/LegalDocumentSheet";

export interface MobilePreviewRow { label: string; value: string; }

export default function MobileWizardPreview({
  open,
  onClose,
  title,
  serial,
  contractSlug,
  variantKey,
  selectedOptionalClauseKeys = [],
  fieldValues = {},
  rows,
  annexes,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  serial: string;
  contractSlug?: string | null;
  variantKey?: string | null;
  selectedOptionalClauseKeys?: string[] | null;
  fieldValues?: Record<string, any>;
  rows: MobilePreviewRow[];
  annexes: string[];
}) {
  const [activeTab, setActiveTab] = useState<"document" | "summary">("document");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#00102e]/75 p-0 backdrop-blur-sm sm:items-center sm:p-4 xl:hidden" dir="rtl">
      <section className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 pb-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("document")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${
                activeTab === "document"
                  ? "bg-[#00102e] text-[#d9a84e]"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              معاينة العقد
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${
                activeTab === "summary"
                  ? "bg-[#00102e] text-[#d9a84e]"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              ملخص البيانات
            </button>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mt-4">
          {activeTab === "document" ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-4">
              <LegalDocumentSheet
                serialNumber={serial}
                templateSlug={contractSlug}
                variantKey={variantKey}
                selectedOptionalClauseKeys={selectedOptionalClauseKeys}
                templateNameAr={title}
                fieldValues={fieldValues}
                status="draft"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs leading-7 text-slate-700">
              <div className="border-b-2 border-[#00102e] pb-4 text-center">
                <div className="text-[9px] font-black text-[#986410]">منصة Z draft لإعداد العقود</div>
                <h3 className="mt-1 text-lg font-black text-[#00102e]">{title}</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{serial}</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {rows.length ? rows.slice(0, 40).map((row, index) => (
                  <PreviewItem key={`${row.label}-${index}`} label={row.label} value={row.value} />
                )) : (
                  <p className="col-span-2 text-center text-slate-400 py-4 text-xs">ابدأ بإدخال بيانات العقد لتظهر هنا.</p>
                )}
              </div>
              {annexes.length > 0 && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-[10px] font-black text-emerald-900">الملاحق المختارة</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {annexes.map(name => <span key={name} className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-emerald-800">{name}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl bg-[#00102e] py-3 text-xs font-black text-[#d9a84e]">
          العودة لإدخال البيانات
        </button>
      </section>
    </div>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className="block text-[9px] font-bold text-slate-400">{label}</span>
      <strong className="mt-0.5 block break-words text-[11px] text-[#00102e]">{value}</strong>
    </div>
  );
}
