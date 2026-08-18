#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,os,re,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
L=ROOT/'backend'
checks=[]
def add(key,passed,details,blocking=True):checks.append({'key':key,'passed':bool(passed),'blocking':blocking,'details':details})
def executable(name):
 candidate=shutil.which(name)
 if candidate:return candidate
 if os.name=='nt':
  candidate=shutil.which(f'{name}.cmd')
  if candidate:return candidate
 return name
def run(cmd,**kw):
 if isinstance(cmd,list) and cmd:
  exe=executable(cmd[0])
  if os.name=='nt' and (exe.lower().endswith('.cmd') or exe.lower().endswith('.bat')):
   kw['shell']=True
  cmd=[exe,*cmd[1:]]
 env=dict(os.environ);env.setdefault('TERM','dumb');env.update(kw.pop('env',{}));return subprocess.run(cmd,capture_output=True,text=True,stdin=subprocess.DEVNULL,env=env,**kw)
# PHP syntax
excluded_parts={'vendor','storage','.next','dist','node_modules'}
php_files=sorted(f for f in L.rglob('*.php') if not any(part in excluded_parts for part in f.relative_to(L).parts));errors=[]
for f in php_files:
 p=run(['php','-l',str(f)])
 if p.returncode:errors.append(f'{f.relative_to(ROOT)}: {(p.stderr or p.stdout).strip()}')
add('php_syntax',not errors,{'files':len(php_files),'errors':errors})
# Controller action references
routes=(L/'routes/api.php').read_text('utf-8');action_issues=[]
for cls,method in re.findall(r'\[([A-Za-z0-9_]+)::class,\s*[\'\"]([A-Za-z0-9_]+)[\'\"]\]',routes):
 p=L/'app/Http/Controllers'/f'{cls}.php'
 if not p.exists():action_issues.append(f'missing controller {cls}')
 elif not re.search(r'function\s+'+re.escape(method)+r'\s*\(',p.read_text('utf-8')):action_issues.append(f'{cls} missing {method}')
add('controller_actions',not action_issues,{'references':len(re.findall(r'\[([A-Za-z0-9_]+)::class,\s*[\'\"]([A-Za-z0-9_]+)[\'\"]\]',routes)),'issues':action_issues})
# Local App classes
unresolved=[]
for f in php_files:
 s=f.read_text('utf-8',errors='ignore')
 for cls in re.findall(r'^use\s+(App\\[A-Za-z0-9_\\]+);',s,re.M):
  rel=Path(*cls.split('\\')[1:]).with_suffix('.php')
  if not (L/'app'/rel).exists():unresolved.append({'file':str(f.relative_to(L)),'class':cls})
add('local_class_references',not unresolved,{'unresolved':unresolved})
# Frozen route parity and actual frontend calls
for key,cmd in [
 ('frozen_route_parity',[sys.executable,str(L/'tools/verify_route_compatibility.py')]),
 ('frontend_dashboard_api_contract',['node',str(L/'tools/verify_frontend_api_contract.mjs')]),
 ('response_shape_contracts',[sys.executable,str(L/'tools/verify_response_contracts_v20.py')]),
 ('sql_placeholder_bindings',[sys.executable,str(L/'tools/verify_sql_placeholders.py')]),
]:
 p=run(cmd)
 try:d=json.loads(p.stdout)
 except:d={'stdout':p.stdout,'stderr':p.stderr}
 add(key,p.returncode==0,d)
# Template definitions
rows=[];slugs=set();total_clauses=0;ok=True
for p in sorted((L/'database/template-definitions').glob('*.json')):
 try:d=json.loads(p.read_text('utf-8'))
 except Exception as e:ok=False;rows.append({'file':p.name,'error':str(e)});continue
 r={'file':p.name,'slug':d.get('slug'),'version':d.get('version'),'variants':len(d.get('variants',[])),'legalClauses':len(d.get('legalClauses',[]))};rows.append(r);slugs.add(d.get('slug'));total_clauses+=r['legalClauses'];ok=ok and r['variants']==3 and r['legalClauses']>0
