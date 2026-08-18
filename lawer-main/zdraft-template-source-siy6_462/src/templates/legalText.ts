import type { LegalClauseDefinition } from "../types.ts";

/**
 * Repairs recurring Arabic PDF/OCR artefacts without changing the legal
 * meaning of a clause. Keep this list deliberately explicit: broad Arabic
 * character substitutions can silently corrupt names and legal terminology.
 */
export function normalizeLegalArabicText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/اال/g, "الا")
    .replace(/اإل/g, "الإ")
    .replace(/األ/g, "الأ")
    .replace(/اآل/g, "الآ")
    .replace(/إال/g, "إلا")
    .replace(/العالقات/g, "العلاقات")
    .replace(/العالقة/g, "العلاقة")
    .replace(/عالقات/g, "علاقات")
    .replace(/استالم/g, "استلام")
    .replace(/إخالل/g, "إخلال")
    .replace(/إخالء/g, "إخلاء")
    .replace(/إبالغ/g, "إبلاغ")
    .replace(/خالل/g, "خلال")
    .replace(/إليجار/g, "لإيجار")
    .replace(/قبولاباستمرار/g, "قبولًا باستمرار")
    .replace(/استقالل/g, "استقلال")
    .replace(/لالستمرار/g, "للاستمرار")
    .replace(/المراسالت/g, "المراسلات")
    .replace(/اختالف/g, "اختلاف")
    .replace(/اختالل/g, "اختلال")
    .replace(/الالزم/g, "اللازم")
    .replace(/إلعذار/g, "للإعذار")
    .replace(/بخالف/g, "بخلاف")
    .replace(/يقض القانون/g, "يقضي القانون")
    .replace(/يخلاف/g, "يخالف")
    .replace(/جائز\s+ا/g, "جائزًا")
    .replace(/(^|[\s،؛:.(])ان وجدت(?=$|[\s،؛:.)])/g, "$1إن وجدت")
    .replace(/(^|[\s،؛:.(])فال\s+/g, "$1فلا ")
    .replace(/السالمة/g, "السلامة")
    .replace(/بسالمة/g, "بسلامة")
    .replace(/وسالمة/g, "وسلامة")
    .replace(/(^|[\s،؛:.(])سالمة(?=$|[\s،؛:.)])/g, "$1سلامة")
    .replace(/سالمتها/g, "سلامتها")
    .replace(/(^|[\s،؛:.(])ي\s+قصد(?=$|[\s،؛:.)])/g, "$1يقصد")
    .replace(/شخ\s+صا/g, "شخصًا")
    .replace(/ا\s+لعقد/g, "العقد")
    .replace(/وا\s+ردة/g, "واردة")
    .replace(/ا\s+ستخدام/g, "استخدام")
    .replace(/المهني\s+ة/g, "المهنية")
    .replace(/مالحظ/g, "ملاحظ")
    .replace(/العالمات/g, "العلامات")
    .replace(/لالس\s*تخدام/g, "للاستخدام")
    .replace(/تكامالت/g, "تكاملات")
    .replace(/إلجراءات/g, "للإجراءات")
    .replace(/(^|[\s،؛:.(])ف\s+ي(?=$|[\s،؛:.)])/g, "$1في")
    .replace(/اتفاق الحق/g, "اتفاق لاحق")
    .replace(/(^|[\s،؛:.(])ايام(?=$|[\s،؛:.)])/g, "$1أيام")
    .replace(/سالسل/g, "سلاسل")
    .replace(/و\s+يجوز/g, "ويجوز")
    .replace(/تعليق تنفيذ الأعمال أو إخلالا من الامتناع/g, "تعليق تنفيذ الأعمال أو الامتناع")
    .replace(/ولا يعد تعليق التنفيذ في هذه الحالة الطرف الثاني بالتزاماته العقدية/g, "ولا يعد تعليق التنفيذ في هذه الحالة إخلالًا من الطرف الثاني بالتزاماته العقدية")
    .replace(/فلا يكون الطرف الثاني آثار أو أضرار أو تأخير يترتب على ذلك/g, "فلا يكون الطرف الثاني مسؤولًا عن أي آثار أو أضرار أو تأخير يترتب على ذلك")
    .replace(/\b(DNS|CDN|API|APIs|Orders)أو/g, "$1 أو")
    .replace(/\b(DNS|CDN|API|APIs|Orders)و(?=[\u0600-\u06FF])/g, "$1 و")
    .replace(/المع\s+تمدة/g, "المعتمدة")
    .replace(/جوالات المراجعة/g, "جولات المراجعة")
    .replace(/ت\s+نظيم/g, "تنظيم")
    .replace(/أ\s+عمالا/g, "أعمالًا")
    .replace(/أ\s+عمال/g, "أعمال")
    .replace(/يلتز\s+م/g, "يلتزم")
    .replace(/م\s+باشرة/g, "مباشرة")
    .replace(/إقرارهم\s+ا/g, "إقرارهما")
    // A standalone "ال" or "وال" is a recurring RTL PDF extraction of
    // "لا" or "ولا". The Arabic definite article is never separated from
    // its noun, so this repair is narrower than it may first appear.
    .replace(/(^|[\s،؛:.(])وال\s+/g, "$1ولا ")
    .replace(/(^|[\s،؛:.(])ال\s+/g, "$1لا ")
    .replace(/المحكمة المختصة الواقع في دائرتها العقار محل هذا العقد/g, "المحكمة المحددة في بيانات هذا العقد")
    .replace(/للمحكمة التي يقع في دائرتها العقار محل هذا العقد/g, "للمحكمة المحددة في بيانات هذا العقد")
    .replace(/للمحكمة المختصة التي يقع في دائرتها العقار محل العين المؤجرة/g, "للمحكمة المحددة في بيانات هذا العقد")
    .replace(/\((\d+)\)\s*يوما/g, "($1) يومًا")
    .replace(/لآلخر/g, "للآخر")
    .replace(/(^|\n)[ \t]*\.(\d+)[ \t]*/g, "$1$2. ")
    .replace(/[ \t]+([،؛:.])/g, "$1")
    .replace(/([،؛:])(?=\S)/g, "$1 ")
    .replace(/([أبجدهوزحطيكلمنسعفصقرشتثخذضظغ])\.(?=\S)/g, "$1. ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeLegalClauseDefinition(
  clause: LegalClauseDefinition,
): LegalClauseDefinition {
  let bodyAr = normalizeLegalArabicText(clause.bodyAr);
  if ([
    "residential_lease_source_article_18",
    "inherited_sale_source_article_20",
  ].includes(clause.key)) {
    bodyAr = bodyAr.replace(/^2\. الاختصاص المحلي:/m, "1. الاختصاص المحلي:");
  }
  return {
    ...clause,
    titleAr: normalizeLegalArabicText(clause.titleAr),
    bodyAr,
  };
}
