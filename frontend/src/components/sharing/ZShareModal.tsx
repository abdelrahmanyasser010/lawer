"use client";

import React, { useState } from "react";
import {
  X, Share2, Link2, Copy, Check, Eye, Pencil, Lock,
  Clock, ShieldCheck, AlertTriangle,
} from "lucide-react";

type Permission = "view_only" | "edit";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  serialNumber: string;
  zId?: string;
}

export default function ZShareModal({
  isOpen,
  onClose,
  documentTitle,
  serialNumber,
  zId = "58291047",
}: Props) {
  const [permission, setPermission] = useState<Permission>("view_only");
  const [expiry, setExpiry] = useState("7");
  const [recipientZId, setRecipientZId] = useState("");
  const [copied, setCopied] = useState(false);
  const [linkGenerated, setLinkGenerated] = useState(false);

  // Generate a unique share token (client-side demo)
  const shareToken = `${serialNumber.replace(/\//g, "-")}-${permission === "view_only" ? "V" : "E"}-${zId}`;
  const shareLink = `${typeof window !== "undefined" ? window.location.origin : "https://zdraft.app"}/shared/${shareToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerateLink = () => {
    setLinkGenerated(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#00102e]">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[#986410]" />
            <span className="text-sm font-extrabold text-white">مشاركة العقد برقم Z-ID</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Document Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">المستند المراد مشاركته:</p>
            <p className="text-sm font-bold text-[#00102e]">{documentTitle}</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{serialNumber}</p>
          </div>

          {/* Recipient Z-ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              رقم Z-ID للطرف الآخر (اختياري — للتحقق من الهوية)
            </label>
            <input
              type="text"
              value={recipientZId}
              onChange={e => setRecipientZId(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="00000000"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-[#986410] focus:outline-none focus:ring-1 focus:ring-[#986410]/30 text-center tracking-widest"
            />
            <p className="text-[10px] text-slate-400 mt-1">إذا أدخلت الرقم، لن يتمكن سوى صاحبه من فتح الرابط.</p>
          </div>

          {/* Permission Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">صلاحية الوصول للطرف الآخر:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPermission("view_only")}
                className={`rounded-xl border-2 p-4 text-right transition-all ${
                  permission === "view_only"
                    ? "border-[#986410] bg-[#986410]/5"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Eye className={`h-4 w-4 ${permission === "view_only" ? "text-[#986410]" : "text-slate-500"}`} />
                  <span className={`text-xs font-bold ${permission === "view_only" ? "text-[#00102e]" : "text-slate-700"}`}>
                    عرض وتحميل فقط
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  يرى العقد كاملاً بصيغة PDF قابلة للتحميل. لا يمكنه تعديل أي بيانات.
                </p>
              </button>

              <button
                onClick={() => setPermission("edit")}
                className={`rounded-xl border-2 p-4 text-right transition-all ${
                  permission === "edit"
                    ? "border-[#00102e] bg-[#00102e]/5"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Pencil className={`h-4 w-4 ${permission === "edit" ? "text-[#00102e]" : "text-slate-500"}`} />
                  <span className={`text-xs font-bold ${permission === "edit" ? "text-[#00102e]" : "text-slate-700"}`}>
                    مراجعة وتعديل
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  يمكنه تعديل الشروط المالية والتواريخ. بيانات الهوية الأساسية تظل مقفلة.
                </p>
              </button>
            </div>
          </div>

          {/* Identity Lock Notice */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-relaxed">
              <strong className="block font-bold mb-0.5">حماية البيانات الأساسية دائماً مُفعّلة</strong>
              حتى في صلاحية «مراجعة وتعديل»، تبقى حقول (الاسم، الرقم القومي، رقم الهاتف، الجنسية) مقفلة تماماً ولا يمكن للطرف الآخر تعديلها.
            </p>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              صلاحية الرابط تنتهي بعد:
            </label>
            <select
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#986410] focus:outline-none"
            >
              <option value="1">24 ساعة فقط</option>
              <option value="3">3 أيام</option>
              <option value="7">7 أيام</option>
              <option value="30">30 يوماً</option>
              <option value="0">بلا انتهاء (دائم)</option>
            </select>
          </div>

          {/* Generate / Copy Link */}
          {!linkGenerated ? (
            <button
              onClick={handleGenerateLink}
              className="w-full rounded-xl bg-[#00102e] py-3 text-xs font-bold text-white hover:bg-[#0a1f4d] transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Link2 className="h-4 w-4 text-[#986410]" />
              إنشاء رابط المشاركة الآمن
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                <span className="text-[10px] text-emerald-800 font-mono truncate flex-1">{shareLink}</span>
                <button
                  onClick={handleCopyLink}
                  className="rounded-lg p-1.5 bg-emerald-100 hover:bg-emerald-200 transition-colors shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5 text-emerald-700" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                {permission === "view_only" ? "👁 عرض وتحميل فقط" : "✏️ مراجعة وتعديل (الهوية مقفلة)"}
                {" · "}
                تنتهي {expiry === "0" ? "بلا انتهاء" : `بعد ${expiry} ${Number(expiry) === 1 ? "يوم" : "أيام"}`}
              </p>
              {recipientZId && (
                <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-[10px] text-blue-800">
                  <AlertTriangle className="h-3 w-3" />
                  مقيد بـ Z-ID رقم: <strong className="font-mono">{recipientZId}</strong> فقط
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
