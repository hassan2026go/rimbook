/* rimbook i18n.js - ترجمة كاملة (عربي/إنجليزي/تركي/فرنسي) */

const LANGS = {
  ar: { name: "العربية", flag: "🇸🇾", dir: "rtl", speechLang: "ar-SA" },
  en: { name: "English",  flag: "🇬🇧", dir: "ltr", speechLang: "en-US" },
  tr: { name: "Türkçe",   flag: "🇹🇷", dir: "ltr", speechLang: "tr-TR" },
  fr: { name: "Français", flag: "🇫🇷", dir: "ltr", speechLang: "fr-FR" }
};

const TRANSLATIONS = {
  /* ============ العربية ============ */
  ar: {
    // تبويبات
    home: "الرئيسية", projects: "المشاريع", agenda: "المفكرة",
    tasks: "المهام", habits: "العادات", goals: "الأهداف",
    notes: "الملاحظات", ledger: "العمل", profile: "الملف",
    settings: "الإعدادات", stats: "الإحصاء", sync: "المزامنة",
    integrations: "الإضافات", contacts: "الجهات", invoices: "الفواتير", rates: "العملات",

    // رئيسية
    welcome: "أهلاً", tasksOpen: "مهام", tasksLate: "متأخرة",
    completion: "إنجاز", balance: "رصيدك", todayEvents: "مواعيد اليوم",
    habitsToday: "عادات اليوم", noEvents: "لا مواعيد", allProjects: "كل المشاريع",
    viewAll: "عرض الكل", suggestions: "اقتراحات ذكية",

    // عام
    add: "إضافة", save: "حفظ", delete: "حذف", edit: "تعديل",
    cancel: "إلغاء", close: "إغلاق", yes: "نعم", no: "لا",
    confirm: "تأكيد", search: "بحث", filter: "تصفية", all: "الكل",
    open: "مفتوحة", done: "منجزة", total: "الإجمالي", paid: "مدفوعة",
    unpaid: "معلقة", pending: "معلقة", loading: "جارٍ التحميل...",
    error: "خطأ", success: "نجاح", warning: "تحذير", info: "معلومة",
    date: "التاريخ", time: "الوقت", amount: "المبلغ", notes2: "ملاحظات",
    description: "الوصف", quantity: "الكمية", price: "السعر", sum: "المجموع",
    subtotal: "المجموع الفرعي", tax: "الضريبة", discount: "الخصم",
    client: "العميل", supplier: "المورد", company: "الشركة",
    phone: "الهاتف", email: "البريد", address: "العنوان", city: "المدينة",

    // مهام
    newTask: "مهمة جديدة", taskTitle: "عنوان المهمة",
    priority: "الأولوية", low: "منخفضة", medium: "متوسطة", high: "عالية",
    dueDate: "تاريخ الاستحقاق", noTasks: "لا مهام",

    // مشاريع
    newProject: "مشروع جديد", projectName: "اسم المشروع",
    projectDesc: "وصف المشروع", budget: "الميزانية", days: "أيام",
    active: "نشط", activate: "تفعيل", accounts: "الحسابات",
    noProjects: "لا مشاريع بعد", addFirstProject: "أضف أول مشروع",

    // مفكرة
    newEvent: "موعد جديد", eventTitle: "عنوان الموعد", kind: "النوع",
    repeat: "التكرار", once: "مرة واحدة", daily: "يومي", weekly: "أسبوعي",
    monthly: "شهري", clash: "⚠️ تعارض في التوقيت", exportICS: "تصدير ICS",

    // عادات
    newHabit: "عادة جديدة", habitName: "اسم العادة", streak: "سلسلة",
    markDone: "تم اليوم", markNotDone: "لم يتم", noHabits: "لا عادات",

    // أهداف
    newGoal: "هدف جديد", goalName: "اسم الهدف", target: "الهدف",
    current: "الحالي", progress: "التقدم", noGoals: "لا أهداف",

    // ملاحظات
    newNote: "ملاحظة جديدة", noteTitle: "العنوان", noteBody: "اكتب...",
    tags: "وسوم", noNotes: "لا ملاحظات", speak: "اقرأ",

    // عمل
    record: "تسجيل", work: "عمل", overtime: "إضافي", holiday: "عطلة",
    payment: "دفعة", extraHours: "ساعات إضافية", received: "واصل",
    remaining: "متبقي", dailyRate: "أجر اليوم", hourlyRate: "أجر الساعة",
    managerPhone: "واتساب المدير", share: "مشاركة", exportCSV: "تصدير CSV",
    record2: "السجل", noRecords: "لا سجلات", invoice: "فاتورة",

    // ملف
    fullName: "الاسم الكامل", role: "الدور", birth: "الميلاد",
    emergency: "الطوارئ", skills: "المهارات", about: "حول",
    photo: "الصورة", changePhoto: "تغيير الصورة",

    // إعدادات
    appearance: "المظهر", theme: "الوضع", dark: "داكن", light: "فاتح",
    fontSize: "حجم الخط", language: "اللغة", currency: "العملة",
    backup: "نسخ احتياطي", export: "تصدير", import: "استيراد",
    reset: "مسح الكل", encryptedBackup: "نسخة مشفّرة",

    // مزامنة
    gdrive: "Google Drive", gdriveHint: "فعّل المفتاح من الإضافات",
    upload: "رفع", download: "تنزيل", whatsapp: "واتساب",
    csv: "CSV", pdf: "PDF", anyApp: "أي تطبيق",
    webrtc: "نقل مباشر (WebRTC)", sender: "المُرسل", receiver: "المُستقبل",
    complete: "إتمام", importFile: "استيراد ملف",

    // إضافات
    integrationsTitle: "الإضافات", free: "مجاني", keyed: "بمفتاحك", paid: "على نفقتك",
    enable: "تفعيل", disable: "تعطيل", test: "اختبار", run: "تشغيل",
    howTo: "كيف أفعّلها؟", settingsSaved: "تم الحفظ",

    // صوت
    speakNow: "تحدث الآن...", voiceAnalysis: "تحليل صوتي",
    action: "الإجراء", detectedAmount: "المبلغ", detectedPerson: "الشخص",
    detectedTime: "الوقت", detectedDate: "التاريخ", detectedProject: "المشروع",
    execute: "تنفيذ", voiceNotSupported: "استخدم Chrome أو Safari",

    // جهات
    newClient: "عميل جديد", newSupplier: "مورد جديد",
    contactName: "اسم جهة الاتصال", noContacts: "لا جهات اتصال",

    // فواتير
    invoiceNumber: "رقم الفاتورة", newInvoice: "فاتورة جديدة",
    addItem: "إضافة بند", print: "طباعة/PDF", markPaid: "دفع",
    markUnpaid: "إلغاء الدفع", dueDate2: "تاريخ الاستحقاق",
    noInvoices: "لا فواتير", selectProject: "اختر مشروعاً أولاً",

    // عملات
    exchangeRates: "أسعار الصرف", baseCurrency: "العملة الأساسية",
    updateAuto: "تحديث تلقائي", lastUpdate: "آخر تحديث",

    // إحصاء
    monthlyCompare: "المقارنة الشهرية", last7Days: "آخر 7 أيام",
    projectsDist: "توزيع العمل على المشاريع", voiceExamples: "أمثلة صوتية",

    // رسائل
    saved: "✅ تم الحفظ", deleted: "🗑️ تم الحذف", restored: "✅ استعادة ناجحة",
    invalidFile: "ملف غير صالح", noInternet: "🔌 بدون إنترنت",
    online: "🟢 متصل", installApp: "📲 تثبيت", installHint: "ثبّت التطبيق على جهازك",

    // تأكيدات
    confirmDelete: "هل تريد الحذف؟",
    confirmDeleteProject: "حذف المشروع وكل بياناته؟",
    confirmReset: "حذف كل البيانات نهائياً؟",
    savedSuccessfully: "تم الحفظ بنجاح"
  },

  /* ============ الإنجليزية ============ */
  en: {
    home: "Home", projects: "Projects", agenda: "Calendar",
    tasks: "Tasks", habits: "Habits", goals: "Goals",
    notes: "Notes", ledger: "Work", profile: "Profile",
    settings: "Settings", stats: "Stats", sync: "Sync",
    integrations: "Integrations", contacts: "Contacts", invoices: "Invoices", rates: "Currencies",

    welcome: "Welcome", tasksOpen: "Tasks", tasksLate: "Late",
    completion: "Done", balance: "Balance", todayEvents: "Today's events",
    habitsToday: "Today's habits", noEvents: "No events", allProjects: "All projects",
    viewAll: "View all", suggestions: "Smart suggestions",

    add: "Add", save: "Save", delete: "Delete", edit: "Edit",
    cancel: "Cancel", close: "Close", yes: "Yes", no: "No",
    confirm: "Confirm", search: "Search", filter: "Filter", all: "All",
    open: "Open", done: "Done", total: "Total", paid: "Paid",
    unpaid: "Unpaid", pending: "Pending", loading: "Loading...",
    error: "Error", success: "Success", warning: "Warning", info: "Info",
    date: "Date", time: "Time", amount: "Amount", notes2: "Notes",
    description: "Description", quantity: "Qty", price: "Price", sum: "Sum",
    subtotal: "Subtotal", tax: "Tax", discount: "Discount",
    client: "Client", supplier: "Supplier", company: "Company",
    phone: "Phone", email: "Email", address: "Address", city: "City",

    newTask: "New task", taskTitle: "Task title",
    priority: "Priority", low: "Low", medium: "Medium", high: "High",
    dueDate: "Due date", noTasks: "No tasks",

    newProject: "New project", projectName: "Project name",
    projectDesc: "Description", budget: "Budget", days: "Days",
    active: "Active", activate: "Activate", accounts: "Accounts",
    noProjects: "No projects yet", addFirstProject: "Add first project",

    newEvent: "New event", eventTitle: "Event title", kind: "Type",
    repeat: "Repeat", once: "Once", daily: "Daily", weekly: "Weekly",
    monthly: "Monthly", clash: "⚠️ Time clash", exportICS: "Export ICS",

    newHabit: "New habit", habitName: "Habit name", streak: "Streak",
    markDone: "Done today", markNotDone: "Not done", noHabits: "No habits",

    newGoal: "New goal", goalName: "Goal name", target: "Target",
    current: "Current", progress: "Progress", noGoals: "No goals",

    newNote: "New note", noteTitle: "Title", noteBody: "Write...",
    tags: "Tags", noNotes: "No notes", speak: "Speak",

    record: "Record", work: "Work", overtime: "Overtime", holiday: "Holiday",
    payment: "Payment", extraHours: "Extra hours", received: "Received",
    remaining: "Remaining", dailyRate: "Daily rate", hourlyRate: "Hourly rate",
    managerPhone: "Manager WhatsApp", share: "Share", exportCSV: "Export CSV",
    record2: "History", noRecords: "No records", invoice: "Invoice",

    fullName: "Full name", role: "Role", birth: "Birth date",
    emergency: "Emergency", skills: "Skills", about: "About",
    photo: "Photo", changePhoto: "Change photo",

    appearance: "Appearance", theme: "Theme", dark: "Dark", light: "Light",
    fontSize: "Font size", language: "Language", currency: "Currency",
    backup: "Backup", export: "Export", import: "Import",
    reset: "Reset all", encryptedBackup: "Encrypted backup",

    gdrive: "Google Drive", gdriveHint: "Enable key in integrations",
    upload: "Upload", download: "Download", whatsapp: "WhatsApp",
    csv: "CSV", pdf: "PDF", anyApp: "Any app",
    webrtc: "Direct transfer (WebRTC)", sender: "Sender", receiver: "Receiver",
    complete: "Complete", importFile: "Import file",

    integrationsTitle: "Integrations", free: "Free", keyed: "With your key", paid: "At your cost",
    enable: "Enable", disable: "Disable", test: "Test", run: "Run",
    howTo: "How to enable?", settingsSaved: "Saved",

    speakNow: "Speak now...", voiceAnalysis: "Voice analysis",
    action: "Action", detectedAmount: "Amount", detectedPerson: "Person",
    detectedTime: "Time", detectedDate: "Date", detectedProject: "Project",
    execute: "Execute", voiceNotSupported: "Use Chrome or Safari",

    newClient: "New client", newSupplier: "New supplier",
    contactName: "Contact name", noContacts: "No contacts",

    invoiceNumber: "Invoice #", newInvoice: "New invoice",
    addItem: "Add item", print: "Print/PDF", markPaid: "Mark paid",
    markUnpaid: "Unmark paid", dueDate2: "Due date",
    noInvoices: "No invoices", selectProject: "Select a project first",

    exchangeRates: "Exchange rates", baseCurrency: "Base currency",
    updateAuto: "Auto update", lastUpdate: "Last update",

    monthlyCompare: "Monthly comparison", last7Days: "Last 7 days",
    projectsDist: "Work distribution", voiceExamples: "Voice examples",

    saved: "✅ Saved", deleted: "🗑️ Deleted", restored: "✅ Restored",
    invalidFile: "Invalid file", noInternet: "🔌 Offline",
    online: "🟢 Online", installApp: "📲 Install", installHint: "Install the app",

    confirmDelete: "Delete this?",
    confirmDeleteProject: "Delete project and all data?",
    confirmReset: "Delete all data permanently?",
    savedSuccessfully: "Saved successfully"
  },

  /* ============ التركية ============ */
  tr: {
    home: "Ana Sayfa", projects: "Projeler", agenda: "Takvim",
    tasks: "Görevler", habits: "Alışkanlıklar", goals: "Hedefler",
    notes: "Notlar", ledger: "İş", profile: "Profil",
    settings: "Ayarlar", stats: "İstatistik", sync: "Senkron",
    integrations: "Entegrasyonlar", contacts: "Kişiler", invoices: "Faturalar", rates: "Döviz",

    welcome: "Hoş geldiniz", tasksOpen: "Görevler", tasksLate: "Geciken",
    completion: "Tamamlanan", balance: "Bakiye", todayEvents: "Bugünün etkinlikleri",
    habitsToday: "Bugünün alışkanlıkları", noEvents: "Etkinlik yok", allProjects: "Tüm projeler",
    viewAll: "Tümünü gör", suggestions: "Akıllı öneriler",

    add: "Ekle", save: "Kaydet", delete: "Sil", edit: "Düzenle",
    cancel: "İptal", close: "Kapat", yes: "Evet", no: "Hayır",
    confirm: "Onayla", search: "Ara", filter: "Filtre", all: "Tümü",
    open: "Açık", done: "Tamam", total: "Toplam", paid: "Ödendi",
    unpaid: "Ödenmedi", pending: "Bekliyor", loading: "Yükleniyor...",
    error: "Hata", success: "Başarılı", warning: "Uyarı", info: "Bilgi",
    date: "Tarih", time: "Saat", amount: "Tutar", notes2: "Notlar",
    description: "Açıklama", quantity: "Miktar", price: "Fiyat", sum: "Toplam",
    subtotal: "Ara toplam", tax: "Vergi", discount: "İndirim",
    client: "Müşteri", supplier: "Tedarikçi", company: "Şirket",
    phone: "Telefon", email: "E-posta", address: "Adres", city: "Şehir",

    newTask: "Yeni görev", taskTitle: "Görev başlığı",
    priority: "Öncelik", low: "Düşük", medium: "Orta", high: "Yüksek",
    dueDate: "Bitiş tarihi", noTasks: "Görev yok",

    newProject: "Yeni proje", projectName: "Proje adı",
    projectDesc: "Açıklama", budget: "Bütçe", days: "Günler",
    active: "Aktif", activate: "Etkinleştir", accounts: "Hesaplar",
    noProjects: "Henüz proje yok", addFirstProject: "İlk projeyi ekle",

    newEvent: "Yeni etkinlik", eventTitle: "Etkinlik başlığı", kind: "Tür",
    repeat: "Tekrar", once: "Bir kez", daily: "Günlük", weekly: "Haftalık",
    monthly: "Aylık", clash: "⚠️ Zaman çakışması", exportICS: "ICS dışa aktar",

    newHabit: "Yeni alışkanlık", habitName: "Alışkanlık adı", streak: "Seri",
    markDone: "Bugün yapıldı", markNotDone: "Yapılmadı", noHabits: "Alışkanlık yok",

    newGoal: "Yeni hedef", goalName: "Hedef adı", target: "Hedef",
    current: "Mevcut", progress: "İlerleme", noGoals: "Hedef yok",

    newNote: "Yeni not", noteTitle: "Başlık", noteBody: "Yaz...",
    tags: "Etiketler", noNotes: "Not yok", speak: "Oku",

    record: "Kaydet", work: "İş", overtime: "Fazla mesai", holiday: "Tatil",
    payment: "Ödeme", extraHours: "Fazla saat", received: "Alınan",
    remaining: "Kalan", dailyRate: "Günlük ücret", hourlyRate: "Saatlik ücret",
    managerPhone: "Yönetici WhatsApp", share: "Paylaş", exportCSV: "CSV dışa aktar",
    record2: "Geçmiş", noRecords: "Kayıt yok", invoice: "Fatura",

    fullName: "Tam ad", role: "Rol", birth: "Doğum tarihi",
    emergency: "Acil durum", skills: "Beceriler", about: "Hakkında",
    photo: "Fotoğraf", changePhoto: "Fotoğrafı değiştir",

    appearance: "Görünüm", theme: "Tema", dark: "Koyu", light: "Açık",
    fontSize: "Yazı boyutu", language: "Dil", currency: "Para birimi",
    backup: "Yedekleme", export: "Dışa aktar", import: "İçe aktar",
    reset: "Tümünü sil", encryptedBackup: "Şifreli yedek",

    gdrive: "Google Drive", gdriveHint: "Entegrasyonlardan anahtarı etkinleştir",
    upload: "Yükle", download: "İndir", whatsapp: "WhatsApp",
    csv: "CSV", pdf: "PDF", anyApp: "Herhangi uygulama",
    webrtc: "Doğrudan aktarım (WebRTC)", sender: "Gönderici", receiver: "Alıcı",
    complete: "Tamamla", importFile: "Dosya içe aktar",

    integrationsTitle: "Entegrasyonlar", free: "Ücretsiz", keyed: "Anahtarınızla", paid: "Sizin hesabınıza",
    enable: "Etkinleştir", disable: "Devre dışı", test: "Test", run: "Çalıştır",
    howTo: "Nasıl etkinleştirilir?", settingsSaved: "Kaydedildi",

    speakNow: "Şimdi konuşun...", voiceAnalysis: "Ses analizi",
    action: "İşlem", detectedAmount: "Tutar", detectedPerson: "Kişi",
    detectedTime: "Saat", detectedDate: "Tarih", detectedProject: "Proje",
    execute: "Yürüt", voiceNotSupported: "Chrome veya Safari kullanın",

    newClient: "Yeni müşteri", newSupplier: "Yeni tedarikçi",
    contactName: "Kişi adı", noContacts: "Kişi yok",

    invoiceNumber: "Fatura #", newInvoice: "Yeni fatura",
    addItem: "Öğe ekle", print: "Yazdır/PDF", markPaid: "Ödendi",
    markUnpaid: "Ödenmedi", dueDate2: "Vade tarihi",
    noInvoices: "Fatura yok", selectProject: "Önce proje seçin",

    exchangeRates: "Döviz kurları", baseCurrency: "Ana para birimi",
    updateAuto: "Otomatik güncelle", lastUpdate: "Son güncelleme",

    monthlyCompare: "Aylık karşılaştırma", last7Days: "Son 7 gün",
    projectsDist: "İş dağılımı", voiceExamples: "Ses örnekleri",

    saved: "✅ Kaydedildi", deleted: "🗑️ Silindi", restored: "✅ Geri yüklendi",
    invalidFile: "Geçersiz dosya", noInternet: "🔌 Çevrimdışı",
    online: "🟢 Çevrimiçi", installApp: "📲 Yükle", installHint: "Uygulamayı yükle",

    confirmDelete: "Silinsin mi?",
    confirmDeleteProject: "Proje ve tüm veriler silinsin mi?",
    confirmReset: "Tüm veriler kalıcı olarak silinsin mi?",
    savedSuccessfully: "Başarıyla kaydedildi"
  },

  /* ============ الفرنسية ============ */
  fr: {
    home: "Accueil", projects: "Projets", agenda: "Agenda",
    tasks: "Tâches", habits: "Habitudes", goals: "Objectifs",
    notes: "Notes", ledger: "Travail", profile: "Profil",
    settings: "Paramètres", stats: "Statistiques", sync: "Sync",
    integrations: "Intégrations", contacts: "Contacts", invoices: "Factures", rates: "Devises",

    welcome: "Bienvenue", tasksOpen: "Tâches", tasksLate: "En retard",
    completion: "Terminé", balance: "Solde", todayEvents: "Événements du jour",
    habitsToday: "Habitudes du jour", noEvents: "Aucun événement", allProjects: "Tous les projets",
    viewAll: "Voir tout", suggestions: "Suggestions intelligentes",

    add: "Ajouter", save: "Enregistrer", delete: "Supprimer", edit: "Modifier",
    cancel: "Annuler", close: "Fermer", yes: "Oui", no: "Non",
    confirm: "Confirmer", search: "Rechercher", filter: "Filtrer", all: "Tous",
    open: "Ouvert", done: "Terminé", total: "Total", paid: "Payée",
    unpaid: "Impayée", pending: "En attente", loading: "Chargement...",
    error: "Erreur", success: "Succès", warning: "Attention", info: "Info",
    date: "Date", time: "Heure", amount: "Montant", notes2: "Notes",
    description: "Description", quantity: "Qté", price: "Prix", sum: "Somme",
    subtotal: "Sous-total", tax: "Taxe", discount: "Remise",
    client: "Client", supplier: "Fournisseur", company: "Entreprise",
    phone: "Téléphone", email: "E-mail", address: "Adresse", city: "Ville",

    newTask: "Nouvelle tâche", taskTitle: "Titre",
    priority: "Priorité", low: "Basse", medium: "Moyenne", high: "Haute",
    dueDate: "Échéance", noTasks: "Aucune tâche",

    newProject: "Nouveau projet", projectName: "Nom du projet",
    projectDesc: "Description", budget: "Budget", days: "Jours",
    active: "Actif", activate: "Activer", accounts: "Comptes",
    noProjects: "Aucun projet", addFirstProject: "Ajouter le premier",

    newEvent: "Nouvel événement", eventTitle: "Titre", kind: "Type",
    repeat: "Répéter", once: "Une fois", daily: "Quotidien", weekly: "Hebdomadaire",
    monthly: "Mensuel", clash: "⚠️ Conflit d'heure", exportICS: "Exporter ICS",

    newHabit: "Nouvelle habitude", habitName: "Nom", streak: "Série",
    markDone: "Fait aujourd'hui", markNotDone: "Pas fait", noHabits: "Aucune habitude",

    newGoal: "Nouvel objectif", goalName: "Nom de l'objectif", target: "Cible",
    current: "Actuel", progress: "Progression", noGoals: "Aucun objectif",

    newNote: "Nouvelle note", noteTitle: "Titre", noteBody: "Écrire...",
    tags: "Tags", noNotes: "Aucune note", speak: "Lire",

    record: "Enregistrer", work: "Travail", overtime: "Heures sup.", holiday: "Congé",
    payment: "Paiement", extraHours: "Heures sup.", received: "Reçu",
    remaining: "Restant", dailyRate: "Taux journalier", hourlyRate: "Taux horaire",
    managerPhone: "WhatsApp du manager", share: "Partager", exportCSV: "Exporter CSV",
    record2: "Historique", noRecords: "Aucun enregistrement", invoice: "Facture",

    fullName: "Nom complet", role: "Rôle", birth: "Date de naissance",
    emergency: "Urgence", skills: "Compétences", about: "À propos",
    photo: "Photo", changePhoto: "Changer la photo",

    appearance: "Apparence", theme: "Thème", dark: "Sombre", light: "Clair",
    fontSize: "Taille de police", language: "Langue", currency: "Devise",
    backup: "Sauvegarde", export: "Exporter", import: "Importer",
    reset: "Tout effacer", encryptedBackup: "Sauvegarde chiffrée",

    gdrive: "Google Drive", gdriveHint: "Activez la clé dans les intégrations",
    upload: "Téléverser", download: "Télécharger", whatsapp: "WhatsApp",
    csv: "CSV", pdf: "PDF", anyApp: "N'importe quelle app",
    webrtc: "Transfert direct (WebRTC)", sender: "Émetteur", receiver: "Récepteur",
    complete: "Terminer", importFile: "Importer un fichier",

    integrationsTitle: "Intégrations", free: "Gratuit", keyed: "Avec votre clé", paid: "À vos frais",
    enable: "Activer", disable: "Désactiver", test: "Tester", run: "Lancer",
    howTo: "Comment activer ?", settingsSaved: "Enregistré",

    speakNow: "Parlez maintenant...", voiceAnalysis: "Analyse vocale",
    action: "Action", detectedAmount: "Montant", detectedPerson: "Personne",
    detectedTime: "Heure", detectedDate: "Date", detectedProject: "Projet",
    execute: "Exécuter", voiceNotSupported: "Utilisez Chrome ou Safari",

    newClient: "Nouveau client", newSupplier: "Nouveau fournisseur",
    contactName: "Nom du contact", noContacts: "Aucun contact",

    invoiceNumber: "Facture #", newInvoice: "Nouvelle facture",
    addItem: "Ajouter ligne", print: "Imprimer/PDF", markPaid: "Payée",
    markUnpaid: "Non payée", dueDate2: "Échéance",
    noInvoices: "Aucune facture", selectProject: "Sélectionnez un projet",

    exchangeRates: "Taux de change", baseCurrency: "Devise de base",
    updateAuto: "Mise à jour auto", lastUpdate: "Dernière mise à jour",

    monthlyCompare: "Comparaison mensuelle", last7Days: "7 derniers jours",
    projectsDist: "Répartition du travail", voiceExamples: "Exemples vocaux",

    saved: "✅ Enregistré", deleted: "🗑️ Supprimé", restored: "✅ Restauré",
    invalidFile: "Fichier invalide", noInternet: "🔌 Hors ligne",
    online: "🟢 En ligne", installApp: "📲 Installer", installHint: "Installer l'app",

    confirmDelete: "Supprimer ?",
    confirmDeleteProject: "Supprimer le projet et toutes les données ?",
    confirmReset: "Supprimer toutes les données définitivement ?",
    savedSuccessfully: "Enregistré avec succès"
  }
};

