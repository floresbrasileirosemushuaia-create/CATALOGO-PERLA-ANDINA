const {VERSION,backendUrl}=require('./_backend');
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const backend=backendUrl();
  return res.status(200).json({ok:true,version:VERSION,portal:'catalogoperlaandina',frontend:'vercel-proxy-ui',backendConfigured:!!backend,backend:backend||''});
};
