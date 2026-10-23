<?php

namespace App\Services;

use App\Exceptions\ApiException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class LegalAcceptanceService
{
    private const TYPES=['terms_and_conditions','privacy_policy','refund_cancellation_policy','delivery_shipping_policy'];

    /** @param array<int,array<string,mixed>> $entries @return array<int,array<string,mixed>> */
    public function recordRegistration(int $userId,array $entries,Request $request):array
    {
        if(!$entries){
            $entries=[];
            foreach(['terms_and_conditions','privacy_policy'] as$type){
                $current=DB::table('legal_contents')->where('content_key',$type)->where('is_published',true)->value('current_published_version');
                if($current)$entries[]=['documentType'=>$type,'publishedVersion'=>(int)$current,'context'=>'registration'];
            }
        }
        $recorded=[];
        foreach($entries as$entry){
            $entry['context']='registration';
            $recorded[]=$this->record($userId,$entry,$request);
        }
        $types=array_column($recorded,'documentType');
        foreach(['terms_and_conditions','privacy_policy'] as$required)if(!in_array($required,$types,true))throw new ApiException(422,'يجب قبول النسخة المنشورة من الشروط وسياسة الخصوصية','LEGAL_ACCEPTANCE_REQUIRED',['documentType'=>$required]);
        return$recorded;
    }

    /** @param array<string,mixed> $entry @return array<string,mixed> */
    public function record(int $userId,array $entry,Request $request):array
    {
        $type=(string)($entry['documentType']??'');$version=(int)($entry['publishedVersion']??0);$context=(string)($entry['context']??'');
        if(!in_array($type,self::TYPES,true))throw new ApiException(422,'نوع المستند القانوني غير مدعوم','LEGAL_DOCUMENT_TYPE_INVALID');
        if(!in_array($context,['registration','checkout'],true))throw new ApiException(422,'سياق الموافقة غير مدعوم','LEGAL_ACCEPTANCE_CONTEXT_INVALID');
        $legalVersion=DB::selectOne('SELECT id FROM legal_content_versions WHERE content_key=? AND version_number=?',[$type,$version]);
        if(!$legalVersion)throw new ApiException(422,'نسخة المستند القانوني غير موجودة','LEGAL_CONTENT_VERSION_NOT_FOUND',['documentType'=>$type,'publishedVersion'=>$version]);
        $current=DB::selectOne('SELECT is_published,current_published_version FROM legal_contents WHERE content_key=?',[$type]);
        if(!$current||(bool)$current->is_published!==true||(int)$current->current_published_version!==$version)throw new ApiException(409,'يجب قبول أحدث نسخة منشورة من المستند القانوني','LEGAL_CONTENT_VERSION_OUTDATED',['documentType'=>$type,'publishedVersion'=>$version,'currentPublishedVersion'=>$current?((int)$current->current_published_version):null]);
        DB::statement(<<<'SQL'
INSERT INTO legal_acceptances(user_id,legal_content_version_id,document_type,published_version,context,ip_address,user_agent)
VALUES (?,?,?,?,?,?,?)
ON CONFLICT (user_id,document_type,published_version,context) DO NOTHING
SQL,[$userId,$legalVersion->id,$type,$version,$context,$request->ip(),$request->userAgent()]);
        return['documentType'=>$type,'publishedVersion'=>$version,'context'=>$context];
    }
}
