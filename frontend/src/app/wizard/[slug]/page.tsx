import { Suspense } from "react";
import ContractWizard from "@/features/contracts/wizard/ContractWizard";

export default function WizardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <ContractWizard />
    </Suspense>
  );
}
