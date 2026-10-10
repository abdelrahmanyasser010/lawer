<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE service_request_deliverables ALTER COLUMN attachment_id DROP NOT NULL');
    }

    public function down(): void
    {
        $hasTextOnly = DB::table('service_request_deliverables')->whereNull('attachment_id')->exists();
        if (!$hasTextOnly) {
            DB::statement('ALTER TABLE service_request_deliverables ALTER COLUMN attachment_id SET NOT NULL');
        }
    }
};
