'use strict';
const {VERSION,backendUrl}=require('./_backend');
const {injectV259Runtime}=require('./_ui_runtime_v2528');
let lastGoodHtml='';let lastGoodAt=0;
const TARGET='2.5.28';
const RAW_UI_TIMEOUT_MS=42000;
const FAST_RETRY_WINDOW_MS=9000;
const FAST_RETRY_DELAY_MS=700;
function detectedVersion(raw){const m=String(raw||'').match(/V(2\.5\.6\.14|2\.5\.7|2\.5\.8|2\.5\.9|2\.5\.10|2\.5\.11|2\.5\.12|2\.5\.13|2\.5\.20|2\.5\.21|2\.5\.22|2\.5\.23|2\.5\.24|2\.5\.25|2\.5\.26|2\.5\.27|2\.5\.28)\s+PERLA ANDINA/i);return m?m[1]:'';}
function validPortalUi(raw){const s=String(raw||'');const directPortal=/id=["']catalog["']/i.test(s)&&/function\s+init\s*\(/.test(s);const googleWrapper=/goog\.script\.init\s*\(|userCodeAppPanel|sandboxFrame/i.test(s);const v=detectedVersion(s);return s.length>50000&&/<html[\s>]/i.test(s)&&/Perla Andina/i.test(s)&&/<body[\s>]/i.test(s)&&directPortal&&!!v&&!googleWrapper;}
function prepareUi(raw){if(!validPortalUi(raw))throw new Error('BACKEND_UI_INVALID');const html=injectV259Runtime(raw);if(!validPortalUi(html)||!html.includes('data-perla-runtime="2528"'))throw new Error('V2528_UI_PATCH_INVALID');return html;}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function fetchCandidate(url,timeoutMs){const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),timeoutMs);try{const r=await fetch(url,{method:'GET',redirect:'follow',signal:ctrl.signal,headers:{'user-agent':'Perla-Andina-Vercel/'+VERSION,'cache-control':'no-cache','pragma':'no-cache'}});const raw=await r.text();if(!r.ok)throw new Error('HTTP_'+r.status);if(!validPortalUi(raw))throw new Error('INVALID_UI');return raw;}finally{clearTimeout(tm)}}
async function fetchRawUi(){
  const BACKEND=backendUrl();if(!BACKEND)throw new Error('B2B_BACKEND_NOT_CONFIGURED');
  const sep=BACKEND.includes('?')?'&':'?';const base=BACKEND+sep+'raw_ui=1&portal_version=2528';const started=Date.now();
  try{return await fetchCandidate(base,RAW_UI_TIMEOUT_MS)}catch(first){
    const elapsed=Date.now()-started;
    if(elapsed<FAST_RETRY_WINDOW_MS){
      await sleep(FAST_RETRY_DELAY_MS);
      const retryTimeout=Math.min(30000,Math.max(10000,RAW_UI_TIMEOUT_MS-elapsed-FAST_RETRY_DELAY_MS));
      try{return await fetchCandidate(base+'&retry=1&t='+Date.now(),retryTimeout)}catch(second){throw new Error('BACKEND_RAW_UI_FAILED first='+String(first&&first.message||first)+' retry='+String(second&&second.message||second))}
    }
    throw new Error('BACKEND_RAW_UI_FAILED '+String(first&&first.message||first));
  }
}
function setPrivateNoStore(res){res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('CDN-Cache-Control','no-store');res.setHeader('Vercel-CDN-Cache-Control','no-store');}
function setImmutableUiCache(res){res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.setHeader('CDN-Cache-Control','public, s-maxage=31536000, stale-while-revalidate=604800, stale-if-error=2592000');res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage=31536000, stale-while-revalidate=604800');}
module.exports=async function handler(req,res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Perla-Version',VERSION);res.setHeader('X-Perla-Ui-Cache-Key','2528');if(req.method!=='GET'){setPrivateNoStore(res);return res.status(405).send('METHOD_NOT_ALLOWED')}const requested=String(req.query&&req.query.v||'');if(requested&&requested!=='2528'){setPrivateNoStore(res);return res.status(409).send('UI_VERSION_KEY_MISMATCH')}try{const raw=await fetchRawUi();const rawVersion=detectedVersion(raw);const html=prepareUi(raw);lastGoodHtml=html;lastGoodAt=Date.now();if(rawVersion===TARGET)setImmutableUiCache(res);else setPrivateNoStore(res);res.setHeader('X-Perla-Ui-Backend-Version',rawVersion||'unknown');res.setHeader('X-Perla-Ui-Source','apps-script-v2528-runtime');res.setHeader('X-Perla-Ui-Patch','v2528-runtime');res.setHeader('Content-Type','text/html; charset=utf-8');return res.status(200).send(html);}catch(err){if(lastGoodHtml){setPrivateNoStore(res);res.setHeader('X-Perla-Ui-Source','memory-last-good');res.setHeader('X-Perla-Ui-Stale-Ms',String(Math.max(0,Date.now()-lastGoodAt)));res.setHeader('Content-Type','text/html; charset=utf-8');return res.status(200).send(lastGoodHtml);}setPrivateNoStore(res);return res.status(502).send('B2B_UI_PROXY_FAILED: '+String(err&&err.message||err).slice(0,180));}};
