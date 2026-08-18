import json
import re
from pathlib import Path

ROOT = Path(r"d:\android tog\laywer")

# Load all 3 template json files
rental_path = ROOT / "backend/database/template-definitions/rental.json"
sale_path = ROOT / "backend/database/template-definitions/apartment_sale.json"
freelance_path = ROOT / "backend/database/template-definitions/freelancer.json"

rental_data = json.loads(rental_path.read_text(encoding='utf-8'))
sale_data = json.loads(sale_path.read_text(encoding='utf-8'))
freelance_data = json.loads(freelance_path.read_text(encoding='utf-8'))

def clean_arabic_text(text: str) -> str:
    if not text:
        return ""

    # 1. Remove all Arabic diacritics / tashkeel and shaddas that cause broken glyphs like ك ّ ل or ك ٌل
    # Arabic diacritic range: \u064B-\u065F, \u0670
    # First, handle spaces before diacritics
    text = re.sub(r'\s+[\u064B-\u065F\u0670]', '', text)
    # Remove remaining diacritics except if intentionally needed, but removing tashkeel eliminates all OCR broken vowel glitches
    text = re.sub(r'[\u064B-\u065F\u0670]', '', text)

    # 2. Fix broken 'ك ل' or 'ك  ل'
    text = re.sub(r'\bك\s+ل\b', 'كل', text)
    text = re.sub(r'\bك\s+له\b', 'كله', text)
    text = re.sub(r'\bك\s+لها\b', 'كلها', text)
    text = re.sub(r'\bك\s+لهم\b', 'كلهم', text)

    # 3. Fix broken 'ال ' (Alif-Lam where it should be 'لا' Laa)
    # Common words where OCR produces 'ال ' instead of 'لا '
    la_words = [
        'يتجزأ', 'يجوز', 'يترتب', 'تعد', 'يعد', 'يخل', 'تخل', 'يعفي', 'تعفي', 'تلتزم',
        'يلتزم', 'يتحمل', 'تتحمل', 'ينشأ', 'تنشأ', 'يكون', 'تكون', 'يسري', 'تسري',
        'يحق', 'تحق', 'يقبل', 'تقبل', 'يجوز', 'تفوت', 'يفوت', 'يشمل', 'تشمل', 'تجاوز', 'يجاوز',
        'مفر', 'سيما', 'ريب', 'بد', 'غرو', 'مانع', 'شائبة', 'جرم', 'ضرر', 'ضرار'
    ]
    for w in la_words:
        text = re.sub(rf'\bال\s+{w}\b', f'لا {w}', text)
        text = re.sub(rf'\bأال\s+{w}\b', f'ألا {w}', text)
        text = re.sub(rf'\bإال\s+{w}\b', f'إلا {w}', text)

    text = re.sub(r'\bإال\b', 'إلا', text)
    text = re.sub(r'\bأال\b', 'ألا', text)
    text = re.sub(r'\bواالنتفاع\b', 'والانتفاع', text)
    text = re.sub(r'\bوااللتزام\b', 'والالتزام', text)
    text = re.sub(r'\bواالشتراطات\b', 'والاشتراطات', text)
    text = re.sub(r'\bواإلقرار\b', 'والإقرار', text)
    text = re.sub(r'\bواإلعالنات\b', 'والإعلانات', text)
    text = re.sub(r'\bواإلخالء\b', 'والإخلاء', text)

    # Fix OCR broken Lam-Alif glitched words
    lam_alif_fixes = [
        (r'\bاألول\b', 'الأول'),
        (r'\bاألولى\b', 'الأولى'),
        (r'\bاألجرة\b', 'الأجرة'),
        (r'\bاألجر\b', 'الأجر'),
        (r'\bاألصل\b', 'الأصل'),
        (r'\bاألصلي\b', 'الأصلي'),
        (r'\bاألصلية\b', 'الأصلية'),
        (r'\bاألعمال\b', 'الأعمال'),
        (r'\bاألضرار\b', 'الأضرار'),
        (r'\bاألطراف\b', 'الأطراف'),
        (r'\bاألوراق\b', 'الأوراق'),
        (r'\bاألمانة\b', 'الأمانة'),
        (r'\bاألجهزة\b', 'الأجهزة'),
        (r'\bاألسعار\b', 'الأسعار'),
        (r'\bاألساسية\b', 'الأساسية'),
        (r'\bاألخرى\b', 'الأخرى'),
        (r'\bاآلخر\b', 'الآخر'),
        (r'\bاآلخرين\b', 'الآخرين'),
        (r'\bاآلتية\b', 'الآتية'),
        (r'\bاآلتي\b', 'الآتي'),
        (r'\bاآلثار\b', 'الآثار'),
        (r'\bاإليجار\b', 'الإيجار'),
        (r'\bاإليجارية\b', 'الإيجارية'),
        (r'\bاإلخالء\b', 'الإخلاء'),
        (r'\bاإلخالل\b', 'الإخلال'),
        (r'\bاإلخطار\b', 'الإخطار'),
        (r'\bاإلخطارات\b', 'الإخطارات'),
        (r'\bاإللكتروني\b', 'الإلكتروني'),
        (r'\bاإللكترونية\b', 'الإلكترونية'),
        (r'\bاإلدارة\b', 'الإدارة'),
        (r'\bاإلداري\b', 'الإداري'),
        (r'\bاإلدارية\b', 'الإدارية'),
        (r'\bاإلجمالي\b', 'الإجمالي'),
        (r'\bاإلجمالية\b', 'الإجمالية'),
        (r'\bاإلجراءات\b', 'الإجراءات'),
        (r'\bاإلثبات\b', 'الإثبات'),
        (r'\bاإلعالن\b', 'الإعلان'),
        (r'\bاإلعالنات\b', 'الإعلانات'),
        (r'\bاإلنهاء\b', 'الإنهاء'),
        (r'\bاإلذن\b', 'الإذن'),
        (r'\bاإلقرار\b', 'الإقرار'),
        (r'\bاإلصالح\b', 'الإصلاح'),
        (r'\bاإلصالحات\b', 'الإصلاحات'),
        (r'\bاإليرادات\b', 'الإيرادات'),
        (r'\bاالنتفاع\b', 'الانتفاع'),
        (r'\bااللتزام\b', 'الالتزام'),
        (r'\bااللتزامات\b', 'الالتزامات'),
        (r'\bاالستعمال\b', 'الاستعمال'),
        (r'\bاالستالم\b', 'الاستلام'),
        (r'\bاالستهالك\b', 'الاستهلاك'),
        (r'\bاالستعانة\b', 'الاستعانة'),
        (r'\bاالختصاص\b', 'الاختصاص'),
        (r'\bاالشتراطات\b', 'الاشتراطات'),
        (r'\bاالتفاق\b', 'الاتفاق'),
        (r'\bاالتفاقي\b', 'الاتفاقي'),
        (r'\bاالتفاقية\b', 'الاتفاقية'),
        (r'\bاالتحاد\b', 'الاتحاد'),
        (r'\bالستعمالها\b', 'لاستعمالها'),
        (r'\bالستعمال\b', 'لاستعمال'),
        (r'\bالستالم\b', 'لاستلام'),
        (r'\bالستالمها\b', 'لاستلامها'),
        (r'\bالستيفاء\b', 'لاستيفاء'),
        (r'\bالستخدام\b', 'لاستخدام'),
        (r'\bالستخدامها\b', 'لاستخدامها'),
        (r'\bالستمرار\b', 'لاستمرار'),
        (r'\bالسترداد\b', 'لاسترداد'),
        (r'\bالستخراج\b', 'لاستخراج'),
        (r'\bألحكامه\b', 'لأحكامه'),
        (r'\bألحكام\b', 'لأحكام'),
        (r'\bألعمال\b', 'لأعمال'),
        (r'\bألغراض\b', 'لأغراض'),
        (r'\bألي\b', 'لأي'),
        (r'\bألحد\b', 'لأحد'),
        (r'\bإلتمام\b', 'لإتمام'),
        (r'\bإلقامة\b', 'لإقامة'),
        (r'\bإلدارة\b', 'لإدارة'),
        (r'\bإلعادة\b', 'لإعادة'),
        (r'\bإلصالح\b', 'لإصلاح'),
        (r'\bإلخالء\b', 'لإخلاء'),
        (r'\bإلخطار\b', 'لإخطار'),
        (r'\bإلجراء\b', 'لإجراء'),
        (r'\bإلثبات\b', 'لإثبات'),
        (r'\bإلضافة\b', 'لإضافة'),
        (r'\bإلغالق\b', 'لإغلاق'),
        (r'\bإللغاء\b', 'لإلغاء'),
        (r'\bإلنهاء\b', 'لإنهاء'),
        (r'\bإلبراء\b', 'لإبراء'),
        (r'\bإلصدار\b', 'لإصدار'),
        (r'\bسالمة\b', 'سلامة'),
        (r'\bبسالمة\b', 'بسلامة'),
        (r'\bوسالمة\b', 'وسلامة'),
        (r'\bالسالمة\b', 'السلامة'),
        (r'\bبالسالمة\b', 'بالسلامة'),
        (r'\bوالسالمة\b', 'والسلامة'),
        (r'\bالزمة\b', 'لازمة'),
        (r'\bالزم\b', 'لازم'),
        (r'\bالزماً\b', 'لازماً'),
        (r'\bالزمتين\b', 'لازمتين'),
        (r'\bالزمين\b', 'لازمين'),
        (r'\bالفتات\b', 'لافتات'),
        (r'\bالالفتات\b', 'اللافتات'),
        (r'\bبالالفتات\b', 'باللافتات'),
        (r'\bإخالال\b', 'إخلالاً'),
        (r'\bاستعماال\b', 'استعمالاً'),
        (r'\bاستعمالا\b', 'استعمالاً'),
        (r'\bاعتبارا\b', 'اعتباراً'),
        (r'\bفعليا\b', 'فعلياً'),
        (r'\bفعليًا\b', 'فعلياً'),
        (r'\bكليا\b', 'كلياً'),
        (r'\bكليًا\b', 'كلياً'),
        (r'\bجزئيا\b', 'جزئياً'),
        (r'\bجزئيًا\b', 'جزئياً'),
        (r'\bنهائيا\b', 'نهائياً'),
        (r'\bنهائيًا\b', 'نهائياً'),
        (r'\bمستقال\b', 'مستقلاً'),
        (r'\bمستقلا\b', 'مستقلاً'),
        (r'\bمستقلاً\b', 'مستقلاً'),
        (r'\bمستقالً\b', 'مستقلاً'),
        (r'\bمسبقا\b', 'مسبقاً'),
        (r'\bمسبقًا\b', 'مسبقاً'),
        (r'\bمقدما\b', 'مقدماً'),
        (r'\bمقدمًا\b', 'مقدماً'),
        (r'\bصريحا\b', 'صريحاً'),
        (r'\bصريحًا\b', 'صريحاً'),
        (r'\bضمنيا\b', 'ضمنياً'),
        (r'\bضمنيًا\b', 'ضمنياً'),
        (r'\bقانونيا\b', 'قانونياً'),
        (r'\bقانونيًا\b', 'قانونياً'),
        (r'\bمباشرا\b', 'مباشراً'),
        (r'\bمباشرًا\b', 'مباشراً'),
        (r'\bمباشرة\b', 'مباشرةً'),
        (r'\bكتابة\b', 'كتابةً'),
        (r'\bرضائيا\b', 'رضائياً'),
        (r'\bرضائيًا\b', 'رضائياً'),
        (r'\bقضائيا\b', 'قضائياً'),
        (r'\bقضائيًا\b', 'قضائياً'),
        (r'\bمكمال\b', 'مكملاً'),
        (r'\bومكمال\b', 'ومكملاً'),
        (r'\bومفسرا\b', 'ومفسراً'),
        (r'\bومفسرًا\b', 'ومفسراً'),
        (r'\bجزءا\b', 'جزءاً'),
        (r'\bجزءًا\b', 'جزءاً'),
    ]

    for pat, repl in lam_alif_fixes:
        text = re.sub(pat, repl, text)

    # 4. Fix scrambled OCR preambles across all contracts
    scrambled_preambles = [
        (
            r'ومفسرا لجميع أحكامه\s*،?\s*وتكون له ذات الحجية القانونية[\s\"\'”’]*ومكملا? ويُعد هذا التمهيد جزءا? ال يتجزأ من هذا العقد\s*،?',
            'ويُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد، ومكملاً ومفسراً لجميع أحكامه، وتكون له ذات الحجية القانونية المقررة له.'
        ),
        (
            r'ومفسرا لجميع أحكامه\s*،?\s*وتكون له ذات الحجية القانونية[\s\"\'”’]*ومكملا? وتُعد هذا التمهيد جزءا? ال يتجزأ من هذا العقد\s*،?',
            'وتُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد، ومكملاً ومفسراً لجميع أحكامه، وتكون له ذات الحجية القانونية المقررة له.'
        ),
        (
            r'ومفسرا لجميع أحكامه\s*،?\s*وتكون له ذات الحجية القانونية[\s\"\'”’]*ومكملاً? ويُعد هذا التمهيد جزءاً? لا يتجزأ من هذا العقد\s*،?',
            'ويُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد، ومكملاً ومفسراً لجميع أحكامه، وتكون له ذات الحجية القانونية المقررة له.'
        ),
        (
            r'ومفسرا لجميع أحكامه\s*،?\s*وتكون له ذات الحجية القانونية[\s\"\'”’]*ومكملاً? وتُعد هذا التمهيد جزءاً? لا يتجزأ من هذا العقد\s*،?',
            'وتُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد، ومكملاً ومفسراً لجميع أحكامه، وتكون له ذات الحجية القانونية المقررة له.'
        ),
        (
            r'ومفسرا لجميع أحكامه\s*،?\s*ويُقرأ معه كوحدة واحدة عند تفسير بنوده أو تنفيذها[\s\"\'”’]*ومكملا? ويُعد هذا التمهيد جزءا? ال يتجزأ من هذا العقد\s*،?',
            'ويُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد، ومكملاً ومفسراً لجميع أحكامه، ويُقرأ معه كوحدة واحدة عند تفسير بنوده أو تنفيذها.'
        ),
        (
            r'ومفسرا ألحكامه\s*،?\s*وتُقرأ نصوص العقد وتُفسر في ضوء ما ورد به[\s\"\'”’]*ومكملا? يُعد التمهيد السابق جزءا? ال يتجزأ من هذا العقد',
            'يُعد التمهيد السابق جزءاً لا يتجزأ من هذا العقد ومكملاً ومفسراً لأحكامه، وتُقرأ نصوص العقد وتُفسر في ضوء ما ورد به.'
        ),
        (
            r'ومفسرا لأحكامه\s*،?\s*وتُقرأ نصوص العقد وتُفسر في ضوء ما ورد به[\s\"\'”’]*ومكملاً? يُعد التمهيد السابق جزءاً? لا يتجزأ من هذا العقد',
            'يُعد التمهيد السابق جزءاً لا يتجزأ من هذا العقد ومكملاً ومفسراً لأحكامه، وتُقرأ نصوص العقد وتُفسر في ضوء ما ورد به.'
        ),
    ]
    for pat, repl in scrambled_preambles:
        text = re.sub(pat, repl, text, flags=re.IGNORECASE)

    # 5. Fix numbers glued to Arabic words like '2مصاريف', '3رسوم', '4الضرائب'
    text = re.sub(r'([^\n\d])\s*([1-9])([أ-ي])', r'\1\n\n.\2 \3', text)
    text = re.sub(r'([^\n])\s*\.(\d+)\s*([^\d\s])', r'\1\n\n.\2 \3', text)
    text = re.sub(r'([^\n])\s*\.(\d+)\s+', r'\1\n\n.\2 ', text)
    text = re.sub(r'^\.(\d+)([^\d\s])', r'.\1 \2', text)
    text = re.sub(r'\n\.(\d+)([^\d\s])', r'\n.\1 \2', text)

    # 6. Punctuation formatting:
    # Remove English comma without space or glued commas
    text = re.sub(r',([^\s])', r'، \1', text)
    text = re.sub(r',', '،', text)
    text = re.sub(r'\s+،', '،', text)
    text = re.sub(r'،([^\s\d\)])', r'، \1', text)
    text = re.sub(r'\s+:', ':', text)
    text = re.sub(r':([^\s\d\)])', r': \1', text)
    text = re.sub(r'\.\.+', '.', text)
    text = re.sub(r' +', ' ', text)

    # 7. Merge non-bullet broken lines within paragraphs
    blocks = [b.strip() for b in re.split(r'\n\s*\n', text) if b.strip()]
    cleaned_blocks = []
    for block in blocks:
        lines = block.split('\n')
        merged_lines = []
        current_line = ""
        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
            is_bullet = bool(re.match(r'^(\.\d+|\d+\.|\([^\)]+\)|[أ-ي]\)|أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|ثامناً|تاسعاً|عاشراً|•|\-)', line_str))
            if is_bullet:
                if current_line:
                    merged_lines.append(current_line)
                current_line = line_str
            else:
                if current_line:
                    current_line = current_line + " " + line_str
                else:
                    current_line = line_str
        if current_line:
            merged_lines.append(current_line)

        for l in merged_lines:
            l = re.sub(r'[ \t]+', ' ', l).strip()
            if l:
                cleaned_blocks.append(l)

    res = "\n\n".join(cleaned_blocks)
    res = re.sub(r'\.\.+', '.', res)
    res = re.sub(r' +([،\.\:\؛\)])', r'\1', res)
    res = re.sub(r'([،\؛\:])([^\s\d\)])', r'\1 \2', res)
    return res.strip()

