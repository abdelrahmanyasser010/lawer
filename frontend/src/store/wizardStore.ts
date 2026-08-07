import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContractSlug, CreationMode } from "@/types/zdraft";
import type {
  ContractDraftData,
  ContractFieldValue,
} from "@/features/contracts/domain/contractTemplate.types";

interface InitializeDraftInput {
  slug: ContractSlug;
  templateVersion: number;
  variantKey: string | null;
  creationMode: CreationMode;
  firstStepKey: string;
  defaultFieldValues?: Record<string, ContractFieldValue>;
}

interface WizardState {
  drafts: Partial<Record<ContractSlug, ContractDraftData>>;
  activeTemplateSlug: ContractSlug | null;

  isAuthModalOpen: boolean;
  isPaymentModalOpen: boolean;

  ensureDraft: (input: InitializeDraftInput) => void;
  selectVariant: (
    slug: ContractSlug,
    variantKey: string,
    firstStepKey: string,
    defaultFieldValues?: Record<string, ContractFieldValue>,
  ) => void;
  setFieldValue: (slug: ContractSlug, fieldName: string, value: ContractFieldValue) => void;
  setCurrentStepKey: (slug: ContractSlug, stepKey: string) => void;
  toggleOptionalClause: (
    slug: ContractSlug,
    clauseKey: string,
    defaultFieldValues?: Record<string, ContractFieldValue>,
  ) => void;
  setAttachmentRefs: (slug: ContractSlug, fieldKey: string, refs: string[]) => void;
  setBackendDraftReference: (slug: ContractSlug, reference: { id: number; currentVersionId: number; serialNumber: string }) => void;
  hydrateBackendDraft: (slug: ContractSlug, input: {
    id: number;
    versionId?: number;
    serialNumber: string;
    templateVersion: number;
    variantKey: string;
    selectedOptionalClauseKeys: string[];
    fieldValues: Record<string, ContractFieldValue>;
    attachmentRefs?: Record<string, string[]>;
    currentStepKey: string;
    creationMode: CreationMode;
    coreIdentityLocked: boolean;
  }) => void;
  hydrateLegacyDraft: (
    slug: ContractSlug,
    formData: Record<string, ContractFieldValue>,
    currentStepKey: string,
  ) => void;
  lockCoreIdentityData: (slug: ContractSlug) => void;
  openAuthModalAtCheckout: () => void;
  closeAuthModal: () => void;
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  resetWizard: (slug?: ContractSlug) => void;
}

type PersistedWizardState = Pick<WizardState, "drafts" | "activeTemplateSlug">;

function touch(draft: ContractDraftData): ContractDraftData {
  return { ...draft, updatedAt: new Date().toISOString() };
}

