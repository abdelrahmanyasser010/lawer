-- Z draft MVP Seeder Data
-- Includes default admin user, 3 primary contract templates, sections, and fields with Core Identity locking flags

-- 1. Default Super Admin User
INSERT INTO users (pubg_id, name, email, phone, role)
VALUES ('10000001', 'مدير النظام Z draft', 'admin@zdraft.com', '01000000000', 'super_admin')
ON CONFLICT (pubg_id) DO NOTHING;

-- 2. Contract Templates
INSERT INTO contract_templates (id, name, name_ar, slug, description, price_egp, icon)
VALUES
(1, 'Rental Contract', 'عقد إيجار', 'rental', 'عقد إيجار سكني أو تجاري معتمد قانونياً يحفظ حقوق المؤجر والمستأجر', 59.00, 'home'),
(2, 'Apartment Sale Contract', 'عقد بيع شقة', 'apartment_sale', 'عقد بيع وحدة سكنية شامل بنود الملكية ونظام الدفع والأقساط والرهن', 139.00, 'building'),
(3, 'Service & Freelance Agreements', 'عقود الخدمات والعمل الحر', 'freelancer', 'عقود تصميم الهوية البصرية وتطوير المواقع وإدارة منصات التواصل مع ملاحقها المستقلة', 59.00, 'briefcase')
ON CONFLICT (slug) DO UPDATE
SET name_ar = EXCLUDED.name_ar, price_egp = EXCLUDED.price_egp;

-- 3. Rental Contract Sections
INSERT INTO contract_sections (id, template_id, title, title_ar, display_order)
VALUES
(1, 1, 'Landlord Information', 'بيانات المؤجر (الطرف الأول)', 1),
(2, 1, 'Tenant Information', 'بيانات المستأجر (الطرف الثاني)', 2),
(3, 1, 'Property Details', 'بيانات العقار المؤجر', 3),
(4, 1, 'Financial Terms', 'الشروط المالية ونظام السداد', 4),
(5, 1, 'Legal Clauses', 'البنود القانونية وحل النزاعات', 5)
ON CONFLICT DO NOTHING;

-- 4. Rental Contract Fields (Notice is_core_identity_field = TRUE for personal identity fields)
INSERT INTO contract_fields (section_id, field_name, label, placeholder, field_type, is_required, validation_rule, is_core_identity_field)
VALUES
-- Section 1: Landlord (Core identity locked)
(1, 'landlord_name', 'اسم المؤجر الكامل', 'مثال: أحمد محمد حسن', 'text', TRUE, 'required|string|min:3|max:100', TRUE),
(1, 'landlord_national_id', 'الرقم القومي للمؤجر', '14 رقم قومي', 'text', TRUE, 'required|digits:14', TRUE),
(1, 'landlord_phone', 'رقم هاتف المؤجر', '01XXXXXXXXX', 'text', TRUE, 'required|regex:/^01[0125][0-9]{8}$/', TRUE),
(1, 'landlord_address', 'عنوان المؤجر المثبت بالبطاقة', 'العنوان بالتفصيل', 'textarea', TRUE, 'required|string|min:10', FALSE),

-- Section 2: Tenant (Core identity locked)
(2, 'tenant_name', 'اسم المستأجر الكامل', 'مثال: علي حسن محمود', 'text', TRUE, 'required|string|min:3|max:100', TRUE),
(2, 'tenant_national_id', 'الرقم القومي للمستأجر', '14 رقم قومي', 'text', TRUE, 'required|digits:14', TRUE),
(2, 'tenant_phone', 'رقم هاتف المستأجر', '01XXXXXXXXX', 'text', TRUE, 'required|regex:/^01[0125][0-9]{8}$/', TRUE),
(2, 'tenant_address', 'عنوان المستأجر الحالي', 'العنوان بالتفصيل', 'textarea', TRUE, 'required|string|min:10', FALSE),

-- Section 3: Property (Editable terms)
(3, 'property_type', 'نوع العقار', '--اختر--', 'select', TRUE, 'required|in:apartment,shop,warehouse', FALSE),
(3, 'property_address', 'عنوان العقار المؤجر', 'العنوان الكامل للعقار', 'textarea', TRUE, 'required|string|min:10', FALSE),
(3, 'property_area', 'المساحة بالمتر المربع (م²)', 'مثال: 120', 'number', TRUE, 'required|numeric|min:1', FALSE),
(3, 'property_furnished', 'هل العقار مفروش بالأثاث؟', '--', 'boolean', TRUE, 'required|boolean', FALSE),

-- Section 4: Financial Terms (Editable terms)
(4, 'monthly_rent', 'قيمة الإيجار الشهري (ج.م)', 'مثال: 5000', 'number', TRUE, 'required|numeric|min:1', FALSE),
(4, 'deposit_amount', 'مبلغ التأمين المسترد (ج.م)', 'مثال: 10000', 'number', TRUE, 'required|numeric|min:0', FALSE),
(4, 'contract_start_date', 'تاريخ بداية العقد', 'YYYY-MM-DD', 'date', TRUE, 'required|date', FALSE),
(4, 'contract_duration', 'مدة العقد (بالأشهر)', 'مثال: 12', 'number', TRUE, 'required|numeric|min:1', FALSE),

-- Section 5: Legal Clauses (Editable terms)
(5, 'maintenance_party', 'المسؤول عن تكاليف الصيانة', '--اختر--', 'select', TRUE, 'required|in:landlord,tenant,shared', FALSE),
(5, 'dispute_resolution', 'آلية حل النزاعات القانونية', '--اختر--', 'select', TRUE, 'required|in:court,arbitration', FALSE),
(5, 'additional_terms', 'شروط إضافية خاصة بين الطرفين', 'أي شروط أو بنود أخرى متفق عليها', 'textarea', FALSE, 'nullable|string|max:1000', FALSE);
