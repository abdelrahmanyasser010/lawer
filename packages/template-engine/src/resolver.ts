import type {
  ConditionDefinition,
  ContractDraftData,
  ContractFieldValue,
  ContractTemplateDefinition,
  LegalClauseDefinition,
  ResolvedWizardDefinition,
  WizardFieldDefinition,
  WizardStepDefinition,
} from "./types";

function primitiveValue(value: ContractFieldValue | undefined): string | number | boolean | null | undefined {
  if (Array.isArray(value)) return undefined;
  return value;
}

export function evaluateCondition(
  condition: ConditionDefinition | undefined,
  fieldValues: ContractDraftData["fieldValues"],
): boolean {
  if (!condition) return true;
  if ("all" in condition) return condition.all.every((item) => evaluateCondition(item, fieldValues));
  if ("any" in condition) return condition.any.some((item) => evaluateCondition(item, fieldValues));
  if ("not" in condition) return !evaluateCondition(condition.not, fieldValues);

  const current = primitiveValue(fieldValues[condition.fieldKey]);
  switch (condition.operator) {
    case "equals":
      return current === condition.value;
    case "not_equals":
      return current !== condition.value;
    case "truthy":
      return Boolean(current);
    case "falsy":
      return !current;
    case "includes":
      return String(current ?? "").includes(String(condition.value ?? ""));
    default:
      return true;
  }
}

function insertStepsBefore(
  steps: WizardStepDefinition[],
  insertedSteps: WizardStepDefinition[],
  beforeKey: string,
): WizardStepDefinition[] {
  const index = steps.findIndex((step) => step.key === beforeKey);
  if (index < 0) return [...steps, ...insertedSteps];
  return [...steps.slice(0, index), ...insertedSteps, ...steps.slice(index)];
}

export function findInvalidOptionalClauseKeys(
  template: ContractTemplateDefinition,
  variantKey: string,
  selectedOptionalClauseKeys: string[],
): string[] {
  const variant = template.variants.find((item) => item.key === variantKey);
  if (!variant) return [...selectedOptionalClauseKeys];

  return selectedOptionalClauseKeys.filter((clauseKey) => {
    const clause = template.optionalClauses.find((item) => item.key === clauseKey);
    return !clause ||
      !variant.allowedOptionalClauseKeys.includes(clause.key) ||
      !clause.applicableVariantKeys.includes(variant.key);
  });
}

export function resolveWizardDefinition(
  template: ContractTemplateDefinition,
  variantKey: string,
  selectedOptionalClauseKeys: string[],
  fieldValues: ContractDraftData["fieldValues"],
): ResolvedWizardDefinition {
  const variant = template.variants.find((item) => item.key === variantKey);
  if (!variant) {
    throw new Error(`Variant ${variantKey} is not available for ${template.slug}`);
  }

  let steps = variant.steps.map((step) => ({ ...step, fields: [...step.fields] }));
  const activeClauseKeys = new Set(variant.requiredClauseKeys);
  const effectiveClauseKeys = [...new Set(selectedOptionalClauseKeys)];

  for (const clauseKey of effectiveClauseKeys) {
    const clause = template.optionalClauses.find(
      (item) =>
        item.key === clauseKey &&
        variant.allowedOptionalClauseKeys.includes(item.key) &&
        item.applicableVariantKeys.includes(variant.key),
    );
    if (!clause) continue;
    if (!clause.manualFillAnnex) {
      steps = insertStepsBefore(steps, clause.insertedSteps, clause.insertBeforeStepKey);
    }
    clause.legalClauseKeys.forEach((key) => activeClauseKeys.add(key));
  }

  steps = steps
    .filter((step) => evaluateCondition(step.visibleWhen, fieldValues))
    .map((step) => ({
      ...step,
      fields: step.fields
        .filter((field) => evaluateCondition(field.visibleWhen, fieldValues))
        .map((field) => ({
          ...field,
          required: Boolean(field.required || (field.requiredWhen && evaluateCondition(field.requiredWhen, fieldValues))),
        })),
    }));

  return { template, variant, steps, activeClauseKeys: [...activeClauseKeys] };
}

