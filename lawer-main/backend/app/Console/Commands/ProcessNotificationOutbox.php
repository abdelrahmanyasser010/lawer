<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

final class ProcessNotificationOutbox extends Command
{
    protected $signature='zdraft:process-outbox {--limit=50}';
    protected $description='Send pending Z draft email notifications';

    public function handle():int
    {
        $limit=max(1,min(500,(int)$this->option('limit')));$processed=0;
        while($processed<$limit){$row=DB::transaction(function(){ $selected=DB::selectOne("SELECT id,recipient,template_key,subject,payload_json,attempts FROM notification_outbox WHERE status IN ('pending','retry') AND available_at<=CURRENT_TIMESTAMP ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1");if(!$selected)return null;DB::statement("UPDATE notification_outbox SET status='processing',attempts=attempts+1 WHERE id=?",[$selected->id]);return$selected;});if(!$row)break;
            try{$this->send($row);DB::statement("UPDATE notification_outbox SET status='sent',sent_at=CURRENT_TIMESTAMP,error_message=NULL WHERE id=?",[$row->id]);$processed++;}
            catch(\Throwable $e){$attempts=(int)$row->attempts+1;$status=$attempts>=5?'failed':'retry';$delay=min(60,2**$attempts);DB::statement("UPDATE notification_outbox SET status=?,error_message=?,available_at=CURRENT_TIMESTAMP+(?::text || ' minutes')::interval WHERE id=?",[$status,mb_substr($e->getMessage(),0,4000),$delay,$row->id]);$this->error("Outbox {$row->id}: {$e->getMessage()}");$processed++;}
        }
        $this->info("Processed {$processed} outbox message(s).");return self::SUCCESS;
    }

    private function send(object $row):void
    {
        $payload=is_string($row->payload_json)?(json_decode($row->payload_json,true)?:[]):(array)$row->payload_json;$template=(string)$row->template_key;$title=(string)($payload['title']??$row->subject??'لديك تحديث جديد من Z draft');$message=(string)($payload['message']??($template==='verify_email_otp'?'استخدم الرمز التالي لتأكيد بريدك الإلكتروني وإكمال إنشاء حسابك.':$title));$url=$payload['verificationUrl']??$payload['resetUrl']??$payload['dashboardUrl']??$payload['actionUrl']??null;$label=match($template){'reset_password'=>'إعادة تعيين كلمة المرور','staff_invitation'=>'فتح لوحة المكتب','verify_email'=>'تأكيد البريد الإلكتروني',default=>'فتح حسابك ومراجعة التفاصيل'};
        $html=view('emails.notification',['templateKey'=>$template,'name'=>$payload['name']??null,'title'=>$title,'message'=>$message,'verificationCode'=>$payload['verificationCode']??null,'expiresMinutes'=>(int)($payload['expiresMinutes']??10),'temporaryPassword'=>$payload['temporaryPassword']??null,'actionUrl'=>$url,'buttonLabel'=>$label])->render();
        Mail::html($html,function($mail)use($row,$title){$mail->to((string)$row->recipient)->subject((string)($row->subject??$title));if(config('mail.reply_to.address'))$mail->replyTo(config('mail.reply_to.address'),config('mail.reply_to.name'));});
    }
}
