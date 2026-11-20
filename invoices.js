/* rimbook invoices.js - فواتير PDF احترافية */

const INV_CURRENCIES = { "$":"USD","€":"EUR","TL":"TRY","SAR":"SAR","AED":"AED","ل.س":"SYP" };

function invoiceNumber(projId){
  const invs = RB.data.invoices || [];
  const projInvs = invs.filter(i => i.project === projId);
  return String(projInvs.length + 1).padStart(4, "0");
}

function createInvoice(projId){
  const proj = RB.data.projects.find(p => p.id === projId);
  if(!proj) return toast("اختر مشروعاً أولاً");
  if(!RB.data.invoices) RB.data.invoices = [];
  const inv = {
    id: Date.now().toString(36),
    project: projId,
    number: invoiceNumber(projId),
    date: iso(new Date()),
    dueDate: iso(new Date(Date.now() + 30*864e5)),
    client: "",
    items: [],
    tax: 0,
    discount: 0,
    notes: "",
    paid: false,
    createdAt: new Date().toISOString()
  };
  RB.data.invoices.push(inv);
  RB.save();
  render();
  toast("✅ فاتورة جديدة #" + inv.number);
}

function addInvoiceItem(invId){
  const inv = RB.data.invoices.find(i => i.id === invId);
  if(!inv) return;
  const desc = prompt("وصف البند:");
  if(!desc) return;
  const qty = parseFloat(prompt("الكمية:", "1") || "1");
  const price = parseFloat(prompt("السعر:", "0") || "0");
  inv.items.push({ desc, qty, price });
  RB.save(); render();
}

function invoiceTotals(inv){
  const sub = inv.items.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0);
  const tax = sub * (inv.tax || 0) / 100;
  const disc = sub * (inv.discount || 0) / 100;
  return { sub, tax, disc, total: sub + tax - disc };
}

