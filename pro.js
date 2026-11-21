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
 const row=RB.add({type:"task",title,due:$("pdue")?.value||"",priority:$("ppriority")?.value||"normal",project,workerId:$("#ptworker")?.value||null,done:false,created:Date.now()});
 if(!row)return;
 render();toast("أضيفت المهمة");
};
window.proSetTaskFilter=function(f){window.proTaskFilter=f;render();};
window.proToggleTask=function(id,done){RB.patch(id,{done});render();};
window.proAddProject=function(){
 const name=$("ppname")?.value.trim();if(!name)return toast("اكتب اسم المشروع");
 const client=$("ppclient")?.value.trim()||"";const location=$("pplocation")?.value.trim()||"";const description=$("ppdescription")?.value.trim()||"";const startDate=$("ppstart")?.value||today();
 const p={id:"p"+Date.now().toString(36),name,color:"#22d3ee",client,location,description,startDate,budget:Number($("ppbudget")?.value)||0,due:$("ppdue")?.value||"",status:"active",createdAt:Date.now()};
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
 return '<div class="item" data-pro-task data-search="'+safe(search).toLocaleLowerCase()+'" data-done="'+(t.done?"1":"0")+'" data-late="'+(late?"1":"0")+'" data-due="'+safe(t.due||"")+'"><input type="checkbox" '+(t.done?"checked":"")+' onchange="proToggleTask(\''+t.id+'\',this.checked)"><span style="min-width:0"><b>'+safe(t.title)+'</b><br><small class="muted">'+(t.due?safe(t.due):"بلا موعد")+' · '+safe(projectName(t.project))+(t.workerId?" · "+safe((D.workers||[]).find(w=>String(w.id)===String(t.workerId))?.name||"عامل"):"")+' · '+pill(priority[0],priority[1])+(late?" "+pill("متأخرة","bad"):"")+'</small></span><button onclick="editTask(\''+t.id+'\')" aria-label="تعديل">✏️</button><button class="danger" onclick="delItem(\''+t.id+'\')" aria-label="حذف">🗑</button></div>';
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
 const activeProjects=(D.projects||[]).filter(p=>p.status!=="done"&&p.status!=="archived").length;
 const activeWorkers=(D.workers||[]).filter(w=>w.active!==false);
 const payrollRows=work.filter(x=>x.workerId);
 const payrollDue=payrollRows.reduce((s,x)=>s+(Number(x.workerDue)||0),0);
 const payrollPaid=payrollRows.reduce((s,x)=>s+(Number(x.workerPaid)||0),0);
 const payrollAdvances=payrollRows.reduce((s,x)=>s+(Number(x.workerAdvance)||0),0);
 const payrollBalance=payrollDue-payrollPaid-payrollAdvances;
 const projectCards=(D.projects||[]).slice(0,4).map(p=>{const pr=taskProgress(p.id);return '<div class="item"><span><b>'+safe(p.name)+'</b><div class="progress"><div style="width:'+pr.percent+'%"></div></div><small class="muted">'+pr.done+'/'+pr.total+' مهام مكتملة</small></span>'+pill(pr.percent+"%")+'</div>';}).join("");
 if(profile.role==="worker"){
  const worker= (D.workers||[]).find(w=>String(w.id)===String(profile.workerId||""));
  if(!worker)return '<div class="card">'+profileCard+'<h2>مرحباً '+safe(profile.name||"بك")+'</h2><p class="muted">اربط ملف العامل الخاص بك من صفحة الملف الشخصي حتى تظهر يومياتك ومستحقاتك فقط.</p><button class="p" onclick="go(\\'profile\\')">ربط ملف العامل</button></div>';
  const workerMonth=today().slice(0,7),rows=work.filter(x=>String(x.workerId||"")===String(worker.id)&&(x.d||"").startsWith(workerMonth));
  const worked=rows.filter(x=>x.k==="work"&&!x.isReversal&&!x.reversedBy).length;
  const receivedNow=rows.reduce((sum,x)=>sum+(Number(x.workerPaid)||0),0);
  const dueNow=rows.reduce((sum,x)=>sum+(Number(x.workerDue)||0),0);
  const advancesNow=rows.reduce((sum,x)=>sum+(Number(x.workerAdvance)||0),0);
  const balance=dueNow-receivedNow-advancesNow;
  return '<div class="card">'+profileCard+'<h2>أهلاً بك '+safe(profile.name||worker.name)+' 👋</h2><p class="muted">'+safe(worker.jobTitle||"العامل")+' · ملف العمل: '+safe(worker.name)+'</p><div class="grid2 worker-actions"><button class="card" type="button" onclick="voiceLedgerQuick(\\'work\\')" style="min-height:92px;font-size:16px">🧱<br><b>تسجيل يوم عمل</b></button><button class="card" type="button" onclick="voiceLedgerQuick(\\'holiday\\')" style="min-height:92px;font-size:16px">🌴<br><b>تسجيل عطلة</b></button><button class="card" type="button" onclick="voiceLedgerQuick(\\'payment\\')" style="min-height:92px;font-size:16px">💵<br><b>تسجيل دفعة مستلمة</b></button><button class="card" type="button" onclick="voiceLedgerQuick(\\'advance\\')" style="min-height:92px;font-size:16px">🤝<br><b>تسجيل سلفة</b></button><button class="card" type="button" onclick="voiceLedgerStart()" style="min-height:92px;font-size:16px">🎤<br><b>التسجيل بالصوت</b></button></div><button class="p" type="button" style="width:100%;min-height:48px;margin-top:10px" onclick="go(\\'voice\\')">📅 مراجعة يومياتي وحسابي</button></div>'+
  '<div class="grid2"><div class="card"><small class="muted">أيام العمل هذا الشهر</small><h3>'+worked+'</h3></div><div class="card"><small class="muted">المستحق</small><h3>'+money(dueNow)+'</h3></div><div class="card"><small class="muted">الدفعات المستلمة</small><h3>'+money(receivedNow)+'</h3></div><div class="card"><small class="muted">السلف</small><h3>'+money(advancesNow)+'</h3></div><div class="card"><small class="muted">المتبقي لك</small><h3>'+money(balance)+'</h3></div></div>'+
  '<div class="card"><b>سجل عملك الشخصي</b><p class="muted">تعرض هذه الصفحة الحركات المرتبطة بملفك فقط. راجع كل تسجيل صوتي قبل اعتماده.</p><button type="button" onclick="go(\\'profile\\')">👤 ملفي الشخصي</button></div>';
 }
 return '<div class="card">'+profileCard+'<div class="row" style="justify-content:space-between"><span><b style="font-size:18px">لوحة الإدارة</b><br><small class="muted">'+new Date().toLocaleDateString("ar",{weekday:"long",year:"numeric",month:"long",day:"numeric"})+'</small></span>'+pill("مباشر","ok")+'</div><h2 style="margin:10px 0 0">مرحباً '+safe(profile.name||"بك")+' 👋</h2><p class="muted">هذه صورة سريعة لما يحتاج انتباهك اليوم.</p><div class="row"><button class="p" onclick="go(\'tasks\')">＋ مهمة</button><button onclick="go(\'agenda\')">＋ موعد</button><button onclick="go(\'projects\')">＋ مشروع</button><button onclick="go(\'notes\')">＋ ملاحظة</button></div></div>'+
 '<div class="grid3"><div class="card"><small class="muted">مهام مفتوحة</small><h3>'+open.length+'</h3></div><div class="card"><small class="muted">متأخرة</small><h3 class="hi">'+late.length+'</h3></div><div class="card"><small class="muted">مستحقة اليوم</small><h3>'+due.length+'</h3></div></div>'+
 '<div class="grid2" style="margin-top:8px"><div class="card"><small class="muted">المشاريع النشطة</small><h3>'+activeProjects+'</h3></div><div class="card"><small class="muted">فواتير غير مدفوعة</small><h3>'+unpaid+'</h3></div><div class="card"><small class="muted">المستحق المالي</small><h3>'+money(dueMoney)+'</h3></div><div class="card"><small class="muted">المقبوض</small><h3 class="ok">'+money(received)+'</h3></div></div>'+
 '<div class="grid2" style="margin-top:8px"><div class="card"><small class="muted">العمال النشطون</small><h3>'+activeWorkers.length+'</h3></div><div class="card"><small class="muted">مستحقات العمال المتبقية</small><h3>'+money(payrollBalance)+'</h3></div></div>'+
 '<div class="card"><b>إدارة العمال واليومية</b><div class="row"><button class="p" onclick="go(\\'workers\\')">👷 ملفات العمال</button><button onclick="go(\\'workday\\')">📅 تسجيل يومية</button><button onclick="go(\\'payroll\\')">💰 كشف الأجور</button></div><small class="muted">إجمالي المستحق '+money(payrollDue)+' · المدفوع '+money(payrollPaid)+' · السلف '+money(payrollAdvances)+'</small></div>'+
 '<div class="card"><b>⚠️ ما يحتاج انتباهك</b>'+(late.length?'<p class="hi">لديك '+late.length+' مهمة متأخرة.</p><button onclick="proSetTaskFilter(\'late\');go(\'tasks\')">عرض المتأخرات</button>': '<p class="ok">لا توجد مهام متأخرة 🎉</p>')+(due.length?'<p>لديك '+due.length+' مهام مستحقة اليوم.</p>':"")+(unpaid?'<p>تابع '+unpaid+' فاتورة لم تُسدّد بعد.</p><button onclick="go(\'invoices\')">متابعة الفواتير</button>':"")+'</div>'+
 '<div class="card"><b>📁 تقدم المشاريع</b>'+ (projectCards||'<p class="muted">أنشئ مشروعك الأول لبدء المتابعة.</p>')+'<button onclick="go(\'projects\')">كل المشاريع</button></div>'+
 '<div class="card"><b>📅 المواعيد القادمة</b>'+(ev.map(e=>'<div class="item"><span><b>'+safe(e.title)+'</b><br><small class="muted">'+safe(e.d)+' '+safe(e.t||"")+'</small></span></div>').join("")||'<p class="muted">لا توجد مواعيد قادمة مسجلة.</p>')+'<button onclick="go(\'agenda\')">فتح المفكرة</button></div>'+
 (typeof suggestionsCard==="function"?suggestionsCard():"");
};
VIEWS.tasks=function(){
 const list=tasks().slice().sort((a,b)=>(a.done-b.done)||(String(a.due||"9999").localeCompare(String(b.due||"9999"))));
 const filters=[["open","مفتوحة"],["today","اليوم"],["late","متأخرة"],["done","منجزة"],["all","الكل"]];
 return '<div class="card"><b>إدارة المهام</b><div style="display:grid;gap:8px;margin-top:8px"><input id="ptitle" placeholder="عنوان المهمة..." maxlength="180"><div class="grid2"><input id="pdue" type="date" value="'+today()+'"><select id="ppriority"><option value="normal">أولوية متوسطة</option><option value="high">أولوية عالية</option><option value="low">أولوية منخفضة</option></select></div><select id="pproject"><option value="">دون مشروع</option>'+(D.projects||[]).map(p=>'<option value="'+safe(p.id)+'" '+(D.activeProject===p.id?"selected":"")+'>'+safe(p.name)+'</option>').join("")+'</select><select id="ptworker"><option value="">غير مسند لعامل</option>'+(D.workers||[]).filter(w=>w.active!==false).map(w=>'<option value="'+safe(w.id)+'">'+safe(w.name)+'</option>').join("")+'</select><button class="p" onclick="proAddTask()">حفظ المهمة</button></div></div>'+
 '<div class="card"><div class="row" style="justify-content:space-between"><b>قائمة المهام ('+list.length+')</b><input id="proTaskSearch" oninput="proFilterTaskRows()" placeholder="ابحث في المهام..." style="width:48%"></div><div class="strip" style="margin:10px 0">'+filters.map(f=>'<button class="'+(window.proTaskFilter===f[0]?"on":"")+'" onclick="proSetTaskFilter(\''+f[0]+'\')">'+f[1]+'</button>').join("")+'</div>'+(list.map(taskRow).join("")||'<p class="muted">لا توجد مهام بعد.</p>')+'</div>';
};
VIEWS.projects=function(){
 const cards=(D.projects||[]).map(p=>{const pr=taskProgress(p.id),w=RB.all("work").filter(x=>x.project===p.id),due=w.reduce((s,x)=>s+(+x.due||0),0),paid=w.reduce((s,x)=>s+(+x.rec||0),0),workersCount=new Set(w.filter(x=>x.workerId).map(x=>String(x.workerId))).size,payroll=w.reduce((s,x)=>s+(Number(x.workerDue)||0),0),expenses=w.reduce((s,x)=>s+(Number(x.expense)||0),0);return '<div class="card"><div class="row" style="justify-content:space-between"><b>'+safe(p.name)+'</b>'+pill(p.status==="archived"?"مؤرشف":p.status==="done"?"مكتمل":"نشط",p.status==="archived"?"bad":p.status==="done"?"ok":"")+'</div><div class="progress"><div style="width:'+pr.percent+'%"></div></div><small class="muted">'+pr.done+' من '+pr.total+' مهام مكتملة'+(p.due?" · الموعد "+safe(p.due):"")+'</small><div class="grid2" style="margin-top:8px"><div><small class="muted">الميزانية</small><b>'+money(p.budget)+'</b></div><div><small class="muted">العمال المرتبطون</small><b>'+workersCount+'</b></div><div><small class="muted">أجور مستحقة</small><b>'+money(payroll)+'</b></div><div><small class="muted">مصروفات المشروع</small><b>'+money(expenses)+'</b></div><div><small class="muted">مستحقات العملاء</small><b>'+money(due)+'</b></div><div><small class="muted">المقبوض</small><b>'+money(paid)+'</b></div></div><div class="row" style="margin-top:8px"><button class="p" onclick="setActiveProject(\''+p.id+'\')">فتح المشروع</button><button onclick="editProject(\''+p.id+'\')">تعديل الاسم</button><button onclick="proProjectStatus(\''+p.id+'\')">'+(p.status==="archived"?"إعادة تنشيط":p.status==="done"?"إعادة فتح":"إنهاء")+'</button><button onclick="delProject(\''+p.id+'\')">أرشفة</button></div></div>';}).join("");
 return '<div class="card"><b>＋ إنشاء مشروع</b><input id="ppname" maxlength="160" placeholder="اسم المشروع" style="width:100%;margin:6px 0"><div class="grid2"><input id="ppclient" placeholder="العميل أو صاحب المشروع"><input id="pplocation" placeholder="موقع المشروع"></div><textarea id="ppdescription" rows="2" placeholder="وصف المشروع ونطاق العمل" style="width:100%;margin:6px 0"></textarea><div class="grid2"><input id="ppbudget" type="number" min="0" step="0.01" placeholder="الميزانية"><input id="ppstart" type="date" value="'+today()+'" aria-label="تاريخ البدء"><input id="ppdue" type="date" aria-label="تاريخ التسليم"></div><button class="p" style="margin-top:8px" onclick="proAddProject()">إنشاء المشروع</button></div>'+ (cards||'<div class="card muted">لا توجد مشاريع. أنشئ أول مشروع لتنظيم عملك.</div>');
};
window.editProject=function(id){
 const p=D.projects.find(x=>String(x.id)===String(id));if(!p)return;
 const name=prompt("اسم المشروع",p.name||"");if(name===null)return;if(!name.trim())return toast("اسم المشروع مطلوب");
 const client=prompt("العميل أو صاحب المشروع",p.client||"");if(client===null)return;
 const location=prompt("موقع المشروع",p.location||"");if(location===null)return;
 const description=prompt("وصف المشروع",p.description||"");if(description===null)return;
 const budget=prompt("ميزانية المشروع",String(p.budget||0));if(budget===null)return;
 const amount=Number(budget);if(!Number.isFinite(amount)||amount<0)return toast("أدخل ميزانية صحيحة");
 if(!RB.transact(data=>{const row=data.projects.find(x=>String(x.id)===String(id));if(row){row.name=name.trim();row.client=client.trim();row.location=location.trim();row.description=description.trim();row.budget=amount;}}))return;
 render();toast("تم تحديث بيانات المشروع");
};
window.proProjectStatus=function(id){const p=D.projects.find(x=>x.id===id);if(!p)return;const next=p.status==="archived"||p.status==="done"?"active":"done";if(!RB.transact(data=>{const row=data.projects.find(x=>x.id===id);if(row)row.status=next;}))return;render();};
VIEWS.agenda=function(){
 const upcoming=events().slice().sort((a,b)=>(String(a.d||"").localeCompare(String(b.d||""))||String(a.t||"").localeCompare(String(b.t||""))));
 return '<div class="card"><b>＋ تسجيل موعد</b><input id="etitle" placeholder="عنوان الموعد" style="width:100%;margin:6px 0"><div class="grid2"><input id="edate" type="date" value="'+today()+'"><input id="etime" type="time"></div><select id="projectId" style="width:100%;margin:8px 0"><option value="">موعد عام</option>'+(D.projects||[]).map(p=>'<option value="'+safe(p.id)+'">'+safe(p.name)+'</option>').join("")+'</select><button class="p" onclick="addEvent()">حفظ الموعد</button></div><div class="card"><b>المواعيد المسجلة ('+upcoming.length+')</b>'+(upcoming.map(e=>'<div class="item"><span><b>'+safe(e.title)+'</b><br><small class="muted">'+safe(e.d)+' '+safe(e.t||"")+' · '+safe(projectName(e.project))+'</small></span><button class="danger" onclick="delItem(\''+e.id+'\')">حذف</button></div>').join("")||'<p class="muted">لا توجد مواعيد بعد.</p>')+'</div>';
};
VIEWS.stats=function(){
 const all=tasks(),done=all.filter(t=>t.done).length,late=all.filter(isLate).length,work=RB.all("work"),due=work.reduce((s,x)=>s+(+x.due||0),0),paid=work.reduce((s,x)=>s+(+x.rec||0),0);
 return '<div class="grid2"><div class="card">إجمالي المهام<h2>'+all.length+'</h2></div><div class="card">نسبة الإنجاز<h2>'+(all.length?Math.round(done*100/all.length):0)+'%</h2></div><div class="card">المهام المتأخرة<h2 class="hi">'+late+'</h2></div><div class="card">المشاريع<h2>'+(D.projects||[]).length+'</h2></div></div><div class="card"><b>ملخص مالي</b><p>المستحق: <b>'+money(due)+'</b></p><p>المقبوض: <b class="ok">'+money(paid)+'</b></p><p>المتبقي: <b class="hi">'+money(due-paid)+'</b></p></div><div class="card"><b>إنجاز المهام خلال الأسبوع</b><canvas id="chartTasks" width="400" height="180"></canvas></div><div class="card"><b>المشاريع</b><canvas id="chartProjects" width="400" height="200"></canvas></div><div class="card"><b>المقارنة الشهرية</b><canvas id="chartMonthly" width="400" height="180"></canvas>'+(typeof monthlyCompareTable==="function"?monthlyCompareTable():"")+'</div>';
};
const style=document.createElement("style");style.textContent="[data-pro-task][hidden]{display:none!important}";document.head.appendChild(style);
render();
})();
