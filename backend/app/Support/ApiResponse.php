<?php
namespace App\Support;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
trait ApiResponse
{
    protected function ok(Request $request, mixed $data = null, ?string $message = null, int $status = 200): JsonResponse
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data, 'requestId' => $request->attributes->get('request_id')], $status);
    }
    protected function created(Request $request, mixed $data = null, ?string $message = null): JsonResponse
    {
        return $this->ok($request, $data, $message, 201);
    }
}
