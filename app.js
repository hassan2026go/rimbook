/* rimbook v5 - المفكرة الشاملة */
const RB = (() => {
  const KEY = "rimbook.v5";
  const def = () => ({
    profile: {
      name: "", role: "employee", phone: "", email: "", city: "",
      birth: "", emergency: "", skills: "", photo: "",
      about: "Yasser-ALhussen\nkalimat2026go@gmail.com\ndaraa-syria\n\nrimbook © 2026\nمفكرة شاملة ذكية — تعمل بدون إنترنت"
    },
    settings: {
      theme: "dark", fs: 15, dailyRate: 50, otRate: 10,
      managerPhone: "", location: "موقع العمل", currency: "$",
      weekStart: 6, lang: "ar", autoBackup: false, lastBackup: 0,
      enabled: {}, gdriveClientId: "", dropboxToken: "",
      tgToken: "", tgChatId: "", notionToken: "", notionPageId: "",
      openaiKey: "", aiProvider: "OpenAI", fbApiKey: "", fbProjectId: "",
      myDomain: "", vapidPublicKey: "", pushSubscribed: false
    },
    items: [], habits: [], goals: [], projects: [], activeProject: null
  });
  let data;
  try { data = Object.assign(def(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch (e) { data = def(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { alert("التخزين ممتلئ"); } };
  return {
    get data() { return data; },
    all: t => data.items.filter(i => i.type === t),
    add(o) { o.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); o.created = Date.now(); data.items.push(o); save(); return o; },
    patch(id, p) { const i = data.items.find(x => x.id === id); if (i) Object.assign(i, p); save(); },
    remove(id) { data.items = data.items.filter(x => x.id !== id); save(); },
    save, replace(obj) { data = Object.assign(def(), obj); save(); }, def
  };
})();

const DB = (() => {
  let db;
  const open = () => db || (db = new Promise((res, rej) => {
    const q = indexedDB.open("rimbook-db", 2);
    q.onupgradeneeded = () => {
      const d = q.result;
      if (!d.objectStoreNames.contains("audio")) d.createObjectStore("audio");
      if (!d.objectStoreNames.contains("images")) d.createObjectStore("images");
    };
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  }));
  const tx = async (store, mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const r = fn(t.objectStore(store));
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    putAudio: (k, v) => tx("audio", "readwrite", s => s.put(v, k)),
    getAudio: k => tx("audio", "readonly", s => s.get(k)),
    delAudio: k => tx("audio", "readwrite", s => s.delete(k))
  };
})();

const ROLES = {
  employee:  { label: "موظف",     tip: "رتّب مهامك حسب الأولوية والمشروع", tabs: ["home","projects","agenda","tasks","habits","notes","ledger","profile","settings","stats","sync","integrations"] },
  worker:    { label: "عامل",     tip: "سجّل ساعات العمل والدفعات لكل مشروع", tabs: ["home","projects","ledger","agenda","tasks","notes","profile","settings","stats","sync","integrations"] },
  manager:   { label: "مدير",     tip: "راجع المشاريع والمتابعات", tabs: ["home","projects","agenda","tasks","notes","goals","profile","settings","stats","sync","integrations"] },
  housewife: { label: "ربة منزل", tip: "خطّط للمهام والمواعيد", tabs: ["home","projects","agenda","tasks","habits","notes","profile","settings","stats","sync","integrations"] },
  teacher:   { label: "مدرّس",    tip: "جهّز الدروس لكل مادة", tabs: ["home","projects","agenda","tasks","notes","goals","profile","settings","stats","sync","integrations"] },
  student:   { label: "تلميذ",    tip: "نظّم الدروس والمراجعة", tabs: ["home","projects","agenda","tasks","habits","notes","profile","settings","stats","sync","integrations"] }
};
const TABS = {
  home:["🏠","الرئيسية"], projects:["📁","المشاريع"], agenda:["📅","المفكرة"],
  tasks:["✅","المهام"], habits:["🔥","العادات"], goals:["🎯","الأهداف"],
  notes:["📝","الملاحظات"], ledger:["💼","العمل"], profile:["👤","الملف"],
  settings:["⚙️","الإعدادات"], stats:["📊","الإحصاء"], sync:["🔄","المزامنة"],
  integrations:["🧩","الإضافات"]
};
const KN = { work:"عمل", ot:"إضافي", holiday:"عطلة", payment:"دفعة" };
const KINDS = ["عمل","اجتماع","شخصي","دراسة","عائلة","صحة","سفر","رياضة"];
const PROJ_COLORS = ["#22d3ee","#2563eb","#10b981","#f59e0b","#f43f5e","#8b5cf6","#ec4899","#14b8a6"];

let view = "home", selDay = iso(new Date()), taskFilter = "all", tagFilter = "", nq = "";
let mr = null, chunks = [], recT = 0, recI = null;
const reminded = new Set();

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const iso = d => new Date(d - d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const fmt = s => String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
const role = () => ROLES[RB.data.profile.role] || ROLES.employee;
const activeProj = () => RB.data.projects.find(p => p.id === RB.data.activeProject);

function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),2600);}
function dl(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();}
function go(t){view=role().tabs.includes(t)?t:"home";render();window.scrollTo(0,0);}
function render(){
  const d = RB.data;
  document.body.dataset.theme = d.settings.theme;
  document.body.style.fontSize = d.settings.fs + "px";
  $("#tabs").innerHTML = role().tabs.map(t=>`<button class="${t===view?"on":""}" onclick="go('${t}')"><span>${TABS[t][0]}</span>${TABS[t][1]}</button>`).join("");
  $("#view").innerHTML = VIEWS[view] ? VIEWS[view]() : "";
  if(window.drawCharts && view === "stats") setTimeout(drawCharts, 50);
}
function delItem(id){RB.remove(id);render();}

/* ===== المشاريع ===== */
function addProject(){
  const n = $("#pr-n").value.trim(); if(!n) return;
  const color = PROJ_COLORS[RB.data.projects.length % PROJ_COLORS.length];
  RB.data.projects.push({
    id: Date.now().toString(36), name: n, desc: $("#pr-d").value.trim(),
    color, budget: +$("#pr-b").value || 0, createdAt: new Date().toISOString()
  });
  RB.save(); render(); toast("✅ أضيف المشروع");
}
function setActiveProject(pid){ RB.data.activeProject = pid || null; RB.save(); render(); toast(pid ? "🎯 " + (activeProj()?.name||"") : "✅ كل المشاريع"); }
function delProject(pid){
  if(!confirm("حذف المشروع وكل بياناته؟")) return;
  RB.data.projects = RB.data.projects.filter(p => p.id !== pid);
  RB.data.items = RB.data.items.filter(x => x.project !== pid);
  if(RB.data.activeProject === pid) RB.data.activeProject = null;
  RB.save(); render();
}
function projectTotals(pid){
  const items = RB.all("work").filter(w => w.project === pid);
  let days=0, ot=0, due=0, rec=0;
  items.forEach(e=>{ if(e.k==="work") days++; ot+=e.ot||0; due+=e.due||0; rec+=e.rec||0; });
  const tasks = RB.all("task").filter(t=>t.project===pid);
  return { days, ot, due, rec, rem: due-rec, tasks: tasks.length, done: tasks.filter(t=>t.done).length };
}

/* ===== الحوسبة الصوتية ===== */
function parseArabicVoice(text){
  const t = text.trim();
  const result = { raw:t, type:null, amount:null, currency:"$", person:null, date:iso(new Date()), time:null, title:t, kind:"شخصي", ot:0, project:null };
  const normalizeNum = s => s.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  const words = { "صفر":0,"واحد":1,"اثنين":2,"ثلاثة":3,"أربعة":4,"خمسة":5,"ستة":6,"سبعة":7,"ثمانية":8,"تسعة":9,"عشرة":10,"عشرين":20,"ثلاثين":30,"أربعين":40,"خمسين":50,"ستين":60,"سبعين":70,"ثمانين":80,"تسعين":90,"مئة":100,"ألف":1000 };
  const replaceWords = s => s.replace(/[\u0600-\u06FF]+/g, w => words[w]!==undefined ? words[w] : w);
  let norm = normalizeNum(t);
  if (/واصل|استلمت|استلم|دفعة|دفع|سدد|سددت|قبضت|قبض/i.test(t)) result.type = "payment";
  else if (/عطلة|عطله|راحة|راحه|إجازة|اجازه/i.test(t)) result.type = "holiday";
  else if (/ساعات\s*إضافية|اضافي|إضافي|اوفرتايم/i.test(t)) result.type = "ot";
  else if (/عمل|شغل|ورشة|يوم\s*عمل/i.test(t)) result.type = "work";
  const moneyMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(دولار|ليرة|ليره|يورو|ريال|درهم|دينار|\$|usd)/i);
  if (moneyMatch) {
    result.amount = parseFloat(moneyMatch[1].replace(",", "."));
    if (/يورو/i.test(moneyMatch[2])) result.currency = "€";
    else if (/ليرة|ليره/i.test(moneyMatch[2])) result.currency = "TL";
    else if (/ريال/i.test(moneyMatch[2])) result.currency = "SAR";
  } else {
    const m2 = replaceWords(norm).match(/(\d+)\s*(دولار|ليرة)?/);
    if (m2) result.amount = +m2[1];
  }
  const personM = t.match(/(?:من|إلى|لـ|عند|مع)\s+([\u0600-\u06FF][\u0600-\u06FF\s]{1,25})/);
  if (personM) result.person = personM[1].trim().replace(/[.،,].*$/, "");
  const timeM = t.match(/(?:الساعة|الوقت|عند)\s*(\d{1,2})(?::(\d{2}))?/);
  if (timeM) result.time = String(timeM[1]).padStart(2,"0")+":"+String(timeM[2]||"00");
  if (/غدا|غداً|بكرا|بكره/i.test(t)) result.date = iso(new Date(Date.now()+864e5));
  else if (/أمس|امس|بارحة/i.test(t)) result.date = iso(new Date(Date.now()-864e5));
  if (/اجتماع/i.test(t)) result.kind = "اجتماع";
  else if (/درس|امتحان|مراجعة/i.test(t)) result.kind = "دراسة";
  else if (/دكتور|مستشفى/i.test(t)) result.kind = "صحة";
  const otM = t.match(/(\d+)\s*ساعة/);
  if (otM) result.ot = +otM[1];
  RB.data.projects.forEach(p => { if (t.includes(p.name)) result.project = p.id; });
  if (!result.project && RB.data.activeProject) result.project = RB.data.activeProject;
  return result;
}

