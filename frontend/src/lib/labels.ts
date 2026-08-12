export const contractStatusLabels: Record<string, string> = {
  draft: "مسودة",
  pending_payment: "بانتظار مراجعة الدفع",
  pending_review: "قيد مراجعة المكتب",
  assigned: "قيد متابعة المكتب",
  in_progress: "قيد الإعداد",
  client_review: "متاح للمراجعة",
  revision_requested: "تعديلات مطلوبة",
  approved: "تمت مراجعة النسخة",
  locked: "تم تثبيت النسخة",
  issued: "صادر",
  cancelled: "ملغى",
};

export const requestStatusLabels: Record<string, string> = {
  awaiting_payment: "بانتظار مراجعة الدفع",
  new: "تم استلام الطلب",
  assigned: "قيد متابعة المكتب",
  awaiting_client_info: "بانتظار مستندات منك",
  meeting_scheduled: "تم تحديد موعد التواصل",
  in_progress: "قيد التنفيذ",
  client_review: "نسخة جاهزة للمراجعة",
  revision_requested: "تعديلات مطلوبة",
  completed: "مكتمل",
  cancelled: "ملغى",
};

export const requestTypeLabels: Record<string, string> = {
  contract_drafting: "إعداد عقد بواسطة محامي المكتب",
  contract_review: "مراجعة عقد أو مستند",
  consultation: "استشارة قانونية",
};

export const communicationLabels: Record<string, string> = {
  office: "مقابلة في المكتب",
  zoom: "اجتماع عبر Zoom",
  whatsapp: "تواصل عبر WhatsApp",
};

export const paymentStatusLabels: Record<string, string> = {
  pending_verification: "الإيصال قيد المراجعة",
  needs_client_info: "مطلوب توضيح بخصوص الدفع",
  replaced: "تم استبدال الإثبات",
  approved: "تم اعتماد الدفع",
  rejected: "تعذر اعتماد الدفع",
  waived: "معفى من الدفع",
  paid_outside: "تم التحصيل خارج المنصة",
};

export function formatDate(value?: string | null, withTime = true) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-EG", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}
