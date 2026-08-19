# خريطة ربط متغيرات عقود البيع الثلاثة — Apartment Sale v13

هذا التقرير مولد آليًا من تعريف القوالب. كل Input يجب أن يصل إلى مادة قانونية أو قسم مستند مسجل، وأي حقل جديد غير مربوط يجعل فحص النشر يفشل بـ `UNBOUND_LEGAL_FIELD`.

## عقد بيع ابتدائي

- إجمالي الحقول: **127**
- مرتبطة بمواد قانونية: **111**
- مرتبطة بقسم مستند مستقل: **16**
- غير مرتبطة: **0**

| المفتاح | اسم الحقل | الحالة | عبر المتغير | موضع الظهور |
|---|---|---|---|---|
| `contract_date` | تاريخ العقد | ✅ مادة قانونية | `contract_date` | المادة الأولى: أطراف العقد؛ المادة الثالثة والعشرون: الأحكام العامة |
| `sale_contract_city` | مدينة تحرير العقد | ✅ مادة قانونية | `sale_contract_city` | المادة الثالثة والعشرون: الأحكام العامة |
| `seller_party_type` | صفة البائع | ✅ مادة قانونية | `sale_email_notices_text`، `sale_seller_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `seller_name` | الاسم الكامل لـالبائع | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_nationality` | الجنسية | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_address` | العنوان | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_phone` | رقم الهاتف | ✅ مادة قانونية | `sale_messaging_notices_text`، `sale_seller_party_definition` | المادة الأولى: أطراف العقد؛ واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `seller_email` | البريد الإلكتروني | ✅ مادة قانونية | `sale_email_notices_text`، `sale_seller_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `seller_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_commercial_register` | السجل التجاري رقم | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_tax_card` | البطاقة الضريبية رقم | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_legal_representative` | يمثله قانونًا السيد | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_representative_capacity` | بصفته | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_company_address` | مقر الشركة | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `sale_email_notices_text`، `sale_seller_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `buyer_party_type` | صفة المشتري | ✅ مادة قانونية | `sale_buyer_party_definition`، `sale_email_notices_text` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `buyer_name` | الاسم الكامل لـالمشتري | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_nationality` | الجنسية | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_address` | العنوان | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_phone` | رقم الهاتف | ✅ مادة قانونية | `sale_buyer_party_definition`، `sale_messaging_notices_text` | المادة الأولى: أطراف العقد؛ واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `buyer_email` | البريد الإلكتروني | ✅ مادة قانونية | `sale_buyer_party_definition`، `sale_email_notices_text` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `buyer_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_commercial_register` | السجل التجاري رقم | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_tax_card` | البطاقة الضريبية رقم | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_legal_representative` | يمثله قانونًا السيد | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_representative_capacity` | بصفته | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_company_address` | مقر الشركة | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `sale_buyer_party_definition`، `sale_email_notices_text` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `sale_unit_governorate` | المحافظة | ✅ مادة قانونية | `sale_property_jurisdiction_text`، `sale_unit_governorate` | المادة الرابعة: بيانات ووصف الوحدة السكنية؛ المادة الثانية والعشرون: القانون الواجب التطبيق والمحكمة المختصة |
| `sale_unit_city` | المدينة / المركز | ✅ مادة قانونية | `sale_property_jurisdiction_text`، `sale_unit_city` | المادة الرابعة: بيانات ووصف الوحدة السكنية؛ المادة الثانية والعشرون: القانون الواجب التطبيق والمحكمة المختصة |
| `sale_unit_district` | الحي / المنطقة | ✅ مادة قانونية | `sale_unit_district` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_unit_street` | اسم الشارع | ✅ مادة قانونية | `sale_unit_street` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_compound_name` | اسم الكمبوند | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_plot_number` | رقم القطعة | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_adjacency_number` | رقم المجاورة | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_building_number` | رقم العقار | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_building_name` | اسم البرج / العمارة | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_floor_number` | الدور | ✅ مادة قانونية | `sale_floor_number` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_unit_number` | رقم الوحدة | ✅ مادة قانونية | `sale_unit_number` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_unit_area` | المساحة الإجمالية (م²) | ✅ مادة قانونية | `sale_unit_area` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_bedrooms_count` | عدد غرف النوم | ✅ مادة قانونية | `sale_bedrooms_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_reception_count` | عدد صالات الاستقبال | ✅ مادة قانونية | `sale_reception_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_bathrooms_count` | عدد الحمامات | ✅ مادة قانونية | `sale_bathrooms_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_balconies_count` | عدد البلكونات | ✅ مادة قانونية | `sale_balconies_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_kitchen_description` | المطبخ | ✅ مادة قانونية | `sale_kitchen_description` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_finishing_level` | وصف التشطيب | ✅ مادة قانونية | `sale_finishing_level` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter_exists` | هل يوجد عداد الكهرباء؟ | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter` | رقم عداد الكهرباء | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter_type` | نوع عداد الكهرباء | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter_reading` | قراءة عداد الكهرباء عند التسليم (إن كانت معلومة وقت التعاقد) | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter_exists` | هل يوجد عداد المياه؟ | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter` | رقم عداد المياه | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter_type` | نوع عداد المياه | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter_reading` | قراءة عداد المياه عند التسليم (إن كانت معلومة وقت التعاقد) | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter_exists` | هل يوجد عداد الغاز الطبيعي؟ | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter` | رقم عداد الغاز الطبيعي | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter_type` | نوع عداد الغاز الطبيعي | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter_reading` | قراءة عداد الغاز الطبيعي عند التسليم (إن كانت معلومة وقت التعاقد) | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_north_boundary` | الحد البحري | ✅ مادة قانونية | `sale_north_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_south_boundary` | الحد القبلي | ✅ مادة قانونية | `sale_south_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_east_boundary` | الحد الشرقي | ✅ مادة قانونية | `sale_east_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_west_boundary` | الحد الغربي | ✅ مادة قانونية | `sale_west_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `preliminary_ownership_source` | سند الملكية المعتمد | ✅ مادة قانونية | `preliminary_ownership_detail`، `preliminary_ownership_source` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: انتقال الحقوق الناشئة عن البيع وأثره القانوني؛ المادة الرابعة عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة السابعة عشر: التزامات الطرف الأول (البائع) |
| `preliminary_contract_date` | تاريخ عقد البيع الابتدائي | ✅ مادة قانونية | `preliminary_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: انتقال الحقوق الناشئة عن البيع وأثره القانوني؛ المادة الرابعة عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة السابعة عشر: التزامات الطرف الأول (البائع) |
| `custom_contract_date` | تاريخ عقد البيع العرفي | ✅ مادة قانونية | `preliminary_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: انتقال الحقوق الناشئة عن البيع وأثره القانوني؛ المادة الرابعة عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة السابعة عشر: التزامات الطرف الأول (البائع) |
| `ownership_judgment_number` | رقم الحكم القضائي | ✅ مادة قانونية | `preliminary_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: انتقال الحقوق الناشئة عن البيع وأثره القانوني؛ المادة الرابعة عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة السابعة عشر: التزامات الطرف الأول (البائع) |
| `ownership_judgment_year` | سنة الحكم | ✅ مادة قانونية | `preliminary_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: انتقال الحقوق الناشئة عن البيع وأثره القانوني؛ المادة الرابعة عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة السابعة عشر: التزامات الطرف الأول (البائع) |
| `ownership_allocation_authority` | جهة التخصيص | ✅ مادة قانونية | `preliminary_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: انتقال الحقوق الناشئة عن البيع وأثره القانوني؛ المادة الرابعة عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة السابعة عشر: التزامات الطرف الأول (البائع) |
| `sale_ownership_documents` | سند الملكية ومستندات تسلسل التصرف | ✅ قسم مستند | — | قسم المرفقات |
| `sale_total_price` | إجمالي ثمن البيع | ✅ مادة قانونية | `sale_remaining_amount`، `sale_total_price`، `sale_total_price_words` | المادة السادسة: ثمن البيع وطريقة السداد؛ السداد الكامل في مجلس العقد؛ السداد بالتقسيط أو على دفعات |
| `sale_payment_plan` | طريقة سداد ثمن البيع | ✅ مادة قانونية | `@condition:sale_payment_plan`، `sale_delivery_rule_text` | السداد الكامل في مجلس العقد؛ السداد بالتقسيط أو على دفعات؛ أثر الفسخ في حالة التقسيط؛ التسليم في حالة السداد الكامل؛ التسليم في حالة التقسيط؛ المادة السابعة: تسليم الوحدة السكنية؛ المادة الثامنة: انتقال الحيازة والانتفاع؛ المادة الثالثة عشر: تسوية المستحقات والمديونيات (المرافق) وموقف التصالح |
| `sale_payment_method` | وسيلة / وسائل السداد المتفق عليها | ✅ مادة قانونية | `sale_payment_method` | المادة السادسة: ثمن البيع وطريقة السداد؛ السداد بالتقسيط أو على دفعات |
| `sale_down_payment` | الدفعة المقدمة المسددة | ✅ مادة قانونية | `sale_down_payment`، `sale_remaining_amount` | السداد بالتقسيط أو على دفعات |
| `sale_installment_schedule_rows` | جدول الأقساط المتفق عليه | ✅ مادة قانونية | `sale_installment_schedule_text` | السداد بالتقسيط أو على دفعات |
| `sale_installment_grace_days` | فترة السماح عند التأخر في سداد القسط (يوم) | ✅ مادة قانونية | `sale_installment_grace_days` | السداد بالتقسيط أو على دفعات |
| `sale_installment_rescission_compensation_percent` | نسبة التعويض الاتفاقي عند تحقق الفسخ بسبب التأخر في الأقساط (%) | ✅ مادة قانونية | `@condition:sale_installment_rescission_compensation_percent`، `sale_installment_rescission_compensation_percent` | أثر الفسخ في حالة التقسيط |
| `sale_delivery_delay_daily_compensation` | التعويض الاتفاقي عن كل يوم تأخير في التسليم | ✅ مادة قانونية | `sale_delivery_delay_daily_compensation` | التسليم في حالة السداد الكامل؛ التسليم في حالة التقسيط |
| `sale_delivery_delay_threshold_days` | عدد أيام تأخر التسليم التي بعدها يعد الإخلال جوهريًا | ✅ مادة قانونية | `sale_delivery_delay_threshold_days` | التسليم في حالة السداد الكامل؛ التسليم في حالة التقسيط |
| `sale_unit_is_occupied` | الوحدة مؤجرة أو مشغولة بعلاقة قانونية قائمة | ✅ مادة قانونية | `@condition:sale_unit_is_occupied`، `sale_occupancy_status_text` | الوحدة المؤجرة أو المشغولة؛ المادة السابعة: تسليم الوحدة السكنية |
| `sale_occupancy_details` | بيانات الإشغال / العلاقة القانونية القائمة | ✅ مادة قانونية | `sale_occupancy_status_text` | المادة السابعة: تسليم الوحدة السكنية؛ الوحدة المؤجرة أو المشغولة |
| `sale_occupancy_documents` | مستندات الحيازة أو العلاقة القانونية القائمة | ✅ قسم مستند | — | قسم المرفقات |
| `sale_inspection_acknowledged` | أقر بأن المشتري عاين الوحدة معاينة تامة نافية للجهالة الظاهرة | ✅ مادة قانونية | `sale_inspection_ack_text` | المادة السابعة: تسليم الوحدة السكنية |
| `preliminary_garage_status` | موقف الجراج / مكان السيارة | ✅ مادة قانونية | `preliminary_garage_scope_text` | المادة الثالثة: محل العقد؛ المادة العاشرة: ملكية الأرض والحصة الشائعة والأجزاء المشتركة بالعقار |
| `preliminary_hidden_defect_warranty_years` | مدة الضمان التعاقدي للعيوب الخفية (سنة) | ✅ مادة قانونية | `preliminary_hidden_defect_warranty_years` | المادة الحادية عشر: المعاينة المادية النافية للجهالة الفاحشة |
| `preliminary_disposition_tax_payer` | من يتحمل ضريبة التصرفات العقارية؟ | ✅ مادة قانونية | `preliminary_disposition_tax_payer_text` | المادة الثانية عشر: الضرائب والرسوم |
| `preliminary_reconciliation_status` | موقف التصالح على مخالفات البناء | ✅ مادة قانونية | `@condition:preliminary_reconciliation_status`، `preliminary_reconciliation_legal_text` | طلب التصالح القائم — استكماله بواسطة البائع؛ طلب التصالح القائم — استكماله بواسطة المشتري؛ عدم وجود مخالفات تستوجب التصالح؛ المادة الرابعة عشر: إقرارات وضمانات الطرف الأول (البائع) |
| `preliminary_reconciliation_request_number` | رقم طلب التصالح | ✅ مادة قانونية | `preliminary_reconciliation_legal_text`، `preliminary_reconciliation_request_number` | طلب التصالح القائم — استكماله بواسطة البائع؛ طلب التصالح القائم — استكماله بواسطة المشتري؛ المادة الرابعة عشر: إقرارات وضمانات الطرف الأول (البائع) |
| `preliminary_reconciliation_request_year` | سنة طلب التصالح | ✅ مادة قانونية | `preliminary_reconciliation_legal_text`، `preliminary_reconciliation_request_year` | طلب التصالح القائم — استكماله بواسطة البائع؛ طلب التصالح القائم — استكماله بواسطة المشتري؛ المادة الرابعة عشر: إقرارات وضمانات الطرف الأول (البائع) |
| `preliminary_reconciliation_documents` | مستندات طلب التصالح | ✅ قسم مستند | — | قسم المرفقات |
| `preliminary_reconciliation_responsible_party` | من يستكمل إجراءات التصالح؟ | ✅ مادة قانونية | `@condition:preliminary_reconciliation_responsible_party`، `preliminary_reconciliation_legal_text` | طلب التصالح القائم — استكماله بواسطة البائع؛ طلب التصالح القائم — استكماله بواسطة المشتري؛ المادة الرابعة عشر: إقرارات وضمانات الطرف الأول (البائع) |
| `preliminary_contractual_penalty_enabled` | إضافة الشرط الجزائي الاتفاقي الاختياري | ✅ مادة قانونية | `@condition:preliminary_contractual_penalty_enabled` | الشرط الجزائي الاتفاقي |
| `preliminary_contractual_penalty_amount` | قيمة الشرط الجزائي الاتفاقي | ✅ مادة قانونية | `preliminary_contractual_penalty_amount` | الشرط الجزائي الاتفاقي |
| `preliminary_contractual_penalty_trigger` | الحالة / الإخلال الذي يستحق عنده الشرط الجزائي | ✅ مادة قانونية | `preliminary_contractual_penalty_trigger` | الشرط الجزائي الاتفاقي |
| `sale_general_breach_cure_days` | مهلة إزالة الإخلال الجوهري بعد الإعذار (يوم) | ✅ مادة قانونية | `sale_general_breach_cure_days` | المادة التاسعة عشر: الفسخ والإخلال بأحكام العقد |
| `sale_force_majeure_notice_days` | مهلة إخطار القوة القاهرة / الظرف الطارئ (يوم) | ✅ مادة قانونية | `sale_force_majeure_notice_days` | المادة العشرون: القوة القاهرة والظروف الطارئة |
| `sale_notice_change_days` | مهلة إخطار الطرف الآخر بتغيير بيانات الاتصال (يوم) | ✅ مادة قانونية | `sale_notice_change_days` | المادة الحادية والعشرون: الإخطارات والموطن المختار |
| `sale_email_notices_enabled` | اعتماد البريد الإلكتروني في الإخطارات (اختياري) | ✅ مادة قانونية | `@condition:sale_email_notices_enabled`، `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_notice_use_party_emails` | استخدام البريد الإلكتروني المسجل للطرفين | ✅ مادة قانونية | `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_notice_seller_email` | البريد المعتمد للبائع | ✅ مادة قانونية | `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_notice_buyer_email` | البريد المعتمد للمشتري | ✅ مادة قانونية | `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_messaging_enabled` | اعتماد واتساب / المراسلة الإلكترونية (اختياري) | ✅ مادة قانونية | `@condition:sale_messaging_enabled`، `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_notice_use_party_phones` | استخدام أرقام الهاتف المسجلة للطرفين | ✅ مادة قانونية | `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_notice_seller_phone` | رقم واتساب / المراسلة المعتمد للبائع | ✅ مادة قانونية | `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_notice_buyer_phone` | رقم واتساب / المراسلة المعتمد للمشتري | ✅ مادة قانونية | `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_seller_identity_copy` | صورة بطاقة الرقم القومي أو جواز السفر للبائع / ممثله القانوني عند كون البائع شركة | ✅ قسم مستند | — | قسم المرفقات |
| `sale_buyer_identity_copy` | صورة بطاقة الرقم القومي أو جواز السفر للمشتري / ممثله القانوني عند كون المشتري شركة | ✅ قسم مستند | — | قسم المرفقات |
| `sale_utility_receipts` | آخر إيصالات / بيانات المرافق (إن توافرت) | ✅ قسم مستند | — | قسم المرفقات |
| `sale_building_docs` | رخصة البناء / مستندات التصالح / المستندات التنظيمية (إن وجدت) | ✅ قسم مستند | — | قسم المرفقات |
| `sale_handover_report` | محضر استلام الوحدة (إن تم تحريره) | ✅ قسم مستند | — | قسم المرفقات |
| `sale_engineering_docs` | رسومات هندسية / مخططات / شهادة بيانات (إن وجدت) | ✅ قسم مستند | — | قسم المرفقات |
| `sale_extra_docs` | مستندات أخرى متفق عليها | ✅ قسم مستند | — | قسم المرفقات |
| `sale_witness_1_enabled` | إضافة الشاهد الأول (إن وجد) | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_1_name` | اسم الشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_1_national_id` | الرقم القومي للشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_2_enabled` | إضافة الشاهد الثاني (إن وجد) | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_2_name` | اسم الشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_2_national_id` | الرقم القومي للشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |

