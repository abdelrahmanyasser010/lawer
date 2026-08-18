from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks=[]
def chk(name, ok):
    checks.append((name, bool(ok)))

hook=(root/'frontend/src/hooks/usePublicCatalog.ts').read_text()
card=(root/'frontend/src/components/home/LegalConsultationCard.tsx').read_text()
catalog=(root/'backend/app/Http/Controllers/CatalogController.php').read_text()
settings=(root/'dashboard/src/app/(dashboard)/settings/page.tsx').read_text()

chk('frontend wallet fallback is not hard-coded/env sourced', 'NEXT_PUBLIC_VODAFONE_CASH_NUMBER' not in hook and 'vodafoneCashNumber: ""' in hook)
chk('catalog exposes loadError', 'loadError' in hook)
chk('wallet comes from backend catalog field', 'catalog.payment.vodafoneCashNumber' in card)
chk('no ambiguous غير محدد بعد', 'غير محدد بعد' not in card)
chk('loading state shown', 'جاري تحميل بيانات الدفع' in card)
chk('backend catalog includes wallet setting', "payments.vodafone_cash_number" in catalog and 'vodafoneCashNumber' in catalog)
chk('dashboard controls wallet setting', 'payments.vodafone_cash_number' in settings and 'رقم Vodafone Cash' in settings)
chk('receipt disabled without backend wallet', 'disabled={catalogLoading || !cashNumber}' in card)
chk('submit disabled while catalog loads', 'catalogLoading || catalogLoadError || (consultationFee > 0 && !cashNumber)' in card)

bad=[n for n,o in checks if not o]
print(f"V24 wallet/catalog checks: {len(checks)-len(bad)}/{len(checks)}")
for n,o in checks: print(('PASS' if o else 'FAIL'), n)
raise SystemExit(1 if bad else 0)
