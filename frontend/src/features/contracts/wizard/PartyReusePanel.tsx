"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, UserRound, UsersRound } from "lucide-react";
import { frontendApi } from "@/lib/apiClient";
import type { CustomerProfile, SavedParty } from "@/types/customer";
import type { ContractFieldValue, WizardStepDefinition } from "@/features/contracts/domain/contractTemplate.types";

type ReuseMode = "mine" | "saved" | "new" | null;

interface Props {
  step: WizardStepDefinition;
  fieldValues: Record<string, ContractFieldValue>;
  onFieldChange: (fieldKey: string, value: ContractFieldValue) => void;
  saveForFuture: boolean;
  onSaveForFutureChange: (value: boolean) => void;
}

const suffixCandidates: Array<{ suffixes: string[]; dataKeys: string[] }> = [
  { suffixes: ["_party_type"], dataKeys: ["partyType"] },
  { suffixes: ["_company_name"], dataKeys: ["companyName", "name", "fullName"] },
  { suffixes: ["_name"], dataKeys: ["name", "fullName", "displayName", "companyName"] },
  { suffixes: ["_national_id"], dataKeys: ["nationalId"] },
  { suffixes: ["_nationality"], dataKeys: ["nationality"] },
  { suffixes: ["_company_address", "_address"], dataKeys: ["address"] },
  { suffixes: ["_phone"], dataKeys: ["phone"] },
  { suffixes: ["_company_email", "_email"], dataKeys: ["email"] },
  { suffixes: ["_commercial_register"], dataKeys: ["commercialRegister"] },
  { suffixes: ["_tax_card", "_tax_number"], dataKeys: ["taxNumber", "taxCard"] },
  { suffixes: ["_legal_representative"], dataKeys: ["legalRepresentative"] },
  { suffixes: ["_representative_capacity"], dataKeys: ["representativeCapacity"] },
];

function normalizeProfile(profile: CustomerProfile): Record<string, string | number | boolean | null> {
  return {
    ...(profile.reusableData || {}),
    name: profile.name,
    fullName: profile.name,
    phone: profile.phone || profile.whatsappNumber || "",
    email: profile.email,
    companyName: profile.companyName || "",
    partyType: profile.accountType === "business" ? "company" : "individual",
  };
}

function valueForField(fieldKey: string, data: Record<string, string | number | boolean | null>) {
  const normalized = fieldKey.toLowerCase();
  const mapping = suffixCandidates.find((item) => item.suffixes.some((suffix) => normalized.endsWith(suffix)));
  if (!mapping) return undefined;
  for (const dataKey of mapping.dataKeys) {
    const value = data[dataKey];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return undefined;
}

export function isPartyWizardStep(stepKey: string) {
  const key = stepKey.toLowerCase();
  return ["landlord", "tenant", "seller", "buyer", "client_party", "provider_party", "party_1", "party_2", "first_party", "second_party"].some((token) => key.includes(token));
}

export default function PartyReusePanel({ step, onFieldChange, saveForFuture, onSaveForFutureChange }: Props) {
  const [mode, setMode] = useState<ReuseMode>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [savedParties, setSavedParties] = useState<SavedParty[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([frontendApi.profile(), frontendApi.savedParties()]).then(([profileResult, partiesResult]) => {
      if (!active) return;
      if (profileResult.status === "fulfilled") setProfile(profileResult.value);
      if (partiesResult.status === "fulfilled") setSavedParties(partiesResult.value);
      if (profileResult.status === "rejected" && partiesResult.status === "rejected") setError("تعذر تحميل البيانات المحفوظة حاليًا.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const supportedFields = useMemo(() => step.fields.filter((field) => suffixCandidates.some((item) => item.suffixes.some((suffix) => field.key.toLowerCase().endsWith(suffix)))), [step.fields]);

  function applyData(data: Record<string, string | number | boolean | null>) {
    supportedFields.forEach((field) => {
      const value = valueForField(field.key, data);
      if (value !== undefined) onFieldChange(field.key, value as ContractFieldValue);
    });
  }

  function useMine() {
    setMode("mine");
    setSelectedPartyId("");
    onSaveForFutureChange(false);
    if (profile) applyData(normalizeProfile(profile));
  }

  function useSaved(id: string) {
    setMode("saved");
    setSelectedPartyId(id);
    onSaveForFutureChange(false);
    const party = savedParties.find((item) => String(item.id) === id);
    if (party) applyData({ ...party.data, displayName: party.displayName });
  }

  function useNew() {
    setMode("new");
    setSelectedPartyId("");
  }

  if (supportedFields.length === 0) return null;

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
      <div className="flex items-start gap-2.5">
        <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-black text-[#00102e]">وفّر وقتك في بيانات الطرف</h3>
          <p className="mt-1 text-[10px] leading-5 text-slate-600">اختار بياناتك، طرف تعاملت معاه قبل كده، أو اكتب طرف جديد. مش هنملأ حاجة تلقائيًا من غير اختيارك.</p>
        </div>
      </div>

      {loading ? <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري تحميل البيانات المحفوظة...</div> : (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={useMine} disabled={!profile} className={`rounded-xl border px-3 py-2.5 text-[10px] font-black ${mode === "mine" ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 bg-white text-blue-800"} disabled:opacity-40`}><UserRound className="mx-auto mb-1 h-4 w-4" />استخدم بياناتي</button>
          <button type="button" onClick={() => setMode("saved")} disabled={savedParties.length === 0} className={`rounded-xl border px-3 py-2.5 text-[10px] font-black ${mode === "saved" ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 bg-white text-blue-800"} disabled:opacity-40`}><UsersRound className="mx-auto mb-1 h-4 w-4" />اختار طرف محفوظ</button>
          <button type="button" onClick={useNew} className={`rounded-xl border px-3 py-2.5 text-[10px] font-black ${mode === "new" ? "border-[#986410] bg-[#986410] text-white" : "border-[#986410]/30 bg-white text-[#986410]"}`}><CheckCircle2 className="mx-auto mb-1 h-4 w-4" />اكتب طرف جديد</button>
        </div>
      )}

      {mode === "saved" && (
        <select value={selectedPartyId} onChange={(event) => useSaved(event.target.value)} className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-xs font-bold text-[#00102e] outline-none focus:border-blue-500">
          <option value="">اختار الطرف المحفوظ...</option>
          {savedParties.map((party) => <option key={party.id} value={party.id}>{party.displayName}{party.sourceContractTitle ? ` — ${party.sourceContractTitle}` : ""}</option>)}
        </select>
      )}

      {mode === "new" && (
        <label className="mt-3 flex items-start gap-2 rounded-xl border border-[#986410]/20 bg-white p-3 text-[10px] font-bold leading-5 text-slate-700">
          <input type="checkbox" checked={saveForFuture} onChange={(event) => onSaveForFutureChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#00102e]" />
          <span><strong className="text-[#00102e]">احفظ بيانات الطرف ده للعقود الجاية</strong><br />الحفظ يتم على مستوى الطرف بعد إصدار/اكتمال العقد، مش لكل بيان لوحده.</span>
        </label>
      )}

      {error && <p className="mt-2 text-[10px] font-bold text-red-700">{error}</p>}
    </section>
  );
}
