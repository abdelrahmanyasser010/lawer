"use client";

import React, { useState } from "react";
import { X, Share2, Search, Shield, Users } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  serialNumber: string;
}

interface TargetUserLookup {
  shareId: string;
  maskedName: string;
  role: string;
}

type PermissionLevel = "view_download" | "edit";

export default function PubgShareModal({ isOpen, onClose, documentTitle, serialNumber }: Props) {
  const [targetId, setTargetId] = useState("");
  const [lookupResult, setLookupResult] = useState<TargetUserLookup | null>(null);
  const [permission, setPermission] = useState<PermissionLevel>("view_download");
  const [sharedList, setSharedList] = useState([
    { shareId: "81029384", maskedName: "سارة إ*** م***", permission: "view_download" },
  ]);

  if (!isOpen) return null;

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim() || targetId.length < 5) {
      alert("يرجى إدخال معرف الـ Z-ID الصحيح (من 6 إلى 8 أرقام)");
      return;
    }

    setLookupResult({
      shareId: targetId,
      maskedName: "محمود ح*** ع***",
      role: "مستخدم شريك",
    });
  };

  const handleAddShare = () => {
    if (!lookupResult) return;
    setSharedList((prev) => [
      ...prev,
      { shareId: lookupResult.shareId, maskedName: lookupResult.maskedName, permission },
    ]);
    setLookupResult(null);
    setTargetId("");
    alert("تم منح الصلاحية ومشاركة العقد عبر معرف المشاركة الرقمي (Z-ID) بنجاح ✓");
  };

  const removeShare = (id: string) => {
    setSharedList((prev) => prev.filter((item) => item.shareId !== id));
  };

  const handlePermissionChange = (value: string) => {
    setPermission(value === "edit" ? "edit" : "view_download");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 text-blue-700 mb-2">
          <Share2 className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">مشاركة تعاونية عبر المعرف الرقمي (Z-ID)</span>
        </div>

        <h3 className="text-lg font-extrabold text-slate-900 mb-1">مشاركة المستند: {documentTitle}</h3>
        <p className="text-[11px] font-mono text-slate-400 mb-2">{serialNumber}</p>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          شارك مسودتك أو عقدك بأمان مع شركائك أو مستشارك القانوني بإدخال معرفهم الرقمي الفريد (Z-ID) دون كشف أرقام الهواتف أو الإيميل.
        </p>

        {/* Search Input Form */}
        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              أدخل معرف المستخدم (Z-ID) للطرف الآخر
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="مثال: 81029384"
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <Search className="h-4 w-4 text-blue-400" />
                <span>بحث</span>
              </button>
            </div>
          </div>
        </form>

        {/* Lookup Masked Result Card */}
        {lookupResult && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-blue-800 block">تم العثور على الحساب:</span>
                <span className="text-sm font-bold text-slate-900">{lookupResult.maskedName}</span>
                <span className="font-mono text-xs text-blue-700 ml-2">(Z-ID: {lookupResult.shareId})</span>
              </div>
              <Shield className="h-6 w-6 text-blue-600" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-blue-200">
              <select
                value={permission}
                onChange={(e) => handlePermissionChange(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-bold"
              >
                <option value="view_download">صلاحية: عرض وتحميل فقط</option>
                <option value="edit">صلاحية: تعديل الحقول المسموح بها</option>
              </select>

              <button
                type="button"
                onClick={handleAddShare}
                className="rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-600 transition-colors shadow-xs"
              >
                تأكيد ومشاركة
              </button>
            </div>
          </div>
        )}

        {/* Active Collaborators List */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-emerald-600" />
            <span>الأطراف المشاركة في هذا المستند ({sharedList.length})</span>
          </h4>

          <div className="space-y-2">
            {sharedList.map((collab) => (
              <div
                key={collab.shareId}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{collab.maskedName}</span>
                  <span className="font-mono text-slate-500 ml-2">Z-ID: {collab.shareId}</span>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] text-blue-800 ml-2 font-bold">
                    {collab.permission === "edit" ? "تعديل" : "عرض وتحميل"}
                  </span>
                </div>
                <button
                  onClick={() => removeShare(collab.shareId)}
                  className="text-slate-400 hover:text-red-600 font-bold"
                >
                  إلغاء
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