function printInvoice(invId){
  const inv = RB.data.invoices.find(i => i.id === invId);
  if(!inv) return;
  const proj = RB.data.projects.find(p => p.id === inv.project);
  const p = RB.data.profile;
  const s = RB.data.settings;
  const T = invoiceTotals(inv);
  const cur = s.currency;

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>فاتورة #${inv.number}</title>
<style>
  @media print{ @page{ margin:1cm; size:A4; } }
  body{ font-family:system-ui,Tahoma; padding:30px; max-width:800px; margin:auto; color:#1e293b; }
  .header{ display:flex; justify-content:space-between; align-items:start; border-bottom:3px solid #2563eb; padding-bottom:16px; margin-bottom:20px; }
  .logo{ font-size:28px; font-weight:bold; color:#2563eb; font-family:Georgia,serif; }
  .info{ text-align:left; font-size:13px; line-height:1.7; }
  .info b{ color:#1e293b; }
  .meta{ display:flex; justify-content:space-between; margin-bottom:20px; font-size:13px; }
  .meta div{ background:#f1f5f9; padding:10px 14px; border-radius:8px; }
  table{ width:100%; border-collapse:collapse; margin:16px 0; }
  th{ background:#2563eb; color:white; padding:10px; text-align:right; font-size:12px; }
  td{ border:1px solid #e2e8f0; padding:10px; font-size:13px; }
  .totals{ text-align:left; margin-top:16px; }
  .totals table{ width:280px; margin-left:auto; }
  .totals td{ border:none; padding:6px 10px; }
  .totals tr:last-child td{ border-top:2px solid #2563eb; font-size:16px; font-weight:bold; color:#f43f5e; }
  .footer{ margin-top:40px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:11px; color:#64748b; text-align:center; }
  .paid-stamp{ color:#10b981; font-size:24px; border:3px solid #10b981; padding:8px 20px; border-radius:8px; display:inline-block; transform:rotate(-15deg); font-weight:bold; }
</style></head><body>

<div class="header">
  <div>
    <div class="logo">📖 rimbook</div>
    <div style="font-size:12px;color:#64748b;margin-top:4px">${esc(p.name || "المزود")}</div>
  </div>
  <div class="info">
    ${p.phone ? `<div>📞 ${esc(p.phone)}</div>` : ""}
    ${p.email ? `<div>📧 ${esc(p.email)}</div>` : ""}
    ${p.city ? `<div>📍 ${esc(p.city)}</div>` : ""}
  </div>
</div>

<div class="meta">
  <div><b>فاتورة #:</b> ${inv.number}</div>
  <div><b>التاريخ:</b> ${inv.date}</div>
  <div><b>الاستحقاق:</b> ${inv.dueDate}</div>
  ${proj ? `<div><b>المشروع:</b> ${esc(proj.name)}</div>` : ""}
</div>

${inv.client ? `<p><b>العميل:</b> ${esc(inv.client)}</p>` : ""}

<table>
  <thead><tr><th>#</th><th>الوصف</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
  <tbody>
    ${inv.items.map((it, i) => `<tr>
      <td>${i+1}</td>
      <td>${esc(it.desc)}</td>
      <td>${it.qty}</td>
      <td>${it.price} ${cur}</td>
      <td>${(it.qty*it.price).toFixed(2)} ${cur}</td>
    </tr>`).join("") || "<tr><td colspan=5 style='text-align:center;color:#94a3b8'>لا بنود</td></tr>"}
  </tbody>
</table>

<div class="totals">
  <table>
    <tr><td>المجموع الفرعي:</td><td>${T.sub.toFixed(2)} ${cur}</td></tr>
    ${inv.tax ? `<tr><td>الضريبة (${inv.tax}%):</td><td>${T.tax.toFixed(2)} ${cur}</td></tr>` : ""}
    ${inv.discount ? `<tr><td>الخصم (${inv.discount}%):</td><td>-${T.disc.toFixed(2)} ${cur}</td></tr>` : ""}
    <tr><td>الإجمالي:</td><td>${T.total.toFixed(2)} ${cur}</td></tr>
  </table>
</div>

${inv.paid ? '<div style="text-align:center;margin-top:20px"><span class="paid-stamp">مدفوعة ✅</span></div>' : ""}

${inv.notes ? `<p style="margin-top:20px;padding:12px;background:#f8fafc;border-radius:8px"><b>ملاحظات:</b><br>${esc(inv.notes)}</p>` : ""}

<div class="footer">
  ${esc(p.about || "")}<br>
  صُنعت بواسطة <b>rimbook</b>
</div>

</body></html>`;

  const file = new File([new Blob([html], {type:"text/html"})],
    `invoice-${inv.number}-${inv.date}.html`, {type:"text/html"});

  if(navigator.canShare && navigator.canShare({files:[file]})){
    navigator.share({files:[file], title:"فاتورة #"+inv.number})
      .catch(() => openPrintWindow(html));
  } else {
    openPrintWindow(html);
  }
}

function openPrintWindow(html){
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.print(); } catch(e){} }, 500);
}

/* عرض الفواتير في شاشة المشروع */
function invoicesSection(projId){
  const invs = (RB.data.invoices || []).filter(i => !projId || i.project === projId);
  if(!projId) return "";
  return `<div class=card>
    <b>🧾 الفواتير (${invs.length})</b>
    <div class=row style="margin-top:8px"><button class=p onclick="createInvoice('${projId}')">+ فاتورة جديدة</button></div>
    ${invs.map(inv => {
      const T = invoiceTotals(inv);
      return `<div style="border:1px solid var(--bd);border-radius:8px;padding:10px;margin-top:8px">
        <div class=row style="justify-content:space-between">
          <b>#${inv.number}</b>
          <span class=tag>${inv.paid ? "✅ مدفوعة" : "⏳ معلقة"}</span>
        </div>
        <small class=muted>${inv.date} · ${T.total.toFixed(2)} ${RB.data.settings.currency}</small>
        <div class=row style="margin-top:6px">
          <button onclick="addInvoiceItem('${inv.id}')">+ بند</button>
          <button class=p onclick="printInvoice('${inv.id}')">🖨️ طباعة/PDF</button>
          <button onclick="togglePaid('${inv.id}')">${inv.paid ? "↩️ إلغاء" : "✅ دفع"}</button>
          <button class=danger onclick="delInvoice('${inv.id}')">🗑</button>
        </div>
      </div>`;
    }).join("") || '<p class=muted>لا فواتير بعد</p>'}
  </div>`;
}
function togglePaid(id){
  const inv = RB.data.invoices.find(i => i.id === id);
  if(inv){ inv.paid = !inv.paid; RB.save(); render(); }
}
function delInvoice(id){
  if(!confirm("حذف الفاتورة؟")) return;
  RB.data.invoices = RB.data.invoices.filter(i => i.id !== id);
  RB.save(); render();
             }
