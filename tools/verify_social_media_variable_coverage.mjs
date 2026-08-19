import fs from 'node:fs';
import path from 'node:path';
import {
  auditVariantFieldCoverage,
  derivedClauseVariableDependencies,
  freelancerTemplateDefinition,
  socialMediaFieldCoverageExternalBindings,
} from '../packages/template-engine/dist/index.js';

const audit = auditVariantFieldCoverage(freelancerTemplateDefinition, 'social_media_management', {
  derivedVariableDependencies: derivedClauseVariableDependencies,
  externalBindings: socialMediaFieldCoverageExternalBindings,
});

const q = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const rows = audit.entries.map((entry) => {
  const destination = entry.status === 'external_bound' ? entry.externalSectionAr : entry.clauseTitlesAr.join('؛ ');
  const via = entry.viaVariables.length ? entry.viaVariables.map((v) => `\`${v}\``).join('، ') : '—';
  const status = entry.status === 'clause_bound' ? '✅ مادة قانونية' : entry.status === 'external_bound' ? '✅ قسم مستند' : '❌ غير مربوط';
  return `| \`${q(entry.fieldKey)}\` | ${q(entry.labelAr)} | ${status} | ${q(via)} | ${q(destination)} |`;
});

const markdown = `# خريطة ربط متغيرات عقد إدارة حسابات ومنصات التواصل الاجتماعي — v14\n\n` +
  `هذا التقرير مولد آليًا من تعريف العقد. أي حقل جديد في الـWizard لا يصل إلى مادة قانونية أو قسم مستند مسجل يجعل فحص النشر يفشل.\n\n` +
  `- إجمالي الحقول: **${audit.entries.length}**\n` +
  `- مرتبطة بمواد قانونية: **${audit.entries.filter(e => e.status === 'clause_bound').length}**\n` +
  `- مرتبطة بقسم مستند مستقل (التوقيعات/الشهود): **${audit.entries.filter(e => e.status === 'external_bound').length}**\n` +
  `- غير مرتبطة: **${audit.uncoveredFieldKeys.length}**\n\n` +
  `| المفتاح | اسم الحقل | الحالة | عبر المتغير | موضع الظهور |\n` +
  `|---|---|---|---|---|\n` + rows.join('\n') + '\n';

const out = path.resolve('docs/SOCIAL_MEDIA_VARIABLE_COVERAGE_V14_AR.md');
fs.writeFileSync(out, markdown, 'utf8');
console.log(JSON.stringify({ total: audit.entries.length, clauseBound: audit.entries.filter(e => e.status === 'clause_bound').length, externalBound: audit.entries.filter(e => e.status === 'external_bound').length, uncovered: audit.uncoveredFieldKeys, report: out }, null, 2));
if (audit.uncoveredFieldKeys.length) process.exit(1);
