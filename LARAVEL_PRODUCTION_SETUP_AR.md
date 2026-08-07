# تشغيل Z draft بباك إند Laravel

هذه النسخة نهائية من ناحية اختيار الباك إند: **Laravel هو الباك الوحيد**، وتم حذف Express/Node بعد حفظ عقد توافق ثابت للـAPIs السابقة داخل اختبارات Laravel.

## قبل النشر

1. خذ Backup من قاعدة البيانات والملفات.
2. جهز PostgreSQL Test/Staging منفصلة.
3. ثبّت PHP extensions وComposer وWeasyPrint وImagick.
4. نفذ `composer install` ثم `php artisan migrate --seed`.
5. داخل جذر المشروع نفذ `npm install` من سجل npm طبيعي لتوليد `package-lock.json` صالح، ثم ثبّته قبل أي نشر يعتمد `npm ci`.
6. شغّل `php artisan test`، ثم اختبارات PostgreSQL والصور الفعلية على قاعدة اختبار معزولة.
7. ابنِ واجهة العميل والداشبورد مع `NEXT_PUBLIC_API_URL` الخاص بـLaravel.
8. اختبر التسجيل وOTP والعقود والسجل والمشاركة والدفع والإيصالات ومعالجة الصور وPDF والتنزيل.
9. بعد نجاح Staging فقط وجّه Nginx إلى `backend/public`.

## ملاحظة قاعدة البيانات القديمة

مجلد `backend/database/legacy-sql` ليس باك إند Node؛ هو مصدر Migrations PostgreSQL المتراكمة حتى V18، وتستخدمه Laravel لبناء نفس الجداول دون فقد البيانات.

## الرجوع الآمن

بعد حذف كود Node، الرجوع يكون من Backup موثق للإصدار السابق، وليس بتشغيل باكين على نفس قاعدة البيانات. لذلك يجب الاحتفاظ بملف ZIP V18 خارج مستودع الإنتاج فقط، ولا يوضع داخل حزمة V20.