add('canonical_templates',ok and slugs=={'rental','apartment_sale','freelancer'} and total_clauses>=316,{'definitions':rows,'totalLegalClauses':total_clauses})
# Template engine tests
p=run(['npm','run','test:engine'],cwd=ROOT)
add('template_engine_tests',p.returncode==0,{'stdout':p.stdout[-6000:],'stderr':p.stderr[-2000:]})
# Workspace cleanup: backend/ is Laravel-only and no Express workspace/dependencies remain.
package=json.loads((ROOT/'package.json').read_text());lock_path=ROOT/'package-lock.json';lock=json.loads(lock_path.read_text()) if lock_path.exists() else {'packages':{}}
old_entries=[k for k,v in lock.get('packages',{}).items() if k=='node_modules/zdraft-backend-api' or 'zdraft-backend-api' in json.dumps(v)]
legacy_files=[str(p.relative_to(ROOT)) for p in [L/'package.json',L/'src/app.ts',L/'src/server.ts'] if p.exists()]
laravel_markers=[L/'artisan',L/'composer.json',L/'routes/api.php']
cleanup_ok=all(p.exists() for p in laravel_markers) and 'backend' not in package.get('workspaces',[]) and not old_entries and not legacy_files
add('legacy_express_backend_removed',cleanup_ok,{'laravelBackendDirectory':str(L.relative_to(ROOT)),'laravelMarkers':[str(p.relative_to(ROOT)) for p in laravel_markers],'workspaces':package.get('workspaces'),'oldLockEntries':old_entries,'legacyFiles':legacy_files})
# Strict API production defaults
front_repo=(ROOT/'frontend/src/features/contracts/data/templateRepository.ts').read_text('utf-8')
front_env=(ROOT/'frontend/.env.example').read_text('utf-8');dash_env=(ROOT/'dashboard/.env.example').read_text('utf-8')
strict=('NEXT_PUBLIC_TEMPLATE_SOURCE=api' in front_env and 'NEXT_PUBLIC_TEMPLATE_SOURCE=api' in dash_env and 'NEXT_PUBLIC_DRAFT_SOURCE=api-only' in dash_env and 'NEXT_PUBLIC_DEMO_MODE=false' in front_env and 'NEXT_PUBLIC_DEMO_MODE=false' in dash_env and '|| "api"' in front_repo and 'sourceMode !== "api-with-shared-fallback"' in front_repo)
add('strict_laravel_api_linking',strict,{'frontendEnv':front_env.splitlines(),'dashboardEnv':dash_env.splitlines()})
# TypeScript/TSX parser diagnostics handled by API contract parser, verify all workspace files too
node_script="""const ts=require('typescript');const fs=require('fs'),path=require('path');let files=[];for(const root of ['frontend','dashboard','packages']){function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','.next','dist'].includes(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\\.(ts|tsx)$/.test(e.name))files.push(p)}}walk(root)}let errors=[];for(const f of files){const s=fs.readFileSync(f,'utf8');const sf=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);for(const d of sf.parseDiagnostics){const lc=sf.getLineAndCharacterOfPosition(d.start||0);errors.push(`${f}:${lc.line+1}:${lc.character+1} ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}}console.log(JSON.stringify({files:files.length,errors}));process.exit(errors.length?1:0);"""
p=run(['node','-e',node_script],cwd=ROOT)
try:d=json.loads(p.stdout)
except:d={'stdout':p.stdout,'stderr':p.stderr}
add('typescript_syntax',p.returncode==0,d)
# SQL sources, table references and write-column references
sql_files=sorted((L/'database/legacy-sql').glob('*.sql'));migration_files=sorted((L/'database/migrations').glob('*.php'));schema='\n'.join([p.read_text('utf-8') for p in sql_files if p.name!='900_seed.sql']+[p.read_text('utf-8') for p in migration_files]);schema_no_comments=re.sub(r'--.*','',schema)
table_columns={}
for match in re.finditer(r'CREATE TABLE IF NOT EXISTS\s+([A-Za-z_][\w]*)\s*\((.*?)\);',schema_no_comments,re.I|re.S):
 table=match.group(1).lower();body=match.group(2);columns=set();parts=[];current='';depth=0
 for char in body:
  if char=='(':depth+=1
  elif char==')':depth-=1
  if char==',' and depth==0:parts.append(current);current=''
  else:current+=char
 if current.strip():parts.append(current)
 for part in parts:
  item=part.strip()
  if not item or re.match(r'(?i)(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b',item):continue
  column=re.match(r'"?([A-Za-z_][\w]*)"?\s+',item)
  if column:columns.add(column.group(1).lower())
 table_columns[table]=columns
