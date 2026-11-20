/* rimbook contacts.js - عملاء وموردين */

function addContact(type){
  const name = prompt(type === "client" ? "اسم العميل:" : "اسم المورد:");
  if(!name) return;
  if(!RB.data.contacts) RB.data.contacts = [];
  RB.data.contacts.push({
    id: Date.now().toString(36),
    type, name,
    phone: prompt("الهاتف (اختياري):") || "",
    email: prompt("البريد (اختياري):") || "",
    company: prompt("الشركة (اختياري):") || "",
    notes: ""
  });
  RB.save(); render();
  toast("✅ أضيف " + name);
}
function delContact(id){
  if(!confirm("حذف جهة الاتصال؟")) return;
  RB.data.contacts = (RB.data.contacts || []).filter(c => c.id !== id);
  RB.save(); render();
}
function contactCounts(){
  const c = RB.data.contacts || [];
  return {
    clients: c.filter(x => x.type === "client").length,
    suppliers: c.filter(x => x.type === "supplier").length
  };
}
function contactsScreen(){
  const contacts = RB.data.contacts || [];
  const clients = contacts.filter(c => c.type === "client");
  const suppliers = contacts.filter(c => c.type === "supplier");
  return `
  <div class=grid2>
    <div class=card><small class=muted>👥 عملاء</small><h3>${clients.length}</h3><button class=p style="width:100%;margin-top:6px" onclick="addContact('client')">+ عميل</button></div>
    <div class=card><small class=muted>📦 موردين</small><h3>${suppliers.length}</h3><button class=p style="width:100%;margin-top:6px" onclick="addContact('supplier')">+ مورد</button></div>
  </div>
  <div class=card><b>👥 جهات الاتصال</b>
    ${contacts.map(c => `<div class="item" style="flex-wrap:wrap">
      <span style="flex:1;min-width:140px">
        <b>${esc(c.name)}</b> <span class=tag>${c.type === "client" ? "عميل" : "مورد"}</span>
        ${c.company ? `<br><small class=muted>${esc(c.company)}</small>` : ""}
        ${c.phone ? `<br><small>📞 <a href="tel:${esc(c.phone)}" style="color:var(--ac)">${esc(c.phone)}</a></small>` : ""}
        ${c.email ? `<br><small>📧 <a href="mailto:${esc(c.email)}" style="color:var(--ac)">${esc(c.email)}</a></small>` : ""}
      </span>
      <span>
        ${c.phone ? `<button onclick="open('https://wa.me/${c.phone.replace(/\\D/g,'')}','_blank')">💚</button>` : ""}
        <button class=danger onclick="delContact('${c.id}')">🗑</button>
      </span>
    </div>`).join("") || '<p class=muted>لا جهات اتصال</p>'}
  </div>`;
}
