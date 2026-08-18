"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  FileText,
  HelpCircle,
  ScrollText,
  Sparkles,
  X,
} from "lucide-react";

const draftSlugs = ["rental", "apartment_sale", "freelancer"];

type SavedDraftInfo = {
  slug: string;
  label: string;
};

function labelForSlug(slug: string) {
  if (slug === "apartment_sale") return "عقد بيع شقة";
  if (slug === "freelancer") return "عقد عمل حر";
  return "عقد إيجار";
}

export default function FloatingQuickAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [latestDraft, setLatestDraft] = useState<SavedDraftInfo | null>(null);

  const isWizard = pathname.startsWith("/wizard/");

  useEffect(() => {

    queueMicrotask(() => {
      const found = draftSlugs.find((slug) => localStorage.getItem(`zdraft_saved_draft_${slug}`));
      setLatestDraft(found ? { slug: found, label: labelForSlug(found) } : null);
    });
  }, [pathname]);

  const goTo = (target: string) => {
    setIsOpen(false);

    if (target.startsWith("#")) {
      if (pathname !== "/") {
        router.push(`/${target}`);
        return;
      }

      document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    router.push(target);
  };

  const wizardActions = [
    {
      label: "اذهب لبيانات العقد",
      detail: "الرجوع للفورم الحالي",
      icon: ScrollText,
      onClick: () => {
        setIsOpen(false);
        document.querySelector("#wizard-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
    {
      label: "راجع المعاينة الحية",
      detail: "تأكد من النص قبل الدفع",
      icon: FileText,
      onClick: () => {
        setIsOpen(false);
        document.querySelector("#wizard-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 font-cairo text-right sm:bottom-5 sm:left-5 sm:right-auto">
      {isOpen && (
        <div className="mb-2.5 max-h-[min(76vh,36rem)] w-[calc(100vw-2rem)] max-w-[23rem] overflow-y-auto rounded-2xl border border-[#986410]/50 bg-[#00102e] p-4 text-white shadow-2xl sm:w-[340px]">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#986410]/20 text-[#986410]">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-black text-white">مركز الإجراءات السريعة</div>
                <div className="text-[10px] font-medium text-slate-300">
                  {isWizard ? "مساعد عملي أثناء صياغة العقد" : "أقرب اختصاراتك المهمة"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="إغلاق الوصول السريع"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isWizard ? (
            <div className="space-y-2">
              <p className="rounded-xl border border-white/10 bg-white/10 p-3 text-xs leading-relaxed text-slate-100">
                استخدمه كلوحة تحكم صغيرة: راجع بياناتك، افتح المعاينة، أو اطلب مساعدة قانونية من غير ما تضيع مكانك.
              </p>
              {wizardActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-right transition-colors hover:bg-white/15"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[#986410]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black text-white">{action.label}</span>
                      <span className="block text-[10px] font-medium text-slate-300">{action.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {latestDraft && (
                <button
                  type="button"
                  onClick={() => goTo(`/wizard/${latestDraft.slug}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-right transition-colors hover:bg-amber-400/15"
                >
                  <FileText className="h-4 w-4 shrink-0 text-amber-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black text-white">كمّل آخر مسودة</span>
                    <span className="block text-[10px] text-amber-100">{latestDraft.label}</span>
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => goTo("/create-contract?mode=self_service")}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-right transition-colors hover:bg-white/15"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-blue-300" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-white">ابدأ عقد جديد</span>
                  <span className="block text-[10px] text-slate-300">اختر قالب وابدأ الصياغة</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/request-review")}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-right transition-colors hover:bg-white/15"
              >
                <HelpCircle className="h-4 w-4 shrink-0 text-emerald-300" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-white">مراجعة عقد</span>
                  <span className="block text-[10px] text-slate-300">ارفع مستند أو اشرح مشكلتك</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => goTo("/drafts")}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-right transition-colors hover:bg-white/15"
              >
                <FileText className="h-4 w-4 shrink-0 text-amber-300" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-white">المسودات المحفوظة</span>
                  <span className="block text-[10px] text-slate-300">ارجع للعقود غير المكتملة</span>
                </span>
              </button>

            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-label={isOpen ? "إغلاق الوصول السريع" : "فتح الوصول السريع"}
        className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-2xl transition-all active:scale-95 sm:h-auto sm:w-auto sm:gap-2 sm:px-3.5 sm:py-2.5 ${
          isOpen
            ? "border-amber-400 bg-slate-900 text-amber-400"
            : "border-[#986410]/60 bg-[#00102e] text-white hover:border-amber-400"
        }`}
      >
        <Bot className="h-4 w-4 text-amber-400" />
        <span className="hidden text-xs font-black sm:inline">{isOpen ? "إغلاق" : "إجراءات سريعة"}</span>
      </button>
    </div>
  );
}