## عقد بيع قابل للتسجيل بالشهر العقاري

- إجمالي الحقول: **122**
- مرتبطة بمواد قانونية: **108**
- مرتبطة بقسم مستند مستقل: **14**
- غير مرتبطة: **0**

| المفتاح | اسم الحقل | الحالة | عبر المتغير | موضع الظهور |
|---|---|---|---|---|
| `contract_date` | تاريخ العقد | ✅ مادة قانونية | `contract_date` | المادة الأولى: أطراف العقد؛ المادة الحادية والعشرون: الأحكام العامة |
| `sale_contract_city` | مدينة تحرير العقد | ✅ مادة قانونية | `sale_contract_city` | المادة الحادية والعشرون: الأحكام العامة |
| `seller_party_type` | صفة البائع | ✅ مادة قانونية | `sale_email_notices_text`، `sale_seller_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `seller_name` | الاسم الكامل لـالبائع | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_nationality` | الجنسية | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_address` | العنوان | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_phone` | رقم الهاتف | ✅ مادة قانونية | `sale_messaging_notices_text`، `sale_seller_party_definition` | المادة الأولى: أطراف العقد؛ واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `seller_email` | البريد الإلكتروني | ✅ مادة قانونية | `sale_email_notices_text`، `sale_seller_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `seller_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_commercial_register` | السجل التجاري رقم | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_tax_card` | البطاقة الضريبية رقم | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_legal_representative` | يمثله قانونًا السيد | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_representative_capacity` | بصفته | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_company_address` | مقر الشركة | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `sale_email_notices_text`، `sale_seller_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `buyer_party_type` | صفة المشتري | ✅ مادة قانونية | `sale_buyer_party_definition`، `sale_email_notices_text` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `buyer_name` | الاسم الكامل لـالمشتري | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_nationality` | الجنسية | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_address` | العنوان | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_phone` | رقم الهاتف | ✅ مادة قانونية | `sale_buyer_party_definition`، `sale_messaging_notices_text` | المادة الأولى: أطراف العقد؛ واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `buyer_email` | البريد الإلكتروني | ✅ مادة قانونية | `sale_buyer_party_definition`، `sale_email_notices_text` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `buyer_company_name` | اسم الشركة / المنشأة | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_company_legal_form` | الشكل القانوني | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_commercial_register` | السجل التجاري رقم | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_tax_card` | البطاقة الضريبية رقم | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_legal_representative` | يمثله قانونًا السيد | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_representative_capacity` | بصفته | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_company_address` | مقر الشركة | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_company_email` | البريد الإلكتروني للشركة | ✅ مادة قانونية | `sale_buyer_party_definition`، `sale_email_notices_text` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `sale_unit_governorate` | المحافظة | ✅ مادة قانونية | `sale_property_jurisdiction_text`، `sale_unit_governorate` | المادة الرابعة: بيانات ووصف الوحدة السكنية؛ المادة العشرون: القانون الواجب التطبيق |
| `sale_unit_city` | المدينة / المركز | ✅ مادة قانونية | `sale_property_jurisdiction_text`، `sale_unit_city` | المادة الرابعة: بيانات ووصف الوحدة السكنية؛ المادة العشرون: القانون الواجب التطبيق |
| `sale_unit_district` | الحي / المنطقة | ✅ مادة قانونية | `sale_unit_district` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_unit_street` | اسم الشارع | ✅ مادة قانونية | `sale_unit_street` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_compound_name` | اسم الكمبوند | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_plot_number` | رقم القطعة | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_adjacency_number` | رقم المجاورة | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_building_number` | رقم العقار | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_building_name` | اسم البرج / العمارة | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_floor_number` | الدور | ✅ مادة قانونية | `sale_floor_number` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_unit_number` | رقم الوحدة | ✅ مادة قانونية | `sale_unit_number` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_unit_area` | المساحة الإجمالية (م²) | ✅ مادة قانونية | `sale_unit_area` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_bedrooms_count` | عدد غرف النوم | ✅ مادة قانونية | `sale_bedrooms_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_reception_count` | عدد صالات الاستقبال | ✅ مادة قانونية | `sale_reception_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_bathrooms_count` | عدد الحمامات | ✅ مادة قانونية | `sale_bathrooms_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_balconies_count` | عدد البلكونات | ✅ مادة قانونية | `sale_balconies_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_kitchen_description` | المطبخ | ✅ مادة قانونية | `sale_kitchen_description` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_finishing_level` | وصف التشطيب | ✅ مادة قانونية | `sale_finishing_level` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter_exists` | هل يوجد عداد الكهرباء؟ | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter` | رقم عداد الكهرباء | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter_type` | نوع عداد الكهرباء | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter_reading` | قراءة عداد الكهرباء عند التسليم (إن كانت معلومة وقت التعاقد) | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter_exists` | هل يوجد عداد المياه؟ | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter` | رقم عداد المياه | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter_type` | نوع عداد المياه | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter_reading` | قراءة عداد المياه عند التسليم (إن كانت معلومة وقت التعاقد) | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter_exists` | هل يوجد عداد الغاز الطبيعي؟ | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter` | رقم عداد الغاز الطبيعي | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter_type` | نوع عداد الغاز الطبيعي | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter_reading` | قراءة عداد الغاز الطبيعي عند التسليم (إن كانت معلومة وقت التعاقد) | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_north_boundary` | الحد البحري | ✅ مادة قانونية | `sale_north_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_south_boundary` | الحد القبلي | ✅ مادة قانونية | `sale_south_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_east_boundary` | الحد الشرقي | ✅ مادة قانونية | `sale_east_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_west_boundary` | الحد الغربي | ✅ مادة قانونية | `sale_west_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `registered_title_type` | اختر سند ملكية واحدًا | ✅ مادة قانونية | `registered_title_type`، `registrable_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: نقل الملكية وإجراءات التسجيل بالشهر العقاري؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `registered_deed_number` | رقم العقد المسجل | ✅ مادة قانونية | `registrable_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: نقل الملكية وإجراءات التسجيل بالشهر العقاري؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `registered_deed_year` | سنة العقد المسجل | ✅ مادة قانونية | `registrable_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: نقل الملكية وإجراءات التسجيل بالشهر العقاري؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `registry_office` | مكتب / مأمورية الشهر العقاري | ✅ مادة قانونية | `registrable_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: نقل الملكية وإجراءات التسجيل بالشهر العقاري؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `registered_judgment_number` | رقم الدعوى / الحكم | ✅ مادة قانونية | `registrable_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: نقل الملكية وإجراءات التسجيل بالشهر العقاري؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `registered_judgment_year` | سنة الدعوى / الحكم | ✅ مادة قانونية | `registrable_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: نقل الملكية وإجراءات التسجيل بالشهر العقاري؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `registered_judgment_court` | المحكمة | ✅ مادة قانونية | `registrable_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: نقل الملكية وإجراءات التسجيل بالشهر العقاري؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `registered_allocation_authority` | جهة إصدار عقد التخصيص | ✅ مادة قانونية | `registrable_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: نقل الملكية وإجراءات التسجيل بالشهر العقاري؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `registered_other_title` | بيان السند الآخر | ✅ مادة قانونية | `registrable_ownership_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: نقل الملكية وإجراءات التسجيل بالشهر العقاري؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `sale_ownership_documents` | أصل / صورة رسمية من سند الملكية ومستنداته | ✅ قسم مستند | — | قسم المرفقات |
| `sale_total_price` | إجمالي ثمن البيع | ✅ مادة قانونية | `sale_remaining_amount`، `sale_total_price`، `sale_total_price_words` | المادة السادسة: ثمن البيع وإقرار بالمخالصة النهائية؛ السداد الكامل في مجلس العقد؛ السداد بالتقسيط أو على دفعات |
| `sale_payment_plan` | طريقة سداد ثمن البيع | ✅ مادة قانونية | `@condition:sale_payment_plan`، `sale_delivery_rule_text` | السداد الكامل في مجلس العقد؛ السداد بالتقسيط أو على دفعات؛ التسليم في حالة السداد الكامل؛ التسليم في حالة التقسيط؛ المادة السابعة: تسليم الوحدة السكنية؛ المادة الثامنة: انتقال الحيازة والانتفاع وتبعة الهالك؛ المادة الحادية عشر: تسوية المستحقات والمديونيات (المرافق) |
| `sale_payment_method` | وسيلة / وسائل السداد المتفق عليها | ✅ مادة قانونية | `sale_payment_method` | المادة السادسة: ثمن البيع وإقرار بالمخالصة النهائية؛ السداد بالتقسيط أو على دفعات |
| `sale_down_payment` | الدفعة المقدمة المسددة | ✅ مادة قانونية | `sale_down_payment`، `sale_remaining_amount` | السداد بالتقسيط أو على دفعات |
| `sale_installment_schedule_rows` | جدول الأقساط المتفق عليه | ✅ مادة قانونية | `sale_installment_schedule_text` | السداد بالتقسيط أو على دفعات |
| `sale_installment_grace_days` | فترة السماح عند التأخر في سداد القسط (يوم) | ✅ مادة قانونية | `sale_installment_grace_days` | السداد بالتقسيط أو على دفعات |
| `sale_delivery_delay_daily_compensation` | التعويض الاتفاقي عن كل يوم تأخير في التسليم | ✅ مادة قانونية | `sale_delivery_delay_daily_compensation` | التسليم في حالة السداد الكامل؛ التسليم في حالة التقسيط |
| `sale_delivery_delay_threshold_days` | عدد أيام تأخر التسليم التي بعدها يعد الإخلال جوهريًا | ✅ مادة قانونية | `sale_delivery_delay_threshold_days` | التسليم في حالة السداد الكامل؛ التسليم في حالة التقسيط |
| `sale_unit_is_occupied` | الوحدة مؤجرة أو مشغولة بعلاقة قانونية قائمة | ✅ مادة قانونية | `@condition:sale_unit_is_occupied`، `sale_occupancy_status_text` | الوحدة المؤجرة أو المشغولة؛ المادة السابعة: تسليم الوحدة السكنية |
| `sale_occupancy_details` | بيانات الإشغال / العلاقة القانونية القائمة | ✅ مادة قانونية | `sale_occupancy_status_text` | المادة السابعة: تسليم الوحدة السكنية؛ الوحدة المؤجرة أو المشغولة |
| `sale_occupancy_documents` | مستندات الحيازة أو العلاقة القانونية القائمة | ✅ قسم مستند | — | قسم المرفقات |
| `sale_inspection_acknowledged` | أقر بأن المشتري عاين الوحدة معاينة تامة نافية للجهالة الظاهرة | ✅ مادة قانونية | `sale_inspection_ack_text` | المادة السابعة: تسليم الوحدة السكنية |
| `registrable_disposition_tax_payer` | الطرف المحدد لسداد ضريبة التصرفات العقارية بين الطرفين | ✅ مادة قانونية | `registrable_disposition_tax_payer_text` | المادة العاشرة: الضرائب والرسوم |
| `registrable_contractual_penalty_enabled` | إضافة الشرط الجزائي الاتفاقي الاختياري | ✅ مادة قانونية | `@condition:registrable_contractual_penalty_enabled` | الشرط الجزائي الاتفاقي |
| `registrable_contractual_penalty_amount` | قيمة الشرط الجزائي الاتفاقي | ✅ مادة قانونية | `registrable_contractual_penalty_amount` | الشرط الجزائي الاتفاقي |
| `registrable_contractual_penalty_trigger` | الحالة / الإخلال الذي يستحق عنده الشرط الجزائي | ✅ مادة قانونية | `registrable_contractual_penalty_trigger` | الشرط الجزائي الاتفاقي |
| `sale_general_breach_cure_days` | مهلة إزالة الإخلال الجوهري بعد الإعذار (يوم) | ✅ مادة قانونية | `sale_general_breach_cure_days` | المادة السابعة عشر: الإخلال بأحكام العقد |
| `sale_force_majeure_notice_days` | مهلة إخطار القوة القاهرة / الظرف الطارئ (يوم) | ✅ مادة قانونية | `sale_force_majeure_notice_days` | المادة الثامنة عشر: القوة القاهرة والظروف الطارئة |
| `sale_notice_change_days` | مهلة إخطار الطرف الآخر بتغيير بيانات الاتصال (يوم) | ✅ مادة قانونية | `sale_notice_change_days` | المادة التاسعة عشر: الإخطارات والموطن المختار |
| `sale_email_notices_enabled` | اعتماد البريد الإلكتروني في الإخطارات (اختياري) | ✅ مادة قانونية | `@condition:sale_email_notices_enabled`، `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_notice_use_party_emails` | استخدام البريد الإلكتروني المسجل للطرفين | ✅ مادة قانونية | `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_notice_seller_email` | البريد المعتمد للبائع | ✅ مادة قانونية | `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_notice_buyer_email` | البريد المعتمد للمشتري | ✅ مادة قانونية | `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_messaging_enabled` | اعتماد واتساب / المراسلة الإلكترونية (اختياري) | ✅ مادة قانونية | `@condition:sale_messaging_enabled`، `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_notice_use_party_phones` | استخدام أرقام الهاتف المسجلة للطرفين | ✅ مادة قانونية | `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_notice_seller_phone` | رقم واتساب / المراسلة المعتمد للبائع | ✅ مادة قانونية | `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_notice_buyer_phone` | رقم واتساب / المراسلة المعتمد للمشتري | ✅ مادة قانونية | `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_seller_identity_copy` | صورة بطاقة الرقم القومي أو جواز السفر للبائع / ممثله القانوني عند كون البائع شركة | ✅ قسم مستند | — | قسم المرفقات |
| `sale_buyer_identity_copy` | صورة بطاقة الرقم القومي أو جواز السفر للمشتري / ممثله القانوني عند كون المشتري شركة | ✅ قسم مستند | — | قسم المرفقات |
| `sale_utility_receipts` | آخر إيصالات / مخالصات المرافق (إن وجدت) | ✅ قسم مستند | — | قسم المرفقات |
| `sale_building_docs` | رخصة البناء / النماذج المشهرة / مستندات التصالح أو المستندات الهندسية (إن وجدت) | ✅ قسم مستند | — | قسم المرفقات |
| `registrable_negative_certificate_enabled` | إرفاق شهادة تصرفات عقارية سلبية حديثة (نموذج 19) | ✅ مادة قانونية | `@condition:registrable_negative_certificate_enabled`، `registrable_negative_certificate_text` | شهادة التصرفات العقارية السلبية (نموذج 19)؛ المادة الثانية والعشرون: المرفقات |
| `registrable_negative_certificate` | شهادة التصرفات العقارية السلبية | ✅ قسم مستند | — | قسم المرفقات |
| `sale_extra_docs` | مستندات أو خرائط أو إقرارات أخرى متفق عليها | ✅ قسم مستند | — | قسم المرفقات |
| `sale_witness_1_enabled` | إضافة الشاهد الأول (إن وجد) | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_1_name` | اسم الشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_1_national_id` | الرقم القومي للشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_2_enabled` | إضافة الشاهد الثاني (إن وجد) | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_2_name` | اسم الشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_2_national_id` | الرقم القومي للشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |

## عقد بيع وحدة عن طريق الورث

- إجمالي الحقول: **114**
- مرتبطة بمواد قانونية: **97**
- مرتبطة بقسم مستند مستقل: **17**
- غير مرتبطة: **0**

| المفتاح | اسم الحقل | الحالة | عبر المتغير | موضع الظهور |
|---|---|---|---|---|
| `contract_date` | تاريخ العقد | ✅ مادة قانونية | `contract_date` | المادة الأولى: أطراف العقد؛ المادة الحادية والعشرون: الأحكام العامة |
| `sale_contract_city` | مدينة تحرير العقد | ✅ مادة قانونية | `sale_contract_city` | المادة الحادية والعشرون: الأحكام العامة |
| `seller_name` | الاسم الكامل لـالبائع | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_nationality` | الجنسية | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_address` | العنوان | ✅ مادة قانونية | `sale_seller_party_definition` | المادة الأولى: أطراف العقد |
| `seller_phone` | رقم الهاتف | ✅ مادة قانونية | `sale_messaging_notices_text`، `sale_seller_party_definition` | المادة الأولى: أطراف العقد؛ واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `seller_email` | البريد الإلكتروني | ✅ مادة قانونية | `sale_email_notices_text`، `sale_seller_party_definition` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `buyer_name` | الاسم الكامل لـالمشتري | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_nationality` | الجنسية | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_identity_document_type` | نوع مستند إثبات الهوية | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_national_id` | رقم مستند إثبات الهوية | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_id_issuer` | جهة الإصدار | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_id_issue_date` | تاريخ الإصدار | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_address` | العنوان | ✅ مادة قانونية | `sale_buyer_party_definition` | المادة الأولى: أطراف العقد |
| `buyer_phone` | رقم الهاتف | ✅ مادة قانونية | `sale_buyer_party_definition`، `sale_messaging_notices_text` | المادة الأولى: أطراف العقد؛ واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `buyer_email` | البريد الإلكتروني | ✅ مادة قانونية | `sale_buyer_party_definition`، `sale_email_notices_text` | المادة الأولى: أطراف العقد؛ البريد الإلكتروني المعتمد |
| `sale_unit_governorate` | المحافظة | ✅ مادة قانونية | `sale_property_jurisdiction_text`، `sale_unit_governorate` | المادة الرابعة: بيانات ووصف الوحدة السكنية؛ المادة العشرون: القانون الواجب التطبيق |
| `sale_unit_city` | المدينة / المركز | ✅ مادة قانونية | `sale_property_jurisdiction_text`، `sale_unit_city` | المادة الرابعة: بيانات ووصف الوحدة السكنية؛ المادة العشرون: القانون الواجب التطبيق |
| `sale_unit_district` | الحي / المنطقة | ✅ مادة قانونية | `sale_unit_district` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_unit_street` | اسم الشارع | ✅ مادة قانونية | `sale_unit_street` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_compound_name` | اسم الكمبوند | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_plot_number` | رقم القطعة | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_adjacency_number` | رقم المجاورة | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_building_number` | رقم العقار | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_building_name` | اسم البرج / العمارة | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_floor_number` | الدور | ✅ مادة قانونية | `sale_floor_number` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_unit_number` | رقم الوحدة | ✅ مادة قانونية | `sale_unit_number` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_unit_area` | المساحة الإجمالية (م²) | ✅ مادة قانونية | `sale_unit_area` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_bedrooms_count` | عدد غرف النوم | ✅ مادة قانونية | `sale_bedrooms_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_reception_count` | عدد صالات الاستقبال | ✅ مادة قانونية | `sale_reception_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_bathrooms_count` | عدد الحمامات | ✅ مادة قانونية | `sale_bathrooms_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_balconies_count` | عدد البلكونات | ✅ مادة قانونية | `sale_balconies_count` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_kitchen_description` | المطبخ | ✅ مادة قانونية | `sale_kitchen_description` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_finishing_level` | وصف التشطيب | ✅ مادة قانونية | `sale_finishing_level` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter_exists` | هل يوجد عداد الكهرباء؟ | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter` | رقم عداد الكهرباء | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter_type` | نوع عداد الكهرباء | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_electricity_meter_reading` | قراءة عداد الكهرباء عند التسليم (إن كانت معلومة وقت التعاقد) | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter_exists` | هل يوجد عداد المياه؟ | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter` | رقم عداد المياه | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter_type` | نوع عداد المياه | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_water_meter_reading` | قراءة عداد المياه عند التسليم (إن كانت معلومة وقت التعاقد) | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter_exists` | هل يوجد عداد الغاز الطبيعي؟ | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter` | رقم عداد الغاز الطبيعي | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter_type` | نوع عداد الغاز الطبيعي | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_gas_meter_reading` | قراءة عداد الغاز الطبيعي عند التسليم (إن كانت معلومة وقت التعاقد) | ✅ مادة قانونية | `sale_property_additional_details` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_north_boundary` | الحد البحري | ✅ مادة قانونية | `sale_north_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_south_boundary` | الحد القبلي | ✅ مادة قانونية | `sale_south_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_east_boundary` | الحد الشرقي | ✅ مادة قانونية | `sale_east_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `sale_west_boundary` | الحد الغربي | ✅ مادة قانونية | `sale_west_boundary` | المادة الرابعة: بيانات ووصف الوحدة السكنية |
| `deceased_owner_name` | اسم المورث | ✅ مادة قانونية | `deceased_owner_name`، `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_declaration_number` | رقم إعلام الوراثة | ✅ مادة قانونية | `inheritance_declaration_number`، `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_declaration_court` | المحكمة الصادر منها إعلام الوراثة | ✅ مادة قانونية | `inheritance_declaration_court`، `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_declaration_date` | تاريخ إعلام الوراثة | ✅ مادة قانونية | `inheritance_declaration_date`، `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `deceased_title_description` | بيان سند ملكية المورث / المستند المثبت لحقه | ✅ مادة قانونية | `deceased_title_description` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_disposition_basis` | السند القانوني الذي يثبت حق البائع في التصرف | ✅ مادة قانونية | `inheritance_disposition_basis`، `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_poa_number` | رقم التوكيل | ✅ مادة قانونية | `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_poa_year` | سنة التوكيل | ✅ مادة قانونية | `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_poa_office` | مكتب التوثيق | ✅ مادة قانونية | `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_poa_date` | تاريخ التوكيل | ✅ مادة قانونية | `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_partition_date` | تاريخ عقد القسمة والتراضي | ✅ مادة قانونية | `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_relinquishment_date` | تاريخ عقد التخارج أو التنازل | ✅ مادة قانونية | `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_heirs_sale_date` | تاريخ عقد البيع أو التصرف من باقي الورثة | ✅ مادة قانونية | `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_other_basis` | بيان السند القانوني الآخر | ✅ مادة قانونية | `inheritance_disposition_detail` | المادة الخامسة: مصدر ملكية البائع للعقار (سند الملكية)؛ المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع)؛ المادة الخامسة عشر: التزامات الطرف الأول (البائع) |
| `inheritance_no_minors_ack` | أقر بأن جميع الورثة كاملو الأهلية ولا يوجد بينهم قاصر أو ناقص/عديم أهلية أو حالة تستوجب إذنًا قضائيًا خاصًا | ✅ مادة قانونية | `inheritance_heirs_capacity_text` | المادة التاسعة: المستندات المؤيدة للميراث وصفة الطرف الاول في التصرف؛ المادة الثانية عشر: إقرارات وضمانات الطرف الأول (البائع) |
| `sale_total_price` | إجمالي ثمن البيع | ✅ مادة قانونية | `sale_remaining_amount`، `sale_total_price`، `sale_total_price_words` | المادة السادسة: ثمن البيع وإقرار بالمخالصة النهائية؛ السداد الكامل في مجلس العقد؛ السداد بالتقسيط أو على دفعات |
| `sale_payment_plan` | طريقة سداد ثمن البيع | ✅ مادة قانونية | `@condition:sale_payment_plan`، `sale_delivery_rule_text` | السداد الكامل في مجلس العقد؛ السداد بالتقسيط أو على دفعات؛ أثر الفسخ في حالة التقسيط؛ التسليم في حالة السداد الكامل؛ التسليم في حالة التقسيط؛ المادة السابعة: تسليم الوحدة السكنية؛ المادة الثامنة: انتقال الحيازة والانتفاع؛ المادة الحادية عشر: تسوية المستحقات والمديونيات (المرافق) |
| `sale_payment_method` | وسيلة / وسائل السداد المتفق عليها | ✅ مادة قانونية | `sale_payment_method` | المادة السادسة: ثمن البيع وإقرار بالمخالصة النهائية؛ السداد بالتقسيط أو على دفعات |
| `sale_down_payment` | الدفعة المقدمة المسددة | ✅ مادة قانونية | `sale_down_payment`، `sale_remaining_amount` | السداد بالتقسيط أو على دفعات |
| `sale_installment_schedule_rows` | جدول الأقساط المتفق عليه | ✅ مادة قانونية | `sale_installment_schedule_text` | السداد بالتقسيط أو على دفعات |
| `sale_installment_grace_days` | فترة السماح عند التأخر في سداد القسط (يوم) | ✅ مادة قانونية | `sale_installment_grace_days` | السداد بالتقسيط أو على دفعات |
| `sale_installment_rescission_compensation_percent` | نسبة التعويض الاتفاقي عند تحقق الفسخ بسبب التأخر في الأقساط (%) | ✅ مادة قانونية | `@condition:sale_installment_rescission_compensation_percent`، `sale_installment_rescission_compensation_percent` | أثر الفسخ في حالة التقسيط |
| `sale_delivery_delay_daily_compensation` | التعويض الاتفاقي عن كل يوم تأخير في التسليم | ✅ مادة قانونية | `sale_delivery_delay_daily_compensation` | التسليم في حالة السداد الكامل؛ التسليم في حالة التقسيط |
| `sale_delivery_delay_threshold_days` | عدد أيام تأخر التسليم التي بعدها يعد الإخلال جوهريًا | ✅ مادة قانونية | `sale_delivery_delay_threshold_days` | التسليم في حالة السداد الكامل؛ التسليم في حالة التقسيط |
| `sale_unit_is_occupied` | الوحدة مؤجرة أو مشغولة بعلاقة قانونية قائمة | ✅ مادة قانونية | `@condition:sale_unit_is_occupied`، `sale_occupancy_status_text` | الوحدة المؤجرة أو المشغولة؛ المادة السابعة: تسليم الوحدة السكنية |
| `sale_occupancy_details` | بيانات الإشغال / العلاقة القانونية القائمة | ✅ مادة قانونية | `sale_occupancy_status_text` | المادة السابعة: تسليم الوحدة السكنية؛ الوحدة المؤجرة أو المشغولة |
| `sale_occupancy_documents` | مستندات الحيازة أو العلاقة القانونية القائمة | ✅ قسم مستند | — | قسم المرفقات |
| `sale_inspection_acknowledged` | أقر بأن المشتري عاين الوحدة معاينة تامة نافية للجهالة الظاهرة | ✅ مادة قانونية | `sale_inspection_ack_text` | المادة السابعة: تسليم الوحدة السكنية |
| `inherited_disposition_tax_payer` | الطرف المحدد لسداد ضريبة التصرفات العقارية بين الطرفين | ✅ مادة قانونية | `inherited_disposition_tax_payer_text` | المادة العاشرة: الضرائب والرسوم |
| `inherited_contractual_penalty_enabled` | إضافة شرط جزائي عام متفق عليه | ✅ مادة قانونية | `inherited_contractual_penalty_text` | المادة السابعة عشر: الفسخ والإخلال بأحكام العقد |
| `inherited_contractual_penalty_amount` | قيمة الشرط الجزائي الاتفاقي | ✅ مادة قانونية | `inherited_contractual_penalty_text` | المادة السابعة عشر: الفسخ والإخلال بأحكام العقد |
| `inherited_contractual_penalty_trigger` | الحالة / الإخلال الذي يستحق عنده الشرط الجزائي | ✅ مادة قانونية | `inherited_contractual_penalty_text` | المادة السابعة عشر: الفسخ والإخلال بأحكام العقد |
| `sale_general_breach_cure_days` | مهلة إزالة الإخلال الجوهري بعد الإعذار (يوم) | ✅ مادة قانونية | `sale_general_breach_cure_days` | المادة السابعة عشر: الفسخ والإخلال بأحكام العقد |
| `sale_force_majeure_notice_days` | مهلة إخطار القوة القاهرة / الظرف الطارئ (يوم) | ✅ مادة قانونية | `sale_force_majeure_notice_days` | المادة الثامنة عشر: القوة القاهرة والظروف الطارئة |
| `sale_notice_change_days` | مهلة إخطار الطرف الآخر بتغيير بيانات الاتصال (يوم) | ✅ مادة قانونية | `sale_notice_change_days` | المادة التاسعة عشر: الإخطارات والموطن المختار |
| `sale_amicable_settlement_days` | مدة محاولة التسوية الودية قبل التقاضي (يوم) | ✅ مادة قانونية | `sale_amicable_settlement_days` | المادة العشرون: القانون الواجب التطبيق |
| `sale_email_notices_enabled` | اعتماد البريد الإلكتروني في الإخطارات (اختياري) | ✅ مادة قانونية | `@condition:sale_email_notices_enabled`، `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_notice_use_party_emails` | استخدام البريد الإلكتروني المسجل للطرفين | ✅ مادة قانونية | `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_notice_seller_email` | البريد المعتمد للبائع | ✅ مادة قانونية | `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_notice_buyer_email` | البريد المعتمد للمشتري | ✅ مادة قانونية | `sale_email_notices_text` | البريد الإلكتروني المعتمد |
| `sale_messaging_enabled` | اعتماد واتساب / المراسلة الإلكترونية (اختياري) | ✅ مادة قانونية | `@condition:sale_messaging_enabled`، `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_notice_use_party_phones` | استخدام أرقام الهاتف المسجلة للطرفين | ✅ مادة قانونية | `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_notice_seller_phone` | رقم واتساب / المراسلة المعتمد للبائع | ✅ مادة قانونية | `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_notice_buyer_phone` | رقم واتساب / المراسلة المعتمد للمشتري | ✅ مادة قانونية | `sale_messaging_notices_text` | واتساب / وسائل المراسلة الإلكترونية المعتمدة |
| `sale_seller_identity_copy` | صورة بطاقة الرقم القومي أو جواز السفر للبائع / ممثله القانوني عند كون البائع شركة | ✅ قسم مستند | — | قسم المرفقات |
| `sale_buyer_identity_copy` | صورة بطاقة الرقم القومي أو جواز السفر للمشتري / ممثله القانوني عند كون المشتري شركة | ✅ قسم مستند | — | قسم المرفقات |
| `inheritance_declaration_attachment` | صورة إعلام الوراثة | ✅ قسم مستند | — | قسم المرفقات |
| `deceased_death_certificate` | صورة شهادة وفاة المورث | ✅ قسم مستند | — | قسم المرفقات |
| `deceased_title_document` | صورة سند ملكية المورث أو المستند المثبت لحقه | ✅ قسم مستند | — | قسم المرفقات |
| `inheritance_disposition_basis_attachment` | صورة سند حق البائع في التصرف بحسب الحالة المختارة | ✅ قسم مستند | — | قسم المرفقات |
| `sale_utility_receipts` | آخر إيصالات / بيانات المرافق (إن وجدت) | ✅ قسم مستند | — | قسم المرفقات |
| `sale_building_docs` | رخصة البناء / مستندات التصالح / المستندات التنظيمية أو الهندسية (إن وجدت) | ✅ قسم مستند | — | قسم المرفقات |
| `sale_handover_report` | محضر استلام الوحدة (إن تم تحريره) | ✅ قسم مستند | — | قسم المرفقات |
| `sale_extra_docs` | مستندات أو خرائط أو رسومات أخرى متفق عليها | ✅ قسم مستند | — | قسم المرفقات |
| `sale_witness_1_enabled` | إضافة الشاهد الأول (إن وجد) | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_1_name` | اسم الشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_1_national_id` | الرقم القومي للشاهد الأول | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_2_enabled` | إضافة الشاهد الثاني (إن وجد) | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_2_name` | اسم الشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
| `sale_witness_2_national_id` | الرقم القومي للشاهد الثاني | ✅ قسم مستند | — | قسم التوقيعات والشهود |
