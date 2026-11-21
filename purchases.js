/* Rimbook purchases and materials ledger — append-only, project-linked purchasing. */
(function () {
  "use strict";
  if (!Array.isArray(RB.data.purchases)) RB.data.purchases = [];
  RB.save();

  const $ = id => document.getElementById(id);
  const val = id => ($(id)?.value || "").trim();
  const number = id => Number(val(id));
  const today = () => iso(new Date());
  const validDate = value => { if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false; const date=new Date(value+"T00:00:00Z"); return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value; };
  const safe = value => esc(String(value ?? ""));
  const projects = () => RB.data.projects || [];
  const contacts = () => RB.data.contacts || [];
  const purchases = () => (RB.data.purchases || []).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  const money = n => Number(n||0).toLocaleString("ar",{minimumFractionDigits:2,maximumFractionDigits:2})+" "+safe(RB.data.settings.currency||"");
  const cents = value => Math.round((Number(value)||0)*100);
  const moneyValue = value => cents(value)/100;
  const parseAmount = value => {
    const normalized=String(value??"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/٬/g,"").replace(/٫/g,".").replace(/,/g,".");
    return Number(normalized);
  };
  function purchaseAccounting(p) {
    const paidCents=(p.payments||[]).reduce((sum,x)=>sum+cents(x.amount),0);
    const refundedCents=(p.refunds||[]).reduce((sum,x)=>sum+cents(x.amount),0);
    const totalCents=cents(p.total);
    const remainingCents=p.status==="cancelled"?0:Math.max(0,totalCents-paidCents);
    const netCostCents=p.status==="cancelled"?Math.max(0,paidCents-refundedCents):totalCents;
    return {
      paid:paidCents/100, refunded:refundedCents/100,
      remaining:remainingCents/100, netCost:netCostCents/100,
      supplierBalance:remainingCents/100
    };
  }
  function supplierSummary(contactId, rows) {
    const linked=(rows||[]).filter(p=>String(p.contactId||"")===String(contactId||""));
    const totals=linked.reduce((sum,p)=>{
      const a=purchaseAccounting(p);
      sum.totalCents+=cents(p.total);
      sum.paidCents+=cents(a.paid);
      sum.refundedCents+=cents(a.refunded);
      sum.netCostCents+=cents(a.netCost);
      sum.outstandingCents+=cents(a.supplierBalance);
      if(p.status==="cancelled")sum.cancelled++;
      return sum;
    },{totalCents:0,paidCents:0,refundedCents:0,netCostCents:0,outstandingCents:0,cancelled:0});
    return {
      purchases:linked.length,
      total:totals.totalCents/100,
      paid:totals.paidCents/100,
      refunded:totals.refundedCents/100,
      netCost:totals.netCostCents/100,
      outstanding:totals.outstandingCents/100,
      cancelled:totals.cancelled
    };
  }
  window.rimbookSupplierSummary = contactId => supplierSummary(contactId,RB.data.purchases||[]);
  window.rimbookPurchaseAccounting = purchaseAccounting;
  const paid = p => purchaseAccounting(p).paid;
  const refunded = p => purchaseAccounting(p).refunded;
  const remaining = p => purchaseAccounting(p).remaining;

  function appendPurchaseRefund(p,amount,date,id) {
    const paidCents=(p.payments||[]).reduce((sum,x)=>sum+cents(x.amount),0);
    const refundedCents=(p.refunds||[]).reduce((sum,x)=>sum+cents(x.amount),0);
    const refundCents=cents(amount);
    if(!Number.isFinite(Number(amount))||Number(amount)<0||refundCents>Math.max(0,paidCents-refundedCents))return false;
    if(!Array.isArray(p.refunds))p.refunds=[];
    if(refundCents>0)p.refunds.push({id,date,amount:refundCents/100,note:"استرداد عند الإلغاء"});
    return true;
  }
  const netCost = p => purchaseAccounting(p).netCost;

  window.rimbookProjectPurchasesTotal = id => purchases().filter(p=>String(p.projectId||"")===String(id)).reduce((sum,p)=>sum+netCost(p),0);

  window.previewPurchaseTotal = function () {
    const total = Math.max(0,number("buy-qty")) * Math.max(0,number("buy-price"));
    const output=$("buy-total");if(output)output.textContent=money(total);
  };

  window.addRimbookPurchase = function () {
    const item=val("buy-item"),date=val("buy-date")||today(),qty=number("buy-qty"),unitPrice=number("buy-price");
    const paidNow=parseAmount(val("buy-paid")),projectId=val("buy-project")||null,contactId=val("buy-supplier")||null;
    const supplierName=val("buy-supplier-name")||(contacts().find(c=>String(c.id)===String(contactId))?.name||"");
    const total=moneyValue(qty*unitPrice);
    if(!item)return toast("اكتب اسم المادة أو المشتريات");
    if(!validDate(date))return toast("تحقق من تاريخ الشراء وصحته في التقويم");
    if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(unitPrice)||unitPrice<0)return toast("تحقق من الكمية وسعر الوحدة");
    if(!Number.isFinite(paidNow)||paidNow<0||paidNow>total)return toast("الدفعة يجب أن تكون بين صفر وإجمالي الفاتورة");
    const row={
      id:"buy_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
      item, date, qty, unit:val("buy-unit")||"قطعة", unitPrice,total,
      projectId, contactId, supplierName,
      invoiceNumber:val("buy-invoice"), notes:val("buy-notes"),
      payments:paidNow>0?[{id:"pay_"+Date.now().toString(36),date,amount:paidNow,note:"دفعة عند الشراء"}]:[],
      refunds:[],status:"active",createdAt:Date.now()
    };
    if(!RB.transact(data=>{if(!Array.isArray(data.purchases))data.purchases=[];data.purchases.push(row);}))return;
    render();toast("تم تسجيل المشتريات وربطها بالمشروع");
  };

  window.addPurchasePayment = function (id) {
    const row=purchases().find(p=>String(p.id)===String(id));
    if(!row||row.status==="cancelled")return;
    const raw=prompt("المبلغ المدفوع الآن — المتبقي "+remaining(row).toFixed(2),"");
    if(raw===null)return;
    const amount=parseAmount(raw);
    if(!Number.isFinite(amount)||amount<=0||amount>remaining(row))return toast("أدخل مبلغاً صحيحاً لا يتجاوز المتبقي");
    const note=prompt("بيان الدفعة (اختياري)","دفعة للمورد");
    if(note===null)return;
    if(!RB.transact(data=>{
      const p=data.purchases.find(x=>String(x.id)===String(id));
      if(p){if(!Array.isArray(p.payments))p.payments=[];p.payments.push({id:"pay_"+Date.now().toString(36),date:today(),amount,note:note.trim(),createdAt:Date.now()});}
    }))return;
    render();toast("تم تسجيل دفعة المورد");
  };

  window.cancelRimbookPurchase = function (id) {
    const row=purchases().find(p=>String(p.id)===String(id));
    if(!row||row.status==="cancelled")return;
    const reason=prompt("سبب إلغاء الشراء (إلزامي):","");
    if(reason===null)return;
    if(reason.trim().length<3)return toast("اكتب سبب الإلغاء بوضوح");
    const refundable=Math.max(0,paid(row)-refunded(row));
    const raw=prompt("المبلغ المسترد الآن (إن وجد)، الحد المتبقي القابل للاسترداد "+refundable.toFixed(2),String(refundable));
    if(raw===null)return;
    const refund=parseAmount(raw);
    if(!Number.isFinite(refund)||refund<0||refund>refundable)return toast("مبلغ الاسترداد يتجاوز المبلغ المدفوع غير المسترد");
    let applied=false;
    const ok=RB.transact(data=>{
      const p=data.purchases.find(x=>String(x.id)===String(id));
      if(!p||p.status==="cancelled")return;
      if(!appendPurchaseRefund(p,refund,today(),"ref_"+Date.now().toString(36)))return;
      p.status="cancelled";p.cancelledAt=Date.now();p.cancellationReason=reason.trim();
      applied=true;
    });
    if(!ok||!applied)return toast("تغير سجل الشراء قبل الحفظ؛ راجع السجل وحاول مجدداً");
    render();toast("تم إلغاء عملية الشراء مع الاحتفاظ بسجلها وتسويتها");
  };

  VIEWS.purchases = function () {
    const rows=purchases();
    const active=rows.filter(p=>p.status!=="cancelled");
    const total=rows.reduce((sum,p)=>sum+netCost(p),0);
    const paidTotal=rows.reduce((sum,p)=>sum+Math.max(0,paid(p)-refunded(p)),0);
    const outstanding=active.reduce((sum,p)=>sum+remaining(p),0);
    const projectOptions='<option value="">عام — دون مشروع</option>'+projects().map(p=>'<option value="'+safe(p.id)+'">'+safe(p.name)+'</option>').join("");
    const supplierOptions='<option value="">مورد غير مسجل</option>'+contacts().filter(c=>c.type==="supplier"||c.kind==="supplier"||c.role==="supplier").map(c=>'<option value="'+safe(c.id)+'">'+safe(c.name)+'</option>').join("");
    const cards=rows.map(p=>{
      const cancelled=p.status==="cancelled";
      return '<div class="card"><div class="row" style="justify-content:space-between"><b>'+safe(p.item)+'</b><span class="tag '+(cancelled?"bad":"ok")+'">'+(cancelled?"ملغاة":"مسجلة")+'</span></div>'+
        '<small class="muted">'+safe(p.date)+' · '+safe(p.supplierName||"مورد غير مسجل")+' · '+safe(projects().find(x=>String(x.id)===String(p.projectId))?.name||"عام")+'</small>'+
        '<p>'+safe(p.qty)+' '+safe(p.unit)+' × '+money(p.unitPrice)+' = <b>'+money(p.total)+'</b></p>'+
        '<div class="grid3"><div>المدفوع<h3>'+money(Math.max(0,paid(p)-refunded(p)))+'</h3></div><div>المتبقي<h3>'+money(remaining(p))+'</h3></div><div>التكلفة الصافية<h3>'+money(netCost(p))+'</h3></div></div>'+
        (p.invoiceNumber?'<p class="muted">رقم الفاتورة: '+safe(p.invoiceNumber)+'</p>':"")+
        (p.notes?'<p class="muted">'+safe(p.notes)+'</p>':"")+
        (cancelled?'<p class="muted">سبب الإلغاء: '+safe(p.cancellationReason||"")+'</p>':'<div class="row"><button onclick="addPurchasePayment('+JSON.stringify(p.id)+')">تسجيل دفعة</button><button class="danger" onclick="cancelRimbookPurchase('+JSON.stringify(p.id)+')">إلغاء مع تسوية</button></div>')+
        '</div>';
    }).join("");
    return '<div class="card"><b style="font-size:18px">🧱 المشتريات والمواد</b><p class="muted">سجل مشتريات المواد والموردين واربط كل عملية بمشروع. الدفعات والإلغاءات محفوظة كسجل مالي ولا تُحذف العمليات.</p>'+
      '<div class="grid3"><div class="card">التكلفة الصافية<h3>'+money(total)+'</h3></div><div class="card">المدفوع<h3>'+money(paidTotal)+'</h3></div><div class="card">المتبقي للموردين<h3>'+money(outstanding)+'</h3></div></div></div>'+
      '<div class="card"><b>تسجيل شراء جديد</b><label class="muted">المادة أو الخدمة</label><input id="buy-item" maxlength="160" placeholder="مثلاً: إسمنت، كابلات، معدات" style="width:100%;margin:4px 0 10px">'+
      '<label class="muted">المورد</label><select id="buy-supplier" style="width:100%;margin:4px 0 8px">'+supplierOptions+'</select><input id="buy-supplier-name" placeholder="اسم المورد إذا لم يكن مسجلاً" style="width:100%;margin:4px 0 10px">'+
      '<label class="muted">المشروع</label><select id="buy-project" style="width:100%;margin:4px 0 10px">'+projectOptions+'</select>'+
      '<div class="grid2"><div><label class="muted">التاريخ</label><input id="buy-date" type="date" value="'+today()+'" style="width:100%;margin:4px 0 10px"></div><div><label class="muted">رقم فاتورة المورد</label><input id="buy-invoice" placeholder="اختياري" style="width:100%;margin:4px 0 10px"></div>'+
      '<div><label class="muted">الكمية</label><input id="buy-qty" type="number" min="0.001" step="0.001" value="1" oninput="previewPurchaseTotal()" style="width:100%;margin:4px 0 10px"></div><div><label class="muted">الوحدة</label><input id="buy-unit" value="قطعة" placeholder="قطعة، متر، كغ..." style="width:100%;margin:4px 0 10px"></div>'+
      '<div><label class="muted">سعر الوحدة</label><input id="buy-price" type="number" min="0" step="0.01" value="0" oninput="previewPurchaseTotal()" style="width:100%;margin:4px 0 10px"></div><div><label class="muted">المدفوع الآن</label><input id="buy-paid" type="number" min="0" step="0.01" value="0" style="width:100%;margin:4px 0 10px"></div></div>'+
      '<p>الإجمالي المتوقع: <b id="buy-total">'+money(0)+'</b></p><label class="muted">ملاحظات</label><textarea id="buy-notes" rows="2" style="width:100%;margin:4px 0 10px"></textarea>'+
      '<button class="p" style="width:100%;min-height:46px" onclick="addRimbookPurchase()">حفظ عملية الشراء</button></div>'+
      '<div class="card"><b>سجل المشتريات ('+rows.length+')</b>'+(cards||'<p class="muted">لا توجد مشتريات مسجلة بعد.</p>')+'</div>';
  };
  render();
})();
