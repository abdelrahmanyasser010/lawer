<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE IF NOT EXISTS legal_contents (
    content_key VARCHAR(80) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    draft_body TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    current_published_version INT,
    published_at TIMESTAMPTZ,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
)
SQL);
        DB::statement(<<<'SQL'
CREATE TABLE IF NOT EXISTS legal_content_versions (
    id BIGSERIAL PRIMARY KEY,
    content_key VARCHAR(80) NOT NULL REFERENCES legal_contents(content_key) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    published_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_legal_content_version UNIQUE (content_key, version_number)
)
SQL);
        DB::statement(<<<'SQL'
CREATE TABLE IF NOT EXISTS legal_acceptances (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    legal_content_version_id BIGINT NOT NULL REFERENCES legal_content_versions(id) ON DELETE RESTRICT,
    document_type VARCHAR(80) NOT NULL,
    published_version INT NOT NULL,
    context VARCHAR(30) NOT NULL,
    ip_address VARCHAR(64),
    user_agent TEXT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_legal_acceptance_context CHECK (context IN ('registration','checkout')),
    CONSTRAINT uq_legal_acceptance UNIQUE (user_id, document_type, published_version, context)
)
SQL);
        DB::statement('CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON legal_acceptances(user_id, accepted_at DESC)');

        $defaults = [
            'about_us' => ['من نحن', 'Z Draft منصة تساعد الأفراد والشركات على إعداد ومتابعة معاملاتهم التعاقدية بصورة أوضح، مع إمكانية الاستعانة بمحامٍ عند الحاجة.'],
            'terms_and_conditions' => ['الشروط والأحكام', 'باستخدام المنصة أنت تقر بصحة البيانات التي تقدمها وتفهم نطاق الخدمة المختارة. تفاصيل كل خدمة وسعرها تظهر لك قبل الدفع.'],
            'privacy_policy' => ['سياسة الخصوصية', 'نستخدم بياناتك لتقديم الخدمة وإدارة العقود والطلبات المرتبطة بحسابك، مع تطبيق صلاحيات وصول مناسبة للملفات والطلبات.'],
            'refund_cancellation_policy' => ['سياسة الإلغاء والاسترداد', 'يمكن إلغاء الطلب غير المدفوع. بعد الدفع، يتم التعامل مع الإلغاء والاسترداد وفق حالة تنفيذ الخدمة والسياسة المنشورة وقت الدفع.'],
        ];
        foreach ($defaults as $key => [$title, $body]) {
            DB::statement('INSERT INTO legal_contents(content_key,title,draft_body,is_published,current_published_version,published_at) VALUES (?,?,?,TRUE,1,CURRENT_TIMESTAMP) ON CONFLICT (content_key) DO NOTHING', [$key,$title,$body]);
            DB::statement('INSERT INTO legal_content_versions(content_key,version_number,title,body) VALUES (?,1,?,?) ON CONFLICT (content_key,version_number) DO NOTHING', [$key,$title,$body]);
        }
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS legal_acceptances');
        DB::statement('DROP TABLE IF EXISTS legal_content_versions');
        DB::statement('DROP TABLE IF EXISTS legal_contents');
    }
};
