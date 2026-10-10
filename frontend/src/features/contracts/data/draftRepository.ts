import { apiRequest } from "@/lib/apiClient";
import type { ContractDraftData } from "../domain/contractTemplate.types";

export interface SavedDraftResult {
  id: number;
  serialNumber: string;
  status: string;
  currentVersionId: number;
}

function draftPayload(draft: ContractDraftData, partyReusePreferences: Record<string, boolean> = {}) {
  return {
    templateSlug: draft.templateSlug,
    templateVersion: draft.templateVersion,
    variantKey: draft.variantKey,
    selectedOptionalClauseKeys: draft.selectedOptionalClauseKeys,
    fieldValues: draft.fieldValues,
    touchedFieldKeys: draft.touchedFieldKeys ?? [],
    attachmentRefs: draft.attachmentRefs,
    currentStepKey: draft.currentStepKey,
    creationMode: draft.creationMode,
    sourceChannel: "customer",
    partyReusePreferences,
  };
}

export async function saveDraftSnapshot(draft: ContractDraftData, partyReusePreferences: Record<string, boolean> = {}): Promise<SavedDraftResult> {
  if (draft.backendContractId) {
    return apiRequest<SavedDraftResult>(`/api/v1/contracts/${draft.backendContractId}/draft`, {
      method: "PATCH",
      body: JSON.stringify(draftPayload(draft, partyReusePreferences)),
    });
  }

  return apiRequest<SavedDraftResult>("/api/v1/contracts/draft", {
    method: "POST",
    body: JSON.stringify(draftPayload(draft, partyReusePreferences)),
  });
}
