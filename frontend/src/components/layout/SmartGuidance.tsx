"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, X, ArrowRight, CheckCircle2, HelpCircle, FileText, Share2, ShieldCheck, Zap } from "lucide-react";

interface SmartGuidanceProps {
  mode: "home" | "wizard_draft" | "wizard_review";
  onActionClick?: (action: string) => void;
}

export default function SmartGuidance({ mode, onActionClick }: SmartGuidanceProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show smooth slide-in after 1 second on mount
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [mode]);

  if (dismissed || !isVisible) return null;

  if (mode === "home") {
    return (
      <div className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
        <div className="rounded-2xl bg-[#00102e] text-white p-5 shadow-2xl border border-[#986410]/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-[#986410]" />
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 left-3 text-slate-400 hover:text-white rounded-full bg-white/10 p-1 transition-colors cursor-pointer"
            title="إغلاق الإرشاد"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#986410] p-2 text-[#00102e] shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#986410] font-mono tracking-wider block uppercase">
                ⚡ مرشدك السريع في Z draft
              </span>
              <h4 className="text-xs sm:text-sm font-extrabold text-white">
                ترغب في إعداد عقدك بخطوات واضحة؟
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                اختر نوع العقد من الأسفل، ثم أدخل البيانات المطلوبة وراجع المعاينة قبل الدفع. ويمكنك طلب خدمة محامٍ بصورة مستقلة عند الحاجة.
              </p>
              <div className="pt-2">
                <a
                  href="#templates"
                  onClick={() => setDismissed(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#986410] px-4 py-2 text-xs font-black text-[#00102e] hover:bg-amber-400 transition-all cursor-pointer shadow-sm"
                >
                  <span>اختر قالبك وابدأ الآن</span>
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "wizard_draft") {
    return (
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-900/10 via-amber-500/10 to-transparent p-4 border border-blue-200/60 animate-in fade-in duration-300">
        <div className="flex items-center justify-between border-b border-blue-200/60 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-800 uppercase block">تنبيه أثناء إعداد العقد</span>
            </div>
          </div>
        </div>
        <p className="text-xs font-bold text-slate-800">
          تُحفظ المسودة في حسابك عند الضغط على الحفظ. لا تعتمد على المتصفح وحده، وتأكد من ظهور رقم المسودة قبل مغادرة الصفحة.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-700 text-xs font-bold mt-2"
        >
          فهمت ✓
        </button>
      </div>
    );
  }

  return null;
}