for match in re.finditer(r'ALTER TABLE\s+([A-Za-z_][\w]*)\s+(.*?);',schema_no_comments,re.I|re.S):
 table=match.group(1).lower()
 for column in re.findall(r'ADD COLUMN(?: IF NOT EXISTS)?\s+([A-Za-z_][\w]*)',match.group(2),re.I):table_columns.setdefault(table,set()).add(column.lower())
php_files_text={p:p.read_text('utf-8',errors='ignore') for p in (L/'app').rglob('*.php')};php='\n'.join(php_files_text.values());refs=set(x.lower() for x in re.findall(r"DB::table\(['\"]([A-Za-z_][\w]*)['\"]\)",php));missing_tables=sorted(refs-set(table_columns));column_issues=[]
for path,text in php_files_text.items():
 for match in re.finditer(r'INSERT INTO\s+([A-Za-z_][\w]*)\s*\(([^)]+)\)',text,re.I):
  table=match.group(1).lower();columns={x.strip().strip('\"').lower() for x in match.group(2).split(',')};missing=sorted(columns-table_columns.get(table,set()))
  if missing:column_issues.append({'file':str(path.relative_to(ROOT)),'table':table,'operation':'insert','missing':missing})
 for match in re.finditer(r'UPDATE\s+([A-Za-z_][\w]*)\s+SET\s+(.+?)(?:\s+WHERE|["\'])',text,re.I|re.S):
  table=match.group(1).lower();columns={x.lower() for x in re.findall(r'([A-Za-z_][\w]*)\s*=',match.group(2))};missing=sorted(columns-table_columns.get(table,set()))
  if missing:column_issues.append({'file':str(path.relative_to(ROOT)),'table':table,'operation':'update','missing':missing})
add('database_schema_references',not missing_tables and not column_issues,{'schemaTables':len(table_columns),'queryBuilderTables':len(refs),'missingTables':missing_tables,'writeColumnIssues':column_issues})
# Runtime configuration and deployment script consistency
composer=json.loads((L/'composer.json').read_text('utf-8'));frontend_client=(ROOT/'frontend/src/lib/apiClient.ts').read_text('utf-8');dashboard_client=(ROOT/'dashboard/src/lib/apiClient.ts').read_text('utf-8');dashboard_pages='\n'.join(p.read_text('utf-8',errors='ignore') for p in (ROOT/'dashboard/src/app').rglob('*.tsx'))
all_frontend_runtime=frontend_client+dashboard_client+dashboard_pages
runtime_ok=(composer.get('require',{}).get('php')=='^8.4' and composer.get('require',{}).get('symfony/process')=='^8.0' and 'API_NOT_CONFIGURED' in frontend_client and 'API_NOT_CONFIGURED' in dashboard_client and 'localhost:8000' not in all_frontend_runtime and 'localhost:5000' not in all_frontend_runtime and not (L/'deploy/systemd/zdraft-laravel-queue.service').exists() and 'QUEUE_CONNECTION=sync' in (L/'.env.example').read_text('utf-8'))
add('runtime_and_api_defaults',runtime_ok,{'phpRequirement':composer.get('require',{}).get('php'),'symfonyProcess':composer.get('require',{}).get('symfony/process'),'localhost8000References':all_frontend_runtime.count('localhost:8000'),'localhost5000References':all_frontend_runtime.count('localhost:5000'),'frontendStrictConfig':'API_NOT_CONFIGURED' in frontend_client,'dashboardStrictConfig':'API_NOT_CONFIGURED' in dashboard_client,'unusedQueueServiceExists':(L/'deploy/systemd/zdraft-laravel-queue.service').exists()})
deploy_checks=[]
bash_bin=shutil.which('bash')
if bash_bin:
 for cmd in [
  [bash_bin,'-n',str(L/'deploy/install-ubuntu.sh')],
  [bash_bin,'-n',str(L/'deploy/activate-production.sh')],
  [bash_bin,'-n',str(L/'deploy/smoke-production.sh')],
 ]:
  result=run(cmd);deploy_checks.append({'command':' '.join(cmd),'ok':result.returncode==0,'stderr':result.stderr})
 add('deployment_script_syntax',all(x['ok'] for x in deploy_checks),deploy_checks)
