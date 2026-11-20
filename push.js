/* rimbook push.js - إشعارات محلية */
const reminded = new Set();

async function enablePush(){
  if(!("Notification" in window)) return toast("الإشعارات غير مدعومة");
  const p = await Notification.requestPermission();
  if(p === "granted"){
    RB.data.settings.pushSubscribed = true;
    RB.save();
    toast("✅ الإشعارات مفعّلة");
    new Notification("rimbook", { body: "الإشعارات تعمل الآن!" });
  } else {
    toast("❌ رُفض الإذن");
  }
}

function scheduleLocalReminder(){
  if(!RB.data.settings.pushSubscribed) return;
  if(!("Notification" in window) || Notification.permission !== "granted") return;
  // كل دقيقة نتحقق من المواعيد القادمة
  const now = new Date(), t = iso(now);
  dayEvents(t).forEach(e => {
    if(!e.t) return;
    const key = "push:" + e.id + t + e.t;
    if(reminded.has(key)) return;
    const diff = (new Date(`${t}T${e.t}`) - now) / 6e4;
    if(diff >= 0 && diff <= 30){
      reminded.add(key);
      setTimeout(() => {
        new Notification("⏰ rimbook", {
          body: `${e.title} بعد ${Math.round(diff)} دقيقة`,
          icon: "icon-192.png",
          tag: key
        });
      }, Math.max(0, diff * 60000 - 60000));
    }
  });
}

setInterval(scheduleLocalReminder, 60000);
setTimeout(scheduleLocalReminder, 2000);
