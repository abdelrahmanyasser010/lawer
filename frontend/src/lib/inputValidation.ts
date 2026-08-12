export type FieldErrors = Record<string, string>;

export function passwordChecks(value: string) {
  return {
    length: value.length >= 8 && value.length <= 128,
    letter: /[A-Za-z\u0600-\u06FF]/u.test(value),
    number: /\d/.test(value),
  };
}

export function passwordValidationError(value: string): string {
  const checks = passwordChecks(value);
  if (!checks.length) return "كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا.";
  if (!checks.letter) return "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل.";
  if (!checks.number) return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.";
  return "";
}

export function normalizePhoneInput(value: string): string {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "").slice(0, 15);
  return `${hasPlus ? "+" : ""}${digits}`;
}

export function phoneValidationError(value: string, required = true): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return required ? "رقم الهاتف مطلوب." : "";
  if (digits.length < 10 || digits.length > 15) return "اكتب رقم هاتف صحيحًا من 10 إلى 15 رقمًا.";
  return "";
}

export function apiFieldErrors(details: unknown): FieldErrors {
  if (!details || typeof details !== "object" || Array.isArray(details)) return {};
  const result: FieldErrors = {};
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) result[key] = String(value[0]);
    else if (typeof value === "string") result[key] = value;
  }
  return result;
}