function voiceCapture(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast("استخدم Chrome أو Safari.");
  const r = new SR();
  r.lang = "ar-SA"; r.continuous = false; r.interimResults = false;
  toast("🎤 تحدث الآن...");
  r.onresult = e => {
    const text = e.results[0][0].transcript;
    showVoiceDialog(text, parseArabicVoice(text));
  };
  r.onerror = e => toast("خطأ: " + e.error);
  r.start();
}

function showVoiceDialog(text, p){
  const projName = p.project ? (RB.data.projects.find(x=>x.id===p.project)?.name || "—") : "بدون مشروع";
  const m = document.createElement("div");
  m.className = "card";
  m.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100;max-width:90%;width:440px;background:var(--card);border:2px solid var(--ac);box-shadow:0 8px 32px rgba(0,0,0,.6)";
  m.innerHTML = `
    <b>🎤 تحليل صوتي</b>
    <p class=muted style="margin:6px 0">"${esc(text)}"</p>
    <p><b>الإجراء:</b> ${p.type?KN[p.type]:"مهمة/ملاحظة"}</p>
    ${p.amount!=null?`<p>💰 المبلغ: <b>${p.amount} ${p.currency}</b></p>`:""}
    ${p.person?`<p>👤 الشخص: <b>${esc(p.person)}</b></p>`:""}
    ${p.time?`<p>⏰ الوقت: <b>${p.time}</b></p>`:""}
    <p>📅 التاريخ: <b>${p.date}</b></p>
    <p>📁 المشروع: <b>${esc(projName)}</b></p>
    <div class=row style="margin-top:12px">
      <button class=p onclick='voiceApply(${JSON.stringify(p).replace(/'/g,"&apos;")})'>✅ تنفيذ</button>
      <button onclick="this.closest('.card').remove()">إلغاء</button>
    </div>`;
  document.body.append(m);
}

