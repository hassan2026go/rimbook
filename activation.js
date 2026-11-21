/* Rimbook activation layer */
(function(){
 const D=RB.data;
 D.profile=Object.assign({name:"",role:"employee",phone:"",email:"",city:"",skills:"",about:""},D.profile||{});
 D.settings=Object.assign({theme:"dark",fs:15,dailyRate:50,otRate:10,currency:"USD",managerPhone:"",enabled:{}},D.settings||{});
 ["items","projects","workers","purchases","habits","goals","contacts","invoices"].forEach(k=>{if(!Array.isArray(D[k]))D[k]=[];});
 if(!D.settings.enabled)D.settings.enabled={};
 if(!ROLES[D.profile.role])D.profile.role="employee";
 const tabs=["home","projects","agenda","tasks","notes","habits","goals","ledger","contacts","invoices","rates","profile","stats","sync","integrations","settings","about"];
 const names={home:["🏠","الرئيسية"],projects:["📁","المشاريع"],agenda:["📅","المواعيد"],tasks:["✅","المهام"],notes:["📝","الملاحظات"],habits:["🔥","العادات"],goals:["🎯","الأهداف"],ledger:["💼","العمل"],contacts:["👥","جهات الاتصال"],invoices:["🧾","الفواتير"],rates:["💱","العملات"],profile:["👤","الملف"],stats:["📊","الإحصاءات"],sync:["🔄","النسخ والمزامنة"],integrations:["🧩","الإضافات"],settings:["⚙️","الإعدادات"],about:["ℹ️","حول"]};
 Object.assign(TABS,names);ROLES.employee.tabs=tabs;ROLES.worker.tabs=tabs.filter(x=>x!=="goals"&&x!=="rates");
 const $v=id=>document.getElementById(id)?.value||"";
 const n=id=>Number($v(id))||0;
 const today=()=>iso(new Date());
 const escv=s=>esc(s);
 const list=t=>RB.all(t).slice().sort((a,b)=>(b.created||0)-(a.created||0));
 const proj=id=>D.projects.find(p=>p.id===id)?.name||"عام";
 const active=()=>D.projects.find(p=>p.id===D.activeProject)||null;
 const field=(id,label,type,placeholder,value)=>'<label class="muted">'+label+'</label><input id="'+id+'" type="'+(type||"text")+'" placeholder="'+(placeholder||"")+'" value="'+escv(value||"")+'" style="width:100%;margin:4px 0 10px">';
 const select=(id,label,opts,chosen)=>'<label class="muted">'+label+'</label><select id="'+id+'" style="width:100%;margin:4px 0 10px">'+opts.map(o=>'<option value="'+escv(o[0])+'" '+(o[0]===chosen?"selected":"")+'>'+escv(o[1])+'</option>').join("")+'</select>';
function projectOptions(projects, selected) {
    const rows = Array.isArray(projects) ? projects.filter(p => p && p.id != null && String(p.name || "").trim()) : [];
    const validSelected = rows.some(p => String(p.id) === String(selected)) ? String(selected) : "";
    return { options: [["", "عام — غير مرتبط بمشروع"], ...rows.map(p => [String(p.id), String(p.name)])], selected: validSelected, hasProjects: rows.length > 0 };
  }
  const selectedProject=()=>{const el=document.getElementById("projectId");return el?(el.value||null):(D.activeProject||null);};
  const projectField=()=>{
    const data = projectOptions(D.projects, D.activeProject);
    return select("projectId","المشروع (اختياري)",data.options,data.selected) +
      (data.hasProjects
        ? '<p class="muted">اختر مشروعاً لربط السجل به، أو اتركه «عام» إذا لم يكن تابعاً لمشروع.</p>'
        : '<p class="muted">«عام» يعني أن السجل غير مرتبط بمشروع. أنشئ مشروعاً من صفحة المشاريع ليظهر هنا تلقائياً.</p><button type="button" onclick="go(\'projects\')">إنشاء مشروع</button>');
  };
 const empty=m=>'<p class="muted" style="text-align:center;padding:12px">'+m+'</p>';
 const box=(title,body)=>'<div class="card"><b>'+title+'</b>'+body+'</div>';
 window.activeProj=active;
 window.dayEvents=date=>list("event").filter(e=>e.d===date);
 window.ledgerTotals=()=>list("work").reduce((a,w)=>{a.due+=(+w.due||0);a.rec+=(+w.rec||0);a.adv+=(+w.advance||0);a.expenses+=(+w.expense||0);a.rem+=(+w.due||0)-(+w.rec||0)-(+w.advance||0);return a;},{due:0,rec:0,adv:0,expenses:0,rem:0});
 window.dl=(name,content,type)=>{const u=URL.createObjectURL(new Blob([content],{type:type||"text/plain"}));const a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);};
 window.backupLocal=()=>dl("rimbook-backup-"+today()+".json",JSON.stringify(D,null,2),"application/json");
  window.csvW=()=>{const rows=[["التاريخ","النوع","البيان","مستحق","واصل","سلفة","مصروف","إضافي","معكوس؟","مرجع القيد الأصلي","سبب التصحيح","المشروع"]];list("work").forEach(w=>rows.push([w.d,w.k,w.ds,w.due,w.rec,w.advance,w.expense,w.ot,w.isReversal?"نعم":w.reversedBy?"تم عكس الأصل":"لا",w.reversalOf||w.reversedBy||"",w.correctionReason||w.reversalReason||"",proj(w.project)]));dl("rimbook-work.csv","\uFEFF"+rows.map(r=>r.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),"text/csv;charset=utf-8");};
 window.exportICS=()=>{const out=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Rimbook//AR"];list("event").forEach(e=>out.push("BEGIN:VEVENT","UID:"+e.id+"@rimbook","DTSTART:"+(e.d||today()).replace(/-/g,"")+"T"+(e.t||"0900").replace(":","")+"00","SUMMARY:"+(e.title||"موعد").replace(/[\r\n,;]/g," "),"END:VEVENT"));out.push("END:VCALENDAR");dl("rimbook.ics",out.join("\r\n"),"text/calendar");};
 window.wText=()=> "Rimbook "+today();
 window.shareW=()=>window.open("https://wa.me/"+String(D.settings.managerPhone||"").replace(/\D/g,"")+"?text="+encodeURIComponent(wText()),"_blank");
 window.restoreLocal=input=>{const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const obj=JSON.parse(r.result);if(!obj||!Array.isArray(obj.items))throw 0;if(confirm("استبدال البيانات الحالية بالنسخة؟")){RB.replace(obj);render();toast("تمت الاستعادة");}}catch(e){toast("ملف غير صالح");}};r.readAsText(f);};
 function go(t){view=t;render();window.scrollTo(0,0);}
 window.go=go;
  window.createProject=()=>{const name=$v("pname").trim();if(!name)return toast("اكتب اسم المشروع");const p={id:"p"+Date.now(),name,color:"#22d3ee",budget:n("pbudget")};if(!RB.transact(data=>{data.projects.push(p);data.activeProject=p.id;}))return;render();toast("تم إنشاء المشروع");};
  window.editProject=id=>{const p=D.projects.find(x=>x.id===id);if(!p)return;const value=prompt("اسم المشروع",p.name);if(value===null)return;const name=value.trim();if(!name)return toast("اسم المشروع لا يمكن أن يكون فارغاً");if(!RB.transact(data=>{const row=data.projects.find(x=>x.id===id);if(row)row.name=name;}))return;render();};
  window.setActiveProject=id=>{if(!RB.transact(data=>{data.activeProject=id||null;}))return;render();};
  window.delProject=id=>{
    const project=D.projects.find(p=>String(p.id)===String(id));if(!project)return;
    if(project.status==="archived")return toast("هذا المشروع مؤرشف بالفعل");
    const linkedItems=D.items.filter(x=>String(x.project||"")===String(id)).length;
    const linkedInvoices=(D.invoices||[]).filter(x=>String(x.project||"")===String(id)).length;
    const linkedPurchases=(D.purchases||[]).filter(x=>String(x.projectId||"")===String(id)).length;
    const linkedWorkers=(D.workers||[]).filter(x=>String(x.projectId||"")===String(id)).length;
    const linked=linkedItems+linkedInvoices+linkedPurchases+linkedWorkers;
    const message="سيتم أرشفة المشروع مع الاحتفاظ بكل المهام واليوميات والحسابات والفواتير والمشتريات والارتباطات كما هي"+
      (linked?" (السجلات المرتبطة: "+linked+").":"." )+
      " ويمكن إعادة تنشيطه لاحقاً. هل تريد المتابعة؟";
    if(!confirm(message))return;
    if(!RB.transact(data=>{
      const row=data.projects.find(p=>String(p.id)===String(id));
      if(!row)return;
      row.status="archived";
      row.archivedAt=Date.now();
      if(String(data.activeProject||"")===String(id))data.activeProject=null;
    }))return;
    render();toast("تمت أرشفة المشروع مع الحفاظ على سجلاته وارتباطاته");
  };
  window.addTask=()=>{const title=$v("ttitle").trim();if(!title)return toast("اكتب المهمة");if(!RB.add({type:"task",title,due:$v("tdue"),priority:$v("tpriority"),project:selectedProject(),done:false}))return;render();};
 window.toggleTask=(id,v)=>{RB.patch(id,{done:v});render();};
 window.editTask=id=>{const t=D.items.find(x=>x.id===id);if(!t)return;const v=prompt("عنوان المهمة",t.title);if(v!==null){t.title=v;RB.save();render();}};
  window.addEvent=()=>{const title=$v("etitle").trim();if(!title)return toast("اكتب الموعد");if(!RB.add({type:"event",title,d:$v("edate")||today(),t:$v("etime"),project:selectedProject()}))return;render();};
  window.addNote=()=>{const body=$v("nbody").trim();if(!body)return toast("اكتب الملاحظة");if(!RB.add({type:"note",title:$v("ntitle"),body,d:today(),project:selectedProject()}))return;render();toast("تم حفظ الملاحظة");};
 window.editNote=id=>{const x=D.items.find(i=>i.id===id);if(!x)return;const v=prompt("نص الملاحظة",x.body||"");if(v!==null){x.body=v;RB.save();render();}};
  window.delItem=id=>{
    const row=D.items.find(item=>String(item.id)===String(id));if(!row)return toast("لم نعثر على السجل");
    if(row.type==="work")return toast("حذف الحركات المالية متوقف حفاظاً على الحقوق. يجب تصحيحها بقيد عكسي موثق، لا بمحوها.");
    if(!confirm("هل تريد حذف هذا السجل؟"))return;
    if(!RB.remove(id))return;
    render();
  };
 window.addHabit=()=>{const name=$v("hname").trim();if(!name)return;D.habits.push({id:"h"+Date.now(),name,history:[]});RB.save();render();};
 window.markHabit=id=>{const h=D.habits.find(x=>x.id===id);if(!h)return;h.history=h.history||[];h.history.includes(today())?h.history=h.history.filter(x=>x!==today()):h.history.push(today());RB.save();render();};
 window.delHabit=id=>{D.habits=D.habits.filter(x=>x.id!==id);RB.save();render();};
