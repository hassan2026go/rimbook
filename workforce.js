/* Rimbook Workforce — workers, attendance, daily work and payroll ledger.
   All worker money movements are append-only work records; corrections use documented reversals. */
(function () {
  "use strict";
  const D = RB.data;
  if (!Array.isArray(D.workers)) D.workers = [];
  if (!Number.isFinite(Number(D.settings.payrollDaysPerWeek))) D.settings.payrollDaysPerWeek = 6;
  if (!Number.isFinite(Number(D.settings.payrollDaysPerMonth))) D.settings.payrollDaysPerMonth = 26;
  RB.save();

  let selectedWorkerId = "";
  const $id = id => document.getElementById(id);
  const val = id => ($id(id)?.value || "").trim();
  const num = id => Number(val(id));
  const today = () => iso(new Date());
  const safe = value => esc(String(value ?? ""));
  const workers = () => (RB.data.workers || []).slice().sort((a,b) => String(a.name).localeCompare(String(b.name), "ar"));
  const projects = () => RB.data.projects || [];
  const projectName = id => projects().find(p => String(p.id) === String(id))?.name || "عام";
  const money = n => Number(n || 0).toLocaleString("ar", {minimumFractionDigits:2, maximumFractionDigits:2}) + " " + safe(RB.data.settings.currency || "USD");
  const workRows = id => RB.all("work").filter(x => String(x.workerId || "") === String(id));
  const digits = value => String(value || "").replace(/[٠-٩۰-۹]/g, ch => {
    const a="٠١٢٣٤٥٦٧٨٩", p="۰۱۲۳۴۵۶۷۸۹", i=a.indexOf(ch); return String(i >= 0 ? i : p.indexOf(ch));
  });
  function summary(id, month) {
    const rows = workRows(id).filter(x => !month || String(x.d || "").startsWith(month));
    const sum = key => rows.reduce((s,x) => s + (Number(x[key]) || 0), 0);
    return {
      rows, days: rows.filter(x => x.k === "work" && !x.isReversal && !x.reversedBy).length,
      holidays: rows.filter(x => x.k === "holiday" && !x.isReversal).length,
      absences: rows.filter(x => x.k === "absence" && !x.isReversal).length,
      overtime: sum("otHours"), due: sum("workerDue"),
      paid: sum("workerPaid"), advances: sum("workerAdvance"),
      balance: sum("workerDue") - sum("workerPaid") - sum("workerAdvance")
    };
  }
  function workerDailyRate(worker) {
    const rate = Number(worker.wageRate) || 0;
    if (worker.wageType === "weekly") return rate / Math.max(1, Number(RB.data.settings.payrollDaysPerWeek) || 6);
    if (worker.wageType === "monthly") return rate / Math.max(1, Number(RB.data.settings.payrollDaysPerMonth) || 26);
    return rate;
  }
  window.rimbookWorkerDailyRate = function (id) {
    const worker = workers().find(w => String(w.id) === String(id));
    return worker ? workerDailyRate(worker) : 0;
  };
  function selectProjects(id) {
    return '<option value="">عام — دون مشروع</option>' + projects().map(p =>
      '<option value="' + safe(p.id) + '" ' + (String(id || "") === String(p.id) ? "selected" : "") + '>' + safe(p.name) + '</option>'
    ).join("");
  }
  function selectWorkers(id, activeOnly=true) {
    const rows = workers().filter(w => !activeOnly || w.active !== false);
    return '<option value="">اختر العامل</option>' + rows.map(w =>
      '<option value="' + safe(w.id) + '" ' + (String(id || "") === String(w.id) ? "selected" : "") + '>' + safe(w.name) + '</option>'
    ).join("");
  }
  function wageLabel(type) { return ({daily:"يومي",weekly:"أسبوعي",monthly:"شهري"})[type] || "يومي"; }

  window.rimbookAddWorker = function () {
    const name = val("wf-name"), phone = digits(val("wf-phone")), email = val("wf-email"), jobTitle = val("wf-job");
    const wageType = val("wf-type"), wageRate = num("wf-rate"), overtimeRate = num("wf-ot");
    if (!name) return toast("اكتب اسم العامل");
    if (!["daily","weekly","monthly"].includes(wageType)) return toast("اختر طريقة الأجر");
    if (!Number.isFinite(wageRate) || wageRate < 0) return toast("أدخل أجراً صحيحاً");
    if (phone && phone.replace(/\D/g,"").length < 7) return toast("تحقق من رقم الهاتف");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return toast("تحقق من البريد الإلكتروني");
    const worker = {
      id: "w" + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      name, phone, email, jobTitle, wageType, wageRate,
      overtimeRate: Number.isFinite(overtimeRate) && overtimeRate >= 0 ? overtimeRate : null,
      projectId: val("wf-project") || null, notes: val("wf-notes"),
      active: true, createdAt: Date.now()
    };
    if (!RB.transact(data => { if (!Array.isArray(data.workers)) data.workers=[]; data.workers.push(worker); })) return;
    render(); toast("تمت إضافة العامل وحفظ ملفه");
  };

  window.rimbookEditWorker = function (id) {
    const worker = workers().find(w => String(w.id) === String(id));
    if (!worker) return;
    const name = prompt("اسم العامل", worker.name || "");
    if (name === null) return;
    if (!name.trim()) return toast("اسم العامل مطلوب");
    const phone = prompt("رقم الهاتف مع رمز الدولة", worker.phone || "");
    if (phone === null) return;
    const jobTitle = prompt("التخصص أو المهنة", worker.jobTitle || "");
    if (jobTitle === null) return;
    const email = prompt("البريد الإلكتروني", worker.email || "");
    if (email === null) return;
    if (!RB.transact(data => {
      const row = data.workers.find(w => String(w.id) === String(id));
      if (row) { row.name=name.trim(); row.phone=digits(phone); row.jobTitle=jobTitle.trim(); row.email=email.trim(); }
    })) return;
    render(); toast("تم تحديث ملف العامل");
  };

  window.rimbookArchiveWorker = function (id) {
    const worker = workers().find(w => String(w.id) === String(id));
    if (!worker) return;
    const next = worker.active === false;
    if (!confirm(next ? "إعادة تفعيل هذا العامل؟" : "أرشفة العامل؟ ستبقى جميع سجلاته وحساباته محفوظة.")) return;
    if (!RB.transact(data => { const row=data.workers.find(w=>String(w.id)===String(id)); if(row)row.active=next; })) return;
    render();
  };

  window.rimbookSelectWorker = function (id) {
    selectedWorkerId = id || "";
    go("workday");
  };

  window.rimbookRegisterWorkday = function () {
    const worker = workers().find(w => String(w.id) === String(val("wd-worker")) && w.active !== false);
    if (!worker) return toast("اختر عاملاً نشطاً");
    const date = val("wd-date") || today(), status = val("wd-status");
    const planned = Number(RB.data.settings.normalHoursPerDay) || 8;
    const normalHours = num("wd-hours"), lateHours = num("wd-late"), otHours = num("wd-ot");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return toast("تحقق من التاريخ");
    if (!["work","holiday","absence"].includes(status)) return toast("اختر حالة الدوام");
    if (![normalHours,lateHours,otHours].every(Number.isFinite) || normalHours < 0 || lateHours < 0 || otHours < 0 || normalHours > 24 || lateHours > 24 || otHours > 24 || lateHours > normalHours) {
      return toast("تحقق من ساعات العمل والتأخير والإضافي");
    }
    const daily = workerDailyRate(worker);
    const holidayPercent = Math.min(100, Math.max(0, Number(RB.data.settings.holidayPayPercent) || 0));
    const base = status === "work" ? daily * Math.max(0, normalHours - lateHours) / planned
      : status === "holiday" ? daily * holidayPercent / 100 : 0;
    const otRate = worker.overtimeRate == null ? Number(RB.data.settings.otRate) || 0 : Number(worker.overtimeRate) || 0;
    const overtimeEnabled = !!RB.data.settings.overtimeEnabled;
    const overtimePay = overtimeEnabled ? otHours * otRate : 0;
    const workerDue = Math.max(0, base + overtimePay);
    const labels = {work:"يوم عمل",holiday:"عطلة",absence:"غياب"};
    const row = {
      type:"work", k:status, d:date, ds:labels[status] + " — " + worker.name,
      workerId:worker.id, person:worker.name, project:val("wd-project") || worker.projectId || null,
      normalHours:status==="work"?normalHours:0, lateHours:status==="work"?lateHours:0,
      otHours:status==="work"?otHours:0, overtimePay, overtimeRate:otRate,
      workerDue, workerPaid:0, workerAdvance:0, created:Date.now()
    };
    if (!RB.add(row)) return;
    render();
    toast("تم تسجيل " + labels[status] + " للعامل " + worker.name + (otHours && !overtimeEnabled ? "؛ سُجلت ساعات الإضافي دون أجر لأن سياسة الإضافي متوقفة" : ""));
  };

  window.rimbookCopyWorkerContact = async function (value) {
    try { await navigator.clipboard.writeText(String(value || "")); toast("تم نسخ بيانات الاتصال"); }
    catch (e) { toast("تعذر النسخ؛ انسخ البيانات يدوياً"); }
  };

  window.rimbookWorkerMoney = function (id, kind) {
    const worker = workers().find(w => String(w.id) === String(id));
    if (!worker || !["paid","advance"].includes(kind)) return;
    const raw = prompt(kind === "paid" ? "المبلغ المدفوع للعامل" : "مبلغ السلفة المقدمة للعامل", "");
    if (raw === null) return;
    const amount = Number(digits(raw).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return toast("أدخل مبلغاً صحيحاً أكبر من صفر");
    const note = prompt("بيان الحركة (اختياري)", kind === "paid" ? "تسديد أجور" : "سلفة للعامل");
    if (note === null) return;
    const row = {
      type:"work", k:kind === "paid" ? "worker_payment" : "worker_advance",
      d:today(), ds:note.trim() || (kind === "paid" ? "تسديد أجور" : "سلفة للعامل"),
      workerId:worker.id, person:worker.name, project:worker.projectId || null,
      workerDue:0, workerPaid:kind === "paid" ? amount : 0,
      workerAdvance:kind === "advance" ? amount : 0, created:Date.now()
    };
    if (!RB.add(row)) return;
    render(); toast(kind === "paid" ? "تم تسجيل دفعة العامل" : "تم تسجيل السلفة");
  };

  window.rimbookSavePayrollSettings = function () {
    const week = num("pay-days-week"), month = num("pay-days-month");
    if (!Number.isInteger(week) || week < 1 || week > 7 || !Number.isInteger(month) || month < 1 || month > 31) {
      return toast("أيام العمل يجب أن تكون أرقاماً صحيحة ضمن الحدود");
    }
    if (!RB.transact(data => {
      data.settings.payrollDaysPerWeek = week;
      data.settings.payrollDaysPerMonth = month;
    })) return;
    render(); toast("تم حفظ إعدادات دورة الأجور");
  };

  VIEWS.workers = function () {
    const active = workers().filter(w => w.active !== false), archived = workers().filter(w => w.active === false);
    const cards = workers().map(w => {
      const s = summary(w.id), phone = digits(w.phone).replace(/\D/g,"");
      const actions = '<button type="button" onclick="rimbookSelectWorker(\''+safe(w.id)+'\')">سجل العمل</button>' +
        '<button type="button" onclick="rimbookWorkerMoney(\''+safe(w.id)+'\',\'paid\')">تسديد أجور</button>' +
        '<button type="button" onclick="rimbookWorkerMoney(\''+safe(w.id)+'\',\'advance\')">سلفة</button>' +
        '<button type="button" onclick="rimbookEditWorker(\''+safe(w.id)+'\')">تعديل</button>' +
        '<button type="button" onclick="rimbookArchiveWorker(\''+safe(w.id)+'\')">'+(w.active===false?"إعادة تفعيل":"أرشفة")+'</button>';
      return '<div class="card"><div class="row" style="justify-content:space-between"><b>'+safe(w.name)+'</b><span class="tag '+(w.active===false?"bad":"ok")+'">'+(w.active===false?"مؤرشف":"نشط")+'</span></div>' +
        '<p class="muted">'+safe(w.jobTitle||"دون تخصص")+' · أجر '+wageLabel(w.wageType)+' '+money(w.wageRate)+'</p>' +
        '<p>المستحق '+money(s.due)+' · المدفوع '+money(s.paid)+' · السلف '+money(s.advances)+'</p><h3>الرصيد المتبقي: '+money(s.balance)+'</h3>' +
        (w.projectId?'<p class="muted">المشروع: '+safe(projectName(w.projectId))+'</p>':"") +
        (w.phone?'<div class="row"><a href="tel:'+safe(w.phone)+'">📞 اتصال</a><a target="_blank" rel="noopener" href="https://wa.me/'+phone+'">واتساب</a><a href="sms:'+safe(w.phone)+'">SMS</a><button type="button" onclick="rimbookCopyWorkerContact('+JSON.stringify(w.phone)+')">نسخ الرقم</button></div>':"") +
        (w.email?'<div class="row"><a href="mailto:'+safe(w.email)+'">البريد الإلكتروني</a><button type="button" onclick="rimbookCopyWorkerContact('+JSON.stringify(w.email)+')">نسخ البريد</button></div>':"") +
        '<div class="row">'+actions+'</div></div>';
    }).join("");
    return '<div class="card"><b style="font-size:17px">👷 إدارة العمال والموظفين</b><p class="muted">ملف مستقل لكل عامل، مرتبط بيومية العمل والمشروع والأجور والدفعات والسلف. الأرشفة تحفظ السجلات ولا تحذفها.</p>' +
      '<div class="grid2"><div class="card">العمال النشطون<h3>'+active.length+'</h3></div><div class="card">المؤرشفون<h3>'+archived.length+'</h3></div></div></div>' +
      '<div class="card"><b>إضافة عامل أو موظف</b><label class="muted">الاسم الكامل</label><input id="wf-name" maxlength="120" placeholder="اسم العامل" style="width:100%;margin:4px 0 10px">' +
      '<label class="muted">رقم الهاتف</label><input id="wf-phone" type="tel" inputmode="tel" placeholder="+..." style="width:100%;margin:4px 0 10px">' +
      '<label class="muted">البريد الإلكتروني</label><input id="wf-email" type="email" placeholder="example@email.com" style="width:100%;margin:4px 0 10px">'+
      '<label class="muted">التخصص أو المهنة</label><input id="wf-job" maxlength="100" placeholder="مثلاً: كهربائي، نجار، محاسب" style="width:100%;margin:4px 0 10px">' +
      '<label class="muted">نظام الأجر</label><select id="wf-type" style="width:100%;margin:4px 0 10px"><option value="daily">يومي</option><option value="weekly">أسبوعي</option><option value="monthly">شهري</option></select>' +
      '<label class="muted">قيمة الأجر حسب النظام المختار</label><input id="wf-rate" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" style="width:100%;margin:4px 0 10px">' +
      '<label class="muted">أجر ساعة الإضافي (اختياري)</label><input id="wf-ot" type="number" min="0" step="0.01" placeholder="يستخدم إعداد الشركة عند تركه فارغاً" style="width:100%;margin:4px 0 10px">' +
      '<label class="muted">المشروع الافتراضي</label><select id="wf-project" style="width:100%;margin:4px 0 10px">'+selectProjects("")+'</select>' +
      '<label class="muted">ملاحظات</label><textarea id="wf-notes" rows="2" style="width:100%;margin:4px 0 10px"></textarea>' +
      '<button class="p" style="width:100%;min-height:46px" onclick="rimbookAddWorker()">حفظ ملف العامل</button></div>' +
      '<div class="card"><b>قائمة العمال ('+workers().length+')</b>'+(cards||'<p class="muted">لا يوجد عمال بعد. أضف أول ملف أعلاه.</p>')+'</div>';
  };

  VIEWS.workday = function () {
    const worker = workers().find(w => String(w.id) === String(selectedWorkerId));
    const settings = RB.data.settings;
    const rows = RB.all("work").filter(x => x.workerId).slice().sort((a,b) => String(b.d||"").localeCompare(String(a.d||""))).slice(0,80);
    const history = rows.map(x => '<div class="item"><span><b>'+safe(x.person||workers().find(w=>w.id===x.workerId)?.name||"عامل")+'</b> · '+safe(x.ds||x.k)+'<br><small class="muted">'+safe(x.d)+' · '+(x.normalHours||0)+' ساعة عادية · '+(x.otHours||0)+' إضافي · المستحق '+money(x.workerDue)+'</small></span></div>').join("");
    return '<div class="card"><b style="font-size:17px">📅 جدول العمل واليومية</b><p class="muted">سجّل الحضور أو العطلة أو الغياب، والساعات العادية والإضافية والتأخير. تُحسب المستحقات وفق نظام أجر العامل وسياسة الشركة.</p>' +
      '<label class="muted">العامل</label><select id="wd-worker" style="width:100%;margin:4px 0 10px" onchange="rimbookSetSelectedWorker(this.value)">'+selectWorkers(selectedWorkerId)+'</select>' +
      '<label class="muted">التاريخ</label><input id="wd-date" type="date" value="'+today()+'" style="width:100%;margin:4px 0 10px">' +
      '<label class="muted">حالة الدوام</label><select id="wd-status" style="width:100%;margin:4px 0 10px"><option value="work">عمل وحضور</option><option value="holiday">عطلة</option><option value="absence">غياب</option></select>' +
      '<div class="grid2"><div><label class="muted">الساعات العادية</label><input id="wd-hours" type="number" min="0" max="24" step="0.25" value="'+(Number(settings.normalHoursPerDay)||8)+'" style="width:100%;margin:4px 0 10px"></div>' +
      '<div><label class="muted">ساعات التأخير</label><input id="wd-late" type="number" min="0" max="24" step="0.25" value="0" style="width:100%;margin:4px 0 10px"></div>' +
      '<div><label class="muted">الساعات الإضافية</label><input id="wd-ot" type="number" min="0" max="24" step="0.25" value="0" style="width:100%;margin:4px 0 10px"></div>' +
      '<div><label class="muted">المشروع</label><select id="wd-project" style="width:100%;margin:4px 0 10px">'+selectProjects(worker?.projectId||"")+'</select></div></div>' +
      '<p class="muted">الأجر الأسبوعي يُقسم على أيام العمل الأسبوعية المحددة، والشهري على أيام العمل الشهرية المحددة. الإضافي لا يُحتسب مالياً إلا عند تفعيله في الإعدادات.</p>' +
      '<button class="p" style="width:100%;min-height:46px" onclick="rimbookRegisterWorkday()">حفظ اليومية</button></div>' +
      '<div class="card"><b>آخر سجلات اليومية</b>'+(history||'<p class="muted">لا توجد سجلات عمل بعد.</p>')+'</div>';
  };

  VIEWS.payroll = function () {
    const month = val("payroll-month") || today().slice(0,7);
    const selected = selectedWorkerId ? workers().filter(w=>String(w.id)===String(selectedWorkerId)) : workers();
    const rows = selected.map(w => { const s=summary(w.id,month); return '<div class="card"><b>'+safe(w.name)+'</b><p class="muted">'+s.days+' يوم عمل · '+s.holidays+' عطلة · '+s.absences+' غياب · '+s.overtime+' ساعة إضافية</p><div class="grid2"><div>المستحق<h3>'+money(s.due)+'</h3></div><div>المدفوع<h3>'+money(s.paid)+'</h3></div><div>السلف<h3>'+money(s.advances)+'</h3></div><div>المتبقي<h3>'+money(s.balance)+'</h3></div></div></div>'; }).join("");
    const totals = selected.reduce((a,w)=>{const s=summary(w.id,month);a.due+=s.due;a.paid+=s.paid;a.advances+=s.advances;a.balance+=s.balance;return a;},{due:0,paid:0,advances:0,balance:0});
    return '<div class="card"><b style="font-size:17px">💰 كشف الأجور الشهري</b><label class="muted">الشهر</label><input id="payroll-month" type="month" value="'+safe(month)+'" onchange="render()" style="width:100%;margin:4px 0 10px">' +
      '<button type="button" onclick="selectedWorkerId=\'\';go(\'workers\')">كل العمال</button> <button type="button" onclick="window.print()">طباعة الكشف</button></div>' +
      '<div class="grid2"><div class="card">إجمالي المستحق<h3>'+money(totals.due)+'</h3></div><div class="card">إجمالي المدفوع<h3>'+money(totals.paid)+'</h3></div><div class="card">السلف<h3>'+money(totals.advances)+'</h3></div><div class="card">الرصيد المتبقي<h3>'+money(totals.balance)+'</h3></div></div>' +
      (rows||'<div class="card"><p class="muted">لا توجد بيانات أجور لهذا الشهر.</p></div>');
  };

  window.rimbookWorkforceSettings = function () {
    const s=RB.data.settings;
    return '<div class="card"><b>سياسة دورة الأجور</b><p class="muted">تُستخدم هذه القيم لتحويل الأجر الأسبوعي أو الشهري إلى قيمة يومية عند احتساب اليومية. غيّرها وفق أيام العمل الفعلية في شركتك.</p>' +
      '<label class="muted">أيام العمل في الأسبوع</label><input id="pay-days-week" type="number" min="1" max="7" step="1" value="'+(Number(s.payrollDaysPerWeek)||6)+'" style="width:100%;margin:4px 0 10px">' +
      '<label class="muted">أيام العمل في الشهر</label><input id="pay-days-month" type="number" min="1" max="31" step="1" value="'+(Number(s.payrollDaysPerMonth)||26)+'" style="width:100%;margin:4px 0 10px">' +
      '<button class="p" onclick="rimbookSavePayrollSettings()">حفظ سياسة دورة الأجور</button></div>';
  };
  const oldSettings = VIEWS.settings;
  VIEWS.settings = function () { return oldSettings() + window.rimbookWorkforceSettings() + (typeof langPicker === "function" ? langPicker() : ""); };

  TABS.workers=["👷","العمال"];
  TABS.workday=["📅","اليومية"];
  TABS.payroll=["💰","الأجور"];
  ROLES.employee.tabs.splice(Math.max(0,ROLES.employee.tabs.indexOf("projects")+1),0,"workers","workday","payroll");
  ROLES.worker.tabs = ROLES.worker.tabs.filter(tab => tab !== "ledger");
  VIEWS.workers = VIEWS.workers;
  render();
})();
