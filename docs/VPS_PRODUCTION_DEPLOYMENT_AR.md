# نشر Z draft على VPS

هذا المسار هو الاختيار المناسب للنسخة القوية من المشروع:

```text
Nginx
PHP-FPM + Laravel API
PostgreSQL
WeasyPrint
Imagick
Next.js frontend
Next.js dashboard
Laravel Scheduler
```

## 1. الدومينات

استبدل الأمثلة بدومينك الحقيقي:

```text
zdraft.example.com        واجهة العميل
admin.zdraft.example.com  لوحة التحكم
api.zdraft.example.com    Laravel API
```

## 2. تثبيت متطلبات السيرفر

على Ubuntu VPS:

```bash
sudo APP_DIR=/var/www/zdraft/backend PHP_VERSION=8.4 NODE_MAJOR=22 bash backend/deploy/install-ubuntu.sh
```

## 3. تجهيز PostgreSQL

```bash
sudo DB_NAME=zdraft DB_USER=zdraft DB_PASSWORD='CHANGE_TO_STRONG_PASSWORD' \
  bash backend/deploy/scripts/bootstrap-postgres.sh
```

## 4. إعداد Laravel

داخل `backend`:

```bash
cp .env.production.example .env
php artisan key:generate
```

ثم عدل القيم التالية قبل أي seed:

```env
APP_URL=https://api.your-domain.com
FRONTEND_URL=https://your-domain.com
DASHBOARD_URL=https://admin.your-domain.com
COOKIE_DOMAIN=.your-domain.com
DB_PASSWORD=
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD=
MAIL_HOST=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=
```

## 5. نشر الكود وتشغيل migrations/build

من جذر المشروع على السيرفر:

```bash
sudo ROOT_DIR=/var/www/zdraft bash backend/deploy/scripts/deploy-vps.sh
```

السكريبت ينفذ:

```text
composer install
php artisan migrate --seed --force
Laravel cache
npm install
build للواجهة والداشبورد
php artisan zdraft:doctor --json
إعادة تشغيل الخدمات
```

## 6. تثبيت Nginx وsystemd

```bash
sudo DOMAIN=your-domain.com \
  ADMIN_DOMAIN=admin.your-domain.com \
  API_DOMAIN=api.your-domain.com \
  bash backend/deploy/scripts/install-units.sh
```

ثم SSL:

```bash
sudo certbot --nginx \
  -d your-domain.com \
  -d www.your-domain.com \
  -d admin.your-domain.com \
  -d api.your-domain.com
```

ثم:

```bash
sudo systemctl restart zdraft-laravel-scheduler zdraft-frontend zdraft-dashboard nginx
```

## 7. فحص الجاهزية

```bash
cd /var/www/zdraft/backend
php artisan zdraft:doctor --json
php artisan test
```

لا تفتح Production قبل أن يكون:

```text
ready = true
blockers = 0
```

## 8. اختبارات قبول قبل العميل الحقيقي

- تسجيل مستخدم جديد.
- تأكيد البريد.
- إنشاء عقد إيجار.
- إنشاء عقد بيع.
- رفع بطاقة وجه وظهر.
- رفع إيصال دفع برقم المرسل.
- اعتماد ورفض الدفع من الداشبورد.
- إصدار PDF.
- تحميل PDF من حساب العميل.
- تجربة المشاركة برابط عرض وZ-ID.
- تجربة إشعار داخل الحساب وإيميل.
- تجربة الموبايل للواجهة والداشبورد.

## 9. ملاحظات مهمة

- لا تضع `PRIVATE_STORAGE_ROOT` أو `PDF_STORAGE_ROOT` داخل `public`.
- لا تستخدم بيانات السوبر أدمن الافتراضية.
- لا تترك `APP_DEBUG=true`.
- لا تترك `EXPOSE_DEBUG_TOKENS=true`.
- فشل إرسال الإيميل يجب أن يبقى داخل outbox/retry ولا يفشل الحدث الأساسي.
- WeasyPrint وImagick مطلوبان لهذه النسخة. لو غير متاحين، فهذا مسار Demo/Shared وليس Production كامل.
