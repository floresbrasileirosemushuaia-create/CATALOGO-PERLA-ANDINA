'use strict';
const fs=require('fs'),path=require('path');
const BACKEND=String(process.env.B2B_BACKEND_URL||'https://script.google.com/macros/s/AKfycbx9H9BJTrwNXdORIrVwilUmQiCMq-enVm-HfXZjNjXKsudiklef9ZnMdc36ZtIsD7bB/exec').trim();
function valid(raw){return typeof raw==='string'&&/<html[\s>]/i.test(raw)&&/Perla Andina/i.test(raw)&&raw.length>100000}
(async()=>{
  const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),45000);let raw='';
  try{const sep=BACKEND.includes('?')?'&':'?';const r=await fetch(BACKEND+sep+'raw_ui=1&build=251&t='+Date.now(),{redirect:'follow',signal:ctrl.signal,headers:{'user-agent':'Perla-Andina-Build/2.5.1','cache-control':'no-cache'}});raw=await r.text();if(!r.ok||!valid(raw))throw new Error('UI inválida no build: HTTP '+r.status+' bytes='+raw.length)}finally{clearTimeout(tm)}
  const out=path.join(__dirname,'..','api','_fallback_ui.js');fs.writeFileSync(out,"'use strict';module.exports="+JSON.stringify(raw)+";\n",'utf8');
  console.log('Fallback UI V2.5.1 preparado: '+raw.length+' bytes.');
})().catch(e=>{console.error(String(e&&e.message||e));process.exit(2)});
