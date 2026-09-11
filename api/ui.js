'use strict';
const {VERSION,backendUrl}=require('./_backend');
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET') return res.status(405).send('METHOD_NOT_ALLOWED');
  const BACKEND=backendUrl();
  if(!BACKEND) return res.status(503).send('B2B_BACKEND_NOT_CONFIGURED');
  try{
    const ctrl=new AbortController();
    const tm=setTimeout(()=>ctrl.abort(),55000);
    let r;
    try{
      const sep=BACKEND.includes('?')?'&':'?';
      r=await fetch(BACKEND+sep+'raw_ui=1',{method:'GET',redirect:'follow',signal:ctrl.signal,headers:{'user-agent':'Perla-Andina-Vercel/'+VERSION}});
    }finally{clearTimeout(tm)}
    const html=await r.text();
    if(!r.ok||!/<html[\s>]/i.test(html)||!/Perla Andina/i.test(html)){
      return res.status(502).send('BACKEND_UI_INVALID');
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html);
  }catch(err){
    return res.status(502).send('B2B_UI_PROXY_FAILED: '+String(err&&err.message||err));
  }
};
