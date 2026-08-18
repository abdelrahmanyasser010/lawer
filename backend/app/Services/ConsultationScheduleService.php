<?php
namespace App\Services;

use App\Exceptions\ApiException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class ConsultationScheduleService
{
    private const ACTIVE_BOOKING_STATUSES = ['pending_payment','pending_verification','needs_client_info','confirmed','meeting_scheduled'];

    public function timezone(): string
    {
        return (string) config('app.timezone', 'Africa/Cairo');
    }

    public function pendingPaymentHoldMinutes(): int
    {
        $raw = DB::table('platform_settings')->where('setting_key','services.contract_review.pending_payment_hold_minutes')->value('setting_value_json');
        if (is_string($raw)) $raw = json_decode($raw, true);
        return max(5, min(120, (int) ($raw ?? 30)));
    }


    public function enabledChannels(): array
    {
        $raw = DB::table('platform_settings')->where('setting_key','customer_portal.communication_channels')->value('setting_value_json');
        if (is_string($raw)) $raw = json_decode($raw, true);
        if (is_object($raw)) $raw = (array) $raw;
        $channels = is_array($raw) ? array_values(array_intersect(array_map('strval',$raw), ['zoom','whatsapp'])) : ['zoom','whatsapp'];
        return $channels ?: [];
    }

    public function assertChannelEnabled(string $channel): void
    {
        if (!in_array($channel, $this->enabledChannels(), true)) throw new ApiException(409, 'قناة التواصل المختارة غير متاحة حاليًا', 'COMMUNICATION_CHANNEL_DISABLED');
    }

    public function availability(CarbonImmutable $from, CarbonImmutable $to, ?string $channel = null, ?int $excludeServiceRequestId = null): array
    {
        $tz = $this->timezone();
        $from = $from->setTimezone($tz)->startOfDay();
        $to = $to->setTimezone($tz)->endOfDay();
        if ($to->lessThan($from)) throw new ApiException(422, 'نطاق التاريخ غير صالح');
        if ($from->diffInDays($to) > 31) throw new ApiException(422, 'يمكن عرض المواعيد المتاحة لمدة 31 يومًا كحد أقصى');
        if ($channel !== null && !in_array($channel, ['zoom','whatsapp'], true)) throw new ApiException(422, 'قناة التواصل غير مدعومة');
        if ($channel !== null) $this->assertChannelEnabled($channel);

        $windows = DB::table('consultation_schedule_windows')->where('is_active', true)->orderBy('weekday')->orderBy('start_time')->get();
        $exceptions = DB::table('consultation_schedule_exceptions')
            ->whereBetween('exception_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('exception_date')->get()->groupBy(fn($row) => (string) $row->exception_date);

        $bookingQuery = DB::table('consultation_bookings')
            ->selectRaw('slot_start,communication_channel,COUNT(*)::int AS count')
            ->whereBetween('slot_start', [$from->utc()->toIso8601String(), $to->utc()->toIso8601String()])
            ->whereIn('status', self::ACTIVE_BOOKING_STATUSES)
            ->whereRaw("(status <> 'pending_payment' OR expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)");
        if ($excludeServiceRequestId !== null) $bookingQuery->where('service_request_id','<>',$excludeServiceRequestId);
        $bookingRows = $bookingQuery->groupBy('slot_start','communication_channel')->get();
        $counts = [];
        foreach ($bookingRows as $row) {
            $key = CarbonImmutable::parse($row->slot_start)->utc()->format('Y-m-d\TH:i:s\Z');
            $counts[$key][$row->communication_channel] = (int) $row->count;
        }

        $days = [];
        for ($date = $from; $date->lessThanOrEqualTo($to); $date = $date->addDay()) {
            $dateKey = $date->toDateString();
            $dayExceptions = $exceptions->get($dateKey, collect());
            $fullClosed = $dayExceptions->contains(fn($e) => (bool) $e->is_closed && $e->start_time === null && $e->end_time === null);
            if ($fullClosed) continue;

            $daySlots = [];
            foreach ($windows->where('weekday', $date->dayOfWeek) as $window) {
                $start = CarbonImmutable::parse($dateKey.' '.$window->start_time, $tz);
                $end = CarbonImmutable::parse($dateKey.' '.$window->end_time, $tz);
                $minutes = (int) $window->slot_minutes;
                for ($slot = $start; $slot->addMinutes($minutes)->lessThanOrEqualTo($end); $slot = $slot->addMinutes($minutes)) {
                    if ($slot->lessThan(CarbonImmutable::now($tz)->addMinutes(5))) continue;
                    $slotEnd = $slot->addMinutes($minutes);
                    $blocked = $dayExceptions->contains(function($e) use($dateKey,$slot,$slotEnd,$tz) {
                        if (!(bool) $e->is_closed || $e->start_time === null || $e->end_time === null) return false;
                        $bStart = CarbonImmutable::parse($dateKey.' '.$e->start_time, $tz);
                        $bEnd = CarbonImmutable::parse($dateKey.' '.$e->end_time, $tz);
                        return $slot->lessThan($bEnd) && $slotEnd->greaterThan($bStart);
                    });
                    if ($blocked) continue;

                    $utcKey = $slot->utc()->format('Y-m-d\TH:i:s\Z');
                    $zoomBooked = (int) ($counts[$utcKey]['zoom'] ?? 0);
                    $whatsappBooked = (int) ($counts[$utcKey]['whatsapp'] ?? 0);
                    $totalBooked = $zoomBooked + $whatsappBooked;
                    $totalRemaining = max(0, (int) $window->total_capacity - $totalBooked);
                    $zoomRemaining = max(0, min((int) $window->zoom_capacity - $zoomBooked, $totalRemaining));
                    $whatsappRemaining = max(0, min((int) $window->whatsapp_capacity - $whatsappBooked, $totalRemaining));
                    $remaining = $channel === 'zoom' ? $zoomRemaining : ($channel === 'whatsapp' ? $whatsappRemaining : $totalRemaining);
                    if ($remaining <= 0) continue;

                    $daySlots[] = [
                        'slotKey' => $window->id.'|'.$slot->utc()->timestamp,
                        'start' => $slot->toIso8601String(),
                        'end' => $slotEnd->toIso8601String(),
                        'label' => $slot->translatedFormat('g:i A'),
                        'available' => true,
                        'remaining' => $remaining,
                        'limited' => $remaining <= 2,
                        'channels' => [
                            'zoom' => ['available' => $zoomRemaining > 0, 'remaining' => $zoomRemaining],
                            'whatsapp' => ['available' => $whatsappRemaining > 0, 'remaining' => $whatsappRemaining],
                        ],
                    ];
                }
            }
            if ($daySlots) $days[] = ['date'=>$dateKey,'label'=>$date->translatedFormat('l، j F Y'),'slots'=>$daySlots];
        }
        return $days;
    }

    public function reserve(int $serviceRequestId, string $channel, string $slotKey, string $status = 'pending_payment'): array
    {
        if (!in_array($channel, ['zoom','whatsapp'], true)) throw new ApiException(422, 'قناة التواصل غير مدعومة');
        $this->assertChannelEnabled($channel);
        [$windowId, $timestamp] = $this->parseSlotKey($slotKey);
        $tz = $this->timezone();
        $slotUtc = CarbonImmutable::createFromTimestampUTC($timestamp);
        $slotLocal = $slotUtc->setTimezone($tz);

        return DB::transaction(function() use($serviceRequestId,$channel,$status,$windowId,$slotUtc,$slotLocal,$tz) {
            $window = DB::selectOne('SELECT * FROM consultation_schedule_windows WHERE id=? AND is_active=TRUE FOR UPDATE',[$windowId]);
            if (!$window) throw new ApiException(409,'الموعد لم يعد متاحًا','SLOT_UNAVAILABLE');
            if ((int)$window->weekday !== $slotLocal->dayOfWeek) throw new ApiException(409,'الموعد لم يعد متاحًا','SLOT_UNAVAILABLE');
            $day = $slotLocal->toDateString();
            $start = CarbonImmutable::parse($day.' '.$window->start_time,$tz);
            $end = CarbonImmutable::parse($day.' '.$window->end_time,$tz);
            $slotEnd = $slotLocal->addMinutes((int)$window->slot_minutes);
            if ($slotLocal->lessThan($start) || $slotEnd->greaterThan($end) || $slotLocal->lessThan(CarbonImmutable::now($tz)->addMinutes(2))) throw new ApiException(409,'الموعد لم يعد متاحًا','SLOT_UNAVAILABLE');
            $offsetMinutes = $start->diffInMinutes($slotLocal, false);
            if ($offsetMinutes < 0 || $offsetMinutes % (int)$window->slot_minutes !== 0) throw new ApiException(409,'الموعد غير مطابق لفترات الحجز','SLOT_INVALID');

            $blocked = DB::selectOne('SELECT 1 FROM consultation_schedule_exceptions WHERE exception_date=? AND is_closed=TRUE AND ((start_time IS NULL AND end_time IS NULL) OR (?::time < end_time AND ?::time > start_time)) LIMIT 1',[$day,$slotLocal->format('H:i:s'),$slotEnd->format('H:i:s')]);
            if ($blocked) throw new ApiException(409,'هذا الوقت مغلق من المكتب','SLOT_BLOCKED');

            $rows = DB::select("SELECT communication_channel,COUNT(*)::int AS count FROM consultation_bookings WHERE slot_start=? AND service_request_id<>? AND status=ANY(?::text[]) AND (status <> 'pending_payment' OR expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) GROUP BY communication_channel",[
                $slotUtc->toIso8601String(),$serviceRequestId,'{'.implode(',',self::ACTIVE_BOOKING_STATUSES).'}'
            ]);
            $counts=['zoom'=>0,'whatsapp'=>0];foreach($rows as$r)$counts[$r->communication_channel]=(int)$r->count;
            $total=$counts['zoom']+$counts['whatsapp'];
            $channelCap=$channel==='zoom'?(int)$window->zoom_capacity:(int)$window->whatsapp_capacity;
            if($total >= (int)$window->total_capacity || $counts[$channel] >= $channelCap) throw new ApiException(409,'اكتمل عدد الحجوزات في هذا الموعد. اختر وقتًا آخر','SLOT_FULL');

            $expiresAt=$status==='pending_payment' ? now()->addMinutes($this->pendingPaymentHoldMinutes()) : null;
            DB::statement('INSERT INTO consultation_bookings(service_request_id,communication_channel,slot_start,slot_end,status,expires_at,updated_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT (service_request_id) DO UPDATE SET communication_channel=EXCLUDED.communication_channel,slot_start=EXCLUDED.slot_start,slot_end=EXCLUDED.slot_end,status=EXCLUDED.status,expires_at=EXCLUDED.expires_at,updated_at=CURRENT_TIMESTAMP',[$serviceRequestId,$channel,$slotUtc->toIso8601String(),$slotEnd->utc()->toIso8601String(),$status,$expiresAt]);
            return ['slotStart'=>$slotLocal->toIso8601String(),'slotEnd'=>$slotEnd->toIso8601String(),'channel'=>$channel,'expiresAt'=>$expiresAt?->toIso8601String()];
        });
    }

    public function assertPaymentHoldActive(int $serviceRequestId): void
    {
        $error=DB::transaction(function()use($serviceRequestId){
            $booking=DB::table('consultation_bookings')->where('service_request_id',$serviceRequestId)->lockForUpdate()->first();
            if(!$booking)return ['message'=>'الحجز المرتبط بالطلب غير موجود. اختر موعدًا جديدًا','code'=>'BOOKING_MISSING'];
            $status=(string)$booking->status;
            if($status==='pending_payment'&&$booking->expires_at&&CarbonImmutable::parse($booking->expires_at)->isPast()){
                DB::table('consultation_bookings')->where('service_request_id',$serviceRequestId)->update(['status'=>'expired','expires_at'=>null,'updated_at'=>now()]);
                return ['message'=>'انتهت مهلة حفظ الموعد قبل إكمال الدفع. اختر موعدًا جديدًا','code'=>'BOOKING_EXPIRED'];
            }
            if(in_array($status,['expired','cancelled','completed'],true))return ['message'=>'الموعد السابق لم يعد صالحًا. اختر موعدًا جديدًا','code'=>'BOOKING_REBOOK_REQUIRED'];
            return null;
        });
        if($error)throw new ApiException(409,$error['message'],$error['code']);
    }

    public function reactivateExisting(int $serviceRequestId, string $status = 'pending_verification'): void
    {
        $booking=DB::table('consultation_bookings')->where('service_request_id',$serviceRequestId)->first();
        if(!$booking)throw new ApiException(409,'الحجز المرتبط بمراجعة العقد غير موجود. اختر موعدًا جديدًا','BOOKING_MISSING');
        if((string)$booking->status==='pending_payment' && $booking->expires_at && CarbonImmutable::parse($booking->expires_at)->isPast()){
            DB::table('consultation_bookings')->where('service_request_id',$serviceRequestId)->update(['status'=>'expired','expires_at'=>null,'updated_at'=>now()]);
            throw new ApiException(409,'انتهت مهلة حفظ الموعد قبل إكمال الدفع. اختر موعدًا جديدًا','BOOKING_EXPIRED');
        }
        $active=in_array((string)$booking->status,self::ACTIVE_BOOKING_STATUSES,true);
        if($active){$this->setBookingStatus($serviceRequestId,$status);return;}
        $slotUtc=CarbonImmutable::parse($booking->slot_start)->utc();$slotLocal=$slotUtc->setTimezone($this->timezone());$slotEnd=CarbonImmutable::parse($booking->slot_end)->setTimezone($this->timezone());
        $windows=DB::table('consultation_schedule_windows')->where('is_active',true)->where('weekday',$slotLocal->dayOfWeek)->get();
        $matched=null;
        foreach($windows as$window){
            $start=CarbonImmutable::parse($slotLocal->toDateString().' '.$window->start_time,$this->timezone());$end=CarbonImmutable::parse($slotLocal->toDateString().' '.$window->end_time,$this->timezone());
            $offset=$start->diffInMinutes($slotLocal,false);
            if($slotLocal->greaterThanOrEqualTo($start)&&$slotEnd->lessThanOrEqualTo($end)&&$offset>=0&&$offset%(int)$window->slot_minutes===0){$matched=$window;break;}
        }
        if(!$matched)throw new ApiException(409,'الموعد السابق لم يعد ضمن جدول العمل. اختر موعدًا جديدًا','SLOT_UNAVAILABLE');
        $this->reserve($serviceRequestId,(string)$booking->communication_channel,$matched->id.'|'.$slotUtc->timestamp,$status);
    }

    public function reserveAt(int $serviceRequestId,string $channel,string $scheduledAt,string $status='meeting_scheduled'): array
    {
        $local=CarbonImmutable::parse($scheduledAt)->setTimezone($this->timezone());
        $windows=DB::table('consultation_schedule_windows')->where('is_active',true)->where('weekday',$local->dayOfWeek)->orderBy('start_time')->get();
        foreach($windows as$window){
            $start=CarbonImmutable::parse($local->toDateString().' '.$window->start_time,$this->timezone());
            $end=CarbonImmutable::parse($local->toDateString().' '.$window->end_time,$this->timezone());
            $slotEnd=$local->addMinutes((int)$window->slot_minutes);
            $offset=$start->diffInMinutes($local,false);
            if($local->greaterThanOrEqualTo($start)&&$slotEnd->lessThanOrEqualTo($end)&&$offset>=0&&$offset%(int)$window->slot_minutes===0){
                return $this->reserve($serviceRequestId,$channel,$window->id.'|'.$local->utc()->timestamp,$status);
            }
        }
        throw new ApiException(409,'الموعد المختار خارج فترات العمل أو لا يطابق مدة الموعد','SLOT_UNAVAILABLE');
    }

    public function setBookingStatus(int $serviceRequestId, string $status): void
    {
        $expiresAt=$status==='pending_payment' ? now()->addMinutes($this->pendingPaymentHoldMinutes()) : null;
        DB::table('consultation_bookings')->where('service_request_id',$serviceRequestId)->update(['status'=>$status,'expires_at'=>$expiresAt,'updated_at'=>now()]);
    }

    private function parseSlotKey(string $slotKey): array
    {
        if (!preg_match('/^(\d+)\|(\d{9,12})$/',$slotKey,$m)) throw new ApiException(422,'معرّف الموعد غير صالح','SLOT_INVALID');
        return [(int)$m[1],(int)$m[2]];
    }
}
