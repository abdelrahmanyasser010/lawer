<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Services\AuditService;
use App\Services\LegalAcceptanceService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

final class LegalContentController extends Controller
{
    use ApiResponse;
    private const KEYS=['about_us','terms_and_conditions','privacy_policy','refund_cancellation_policy','delivery_shipping_policy'];

    public function __construct(private AuditService $audit,private LegalAcceptanceService $acceptances){}

    public function publicShow(Request $request,string $key)
    {
        if(!in_array($key,self::KEYS,true))throw new ApiException(404,'المحتوى القانوني غير موجود');
        $row=DB::selectOne(<<<'SQL'
SELECT lc.content_key,lcv.title,lcv.body,lcv.version_number,lcv.published_at
FROM legal_contents lc
JOIN legal_content_versions lcv ON lcv.content_key=lc.content_key AND lcv.version_number=lc.current_published_version
WHERE lc.content_key=? AND lc.is_published=TRUE
SQL,[$key]);
        if(!$row)throw new ApiException(404,'لا توجد نسخة منشورة من هذا المحتوى','LEGAL_CONTENT_NOT_PUBLISHED');
        return$this->ok($request,['key'=>(string)$row->content_key,'title'=>(string)$row->title,'body'=>(string)$row->body,'publishedVersion'=>(int)$row->version_number,'publishedAt'=>$row->published_at]);
    }

    public function accept(Request $request)
    {
        $data=$request->validate(['documentType'=>['required','string','max:80'],'publishedVersion'=>['required','integer','min:1'],'context'=>['required','in:registration,checkout']]);
        if($data['context']==='registration')throw new ApiException(409,'موافقة التسجيل تُحفظ أثناء إنشاء الحساب','REGISTRATION_ACCEPTANCE_AT_SIGNUP');
        $userId=(int)$request->attributes->get('auth_user')['id'];
        $recorded=$this->acceptances->record($userId,$data,$request);
        $this->audit->write($request,'legal.accepted','legal_content',$data['documentType'].':'.$data['publishedVersion'],null,$recorded,$userId);
        return$this->ok($request,['accepted'=>true]+$recorded,'تم حفظ موافقتك على النسخة المحددة');
    }

    public function adminIndex(Request $request)
    {
        $rows=DB::select('SELECT content_key AS key,title,draft_body AS body,is_published AS "isPublished",current_published_version AS "publishedVersion",published_at AS "publishedAt",updated_at AS "updatedAt" FROM legal_contents ORDER BY content_key');
        return$this->ok($request,$rows);
    }

    public function adminUpdate(Request $request,string $key)
    {
        if(!in_array($key,self::KEYS,true))throw new ApiException(404,'المحتوى القانوني غير موجود');
        $data=$request->validate(['title'=>['required','string','min:2','max:200'],'body'=>['required','string','min:10','max:100000'],'isPublished'=>['required','boolean']]);
        $actor=(int)$request->attributes->get('auth_user')['id'];
        $result=DB::transaction(function()use($request,$key,$data,$actor){
            $content=DB::selectOne('SELECT * FROM legal_contents WHERE content_key=? FOR UPDATE',[$key]);
            if(!$content)throw new ApiException(404,'المحتوى القانوني غير موجود');
            $old=['title'=>$content->title,'body'=>$content->draft_body,'isPublished'=>(bool)$content->is_published,'publishedVersion'=>$content->current_published_version];
            $version=$content->current_published_version?(int)$content->current_published_version:null;$publishedAt=$content->published_at;
            if($data['isPublished']){
                $published=$version?DB::selectOne('SELECT title,body,published_at FROM legal_content_versions WHERE content_key=? AND version_number=?',[$key,$version]):null;
                if(!$published||$published->title!==trim($data['title'])||$published->body!==$data['body']){
                    $version=(int)DB::selectOne('SELECT COALESCE(MAX(version_number),0)+1 AS next FROM legal_content_versions WHERE content_key=?',[$key])->next;
                    $publishedAt=now();
                    DB::table('legal_content_versions')->insert(['content_key'=>$key,'version_number'=>$version,'title'=>trim($data['title']),'body'=>$data['body'],'published_by'=>$actor,'published_at'=>$publishedAt,'created_at'=>$publishedAt]);
                }else $publishedAt=$published->published_at;
            }
            DB::table('legal_contents')->where('content_key',$key)->update(['title'=>trim($data['title']),'draft_body'=>$data['body'],'is_published'=>$data['isPublished'],'current_published_version'=>$version,'published_at'=>$publishedAt,'updated_by'=>$actor,'updated_at'=>now()]);
            $new=['title'=>trim($data['title']),'body'=>$data['body'],'isPublished'=>(bool)$data['isPublished'],'publishedVersion'=>$version,'publishedAt'=>$publishedAt];
            $this->audit->write($request,$data['isPublished']?'legal_content.published':'legal_content.saved_unpublished','legal_content',$key,$old,$new);
            return$new;
        });
        return$this->ok($request,['key'=>$key]+$result,$data['isPublished']?'تم حفظ ونشر النسخة القانونية':'تم حفظ المحتوى كغير منشور');
    }
}
