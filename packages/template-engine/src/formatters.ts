/**
 * Deterministic Arabic number wording used by both the wizard preview and the
 * legal-clause renderer. Monetary inputs are stored once as numbers; the words
 * are always derived from that same number so the two forms cannot diverge.
 */
export function numberToArabicWordsBare(input: unknown): string | undefined {
  const numeric = Number(input);
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;
  const n = Math.floor(numeric);
  if (n === 0) return "صفر";

  const ones = [
    "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
    "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر",
  ];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  const belowThousand = (value: number): string => {
    if (value === 0) return "";
    if (value < 20) return ones[value];
    const h = Math.floor(value / 100);
    const rem = value % 100;
    const parts: string[] = [];
    if (h) parts.push(hundreds[h]);
    if (rem) {
      if (rem < 20) parts.push(ones[rem]);
      else {
        const t = Math.floor(rem / 10);
        const o = rem % 10;
        parts.push(o ? `${ones[o]} و${tens[t]}` : tens[t]);
      }
    }
    return parts.join(" و");
  };

  const scales: Array<[number, string, string, string]> = [
    [1_000_000_000, "مليار", "ملياران", "مليارات"],
    [1_000_000, "مليون", "مليونان", "ملايين"],
    [1_000, "ألف", "ألفان", "آلاف"],
  ];

  let remaining = n;
  const parts: string[] = [];
  for (const [value, singular, dual, plural] of scales) {
    if (remaining < value) continue;
    const count = Math.floor(remaining / value);
    remaining %= value;
    if (count === 1) parts.push(singular);
    else if (count === 2) parts.push(dual);
    else if (count >= 3 && count <= 10) parts.push(`${belowThousand(count)} ${plural}`);
    else parts.push(`${belowThousand(count)} ${singular}`);
  }
  if (remaining) parts.push(belowThousand(remaining));
  return parts.join(" و");
}

export function numberToEgyptianPoundsWords(input: unknown): string {
  const numeric = Number(input);
  if (!Number.isFinite(numeric) || numeric < 0) return "";
  let pounds = Math.floor(numeric + 1e-9);
  let piasters = Math.round((numeric - pounds) * 100);
  if (piasters === 100) { pounds += 1; piasters = 0; }
  const poundsWords = numberToArabicWordsBare(pounds);
  if (!poundsWords) return "";
  if (!piasters) return `${poundsWords} جنيه مصري فقط لا غير`;
  const piastersWords = numberToArabicWordsBare(piasters);
  return `${poundsWords} جنيه مصري و${piastersWords} قرشًا فقط لا غير`;
}
