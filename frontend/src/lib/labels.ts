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

export function getContractNextAction(status: string): { label: string; actionText: string } {
  switch (status) {
    case "draft":
      return {
        label: "أكمل إدخال بنود وأطراف العقد للمتابعة.",
        actionText: "متابعة الإعداد",
      };
    case "pending_payment":
      return {
        label: "يتم التحقق من إيصال الدفع وسداد الرسوم.",
        actionText: "متابعة الدفع",
      };
    case "pending_review":
    case "assigned":
    case "in_progress":
      return {
        label: "يقوم المحامي المختص بمراجعة وصياغة البنود.",
        actionText: "متابعة العقد",
      };
    case "client_review":
      return {
        label: "راجع بنود المسودة قبل الاعتماد النهائي.",
        actionText: "مراجعة العقد",
      };
    case "revision_requested":
      return {
        label: "جاري تطبيق التعديلات المطلوبة من قبلك.",
        actionText: "متابعة التعديلات",
      };
    case "approved":
    case "locked":
    case "issued":
      return {
        label: "النسخة معتمدة ومحفوظة، جاهزة للتحميل والطباعة.",
        actionText: "عرض العقد",
      };
    default:
      return {
        label: "العقد محفوظ بحسابك وجاهز للاطلاع.",
        actionText: "فتح العقد",
      };
  }
}

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
  contract_drafting: "إعداد عقد",
  contract_review: "مراجعة عقد",
  consultation: "استشارة قانونية",
};

export const communicationLabels: Record<string, string> = {
  office: "مقابلة في المكتب",
  zoom: "اجتماع Zoom",
  whatsapp: "التواصل عبر WhatsApp",
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

export function getRequestNextAction(status: string): { label: string; actionText: string } {
  switch (status) {
    case "awaiting_payment":
      return {
        label: "يتم الآن التحقق من إيصال الدفع — لا يلزم إجراء منك.",
        actionText: "متابعة الطلب",
      };
    case "awaiting_client_info":
      return {
        label: "بانتظار رفع مستندات أو بيانات إضافية.",
        actionText: "رفع المستندات",
      };
    case "meeting_scheduled":
      return {
        label: "تم تثبيت موعد التواصل مع المحامي.",
        actionText: "تفاصيل الموعد",
      };
    case "in_progress":
    case "assigned":
      return {
        label: "يقوم المحامي المختص بدراسة الملف ومراجعته.",
        actionText: "متابعة الطلب",
      };
    case "client_review":
      return {
        label: "النسخة جاهزة للمراجعة وإبداء الملاحظات.",
        actionText: "مراجعة الملف",
      };
    case "completed":
      return {
        label: "تم تسليم كافة مخرجات المراجعة بنجاح.",
        actionText: "عرض التفاصيل",
      };
    default:
      return {
        label: "الطلب قيد المتابعة مع فريق العمل.",
        actionText: "متابعة الطلب",
      };
  }
}

export function formatDate(value?: string | null, withTime = true) {
  if (!value) return "غير محدد";
  let date = new Date(value);

  // Fallback for malformed demo API dates like '14T17:45:50.426Z-08-2026'
  if (Number.isNaN(date.getTime())) {
    const weirdMatch = value.match(/^(\d{1,2})T(.*?)-(\d{1,2})-(\d{4})$/);
    if (weirdMatch) {
      const [, d, t, m, y] = weirdMatch;
      date = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${t}`);
    }
  }

  if (Number.isNaN(date.getTime())) return value;

  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  if (!withTime) {
    return `${day} ${month} ${year}`;
  }

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "م" : "ص";
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${day} ${month} ${year}، ${hours}:${minutes} ${ampm}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}
