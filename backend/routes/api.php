<?php
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\ConsultationScheduleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FeatureDisabledController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ServiceRequestController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health',[SystemController::class,'health']);
Route::get('/ready',[SystemController::class,'ready']);
Route::options('/{any}', fn()=>response('',204))->where('any','.*');

$register = static function (string $prefix = 'v1'): void {
    Route::prefix($prefix)->group(function (): void {
        Route::prefix('auth')->group(function (): void {
            Route::post('register',[AuthController::class,'register'])->middleware('throttle:10,1');
            Route::post('login',[AuthController::class,'login'])->middleware('throttle:10,1');
            Route::post('logout',[AuthController::class,'logout'])->middleware('auth.session');
            Route::get('me',[AuthController::class,'me'])->middleware('auth.session');
            Route::post('email-verification/request',[AuthController::class,'requestVerification'])->middleware(['auth.session','throttle:3,1']);
            Route::post('email-verification/verify',[AuthController::class,'verifyEmail'])->middleware(['auth.session','throttle:10,1']);
            Route::post('password/forgot',[AuthController::class,'forgotPassword'])->middleware('throttle:5,1');
            Route::post('password/reset',[AuthController::class,'resetPassword'])->middleware('throttle:5,1');
            Route::post('password/change',[AuthController::class,'changePassword'])->middleware('auth.session');
            Route::get('sessions',[AuthController::class,'sessions'])->middleware('auth.session');
            Route::delete('sessions/{id}',[AuthController::class,'revokeSession'])->whereNumber('id')->middleware('auth.session');
        });
        Route::get('catalog',CatalogController::class);
        Route::get('templates',[TemplateController::class,'index']);
        Route::get('templates/{slug}/definition',[TemplateController::class,'definition']);
        Route::get('consultation-availability',[ConsultationScheduleController::class,'availability']);

        Route::prefix('contracts')->group(function (): void {
            Route::get('shared/{token}',[ContractController::class,'sharedInfo']);
            Route::post('shared/{token}/access',[ContractController::class,'sharedAccess'])->middleware('throttle:20,1');
            Route::patch('shared/{token}',[ContractController::class,'sharedUpdate'])->middleware('throttle:30,1');
            Route::middleware('auth.session')->group(function (): void {
                Route::post('draft',[ContractController::class,'createDraft']);
                Route::post('{id}/shares',[ContractController::class,'createShare'])->whereNumber('id');
                Route::delete('{id}/shares/{shareId}',[ContractController::class,'revokeShare'])->whereNumber(['id','shareId']);
                Route::get('my',[ContractController::class,'my']);
                Route::get('{id}/pdf',[ContractController::class,'pdf'])->whereNumber('id');
                Route::get('{id}/documents',[ContractController::class,'documents'])->whereNumber('id');
                Route::get('{id}/documents/{documentId}/download',[ContractController::class,'downloadDocument'])->whereNumber(['id','documentId']);
                Route::get('{id}',[ContractController::class,'show'])->whereNumber('id');
                Route::patch('{id}/draft',[ContractController::class,'updateDraft'])->whereNumber('id');
                Route::post('{id}/submit',[ContractController::class,'submit'])->whereNumber('id');
                Route::post('{id}/revision-request',[ContractController::class,'revisionRequest'])->whereNumber('id');
                Route::post('{id}/finalize',[ContractController::class,'finalize'])->whereNumber('id');
            });
        });

        Route::prefix('service-requests')->middleware('auth.session')->group(function (): void {
            Route::post('',[ServiceRequestController::class,'create']);
            Route::get('my',[ServiceRequestController::class,'my']);
            Route::get('{id}',[ServiceRequestController::class,'show'])->whereNumber('id');
            Route::post('{id}/attachments',[ServiceRequestController::class,'appendAttachments'])->whereNumber('id');
            Route::post('{id}/revision-request',[ServiceRequestController::class,'requestRevision'])->whereNumber('id');
            Route::post('{id}/confirm-receipt',[ServiceRequestController::class,'confirmReceipt'])->whereNumber('id');
        });

        Route::prefix('payments')->middleware('auth.session')->group(function (): void {
            Route::post('receipts',[PaymentController::class,'createReceipt']);
            Route::get('my',[PaymentController::class,'my']);
        });
        Route::prefix('attachments')->middleware('auth.session')->group(function (): void {
            Route::post('',[AttachmentController::class,'upload']);
            Route::get('{id}',[AttachmentController::class,'show'])->whereNumber('id');
            Route::post('{id}/link',[AttachmentController::class,'link'])->whereNumber('id');
            Route::delete('{id}',[AttachmentController::class,'delete'])->whereNumber('id');
            Route::get('{id}/thumbnail',[AttachmentController::class,'thumbnail'])->whereNumber('id');
            Route::get('{id}/download',[AttachmentController::class,'download'])->whereNumber('id');
        });
        Route::prefix('users')->middleware('auth.session')->group(function (): void {
            Route::get('profile',[UserController::class,'profile']);
            Route::patch('profile',[UserController::class,'updateProfile']);
        });
        Route::prefix('notifications')->middleware('auth.session')->group(function (): void {
            Route::get('',[NotificationController::class,'index']);
            Route::patch('read-all',[NotificationController::class,'readAll']);
            Route::patch('{id}/read',[NotificationController::class,'read'])->whereNumber('id');
        });
        Route::prefix('dashboard')->middleware(['auth.session','permission:dashboard.view'])->group(function (): void {
            Route::get('summary',[DashboardController::class,'summary']);
            Route::get('work-queue',[DashboardController::class,'workQueue']);
        });

        Route::prefix('admin')->middleware('auth.session')->group(function (): void {
            Route::prefix('contracts')->middleware('permission:contracts.view_all,contracts.view_assigned')->group(function (): void {
                Route::get('',[ContractController::class,'adminIndex']);
                Route::get('summary',[ContractController::class,'adminSummary']);
                Route::post('{id}/assign',[ContractController::class,'assign'])->whereNumber('id')->middleware('permission:contracts.assign');
                Route::post('{id}/status',[ContractController::class,'status'])->whereNumber('id')->middleware('permission:contracts.manage_status');
                Route::post('{id}/payment-waiver',[ContractController::class,'paymentWaiver'])->whereNumber('id')->middleware('permission:contracts.waive_payment');
                Route::post('{id}/versions',[ContractController::class,'createVersion'])->whereNumber('id')->middleware('permission:contracts.edit_legal');
                Route::patch('{id}/versions/{versionId}',[ContractController::class,'updateVersion'])->whereNumber(['id','versionId'])->middleware('permission:contracts.edit_legal');
                Route::post('{id}/lock',[ContractController::class,'lock'])->whereNumber('id')->middleware('permission:contracts.lock');
                Route::post('{id}/issue',[ContractController::class,'issue'])->whereNumber('id')->middleware('permission:contracts.issue');
            });
            Route::prefix('service-requests')->middleware('permission:requests.view_all,requests.view_assigned')->group(function (): void {
                Route::get('',[ServiceRequestController::class,'adminIndex']);
                Route::post('{id}/assign',[ServiceRequestController::class,'assign'])->whereNumber('id')->middleware('permission:requests.assign');
                Route::post('{id}/status',[ServiceRequestController::class,'status'])->whereNumber('id')->middleware('permission:requests.manage');
                Route::get('{id}/availability',[ServiceRequestController::class,'adminAvailability'])->whereNumber('id')->middleware('permission:consultations.manage');
                Route::post('{id}/meeting',[ServiceRequestController::class,'meeting'])->whereNumber('id')->middleware('permission:consultations.manage');
                Route::post('{id}/client-update',[ServiceRequestController::class,'clientUpdate'])->whereNumber('id')->middleware('permission:requests.manage');
                Route::post('{id}/deliverables',[ServiceRequestController::class,'deliverable'])->whereNumber('id')->middleware('permission:requests.manage');
                Route::post('{id}/link-contract',[ServiceRequestController::class,'linkContract'])->whereNumber('id')->middleware('permission:requests.manage');
            });
            Route::prefix('payments')->middleware('permission:payments.review')->group(function (): void {
                Route::get('',[PaymentController::class,'adminIndex']);
                Route::post('{id}/approve',[PaymentController::class,'approve'])->whereNumber('id');
                Route::post('{id}/reject',[PaymentController::class,'reject'])->whereNumber('id');
                Route::post('{id}/clarification',[PaymentController::class,'requestClarification'])->whereNumber('id');
                Route::post('manual',[PaymentController::class,'recordManual']);
            });
            Route::prefix('users')->middleware('permission:clients.view')->group(function (): void {
                Route::get('',[UserController::class,'adminIndex']);
                Route::get('{id}',[UserController::class,'adminShow'])->whereNumber('id');
                Route::patch('{id}/status',[UserController::class,'adminStatus'])->whereNumber('id')->middleware('permission:clients.manage');
            });
            Route::get('audit',[AuditController::class,'index'])->middleware('permission:audit.view');
            Route::get('audit/verify',[AuditController::class,'verify'])->middleware('permission:audit.view');
            Route::prefix('settings')->middleware('permission:settings.manage')->group(function (): void {
                Route::get('',[SettingsController::class,'index']);
                Route::patch('',[SettingsController::class,'update']);
            });
            Route::prefix('consultation-schedule')->middleware('permission:settings.manage')->group(function (): void {
                Route::get('',[ConsultationScheduleController::class,'adminIndex']);
                Route::put('',[ConsultationScheduleController::class,'updateWindows']);
                Route::post('exceptions',[ConsultationScheduleController::class,'addException']);
                Route::delete('exceptions/{id}',[ConsultationScheduleController::class,'deleteException'])->whereNumber('id');
            });
            Route::prefix('reports')->middleware('permission:reports.view')->group(function (): void {
                Route::get('overview',[ReportController::class,'overview']);
                Route::get('customer-export',[ReportController::class,'customerExport'])->middleware('permission:clients.view');
            });

            // Retained compatibility endpoints for currently hidden capabilities.
            Route::prefix('team')->group(function (): void {
                Route::get('assignable-lawyers',FeatureDisabledController::class);
                Route::get('',FeatureDisabledController::class);
                Route::get('roles',FeatureDisabledController::class);
                Route::post('invite',FeatureDisabledController::class);
                Route::patch('{id}/roles',FeatureDisabledController::class)->whereNumber('id');
                Route::patch('{id}/status',FeatureDisabledController::class)->whereNumber('id');
            });
            Route::prefix('templates')->group(function (): void {
                Route::get('',[TemplateController::class,'adminIndex'])->middleware('permission:templates.view,pricing.manage');
                Route::patch('{templateId}',[TemplateController::class,'adminUpdate'])->whereNumber('templateId')->middleware('permission:pricing.manage');
                Route::post('',FeatureDisabledController::class);
                Route::get('versions/{versionId}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::post('{templateId}/versions',FeatureDisabledController::class)->whereNumber('templateId');
                Route::get('versions/{versionId}/validation',FeatureDisabledController::class)->whereNumber('versionId');
                Route::post('versions/{versionId}/variants',FeatureDisabledController::class)->whereNumber('versionId');
                Route::patch('versions/{versionId}/variants/{variantKey}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::delete('versions/{versionId}/variants/{variantKey}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::post('versions/{versionId}/variants/{variantKey}/steps',FeatureDisabledController::class)->whereNumber('versionId');
                Route::patch('versions/{versionId}/variants/{variantKey}/steps/{stepKey}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::delete('versions/{versionId}/variants/{variantKey}/steps/{stepKey}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::post('versions/{versionId}/optional-clauses',FeatureDisabledController::class)->whereNumber('versionId');
                Route::patch('versions/{versionId}/optional-clauses/{optionalKey}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::delete('versions/{versionId}/optional-clauses/{optionalKey}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::patch('versions/{versionId}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::post('versions/{versionId}/fields',FeatureDisabledController::class)->whereNumber('versionId');
                Route::patch('versions/{versionId}/fields/{fieldKey}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::delete('versions/{versionId}/fields/{fieldKey}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::post('versions/{versionId}/clauses',FeatureDisabledController::class)->whereNumber('versionId');
                Route::patch('versions/{versionId}/clauses/{clauseKey}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::delete('versions/{versionId}/clauses/{clauseKey}',FeatureDisabledController::class)->whereNumber('versionId');
                Route::post('versions/{versionId}/submit-review',FeatureDisabledController::class)->whereNumber('versionId');
                Route::post('versions/{versionId}/return-draft',FeatureDisabledController::class)->whereNumber('versionId');
                Route::post('versions/{versionId}/preview',FeatureDisabledController::class)->whereNumber('versionId');
                Route::post('versions/{versionId}/publish',FeatureDisabledController::class)->whereNumber('versionId');
            });
        });
    });
};

$register('v1');
