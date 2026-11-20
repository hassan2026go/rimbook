/* rimbook currency.js - تعدد العملات + تحويل تلقائي */

const CURRENCIES = {
  USD: { symbol: "$", name: "دولار أمريكي", flag: "🇺🇸" },
  EUR: { symbol: "€", name: "يورو", flag: "🇪🇺" },
  TRY: { symbol: "₺", name: "ليرة تركية", flag: "🇹🇷" },
  SAR: { symbol: "﷼", name: "ريال سعودي", flag: "🇸🇦" },
  AED: { symbol: "د.إ", name: "درهم إماراتي", flag: "🇦🇪" },
  SYP: { symbol: "ل.س", name: "ليرة سورية", flag: "🇸🇾" },
  EGP: { symbol: "ج.م", name: "جنيه مصري", flag: "🇪🇬" },
  JOD: { symbol: "د.أ", name: "دينار أردني", flag: "🇯🇴" }
};

/* أسعار صرف افتراضية — يمكن للمستخدم تعديلها */
const DEFAULT_RATES = {
  USD: 1, EUR: 1.08, TRY: 0.029, SAR: 0.27,
  AED: 0.27, SYP: 0.000077, EGP: 0.020, JOD: 1.41
};

function getRates(){
  return Object.assign({}, DEFAULT_RATES, RB.data.settings.rates || {});
}
function setRate(cur, rate){
  if(!RB.data.settings.rates) RB.data.settings.rates = {};
  RB.data.settings.rates[cur] = rate;
  RB.save();
}
function getBaseCurrency(){
  return RB.data.settings.currency || "USD";
}
function getBaseSymbol(){
  const code = { "$":"USD", "€":"EUR", "TL":"TRY", "SAR":"SAR", "AED":"AED" }[getBaseCurrency()] || getBaseCurrency();
  return CURRENCIES[code]?.symbol || getBaseCurrency();
}
function convert(amount, fromCur, toCur){
  if(fromCur === toCur) return amount;
  const r = getRates();
  const from = r[fromCur] || 1;
  const to = r[toCur] || 1;
  return (amount * from) / to;
}
function convertToBase(amount, fromCur){
  const baseCode = { "$":"USD", "€":"EUR", "TL":"TRY", "SAR":"SAR", "AED":"AED" }[getBaseCurrency()] || getBaseCurrency();
  return convert(amount, fromCur || "USD", baseCode);
}
function fmtMoney(amount, cur){
  const sym = CURRENCIES[cur]?.symbol || cur || getBaseSymbol();
  return `${(Math.round(amount * 100) / 100).toLocaleString("ar")} ${sym}`;
}

async function fetchLiveRates(){
  try {
    toast("⏳ جلب الأسعار...");
    const r = await fetch("https://open.er-api.com/v6/latest/USD").then(x => x.json());
    if(!r.rates) throw new Error("فشل");
    const wanted = ["EUR","TRY","SAR","AED","SYP","EGP","JOD"];
    wanted.forEach(c => { if(r.rates[c]) setRate(c, r.rates[c]); });
    setRate("USD", 1);
    RB.data.settings.lastRateUpdate = new Date().toISOString();
    RB.save(); render();
    toast("✅ تحديث الأسعار");
  } catch(e){
    toast("❌ فشل — جرّب تعديل الأسعار يدوياً");
  }
}

function ratesSection(){
  const rates = getRates();
  const base = getBaseCurrency();
  return `<div class=card>
    <b>💰 أسعار الصرف (مقابل USD)</b>
    <p class=muted>عملتك الحالية: <b>${base}</b></p>
    <div class=row style="margin-top:8px">
      ${Object.entries(CURRENCIES).map(([code, c]) => `
        <div style="flex:1;min-width:140px;margin-bottom:6px">
          <label class=muted>${c.flag} ${c.name}</label><br>
          <input type=number step=0.0001 value="${rates[code]}" onchange="setRate('${code}',+this.value)" style="width:100%">
        </div>`).join("")}
    </div>
    <div class=row style="margin-top:10px">
      <button class=p onclick="fetchLiveRates()">🌐 تحديث تلقائي</button>
      <small class=muted>${RB.data.settings.lastRateUpdate ? "آخر تحديث: " + new Date(RB.data.settings.lastRateUpdate).toLocaleString("ar") : ""}</small>
    </div>
  </div>`;
    }
