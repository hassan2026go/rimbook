/* rimbook attachments.js - مرفقات لكل عنصر */

const ATT_DB = (() => {
  let db;
  const open = () => db || (db = new Promise((res, rej) => {
    const q = indexedDB.open("rimbook-att", 1);
    q.onupgradeneeded = () => q.result.createObjectStore("files");
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  }));
  const tx = async (mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction("files", mode);
      const r = fn(t.objectStore("files"));
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    put: (k, v) => tx("readwrite", s => s.put(v, k)),
    get: k => tx("readonly", s => s.get(k)),
    del: k => tx("readwrite", s => s.delete(k))
  };
})();

async function attachFile(itemId, input){
  const f = input.files[0];
  if(!f) return;
  const aid = "att-" + Date.now();
  await ATT_DB.put(aid, { name: f.name, type: f.type, size: f.size, blob: f });
  const item = RB.data.items.find(x => x.id === itemId);
  if(item){
    if(!item.attachments) item.attachments = [];
    item.attachments.push({ aid, name: f.name, type: f.type, size: f.size });
    RB.save();
    render();
    toast("✅ أرفق: " + f.name);
  }
}

async function openAttachment(aid){
  const a = await ATT_DB.get(aid);
  if(!a) return toast("الملف غير موجود");
  const url = URL.createObjectURL(a.blob);
  window.open(url, "_blank");
}

async function delAttachment(itemId, aid){
  await ATT_DB.del(aid);
  const item = RB.data.items.find(x => x.id === itemId);
  if(item && item.attachments){
    item.attachments = item.attachments.filter(x => x.aid !== aid);
    RB.save(); render();
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
