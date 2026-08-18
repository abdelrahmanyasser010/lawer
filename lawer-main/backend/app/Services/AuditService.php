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
            $oldValues=$this->canonicalize($oldValues);$newValues=$this->canonicalize($newValues);
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
            $recordHash = hash('sha256', $this->encode($payload));
            DB::insert(
                'INSERT INTO audit_logs (request_id,actor_user_id,action,entity_type,entity_id,old_values_json,new_values_json,ip_address,user_agent,previous_hash,record_hash,hash_version,created_at) VALUES (?,?,?,?,?,?::jsonb,?::jsonb,?,?,?,?,2,?)',
                [
                    $payload['requestId'], $payload['actorUserId'], $action, $entityType, (string) $entityId,
                    $oldValues === null ? null : $this->encode($oldValues),
                    $newValues === null ? null : $this->encode($newValues),
                    $request->ip(), $request->userAgent(), $previous?->record_hash, $recordHash, $createdAt,
                ]
            );
        });
    }

    private function encode(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRESERVE_ZERO_FRACTION|JSON_THROW_ON_ERROR);
    }

    private function canonicalize(mixed $value): mixed
    {
        if(is_object($value))$value=(array)$value;
        if(!is_array($value))return$value;
        if(array_is_list($value))return array_map(fn($item)=>$this->canonicalize($item),$value);
        ksort($value,SORT_STRING);
        foreach($value as$key=>$item)$value[$key]=$this->canonicalize($item);
        return$value;
    }
}
