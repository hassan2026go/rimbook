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
 if(hasHoliday) out.push({k:"holiday",d:date,ds:"عطلة",due:0,rec:0,ot:0,project});
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
 const batch=pending;
 batch.items.forEach(x=>RB.add({type:"work",...x,voice:true,voiceText:batch.raw,created:Date.now()}));
 RB.add({type:"voice_log",d:batch.date,body:batch.raw,created:Date.now(),entries:batch.items.length});
 pending=null;RB.save();render();toast("تم اعتماد التسجيل وحفظه في جدول العمل");
};
window.voiceLedgerCancel=function(){pending=null;render();};
function voiceLedgerSaveQuick(kind,amount){
 const labels={work:"يوم عمل",holiday:"عطلة",payment:"دفعة مستلمة",advance:"سلفة للعامل",expense:"مصروف"};
 if(!labels[kind])return;
 const item={k:kind,d:today(),ds:labels[kind],due:kind==="work"?(Number(D.settings.dailyRate)||0):0,rec:kind==="payment"?amount:0,advance:kind==="advance"?amount:0,expense:kind==="expense"?amount:0,project:D.activeProject||null};
 RB.add({type:"work",...item,voice:false,created:Date.now()});
 RB.save();render();toast("تم تسجيل "+labels[kind]);
}
window.voiceLedgerAmountDigit=function(value){
 const input=document.getElementById("voiceAmountInput");if(!input)return;
 if(value==="clear")input.value="";
 else if(value==="back")input.value=input.value.slice(0,-1);
 else if(value==="dot"){if(!input.value.includes("."))input.value+=(input.value?".":"0.") ;}
 else input.value+=value;
};
window.voiceLedgerAmountSubmit=function(kind){
 const input=document.getElementById("voiceAmountInput");
 const amount=Number(String(input?.value||"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(",","."));
 if(!Number.isFinite(amount)||amount<=0){toast("أدخل مبلغاً صحيحاً");return;}
 document.getElementById("voiceAmountDialog")?.remove();
 voiceLedgerSaveQuick(kind,amount);
};
window.voiceLedgerQuick=function(kind){
 const labels={work:"يوم عمل",holiday:"عطلة",payment:"دفعة مستلمة",advance:"سلفة للعامل",expense:"مصروف"};
 if(!labels[kind])return;
 if(!["payment","advance","expense"].includes(kind)){voiceLedgerSaveQuick(kind,0);return;}
 document.getElementById("voiceAmountDialog")?.remove();
 const keys=["1","2","3","4","5","6","7","8","9","clear","0","dot"];
 document.body.insertAdjacentHTML("beforeend",'<div id="voiceAmountDialog" role="dialog" aria-modal="true" aria-label="إدخال المبلغ" style="position:fixed;inset:0;z-index:100;background:#000a;display:flex;align-items:center;justify-content:center;padding:16px"><div class="card" style="width:min(100%,360px);margin:0;background:var(--card);box-shadow:0 12px 40px #0008"><b style="font-size:18px">أدخل مبلغ: '+labels[kind]+'</b><input id="voiceAmountInput" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" style="width:100%;font-size:28px;text-align:center;margin:14px 0;padding:14px" readonly><div class="grid3">'+keys.map(k=>'<button type="button" style="min-height:54px;font-size:20px" onclick="voiceLedgerAmountDigit(\''+k+'\')">'+(k==="clear"?"مسح":k==="dot"?".":k)+'</button>').join("")+'<button type="button" style="min-height:54px" onclick="voiceLedgerAmountDigit(\'back\')">⌫</button></div><div class=row style="margin-top:12px"><button class=p style="flex:1;min-height:48px;font-size:16px" onclick="voiceLedgerAmountSubmit(\''+kind+'\')">تأكيد وحفظ</button><button type="button" style="min-height:48px" onclick="document.getElementById(\'voiceAmountDialog\').remove()">إلغاء</button></div></div></div>');
};
window.voiceLedgerListen=function(text){if(typeof speakText==="function")speakText(text,"ar-SA");else if("speechSynthesis" in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="ar-SA";speechSynthesis.speak(u);}else toast("الاستماع الصوتي غير مدعوم في هذا المتصفح");};
window.voiceLedgerDelete=function(id){if(!confirm("حذف هذا السجل؟"))return;RB.remove(id);render();};
window.voiceLedgerStart=function(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){toast("التسجيل الصوتي النصي يحتاج متصفح Chrome حديثاً");return;}
 const r=new SR();r.lang="ar-SA";r.interimResults=false;r.maxAlternatives=3;
 listening=true;const b=document.getElementById("micBtn");if(b)b.classList.add("rec");
 toast("تحدث الآن بوضوح...");
 r.onresult=e=>{
  const result=e.results[0];const transcript=result[0].transcript;
  pending=parseSpoken(transcript);
  if(pending.error){const msg=pending.error;pending=null;toast(msg);return;}
  render();go("voice");
 };
 r.onerror=e=>toast(e.error==="not-allowed"?"يرجى السماح باستخدام الميكروفون": "تعذر التعرف على الكلام، حاول مجدداً");
 r.onend=()=>{listening=false;const b=document.getElementById("micBtn");if(b)b.classList.remove("rec");};
 try{r.start();}catch(e){listening=false;toast("الميكروفون مشغول، حاول بعد لحظة");}
};
window.voiceCapture=window.voiceLedgerStart;
TABS.voice=["🎙️","السجل الصوتي"];
["employee","worker"].forEach(role=>{if(ROLES[role]&&!ROLES[role].tabs.includes("voice"))ROLES[role].tabs.splice(ROLES[role].tabs.indexOf("ledger")+1,0,"voice");});
VIEWS.voice=function(){
 const works=RB.all("work").slice().sort((a,b)=>(b.d||"").localeCompare(a.d||""));
 const month=document.getElementById("voiceMonth")?.value||today().slice(0,7);
 const monthRows=works.filter(w=>(w.d||"").startsWith(month));
 const worked=monthRows.filter(w=>w.k==="work").length,holidays=monthRows.filter(w=>w.k==="holiday").length;
 const due=monthRows.filter(w=>w.k==="work").reduce((s,w)=>s+(+w.due||0),0);
 const received=monthRows.filter(w=>w.k==="payment").reduce((s,w)=>s+(+w.rec||0),0);
 const expenses=monthRows.filter(w=>w.k==="expense").reduce((s,w)=>s+(+w.expense||0),0);
 const advances=monthRows.filter(w=>w.k==="advance").reduce((s,w)=>s+(+w.advance||0),0);
 const logs=RB.all("voice_log").slice().sort((a,b)=>(b.created||0)-(a.created||0));
 const preview=pending&&!pending.error?'<div class="card" style="border:2px solid var(--ac)"><b>🔎 راجع ما فهمه التطبيق قبل الحفظ</b><p>'+escv(pending.raw)+'</p>'+pending.items.map(x=>'<div class="item"><span>'+({work:"يوم عمل",holiday:"عطلة",payment:"دفعة مستلمة",advance:"سلفة للعامل",expense:"مصروف"}[x.k])+'</span><b>'+money(x.due||x.rec||x.expense||x.advance)+'</b></div>').join("")+'<p class="muted">الأجر اليومي مأخوذ من إعدادات الحساب. يمكنك إلغاء التسجيل إذا كان الفهم غير صحيح.</p><button class="p" onclick="voiceLedgerConfirm()">✓ اعتماد وحفظ</button> <button onclick="voiceLedgerCancel()">إلغاء</button><button onclick="voiceLedgerListen('+JSON.stringify(pending.raw).replace(/</g,"\\u003c")+')">🔊 استماع</button></div>':"";
 const kind={work:"عمل",holiday:"عطلة",payment:"دفعة مستلمة",advance:"سلفة",expense:"مصروف"};
 return '<div class="card"><b style="font-size:17px">🎙️ السجل الصوتي للعمال</b><p class="muted">قل جملة قصيرة مثل: «اليوم عمل واصل دفعة 10 دولار» أو «اليوم عطلة».</p><div class="grid3" style="margin:12px 0"><button class="card" style="min-height:88px;font-size:15px" onclick="voiceLedgerQuick(\'work\')">🧱<br><b>يوم عمل</b></button><button class="card" style="min-height:88px;font-size:15px" onclick="voiceLedgerQuick(\'holiday\')">🌴<br><b>عطلة</b></button><button class="card" style="min-height:88px;font-size:15px" onclick="voiceLedgerQuick(\'payment\')">💵<br><b>دفعة مستلمة</b></button><button class="card" style="min-height:88px;font-size:15px" onclick="voiceLedgerQuick(\'advance\')">🤝<br><b>سلفة</b></button><button class="card" style="min-height:88px;font-size:15px" onclick="voiceLedgerQuick(\'expense\')">🧾<br><b>مصروف</b></button></div><button class="p" style="font-size:16px;padding:12px 18px" onclick="voiceLedgerStart()">🎤 ابدأ التحدث</button><p class="muted">ستظهر معاينة لتأكيدها قبل إدخالها في الحسابات.</p></div>'+preview+
 '<div class="card"><b>📅 الحساب الشهري والتقويم</b><label class="muted">اختر الشهر</label><input id="voiceMonth" type="month" value="'+month+'" onchange="render()" style="width:100%"><div class="grid3" style="margin-top:8px"><div class="card">أيام العمل<h3>'+worked+'</h3></div><div class="card">العطل<h3>'+holidays+'</h3></div><div class="card">الدفعات<h3>'+monthRows.filter(w=>w.k==="payment").length+'</h3></div></div><div class="grid2"><div class="card">المستحق<h3>'+money(due)+'</h3></div><div class="card">واصل<h3 class="ok">'+money(received)+'</h3></div><div class="card">المصروف<h3>'+money(expenses)+'</h3></div><div class="card">السلفات<h3>'+money(advances)+'</h3></div><div class="card">المتبقي بعد السلفات<h3>'+money(due-received-advances)+'</h3></div></div></div>'+
 '<div class="card"><b>🗓️ سجل الشهر — جدول العمليات</b>'+(monthRows.length?monthRows.map(w=>'<div class="item"><span><b>'+escv(kind[w.k]||w.k)+'</b> · '+escv(w.ds||"")+'<br><small class="muted">'+escv(w.d)+' · '+escv(w.voiceText||"إدخال يدوي")+'</small></span><b>'+money(w.due||w.rec||w.expense||w.advance)+'</b><button onclick="voiceLedgerListen('+JSON.stringify(w.voiceText||w.ds||"").replace(/</g,"\\u003c")+')">🔊</button><button class="danger" onclick="voiceLedgerDelete(\''+w.id+'\')">حذف</button></div>').join(""):'<p class="muted">لا توجد عمليات في هذا الشهر.</p>')+'</div>'+
 '<div class="card"><b>🎧 سجل العبارات الصوتية</b>'+(logs.length?logs.map(l=>'<div class="item"><span>'+escv(l.d)+'<br>'+escv(l.body)+'</span><button onclick="voiceLedgerListen('+JSON.stringify(l.body||"").replace(/</g,"\\u003c")+')">🔊 استماع</button><button class="danger" onclick="voiceLedgerDelete(\''+l.id+'\')">حذف</button></div>').join(""):'<p class="muted">لا توجد تسجيلات محفوظة بعد.</p>')+'</div>';
};
const oldRender=window.render;
window.render=function(){oldRender();};
const oldGo=window.go;
window.go=function(t){oldGo(t);};
})();
