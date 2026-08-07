# Z draft Workspace

النسخة الحالية تعتمد على **Laravel فقط في الباك إند**:

```text
frontend/                   واجهة العميل — Next.js + TypeScript
dashboard/                    لوحة التحكم — Next.js + TypeScript
backend/                      Laravel API + PostgreSQL + Scheduler
packages/template-engine/    تعريفات العقود المشتركة للواجهات
```

## التشغيل المحلي

### 1) قاعدة البيانات

```bash
docker compose up -d postgres
```

### 2) Laravel

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

وفي نافذة أخرى:

```bash
cd backend
php artisan schedule:work
```

### 3) الواجهات

```bash
cp frontend/.env.example frontend/.env.local
cp dashboard/.env.example dashboard/.env.local
npm install
npm run dev:frontend
npm run dev:dashboard
```


> في أول تشغيل على Staging استخدم `npm install` من سجل npm طبيعي لتوليد `package-lock.json` صالح، راجعه وثبّته في المستودع، ثم استخدم `npm ci` في النشرات التالية. ملف الـLock القديم حُذف لأنه كان ناقص تبعيات انتقالية ولن يعطي Build قابلًا للتكرار.

العناوين الافتراضية:

```text
واجهة العميل: http://localhost:3000
لوحة التحكم:  http://localhost:3001
Laravel API:  http://localhost:8000/api/v1
Health:       http://localhost:8000/api/health
Ready:        http://localhost:8000/api/ready
```

## الاختبارات

```bash
npm run test:engine
npm run verify:laravel

cd backend
composer install
php artisan test
```

لتشغيل اختبار دورة PostgreSQL الفعلية على قاعدة اختبار معزولة:

```bash
RUN_DATABASE_TESTS=true php artisan test --filter DatabaseWorkflowSmokeTest
```

## الإنتاج

- لا يوجد باك إند Node داخل هذه النسخة.
- يجب أن تكون `NEXT_PUBLIC_DEMO_MODE=false`.
- يجب أن تكون `NEXT_PUBLIC_TEMPLATE_SOURCE=api`.
- يجب أن تكون `NEXT_PUBLIC_DRAFT_SOURCE=api-only` في لوحة التحكم.
- شغّل Laravel Scheduler عبر systemd المرفق؛ وهو المسؤول عن البريد وPDF والقفل والتنظيف والنسخ الاحتياطي.
- لا تستخدم قاعدة الإنتاج لتجارب الاختبارات.

راجع `backend/README.md` و`LARAVEL_PRODUCTION_SETUP_AR.md`.

## VPS Production

قبل فتح المنصة لعملاء حقيقيين شغّل فحص الجاهزية:

```bash
cd backend
php artisan zdraft:doctor --json
```

النشر الكامل على VPS موثق في:

```text
docs/VPS_PRODUCTION_DEPLOYMENT_AR.md
```
