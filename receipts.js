/* Rimbook — receipts tied to the real work ledger */
(function(){
 "use strict";
 const D=RB.data;
 const escv=v=>esc(String(v??""));
 const today=()=>iso(new Date());
 const labels={payment:"استلام مبلغ",advance:"تسليم سلفة",expense:"دفع مصروف",worker_payment:"تسديد أجر عامل",worker_advance:"سلفة عامل"};
 const amountOf=x=>x.k==="worker_payment"?Number(x.workerPaid)||0:x.k==="worker_advance"?Number(x.workerAdvance)||0:x.k==="payment"?Number(x.rec)||0:x.k==="advance"?Number(x.advance)||0:Number(x.expense)||0;
 window.selectExistingReceipt=function(id){
  const row=RB.all("work").find(w=>w.id===id&&["payment","advance","expense","worker_payment","worker_advance"].includes(w.k)&&!w.receiptNo);
  const kind=document.getElementById("rc-kind"),amount=document.getElementById("rc-amount"),date=document.getElementById("rc-date"),note=document.getElementById("rc-note");
  if(kind){kind.disabled=!!row;if(row)kind.value=row.k;}
  if(amount){amount.readOnly=!!row;amount.value=row?String(amountOf(row)):"";}
  if(date){date.readOnly=!!row;date.value=row?(row.d||today()):today();}
  if(note&&row)note.value=row.receiptNote||row.ds||"";
  if(!row&&note)note.value="";
 };
 const money=n=>Number(n||0).toLocaleString("ar",{minimumFractionDigits:2,maximumFractionDigits:2})+" "+escv(D.settings.currency||"");
 function receiptHtml(x){
  const title=labels[x.k]||"إيصال مالي";
  return '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>إيصال '+escv(x.receiptNo)+'</title><style>body{font-family:Tahoma,Arial,sans-serif;color:#111;margin:0;padding:24px}.paper{max-width:620px;margin:auto;border:2px solid #222;border-radius:14px;padding:26px}h1{text-align:center;margin:0 0 6px;font-size:24px}.muted{color:#555;text-align:center}.line{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid #ddd;padding:12px 0}.amount{text-align:center;font-size:27px;font-weight:bold;margin:24px 0}.note{white-space:pre-wrap;min-height:44px}.sign{display:flex;justify-content:space-between;margin-top:50px}@media print{body{padding:0}.paper{border:1px solid #222;max-width:none}}</style><div class="paper"><h1>Rimbook</h1><p class="muted">إيصال مالي</p><div class="line"><b>رقم الإيصال</b><span>'+escv(x.receiptNo)+'</span></div>'+(x.reversedBy?'<div class="line"><b>حالة الإيصال</b><span style="color:#b91c1c;font-weight:bold">ملغى بقيد عكسي موثق — '+escv(x.reversedBy)+'</span></div>':'')+'<div class="line"><b>نوع الحركة</b><span>'+title+'</span></div><div class="line"><b>استلمنا من / سلّمنا إلى</b><span>'+escv(x.person||"—")+'</span></div><div class="line"><b>التاريخ</b><span>'+escv(x.d||"")+'</span></div>'+(x.phone?'<div class="line"><b>الهاتف</b><span>'+escv(x.phone)+'</span></div>':"")+'<div class="amount">'+money(amountOf(x))+'</div><div><b>البيان</b><p class="note">'+escv(x.ds||x.receiptNote||"—")+'</p></div><div class="sign"><span>التوقيع: __________</span><span>الختم: __________</span></div></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></html>';
 }
 window.printRimReceipt=function(id){
  const x=RB.all("work").find(w=>w.id===id&&w.receiptNo);
  if(!x)return toast("لم يتم العثور على الإيصال");
  const w=window.open("","_blank");
  if(!w)return toast("اسمح بفتح نافذة الطباعة لهذا الموقع");
  w.document.open();w.document.write(receiptHtml(x));w.document.close();
 };
 window.addRimReceipt=function(){
  const val=id=>document.getElementById(id)?.value?.trim()||"";
  const person=val("rc-person"),phone=val("rc-phone"),kind=val("rc-kind"),existingId=val("rc-existing");
  const existing=existingId?RB.all("work").find(w=>w.id===existingId&&["payment","advance","expense","worker_payment","worker_advance"].includes(w.k)&&!w.receiptNo):null;
  const rawAmount=val("rc-amount").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٫،,]/g,".");
  const amount=existing?amountOf(existing):Number(rawAmount);
  const date=existing?(existing.d||today()):(val("rc-date")||today()),note=val("rc-note");
  if(!person)return toast("اكتب اسم الشخص");
  if(existingId&&!existing)return toast("لم نعثر على الحركة أو سبق إصدار إيصال لها");
  if(!Number.isFinite(amount)||amount<=0)return toast("أدخل مبلغاً صحيحاً");
  if(!existing&&!labels[kind])return toast("اختر نوع الإيصال");
  if(!existing&&["worker_payment","worker_advance"].includes(kind))return toast("سجّل حركة أجر العامل أو السلفة أولاً من ملف العامل، ثم أرفق الإيصال بها لتجنب تكرار المبلغ");
  const ok=RB.transact(d=>{
   d.receiptSeq=(Number(d.receiptSeq)||0)+1;
   const receiptNo="RB-"+date.replace(/-/g,"")+"-"+String(d.receiptSeq).padStart(4,"0");
   if(existingId){
    const row=d.items.find(w=>w.id===existingId&&w.type==="work"&&["payment","advance","expense"].includes(w.k)&&!w.receiptNo);
    if(!row)throw new Error("receipt target changed");
    row.person=person;row.phone=phone;row.receiptNo=receiptNo;row.receiptNote=note||row.ds||"";
   }else{
    d.items.push({type:"work",k:kind,d:date,ds:note||labels[kind],due:0,rec:kind==="payment"?amount:0,advance:kind==="advance"?amount:0,expense:kind==="expense"?amount:0,project:d.activeProject||null,person,phone,receiptNo,receiptNote:note,created:Date.now(),id:Date.now().toString(36)+Math.random().toString(36).slice(2,8)});
   }
  });
  if(!ok)return;
  render();toast(existing?"تم إرفاق الإيصال بالحركة السابقة دون تكرار المبلغ":"تم تسجيل الحركة وإنشاء الإيصال");
 };
 window.rimReceiptScreen=function(){
  const rows=RB.all("work").filter(x=>x.receiptNo).slice().sort((a,b)=>(b.created||0)-(a.created||0));
  const available=RB.all("work").filter(x=>["payment","advance","expense","worker_payment","worker_advance"].includes(x.k)&&!x.receiptNo).slice().sort((a,b)=>(b.created||0)-(a.created||0));
  return '<div class="card"><b style="font-size:17px">🧾 الإيصالات المالية</b><p class="muted">يمكنك إصدار إيصال لحركة جديدة أو إرفاق إيصال بحركة مسجلة مسبقاً دون تكرار المبلغ في الحسابات.</p></div>'+
   '<div class="card"><b>➕ إنشاء إيصال جديد</b><label class="muted">اختر حركة مالية مسجلة (اختياري)</label><select id="rc-existing" onchange="selectExistingReceipt(this.value)" style="width:100%;margin:4px 0 10px"><option value="">حركة جديدة — تسجيل المبلغ الآن</option>'+available.map(x=>'<option value="'+escv(x.id)+'">'+escv(labels[x.k])+' · '+escv(x.d)+' · '+money(amountOf(x))+' · '+escv(x.ds||"")+'</option>').join("")+'</select><p class="muted">عند اختيار حركة سابقة، سيُرفق الإيصال بها فقط ولن يُسجل المبلغ مرة أخرى.</p><label class="muted">نوع الحركة</label><select id="rc-kind" style="width:100%;margin:4px 0 10px"><option value="payment">استلام مبلغ</option><option value="advance">تسليم سلفة</option><option value="expense">دفع مصروف</option><option value="worker_payment">تسديد أجر عامل (حركة مسجلة)</option><option value="worker_advance">سلفة عامل (حركة مسجلة)</option></select><label class="muted">اسم الشخص</label><input id="rc-person" maxlength="100" placeholder="اسم العامل أو صاحب العمل أو المورد" style="width:100%;margin:4px 0 10px"><label class="muted">رقم الهاتف (اختياري)</label><input id="rc-phone" type="tel" inputmode="tel" placeholder="+..." style="width:100%;margin:4px 0 10px"><label class="muted">المبلغ ('+escv(D.settings.currency||"") +')</label><input id="rc-amount" type="text" inputmode="decimal" placeholder="0.00" style="width:100%;margin:4px 0 10px"><label class="muted">التاريخ</label><input id="rc-date" type="date" value="'+today()+'" style="width:100%;margin:4px 0 10px"><label class="muted">البيان</label><textarea id="rc-note" rows="2" maxlength="300" placeholder="سبب الدفع أو الاستلام" style="width:100%;margin:4px 0 10px"></textarea><button class="p" style="width:100%;min-height:48px" onclick="addRimReceipt()">حفظ الحركة وإنشاء الإيصال</button></div>'+
   '<div class="card"><b>📚 سجل الإيصالات ('+rows.length+')</b>'+(rows.map(x=>'<div class="item"><span><b>'+escv(x.receiptNo)+'</b>'+(x.reversedBy?'<small class="hi"> · ملغى بقيد عكسي</small>':'')+'<br>'+escv(labels[x.k]||"إيصال")+' · '+escv(x.person)+'<br><small class="muted">'+escv(x.d)+' · '+money(amountOf(x))+'</small></span><button class="p" onclick="printRimReceipt(\''+escv(x.id)+'\')">طباعة / PDF</button></div>').join("")||'<p class="muted">لا توجد إيصالات بعد.</p>')+'</div>';
 };
 TABS.receipts=["🧾","الإيصالات"];
 ["employee","worker"].forEach(role=>{if(ROLES[role]&&!ROLES[role].tabs.includes("receipts"))ROLES[role].tabs.splice(ROLES[role].tabs.indexOf("ledger")+1,0,"receipts");});
 VIEWS.receipts=rimReceiptScreen;
 render();
})();