from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[1]
checks=[]
def check(key, cond, details=''):
    checks.append({'key':key,'passed':bool(cond),'details':details})

def txt(rel): return (ROOT/rel).read_text(encoding='utf-8')

card=txt('frontend/src/components/home/LegalConsultationCard.tsx')
hook=txt('frontend/src/hooks/usePublicCatalog.ts')
demo=txt('frontend/src/lib/demoApi.ts')
declaration=txt('frontend/src/app/declaration/page.tsx')
settings=txt('dashboard/src/app/(dashboard)/settings/page.tsx')
board=txt('dashboard/src/components/admin/ServiceRequestsBoard.tsx')
work=txt('dashboard/src/app/(dashboard)/work/[id]/page.tsx')
controller=txt('backend/app/Http/Controllers/ServiceRequestController.php')
catalog=txt('backend/app/Http/Controllers/CatalogController.php')
settings_ctrl=txt('backend/app/Http/Controllers/SettingsController.php')
migration=(ROOT/'backend/database/migrations/2026_08_07_000300_hide_office_consultation_channel.php').exists()

check('customer_consultation_office_hidden', 'key: "office"' not in card and 'label: "في المكتب"' not in card)
check('customer_consultation_zoom_visible', '{ key: "zoom"' in card)
check('customer_consultation_whatsapp_visible', '{ key: "whatsapp"' in card)
check('catalog_default_excludes_office', 'communicationChannels: ["zoom", "whatsapp"]' in hook)
check('demo_default_excludes_office', 'communicationChannels: ["zoom", "whatsapp"]' in demo)
check('declaration_excludes_office_consultation', 'في المكتب أو عبر Zoom' not in declaration and 'عبر Zoom أو WhatsApp' in declaration)
check('dashboard_settings_office_hidden', '["office", "مقابلة بالمكتب"]' not in settings and '["zoom", "Zoom"]' in settings and '["whatsapp", "واتساب"]' in settings)
check('dashboard_board_office_hidden', 'zoom / office / whatsapp' not in board and '["zoom","whatsapp"]' in board)
check('dashboard_work_office_hidden', '<option value="office">' not in work and 'meetingLocation" placeholder="عنوان أو تفاصيل الموعد بالمكتب' not in work)
check('backend_new_request_blocks_office', "'communicationChannel'=>['nullable','in:zoom,whatsapp']" in controller and "'meetingPreference'=>['nullable','in:zoom,whatsapp']" in controller)
check('backend_new_meeting_blocks_office', "'provider'=>['required','in:zoom,whatsapp']" in controller)
check('backend_catalog_filters_office', "array_intersect((array) $get('customer_portal.communication_channels',['zoom','whatsapp']), ['zoom','whatsapp'])" in catalog)
check('backend_settings_filters_office', "array_intersect($v,['zoom','whatsapp'])" in settings_ctrl)
check('migration_normalizes_existing_setting', migration)

result={'version':'V25','status':'passed' if all(c['passed'] for c in checks) else 'failed','passed':sum(c['passed'] for c in checks),'total':len(checks),'checks':checks}
print(json.dumps(result,ensure_ascii=False,indent=2))
if result['status']!='passed': raise SystemExit(1)
