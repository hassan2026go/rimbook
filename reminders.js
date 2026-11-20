/* Rimbook — reminders for wages, payments, advances, holidays and appointments */
(function(){
 const escv=s=>esc(String(s??"")),today=()=>iso(new Date());
 const labels={wage:"موعد أجور",payment:"دفعة",advance:"سلفة",holiday:"عطلة",appointment:"موعد",other:"تذكير"};
 const allReminders=()=>RB.all("event").filter(x=>x.reminderCategory);
 window.addReminder=function(){
  const val=id=>document.getElementById(id)?.value?.trim()||"",title=val("rm-title"),date=val("rm-date"),time=val("rm-time"),category=val("rm-category");
  if(!title)return toast("اكتب عنوان التذكير");if(!date)return toast("حدد التاريخ");if(date<today())return toast("اختر اليوم أو تاريخاً قادماً");
  RB.add({type:"event",title,d:date,t:time||"09:00",project:D.activeProject||null,reminderCategory:category,reminderEnabled:true,reminderLead:15});
  render();toast("تم حفظ التذكير");
 };
 window.deleteReminder=function(id){if(!confirm("حذف هذا التذكير؟"))return;RB.remove(id);render();toast("تم حذف التذكير");};
 window.toggleReminder=function(id,enabled){RB.patch(id,{reminderEnabled:!!enabled});render();toast(enabled?"تم تفعيل التذكير":"تم إيقاف التذكير");};
 window.remindersScreen=function(){
  const items=allReminders().slice().sort((a,b)=>(a.d||"").localeCompare(b.d||"")||(a.t||"").localeCompare(b.t||"")),upcoming=items.filter(x=>x.d>=today());
  const rows=items.map(x=>'<div class="item" style="align-items:flex-start"><span style="flex:1"><b>'+escv(x.title)+'</b><br><small class="muted">'+(labels[x.reminderCategory]||labels.other)+' · '+escv(x.d)+' · '+escv(x.t||"09:00")+'</small></span><label class="muted" style="display:flex;align-items:center;gap:4px"><input type="checkbox" '+(x.reminderEnabled!==false?"checked":"")+' onchange="toggleReminder(\''+escv(x.id)+'\',this.checked)"> تنبيه</label><button class="danger" onclick="deleteReminder(\''+escv(x.id)+'\')">حذف</button></div>').join("");
  return '<div class="card"><b style="font-size:17px">⏰ مركز التذكيرات</b><p class="muted">ذكّر نفسك بمواعيد الأجور والدفعات والسلف والعطل والاجتماعات. البيانات محفوظة على جهازك.</p><div class="grid2"><div class="card">كل التذكيرات<h3>'+items.length+'</h3></div><div class="card">القادمة<h3>'+upcoming.length+'</h3></div></div></div>'+
  '<div class="card"><b>➕ تذكير جديد</b><label class="muted">نوع التذكير</label><select id="rm-category" style="width:100%;margin:4px 0 10px"><option value=wage>موعد الأجور</option><option value=payment>دفعة مستحقة أو منتظرة</option><option value=advance>سلفة</option><option value=holiday>عطلة</option><option value=appointment>اجتماع أو موعد</option><option value=other>أخرى</option></select><label class="muted">العنوان أو اسم الشخص</label><input id="rm-title" maxlength=120 placeholder="مثلاً: دفع أجور العمال" style="width:100%;margin:4px 0 10px"><label class="muted">التاريخ</label><input id="rm-date" type=date min="'+today()+'" value="'+today()+'" style="width:100%;margin:4px 0 10px"><label class="muted">الوقت</label><input id="rm-time" type=time value="09:00" style="width:100%;margin:4px 0 10px"><p class="muted">سيحاول التطبيق إرسال تنبيه قبل الموعد بـ 15 دقيقة عندما يكون التطبيق مفتوحاً.</p><button class="p" style="width:100%;min-height:46px" onclick="addReminder()">حفظ التذكير</button></div>'+
  '<div class="card"><b>📋 قائمة التذكيرات</b>'+(rows||'<p class="muted">لا توجد تذكيرات بعد. أضف أول تذكير أعلاه.</p>')+'</div><div class="card"><b>🔔 تفعيل الإشعارات</b><p class="muted">اسمح بالإشعارات من هذا الجهاز. لا يحتاج هذا الخيار إلى ربط سحابي.</p><button class="p" onclick="enablePush()">تفعيل الإشعارات</button></div>';
 };
 TABS.reminders=["⏰","التذكيرات"];
 if(!ROLES.employee.tabs.includes("reminders"))ROLES.employee.tabs.splice(3,0,"reminders");
 if(!ROLES.worker.tabs.includes("reminders"))ROLES.worker.tabs.splice(3,0,"reminders");
 VIEWS.reminders=remindersScreen;
})();