import type { ContractDraftData } from "@zdraft/template-engine";
import { dashboardRequest } from "@/lib/apiClient";

export type OfficeClientMode = "existing" | "new" | "office_internal";
export type OfficeBillingMode = "office_waiver" | "external_collection" | "client_invoice";

export interface OfficeContractContextDto {
  clientMode: OfficeClientMode;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  assignedLawyerId: string;
  billingMode: OfficeBillingMode;
  waiverReason: string;
  notifyClient: boolean;
  createdByStaffId: string;
}

export interface SavedOfficeDraft {
  id: string | number;
  serialNumber: string;
  source: "api";
}

export async function saveOfficeContractDraft(
  draft: ContractDraftData,
  officeContext: OfficeContractContextDto,
): Promise<SavedOfficeDraft> {
  const data = await dashboardRequest<{ id: string | number; serialNumber: string }>("/api/v1/contracts/draft", {
    method: "POST",
    body: JSON.stringify({
      ...draft,
      sourceChannel: "office",
      creationMode: "office_assisted",
      officeContext: {
        clientMode: officeContext.clientMode,
        clientId: officeContext.clientId || undefined,
        clientName: officeContext.clientName || undefined,
        clientPhone: officeContext.clientPhone || undefined,
        clientEmail: officeContext.clientEmail || undefined,
        assignedLawyerId: officeContext.assignedLawyerId || undefined,
        billingMode: officeContext.billingMode,
        waiverReason: officeContext.waiverReason || undefined,
        notifyClient: officeContext.notifyClient,
      },
    }),
  });


  return { ...data, source: "api" };
}
