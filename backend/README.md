# Z draft Laravel Backend

هذا هو الباك إند الوحيد للمنصة. يوفر `/api/v1` لواجهة العميل ولوحة التحكم، ويستخدم PostgreSQL للتخزين الدائم.

## المتطلبات

- PHP 8.4 أو أحدث
- Composer 2
- PostgreSQL 15 أو أحدث
- `pdo_pgsql`, `mbstring`, `openssl`, `fileinfo`, `imagick`, `xml`, `curl`, `zip`, `intl`, `bcmath`
- WeasyPrint
- Nginx + PHP-FPM
- Gmail App Password أو مزود SMTP

## تشغيل محلي

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

لتشغيل الأعمال الخلفية محليًا:

```bash
php artisan schedule:work
```

إعداد الواجهات:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_TEMPLATE_SOURCE=api
NEXT_PUBLIC_DRAFT_SOURCE=api-only
```

## الاختبارات

```bash
php artisan test
python3 tools/verify_route_compatibility.py
node tools/verify_frontend_api_contract.mjs
python3 tools/verify_response_contracts_v20.py
python3 tools/verify_sql_placeholders.py
python3 tools/verify_laravel_final_v20.py
```

اختبار PostgreSQL المتكامل لا يعمل افتراضيًا حتى لا يحذف بيانات بالخطأ. استخدم قاعدة اختبار منفصلة:

```bash
RUN_DATABASE_TESTS=true php artisan test --filter DatabaseWorkflowSmokeTest
RUN_DATABASE_TESTS=true php artisan test --filter AttachmentImagePipelineSmokeTest
```

## وضع السوبر أدمن الواحد

إدارة الفريق والإسناد وإنشاء/تحرير العقود من المكتب ومحرر القوالب محفوظة خلف `FEATURE_*` ومغلقة افتراضيًا.

## ملفات قديمة

لا يوجد مجلد Express/Node في هذه النسخة. ملفات `database/legacy-sql` هي تاريخ Schema فقط وتظل مطلوبة لتشغيل Migrations على قواعد جديدة أو قديمة.

## تثبيت الواجهات

ملف `package-lock.json` القديم لم يكن صالحًا وحُذف. على Staging متصل بسجل npm طبيعي نفذ `npm install` من جذر المشروع، راجع الملف الناتج وثبّته، ثم استخدم `npm ci` في النشرات التالية.

## فحص الإنتاج

بعد ضبط `.env` وتشغيل migrations والـseed:

```bash
php artisan zdraft:doctor --json
```

يجب أن تكون `ready=true` و`blockers=0` قبل فتح المنصة لعملاء حقيقيين.
