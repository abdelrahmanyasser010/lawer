import json
import re
from pathlib import Path

ROOT = Path(r"d:\android tog\laywer")

SPECIFIC_FIXES = [
    # 1. Double dots & dangling punctuation
    (r'\.\.+', '.'),
    (r'،\s*،+', '،'),
    (r'\s+،', '،'),
    (r'([^\s])،([^\s])', r'\1، \2'),
    (r'([^\s]):([^\s])', r'\1: \2'),
    (r'\s+:', ':'),

    # 2. Numbered bullets formatting: ensure `.1 ` is preceded by newline
    (r'([^\n])\s*\.(\d+)\s*([^\d\s])', r'\1\n\n.\2 \3'),
    (r'([^\n])\s*\.(\d+)\s+', r'\1\n\n.\2 '),
    (r'^\.(\d+)([^\d\s])', r'.\1 \2'),
    (r'\n\.(\d+)([^\d\s])', r'\n.\1 \2'),

    # 3. Known OCR inverted phrases across all templates:
    # Preamble endings
    (
        r'ومفسرا لجميع أحكامه\s*،?\s*وتكون له ذات الحجية القانونية\s*[\r\n\s]*ومكمال ويُعد هذا التمهيد جزءاً ال يتجزأ من هذا العقد،?',
        'ويُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد، ومكملاً ومفسراً لجميع أحكامه، وتكون له ذات الحجية القانونية المقررة له.'
    ),
    (
        r'ومفسرا لجميع أحكامه\s*،?\s*وتكون له ذات الحجية القانونية\s*[\r\n\s]*ومكمال وتُعد هذا التمهيد جزءاً ال يتجزأ من هذا العقد،?',
        'وتُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد، ومكملاً ومفسراً لجميع أحكامه، وتكون له ذات الحجية القانونية المقررة له.'
    ),
    (
        r'ومفسرا لجميع أحكامه\s*،?\s*وتكون له ذات الحجية القانونية\s*[\r\n\s]*ومكمال ويُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد،?',
        'ويُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد، ومكملاً ومفسراً لجميع أحكامه، وتكون له ذات الحجية القانونية المقررة له.'
    ),
    (
        r'ومفسرا لجميع أحكامه\s*،?\s*وتكون له ذات الحجية القانونية\s*[\r\n\s]*ومكمال وتُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد،?',
        'وتُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد، ومكملاً ومفسراً لجميع أحكامه، وتكون له ذات الحجية القانونية المقررة له.'
    ),
    (
        r'ومفسرا لجميع أحكامه\s*،?\s*ويُقرأ معه كوحدة واحدة عند تفسير بنوده أو تنفيذها\.\s*[\r\n\s]*ومكمال ويُعد هذا التمهيد جزءاً ال يتجزأ من هذا العقد،?',
        'ويُعد هذا التمهيد جزءاً لا يتجزأ من هذا العقد، ومكملاً ومفسراً لجميع أحكامه، ويُقرأ معه كوحدة واحدة عند تفسير بنوده أو تنفيذها.'
    ),
    (
        r'ومفسرا ألحكامه\s*،\s*وتُقرأ نصوص العقد وتُفسر في ضوء ما ورد به\.\s*[\r\n\s]*ومكمال يُعد التمهيد السابق جزءاً ال يتجزأ من هذا العقد',
        'يُعد التمهيد السابق جزءاً لا يتجزأ من هذا العقد ومكملاً ومفسراً لأحكامه، وتُقرأ نصوص العقد وتُفسر في ضوء ما ورد به.'
    ),
    (
        r'ومفسرا ألحكامه\s*،\s*وتُقرأ نصوص العقد وتُفسر في ضوء ما ورد به\.\s*[\r\n\s]*ومكملاً يُعد التمهيد السابق جزءاً لا يتجزأ من هذا العقد',
        'يُعد التمهيد السابق جزءاً لا يتجزأ من هذا العقد ومكملاً ومفسراً لأحكامه، وتُقرأ نصوص العقد وتُفسر في ضوء ما ورد به.'
    ),
    # Article 5 Duration scramble
    (
        r'اعتبارا من \{\{start_date\}\} وتنتهي في \{\{end_date\}\}\s*،?\s*وال يجوز تعديل مدة هذا العقد أو مدها أو تقصيرها إال\s*[\r\n\s]*\.1\s*مدة العقد\s*:\s*مدة هذا العقد هي \{\{lease_duration_text\}\}\s*،?\s*تبدأ\s*بموجب اتفاق كتابي صريح موقع من الطرفين\.',
        '.1 مدة الإيجار: مدة هذا العقد هي {{lease_duration_text}}، تبدأ اعتباراً من {{start_date}} وتنتهي في {{end_date}}، ولا يجوز تعديل مدة هذا العقد أو مدها أو تقصيرها إلا بموجب اتفاق كتابي صريح موقع من الطرفين.'
    ),
    (
        r'اعتبارا من \{\{start_date\}\} وتنتهي في \{\{end_date\}\}\s*،?\s*ولا يجوز تعديل مدة هذا العقد أو مدها أو تقصيرها إلا\s*[\r\n\s]*\.1\s*مدة العقد\s*:\s*مدة هذا العقد هي \{\{lease_duration_text\}\}\s*،?\s*تبدأ\s*بموجب اتفاق كتابي صريح موقع من الطرفين\.',
        '.1 مدة الإيجار: مدة هذا العقد هي {{lease_duration_text}}، تبدأ اعتباراً من {{start_date}} وتنتهي في {{end_date}}، ولا يجوز تعديل مدة هذا العقد أو مدها أو تقصيرها إلا بموجب اتفاق كتابي صريح موقع من الطرفين.'
    ),
    # Article 6 Scrambled usage bounds
    (
        r'استعماال مشروعًا يتفق مع طبيعتها والغرض المؤجرة من أجله،\s*\.2\s*حدود االنتفاع\s*:\s*يلتزم الطرف الثاني باستعمال (العين|الوحدة) المؤجرة',
        '\n\n.2 حدود الانتفاع: يلتزم الطرف الثاني باستعمال \\1 المؤجرة استعمالاً مشروعاً يتفق مع طبيعتها والغرض المؤجرة من أجله،'
    ),
    (
        r'استعمالا مشروعًا يتفق مع طبيعتها والغرض المؤجرة من أجله،\s*\.2\s*حدود الانتفاع\s*:\s*يلتزم الطرف الثاني باستعمال (العين|الوحدة) المؤجرة',
        '\n\n.2 حدود الانتفاع: يلتزم الطرف الثاني باستعمال \\1 المؤجرة استعمالاً مشروعاً يتفق مع طبيعتها والغرض المؤجرة من أجله،'
    ),
    (
        r'استعمالاً مشروعًا يتفق مع طبيعتها والغرض المؤجرة من أجله،\s*\.2\s*حدود الانتفاع\s*:\s*يلتزم الطرف الثاني باستعمال (العين|الوحدة) المؤجرة',
        '\n\n.2 حدود الانتفاع: يلتزم الطرف الثاني باستعمال \\1 المؤجرة استعمالاً مشروعاً يتفق مع طبيعتها والغرض المؤجرة من أجله،'
    ),
    # Article 6 Inverted headquarters
    (
        r'مقرا ألي نشاط أو استخراج\s*[\r\n\s]*مقرا قانونيًا لغير الغرض المتفق عليه\s*:\s*ال يجوز للطرف الثاني اتخاذ العين المؤجرة ً\s*[\r\n\s]*\.4\s*حظر اتخاذ العين ً\s*[\r\n\s]*أي تراخيص',
        '.4 حظر اتخاذ العين مقراً قانونياً لغير الغرض المتفق عليه: لا يجوز للطرف الثاني اتخاذ العين المؤجرة مقراً لأي نشاط أو استخراج أي تراخيص'
    ),
    (
        r'مقرا ألي نشاط أو استخراج\s*[\r\n\s]*مقرا قانونيًا لغير الغرض المتفق عليه\s*:\s*لا يجوز للطرف الثاني اتخاذ العين المؤجرة ً\s*[\r\n\s]*\.4\s*حظر اتخاذ العين ً\s*[\r\n\s]*أي تراخيص',
        '.4 حظر اتخاذ العين مقراً قانونياً لغير الغرض المتفق عليه: لا يجوز للطرف الثاني اتخاذ العين المؤجرة مقراً لأي نشاط أو استخراج أي تراخيص'
    ),
    # Article 6 breach clause ending
    (
        r'إخالال جوهريًا تسري بشأنه أحكام المادة \(15\)\s*من هذا العقد\.\s*عليها في هذه المادة\s*،\s*يُعد',
        'عليها في هذه المادة، يُعد إخلالاً جوهرياً تسري بشأنه أحكام المادة (15) من هذا العقد.'
    ),
    # Article 11 Utilities scramble
    (
        r'اعتبارا من تاريخ تسلمه العين المؤجرة وحتى تاريخ ردها وتسليمها فعليًا\s*[\r\n\s]*\.1\s*استهالك المرافق والخدمات\s*:\s*يتحمل الطرف الثاني،\s*[\r\n\s]*للطرف األول',
        '.1 استهلاك المرافق والخدمات: يتحمل الطرف الثاني، اعتباراً من تاريخ تسلمه العين المؤجرة وحتى تاريخ ردها وتسليمها فعلياً للطرف الأول'
    ),
    (
        r'اعتباراً من تاريخ تسلمه العين المؤجرة وحتى تاريخ ردها وتسليمها فعلياً\s*[\r\n\s]*\.1\s*استهلاك المرافق والخدمات\s*:\s*يتحمل الطرف الثاني،\s*[\r\n\s]*للطرف الأول',
        '.1 استهلاك المرافق والخدمات: يتحمل الطرف الثاني، اعتباراً من تاريخ تسلمه العين المؤجرة وحتى تاريخ ردها وتسليمها فعلياً للطرف الأول'
    ),
    # Article 12 Delivery scramble
    (
        r'\.1\s*تسليم العين المؤجرة\s*:\s*يقر الطرفان بأن الطرف األول \(المؤجر\) قام بتسليم العين المؤجرة إلى الطرف الثاني \(المستأجر\) بالحالة\s*[\r\n\s]*اعتبارا من تاريخ التسليم المتفق عليه وهو\(كما هو مثبت ببيانات العقد\)\s*،\s*ويُعد توقيع الطرفين\s*[\r\n\s]*المبينة بهذا العقد\s*،\s*صالحة لالنتفاع بالغرض المؤجرة من أجله\s*،\s*وذلك\s*[\r\n\s]*إقرارا بتمام التسليم وانتقال الحيازة\s*،\s*ما لم يتفق الطرفان\s*[\r\n\s]*على هذا العقد\s*،\s*مع حلول تاريخ التسليم المحدد به أو بمحضر استالم مستقل،\s*[\r\n\s]*كتابةً على خلاف ذلك\.',
        '.1 تسليم العين المؤجرة: يقر الطرفان بأن الطرف الأول (المؤجر) قام بتسليم العين المؤجرة إلى الطرف الثاني (المستأجر) بالحالة المبينة بهذا العقد، صالحة للانتفاع بالغرض المؤجرة من أجله، وذلك اعتباراً من تاريخ التسليم المتفق عليه وهو (المثبت ببيانات العقد)، ويُعد توقيع الطرفين على هذا العقد، مع حلول تاريخ التسليم المحدد به أو بمحضر استلام مستقل، إقراراً بتمام التسليم وانتقال الحيازة، ما لم يتفق الطرفان كتابةً على خلاف ذلك.'
    ),
    (
        r'اعتبارا من تاريخ التسليم\s*،\s*الحيازة المادية للعين المؤجرة بقصد االنتفاع بها\s*[\r\n\s]*\.2\s*انتقال الحيازة واالنتفاع\s*:\s*تنتقل إلى الطرف الثاني،\s*[\r\n\s]*واستعمالها',
        '.2 انتقال الحيازة والانتفاع: تنتقل إلى الطرف الثاني، اعتباراً من تاريخ التسليم، الحيازة المادية للعين المؤجرة بقصد الانتفاع بها واستعمالها'
    ),
    (
        r'اعتبارا من تاريخ التسليم\s*،\s*المسؤولية عن جميع األفعال أو المخالفات أو األضرار الناشئة\s*[\r\n\s]*\.3\s*انتقال المسؤولية\s*:\s*يتحمل الطرف الثاني،\s*[\r\n\s]*عن استعماله',
        '.3 انتقال المسؤولية: يتحمل الطرف الثاني، اعتباراً من تاريخ التسليم، المسؤولية عن جميع الأفعال أو المخالفات أو الأضرار الناشئة عن استعماله'
    ),
    (
        r'\.4\s*محضر االستالم \(إن ُوجد\)\s*:\s*إذا اتفق الطرفان على تحرير محضر استالم مستقل للعين المؤجرة\s*،\s*يُعد هذا المحضر جزءاً ال يتجزأ من\s*[\r\n\s]*ومفسرا ألحكامه\s*،\s*وتكون له ذات الحجية القانونية فيما تضمنه من بيانات تتعلق بحالة العين المؤجرة وملحقاتها\s*[\r\n\s]*ومكمال هذا العقد\s*[\r\n\s]*ومحتوياتها',
        '.4 محضر الاستلام (إن وُجد): إذا اتفق الطرفان على تحرير محضر استلام مستقل للعين المؤجرة، يُعد هذا المحضر جزءاً لا يتجزأ من هذا العقد ومكملاً ومفسراً لأحكامه، وتكون له ذات الحجية القانونية فيما تضمنه من بيانات تتعلق بحالة العين المؤجرة وملحقاتها ومحتوياتها'
    ),
    # Article 14 Handover delay scramble
    (
        r'\.3\s*التأخر في اإلخالء\s*:\s*إذا تأخر الطرف الثاني في رد العين المؤجرة بعد انتهاء العالقة اإليجارية\s*،\s*التزم بأداء التعويض االتفاقي اليومي\s*[\r\n\s]*اعتبارا من اليوم التالي لتاريخ وجوب اإلخالء وحتى تاريخ الرد الفعلي للعين\s*،\s*دون إخالل\s*[\r\n\s]*المتفق عليه عن مدة التأخير\s*،\s*إن ُوجد\s*،\s*وذلك\s*[\r\n\s]*بحق الطرف األول',
        '.3 التأخر في الإخلاء: إذا تأخر الطرف الثاني في رد العين المؤجرة بعد انتهاء العلاقة الإيجارية، التزم بأداء التعويض الاتفاقي اليومي المتفق عليه عن مدة التأخير، إن وُجد، وذلك اعتباراً من اليوم التالي لتاريخ وجوب الإخلاء وحتى تاريخ الرد الفعلي للعين، دون إخلال بحق الطرف الأول'
    ),
    # Article 9 repairs responsibility scramble
    (
        r'مسؤولاً عن أي أضرار أو تلفيات تنشأ بسبب فعله أو إهماله أو فعل تابعيه أو أفراد أسرته أو أي بالمبنى أو بالمرافق المشتركة\s*،\s*ويكون',
        'بالمبنى أو بالمرافق المشتركة، ويكون مسؤولاً عن أي أضرار أو تلفيات تنشأ بسبب فعله أو إهماله أو فعل تابعيه أو أفراد أسرته أو أي شخص يسمح له بالدخول'
    ),
    (
        r'مسؤولاً عن األضرار اإلضافية المؤجرة أو بالمرافق التابعة لها\s*،\s*متى كان من شأنه التأثير على سالمتها أو زيادة حجم الضرر\s*،\s*ويكون',
        'المؤجرة أو بالمرافق التابعة لها، متى كان من شأنه التأثير على سلامتها أو زيادة حجم الضرر، ويكون مسؤولاً عن الأضرار الإضافية'
    ),
    (
        r'إخالال جوهريًا بأحكام العقد\s*،\s*ويترتب\s*\.7\s*اإلخالل بالتزامات هذه المادة\s*:\s*يُعد اإلخالل بأي من االلتزامات الجوهرية الواردة بهذه المادة',
        '.7 الإخلال بالتزامات هذه المادة: يُعد الإخلال بأي من الالتزامات الجوهرية الواردة بهذه المادة إخلالاً جوهرياً بأحكام العقد، ويترتب'
    ),
    # Commercial lease article 12 delivery scramble
    (
        r'\.1\s*تسليم الوحدة المؤجرة\s*:\s*يقر الطرفان بأن الطرف األول \(المؤجر\) قام بتسليم الوحدة المؤجرة إلى الطرف الثاني \(المستأجر\) بالحالة\s*[\r\n\s]*اعتبارا من تاريخ التسليم المتفق عليه وهو\(كما هو مثبت ببيانات العقد\)\s*،\s*ويُعد توقيع الطرفين\s*[\r\n\s]*المبينة بهذا العقد\s*،\s*صالحة لالنتفاع بالغرض المؤجرة من أجله\s*،\s*وذلك\s*[\r\n\s]*إقرارا بتمام التسليم وانتقال الحيازة\s*،\s*ما لم يتفق الطرفان\s*[\r\n\s]*على هذا العقد\s*،\s*مع حلول تاريخ التسليم المحدد به أو بمحضر استالم مستقل،\s*[\r\n\s]*كتابةً على خلاف ذلك\.',
        '.1 تسليم الوحدة المؤجرة: يقر الطرفان بأن الطرف الأول (المؤجر) قام بتسليم الوحدة المؤجرة إلى الطرف الثاني (المستأجر) بالحالة المبينة بهذا العقد، صالحة للانتفاع بالغرض المؤجرة من أجله، وذلك اعتباراً من تاريخ التسليم المتفق عليه وهو (المثبت ببيانات العقد)، ويُعد توقيع الطرفين على هذا العقد، مع حلول تاريخ التسليم المحدد به أو بمحضر استلام مستقل، إقراراً بتمام التسليم وانتقال الحيازة، ما لم يتفق الطرفان كتابةً على خلاف ذلك.'
    ),
    (
        r'اعتبارا من تاريخ التسليم\s*،\s*الحيازة المادية للوحدة المؤجرة بقصد االنتفاع بها\s*[\r\n\s]*\.2\s*انتقال الحيازة واالنتفاع\s*:\s*تنتقل إلى الطرف الثاني،\s*[\r\n\s]*واستعمالها',
        '.2 انتقال الحيازة والانتفاع: تنتقل إلى الطرف الثاني، اعتباراً من تاريخ التسليم، الحيازة المادية للوحدة المؤجرة بقصد الانتفاع بها واستعمالها'
    ),
    (
        r'اعتبارا من تاريخ التسليم\s*،\s*المسؤولية عن جميع األفعال أو المخالفات أو األضرار الناشئة\s*[\r\n\s]*\.3\s*انتقال المسؤولية\s*:\s*يتحمل الطرف الثاني،\s*[\r\n\s]*عن استعماله',
        '.3 انتقال المسؤولية: يتحمل الطرف الثاني، اعتباراً من تاريخ التسليم، المسؤولية عن جميع الأفعال أو المخالفات أو الأضرار الناشئة عن استعماله'
    ),
    (
        r'\.4\s*محضر االستالم \(إن ُوجد\)\s*:\s*إذا اتفق الطرفان على تحرير محضر استالم مستقل للوحدة المؤجرة\s*،\s*يُعد هذا المحضر جزءاً ال يتجزأ من\s*[\r\n\s]*ومفسرا ألحكامه\s*،\s*وتكون له ذات الحجية القانونية فيما تضمنه من بيانات تتعلق بحالة الوحدة المؤجرة وملحقاتها\s*[\r\n\s]*ومكمال هذا العقد\s*[\r\n\s]*ومحتوياتها',
        '.4 محضر الاستلام (إن وُجد): إذا اتفق الطرفان على تحرير محضر استلام مستقل للوحدة المؤجرة، يُعد هذا المحضر جزءاً لا يتجزأ من هذا العقد ومكملاً ومفسراً لأحكامه، وتكون له ذات الحجية القانونية فيما تضمنه من بيانات تتعلق بحالة الوحدة المؤجرة وملحقاتها ومحتوياتها'
    ),
    # Freelance review period formatting
    (
        r'\(البيان المثبت بجدول بيانات العقد أو الملحق\)\s*3\s*أيام عمل',
        '3 أيام عمل (أو البيان المثبت بجدول بيانات العقد أو الملحق)'
    ),
    (
        r'\(البيان المثبت بجدول بيانات العقد أو الملحق\)\s*15\s*يوم',
        '15 يوماً (أو البيان المثبت بجدول بيانات العقد أو الملحق)'
    ),
    (
        r'خمسة عشر \(البيان المثبت بجدول بيانات العقد\)\s*15\s*يو\s*ً\s*ما',
        'خمسة عشر (15) يوماً (أو البيان المثبت بجدول بيانات العقد)'
    ),
    (
        r'\(البيان المثبت بجدول بيانات العقد\)\s*15\s*يو\s*ً\s*ما',
        '15 يوماً (أو البيان المثبت بجدول بيانات العقد)'
    ),
]