export interface RenderedLegalClause {
  key: string;
  titleAr: string;
  bodyAr: string;
  sourceDocumentName?: string;
  sourcePageStart?: number;
  sourcePageEnd?: number;
}

function formatClauseVariable(
  fieldKey: string,
  value: unknown,
  field: WizardFieldDefinition | undefined,
  fieldValues: Record<string, any>,
): string {
  if (value === "أخرى" || value === "other") {
    const directOther = fieldValues[`${fieldKey}_other`];
    const payerOther = fieldKey.endsWith("_payer")
      ? fieldValues[`${fieldKey.slice(0, -"_payer".length)}_other`]
      : undefined;
    const other = directOther !== undefined && directOther !== null && String(directOther).trim() !== "" ? directOther : payerOther;
    if (other !== undefined && other !== null && String(other).trim() !== "") return String(other).trim();
  }
  const option = field?.options?.find((item) => String(item.value) === String(value));
  if (option) return option.labelAr;
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number") return value.toLocaleString("ar-EG");
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const row = item as Record<string, unknown>;
        const columns: NonNullable<WizardFieldDefinition["columns"]> = field?.columns ?? Object.keys(row).map((key) => ({ key, labelAr: key, type: "text" as const }));
        return columns.map((column) => {
          const raw = row[column.key];
          if (raw === undefined || raw === null || raw === "") return "";
          // A repeater's `other` choice is represented by its free-text details;
          // print the actual agreed value once rather than the internal enum.
          if (column.key === "details" && String(row.method ?? "") === "other") return "";
          if ((raw === "other" || raw === "أخرى") && row.details !== undefined && row.details !== null && String(row.details).trim() !== "") {
            return String(row.details).trim();
          }
          const columnOption = column.options?.find((option) => String(option.value) === String(raw));
          if (columnOption) return columnOption.labelAr;
          if (typeof raw === "boolean") return raw ? "نعم" : "لا";
          const text = String(raw).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.split("-").reverse().join("/");
          return text;
        }).filter(Boolean).join(" — ");
      }
      const option = field?.options?.find((candidate) => String(candidate.value) === String(item));
      return option?.labelAr ?? String(item ?? "");
    }).filter(Boolean).join("، ");
  }
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.split("-").reverse().join("/");
  return text;
}

