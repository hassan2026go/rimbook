/* rimbook v6 - الكود الأساسي الشامل */
const RB = (() => {
  const KEY = "rimbook.v6";
  const def = () => ({
    profile: { name: "", role: "employee", phone: "", email: "", city: "", workplace: "", jobTitle: "", birth: "", emergency: "", skills: "", photo: "", about: "" },
    settings: { theme: "dark", fs: 15, dailyRate: 50, otRate: 10, normalHoursPerDay: 8, holidayPayPercent: 0, overtimeEnabled: false, managerPhone: "", location: "موقع العمل", currency: "$", lang: "ar", enabled: {} },
    items: [], habits: [], goals: [], projects: [], workers: [], contacts: [], invoices: [], activeProject: null
  });
  let data;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    const defaults = def();
    data = Object.assign({}, defaults, saved);
    data.settings = Object.assign({}, defaults.settings, saved.settings || {});
    data.profile = Object.assign({}, defaults.profile, saved.profile || {});
    if (!Array.isArray(data.items)) data.items = [];
  } catch (e) { data = def(); }
  let lastGoodSerialized = JSON.stringify(data);
  let storageErrorShown = false;
  const restoreLastGood = () => {
    try {
      const snapshot = JSON.parse(lastGoodSerialized);
      Object.keys(data).forEach(k => delete data[k]);
      Object.assign(data, snapshot);
    } catch (e) { /* keep the in-memory object intact if recovery itself fails */ }
  };
  const reportStorageFailure = () => {
    if (storageErrorShown) return;
    storageErrorShown = true;
    if (typeof toast === "function") toast("تنبيه مهم: لم تُحفظ العملية. بقيت البيانات السابقة كما هي؛ حرّر مساحة ثم أعد المحاولة.");
    if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
      window.dispatchEvent(new CustomEvent("rimbook-storage-error"));
    }
  };
  const save = () => {
    let serialized;
    try {
      serialized = JSON.stringify(data);
      localStorage.setItem(KEY, serialized);
      lastGoodSerialized = serialized;
      storageErrorShown = false;
      return true;
    } catch (e) {
      restoreLastGood();
      reportStorageFailure();
      return false;
    }
  };
  const transact = mutator => {
    try {
      mutator(data);
      return save();
    } catch (e) {
      restoreLastGood();
      reportStorageFailure();
      return false;
    }
  };
  return {
    get data() { return data; },
    all: t => data.items.filter(i => i.type === t),
    transact,
    add(o) {
      const row = Object.assign({}, o, { id: o.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)), created: o.created || Date.now() });
      const ok = transact(d => { d.items.push(row); });
      return ok ? row : null;
    },
    patch(id, p) {
      let found = false;
      const ok = transact(d => { const i = d.items.find(x => x.id === id); if (i) { Object.assign(i, p); found = true; } });
      return ok && found;
    },
    remove(id) {
      const before = data.items.length;
      const ok = transact(d => { d.items = d.items.filter(x => x.id !== id); });
      return ok && data.items.length < before;
    },
    save,
    replace(obj) {
      return transact(d => {
        const replacement = Object.assign({}, def(), obj);
        Object.keys(d).forEach(k => delete d[k]);
        Object.assign(d, replacement);
      });
    },
    async storageStatus() {
      try {
        if (typeof navigator === "undefined" || !navigator.storage || !navigator.storage.estimate) return { supported: false };
        const estimate = await navigator.storage.estimate();
        const usage = Number(estimate.usage) || 0, quota = Number(estimate.quota) || 0;
        const ratio = quota > 0 ? usage / quota : null;
        return { supported: true, usage, quota, ratio, warning: ratio !== null && ratio >= 0.8, persistent: navigator.storage.persisted ? await navigator.storage.persisted() : null };
      } catch (e) { return { supported: false, error: true }; }
    },
    async requestPersistentStorage() {
      try {
        if (typeof navigator === "undefined" || !navigator.storage || !navigator.storage.persist) return false;
        return await navigator.storage.persist();
      } catch (e) { return false; }
    }
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
async function checkRimbookStorage() {
  const status = await RB.storageStatus();
  if (!status.supported) return toast("هذا المتصفح لا يتيح فحص مساحة التخزين بالتفصيل.");
  const used = (status.usage / 1048576).toFixed(1), total = (status.quota / 1048576).toFixed(1);
  if (status.warning) toast("تحذير: مساحة التخزين المستخدمة مرتفعة ("+used+" من "+total+" ميغابايت). صدّر نسخة احتياطية وحرّر مساحة.");
  else toast("مساحة التخزين المستخدمة تقريباً "+used+" من "+total+" ميغابايت.");
}
async function requestRimbookPersistence() {
  const ok = await RB.requestPersistentStorage();
  toast(ok ? "وافق المتصفح على طلب حماية بيانات المفكرة من الإزالة التلقائية." : "لم يمنح المتصفح التخزين الدائم. هذا لا يمنع الاستخدام، لكنه لا يضمن بقاء البيانات عند تنظيف مساحة المتصفح.");
}
function go(t){ view = t; render(); window.scrollTo(0,0); }
function normalizeSearchText(value) {
  return String(value ?? "").toLocaleLowerCase("ar")
    .normalize("NFD").replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/\u0640/g, "").replace(/\s+/g, " ").trim();
}
function searchRecordText(value, depth=0) {
  if (depth > 2 || value == null) return "";
  if (["string","number","boolean"].includes(typeof value)) return String(value);
  if (Array.isArray(value)) return value.map(v=>searchRecordText(v,depth+1)).join(" ");
  if (typeof value !== "object") return "";
  return Object.entries(value)
    .filter(([key])=>!/(^id$|created|photo|emergency|password|secret|token)/i.test(key))
    .map(([key,v])=>searchRecordText(v,depth+1)).join(" ");
}
function searchRimbook(raw) {
  const box=$("#searchResults");
  if(!box)return;
  const query=normalizeSearchText(raw);
  if(query.length<2){box.innerHTML="";box.hidden=true;return;}
  const results=[];
  const add=(kind,id,title,subtitle,record,route)=>{
    const hay=normalizeSearchText(searchRecordText(record));
    if(hay.includes(query))results.push({kind,id,title,subtitle,route});
  };
  (RB.data.projects||[]).forEach(p=>add("project",p.id,p.name||"مشروع","مشروع",p,"projects"));
  (RB.data.items||[]).forEach(x=>{
    const type=x.type||"سجل";
    const labels={task:"مهمة",event:"موعد",appointment:"موعد",note:"ملاحظة",work:"سجل عمل",voice_log:"تسجيل صوتي",reminder:"تذكير"};
    const routes={task:"tasks",event:"agenda",appointment:"agenda",reminder:"agenda",note:"notes",work:"voice",voice_log:"voice"};
    const route=routes[type]||"home";
    const title=x.title||x.name||x.ds||x.body||labels[type]||"سجل";
    const subtitle=[labels[type]||type,x.d||x.date||""].filter(Boolean).join(" · ");
    add(type,x.id,title,subtitle,x,route);
  });
  (RB.data.contacts||[]).forEach(c=>add("contact",c.id,c.name||"جهة اتصال",[c.company,c.phone].filter(Boolean).join(" · "),c,"contacts"));
  (RB.data.goals||[]).forEach(g=>add("goal",g.id,g.name||"هدف","هدف",g,"goals"));
  (RB.data.invoices||[]).forEach(inv=>add("invoice",inv.id,"فاتورة #"+(inv.number||""),[inv.client,inv.date].filter(Boolean).join(" · "),inv,"invoices"));
  const shown=results.slice(0,20);
  box.innerHTML=shown.length
    ? '<div class="search-heading">نتائج البحث ('+results.length+')</div>'+shown.map(r=>'<button type="button" class="search-hit" onclick="openSearchResult(\''+r.kind+'\',\''+r.route+'\',\''+encodeURIComponent(String(r.id||""))+'\')"><b>'+esc(r.title)+'</b><small>'+esc(r.subtitle||r.kind)+'</small></button>').join("")+(results.length>20?'<p class="muted">أظهرنا أول 20 نتيجة. أضف كلمات أدق لتضييق البحث.</p>':"")
    : '<p class="search-empty">لا توجد نتائج مطابقة. جرّب اسماً أو كلمة أخرى.</p>';
  box.hidden=false;
}
function openSearchResult(kind,route,encodedId) {
  const id=decodeURIComponent(encodedId||"");
  const box=$("#searchResults"),input=$("#quickSearch");
  if(box){box.innerHTML="";box.hidden=true;}
  if(input)input.value="";
  let record=null;
  if(kind==="project")record=(RB.data.projects||[]).find(x=>String(x.id)===id);
  else if(kind==="contact")record=(RB.data.contacts||[]).find(x=>String(x.id)===id);
  else if(kind==="invoice")record=(RB.data.invoices||[]).find(x=>String(x.id)===id);
  else if(kind==="goal")record=(RB.data.goals||[]).find(x=>String(x.id)===id);
  else if(kind==="habit")record=(RB.data.habits||[]).find(x=>String(x.id)===id);
  else record=(RB.data.items||[]).find(x=>String(x.id)===id);
  if(!record)return toast("لم نعثر على السجل؛ ربما تم تغييره أو حذفه.");
  const labels={name:"الاسم",title:"العنوان",body:"التفاصيل",d:"التاريخ",date:"التاريخ",ds:"البيان",k:"نوع الحركة",due:"المستحق",rec:"الدفعة",advance:"السلفة",expense:"المصروف",otHours:"الساعات الإضافية",normalHours:"الساعات العادية",phone:"الهاتف",email:"البريد الإلكتروني",company:"الشركة",address:"العنوان",notes:"ملاحظات",number:"رقم الفاتورة",client:"العميل",paid:"حالة الدفع",budget:"الميزانية"};
  const rows=Object.entries(record).filter(([key,value])=>!/(^id$|created|photo|emergency|password|secret|token)/i.test(key)&&value!==""&&value!=null&&["string","number","boolean"].includes(typeof value)).map(([key,value])=>'<div class="item"><span>'+esc(labels[key]||key)+'</span><b>'+esc(typeof value==="boolean"?(value?"نعم":"لا"):value)+'</b></div>').join("");
  const title=record.name||record.title||record.ds||(kind==="invoice"?"فاتورة":"تفاصيل السجل");
  const dialog=document.createElement("div");
  dialog.id="searchRecordDialog";
  dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label","تفاصيل نتيجة البحث");
  dialog.style.cssText="position:fixed;inset:0;z-index:120;background:#000a;display:flex;align-items:center;justify-content:center;padding:16px";
  dialog.innerHTML='<div class="card" style="width:min(100%,420px);max-height:80vh;overflow:auto;margin:0;background:var(--card)"><div class="row" style="justify-content:space-between"><b>'+esc(title)+'</b><button type="button" onclick="document.getElementById(\'searchRecordDialog\')?.remove()">إغلاق ✕</button></div>'+rows+'<div class="row" style="margin-top:12px"><button class="p" type="button" onclick="document.getElementById(\'searchRecordDialog\')?.remove();openSearchSection(\''+route+'\')">فتح القسم</button></div></div>';
  document.body.append(dialog);
}
function openSearchSection(route) {
  if(route==="contacts"&&typeof contactsScreen==="function")VIEWS.contacts=contactsScreen;
  if(VIEWS[route])go(route);
  else go("home");
}
function searchRimbookKey(event) {
  if(event.key==="Escape"){const box=$("#searchResults");if(box){box.hidden=true;box.innerHTML="";}event.target.value="";}
  if(event.key==="Enter"){const first=$("#searchResults .search-hit");if(first)first.click();}
}
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
  const ok = RB.transact(d => { d.projects.push({ id: Date.now().toString(36), name: n, color: "#22d3ee", budget: 0 }); });
  if (!ok) return;
  render(); toast("✅ أضيف المشروع");
}
function setActiveProject(pid){ if (!RB.transact(d => { d.activeProject = pid || null; })) return; render(); }
function delProject(pid){
  const project=RB.data.projects.find(p=>String(p.id)===String(pid));
  if(!project)return;
  if(!confirm("أرشفة المشروع؟ ستبقى جميع المهام واليوميات والحسابات والفواتير والمرفقات محفوظة دون حذف.")) return;
  if (!RB.transact(d => {
    const row=d.projects.find(p=>String(p.id)===String(pid));
    if(row){row.status="archived";row.archivedAt=Date.now();}
  })) return;
  render();toast("تمت أرشفة المشروع مع الاحتفاظ بجميع سجلاته");
}