function goalProgress(current, target) {
    const c = Number(current), t = Number(target);
    const done = Number.isFinite(c) && c >= 0 ? c : 0;
    const total = Number.isFinite(t) && t > 0 ? t : 0;
    const percent = total > 0 ? Math.min(100, Math.max(0, done / total * 100)) : 0;
    return { done, total, percent, remaining: Math.max(0, total - done), exceeded: total > 0 && done > total };
  }
  window.goalProgress = goalProgress;
  window.toggleGoalCustomUnit=value=>{
    const input=document.getElementById("gcustomunit"),label=document.getElementById("gcustomunit-label");
    const show=value==="other";
    if(input)input.hidden=!show;
    if(label)label.hidden=!show;
  };
  window.addGoal=()=>{
    const name=$v("gname").trim(), target=Number($v("gtarget")), current=Number($v("gcurrent"));
    const selectedUnit=$v("gunit"), customUnit=$v("gcustomunit").trim();
    const unit=selectedUnit==="other"?customUnit:selectedUnit;
    if(!name)return toast("اكتب ما تريد إنجازه");
    if(!Number.isFinite(target)||target<=0)return toast("أدخل رقماً مستهدفاً أكبر من صفر");
    if(!Number.isFinite(current)||current<0)return toast("الإنجاز الحالي يجب أن يكون صفراً أو أكثر");
    if(!unit)return toast("اكتب وحدة القياس");
    const goal={id:"g"+Date.now().toString(36),name,target,current,unit,created:Date.now()};
    if(!RB.transact(data=>{data.goals.push(goal);}))return;
    render();toast("تم حفظ الهدف");
  };
  window.updateGoal=id=>{
    const g=D.goals.find(x=>String(x.id)===String(id));if(!g)return;
    const input=document.getElementById("goal-current-"+id);
    const value=Number(input?.value);
    if(!Number.isFinite(value)||value<0)return toast("أدخل إنجازاً صحيحاً لا يقل عن صفر");
    if(!RB.transact(data=>{const row=data.goals.find(x=>String(x.id)===String(id));if(row)row.current=value;}))return;
    render();toast("تم تحديث الإنجاز");
  };
  window.delGoal=id=>{
    if(!confirm("هل تريد حذف هذا الهدف؟"))return;
    if(!RB.transact(data=>{data.goals=data.goals.filter(x=>String(x.id)!==String(id));}))return;
    render();
  };
  window.addWork=()=>{if(!RB.add({type:"work",k:$v("wtype"),d:$v("wdate")||today(),ds:$v("wdesc"),due:n("wdue"),rec:n("wrec"),ot:n("wot"),project:selectedProject()}))return;render();};
 window.saveProfile=()=>{Object.assign(D.profile,{name:$v("prname"),phone:$v("prphone"),email:$v("premail"),city:$v("prcity"),about:$v("prabout")});RB.save();render();toast("تم حفظ الملف");};
 window.saveSettings=()=>{D.settings.theme=$v("theme")||D.settings.theme;D.settings.fs=Math.max(12,Math.min(24,n("fs")||15));D.settings.currency=$v("currency")||D.settings.currency;const role=$v("role");if(["employee","worker"].includes(role))D.profile.role=role;const daily=document.getElementById("drate"),overtime=document.getElementById("orate");if(daily)D.settings.dailyRate=Number(daily.value)||0;if(overtime)D.settings.otRate=Number(overtime.value)||0;const manager=document.getElementById("manager");if(manager)D.settings.managerPhone=manager.value.trim();RB.save();render();};
 window.deleteItem=window.delItem;
 VIEWS.home=()=>{const open=list("task").filter(t=>!t.done).length,ev=dayEvents(today()),L=ledgerTotals();return box("أهلاً "+escv(D.profile.name||"بك")+" 👋",'<p class=muted>'+new Date().toLocaleDateString("ar")+'</p><div class=grid3><div class=card>مهام مفتوحة<h3>'+open+'</h3></div><div class=card>مشاريع<h3>'+D.projects.length+'</h3></div><div class=card>مواعيد اليوم<h3>'+ev.length+'</h3></div></div><div class=grid2><div class=card>مستحق<h3>'+L.due.toFixed(2)+'</h3></div><div class=card>واصل<h3>'+L.rec.toFixed(2)+'</h3></div></div><button class=p onclick="go(\'tasks\')">المهام</button> <button onclick="go(\'agenda\')">المواعيد</button>')+(typeof suggestionsCard==="function"?suggestionsCard():"");};
 VIEWS.projects=()=>box("مشروع جديد",field("pname","اسم المشروع","text","اسم المشروع")+field("pbudget","الميزانية","number","0","0")+'<button class=p onclick="createProject()">إنشاء</button>')+box("المشاريع ("+D.projects.length+")",D.projects.map(p=>'<div class=item><span><b>'+escv(p.name)+'</b><br><small class=muted>'+p.id+'</small></span><button onclick="setActiveProject(\''+p.id+'\')">تفعيل</button><button onclick="editProject(\''+p.id+'\')">✏️</button><button class=danger onclick="delProject(\''+p.id+'\')">🗑</button></div>').join("")||empty("لا توجد مشاريع"));
 VIEWS.tasks=()=>box("إضافة مهمة",field("ttitle","المهمة","text","ماذا تريد إنجازه؟")+field("tdue","الاستحقاق","date","",today())+select("tpriority","الأولوية",[["low","منخفضة"],["normal","متوسطة"],["high","عالية"]],"normal")+projectField()+'<button class=p onclick="addTask()">إضافة المهمة</button>')+box("قائمة المهام",list("task").filter(t=>!D.activeProject||t.project===D.activeProject).map(t=>'<div class=item><input type=checkbox '+(t.done?"checked":"")+' onchange="toggleTask(\''+t.id+'\',this.checked)"><span><b>'+escv(t.title)+'</b><br><small class=muted>'+(t.due||"بلا موعد")+' · '+proj(t.project)+'</small></span><button onclick="editTask(\''+t.id+'\')">✏️</button><button class=danger onclick="delItem(\''+t.id+'\')">🗑</button></div>').join("")||empty("لا توجد مهام"));
 VIEWS.agenda=()=>box("إضافة موعد",field("etitle","العنوان","text","عنوان الموعد")+field("edate","التاريخ","date","",today())+field("etime","الوقت","time","")+projectField()+'<button class=p onclick="addEvent()">حفظ الموعد</button>')+box("المواعيد",list("event").map(e=>'<div class=item><span><b>'+escv(e.title)+'</b><br><small class=muted>'+e.d+' '+(e.t||"")+'</small></span><button class=danger onclick="delItem(\''+e.id+'\')">حذف</button></div>').join("")||empty("لا توجد مواعيد"));
