#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {applyPortalV251UiPatch}=require('../api/_ui_patch_v251');
const dir=path.resolve(process.argv[2]||'');
const planPath=path.resolve(process.argv[3]||path.join(__dirname,'patch-plan.json'));
if(!dir||!fs.existsSync(dir))throw new Error('Diretorio remoto ausente.');
const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));
function find(stem,exts){for(const e of exts){const p=path.join(dir,stem+e);if(fs.existsSync(p))return p}throw new Error('Arquivo remoto ausente: '+stem)}
function read(p){return fs.readFileSync(p,'utf8')}
function write(p,s){fs.writeFileSync(p,s,'utf8')}
function changedOnce(arr,p){const n=path.basename(p);if(!arr.includes(n))arr.push(n)}
function replaceExact(s,oldv,newv,label,optional=false){
  if(s.includes(newv)&&!s.includes(oldv))return s;
  const n=s.split(oldv).length-1;
  if(n===0&&optional)return s;
  if(n!==1)throw new Error(label+': esperado 1 match, encontrado '+n);
  return s.replace(oldv,newv);
}
function replaceRegexOne(s,re,newv,label){
  const m=s.match(re); if(!m||m.length<1)throw new Error(label+': match ausente');
  const all=[...s.matchAll(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'))];
  if(all.length!==1)throw new Error(label+': esperado 1 match, encontrado '+all.length);
  return s.replace(re,newv);
}
const changed=[];
// Base V2.4.9 preservada: URL canônica e compatibilidade do backend.
{
  const p=find('00_Config',['.gs','.js']); let s=read(p),before=s;
  s=replaceExact(s,'/** PERLA ANDINA B2B V2.4.8 — configuração e constantes */','/** PERLA ANDINA B2B V2.4.9 — configuração e constantes */','00_Config header',true);
  s=replaceRegexOne(s,/VERSION:\s*'[^']+'/,"VERSION: '2.4.9'",'B2B.VERSION');
  s=replaceRegexOne(s,/PUBLIC_PORTAL_URL:\s*'[^']*'/,"PUBLIC_PORTAL_URL: '"+plan.publicUrl+"'",'PUBLIC_PORTAL_URL');
  s=replaceRegexOne(s,/BACKEND_WEB_APP_URL:\s*'[^']*'/,"BACKEND_WEB_APP_URL: '"+plan.backendUrl+"'",'BACKEND_WEB_APP_URL');
  if(s!==before){write(p,s);changedOnce(changed,p)}
}
{
  const p=find('05_Core',['.gs','.js']); let s=read(p),before=s;
  const oldFn="function publicPortalUrl_(){const configured=String(pushConfigValue_('PUBLIC_PORTAL_URL')||'').trim().replace(/\\/+$/,'');if(/^https:\\/\\/(?:perlaandinacatalogo|perla-andina-b2b-push|perla-b2b-push)\\.vercel\\.app$/i.test(configured))return B2B.PUBLIC_PORTAL_URL;return /^https:\\/\\//i.test(configured)?configured:B2B.PUBLIC_PORTAL_URL;}";
  const newFn="function publicPortalUrl_(){const configured=String(pushConfigValue_('PUBLIC_PORTAL_URL')||'').trim().replace(/\\/+$/,'');if(/^https:\\/\\/(?:catalogoperlaandina|perlaandinacatalogo|perla-andina-b2b-push|perla-b2b-push)\\.vercel\\.app$/i.test(configured))return B2B.PUBLIC_PORTAL_URL;return /^https:\\/\\//i.test(configured)?configured:B2B.PUBLIC_PORTAL_URL;}";
  s=replaceExact(s,oldFn,newFn,'publicPortalUrl legacy domain',true);
  s=replaceExact(s,"B2B.PUBLIC_PORTAL_URL||'https://catalogoperlaandina.vercel.app'","B2B.PUBLIC_PORTAL_URL||'"+plan.publicUrl+"'",'autorizarTudoB2B fallback',true);
  if(s!==before){write(p,s);changedOnce(changed,p)}
}
{
  const p=find('PortalB2B',['.html']); let s=read(p),before=s;
  s=replaceExact(s,'/* V2.4.8 — Central de Atendimento preservada; atualização cloud sem BAT. */','/* V2.4.9 — destino Vercel corrigido; Central de Atendimento preservada. */','PortalB2B header',true);
  s=replaceExact(s,"if(location.hostname==='catalogoperlaandina.vercel.app'&&(location.pathname==='/'||location.pathname==='/menu'))","if(location.hostname==='perlaandinacatalogo.vercel.app'&&(location.pathname==='/'||location.pathname==='/menu'))",'PortalB2B canonical host',true);
  s=replaceExact(s,"||'2.4.8'","||'2.4.9'",'PortalB2B diagnostic version',true);
  if(s!==before){write(p,s);changedOnce(changed,p)}
}
{
  const p=find('80_Push',['.gs','.js']); let s=read(p),before=s;
  s=replaceExact(s,'/** PERLA ANDINA B2B V2.4.8 — Web Push; bootstrap legado V247 preservado */','/** PERLA ANDINA B2B V2.4.9 — Web Push; bootstrap legado V247 preservado */','80_Push header',true);
  const oldPwa="function pushPwaUrl_(){const configured=String(pushConfigValue_('PUSH_PWA_URL')||'').trim().replace(/\\/+$/,'');if(/^https:\\/\\/(?:perla-(?:andina-)?b2b-push|perlaandinacatalogo)\\.vercel\\.app$/i.test(configured))return publicPortalUrl_();return configured||publicPortalUrl_()}";
  const newPwa="function pushPwaUrl_(){const configured=String(pushConfigValue_('PUSH_PWA_URL')||'').trim().replace(/\\/+$/,'');if(/^https:\\/\\/(?:catalogoperlaandina|perla-(?:andina-)?b2b-push|perlaandinacatalogo)\\.vercel\\.app$/i.test(configured))return publicPortalUrl_();return configured||publicPortalUrl_()}";
  s=replaceExact(s,oldPwa,newPwa,'pushPwaUrl legacy domain',true);
  const oldLegacy="const sh=ensureSheet_(getSS_(),B2B.CONFIG_SHEET,B2B.CONFIG_HEADERS),rows=getTableObjects_(sh),hm=headerMap_(sh),canonical=B2B.PUBLIC_PORTAL_URL,legacy=/^https:\\/\\/(?:perlaandinacatalogo|perla-(?:andina-)?b2b-push|perla-b2b-push)\\.vercel\\.app\\/?$/i;";
  const newLegacy="const sh=ensureSheet_(getSS_(),B2B.CONFIG_SHEET,B2B.CONFIG_HEADERS),rows=getTableObjects_(sh),hm=headerMap_(sh),canonical=B2B.PUBLIC_PORTAL_URL,legacy=/^https:\\/\\/(?:catalogoperlaandina|perlaandinacatalogo|perla-(?:andina-)?b2b-push|perla-b2b-push)\\.vercel\\.app\\/?$/i;";
  s=replaceExact(s,oldLegacy,newLegacy,'ensurePushConfigRow legacy domain',true);
  if(s!==before){write(p,s);changedOnce(changed,p)}
}
// V2.5.1: aplica exclusivamente o patch de interface já auditado sobre PortalB2B.
{
  const p=find('PortalB2B',['.html']); let s=read(p),before=s;
  const r=applyPortalV251UiPatch(s);
  if(r.hits+r.already!==r.total||r.misses.length)throw new Error('PortalB2B V2.5.1 incompleto: hits='+r.hits+' already='+r.already+' total='+r.total+' misses='+r.misses.length);
  s=r.html;
  if(!s.includes('V2.5.1 PERLA ANDINA'))throw new Error('Marcador V2.5.1 ausente no PortalB2B preparado.');
  if(!s.includes("token:sessionStorage.getItem('b2b_token')||''"))throw new Error('Login seguro V2.5.1 não aplicado.');
  if(s.includes("sessionStorage.getItem('b2b_token')||localStorage.getItem('b2b_token')"))throw new Error('Token persistente antigo ainda presente.');
  if(s!==before){write(p,s);changedOnce(changed,p)}
  console.log(JSON.stringify({portalV251:{hits:r.hits,already:r.already,total:r.total}},null,2));
}
for(const f of changed){const stem=f.replace(/\.(gs|js|html)$/,'');if(!plan.allowedFiles.includes(stem))throw new Error('Patch alterou arquivo nao autorizado: '+f)}
console.log(JSON.stringify({ok:true,version:'2.5.1',baseVersion:plan.version,changed,scriptId:plan.scriptId,deploymentId:plan.deploymentId},null,2));
