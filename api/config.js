const {VERSION}=require('./_backend');
const PUSH_ORIGIN='https://perla-andina-b2b-push.vercel.app';
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Perla-Version',VERSION);
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),12000);let r;
    try{r=await fetch(PUSH_ORIGIN+'/api/config',{method:'GET',redirect:'follow',signal:ctrl.signal,headers:{'cache-control':'no-cache','user-agent':'Perla-Andina-Push-Gateway/'+VERSION}})}finally{clearTimeout(tm)}
    const text=await r.text();let body={};try{body=JSON.parse(text||'{}')}catch(_){}
    if(!r.ok||!body||body.configured!==true||!body.vapidPublicKey)return res.status(503).json({ok:false,configured:false,error:'PUSH_UPSTREAM_NOT_CONFIGURED',version:VERSION});
    return res.status(200).json({ok:true,configured:true,version:VERSION,vapidPublicKey:String(body.vapidPublicKey),gateway:'perla-andina-b2b-push'});
  }catch(err){return res.status(503).json({ok:false,configured:false,error:'PUSH_UPSTREAM_UNAVAILABLE',version:VERSION,detail:String(err&&err.message||err).slice(0,180)})}
};
