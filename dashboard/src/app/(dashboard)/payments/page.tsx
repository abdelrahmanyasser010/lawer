"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, RefreshCw, X } from "lucide-react";
import { dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

type Payment = {
  id: number;
  serialNumber: string;
  amountEgp: number;
  status: string;
  senderPhone?: string;
  receiptAttachmentId?: number;
  receiptMimeType?: string;
  receiptThumbnailAvailable?: boolean;
  contractId?: number;
  serviceRequestId?: number;
  createdAt: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
};

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [status, setStatus] = useState("pending_verification");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setItems(await dashboardRequest<Payment[]>(`/api/v1/admin/payments${status ? `?status=${status}` : ""}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل المدفوعات");
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function approve(id: number) {
    const notes = window.prompt("ملاحظات الاعتماد (اختياري)") || undefined;
    setBusy(id);
    try {
      await dashboardRequest(`/api/v1/admin/payments/${id}/approve`, { method: "POST", body: JSON.stringify({ notes }) });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر الاعتماد");
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: number) {
    const reason = window.prompt("اكتب سبب رفض الإيصال");
    if (!reason) return;
    setBusy(id);
    try {
      await dashboardRequest(`/api/v1/admin/payments/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر الرفض");
    } finally {
      setBusy(null);
    }
  }

  if (error && !items.length) return <div className="p-8"><PageError message={error} onRetry={load} /></div>;
  if (!items.length && !error && status === "pending_verification") return <div className="p-8"><PageLoading /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black text-[#00102e]">مراجعة المدفوعات</h1>
          <p className="text-sm text-slate-500">الإيصالات المصورة تُعالج وتُصغّر داخل السيرفر مع إزالة البيانات الوصفية، ثم تظهر معاينة خاصة للمراجعة.</p>
        </div>
        <div className="flex gap-2">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black">
            <option value="pending_verification">قيد المراجعة</option>
            <option value="approved">معتمدة</option>
            <option value="rejected">مرفوضة</option>
            <option value="">الكل</option>
          </select>
          <button onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white p-2.5"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </header>

      {error && <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-right text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="p-4">الإيصال</th><th className="p-4">العملية</th><th className="p-4">العميل</th><th className="p-4">المبلغ</th><th className="p-4">الارتباط</th><th className="p-4">الحالة</th><th className="p-4">الإجراء</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((payment) => {
                const downloadUrl = payment.receiptAttachmentId ? `${API_BASE_URL}/api/v1/attachments/${payment.receiptAttachmentId}/download` : null;
                const thumbnailUrl = payment.receiptAttachmentId && payment.receiptThumbnailAvailable
                  ? `${API_BASE_URL}/api/v1/attachments/${payment.receiptAttachmentId}/thumbnail`
                  : null;
                return (
                  <tr key={payment.id}>
                    <td className="p-4">
                      {downloadUrl ? (
                        <a href={downloadUrl} target="_blank" rel="noreferrer" className="block h-20 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {thumbnailUrl ? <img src={thumbnailUrl} alt="معاينة إيصال الدفع" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center px-2 text-center text-[10px] font-black text-slate-500">فتح {payment.receiptMimeType === "application/pdf" ? "PDF" : "الملف"}</span>}
                        </a>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="p-4"><div className="font-mono font-bold">{payment.serialNumber}</div><div className="mt-1 text-[10px] text-slate-400">{new Date(payment.createdAt).toLocaleString("ar-EG")}</div></td>
                    <td className="p-4"><div className="font-black text-[#00102e]">{payment.clientName}</div><div className="text-[10px] text-slate-400">{payment.clientEmail} · {payment.senderPhone || payment.clientPhone || "—"}</div></td>
                    <td className="p-4 text-lg font-black text-[#00102e]">{payment.amountEgp.toLocaleString("ar-EG")} ج.م</td>
                    <td className="p-4">{payment.contractId ? `عقد #${payment.contractId}` : `طلب #${payment.serviceRequestId}`}</td>
                    <td className="p-4"><StatusBadge value={payment.status} /></td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {payment.status === "pending_verification" && <>
                          <button disabled={busy === payment.id} onClick={() => void approve(payment.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 font-black text-white"><Check className="h-3.5 w-3.5" />اعتماد</button>
                          <button disabled={busy === payment.id} onClick={() => void reject(payment.id)} className="inline-flex items-center gap-1 rounded-lg bg-red-700 px-3 py-2 font-black text-white"><X className="h-3.5 w-3.5" />رفض</button>
                        </>}
                        {downloadUrl && <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-slate-200 p-2 text-slate-500" title="فتح إيصال الدفع"><ExternalLink className="h-4 w-4" /></a>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {items.length === 0 && <div className="p-12 text-center text-sm font-bold text-slate-500">لا توجد عمليات في هذا التصنيف.</div>}
      </div>
    </div>
  );
}
