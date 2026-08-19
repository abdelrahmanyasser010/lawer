# خريطة ربط متغيرات عقد تطوير الموقع — v12

هذا التقرير مولد آليًا من تعريف العقد. أي حقل جديد في الـWizard لا يصل إلى مادة قانونية أو قسم مستند مسجل يجعل فحص الـCI يفشل.

- إجمالي الحقول: **107**
- مرتبطة بمواد قانونية: **101**
- مرتبطة بقسم مستند مستقل (التوقيعات/الشهود): **6**
- غير مرتبطة: **0**

| المفتاح | اسم الحقل | الحالة | عبر المتغير | موضع الظهور |
|---|---|---|---|---|
| `contract_date` | تاريخ العقد | ✅ مادة قانونية | `contract_date` | بيانات وتمهيد المستند |
| `website_client_party_type` | الصفة القانونية لـالعميل | ✅ مادة قانونية | `website_client_party_definition`، `website_email_notices_text`، `website_messaging_notices_text` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة العشرون: الإخطارات والموطن المختار |
| `website_client_name` | الاسم الكامل لـالعميل | ✅ مادة قانونية | `website_approval_authority_text`، `website_client_party_definition`، `website_project_definition` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة السابعة: التزامات الطرف الأول (العميل) |
| `website_client_nationality` | الجنسية | ✅ مادة قانونية | `website_client_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_client_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `website_client_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_client_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `website_client_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_client_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `website_client_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_client_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `website_client_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_client_address` | العنوان | ✅ مادة قانونية | `website_client_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_client_phone` | رقم الهاتف | ✅ مادة قانونية | `website_client_party_definition`، `website_messaging_notices_text` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة العشرون: الإخطارات والموطن المختار |
| `website_client_email` | البريد الإلكتروني | ✅ مادة قانونية | `website_client_party_definition`، `website_email_notices_text` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة العشرون: الإخطارات والموطن المختار |
| `website_client_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `website_approval_authority_text`، `website_client_party_definition`، `website_project_definition` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة السابعة: التزامات الطرف الأول (العميل) |
| `website_client_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `website_client_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_client_commercial_register` | رقم السجل التجاري | ✅ مادة قانونية | `website_client_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_client_tax_number` | الرقم الضريبي الموحد | ✅ مادة قانونية | `website_client_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_client_legal_representative` | اسم الممثل القانوني | ✅ مادة قانونية | `website_approval_authority_text`، `website_client_party_definition`، `website_project_definition` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة السابعة: التزامات الطرف الأول (العميل) |
| `website_client_representative_capacity` | صفة الممثل القانوني | ✅ مادة قانونية | `website_client_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_client_company_address` | مقر الشركة | ✅ مادة قانونية | `website_client_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_client_company_phone` | رقم هاتف الشركة / الممثل | ✅ مادة قانونية | `website_client_party_definition`، `website_messaging_notices_text` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة العشرون: الإخطارات والموطن المختار |
| `website_client_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `website_client_party_definition`، `website_email_notices_text` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة العشرون: الإخطارات والموطن المختار |
| `website_provider_party_type` | الصفة القانونية لـمقدم الخدمة | ✅ مادة قانونية | `website_email_notices_text`، `website_messaging_notices_text`، `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة العشرون: الإخطارات والموطن المختار |
| `website_provider_name` | الاسم الكامل لـمقدم الخدمة | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_nationality` | الجنسية | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_address` | العنوان | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_phone` | رقم الهاتف | ✅ مادة قانونية | `website_messaging_notices_text`، `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة العشرون: الإخطارات والموطن المختار |
| `website_provider_email` | البريد الإلكتروني | ✅ مادة قانونية | `website_email_notices_text`، `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة العشرون: الإخطارات والموطن المختار |
| `website_provider_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_commercial_register` | رقم السجل التجاري | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_tax_number` | الرقم الضريبي الموحد | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_legal_representative` | اسم الممثل القانوني | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_representative_capacity` | صفة الممثل القانوني | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_authority_basis` | سند التمثيل | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_power_of_attorney_number` | رقم التوكيل | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_power_of_attorney_year` | سنة التوكيل | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_power_of_attorney_office` | مكتب الشهر العقاري | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_company_address` | مقر الشركة | ✅ مادة قانونية | `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_provider_company_phone` | رقم هاتف الشركة / الممثل | ✅ مادة قانونية | `website_messaging_notices_text`، `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة العشرون: الإخطارات والموطن المختار |
| `website_provider_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `website_email_notices_text`، `website_provider_party_definition` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة العشرون: الإخطارات والموطن المختار |
| `website_project_name` | اسم المشروع | ✅ مادة قانونية | `website_project_definition`، `website_project_name` | المادة الثانية: التمهيد والإقرارات العامة؛ المادة الثالثة: التعريفات؛ المادة الرابعة: محل العقد؛ المادة السادسة: نطاق العمل؛ المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_project_type` | نوع المشروع | ✅ مادة قانونية | `website_project_definition`، `website_project_type_text` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة الثانية: التمهيد والإقرارات العامة؛ المادة الثالثة: التعريفات؛ المادة الرابعة: محل العقد |
| `website_project_type_other` | نوع المشروع الآخر | ✅ مادة قانونية | `website_project_definition`، `website_project_type_text` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة الثانية: التمهيد والإقرارات العامة؛ المادة الثالثة: التعريفات؛ المادة الرابعة: محل العقد |
| `website_contact_email` | البريد الإلكتروني المعتمد للتواصل التشغيلي مع المشروع | ✅ مادة قانونية | `website_project_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_project_manager` | الشخص المسؤول عن المشروع | ✅ مادة قانونية | `website_project_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_approval_person` | الشخص المسؤول عن الاعتماد | ✅ مادة قانونية | `website_approval_authority_text`، `website_project_definition` | المادة الأولى: أطراف العقد وبيانات المشروع؛ المادة السابعة: التزامات الطرف الأول (العميل) |
| `website_billing_contact` | الشخص المسؤول عن الفواتير أو المدفوعات | ✅ مادة قانونية | `website_project_definition` | المادة الأولى: أطراف العقد وبيانات المشروع |
| `website_execution_duration_value` | مدة تنفيذ المشروع | ✅ مادة قانونية | `website_execution_duration_text` | المادة الثامنة: التزامات الطرف الثاني (مقدم الخدمة)؛ المادة التاسعة: مدة التنفيذ |
| `website_execution_duration_unit` | وحدة مدة التنفيذ | ✅ مادة قانونية | `website_execution_duration_text` | المادة الثامنة: التزامات الطرف الثاني (مقدم الخدمة)؛ المادة التاسعة: مدة التنفيذ |
| `website_execution_start_rule` | بداية احتساب مدة التنفيذ | ✅ مادة قانونية | `website_execution_start_text` | المادة الثامنة: التزامات الطرف الثاني (مقدم الخدمة)؛ المادة التاسعة: مدة التنفيذ |
| `website_execution_start_date` | تاريخ بدء التنفيذ | ✅ مادة قانونية | `website_execution_start_text` | المادة الثامنة: التزامات الطرف الثاني (مقدم الخدمة)؛ المادة التاسعة: مدة التنفيذ |
| `website_duration_basis` | أساس احتساب مدة التنفيذ | ✅ مادة قانونية | `website_duration_basis_text` | المادة الثامنة: التزامات الطرف الثاني (مقدم الخدمة)؛ المادة التاسعة: مدة التنفيذ |
| `website_response_period_days` | مهلة رد العميل على الاستفسارات — أيام عمل | ✅ مادة قانونية | `website_response_period_days` | المادة السابعة: التزامات الطرف الأول (العميل) |
| `website_review_period_days` | مدة مراجعة واعتماد المخرجات — أيام عمل | ✅ مادة قانونية | `website_review_period_days` | المادة السابعة: التزامات الطرف الأول (العميل)؛ المادة الثانية عشرة: التسليم واعتماد الأعمال |
| `website_total_price` | إجمالي المقابل المالي (جنيه مصري) | ✅ مادة قانونية | `website_total_price` | المادة العاشرة: المقابل المالي وآلية السداد |
| `website_total_price_words` | إجمالي المقابل المالي كتابةً (بدون اسم العملة) | ✅ مادة قانونية | `website_total_price_words` | المادة العاشرة: المقابل المالي وآلية السداد |
| `website_payment_mode` | طريقة السداد | ✅ مادة قانونية | `website_payment_schedule_text` | المادة العاشرة: المقابل المالي وآلية السداد |
| `website_single_payment_due` | موعد / واقعة استحقاق الدفعة الواحدة | ✅ مادة قانونية | `website_payment_schedule_text` | المادة العاشرة: المقابل المالي وآلية السداد |
| `website_payment_schedule` | جدول الدفعات | ✅ مادة قانونية | `website_payment_schedule_text` | المادة العاشرة: المقابل المالي وآلية السداد |
| `website_payment_method` | وسيلة السداد المتفق عليها | ✅ مادة قانونية | `website_payment_method` | المادة العاشرة: المقابل المالي وآلية السداد |
| `website_payment_grace_days` | مهلة السداد قبل تعليق التنفيذ — أيام عمل | ✅ مادة قانونية | `website_payment_grace_days` | المادة العاشرة: المقابل المالي وآلية السداد |
| `website_restart_threshold_days` | مدة التعليق التي قد تستلزم إعادة جدولة المشروع — يوم | ✅ مادة قانونية | `website_restart_threshold_days` | المادة العاشرة: المقابل المالي وآلية السداد |
| `website_restart_fee_enabled` | يوجد اتفاق على رسوم إعادة تشغيل المشروع بعد التعليق | ✅ مادة قانونية | `website_restart_fee_text` | المادة العاشرة: المقابل المالي وآلية السداد |
| `website_restart_fee_amount` | رسوم إعادة تشغيل المشروع (جنيه مصري) | ✅ مادة قانونية | `website_restart_fee_text` | المادة العاشرة: المقابل المالي وآلية السداد |
| `website_correction_attempts` | عدد محاولات معالجة الملاحظات الجوهرية | ✅ مادة قانونية | `website_correction_attempts` | المادة الثانية عشرة: التسليم واعتماد الأعمال |
| `website_warranty_duration_value` | مدة الضمان | ✅ مادة قانونية | `website_warranty_duration_text` | المادة الثامنة: التزامات الطرف الثاني (مقدم الخدمة)؛ المادة الثانية عشرة: التسليم واعتماد الأعمال؛ المادة الرابعة عشرة: الضمان والدعم الفني |
| `website_warranty_duration_unit` | وحدة مدة الضمان | ✅ مادة قانونية | `website_warranty_duration_text` | المادة الثامنة: التزامات الطرف الثاني (مقدم الخدمة)؛ المادة الثانية عشرة: التسليم واعتماد الأعمال؛ المادة الرابعة عشرة: الضمان والدعم الفني |
| `website_confidentiality_years` | مدة استمرار السرية بعد انتهاء العقد (بالسنوات) | ✅ مادة قانونية | `website_confidentiality_duration_text` | المادة السادسة عشرة: السرية وعدم الإفصاح |
| `website_portfolio_permission` | هل يسمح لمقدم الخدمة بعرض المشروع ضمن معرض أعماله (Portfolio)؟ | ✅ مادة قانونية | `website_portfolio_permission_text` | المادة الثالثة عشرة: حقوق الملكية الفكرية؛ المادة السادسة عشرة: السرية وعدم الإفصاح |
| `website_external_services_enabled` | يشمل الاتفاق خدمات خارجية / استضافة / دومين / تراخيص يديرها مقدم الخدمة | ✅ مادة قانونية | `website_external_services_text` | المادة الخامسة عشرة: الاستضافة واسم النطاق والخدمات المقدمة من الغير |
| `website_external_services` | الخدمات الخارجية المتفق عليها | ✅ مادة قانونية | `website_external_services_text` | المادة الخامسة عشرة: الاستضافة واسم النطاق والخدمات المقدمة من الغير |
| `website_email_notices_enabled` | اعتماد البريد الإلكتروني للإخطارات والمراسلات | ✅ مادة قانونية | `website_email_notices_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_notice_use_party_emails` | استخدام نفس البريد الإلكتروني المسجل في بيانات الطرفين | ✅ مادة قانونية | `website_email_notices_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_notice_client_email` | البريد الإلكتروني المعتمد للطرف الأول (العميل) | ✅ مادة قانونية | `website_email_notices_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_notice_provider_email` | البريد الإلكتروني المعتمد للطرف الثاني (مقدم الخدمة) | ✅ مادة قانونية | `website_email_notices_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_messaging_apps_enabled` | اعتماد تطبيقات المراسلة الإلكترونية (مثل WhatsApp) | ✅ مادة قانونية | `website_messaging_notices_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_messaging_apps` | تطبيقات المراسلة المعتمدة | ✅ مادة قانونية | `website_messaging_notices_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_messaging_use_party_phones` | استخدام نفس أرقام الهاتف المسجلة في بيانات الطرفين | ✅ مادة قانونية | `website_messaging_notices_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_messaging_client_number` | رقم المراسلة المعتمد للطرف الأول (العميل) | ✅ مادة قانونية | `website_messaging_notices_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_messaging_provider_number` | رقم المراسلة المعتمد للطرف الثاني (مقدم الخدمة) | ✅ مادة قانونية | `website_messaging_notices_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_project_platform_enabled` | اعتماد منصة إلكترونية لإدارة المشروع | ✅ مادة قانونية | `website_project_platform_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_project_platform_name` | اسم منصة إدارة المشروع | ✅ مادة قانونية | `website_project_platform_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_project_platform_link` | رابط المشروع أو الحساب على المنصة | ✅ مادة قانونية | `website_project_platform_text` | المادة العشرون: الإخطارات والموطن المختار |
| `website_contact_change_notice_days` | مهلة الإخطار بتغيير بيانات الاتصال — يوم | ✅ مادة قانونية | `website_contact_change_notice_days` | المادة العشرون: الإخطارات والموطن المختار |
| `website_breach_cure_days` | مهلة معالجة الإخلال الجوهري — يوم | ✅ مادة قانونية | `website_breach_cure_days` | المادة الثامنة عشرة: إنهاء العقد وآثاره |
| `website_nonpayment_termination_days` | مدة التأخر في السداد التي تجيز الإنهاء — يوم | ✅ مادة قانونية | `website_nonpayment_termination_days` | المادة الثامنة عشرة: إنهاء العقد وآثاره |
| `website_client_stoppage_days` | مدة توقف المشروع بسبب تقصير العميل قبل التعليق — يوم | ✅ مادة قانونية | `website_client_stoppage_days` | المادة الثامنة عشرة: إنهاء العقد وآثاره |
| `website_force_majeure_notice_days` | مهلة الإخطار بالقوة القاهرة — يوم | ✅ مادة قانونية | `website_force_majeure_notice_days` | المادة التاسعة عشرة: القوة القاهرة والظروف الطارئة |
| `website_force_majeure_termination_days` | مدة استمرار القوة القاهرة التي تجيز الإنهاء — يوم | ✅ مادة قانونية | `website_force_majeure_termination_days` | المادة التاسعة عشرة: القوة القاهرة والظروف الطارئة |
| `website_hardship_duration_days` | مدة استمرار الظروف الطارئة قبل إعادة التفاوض — يوم | ✅ مادة قانونية | `website_hardship_duration_days` | المادة التاسعة عشرة: القوة القاهرة والظروف الطارئة |
| `website_hardship_negotiation_days` | مدة التفاوض بعد الظروف الطارئة — يوم | ✅ مادة قانونية | `website_hardship_negotiation_days` | المادة التاسعة عشرة: القوة القاهرة والظروف الطارئة |
| `website_contract_copies` | عدد نسخ العقد الأصلية أو الإلكترونية | ✅ مادة قانونية | `website_contract_copies_text` | المادة الثانية والعشرون: الأحكام العامة |
| `website_non_solicitation_months` | مدة عدم استقطاب العاملين بعد انتهاء العقد — شهر | ✅ مادة قانونية | `website_non_solicitation_duration_text` | المادة الثانية والعشرون: الأحكام العامة |
| `website_legal_fees_enabled` | يوجد اتفاق خاص على تحمل رسوم الدمغة أو الرسوم القانونية | ✅ مادة قانونية | `website_legal_fees_text` | المادة الثانية والعشرون: الأحكام العامة |
| `website_legal_fees_payer` | يتحمل الرسوم | ✅ مادة قانونية | `website_legal_fees_text` | المادة الثانية والعشرون: الأحكام العامة |
| `website_legal_fees_other` | الاتفاق الآخر لتحمل الرسوم | ✅ مادة قانونية | `website_legal_fees_text` | المادة الثانية والعشرون: الأحكام العامة |
| `website_witness_1_enabled` | إضافة الشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `website_witness_1_name` | اسم الشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `website_witness_1_national_id` | الرقم القومي للشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `website_witness_2_enabled` | إضافة الشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `website_witness_2_name` | اسم الشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `website_witness_2_national_id` | الرقم القومي للشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `website_competent_court` | المحكمة المختصة | ✅ مادة قانونية | `website_competent_court_text` | المادة الحادية والعشرون: القانون الواجب التطبيق وتسوية المنازعات |
| `website_competent_court_other` | اسم المحكمة الأخرى | ✅ مادة قانونية | `website_competent_court_text` | المادة الحادية والعشرون: القانون الواجب التطبيق وتسوية المنازعات |
