"use client";

import { MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

function waNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return digits;
}

export default function FloatingSupportButton() {
  const { user, loading } = useCurrentUser();
  const { catalog } = usePublicCatalog();
  const [open, setOpen] = useState(false);

  if (loading || !user) return null;
  const supportWhatsapp = catalog.office.supportWhatsappNumber;
  const supportPhone = catalog.office.supportPhone;
  if (!supportWhatsapp && !supportPhone) return null;

  const digits = waNumber(supportWhatsapp);
  const message = encodeURIComponent(`مرحبًا، أحتاج مساعدة في منصة Z draft. رقم حسابي: ${user.publicId}`);
  const whatsappUrl = digits ? `https://wa.me/${digits}?text=${message}` : "";

  return (
    <div className="fixed bottom-5 left-4 z-[70] flex flex-col items-start gap-2 sm:bottom-6 sm:left-6" dir="rtl">
      {open && (
        <div className="w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00102e] text-[#d5a84c]"><Phone className="h-4 w-4" /></div>
            <div><div className="text-xs font-black text-[#00102e]">الدعم الفني</div><div className="text-[9px] text-slate-400">مساعدة في استخدام المنصة</div></div>
          </div>
          <div className="mt-3 space-y-2">
            {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white"><MessageCircle className="h-4 w-4" /> WhatsApp الدعم</a>}
            {supportPhone && <a href={`tel:${supportPhone}`} dir="ltr" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700"><Phone className="h-4 w-4" /> {supportPhone}</a>}
          </div>
        </div>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label="الدعم الفني" className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl ring-4 ring-white transition hover:scale-105">
        {open ? <Phone className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
