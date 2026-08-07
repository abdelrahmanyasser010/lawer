export function normalizeWhatsAppPhone(phone: string, defaultCountryCode = "20"): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith(defaultCountryCode)) return digits;
  if (digits.startsWith("0")) return `${defaultCountryCode}${digits.slice(1)}`;
  return digits;
}

export function whatsappContactUrl(phone: string, message: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