function voiceApply(p){
  const s = RB.data.settings, proj = p.project || RB.data.activeProject || null;
  if (p.type === "payment" && p.amount) RB.add({ type:"work", d:p.date, k:"payment", ot:0, due:0, rec:p.amount, ds:`دفعة من ${p.person||"?"}`, loc:s.location, currency:p.currency, project:proj });
  else if (p.type === "work") RB.add({ type:"work", d:p.date, k:"work", ot:p.ot||0, due:s.dailyRate+(p.ot||0)*s.otRate, rec:p.amount||0, ds:`عمل ${p.person?"("+p.person+")":""}`, loc:s.location, currency:p.currency, project:proj });
  else if (p.type === "ot") { const hrs = p.ot || p.amount || 1; RB.add({ type:"work", d:p.date, k:"ot", ot:hrs, due:hrs*s.otRate, rec:p.amount||0, ds:`إضافي`, loc:s.location, project:proj }); }
  else if (p.type === "holiday") RB.add({ type:"work", d:p.date, k:"holiday", ot:0, due:0, rec:0, ds:"عطلة", loc:s.location, project:proj });
  else if (p.time || /اجتماع|موعد|درس|امتحان/i.test(p.raw)) RB.add({ type:"event", d:p.date, t:p.time||"09:00", title:p.raw, kind:p.kind, rep:"none", project:proj });
  else RB.add({ type:"note", d:p.date, title:"", body:p.raw, project:proj });
  document.querySelectorAll(".card").forEach(c => { if(c.style.position==="fixed") c.remove(); });
  render(); toast("✅ تم الحفظ");
}

/* ===== المفكرة ===== */
function occurs(e,k){
  if (k < e.d) return false;
  if (!e.rep || e.rep === "none") return e.d === k;
  if (e.rep === "daily") return true;
  if (e.rep === "weekly") return new Date(k).getDay() === new Date(e.d).getDay();
  if (e.rep === "monthly") return new Date(k).getDate() === new Date(e.d).getDate();
  return false;
}
function dayEvents(k){
  const pid = RB.data.activeProject;
  return RB.all("event").filter(e=>occurs(e,k) && (!pid || e.project === pid)).sort((a,b)=>(a.t||"").localeCompare(b.t||""));
}
function addEvent(){
  const title = $("#ev-t").value.trim(); if(!title) return;
  RB.add({ type:"event", d:selDay, t:$("#ev-time").value, title, kind:$("#ev-k").value, rep:$("#ev-r").value, project: RB.data.activeProject });
  render();
}
function exportICS(){
  const ev = RB.all("event"); if(!ev.length) return toast("لا مواعيد");
  const z = x => x.toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
  const body = ev.map(e=>{
    const s = new Date(`${e.d}T${e.t||"09:00"}`), en = new Date(s.getTime()+36e5);
    const rr = e.rep==="daily"?"RRULE:FREQ=DAILY":e.rep==="weekly"?"RRULE:FREQ=WEEKLY":e.rep==="monthly"?"RRULE:FREQ=MONTHLY":"";
    return ["BEGIN:VEVENT","UID:"+e.id+"@rimbook","DTSTAMP:"+z(new Date()),"DTSTART:"+z(s),"DTEND:"+z(en),"SUMMARY:"+e.title,rr,"END:VEVENT"].filter(Boolean).join("\r\n");
  }).join("\r\n");
  dl("rimbook.ics","BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//rimbook//AR\r\n"+body+"\r\nEND:VCALENDAR","text/calendar");
}

