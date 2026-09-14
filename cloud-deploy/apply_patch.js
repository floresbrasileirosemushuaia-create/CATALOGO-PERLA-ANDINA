#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const dir=path.resolve(process.argv[2]||'');
const planPath=path.resolve(process.argv[3]||path.join(__dirname,'patch-plan.json'));
if(!dir||!fs.existsSync(dir))throw new Error('Diretorio remoto ausente.');
const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));
function find(stem,exts){for(const e of exts){const p=path.join(dir,stem+e);if(fs.existsSync(p))return p}throw new Error('Arquivo remoto ausente: '+stem)}
function read(p){return fs.readFileSync(p,'utf8')}
function write(p,s){fs.writeFileSync(p,s,'utf8')}
function replaceRegexOne(s,re,newv,label,optional=false){
  const all=[...s.matchAll(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'))];
  if(all.length===0&&optional)return s;
  if(all.length!==1)throw new Error(label+': esperado 1 match, encontrado '+all.length);
  return s.replace(re,newv);
}
const changed=[];

// 00_Config: SOMENTE identificacao de versao. URLs, IDs, planilha e permissoes permanecem intactos.
{
  const p=find('00_Config',['.gs','.js']); let s=read(p),before=s;
  s=replaceRegexOne(s,/\/\*\* PERLA ANDINA B2B V[^\n]+— configuração e constantes \*\//,'/** PERLA ANDINA B2B V2.5.3 — configuração e constantes */','00_Config header',true);
  s=replaceRegexOne(s,/VERSION:\s*'[^']+'/,"VERSION: '2.5.3'",'B2B.VERSION');
  s=s.replace(/\* Versão 2\.5\.2\b/,'* Versão 2.5.3');
  if(s!==before){write(p,s);changed.push(path.basename(p))}
}

// 99_Api: SOMENTE doGet(e). O dispatcher RPC, doPost e handlers ficam byte a byte fora deste bloco.
{
  const p=find('99_Api',['.gs','.js']); let s=read(p),before=s;
  const start=s.indexOf('function doGet(e) {');
  const end=s.indexOf('\nfunction b2bJsonOutput_',start);
  if(start<0||end<0||end<=start)throw new Error('99_Api: bloco doGet esperado nao encontrado.');
  const replacement=`function doGet(e) {
  const p=e&&e.parameter?e.parameter:{};

  // V2.5.3: a UI bruta e usada pelo proxy Vercel e nao depende de
  // inicializacao de segredos. Nenhum dado privado e lido nesta rota.
  if(String(p.raw_ui||'')==='1'){
    const html=HtmlService.createHtmlOutputFromFile('PortalB2B').getContent();
    return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.TEXT);
  }

  // Diagnostico leve para confirmar qual versao esta realmente implantada.
  if(String(p.health||'')==='1'){
    return b2bJsonOutput_({ok:true,version:B2B.VERSION,portal:'perla-andina-b2b',rawUi:true});
  }

  ensureSecrets_();
  return HtmlService.createTemplateFromFile('PortalB2B').evaluate()
    .setTitle('Perla Andina | Portal B2B')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
}
`;
  s=s.slice(0,start)+replacement+s.slice(end);
  s=s.replace(/^\/\*\* PERLA ANDINA B2B V[^\n]+— entrada Web App e dispatcher RPC \*\//m,'/** PERLA ANDINA B2B V2.5.3 — entrada Web App e dispatcher RPC */');
  if(s!==before){write(p,s);changed.push(path.basename(p))}
}

// PortalB2B: SOMENTE texto de versao. Nenhum atributo id/on* ou funcao JS e alterado.
{
  const p=find('PortalB2B',['.html']); let s=read(p),before=s;
  s=replaceRegexOne(s,/(id="adminVersionBadge"[^>]*>)[^<]*(<\/span>)/,"$1V2.5.3 PERLA ANDINA$2",'adminVersionBadge',true);
  s=s.replace(/\/\* V2\.5\.2 — login seguro, diagnóstico autenticado, Push dedicado e imagens protegidas\. \*\//,'/* V2.5.3 — Apps Script sincronizado; login seguro, diagnóstico autenticado, Push dedicado e imagens protegidas. */');
  s=s.replace(/version:\(state\.data&&state\.data\.config&&state\.data\.config\.version\)\|\|'2\.5\.2'/,"version:(state.data&&state.data.config&&state.data.config.version)||'2.5.3'");
  if(s!==before){write(p,s);changed.push(path.basename(p))}
}

for(const f of changed){
  const stem=f.replace(/\.(gs|js|html)$/,'');
  if(!plan.allowedFiles.includes(stem))throw new Error('Patch alterou arquivo nao autorizado: '+f);
}
if(!changed.some(f=>/^00_Config\./.test(f)))throw new Error('00_Config nao foi atualizado.');
if(!changed.some(f=>/^99_Api\./.test(f)))throw new Error('99_Api/doGet nao foi atualizado.');
console.log(JSON.stringify({ok:true,version:plan.version,changed,scriptId:plan.scriptId,deploymentId:plan.deploymentId},null,2));
