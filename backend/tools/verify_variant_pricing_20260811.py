from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[2]
checks=[]
def check(name, ok, note=''):
    checks.append((name,bool(ok),note))
    print(('PASS' if ok else 'FAIL'),name,note)

def txt(rel): return (ROOT/rel).read_text(encoding='utf-8')
expected={
'rental':{'residential_lease','commercial_lease','administrative_lease'},
'apartment_sale':{'preliminary_sale','registrable_sale','inherited_sale'},
'freelancer':{'visual_identity_design','website_development','social_media_management'},
}
count=0
for slug,keys in expected.items():
    d=json.loads(txt(f'backend/database/template-definitions/{slug}.json'))
    variants={str(v.get('key')) for v in d.get('variants',[])}
    pricing=set((d.get('variantPricing') or {}).keys())
    count += len(pricing)*2
    check(f'{slug}_three_variants',variants==keys,str(sorted(variants)))
    check(f'{slug}_pricing_matches_variants',pricing==keys,str(sorted(pricing)))
    check(f'{slug}_family_price_disabled',float(d.get('priceEgp',-1))==0)
service=txt('backend/app/Services/ContractPricingService.php')
contracts=txt('backend/app/Http/Controllers/ContractController.php')
requests=txt('backend/app/Http/Controllers/ServiceRequestController.php')
catalog=txt('backend/app/Http/Controllers/CatalogController.php')
routes=txt('backend/routes/api.php')
dashboard=txt('dashboard/src/app/(dashboard)/pricing/page.tsx')
migration=txt('backend/database/migrations/2026_08_11_000700_variant_level_contract_pricing.php')
check('exact_18_default_price_slots',count==18,str(count))
check('no_family_fallback_service','familyFallback' not in service and '??0' in service)
check('self_uses_variant_price','selfPrice($slug,$variantKey,$definition)' in contracts and 'SELF_SERVICE_PRICE_NOT_CONFIGURED' in contracts)
check('lawyer_uses_variant_price','lawyerPrice($slug,$variantKey,$definition)' in requests and 'LAWYER_PRICE_NOT_CONFIGURED' in requests)
check('direct_lawyer_contract_bypass_blocked','LAWYER_ASSISTED_REQUIRES_SERVICE_REQUEST' in contracts)
check('office_billing_uses_lawyer_variant_price',"$this->pricing->lawyerPrice($slug,$variantKey,$definition)" in contracts and "billing==='client_invoice'" in contracts)
check('catalog_exposes_variant_prices',"'selfServicePriceEgp'" in catalog and "'lawyerAssistedPriceEgp'" in catalog and "'priceEgp'=>0.0" in catalog)
check('pricing_patch_requires_permission',"middleware('permission:pricing.manage')" in routes)
check('dashboard_declares_18_prices','9 عقود فرعية × مسارين = 18 سعرًا مستقلًا' in dashboard and 'variantPrices' in dashboard)
check('migration_materializes_variant_keys','pricing.contracts.self_service.' in migration and 'pricing.contracts.lawyer_assisted.' in migration and 'ON CONFLICT (setting_key) DO NOTHING' in migration)
failed=[name for name,ok,_ in checks if not ok]
print(f'VARIANT PRICING CHECKS {len(checks)-len(failed)}/{len(checks)}')
if failed:
    print('FAILED:',', '.join(failed));sys.exit(1)
