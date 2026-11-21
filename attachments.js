/* rimbook attachments.js - مرفقات لكل عنصر */
const ATT_DB = (() => {
  let db;
  const open = () => db || (db = new Promise((res, rej) => {
    const q = indexedDB.open("rimbook-att", 1);
    q.onupgradeneeded = () => {
      if (!q.result.objectStoreNames.contains("files")) q.result.createObjectStore("files");
    };
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error || new Error("تعذر فتح قاعدة المرفقات"));
    q.onblocked = () => rej(new Error("قاعدة المرفقات مشغولة في نافذة أخرى"));
  }));
  const tx = async (mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      let request;
      let settled = false;
      const finishError = error => {
        if (settled) return;
        settled = true;
        rej(error || new Error("فشلت معاملة المرفقات"));
      };
      let t;
      try {
        t = d.transaction("files", mode);
        request = fn(t.objectStore("files"));
      } catch (error) {
        finishError(error);
        return;
      }
      t.oncomplete = () => {
        if (settled) return;
        settled = true;
        res(request && request.result);
      };
      t.onerror = () => finishError(t.error);
      t.onabort = () => finishError(t.error);
    });
  };
  return {
    put: (k, v) => tx("readwrite", s => s.put(v, k)),
    get: k => tx("readonly", s => s.get(k)),
    del: k => tx("readwrite", s => s.delete(k))
  };
})();

async function attachFile(itemId, input){
  const f = input.files && input.files[0];
  if(!f) return;
  const item = RB.data.items.find(x => String(x.id) === String(itemId));
  if(!item){ toast("لم نعثر على السجل المراد إرفاق الملف به"); input.value=""; return; }
  const aid = "att-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8);
  try {
    await ATT_DB.put(aid, { name: f.name, type: f.type, size: f.size, blob: f });
    const saved = RB.transact(data => {
      const target = data.items.find(x => String(x.id) === String(itemId));
      if(!target) throw new Error("السجل لم يعد موجوداً");
      if(!Array.isArray(target.attachments)) target.attachments = [];
      target.attachments.push({ aid, name: f.name, type: f.type, size: f.size });
    });
    if(!saved){
      try { await ATT_DB.del(aid); }
      catch(error){ toast("لم يُربط الملف بالسجل، وتعذر تنظيف الملف المؤقت؛ أعد النسخ الاحتياطي بعد مراجعة المرفقات."); }
      return;
    }
    render();
    toast("✅ أُرفق: " + f.name);
  } catch(error) {
    toast("تعذر إرفاق الملف: " + (error.message || "خطأ في التخزين"));
  } finally {
    input.value = "";
  }
}

async function openAttachment(aid){
  try {
    const a = await ATT_DB.get(aid);
    if(!a || !a.blob) return toast("الملف غير موجود");
    const url = URL.createObjectURL(a.blob);
    const opened = window.open(url, "_blank");
    if(!opened) toast("اسمح بفتح النوافذ لعرض المرفق");
  } catch(error) {
    toast("تعذر فتح المرفق: " + (error.message || "خطأ في التخزين"));
  }
}

async function delAttachment(itemId, aid){
  const item = RB.data.items.find(x => String(x.id) === String(itemId));
  if(!item || !(item.attachments || []).some(att => String(att.aid) === String(aid))) {
    return toast("لم نعثر على المرفق المرتبط بهذا السجل");
  }
  const saved = RB.transact(data => {
    const target = data.items.find(x => String(x.id) === String(itemId));
    if(!target || !Array.isArray(target.attachments)) throw new Error("السجل أو المرفق لم يعد موجوداً");
    const before = target.attachments.length;
    target.attachments = target.attachments.filter(att => String(att.aid) !== String(aid));
    if(target.attachments.length === before) throw new Error("لم يتم العثور على المرفق");
  });
  if(!saved) return;
  try {
    await ATT_DB.del(aid);
    render();
    toast("تم حذف المرفق");
  } catch(error) {
    render();
    toast("أزيل ارتباط المرفق من السجل، لكن تعذر حذف الملف المخزن؛ أنشئ نسخة احتياطية ثم أعد المحاولة");
  }
}

function attachmentsSection(item){
  const atts = item.attachments || [];
  return `<div style="margin-top:8px;border-top:1px dashed var(--bd);padding-top:6px">
    <small class=muted>📎 المرفقات (${atts.length})</small>
    <div class=row style="margin-top:4px">
      <label class="tag" style="cursor:pointer;padding:6px 10px">+ صورة/ملف
        <input type="file" hidden accept="image/*,application/pdf,audio/*" onchange="attachFile('${item.id}', this)">
      </label>
    </div>
    ${atts.map(a => `<div class=item style="border:none;padding:4px 0">
      <span>${a.type.startsWith("image") ? "🖼️" : a.type === "application/pdf" ? "📄" : a.type.startsWith("audio") ? "🎵" : "📎"} ${esc(a.name)} <small class=muted>(${Math.round(a.size/1024)} KB)</small></span>
      <button onclick="openAttachment('${a.aid}')">👁️</button>
      <button onclick="delAttachment('${item.id}','${a.aid}')">🗑</button>
    </div>`).join("")}
  </div>`;
}
