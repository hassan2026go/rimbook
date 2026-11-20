/* Rimbook Voice Ledger — spoken worker records */
(function(){
"use strict";
const D=RB.data;
const today=()=>iso(new Date());
const escv=s=>esc(String(s??""));
const money=n=>(Number(n)||0).toFixed(2)+" "+(D.settings.currency||"USD");
let pending=null, listening=false;
const normalize=s=>String(s||"").toLowerCase()
 .replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d))
 .replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d))
 .replace(/[،,]/g," ").replace(/\s+/g," ").trim();
function applyWorkReversal(data,id,reason,now,newId){
 const items=Array.isArray(data?.items)?data.items:null;
 if(!items)return {ok:false,error:"تعذر الوصول إلى سجل الحركات"};
 const original=items.find(x=>x.type==="work"&&String(x.id)===String(id));
 if(!original)return {ok:false,error:"لم نعثر على الحركة الأصلية"};
 if(original.isReversal)return {ok:false,error:"لا يمكن عكس قيد عكسي"};
 if(original.reversedBy||items.some(x=>x.type==="work"&&String(x.reversalOf||"")===String(id)))return {ok:false,error:"سبق تصحيح هذه الحركة؛ لا يمكن عكسها مرة ثانية"};
 const why=String(reason||"").trim();
 if(why.length<3)return {ok:false,error:"اكتب سبب التصحيح بوضوح"};
 const signed={};
 ["due","rec","advance","expense","ot","otHours","normalHours","overtimePay"].forEach(key=>{
  const value=Number(original[key]||0);
  if(!Number.isFinite(value))throw new Error("invalid financial field");
  signed[key]=-value;
 });
 const reversal={type:"work",k:original.k,d:original.d,ds:"قيد عكسي للحركة "+String(original.ds||original.k||"المالية"),project:original.project||null,...signed,isReversal:true,reversalOf:original.id,correctionReason:why,created:now,id:newId};
 original.reversedBy=newId;original.reversalReason=why;original.reversedAt=now;items.push(reversal);
 return {ok:true,originalId:original.id,reversalId:newId};
}
function parseSpoken(raw){
 const s=normalize(raw);
 const date=s.includes("امس")||s.includes("أمس")?iso(new Date(Date.now()-86400000)):today();
 const amountMatch=s.match(/(\d+(?:[.٫]\d{1,2})?)/);
 const amount=amountMatch?Number(amountMatch[1].replace("٫",".")):0;
 const hasPayment=/(واصل|استلمت|استلم|قبضت|دفعة|دفعه|تسلمت|استلام)/.test(s);
 const hasAdvance=/(سلفة|سلفه|سلف|سلفت)/.test(s);
 const hasExpense=/(مصروف|صرف|اشتريت|نفقة)/.test(s) && !hasPayment && !hasAdvance;
 const hasHoliday=/(عطلة|اجازة|إجازة|راحة|ما اشتغلت|لم اعمل)/.test(s);
 const hasWork=/(عمل|اشتغلت|دوام|شغل|يوميه|يومية)/.test(s);
 const projectMatch=(D.projects||[]).find(p=>s.includes(normalize(p.name)));
 const project=projectMatch?.id||D.activeProject||null;
 const out=[];
 if(hasHoliday) out.push({k:"holiday",d:date,ds:"عطلة",due:(Number(D.settings.dailyRate)||0)*(Math.min(100,Math.max(0,Number(D.settings.holidayPayPercent)||0))/100),rec:0,ot:0,project});
 else if(hasWork) out.push({k:"work",d:date,ds:"يوم عمل",due:Number(D.settings.dailyRate)||0,rec:0,ot:0,project});
 if(hasPayment) out.push({k:"payment",d:date,ds:"دفعة مستلمة",due:0,rec:amount,ot:0,project});
 if(hasAdvance) out.push({k:"advance",d:date,ds:"سلفة للعامل",due:0,rec:0,advance:amount,ot:0,project});
 if(hasExpense) out.push({k:"expense",d:date,ds:"مصروف",due:0,rec:0,expense:amount,ot:0,project});
 if(!out.length) return {error:"لم أفهم نوع الحركة. قل مثلاً: عمل، أو عطلة، أو واصل دفعة 10 دولار."};
 if((hasPayment||hasExpense||hasAdvance)&&!amount) return {error:"سمعت نوع الحركة لكن لم أتعرف على المبلغ. أعد ذكر الرقم بوضوح."};
 return {date,items:out,project,raw};
}
window.voiceLedgerParse=parseSpoken;
window.voiceLedgerConfirm=function(){
 if(!pending)return;
 const ok=RB.transact(d=>{
  batch.items.forEach(x=>d.items.push({type:"work",...x,voice:true,voiceText:batch.raw,created:Date.now(),id:Date.now().toString(36)+Math.random().toString(36).slice(2,8)}));
  d.items.push({type:"voice_log",d:batch.date,body:batch.raw,created:Date.now(),entries:batch.items.length,id:Date.now().toString(36)+Math.random().toString(36).slice(2,8)});
 });
 if(!ok)return;
 pending=null;render();toast("تم اعتماد التسجيل وحفظه في جدول العمل");
};
window.voiceLedgerCancel=function(){pending=null;render();};
function voiceLedgerSaveQuick(kind,amount,workDetails){
 const labels={work:"يوم عمل",holiday:"عطلة",payment:"دفعة مستلمة",advance:"سلفة للعامل",expense:"مصروف"};
 if(!labels[kind])return;
 const otHours=kind==="work"?Math.max(0,Number(workDetails?.otHours)||0):0;
 const normalHours=kind==="work"?Math.max(0,Number(workDetails?.normalHours)||Number(D.settings.normalHoursPerDay)||8):0;
 const overtimeEnabled=!!D.settings.overtimeEnabled;
 const otRate=Math.max(0,Number(D.settings.otRate)||0);
 const overtimePay=kind==="work"&&overtimeEnabled?otHours*otRate:0;
 const item={k:kind,d:today(),ds:labels[kind],due:kind==="work"?(Number(D.settings.dailyRate)||0)+overtimePay:kind==="holiday"?(Number(D.settings.dailyRate)||0)*(Math.min(100,Math.max(0,Number(D.settings.holidayPayPercent)||0))/100):0,rec:kind==="payment"?amount:0,advance:kind==="advance"?amount:0,expense:kind==="expense"?amount:0,project:D.activeProject||null};
 if(kind==="work"){item.normalHours=normalHours;item.otHours=otHours;item.overtimePay=overtimePay;item.overtimeRate=otRate;}
 const saved=RB.add({type:"work",...item,voice:false,created:Date.now()});
 if(!saved)return false;
 render();toast("تم تسجيل "+labels[kind]+(otHours?" مع "+otHours+" ساعة إضافية":""));
 return true;
}
window.voiceLedgerWorkSubmit=function(){
 const normal=Number(document.getElementById("workNormalHours")?.value||D.settings.normalHoursPerDay||8);
 const overtime=Number(document.getElementById("workOvertimeHours")?.value||0);
 if(!Number.isFinite(normal)||normal<=0||normal>24||!Number.isFinite(overtime)||overtime<0||overtime>24){toast("تحقق من عدد ساعات العمل");return;}
 if(overtime>0&&!D.settings.overtimeEnabled){toast("فعّل سياسة العمل الإضافي من الإعدادات أولاً");return;}
 if(voiceLedgerSaveQuick("work",0,{normalHours:normal,otHours:overtime})) document.getElementById("voiceWorkDialog")?.remove();
};
window.voiceLedgerAmountDigit=function(value){
 const input=document.getElementById("voiceAmountInput");if(!input)return;
 if(value==="clear")input.value="";
 else if(value==="back")input.value=input.value.slice(0,-1);
 else if(value==="dot"){if(!input.value.includes("."))input.value+=(input.value?".":"0.") ;}
 else input.value+=value;
};
window.voiceLedgerAmountSubmit=function(kind){
 const input=document.getElementById("voiceAmountInput");
 const amount=Number(String(input?.value||"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace("٫",".").replace(",","."));
 if(!Number.isFinite(amount)||amount<=0){toast("أدخل مبلغاً صحيحاً");return;}
 if(voiceLedgerSaveQuick(kind,amount)) document.getElementById("voiceAmountDialog")?.remove();
};
window.voiceLedgerQuick=function(kind){
 const labels={work:"يوم عمل",holiday:"عطلة",payment:"دفعة مستلمة",advance:"سلفة للعامل",expense:"مصروف"};
 if(!labels[kind])return;
 if(kind==="work"){
  document.getElementById("voiceWorkDialog")?.remove();
  const enabled=!!D.settings.overtimeEnabled;
  document.body.insertAdjacentHTML("beforeend",'<div id="voiceWorkDialog" role="dialog" aria-modal="true" aria-label="تسجيل يوم العمل" style="position:fixed;inset:0;z-index:100;background:#000a;display:flex;align-items:center;justify-content:center;padding:16px"><div class="card" style="width:min(100%,360px);margin:0;background:var(--card);box-shadow:0 12px 40px #0008"><b style="font-size:18px">🧱 تسجيل يوم العمل</b><label class="muted" style="display:block;margin-top:14px">ساعات العمل العادية</label><input id="workNormalHours" type="number" min="0.5" max="24" step="0.5" value="'+(Number(D.settings.normalHoursPerDay)||8)+'" style="width:100%;font-size:22px;padding:12px;margin:5px 0 12px"><label class="muted" style="display:block">الساعات الإضافية</label><input id="workOvertimeHours" type="number" min="0" max="24" step="0.5" value="0" '+(enabled?"":"disabled")+' style="width:100%;font-size:22px;padding:12px;margin:5px 0 8px"><p class="muted">'+(enabled?"سيضاف أجر الساعات الإضافية حسب السعر المحدد في الإعدادات.":"العمل الإضافي غير مفعّل. يمكن لصاحب العمل تفعيله من الإعدادات.")+'</p><div class="row" style="margin-top:12px"><button class="p" style="flex:1;min-height:48px" onclick="voiceLedgerWorkSubmit()">تأكيد وحفظ</button><button type="button" style="min-height:48px" onclick="document.getElementById(\'voiceWorkDialog\').remove()">إلغاء</button></div></div></div>');
  return;
 }
 if(!["payment","advance","expense"].includes(kind)){voiceLedgerSaveQuick(kind,0);return;}
 document.getElementById("voiceAmountDialog")?.remove();
 const keys=["1","2","3","4","5","6","7","8","9","clear","0","dot"];
 document.body.insertAdjacentHTML("beforeend",'<div id="voiceAmountDialog" role="dialog" aria-modal="true" aria-label="إدخال المبلغ" style="position:fixed;inset:0;z-index:100;background:#000a;display:flex;align-items:center;justify-content:center;padding:16px"><div class="card" style="width:min(100%,360px);margin:0;background:var(--card);box-shadow:0 12px 40px #0008"><b style="font-size:18px">أدخل مبلغ: '+labels[kind]+'</b><input id="voiceAmountInput" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" style="width:100%;font-size:28px;text-align:center;margin:14px 0;padding:14px" readonly><div class="grid3">'+keys.map(k=>'<button type="button" style="min-height:54px;font-size:20px" onclick="voiceLedgerAmountDigit(\''+k+'\')">'+(k==="clear"?"مسح":k==="dot"?".":k)+'</button>').join("")+'<button type="button" style="min-height:54px" onclick="voiceLedgerAmountDigit(\'back\')">⌫</button></div><div class=row style="margin-top:12px"><button class=p style="flex:1;min-height:48px;font-size:16px" onclick="voiceLedgerAmountSubmit(\''+kind+'\')">تأكيد وحفظ</button><button type="button" style="min-height:48px" onclick="document.getElementById(\'voiceAmountDialog\').remove()">إلغاء</button></div></div></div>');
};
window.voiceLedgerListen=function(text){if(typeof speakText==="function")speakText(text,"ar-SA");else if("speechSynthesis" in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="ar-SA";speechSynthesis.speak(u);}else toast("الاستماع الصوتي غير مدعوم في هذا المتصفح");};
window.voiceLedgerDelete=function(id){
  const row=RB.data.items.find(item=>String(item.id)===String(id));if(!row)return toast("لم نعثر على السجل");
  if(row.type==="work")return toast("هذا قيد مالي. لا نحذفه مباشرة؛ صححه بقيد عكسي موثق حفاظاً على الحقوق.");
  if(!confirm("حذف نص التسجيل الصوتي؟ لن يؤثر ذلك في أي حركة مالية."))return;
  if(!RB.remove(id))return;
  render();
};
window.applyWorkReversal=applyWorkReversal;
window.reverseWorkEntry=function(id){
 const reason=prompt("ما سبب تصحيح هذه الحركة؟");if(reason===null)return;
 if(String(reason).trim().length<3)return toast("اكتب سبب التصحيح بوضوح");
 const newId=Date.now().toString(36)+Math.random().toString(36).slice(2,8),now=Date.now();
 const preview=applyWorkReversal(JSON.parse(JSON.stringify(RB.data)),id,reason,now,newId);if(!preview.ok)return toast(preview.error);
 if(!confirm("سيُضاف قيد عكسي بالقيم المقابلة، وستبقى الحركة الأصلية محفوظة. لن تُحذف أي بيانات. هل تريد المتابعة؟"))return;
 let result;const saved=RB.transact(data=>{result=applyWorkReversal(data,id,reason,now,newId);if(!result.ok)throw new Error(result.error);});
 if(!saved)return;render();toast("تم حفظ القيد العكسي. أضف الحركة الصحيحة كسجل جديد.");
};
window.voiceLedgerStart=function(){
 if(listening){toast("الميكروفون يعمل بالفعل");return;}
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){toast("التسجيل الصوتي النصي يحتاج متصفح Chrome حديثاً");return;}
 let r;
 try{r=new SR();}catch(e){toast("تعذر تشغيل خدمة التعرف على الكلام");return;}
 r.lang="ar-SA";r.interimResults=false;r.maxAlternatives=3;
 const setMicState=active=>{
  listening=active;
  const b=document.getElementById("micBtn");
  if(b)b.classList.toggle("rec",active);
 };
 r.onstart=()=>{setMicState(true);toast("تحدث الآن بوضوح...");};
 r.onresult=e=>{
  const result=e.results&&e.results[0],transcript=result&&result[0]&&result[0].transcript;
  if(!transcript){toast("لم أسمع عبارة واضحة، حاول مجدداً");return;}
  pending=parseSpoken(transcript);
  if(pending.error){const msg=pending.error;pending=null;toast(msg);return;}
  render();go("voice");
 };
 r.onnomatch=()=>toast("لم أتعرف على الكلمات. جرّب التحدث ببطء ووضوح");
 r.onerror=e=>{
  const messages={
   "not-allowed":"يرجى السماح باستخدام الميكروفون من إعدادات الموقع",
   "service-not-allowed":"خدمة التعرف على الكلام غير متاحة لهذا المتصفح",
   "no-speech":"لم أسمع صوتاً. تأكد من الميكروفون وحاول مجدداً",
   "audio-capture":"تعذر الوصول إلى الميكروفون. تحقق من أذونات الجهاز",
   "network":"تعذر الاتصال بخدمة التعرف على الكلام"
  };
  toast(messages[e.error]||"تعذر التعرف على الكلام، حاول مجدداً");
 };
 r.onend=()=>setMicState(false);
 try{r.start();}catch(e){setMicState(false);toast("الميكروفون مشغول أو لم يستجب، حاول بعد لحظة");}
};
window.voiceCapture=window.voiceLedgerStart;
TABS.voice=["🎙️","السجل الصوتي"];
["employee","worker"].forEach(role=>{if(ROLES[role]&&!ROLES[role].tabs.includes("voice"))ROLES[role].tabs.splice(ROLES[role].tabs.indexOf("ledger")+1,0,"voice");});
VIEWS.voice=function(){
 const works=RB.all("work").slice().sort((a,b)=>(b.d||"").localeCompare(a.d||""));
 const month=document.getElementById("voiceMonth")?.value||today().slice(0,7);
 const monthRows=works.filter(w=>(w.d||"").startsWith(month));
 const countedRows=monthRows.filter(w=>!w.isReversal&&!w.reversedBy);const worked=countedRows.filter(w=>w.k==="work").length,holidays=countedRows.filter(w=>w.k==="holiday").length;
 const due=monthRows.filter(w=>w.k==="work"||w.k==="holiday").reduce((s,w)=>s+(+w.due||0),0);
 const received=monthRows.filter(w=>w.k==="payment").reduce((s,w)=>s+(+w.rec||0),0);
 const expenses=monthRows.filter(w=>w.k==="expense").reduce((s,w)=>s+(+w.expense||0),0);
 const advances=monthRows.filter(w=>w.k==="advance").reduce((s,w)=>s+(+w.advance||0),0);
 const logs=RB.all("voice_log").slice().sort((a,b)=>(b.created||0)-(a.created||0));
 const preview=pending&&!pending.error?'<div class="card" style="border:2px solid var(--ac)"><b>🔎 راجع ما فهمه التطبيق قبل الحفظ</b><p>'+escv(pending.raw)+'</p>'+pending.items.map(x=>'<div class="item"><span>'+({work:"يوم عمل",holiday:"عطلة",payment:"دفعة مستلمة",advance:"سلفة للعامل",expense:"مصروف"}[x.k])+'</span><b>'+money(x.due||x.rec||x.expense||x.advance)+'</b></div>').join("")+'<p class="muted">الأجر اليومي مأخوذ من إعدادات الحساب. يمكنك إلغاء التسجيل إذا كان الفهم غير صحيح.</p><button class="p" onclick="voiceLedgerConfirm()">✓ اعتماد وحفظ</button> <button onclick="voiceLedgerCancel()">إلغاء</button><button onclick="voiceLedgerListen('+JSON.stringify(pending.raw).replace(/</g,"\\u003c")+')">🔊 استماع</button></div>':"";
 const kind={work:"عمل",holiday:"عطلة",payment:"دفعة مستلمة",advance:"سلفة",expense:"مصروف"};
 return '<div class="card"><b style="font-size:17px">🎙️ السجل الصوتي للعمال</b><p class="muted">قل جملة قصيرة مثل: «اليوم عمل واصل دفعة 10 دولار» أو «اليوم عطلة».</p><div class="grid3" style="margin:12px 0"><button class="card" style="min-height:88px;font-size:15px" onclick="voiceLedgerQuick(\'work\')">🧱<br><b>يوم عمل</b></button><button class="card" style="min-height:88px;font-size:15px" onclick="voiceLedgerQuick(\'holiday\')">🌴<br><b>عطلة</b></button><button class="card" style="min-height:88px;font-size:15px" onclick="voiceLedgerQuick(\'payment\')">💵<br><b>دفعة مستلمة</b></button><button class="card" style="min-height:88px;font-size:15px" onclick="voiceLedgerQuick(\'advance\')">🤝<br><b>سلفة</b></button><button class="card" style="min-height:88px;font-size:15px" onclick="voiceLedgerQuick(\'expense\')">🧾<br><b>مصروف</b></button></div><button class="p" style="font-size:16px;padding:12px 18px" onclick="voiceLedgerStart()">🎤 ابدأ التحدث</button><p class="muted">ستظهر معاينة لتأكيدها قبل إدخالها في الحسابات.</p></div>'+preview+
 '<div class="card"><b>📅 الحساب الشهري والتقويم</b><label class="muted">اختر الشهر</label><input id="voiceMonth" type="month" value="'+month+'" onchange="render()" style="width:100%"><div class="grid3" style="margin-top:8px"><div class="card">أيام العمل<h3>'+worked+'</h3></div><div class="card">العطل<h3>'+holidays+'</h3></div><div class="card">الدفعات<h3>'+monthRows.filter(w=>w.k==="payment").length+'</h3></div></div><div class="grid2"><div class="card">المستحق<h3>'+money(due)+'</h3></div><div class="card">واصل<h3 class="ok">'+money(received)+'</h3></div><div class="card">المصروف<h3>'+money(expenses)+'</h3></div><div class="card">السلفات<h3>'+money(advances)+'</h3></div><div class="card">المتبقي بعد السلفات<h3>'+money(due-received-advances)+'</h3></div></div></div>'+
 '<div class="card"><b>🗓️ سجل الشهر — جدول العمليات</b>'+(monthRows.length?monthRows.map(w=>'<div class="item"><span><b>'+escv(kind[w.k]||w.k)+'</b> · '+escv(w.ds||"")+(w.isReversal?' <small class="hi">قيد عكسي</small>':w.reversedBy?' <small class="hi">تم عكسه بقيد موثق</small>':'')+'<br><small class="muted">'+escv(w.d)+' · '+(w.k==="work"?(escv(w.normalHours||0)+" ساعة عادية · "+escv(w.otHours||0)+" إضافية · أجر إضافي "+money(w.overtimePay||0))+" · ":"")+escv(w.voiceText||"إدخال يدوي")+(w.correctionReason?" · سبب التصحيح: "+escv(w.correctionReason):"")+'</small></span><b>'+money(w.due||w.rec||w.expense||w.advance)+'</b><button onclick="voiceLedgerListen('+JSON.stringify(w.voiceText||w.ds||"").replace(/</g,"\\u003c")+')">🔊</button>+(w.k!=="voice_log"&&!w.isReversal&&!w.reversedBy?'<button class="danger" onclick="reverseWorkEntry(\''+w.id+'\')">تصحيح بقيد عكسي</button>':w.isReversal?'':'<small class="muted">محفوظ</small>')</div>').join(""):'<p class="muted">لا توجد عمليات في هذا الشهر.</p>')+'</div>'+
 '<div class="card"><b>🎧 سجل العبارات الصوتية</b>'+(logs.length?logs.map(l=>'<div class="item"><span>'+escv(l.d)+'<br>'+escv(l.body)+'</span><button onclick="voiceLedgerListen('+JSON.stringify(l.body||"").replace(/</g,"\\u003c")+')">🔊 استماع</button><button class="danger" onclick="voiceLedgerDelete(\''+l.id+'\')">حذف</button></div>').join(""):'<p class="muted">لا توجد تسجيلات محفوظة بعد.</p>')+'</div>';
};
const oldRender=window.render;
window.render=function(){oldRender();};
const oldGo=window.go;
window.go=function(t){oldGo(t);};
})();
