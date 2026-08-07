#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
let ts;
try { ts=require('typescript'); }
catch { ts=require(path.resolve(process.cwd(),'node_modules','typescript')); }
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const LARAVEL=path.join(ROOT,'backend');
const roots=[path.join(ROOT,'frontend','src'),path.join(ROOT,'dashboard','src')];
const callNames=new Set(['apiRequest','dashboardRequest']);
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(/\.(ts|tsx|js|jsx)$/.test(e.name))out.push(p);}return out;}
function normalize(p){p=p.split('?',1)[0];p=p.replace(/([^/{}])\{param\}$/,'$1');p=p.replace(/\{param\}\{param\}$/,'{param}/{suffix}');if(!p.startsWith('/'))p='/'+p;return '/'+p.split('/').filter(Boolean).join('/');}
function pathFromExpression(expr){
  if(ts.isStringLiteralLike(expr)) return expr.text;
  if(ts.isTemplateExpression(expr)) return expr.head.text + expr.templateSpans.map(s=>'{param}'+s.literal.text).join('');
  if(ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  return null;
}
function methodFromExpression(expr){
  if(!expr || !ts.isObjectLiteralExpression(expr)) return 'GET';
  for(const prop of expr.properties){
    if(ts.isPropertyAssignment(prop) && (prop.name.getText().replace(/["']/g,'')==='method')){
      if(ts.isStringLiteralLike(prop.initializer)) return prop.initializer.text.toUpperCase();
    }
  }
  return 'GET';
}
const used=[];const parseErrors=[];
for(const file of roots.flatMap(r=>walk(r))){
  const text=fs.readFileSync(file,'utf8');
  const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  for(const d of sf.parseDiagnostics){const lc=sf.getLineAndCharacterOfPosition(d.start||0);parseErrors.push(`${path.relative(ROOT,file)}:${lc.line+1}:${lc.character+1} ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);}
  function visit(node){
    if(ts.isCallExpression(node)){
      let name=null;
      if(ts.isIdentifier(node.expression)) name=node.expression.text;
      if(name && callNames.has(name) && node.arguments.length){
        const raw=pathFromExpression(node.arguments[0]);
        if(raw && raw.includes('/api/v1/')) used.push({method:methodFromExpression(node.arguments[1]),path:normalize(raw),file:path.relative(ROOT,file)});
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(sf);
}
const routeRaw=childProcess.execFileSync('php',[path.join(LARAVEL,'tools','dump_routes_stub.php')],{encoding:'utf8'});
const declared=JSON.parse(routeRaw).filter(r=>r.path.startsWith('/api/v1/')).map(r=>({method:r.method.toUpperCase(),path:normalize(r.path)}));
function compatible(usedPath,routePath){const a=usedPath.replace(/^\//,'').split('/'),b=routePath.replace(/^\//,'').split('/');const suffix=a.at(-1)==='{suffix}';if(suffix){if(b.length<a.length)return false;}else if(a.length!==b.length)return false;const limit=suffix?a.length-1:a.length;for(let i=0;i<limit;i++){const x=a[i],y=b[i];if(x==='{param}'||/^\{[^}]+\}$/.test(y)||x===y)continue;return false;}return true;}
const missing=used.filter(u=>!declared.some(r=>u.method===r.method&&compatible(u.path,r.path)));
const unique=[];const seen=new Set();for(const u of used){const k=u.method+' '+u.path;if(!seen.has(k)){seen.add(k);unique.push(u);}}
const result={parsed_source_files:roots.flatMap(r=>walk(r)).length,parse_errors:parseErrors,used_call_count:used.length,unique_api_calls:unique.length,declared_laravel_routes:declared.length,missing,status:parseErrors.length||missing.length?'fail':'pass'};
console.log(JSON.stringify(result,null,2));
process.exit(result.status==='pass'?0:1);
