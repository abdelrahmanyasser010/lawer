/**
 * Converts a numeric amount to Arabic words (Egyptian legal standard)
 * e.g. 300000 → "ثلاثمائة ألف جنيه مصري فقط لا غير"
 */

const ones = [
  "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة",
  "ستة", "سبعة", "ثمانية", "تسعة", "عشرة",
  "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر",
  "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر",
];

const tens = [
  "", "", "عشرون", "ثلاثون", "أربعون", "خمسون",
  "ستون", "سبعون", "ثمانون", "تسعون",
];

const hundreds = [
  "", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة",
  "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة",
];

function belowThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n];

  const h = Math.floor(n / 100);
  const remainder = n % 100;
  const t = Math.floor(remainder / 10);
  const o = remainder % 10;

  const parts: string[] = [];
  if (h > 0) parts.push(hundreds[h]);

  if (remainder > 0) {
    if (remainder < 20) {
      parts.push(ones[remainder]);
    } else {
      if (o > 0) parts.push(ones[o] + " و" + tens[t]);
      else parts.push(tens[t]);
    }
  }
  return parts.join(" و");
}

const scales: Array<[number, string, string]> = [
  [1_000_000_000, "مليار", "مليارات"],
  [1_000_000,     "مليون", "ملايين"],
  [1_000,         "ألف",   "آلاف"],
];

export function numberToArabicWords(amount: number | string): string {
  const n = Math.floor(Number(amount));
  if (isNaN(n) || n < 0) return "";
  if (n === 0) return "صفر جنيه مصري فقط لا غير";

  let remaining = n;
  const parts: string[] = [];

  for (const [value, singular, plural] of scales) {
    if (remaining >= value) {
      const count = Math.floor(remaining / value);
      remaining = remaining % value;
      if (count === 1) {
        parts.push(singular + " واحد");
      } else if (count === 2) {
        parts.push(singular + "ان");
      } else if (count >= 3 && count <= 10) {
        parts.push(belowThousand(count) + " " + plural);
      } else {
        parts.push(belowThousand(count) + " " + singular);
      }
    }
  }

  if (remaining > 0) {
    parts.push(belowThousand(remaining));
  }

  return parts.join(" و") + " جنيهاً مصرياً فقط لا غير";
}
