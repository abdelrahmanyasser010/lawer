#!/usr/bin/env python3
from __future__ import annotations
import json,re,sys
from pathlib import Path

BACKEND=Path(__file__).resolve().parents[1]
ROOT=BACKEND.parent
checks=[]
def add(key,passed,details): checks.append({'key':key,'passed':bool(passed),'details':details})
def text(rel): return (ROOT/rel).read_text('utf-8')

auth=text('backend/app/Http/Controllers/AuthController.php')
user=text('backend/app/Http/Controllers/UserController.php')
contract=text('backend/app/Http/Controllers/ContractController.php')
service=text('backend/app/Http/Controllers/ServiceRequestController.php')
notice=text('backend/app/Http/Controllers/NotificationController.php')
audit=text('backend/app/Http/Controllers/AuditController.php')
account=text('frontend/src/app/account/page.tsx')
dash_notice=text('dashboard/src/app/(dashboard)/notifications/page.tsx')
smoke=text('backend/tests/Feature/DatabaseWorkflowSmokeTest.php')
routes=text('backend/routes/api.php')
security=text('backend/app/Http/Middleware/SecurityHeaders.php')
bootstrap=text('backend/bootstrap/app.php')
health_test=text('backend/tests/Feature/HealthEndpointTest.php')

# Sessions are intentionally a direct data array and both clients consume that exact envelope payload.
add('auth_sessions_array_shape',
    'return $this->ok($request, $rows);' in auth
    and 'apiRequest<SessionItem[]>("/api/v1/auth/sessions")' in account
    and 'setSessions(loadedSessions);' in account,
    {'backend':'direct data array','frontend':'SessionItem[]'})

# Profile path and fields must match the actual route/controller.
profile_fields=['publicId','whatsappNumber','accountType','companyName','emailVerifiedAt','createdAt']
add('profile_route_and_shape',
    "Route::get('profile',[UserController::class,'profile'])" in routes
    and "/api/v1/users/profile" in smoke
    and all(f'AS "{field}"' in user for field in profile_fields if field not in {'createdAt'})
    and 'created_at AS "createdAt"' in user,
    {'requiredFields':profile_fields})

# Contract details are intentionally DB-style snake_case at top level; smoke test locks that contract.
add('contract_detail_snake_case',
    "$payload=$this->objectArray($c);" in contract
    and "assertJsonPath('data.template_slug', 'rental')" in smoke
    and "assertJsonPath('data.templateSlug', 'rental')" not in smoke,
    {'field':'template_slug'})

# JSONB aliases returned by raw PDO queries must be decoded before JSON serialization.
add('service_event_payload_decoded',
    '$event->payload = $this->json($event->payload);' in service,
    {'field':'events[].payload'})
add('notification_payload_decoded',
    'json_decode($item->payload, true)' in notice and '$item->payload = is_array($decoded) ? $decoded : [];' in notice,
    {'field':'items[].payload'})
add('audit_payloads_decoded',
    '$row->oldValues = $this->decodeJson($row->oldValues);' in audit
    and '$row->newValues = $this->decodeJson($row->newValues);' in audit,
    {'fields':['oldValues','newValues']})

# Empty notification inbox must settle to the empty-state instead of infinite loading.
add('dashboard_notifications_empty_state',
    '[loading,setLoading]=useState(true)' in dash_notice
    and 'finally{setLoading(false);}' in dash_notice
    and 'if(loading&&!items.length)' in dash_notice
    and 'items.length===0' in dash_notice,
    {'loadingState':'explicit'})



add('cors_headers_on_success_errors_and_preflight',
    'public static function decorate' in security
    and 'SecurityHeaders::decorate($request, response()->json' in bootstrap
    and ("Route::options('/{any}'" in routes or ("Route::any('/{any}'" in routes and "isMethod('OPTIONS')" in routes))
    and 'test_preflight_and_error_responses_keep_cors_headers' in health_test,
    {'coverage':['success','error','preflight']})

add('dashboard_requires_staff_permission',
    "Route::prefix('dashboard')->middleware(['auth.session','permission:dashboard.view'])" in routes
    and "/api/v1/dashboard/summary" in smoke
    and "assertJsonPath('code', 'FORBIDDEN')" in smoke,
    {'permission':'dashboard.view'})

# Runtime smoke suite must cover auth session/profile and contract/share flows.
required_smoke=[
    "/api/v1/auth/sessions",
    "/api/v1/users/profile",
    "/api/v1/contracts/draft",
    "/api/v1/contracts/my",
    "/api/v1/contracts/shared/",
    "/api/v1/service-requests",
    "/api/v1/payments/receipts",
    "/api/v1/payments/my",
    "/api/v1/notifications",
    "/api/v1/admin/reports/overview?period=month",
    "/api/v1/admin/reports/customer-export?period=month",
]
add('database_smoke_contract_coverage', all(x in smoke for x in required_smoke), {'required':required_smoke})

failed=[c for c in checks if not c['passed']]
result={'version':'V20','status':'pass' if not failed else 'fail','passed':len(checks)-len(failed),'total':len(checks),'checks':checks}
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(0 if not failed else 1)