function derivedClauseVariable(fieldKey: string, fieldValues: Record<string, any>): string | undefined {
  const valueText = (key: string): string | undefined => {
    const value = fieldValues[key];
    if (value === undefined || value === null || String(value).trim() === "") return undefined;
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.split("-").reverse().join("/");
    return text;
  };

  if (fieldKey === "rental_property_additional_details") {
    const parts: string[] = [];
    const add = (label: string, key: string) => { const value = valueText(key); if (value) parts.push(`${label}: ${value}`); };
    const addYesNo = (label: string, key: string) => { const value = valueText(key); if (value) parts.push(`${label}: ${value === "yes" ? "نعم" : value === "no" ? "لا" : value}`); };
    const meterType = (value?: string) => value === "independent" ? "مستقل" : value === "shared" ? "مشترك" : value;

    add("رقم العقار/المبنى", "building_number");
    for (const [prefix, label] of [["electricity", "الكهرباء"], ["water", "المياه"], ["gas", "الغاز الطبيعي"]] as const) {
      const number = valueText(`${prefix}_meter`);
      const type = meterType(valueText(`${prefix}_meter_type`));
      if (number || type) parts.push(`عداد ${label}: ${number ? `رقم ${number}` : ""}${number && type ? " — " : ""}${type ? `نوعه ${type}` : ""}`);
    }
    if (fieldValues.residential_property_type !== undefined) {
      add("اسم الكمبوند", "residential_compound_name"); add("رقم القطعة", "residential_plot_number"); add("رقم المجاورة", "residential_adjacency_number"); add("اسم البرج/العمارة", "residential_building_name");
      const annexes: string[] = [];
      if (fieldValues.residential_includes_garage) annexes.push("جراج"); if (fieldValues.residential_includes_storage) annexes.push("مخزن"); if (fieldValues.residential_includes_garden) annexes.push("حديقة"); if (fieldValues.residential_includes_roof) annexes.push("سطح/رووف"); if (fieldValues.residential_includes_service_room) annexes.push("غرفة خدمات"); if (fieldValues.residential_includes_parking) annexes.push("مكان انتظار سيارة");
      const other = valueText("residential_other_annex"); if (other) annexes.push(other); if (annexes.length) parts.push(`ملحقات العين: ${annexes.join("، ")}`);
    } else if (fieldValues.commercial_activity_name !== undefined) {
      add("اسم المول/المشروع التجاري", "commercial_project_name"); add("رقم الترخيص", "commercial_license_number"); add("رقم القطعة", "commercial_plot_number");
      const siteRaw = valueText("commercial_site_type"); const site = siteRaw === "أخرى" ? valueText("commercial_site_type_other") : siteRaw; if (site) parts.push(`موقع الوحدة: ${site}`);
      addYesNo("وجود ميزانين", "commercial_has_mezzanine"); add("عرض الواجهة بالمتر", "commercial_frontage_width"); add("عدد الواجهات", "commercial_frontage_count"); addYesNo("مخزن تابع", "commercial_has_storage"); addYesNo("مكان تحميل وتنزيل", "commercial_has_loading_area");
      if (String(fieldValues.commercial_finishing_level ?? "") === "أخرى") add("وصف التشطيب", "commercial_finishing_other");
    } else if (fieldValues.administrative_activity_name !== undefined) {
      add("اسم المشروع/البرج الإداري", "administrative_project_name"); add("رقم الترخيص", "administrative_license_number"); add("رقم القطعة", "administrative_plot_number");
      const siteRaw = valueText("administrative_site_type"); const site = siteRaw === "أخرى" ? valueText("administrative_site_type_other") : siteRaw; if (site) parts.push(`موقع العين: ${site}`);
      addYesNo("قاعة اجتماعات", "administrative_meeting_room"); addYesNo("استقبال", "administrative_reception"); addYesNo("مخزن تابع", "administrative_storage"); addYesNo("مصعد", "administrative_lift"); add("عدد أماكن الانتظار", "administrative_parking_count"); addYesNo("غرفة خوادم", "administrative_server_room"); add("نظام التكييف", "administrative_ac_system"); add("شبكة البيانات", "administrative_data_network");
      const deliveryMap: Record<string, string> = { vacant: "خالية", furnished: "مؤثثة", fully_equipped: "مجهزة بالكامل", inventory_report: "وفقًا لمحضر الجرد" }; const delivery = valueText("administrative_delivery_condition"); if (delivery) parts.push(`حالة العين عند التسليم: ${deliveryMap[delivery] ?? delivery}`);
      add("قراءة الكهرباء عند التسليم", "administrative_electricity_reading"); add("قراءة المياه عند التسليم", "administrative_water_reading"); add("قراءة الغاز عند التسليم", "administrative_gas_reading");
    }
    return parts.length ? `وتُستكمل بيانات وصف العين بما يلي: ${parts.join("؛ ")}.` : "ولا توجد بيانات تعريفية إضافية للعين بخلاف ما تقدم.";
  }

  if (fieldKey === "sale_property_additional_details") {
    const parts: string[] = [];
    const add = (label: string, key: string) => { const value = valueText(key); if (value) parts.push(`${label}: ${value}`); };
    add("اسم الكمبوند", "sale_compound_name"); add("رقم القطعة", "sale_plot_number"); add("رقم المجاورة", "sale_adjacency_number"); add("رقم العقار", "sale_building_number"); add("اسم البرج/العمارة", "sale_building_name");
    const meterType = (value?: string) => value === "independent" ? "مستقل" : value === "shared" ? "مشترك" : value;
    for (const [prefix, label] of [["electricity", "الكهرباء"], ["water", "المياه"], ["gas", "الغاز الطبيعي"]] as const) {
      const number = valueText(`sale_${prefix}_meter`); const type = meterType(valueText(`sale_${prefix}_meter_type`)); const reading = valueText(`sale_${prefix}_meter_reading`);
      if (number || type || reading) parts.push(`عداد ${label}: ${number ? `رقم ${number}` : ""}${number && type ? " — " : ""}${type ? `نوعه ${type}` : ""}${(number || type) && reading ? " — " : ""}${reading ? `قراءته عند التسليم ${reading}` : ""}`);
    }
    return parts.length ? `وتشمل البيانات التعريفية الإضافية للوحدة: ${parts.join("؛ ")}.` : "ولا توجد بيانات تعريفية إضافية للوحدة بخلاف ما تقدم.";
  }

  if (fieldKey === "website_legal_fees_text") {
    if (Boolean(fieldValues.website_legal_fees_enabled)) {
      const rawPayer = fieldValues.website_legal_fees_payer;
      let payer = rawPayer === "أخرى" || rawPayer === "other"
        ? valueText("website_legal_fees_other")
        : valueText("website_legal_fees_payer");
      if (!payer) return undefined;
      return `اتفق الطرفان على أن يتحمل ${payer} رسوم الدمغة أو الضرائب أو المصروفات القانونية الخاصة بهذا العقد أو تحريره أو إثبات تاريخه أو توثيقه أو أي إجراء قانوني مرتبط به، وذلك في الحدود التي تجيزها القوانين واللوائح السارية ودون إخلال بما يفرضه القانون على أي طرف بصفته.`;
    }
    return "ما لم يتفق الطرفان كتابةً على خلاف ذلك، يتحمل كل طرف الرسوم والضرائب والمصروفات التي يفرضها عليه القانون بحكم صفته أو التزاماته أو التصرفات الصادرة عنه.";
  }

  if (fieldKey === "preliminary_ownership_detail") {
    switch (String(fieldValues.preliminary_ownership_source ?? "")) {
      case "preliminary_contract": {
        const date = valueText("preliminary_contract_date");
        return date ? `عقد بيع ابتدائي مؤرخ ${date}` : undefined;
      }
      case "custom_contract": {
        const date = valueText("custom_contract_date");
        return date ? `عقد بيع عرفي مؤرخ ${date}` : undefined;
      }
      case "court_judgment": {
        const number = valueText("ownership_judgment_number");
        const year = valueText("ownership_judgment_year");
        return number && year ? `حكم قضائي رقم ${number} لسنة ${year}` : undefined;
      }
      case "allocation": {
        const authority = valueText("ownership_allocation_authority");
        return authority ? `تخصيص صادر من ${authority}` : undefined;
      }
    }
  }

  if (fieldKey === "registrable_ownership_detail") {
    switch (String(fieldValues.registered_title_type ?? "")) {
      case "registered_contract": {
        const number = valueText("registered_deed_number");
        const year = valueText("registered_deed_year");
        const office = valueText("registry_office");
        return number && year && office ? `عقد مسجل رقم ${number} لسنة ${year} لدى ${office}` : undefined;
      }
      case "final_judgment": {
        const number = valueText("registered_judgment_number");
        const year = valueText("registered_judgment_year");
        const court = valueText("registered_judgment_court");
        return number && year && court ? `حكم نهائي رقم ${number} لسنة ${year} صادر من ${court}` : undefined;
      }
      case "allocation": {
        const authority = valueText("registered_allocation_authority");
        return authority ? `عقد تخصيص صادر من ${authority}` : undefined;
      }
      case "other": {
        const other = valueText("registered_other_title");
        return other ? `سند آخر: ${other}` : undefined;
      }
    }
  }

  if (fieldKey === "inheritance_disposition_detail") {
    switch (String(fieldValues.inheritance_disposition_basis ?? "")) {
      case "power_of_attorney": {
        const number = valueText("inheritance_poa_number");
        const year = valueText("inheritance_poa_year");
        const office = valueText("inheritance_poa_office");
        const date = valueText("inheritance_poa_date");
        return number && year && office && date ? `توكيل رسمي رقم ${number} لسنة ${year} موثق لدى ${office} بتاريخ ${date}` : undefined;
      }
      case "partition_contract": {
        const date = valueText("inheritance_partition_date");
        return date ? `عقد قسمة وتراضٍ بين الورثة مؤرخ ${date}` : undefined;
      }
      case "relinquishment_contract": {
        const date = valueText("inheritance_relinquishment_date");
        return date ? `عقد تخارج أو تنازل مؤرخ ${date}` : undefined;
      }
      case "sale_from_heirs": {
        const date = valueText("inheritance_heirs_sale_date");
        return date ? `عقد بيع أو تصرف من باقي الورثة مؤرخ ${date}` : undefined;
      }
      case "sole_heir":
        return "البائع هو الوارث الوحيد وفق إعلام الوراثة المثبت بالعقد";
      case "other": {
        const other = valueText("inheritance_other_basis");
        return other ? `سند قانوني آخر: ${other}` : undefined;
      }
    }
  }

  if (fieldKey === "commercial_guarantee_value_text") {
    const mode = String(fieldValues.commercial_guarantee_value_mode ?? "");
    const amount = valueText(mode === "each" ? "commercial_guarantee_each_amount" : mode === "total" ? "commercial_guarantee_total_amount" : "");
    if (!amount) return undefined;
    return mode === "each" ? `وقيمة كل شيك ${amount} جنيه مصري` : `وإجمالي قيمة الشيكات ${amount} جنيه مصري`;
  }

  if (fieldKey === "administrative_guarantee_value_text") {
    const mode = String(fieldValues.administrative_guarantee_value_mode ?? "");
    const amount = valueText(mode === "each" ? "administrative_guarantee_each_amount" : mode === "total" ? "administrative_guarantee_total_amount" : "");
    if (!amount) return undefined;
    return mode === "each" ? `وقيمة كل شيك ${amount} جنيه مصري` : `وإجمالي قيمة الشيكات ${amount} جنيه مصري`;
  }

  return undefined;
}

