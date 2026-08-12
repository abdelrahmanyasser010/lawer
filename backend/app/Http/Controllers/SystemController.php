<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
final class SystemController
{
    public function health():JsonResponse{return response()->json(['status'=>'ok','service'=>'Z draft Laravel API','version'=>'27.0.0','timestamp'=>now()->toIso8601String()]);}
    public function ready():JsonResponse
    {
        try{DB::selectOne('SELECT 1');foreach(['private','contracts']as$disk){$probe='.health/'.bin2hex(random_bytes(8));Storage::disk($disk)->put($probe,'ok');Storage::disk($disk)->delete($probe);}return response()->json(['status'=>'ready','database'=>'ok','storage'=>'ok','backend'=>'laravel']);}
        catch(\Throwable $e){return response()->json(['status'=>'not_ready','database'=>'or_storage_unavailable','error'=>app()->isProduction()?null:$e->getMessage()],503);}
    }
}