VIEWS.notes=()=>{
    const notes=list("note");
    return box("إضافة ملاحظة",'<p class="muted">اكتب ما تريد حفظه. يمكنك ربط الملاحظة بمشروع، أو تركها «عام» لتبقى مستقلة.</p>'+
      field("ntitle","عنوان الملاحظة (اختياري)","text","مثلاً: ملاحظات اجتماع")+
      '<label class="muted" for="nbody">نص الملاحظة</label><textarea id="nbody" rows="5" style="width:100%" placeholder="اكتب ملاحظتك هنا..."></textarea>'+
      projectField()+'<button class="p" onclick="addNote()">حفظ الملاحظة</button>')+
      box("الملاحظات المحفوظة ("+notes.length+")",notes.map(x=>'<div class=item style="display:block"><b>'+escv(x.title||"ملاحظة")+'</b><p class="muted">'+escv(x.d||"")+' · '+escv(proj(x.project))+'</p><p style="white-space:pre-wrap">'+escv(x.body||"")+'</p>'+(typeof attachmentsSection==="function"?attachmentsSection(x):"")+'<button onclick="editNote(\''+escv(x.id)+'\')">تعديل</button> <button class="danger" onclick="delItem(\''+escv(x.id)+'\')">حذف</button> '+(typeof noteSpeakBtn==="function"?noteSpeakBtn(x):"")+'</div>').join("")||empty("لا توجد ملاحظات بعد. أضف ملاحظتك الأولى من الأعلى."));
  };
 VIEWS.habits=()=>box("عادة جديدة",field("hname","اسم العادة","text","مثلاً القراءة")+ '<button class=p onclick="addHabit()">إضافة</button>')+box("عاداتي",D.habits.map(h=>'<div class=item><span>'+escv(h.name)+' · '+((h.history||[]).length)+' يوم</span><button onclick="markHabit(\''+h.id+'\')">تم اليوم</button><button class=danger onclick="delHabit(\''+h.id+'\')">حذف</button></div>').join("")||empty("لا توجد عادات"));