export function renderLegalClauses(
  template: ContractTemplateDefinition,
  variantKey: string,
  selectedOptionalClauseKeys: string[] = [],
  fieldValues: Record<string, any> = {},
): RenderedLegalClause[] {
  const resolved = resolveWizardDefinition(template, variantKey, selectedOptionalClauseKeys, fieldValues);
  const variant = resolved.variant;

  const availableClauseMap = new Map<string, LegalClauseDefinition>();
  for (const clause of template.legalClauses || []) {
    if (clause.enabled !== false) {
      availableClauseMap.set(clause.key, clause);
    }
  }

  const manualClauseKeys = new Set<string>();
  const effectiveClauseKeys = [...new Set(selectedOptionalClauseKeys)];
  for (const optional of template.optionalClauses) {
    if (effectiveClauseKeys.includes(optional.key) && optional.manualFillAnnex) {
      for (const k of optional.legalClauseKeys) {
        manualClauseKeys.add(k);
      }
    }
  }

  const rendered: RenderedLegalClause[] = [];
  const fieldMap = new Map<string, WizardFieldDefinition>(
    resolved.steps.flatMap((step) => step.fields).map((field) => [field.key, field] as const),
  );

  for (const key of resolved.activeClauseKeys) {
    const clause = availableClauseMap.get(key);
    if (!clause) continue;
    if (clause.visibleWhen && !evaluateCondition(clause.visibleWhen, fieldValues)) continue;

    let body = clause.bodyAr || "";
    const isManual = manualClauseKeys.has(key);
    const variables = isManual ? [] : (clause.variables || []);

    for (const v of variables) {
      const token = `{{${v}}}`;
      let val = fieldValues[v];
      if (val === undefined || val === null || val === "") val = derivedClauseVariable(v, fieldValues);
      if (val === undefined || val === null || val === "") {
        val = "بيان مطلوب";
      } else if (fieldValues[v] !== undefined && fieldValues[v] !== null && fieldValues[v] !== "") {
        val = formatClauseVariable(v, val, fieldMap.get(v), fieldValues);
      }
      body = body.split(token).join(String(val));
    }

    rendered.push({
      key,
      titleAr: clause.titleAr || key,
      bodyAr: body,
      sourceDocumentName: clause.sourceDocumentName,
      sourcePageStart: clause.sourcePageStart,
      sourcePageEnd: clause.sourcePageEnd,
    });
  }

  return rendered;
}