def clean_body_text(text: str) -> str:
    for pat, repl in SPECIFIC_FIXES:
        text = re.sub(pat, repl, text)

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
    return res

print("Starting clean and sync...")

# 1. Load JSON templates
rental_path = ROOT / "backend/database/template-definitions/rental.json"
sale_path = ROOT / "backend/database/template-definitions/apartment_sale.json"
freelance_path = ROOT / "backend/database/template-definitions/freelancer.json"

rental_data = json.loads(rental_path.read_text(encoding='utf-8'))
sale_data = json.loads(sale_path.read_text(encoding='utf-8'))
freelance_data = json.loads(freelance_path.read_text(encoding='utf-8'))

for data in [rental_data, sale_data, freelance_data]:
    for c in data.get('legalClauses', []):
        if 'bodyAr' in c and c['bodyAr']:
            c['bodyAr'] = clean_body_text(c['bodyAr'])

# Ensure no duplicate clause keys in freelancer.json
seen_freelancer_keys = set()
unique_freelancer_clauses = []
for c in freelance_data.get('legalClauses', []):
    if c['key'] not in seen_freelancer_keys:
        seen_freelancer_keys.add(c['key'])
        unique_freelancer_clauses.append(c)
freelance_data['legalClauses'] = unique_freelancer_clauses