print("Applying comprehensive cleaner to all templates...")

for template_data in [rental_data, sale_data, freelance_data]:
    # Clean legalClauses
    for clause in template_data.get('legalClauses', []):
        if 'titleAr' in clause and clause['titleAr']:
            clause['titleAr'] = clean_arabic_text(clause['titleAr'])
        if 'bodyAr' in clause and clause['bodyAr']:
            clause['bodyAr'] = clean_arabic_text(clause['bodyAr'])

    # Clean variant steps and fields
    for variant in template_data.get('variants', []):
        for step in variant.get('steps', []):
            if 'titleAr' in step and step['titleAr']:
                step['titleAr'] = clean_arabic_text(step['titleAr'])
            if 'articleRange' in step and step['articleRange']:
                step['articleRange'] = clean_arabic_text(step['articleRange'])
            for field in step.get('fields', []):
                if 'labelAr' in field and field['labelAr']:
                    field['labelAr'] = clean_arabic_text(field['labelAr'])
                if 'helpText' in field and field['helpText']:
                    field['helpText'] = clean_arabic_text(field['helpText'])

rental_path.write_text(json.dumps(rental_data, ensure_ascii=False, indent=2), encoding='utf-8')
sale_path.write_text(json.dumps(sale_data, ensure_ascii=False, indent=2), encoding='utf-8')
freelance_path.write_text(json.dumps(freelance_data, ensure_ascii=False, indent=2), encoding='utf-8')
print("JSON files cleaned successfully.")
