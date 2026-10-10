<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

final class SavedPartyService
{
    /** @return int[] */
    public function finalizeForIssuedContract(int $contractId): array
    {
        $contract = DB::selectOne(<<<'SQL'
SELECT c.id,c.status,c.user_id,c.client_user_id,c.variant_key,c.field_values_json,
       c.party_reuse_preferences_json,tv.definition_json
FROM contracts c
JOIN template_versions tv ON tv.id=c.template_version_id
WHERE c.id=? AND c.deleted_at IS NULL
SQL, [$contractId]);

        if (!$contract || (string) $contract->status !== 'issued') return [];

        $preferences = $this->json($contract->party_reuse_preferences_json);
        if (!$preferences) return [];

        $definition = $this->json($contract->definition_json);
        $fields = $this->json($contract->field_values_json);
        $variant = collect($definition['variants'] ?? [])->firstWhere('key', (string) $contract->variant_key);
        if (!is_array($variant)) return [];

        $ownerId = (int) ($contract->client_user_id ?: $contract->user_id);
        $ids = [];
        foreach ($preferences as $stepKey => $saveForFutureUse) {
            if ($saveForFutureUse !== true) continue;
            $step = collect($variant['steps'] ?? [])->firstWhere('key', (string) $stepKey);
            if (!is_array($step)) continue;

            $data = $this->partyData($step, $fields);
            $displayName = trim((string) ($data['companyName'] ?? $data['name'] ?? $data['fullName'] ?? ''));
            if ($displayName === '') continue;

            $organization = in_array(strtolower((string) ($data['partyType'] ?? '')), ['company','organization','business'], true)
                || !empty($data['companyName'])
                || !empty($data['commercialRegister']);
            $partyKind = $organization ? 'organization' : 'individual';
            $data['partyType'] = $organization ? 'company' : 'individual';

            DB::statement(<<<'SQL'
INSERT INTO saved_parties(owner_user_id,display_name,party_kind,data_json,source_contract_id,source_step_key,last_used_at)
VALUES (?,?,?,?::jsonb,?,?,CURRENT_TIMESTAMP)
ON CONFLICT (owner_user_id,source_contract_id,source_step_key)
DO UPDATE SET display_name=EXCLUDED.display_name,party_kind=EXCLUDED.party_kind,
              data_json=EXCLUDED.data_json,last_used_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
SQL, [$ownerId, $displayName, $partyKind, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $contractId, (string) $stepKey]);

            $id = DB::table('saved_parties')
                ->where('owner_user_id', $ownerId)
                ->where('source_contract_id', $contractId)
                ->where('source_step_key', (string) $stepKey)
                ->value('id');
            if ($id) $ids[] = (int) $id;
        }

        return array_values(array_unique($ids));
    }

    private function partyData(array $step, array $fieldValues): array
    {
        $data = [];
        foreach ($step['fields'] ?? [] as $field) {
            $fieldKey = (string) ($field['key'] ?? '');
            if ($fieldKey === '' || !array_key_exists($fieldKey, $fieldValues)) continue;
            $canonical = $this->canonicalKey($fieldKey);
            if ($canonical === null) continue;
            $value = $fieldValues[$fieldKey];
            if (!is_scalar($value) || is_bool($value)) continue;
            $value = is_string($value) ? trim($value) : $value;
            if ($value === '') continue;
            $data[$canonical] = $value;
        }

        if (!isset($data['fullName']) && isset($data['name'])) $data['fullName'] = $data['name'];
        if (!isset($data['name']) && isset($data['fullName'])) $data['name'] = $data['fullName'];
        return $data;
    }

    private function canonicalKey(string $fieldKey): ?string
    {
        $key = strtolower($fieldKey);
        $suffixes = [
            '_commercial_register' => 'commercialRegister',
            '_representative_capacity' => 'representativeCapacity',
            '_legal_representative' => 'legalRepresentative',
            '_company_address' => 'address',
            '_company_email' => 'email',
            '_company_name' => 'companyName',
            '_party_type' => 'partyType',
            '_national_id' => 'nationalId',
            '_nationality' => 'nationality',
            '_tax_number' => 'taxNumber',
            '_tax_card' => 'taxCard',
            '_address' => 'address',
            '_phone' => 'phone',
            '_email' => 'email',
            '_name' => 'name',
        ];
        foreach ($suffixes as $suffix => $canonical) if (str_ends_with($key, $suffix)) return $canonical;
        return null;
    }

    private function json(mixed $value): array
    {
        if (is_array($value)) return $value;
        if (is_object($value)) return (array) $value;
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }
}