/* ===== المهام والعادات ===== */
function addTask(){
  const title = $("#tk-t").value.trim(); if(!title) return;
  RB.add({ type:"task", title, prio:+$("#tk-p").value, due:$("#tk-d").value, done:false, project: RB.data.activeProject });
  render();
}
function addHabit(){
  const n = $("#hb-n").value.trim(); if(!n) return;
  RB.data.habits.push({ id:Date.now().toString(36), name:n, history:[], project: RB.data.activeProject });
  RB.save(); render();
}
function toggleHabit(id){
  const h = RB.data.habits.find(x=>x.id===id); if(!h) return;
  const t = iso(new Date());
  if(h.history.includes(t)) h.history = h.history.filter(d=>d!==t);
  else h.history.push(t);
  RB.save(); render();
}
function habitStreak(h){
  let s = 0, d = new Date();
  for(let i=0;i<365;i++){
    const k = iso(d);
    if(h.history.includes(k)) s++;
    else if(i>0) break;
    d = new Date(d-864e5);
  }
  return s;
}
function addGoal(){
  const n = $("#gl-n").value.trim(); if(!n) return;
  RB.data.goals.push({ id:Date.now().toString(36), name:n, target:100, current:0, project: RB.data.activeProject });
  RB.save(); render();
}
function goalUpdate(id,v){
  const g = RB.data.goals.find(x=>x.id===id); if(!g) return;
  g.current = Math.min(+v, g.target); RB.save(); render();
}
function addNote(){
  const body = $("#nt-b").value.trim(); if(!body) return;
  RB.add({ type:"note", d:iso(new Date()), title:$("#nt-t").value.trim(), body, project: RB.data.activeProject });
  render();
}
function listNotes(){
  const tags = new Set();
  RB.all("note").forEach(n=>(n.body.match(/#[^\s#.,!?]+/g)||[]).forEach(t=>tags.add(t)));
  const q = nq.toLowerCase(), pid = RB.data.activeProject;
  $("#nlist").innerHTML = RB.all("note")
    .filter(n=>(!pid || n.project === pid) && (!tagFilter || n.body.includes(tagFilter)) && (n.title+n.body).toLowerCase().includes(q))
    .reverse()
    .map(n=>`<div class=card><div class=row style="justify-content:space-between"><b>${esc(n.title||"بدون عنوان")}</b><small class=muted>${n.d}</small><button onclick="delItem('${n.id}')">🗑</button></div><p style="white-space:pre-wrap;margin:6px 0 0">${esc(n.body)}</p></div>`)
    .join("") || '<p class=muted>لا ملاحظات</p>';
  window._tags = [...tags];
}

/* ===== العمل ===== */
function ledgerTotals(){
  const pid = RB.data.activeProject;
  let days=0, hol=0, ot=0, due=0, rec=0;
  RB.all("work").filter(e=>!pid || e.project===pid).forEach(e=>{
    if(e.k==="work") days++;
    if(e.k==="holiday") hol++;
    ot += e.ot||0; due += e.due||0; rec += e.rec||0;
  });
  return { days, hol, ot, due, rec, rem:due-rec, otv:ot*RB.data.settings.otRate };
}
function addWk(){
  const k = $("#wk").value, amt = +$("#wa2").value||0, ot = +$("#wo").value||0, s = RB.data.settings;
  const ds = $("#wd").value.trim() || KN[k];
  const due = k==="work"?s.dailyRate+ot*s.otRate:k==="ot"?ot*s.otRate:0;
  RB.add({ type:"work", d:iso(new Date()), k, ot, due, rec:amt, ds, loc:s.location, project: RB.data.activeProject });
  render();
}
function wText(){
  const T = ledgerTotals(), s = RB.data.settings, p = activeProj();
  return `📋 تقرير rimbook${p?"\n📁 المشروع: "+p.name:""}\n📍 ${s.location}\n📅 ${new Date().toLocaleDateString("ar")}\n✅ أيام: ${T.days}\n🏖️ عطل: ${T.hol}\n⏱️ إضافي: ${T.ot}س\n💰 واصل: ${T.rec}${s.currency}\n⏳ متبقي: ${T.rem}${s.currency}`;
}
function shareW(){
  const p = RB.data.settings.managerPhone.replace(/\D/g,""), t = encodeURIComponent(wText());
  open(p?`https://wa.me/${p}?text=${t}`:`https://wa.me/?text=${t}`,"_blank");
}
function csvW(){
  const pid = RB.data.activeProject;
  const rows = [["التاريخ","النوع","البيان","المكان","ساعات","واصل","مستحق","متبقي","المشروع"],
    ...RB.all("work").filter(e=>!pid||e.project===pid).map(e=>[e.d,KN[e.k],e.ds,e.loc,e.ot,e.rec,e.due,(e.due||0)-(e.rec||0), RB.data.projects.find(p=>p.id===e.project)?.name||""])];
  dl("rimbook-work.csv","\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n"),"text/csv");
}

/* ===== إعدادات ===== */
function setP(k,v){RB.data.profile[k]=v;RB.save();render();}
function setS(k,v){RB.data.settings[k]=v;RB.save();render();}
function setRole(v){RB.data.profile.role=v;RB.save();view="home";render();}
function photo(el){
  const f = el.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas"); c.width = c.height = 320;
      const s = Math.min(im.width, im.height);
      c.getContext("2d").drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,320,320);
      setP("photo", c.toDataURL("image/jpeg",.85));
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
}
function resetAll(){ if(confirm("حذف كل البيانات نهائياً؟")){ localStorage.removeItem("rimbook.v5"); location.reload(); } }
function askNotif(){ if("Notification" in window) Notification.requestPermission().then(p=>toast("الإشعارات: "+p)); }
function backupLocal(){
  const json = JSON.stringify(RB.data, null, 1);
  dl(`rimbook-backup-${iso(new Date())}.json`, json, "application/json");
  toast("✅ تم تحميل النسخة");
}
function restoreLocal(el){
  const f = el.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = () => { try{ RB.replace(JSON.parse(r.result)); render(); toast("✅ استعادة ناجحة"); }catch(e){ toast("ملف غير صالح"); } };
  r.readAsText(f);
}

/* ===== الشاشات ===== */
const VIEWS = {};

VIEWS.home = () => {
  const d = RB.data, t = iso(new Date());
  const pid = d.activeProject, proj = activeProj();
  const tasks = RB.all("task").filter(x=>!pid||x.project===pid);
  const open = tasks.filter(x=>!x.done), late = open.filter(x=>x.due && x.due<t);
  const pct = tasks.length ? Math.round((tasks.length-open.length)/tasks.length*100) : 0;
  const ev = dayEvents(t), L = ledgerTotals();
  const habits = d.habits.filter(h=>!pid||h.project===pid);
  const todayDone = habits.filter(h=>h.history.includes(t)).length;
  return `
  <div class=card>
    <div class=row style="justify-content:space-between">
      <div style="flex:1">
        <h2 style="margin:0">أهلاً ${esc(d.profile.name||"بك")} 👋</h2>
        <div class=muted>${new Date().toLocaleDateString("ar",{weekday:"long",day:"numeric",month:"long"})}</div>
        ${proj?`<p style="margin:6px 0"><span class=tag style="background:${proj.color}">📁 ${esc(proj.name)}</span> <button style="padding:2px 8px;font-size:10px" onclick="setActiveProject(null)">عرض الكل</button></p>`:"<p style='margin:6px 0' class=muted>🎯 كل المشاريع</p>"}
      </div>
      ${d.profile.photo?`<img class=avatar style="width:56px;height:56px" src="${d.profile.photo}">`:`<div class=avatar style="width:56px;height:56px;font-size:24px">👤</div>`}
    </div>
  </div>
  <div class=grid3>
    <div class=card><small class=muted>مهام</small><h3>${open.length}</h3></div>
    <div class=card><small class=muted>متأخرة</small><h3 class="${late.length?"hi":""}">${late.length}</h3></div>
    <div class=card><small class=muted>إنجاز</small><h3>${pct}%</h3></div>
  </div>
  ${role().tabs.includes("ledger")?`<div class=card><b>💼 رصيد${proj?" - "+esc(proj.name):""}</b><h3 class=hi style="margin:4px 0">${L.rem} ${d.settings.currency}</h3><small class=muted>أيام: ${L.days} · إضافي: ${L.ot}س</small></div>`:""}
  ${habits.length?`<div class=card><b>🔥 عادات اليوم (${todayDone}/${habits.length})</b><div class=progress><div style="width:${habits.length?todayDone/habits.length*100:0}%"></div></div></div>`:""}
  <div class=card><b>📅 مواعيد اليوم</b>${ev.map(e=>`<div class=item"><span>${e.t||""} ${esc(e.title)}</span><span class=tag>${esc(e.kind)}</span></div>`).join("")||'<p class=muted>لا مواعيد</p>'}</div>`;
};

VIEWS.projects = () => {
  const d = RB.data, active = d.activeProject;
  return `<div class=card><b>➕ مشروع جديد</b><div class=row style="margin-top:6px"><input id=pr-n placeholder="اسم المشروع" style="flex:1"><input id=pr-d placeholder="وصف" style="flex:1"></div><div class=row style="margin-top:6px"><input id=pr-b type=number placeholder="ميزانية" style="flex:1"><button class=p onclick="addProject()">إضافة</button></div></div>
  <div class=card><b>📁 المشاريع (${d.projects.length})</b>
  <div class=row style="margin-top:8px"><button class="${!active?"on":""}" onclick="setActiveProject(null)">🌐 الكل</button></div>
  ${d.projects.map(p=>{
    const T = projectTotals(p.id);
    return `<div class=card style="border-right:4px solid ${p.color};margin:8px 0;padding:10px">
      <div class=row style="justify-content:space-between"><b style="color:${p.color}">📁 ${esc(p.name)}</b><span class=tag>${p.budget?`💰 ${p.budget}`:"—"}</span></div>
      ${p.desc?`<p class=muted style="margin:4px 0">${esc(p.desc)}</p>`:""}
      <div class=grid3 style="margin-top:6px">
        <div><small class=muted>مهام</small><br><b>${T.done}/${T.tasks}</b></div>
        <div><small class=muted>أيام</small><br><b>${T.days}</b></div>
        <div><small class=muted>متبقي</small><br><b class="${T.rem>0?"hi":"ok"}">${T.rem}${d.settings.currency}</b></div>
      </div>
      <div class=row style="margin-top:8px">
        <button class="${active===p.id?"on":"p"}" onclick="setActiveProject('${p.id}')">${active===p.id?"✅ نشط":"🎯 تفعيل"}</button>
        <button onclick="view='ledger';setActiveProject('${p.id}')">💼</button>
        <button onclick="view='tasks';setActiveProject('${p.id}')">✅</button>
        <button onclick="delProject('${p.id}')" class=danger>🗑</button>
      </div>
    </div>`;
  }).join("") || '<p class=muted>لا مشاريع</p>'}
  </div>`;
};

VIEWS.agenda = () => {
  const days = [...Array(14)].map((_,i)=>iso(new Date(Date.now()+i*864e5)));
  const list = dayEvents(selDay), clash = list.some((e,i)=>i && list[i-1].t === e.t);
  return `<div class=card><div class=strip>${days.map(k=>`<button class="${k===selDay?"on":""}" onclick="selDay='${k}';render()"><small>${new Date(k).toLocaleDateString("ar",{weekday:"short"})}</small><br>${Number(k.slice(8))}</button>`).join("")}</div></div>
  <div class=card><b>${selDay}</b> ${clash?'<span class=hi>⚠️ تعارض</span>':""}
  ${list.map(e=>`<div class=item"><span>${e.t||""} ${esc(e.title)} <span class=tag>${esc(e.kind)}</span></span><button onclick="delItem('${e.id}')">🗑</button></div>`).join("")||'<p class=muted>لا مواعيد</p>'}
  <div class=row style="margin-top:10px"><input id=ev-t placeholder="عنوان" style="flex:1"><input id=ev-time type=time value="09:00"><select id=ev-k>${KINDS.map(k=>`<option>${k}</option>`).join("")}</select><select id=ev-r><option value=none>مرة</option><option value=daily>يومي</option><option value=weekly>أسبوعي</option><option value=monthly>شهري</option></select><button class=p onclick="addEvent()">+</button></div></div>
  <div class=card><button onclick="exportICS()">⬇ ICS</button> <button onclick="askNotif()">🔔 تذكيرات</button></div>`;
};

VIEWS.tasks = () => {
  const t = iso(new Date()), pid = RB.data.activeProject;
  const all = RB.all("task").filter(x=>!pid||x.project===pid);
  const L = all.filter(x=>taskFilter==="all"||(taskFilter==="open"?!x.done:x.done))
    .sort((a,b)=>(a.done-b.done)||(b.prio-a.prio)||(a.due||"z").localeCompare(b.due||"z"));
  return `<div class=card><div class=row><input id=tk-t placeholder="مهمة جديدة" style="flex:1"><select id=tk-p><option value=0>منخفضة</option><option value=1 selected>متوسطة</option><option value=2>عالية</option></select><input id=tk-d type=date><button class=p onclick="addTask()">+</button></div></div>
  <div class=card><div class=row>${["all","open","done"].map(f=>`<button class="${taskFilter===f?"on":""}" onclick="taskFilter='${f}';render()">${{all:"الكل",open:"مفتوحة",done:"منجزة"}[f]}</button>`).join("")}<small class=muted style="margin-right:auto">${all.filter(x=>x.done).length}/${all.length}</small></div>
  ${L.map(x=>`<div class="item ${x.done?"done":""}"><input type=checkbox ${x.done?"checked":""} onchange="RB.patch('${x.id}',{done:${!x.done}});render()"><span>${esc(x.title)} <span class=tag>${["منخفضة","متوسطة","عالية"][x.prio]}</span> ${x.due?`<small class="${!x.done && x.due<t?"hi":"muted"}">${x.due}</small>`:""}</span><button onclick="delItem('${x.id}')">🗑</button></div>`).join("")||'<p class=muted>لا مهام</p>'}</div>`;
};

VIEWS.habits = () => {
  const t = iso(new Date()), pid = RB.data.activeProject;
  const habits = RB.data.habits.filter(h=>!pid||h.project===pid);
  return `<div class=card><b>➕ عادة</b><div class=row style="margin-top:6px"><input id=hb-n placeholder="مثال: قراءة" style="flex:1"><button class=p onclick="addHabit()">+</button></div></div>
  ${habits.map(h=>{
    const done = h.history.includes(t), streak = habitStreak(h);
    return `<div class=card><div class=row style="justify-content:space-between"><b>${esc(h.name)}</b>${streak>0?`<span>🔥 ${streak}</span>`:""}</div><div class=row style="margin-top:8px"><button class="${done?"p":""}" onclick="toggleHabit('${h.id}')">${done?"✅":"⬜"}</button><button onclick="RB.data.habits=RB.data.habits.filter(x=>x.id!=='${h.id}');RB.save();render()">🗑</button></div></div>`;
  }).join("")||'<p class=muted>لا عادات</p>'}`;
};

VIEWS.goals = () => {
  const pid = RB.data.activeProject;
  const goals = RB.data.goals.filter(g=>!pid||g.project===pid);
  return `<div class=card><b>🎯 هدف</b><div class=row style="margin-top:6px"><input id=gl-n placeholder="الهدف" style="flex:1"><button class=p onclick="addGoal()">+</button></div></div>
  ${goals.map(g=>{
    const pct = Math.round(g.current/g.target*100);
    return `<div class=card><div class=row style="justify-content:space-between"><b>${esc(g.name)}</b><small>${g.current}/${g.target}</small></div><div class=progress><div style="width:${pct}%"></div></div><div class=row><input type=number value="${g.current}" onchange="goalUpdate('${g.id}',this.value)" style="width:100px"><button onclick="RB.data.goals=RB.data.goals.filter(x=>x.id!=='${g.id}');RB.save();render()">🗑</button></div></div>`;
  }).join("")||'<p class=muted>لا أهداف</p>'}`;
};

VIEWS.notes = () => {
  setTimeout(listNotes, 0);
  return `<div class=card><input id=nt-t placeholder="عنوان" style="width:100%;margin-bottom:6px"><textarea id=nt-b rows=3 placeholder="اكتب... #وسم" style="width:100%"></textarea><button class=p style="margin-top:6px" onclick="addNote()">حفظ</button></div>
  <div class=card><input placeholder="🔍 بحث" value="${esc(nq)}" oninput="nq=this.value;listNotes()" style="width:100%"><div class=row style="margin-top:8px">${(window._tags||[]).map(t=>`<button class="${tagFilter===t?"on":""}" onclick="tagFilter=tagFilter==='${t}'?'':'${t}';render()">${esc(t)}</button>`).join("")}</div></div>
  <div id=nlist></div>`;
};

VIEWS.ledger = () => {
  const T = ledgerTotals(), s = RB.data.settings, pid = RB.data.activeProject;
  const proj = activeProj();
  const works = RB.all("work").filter(e=>!pid||e.project===pid);
  return `${proj?`<div class=card style="border-right:4px solid ${proj.color}"><b style="color:${proj.color}">📁 ${esc(proj.name)}</b></div>`:""}
  <div class=grid3>
    <div class=card><small class=muted>أيام</small><h3>${T.days}</h3></div>
    <div class=card><small class=muted>إضافي</small><h3>${T.ot}</h3></div>
    <div class=card><small class=muted>متبقي</small><h3 class=hi>${T.rem}${s.currency}</h3></div>
  </div>
  <div class=card><b>➕ تسجيل</b><div class=row><select id=wk><option value=work>عمل</option><option value=ot>إضافي</option><option value=holiday>عطلة</option><option value=payment>دفعة</option></select><input id=wo type=number step=0.5 placeholder="ساعات" style="width:80px"><input id=wa2 type=number placeholder="واصل" style="width:90px"><input id=wd placeholder="البيان" style="flex:1"><button class=p onclick="addWk()">+</button></div></div>
  <div class=card><b>⚙️ أسعار</b><div class=row><input type=number value="${s.dailyRate}" onchange="setS('dailyRate',+this.value)" placeholder="يوم" style="width:90px"><input type=number value="${s.otRate}" onchange="setS('otRate',+this.value)" placeholder="ساعة" style="width:80px"><input value="${esc(s.managerPhone)}" onchange="setS('managerPhone',this.value)" placeholder="واتساب" style="flex:1"></div>
  <div class=row style="margin-top:8px"><button class=p onclick="shareW()">📤 واتساب</button><button onclick="csvW()">⬇ CSV</button></div></div>
  <div class=card><b>📋 السجل</b>${works.slice().reverse().slice(0,80).map(e=>{
    const p = RB.data.projects.find(x=>x.id===e.project);
    return `<div class=item"><span>${e.d} ${esc(e.ds)} <span class=tag>${KN[e.k]}</span> ${p?`<span class=tag style="background:${p.color}">${esc(p.name)}</span>`:""} ${e.ot?e.ot+"س":""} ${e.rec?"+"+e.rec:""}</span><button onclick="delItem('${e.id}')">🗑</button></div>`;
  }).join("")||'<p class=muted>لا سجلات</p>'}</div>`;
};

VIEWS.profile = () => {
  const p = RB.data.profile;
  const fields = [["name","الاسم"],["phone","الهاتف"],["email","البريد"],["city","المدينة/الدولة"],["birth","الميلاد"],["emergency","الطوارئ"],["skills","المهارات"]];
  return `<div class=card style="text-align:center">${p.photo?`<img class=avatar src="${p.photo}">`:'<div class=avatar>👤</div>'}<br><input type=file accept="image/*" onchange="photo(this)" style="margin-top:8px"><h2 style="margin:8px 0 0">${esc(p.name||"اسمك")}</h2></div>
  <div class=card>${fields.map(([k,l])=>`<p style="margin:6px 0"><label class=muted>${l}</label><br><input style="width:100%" value="${esc(p[k])}" onchange="setP('${k}',this.value)"></p>`).join("")}
  <p style="margin:6px 0"><label class=muted>الدور</label><br><select onchange="setRole(this.value)" style="width:100%">${Object.entries(ROLES).map(([k,v])=>`<option value=${k} ${p.role===k?"selected":""}>${v.label}</option>`).join("")}</select></p></div>
  <div class=card><b>حول</b><textarea rows=5 style="width:100%" onchange="setP('about',this.value)">${esc(p.about)}</textarea></div>`;
};

VIEWS.settings = () => {
  const s = RB.data.settings;
  const enabledCount = Object.values(INTEGRATIONS||{}).filter(i=>isEnabled(i.id)).length;
  const totalCount = Object.keys(INTEGRATIONS||{}).length;
  return `<div class=card><b>المظهر</b><div class=row><button onclick="setS('theme',s.theme==='dark'?'light':'dark')">${s.theme==="dark"?"☀️ فاتح":"🌙 داكن"}</button><label class=muted>خط <input type=range min=12 max=20 value=${s.fs} onchange="setS('fs',+this.value)"></label></div>
  <div class=row style="margin-top:8px"><label class=muted>عملة</label><select onchange="setS('currency',this.value)">${["$","€","TL","SAR","AED"].map(c=>`<option ${s.currency===c?"selected":""}>${c}</option>`).join("")}</select></div></div>
  <div class=card><b>💾 نسخ احتياطي</b><div class=row><button class=p onclick="backupLocal()">⬇ تصدير</button><label class=tag style="padding:8px 12px;cursor:pointer">⬆ استيراد<input type=file accept=.json hidden onchange="restoreLocal(this)"></label><button class=danger onclick="resetAll()">🗑 مسح</button></div></div>
  <div class=card><b>🧩 الإضافات</b><p class=muted>${enabledCount} مفعّلة من ${totalCount}</p><button class=p onclick="go('integrations')">🎛️ إدارة</button></div>
  <div class=card><b>🔄 المزامنة</b><button class=p onclick="go('sync')">فتح</button></div>
  <div class=card><b>حول</b><p class=muted style="white-space:pre-wrap">${esc(RB.data.profile.about)}</p></div>`;
};

VIEWS.stats = () => {
  const pid = RB.data.activeProject;
  const tasks = RB.all("task").filter(x=>!pid||x.project===pid);
  const done = tasks.filter(t=>t.done).length;
  const late = tasks.filter(t=>!t.done && t.due && t.due < iso(new Date())).length;
  return `<div class=grid2>
    <div class=card><small class=muted>مهام</small><h3>${done}/${tasks.length}</h3></div>
    <div class=card><small class=muted>متأخرة</small><h3 class="${late?"hi":""}">${late}</h3></div>
  </div>
  <div class=card><b>📊 آخر 7 أيام (مهام منجزة)</b><canvas id=chartTasks width=400 height=160></canvas></div>
  <div class=card><b>💼 توزيع العمل على المشاريع</b><canvas id=chartProjects width=400 height=200></canvas></div>
  <div class=card><b>✍️ أمثلة صوتية</b><p class=chip>"واصلت دفعة عشرة دولار من محمد في مشروع النجارة"</p><p class=chip>"عملت اليوم 8 ساعات في مشروع البناء"</p><p class=chip>"غداً اجتماع الساعة 9"</p></div>`;
};

VIEWS.sync = () => `
  <div class=card><b>🔄 النقل والمزامنة</b><p class=muted>كل شيء اختياري — أنت تختار.</p></div>
  <div class=card><b>☁️ Google Drive</b><p class=muted>فعّل المفتاح في الإضافات أولاً</p><div class=row><button class=p onclick="gdriveUpload()">⬆ رفع</button><button onclick="gdriveDownload()">⬇ تنزيل</button></div></div>
  <div class=card><b>📱 واتساب / بريد / أي تطبيق</b>
    <div class=row><button class=p onclick="shareFileWhatsApp()">💚 واتساب JSON</button><button onclick="shareCsvWhatsApp()">📊 CSV</button></div>
    <div class=row style="margin-top:8px"><button onclick="sharePdfReport()">📄 تقرير PDF</button><button onclick="shareViaAny()">📤 أي تطبيق</button></div>
  </div>
  <div class=card><b>🔗 نقل مباشر (WebRTC)</b>
    <div class=row><button class=p onclick="rtcCreateOffer()">📤 المُرسل</button><button onclick="rtcAcceptOffer()">📥 المُستقبل</button></div>
    <div class=row style="margin-top:6px"><button onclick="rtcAcceptAnswer()">✅ إتمام</button></div>
  </div>
  <div class=card><b>📁 استيراد ملف</b><label class=tag style="padding:10px 16px;cursor:pointer;display:inline-block">📂 اختر<input type=file accept=.json hidden onchange="restoreLocal(this)"></label></div>
  <div class=card><b>💡</b><ul class=muted style="padding-right:18px"><li>الملف يحتوي كل البيانات</li><li>لا يُرسل تلقائياً</li></ul></div>
`;

function s_theme(){ return RB.data.settings.theme === "dark" ? "light" : "dark"; }

/* ===== التشغيل ===== */
render();
setInterval(() => {
  const now = new Date(), t = iso(now);
  dayEvents(t).forEach(e=>{
    if(!e.t) return;
    const key = e.id+t+e.t;
    const diff = (new Date(`${t}T${e.t}`)-now)/6e4;
    if (diff>=0 && diff<=10 && !reminded.has(key)){
      reminded.add(key);
      toast(`⏰ ${e.title} بعد ${Math.round(diff)}د`);
      if("Notification" in window && Notification.permission==="granted") new Notification("rimbook",{body:e.title});
    }
  });
}, 30000);

function netState(){ const n = $("#net"); if(n) n.textContent = navigator.onLine ? "🟢" : "🔌"; }
addEventListener("online",netState); addEventListener("offline",netState); netState();

let deferredPrompt = null;
const btn = document.getElementById("btnInstall");
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
if(btn && !isStandalone()) btn.hidden = false;
window.addEventListener("beforeinstallprompt", e=>{ e.preventDefault(); deferredPrompt=e; if(btn) btn.hidden=false; });
window.addEventListener("appinstalled", ()=>{ deferredPrompt=null; if(btn) btn.hidden=true; });
async function installApp(){
  if(isStandalone()){ alert("مثبّت ✅"); return; }
  if(deferredPrompt){
    deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if(outcome==="accepted" && btn) btn.hidden=true;
    // لا تقم بتشغيل الرسم هنا، لأن index.html سيقوم بذلك بعد تحميل كل الملفات;
  }
  if(isIOS()) alert("iPhone:\n1) زر المشاركة ⬆️\n2) إضافة إلى الشاشة الرئيسية");
  else alert("من قائمة المتصفح ⋮ اختر «تثبيت التطبيق»");
}
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
      }
