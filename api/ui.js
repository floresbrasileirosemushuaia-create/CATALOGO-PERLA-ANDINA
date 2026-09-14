'use strict';
const {VERSION,backendUrl}=require('./_backend');
const {applyPortalV251UiPatch}=require('./_ui_patch_v251');
const {injectV253Runtime}=require('./_ui_runtime_v253');

let lastGoodHtml='';
let lastGoodAt=0;

function validPortalUi(raw){
  const s=String(raw||'');
  return s.length>50000&&/<html[\s>]/i.test(s)&&/Perla Andina/i.test(s)&&/<body[\s>]/i.test(s);
}

function prepareUi(raw){
  if(!validPortalUi(raw))throw new Error('BACKEND_UI_INVALID');
  const prior=applyPortalV251UiPatch(raw);
  const html=injectV253Runtime(prior.html);
  if(!validPortalUi(html)||!html.includes('data-perla-runtime="253"'))throw new Error('V253_UI_PATCH_INVALID');
  return {html,prior};
}

async function fetchRawUi(){
  const BACKEND=backendUrl();
  if(!BACKEND)throw new Error('B2B_BACKEND_NOT_CONFIGURED');
  let lastErr=null;
  for(let attempt=1;attempt<=2;attempt++){
    const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),20000);
    try{
      const sep=BACKEND.includes('?')?'&':'?';
      const r=await fetch(BACKEND+sep+'raw_ui=1&portal_version=253&t='+Date.now(),{
        method:'GET',redirect:'follow',signal:ctrl.signal,
        headers:{'user-agent':'Perla-Andina-Vercel/'+VERSION,'cache-control':'no-cache, no-store','pragma':'no-cache'}
      });
      const raw=await r.text();
      if(!r.ok)throw new Error('BACKEND_UI_HTTP_'+r.status);
      if(!validPortalUi(raw))throw new Error('BACKEND_UI_INVALID');
      return raw;
    }catch(err){
      lastErr=err;
      if(attempt<2)await new Promise(r=>setTimeout(r,180));
    }finally{clearTimeout(tm)}
  }
  throw lastErr||new Error('B2B_UI_PROXY_FAILED');
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('CDN-Cache-Control','public, s-maxage=20, stale-while-revalidate=120, stale-if-error=86400');
  res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage=20, stale-while-revalidate=120');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Perla-Version',VERSION);
  if(req.method!=='GET')return res.status(405).send('METHOD_NOT_ALLOWED');

  try{
    const raw=await fetchRawUi();
    const prepared=prepareUi(raw);
    lastGoodHtml=prepared.html;lastGoodAt=Date.now();
    res.setHeader('X-Perla-Ui-Source','apps-script-patched');
    res.setHeader('X-Perla-Ui-Patch','v253; prior-hits='+prepared.prior.hits+'; prior-already='+prepared.prior.already+'; prior-misses='+prepared.prior.misses.length);
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(prepared.html);
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
