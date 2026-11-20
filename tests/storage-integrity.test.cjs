const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const source = fs.readFileSync("app.js", "utf8");
const start = source.indexOf("const RB = (() => {");
assert.notEqual(start, -1, "RB core must exist in app.js");
const endMarker = "\n})();";
const end = source.indexOf(endMarker, start);
assert.notEqual(end, -1, "RB core must close correctly");
const core = source.slice(start, end + endMarker.length) + "\nthis.RB = RB;";

function createHarness(initial = "{}") {
  let stored = initial;
  let failWrites = false;
  const messages = [];
  const localStorage = {
    getItem(key) { return key === "rimbook.v6" ? stored : null; },
    setItem(key, value) {
      if (failWrites) {
        const error = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      }
      if (key === "rimbook.v6") stored = String(value);
    }
  };
  const sandbox = {
    localStorage,
    toast(message) { messages.push(String(message)); },
    window: {},
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String
  };
  vm.runInNewContext(core, sandbox, { filename: "app.js#RB" });
  return {
    RB: sandbox.RB,
    messages,
    get stored() { return stored; },
    failWrites(value) { failWrites = value; }
  };
}

{
  const h = createHarness();
  const row = h.RB.add({ type: "work", k: "payment", rec: 12.5 });
  assert.ok(row && row.id, "successful add returns the saved row");
  assert.equal(h.RB.data.items.length, 1);
  assert.equal(JSON.parse(h.stored).items.length, 1);
}

{
  const h = createHarness();
  h.RB.add({ type: "work", k: "payment", rec: 10 });
  const before = h.stored;
  h.failWrites(true);
  const result = h.RB.add({ type: "work", k: "advance", advance: 5 });
  assert.equal(result, null, "failed add must not report success");
  assert.equal(h.RB.data.items.length, 1, "failed add must roll back in memory");
  assert.equal(h.stored, before, "failed add must not replace the last saved data");
  assert.ok(h.messages.some(m => m.includes("لم تُحفظ العملية")), "user must receive a clear failure warning");
}

{
  const h = createHarness();
  h.RB.add({ type: "work", k: "work", due: 50 });
  const before = h.stored;
  h.failWrites(true);
  const ok = h.RB.transact(data => {
    data.items.push({ type: "work", k: "payment", rec: 20 });
    data.items.push({ type: "work", k: "advance", advance: 10 });
  });
  assert.equal(ok, false);
  assert.equal(h.RB.data.items.length, 1, "failed multi-record transaction must roll back every row");
  assert.equal(h.stored, before);
}

{
  const h = createHarness();
  const row = h.RB.add({ type: "work", k: "payment", rec: 25 });
  h.failWrites(true);
  assert.equal(h.RB.patch(row.id, { rec: 250 }), false);
  assert.equal(h.RB.data.items[0].rec, 25, "failed edit must restore the old amount");
  assert.equal(h.RB.remove(row.id), false);
  assert.equal(h.RB.data.items.length, 1, "failed delete must retain the financial record");
}

{
  const first = createHarness();
  first.RB.add({ type: "work", k: "payment", rec: 7.25 });
  const reopened = createHarness(first.stored);
  assert.equal(reopened.RB.data.items.length, 1, "saved records must load after app restart");
  assert.equal(reopened.RB.data.items[0].rec, 7.25);
}


{
  const voiceLedger = fs.readFileSync("voice-ledger.js", "utf8");
  const helperStart = voiceLedger.indexOf("function applyWorkReversal(");
  const helperEnd = voiceLedger.indexOf("\n}", helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart, "financial reversal helper must exist for transaction integration");
  const helperSource = voiceLedger.slice(helperStart, helperEnd + 2);
  const applyWorkReversal = vm.runInNewContext("(" + helperSource + ")");
  const reverseStart = voiceLedger.indexOf("window.reverseWorkEntry=function(id){");
  const reverseEnd = voiceLedger.indexOf("\n};", reverseStart);
  assert.ok(reverseStart >= 0 && reverseEnd > reverseStart, "reverse action handler must exist");
  const reverseSource = voiceLedger.slice(reverseStart, reverseEnd + 3);
  const h = createHarness();
  const original = h.RB.add({ type: "work", id: "work-to-reverse", k: "payment", rec: 40, d: "2026-11-21" });
  assert.ok(original);
  let rendered = 0;
  const context = {
    RB: h.RB,
    window: {},
    prompt() { return "تصحيح مبلغ الدفعة"; },
    confirm() { return true; },
    applyWorkReversal,
    JSON,
    Date,
    Math,
    render() { rendered++; },
    toast(message) { h.messages.push(String(message)); }
  };
  vm.runInNewContext(reverseSource + ";", context);
  const savedSnapshot = h.stored;
  h.failWrites(true);
  context.window.reverseWorkEntry("work-to-reverse");
  assert.equal(h.RB.data.items.length, 1, "failed reversal save must remove the staged reversal row");
  assert.equal(h.RB.data.items[0].reversedBy, undefined, "failed reversal save must restore original metadata");
  assert.equal(h.stored, savedSnapshot, "failed reversal save must preserve persisted financial data");
  assert.equal(rendered, 0, "failed reversal must not refresh as if it succeeded");
  h.failWrites(false);
  context.window.reverseWorkEntry("work-to-reverse");
  assert.equal(h.RB.data.items.length, 2, "successful retry must save the reversal exactly once");
  assert.equal(h.RB.data.items[0].reversedBy, h.RB.data.items[1].id);
  assert.equal(h.RB.data.items[1].rec, -40);
  assert.equal(rendered, 1);
}

console.log("Storage integrity tests passed.");