/* ============ دوال مساعدة ============ */
function t(key){
  const lang = RB.data.settings.lang || "ar";
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || (TRANSLATIONS.ar[key]) || key;
}

function setLang(lang){
  if(!TRANSLATIONS[lang]) return toast("لغة غير مدعومة");
  RB.data.settings.lang = lang;
  RB.save();
  document.documentElement.dir = LANGS[lang].dir;
  document.documentElement.lang = lang;
  render();
  toast("🌍 " + LANGS[lang].name);
}

function getSpeechLang(){
  const lang = RB.data.settings.lang || "ar";
  return LANGS[lang].speechLang;
}

function langPicker(){
  return `<div class=card><b>🌍 ${t("language")}</b><div class=row style="margin-top:8px">
    ${Object.entries(LANGS).map(([code, l]) =>
      `<button class="${RB.data.settings.lang === code ? "on" : ""}" onclick="setLang('${code}')">${l.flag} ${l.name}</button>`
    ).join("")}
  </div>
  <p class=muted style="margin-top:8px">${document.documentElement.dir === "rtl" ? "الواجهة RTL" : "Interface LTR"}</p>
  </div>`;
}

/* ============ ترجمة التبويبات ============ */
function refreshTabsLang(){
  const tabsMap = {
    home: t("home"), projects: t("projects"), agenda: t("agenda"),
    tasks: t("tasks"), habits: t("habits"), goals: t("goals"),
    notes: t("notes"), ledger: t("ledger"), profile: t("profile"),
    settings: t("settings"), stats: t("stats"), sync: t("sync"),
    integrations: t("integrations"), contacts: t("contacts"),
    invoices: t("invoices"), rates: t("rates")
  };
  const icons = {
    home:"🏠", projects:"📁", agenda:"📅", tasks:"✅", habits:"🔥",
    goals:"🎯", notes:"📝", ledger:"💼", profile:"👤", settings:"⚙️",
    stats:"📊", sync:"🔄", integrations:"🧩", contacts:"👥",
    invoices:"🧾", rates:"💱"
  };
  return Object.keys(tabsMap).map(k => ({ key: k, label: tabsMap[k], icon: icons[k] }));
}

/* ============ تطبيق الترجمة تلقائياً ============ */
function applyLanguage(){
  const lang = RB.data.settings.lang || "ar";
  document.documentElement.dir = LANGS[lang].dir;
  document.documentElement.lang = lang;
}
applyLanguage();
