"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { passwordChecks } from "@/lib/inputValidation";

export default function PasswordRequirements({ value }: { value: string }) {
  const checks = passwordChecks(value);
  const rows = [
    [checks.length, "من 8 إلى 128 حرفًا"],
    [checks.letter, "حرف واحد على الأقل"],
    [checks.number, "رقم واحد على الأقل"],
  ] as const;
  return <div className="mt-2 grid gap-1 text-[10px] sm:grid-cols-3">
    {rows.map(([ok,label]) => <span key={label} className={`inline-flex items-center gap-1.5 ${ok ? "text-emerald-700" : "text-slate-400"}`}>{ok ? <CheckCircle2 className="h-3.5 w-3.5"/> : <Circle className="h-3.5 w-3.5"/>}{label}</span>)}
  </div>;
}
