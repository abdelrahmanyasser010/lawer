"use client";

import { FileText, Lock } from "lucide-react";

type ContractPreviewData = Record<string, string | number | boolean | null | undefined>;

interface Props {
  serialNumber: string;
  contractTitle: string;
  isPaid: boolean;
  data: ContractPreviewData;
}

export default function ContractPdfPreview({ serialNumber, contractTitle, isPaid, data }: Props) {
  const rows = Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== "");
  return (
    <section className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="font-mono text-[11px] text-slate-400">{serialNumber}</div>
          <h2 className="mt-2 text-xl font-black text-[#00102e]">{contractTitle}</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
          {isPaid ? <Lock className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          {isPaid ? "نسخة العقد المحفوظة" : "معاينة قانونية"}
        </div>
      </header>
      <p className="mt-5 text-xs leading-6 text-slate-600">تعرض هذه المعاينة نفس بيانات العقد ونفس المحتوى القانوني المعتمد لتوليد النسخة النهائية، بحيث لا يختلف ما يراجعه العميل عن المستند الذي سيصدر لاحقًا إلا فيما يخص حالة الاعتماد والتوقيع.</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows.map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-bold text-slate-500">{key}</dt><dd className="mt-1 break-words text-xs font-black text-slate-900">{typeof value === "boolean" ? (value ? "نعم" : "لا") : String(value)}</dd></div>)}
      </dl>
    </section>
  );
}