rental_path.write_text(json.dumps(rental_data, ensure_ascii=False, indent=2), encoding='utf-8')
sale_path.write_text(json.dumps(sale_data, ensure_ascii=False, indent=2), encoding='utf-8')
freelance_path.write_text(json.dumps(freelance_data, ensure_ascii=False, indent=2), encoding='utf-8')
print("JSON files cleaned and saved.")

# Group clauses for sourceClauses.ts
salePreliminarySourceClauses = [c for c in sale_data['legalClauses'] if c['key'].startswith('preliminary_sale_source_')]
saleRegistrySourceClauses = [c for c in sale_data['legalClauses'] if c['key'].startswith('registrable_sale_source_')]
saleInheritedSourceClauses = [c for c in sale_data['legalClauses'] if c['key'].startswith('inherited_sale_source_')]
saleInstallmentAnnexSourceClauses = [c for c in sale_data['legalClauses'] if c['key'].startswith('sale_installment_schedule_source_')]

rentalResidentialSourceClauses = [c for c in rental_data['legalClauses'] if c['key'].startswith('residential_lease_source_')]
rentalCommercialSourceClauses = [c for c in rental_data['legalClauses'] if c['key'].startswith('commercial_lease_source_')]
rentalAdministrativeSourceClauses = [c for c in rental_data['legalClauses'] if c['key'].startswith('administrative_lease_source_')]
rentalHandoverAnnexSourceClauses = [c for c in rental_data['legalClauses'] if c['key'].startswith('rental_handover_inventory_report_source_')]

