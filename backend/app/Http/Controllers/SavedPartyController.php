<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Services\AuditService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

final class SavedPartyController extends Controller
{
    use ApiResponse;

    private const DATA_KEYS = [
        'partyType','name','fullName','companyName','nationalId','nationality','address',
        'phone','email','commercialRegister','taxNumber','taxCard','legalRepresentative','representativeCapacity',
    ];

    public function __construct(private AuditService $audit) {}

    public function index(Request $request)
    {
        $ownerId = (int) $request->attributes->get('auth_user')['id'];
        $rows = DB::select(<<<'SQL'
SELECT sp.id,sp.display_name,sp.party_kind,sp.data_json,sp.source_contract_id,
       c.title AS source_contract_title,sp.last_used_at,sp.created_at,sp.updated_at
FROM saved_parties sp
LEFT JOIN contracts c ON c.id=sp.source_contract_id
WHERE sp.owner_user_id=?
ORDER BY sp.last_used_at DESC NULLS LAST,sp.updated_at DESC,sp.id DESC
SQL, [$ownerId]);
        return $this->ok($request, array_map(fn($row) => $this->payload($row), $rows));
    }

    public function show(Request $request, int $id)
    {
        return $this->ok($request, $this->payload($this->owned($request, $id)));
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'displayName' => ['sometimes','string','min:2','max:200'],
            'data' => ['sometimes','array','max:20'],
        ]);
        if (!$data) throw new ApiException(422, 'لا يوجد تعديل للحفظ');

        $party = $this->owned($request, $id);
        $old = $this->payload($party);
        $structured = array_key_exists('data', $data) ? $this->structuredData($data['data']) : $old['data'];
        $displayName = array_key_exists('displayName', $data) ? trim($data['displayName']) : $old['displayName'];
        $organization = in_array(strtolower((string) ($structured['partyType'] ?? '')), ['company','organization','business'], true)
            || !empty($structured['companyName'])
            || !empty($structured['commercialRegister']);
        $kind = $organization ? 'organization' : 'individual';
        $structured['partyType'] = $organization ? 'company' : 'individual';

        DB::table('saved_parties')->where('id', $id)->where('owner_user_id', $party->owner_user_id)->update([
            'display_name' => $displayName,
            'party_kind' => $kind,
            'data_json' => json_encode($structured, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'updated_at' => now(),
        ]);
        $updated = $this->owned($request, $id);
        $payload = $this->payload($updated);
        $this->audit->write($request, 'saved_party.updated', 'saved_party', $id, $old, $payload);
        return $this->ok($request, $payload, 'تم تحديث بيانات الطرف المحفوظ');
    }

    public function delete(Request $request, int $id)
    {
        $party = $this->owned($request, $id);
        $old = $this->payload($party);
        DB::table('saved_parties')->where('id', $id)->where('owner_user_id', $party->owner_user_id)->delete();
        $this->audit->write($request, 'saved_party.deleted', 'saved_party', $id, $old, ['deleted' => true]);
        return $this->ok($request, ['deleted' => true], 'تم حذف الطرف من قائمتك دون التأثير على العقود السابقة');
    }

    private function owned(Request $request, int $id): object
    {
        $ownerId = (int) $request->attributes->get('auth_user')['id'];
        $row = DB::selectOne(<<<'SQL'
SELECT sp.*,c.title AS source_contract_title
FROM saved_parties sp
LEFT JOIN contracts c ON c.id=sp.source_contract_id
WHERE sp.id=? AND sp.owner_user_id=?
SQL, [$id, $ownerId]);
        if (!$row) throw new ApiException(404, 'الطرف المحفوظ غير موجود');
        return $row;
    }

    private function payload(object $row): array
    {
        $json = is_string($row->data_json) ? json_decode($row->data_json, true) : (array) $row->data_json;
        return [
            'id' => (int) $row->id,
            'displayName' => (string) $row->display_name,
            'partyKind' => (string) $row->party_kind,
            'data' => is_array($json) ? $json : [],
            'sourceContractId' => $row->source_contract_id ? (int) $row->source_contract_id : null,
            'sourceContractTitle' => $row->source_contract_title ?? null,
            'lastUsedAt' => $row->last_used_at ?? null,
            'createdAt' => $row->created_at ?? null,
            'updatedAt' => $row->updated_at ?? null,
        ];
    }

    private function structuredData(array $input): array
    {
        $unknown = array_values(array_diff(array_keys($input), self::DATA_KEYS));
        if ($unknown) throw new ApiException(422, 'توجد بيانات غير مسموح بحفظها للطرف', 'SAVED_PARTY_FIELDS_INVALID', ['fields' => $unknown]);
        $result = [];
        foreach ($input as $key => $value) {
            if ($value === null) {$result[$key] = null;continue;}
            if (!is_scalar($value) || is_bool($value)) throw new ApiException(422, 'بيانات الطرف يجب أن تكون نصوصًا أو أرقامًا فقط', 'SAVED_PARTY_VALUE_INVALID', ['field' => $key]);
            $value = is_string($value) ? trim($value) : $value;
            if (is_string($value) && mb_strlen($value) > 500) throw new ApiException(422, 'إحدى بيانات الطرف أطول من الحد المسموح', 'SAVED_PARTY_VALUE_TOO_LONG', ['field' => $key]);
            if ($key === 'email' && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) throw new ApiException(422, 'البريد الإلكتروني للطرف غير صالح', 'SAVED_PARTY_EMAIL_INVALID');
            $result[$key] = $value;
        }
        return $result;
    }
}
