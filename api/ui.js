'use strict';
const {VERSION,backendUrl}=require('./_backend');
const {fallbackUi}=require('./_ui_fallback');
function validV251Ui(raw){const s=String(raw||'');return /<html[\s>]/i.test(s)&&/Perla Andina/i.test(s)&&/(?:V|version[:\s]*)?2\.5\.1/i.test(s)}
async function fetchRawUi(){
  const BACKEND=backendUrl();if(!BACKEND)throw new Error('B2B_BACKEND_NOT_CONFIGURED');
  const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),18000);let r;
  try{const sep=BACKEND.includes('?')?'&':'?';r=await fetch(BACKEND+sep+'raw_ui=1',{method:'GET',redirect:'follow',signal:ctrl.signal,headers:{'user-agent':'Perla-Andina-Vercel/'+VERSION,'cache-control':'no-cache'}})}finally{clearTimeout(tm)}
  const raw=await r.text();if(!r.ok||!validV251Ui(raw))throw new Error('BACKEND_UI_INVALID_OR_OLD');return raw;
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
  res.setHeader('Vercel-CDN-Cache-Control','public, max-age=60, stale-while-revalidate=300');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Perla-Version',VERSION);
  if(req.method!=='GET')return res.status(405).send('METHOD_NOT_ALLOWED');
  let html='',source='fallback';
  try{html=await fetchRawUi();source='apps-script'}catch(_){html=fallbackUi()}
  if(!validV251Ui(html))return res.status(500).send('PERLA_UI_FALLBACK_INVALID');
  res.setHeader('X-Perla-Ui-Source',source);
  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html);
};
