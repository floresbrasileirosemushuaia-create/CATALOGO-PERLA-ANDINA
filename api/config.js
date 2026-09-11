const {VERSION}=require('./_backend');
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const publicKey=String(process.env.VAPID_PUBLIC_KEY||'').trim();
  const privateReady=!!String(process.env.VAPID_PRIVATE_KEY||'').trim();
  const tokenReady=!!String(process.env.PUSH_SERVER_TOKEN||'').trim();
  if(!publicKey||!privateReady||!tokenReady){
    const error=!publicKey?'VAPID_PUBLIC_KEY_MISSING':(!privateReady?'VAPID_PRIVATE_KEY_MISSING':'PUSH_SERVER_TOKEN_MISSING');
    return res.status(503).json({ok:false,configured:false,error,version:VERSION});
  }
  return res.status(200).json({ok:true,configured:true,version:VERSION,vapidPublicKey:publicKey});
};
