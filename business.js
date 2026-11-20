/* rimbook business.js - الفواتير والعملات والجهات والمرفقات */

/* ==================== 1) تعدد العملات ==================== */
const BIZ_CURRENCIES = {
  USD: { symbol: "$", name: "دولار أمريكي", rate: 1 },
  EUR: { symbol: "€", name: "يورو", rate: 0.92 },
  TRY: { symbol: "₺", name: "ليرة تركية", rate: 34.5 },
  SYP: { symbol: "ل.س", name: "ليرة سورية", rate: 13000 },
  SAR: { symbol: "﷼", name: "ريال سعودي", rate: 3.75 },
  AED: { symbol: "د.إ", name: "درهم إماراتي", rate: 3.67 },
  GBP: { symbol: "£", name: "جنيه إسترليني", rate: 0.79 },
  EGP: { symbol: "ج.م", name: "جنيه مصري", rate: 48.5 }
};

let exchangeRates = { ...Object.fromEntries(Object.entries(BIZ_CURRENCIES).map(([k,v])=>[k, v.rate])) };
let ratesLastUpdate = 0;

/* تحديث أسعار الصرف من API مجاني (يحتاج إنترنت، اختياري) */
async function updateExchangeRates(){
  try {
    const r = await fetch("https://api.exchangerate-api.com/v4/latest/USD").then(r=>r.json());
    if(r.rates){
      exchangeRates = { USD: 1, ...r.rates };
      ratesLastUpdate = Date.now();
      RB.save();
      toast("✅ تحديث أسعار الصرف");
      render();
    }
  } catch(e){ toast("⚠️ تعذر التحديث — يستخدم أسعاراً ثابتة"); }
}

function convertCurrency(amount, from, to){
  if(from === to) return amount;
  const usdAmount = amount / (exchangeRates[from] || 1);
  return usdAmount * (exchangeRates[to] || 1);
}

function formatMoney(amount, currency){
  const c = BIZ_CURRENCIES[currency] || { symbol: currency };
  return `${amount.toFixed(2)} ${c.symbol}`;
}

/* ==================== 2) جهات الاتصال ==================== */
function addContact(){
  const name = $("#ct-name").value.trim(); if(!name) return;
  if(!RB.data.contacts) RB.data.contacts = [];
  RB.data.contacts.push({
    id: Date.now().toString(36),
    name,
    type: $("#ct-type").value,
    phone: $("#ct-phone").value.trim(),
    email: $("#ct-email").value.trim(),
    address: $("#ct-address").value.trim(),
    notes: $("#ct-notes").value.trim(),
    createdAt: Date.now()
  });
  RB.save(); render(); toast("✅ أُضيفت جهة الاتصال");
}
function delContact(id){
  if(!confirm("حذف جهة الاتصال؟")) return;
  RB.data.contacts = (RB.data.contacts || []).filter(c=>c.id!==id);
  RB.save(); render();
}
function contactBalance(cid){
  let due = 0, rec = 0;
  RB.all("work").filter(w=>w.contactId===cid).forEach(w=>{
    due += w.due||0; rec += w.rec||0;
  });
  return { due, rec, rem: due-rec };
}

