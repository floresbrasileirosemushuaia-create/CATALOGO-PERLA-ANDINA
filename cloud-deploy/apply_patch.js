#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir=path.resolve(process.argv[2]||'');
const planPath=path.resolve(process.argv[3]||path.join(__dirname,'patch-plan.json'));
if(!dir||!fs.existsSync(dir))throw new Error('Diretorio remoto ausente.');
const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));
function find(stem,exts){for(const e of exts){const p=path.join(dir,stem+e);if(fs.existsSync(p))return p}throw new Error('Arquivo remoto ausente: '+stem)}
function read(p){return fs.readFileSync(p,'utf8')}
function write(p,s){fs.writeFileSync(p,s,'utf8')}
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
{
  const p=find('00_Config',['.gs','.js']); let s=read(p),before=s;
  s=replaceExact(s,'/** PERLA ANDINA B2B V2.4.7 — configuração e constantes */','/** PERLA ANDINA B2B V2.4.8 — configuração e constantes */','00_Config header',true);
  s=replaceRegexOne(s,/VERSION:\s*'[^']+'/ ,"VERSION: '2.4.8'",'B2B.VERSION');
  s=replaceRegexOne(s,/BACKEND_WEB_APP_URL:\s*'[^']*'/ ,"BACKEND_WEB_APP_URL: '"+plan.backendUrl+"'",'BACKEND_WEB_APP_URL');
  if(s!==before){write(p,s);changed.push(path.basename(p))}
}
{
  const p=find('PortalB2B',['.html']); let s=read(p),before=s;
  const pairs=[
    ['/* V2.4.7 — Central de Atendimento em estilo console/CMD, restrita à aba Mensagens do Admin. */','/* V2.4.8 — Central de Atendimento preservada; atualização cloud sem BAT. */'],
    ['Servidor Push V2.4.7 ainda não configurado no Vercel. Execute o instalador da versão.','Servidor Push ainda não configurado no Vercel. A configuração cloud está pendente.'],
    ['Servidor Push V2.4.7 todavía no configurado en Vercel. Ejecutá el instalador de la versión.','Servidor Push todavía no configurado en Vercel. La configuración cloud está pendiente.'],
    ['V2.4.7 Push server is not configured in Vercel yet. Run the version installer.','Push server is not configured in Vercel yet. Cloud setup is pending.'],
    ['A V2.4.7 precisa concluir a configuração segura do Push no Vercel.','A configuração segura do Push no Vercel ainda precisa ser concluída.'],
    ['La V2.4.7 necesita completar la configuración segura del Push en Vercel.','La configuración segura del Push en Vercel todavía debe completarse.'],
    ['V2.4.7 needs to finish secure Push setup in Vercel.','Secure Push setup in Vercel still needs to be completed.'],
    ['Servidor Push V2.4.7 não configurado no Vercel. Execute o instalador da versão.','Servidor Push não configurado no Vercel. A configuração cloud está pendente.'],
    ['Servidor Push V2.4.7 no configurado en Vercel. Ejecutá el instalador de la versión.','Servidor Push no configurado en Vercel. La configuración cloud está pendiente.'],
    ['V2.4.7 Push server is not configured in Vercel. Run the version installer.','Push server is not configured in Vercel. Cloud setup is pending.'],
    ['Servidor Push ainda não configurado. Execute o instalador V2.4.7.','Servidor Push ainda não configurado. A configuração cloud está pendente.'],
    ['Servidor Push todavía no configurado. Ejecutá el instalador V2.4.7.','Servidor Push todavía no configurado. La configuración cloud está pendiente.'],
    ['Push server is not configured. Run the V2.4.7 installer.','Push server is not configured. Cloud setup is pending.'],
    ["||'2.4.7'","||'2.4.8'"]
  ];
  for(const [a,b] of pairs)s=replaceExact(s,a,b,'PortalB2B replacement',true);
  if(s!==before){write(p,s);changed.push(path.basename(p))}
}
{
  const p=find('80_Push',['.gs','.js']); let s=read(p),before=s;
  s=replaceExact(s,'/** PERLA ANDINA B2B V2.4.7 — Web Push */','/** PERLA ANDINA B2B V2.4.8 — Web Push; bootstrap legado V247 preservado */','80_Push header',true);
  s=replaceExact(s,"throw new Error('Servidor Push ainda não configurado. Execute a instalação V2.4.7.')","throw new Error('Servidor Push ainda não configurado. A configuração cloud está pendente.')",'80_Push message',true);
  if(s!==before){write(p,s);changed.push(path.basename(p))}
}
for(const f of changed){const stem=f.replace(/\.(gs|js|html)$/,'');if(!plan.allowedFiles.includes(stem))throw new Error('Patch alterou arquivo nao autorizado: '+f)}
console.log(JSON.stringify({ok:true,version:plan.version,changed,scriptId:plan.scriptId,deploymentId:plan.deploymentId},null,2));
