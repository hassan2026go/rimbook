/* Rimbook Pro layer — لوحة الإدارة والبحث الذكي */
(function(){
"use strict";
const $ = id => document.getElementById(id);
const D = RB.data;
const today = () => iso(new Date());
const safe = v => esc(v == null ? "" : String(v));
const money = n => (Number(n)||0).toLocaleString("ar",{minimumFractionDigits:2,maximumFractionDigits:2})+" "+(D.settings.currency||"");
const projectName = id => (D.projects||[]).find(p=>p.id===id)?.name || "عام";
const tasks = () => RB.all("task");
const events = () => RB.all("event");
const isLate = t => !t.done && t.due && t.due < today();
const taskProgress = id => {
 const a=tasks().filter(t=>t.project===id), done=a.filter(t=>t.done).length;
 return {total:a.length,done,percent:a.length?Math.round(done*100/a.length):0};
};
const pill=(txt,kind="")=>'<span class="tag '+kind+'">'+txt+'</span>';
window.proTaskFilter="open";
window.proAddTask=function(){
 const title=$("ptitle")?.value.trim(); if(!title)return toast("اكتب عنوان المهمة");
 const projectSelect=$("pproject");
 const project=projectSelect?(projectSelect.value||null):(D.activeProject||null);
 const row=RB.add({type:"task",title,due:$("pdue")?.value||"",priority:$("ppriority")?.value||"normal",project,done:false,created:Date.now()});
 if(!row)return;
 render();toast("أضيفت المهمة");
};
window.proSetTaskFilter=function(f){window.proTaskFilter=f;render();};
window.proToggleTask=function(id,done){RB.patch(id,{done});render();};
window.proAddProject=function(){
 const name=$("ppname")?.value.trim();if(!name)return toast("اكتب اسم المشروع");
 const p={id:"p"+Date.now().toString(36),name,color:"#22d3ee",budget:Number($("ppbudget")?.value)||0,due:$("ppdue")?.value||"",status:"active",createdAt:Date.now()};
 if(!RB.transact(data=>{data.projects.push(p);data.activeProject=p.id;}))return;
 render();toast("تم إنشاء المشروع");
};
window.proFilterTaskRows=function(){
 const q=($("proTaskSearch")?.value||"").trim().toLocaleLowerCase();
 document.querySelectorAll("[data-pro-task]").forEach(el=>{
  const match=!q||(el.dataset.search||"").includes(q);
  const f=window.proTaskFilter;
  const status=f==="all"|| (f==="open"&&!el.dataset.done)||(f==="done"&&el.dataset.done==="1")||(f==="late"&&el.dataset.late==="1")||(f==="today"&&el.dataset.due===today());
  el.hidden=!(match&&status);
 });
};
function taskRow(t){
 const late=isLate(t),priority={high:["عالية","bad"],normal:["متوسطة",""],low:["منخفضة",""]}[t.priority]||["عادية",""];
 const search=(t.title+" "+projectName(t.project)).toLocaleLowerCase();
 return '<div class="item" data-pro-task data-search="'+safe(search).toLocaleLowerCase()+'" data-done="'+(t.done?"1":"0")+'" data-late="'+(late?"1":"0")+'" data-due="'+safe(t.due||"")+'"><input type="checkbox" '+(t.done?"checked":"")+' onchange="proToggleTask(\''+t.id+'\',this.checked)"><span style="min-width:0"><b>'+safe(t.title)+'</b><br><small class="muted">'+(t.due?safe(t.due):"بلا موعد")+' · '+safe(projectName(t.project))+' · '+pill(priority[0],priority[1])+(late?" "+pill("متأخرة","bad"):"")+'</small></span><button onclick="editTask(\''+t.id+'\')" aria-label="تعديل">✏️</button><button class="danger" onclick="delItem(\''+t.id+'\')" aria-label="حذف">🗑</button></div>';
}
VIEWS.home=function(){
 const profile=D.profile||{};
 const hasPhoto=/^data:image\/(jpeg|png|webp);base64,/i.test(profile.photo||"");
 const avatar=hasPhoto
  ? '<img src="'+safe(profile.photo)+'" alt="الصورة الشخصية">'
  : '<span aria-hidden="true">👤</span>';
 const profileCard='<button type="button" class="home-profile" onclick="go(\'profile\')" aria-label="فتح الملف الشخصي">'+avatar+
  '<span><b>'+safe(profile.name||"ملفي الشخصي")+'</b><small>'+(profile.name?"عرض وتعديل بياناتك الشخصية":"أضف اسمك وصورتك وبياناتك")+'</small></span><strong>›</strong></button>';
 const all=tasks(),open=all.filter(t=>!t.done),late=open.filter(isLate),due=open.filter(t=>t.due===today()),ev=events().filter(e=>e.d>=today()).sort((a,b)=>(a.d+(a.t||"")).localeCompare(b.d+(b.t||""))).slice(0,4);
 const work=RB.all("work"),dueMoney=work.reduce((s,x)=>s+(+x.due||0),0),received=work.reduce((s,x)=>s+(+x.rec||0),0);
 const unpaid=(D.invoices||[]).filter(i=>!i.paid).length;
 const activeProjects=(D.projects||[]).filter(p=>p.status!=="done").length;
 const projectCards=(D.projects||[]).slice(0,4).map(p=>{const pr=taskProgress(p.id);return '<div class="item"><span><b>'+safe(p.name)+'</b><div class="progress"><div style="width:'+pr.percent+'%"></div></div><small class="muted">'+pr.done+'/'+pr.total+' مهام مكتملة</small></span>'+pill(pr.percent+"%")+'</div>';}).join("");
 return '<div class="card">'+profileCard+'<div class="row" style="justify-content:space-between"><span><b style="font-size:18px">لوحة الإدارة</b><br><small class="muted">'+new Date().toLocaleDateString("ar",{weekday:"long",year:"numeric",month:"long",day:"numeric"})+'</small></span>'+pill("مباشر","ok")+'</div><h2 style="margin:10px 0 0">مرحباً '+safe(profile.name||"بك")+' 👋</h2><p class="muted">هذه صورة سريعة لما يحتاج انتباهك اليوم.</p><div class="row"><button class="p" onclick="go(\'tasks\')">＋ مهمة</button><button onclick="go(\'agenda\')">＋ موعد</button><button onclick="go(\'projects\')">＋ مشروع</button><button onclick="go(\'notes\')">＋ ملاحظة</button></div></div>'+
 '<div class="grid3"><div class="card"><small class="muted">مهام مفتوحة</small><h3>'+open.length+'</h3></div><div class="card"><small class="muted">متأخرة</small><h3 class="hi">'+late.length+'</h3></div><div class="card"><small class="muted">مستحقة اليوم</small><h3>'+due.length+'</h3></div></div>'+
 '<div class="grid2" style="margin-top:8px"><div class="card"><small class="muted">المشاريع النشطة</small><h3>'+activeProjects+'</h3></div><div class="card"><small class="muted">فواتير غير مدفوعة</small><h3>'+unpaid+'</h3></div><div class="card"><small class="muted">المستحق المالي</small><h3>'+money(dueMoney)+'</h3></div><div class="card"><small class="muted">المقبوض</small><h3 class="ok">'+money(received)+'</h3></div></div>'+
 '<div class="card"><b>⚠️ ما يحتاج انتباهك</b>'+(late.length?'<p class="hi">لديك '+late.length+' مهمة متأخرة.</p><button onclick="proSetTaskFilter(\'late\');go(\'tasks\')">عرض المتأخرات</button>': '<p class="ok">لا توجد مهام متأخرة 🎉</p>')+(due.length?'<p>لديك '+due.length+' مهام مستحقة اليوم.</p>':"")+(unpaid?'<p>تابع '+unpaid+' فاتورة لم تُسدّد بعد.</p><button onclick="go(\'invoices\')">متابعة الفواتير</button>':"")+'</div>'+
 '<div class="card"><b>📁 تقدم المشاريع</b>'+ (projectCards||'<p class="muted">أنشئ مشروعك الأول لبدء المتابعة.</p>')+'<button onclick="go(\'projects\')">كل المشاريع</button></div>'+
 '<div class="card"><b>📅 المواعيد القادمة</b>'+(ev.map(e=>'<div class="item"><span><b>'+safe(e.title)+'</b><br><small class="muted">'+safe(e.d)+' '+safe(e.t||"")+'</small></span></div>').join("")||'<p class="muted">لا توجد مواعيد قادمة مسجلة.</p>')+'<button onclick="go(\'agenda\')">فتح المفكرة</button></div>'+
 (typeof suggestionsCard==="function"?suggestionsCard():"");
};
VIEWS.tasks=function(){
 const list=tasks().slice().sort((a,b)=>(a.done-b.done)||(String(a.due||"9999").localeCompare(String(b.due||"9999"))));
 const filters=[["open","مفتوحة"],["today","اليوم"],["late","متأخرة"],["done","منجزة"],["all","الكل"]];
 return '<div class="card"><b>إدارة المهام</b><div style="display:grid;gap:8px;margin-top:8px"><input id="ptitle" placeholder="عنوان المهمة..." maxlength="180"><div class="grid2"><input id="pdue" type="date" value="'+today()+'"><select id="ppriority"><option value="normal">أولوية متوسطة</option><option value="high">أولوية عالية</option><option value="low">أولوية منخفضة</option></select></div><select id="pproject"><option value="">دون مشروع</option>'+(D.projects||[]).map(p=>'<option value="'+safe(p.id)+'" '+(D.activeProject===p.id?"selected":"")+'>'+safe(p.name)+'</option>').join("")+'</select><button class="p" onclick="proAddTask()">حفظ المهمة</button></div></div>'+
 '<div class="card"><div class="row" style="justify-content:space-between"><b>قائمة المهام ('+list.length+')</b><input id="proTaskSearch" oninput="proFilterTaskRows()" placeholder="ابحث في المهام..." style="width:48%"></div><div class="strip" style="margin:10px 0">'+filters.map(f=>'<button class="'+(window.proTaskFilter===f[0]?"on":"")+'" onclick="proSetTaskFilter(\''+f[0]+'\')">'+f[1]+'</button>').join("")+'</div>'+(list.map(taskRow).join("")||'<p class="muted">لا توجد مهام بعد.</p>')+'</div>';
};
VIEWS.projects=function(){
 const cards=(D.projects||[]).map(p=>{const pr=taskProgress(p.id),w=RB.all("work").filter(x=>x.project===p.id),due=w.reduce((s,x)=>s+(+x.due||0),0),paid=w.reduce((s,x)=>s+(+x.rec||0),0);return '<div class="card"><div class="row" style="justify-content:space-between"><b>'+safe(p.name)+'</b>'+pill(p.status==="done"?"مكتمل":"نشط",p.status==="done"?"ok":"")+'</div><div class="progress"><div style="width:'+pr.percent+'%"></div></div><small class="muted">'+pr.done+' من '+pr.total+' مهام مكتملة'+(p.due?" · الموعد "+safe(p.due):"")+'</small><div class="grid3" style="margin-top:8px"><div><small class="muted">الميزانية</small><b>'+money(p.budget)+'</b></div><div><small class="muted">المستحق</small><b>'+money(due)+'</b></div><div><small class="muted">المقبوض</small><b>'+money(paid)+'</b></div></div><div class="row" style="margin-top:8px"><button class="p" onclick="setActiveProject(\''+p.id+'\')">فتح المشروع</button><button onclick="editProject(\''+p.id+'\')">تعديل الاسم</button><button onclick="proProjectStatus(\''+p.id+'\')">'+(p.status==="done"?"إعادة فتح":"إنهاء")+'</button><button class="danger" onclick="delProject(\''+p.id+'\')">حذف</button></div></div>';}).join("");
 return '<div class="card"><b>＋ إنشاء مشروع</b><input id="ppname" placeholder="اسم المشروع" style="width:100%;margin:6px 0"><div class="grid2"><input id="ppbudget" type="number" min="0" placeholder="الميزانية"><input id="ppdue" type="date" aria-label="تاريخ التسليم"></div><button class="p" style="margin-top:8px" onclick="proAddProject()">إنشاء المشروع</button></div>'+ (cards||'<div class="card muted">لا توجد مشاريع. أنشئ أول مشروع لتنظيم عملك.</div>');
};
window.proProjectStatus=function(id){const p=D.projects.find(x=>x.id===id);if(!p)return;const next=p.status==="done"?"active":"done";if(!RB.transact(data=>{const row=data.projects.find(x=>x.id===id);if(row)row.status=next;}))return;render();};
VIEWS.agenda=function(){
 const upcoming=events().slice().sort((a,b)=>(String(a.d||"").localeCompare(String(b.d||""))||String(a.t||"").localeCompare(String(b.t||""))));
 return '<div class="card"><b>＋ تسجيل موعد</b><input id="etitle" placeholder="عنوان الموعد" style="width:100%;margin:6px 0"><div class="grid2"><input id="edate" type="date" value="'+today()+'"><input id="etime" type="time"></div><select id="projectId" style="width:100%;margin:8px 0"><option value="">موعد عام</option>'+(D.projects||[]).map(p=>'<option value="'+safe(p.id)+'">'+safe(p.name)+'</option>').join("")+'</select><button class="p" onclick="addEvent()">حفظ الموعد</button></div><div class="card"><b>المواعيد المسجلة ('+upcoming.length+')</b>'+(upcoming.map(e=>'<div class="item"><span><b>'+safe(e.title)+'</b><br><small class="muted">'+safe(e.d)+' '+safe(e.t||"")+' · '+safe(projectName(e.project))+'</small></span><button class="danger" onclick="delItem(\''+e.id+'\')">حذف</button></div>').join("")||'<p class="muted">لا توجد مواعيد بعد.</p>')+'</div>';
};
VIEWS.stats=function(){
 const all=tasks(),done=all.filter(t=>t.done).length,late=all.filter(isLate).length,work=RB.all("work"),due=work.reduce((s,x)=>s+(+x.due||0),0),paid=work.reduce((s,x)=>s+(+x.rec||0),0);
 return '<div class="grid2"><div class="card">إجمالي المهام<h2>'+all.length+'</h2></div><div class="card">نسبة الإنجاز<h2>'+(all.length?Math.round(done*100/all.length):0)+'%</h2></div><div class="card">المهام المتأخرة<h2 class="hi">'+late+'</h2></div><div class="card">المشاريع<h2>'+(D.projects||[]).length+'</h2></div></div><div class="card"><b>ملخص مالي</b><p>المستحق: <b>'+money(due)+'</b></p><p>المقبوض: <b class="ok">'+money(paid)+'</b></p><p>المتبقي: <b class="hi">'+money(due-paid)+'</b></p></div><div class="card"><b>إنجاز المهام خلال الأسبوع</b><canvas id="chartTasks" width="400" height="180"></canvas></div><div class="card"><b>المشاريع</b><canvas id="chartProjects" width="400" height="200"></canvas></div><div class="card"><b>المقارنة الشهرية</b><canvas id="chartMonthly" width="400" height="180"></canvas>'+(typeof monthlyCompareTable==="function"?monthlyCompareTable():"")+'</div>';
};
// بحث موحد سريع في بيانات الجهاز
function setupSearch(){
 const hdr=document.querySelector("header"),holder=hdr?.querySelector(".hdr");
 if(!holder||$("proSearch"))return;
 const input=document.createElement("input");input.id="proSearch";input.type="search";input.placeholder="بحث سريع…";input.setAttribute("aria-label","بحث في Rimbook");input.style.cssText="width:112px;min-width:70px;padding:7px;font-size:12px";
 const panel=document.createElement("div");panel.id="proSearchResults";panel.hidden=true;panel.style.cssText="position:fixed;z-index:60;top:58px;left:8px;right:8px;max-height:55vh;overflow:auto;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:8px;box-shadow:0 8px 30px #0005";
 holder.insertBefore(input,holder.firstChild);document.body.appendChild(panel);
 input.addEventListener("input",()=>{
  const q=input.value.trim().toLocaleLowerCase();if(q.length<2){panel.hidden=true;return;}
  const results=[];
  (D.projects||[]).forEach(x=>{if(x.name?.toLocaleLowerCase().includes(q))results.push({title:x.name,sub:"مشروع",view:"projects"});});
  RB.data.items.forEach(x=>{const str=[x.title,x.body,x.ds,x.d].join(" ").toLocaleLowerCase();if(str.includes(q))results.push({title:x.title||x.ds||x.body||"عنصر",sub:({task:"مهمة",event:"موعد",note:"ملاحظة",work:"حركة مالية"}[x.type]||"سجل"),view:({task:"tasks",event:"agenda",note:"notes",work:"ledger"}[x.type]||"home")});});
  (D.contacts||[]).forEach(x=>{if([x.name,x.phone,x.email,x.company].join(" ").toLocaleLowerCase().includes(q))results.push({title:x.name,sub:"جهة اتصال",view:"contacts"});});
  panel.innerHTML=results.slice(0,12).map((x,i)=>'<button data-search-index="'+i+'" style="display:flex;width:100%;justify-content:space-between;margin:3px 0;text-align:right"><b>'+safe(x.title).slice(0,90)+'</b><small class="muted">'+safe(x.sub)+'</small></button>').join("")||(q.length>=2?'<p class="muted">لا توجد نتائج مطابقة.</p>':"");
  panel.querySelectorAll("button[data-search-index]").forEach((b,i)=>b.addEventListener("click",()=>{panel.hidden=true;input.value="";go(results[i].view);}));
  panel.hidden=false;
 });
 document.addEventListener("click",e=>{if(!panel.contains(e.target)&&e.target!==input)panel.hidden=true;});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setupSearch);else setupSearch();
const style=document.createElement("style");style.textContent="@media(max-width:380px){#proSearch{width:82px!important}}[data-pro-task][hidden]{display:none!important}";document.head.appendChild(style);
render();
})();
