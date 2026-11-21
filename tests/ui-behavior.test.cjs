const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const activation = fs.readFileSync("activation.js", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const pro = fs.readFileSync("pro.js", "utf8");
const voiceLedger = fs.readFileSync("voice-ledger.js", "utf8");
const invoices = fs.readFileSync("invoices.js", "utf8");
const receipts = fs.readFileSync("receipts.js", "utf8");
const workforce = fs.readFileSync("workforce.js", "utf8");
const notebook = fs.readFileSync("notebook.js", "utf8");
const push = fs.readFileSync("push.js", "utf8");
const backup = fs.readFileSync("backup.js", "utf8");
const sync = fs.readFileSync("sync.js", "utf8");
const purchases = fs.readFileSync("purchases.js", "utf8");

const reversalMatch = voiceLedger.match(/function applyWorkReversal\(data,id,reason,now,newId\)\{[\s\S]*?\n\}/);
assert.ok(reversalMatch, "financial reversal helper must exist");
const applyWorkReversal = vm.runInNewContext("(" + reversalMatch[0] + ")");

function extractFunction(source, name) {
  const match = source.match(new RegExp("function " + name + "\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}"));
  assert.ok(match, name + " helper must exist");
  return vm.runInNewContext("(" + match[0] + ")");
}

const projectOptions = extractFunction(activation, "projectOptions");
const goalProgress = extractFunction(activation, "goalProgress");
const normMatch = app.match(/function normalizeSearchText\(value\) \{[\s\S]*?\n\}/);
assert.ok(normMatch, "Arabic search normalization must exist");
const normalizeSearchText = vm.runInNewContext("(" + normMatch[0] + ")");
assert.equal(normalizeSearchText("  أَحْمَد   مُحَمَّد  "), "احمد محمد");

{
  const result = projectOptions([], null);
  assert.equal(result.hasProjects, false);
  assert.equal(result.options.length, 1);
  assert.equal(result.options[0][0], "");
  assert.match(result.options[0][1], /عام/);
  assert.equal(result.selected, "");
}

{
  const projects = [
    { id: "p1", name: "مشروع البناء" },
    { id: "p2", name: "مشروع الزراعة" }
  ];
  const result = projectOptions(projects, "p2");
  assert.equal(result.hasProjects, true);
  assert.deepEqual(Array.from(result.options, row => Array.from(row)), [
    ["", "عام — غير مرتبط بمشروع"],
    ["p1", "مشروع البناء"],
    ["p2", "مشروع الزراعة"]
  ]);
  assert.equal(result.selected, "p2");
  assert.equal(projectOptions(projects, "deleted-project").selected, "");
}

{
  const result = goalProgress(2, 10);
  assert.equal(result.percent, 20);
  assert.equal(result.remaining, 8);
  assert.equal(result.exceeded, false);
}

{
  const result = goalProgress(12, 10);
  assert.equal(result.percent, 100);
  assert.equal(result.remaining, 0);
  assert.equal(result.exceeded, true);
}

{
  const result = goalProgress(-4, 0);
  assert.equal(result.done, 0);
  assert.equal(result.total, 0);
  assert.equal(result.percent, 0);
}

assert.match(activation, /ماذا تريد أن تنجز؟/);
assert.match(activation, /كم تريد أن تنجز؟/);
assert.match(activation, /كم أنجزت حتى الآن؟/);
assert.match(activation, /حفظ الإنجاز/);
assert.ok(activation.includes("toggleGoalCustomUnit(this.value)"));
assert.ok(activation.includes("gcustomunit-label"));
assert.match(activation, /عام.*غير مرتبط بمشروع/);
assert.match(activation, /saveProfilePhoto\(this\)/);
assert.match(activation, /saveProfileField\(/);
assert.match(pro, /home-profile/);
assert.match(activation, /project:selectedProject\(\)/);
assert.match(activation, /data\.items\.forEach\(row=>\{if\(row\.project===id\)row\.project=null;\}\)/);
assert.match(pro, /const projectSelect=\$\("pproject"\)/);
assert.ok(pro.includes('aria-label="فتح الملف الشخصي"'));
assert.ok(!pro.includes('id="proSearch"'), "only one unified search box should be installed");
assert.ok(app.includes("RB.data.goals||[]"));
assert.ok(app.includes("RB.data.habits||[]"));
assert.ok(app.includes('kind==="goal"'));
assert.ok(app.includes('event:"موعد"'));
assert.match(pro, /pill\("مباشر","ok"\)/);

assert.ok(activation.includes('row.type==="work"'));
assert.ok(activation.includes("بقيد عكسي موثق"));
assert.ok(voiceLedger.includes('row.type==="work"'));
assert.ok(voiceLedger.includes("لن يؤثر ذلك في أي حركة مالية"));
assert.ok(invoices.includes("الحذف النهائي للفواتير متوقف"));
assert.ok(activation.includes("ستبقى جميع السجلات والفواتير محفوظة"));
assert.ok(activation.includes("reverseWorkEntry"));
assert.ok(voiceLedger.includes("تصحيح بقيد عكسي"));
assert.ok(voiceLedger.includes("تم عكسه بقيد موثق"));
assert.ok(voiceLedger.includes("countedRows.filter(w=>w.k===\"work\")"));
assert.ok(receipts.includes("ملغى بقيد عكسي موثق"));

{
  const data = { items: [{ type: "work", id: "pay-1", k: "payment", d: "2026-11-20", rec: 100, due: 0, advance: 0, expense: 0, ds: "دفعة" }] };
  const result = applyWorkReversal(data, "pay-1", "المبلغ أُدخل خطأ", 1234, "rev-1");
  assert.equal(result.ok, true);
  assert.equal(data.items.length, 2);
  assert.equal(data.items[0].rec, 100, "original amount must remain unchanged");
  assert.equal(data.items[0].reversedBy, "rev-1");
  assert.equal(data.items[1].rec, -100, "reversal must offset the original amount");
  assert.equal(data.items[1].reversalOf, "pay-1");
  assert.equal(data.items[1].correctionReason, "المبلغ أُدخل خطأ");
  assert.equal(data.items.reduce((sum, row) => sum + row.rec, 0), 0, "net received amount must return to zero");
  const duplicate = applyWorkReversal(data, "pay-1", "محاولة ثانية", 2345, "rev-2");
  assert.equal(duplicate.ok, false, "an original entry can only be reversed once");
  assert.equal(data.items.length, 2);
  const reverseOfReverse = applyWorkReversal(data, "rev-1", "محاولة عكس العكس", 3456, "rev-3");
  assert.equal(reverseOfReverse.ok, false, "a reversal entry cannot itself be reversed");
  assert.equal(data.items.length, 2);
}

{
  const data = { items: [{ type: "work", id: "work-1", k: "work", due: 75, overtimePay: 15, otHours: 1.5, normalHours: 8 }] };
  const result = applyWorkReversal(data, "work-1", "تصحيح ساعات العمل", 1234, "rev-work");
  assert.equal(result.ok, true);
  assert.equal(data.items[1].due, -75);
  assert.equal(data.items[1].overtimePay, -15);
  assert.equal(data.items[1].otHours, -1.5);
  assert.equal(data.items[1].normalHours, -8);
  assert.equal(data.items.reduce((sum, row) => sum + row.due, 0), 0, "net due must be offset");
}

{
  const data = { items: [{ type: "work", id: "pay-2", k: "payment", rec: 10 }] };
  const result = applyWorkReversal(data, "pay-2", "لا", 1234, "rev-short");
  assert.equal(result.ok, false, "a meaningful reason is required");
  assert.equal(data.items.length, 1, "invalid correction must not change data");
}

assert.ok(pro.includes('if(profile.role==="worker")'), "worker must receive a dedicated simplified home screen");
for (const action of ["work", "holiday", "payment", "advance", "expense"]) {
  assert.ok(pro.includes("voiceLedgerQuick(\\'" + action + "\\')"), "worker home must expose the " + action + " quick action");
}
assert.ok(pro.includes("voiceLedgerStart()"), "worker home must expose speech input");
assert.ok(pro.includes("مراجعة حسابي وسجل الحركات"), "worker home must provide a clear route to their ledger");
assert.ok(voiceLedger.includes("راجع ما فهمه التطبيق قبل الحفظ"), "speech entries must be reviewed before saving");


{
  const confirmStart = voiceLedger.indexOf("window.voiceLedgerConfirm=function(){");
  const confirmEnd = voiceLedger.indexOf("\n};", confirmStart);
  assert.ok(confirmStart >= 0 && confirmEnd > confirmStart, "voice confirmation handler must exist");
  const confirmSource = voiceLedger.slice(confirmStart, confirmEnd + 3);
  function voiceConfirmHarness(saveOk) {
    const data = { items: [] };
    let rendered = 0;
    const messages = [];
    const context = {
      pending: { date: "2026-11-21", raw: "اليوم عمل واصل دفعة 10", items: [
        { k: "work", d: "2026-11-21", due: 50 },
        { k: "payment", d: "2026-11-21", rec: 10 }
      ] },
      window: {},
      RB: { transact(mutator) { if (!saveOk) return false; mutator(data); return true; } },
      render() { rendered++; },
      toast(message) { messages.push(message); },
      Date,
      Math
    };
    vm.runInNewContext(confirmSource + ";", context);
    return { context, data, messages, get rendered() { return rendered; } };
  }
  const failed = voiceConfirmHarness(false);
  failed.context.window.voiceLedgerConfirm();
  assert.equal(failed.data.items.length, 0, "failed voice save must not append partial entries");
  assert.ok(failed.context.pending, "failed voice save must keep the review available for retry");
  assert.equal(failed.rendered, 0, "failed voice save must not advance the screen");
  const succeeded = voiceConfirmHarness(true);
  succeeded.context.window.voiceLedgerConfirm();
  assert.equal(succeeded.data.items.length, 3, "two parsed entries and one voice audit log must save together");
  assert.equal(succeeded.data.items[0].voiceText, "اليوم عمل واصل دفعة 10");
  assert.equal(succeeded.data.items[2].type, "voice_log");
  assert.equal(succeeded.context.pending, null, "successful voice save must clear the pending review");
  assert.equal(succeeded.rendered, 1);
}


assert.ok(workforce.includes("VIEWS.workers"), "worker directory must be part of the app");
assert.ok(workforce.includes("VIEWS.workday"), "daily attendance must be part of the app");
assert.ok(workforce.includes("VIEWS.payroll"), "monthly payroll statement must be part of the app");
assert.ok(workforce.includes('wageType === "weekly"'), "weekly wages must be converted using configured workdays");
assert.ok(workforce.includes('wageType === "monthly"'), "monthly wages must be converted using configured workdays");
assert.ok(workforce.includes("workerDue") && workforce.includes("workerPaid") && workforce.includes("workerAdvance"), "worker accruals, payments and advances must remain separate");
assert.ok(workforce.includes("ستبقى جميع سجلاته وحساباته محفوظة"), "worker archiving must preserve historical accounts");
assert.ok(notebook.includes("VIEWS.notebook"), "notes, appointments and reminders must share one notebook screen");
assert.ok(notebook.includes("delete VIEWS.habits") && notebook.includes("delete TABS.habits"), "habits must be removed from the active app");
assert.ok(notebook.includes('agenda: "notebook"') && notebook.includes('notes: "notebook"') && notebook.includes('reminders: "notebook"'), "old navigation links must resolve to the unified notebook");
assert.ok(push.includes("e.reminderEnabled === false"), "disabled reminders must not notify");
assert.ok(pro.includes("مستحقات العمال المتبقية") && pro.includes("إدارة العمال واليومية"), "management dashboard must show worker payroll and routes");


assert.ok(backup.includes("collectRimbookBackup") && backup.includes("restoreRimbookBackup"), "one full backup and restore format must be shared across the app");
assert.ok(backup.includes("ATT_DB.get") && backup.includes("ATT_DB.put"), "full backups must include and restore IndexedDB attachments");
assert.ok(backup.includes("backupEncrypted") && backup.includes("gdriveUpload") && backup.includes("shareFileWhatsApp"), "encrypted, Google Drive and WhatsApp backup routes must use full backups");
assert.ok(sync.includes("rimbook-backup-chunk") && sync.includes("restoreRimbookBackup"), "direct device transfer must carry and restore chunked full backups");
assert.ok(activation.includes("تنزيل نسخة كاملة JSON") && activation.includes("shareFileWhatsApp"), "backup settings must expose complete backup and sharing actions");
{
  const data = { items: [{ type: "work", id: "worker-pay", k: "worker_payment", workerId: "w1", workerDue: 120, workerPaid: 30, workerAdvance: 10, lateHours: 1 }] };
  const result = applyWorkReversal(data, "worker-pay", "تصحيح دفعة العامل", 4567, "worker-rev");
  assert.equal(result.ok, true);
  assert.equal(data.items[1].workerDue, -120);
  assert.equal(data.items[1].workerPaid, -30);
  assert.equal(data.items[1].workerAdvance, -10);
  assert.equal(data.items[1].lateHours, -1);
  assert.equal(data.items[1].workerId, "w1");
}


assert.ok(voiceLedger.includes("window.voiceAudioStart") && voiceLedger.includes("new MediaRecorder"), "the worker voice log must record original microphone audio");
assert.ok(voiceLedger.includes("window.voiceAudioPlay") && voiceLedger.includes("voice-audio-"), "the worker voice log must support playback of saved audio");
assert.ok(voiceLedger.includes("attachments:[{aid,name,type,size:blob.size}]"), "recorded audio must be linked to the backup attachment system");


assert.ok(backup.includes("buildStoredZip") && backup.includes("parseStoredZip"), "full ZIP backup and restore must be implemented");
assert.ok(backup.includes("window.backupZip") && backup.includes("window.restoreZip"), "ZIP actions must be callable from settings");
assert.ok(activation.includes("backupZip()") && activation.includes("restoreZip(this)"), "settings must expose ZIP export and restore");
assert.ok(activation.includes("rimbookCoreSettingsView") && activation.includes("مراكز الإعدادات المتقدمة"), "the settings hub must preserve storage/payroll settings and link to advanced centers");
assert.ok(activation.includes("profile-worker") && app.includes('"workerId"'), "a worker profile must link to its worker record");
assert.ok(pro.includes("profile.workerId") && voiceLedger.includes("workerId=workerMatch?.id"), "worker personal views and voice records must be associated with the correct worker");


assert.ok(purchases.includes("VIEWS.purchases") && purchases.includes("addRimbookPurchase"), "purchases and materials must have a real management screen");
assert.ok(purchases.includes("addPurchasePayment") && purchases.includes("cancelRimbookPurchase"), "supplier payments and cancellations must be recorded rather than deleting purchases");
assert.ok(purchases.includes("window.rimbookProjectPurchasesTotal"), "purchases must roll up into project costs");
assert.ok(app.includes('target.type === "work"') && app.includes("لا يمكن حذف حركة عمل أو حساب"), "financial work records must be protected from hard deletion");
assert.ok(activation.includes('row.status="archived"') && activation.includes("archivedAt=Date.now()"), "project archival must preserve linked records in the active override");
assert.ok(!activation.includes("data.projects=data.projects.filter(p=>p.id!==id)"), "archiving must not hard-delete projects");
assert.ok(pro.includes('id="ptworker"') && workforce.includes("VIEWS.tasks = function"), "tasks must be assignable to workers and filtered in worker view");
assert.ok(pro.includes("purchasesCost") && pro.includes("supplierBalance"), "project and financial reports must include purchases and supplier balances");
assert.ok(workforce.includes('["purchases","المشتريات والمواد"') && workforce.includes('ROLES.worker.tabs=["home","voice","notebook","more"]'), "main navigation must group secondary functions and keep worker access personal");


const calculateWorkerPay = extractFunction(workforce, "calculateWorkerPay");
{
  const fullDay = calculateWorkerPay("work", 100, 8, 0, 8, 2, 15, true, 50);
  assert.deepEqual({...fullDay}, {base:100, overtimePay:30, workerDue:130}, "full day plus two overtime hours");
  const lateDay = calculateWorkerPay("work", 100, 8, 2, 8, 2, 15, true, 50);
  assert.deepEqual({...lateDay}, {base:75, overtimePay:30, workerDue:105}, "late hours reduce base accrual");
  const holiday = calculateWorkerPay("holiday", 100, 8, 0, 8, 2, 15, true, 50);
  assert.deepEqual({...holiday}, {base:50, overtimePay:0, workerDue:50}, "holiday must never receive work overtime pay");
  const absence = calculateWorkerPay("absence", 100, 8, 0, 8, 2, 15, true, 50);
  assert.deepEqual({...absence}, {base:0, overtimePay:0, workerDue:0}, "absence must not accrue base or overtime");
  const disabled = calculateWorkerPay("work", 100, 8, 0, 8, 2, 15, false, 50);
  assert.deepEqual({...disabled}, {base:100, overtimePay:0, workerDue:100}, "disabled overtime must record no overtime pay");
}
assert.ok(workforce.includes("normalHours > planned"), "normal hours cannot exceed configured standard hours");
assert.ok(workforce.includes("!x.reversedBy).length"), "reversed holidays and absences must not remain counted");


const purchaseAccounting = extractFunction(purchases, "purchaseAccounting");
{
  const active = purchaseAccounting({total:0.1+0.2,payments:[{amount:0.1},{amount:0.1}],refunds:[],status:"active"});
  assert.deepEqual({...active}, {paid:0.2, refunded:0, remaining:0.1, netCost:0.3, supplierBalance:0.1}, "supplier balance must use integer cents");
  const cancelled = purchaseAccounting({total:100,payments:[{amount:60}],refunds:[{amount:20}],status:"cancelled"});
  assert.deepEqual({...cancelled}, {paid:60, refunded:20, remaining:0, netCost:40, supplierBalance:0}, "cancelled purchase cost must equal paid minus refunded, with no open supplier liability");
}

assert.ok(workforce.includes("window.rimbookCalculateWorkerPay = calculateWorkerPay"), "voice and quick-entry screens must use the shared payroll calculator");
assert.ok(workforce.includes("const duplicate=workRows(worker.id)"), "a worker must not receive duplicate attendance for the same date");
assert.ok(voiceLedger.includes("window.rimbookCalculateWorkerPay"), "voice and quick entries must calculate worker wages using the shared payroll policy");
assert.ok(voiceLedger.includes("item.workerDue=pay.workerDue"), "quick worker entries must store the same calculated due as daily attendance");
assert.ok(voiceLedger.includes("duplicateAttendance=entries.find"), "voice confirmation must reject duplicate worker attendance");
assert.ok(voiceLedger.includes('row.d===today()&&["work","holiday","absence"].includes(row.k)'), "quick worker entries must reject duplicate attendance for today");

console.log("UI behavior tests passed.");
