<?php
namespace App\Http\Controllers;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class AuditController extends Controller
{
    use ApiResponse;
    public function index(Request $request)
    {
        $entity=$request->filled('entityType')?$request->string('entityType')->toString():null;
        $actor=$request->filled('actorId')?(int)$request->query('actorId'):null;
        $action=$request->filled('action')?$request->string('action')->toString():null;
        $from=$request->filled('from')?CarbonImmutable::parse($request->query('from'),'Africa/Cairo')->startOfDay()->utc():null;
        $to=$request->filled('to')?CarbonImmutable::parse($request->query('to'),'Africa/Cairo')->addDay()->startOfDay()->utc():null;
        $page=max(1,(int)$request->query('page',1));$perPage=min(100,max(20,(int)$request->query('perPage',50)));$offset=($page-1)*$perPage;
        $where=['1=1'];$bindings=[];
        if($entity){$where[]='al.entity_type=?';$bindings[]=$entity;}
        if($actor){$where[]='al.actor_user_id=?';$bindings[]=$actor;}
        if($action){$where[]='al.action=?';$bindings[]=$action;}
        if($from){$where[]='al.created_at>=?';$bindings[]=$from->toIso8601String();}
        if($to){$where[]='al.created_at<?';$bindings[]=$to->toIso8601String();}
        $whereSql=implode(' AND ',$where);
        $count=DB::selectOne("SELECT COUNT(*)::int AS total FROM audit_logs al WHERE {$whereSql}",$bindings);
        $rows=DB::select('SELECT al.id,al.request_id AS "requestId",al.action,al.entity_type AS "entityType",al.entity_id AS "entityId",al.old_values_json AS "oldValues",al.new_values_json AS "newValues",al.ip_address AS "ipAddress",al.user_agent AS "userAgent",al.previous_hash AS "previousHash",al.record_hash AS "recordHash",COALESCE(al.hash_version,1)::int AS "hashVersion",al.created_at AS "createdAt",u.name AS "actorName",u.email AS "actorEmail" FROM audit_logs al LEFT JOIN users u ON u.id=al.actor_user_id WHERE '.$whereSql.' ORDER BY al.id DESC LIMIT ? OFFSET ?',array_merge($bindings,[$perPage,$offset]));
        foreach($rows as$row){$row->oldValues=$this->decodeJson($row->oldValues);$row->newValues=$this->decodeJson($row->newValues);}
        return$this->ok($request,['items'=>$rows,'pagination'=>['page'=>$page,'perPage'=>$perPage,'total'=>(int)($count->total??0),'pages'=>(int)ceil(((int)($count->total??0))/$perPage)]]);
    }

    public function verify(Request $request)
    {
        $rows=DB::table('audit_logs')->orderBy('id')->get();$previous=null;$checked=0;$fullyVerified=0;$legacyUnverifiable=0;$firstBroken=null;
        foreach($rows as$row){
            $checked++;
            if(($row->previous_hash??null)!==$previous){$firstBroken=['id'=>(int)$row->id,'reason'=>'previous_hash_mismatch'];break;}
            $version=(int)($row->hash_version??1);
            $payload=$this->hashPayload($row,$version>=2);
            $hash=hash('sha256',$this->encode($payload));
            if(hash_equals((string)$row->record_hash,$hash))$fullyVerified++;
            elseif($version>=2){$firstBroken=['id'=>(int)$row->id,'reason'=>'record_hash_mismatch'];break;}
            else $legacyUnverifiable++;
            $previous=(string)$row->record_hash;
        }
        return$this->ok($request,['valid'=>$firstBroken===null,'checked'=>$checked,'total'=>$rows->count(),'fullyVerified'=>$fullyVerified,'legacyUnverifiable'=>$legacyUnverifiable,'firstBroken'=>$firstBroken]);
    }

    private function hashPayload(object $row,bool $canonical):array
    {
        $createdAt=CarbonImmutable::parse($row->created_at)->setTimezone(config('app.timezone','Africa/Cairo'))->toIso8601String();
        $old=$this->decodeNullableJson($row->old_values_json);$new=$this->decodeNullableJson($row->new_values_json);
        if($canonical){$old=$this->canonicalize($old);$new=$this->canonicalize($new);}
        return['requestId'=>$row->request_id,'actorUserId'=>$row->actor_user_id===null?null:(int)$row->actor_user_id,'action'=>$row->action,'entityType'=>$row->entity_type,'entityId'=>(string)$row->entity_id,'oldValues'=>$old,'newValues'=>$new,'ipAddress'=>$row->ip_address,'userAgent'=>$row->user_agent,'previousHash'=>$row->previous_hash,'createdAt'=>$createdAt];
    }
    private function encode(mixed $value):string{return json_encode($value,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRESERVE_ZERO_FRACTION|JSON_THROW_ON_ERROR);}
    private function canonicalize(mixed $value):mixed{if(is_object($value))$value=(array)$value;if(!is_array($value))return$value;if(array_is_list($value))return array_map(fn($v)=>$this->canonicalize($v),$value);ksort($value,SORT_STRING);foreach($value as$k=>$v)$value[$k]=$this->canonicalize($v);return$value;}
    private function decodeJson(mixed $value):array{if(is_array($value))return$value;if(is_object($value))return(array)$value;if(is_string($value)){$decoded=json_decode($value,true);return is_array($decoded)?$decoded:[];}return[];}
    private function decodeNullableJson(mixed $value):mixed{if($value===null)return null;if(is_array($value))return$value;if(is_object($value))return(array)$value;if(is_string($value))return json_decode($value,true);return$value;}
}