# Build sourceClauses.ts
source_ts = [
    '/* AUTO-GENERATED from the legal PDF files supplied by the law office.',
    ' * Cleaned and synchronized.',
    ' */',
    'import type { LegalClauseDefinition } from "../types";',
    '',
    f'export const salePreliminarySourceClauses: LegalClauseDefinition[] = {json.dumps(salePreliminarySourceClauses, ensure_ascii=False, indent=2)};',
    '',
    f'export const saleRegistrySourceClauses: LegalClauseDefinition[] = {json.dumps(saleRegistrySourceClauses, ensure_ascii=False, indent=2)};',
    '',
    f'export const saleInheritedSourceClauses: LegalClauseDefinition[] = {json.dumps(saleInheritedSourceClauses, ensure_ascii=False, indent=2)};',
    '',
    f'export const rentalResidentialSourceClauses: LegalClauseDefinition[] = {json.dumps(rentalResidentialSourceClauses, ensure_ascii=False, indent=2)};',
    '',
    f'export const rentalCommercialSourceClauses: LegalClauseDefinition[] = {json.dumps(rentalCommercialSourceClauses, ensure_ascii=False, indent=2)};',
    '',
    f'export const rentalAdministrativeSourceClauses: LegalClauseDefinition[] = {json.dumps(rentalAdministrativeSourceClauses, ensure_ascii=False, indent=2)};',
    '',
    f'export const saleInstallmentAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(saleInstallmentAnnexSourceClauses, ensure_ascii=False, indent=2)};',
    '',
    f'export const rentalHandoverAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(rentalHandoverAnnexSourceClauses, ensure_ascii=False, indent=2)};',
    '',
    'export const saleSourceLegalClauses: LegalClauseDefinition[] = [',
    '  ...salePreliminarySourceClauses,',
    '  ...saleRegistrySourceClauses,',
    '  ...saleInheritedSourceClauses,',
    '  ...saleInstallmentAnnexSourceClauses,',
    '];',
    '',
    'export const rentalSourceLegalClauses: LegalClauseDefinition[] = [',
    '  ...rentalResidentialSourceClauses,',
    '  ...rentalCommercialSourceClauses,',
    '  ...rentalAdministrativeSourceClauses,',
    '  ...rentalHandoverAnnexSourceClauses,',
    '];',
    '',
    'export const saleSourceClauseKeysByVariant = {',
    '  "preliminary_sale": ' + json.dumps([c['key'] for c in salePreliminarySourceClauses], indent=4) + ',',
    '  "registrable_sale": ' + json.dumps([c['key'] for c in saleRegistrySourceClauses], indent=4) + ',',
    '  "inherited_sale": ' + json.dumps([c['key'] for c in saleInheritedSourceClauses], indent=4) + ',',
    '  "sale_installment_schedule": ' + json.dumps([c['key'] for c in saleInstallmentAnnexSourceClauses], indent=4),
    '} as const;',
    '',
    'export const rentalSourceClauseKeysByVariant = {',
    '  "residential_lease": ' + json.dumps([c['key'] for c in rentalResidentialSourceClauses], indent=4) + ',',
    '  "commercial_lease": ' + json.dumps([c['key'] for c in rentalCommercialSourceClauses], indent=4) + ',',
    '  "administrative_lease": ' + json.dumps([c['key'] for c in rentalAdministrativeSourceClauses], indent=4) + ',',
    '  "rental_handover_inventory_report": ' + json.dumps([c['key'] for c in rentalHandoverAnnexSourceClauses], indent=4),
    '} as const;',
    ''
]

