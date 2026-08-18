<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
final class RequestContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $id = $request->headers->get('X-Request-Id') ?: bin2hex(random_bytes(12));
        $request->attributes->set('request_id', $id);
        $response = $next($request);
        $response->headers->set('X-Request-Id', $id);
        return $response;
    }
}
