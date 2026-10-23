"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard,
  ShieldCheck,
  Lock,
  Scale,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Package,
  RotateCcw,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { frontendApi, ApiClientError } from "@/lib/apiClient";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useCurrentUser();
  const { catalog } = usePublicCatalog();

  const queryContractId = searchParams.get("contractId");
  const queryServiceRequestId = searchParams.get("serviceRequestId");
  const queryAmount = Number(searchParams.get("amount") || 0);
  const queryTitle = searchParams.get("title") || "";
  const queryPurpose = searchParams.get("purpose") || "";

  // Available predefined services if direct checkout
  const defaultServices = useMemo(() => [
    {
      id: "contract_review",
      title: "مراجعة وتدقيق عقد قانوني قائم",
      desc: "فحص العقد بواسطة محامٍ ممارس وتقديم تقرير بالثغرات والتعديلات خلال 24-48 ساعة",
      priceEgp: catalog.services.contractReviewFeeEgp || 100,
      purpose: "contract_review_fee",
      type: "service",
    },
    {
      id: "lawyer_drafting_deposit",
      title: "عربون صياغة عقد مخصص بواسطة محامٍ",
      desc: "حجز وبدء عمل المحامي في صياغة عقد خاص متوافق مع طلبك وظروفك",
      priceEgp: catalog.services.contractDraftingDepositEgp || 100,
      purpose: "lawyer_drafting_deposit",
      type: "deposit",
    },
    {
      id: "self_service_sale",
      title: "صياغة عقد بيع ابتدائي موثق (فوري)",
      desc: "توليد فوري ذكي لعقد بيع وحدة سكنية بصيغتي PDF و Word جاهز للطباعة",
      priceEgp: 139,
      purpose: "self_service_issuance",
      type: "contract",
    },
    {
      id: "self_service_rental",
      title: "صياغة عقد إيجار سكني أو تجاري (فوري)",
      desc: "توليد فوري ذكي لعقد إيجار وفق القانون المدني المصري رقم 4 لسنة 1996",
      priceEgp: 59,
      purpose: "self_service_issuance",
      type: "contract",
    },
  ], [catalog.services]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("contract_review");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"card" | "meeza" | "wallet">("card");

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedRefund, setAcceptedRefund] = useState(false);
  const [acceptedDelivery, setAcceptedDelivery] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paidReference, setPaidReference] = useState("");

  const currentSelection = useMemo(() => {
    if (queryContractId || queryServiceRequestId || queryAmount > 0) {
      return {
        contractId: queryContractId ? Number(queryContractId) : undefined,
        serviceRequestId: queryServiceRequestId ? Number(queryServiceRequestId) : undefined,
        title: queryTitle || (queryContractId ? `عقد رقم #${queryContractId}` : "خدمة قانونية متعاقد عليها"),
        desc: "سداد رسوم الخدمة القانونية المعتمدة عبر المنصة",
        priceEgp: queryAmount > 0 ? queryAmount : 100,
        purpose: queryPurpose || "contract_issuance",
      };
    }
    const found = defaultServices.find((s) => s.id === selectedServiceId) || defaultServices[0];
    return {
      contractId: undefined,
      serviceRequestId: undefined,
      title: found.title,
      desc: found.desc,
      priceEgp: found.priceEgp,
      purpose: found.purpose,
    };
  }, [queryContractId, queryServiceRequestId, queryAmount, queryTitle, queryPurpose, selectedServiceId, defaultServices]);

  const allAccepted = acceptedTerms && acceptedRefund && acceptedDelivery;

  async function handleCheckout() {
    setError("");
    if (!allAccepted) {
      setError("يرجى الموافقة على الشروط والأحكام، سياسة الخصوصية، سياسة الشحن والتسليم، وسياسة الاسترداد قبل إتمام الدفع.");
      return;
    }

    if (!user) {
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      router.push(`/login?next=${encodeURIComponent(currentUrl)}`);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Record legal acceptances
      const [termsDoc, refundDoc] = await Promise.all([
        frontendApi.legalContent("terms_and_conditions"),
        frontendApi.legalContent("refund_cancellation_policy"),
      ]);

      await Promise.all([
        frontendApi.acceptLegal({
          documentType: "terms_and_conditions",
          publishedVersion: termsDoc.publishedVersion,
          context: "checkout",
        }),
        frontendApi.acceptLegal({
          documentType: "refund_cancellation_policy",
          publishedVersion: refundDoc.publishedVersion,
          context: "checkout",
        }),
      ]);

      // 2. Trigger checkout
      const returnUrl = typeof window !== "undefined" ? `${window.location.origin}/checkout?status=success` : undefined;
      const result = await frontendApi.createCheckout({
        contractId: currentSelection.contractId,
        serviceRequestId: currentSelection.serviceRequestId,
        amountEgp: currentSelection.priceEgp,
        purpose: currentSelection.purpose,
        lineItems: [
          { key: "item", label: currentSelection.title, amountEgp: currentSelection.priceEgp },
        ],
        returnUrl,
        metadata: {
          paymentMethodSelected: selectedPaymentMethod,
          checkoutSource: "web_checkout_page",
        },
      });

      if (result.checkoutUrl && result.redirectRequired !== false) {
        window.location.href = result.checkoutUrl;
        return;
      }

      if (result.status === "paid") {
        setPaidReference(result.transactionReference || String(result.paymentAttemptId));
        return;
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      setError("تم إنشاء المعاملة بنجاح، لكن بوابة الدفع لم تُرجع رابط متابعة. تواصل مع الدعم للمساعدة.");
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        const next = `${window.location.pathname}${window.location.search}`;
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      setError(caught instanceof Error ? caught.message : "تعذر بدء عملية الدفع حالياً. يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-right font-sans" dir="rtl">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {/* Page Title */}
        <div className="text-center sm:text-right">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-50 px-3.5 py-1 text-xs font-black text-emerald-800">
            <Lock className="h-3.5 w-3.5" /> صفحة إتمام الدفع الآمن (Checkout)
          </div>
          <h1 className="mt-3 text-2xl font-black text-[#00102e] sm:text-3xl">
            مراجعة الطلب وإتمام الدفع الإلكتروني
          </h1>
          <p className="mt-1.5 text-xs font-bold text-slate-500">
            جميع المعاملات المالية مشفرة وتتم عبر بوابات دفع إلكترونية مرخصة من البنك المركزي المصري.
          </p>
        </div>

        {paidReference ? (
          <div className="mt-10 mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-emerald-900">تم الدفع بنجاح!</h2>
            <p className="mt-2 text-xs font-bold text-slate-600">
              تم تسجيل العملية برقم مرجعي: <b className="font-mono font-black text-[#00102e]">{paidReference}</b>
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              تم تفعيل طلبك ويمكنك الآن تحميل وثيقتك القانونية أو متابعة صياغة المحامي من لوحة تحكمك.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/contracts"
                className="rounded-xl bg-[#00102e] px-6 py-2.5 text-xs font-black text-[#d9a84e] hover:bg-[#001a42]"
              >
                الذهاب لسجل العقود
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-300 px-6 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                لوحة التحكم الرئيسية
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            {/* Left/Main Column: Selection & Consents */}
            <div className="space-y-6 lg:col-span-7">
              {/* If no query params, let user select from catalog */}
              {!queryContractId && !queryServiceRequestId && queryAmount <= 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-black text-[#00102e]">اختر الخدمة أو العقد المطلوب سداده:</h3>
                  <div className="mt-4 space-y-2.5">
                    {defaultServices.map((svc) => (
                      <label
                        key={svc.id}
                        className={`flex cursor-pointer items-start justify-between gap-3 rounded-2xl border p-4 transition ${
                          selectedServiceId === svc.id
                            ? "border-[#986410] bg-amber-50/40 shadow-xs"
                            : "border-slate-200 hover:bg-slate-50/70"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="selectedService"
                            checked={selectedServiceId === svc.id}
                            onChange={() => setSelectedServiceId(svc.id)}
                            className="mt-1 h-4 w-4 accent-[#986410]"
                          />
                          <div>
                            <div className="text-sm font-black text-[#00102e]">{svc.title}</div>
                            <div className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                              {svc.desc}
                            </div>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <strong className="text-sm font-black text-[#986410]">
                            {svc.priceEgp.toLocaleString("ar-EG")} ج.م
                          </strong>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Method Selector */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-black text-[#00102e]">طريقة الدفع المفضلة:</h3>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("card")}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition ${
                      selectedPaymentMethod === "card"
                        ? "border-[#986410] bg-amber-50/50 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="h-6 w-6 text-[#00102e]" />
                    <span className="mt-2 text-xs font-black text-[#00102e]">بطاقة بنكية</span>
                    <span className="text-[10px] text-slate-400 font-bold">Visa / MasterCard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("meeza")}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition ${
                      selectedPaymentMethod === "meeza"
                        ? "border-[#986410] bg-amber-50/50 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex h-6 items-center text-xs font-black text-[#d9a84e]">Meeza</span>
                    <span className="mt-2 text-xs font-black text-[#00102e]">بطاقة ميزة الوطنية</span>
                    <span className="text-[10px] text-slate-400 font-bold">كافة البنوك المصرية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("wallet")}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition ${
                      selectedPaymentMethod === "wallet"
                        ? "border-[#986410] bg-amber-50/50 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex h-6 items-center text-xs font-black text-rose-600">Wallet</span>
                    <span className="mt-2 text-xs font-black text-[#00102e]">المحافظ الإلكترونية</span>
                    <span className="text-[10px] text-slate-400 font-bold">فودافون كاش / إنستاباي</span>
                  </button>
                </div>
              </div>

              {/* Mandatory Compliance Checkboxes */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-black text-[#00102e]">الإقرارات القانونية وسياسات الاستخدام:</h3>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  لإتمام الدفع وفقاً لمتطلبات بوابات الدفع والقوانين المنظمة، يرجى مراجعة السياسات التالية وتأكيد الموافقة:
                </p>

                <div className="mt-4 space-y-3.5">
                  <label className="flex items-start gap-3 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#986410]"
                    />
                    <span>
                      أوافق على{" "}
                      <Link href="/terms" target="_blank" className="text-[#986410] underline font-black">
                        الشروط والأحكام العامة
                      </Link>{" "}
                      و{" "}
                      <Link href="/privacy" target="_blank" className="text-[#986410] underline font-black">
                        سياسة الخصوصية
                      </Link>{" "}
                      لمنصة Z Draft.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={acceptedDelivery}
                      onChange={(e) => setAcceptedDelivery(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#986410]"
                    />
                    <span>
                      أقر باطلاعي وموافقتي على{" "}
                      <Link href="/delivery-policy" target="_blank" className="text-[#986410] underline font-black">
                        سياسة الشحن والتسليم وتلقي الخدمات القانونية
                      </Link>{" "}
                      (التسليم الفوري الرقمي والنسخ المطبوعة عند الطلب).
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={acceptedRefund}
                      onChange={(e) => setAcceptedRefund(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#986410]"
                    />
                    <span>
                      أقر باطلاعي على{" "}
                      <Link href="/refund-policy" target="_blank" className="text-[#986410] underline font-black">
                        سياسة الإلغاء والاسترداد
                      </Link>{" "}
                      ومعايير استرجاع المبالغ ومدة التنفيذ المصرفي.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right/Summary Column */}
            <div className="space-y-6 lg:col-span-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-2 text-xs font-black text-[#986410]">
                  <Scale className="h-4 w-4" /> ملخص الطلب والفاتورة
                </div>

                <div className="mt-4 border-b border-slate-100 pb-4">
                  <h3 className="text-base font-black text-[#00102e]">{currentSelection.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 font-medium">{currentSelection.desc}</p>
                </div>

                <div className="mt-4 space-y-2.5 text-xs font-bold">
                  <div className="flex justify-between text-slate-600">
                    <span>قيمة الخدمة الأساسية:</span>
                    <span>{currentSelection.priceEgp.toLocaleString("ar-EG")} ج.م</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ضريبة القيمة المضافة / المصاريف:</span>
                    <span className="text-emerald-700 font-black">شاملة ومشمولة</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-black text-[#00102e]">
                    <span>المبلغ الإجمالي للدفع:</span>
                    <span className="text-[#986410] font-black">
                      {currentSelection.priceEgp.toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={submitting || !allAccepted}
                  onClick={() => void handleCheckout()}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black transition ${
                    allAccepted && !submitting
                      ? "bg-[#00102e] text-[#d9a84e] hover:bg-[#001a42] shadow-md"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري تحويلك لبوابة الدفع…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      إتمام الدفع الآمن الآن ({currentSelection.priceEgp.toLocaleString("ar-EG")} ج.م)
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>تأمين كامل وتشفير 256-Bit SSL</span>
                </div>
              </div>

              {/* Delivery & Fulfillment Info Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2 font-black text-[#00102e]">
                  <Package className="h-4 w-4 text-[#986410]" /> كيفية وموعد استلام وثيقتك:
                </div>
                <p className="mt-2 leading-relaxed text-[11px]">
                  فور إتمام الدفع، ستتاح لك مسودة العقد فورياً بصيغتي PDF و Word في قسم "عقودي"، بالإضافة لنسخة مرسلة لبريدك الإلكتروني، مع إمكانية شحن نسخ مطبوعة ومجلدة عند الطلب.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
          <Loader2 className="h-8 w-8 animate-spin text-[#986410]" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
