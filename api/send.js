const {VERSION}=require('./_backend');
const PUSH_ORIGIN='https://perla-andina-b2b-push.vercel.app';
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Perla-Version',VERSION);
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const auth=String(req.headers.authorization||'');if(!auth.startsWith('Bearer '))return res.status(401).json({ok:false,error:'UNAUTHORIZED'});
  try{
    const body=typeof req.body==='string'?req.body:JSON.stringify(req.body||{}),ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),20000);let r;
    try{r=await fetch(PUSH_ORIGIN+'/api/send',{method:'POST',redirect:'follow',signal:ctrl.signal,headers:{'content-type':'application/json','authorization':auth,'user-agent':'Perla-Andina-Push-Gateway/'+VERSION},body})}finally{clearTimeout(tm)}
    const text=await r.text();res.status(r.status);const ct=String(r.headers.get('content-type')||'');if(ct.includes('application/json')){try{return res.json(JSON.parse(text||'{}'))}catch(_){}}return res.send(text||'');
  }catch(err){return res.status(502).json({ok:false,error:'PUSH_UPSTREAM_FAILED',version:VERSION,detail:String(err&&err.message||err).slice(0,250)})}
};
