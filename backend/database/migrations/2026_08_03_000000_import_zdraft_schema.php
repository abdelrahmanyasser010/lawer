<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up(): void
    {
        $files = [
            '001_schema.sql',
            '20260731_dashboard_production.sql',
            '20260801_backend_foundation.sql',
            '20260801_legal_pdf_engine.sql',
            '20260801_user_portal_workflow.sql',
            '20260803_dashboard_operations_v15.sql',
            '20260803_email_otp_and_dual_notifications.sql',
            '20260803_private_storage_hardening.sql',
            '20260803_upload_image_pipeline_v18.sql',
        ];
        foreach ($files as $file) {
            $path = database_path('legacy-sql/'.$file);
            if (!is_file($path)) throw new RuntimeException("Missing schema source: {$file}");
            DB::unprepared(file_get_contents($path));
        }
    }
    public function down(): void
    {
        throw new RuntimeException('Z draft production schema rollback is intentionally disabled. Restore from a verified backup instead.');
    }
};
