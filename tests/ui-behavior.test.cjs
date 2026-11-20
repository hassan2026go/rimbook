const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const activation = fs.readFileSync("activation.js", "utf8");
const pro = fs.readFileSync("pro.js", "utf8");
const voiceLedger = fs.readFileSync("voice-ledger.js", "utf8");
const invoices = fs.readFileSync("invoices.js", "utf8");

function extractFunction(source, name) {
  const match = source.match(new RegExp("function " + name + "\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}"));
  assert.ok(match, name + " helper must exist");
  return vm.runInNewContext("(" + match[0] + ")");
}

const projectOptions = extractFunction(activation, "projectOptions");
const goalProgress = extractFunction(activation, "goalProgress");

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
assert.match(activation, /عام.*غير مرتبط بمشروع/);
assert.match(activation, /saveProfilePhoto\(this\)/);
assert.match(activation, /saveProfileField\(/);
assert.match(pro, /home-profile/);
assert.match(activation, /project:selectedProject\(\)/);
assert.match(activation, /data\.items\.forEach\(row=>\{if\(row\.project===id\)row\.project=null;\}\)/);
assert.match(pro, /const projectSelect=\$\("pproject"\)/);
assert.ok(pro.includes('aria-label="فتح الملف الشخصي"'));
assert.match(pro, /pill\("مباشر","ok"\)/);

assert.ok(activation.includes('row.type==="work"'));
assert.ok(activation.includes("بقيد عكسي موثق"));
assert.ok(voiceLedger.includes('row.type==="work"'));
assert.ok(voiceLedger.includes("لن يؤثر ذلك في أي حركة مالية"));
assert.ok(invoices.includes("الحذف النهائي للفواتير متوقف"));
assert.ok(activation.includes("ستبقى جميع السجلات والفواتير محفوظة"));

console.log("UI behavior tests passed.");
