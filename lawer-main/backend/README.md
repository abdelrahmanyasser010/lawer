# Z draft Laravel Backend

هذا هو الباك إند الوحيد للمنصة. يوفر `/api/v1` لواجهة العميل ولوحة التحكم، ويستخدم PostgreSQL للتخزين الدائم.

## المتطلبات

- PHP 8.4+
- Composer 2
- PostgreSQL 15+
- `pdo_pgsql`, `mbstring`, `openssl`, `fileinfo`, `imagick`, `xml`, `curl`, `zip`, `intl`, `bcmath`
- WeasyPrint
- Nginx + PHP-FPM
- Gmail App Password أو SMTP متوافق

## تشغيل محلي

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

وفي نافذة أخرى:

```bash
php artisan schedule:work
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

اختبارات قاعدة البيانات والصور يجب تشغيلها على PostgreSQL اختبار منفصلة فقط:

```bash
DB_DATABASE=zdraft_test php artisan migrate --seed --force
DB_DATABASE=zdraft_test RUN_DATABASE_TESTS=true php artisan test
```

## Production

السكربتات الجاهزة:

```bash
sudo APP_DIR=/var/www/zdraft/backend bash deploy/install-ubuntu.sh
sudo API_DOMAIN=api.example.com APP_DIR=/var/www/zdraft/backend bash deploy/activate-production.sh
BASE_URL=https://api.example.com bash deploy/smoke-production.sh
```

V27 يعيد `csrfToken` مع تسجيل الدخول/التسجيل و`/auth/me` لدعم الواجهة على Origin مختلف، مع بقاء CSRF cookie للتحقق المزدوج. اضبط `FRONTEND_URL` و`DASHBOARD_URL` بدقة، ويمكن إضافة Origins مؤقتة في `CORS_EXTRA_ORIGINS`.

`Laravel Scheduler` هو المسؤول عن البريد وPDF والقفل التلقائي والتنظيف والـBackup. ميزات الفريق والإسناد وإنشاء/تحرير العقود من المكتب ومحرر القوالب محفوظة خلف `FEATURE_*` ومقفولة افتراضيًا لوضع السوبر أدمن الواحد.

راجع `../LARAVEL_PRODUCTION_SETUP_AR.md` قبل Go-live.
