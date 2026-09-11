'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const BACKEND=String(process.env.B2B_BACKEND_URL||'https://script.google.com/macros/s/AKfycbx9H9BJTrwNXdORIrVwilUmQiCMq-enVm-HfXZjNjXKsudiklef9ZnMdc36ZtIsD7bB/exec').trim();
function valid(raw){return typeof raw==='string'&&/<html[\s>]/i.test(raw)&&/Perla Andina/i.test(raw)&&raw.length>100000}
async function fetchOnce(){const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),12000);try{const sep=BACKEND.includes('?')?'&':'?';const r=await fetch(BACKEND+sep+'raw_ui=1&build=251&t='+Date.now(),{redirect:'follow',signal:ctrl.signal,headers:{'user-agent':'Perla-Andina-Build/2.5.1','cache-control':'no-cache','pragma':'no-cache'}});const raw=await r.text();if(!r.ok||!valid(raw))throw new Error('HTTP '+r.status+' bytes='+raw.length);return raw}finally{clearTimeout(tm)}}
(async()=>{
  let raw='',last='';for(let i=1;i<=3;i++){try{raw=await fetchOnce();break}catch(e){last=String(e&&e.message||e);if(i<3)await new Promise(r=>setTimeout(r,500*i))}}
  if(!valid(raw))throw new Error('UI inválida no build após 3 tentativas: '+last);
  const packed=zlib.brotliCompressSync(Buffer.from(raw),{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:9}}).toString('base64');
  const dir=path.join(__dirname,'..','lib');fs.mkdirSync(dir,{recursive:true});
  const out=path.join(dir,'_fallback_ui.js');
  fs.writeFileSync(out,"'use strict';const zlib=require('zlib');const DATA="+JSON.stringify(packed)+";let cache='';function fallbackUi(){if(!cache)cache=zlib.brotliDecompressSync(Buffer.from(DATA,'base64')).toString('utf8');return cache}module.exports={fallbackUi};\n",'utf8');
  console.log('Fallback UI V2.5.1 preparado: '+raw.length+' bytes -> '+packed.length+' base64.');
})().catch(e=>{console.error(String(e&&e.message||e));process.exit(2)});
