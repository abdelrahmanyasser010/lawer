"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, ApiClientError, frontendApi } from "@/lib/apiClient";

type PaymentAccessState = "checking" | "verified" | "guest" | "unverified";

export function usePaymentAccess(returnPath: string) {
  const router = useRouter();
  const [state, setState] = useState<PaymentAccessState>("checking");
  const [paymentCashNumber, setPaymentCashNumber] = useState("");

  const loadInstructions = useCallback(async () => {
    const result = await apiRequest<{ vodafoneCashNumber: string }>("/api/v1/payments/instructions");
    const number = (result.vodafoneCashNumber || "").trim();
    setPaymentCashNumber(number);
    return number;
  }, []);

  const refresh = useCallback(async () => {
    setState("checking");
    setPaymentCashNumber("");
    try {
      const result = await frontendApi.me();
      if (!result.user.emailVerified) {
        setState("unverified");
        return false;
      }
      setState("verified");
      try { await loadInstructions(); } catch { setPaymentCashNumber(""); }
      return true;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState("guest");
        return false;
      }
      setState("guest");
      return false;
    }
  }, [loadInstructions]);

  useEffect(() => { void refresh(); }, [refresh]);

  const requireVerified = useCallback(async () => {
    let current = state;
    if (current === "checking") {
      try {
        const result = await frontendApi.me();
        current = result.user.emailVerified ? "verified" : "unverified";
        setState(current);
        if (current === "verified") {
          try { await loadInstructions(); } catch { setPaymentCashNumber(""); }
        }
      } catch (error) {
        current = error instanceof ApiClientError && error.status === 401 ? "guest" : "guest";
        setState(current);
      }
    } else if (current === "verified" && !paymentCashNumber) {
      try { await loadInstructions(); } catch { setPaymentCashNumber(""); }
    }
    if (current === "verified") return true;
    if (current === "unverified") router.push(`/verify-email?next=${encodeURIComponent(returnPath)}`);
    else router.push(`/login?next=${encodeURIComponent(returnPath)}`);
    return false;
  }, [loadInstructions, paymentCashNumber, returnPath, router, state]);

  return {
    paymentAccess: state,
    paymentVerified: state === "verified",
    paymentCashNumber,
    requireVerified,
    refreshPaymentAccess: refresh,
  };
}
