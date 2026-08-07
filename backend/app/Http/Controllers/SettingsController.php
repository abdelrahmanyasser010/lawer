<?php
namespace App\Http\Controllers;
use App\Exceptions\ApiException;
use App\Services\AuditService;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class SettingsController extends Controller
{
    use ApiResponse;
    private const EDITABLE = [
        'office.display_name','office.support_email','office.address','office.whatsapp_number','payments.vodafone_cash_number',
        'contracts.require_email_verification','contracts.self_service_edit_hours','services.contract_review.deposit_egp',
        'services.consultation.deposit_egp','services.contract_drafting.deposit_egp','customer_portal.communication_channels',
        'notifications.whatsapp_mode','notifications.web_push_enabled',
    ];
    public function __construct(private AuditService $audit, private NotificationService $notifications) {}
    public function index(Request $request)
    {
        $rows = DB::table('platform_settings')->selectRaw('setting_key AS key,setting_value_json AS value,is_secret AS "isSecret",updated_at AS "updatedAt"')->orderBy('setting_key')->get()->map(function($row){ if ($row->isSecret) $row->value='••••••••'; elseif (is_string($row->value)) $row->value=json_decode($row->value,true); return $row; });
        return $this->ok($request, $rows);
    }
    public function update(Request $request)
    {
        $data = $request->validate(['settings' => ['required','array','min:1','max:30'], 'settings.*.key' => ['required','string'], 'settings.*.value' => ['present'], 'settings.*.isSecret' => ['nullable','boolean']]);
        $seen=[]; $validated=[];
        foreach ($data['settings'] as $entry) {
            $key=trim($entry['key']);
            if (isset($seen[$key])) throw new ApiException(400, "الإعداد {$key} مكرر");
            $seen[$key]=true;
            if (!in_array($key,self::EDITABLE,true)) throw new ApiException(400, "الإعداد {$key} غير قابل للتعديل من لوحة التحكم");
            if (($entry['isSecret']??false)===true) throw new ApiException(400,'الأسرار لا تُحفظ من لوحة التحكم؛ استخدم متغيرات البيئة أو Secret Manager');
            $validated[]=['key'=>$key,'value'=>$this->validateValue($key,$entry['value'])];
        }
        DB::transaction(function() use($request,$validated): void {
            foreach($validated as $entry) DB::statement('INSERT INTO platform_settings (setting_key,setting_value_json,is_secret,updated_by) VALUES (?,?::jsonb,FALSE,?) ON CONFLICT (setting_key) DO UPDATE SET setting_value_json=EXCLUDED.setting_value_json,is_secret=FALSE,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP',[$entry['key'],json_encode($entry['value'],JSON_UNESCAPED_UNICODE),$request->attributes->get('auth_user')['id']]);
            $this->audit->write($request,'settings.updated','platform_settings','global',null,['keys'=>array_column($validated,'key')]);
        });
        return $this->ok($request,['updated'=>count($validated)],'تم حفظ الإعدادات وتسجيل التغيير');
    }
    public function testEmail(Request $request)
    {
        $auth=$request->attributes->get('auth_user');
        $this->notifications->email($auth['email'],'system_notification','رسالة اختبار من Z draft',['name'=>$auth['name'],'title'=>'تم ربط البريد بنجاح','message'=>'هذه رسالة اختبار من نظام Z draft. إذا وصلتك فالـOutbox والـQueue وإعدادات Gmail تعمل بصورة صحيحة.','actionUrl'=>rtrim(config('zdraft.dashboard_url'),'/').'/settings']);
        $this->audit->write($request,'settings.test_email_queued','notification_outbox',$auth['email'],null,['provider'=>config('mail.default')]);
        return $this->ok($request,['recipient'=>$auth['email'],'provider'=>config('mail.default')],'تمت إضافة رسالة الاختبار إلى طابور البريد');
    }
    private function validateValue(string $key,mixed $value): mixed
    {
        return match($key){
            'office.display_name'=>$this->text($value,2,120),'office.support_email'=>$this->email($value),'office.address'=>$this->text($value,0,500),'office.whatsapp_number','payments.vodafone_cash_number'=>$this->text($value,0,30),
            'contracts.require_email_verification'=>$this->bool($value),'contracts.self_service_edit_hours'=>$this->number($value,1,168),
            'services.contract_review.deposit_egp','services.consultation.deposit_egp','services.contract_drafting.deposit_egp'=>$this->number($value,0,100000),
            'customer_portal.communication_channels'=>$this->channels($value),'notifications.whatsapp_mode'=>$this->choice($value,['manual_wa_me','disabled']),
            'notifications.web_push_enabled'=>$value===false?false:throw new ApiException(400,'Web Push غير مفعل في إصدار MVP الحالي'),
            default=>throw new ApiException(400,'الإعداد غير مدعوم')};
    }
    private function text(mixed $v,int $min,int $max):string{if(!is_string($v))throw new ApiException(400,'قيمة الإعداد يجب أن تكون نصًا');$v=trim($v);if(mb_strlen($v)<$min||mb_strlen($v)>$max)throw new ApiException(400,"طول قيمة الإعداد يجب أن يكون بين {$min} و{$max}");return $v;}
    private function email(mixed $v):string{$v=$this->text($v,0,255);if($v!==''&&!filter_var($v,FILTER_VALIDATE_EMAIL))throw new ApiException(400,'بريد الدعم غير صالح');return $v;}
    private function bool(mixed $v):bool{if(!is_bool($v))throw new ApiException(400,'قيمة الإعداد يجب أن تكون نعم أو لا');return $v;}
    private function number(mixed $v,float $min,float $max):float{$n=filter_var($v,FILTER_VALIDATE_FLOAT);if($n===false||$n<$min||$n>$max)throw new ApiException(400,"قيمة الإعداد يجب أن تكون بين {$min} و{$max}");return(float)$n;}
    private function choice(mixed $v,array $choices):string{if(!is_string($v)||!in_array($v,$choices,true))throw new ApiException(400,'قيمة الإعداد غير مدعومة');return$v;}
    private function channels(mixed $v):array{if(!is_array($v))throw new ApiException(400,'قنوات التواصل يجب أن تكون قائمة');$r=array_values(array_unique(array_intersect($v,['office','zoom','whatsapp'])));if(!$r)throw new ApiException(400,'اختر قناة تواصل واحدة على الأقل');return$r;}
}
