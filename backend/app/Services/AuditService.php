<?php
namespace App\Services;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
final class AuditService
{
    public function write(Request $request, string $action, string $entityType, string|int $entityId, mixed $oldValues = null, mixed $newValues = null, ?int $actorUserId = null): void
    {
        DB::transaction(function () use ($request,$action,$entityType,$entityId,$oldValues,$newValues,$actorUserId): void {
            DB::select('SELECT pg_advisory_xact_lock(?)', [617001]);
            $previous = DB::selectOne('SELECT record_hash FROM audit_logs ORDER BY id DESC LIMIT 1');
            $createdAt = now()->toIso8601String();
            $payload = [
                'requestId' => $request->attributes->get('request_id'),
                'actorUserId' => $actorUserId ?? ($request->attributes->get('auth_user')['id'] ?? null),
                'action' => $action,
                'entityType' => $entityType,
                'entityId' => (string) $entityId,
                'oldValues' => $oldValues,
                'newValues' => $newValues,
                'ipAddress' => $request->ip(),
                'userAgent' => $request->userAgent(),
                'previousHash' => $previous?->record_hash,
                'createdAt' => $createdAt,
            ];
            $recordHash = hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRESERVE_ZERO_FRACTION));
            DB::insert(
                'INSERT INTO audit_logs (request_id,actor_user_id,action,entity_type,entity_id,old_values_json,new_values_json,ip_address,user_agent,previous_hash,record_hash,created_at) VALUES (?,?,?,?,?,?::jsonb,?::jsonb,?,?,?,?,?)',
                [
                    $payload['requestId'], $payload['actorUserId'], $action, $entityType, (string) $entityId,
                    $oldValues === null ? null : json_encode($oldValues, JSON_UNESCAPED_UNICODE),
                    $newValues === null ? null : json_encode($newValues, JSON_UNESCAPED_UNICODE),
                    $request->ip(), $request->userAgent(), $previous?->record_hash, $recordHash, $createdAt,
                ]
            );
        });
    }
}
