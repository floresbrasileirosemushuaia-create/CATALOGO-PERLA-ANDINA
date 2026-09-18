'use strict';
const {VERSION,backendUrl}=require('./_backend');
const {injectV253Runtime}=require('./_ui_runtime_v253');

let lastGoodHtml='';
let lastGoodAt=0;

function validPortalUi(raw){
  const s=String(raw||'');
  const directPortal=/id=["']catalog["']/i.test(s)&&/function\s+init\s*\(/.test(s);
  const googleWrapper=/goog\.script\.init\s*\(|userCodeAppPanel|sandboxFrame/i.test(s);
  const expectedVersion=/V2\.5\.4\s+PERLA ANDINA/i.test(s);
  return s.length>50000&&/<html[\s>]/i.test(s)&&/Perla Andina/i.test(s)&&/<body[\s>]/i.test(s)&&directPortal&&expectedVersion&&!googleWrapper;
}

function prepareUi(raw){
  if(!validPortalUi(raw))throw new Error('BACKEND_UI_INVALID');
  const html=injectV253Runtime(raw);
  if(!validPortalUi(html)||!html.includes('data-perla-runtime="253"'))throw new Error('V253_UI_PATCH_INVALID');
  return html;
}

async function fetchCandidate(url,timeoutMs){
  const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
    const r=await fetch(url,{method:'GET',redirect:'follow',signal:ctrl.signal,headers:{'user-agent':'Perla-Andina-Vercel/'+VERSION,'cache-control':'no-cache','pragma':'no-cache'}});
    const raw=await r.text();
    if(!r.ok)throw new Error('HTTP_'+r.status);
    if(!validPortalUi(raw))throw new Error('INVALID_UI');
    return raw;
  }finally{clearTimeout(tm)}
}

async function fetchRawUi(){
  const BACKEND=backendUrl();
  if(!BACKEND)throw new Error('B2B_BACKEND_NOT_CONFIGURED');
  const sep=BACKEND.includes('?')?'&':'?';
  try{return await fetchCandidate(BACKEND+sep+'raw_ui=1&portal_version=255',20000)}
  catch(e){throw new Error('BACKEND_RAW_UI_FAILED '+String(e&&e.message||e))}
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('CDN-Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800');
  res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Perla-Version',VERSION);
  if(req.method!=='GET')return res.status(405).send('METHOD_NOT_ALLOWED');

  try{
    const raw=await fetchRawUi();
    const html=prepareUi(raw);
    lastGoodHtml=html;lastGoodAt=Date.now();
    res.setHeader('X-Perla-Ui-Source','apps-script-v254-runtime');
    res.setHeader('X-Perla-Ui-Patch','v253-runtime');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html);
  }catch(err){
    if(lastGoodHtml){
      res.setHeader('X-Perla-Ui-Source','memory-last-good');
      res.setHeader('X-Perla-Ui-Stale-Ms',String(Math.max(0,Date.now()-lastGoodAt)));
      res.setHeader('Content-Type','text/html; charset=utf-8');
      return res.status(200).send(lastGoodHtml);
    }
    return res.status(502).send('B2B_UI_PROXY_FAILED: '+String(err&&err.message||err).slice(0,180));
  }
};
