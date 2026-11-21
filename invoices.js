/* rimbook invoices.js - فواتير PDF احترافية */

const INV_CURRENCIES = { "$":"USD","€":"EUR","TL":"TRY","SAR":"SAR","AED":"AED","ل.س":"SYP" };
const invoiceCents = value => Math.round((Number(value)||0)*100);
function parseInvoiceAmount(value){
  const normalized=String(value??"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/٬/g,"").replace(/٫/g,".").replace(/,/g,".");
  return Number(normalized);
}
  function invoicePaymentSummary(inv) {
  const rows=RB.all("work").filter(row=>String(row.invoiceId||"")===String(inv.id));
  const paidCents=rows.reduce((sum,row)=>sum+invoiceCents(row.rec),0);
  const totalCents=invoiceCents(invoiceTotals(inv).total);
  const recognizedPaid=Math.max(0,paidCents);
  return {
    total:totalCents/100,paid:recognizedPaid/100,
    remaining:Math.max(0,totalCents-recognizedPaid)/100,
    overpaid:Math.max(0,recognizedPaid-totalCents)/100,
    status:totalCents>0&&paidCents>=totalCents?"paid":paidCents>0?"partial":inv.paid?"legacy":"unpaid",
    paymentRows:rows.length
    };
  }
window.rimbookInvoiceSummary=invoicePaymentSummary;

function customerInvoiceSummary(contact,invoices,contacts) {
  if(!contact)return {invoices:0,total:0,paid:0,remaining:0,overpaid:0,unpaid:0,partial:0,paidInvoices:0};
  const allInvoices=Array.isArray(invoices)?invoices:[];
  const allContacts=Array.isArray(contacts)?contacts:[];
  const norm=value=>String(value||"").normalize("NFKC").trim().replace(/\s+/g," ").toLocaleLowerCase();
  const sameName=allContacts.filter(row=>row.type==="client"&&norm(row.name)===norm(contact.name));
  const linked=allInvoices.filter(inv=>{
    const ids=[inv.clientContactId,inv.contactId,inv.customerId].filter(value=>value!==undefined&&value!==null&&String(value)!=="").map(String);
    if(ids.length)return ids.includes(String(contact.id));
    return sameName.length===1&&norm(inv.client)===norm(contact.name);
    });
  const summaries=linked.map(invoicePaymentSummary);
  const cents=value=>Math.round((Number(value)||0)*100);
  const sum=key=>summaries.reduce((total,row)=>total+cents(row[key]),0)/100;
  return {
    invoices:linked.length,total:sum("total"),paid:sum("paid"),remaining:sum("remaining"),overpaid:sum("overpaid"),
    unpaid:summaries.filter(row=>row.status==="unpaid"||row.status==="legacy").length,
    partial:summaries.filter(row=>row.status==="partial").length,
    paidInvoices:summaries.filter(row=>row.status==="paid").length
    };
  }
window.rimbookCustomerInvoiceSummary=customerInvoiceSummary;

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
  const rawQty=prompt("الكمية:", "1");
  if(rawQty===null)return;
  const qty=Number(rawQty);
  const rawPrice=prompt("السعر:", "0");
  if(rawPrice===null)return;
  const price=parseInvoiceAmount(rawPrice);
  if(!Number.isFinite(qty)||qty<=0)return toast("الكمية يجب أن تكون رقماً أكبر من صفر");
  if(!Number.isFinite(price)||price<0)return toast("أدخل سعراً صحيحاً لا يقل عن صفر");
  inv.items.push({ desc:desc.trim(), qty, price:invoiceCents(price)/100 });
  RB.save(); render();
}

  function invoiceTotals(inv) {
  const subCents=(inv.items||[]).reduce((sum,it)=>sum+invoiceCents((Number(it.qty)||0)*(Number(it.price)||0)),0);
  const taxRate=Math.min(100,Math.max(0,Number(inv.tax)||0));
  const discountRate=Math.min(100,Math.max(0,Number(inv.discount)||0));
  const taxCents=Math.round(subCents*taxRate/100);
  const discountCents=Math.round(subCents*discountRate/100);
  return {sub:subCents/100,tax:taxCents/100,disc:discountCents/100,total:(subCents+taxCents-discountCents)/100};
  }