else:
 add('deployment_script_syntax',True,{'skipped':'bash executable is not available on this host; shell scripts are validated on Linux production hosts.'},blocking=False)

# Tests present
required_tests=['tests/Feature/ApiRouteContractTest.php','tests/Feature/HealthEndpointTest.php','tests/Feature/DatabaseWorkflowSmokeTest.php','tests/Feature/AttachmentImagePipelineSmokeTest.php','tests/Unit/TemplateDefinitionsTest.php','phpunit.xml']
missing_tests=[x for x in required_tests if not (L/x).exists()]
add('laravel_runtime_tests_present',not missing_tests,{'missing':missing_tests})
# Secrets
allowed_local_env={'backend/.env'}
excluded_scan_dirs={'.git','node_modules','.next','dist','vendor','storage'}
all_env=[]
hits=[]
for root, dirs, files in os.walk(ROOT):
 dirs[:] = [d for d in dirs if d not in excluded_scan_dirs]
 for file in files:
  if file == '.env':
   all_env.append((Path(root)/file).relative_to(ROOT).as_posix())
  f = Path(root)/file
  if f.suffix.lower() in {'.png','.jpg','.jpeg','.webp','.pdf','.zip'}: continue
  s=f.read_text('utf-8',errors='ignore')
  for pattern in [r'AIza[0-9A-Za-z_-]{30,}',r're_[0-9A-Za-z]{20,}',r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----']:
   if re.search(pattern,s):hits.append(str(f.relative_to(ROOT)))
real_env=[p for p in all_env if p not in allowed_local_env]
local_env=[p for p in all_env if p in allowed_local_env]
add('secret_scan',not real_env and not hits,{'realEnvFiles':real_env,'localEnvFilesIgnored':local_env,'credentialHits':sorted(set(hits))})
# Runtime environment disclosure, nonblocking here
mods=run(['php','-m']).stdout.lower();required_mods=['pdo_pgsql','imagick','mbstring'];missing_mods=[m for m in required_mods if m not in mods]
add('frontend_lock_present',lock_path.exists(),{'path':'package-lock.json','note':'Generate and commit a valid lock with npm install in a networked staging environment; the inherited incomplete lock was intentionally removed.'},blocking=False)
add('composer_lock_present',(L/'composer.lock').exists(),{'path':'backend/composer.lock','note':'Generate and commit it after composer install/update in a networked staging environment.'},blocking=False)
add('runtime_environment_available',shutil.which('composer') is not None and not missing_mods and bool(os.environ.get('DATABASE_URL')),{'composerAvailable':shutil.which('composer') is not None,'missingPhpExtensions':missing_mods,'databaseConfigured':bool(os.environ.get('DATABASE_URL'))},blocking=False)
blocking_failed=[c for c in checks if c['blocking'] and not c['passed']]
result={'version':'V29','status':'passed' if not blocking_failed else 'failed','passed':sum(c['passed'] for c in checks),'total':len(checks),'blockingFailures':[c['key'] for c in blocking_failed],'checks':checks}
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(0 if not blocking_failed else 1)
