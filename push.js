/* Rimbook push.js — local reminders (best-effort while the app is open) */
const reminded = new Set();

async function enablePush(){
 if(!("Notification" in window))return toast("الإشعارات غير مدعومة في هذا المتصفح");
 try{
  const permission=await Notification.requestPermission();
  if(permission==="granted"){
   RB.data.settings.pushSubscribed=true;RB.save();
   toast("تم تفعيل الإشعارات");
   new Notification("Rimbook",{body:"الإشعارات جاهزة على هذا الجهاز",icon:"./rimbook-icon-192x192.png"});
  }else toast("لم يتم السماح بالإشعارات");
 }catch(e){toast("تعذر تفعيل الإشعارات");}
}

function scheduleLocalReminder(){
 if(!RB.data.settings.pushSubscribed||!("Notification" in window)||Notification.permission!=="granted")return;
 const now=new Date(),date=iso(now);
 RB.all("event").filter(event=>event.d===date).forEach(event=>{
  if(!event.t||event.reminderEnabled===false)return;
  const key="rimbook:"+event.id+":"+date+":"+event.t;
  if(reminded.has(key))return;
  const due=new Date(date+"T"+event.t),diff=(due-now)/60000,lead=Math.max(0,Math.min(60,Number(event.reminderLead??15)));
  if(diff<0||diff>lead)return;
  reminded.add(key);
  if(Notification.permission!=="granted")return;
  const category=({wage:"موعد أجور",payment:"دفعة",advance:"سلفة",holiday:"عطلة",appointment:"موعد"})[event.reminderCategory]||"تذكير";
  const remaining=Math.max(0,Math.round(diff));
  const message=remaining<=1?" — حان الموعد":" — بعد "+remaining+" دقيقة";
  new Notification("⏰ Rimbook — "+category,{body:event.title+message,icon:"./rimbook-icon-192x192.png",tag:key});
 });
}
setInterval(scheduleLocalReminder,60000);
setTimeout(scheduleLocalReminder,2500);