function recordInvoicePayment(invId){
  const inv=RB.data.invoices.find(row=>String(row.id)===String(invId));
  if(!inv)return toast("لم نعثر على الفاتورة");
  const summary=invoicePaymentSummary(inv);
  if(summary.remaining<=0)return toast("الفاتورة مسددة بالكامل");
  if(summary.status==="legacy")toast("تنبيه: الفاتورة معلّمة مدفوعة قديماً دون حركة قبض موثقة؛ سيتم تسجيل القبض الفعلي الآن.");
  const raw=prompt("مبلغ الدفعة — المتبقي "+summary.remaining.toFixed(2),summary.remaining.toFixed(2));
  if(raw===null)return;
  const amount=parseInvoiceAmount(raw),amountCents=invoiceCents(amount);
  if(!Number.isFinite(amount)||amountCents<=0||amountCents>invoiceCents(summary.remaining))return toast("أدخل مبلغاً صحيحاً لا يتجاوز الرصيد المتبقي");
  const row=RB.add({
    type:"work",k:"payment",d:iso(new Date()),ds:"دفعة فاتورة #"+String(inv.number||inv.id),
    due:0,rec:amountCents/100,advance:0,expense:0,project:inv.project||null,
    person:inv.client||"",invoiceId:inv.id,invoiceNumber:inv.number||""
  });
  if(!row)return;
  render();toast("تم تسجيل الدفعة في سجل المقبوضات وربطها بالفاتورة دون تكرار");
}

function printInvoice(invId){
  const inv = RB.data.invoices.find(i => i.id === invId);
  if(!inv) return;
  const proj = RB.data.projects.find(p => p.id === inv.project);
  const p = RB.data.profile;
  const s = RB.data.settings;
  const T = invoiceTotals(inv);
  const P = invoicePaymentSummary(inv);
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

${P.status==="paid" ? '<div style="text-align:center;margin-top:20px"><span class="paid-stamp">مدفوعة بالكامل ✅</span></div>' : '<div style="margin-top:20px;padding:12px;background:#f8fafc;border-radius:8px"><b>حالة السداد:</b> '+(P.status==="partial"?"دفعة جزئية":P.status==="legacy"?"معلّمة مدفوعة سابقاً دون قبض موثق":"غير مسددة")+'<br><b>المقبوض الموثق:</b> '+P.paid.toFixed(2)+' '+cur+'<br><b>المتبقي:</b> '+P.remaining.toFixed(2)+' '+cur+(P.overpaid>0?'<br><b>زيادة قبض تحتاج تسوية:</b> '+P.overpaid.toFixed(2)+' '+cur:'')+'</div>'}

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
          <span class=tag>${invoicePaymentSummary(inv).status==="paid" ? "✅ مدفوعة" : invoicePaymentSummary(inv).status==="partial" ? "دفعة جزئية" : invoicePaymentSummary(inv).status==="legacy" ? "مدفوعة قديماً — قبض غير موثق" : "⏳ غير مسددة"}</span>
        </div>
        <small class=muted>${inv.date} · الإجمالي ${T.total.toFixed(2)} ${RB.data.settings.currency} · المقبوض ${invoicePaymentSummary(inv).paid.toFixed(2)} · المتبقي ${invoicePaymentSummary(inv).remaining.toFixed(2)}${invoicePaymentSummary(inv).overpaid>0?" · زيادة قبض "+invoicePaymentSummary(inv).overpaid.toFixed(2):""}</small>
        <div class=row style="margin-top:6px">
          <button onclick="addInvoiceItem('${inv.id}')">+ بند</button>
          <button class=p onclick="printInvoice('${inv.id}')">🖨️ طباعة/PDF</button>
          ${invoicePaymentSummary(inv).remaining>0 ? '<button class=p onclick="recordInvoicePayment(\''+inv.id+'\')">تسجيل دفعة</button>' : '<span class=tag>مكتملة السداد</span>'}
          <button class=danger onclick="delInvoice('${inv.id}')" title="الحذف النهائي متوقف حفاظاً على الحقوق" aria-label="الحذف النهائي متوقف">🔒</button>
        </div>
      </div>`;
    }).join("") || '<p class=muted>لا فواتير بعد</p>'}
  </div>`;
}
function delInvoice(id){
  const invoice=RB.data.invoices.find(i=>String(i.id)===String(id));
  if(!invoice)return toast("لم نعثر على الفاتورة");
  toast("الحذف النهائي للفواتير متوقف حفاظاً على الحقوق. سنوفر إلغاءً موثقاً يحتفظ بأثر الفاتورة بدلاً من محوها.");
}
