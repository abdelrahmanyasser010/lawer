import fs from 'node:fs';
import path from 'node:path';
import {
  rentalTemplateDefinition,
  rentalFieldCoverageExternalBindings,
  auditVariantFieldCoverage,
  derivedClauseVariableDependencies,
} from '../packages/template-engine/dist/index.js';

const labels = {
  residential_lease: 'عقد إيجار سكني',
  commercial_lease: 'عقد إيجار تجاري',
  administrative_lease: 'عقد إيجار إداري',
};
const q = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const sections = [];
const result = {};
let failed = false;
for (const variant of rentalTemplateDefinition.variants) {
  const audit = auditVariantFieldCoverage(rentalTemplateDefinition, variant.key, {
    derivedVariableDependencies: derivedClauseVariableDependencies,
    externalBindings: rentalFieldCoverageExternalBindings,
  });
  const clauseBound = audit.entries.filter((e) => e.status === 'clause_bound').length;
  const externalBound = audit.entries.filter((e) => e.status === 'external_bound').length;
  result[variant.key] = { total: audit.entries.length, clauseBound, externalBound, uncovered: audit.uncoveredFieldKeys };
  if (audit.uncoveredFieldKeys.length) failed = true;
  const rows = audit.entries.map((entry) => {
    const destination = entry.status === 'external_bound' ? entry.externalSectionAr : entry.clauseTitlesAr.join('؛ ');
    const via = entry.viaVariables.length ? entry.viaVariables.map((v) => `\`${v}\``).join('، ') : '—';
    const status = entry.status === 'clause_bound' ? '✅ مادة قانونية' : entry.status === 'external_bound' ? '✅ قسم مستند' : '❌ غير مربوط';
    return `| \`${q(entry.fieldKey)}\` | ${q(entry.labelAr)} | ${status} | ${q(via)} | ${q(destination)} |`;
  });
  sections.push(`## ${labels[variant.key] ?? variant.key}\n\n` +
    `- إجمالي الحقول: **${audit.entries.length}**\n` +
    `- مرتبطة بمواد قانونية: **${clauseBound}**\n` +
    `- مرتبطة بقسم مستند مستقل: **${externalBound}**\n` +
    `- غير مرتبطة: **${audit.uncoveredFieldKeys.length}**\n\n` +
    `| المفتاح | اسم الحقل | الحالة | عبر المتغير | موضع الظهور |\n` +
    `|---|---|---|---|---|\n${rows.join('\n')}\n`);
}
const markdown = `# خريطة ربط متغيرات عقود الإيجار الثلاثة — Rental v14\n\n` +
  `هذا التقرير مولد آليًا من تعريف القالب. كل Input يجب أن يصل إلى مادة قانونية أو قسم مستند مسجل، وأي حقل جديد غير مربوط يجعل فحص النشر يفشل بـ \`UNBOUND_LEGAL_FIELD\`.\n\n` + sections.join('\n');
const out = path.resolve('docs/LEASE_VARIABLE_COVERAGE_V14_AR.md');
fs.writeFileSync(out, markdown, 'utf8');
console.log(JSON.stringify({ version: rentalTemplateDefinition.version, variants: result, report: out }, null, 2));
if (failed) process.exit(1);
