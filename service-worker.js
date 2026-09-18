const CACHE='perla-b2b-v254';
const STATIC=['/manifest.webmanifest?v=255','/icon.svg?v=255','/badge.svg?v=255'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).catch(()=>null));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(u.pathname.startsWith('/api/'))return;
  if(u.pathname==='/'||u.pathname==='/menu'||u.pathname.startsWith('/activate/'))return;
  event.respondWith((async()=>{
    try{
      const r=await fetch(event.request,{cache:'no-cache'});
      if(r&&r.ok&&u.origin===self.location.origin){const c=await caches.open(CACHE);c.put(event.request,r.clone()).catch(()=>null)}
      return r;
    }catch(_){return (await caches.match(event.request))||Response.error()}
  })());
});
self.addEventListener('push',event=>{let data={};try{data=event.data?event.data.json():{}}catch(_){data={body:event.data?event.data.text():'Nova mensagem recebida.'}}const title=data.title||'Perla Andina';const options={body:data.body||'Nova mensagem recebida.',icon:'/icon.svg?v=255',badge:'/badge.svg?v=255',tag:data.tag||'perla-b2b',renotify:true,requireInteraction:false,vibrate:[240,70,240,70,420],data:{openUrl:data.openUrl||'/menu',conversationId:data.conversationId||'',messageId:data.messageId||''}};event.waitUntil(self.registration.showNotification(title,options))});
self.addEventListener('notificationclick',event=>{event.notification.close();let openUrl=(event.notification.data&&event.notification.data.openUrl)||'/menu';try{const u=new URL(openUrl,self.location.origin);openUrl=u.origin===self.location.origin?u.href:self.location.origin+'/menu'}catch(_){openUrl=self.location.origin+'/menu'}event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const w of windows){try{await w.navigate(openUrl);return w.focus()}catch(_){}}return self.clients.openWindow(openUrl)})())});