VIEWS.goals=()=>{
    const goals=Array.isArray(D.goals)?D.goals:[];
    const unitOptions=[["مرة","مرة"],["صفحة","صفحة"],["ساعة","ساعة"],["يوم","يوم"],["قطعة","قطعة"],["مبلغ","مبلغ مالي"],["وحدة","وحدة"]];
    const unitSelect=select("gunit","بماذا ستقيس الإنجاز؟",unitOptions.concat([["other","وحدة أخرى"]]),"مرة")
      .replace('<select id="gunit"','<select id="gunit" onchange="toggleGoalCustomUnit(this.value)"')+
      '<label id="gcustomunit-label" class="muted" for="gcustomunit" hidden>اكتب اسم وحدة القياس</label><input id="gcustomunit" type="text" maxlength="24" placeholder="مثلاً: درس أو كيلومتر" style="width:100%;margin:0 0 10px" hidden>';
    const cards=goals.map(g=>{
      const m=goalProgress(g.current,g.target),unit=escv(g.unit||"وحدة");
      const id=escv(g.id),current=Number.isFinite(Number(g.current))?Number(g.current):0,target=Number.isFinite(Number(g.target))?Number(g.target):0;
      return '<div class="card"><b>'+escv(g.name)+'</b><p>أنجزت <strong>'+current+'</strong> من <strong>'+target+'</strong> '+unit+'</p>'+
        '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(m.percent)+'"><div style="width:'+m.percent+'%"></div></div>'+
        '<p class="muted">'+Math.round(m.percent)+'٪ من الهدف'+(m.exceeded?' · تجاوزت الهدف 🎉':' · المتبقي '+m.remaining+' '+unit)+'</p>'+
        '<label class="muted" for="goal-current-'+id+'">تحديث ما أنجزته حتى الآن ('+unit+')</label>'+
        '<div class="row"><input id="goal-current-'+id+'" type="number" min="0" step="any" inputmode="decimal" value="'+current+'" style="flex:1;min-width:90px"><button class="p" onclick="updateGoal(\''+id+'\')">حفظ الإنجاز</button><button class="danger" onclick="delGoal(\''+id+'\')">حذف الهدف</button></div></div>';
    }).join("");
    return box("إنشاء هدف جديد",'<p class="muted">الهدف هو شيء تريد الوصول إليه. حدّد اسمه والعدد الذي تريد تحقيقه، ثم اختر وحدة القياس المناسبة.</p>'+
      field("gname","ماذا تريد أن تنجز؟","text","مثلاً: قراءة كتاب")+
      field("gtarget","كم تريد أن تنجز؟","number","مثلاً: 10","10")+
      '<label class="muted" for="gcurrent">كم أنجزت حتى الآن؟</label><input id="gcurrent" type="number" min="0" step="any" inputmode="decimal" value="0" style="width:100%;margin:4px 0 10px">'+
      unitSelect+'<button class="p" onclick="addGoal()">حفظ الهدف</button>')+
      box("أهدافي ("+goals.length+")",cards||empty("لا توجد أهداف بعد. ابدأ بهدف صغير وواضح."));
  };
 VIEWS.ledger=()=>{
  const L=ledgerTotals();
  const rows=list("work").slice().sort((a,b)=>(b.d||"").localeCompare(a.d||"")).map(w=>{
   const status=w.isReversal?'<small class="hi">قيد عكسي</small>':w.reversedBy?'<small class="hi">تم عكسه بقيد موثق</small>':'';
   const action=!w.isReversal&&!w.reversedBy?'<button type="button" onclick="reverseWorkEntry(\''+w.id+'\')">تصحيح بقيد عكسي</button>':'';
   return '<div class=item><span>'+escv(w.ds||w.k)+' '+status+'<br><small>'+escv(w.d)+' · '+(w.due||0)+' / '+(w.rec||0)+(w.correctionReason?' · سبب التصحيح: '+escv(w.correctionReason):w.reversalReason?' · سبب التصحيح: '+escv(w.reversalReason):'')+'</small></span>'+action+'</div>';
  }).join("");
  return box("تسجيل حركة",select("wtype","النوع",[["work","عمل"],["payment","دفعة"],["expense","مصروف"]],"work")+field("wdate","التاريخ","date","",today())+field("wdesc","البيان","text","وصف الحركة")+field("wdue","المستحق","number","0","0")+field("wrec","الواصل","number","0","0")+field("wot","ساعات إضافية","number","0","0")+projectField()+'<button class=p onclick="addWork()">حفظ</button>')+box("الحسابات",'<p>المستحق: <b>'+L.due.toFixed(2)+'</b> · الواصل: <b>'+L.rec.toFixed(2)+'</b> · المتبقي: <b>'+L.rem.toFixed(2)+'</b> '+escv(D.settings.currency)+'</p>'+(rows||empty("لا حركات")));
 };
 VIEWS.contacts=()=>typeof contactsScreen==="function"?contactsScreen():empty("جهات الاتصال غير متاحة");
 VIEWS.invoices=()=>box("فواتير المشاريع",D.projects.map(p=>'<div class=item><span>'+escv(p.name)+'</span><button onclick="setActiveProject(\''+p.id+'\')">اختيار</button></div>'+ (typeof invoicesSection==="function"?invoicesSection(p.id):"")).join("")||empty("أنشئ مشروعاً أولاً"));
 VIEWS.rates=()=>typeof ratesSection==="function"?ratesSection():empty("العملات غير متاحة");
 VIEWS.stats=()=>box("المهام خلال الأسبوع",'<canvas id=chartTasks width=400 height=180></canvas>')+box("المشاريع",'<canvas id=chartProjects width=400 height=200></canvas>')+(typeof monthlyCompareTable==="function"?monthlyCompareTable():"");
 VIEWS.sync=()=>box("النسخ الاحتياطي والاستعادة",'<p class="muted">النسخة الكاملة تشمل بيانات التطبيق والمرفقات والصور والملفات المحفوظة محلياً. احتفظ بنسخة خارج الهاتف دورياً.</p>'+
 '<button class="p" onclick="backupLocal()">تنزيل نسخة كاملة JSON</button> <button onclick="document.getElementById(\'restoreFile\').click()">استعادة نسخة</button><input hidden id="restoreFile" type="file" accept="application/json" onchange="restoreLocal(this)">'+
 '<hr><button onclick="backupEncrypted()">إنشاء نسخة كاملة مشفّرة</button> <button onclick="document.getElementById(\'restoreEncryptedFile\').click()">استعادة نسخة مشفّرة</button><input hidden id="restoreEncryptedFile" type="file" accept=".rbe" onchange="restoreEncrypted(this)">'+
 '<hr><button onclick="shareFileWhatsApp()">مشاركة نسخة كاملة عبر واتساب</button> <button onclick="shareViaAny()">مشاركة النسخة عبر التطبيقات</button>'+
 '<hr><button onclick="backupZip()">تنزيل نسخة ZIP كاملة</button> <button onclick="document.getElementById(\'restoreZipFile\').click()">استعادة نسخة ZIP</button><input hidden id="restoreZipFile" type="file" accept=".zip,application/zip" onchange="restoreZip(this)">'+
 '<hr><button onclick="csvW()">تصدير CSV</button> <button onclick="exportICS()">تصدير المواعيد ICS</button>'+
 '<p class="muted">Google Drive اختياري ويحتاج إعداد OAuth من الإضافات. تُرفع النسخة الكاملة مع المرفقات.</p><button onclick="gdriveUpload()">رفع النسخة إلى Drive</button> <button onclick="gdriveDownload()">استعادة من Drive</button>'+
 '<hr><b>نقل مباشر بين جهازين</b><p class="muted">ينقل السجلات والمرفقات بين الجهازين عند نجاح الاتصال المباشر.</p><button onclick="rtcCreateOffer()">إنشاء رمز اتصال وإرسال</button> <button onclick="rtcAcceptOffer()">استقبال اتصال</button> <button onclick="rtcAcceptAnswer()">إدخال رمز الرد</button>');
 VIEWS.integrations=()=>{if(typeof INTEGRATIONS==="undefined")return empty("الإضافات غير متاحة");return box("الإضافات",'<p class=muted>الخدمات الخارجية اختيارية. أدخل مفاتيح الخدمة أولاً، ثم اختبرها وفعّلها.</p>'+Object.values(INTEGRATIONS).map(i=>{const enabled=isEnabled(i.id);const fields=(i.fields||[]).map(f=>'<label class=muted>'+escv(f.label)+'</label>'+(f.type==="select"?'<select style="width:100%;margin:4px 0 8px" onchange="saveIntegrationField(\''+f.key+'\',this.value)">'+(f.options||[]).map(o=>'<option '+(D.settings[f.key]===o?"selected":"")+'>'+escv(o)+'</option>').join("")+'</select>':'<input style="width:100%;margin:4px 0 8px" type="'+(f.type||"text")+'" value="'+escv(D.settings[f.key]||"")+'" placeholder="'+escv(f.placeholder||"")+'" onchange="saveIntegrationField(\''+f.key+'\',this.value)">')).join("");return '<div class=card><b>'+i.icon+' '+escv(i.name)+'</b><p class=muted>'+escv(i.desc)+'</p>'+fields+(i.help?'<details><summary>طريقة الإعداد</summary><pre style="white-space:pre-wrap">'+escv(i.help)+'</pre></details>':"")+'<div class=row><button onclick="toggleIntegration(\''+i.id+'\','+(!enabled)+')">'+(enabled?"تعطيل":"تفعيل")+'</button>'+(i.test?'<button onclick="testIntegration(\''+i.id+'\')">اختبار</button>':"")+(enabled?'<button class=p onclick="INTEGRATIONS[\''+i.id+'\'].run()">تشغيل</button>':"")+'</div></div>';}).join(""))};
 VIEWS.about=()=>box("حول Rimbook",'<div style="text-align:center;padding:12px"><h2 style="color:var(--ac)">Rimbook</h2><p>مفكرة شخصية لإدارة المشاريع والمهام والمواعيد والعمل والملفات.</p><hr><b>تطوير Yasser-ALhussen</b><br>📍 درعا - سوريا 🇸🇾<br>📧 <a href="mailto:kalimat2026go@gmail.com">kalimat2026go@gmail.com</a><p class="muted">تُحفظ بياناتك على هذا الجهاز. احتفظ بنسخة احتياطية عند تغيير الجهاز أو المتصفح.</p></div>');
