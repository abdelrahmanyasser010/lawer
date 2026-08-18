"use client";

import { MessageCircle } from "lucide-react";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

function normalize(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `20${digits.slice(1)}` : digits;
}

export default function SupportContactLink({ message = "مرحبًا، أحتاج مساعدة في منصة Z draft", label = "التواصل مع الدعم عبر WhatsApp" }: { message?: string; label?: string }) {
  const { catalog } = usePublicCatalog();
  const digits = normalize(catalog.office.supportWhatsappNumber);
  if (!digits) return null;
  return <a href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100"><MessageCircle className="h-4 w-4 text-emerald-600" />{label}</a>;
}
