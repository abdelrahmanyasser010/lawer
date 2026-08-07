<?php
namespace App\Http\Controllers;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class AuditController extends Controller
{
    use ApiResponse;
    public function index(Request $request)
    {
        $entity = $request->filled('entityType') ? $request->string('entityType')->toString() : null;
        $actor = $request->filled('actorId') ? (int) $request->query('actorId') : null;
        $rows = DB::select('SELECT al.id,al.request_id AS "requestId",al.action,al.entity_type AS "entityType",al.entity_id AS "entityId",al.old_values_json AS "oldValues",al.new_values_json AS "newValues",al.ip_address AS "ipAddress",al.user_agent AS "userAgent",al.previous_hash AS "previousHash",al.record_hash AS "recordHash",al.created_at AS "createdAt",u.name AS "actorName",u.email AS "actorEmail" FROM audit_logs al LEFT JOIN users u ON u.id=al.actor_user_id WHERE (?::text IS NULL OR al.entity_type=?) AND (?::bigint IS NULL OR al.actor_user_id=?) ORDER BY al.id DESC LIMIT 500', [$entity,$entity,$actor,$actor]);
        foreach ($rows as $row) {
            $row->oldValues = $this->decodeJson($row->oldValues);
            $row->newValues = $this->decodeJson($row->newValues);
        }
        return $this->ok($request, $rows);
    }

    private function decodeJson(mixed $value): array
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
