from pathlib import Path
import json,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def add(key,ok,details=''): checks.append({'key':key,'passed':bool(ok),'details':details})

def tree_text(root):
    out=[]
    for p in (ROOT/root).rglob('*'):
        if p.is_file() and p.suffix in {'.ts','.tsx','.php'} and not any(x in p.parts for x in ('node_modules','.next','dist','vendor')):
            out.append(p.read_text(encoding='utf-8',errors='ignore'))
    return '\n'.join(out)

dash=tree_text('dashboard/src')
board=read('dashboard/src/components/admin/ServiceRequestsBoard.tsx')
payments=read('dashboard/src/app/(dashboard)/payments/page.tsx')
work=read('dashboard/src/app/(dashboard)/work/page.tsx')
work_detail=read('dashboard/src/app/(dashboard)/work/[id]/page.tsx')
pricing=read('dashboard/src/app/(dashboard)/pricing/page.tsx')
settings=read('dashboard/src/app/(dashboard)/settings/page.tsx')
overview=read('dashboard/src/app/(dashboard)/page.tsx')
nav=read('dashboard/src/config/adminNavigation.ts')
features=read('dashboard/src/config/dashboardFeatures.ts')
backend_features=read('backend/config/zdraft.php')
summary=read('backend/app/Http/Controllers/DashboardController.php')

add('no_native_dashboard_prompt_confirm_alert', not re.search(r'window\.(?:prompt|confirm|alert)\s*\(',dash))
add('shared_admin_dialog_present',(ROOT/'dashboard/src/components/admin/AdminDialog.tsx').exists())
add('payment_review_modal','AdminDialog' in payments and 'تأكيد الاعتماد' in payments and 'سبب رفض الإيصال مطلوب' in payments)
add('consultation_status_modal','AdminDialog' in board and 'إظهار الملاحظة للعميل وإرسال إشعار له' in board)
add('consultation_meeting_modal','تحديد موعد الاستشارة' in board and 'datetime-local' in board and all(x in board for x in ['zoom','whatsapp']))
add('office_channel_stays_hidden','office' not in re.sub(r'officeContext|officeContract|office_', '', board.lower()))
add('assignment_status_hidden_from_launch_ui','selectableStatuses' in board and 'status !== "assigned"' in board and 'selectableStatuses' in work_detail)
add('work_queue_customer_copy_clean','إنشاء عقود، مراجعات' not in work and 'الاستشارات والمتابعات التي تحتاج إجراء' in work and 'فتح ومتابعة' in work)
add('work_queue_arabic_type_priority','requestTypeLabels' in work and 'priorityLabels' in work)
add('overview_needs_attention_semantics','needs_attention' in summary and 'استشارات جديدة تحتاج متابعة' in overview)
add('legacy_summary_key_retained','AS unassigned' in summary)
add('pricing_no_internal_terminology', 'Parent Template' not in pricing and 'Variants' not in pricing and '{t.slug}' not in pricing and 'أسعار العقود' in pricing)
add('settings_hide_internal_keys','>{name}</span>' not in settings and 'بيانات الدخول الحساسة' in settings)
add('settings_customer_friendly_messaging',all(x not in settings for x in ['App Password','Resend','Outbox','Web Push','WhatsApp Business API']))
add('pricing_nav_simple','href: "/pricing", label: "الأسعار"' in nav)
add('single_super_admin_flags_default_off',all(x in features for x in ['NEXT_PUBLIC_ENABLE_TEAM_MANAGEMENT, false','NEXT_PUBLIC_ENABLE_ASSIGNMENT, false','NEXT_PUBLIC_ENABLE_OFFICE_CONTRACT_CREATION, false','NEXT_PUBLIC_ENABLE_CONTRACT_EDITING, false','NEXT_PUBLIC_ENABLE_TEMPLATE_MANAGEMENT, false']))
add('backend_hidden_features_default_off',"env('FEATURE_TEAM_MANAGEMENT', false)" in backend_features and "env('FEATURE_ASSIGNMENT', false)" in backend_features)
add('work_detail_timeline_human_labels','eventLabels' in work_detail and 'channelLabels' in work_detail)

# Parse TS/TSX without dependency resolution
node_script=r'''
const fs=require('fs'),path=require('path'),ts=require('typescript');
let files=[];for(const root of ['dashboard/src','frontend/src','packages/template-engine/src']){const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(n))files.push(p)}};walk(root)}
let errors=[];for(const f of files){const src=fs.readFileSync(f,'utf8'),kind=f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS,sf=ts.createSourceFile(f,src,ts.ScriptTarget.ES2022,true,kind);for(const d of sf.parseDiagnostics||[])errors.push({file:f,message:ts.flattenDiagnosticMessageText(d.messageText,' ')});}console.log(JSON.stringify({files:files.length,errors}));process.exit(errors.length?1:0);
'''
proc=subprocess.run(['node','-e',node_script],cwd=ROOT,capture_output=True,text=True)
try: details=json.loads(proc.stdout.strip() or '{}')
except: details={'stdout':proc.stdout,'stderr':proc.stderr}
add('typescript_parse',proc.returncode==0,details)

result={'version':'V27','status':'passed' if all(x['passed'] for x in checks) else 'failed','passed':sum(x['passed'] for x in checks),'total':len(checks),'checks':checks}
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(0 if result['status']=='passed' else 1)
