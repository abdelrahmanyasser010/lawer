<?php
namespace App\Http\Controllers;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class NotificationController extends Controller
{
    use ApiResponse;
    public function index(Request $request)
    {
        $id = $request->attributes->get('auth_user')['id'];
        $query = DB::table('dashboard_notifications')->selectRaw('id,notification_type AS "type",title,message,action_url AS "actionUrl",payload_json AS payload,read_at AS "readAt",created_at AS "createdAt"')->where('recipient_user_id',$id);
        if ($request->boolean('unreadOnly')) $query->whereNull('read_at');
        $items = $query->orderByDesc('created_at')->limit(100)->get()->map(function ($item) {
            if (is_string($item->payload)) {
                $decoded = json_decode($item->payload, true);
                $item->payload = is_array($decoded) ? $decoded : [];
            } elseif (is_object($item->payload)) {
                $item->payload = (array) $item->payload;
            } elseif (!is_array($item->payload)) {
                $item->payload = [];
            }
            return $item;
        })->values();
        $unreadCount = DB::table('dashboard_notifications')->where('recipient_user_id',$id)->whereNull('read_at')->count();
        return $this->ok($request, ['items' => $items, 'unreadCount' => $unreadCount]);
    }
    public function readAll(Request $request)
    {
        DB::table('dashboard_notifications')->where('recipient_user_id',$request->attributes->get('auth_user')['id'])->whereNull('read_at')->update(['read_at' => now()]);
        return $this->ok($request, ['updated' => true]);
    }
    public function read(Request $request, int $id)
    {
        DB::table('dashboard_notifications')->where('id',$id)->where('recipient_user_id',$request->attributes->get('auth_user')['id'])->update(['read_at' => now()]);
        return $this->ok($request, ['updated' => true]);
    }
}
