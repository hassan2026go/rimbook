/* rimbook i18n.js - دعم 4 لغات */

const LANGS = {
  ar: { name: "العربية", flag: "🇸🇾", dir: "rtl", speechLang: "ar-SA" },
  en: { name: "English",  flag: "🇬🇧", dir: "ltr", speechLang: "en-US" },
  tr: { name: "Türkçe",   flag: "🇹🇷", dir: "ltr", speechLang: "tr-TR" },
  fr: { name: "Français", flag: "🇫🇷", dir: "ltr", speechLang: "fr-FR" }
};

const T = {
  ar: {
    home:"الرئيسية", projects:"المشاريع", agenda:"المفكرة", tasks:"المهام",
    habits:"العادات", goals:"الأهداف", notes:"الملاحظات", ledger:"العمل",
    profile:"الملف", settings:"الإعدادات", stats:"الإحصاء", sync:"المزامنة",
    integrations:"الإضافات", invoices:"الفواتير", contacts:"جهات الاتصال",
    addProject:"مشروع جديد", addTask:"مهمة جديدة", addNote:"ملاحظة جديدة",
    total:"الإجمالي", paid:"مدفوعة", unpaid:"معلقة", save:"حفظ",
    delete:"حذف", edit:"تعديل", close:"إغلاق", yes:"نعم", no:"لا"
  },
  en: {
    home:"Home", projects:"Projects", agenda:"Calendar", tasks:"Tasks",
    habits:"Habits", goals:"Goals", notes:"Notes", ledger:"Work",
    profile:"Profile", settings:"Settings", stats:"Stats", sync:"Sync",
    integrations:"Integrations", invoices:"Invoices", contacts:"Contacts",
    addProject:"New project", addTask:"New task", addNote:"New note",
    total:"Total", paid:"Paid", unpaid:"Unpaid", save:"Save",
    delete:"Delete", edit:"Edit", close:"Close", yes:"Yes", no:"No"
  },
  tr: {
    home:"Ana Sayfa", projects:"Projeler", agenda:"Takvim", tasks:"Görevler",
    habits:"Alışkanlıklar", goals:"Hedefler", notes:"Notlar", ledger:"İş",
    profile:"Profil", settings:"Ayarlar", stats:"İstatistik", sync:"Senkron",
    integrations:"Entegrasyonlar", invoices:"Faturalar", contacts:"Kişiler",
    addProject:"Yeni proje", addTask:"Yeni görev", addNote:"Yeni not",
    total:"Toplam", paid:"Ödendi", unpaid:"Bekliyor", save:"Kaydet",
    delete:"Sil", edit:"Düzenle", close:"Kapat", yes:"Evet", no:"Hayır"
  },
  fr: {
    home:"Accueil", projects:"Projets", agenda:"Agenda", tasks:"Tâches",
    habits:"Habitudes", goals:"Objectifs", notes:"Notes", ledger:"Travail",
    profile:"Profil", settings:"Paramètres", stats:"Stats", sync:"Sync",
    integrations:"Intégrations", invoices:"Factures", contacts:"Contacts",
    addProject:"Nouveau projet", addTask:"Nouvelle tâche", addNote:"Nouvelle note",
    total:"Total", paid:"Payée", unpaid:"Impayée", save:"Enregistrer",
    delete:"Supprimer", edit:"Modifier", close:"Fermer", yes:"Oui", no:"Non"
  }
};

function t(key){
  const lang = RB.data.settings.lang || "ar";
  return (T[lang] && T[lang][key]) || (T.ar[key]) || key;
}

function setLang(lang){
  RB.data.settings.lang = lang;
  RB.save();
  document.documentElement.dir = LANGS[lang].dir;
  document.documentElement.lang = lang;
  render();
  toast("🌍 " + LANGS[lang].name);
}

function langPicker(){
  return `<div class=card><b>🌍 اللغة</b><div class=row style="margin-top:6px">
    ${Object.entries(LANGS).map(([code, l]) =>
      `<button class="${RB.data.settings.lang === code ? "on" : ""}" onclick="setLang('${code}')">${l.flag} ${l.name}</button>`
    ).join("")}
  </div></div>`;
    }