/* ==================== 3) الفواتير PDF ==================== */
function generateInvoice(projectId){
  const proj = RB.data.projects.find(p=>p.id===projectId);
  if(!proj) return toast("اختر مشروعاً");
  const works = RB.all("work").filter(w=>w.project===projectId && w.k!=="payment");
  const payments = RB.all("work").filter(w=>w.project===projectId && w.k==="payment");
  const totalDue = works.reduce((s,w)=>s+(w.due||0),0);
  const totalPaid = payments.reduce((s,w)=>s+(w.rec||0),0);
  const remaining = totalDue - totalPaid;
  const contact = proj.contactId ? (RB.data.contacts||[]).find(c=>c.id===proj.contactId) : null;
  const invNum = "INV-" + Date.now().toString(36).toUpperCase().slice(-6);
  const currency = proj.currency || RB.data.settings.currency || "USD";
  const sym = (BIZ_CURRENCIES[currency] || {symbol:currency}).symbol;

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
  <title>فاتورة ${invNum}</title>
  <style>
    @page{size:A4;margin:20mm}
    body{font-family:system-ui,Tahoma,Arial;color:#111;max-width:800px;margin:auto;padding:20px}
    .header{display:flex;justify-content:space-between;border-bottom:3px solid ${proj.color};padding-bottom:16px;margin-bottom:20px}
    .logo{font-size:32px;font-weight:900;color:${proj.color};font-family:Georgia}
    .inv-num{text-align:left;font-size:14px;color:#666}
    h1{color:${proj.color};margin:0}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th,td{border:1px solid #ddd;padding:10px;text-align:right}
    th{background:${proj.color};color:#fff}
    .total{background:#f5f5f5;font-weight:900;font-size:18px}
    .info-box{background:#f9f9f9;padding:12px;border-radius:8px;margin:8px 0;border-right:4px solid ${proj.color}}
    .footer{margin-top:40px;text-align:center;color:#999;font-size:12px;border-top:1px dashed #ccc;padding-top:16px}
    .paid{color:#10b981}.due{color:#f43f5e}
    @media print{body{padding:0}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="logo">${RB.data.profile.name || "rimbook"}</div>
      <div style="font-size:12px;color:#666">${RB.data.profile.city || ""}</div>
      ${RB.data.profile.phone ? `<div style="font-size:12px;color:#666">📞 ${RB.data.profile.phone}</div>`:""}
      ${RB.data.profile.email ? `<div style="font-size:12px;color:#666">✉️ ${RB.data.profile.email}</div>`:""}
    </div>
    <div class="inv-num">
      <h1>فاتورة</h1>
      <div><b>رقم:</b> ${invNum}</div>
      <div><b>التاريخ:</b> ${new Date().toLocaleDateString("ar")}</div>
      <div><b>المشروع:</b> ${proj.name}</div>
    </div>
  </div>

  ${contact ? `<div class="info-box">
    <b>العميل:</b> ${contact.name}<br>
    ${contact.phone ? `📞 ${contact.phone}<br>`:""}
    ${contact.email ? `✉️ ${contact.email}<br>`:""}
    ${contact.address ? `📍 ${contact.address}`:""}
  </div>`:""}

  <h2>تفاصيل الأعمال</h2>
  <table>
    <tr><th>التاريخ</th><th>البيان</th><th>ساعات</th><th>المبلغ</th></tr>
    ${works.map(w=>`<tr>
      <td>${w.d}</td>
      <td>${w.ds||"—"}</td>
      <td>${w.ot||0}</td>
      <td>${(w.due||0).toFixed(2)} ${sym}</td>
    </tr>`).join("")}
    <tr class="total"><td colspan="3">الإجمالي المستحق</td><td>${totalDue.toFixed(2)} ${sym}</td></tr>
  </table>

  <h2>الدفعات الواصلة</h2>
  <table>
    <tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr>
    ${payments.map(p=>`<tr>
      <td>${p.d}</td>
      <td>${p.ds||"دفعة"}</td>
      <td class="paid">${(p.rec||0).toFixed(2)} ${sym}</td>
    </tr>`).join("") || `<tr><td colspan="3" style="text-align:center;color:#999">لا دفعات بعد</td></tr>`}
    <tr class="total"><td colspan="2">إجمالي الواصل</td><td class="paid">${totalPaid.toFixed(2)} ${sym}</td></tr>
  </table>

  <div style="background:${remaining > 0 ? '#fef2f2':'#f0fdf4'};padding:16px;border-radius:8px;text-align:center;margin-top:20px;border:2px solid ${remaining > 0 ? '#f43f5e':'#10b981'}">
    <div style="font-size:14px;color:#666">${remaining > 0 ? "المبلغ المتبقي" : "الحمد لله — تم السداد الكامل"}</div>
    <div style="font-size:32px;font-weight:900;color:${remaining > 0 ? '#f43f5e':'#10b981'}">${Math.abs(remaining).toFixed(2)} ${sym}</div>
  </div>

  <div class="footer">
    شكراً لتعاملكم معنا 🌟<br>
    ${RB.data.profile.name || "rimbook"} · ${RB.data.profile.about.split("\n")[1] || ""}
    <br><small>صُنع بواسطة rimbook</small>
  </div>
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(()=>w.print(), 500);
  toast("🖨️ اضغط Ctrl+P أو زر الطباعة لحفظ PDF");
}

/* ==================== 4) المقارنة الشهرية ==================== */
function monthlyComparison(){
  const months = {};
  const now = new Date();
  for(let i=5; i>=0; i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
    months[key] = { label: d.toLocaleDateString("ar",{month:"short"}), due:0, rec:0, days:0, ot:0 };
  }
  RB.all("work").forEach(w=>{
    const key = w.d.slice(0,7);
    if(months[key]){
      months[key].due += w.due||0;
      months[key].rec += w.rec||0;
      if(w.k === "work") months[key].days++;
      months[key].ot += w.ot||0;
    }
  });
  return Object.entries(months).map(([k,v])=>({ key:k, ...v, rem: v.due-v.rec }));
}

function drawMonthlyChart(){
  const cv = document.getElementById("chartMonthly");
  if(!cv) return;
  const ctx = cv.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = cv.width, H = cv.height;
  cv.style.width = W + "px";
  cv.style.height = H + "px";
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const data = monthlyComparison();
  const max = Math.max(1, ...data.map(d=>Math.max(d.due, d.rec)));
  const padL = 30, padB = 30, padT = 20, padR = 10;
  const cw = W - padL - padR, ch = H - padT - padB;
  const groupW = cw / data.length;
  const bw = groupW * 0.35;
  const ok = "#10b981", bad = "#f43f5e", muted = "#64748b";

  // المحور
  ctx.strokeStyle = "#334155"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT+ch); ctx.lineTo(padL+cw, padT+ch); ctx.stroke();

  data.forEach((d, i) => {
    const x = padL + i * groupW + groupW * 0.15;
    const hDue = (d.due / max) * ch;
    const hRec = (d.rec / max) * ch;
    // المستحق
    ctx.fillStyle = bad;
    ctx.fillRect(x, padT + ch - hDue, bw, hDue);
    // الواصل
    ctx.fillStyle = ok;
    ctx.fillRect(x + bw + 4, padT + ch - hRec, bw, hRec);
    // التاريخ
    ctx.fillStyle = muted; ctx.font = "10px system-ui"; ctx.textAlign = "center";
    ctx.fillText(d.label, x + bw + 2, H - 8);
  });

  // مفتاح
  ctx.textAlign = "left"; ctx.font = "10px system-ui";
  ctx.fillStyle = bad; ctx.fillRect(W - 120, 4, 8, 8);
  ctx.fillStyle = muted; ctx.fillText("مستحق", W - 108, 12);
  ctx.fillStyle = ok; ctx.fillRect(W - 60, 4, 8, 8);
  ctx.fillStyle = muted; ctx.fillText("واصل", W - 48, 12);
}

/* أزيل قسم المرفقات المبتور؛ إدارة المرفقات موجودة في attachments.js. */
