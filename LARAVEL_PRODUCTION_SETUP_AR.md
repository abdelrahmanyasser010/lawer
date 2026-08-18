# نشر Z draft على VPS — Laravel Production

هذه النسخة تستخدم **Laravel فقط** للباك إند. واجهة العميل والداشبورد Next.js ويمكن إبقاؤهما على Vercel، بينما Laravel + PostgreSQL + الملفات + PDF يعملون على الـVPS.

## التركيب المقترح الآن

```text
Vercel Frontend   -> https://your-frontend.vercel.app
Vercel Dashboard  -> https://your-dashboard.vercel.app
Hostinger VPS     -> https://api.your-domain.com
                     Laravel + PostgreSQL + WeasyPrint + private files + scheduler
```

> عند إبقاء الواجهة على Vercel والـAPI على دومين مختلف استخدم `COOKIE_SAME_SITE=none` و`COOKIE_SECURE=true` كما في `.env.example`. V27 يعيد CSRF token في تسجيل الدخول/التسجيل و`/auth/me` حتى لا تعتمد الواجهة على قراءة Cookie من دومين مختلف. لا تستخدم HTTP في Production.
>
> **الأفضل قبل فتح المنصة للجمهور:** اربط دومينات مخصصة مثل `app.example.com` و`admin.example.com` على Vercel و`api.example.com` على الـVPS. هذا أكثر توافقًا مع سياسات Cookies في Safari/المتصفحات من استخدام `*.vercel.app` مع API على دومين آخر.

## 1. ارفع المشروع

المسار المتوقع للباك:

```bash
/var/www/zdraft/backend
```

ثم:

```bash
cd /var/www/zdraft/backend
sudo APP_DIR=/var/www/zdraft/backend bash deploy/install-ubuntu.sh
```

السكربت يثبت PHP 8.4 وPostgreSQL وNginx وComposer وWeasyPrint وImagick وCertbot، وينشئ مسارات التخزين الخاصة.

## 2. جهز PostgreSQL

مثال من مستخدم postgres:

```sql
CREATE USER zdraft WITH PASSWORD 'CHANGE_THIS_STRONG_PASSWORD';
CREATE DATABASE zdraft OWNER zdraft;
```

أنشئ أيضًا قاعدة اختبار منفصلة قبل Go-live:

```sql
CREATE DATABASE zdraft_test OWNER zdraft;
```

## 3. ملف البيئة

```bash
cd /var/www/zdraft/backend
cp .env.example .env
nano .env
```

اضبط على الأقل:

```env
APP_URL=https://api.your-domain.com
FRONTEND_URL=https://your-frontend.vercel.app
DASHBOARD_URL=https://your-dashboard.vercel.app

DB_DATABASE=zdraft
DB_USERNAME=zdraft
DB_PASSWORD=...

SUPER_ADMIN_NAME=...
SUPER_ADMIN_EMAIL=...
SUPER_ADMIN_PASSWORD=...

COOKIE_DOMAIN=
COOKIE_SAME_SITE=none
COOKIE_SECURE=true
CORS_EXTRA_ORIGINS=

MAIL_USERNAME=zlegaleg@gmail.com
MAIL_PASSWORD=GMAIL_APP_PASSWORD
MAIL_FROM_ADDRESS=zlegaleg@gmail.com
```

ولا تضع كلمة مرور Gmail العادية؛ استخدم App Password فقط.

## 4. اختبار قاعدة منفصلة قبل الإنتاج

قبل تشغيل الاختبارات التكاملية لا تستخدم قاعدة `zdraft` الحقيقية. استخدم `zdraft_test`:

```bash
cd /var/www/zdraft/backend
DB_DATABASE=zdraft_test php artisan migrate --seed --force
DB_DATABASE=zdraft_test RUN_DATABASE_TESTS=true php artisan test
```

بعد نجاحها شغل الإنتاج:

```bash
sudo API_DOMAIN=api.your-domain.com APP_DIR=/var/www/zdraft/backend bash deploy/activate-production.sh
```

هذا يشغل migrations/seed، اختبارات Laravel غير التخريبية، cache، Nginx وLaravel Scheduler.

## 5. SSL

```bash
sudo certbot --nginx -d api.your-domain.com
BASE_URL=https://api.your-domain.com bash /var/www/zdraft/backend/deploy/smoke-production.sh
```

يجب أن تنجح `/health` و`/ready` و`/api/v1/catalog` و`/api/v1/templates`.

## 6. اربط Vercel

في واجهة العميل:

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_TEMPLATE_SOURCE=api
```

وفي الداشبورد:

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_TEMPLATE_SOURCE=api
NEXT_PUBLIC_DRAFT_SOURCE=api-only
NEXT_PUBLIC_ENABLE_TEAM_MANAGEMENT=false
NEXT_PUBLIC_ENABLE_ASSIGNMENT=false
NEXT_PUBLIC_ENABLE_OFFICE_CONTRACT_CREATION=false
NEXT_PUBLIC_ENABLE_CONTRACT_EDITING=false
NEXT_PUBLIC_ENABLE_TEMPLATE_MANAGEMENT=false
```

بعد تغيير أي `NEXT_PUBLIC_*` اعمل **Redeploy** على Vercel. لو ظهر في Console أي اتصال إلى `localhost:8000` فأنت ناشر نسخة قديمة؛ V27 لا يحتوي أي fallback إلى localhost في Production.

## 7. أول إعداد من السوبر أدمن

من إعدادات الداشبورد أدخل القيم الحقيقية قبل فتح الدفع للعملاء:

- إجمالي مراجعة العقد.
- عربون مراجعة العقد.
- عربون إعداد عقد بواسطة محامٍ.
- رقم Vodafone Cash.
- WhatsApp مراجعة العقود.
- WhatsApp الدعم الفني.
- هاتف وبريد الدعم عند الحاجة.

لو قيمة الدفع غير مضبوطة، الواجهة تمنع الدفع بدل عرض رقم أو سعر احتياطي.

## 8. اختبار Go-live يدوي

نفذ دورة واحدة كاملة بحساب عميل تجريبي:

1. تسجيل + OTP Gmail.
2. إنشاء عقد وحفظه.
3. مشاركة المسودة ثم إلغاء المشاركة.
4. رفع إيصال الدفع واعتماده من الداشبورد.
5. التأكد من بدء مهلة التعديل.
6. إصدار العقد وانتظار PDF.
7. تنزيل العقد من حساب العميل.
8. إنشاء طلب مراجعة عقد بمرفق فعلي عبر WhatsApp ثم طلب آخر عبر Zoom، واعتماد العربون والتأكد من تثبيت الموعد.
9. تأكيد وصول إشعار النظام والبريد.
10. تجربة Backup ثم التأكد من وجود الأرشيف.

لا تفتح المنصة للعملاء قبل نجاح `/ready` وهذه الدورة.