(ROOT / "packages/template-engine/src/legal-content/sourceClauses.ts").write_text("\n".join(source_ts), encoding='utf-8')
print("sourceClauses.ts generated.")

# Group clauses for freelanceSourceClauses.ts (strictly source clauses)
visualIdentityMain = [c for c in freelance_data['legalClauses'] if c['key'].startswith('visual_identity_design_source_')]
visualIdentityScope = [c for c in freelance_data['legalClauses'] if c['key'].startswith('visual_identity_scope_annex_source_')]
visualIdentityFinancial = [c for c in freelance_data['legalClauses'] if c['key'].startswith('visual_identity_financial_annex_source_')]
visualIdentityApprovals = [c for c in freelance_data['legalClauses'] if c['key'].startswith('visual_identity_approvals_annex_source_')]

websiteMain = [c for c in freelance_data['legalClauses'] if c['key'].startswith('website_development_source_')]
websiteScope = [c for c in freelance_data['legalClauses'] if c['key'].startswith('website_scope_annex_source_')]
websiteTech = [c for c in freelance_data['legalClauses'] if c['key'].startswith('website_technical_annex_source_')]
websiteData = [c for c in freelance_data['legalClauses'] if c['key'].startswith('website_project_data_annex_source_')]
websiteDelivery = [c for c in freelance_data['legalClauses'] if c['key'].startswith('website_delivery_annex_source_')]
websiteSla = [c for c in freelance_data['legalClauses'] if c['key'].startswith('website_sla_annex_source_')]
websiteFuture = [c for c in freelance_data['legalClauses'] if c['key'].startswith('website_future_development_annex_source_')]

