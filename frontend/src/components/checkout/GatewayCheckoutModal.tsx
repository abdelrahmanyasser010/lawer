"use client";

import Link from "next/link";
import { CheckCircle2, CreditCard, ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { frontendApi, ApiClientError } from "@/lib/apiClient";
import { usePaymentAccess } from "@/hooks/usePaymentAccess";
import type { PaymentLineItem } from "@/types/customer";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderTitle: string;
  amountEgp: number;
  contractId?: number;
  serviceRequestId?: number;
  serialNumber?: string;
  purpose: string;
  lineItems?: PaymentLineItem[];
  metadata?: Record<string, unknown>;
  onPaid?: (result: { paymentAttemptId: string | number; transactionReference?: string | null }) => void;
}

export default function GatewayCheckoutModal({
  isOpen,
  onClose,
  orderTitle,
  amountEgp,
  contractId,
  serviceRequestId,
  serialNumber,
  purpose,
  lineItems = [],
  metadata,
  onPaid,
}: Props) {
  const router = useRouter();
  const targetPath = contractId ? `/contract/${contractId}` : serviceRequestId ? `/requests/${serviceRequestId}` : "/";
  const { paymentAccess, paymentVerified, requireVerified } = usePaymentAccess(targetPath);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [paidRef, setPaidRef] = useState("");
  const [legalVersions, setLegalVersions] = useState<{ terms?: number; refund?: number }>({});

  useEffect(() => {
    if (!isOpen) {
      setAccepted(false);
      setError("");
      setPaidRef("");
      setSubmitting(false);
      return;
    }
    let active = true;
    Promise.allSettled([frontendApi.legalContent("terms_and_conditions"), frontendApi.legalContent("refund_cancellation_policy")]).then(([terms, refund]) => {
      if (!active) return;
      setLegalVersions({
        terms: terms.status === "fulfilled" ? terms.value.publishedVersion : undefined,
        refund: refund.status === "fulfilled" ? refund.value.publishedVersion : undefined,
      });
    });
    return () => { active = false; };
  }, [isOpen]);

  const displayItems = useMemo(() => {
    if (lineItems.length) return lineItems;
    return [{ key: "total", label: "المبلغ المطلوب", amountEgp }];
  }, [amountEgp, lineItems]);

  if (!isOpen) return null;

  async function checkout() {
    setError("");
    if (!(await requireVerified())) {
      onClose();
      return;
    }
    if (!accepted) {
      setError("راجع الشروط وسياسة الإلغاء والاسترداد ووافق عليها قبل الدفع.");
      return;
    }
    if ((!contractId && !serviceRequestId) || amountEgp <= 0) {
      setError("تعذر تحديد الطلب أو قيمة الدفع.");
      return;
    }

    setSubmitting(true);
    try {
      let versions = legalVersions;
      if (!versions.terms || !versions.refund) {
        const [terms, refund] = await Promise.all([frontendApi.legalContent("terms_and_conditions"), frontendApi.legalContent("refund_cancellation_policy")]);
        versions = { terms: terms.publishedVersion, refund: refund.publishedVersion };
        setLegalVersions(versions);
      }
      await Promise.all([
        frontendApi.acceptLegal({ documentType: "terms_and_conditions", publishedVersion: versions.terms!, context: "checkout" }),
        frontendApi.acceptLegal({ documentType: "refund_cancellation_policy", publishedVersion: versions.refund!, context: "checkout" }),
      ]);

      const result = await frontendApi.createCheckout({
        contractId,
        serviceRequestId,
        amountEgp,
        purpose,
        lineItems: displayItems,
        returnUrl: typeof window !== "undefined" ? `${window.location.origin}${targetPath}?payment=return` : targetPath,
        metadata,
      });

      if (result.checkoutUrl && result.redirectRequired !== false) {
        window.location.href = result.checkoutUrl;
        return;
      }

      if (result.status === "paid") {
        const ref = result.transactionReference || String(result.paymentAttemptId);
        setPaidRef(ref);
        onPaid?.({ paymentAttemptId: result.paymentAttemptId, transactionReference: result.transactionReference });
        return;
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      setError("تم إنشاء محاولة الدفع، لكن بوابة الدفع لم تُرجع رابط متابعة صالحًا.");
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.push(`/login?next=${encodeURIComponent(targetPath)}`);
        onClose();
        return;
      }
      setError(caught instanceof Error ? caught.message : "تعذر بدء عملية الدفع الآن.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#00102e]/85 p-4 backdrop-blur-sm" dir="rtl">
      <section className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-950 p-6 text-right shadow-2xl sm:p-8">
        <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-5 top-5 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>

        {paidRef ? (
          <div className="py-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"><CheckCircle2 className="h-8 w-8" /></div>
            <h2 className="mt-5 text-xl font-black text-white">تم الدفع بنجاح</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">تم تأكيد العملية من النظام. مرجع الدفع <strong className="font-mono text-[#d9a84e]">{paidRef}</strong>.</p>
            <button type="button" onClick={() => { onClose(); router.push(targetPath); router.refresh(); }} className="mt-6 rounded-xl bg-[#986410] px-6 py-3 text-sm font-black text-white">متابعة الطلب</button>
          </div>
        ) : !paymentVerified ? (
          <div className="py-5 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-[#d9a84e]" />
            <h2 className="mt-4 text-lg font-black text-white">تأكيد الحساب مطلوب قبل الدفع</h2>
            <p className="mt-2 text-xs leading-6 text-slate-400">سجّل الدخول وأكد بريدك الإلكتروني، وبعدها ارجع لنفس الطلب لإتمام الدفع.</p>
            <button type="button" onClick={() => void requireVerified().then((ok) => { if (!ok) onClose(); })} className="mt-5 rounded-xl bg-[#986410] px-5 py-3 text-xs font-black text-white">{paymentAccess === "unverified" ? "تأكيد البريد الإلكتروني" : "تسجيل الدخول والمتابعة"}</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#986410]/15 p-3 text-[#d9a84e]"><CreditCard className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] font-black text-[#d9a84e]">الدفع الإلكتروني الآمن</p>
                <h2 className="mt-1 text-xl font-black text-white">{orderTitle}</h2>
                {serialNumber && <p className="mt-1 font-mono text-[10px] text-slate-500">{serialNumber}</p>}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <h3 className="text-xs font-black text-white">ملخص الدفع</h3>
              <div className="mt-3 space-y-2">
                {displayItems.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-slate-400">{item.label}</span>
                    <strong className="text-white">{item.amountEgp.toLocaleString("ar-EG")} ج.م</strong>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-700 pt-3">
                <span className="text-xs font-black text-white">الإجمالي</span>
                <strong className="text-lg font-black text-[#d9a84e]">{amountEgp.toLocaleString("ar-EG")} ج.م</strong>
              </div>
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-[11px] leading-6 text-slate-300">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#986410]" />
              <span>
                راجعت <Link href="/terms" target="_blank" className="font-black text-[#d9a84e]">الشروط والأحكام</Link> و<Link href="/refund-policy" target="_blank" className="font-black text-[#d9a84e]">سياسة الإلغاء والاسترداد</Link> وأوافق على المتابعة للدفع.
              </span>
            </label>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-[10px] leading-5 text-blue-100">
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              سيتم نقلك لبوابة الدفع الإلكترونية. حالة الدفع المؤكدة من السيرفر هي المرجع النهائي للعملية.
            </div>

            {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</div>}
            <button type="button" disabled={submitting || !accepted} onClick={() => void checkout()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-black text-white disabled:opacity-50">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري فتح بوابة الدفع...</> : `ادفع ${amountEgp.toLocaleString("ar-EG")} ج.م`}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
