#!/usr/bin/env python3
from __future__ import annotations
import json,re,subprocess,sys
from pathlib import Path

LARAVEL=Path(__file__).resolve().parents[1]
MANIFEST=LARAVEL/'tests'/'Fixtures'/'api_contract_v29.json'

def norm_path(path:str)->str:
    path=re.sub(r':([A-Za-z_][A-Za-z0-9_]*)',r'{\1}',path)
    path='/'+'/'.join(part for part in path.split('/') if part)
    return path if path else '/'

expected_data=json.loads(MANIFEST.read_text(encoding='utf-8'))
expected={(row['method'].upper(),norm_path(row['path'])) for row in expected_data['routes']}
proc=subprocess.run(['php',str(LARAVEL/'tools'/'dump_routes_stub.php')],capture_output=True,text=True,check=True)
actual_raw=json.loads(proc.stdout)
actual={(row['method'].upper(),norm_path(row['path'])) for row in actual_raw if row['path'].startswith('/api/v1/')}
missing=sorted(expected-actual)
extra=sorted(actual-expected)
result={
    'frozen_current_contract_count':len(expected),
    'laravel_v1_count':len(actual),
    'matched_count':len(expected & actual),
    'missing_in_laravel':[{'method':m,'path':p} for m,p in missing],
    'extra_in_laravel':[{'method':m,'path':p} for m,p in extra],
    'status':'pass' if not missing and not extra else 'fail',
}
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(0 if result['status']=='pass' else 1)