/* ===== الحوسبة الصوتية ===== */
function voiceCapture(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast("استخدم Chrome أو Safari.");
  const r = new SR();
  r.lang = "ar-SA"; toast("🎤 تحدث الآن...");
  r.onresult = e => {
    const text = e.results[0][0].transcript;
    if (!RB.add({ type:"note", d:iso(new Date()), title: "", body: text })) return;
    render(); toast("✅ تم الحفظ: " + text);
  };
  r.start();
}

/* ===== الشاشات ===== */
const VIEWS = {};

VIEWS.home = () => {
  const tasks = RB.all("task"), open = tasks.filter(x=>!x.done);
  const p=RB.data.profile||{};
  const avatar=p.photo?'<img src="'+esc(p.photo)+'" alt="الصورة الشخصية">':'<span aria-hidden="true">👤</span>';
  const name=p.name?esc(p.name):"ملفي الشخصي";
  return `<div class="card home-welcome"><button type="button" class="home-profile" onclick="go('profile')" aria-label="فتح الملف الشخصي">${avatar}<span><b>${name}</b><small>${p.name?"الملف الشخصي والإعدادات الشخصية":"أضف اسمك وصورتك وبياناتك"}</small></span><strong>›</strong></button><h2>أهلاً بك ${p.name?esc(p.name):""} 👋</h2><p class=muted>${new Date().toLocaleDateString("ar")}</p><div class="row"><button type="button" onclick="go('profile')">👤 ملفي الشخصي</button><button type="button" onclick="go('settings')">⚙️ إعدادات المفكرة</button></div></div>
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
function addTask(){ const v = $("#tk-t").value; if(v && RB.add({type:"task", title:v, done:false})) render(); }
function delItem(id){ RB.remove(id); render(); }

function normalizeProfileDigits(value) {
  return String(value || "").replace(/[٠-٩۰-۹]/g, ch => {
    const a = "٠١٢٣٤٥٦٧٨٩", p = "۰۱۲۳۴۵۶۷۸۹";
    const i = a.indexOf(ch);
    return String(i >= 0 ? i : p.indexOf(ch));
  });
}
function saveProfileField(key, value) {
  const allowed = ["name","role","workerId","phone","email","city","workplace","jobTitle","birth","emergency","skills","about"];
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
  if (key === "workerId" && v && !(RB.data.workers || []).some(worker => String(worker.id) === v && worker.active !== false)) {
    toast("ملف العامل المحدد غير موجود أو غير نشط"); render(); return;
  }
  RB.data.profile[key] = key === "phone" ? normalizeProfileDigits(v) : v;
  if (!RB.save()) { toast("تعذر الحفظ: مساحة التخزين في الجهاز ممتلئة"); return; }
  if (key === "role" || key === "workerId") render();
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
  if (!RB.save()) return;
  toast("تم حفظ إعدادات الأجور");
}
VIEWS.settings = () => {
  const s = RB.data.settings || {};
  const holidayPay = Number.isFinite(Number(s.holidayPayPercent)) ? Number(s.holidayPayPercent) : 0;
  return `<div class=card><b>⚙️ الإعدادات العامة</b>
  <div class=row><button onclick="document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark'; render()">تبديل المظهر</button></div>
  </div>
  <div class=card><b>🛡️ حماية بيانات المفكرة</b>
  <p class=muted>الحفظ محلي على هذا الجهاز. افحص المساحة دورياً، واحتفظ بنسخة احتياطية خارج الجهاز. طلب التخزين الدائم يعتمد على موافقة المتصفح ولا يغني عن النسخ الاحتياطي.</p>
  <div class=row><button onclick="checkRimbookStorage()">فحص مساحة التخزين</button><button onclick="requestRimbookPersistence()">طلب حماية التخزين</button></div>
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