socialMain = [c for c in freelance_data['legalClauses'] if c['key'].startswith('social_media_management_source_')]
socialScope = [c for c in freelance_data['legalClauses'] if c['key'].startswith('social_media_scope_annex_source_')]
socialFinancial = [c for c in freelance_data['legalClauses'] if c['key'].startswith('social_media_financial_annex_source_')]

freelance_ts = [
    '/* AUTO-GENERATED from the freelance/service legal PDF files supplied by the law office.',
    ' * Cleaned and synchronized.',
    ' */',
    'import type { LegalClauseDefinition } from "../types";',
    '',
    f'export const visualIdentityMainSourceClauses: LegalClauseDefinition[] = {json.dumps(visualIdentityMain, ensure_ascii=False, indent=2)};',
    '',
    f'export const visualIdentityScopeAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(visualIdentityScope, ensure_ascii=False, indent=2)};',
    '',
    f'export const visualIdentityFinancialAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(visualIdentityFinancial, ensure_ascii=False, indent=2)};',
    '',
    f'export const visualIdentityApprovalsAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(visualIdentityApprovals, ensure_ascii=False, indent=2)};',
    '',
    f'export const websiteDevelopmentMainSourceClauses: LegalClauseDefinition[] = {json.dumps(websiteMain, ensure_ascii=False, indent=2)};',
    '',
    f'export const websiteScopeAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(websiteScope, ensure_ascii=False, indent=2)};',
    '',
    f'export const websiteTechnicalAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(websiteTech, ensure_ascii=False, indent=2)};',
    '',
    f'export const websiteProjectDataAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(websiteData, ensure_ascii=False, indent=2)};',
    '',
    f'export const websiteDeliveryAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(websiteDelivery, ensure_ascii=False, indent=2)};',
    '',
    f'export const websiteSlaAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(websiteSla, ensure_ascii=False, indent=2)};',
    '',
    f'export const websiteFutureDevelopmentAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(websiteFuture, ensure_ascii=False, indent=2)};',
    '',
    f'export const socialMediaMainSourceClauses: LegalClauseDefinition[] = {json.dumps(socialMain, ensure_ascii=False, indent=2)};',
    '',
    f'export const socialMediaScopeAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(socialScope, ensure_ascii=False, indent=2)};',
    '',
    f'export const socialMediaFinancialAnnexSourceClauses: LegalClauseDefinition[] = {json.dumps(socialFinancial, ensure_ascii=False, indent=2)};',
    '',
    'export const freelanceSourceLegalClauses: LegalClauseDefinition[] = [',
    '  ...visualIdentityMainSourceClauses,',
    '  ...visualIdentityScopeAnnexSourceClauses,',
    '  ...visualIdentityFinancialAnnexSourceClauses,',
    '  ...visualIdentityApprovalsAnnexSourceClauses,',
    '  ...websiteDevelopmentMainSourceClauses,',
    '  ...websiteScopeAnnexSourceClauses,',
    '  ...websiteTechnicalAnnexSourceClauses,',
    '  ...websiteProjectDataAnnexSourceClauses,',
    '  ...websiteDeliveryAnnexSourceClauses,',
    '  ...websiteSlaAnnexSourceClauses,',
    '  ...websiteFutureDevelopmentAnnexSourceClauses,',
    '  ...socialMediaMainSourceClauses,',
    '  ...socialMediaScopeAnnexSourceClauses,',
    '  ...socialMediaFinancialAnnexSourceClauses,',
    '];',
    '',
    'export const freelanceSourceClauseKeysByVariant = {',
    '  "visual_identity_design": ' + json.dumps([c['key'] for c in visualIdentityMain], indent=4) + ',',
    '  "website_development": ' + json.dumps([c['key'] for c in websiteMain], indent=4) + ',',
    '  "social_media_management": ' + json.dumps([c['key'] for c in socialMain], indent=4),
    '} as const;',
    '',
    'export const freelanceSourceClauseKeysByAnnex = {',
    '  "visual_identity_scope_annex": ' + json.dumps([c['key'] for c in visualIdentityScope], indent=4) + ',',
    '  "visual_identity_financial_annex": ' + json.dumps([c['key'] for c in visualIdentityFinancial], indent=4) + ',',
    '  "visual_identity_approvals_annex": ' + json.dumps([c['key'] for c in visualIdentityApprovals], indent=4) + ',',
    '  "website_scope_annex": ' + json.dumps([c['key'] for c in websiteScope], indent=4) + ',',
    '  "website_technical_annex": ' + json.dumps([c['key'] for c in websiteTech], indent=4) + ',',
    '  "website_project_data_annex": ' + json.dumps([c['key'] for c in websiteData], indent=4) + ',',
    '  "website_delivery_annex": ' + json.dumps([c['key'] for c in websiteDelivery], indent=4) + ',',
    '  "website_sla_annex": ' + json.dumps([c['key'] for c in websiteSla], indent=4) + ',',
    '  "website_future_development_annex": ' + json.dumps([c['key'] for c in websiteFuture], indent=4) + ',',
    '  "social_media_scope_annex": ' + json.dumps([c['key'] for c in socialScope], indent=4) + ',',
    '  "social_media_financial_annex": ' + json.dumps([c['key'] for c in socialFinancial], indent=4),
    '} as const;',
    ''
]

(ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts").write_text("\n".join(freelance_ts), encoding='utf-8')
print("freelanceSourceClauses.ts generated.")
