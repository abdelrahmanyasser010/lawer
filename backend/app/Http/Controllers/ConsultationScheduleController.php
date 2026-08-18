<?php
namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Services\AuditService;
use App\Services\ConsultationScheduleService;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

final class ConsultationScheduleController extends Controller
{
    use ApiResponse;
    public function __construct(private ConsultationScheduleService $schedule, private AuditService $audit) {}

    public function availability(Request $request)
    {
        $data=$request->validate(['from'=>['nullable','date'],'to'=>['nullable','date'],'channel'=>['nullable','in:zoom,whatsapp']]);
        $tz=$this->schedule->timezone();
        $from=!empty($data['from'])?CarbonImmutable::parse($data['from'],$tz):CarbonImmutable::now($tz);
        $to=!empty($data['to'])?CarbonImmutable::parse($data['to'],$tz):$from->addDays(14);
        return $this->ok($request,['timezone'=>$tz,'days'=>$this->schedule->availability($from,$to,$data['channel']??null)]);
    }

    public function adminIndex(Request $request)
    {
        $windows=DB::table('consultation_schedule_windows')->orderBy('weekday')->orderBy('start_time')->get()->map(fn($r)=>[
            'id'=>(int)$r->id,'weekday'=>(int)$r->weekday,'startTime'=>substr((string)$r->start_time,0,5),'endTime'=>substr((string)$r->end_time,0,5),'slotMinutes'=>(int)$r->slot_minutes,
            'totalCapacity'=>(int)$r->total_capacity,'zoomCapacity'=>(int)$r->zoom_capacity,'whatsappCapacity'=>(int)$r->whatsapp_capacity,'isActive'=>(bool)$r->is_active,
        ]);
        $exceptions=DB::table('consultation_schedule_exceptions')->where('exception_date','>=',now($this->schedule->timezone())->subDay()->toDateString())->orderBy('exception_date')->orderBy('start_time')->limit(200)->get()->map(fn($r)=>[
            'id'=>(int)$r->id,'date'=>(string)$r->exception_date,'startTime'=>$r->start_time?substr((string)$r->start_time,0,5):null,'endTime'=>$r->end_time?substr((string)$r->end_time,0,5):null,'isClosed'=>(bool)$r->is_closed,'reason'=>$r->reason,
        ]);
        return $this->ok($request,['timezone'=>$this->schedule->timezone(),'windows'=>$windows,'exceptions'=>$exceptions]);
    }

    public function updateWindows(Request $request)
    {
        $data=$request->validate(['windows'=>['present','array','max:30'],'windows.*.weekday'=>['required','integer','between:0,6'],'windows.*.startTime'=>['required','date_format:H:i'],'windows.*.endTime'=>['required','date_format:H:i'],'windows.*.slotMinutes'=>['required','integer','between:15,240'],'windows.*.totalCapacity'=>['required','integer','between:1,500'],'windows.*.zoomCapacity'=>['required','integer','between:0,500'],'windows.*.whatsappCapacity'=>['required','integer','between:0,500'],'windows.*.isActive'=>['nullable','boolean']]);
        foreach($data['windows'] as $window){
            if($window['endTime']<=$window['startTime'])throw new ApiException(422,'وقت نهاية فترة العمل يجب أن يكون بعد البداية');
            if($window['zoomCapacity']>$window['totalCapacity']||$window['whatsappCapacity']>$window['totalCapacity']||($window['zoomCapacity']+$window['whatsappCapacity'])>$window['totalCapacity'])throw new ApiException(422,'مجموع سعة Zoom وواتساب لا يمكن أن يتجاوز السعة الإجمالية للفترة');
        }
        foreach(collect($data['windows'])->groupBy('weekday') as $weekday=>$rows){
            $sorted=$rows->sortBy('startTime')->values();
            for($i=1;$i<$sorted->count();$i++)if($sorted[$i]['startTime']<$sorted[$i-1]['endTime'])throw new ApiException(422,'فترات العمل في اليوم نفسه لا يمكن أن تتداخل','SCHEDULE_WINDOWS_OVERLAP',['weekday'=>(int)$weekday]);
        }
        $auth=$request->attributes->get('auth_user');
        DB::transaction(function()use($request,$data,$auth){
            DB::table('consultation_schedule_windows')->delete();
            foreach($data['windows'] as$window)DB::table('consultation_schedule_windows')->insert([
                'weekday'=>$window['weekday'],'start_time'=>$window['startTime'],'end_time'=>$window['endTime'],'slot_minutes'=>$window['slotMinutes'],'total_capacity'=>$window['totalCapacity'],'zoom_capacity'=>$window['zoomCapacity'],'whatsapp_capacity'=>$window['whatsappCapacity'],'is_active'=>$window['isActive']??true,'created_at'=>now(),'updated_at'=>now(),
            ]);
            $this->audit->write($request,'consultation.schedule_updated','consultation_schedule','weekly',null,['windowsCount'=>count($data['windows']),'updatedBy'=>$auth['id']??null]);
        });
        return $this->ok($request,['updated'=>count($data['windows'])],'تم حفظ جدول مواعيد مراجعة العقود');
    }

    public function addException(Request $request)
    {
        $data=$request->validate(['date'=>['required','date'],'startTime'=>['nullable','date_format:H:i'],'endTime'=>['nullable','date_format:H:i'],'reason'=>['nullable','string','max:500']]);
        if(CarbonImmutable::parse($data['date'],$this->schedule->timezone())->endOfDay()->isPast())throw new ApiException(422,'لا يمكن إضافة حظر لتاريخ انتهى بالفعل');
        if(($data['startTime']??null)!==null xor ($data['endTime']??null)!==null)throw new ApiException(422,'حدد بداية ونهاية فترة الحظر معًا');
        if(($data['startTime']??null)!==null&&$data['endTime']<=$data['startTime'])throw new ApiException(422,'نهاية الحظر يجب أن تكون بعد بدايته');
        $auth=$request->attributes->get('auth_user');
        $id=DB::table('consultation_schedule_exceptions')->insertGetId(['exception_date'=>$data['date'],'start_time'=>$data['startTime']??null,'end_time'=>$data['endTime']??null,'is_closed'=>true,'reason'=>$data['reason']??null,'created_by'=>$auth['id']??null,'created_at'=>now()]);
        $this->audit->write($request,'consultation.schedule_blocked','consultation_schedule_exception',$id,null,$data);
        return $this->created($request,['id'=>$id],'تم حظر الوقت المحدد');
    }

    public function deleteException(Request $request,int $id)
    {
        $old=DB::table('consultation_schedule_exceptions')->where('id',$id)->first();
        if(!$old)throw new ApiException(404,'الحظر غير موجود');
        DB::table('consultation_schedule_exceptions')->where('id',$id)->delete();
        $this->audit->write($request,'consultation.schedule_block_removed','consultation_schedule_exception',$id,(array)$old,null);
        return $this->ok($request,['deleted'=>true],'تم إلغاء الحظر');
    }
}
