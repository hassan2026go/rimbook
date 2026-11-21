/* Rimbook unified notebook: notes, appointments and reminders in one working area.
   Existing records keep their original types and IDs; no migration deletes old data. */
(function () {
  "use strict";
  let mode = "note";
  const $id = id => document.getElementById(id);
  const value = id => ($id(id)?.value || "").trim();
  const today = () => iso(new Date());
  const safe = value => esc(String(value ?? ""));
  const projects = () => Array.isArray(RB.data.projects) ? RB.data.projects : [];
  const projectOptions = () => '<option value="">عام — غير مرتبط بمشروع</option>' +
    projects().map(p => '<option value="' + safe(p.id) + '" ' +
      (RB.data.activeProject === p.id ? "selected" : "") + '>' + safe(p.name) + '</option>').join("");
  const records = () => RB.all("note").concat(RB.all("event"))
    .slice().sort((a, b) => String(b.d || "").localeCompare(String(a.d || "")) ||
      Number(b.created || 0) - Number(a.created || 0));
  const categoryLabel = key => ({
    wage: "موعد أجور", payment: "دفعة", advance: "سلفة",
    holiday: "عطلة", appointment: "موعد", other: "تذكير"
  }[key] || "موعد");

  window.notebookSetMode = function (next) {
    if (!["note", "appointment", "reminder"].includes(next)) return;
    mode = next;
    render();
  };

  window.notebookAdd = function () {
    const title = value("nb-title");
    const date = value("nb-date") || today();
    const time = value("nb-time");
    const project = value("nb-project") || null;
    if (mode === "note") {
      const body = value("nb-body");
      if (!body) return toast("اكتب نص الملاحظة أولاً");
      if (!RB.add({ type: "note", title, body, d: today(), project })) return;
      toast("تم حفظ الملاحظة");
    } else {
      if (!title) return toast("اكتب عنوان الموعد أو التذكير");
      if (date < today()) return toast("اختر اليوم أو تاريخاً قادماً");
      const reminderCategory = mode === "reminder" ? (value("nb-category") || "other") : "";
      if (!RB.add({
        type: "event", title, d: date, t: time || "09:00", project,
        reminderCategory, notebookKind: mode, reminderEnabled: mode === "reminder",
        reminderLead: 15, notebookEntry: true
      })) return;
      toast(mode === "reminder" ? "تم حفظ التذكير" : "تم حفظ الموعد");
    }
    render();
  };

  window.notebookEdit = function (id) {
    const row = RB.data.items.find(x => String(x.id) === String(id) && x.type === "event");
    if (!row) return;
    const title = prompt("عنوان الموعد أو التذكير", row.title || "");
    if (title === null) return;
    const date = prompt("التاريخ بصيغة YYYY-MM-DD", row.d || today());
    if (date === null) return;
    const time = prompt("الوقت بصيغة HH:MM", row.t || "09:00");
    if (time === null) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return toast("تحقق من صيغة التاريخ والوقت");
    if (!RB.patch(id, { title: title.trim(), d: date, t: time })) return;
    render(); toast("تم تعديل السجل");
  };

  window.notebookDelete = function (id) {
    const row = RB.data.items.find(x => String(x.id) === String(id));
    if (!row || !["note", "event"].includes(row.type)) return;
    if (!confirm("هل تريد حذف هذا السجل؟")) return;
    if (!RB.remove(id)) return;
    render();
  };

  window.notebookToggleReminder = function (id, enabled) {
    if (!RB.patch(id, { reminderEnabled: !!enabled })) return;
    render();
    toast(enabled ? "تم تفعيل التذكير" : "تم إيقاف التذكير");
  };

  window.notebookScreen = function () {
    const rows = records();
    const noteCount = rows.filter(x => x.type === "note").length;
    const eventCount = rows.filter(x => x.type === "event" && !x.reminderCategory).length;
    const reminderCount = rows.filter(x => x.type === "event" && x.reminderCategory).length;
    const form = mode === "note"
      ? '<label class="muted" for="nb-title">عنوان الملاحظة (اختياري)</label>' +
        '<input id="nb-title" maxlength="140" placeholder="مثلاً: ملاحظات اجتماع" style="width:100%;margin:4px 0 10px">' +
        '<label class="muted" for="nb-body">نص الملاحظة</label>' +
        '<textarea id="nb-body" rows="5" maxlength="12000" placeholder="اكتب ملاحظتك هنا..." style="width:100%;margin:4px 0 10px"></textarea>'
      : '<label class="muted" for="nb-title">' + (mode === "reminder" ? "عنوان التذكير أو اسم الشخص" : "عنوان الموعد") + '</label>' +
        '<input id="nb-title" maxlength="140" placeholder="اكتب العنوان" style="width:100%;margin:4px 0 10px">' +
        '<div class="grid2"><div><label class="muted" for="nb-date">التاريخ</label><input id="nb-date" type="date" min="' + today() + '" value="' + today() + '" style="width:100%;margin:4px 0 10px"></div>' +
        '<div><label class="muted" for="nb-time">الوقت</label><input id="nb-time" type="time" value="09:00" style="width:100%;margin:4px 0 10px"></div></div>' +
        (mode === "reminder"
          ? '<label class="muted" for="nb-category">نوع التذكير</label><select id="nb-category" style="width:100%;margin:4px 0 10px"><option value="wage">موعد الأجور</option><option value="payment">دفعة</option><option value="advance">سلفة</option><option value="holiday">عطلة</option><option value="appointment">اجتماع أو موعد</option><option value="other">أخرى</option></select><p class="muted">التنبيه المحلي يعتمد على إذن الإشعارات وتشغيل التطبيق أو المتصفح.</p>'
          : "");
    const list = rows.map(x => {
      const isNote = x.type === "note";
      const label = isNote ? "ملاحظة" : (x.reminderCategory ? categoryLabel(x.reminderCategory) : "موعد");
      const details = isNote
        ? '<p style="white-space:pre-wrap">' + safe(x.body || "") + '</p>' +
          (typeof attachmentsSection === "function" ? attachmentsSection(x) : "") +
          (typeof noteSpeakBtn === "function" ? noteSpeakBtn(x) : "")
        : '<p class="muted">' + safe(x.d || "") + ' · ' + safe(x.t || "") + '</p>' +
          (x.reminderCategory
            ? '<label class="muted"><input type="checkbox" ' + (x.reminderEnabled !== false ? "checked" : "") +
              ' onchange="notebookToggleReminder(\'' + safe(x.id) + '\',this.checked)"> تفعيل التنبيه</label>'
            : "");
      return '<div class="item" style="display:block;padding:10px 0"><div class="row" style="justify-content:space-between"><b>' +
        safe(x.title || label) + '</b><span class="tag">' + label + '</span></div><small class="muted">' +
        safe(x.d || "") + ' · ' + safe((projects().find(p => p.id === x.project) || {}).name || "عام") +
        '</small>' + details + '<div class="row">' +
        (isNote ? '<button type="button" onclick="editNote(\'' + safe(x.id) + '\')">تعديل</button>' :
          '<button type="button" onclick="notebookEdit(\'' + safe(x.id) + '\')">تعديل</button>') +
        '<button class="danger" type="button" onclick="notebookDelete(\'' + safe(x.id) + '\')">حذف</button></div></div>'
    }).join("");
    return '<div class="card"><b style="font-size:17px">📒 المفكرة والسجل اليومي</b>' +
      '<p class="muted">مكان واحد للملاحظات والمواعيد والتذكيرات والمرفقات، مع ربط السجلات بالمشاريع عند الحاجة.</p>' +
      '<div class="grid3"><div class="card">ملاحظات<h3>' + noteCount + '</h3></div><div class="card">مواعيد<h3>' + eventCount + '</h3></div><div class="card">تذكيرات<h3>' + reminderCount + '</h3></div></div></div>' +
      '<div class="card"><b>إضافة سجل جديد</b><div class="strip" style="margin:8px 0">' +
      '<button type="button" class="' + (mode === "note" ? "p" : "") + '" onclick="notebookSetMode(\'note\')">📝 ملاحظة</button>' +
      '<button type="button" class="' + (mode === "appointment" ? "p" : "") + '" onclick="notebookSetMode(\'appointment\')">📅 موعد</button>' +
      '<button type="button" class="' + (mode === "reminder" ? "p" : "") + '" onclick="notebookSetMode(\'reminder\')">⏰ تذكير</button></div>' +
      form + '<label class="muted" for="nb-project">المشروع (اختياري)</label><select id="nb-project" style="width:100%;margin:4px 0 12px">' + projectOptions() + '</select>' +
      '<button class="p" type="button" style="width:100%;min-height:46px" onclick="notebookAdd()">حفظ السجل</button></div>' +
      '<div class="card"><b>السجل المحفوظ (' + rows.length + ')</b>' +
      (list || '<p class="muted">لا توجد سجلات بعد.</p>') + '</div>';
  };

  // Redirect all former entry points to the unified notebook without breaking old links.
  const originalGo = window.go;
  window.go = function (route) {
    const aliases = { agenda: "notebook", notes: "notebook", reminders: "notebook" };
    return originalGo(aliases[route] || route);
  };
  delete VIEWS.habits;
  delete TABS.habits;
  TABS.notebook = ["📒", "المفكرة"];
  ["employee", "worker"].forEach(role => {
    const old = ROLES[role].tabs.filter(tab => !["agenda", "notes", "reminders", "habits"].includes(tab));
    const at = Math.max(0, old.indexOf("tasks") + 1);
    old.splice(at, 0, "notebook");
    ROLES[role].tabs = old;
  });
  VIEWS.notebook = window.notebookScreen;
  if (["agenda", "notes", "reminders", "habits"].includes(view)) view = "notebook";
  render();
})();
