"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Eye, Link2, Lock, Pencil, Share2, ShieldCheck, X } from "lucide-react";
import { apiRequest } from "@/lib/apiClient";

type Permission = "view_only" | "edit";

type ShareResult = {
  id: number;
  token: string;
  shareUrl: string;
  permission: Permission;
  expiresAt: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contractId: number;
  documentTitle: string;
  serialNumber: string;
  allowEdit?: boolean;
}

export default function ZShareModal({
  isOpen,
  onClose,
  contractId,
  documentTitle,
  serialNumber,
  allowEdit = true,
}: Props) {
  const [permission, setPermission] = useState<Permission>("view_only");
  const [expiry, setExpiry] = useState("7");
  const [recipientZId, setRecipientZId] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ShareResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPermission("view_only");
    setExpiry("7");
    setRecipientZId("");
    setCopied(false);
    setBusy(false);
    setError("");
    setResult(null);
  }, [isOpen, contractId]);

  if (!isOpen) return null;

  async function createLink() {
    setBusy(true);
    setError("");
    try {
      const created = await apiRequest<ShareResult>(`/api/v1/contracts/${contractId}/shares`, {
        method: "POST",
        body: JSON.stringify({
          permission,
          targetPublicId: recipientZId.trim() || undefined,
          expiresInDays: Number(expiry),
        }),
      });
      setResult(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إنشاء رابط المشاركة.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!result?.shareUrl) return;
    await navigator.clipboard.writeText(result.shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#00102e]/75 p-4 backdrop-blur-sm" onClick={onClose} dir="rtl">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between bg-[#00102e] px-5 py-4 text-white">
          <div className="flex items-center gap-2"><Share2 className="h-5 w-5 text-[#d9a84e]" /><h2 className="text-sm font-black">مشاركة العقد</h2></div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10"><X className="h-4 w-4" /></button>
        </header>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-black text-[#00102e]">{documentTitle}</div>
            <div className="mt-1 font-mono text-[10px] text-slate-400">{serialNumber}</div>
          </div>

          {!result ? (
            <>
              <div>
                <label className="mb-2 block text-xs font-black text-slate-700">Z-ID للطرف الآخر <span className="font-semibold text-slate-400">(اختياري)</span></label>
                <input
                  value={recipientZId}
                  onChange={(event) => setRecipientZId(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32))}
                  placeholder="اتركه فارغًا لرابط غير مقيّد بحساب"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-mono text-xs outline-none focus:border-[#986410]"
                />
              </div>

              <div>
                <div className="mb-2 text-xs font-black text-slate-700">الصلاحية</div>
                <div className={`grid gap-2 ${allowEdit ? "grid-cols-2" : "grid-cols-1"}`}>
                  <button type="button" onClick={() => setPermission("view_only")} className={`rounded-xl border p-3 text-right ${permission === "view_only" ? "border-[#986410] bg-[#986410]/5" : "border-slate-200"}`}>
                    <span className="flex items-center gap-2 text-xs font-black text-[#00102e]"><Eye className="h-4 w-4" /> عرض فقط</span>
                    <span className="mt-1 block text-[10px] leading-5 text-slate-500">يشاهد البيانات المشتركة بدون تعديل.</span>
                  </button>
                  {allowEdit && <button type="button" onClick={() => setPermission("edit")} className={`rounded-xl border p-3 text-right ${permission === "edit" ? "border-[#986410] bg-[#986410]/5" : "border-slate-200"}`}>
                    <span className="flex items-center gap-2 text-xs font-black text-[#00102e]"><Pencil className="h-4 w-4" /> مراجعة وتعديل</span>
                    <span className="mt-1 block text-[10px] leading-5 text-slate-500">يعدل الحقول غير الأساسية فقط خلال فترة التعديل.</span>
                  </button>}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black text-slate-700">مدة صلاحية الرابط</label>
                <select value={expiry} onChange={(event) => setExpiry(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs outline-none focus:border-[#986410]">
                  <option value="1">24 ساعة</option>
                  <option value="3">3 أيام</option>
                  <option value="7">7 أيام</option>
                  <option value="30">30 يومًا</option>
                </select>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold leading-5 text-amber-900">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" /> بيانات الهوية الأساسية تظل محمية، والمشاركة لا تتاح أصلًا قبل اعتماد الدفع.
              </div>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
              <button type="button" disabled={busy} onClick={() => void createLink()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] py-3 text-xs font-black text-white disabled:opacity-60"><Link2 className="h-4 w-4 text-[#d9a84e]" />{busy ? "جاري إنشاء الرابط..." : "إنشاء رابط المشاركة"}</button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900"><ShieldCheck className="h-4 w-4 shrink-0" /> تم إنشاء رابط مشاركة محدود الصلاحية بنجاح.</div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div dir="ltr" className="break-all text-[10px] text-slate-600">{result.shareUrl}</div>
                <button type="button" onClick={() => void copyLink()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-black text-[#00102e]">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}{copied ? "تم النسخ" : "نسخ الرابط"}</button>
              </div>
              <button type="button" onClick={onClose} className="w-full rounded-xl bg-[#00102e] py-3 text-xs font-black text-white">تم</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