export const useWizardStore = create<WizardState>()(
  persist<WizardState, [], [], PersistedWizardState>(
    (set) => ({
      drafts: {},
      activeTemplateSlug: null,
      isAuthModalOpen: false,
      isPaymentModalOpen: false,

      ensureDraft: (input) => {
        set((state) => {
          const existing = state.drafts[input.slug];
          if (existing && existing.templateVersion === input.templateVersion) {
            return { activeTemplateSlug: input.slug };
          }

          const draft: ContractDraftData = {
            templateSlug: input.slug,
            templateVersion: input.templateVersion,
            variantKey: input.variantKey,
            selectedOptionalClauseKeys: [],
            fieldValues: { ...(input.defaultFieldValues ?? {}) },
            attachmentRefs: {},
            currentStepKey: input.firstStepKey,
            creationMode: input.creationMode,
            coreIdentityLocked: false,
            updatedAt: new Date().toISOString(),
          };

          return {
            activeTemplateSlug: input.slug,
            drafts: { ...state.drafts, [input.slug]: draft },
          };
        });
      },

      selectVariant: (slug, variantKey, firstStepKey, defaultFieldValues = {}) => {
        set((state) => {
          const existing = state.drafts[slug];
          if (!existing) return state;
          const changedVariant = existing.variantKey !== variantKey;
          return {
            activeTemplateSlug: slug,
            drafts: {
              ...state.drafts,
              [slug]: touch({
                ...existing,
                variantKey,
                currentStepKey: firstStepKey,
                selectedOptionalClauseKeys: changedVariant ? [] : existing.selectedOptionalClauseKeys,
                fieldValues: changedVariant
                  ? { ...defaultFieldValues }
                  : { ...defaultFieldValues, ...existing.fieldValues },
              }),
            },
          };
        });
      },

      setFieldValue: (slug, fieldName, value) => {
        set((state) => {
          const draft = state.drafts[slug];
          if (!draft) return state;
          return {
            drafts: {
              ...state.drafts,
              [slug]: touch({
                ...draft,
                fieldValues: { ...draft.fieldValues, [fieldName]: value },
              }),
            },
          };
        });
      },

      setCurrentStepKey: (slug, stepKey) => {
        set((state) => {
          const draft = state.drafts[slug];
          if (!draft) return state;
          return {
            drafts: {
              ...state.drafts,
              [slug]: touch({ ...draft, currentStepKey: stepKey }),
            },
          };
        });
      },

      toggleOptionalClause: (slug, clauseKey, defaultFieldValues = {}) => {
        set((state) => {
          const draft = state.drafts[slug];
          if (!draft) return state;
          const selected = draft.selectedOptionalClauseKeys.includes(clauseKey);
          return {
            drafts: {
              ...state.drafts,
              [slug]: touch({
                ...draft,
                selectedOptionalClauseKeys: selected
                  ? draft.selectedOptionalClauseKeys.filter((key) => key !== clauseKey)
                  : [...draft.selectedOptionalClauseKeys, clauseKey],
                fieldValues: selected
                  ? draft.fieldValues
                  : {
                      ...defaultFieldValues,
                      ...draft.fieldValues,
                    },
              }),
            },
          };
        });
      },

      setAttachmentRefs: (slug, fieldKey, refs) => {
        set((state) => {
          const draft = state.drafts[slug];
          if (!draft) return state;
          return {
            drafts: {
              ...state.drafts,
              [slug]: touch({
                ...draft,
                attachmentRefs: { ...draft.attachmentRefs, [fieldKey]: refs },
              }),
            },
          };
        });
      },

      setBackendDraftReference: (slug, reference) => {
        set((state) => {
          const draft = state.drafts[slug];
          if (!draft) return state;
          return {
            drafts: {
              ...state.drafts,
              [slug]: touch({
                ...draft,
                backendContractId: reference.id,
                backendVersionId: reference.currentVersionId,
                serialNumber: reference.serialNumber,
              }),
            },
          };
        });
      },

      hydrateBackendDraft: (slug, input) => {
        set((state) => ({
          activeTemplateSlug: slug,
          drafts: {
            ...state.drafts,
            [slug]: {
              templateSlug: slug,
              templateVersion: input.templateVersion,
              backendContractId: input.id,
              backendVersionId: input.versionId,
              serialNumber: input.serialNumber,
              variantKey: input.variantKey,
              selectedOptionalClauseKeys: input.selectedOptionalClauseKeys,
              fieldValues: input.fieldValues,
              attachmentRefs: input.attachmentRefs ?? {},
              currentStepKey: input.currentStepKey,
              creationMode: input.creationMode,
              coreIdentityLocked: input.coreIdentityLocked,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      },

      hydrateLegacyDraft: (slug, formData, currentStepKey) => {
        set((state) => {
          const draft = state.drafts[slug];
          if (!draft) return state;
          return {
            drafts: {
              ...state.drafts,
              [slug]: touch({
                ...draft,
                fieldValues: { ...draft.fieldValues, ...formData },
                currentStepKey,
              }),
            },
          };
        });
      },

      lockCoreIdentityData: (slug) => {
        set((state) => {
          const draft = state.drafts[slug];
          if (!draft) return state;
          return {
            drafts: {
              ...state.drafts,
              [slug]: touch({ ...draft, coreIdentityLocked: true }),
            },
          };
        });
      },

      openAuthModalAtCheckout: () => set({ isAuthModalOpen: true }),
      closeAuthModal: () => set({ isAuthModalOpen: false }),
      openPaymentModal: () => set({ isPaymentModalOpen: true }),
      closePaymentModal: () => set({ isPaymentModalOpen: false }),

      resetWizard: (slug) => {
        set((state) => {
          if (!slug) return { drafts: {}, activeTemplateSlug: null };
          const nextDrafts = { ...state.drafts };
          delete nextDrafts[slug];
          return {
            drafts: nextDrafts,
            activeTemplateSlug: state.activeTemplateSlug === slug ? null : state.activeTemplateSlug,
          };
        });
      },
    }),
    {
      name: "zdraft-wizard-storage-v2",
      partialize: (state: WizardState) => ({
        drafts: state.drafts,
        activeTemplateSlug: state.activeTemplateSlug,
      }),
    },
  ),
);
