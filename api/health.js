const {VERSION,backendUrl}=require('./_backend');
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  return res.status(200).json({
    ok:true,
    version:VERSION,
    portal:'perla-andina-b2b',
    domains:['perlaandinacatalogo.vercel.app','catalogoperlaandina.vercel.app'],
    frontend:'runtime-patched-ui',
    backendConfigured:!!backendUrl(),
    pushGateway:'perla-andina-b2b-push',
    region:process.env.VERCEL_REGION||''
  });
};
