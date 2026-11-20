/* rimbook v6 - النسخة النهائية الموحدة (ملف واحد فقط) */

// ==================== 1) طبقة البيانات ====================
const RB = (() => {
  const KEY = "rimbook.v6";
  const def = () => ({
    profile: { name: "", role: "employee", phone: "", email: "", city: "", birth: "", emergency: "", skills: "", photo: "", about: "Yasser-ALhussen\nkalimat2026go@gmail.com\ndaraa-syria\n\nrimbook © 2026" },
    settings: { theme: "dark", fs: 15, dailyRate: 50, otRate: 10, managerPhone: "", location: "موقع العمل", currency: "$", lang: "ar", enabled: {} },
    items: [], habits: [], goals: [], projects: [], contacts: [], invoices: [], activeProject: null
  });
  let data;
  try { data = Object.assign(def(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { data = def(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
  return {
    get data() { return data; },
    all: t => data.items.filter(i => i.type === t),
    add(o) { o.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); o.created = Date.now(); data.items.push(o); save(); return o; },
    patch(id, p) { const i = data.items.find(x => x.id === id); if (i) Object.assign(i, p); save(); },
    remove(id) { data.items = data.items.filter(x => x.id !== id); save(); },
    save, replace(obj) { data = Object.assign(def(), obj); save(); }
  };
})();

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const iso = d => new Date(d - d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const fmt = s => String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");

const ROLES = {
  employee: { label: "موظف", tip: "رتّب مهامك", tabs: ["home","projects","agenda","tasks","ledger","profile","settings"] },
  worker: { label: "عامل", tip: "سجّل عملك", tabs: ["home","projects","ledger","tasks","profile","settings"] }
};
const TABS = { home:["🏠","الرئيسية"], projects:["📁","المشاريع"], agenda:["📅","المفكرة"], tasks:["✅","المهام"], ledger:["💼","العمل"], profile:["👤","الملف"], settings:["⚙️","الإعدادات"] };

let view = "home", selDay = iso(new Date()), taskFilter = "all", mr = null, chunks = [], recT = 0;

function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),2600);}
function go(t){ view = t; render(); window.scrollTo(0,0); }
function render(){
  const d = RB.data;
  document.body.dataset.theme = d.settings.theme;
  document.body.style.fontSize = d.settings.fs + "px";
  $("#tabs").innerHTML = ROLES[d.profile.role].tabs.map(t=>`<button class="${t===view?"on":""}" onclick="go('${t}')"><span>${TABS[t][0]}</span>${TABS[t][1]}</button>`).join("");
  $("#view").innerHTML = VIEWS[view] ? VIEWS[view]() : "";
}

// ==================== 2) الحوسبة الصوتية ====================
function voiceCapture(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast("استخدم Chrome أو Safari.");
  const r = new SR();
  r.lang = "ar-SA";
  toast("🎤 تحدث الآن...");
  r.onresult = e => {
    const text = e.results[0][0].transcript;
    const p = parseArabicVoice(text);
    voiceApply(p);
  };
  r.start();
}
function parseArabicVoice(text){
  const t = text.trim();
  const p = { type:null, amount:null, date:iso(new Date()), title:t };
  if (/واصل|استلمت|دفعة|دفع/i.test(t)) p.type = "payment";
  else if (/عطلة|راحة/i.test(t)) p.type = "holiday";
  else if (/عمل|شغل/i.test(t)) p.type = "work";
  const money = t.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).match(/(\d+)/);
  if (money) p.amount = +money[1];
  if (/غدا|غداً|بكرا/i.test(t)) p.date = iso(new Date(Date.now()+864e5));
  return p;
}
function voiceApply(p){
  if(p.type === "payment") RB.add({type:"work", d:p.date, k:"payment", rec:p.amount||0, ds:"دفعة"});
  else if(p.type === "work") RB.add({type:"work", d:p.date, k:"work", due:RB.data.settings.dailyRate, ds:"عمل"});
  else RB.add({type:"note", d:p.date, body:p.title, title:""});
  render(); toast("✅ تم الحفظ");
}

// ==================== 3) الشاشات ====================
const VIEWS = {};

VIEWS.home = () => {
  const tasks = RB.all("task"), open = tasks.filter(x=>!x.done);
  const L = RB.all("work").reduce((acc, e) => { acc.rec += e.rec||0; acc.due += e.due||0; return acc; }, {rec:0, due:0});
  return `<div class=card><h2>أهلاً بك 👋</h2><p class=muted>${new Date().toLocaleDateString("ar")}</p></div>
  <div class="grid3">
    <div class=card><small class=muted>مهام</small><h3>${open.length}</h3></div>
    <div class=card><small class=muted>واصل</small><h3 class=ok>${L.rec}</h3></div>
    <div class=card><small class=muted>متبقي</small><h3 class=hi>${L.due-L.rec}</h3></div>
  </div>`;
};

VIEWS.projects = () => {
  return `<div class=card><b>📁 المشاريع</b><p class=muted>قريباً...</p></div>`;
};

VIEWS.tasks = () => {
  const all = RB.all("task");
  return `<div class=card><b>المهام</b>
  <div class=row><input id=tk-t placeholder="مهمة جديدة" style="flex:1"><button class=p onclick="addTask()">+</button></div>
  ${all.map(x=>`<div class="item ${x.done?"done":""}"><input type=checkbox ${x.done?"checked":""} onchange="RB.patch('${x.id}',{done:${!x.done}});render()"><span>${esc(x.title)}</span></div>`).join("")}
  </div>`;
};
function addTask(){ const v = $("#tk-t").value; if(v){ RB.add({type:"task", title:v, done:false}); render(); } }

VIEWS.ledger = () => {
  const L = RB.all("work");
  return `<div class=card><b>💼 العمل</b>
  <div class=row><button class=p onclick="addWk()">+ يوم عمل</button></div>
  ${L.map(x=>`<div class=item"><span>${x.d}</span><span class="tag">${x.k}</span><span>${x.due||0}</span></div>`).join("")}
  </div>`;
};
function addWk(){ RB.add({type:"work", d:iso(new Date()), k:"work", due:50}); render(); }

VIEWS.agenda = () => `<div class=card><b>📅 المفكرة</b><p class=muted>قريباً...</p></div>`;
VIEWS.profile = () => `<div class=card><b>👤 الملف</b><p>الاسم: ${esc(RB.data.profile.name)}</p></div>`;

VIEWS.settings = () => {
  return `<div class=card><b>⚙️ الإعدادات</b>
  <div class=row><button onclick="document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark'; render()">تبديل المظهر</button></div>
  </div>`;
};

// ==================== 4) التشغيل ====================
render();
