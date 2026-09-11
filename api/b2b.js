'use strict';
const {VERSION,backendUrl}=require('./_backend');

function safeRead(fn){
  const name=String(fn||'');
  return /^(get|adminGet)/.test(name)||name==='adminImageStorageStatus';
}
async function fetchBackend(BACKEND,envelope,timeoutMs){
  const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
    const r=await fetch(BACKEND,{
      method:'POST',
      headers:{'content-type':'application/json;charset=UTF-8','user-agent':'Perla-Andina-Vercel/'+VERSION},
      body:JSON.stringify({action:'rpc',envelope}),
      redirect:'follow',
      signal:ctrl.signal
    });
    const text=await r.text();
    let out=null;
    try{out=JSON.parse(text||'{}')}catch(_){return{transportError:true,status:r.status,detail:'INVALID_JSON'};}
    if(!r.ok)return{transportError:true,status:r.status,detail:'HTTP_'+r.status};
    if(!out||out.ok===false)return{logicalError:true,error:String(out&&out.error||'BACKEND_REJECTED'),version:out&&out.version||VERSION};
    if(!out.packet||out.packet.__b2bRpc!==true)return{transportError:true,status:r.status,detail:'INVALID_PACKET'};
    return{ok:true,packet:out.packet,version:out.version||VERSION};
  }finally{clearTimeout(tm)}
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Perla-Version',VERSION);
  if(process.env.VERCEL_REGION)res.setHeader('X-Perla-Region',process.env.VERCEL_REGION);
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const BACKEND=backendUrl();
  if(!BACKEND)return res.status(503).json({ok:false,error:'B2B_BACKEND_NOT_CONFIGURED',version:VERSION});
  let body={};
  try{body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})}catch(_){return res.status(400).json({ok:false,error:'INVALID_JSON',version:VERSION})}
  const envelope=body.envelope||{},fn=String(envelope.fn||''),attempts=safeRead(fn)?2:1;
  let last=null;
  for(let i=0;i<attempts;i++){
    try{
      const out=await fetchBackend(BACKEND,envelope,safeRead(fn)?22000:50000);
      if(out.ok)return res.status(200).json({ok:true,packet:out.packet,version:out.version||VERSION,attempts:i+1});
      if(out.logicalError)return res.status(502).json({ok:false,error:out.error,version:out.version||VERSION});
      last=out;
    }catch(err){
      last={transportError:true,detail:String(err&&err.name==='AbortError'?'TIMEOUT':err&&err.message||err)};
    }
    if(i+1<attempts)await new Promise(r=>setTimeout(r,180));
  }
  return res.status(503).json({ok:false,error:'BACKEND_TEMPORARILY_UNAVAILABLE',detail:String(last&&last.detail||'TRANSPORT_ERROR').slice(0,160),version:VERSION});
};
