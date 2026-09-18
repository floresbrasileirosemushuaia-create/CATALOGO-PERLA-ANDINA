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

// Cabecalhos/textos de identificacao: somente 2.5.3 -> 2.5.4.
for(const stem of ['05_Core','10_Auth','20_Catalogo','30_Orcamentos','40_Admin','50_Imagens','60_Mensagens','70_Email','80_Push','90_Cache','95_Diagnostico']){
  const p=find(stem,['.gs','.js']); let s=read(p),before=s;
  s=replaceRegexOne(s,/^(\/\*\* PERLA ANDINA B2B V)2\.5\.3( —[^\n]+\*\/)$/m,'$12.5.4$2',stem+' header');
  if(stem==='05_Core'){
    s=replaceRegexOne(s,/Validar base estável V2\.5\.3/,'Validar base estável V2.5.4','05_Core menu version');
    s=replaceRegexOne(s,/Validação V2\.5\.3/,'Validação V2.5.4','05_Core validation version');
  }
  if(stem==='50_Imagens'){
    const matches=[...s.matchAll(/A V2\.5\.3/g)];
    if(matches.length!==2)throw new Error('50_Imagens version messages: esperado 2 matches, encontrado '+matches.length);
    s=s.replace(/A V2\.5\.3/g,'A V2.5.4');
  }
  if(stem==='90_Cache')s=replaceRegexOne(s,/Cache completo V2\.5\.3/,'Cache completo V2.5.4','90_Cache dialog version');
  if(s!==before){write(p,s);changed.push(path.basename(p))}
}

{
  const p=find('Logo_Perla_Andina_AppsScript_4K',['.html']); let s=read(p),before=s;
  s=replaceRegexOne(s,/^(<!-- PERLA ANDINA B2B V)2\.5\.3( — logo -->)$/m,'$12.5.4$2','Logo version');
  if(s!==before){write(p,s);changed.push(path.basename(p))}
}

