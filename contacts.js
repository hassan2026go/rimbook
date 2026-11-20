/* Rimbook contacts — easy contact form and one-tap communication */
"use strict";

function addContact(){
  const name = document.getElementById("ct-name")?.value.trim() || "";
  if(!name) return toast("اكتب اسم الشخص أولاً");
  const phone = document.getElementById("ct-phone")?.value.trim() || "";
  const email = document.getElementById("ct-email")?.value.trim() || "";
  const type = document.getElementById("ct-type")?.value || "worker";
  if(!phone && !email) return toast("أضف رقم هاتف أو بريداً إلكترونياً واحداً على الأقل");
  const contacts = RB.data.contacts || (RB.data.contacts = []);
  contacts.push({
    id: "ct"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
    type, name, phone, email,
    company: document.getElementById("ct-company")?.value.trim() || "",
    address: document.getElementById("ct-address")?.value.trim() || "",
    notes: document.getElementById("ct-notes")?.value.trim() || "",
    createdAt: Date.now()
  });
  RB.save(); render(); toast("تم حفظ جهة الاتصال");
}

function delContact(id){
  if(!confirm("هل تريد حذف جهة الاتصال؟")) return;
  RB.data.contacts = (RB.data.contacts || []).filter(c => c.id !== id);
  RB.save(); render(); toast("تم الحذف");
}

function contactCounts(){
  const c = RB.data.contacts || [];
  return { total:c.length, workers:c.filter(x=>x.type==="worker").length,
    clients:c.filter(x=>x.type==="client").length,
    suppliers:c.filter(x=>x.type==="supplier").length };
}

function contactDigits(phone){ return String(phone||"").replace(/[^0-9]/g,""); }
function contactCopy(value){
  if(!value) return;
  if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(String(value)).then(()=>toast("تم النسخ")).catch(()=>toast("تعذر النسخ؛ اضغط مطولاً على الرقم"));
  } else toast("اضغط مطولاً على الرقم لنسخه");
}
function contactWhatsApp(phone){
  const digits=contactDigits(phone);
  if(!digits) return toast("لا يوجد رقم هاتف");
  window.open("https://wa.me/"+digits,"_blank","noopener");
}

function contactsScreen(){
  const contacts = RB.data.contacts || [];
  const q = (document.getElementById("ct-search")?.value || "").trim().toLocaleLowerCase();
  const visible = contacts.filter(c => [c.name,c.phone,c.email,c.company,c.notes].join(" ").toLocaleLowerCase().includes(q));
  const counts=contactCounts();
  const escv=s=>esc(String(s??""));
  const rows=visible.map(c=>{
    const phone=String(c.phone||"").trim(), email=String(c.email||"").trim();
    const digits=contactDigits(phone);
    const typeLabel=({worker:"عامل",client:"عميل",supplier:"مورد",other:"أخرى"})[c.type]||"جهة اتصال";
    return '<article class="card" style="margin-top:8px"><div class="row" style="justify-content:space-between"><b style="font-size:16px">'+escv(c.name)+'</b><span class=tag>'+typeLabel+'</span></div>'+
      (c.company?'<p class=muted>'+escv(c.company)+'</p>':"")+
      (phone?'<p style="direction:ltr;text-align:right;margin:8px 0"><a href="tel:'+escv(phone)+'" style="color:var(--ac);font-size:16px;font-weight:700">'+escv(phone)+'</a></p>':"")+
      (email?'<p style="direction:ltr;text-align:right;margin:6px 0"><a href="mailto:'+escv(email)+'" style="color:var(--ac)">'+escv(email)+'</a></p>':"")+
      (c.address?'<p class=muted>📍 '+escv(c.address)+'</p>':"")+
      (c.notes?'<p>'+escv(c.notes)+'</p>':"")+
      '<div class=row style="margin-top:10px">'+
      (phone?'<a class="button" href="tel:'+escv(phone)+'" style="text-decoration:none"><button class=p type=button>📞 اتصال</button></a><button type=button onclick="contactWhatsApp(\''+escv(phone)+'\')">💚 واتساب</button><a href="sms:'+escv(phone)+'" style="text-decoration:none"><button type=button>✉️ SMS</button></a><button type=button onclick="contactCopy(\''+escv(phone)+'\')">نسخ الرقم</button>':"")+
      (email?'<a href="mailto:'+escv(email)+'" style="text-decoration:none"><button type=button>📧 بريد</button></a><button type=button onclick="contactCopy(\''+escv(email)+'\')">نسخ البريد</button>':"")+
      '<button class=danger type=button onclick="delContact(\''+escv(c.id)+'\')">حذف</button></div></article>';
  }).join("");
  return '<div class=card><b style="font-size:17px">👥 دليل التواصل</b><p class=muted>احفظ أرقام العمال والعملاء والموردين، ثم تواصل معهم بلمسة واحدة. لوحة الهاتف تظهر تلقائياً عند إدخال الرقم.</p><div class=grid3><div><small class=muted>الكل</small><h3>'+counts.total+'</h3></div><div><small class=muted>عمال</small><h3>'+counts.workers+'</h3></div><div><small class=muted>عملاء وموردون</small><h3>'+(counts.clients+counts.suppliers)+'</h3></div></div></div>'+
    '<div class=card><b>➕ إضافة جهة اتصال</b><label class=muted for=ct-name>الاسم</label><input id=ct-name maxlength=100 placeholder="اسم الشخص" style="width:100%;margin:4px 0 10px">'+
    '<label class=muted for=ct-type>نوع جهة الاتصال</label><select id=ct-type style="width:100%;margin:4px 0 10px"><option value=worker>عامل</option><option value=client>عميل</option><option value=supplier>مورد</option><option value=other>أخرى</option></select>'+
    '<label class=muted for=ct-phone>رقم الهاتف مع رمز الدولة</label><input id=ct-phone type=tel inputmode=tel autocomplete=tel placeholder="+961..." style="width:100%;margin:4px 0 10px">'+
    '<label class=muted for=ct-email>البريد الإلكتروني</label><input id=ct-email type=email inputmode=email autocomplete=email placeholder="name@example.com" style="width:100%;margin:4px 0 10px">'+
    '<label class=muted for=ct-company>الشركة (اختياري)</label><input id=ct-company placeholder="اسم الشركة" style="width:100%;margin:4px 0 10px">'+
    '<label class=muted for=ct-address>العنوان (اختياري)</label><input id=ct-address placeholder="المدينة أو العنوان" style="width:100%;margin:4px 0 10px">'+
    '<label class=muted for=ct-notes>ملاحظات (اختياري)</label><textarea id=ct-notes rows=2 style="width:100%;margin:4px 0 10px" placeholder="معلومات إضافية"></textarea>'+
    '<button class=p style="width:100%;min-height:46px;font-size:15px" onclick="addContact()">حفظ جهة الاتصال</button></div>'+
    '<div class=card><b>🔎 البحث في الدليل</b><input id=ct-search type=search placeholder="ابحث بالاسم أو الرقم أو الشركة..." value="'+escv(q)+'" oninput="const y=this.value;document.getElementById(\'ct-list\').innerHTML=contactsScreenList(y)" style="width:100%;margin-top:8px"><div id=ct-list></div></div>'+
    '<div id=ct-list-main>'+ (rows||'<p class=muted>لا توجد نتائج. أضف أول جهة اتصال من النموذج أعلاه.</p>')+'</div>';
}
window.contactsScreen=contactsScreen;
