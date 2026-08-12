<?php
use App\Exceptions\ApiException;
use App\Http\Middleware\CsrfCookieGuard;
use App\Http\Middleware\RequestContext;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SessionAuth;
use App\Http\Middleware\OptionalSessionAuth;
use App\Http\Middleware\RequirePermission;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withCommands([__DIR__.'/../app/Console/Commands'])
    ->withRouting(web: __DIR__.'/../routes/web.php', api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [RequestContext::class, SecurityHeaders::class, OptionalSessionAuth::class, CsrfCookieGuard::class]);
        $middleware->alias([
            'auth.session' => SessionAuth::class,
            'permission' => RequirePermission::class,
        ]);
        $middleware->validateCsrfTokens(except: ['api/*']);
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ApiException $e, Request $request) {
            return SecurityHeaders::decorate($request, response()->json([
                'success' => false,
                'code' => $e->errorCode,
                'message' => $e->getMessage(),
                'details' => $e->details,
                'requestId' => $request->attributes->get('request_id'),
            ], $e->status));
        });
        $exceptions->render(function (ValidationException $e, Request $request) {
            return SecurityHeaders::decorate($request, response()->json([
                'success' => false,
                'code' => 'VALIDATION_FAILED',
                'message' => 'البيانات المدخلة غير صحيحة',
                'details' => $e->errors(),
                'requestId' => $request->attributes->get('request_id'),
            ], 422));
        });
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if (!$request->is('api/*') && !$request->expectsJson()) return null;
            $status = $e->getStatusCode();
            return SecurityHeaders::decorate($request, response()->json([
                'success' => false,
                'code' => $status === 404 ? 'ROUTE_NOT_FOUND' : ($status === 405 ? 'METHOD_NOT_ALLOWED' : 'HTTP_ERROR'),
                'message' => $status === 404 ? 'المسار المطلوب غير موجود' : ($status === 405 ? 'طريقة الطلب غير مسموحة' : 'تعذر تنفيذ الطلب'),
                'details' => null,
                'requestId' => $request->attributes->get('request_id'),
            ], $status));
        });
        $exceptions->render(function (Throwable $e, Request $request) {
            if (!$request->is('api/*') && !$request->expectsJson()) return null;
            report($e);
            return SecurityHeaders::decorate($request, response()->json([
                'success' => false,
                'code' => 'INTERNAL_SERVER_ERROR',
                'message' => 'حدث خطأ غير متوقع داخل الخادم',
                'details' => app()->isProduction() ? null : ['error' => $e->getMessage()],
                'requestId' => $request->attributes->get('request_id'),
            ], 500));
        });
    })->create();
