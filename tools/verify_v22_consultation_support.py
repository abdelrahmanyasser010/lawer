#!/usr/bin/env python3
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(key, ok, details=''):
    checks.append({'key':key,'passed':bool(ok),'details':details})

def text(path): return (ROOT/path).read_text(encoding='utf-8')
nav=text('frontend/src/components/layout/Navbar.tsx')
home=text('frontend/src/app/page.tsx')
consult=text('frontend/src/components/home/LegalConsultationCard.tsx')
layout=text('frontend/src/app/layout.tsx')
settings=text('dashboard/src/app/(dashboard)/settings/page.tsx')
catalog=text('backend/app/Http/Controllers/CatalogController.php')
controller=text('backend/app/Http/Controllers/ServiceRequestController.php')
payment=text('backend/app/Http/Controllers/PaymentController.php')
req=text('frontend/src/app/requests/[id]/page.tsx')

check('navbar_consultation_label','استشارة قانونية' in nav and 'خدمات المحامي' not in nav)
check('navbar_logged_in_requests_label','استشاراتي' in nav)
check('contract_cards_direct_to_wizard','CreationModeModal' not in home and '/wizard/${encodeURIComponent(template.slug)}?mode=self_service' in home)
check('old_creation_mode_component_removed',not (ROOT/'frontend/src/components/home/CreationModeModal.tsx').exists())
check('single_consultation_client_flow','requestType: "consultation"' in consult and '<select' not in consult)
check('consultation_price_visible','سعر الاستشارة' in consult and 'consultationFeeEgp' in consult)
check('preferred_day_period_ui','type="date"' in consult and 'الفترة المناسبة' in consult and 'preferredPeriodLabel' in consult)
check('support_widget_installed','FloatingSupportButton' in layout and (ROOT/'frontend/src/components/support/FloatingSupportButton.tsx').exists())
support=text('frontend/src/components/support/FloatingSupportButton.tsx')
check('support_widget_authenticated_only','!user' in support and 'supportWhatsappNumber' in support and 'bottom-5 left-4' in support)
check('dashboard_contact_settings',all(k in settings for k in ['office.consultation_whatsapp_number','office.support_whatsapp_number','office.support_phone','payments.vodafone_cash_number','services.consultation.fee_egp']))
check('catalog_contact_mapping',all(k in catalog for k in ['consultationWhatsappNumber','supportWhatsappNumber','supportPhone','supportEmail','consultationFeeEgp']))
check('backend_public_service_only_consultation',"'requestType'=>['required','in:consultation']" in controller)
check('payment_validates_consultation_fee',"services.consultation.fee_egp" in payment)
check('request_page_uses_consultation_number','consultationWhatsappNumber' in req)
all_front='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in (ROOT/'frontend/src').rglob('*') if p.is_file() and p.suffix in {'.ts','.tsx'})
check('no_hardcoded_live_wa_number',not bool(re.search(r'https://wa\.me/\d',all_front)))
check('new_settings_migration',(ROOT/'backend/database/migrations/2026_08_07_000200_add_customer_contact_settings.php').exists())

# Local TS import resolution for @/ and relative imports.
missing=[]
for base in [ROOT/'frontend/src',ROOT/'dashboard/src']:
    for f in base.rglob('*'):
        if not f.is_file() or f.suffix not in {'.ts','.tsx'}: continue
        src=f.read_text(encoding='utf-8',errors='ignore')
        for spec in re.findall(r'(?:from\s+|import\s*\()\s*["\']([^"\']+)["\']',src):
            if spec.startswith('@/'):
                target=base/spec[2:]
            elif spec.startswith('.'):
                target=(f.parent/spec)
            else:
                continue
            candidates=[target,Path(str(target)+'.ts'),Path(str(target)+'.tsx'),target/'index.ts',target/'index.tsx']
            if not any(c.exists() for c in candidates): missing.append({'file':str(f.relative_to(ROOT)),'import':spec})
check('local_imports_resolve',not missing,missing[:30])

status='passed' if all(c['passed'] for c in checks) else 'failed'
result={'version':'V22','status':status,'passed':sum(c['passed'] for c in checks),'total':len(checks),'checks':checks}
print(json.dumps(result,ensure_ascii=False,indent=2))
(ROOT/'ZDraft_V22_CONSULTATION_SUPPORT_VERIFICATION.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
sys.exit(0 if status=='passed' else 1)
