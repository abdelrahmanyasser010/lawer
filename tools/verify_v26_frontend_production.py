from pathlib import Path
import json,re,subprocess
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def add(key,ok,details=''):
    checks.append({'key':key,'passed':bool(ok),'details':details})

front_api=read('frontend/src/lib/apiClient.ts')
dash_api=read('dashboard/src/lib/apiClient.ts')
nav=read('frontend/src/components/layout/Navbar.tsx')
home=read('frontend/src/app/page.tsx')
pricing=read('frontend/src/app/pricing/page.tsx')
consult=read('frontend/src/components/home/LegalConsultationCard.tsx')
requests=read('frontend/src/app/requests/page.tsx')
wizard=read('frontend/src/features/contracts/wizard/ContractWizard.tsx')
store=read('frontend/src/store/wizardStore.ts')
footer=read('frontend/src/components/layout/Footer.tsx')
privacy=read('frontend/src/app/privacy/page.tsx')
forgot=read('frontend/src/app/forgot-password/page.tsx')
reset=read('frontend/src/app/reset-password/page.tsx')
verify=read('frontend/src/app/verify-email/page.tsx')
demo=read('frontend/src/lib/demoApi.ts')
payments=read('dashboard/src/app/(dashboard)/payments/page.tsx')
service=read('backend/app/Http/Controllers/ServiceRequestController.php')
catalog=read('backend/app/Http/Controllers/CatalogController.php')
auth=read('backend/app/Http/Controllers/AuthController.php')
sessions=read('backend/app/Services/SessionService.php')
sec_headers=read('backend/app/Http/Middleware/SecurityHeaders.php')
dbtest=read('backend/tests/Feature/DatabaseWorkflowSmokeTest.php')

def source_text(root):
    out=[]
    for p in (ROOT/root).rglob('*'):
        if p.is_file() and p.suffix in {'.ts','.tsx','.js','.mjs','.php'} and not any(x in p.parts for x in ('node_modules','.next','dist','vendor')):
            out.append(p.read_text(encoding='utf-8',errors='ignore'))
    return '\n'.join(out)

runtime=source_text('frontend/src')+'\n'+source_text('dashboard/src')
add('strict_api_no_localhost_runtime','localhost:8000' not in runtime and 'localhost:5000' not in runtime and 'API_NOT_CONFIGURED' in front_api and 'API_NOT_CONFIGURED' in dash_api)
add('csrf_cross_origin_bridge','CSRF_SESSION_KEY' in front_api and 'rememberCsrfToken' in front_api and 'CSRF_SESSION_KEY' in dash_api and 'rememberCsrfToken' in dash_api and "'csrfToken' => $csrfToken" in auth and 'array{0:Cookie,1:Cookie,2:string}' in sessions and "assertJsonPath('data.csrfToken'" in dbtest)
add('cors_extra_origins_supported','cors_extra_origins' in sec_headers and 'CORS_EXTRA_ORIGINS=' in read('backend/.env.example'))
add('demo_is_explicit_and_visible','demoMode' in nav and 'نسخة تجريبية' in nav)
add('home_production_has_no_fake_catalog','demoMode' in home and 'loadError' in home and 'freelancer' in home and 'apartment_sale' in home and 'rental' in home)
add('pricing_production_has_no_fake_values','demoMode' in pricing and 'loadError' in pricing and 'غير متاح مؤقتًا' in pricing)
add('consultation_is_single_service','requestType: "consultation"' in consult and 'نوع الخدمة' not in consult and 'استشارة قانونية' in consult)
add('consultation_only_zoom_whatsapp','key: "office"' not in consult and '{ key: "zoom"' in consult and '{ key: "whatsapp"' in consult and "'communicationChannel'=>['nullable','in:zoom,whatsapp']" in service)
add('consultation_prefills_profile_phone','profile' in consult and ('whatsappNumber' in consult or 'phone' in consult))
add('requests_label_consistent','استشاراتي' in requests and 'طلباتي' not in requests)
add('sensitive_drafts_session_ttl','sessionStorage' in store and 'DRAFT_SESSION_TTL_MS = 8 * 60 * 60 * 1000' in store and 'localStorage' not in store)
add('no_legacy_sensitive_hydration','hydrateLegacyDraft' not in store and 'zdraft-wizard-storage-v2' in wizard and 'removeItem' in wizard)
add('review_lifecycle_all_families',wizard.count('{renderReviewLifecycleAndShare()}')==3 and 'اعتماد الدفع' in wizard and 'PDF النهائي' in wizard)
add('declaration_all_families',wizard.count('{renderDeclarationConsent()}')==3 and '/declaration' in wizard)
add('no_native_frontend_alert_confirm','window.alert' not in runtime.split(source_text('dashboard/src'))[0] and 'window.confirm' not in runtime.split(source_text('dashboard/src'))[0])
add('floating_controls_do_not_overlap','fixed bottom-5 right-4' in wizard and 'fixed bottom-5 left-4' in read('frontend/src/components/support/FloatingSupportButton.tsx'))
add('privacy_page_and_footer',privacy.strip()!='' and '/privacy' in footer)
add('auth_secondary_pages_share_shell',all('AuthShell' in x for x in (forgot,reset,verify)))
add('demo_old_lawyer_assignment_removed','تم إسناد الطلب للمحامي' not in demo and 'إعداد عقد بيع مع محامي' not in demo)
add('dashboard_empty_payments_finishes_loading','const [loading' in payments and 'finally' in payments and 'setLoading(false)' in payments)
add('backend_catalog_single_source_contacts',all(k in catalog for k in ['consultationWhatsappNumber','supportWhatsappNumber','supportPhone','vodafoneCashNumber']))
add('backend_consultation_test_present','test_consultation_channels_catalog_and_office_rejection' in dbtest)
add('vps_deploy_scripts_present',all((ROOT/f'backend/deploy/{name}').exists() for name in ['install-ubuntu.sh','activate-production.sh','smoke-production.sh']))

# reject a few known stale customer-facing strings in frontend only
bad=[]
for needle in ['خدمات المحامي','اختر المكتب أو Zoom أو WhatsApp','استشارة واحدة — بدون قائمة أنواع','Parent Template']:
    for p in (ROOT/'frontend/src').rglob('*'):
        if p.is_file() and p.suffix in {'.ts','.tsx'} and needle in p.read_text(encoding='utf-8',errors='ignore'):
            bad.append({'text':needle,'file':str(p.relative_to(ROOT))})
add('stale_customer_copy_removed',not bad,bad)

# syntax for deploy scripts
scripts=[]
for name in ['install-ubuntu.sh','activate-production.sh','smoke-production.sh']:
    proc=subprocess.run(['bash','-n',str(ROOT/'backend/deploy'/name)],capture_output=True,text=True)
    scripts.append({'script':name,'ok':proc.returncode==0,'stderr':proc.stderr})
add('deploy_shell_syntax',all(x['ok'] for x in scripts),scripts)

result={'version':'V26','status':'passed' if all(c['passed'] for c in checks) else 'failed','passed':sum(c['passed'] for c in checks),'total':len(checks),'checks':checks}
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(0 if result['status']=='passed' else 1)
