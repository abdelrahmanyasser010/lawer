<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE dashboard_notifications ADD COLUMN IF NOT EXISTS importance VARCHAR(20) NOT NULL DEFAULT 'normal'");
        DB::statement("UPDATE dashboard_notifications SET importance='normal' WHERE importance IS NULL OR importance NOT IN ('normal','important')");
        DB::statement("ALTER TABLE dashboard_notifications DROP CONSTRAINT IF EXISTS chk_dashboard_notification_importance");
        DB::statement("ALTER TABLE dashboard_notifications ADD CONSTRAINT chk_dashboard_notification_importance CHECK (importance IN ('normal','important'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE dashboard_notifications DROP CONSTRAINT IF EXISTS chk_dashboard_notification_importance');
        DB::statement('ALTER TABLE dashboard_notifications DROP COLUMN IF EXISTS importance');
    }
};