// 00_Config: SOMENTE identificacao de versao. URLs, IDs, planilha e permissoes permanecem intactos.
{
  const p=find('00_Config',['.gs','.js']); let s=read(p),before=s;
  s=replaceRegexOne(s,/\/\*\* PERLA ANDINA B2B V[^\n]+— configuração e constantes \*\//,'/** PERLA ANDINA B2B V2.5.4 — configuração e constantes */','00_Config header',true);
  s=replaceRegexOne(s,/VERSION:\s*'[^']+'/,"VERSION: '2.5.4'",'B2B.VERSION');
  s=replaceRegexOne(s,/\* Versão 2\.5\.3\b/,'* Versão 2.5.4','00_Config version comment');
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

  // V2.5.4: a UI bruta é usada pelo proxy Vercel e não depende de
  // inicialização de segredos. Isso mantém o HTML disponível mesmo se a
  // infraestrutura autenticada estiver em manutenção/autorização.
  if(String(p.raw_ui||'')==='1'){
    const html=HtmlService.createHtmlOutputFromFile('PortalB2B').getContent();
    return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.TEXT);
  }

  // Diagnóstico leve da implantação. Não expõe segredos nem dados da planilha.
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
  s=s.replace(/^\/\*\* PERLA ANDINA B2B V[^\n]+— entrada Web App e dispatcher RPC \*\//m,'/** PERLA ANDINA B2B V2.5.4 — entrada Web App e dispatcher RPC */');
  if(s!==before){write(p,s);changed.push(path.basename(p))}
}

// PortalB2B: versao e carregamento de imagens. Nenhum atributo id/on*, handler, aba ou fluxo de dados e alterado.
{
  const p=find('PortalB2B',['.html']); let s=read(p),before=s;
  s=replaceRegexOne(s,/(id="adminVersionBadge"[^>]*>)[^<]*(<\/span>)/,"$1V2.5.4 PERLA ANDINA$2",'adminVersionBadge');
  s=replaceRegexOne(s,/\/\* V2\.5\.3 — Apps Script sincronizado; login seguro, diagnóstico autenticado, Push dedicado e imagens protegidas\. \*\//,'/* V2.5.4 — carregamento imediato e completo das imagens do catálogo. */','Portal version comment');
  s=replaceRegexOne(s,/name="pa_catalog_search_v253"/,'name="pa_catalog_search_v254"','catalog search name');

  const preloadStart=s.indexOf("let catalogImagePreloadTimer=null,catalogImagePreloadSignature='';");
  const preloadEnd=s.indexOf('\nfunction renderAll()',preloadStart);
  if(preloadStart<0||preloadEnd<0||preloadEnd<=preloadStart)throw new Error('PortalB2B: bloco de preload V2.5.3 nao encontrado.');
  const preloadReplacement=`let catalogImagePreloadTimer=null,catalogImagePreloadSignature='',catalogImagePreloaders=new Set(),catalogImagePreloadedUrls=new Set();
function catalogImageUrlsForPreload(){const products=(state.data&&state.data.catalog)||[],out=[],seen=new Set(),add=(url,width)=>{const exact=imageVariantUrl(url,width);if(exact&&!seen.has(exact)){seen.add(exact);out.push(exact)}};products.forEach(p=>{if(p.imageUrl)add(p.imageUrl,560)});products.forEach(p=>{const arr=normalizeProductGallery_(p);(arr.length?arr:(p.imageUrl?[{url:p.imageUrl}]:[])).forEach(g=>{const u=String(g&&g.url||'').trim();if(u){add(u,180);add(u,1200)}})});return out}
function preloadCatalogImagesNow(){const urls=catalogImageUrlsForPreload();if(!urls.length)return;const sig=String(state.portalRevision||0)+'|'+state.lang+'|'+urls.join('|');if(sig===catalogImagePreloadSignature)return;catalogImagePreloadSignature=sig;const conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection,saveData=!!(conn&&conn.saveData),queue=urls.filter(url=>!catalogImagePreloadedUrls.has(url));let active=0;const limit=saveData?3:8;const next=()=>{while(active<limit&&queue.length){const url=queue.shift();active++;catalogImagePreloadedUrls.add(url);const img=new Image();catalogImagePreloaders.add(img);img.loading='eager';img.decoding='async';try{img.fetchPriority=active<=2?'high':'auto'}catch(_){}const done=ok=>{catalogImagePreloaders.delete(img);if(!ok)catalogImagePreloadedUrls.delete(url);active--;next()};img.onload=()=>done(true);img.onerror=()=>done(false);img.src=url}};next()}
function scheduleCatalogImagePreload(){if(catalogImagePreloadTimer)clearTimeout(catalogImagePreloadTimer);catalogImagePreloadTimer=setTimeout(()=>{catalogImagePreloadTimer=null;preloadCatalogImagesNow()},0)}`;
  s=s.slice(0,preloadStart)+preloadReplacement+s.slice(preloadEnd);

  s=replaceRegexOne(s,/^\s*const media=p\.imageUrl\?.*$/m,"   const media=p.imageUrl?`<div class=\"card-media\"><img loading=\"eager\" fetchpriority=\"${isFeatured?'high':'auto'}\" decoding=\"async\" src=\"${escapeHtml(imageVariantUrl(p.imageUrl,560))}\" alt=\"\"></div>`:`<div class=\"card-media\">${escapeHtml(initials)}</div>`;",'catalog card eager image');
  s=replaceRegexOne(s,/version:\(state\.data&&state\.data\.config&&state\.data\.config\.version\)\|\|'2\.5\.3'/,"version:(state.data&&state.data.config&&state.data.config.version)||'2.5.4'",'diagnostic fallback version');
  s=replaceRegexOne(s,/A V2\.5\.3 exige e testa permissão real de gravação\./,'A V2.5.4 exige e testa permissão real de gravação.','Drive authorization version');
  if(s!==before){write(p,s);changed.push(path.basename(p))}
}

for(const f of changed){
  const stem=f.replace(/\.(gs|js|html)$/,'');
  if(!plan.allowedFiles.includes(stem))throw new Error('Patch alterou arquivo nao autorizado: '+f);
}
if(!changed.some(f=>/^00_Config\./.test(f)))throw new Error('00_Config nao foi atualizado.');
if(!changed.some(f=>/^99_Api\./.test(f)))throw new Error('99_Api/doGet nao foi atualizado.');
console.log(JSON.stringify({ok:true,version:plan.version,changed,scriptId:plan.scriptId,deploymentId:plan.deploymentId},null,2));