VIEWS.profile=()=>{
    const p=D.profile||{};
    const photo=/^data:image\/(jpeg|png|webp);base64,/i.test(p.photo||"");
    const avatar=photo?'<img class="avatar" src="'+escv(p.photo)+'" alt="صورتك الشخصية" style="object-fit:cover">':'<div class="avatar" aria-label="الصورة الشخصية">👤</div>';
    const profileField=(label,key,type,placeholder)=>'<label class="muted" for="profile-'+key+'">'+label+'</label><input id="profile-'+key+'" type="'+(type||"text")+'" value="'+escv(p[key]||"")+'" placeholder="'+(placeholder||"")+'" onchange="saveProfileField(\''+key+'\',this.value)" style="width:100%;margin:4px 0 12px">';
    return box("ملفي الشخصي",'<div style="text-align:center">'+avatar+'<h2>'+escv(p.name||"أهلاً بك")+'</h2><p class="muted">بياناتك الشخصية تبقى على هذا الجهاز ولا تُرسل تلقائياً.</p>'+
      '<label class="p" for="profile-photo" style="display:inline-block;padding:8px 14px;border-radius:10px;cursor:pointer;color:#fff;background:var(--p)">اختيار صورة شخصية</label><input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onchange="saveProfilePhoto(this)" style="display:none">'+(p.photo?'<button class="danger" onclick="removeProfilePhoto()">حذف الصورة</button>':'')+'</div>')+
      box("المعلومات الأساسية",profileField("الاسم الكامل","name","text","اكتب اسمك")+
      (p.role==="worker" ? "" : '<label class="muted" for="profile-role">الصفة</label><select id="profile-role" onchange="saveProfileField(\'role\',this.value)" style="width:100%;margin:4px 0 12px"><option value="employee" '+(p.role==="employee"?"selected":"")+'>إدارة</option><option value="worker" '+(p.role==="worker"?"selected":"")+'>عامل</option></select>')+
      (p.role==="worker" ? '<label class="muted" for="profile-worker">ملف العامل المرتبط</label><select id="profile-worker" onchange="saveProfileField(\'workerId\',this.value)" style="width:100%;margin:4px 0 12px"><option value="">اختر ملفك</option>'+(D.workers||[]).filter(w=>w.active!==false).map(w=>'<option value="'+escv(w.id)+'" '+(String(p.workerId||"")===String(w.id)?"selected":"")+'>'+escv(w.name)+'</option>').join("")+'</select>' : "")+
      profileField("رقم الهاتف","phone","tel","مع رمز الدولة إن أمكن")+profileField("البريد الإلكتروني","email","email","example@email.com"))+
      box("العمل والعنوان",profileField("المدينة أو المنطقة","city","text","المدينة")+profileField("مكان العمل أو الشركة","workplace","text","اسم جهة العمل")+profileField("المسمى الوظيفي","jobTitle","text","مثلاً: فني أو عامل")+
      profileField("تاريخ الميلاد (اختياري)","birth","date","")+
      '<label class="muted" for="profile-skills">المهارات</label><textarea id="profile-skills" rows="2" style="width:100%" onchange="saveProfileField(\'skills\',this.value)">'+escv(p.skills||"")+'</textarea>')+
      box("نبذة عنك",'<textarea rows="3" placeholder="اكتب نبذة مختصرة عنك" style="width:100%" onchange="saveProfileField(\'about\',this.value)">'+escv(p.about||"")+'</textarea>')+
      box("معلومات طوارئ (اختيارية وخاصة)",'<p class="muted">لا تشارك هذه المعلومات في التقارير العامة.</p><textarea rows="2" placeholder="اسم شخص للتواصل ورقم هاتفه عند الضرورة" style="width:100%" onchange="saveProfileField(\'emergency\',this.value)">'+escv(p.emergency||"")+'</textarea>');
  };
 const rimbookCoreSettingsView = VIEWS.settings;
 VIEWS.settings=()=>rimbookCoreSettingsView()+box("الإعدادات العامة",select("theme","المظهر",[["dark","داكن"],["light","فاتح"]],D.settings.theme)+field("fs","حجم الخط","number","15",D.settings.fs)+select("currency","العملة",[["USD","USD"],["EUR","EUR"],["TRY","TRY"],["SYP","SYP"],["SAR","SAR"],["AED","AED"],["EGP","EGP"],["JOD","JOD"]],D.settings.currency)+(D.profile.role==="worker"?"":select("role","نوع الحساب",[["employee","إدارة"],["worker","عامل"]],D.profile.role)+field("manager","واتساب المدير","tel","مع رمز الدولة",D.settings.managerPhone))+'<button class="p" onclick="saveSettings()">حفظ الإعدادات العامة</button>')+
 (D.profile.role==="worker"?"":box("مراكز الإعدادات المتقدمة",'<p class="muted">كل مركز يتحكم بوظائفه الفعلية داخل التطبيق.</p><div class="row"><button onclick="go(\'sync\')">التخزين والنسخ الاحتياطي</button><button onclick="go(\'integrations\')">الاتصالات والخدمات</button><button onclick="go(\'rates\')">العملات وأسعار الصرف</button><button onclick="go(\'contacts\')">جهات الاتصال</button><button onclick="go(\'stats\')">التقارير والإحصاء</button><button onclick="go(\'profile\')">ملف المستخدم</button></div>'));
 window.render=function(){const available=ROLES[D.profile.role]?.tabs||tabs;if(!available.includes(view))view="home";document.body.dataset.theme=D.settings.theme||"dark";document.body.style.fontSize=(D.settings.fs||15)+"px";$("#tabs").innerHTML=available.map(t=>'<button class="'+(t===view?"on":"")+'" onclick="go(\''+t+'\')"><span>'+TABS[t][0]+'</span>'+TABS[t][1]+'</button>').join("");$("#view").innerHTML=VIEWS[view]?VIEWS[view]():"";if(view==="stats"){if(typeof drawCharts==="function")drawCharts();if(typeof drawMonthlyChart==="function")drawMonthlyChart();}};
 RB.save();render();
})();