"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, FileText, HelpCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { apiRequest, ApiClientError } from "@/lib/apiClient";
import { contractStatusLabels, paymentStatusLabels, requestStatusLabels, requestTypeLabels } from "@/lib/labels";

type Tab = "contracts" | "requests" | "payments";
type Contract = { id: number; serialNumber: string; title: string; status: string; updatedAt: string; templateNameAr: string; sourceChannel: string };
type RequestItem = { id: number; serialNumber: string; requestType: string; title: string; status: string; createdAt: string };
type Payment = { id: number; serialNumber: string; amountEgp: number; status: string; paymentMethod: string; contractId?: number; serviceRequestId?: number; createdAt: string; adminNotes?: string };

const paymentMethodLabels: Record<string, string> = {
  vodafone_cash: "Vodafone Cash",
  manual: "دفع يدوي",
  cash: "نقدًا",
  bank_transfer: "تحويل بنكي",
};

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("contracts");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, r, p] = await Promise.all([
        apiRequest<Contract[]>("/api/v1/contracts/my"),
        apiRequest<RequestItem[]>("/api/v1/service-requests/my"),
        apiRequest<Payment[]>("/api/v1/payments/my"),
      ]);
      setContracts(c);
      setRequests(r);
      setPayments(p);
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 401
        ? "سجل الدخول لعرض سجل حسابك."
        : caught instanceof Error ? caught.message : "تعذر تحميل السجل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const tabs: [Tab, string, number, typeof FileText][] = [
    ["contracts", "العقود", contracts.length, FileText],
    ["requests", "الاستشارات", requests.length, HelpCircle],
    ["payments", "المدفوعات", payments.length, CreditCard],
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black text-slate-950">سجل الحساب</h1>
        <p className="mt-1 text-sm text-slate-600">العقود والاستشارات والمدفوعات المحفوظة داخل حسابك.</p>

        {loading ? (
          <div className="mt-8 rounded-2xl border bg-white p-12"><Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-700" /></div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="font-bold text-amber-900">{error}</p>
            <Link href="/login?next=/history" className="mt-4 inline-block rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-black text-white">تسجيل الدخول</Link>
          </div>
        ) : (
          <>
            <div className="mt-7 flex gap-2 overflow-x-auto border-b border-slate-200">
              {tabs.map(([key, label, count, Icon]) => (
                <button key={key} onClick={() => setTab(key)} className={`flex min-w-max items-center gap-2 border-b-2 px-4 py-3 text-xs font-black ${tab === key ? "border-blue-700 text-blue-700" : "border-transparent text-slate-500"}`}>
                  <Icon className="h-4 w-4" />{label} ({count})
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              {tab === "contracts" && contracts.map((contract) => (
                <Card
                  key={contract.id}
                  title={contract.title || contract.templateNameAr}
                  serial={contract.serialNumber}
                  status={contractStatusLabels[contract.status] || "تم تحديث حالة العقد"}
                  meta={`عقد محفوظ · ${new Date(contract.updatedAt).toLocaleDateString("ar-EG")}`}
                  href={`/contract/${contract.id}`}
                />
              ))}

              {tab === "requests" && requests.map((request) => (
                <Card
                  key={request.id}
                  title={request.title}
                  serial={request.serialNumber}
                  status={requestStatusLabels[request.status] || "تم تحديث الاستشارة"}
                  meta={`${requestTypeLabels[request.requestType] || "استشارة قانونية"} · ${new Date(request.createdAt).toLocaleDateString("ar-EG")}`}
                  href={`/requests/${request.id}`}
                />
              ))}

              {tab === "payments" && payments.map((payment) => (
                <Card
                  key={payment.id}
                  title={`${payment.amountEgp} ج.م — ${paymentMethodLabels[payment.paymentMethod] || "طريقة الدفع المسجلة"}`}
                  serial={payment.serialNumber}
                  status={paymentStatusLabels[payment.status] || "تم تحديث حالة الدفع"}
                  meta={payment.adminNotes || new Date(payment.createdAt).toLocaleString("ar-EG")}
                  href={payment.contractId ? `/contract/${payment.contractId}` : payment.serviceRequestId ? `/requests/${payment.serviceRequestId}` : undefined}
                />
              ))}

              {((tab === "contracts" && !contracts.length) || (tab === "requests" && !requests.length) || (tab === "payments" && !payments.length)) && (
                <div className="rounded-2xl border bg-white p-12 text-center text-sm font-bold text-slate-500">لا توجد بيانات في هذا القسم.</div>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Card({ title, serial, status, meta, href }: { title: string; serial: string; status: string; meta: string; href?: string }) {
  return (
    <article className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
      <div>
        <div className="font-mono text-[10px] text-slate-400">{serial}</div>
        <h2 className="mt-1 font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{meta}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-700">{status}</span>
        {href && <Link href={href} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white">فتح</Link>}
      </div>
    </article>
  );
}
