/* rimbook v6 - الكود الأساسي الشامل */
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
    save, replace(obj) { Object.keys(data).forEach(k => delete data[k]); Object.assign(data, def(), obj); save(); }
  };
})();

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const iso = d => new Date(d - d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const fmt = s => String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");

const ROLES = {
  employee: { label: "موظف", tip: "رتّب مهامك", tabs: ["home","projects","agenda","tasks","ledger","profile","settings","stats","sync","integrations"] },
  worker: { label: "عامل", tip: "سجّل عملك", tabs: ["home","projects","ledger","tasks","profile","settings","stats","sync","integrations"] }
};
const TABS = { home:["🏠","الرئيسية"], projects:["📁","المشاريع"], agenda:["📅","المفكرة"], tasks:["✅","المهام"], ledger:["💼","العمل"], profile:["👤","الملف"], settings:["⚙️","الإعدادات"], stats:["📊","الإحصاء"], sync:["🔄","المزامنة"], integrations:["🧩","الإضافات"] };

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

/* ===== المشاريع ===== */
function addProject(){
  const n = $("#pr-n").value.trim(); if(!n) return;
  RB.data.projects.push({ id: Date.now().toString(36), name: n, color: "#22d3ee", budget: 0 });
  RB.save(); render(); toast("✅ أضيف المشروع");
}
function setActiveProject(pid){ RB.data.activeProject = pid || null; RB.save(); render(); }
function delProject(pid){
  if(!confirm("حذف المشروع؟")) return;
  RB.data.projects = RB.data.projects.filter(p => p.id !== pid);
  RB.data.items = RB.data.items.filter(x => x.project !== pid);
  RB.save(); render();
}

/* ===== الحوسبة الصوتية ===== */
function voiceCapture(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast("استخدم Chrome أو Safari.");
  const r = new SR();
  r.lang = "ar-SA"; toast("🎤 تحدث الآن...");
  r.onresult = e => {
    const text = e.results[0][0].transcript;
    RB.add({ type:"note", d:iso(new Date()), title: "", body: text });
    render(); toast("✅ تم الحفظ: " + text);
  };
  r.start();
}

/* ===== الشاشات ===== */
const VIEWS = {};

VIEWS.home = () => {
  const tasks = RB.all("task"), open = tasks.filter(x=>!x.done);
  return `<div class=card><h2>أهلاً بك 👋</h2><p class=muted>${new Date().toLocaleDateString("ar")}</p></div>
  <div class="grid3">
    <div class=card><small class=muted>مهام مفتوحة</small><h3>${open.length}</h3></div>
    <div class=card><small class=muted>المشاريع</small><h3>${RB.data.projects.length}</h3></div>
    <div class=card><small class=muted>الملاحظات</small><h3>${RB.all("note").length}</h3></div>
  </div>`;
};

VIEWS.projects = () => {
  return `<div class=card><b>➕ مشروع جديد</b><div class=row style="margin-top:6px"><input id=pr-n placeholder="اسم المشروع" style="flex:1"><button class=p onclick="addProject()">إضافة</button></div></div>
  <div class=card><b>📁 المشاريع (${RB.data.projects.length})</b>
  ${RB.data.projects.map(p=>`<div class="item" style="border:1px solid var(--bd);border-radius:8px;padding:8px;margin-top:8px">
    <b style="flex:1">${esc(p.name)}</b>
    <button class=p onclick="setActiveProject('${p.id}')">تفعيل</button>
    <button class=danger onclick="delProject('${p.id}')">🗑</button>
  </div>`).join("") || '<p class=muted>لا مشاريع بعد</p>'}
  </div>`;
};

VIEWS.tasks = () => {
  const all = RB.all("task");
  return `<div class=card><b>✅ المهام</b>
  <div class=row style="margin-top:8px"><input id=tk-t placeholder="مهمة جديدة" style="flex:1"><button class=p onclick="addTask()">+</button></div>
  ${all.map(x=>`<div class="item ${x.done?"done":""}"><input type=checkbox ${x.done?"checked":""} onchange="RB.patch('${x.id}',{done:${!x.done}});render()"><span>${esc(x.title)}</span><button onclick="delItem('${x.id}')">🗑</button></div>`).join("") || '<p class=muted>لا مهام</p>'}
  </div>`;
};
function addTask(){ const v = $("#tk-t").value; if(v){ RB.add({type:"task", title:v, done:false}); render(); } }
function delItem(id){ RB.remove(id); render(); }

VIEWS.profile = () => {
  const p = RB.data.profile;
  return `<div class=card style="text-align:center">
    <div class=avatar>👤</div><h2>${esc(p.name || "اسمك")}</h2>
    <input style="width:100%;margin-top:8px" value="${esc(p.name)}" placeholder="اكتب اسمك هنا" onchange="RB.data.profile.name=this.value;RB.save();render()">
  </div>
  <div class=card><b>حول</b><textarea rows=4 style="width:100%">${esc(p.about)}</textarea></div>`;
};

function savePayrollSetting(key, value) {
  if (["dailyRate","otRate","normalHoursPerDay","holidayPayPercent"].includes(key)) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || (key === "holidayPayPercent" && n > 100) || (key === "normalHoursPerDay" && n === 0)) {
      toast("أدخل قيمة صحيحة");
      render();
      return;
    }
    RB.data.settings[key] = n;
  } else if (key === "overtimeEnabled") {
    RB.data.settings[key] = !!value;
  }
  RB.save();
  toast("تم حفظ إعدادات الأجور");
}
VIEWS.settings = () => {
  const s = RB.data.settings || {};
  const holidayPay = Number.isFinite(Number(s.holidayPayPercent)) ? Number(s.holidayPayPercent) : 0;
  return `<div class=card><b>⚙️ الإعدادات العامة</b>
  <div class=row><button onclick="document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark'; render()">تبديل المظهر</button></div>
  </div>
  <div class=card><b>💼 سياسة الأجور والحسابات</b>
  <p class=muted>يختار صاحب العمل القواعد المناسبة. تُحفظ الإعدادات على هذا الجهاز وتُستخدم في تسجيلات العمل الجديدة.</p>
  <label class=muted>الأجر اليومي</label>
  <input type=number min=0 step=0.01 inputmode=decimal value="${Number(s.dailyRate)||0}" onchange="savePayrollSetting('dailyRate',this.value)" style="width:100%;margin:4px 0 12px">
  <label class=muted>احتساب العطلة</label>
  <select style="width:100%;margin:4px 0 12px" value="${holidayPay}" onchange="savePayrollSetting('holidayPayPercent',this.value)">
    <option value=0 ${holidayPay===0?"selected":""}>غير مدفوعة (0%)</option>
    <option value=50 ${holidayPay===50?"selected":""}>نصف أجر يوم (50%)</option>
    <option value=100 ${holidayPay===100?"selected":""}>أجر يوم كامل (100%)</option>
  </select>
  <label class=muted style="display:flex;align-items:center;gap:8px;margin:4px 0 12px"><input type=checkbox ${s.overtimeEnabled?"checked":""} onchange="savePayrollSetting('overtimeEnabled',this.checked)"> تفعيل سياسة العمل الإضافي</label>
  <label class=muted>عدد ساعات العمل العادية في اليوم</label>
  <input type=number min=1 max=24 step=0.5 value="${Number(s.normalHoursPerDay)||8}" onchange="savePayrollSetting('normalHoursPerDay',this.value)" style="width:100%;margin:4px 0 12px">
  <label class=muted>أجر ساعة العمل الإضافي</label>
  <input type=number min=0 step=0.01 value="${Number(s.otRate)||0}" onchange="savePayrollSetting('otRate',this.value)" style="width:100%;margin:4px 0 12px">
  <p class=muted>ملاحظة: سياسة الساعات الإضافية تُحفظ الآن، ويُفعّل احتسابها تلقائياً عندما يُسجّل عدد ساعات إضافية للحركة. لا تُضاف ساعات أو مبالغ إضافية من تلقاء نفسها.</p>
  <p class=muted>الدفعات تخصم من المستحق، والسلف تخصم من رصيد العامل، أما مصروفات الشركة فتظل منفصلة ولا تخصم من أجر العامل تلقائياً.</p>
  </div>`;
};

VIEWS.stats = () => `<div class=card><b>📊 الإحصاء</b><p class=muted>رسوم بيانية قريباً...</p></div>`;
VIEWS.sync = () => `<div class=card><b>🔄 المزامنة</b><p class=muted>مزامنة قريباً...</p></div>`;
VIEWS.integrations = () => `<div class=card><b>🧩 الإضافات</b><p class=muted>إضافات قريباً...</p></div>`;
VIEWS.agenda = () => `<div class=card><b>📅 المفكرة</b><p class=muted>مواعيد قريباً...</p></div>`;
VIEWS.ledger = () => `<div class=card><b>💼 العمل</b><p class=muted>حسابات قريباً...</p></div>`;

// ==================== التشغيل التلقائي ====================
window.addEventListener('DOMContentLoaded', () => {
  render();
});
