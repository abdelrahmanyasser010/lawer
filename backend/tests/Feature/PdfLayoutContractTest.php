<?php
namespace Tests\Feature;

use Tests\TestCase;

final class PdfLayoutContractTest extends TestCase
{
    public function test_final_pdf_layout_has_running_identity_page_count_and_compact_legal_structure(): void
    {
        $blade=file_get_contents(resource_path('views/pdf/contract.blade.php'));
        $this->assertIsString($blade);
        $this->assertStringContainsString('counter(pages)', $blade);
        $this->assertStringContainsString('string(docSerial)', $blade);
        $this->assertStringContainsString('string(docTitle)', $blade);
        $this->assertStringContainsString('البصمة (إن وجدت)', $blade);
        $this->assertStringContainsString('الطرف الأول', $blade);
        $this->assertStringContainsString('الطرف الثاني', $blade);
        $this->assertStringContainsString('font-family: "Noto Sans Arabic"', $blade);
        $this->assertStringContainsString('font-size:11.35pt', $blade);
        $this->assertStringContainsString('font-size:17.5pt', $blade);
        $this->assertStringContainsString('line-height:1.44', $blade);
        $this->assertStringNotContainsString('Noto Naskh Arabic', $blade);
        $this->assertStringNotContainsString('منصة Z draft للعقود والاستشارات الذكية', $blade);
        $this->assertStringNotContainsString('background:#f1f1f1', $blade);
    }

    public function test_pdf_source_normalizer_removes_source_form_chrome_before_snapshot_hashing(): void
    {
        $service=file_get_contents(app_path('Services/TemplateEngineService.php'));
        $this->assertIsString($service);
        $this->assertStringContainsString('normalizeLegalSourceText', $service);
        $this->assertStringContainsString('Z\\s*DRAFT', $service);
        $this->assertStringContainsString('trimTrailingSignatureForm', $service);
        $this->assertStringContainsString('البيان المعتمد في صدر العقد', $service);
    }

    public function test_pdf_data_values_use_customer_facing_dates_and_never_raw_enums(): void
    {
        $worker=file_get_contents(app_path('Console/Commands/ProcessDocumentJobs.php'));
        $this->assertIsString($worker);
        $this->assertStringContainsString("preg_match('/^\\d{4}-\\d{2}-\\d{2}$/',\$raw)", $worker);
        $this->assertStringContainsString('قيمة غير معتمدة — يرجى إعادة الاختيار', $worker);
    }
    public function test_numbered_arabic_clause_lines_are_bidi_isolated_in_pdf_and_live_preview(): void
    {
        $blade=file_get_contents(resource_path('views/pdf/contract.blade.php'));
        $preview=file_get_contents(base_path('../frontend/src/components/contract/LegalDocumentSheet.tsx'));
        $this->assertIsString($blade);
        $this->assertIsString($preview);
        $this->assertStringContainsString('.clause-number { direction:ltr; unicode-bidi:isolate;', $blade);
        $this->assertStringContainsString('<span class="clause-number" dir="ltr">', $blade);
        $this->assertStringContainsString('[unicode-bidi:isolate]', $preview);
        $this->assertStringContainsString('<bdi dir="ltr"', $preview);
    }

}
