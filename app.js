/* rimbook v6 - الكود الأساسي الشامل */
const RB = (() => {
  const KEY = "rimbook.v6";
  const def = () => ({
    profile: { name: "", role: "employee", phone: "", email: "", city: "", workplace: "", jobTitle: "", birth: "", emergency: "", skills: "", photo: "", about: "" },
    settings: { theme: "dark", fs: 15, dailyRate: 50, otRate: 10, normalHoursPerDay: 8, holidayPayPercent: 0, overtimeEnabled: false, managerPhone: "", location: "موقع العمل", currency: "$", lang: "ar", enabled: {} },
    items: [], habits: [], goals: [], projects: [], contacts: [], invoices: [], activeProject: null
  });
  let data;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    const defaults = def();
    data = Object.assign({}, defaults, saved);
    data.settings = Object.assign({}, defaults.settings, saved.settings || {});
    data.profile = Object.assign({}, defaults.profile, saved.profile || {});
  } catch (e) { data = def(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };
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

function normalizeProfileDigits(value) {
  return String(value || "").replace(/[٠-٩۰-۹]/g, ch => {
    const a = "٠١٢٣٤٥٦٧٨٩", p = "۰۱۲۳۴۵۶۷۸۹";
    const i = a.indexOf(ch);
    return String(i >= 0 ? i : p.indexOf(ch));
  });
}
function saveProfileField(key, value) {
  const allowed = ["name","role","phone","email","city","workplace","jobTitle","birth","emergency","skills","about"];
  if (!allowed.includes(key)) return;
  const v = String(value ?? "").trim();
  if (key === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
    toast("صيغة البريد الإلكتروني غير صحيحة"); render(); return;
  }
  if (key === "phone" && v) {
    const digits = normalizeProfileDigits(v).replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      toast("تحقق من رقم الهاتف (7 إلى 15 رقماً)"); render(); return;
    }
  }
  if (key === "role" && !["employee","worker"].includes(v)) return;
  RB.data.profile[key] = key === "phone" ? normalizeProfileDigits(v) : v;
  if (!RB.save()) { toast("تعذر الحفظ: مساحة التخزين في الجهاز ممتلئة"); return; }
  if (key === "role") render();
  if (key === "name") { const heading = $("#profile-display-name"); if (heading) heading.textContent = RB.data.profile.name || "الملف الشخصي"; }
  toast("تم حفظ بيانات الملف الشخصي");
}
function removeProfilePhoto() {
  if (!RB.data.profile.photo) return;
  if (!confirm("هل تريد حذف الصورة الشخصية؟")) return;
  const previous = RB.data.profile.photo;
  RB.data.profile.photo = "";
  if (!RB.save()) { RB.data.profile.photo = previous; toast("تعذر حفظ التغيير"); return; }
  render(); toast("تم حذف الصورة الشخصية");
}
function saveProfilePhoto(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    toast("اختر صورة JPG أو PNG أو WebP فقط"); input.value = ""; return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast("حجم الصورة الأصلية يجب ألا يتجاوز 5 ميغابايت"); input.value = ""; return;
  }
  const reader = new FileReader();
  reader.onerror = () => toast("تعذر قراءة الصورة");
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => toast("الصورة غير صالحة");
    image.onload = () => {
      const max = 512, scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return toast("تعذر تجهيز الصورة على هذا الجهاز");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
      if (dataUrl.length > 420000) return toast("الصورة الناتجة كبيرة؛ اختر صورة أبسط");
      const previous = RB.data.profile.photo;
      RB.data.profile.photo = dataUrl;
      if (!RB.save()) {
        RB.data.profile.photo = previous;
        toast("تعذر حفظ الصورة: مساحة التخزين غير كافية");
        return;
      }
      render(); toast("تم حفظ الصورة الشخصية على هذا الجهاز");
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}
VIEWS.profile = () => {
  const p = RB.data.profile || {};
  const avatar = p.photo
    ? '<img class="avatar" src="' + esc(p.photo) + '" alt="الصورة الشخصية" style="object-fit:cover">'
    : '<div class="avatar" aria-label="لا توجد صورة">👤</div>';
  const field = (label, key, type, placeholder) =>
    '<label class="muted" for="profile-' + key + '">' + label + '</label>' +
    '<input id="profile-' + key + '" type="' + (type || "text") + '" value="' + esc(p[key] || "") + '" placeholder="' + (placeholder || "") +
    '" onchange="saveProfileField(\'' + key + '\',this.value)" style="width:100%;margin:4px 0 12px">';
  return '<div class="card" style="text-align:center">' + avatar +
    '<h2 id="profile-display-name" style="margin:8px 0">' + esc(p.name || "الملف الشخصي") + '</h2>' +
    '<p class="muted">بياناتك محفوظة على هذا الجهاز، ولا تُرسل إلى أي خدمة تلقائياً.</p>' +
    '<label class="p" for="profile-photo" style="display:inline-block;padding:8px 14px;border-radius:10px;cursor:pointer;color:#fff;background:var(--p)">📷 اختيار صورة</label>' +
    '<input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onchange="saveProfilePhoto(this)" style="display:none">' +
    (p.photo ? '<button type="button" class="danger" onclick="removeProfilePhoto()">حذف الصورة</button>' : '') +
    '</div><div class="card"><b>👤 المعلومات الأساسية</b>' +
    field("الاسم الكامل","name","text","اكتب اسمك الكامل") +
    '<label class="muted" for="profile-role">الصفة</label><select id="profile-role" onchange="saveProfileField(\'role\',this.value)" style="width:100%;margin:4px 0 12px">' +
    '<option value="employee" ' + (p.role==="employee"?"selected":"") + '>موظف</option>' +
    '<option value="worker" ' + (p.role==="worker"?"selected":"") + '>عامل</option></select>' +
    field("رقم الهاتف","phone","tel","مع رمز الدولة إن أمكن") +
    field("البريد الإلكتروني","email","email","example@email.com") +
    '<p class="muted">إضافة البريد هنا للتواصل والتعريف فقط؛ لا تعني توثيق ملكيته أو ربط حساب Drive.</p>' +
    '</div><div class="card"><b>🏢 العمل والعنوان</b>' +
    field("المدينة أو العنوان","city","text","المدينة / المنطقة") +
    field("جهة العمل أو الشركة","workplace","text","اسم الشركة أو مكان العمل") +
    field("المسمى الوظيفي","jobTitle","text","مثلاً: محاسب، فني، عامل") +
    field("تاريخ الميلاد (اختياري)","birth","date","") +
    '<label class="muted" for="profile-skills">المهارات</label><textarea id="profile-skills" rows="2" style="width:100%;margin:4px 0 12px" onchange="saveProfileField(\'skills\',this.value)">' + esc(p.skills || "") + '</textarea>' +
    '</div><div class="card"><b>📝 نبذة شخصية</b><textarea rows="3" placeholder="اكتب نبذة مختصرة عنك" style="width:100%;margin-top:6px" onchange="saveProfileField(\'about\',this.value)">' + esc(p.about || "") + '</textarea></div>' +
    '<div class="card"><b>🔒 معلومات طوارئ (اختيارية وخاصة)</b><p class="muted">لا تظهر هذه المعلومات في التقارير العامة أو المشاركات.</p><textarea rows="2" placeholder="اسم شخص للتواصل ورقم هاتفه عند الضرورة" style="width:100%;margin-top:6px" onchange="saveProfileField(\'emergency\',this.value)">' + esc(p.emergency || "") + '</textarea></div>';
};

function savePayrollSetting(key, value) {
  if (["dailyRate","otRate","normalHoursPerDay","holidayPayPercent"].includes(key)) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || (key === "holidayPayPercent" && n > 100) || (key === "normalHoursPerDay" && (n === 0 || n > 24))) {
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
