import type { FieldOptionDefinition, WizardFieldDefinition } from "../types";

export const competentCourtOptions: FieldOptionDefinition[] = [
  { value: "القاهرة", labelAr: "القاهرة" },
  { value: "شمال القاهرة", labelAr: "شمال القاهرة" },
  { value: "جنوب القاهرة", labelAr: "جنوب القاهرة" },
  { value: "القاهرة الجديدة", labelAr: "القاهرة الجديدة" },
  { value: "شمال الجيزة", labelAr: "شمال الجيزة" },
  { value: "جنوب الجيزة", labelAr: "جنوب الجيزة" },
  { value: "الإسكندرية", labelAr: "الإسكندرية" },
  { value: "طنطا", labelAr: "طنطا" },
  { value: "دمنهور", labelAr: "دمنهور" },
  { value: "كفر الشيخ", labelAr: "كفر الشيخ" },
  { value: "المنصورة", labelAr: "المنصورة" },
  { value: "الزقازيق", labelAr: "الزقازيق" },
  { value: "بنها", labelAr: "بنها" },
  { value: "شبين الكوم", labelAr: "شبين الكوم" },
  { value: "بورسعيد", labelAr: "بورسعيد" },
  { value: "الإسماعيلية", labelAr: "الإسماعيلية" },
  { value: "السويس", labelAr: "السويس" },
  { value: "دمياط", labelAr: "دمياط" },
  { value: "المنيا", labelAr: "المنيا" },
  { value: "بني سويف", labelAr: "بني سويف" },
  { value: "الفيوم", labelAr: "الفيوم" },
  { value: "أسيوط", labelAr: "أسيوط" },
  { value: "سوهاج", labelAr: "سوهاج" },
  { value: "قنا", labelAr: "قنا" },
  { value: "الأقصر", labelAr: "الأقصر" },
  { value: "أسوان", labelAr: "أسوان" },
  { value: "البحر الأحمر", labelAr: "البحر الأحمر" },
  { value: "الوادي الجديد", labelAr: "الوادي الجديد" },
  { value: "شمال سيناء", labelAr: "شمال سيناء" },
  { value: "جنوب سيناء", labelAr: "جنوب سيناء" },
  { value: "مرسى مطروح", labelAr: "مرسى مطروح" },
];

export const contractDateField: WizardFieldDefinition = {
  key: "contract_date",
  type: "date",
  labelAr: "تاريخ العقد",
  required: true,
};

export const competentCourtField = (key: string): WizardFieldDefinition => ({
  key,
  type: "select",
  labelAr: "المحكمة المختصة",
  required: true,
  options: competentCourtOptions,
  helpText: "اختر المحكمة المتفق عليها بين الطرفين، مع مراعاة قواعد الاختصاص القضائي الآمرة.",
});
