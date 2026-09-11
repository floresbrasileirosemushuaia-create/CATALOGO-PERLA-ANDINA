'use strict';
const {VERSION,backendUrl}=require('./_backend');
const {applyPortalV251UiPatch}=require('./_ui_patch_v251');
const {fallbackUi}=require('../lib/_fallback_ui');
function validUi(raw){const s=String(raw||'');return s.length>100000&&/<html[\s>]/i.test(s)&&/Perla Andina/i.test(s)}
function validV251Ui(raw){return validUi(raw)&&/(?:V|version[:\s]*)?2\.5\.1/i.test(String(raw||''))}
function sanitizeVisibleUi(raw){let s=String(raw||'');const pairs=[
  ['<small id="adminAttendantMeta">ADMIN</small>','<small id="adminAttendantMeta">EQUIPE</small>'],
  ['Admin Perla Andina','Equipe Perla Andina'],
  ['Acesso administrativo seguro.','Acesso interno seguro.'],
  ['Acesso administrativo necessário.','Acesso interno necessário.'],
  ['Recuperar acesso administrativo','Recuperar acesso interno'],
  ['LOGIN ADMINISTRATIVO','ACESSO INTERNO'],
  ['Login administrativo','Acesso interno'],
  ['Painel administrativo','Painel interno'],
  ['Panel administrativo','Panel interno'],
  ['Admin panel','Internal panel']
];for(const [a,b] of pairs)s=s.split(a).join(b);return s}
function upgradeUi(raw,source){
  if(!validUi(raw))return null;
  if(validV251Ui(raw))return{html:sanitizeVisibleUi(raw),source,patch:{hits:0,already:0,misses:[],total:0}};
  const patched=applyPortalV251UiPatch(raw),html=sanitizeVisibleUi(patched.html);
  if(validV251Ui(html)&&(patched.hits+patched.already)>=Math.max(20,patched.total-4))return{html,source:source+'-patched',patch:patched};
  return null;
}
async function fetchOnce(url){const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),9000);try{const r=await fetch(url,{method:'GET',redirect:'follow',signal:ctrl.signal,headers:{'user-agent':'Perla-Andina-Vercel/'+VERSION,'cache-control':'no-cache','pragma':'no-cache'}});const raw=await r.text();return{ok:r.ok,raw,status:r.status}}finally{clearTimeout(tm)}}
async function fetchRawUi(){
  const BACKEND=backendUrl();if(!BACKEND)throw new Error('B2B_BACKEND_NOT_CONFIGURED');
  const sep=BACKEND.includes('?')?'&':'?';let last='';
  for(let attempt=1;attempt<=3;attempt++){
    try{const got=await fetchOnce(BACKEND+sep+'raw_ui=1&ui_target=251&t='+Date.now());if(got.ok){const upgraded=upgradeUi(got.raw,'apps-script');if(upgraded)return upgraded;last='PATCH_INCOMPLETE'}else last='HTTP_'+got.status+'_BYTES_'+String(got.raw||'').length}catch(err){last=String(err&&err.message||err)}
    if(attempt<3)await new Promise(r=>setTimeout(r,250*attempt));
  }
  throw new Error('BACKEND_UI_UNAVAILABLE '+last);
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
  res.setHeader('Vercel-CDN-Cache-Control','public, max-age=60, stale-while-revalidate=300');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Perla-Version',VERSION);
  if(req.method!=='GET')return res.status(405).send('METHOD_NOT_ALLOWED');
  let got=null;
  try{got=await fetchRawUi()}catch(_){got=upgradeUi(fallbackUi(),'build-fallback')}
  if(!got||!validV251Ui(got.html))return res.status(500).send('PERLA_UI_V251_INVALID');
  res.setHeader('X-Perla-Ui-Source',got.source);
  if(got.patch&&got.patch.total)res.setHeader('X-Perla-Ui-Patch',String(got.patch.hits)+'-'+String(got.patch.already)+'-'+String(got.patch.total));
  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(got.html);
};
