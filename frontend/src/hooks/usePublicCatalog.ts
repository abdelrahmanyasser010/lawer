"use client";

import { useEffect, useState } from "react";
import { frontendApi } from "@/lib/apiClient";
import type { PublicCatalog } from "@/types/customer";

const fallback: PublicCatalog = {
  templates: [],
  services: {
    contractReviewDepositEgp: 100,
    consultationDepositEgp: 100,
    contractDraftingDepositEgp: 100,
  },
  office: {
    displayName: "Z draft",
    address: "",
    whatsappNumber: process.env.NEXT_PUBLIC_OFFICE_WHATSAPP_NUMBER || "",
  },
  payment: {
    vodafoneCashNumber: process.env.NEXT_PUBLIC_VODAFONE_CASH_NUMBER || "",
  },
  policies: {
    selfServiceEditHours: 24,
    communicationChannels: ["office", "zoom", "whatsapp"],
    chatEnabled: false,
  },
};

export function usePublicCatalog() {
  const [catalog, setCatalog] = useState<PublicCatalog>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    frontendApi.catalog()
      .then((value) => { if (active) setCatalog(value); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { catalog, loading };
}
