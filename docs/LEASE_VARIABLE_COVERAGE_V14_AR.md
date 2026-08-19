# خريطة ربط متغيرات عقود الإيجار الثلاثة — Rental v14

هذا التقرير مولد آليًا من تعريف القالب. كل Input يجب أن يصل إلى مادة قانونية أو قسم مستند مسجل، وأي حقل جديد غير مربوط يجعل فحص النشر يفشل بـ `UNBOUND_LEGAL_FIELD`.

## عقد إيجار سكني

- إجمالي الحقول: **117**
- مرتبطة بمواد قانونية: **110**
- مرتبطة بقسم مستند مستقل: **7**
- غير مرتبطة: **0**

| المفتاح | اسم الحقل | الحالة | عبر المتغير | موضع الظهور |
|---|---|---|---|---|
| `contract_date` | تاريخ العقد | ✅ مادة قانونية | `contract_date` | المادة الأولى: أطراف العقد |
| `landlord_party_type` | الصفة القانونية لـالمؤجر | ✅ مادة قانونية | `rental_email_notices_text`، `rental_landlord_party_definition`، `rental_messaging_notices_text` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد؛ وسائل المراسلة الإلكترونية |
| `landlord_name` | الاسم الكامل لـالمؤجر | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_nationality` | الجنسية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_address` | العنوان | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_phone` | رقم الهاتف | ✅ مادة قانونية | `rental_landlord_party_definition`، `rental_messaging_notices_text` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `landlord_email` | البريد الإلكتروني | ✅ مادة قانونية | `rental_email_notices_text`، `rental_landlord_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `landlord_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_commercial_register` | رقم السجل التجاري | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_tax_card` | رقم البطاقة الضريبية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_legal_representative` | يمثله قانونًا السيد | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_representative_capacity` | بصفته | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_company_address` | مقر الشركة | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_company_phone` | رقم هاتف الشركة / الممثل | ✅ مادة قانونية | `rental_landlord_party_definition`، `rental_messaging_notices_text` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `landlord_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `rental_email_notices_text`، `rental_landlord_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `tenant_party_type` | الصفة القانونية لـالمستأجر | ✅ مادة قانونية | `rental_email_notices_text`، `rental_messaging_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد؛ وسائل المراسلة الإلكترونية |
| `tenant_name` | الاسم الكامل لـالمستأجر | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_nationality` | الجنسية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_address` | العنوان | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_phone` | رقم الهاتف | ✅ مادة قانونية | `rental_messaging_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `tenant_email` | البريد الإلكتروني | ✅ مادة قانونية | `rental_email_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `tenant_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_commercial_register` | رقم السجل التجاري | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_tax_card` | رقم البطاقة الضريبية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_legal_representative` | يمثله قانونًا السيد | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_representative_capacity` | بصفته | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_company_address` | مقر الشركة | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_company_phone` | رقم هاتف الشركة / الممثل | ✅ مادة قانونية | `rental_messaging_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `tenant_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `rental_email_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `property_governorate` | المحافظة | ✅ مادة قانونية | `property_governorate`، `rental_property_jurisdiction_text` | المادة الثالثة: محل العقد؛ المادة الثامنة عشر: القانون الواجب التطبيق والمحكمة المختصة |
| `property_city` | المدينة / المركز | ✅ مادة قانونية | `property_city`، `rental_property_jurisdiction_text` | المادة الثالثة: محل العقد؛ المادة الثامنة عشر: القانون الواجب التطبيق والمحكمة المختصة |
| `property_district` | الحي / المنطقة | ✅ مادة قانونية | `property_district` | المادة الثالثة: محل العقد |
| `property_street` | اسم الشارع | ✅ مادة قانونية | `property_street` | المادة الثالثة: محل العقد |
| `building_number` | رقم العقار / المبنى | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `floor_number` | الدور | ✅ مادة قانونية | `floor_number` | المادة الثالثة: محل العقد |
| `unit_number` | رقم الوحدة / المقر | ✅ مادة قانونية | `unit_number` | المادة الثالثة: محل العقد |
| `property_area` | المساحة الإجمالية (م²) | ✅ مادة قانونية | `property_area` | المادة الثالثة: محل العقد |
| `electricity_meter_exists` | هل يوجد عداد كهرباء؟ | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `electricity_meter` | رقم عداد الكهرباء | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `electricity_meter_type` | نوع عداد الكهرباء | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `electricity_meter_reading` | قراءة عداد الكهرباء عند التسليم (إن كانت معلومة) | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `water_meter_exists` | هل يوجد عداد مياه؟ | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `water_meter` | رقم عداد المياه | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `water_meter_type` | نوع عداد المياه | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `water_meter_reading` | قراءة عداد المياه عند التسليم (إن كانت معلومة) | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `gas_meter_exists` | هل يوجد عداد غاز طبيعي؟ | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `gas_meter` | رقم عداد الغاز الطبيعي | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `gas_meter_type` | نوع عداد الغاز الطبيعي | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `gas_meter_reading` | قراءة عداد الغاز عند التسليم (إن كانت معلومة) | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد |
| `residential_property_type` | نوع العين السكنية | ✅ مادة قانونية | `residential_property_type` | المادة الثالثة: محل العقد |
| `residential_compound_name` | اسم الكمبوند (إن وجد) | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_plot_number` | رقم القطعة | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_adjacency_number` | رقم المجاورة | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_building_name` | اسم البرج / العمارة | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `rooms_count` | عدد غرف النوم | ✅ مادة قانونية | `rooms_count` | المادة الثالثة: محل العقد |
| `reception_count` | عدد صالات الاستقبال | ✅ مادة قانونية | `reception_count` | المادة الثالثة: محل العقد |
| `bathrooms_count` | عدد الحمامات | ✅ مادة قانونية | `bathrooms_count` | المادة الثالثة: محل العقد |
| `balconies_count` | عدد البلكونات | ✅ مادة قانونية | `balconies_count` | المادة الثالثة: محل العقد |
| `residential_finishing_level` | وصف التشطيب | ✅ مادة قانونية | `residential_finishing_level` | المادة الثالثة: محل العقد |
| `residential_kitchen_description` | المطبخ | ✅ مادة قانونية | `residential_kitchen_description` | المادة الثالثة: محل العقد |
| `residential_use_purpose` | الغرض من الإيجار | ✅ مادة قانونية | `residential_use_purpose` | المادة الثالثة: محل العقد؛ المادة السادسة: الغرض من الإيجار وحدود الانتفاع بالعين المؤجرة |
| `residential_is_furnished` | العين مفروشة أو مشتملة على منقولات | ✅ مادة قانونية | `@condition:residential_is_furnished` | العين المفروشة والمنقولات |
| `residential_includes_garage` | ملحق: جراج | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_includes_storage` | ملحق: مخزن | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_includes_garden` | ملحق: حديقة | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_includes_roof` | ملحق: سطح / رووف | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_includes_service_room` | ملحق: غرفة خدمات | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_includes_parking` | ملحق: مكان انتظار سيارة | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_other_annex_enabled` | يوجد ملحق آخر | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_other_annex` | وصف الملحق الآخر | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_management_rules_applicable` | العين داخل كمبوند أو عقار يخضع لإدارة / اتحاد شاغلين | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد |
| `residential_transfer_ownership_clause_enabled` | تضمين حكم انتقال ملكية العين أثناء سريان الإيجار | ✅ مادة قانونية | `@condition:residential_transfer_ownership_clause_enabled` | انتقال ملكية العين أثناء سريان الإيجار |
| `residential_pets_allowed` | هل يسمح بتربية الحيوانات الأليفة داخل العين؟ | ✅ مادة قانونية | `residential_pets_text` | المادة الثالثة عشر: المحظورات والقيود على استعمال العين المؤجرة |
| `annual_increase_rate` | نسبة الزيادة السنوية (%) | ✅ مادة قانونية | `annual_increase_rate` | الزيادة الدورية في الأجرة |
| `rental_payment_methods` | وسائل السداد المتفق عليها (واحدة أو أكثر) | ✅ مادة قانونية | `rental_payment_methods` | ميعاد وآلية سداد الأجرة |
| `residential_payment_grace_days` | مهلة السماح بعد استحقاق الأجرة قبل احتساب تعويض التأخير (بالأيام) | ✅ مادة قانونية | `residential_payment_grace_days` | ميعاد وآلية سداد الأجرة |
| `late_payment_daily_compensation` | التعويض الاتفاقي عن كل يوم تأخير في سداد الأجرة | ✅ مادة قانونية | `late_payment_daily_compensation` | ميعاد وآلية سداد الأجرة |
| `lease_duration_value` | مدة العقد | ✅ مادة قانونية | `lease_duration_text` | المادة الخامسة: مدة الإيجار |
| `lease_duration_unit` | وحدة مدة العقد | ✅ مادة قانونية | `lease_duration_text` | المادة الخامسة: مدة الإيجار |
| `start_date` | تاريخ بداية الإيجار | ✅ مادة قانونية | `start_date` | المادة الخامسة: مدة الإيجار |
| `end_date` | تاريخ انتهاء الإيجار | ✅ مادة قانونية | `end_date` | المادة الخامسة: مدة الإيجار |
| `property_delivery_date` | تاريخ تسليم العين المؤجرة | ✅ مادة قانونية | `property_delivery_date` | المادة العاشرة: التزامات الطرف الأول (المؤجر) والصيانة الجوهرية؛ المادة الحادية عشر: المرافق والعدادات والخدمات؛ المادة الثانية عشر: تسليم العين المؤجرة وانتقال الحيازة؛ المادة الرابعة عشر: إخلاء العين المؤجرة وردها |
| `deposit_amount` | مبلغ التأمين | ✅ مادة قانونية | `deposit_amount`، `deposit_amount_words` | المادة السابعة: التأمين |
| `deposit_payment_status` | حالة سداد مبلغ التأمين | ✅ مادة قانونية | `rental_deposit_receipt_text` | المادة السابعة: التأمين |
| `deposit_due_date` | موعد سداد مبلغ التأمين | ✅ مادة قانونية | `rental_deposit_receipt_text` | المادة السابعة: التأمين |
| `rent_period` | الفترة التي تستحق عنها الأجرة | ✅ مادة قانونية | `rent_period` | المادة الثامنة: الأجرة وآلية سدادها |
| `rent_amount` | القيمة الإيجارية | ✅ مادة قانونية | `rent_amount`، `rent_amount_words` | المادة الثامنة: الأجرة وآلية سدادها |
| `annual_increase_enabled` | تطبيق الزيادة الدورية المنصوص عليها في هذا النوع من العقد | ✅ مادة قانونية | `@condition:annual_increase_enabled` | الزيادة الدورية في الأجرة |
| `rent_due_day` | أقصى يوم للسداد من كل فترة إيجارية | ✅ مادة قانونية | `rent_due_day` | ميعاد وآلية سداد الأجرة |
| `holdover_daily_compensation` | التعويض الاتفاقي عن كل يوم تأخير في الإخلاء بعد انتهاء العقد | ✅ مادة قانونية | `holdover_daily_compensation` | المادة الخامسة: مدة الإيجار؛ المادة الرابعة عشر: إخلاء العين المؤجرة وردها |
| `rental_email_notices_enabled` | اعتماد البريد الإلكتروني للإخطارات والمراسلات | ✅ مادة قانونية | `@condition:rental_email_notices_enabled`، `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_notice_use_party_emails` | استخدام البريد المسجل للطرفين | ✅ مادة قانونية | `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_notice_landlord_email` | بريد المؤجر المعتمد للإخطارات | ✅ مادة قانونية | `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_notice_tenant_email` | بريد المستأجر المعتمد للإخطارات | ✅ مادة قانونية | `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_messaging_enabled` | اعتماد واتساب أو وسيلة مراسلة إلكترونية | ✅ مادة قانونية | `@condition:rental_messaging_enabled`، `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_channel` | وسيلة المراسلة المعتمدة | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_channel_other` | اسم وسيلة المراسلة الأخرى | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_use_party_phones` | استخدام أرقام الهاتف المسجلة للطرفين | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_landlord_phone` | رقم المؤجر المعتمد للمراسلة | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_tenant_phone` | رقم المستأجر المعتمد للمراسلة | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_witness_1_enabled` | إضافة الشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_1_name` | اسم الشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_1_national_id` | الرقم القومي للشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_2_enabled` | إضافة الشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_2_name` | اسم الشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_2_national_id` | الرقم القومي للشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_supporting_documents` | مستندات داعمة للعقد (اختياري) | ✅ قسم مستند | — | قسم المرفقات |

## عقد إيجار تجاري

- إجمالي الحقول: **131**
- مرتبطة بمواد قانونية: **124**
- مرتبطة بقسم مستند مستقل: **7**
- غير مرتبطة: **0**

| المفتاح | اسم الحقل | الحالة | عبر المتغير | موضع الظهور |
|---|---|---|---|---|
| `contract_date` | تاريخ العقد | ✅ مادة قانونية | `contract_date` | المادة الأولى: أطراف العقد |
| `landlord_party_type` | الصفة القانونية لـالمؤجر | ✅ مادة قانونية | `rental_email_notices_text`، `rental_landlord_party_definition`، `rental_messaging_notices_text` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد؛ وسائل المراسلة الإلكترونية |
| `landlord_name` | الاسم الكامل لـالمؤجر | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_nationality` | الجنسية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_address` | العنوان | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_phone` | رقم الهاتف | ✅ مادة قانونية | `rental_landlord_party_definition`، `rental_messaging_notices_text` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `landlord_email` | البريد الإلكتروني | ✅ مادة قانونية | `rental_email_notices_text`، `rental_landlord_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `landlord_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_commercial_register` | رقم السجل التجاري | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_tax_card` | رقم البطاقة الضريبية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_legal_representative` | يمثله قانونًا السيد | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_representative_capacity` | بصفته | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_company_address` | مقر الشركة | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_company_phone` | رقم هاتف الشركة / الممثل | ✅ مادة قانونية | `rental_landlord_party_definition`، `rental_messaging_notices_text` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `landlord_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `rental_email_notices_text`، `rental_landlord_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `tenant_party_type` | الصفة القانونية لـالمستأجر | ✅ مادة قانونية | `rental_email_notices_text`، `rental_messaging_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد؛ وسائل المراسلة الإلكترونية |
| `tenant_name` | الاسم الكامل لـالمستأجر | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_nationality` | الجنسية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_address` | العنوان | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_phone` | رقم الهاتف | ✅ مادة قانونية | `rental_messaging_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `tenant_email` | البريد الإلكتروني | ✅ مادة قانونية | `rental_email_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `tenant_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_commercial_register` | رقم السجل التجاري | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_tax_card` | رقم البطاقة الضريبية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_legal_representative` | يمثله قانونًا السيد | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_representative_capacity` | بصفته | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_company_address` | مقر الشركة | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_company_phone` | رقم هاتف الشركة / الممثل | ✅ مادة قانونية | `rental_messaging_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `tenant_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `rental_email_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `property_governorate` | المحافظة | ✅ مادة قانونية | `property_governorate`، `rental_property_jurisdiction_text` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات؛ المادة التاسعة عشرة: القانون الواجب التطبيق والمحكمة المختصة |
| `property_city` | المدينة / المركز | ✅ مادة قانونية | `property_city`، `rental_property_jurisdiction_text` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات؛ المادة التاسعة عشرة: القانون الواجب التطبيق والمحكمة المختصة |
| `property_district` | الحي / المنطقة | ✅ مادة قانونية | `property_district` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `property_street` | اسم الشارع | ✅ مادة قانونية | `property_street` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `building_number` | رقم العقار / المبنى | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `floor_number` | الدور | ✅ مادة قانونية | `floor_number` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `unit_number` | رقم الوحدة / المقر | ✅ مادة قانونية | `unit_number` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `property_area` | المساحة الإجمالية (م²) | ✅ مادة قانونية | `property_area` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `electricity_meter_exists` | هل يوجد عداد كهرباء؟ | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `electricity_meter` | رقم عداد الكهرباء | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `electricity_meter_type` | نوع عداد الكهرباء | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `electricity_meter_reading` | قراءة عداد الكهرباء عند التسليم (إن كانت معلومة) | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `water_meter_exists` | هل يوجد عداد مياه؟ | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `water_meter` | رقم عداد المياه | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `water_meter_type` | نوع عداد المياه | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `water_meter_reading` | قراءة عداد المياه عند التسليم (إن كانت معلومة) | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `gas_meter_exists` | هل يوجد عداد غاز طبيعي؟ | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `gas_meter` | رقم عداد الغاز الطبيعي | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `gas_meter_type` | نوع عداد الغاز الطبيعي | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `gas_meter_reading` | قراءة عداد الغاز عند التسليم (إن كانت معلومة) | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_project_name` | اسم المول / المشروع التجاري (إن وجد) | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_license_number` | رقم الترخيص (إن وجد) | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_plot_number` | رقم القطعة | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_site_type` | نوع الموقع | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_site_type_other` | وصف الموقع الآخر | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_has_mezzanine` | هل يوجد ميزانين؟ | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_frontage_width` | واجهة الوحدة بالمتر | ✅ مادة قانونية | `commercial_frontage_width`، `rental_property_additional_details` | المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات؛ المادة الثالثة: محل العقد |
| `commercial_frontage_count` | عدد الواجهات | ✅ مادة قانونية | `commercial_frontage_count`، `rental_property_additional_details` | المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات؛ المادة الثالثة: محل العقد |
| `commercial_has_storage` | هل يوجد مخزن تابع؟ | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_has_loading_area` | هل يوجد مكان مخصص للتحميل والتنزيل؟ | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_includes_garage` | هل يشمل الإيجار جراجًا؟ | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_front_yard` | هل توجد ساحة أمامية تابعة؟ | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_back_yard` | هل توجد ساحة خلفية تابعة؟ | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_service_room` | هل توجد غرفة خدمات تابعة؟ | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_toilet` | هل توجد دورة مياه تابعة؟ | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_other_annex_enabled` | يوجد ملحق تجاري آخر | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_other_annex` | وصف الملحق التجاري الآخر | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_finishing_level` | وصف التشطيب | ✅ مادة قانونية | `commercial_finishing_level`، `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_finishing_other` | وصف التشطيب الآخر | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `commercial_activity_name` | النشاط التجاري المحدد | ✅ مادة قانونية | `commercial_activity_name` | المادة الثالثة: محل العقد؛ المادة السادسة: الغرض من الإيجار وحدود الانتفاع بالوحدة المؤجرة؛ المادة التاسعة: التزامات الطرف الثاني (المستأجر) والصيانة؛ المادة العاشرة: التزامات الطرف الأول (المؤجر) والصيانة الجوهرية؛ المادة الثالثة عشرة: تسليم الوحدة المؤجرة وانتقال الحيازة؛ المادة الخامسة عشرة: الفسخ والإخلال بأحكام العقد؛ المادة السادسة عشرة: المحظورات والقيود على استعمال الوحدة المؤجرة |
| `annual_increase_rate` | نسبة الزيادة السنوية (%) | ✅ مادة قانونية | `annual_increase_rate` | الزيادة الدورية في الأجرة (إن وجدت) |
| `rental_payment_method` | وسيلة سداد الأجرة | ✅ مادة قانونية | `rental_payment_method_text` | ميعاد وآلية سداد الأجرة |
| `rental_payment_method_other` | وسيلة السداد الأخرى | ✅ مادة قانونية | `rental_payment_method_text` | ميعاد وآلية سداد الأجرة |
| `late_payment_daily_compensation` | التعويض الاتفاقي عن كل يوم تأخير في سداد الأجرة | ✅ مادة قانونية | `late_payment_daily_compensation` | ميعاد وآلية سداد الأجرة |
| `commercial_early_termination_enabled` | السماح بإنهاء العقد قبل انتهاء مدته وفق البند الاختياري | ✅ مادة قانونية | `@condition:commercial_early_termination_enabled` | الإنهاء المبكر |
| `commercial_early_termination_notice_days` | مهلة الإخطار قبل الإنهاء المبكر (بالأيام) | ✅ مادة قانونية | `commercial_early_termination_notice_days` | الإنهاء المبكر |
| `commercial_early_termination_compensation` | مقابل الإنهاء المبكر | ✅ مادة قانونية | `commercial_early_termination_compensation` | الإنهاء المبكر |
| `commercial_nonpayment_termination_days` | عدد أيام التأخر في السداد التي يترتب عليها الفسخ الصريح | ✅ مادة قانونية | `commercial_nonpayment_termination_days` | المادة الخامسة عشرة: الفسخ والإخلال بأحكام العقد |
| `commercial_safety_enabled` | تطبيق فقرة اشتراطات الدفاع المدني والسلامة | ✅ مادة قانونية | `@condition:commercial_safety_enabled` | اشتراطات الدفاع المدني والسلامة |
| `commercial_guarantee_checks_enabled` | إضافة شيكات ضمان | ✅ مادة قانونية | `@condition:commercial_guarantee_checks_enabled` | شيكات الضمان |
| `commercial_guarantee_checks_count` | عدد شيكات الضمان | ✅ مادة قانونية | `commercial_guarantee_checks_count` | شيكات الضمان |
| `commercial_guarantee_bank` | اسم البنك | ✅ مادة قانونية | `commercial_guarantee_bank` | شيكات الضمان |
| `commercial_guarantee_check_numbers` | أرقام الشيكات | ✅ مادة قانونية | `commercial_guarantee_check_numbers` | شيكات الضمان |
| `commercial_guarantee_value_mode` | طريقة إثبات قيمة الشيكات | ✅ مادة قانونية | `commercial_guarantee_value_text` | شيكات الضمان |
| `commercial_guarantee_each_amount` | قيمة كل شيك | ✅ مادة قانونية | `commercial_guarantee_value_text` | شيكات الضمان |
| `commercial_guarantee_total_amount` | إجمالي قيمة الشيكات | ✅ مادة قانونية | `commercial_guarantee_value_text` | شيكات الضمان |
| `commercial_vat_enabled` | الأجرة خاضعة لضريبة القيمة المضافة | ✅ مادة قانونية | `@condition:commercial_vat_enabled` | ضريبة القيمة المضافة |
| `commercial_public_customers_enabled` | النشاط يستقبل الجمهور أو العملاء | ✅ مادة قانونية | `@condition:commercial_public_customers_enabled` | استقبال الجمهور أو العملاء |
| `commercial_insurance_enabled` | تطبيق فقرة التأمين على النشاط والمسؤولية المدنية | ✅ مادة قانونية | `@condition:commercial_insurance_enabled` | التأمين على النشاط والمسؤولية المدنية |
| `commercial_signage_enabled` | السماح باللافتات والعلامات التجارية والإعلانات وفق الضوابط | ✅ مادة قانونية | `@condition:commercial_signage_enabled` | اللافتات والعلامات التجارية والإعلانات |
| `commercial_legal_fees_enabled` | تضمين فقرة رسوم الدمغة والرسوم القانونية | ✅ مادة قانونية | `@condition:commercial_legal_fees_enabled` | رسوم الدمغة والرسوم القانونية |
| `commercial_legal_fees_bearer` | من يتحمل رسوم الدمغة والرسوم القانونية؟ | ✅ مادة قانونية | `commercial_legal_fees_bearer` | رسوم الدمغة والرسوم القانونية |
| `lease_duration_value` | مدة العقد | ✅ مادة قانونية | `lease_duration_text` | المادة الخامسة: مدة الإيجار |
| `lease_duration_unit` | وحدة مدة العقد | ✅ مادة قانونية | `lease_duration_text` | المادة الخامسة: مدة الإيجار |
| `start_date` | تاريخ بداية الإيجار | ✅ مادة قانونية | `start_date` | المادة الخامسة: مدة الإيجار |
| `end_date` | تاريخ انتهاء الإيجار | ✅ مادة قانونية | `end_date` | المادة الخامسة: مدة الإيجار |
| `property_delivery_date` | تاريخ تسليم العين المؤجرة | ✅ مادة قانونية | `property_delivery_date` | المادة العاشرة: التزامات الطرف الأول (المؤجر) والصيانة الجوهرية؛ المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة عشرة: تسليم الوحدة المؤجرة وانتقال الحيازة؛ المادة الرابعة عشرة: إخلاء الوحدة المؤجرة وردها |
| `deposit_amount` | مبلغ التأمين | ✅ مادة قانونية | `deposit_amount`، `deposit_amount_words` | المادة السابعة: التأمين |
| `deposit_payment_status` | حالة سداد مبلغ التأمين | ✅ مادة قانونية | `rental_deposit_receipt_text` | المادة السابعة: التأمين |
| `deposit_due_date` | موعد سداد مبلغ التأمين | ✅ مادة قانونية | `rental_deposit_receipt_text` | المادة السابعة: التأمين |
| `rent_period` | الفترة التي تستحق عنها الأجرة | ✅ مادة قانونية | `rent_period` | المادة الثامنة: الأجرة وآلية سدادها |
| `rent_amount` | القيمة الإيجارية | ✅ مادة قانونية | `rent_amount`، `rent_amount_words` | المادة الثامنة: الأجرة وآلية سدادها |
| `annual_increase_enabled` | تطبيق الزيادة الدورية المنصوص عليها في هذا النوع من العقد | ✅ مادة قانونية | `@condition:annual_increase_enabled` | الزيادة الدورية في الأجرة (إن وجدت) |
| `rent_due_day` | أقصى يوم للسداد من كل فترة إيجارية | ✅ مادة قانونية | `rent_due_day` | ميعاد وآلية سداد الأجرة |
| `holdover_daily_compensation` | التعويض الاتفاقي عن كل يوم تأخير في الإخلاء بعد انتهاء العقد | ✅ مادة قانونية | `holdover_daily_compensation` | المادة الخامسة: مدة الإيجار؛ المادة الرابعة عشرة: إخلاء الوحدة المؤجرة وردها |
| `rental_email_notices_enabled` | اعتماد البريد الإلكتروني للإخطارات والمراسلات | ✅ مادة قانونية | `@condition:rental_email_notices_enabled`، `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_notice_use_party_emails` | استخدام البريد المسجل للطرفين | ✅ مادة قانونية | `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_notice_landlord_email` | بريد المؤجر المعتمد للإخطارات | ✅ مادة قانونية | `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_notice_tenant_email` | بريد المستأجر المعتمد للإخطارات | ✅ مادة قانونية | `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_messaging_enabled` | اعتماد واتساب أو وسيلة مراسلة إلكترونية | ✅ مادة قانونية | `@condition:rental_messaging_enabled`، `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_channel` | وسيلة المراسلة المعتمدة | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_channel_other` | اسم وسيلة المراسلة الأخرى | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_use_party_phones` | استخدام أرقام الهاتف المسجلة للطرفين | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_landlord_phone` | رقم المؤجر المعتمد للمراسلة | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_tenant_phone` | رقم المستأجر المعتمد للمراسلة | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_witness_1_enabled` | إضافة الشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_1_name` | اسم الشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_1_national_id` | الرقم القومي للشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_2_enabled` | إضافة الشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_2_name` | اسم الشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_2_national_id` | الرقم القومي للشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_supporting_documents` | مستندات داعمة للعقد (اختياري) | ✅ قسم مستند | — | قسم المرفقات |

## عقد إيجار إداري

- إجمالي الحقول: **127**
- مرتبطة بمواد قانونية: **120**
- مرتبطة بقسم مستند مستقل: **7**
- غير مرتبطة: **0**

| المفتاح | اسم الحقل | الحالة | عبر المتغير | موضع الظهور |
|---|---|---|---|---|
| `contract_date` | تاريخ العقد | ✅ مادة قانونية | `contract_date` | المادة الأولى: أطراف العقد |
| `landlord_party_type` | الصفة القانونية لـالمؤجر | ✅ مادة قانونية | `rental_email_notices_text`، `rental_landlord_party_definition`، `rental_messaging_notices_text` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد؛ وسائل المراسلة الإلكترونية |
| `landlord_name` | الاسم الكامل لـالمؤجر | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_nationality` | الجنسية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_address` | العنوان | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_phone` | رقم الهاتف | ✅ مادة قانونية | `rental_landlord_party_definition`، `rental_messaging_notices_text` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `landlord_email` | البريد الإلكتروني | ✅ مادة قانونية | `rental_email_notices_text`، `rental_landlord_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `landlord_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_commercial_register` | رقم السجل التجاري | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_tax_card` | رقم البطاقة الضريبية | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_legal_representative` | يمثله قانونًا السيد | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_representative_capacity` | بصفته | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_company_address` | مقر الشركة | ✅ مادة قانونية | `rental_landlord_party_definition` | المادة الأولى: أطراف العقد |
| `landlord_company_phone` | رقم هاتف الشركة / الممثل | ✅ مادة قانونية | `rental_landlord_party_definition`، `rental_messaging_notices_text` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `landlord_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `rental_email_notices_text`، `rental_landlord_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `tenant_party_type` | الصفة القانونية لـالمستأجر | ✅ مادة قانونية | `rental_email_notices_text`، `rental_messaging_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد؛ وسائل المراسلة الإلكترونية |
| `tenant_name` | الاسم الكامل لـالمستأجر | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_nationality` | الجنسية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_address` | العنوان | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_phone` | رقم الهاتف | ✅ مادة قانونية | `rental_messaging_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `tenant_email` | البريد الإلكتروني | ✅ مادة قانونية | `rental_email_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `tenant_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_commercial_register` | رقم السجل التجاري | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_tax_card` | رقم البطاقة الضريبية | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_legal_representative` | يمثله قانونًا السيد | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_representative_capacity` | بصفته | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_company_address` | مقر الشركة | ✅ مادة قانونية | `rental_tenant_party_definition` | المادة الأولى: أطراف العقد |
| `tenant_company_phone` | رقم هاتف الشركة / الممثل | ✅ مادة قانونية | `rental_messaging_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ وسائل المراسلة الإلكترونية |
| `tenant_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `rental_email_notices_text`، `rental_tenant_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `property_governorate` | المحافظة | ✅ مادة قانونية | `property_governorate`، `rental_property_jurisdiction_text` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات؛ المادة التاسعة عشرة: القانون الواجب التطبيق والمحكمة المختصة |
| `property_city` | المدينة / المركز | ✅ مادة قانونية | `property_city`، `rental_property_jurisdiction_text` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات؛ المادة التاسعة عشرة: القانون الواجب التطبيق والمحكمة المختصة |
| `property_district` | الحي / المنطقة | ✅ مادة قانونية | `property_district` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `property_street` | اسم الشارع | ✅ مادة قانونية | `property_street` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `building_number` | رقم العقار / المبنى | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `floor_number` | الدور | ✅ مادة قانونية | `floor_number` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `unit_number` | رقم الوحدة / المقر | ✅ مادة قانونية | `unit_number` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `property_area` | المساحة الإجمالية (م²) | ✅ مادة قانونية | `property_area` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `electricity_meter_exists` | هل يوجد عداد كهرباء؟ | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `electricity_meter` | رقم عداد الكهرباء | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `electricity_meter_type` | نوع عداد الكهرباء | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `electricity_meter_reading` | قراءة عداد الكهرباء عند التسليم (إن كانت معلومة) | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `water_meter_exists` | هل يوجد عداد مياه؟ | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `water_meter` | رقم عداد المياه | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `water_meter_type` | نوع عداد المياه | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `water_meter_reading` | قراءة عداد المياه عند التسليم (إن كانت معلومة) | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `gas_meter_exists` | هل يوجد عداد غاز طبيعي؟ | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `gas_meter` | رقم عداد الغاز الطبيعي | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `gas_meter_type` | نوع عداد الغاز الطبيعي | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `gas_meter_reading` | قراءة عداد الغاز عند التسليم (إن كانت معلومة) | ✅ مادة قانونية | `rental_meter_details_text`، `rental_property_additional_details` | المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_project_name` | اسم المشروع / البرج الإداري / المجمع الإداري / الكمبوند | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_license_number` | رقم الترخيص (إن وجد) | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_plot_number` | رقم القطعة | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_site_type` | موقع العين المؤجرة | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_site_type_other` | وصف الموقع الآخر | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_meeting_room` | قاعة اجتماعات | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_reception` | استقبال (Reception) | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_storage` | مخزن تابع | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_lift` | مصعد بالمبنى | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_parking_count` | عدد أماكن انتظار السيارات المخصصة | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_server_room` | غرفة خوادم (Server Room) | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_ac_system` | نظام التكييف | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_data_network` | شبكة البيانات (Data Network) | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_delivery_condition` | حالة العين عند التسليم | ✅ مادة قانونية | `rental_property_additional_details` | المادة الثالثة: محل العقد؛ المادة الرابعة: وصف العين المؤجرة والمعاينة والملحقات |
| `administrative_activity_name` | النشاط الإداري المحدد | ✅ مادة قانونية | `administrative_activity_name` | المادة الثالثة: محل العقد؛ المادة السادسة: استعمال العين المؤجرة والغرض من الإيجار؛ المادة التاسعة: التزامات الطرف الثاني (المستأجر) والصيانة؛ المادة العاشرة: التزامات الطرف الأول (المؤجر) والصيانة الجوهرية؛ المادة الثالثة عشرة: تسليم العين المؤجرة وانتقال الحيازة؛ المادة الخامسة عشرة: الفسخ والإخلال بأحكام العقد؛ المادة السادسة عشرة: المحظورات والقيود على استعمال العين المؤجرة |
| `annual_increase_rate` | نسبة الزيادة السنوية (%) | ✅ مادة قانونية | `annual_increase_rate` | الزيادة الدورية في الأجرة |
| `administrative_rent_grace_days` | مهلة السماح بعد استحقاق الأجرة (بالأيام) | ✅ مادة قانونية | `administrative_rent_grace_days` | ميعاد وآلية سداد الأجرة؛ المادة الخامسة عشرة: الفسخ والإخلال بأحكام العقد |
| `late_payment_daily_compensation` | التعويض الاتفاقي اليومي بعد انقضاء مهلة السداد | ✅ مادة قانونية | `late_payment_daily_compensation` | ميعاد وآلية سداد الأجرة |
| `rental_payment_method` | وسيلة سداد الأجرة | ✅ مادة قانونية | `rental_payment_method_text` | ميعاد وآلية سداد الأجرة |
| `rental_payment_method_other` | وسيلة السداد الأخرى | ✅ مادة قانونية | `rental_payment_method_text` | ميعاد وآلية سداد الأجرة |
| `administrative_early_termination_enabled` | السماح بإنهاء العقد قبل انتهاء مدته وفق البند الاختياري | ✅ مادة قانونية | `@condition:administrative_early_termination_enabled` | الإنهاء المبكر |
| `administrative_early_termination_notice_days` | مهلة الإخطار قبل الإنهاء المبكر (بالأيام) | ✅ مادة قانونية | `administrative_early_termination_notice_days` | الإنهاء المبكر |
| `administrative_early_termination_compensation` | مقابل الإنهاء المبكر | ✅ مادة قانونية | `administrative_early_termination_compensation` | الإنهاء المبكر |
| `administrative_safety_enabled` | تطبيق فقرة اشتراطات السلامة والدفاع المدني | ✅ مادة قانونية | `@condition:administrative_safety_enabled` | اشتراطات السلامة والدفاع المدني |
| `administrative_guarantee_checks_enabled` | إضافة شيكات ضمان | ✅ مادة قانونية | `@condition:administrative_guarantee_checks_enabled` | شيكات الضمان |
| `administrative_guarantee_checks_count` | عدد شيكات الضمان | ✅ مادة قانونية | `administrative_guarantee_checks_count` | شيكات الضمان |
| `administrative_guarantee_bank` | اسم البنك | ✅ مادة قانونية | `administrative_guarantee_bank` | شيكات الضمان |
| `administrative_guarantee_check_numbers` | أرقام الشيكات | ✅ مادة قانونية | `administrative_guarantee_check_numbers` | شيكات الضمان |
| `administrative_guarantee_value_mode` | طريقة إثبات قيمة الشيكات | ✅ مادة قانونية | `administrative_guarantee_value_text` | شيكات الضمان |
| `administrative_guarantee_each_amount` | قيمة كل شيك | ✅ مادة قانونية | `administrative_guarantee_value_text` | شيكات الضمان |
| `administrative_guarantee_total_amount` | إجمالي قيمة الشيكات | ✅ مادة قانونية | `administrative_guarantee_value_text` | شيكات الضمان |
| `administrative_vat_enabled` | الأجرة خاضعة لضريبة القيمة المضافة | ✅ مادة قانونية | `@condition:administrative_vat_enabled` | ضريبة القيمة المضافة |
| `administrative_visitors_enabled` | النشاط يستقبل العملاء أو الزائرين | ✅ مادة قانونية | `@condition:administrative_visitors_enabled` | استقبال العملاء أو الزائرين |
| `administrative_insurance_enabled` | تطبيق فقرة التأمين على النشاط والمسؤولية المدنية | ✅ مادة قانونية | `@condition:administrative_insurance_enabled` | التأمين على النشاط والمسؤولية المدنية |
| `administrative_signage_enabled` | السماح بلافتة أو لوحة تعريفية وفق الضوابط | ✅ مادة قانونية | `@condition:administrative_signage_enabled` | اللافتات ولوحات التعريف بالشركة |
| `administrative_esign_enabled` | اعتماد التوقيع الإلكتروني أو منصة رقمية | ✅ مادة قانونية | `@condition:administrative_esign_enabled` | التوقيع الإلكتروني والمنصات الرقمية (إن وجد) |
| `administrative_legal_fees_enabled` | تضمين فقرة رسوم الدمغة والرسوم القانونية | ✅ مادة قانونية | `@condition:administrative_legal_fees_enabled` | رسوم الدمغة والرسوم والمصروفات القانونية |
| `administrative_legal_fees_bearer` | من يتحمل رسوم الدمغة والرسوم القانونية؟ | ✅ مادة قانونية | `administrative_legal_fees_bearer` | رسوم الدمغة والرسوم والمصروفات القانونية |
| `lease_duration_value` | مدة العقد | ✅ مادة قانونية | `lease_duration_text` | المادة الخامسة: مدة الإيجار |
| `lease_duration_unit` | وحدة مدة العقد | ✅ مادة قانونية | `lease_duration_text` | المادة الخامسة: مدة الإيجار |
| `start_date` | تاريخ بداية الإيجار | ✅ مادة قانونية | `start_date` | المادة الخامسة: مدة الإيجار |
| `end_date` | تاريخ انتهاء الإيجار | ✅ مادة قانونية | `end_date` | المادة الخامسة: مدة الإيجار |
| `property_delivery_date` | تاريخ تسليم العين المؤجرة | ✅ مادة قانونية | `property_delivery_date` | المادة العاشرة: التزامات الطرف الأول (المؤجر) والصيانة الجوهرية؛ المادة الثانية عشرة: المرافق والعدادات والخدمات؛ المادة الثالثة عشرة: تسليم العين المؤجرة وانتقال الحيازة؛ المادة الرابعة عشرة: إخلاء العين المؤجرة وردها |
| `deposit_amount` | مبلغ التأمين | ✅ مادة قانونية | `deposit_amount`، `deposit_amount_words` | المادة السابعة: مبلغ التأمين |
| `deposit_payment_status` | حالة سداد مبلغ التأمين | ✅ مادة قانونية | `rental_deposit_receipt_text` | المادة السابعة: مبلغ التأمين |
| `deposit_due_date` | موعد سداد مبلغ التأمين | ✅ مادة قانونية | `rental_deposit_receipt_text` | المادة السابعة: مبلغ التأمين |
| `rent_period` | الفترة التي تستحق عنها الأجرة | ✅ مادة قانونية | `rent_period` | المادة الثامنة: الأجرة وآلية سدادها |
| `rent_amount` | القيمة الإيجارية | ✅ مادة قانونية | `rent_amount`، `rent_amount_words` | المادة الثامنة: الأجرة وآلية سدادها |
| `annual_increase_enabled` | تطبيق الزيادة الدورية المنصوص عليها في هذا النوع من العقد | ✅ مادة قانونية | `@condition:annual_increase_enabled` | الزيادة الدورية في الأجرة |
| `rent_due_day` | أقصى يوم للسداد من كل فترة إيجارية | ✅ مادة قانونية | `rent_due_day` | ميعاد وآلية سداد الأجرة |
| `holdover_daily_compensation` | التعويض الاتفاقي عن كل يوم تأخير في الإخلاء بعد انتهاء العقد | ✅ مادة قانونية | `holdover_daily_compensation` | المادة الخامسة: مدة الإيجار |
| `rental_email_notices_enabled` | اعتماد البريد الإلكتروني للإخطارات والمراسلات | ✅ مادة قانونية | `@condition:rental_email_notices_enabled`، `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_notice_use_party_emails` | استخدام البريد المسجل للطرفين | ✅ مادة قانونية | `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_notice_landlord_email` | بريد المؤجر المعتمد للإخطارات | ✅ مادة قانونية | `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_notice_tenant_email` | بريد المستأجر المعتمد للإخطارات | ✅ مادة قانونية | `rental_email_notices_text` | البريد الإلكتروني المعتمد |
| `rental_messaging_enabled` | اعتماد واتساب أو وسيلة مراسلة إلكترونية | ✅ مادة قانونية | `@condition:rental_messaging_enabled`، `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_channel` | وسيلة المراسلة المعتمدة | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_channel_other` | اسم وسيلة المراسلة الأخرى | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_use_party_phones` | استخدام أرقام الهاتف المسجلة للطرفين | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_landlord_phone` | رقم المؤجر المعتمد للمراسلة | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_messaging_tenant_phone` | رقم المستأجر المعتمد للمراسلة | ✅ مادة قانونية | `rental_messaging_notices_text` | وسائل المراسلة الإلكترونية |
| `rental_witness_1_enabled` | إضافة الشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_1_name` | اسم الشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_1_national_id` | الرقم القومي للشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_2_enabled` | إضافة الشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_2_name` | اسم الشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_witness_2_national_id` | الرقم القومي للشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `rental_supporting_documents` | مستندات داعمة للعقد (اختياري) | ✅ قسم مستند | — | قسم المرفقات |
