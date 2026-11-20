/* rimbook integrations.js - الإضافات الاختيارية */

const INTEGRATIONS = {
  localBackup: { id:"localBackup", cat:"free", icon:"💾", name:"نسخ احتياطي محلي",
    desc:"تنزيل كل بياناتك كملف JSON على جهازك. مجاني تماماً وبدون إنترنت.",
    fields:[], run:()=>backupLocal() },
  csvExport: { id:"csvExport", cat:"free", icon:"📊", name:"تصدير CSV",
    desc:"تصدير سجلات العمل إلى Excel/Sheets.",
    fields:[], run:()=>csvW() },
  icsExport: { id:"icsExport", cat:"free", icon:"📅", name:"تصدير التقويم (ICS)",
    desc:"استورد مواعيدك في Google Calendar / Apple Calendar.",
    fields:[], run:()=>exportICS() },
  whatsapp: { id:"whatsapp", cat:"free", icon:"💚", name:"مشاركة عبر واتساب",
    desc:"إرسال تقرير العمل إلى رقم المدير.",
    fields:[{ key:"managerPhone", label:"رقم واتساب (مع رمز الدولة)", type:"tel" }],
    run:()=>shareW() },
  webShare: { id:"webShare", cat:"free", icon:"📤", name:"مشاركة النظام",
    desc:"مشاركة الملف عبر البلوتوث / البريد / AirDrop / أي تطبيق.",
    fields:[], run:()=>shareViaAny() },
  webrtc: { id:"webrtc", cat:"free", icon:"🔗", name:"نقل مباشر بين جهازين (WebRTC)",
    desc:"نقل البيانات بين جهازين بلا وسيط.",
    fields:[], run:()=>{ go("sync"); } },
  voice: { id:"voice", cat:"free", icon:"🎤", name:"الإدخال الصوتي",
    desc:"الكتابة بالصوت (متوفر أصلاً).",
    fields:[], run:()=>toast("🎤 استخدم زر الميكروفون") },
  printReport: { id:"printReport", cat:"free", icon:"📄", name:"تقرير للطباعة / PDF",
    desc:"إنشاء تقرير HTML جاهز للطباعة أو حفظه PDF.",
    fields:[], run:()=>sharePdfReport() },

  gdrive: { id:"gdrive", cat:"keyed", icon:"☁️", name:"Google Drive",
    desc:"مزامنة على درايفك الشخصي. مجاني — يحتاج Client ID (مجاناً).",
    help:"1) console.cloud.google.com\n2) أنشئ مشروع\n3) فعّل Drive API\n4) OAuth Client ID (Web)\n5) انسخ Client ID\n6) أضف رابط موقعك في Authorized origins",
    fields:[{ key:"gdriveClientId", label:"Google Client ID", type:"text", placeholder:"xxxxx.apps.googleusercontent.com" }],
    test: async (cfg) => {
      if(!cfg.gdriveClientId) throw new Error("أدخل Client ID");
      return "✅ المفتاح محفوظ";
    },
    run:()=>{ if(!RB.data.settings.gdriveClientId) return toast("⚠️ فعّل Google Drive أولاً"); gdriveUpload(); } },
  telegram: { id:"telegram", cat:"keyed", icon:"✈️", name:"Telegram Bot",
    desc:"إرسال تقارير إلى تيليغرام. مجاني عبر @BotFather.",
    help:"1) افتح @BotFather\n2) /newbot\n3) انسخ التوكن\n4) أرسل رسالة للبوت\n5) احصل على chat_id من @userinfobot",
    fields:[
      { key:"tgToken", label:"Bot Token", type:"password", placeholder:"123:ABC..." },
      { key:"tgChatId", label:"Chat ID", type:"text", placeholder:"123456789" }
    ],
    test: async (cfg) => {
      if(!cfg.tgToken || !cfg.tgChatId) throw new Error("أدخل التوكن و chat_id");
      const r = await fetch(`https://api.telegram.org/bot${cfg.tgToken}/sendMessage`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ chat_id: cfg.tgChatId, text: "✅ rimbook متصل!" })
      }).then(r=>r.json());
      if(!r.ok) throw new Error(r.description || "فشل");
      return "✅ وصلت رسالة اختبار";
    },
    run: async () => {
      const cfg = RB.data.settings;
      if(!cfg.tgToken || !cfg.tgChatId) return toast("⚠️ فعّل Telegram أولاً");
      try {
        const fd = new FormData();
        fd.append("chat_id", cfg.tgChatId);
        fd.append("caption", "📋 " + wText().slice(0, 500));
        fd.append("document", new Blob([JSON.stringify(RB.data)], {type:"application/json"}), "rimbook-backup.json");
        await fetch(`https://api.telegram.org/bot${cfg.tgToken}/sendDocument`, { method:"POST", body: fd });
        toast("✅ أُرسل إلى Telegram");
      } catch(e){ toast("❌ فشل"); }
    } },
  notion: { id:"notion", cat:"keyed", icon:"📓", name:"Notion",
    desc:"حفظ الملاحظات في Notion. مجاني.",
    help:"1) notion.so/my-integrations\n2) Integration جديدة\n3) انسخ Token\n4) شارك صفحة مع الـ Integration\n5) Page ID من رابط الصفحة",
    fields:[
      { key:"notionToken", label:"Integration Token", type:"password", placeholder:"secret_..." },
      { key:"notionPageId", label:"Page ID", type:"text", placeholder:"xxxxxxxx" }
    ],
    test: async (cfg) => {
      if(!cfg.notionToken) throw new Error("أدخل التوكن");
      const r = await fetch("https://api.notion.com/v1/users/me", {
        headers: { Authorization: `Bearer ${cfg.notionToken}`, "Notion-Version": "2022-06-28" }
      });
      if(!r.ok) throw new Error("توكن غير صالح");
      return "✅ التوكن صحيح";
    },
    run: async () => {
      const cfg = RB.data.settings;
      if(!cfg.notionToken || !cfg.notionPageId) return toast("⚠️ فعّل Notion أولاً");
      const notes = RB.all("note").slice(-5);
      try {
        for(const n of notes){
          await fetch("https://api.notion.com/v1/pages", {
            method:"POST",
            headers:{ Authorization:`Bearer ${cfg.notionToken}`, "Content-Type":"application/json", "Notion-Version":"2022-06-28" },
            body: JSON.stringify({
              parent: { page_id: cfg.notionPageId },
              properties: { title: [{ text: { content: n.title || "rimbook note" } }] },
              children: [{ object:"block", type:"paragraph", paragraph:{ rich_text:[{ text:{ content: n.body } }] } }]
            })
          });
        }
        toast(`✅ ${notes.length} ملاحظات أُرسلت`);
      } catch(e){ toast("❌ فشل"); }
    } },
  dropbox: { id:"dropbox", cat:"keyed", icon:"📦", name:"Dropbox",
    desc:"نسخ احتياطي على Dropbox. مجاني.",
    help:"1) dropbox.com/developers/apps\n2) Create app → Scoped → Full Dropbox\n3) Permissions → files.content.write\n4) Generated Access Token",
    fields:[{ key:"dropboxToken", label:"Access Token", type:"password", placeholder:"sl...." }],
    test: async (cfg) => {
      if(!cfg.dropboxToken) throw new Error("أدخل التوكن");
      const r = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
        method:"POST", headers:{ Authorization:`Bearer ${cfg.dropboxToken}` }
      });
      if(!r.ok) throw new Error("توكن غير صالح");
      return "✅ التوكن صحيح";
    },
    run: async () => {
      const cfg = RB.data.settings;
      if(!cfg.dropboxToken) return toast("⚠️ فعّل Dropbox أولاً");
      try {
        await fetch("https://content.dropboxapi.com/2/files/upload", {
          method:"POST",
          headers:{
            Authorization:`Bearer ${cfg.dropboxToken}`,
            "Content-Type":"application/octet-stream",
            "Dropbox-API-Arg": JSON.stringify({ path:`/rimbook-backup-${new Date().toISOString().slice(0,10)}.json`, mode:"overwrite" })
          },
          body: JSON.stringify(RB.data)
        });
        toast("✅ رُفع إلى Dropbox");
      } catch(e){ toast("❌ فشل"); }
    } },

  openai: { id:"openai", cat:"paid", icon:"🤖", name:"ذكاء اصطناعي (OpenAI / Gemini)",
    desc:"تحليل ذكي للنصوص الصوتية. مدفوع حسب الاستخدام (على نفقتك).",
    help:"1) platform.openai.com/api-keys\n2) أنشئ مفتاحاً\n3) ضعه هنا\n(يُحاسب من رصيدك فقط)",
    fields:[
      { key:"openaiKey", label:"API Key", type:"password", placeholder:"sk-..." },
      { key:"aiProvider", label:"المزود", type:"select", options:["OpenAI","Gemini"] }
    ],
    test: async (cfg) => {
      if(!cfg.openaiKey) throw new Error("أدخل المفتاح");
      const r = await fetch("https://api.openai.com/v1/models", { headers:{ Authorization:`Bearer ${cfg.openaiKey}` } });
      if(!r.ok) throw new Error("مفتاح غير صالح");
      return "✅ مفتاح OpenAI صحيح";
    },
    run: async () => {
      const cfg = RB.data.settings;
      if(!cfg.openaiKey) return toast("⚠️ فعّل OpenAI أولاً");
      const text = prompt("النص للتحليل:");
      if(!text) return;
      try {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method:"POST",
          headers:{ Authorization:`Bearer ${cfg.openaiKey}`, "Content-Type":"application/json" },
          body: JSON.stringify({
            model:"gpt-4o-mini",
            messages:[{ role:"user", content:`حلل هذا النص وأخرج JSON: type, amount, person, date, time, project. النص: "${text}"` }]
          })
        }).then(r=>r.json());
        const out = r.choices?.[0]?.message?.content || "";
        toast("🤖 " + out.slice(0, 200));
      } catch(e){ toast("❌ خطأ"); }
    } },
  firebase: { id:"firebase", cat:"paid", icon:"🔥", name:"Firebase (سحابة)",
    desc:"مزامنة تلقائية. مجاني حتى حد معين.",
    help:"1) console.firebase.google.com\n2) مشروع جديد\n3) Firestore\n4) انسخ الإعدادات",
    fields:[
      { key:"fbApiKey", label:"API Key", type:"password", placeholder:"AIza..." },
      { key:"fbProjectId", label:"Project ID", type:"text", placeholder:"my-rimbook" }
    ],
    test: async (cfg) => {
      if(!cfg.fbApiKey || !cfg.fbProjectId) throw new Error("أدخل البيانات");
      return "✅ محفوظ — يحتاج إعداد Firestore";
    },
    run: () => toast("🔥 ميزة متقدمة — راجع الشرح") },
  customDomain: { id:"customDomain", cat:"paid", icon:"🌐", name:"دومين / APK",
    desc:"ربط دومين خاص أو إنشاء APK. مدفوع على نفقتك.",
    help:"1) ارفع على Netlify/Vercel (مجاني)\n2) اشترِ دومين\n3) اربطه\n4) pwabuilder.com لبناء APK",
    fields:[{ key:"myDomain", label:"دومينك", type:"url", placeholder:"https://rimbook.example.com" }],
    test: async () => "✅ ميزة خارجية",
    run:()=>{ const d = RB.data.settings.myDomain; if(d) open(d, "_blank"); else toast("أدخل الدومين"); } }
};

function isEnabled(id){
  const s = RB.data.settings;
  if(!s.enabled) s.enabled = {};
  return !!s.enabled[id];
}
function toggleIntegration(id, enable){
  const s = RB.data.settings;
  if(!s.enabled) s.enabled = {};
  s.enabled[id] = enable;
  RB.save(); render();
  toast(enable ? "✅ " + INTEGRATIONS[id].name : "⏸️ عُطّلت");
}
function saveIntegrationField(key, value){
  RB.data.settings[key] = value;
  RB.save();
}
async function testIntegration(id){
  const integ = INTEGRATIONS[id];
  if(!integ.test) return toast("لا اختبار");
  try {
    const msg = await integ.test(RB.data.settings);
    toast(msg);
  } catch (e) { alert("❌ " + (e.message || e)); }
}

VIEWS.integrations = () => {
  const s = RB.data.settings;
  const renderCard = (integ) => {
    const enabled = isEnabled(integ.id);
    const catBadge = { free:"🟢 مجاني", keyed:"🟡 بمفتاحك", paid:"🔴 على نفقتك" }[integ.cat];
    return `<div class="card" style="border-right:4px solid ${enabled?'var(--ok)':'var(--bd)'}">
      <div class=row style="justify-content:space-between">
        <b>${integ.icon} ${esc(integ.name)}</b>
        <span class=tag>${catBadge}</span>
      </div>
      <p class=muted style="margin:6px 0">${esc(integ.desc)}</p>
      ${integ.help ? `<details><summary class=muted>📖 كيف أفعّلها؟</summary><pre style="white-space:pre-wrap;font-size:11px;background:var(--in);padding:8px;border-radius:8px;margin-top:6px">${esc(integ.help)}</pre></details>` : ""}
      ${integ.fields.map(f => `
        <p style="margin:6px 0"><label class=muted>${f.label}</label><br>
        ${f.type === "select"
          ? `<select onchange="saveIntegrationField('${f.key}', this.value)">${f.options.map(o => `<option ${s[f.key]===o?"selected":""}>${o}</option>`).join("")}</select>`
          : `<input type="${f.type}" value="${esc(s[f.key] || "")}" placeholder="${f.placeholder || ""}" onchange="saveIntegrationField('${f.key}', this.value)" style="width:100%">`}
        </p>`).join("")}
      <div class=row style="margin-top:8px">
        <button class="${enabled?"":"p"}" onclick="toggleIntegration('${integ.id}', ${!enabled})">${enabled?"⏸️ تعطيل":"▶️ تفعيل"}</button>
        ${integ.test ? `<button onclick="testIntegration('${integ.id}')">🧪 اختبار</button>` : ""}
        ${enabled ? `<button class=p onclick="INTEGRATIONS['${integ.id}'].run()">🚀 تشغيل</button>` : ""}
      </div>
    </div>`;
  };
  const free = Object.values(INTEGRATIONS).filter(i => i.cat === "free");
  const keyed = Object.values(INTEGRATIONS).filter(i => i.cat === "keyed");
  const paid = Object.values(INTEGRATIONS).filter(i => i.cat === "paid");
  return `<div class=card><b>🧩 الإضافات</b>
    <p class=muted>كل ميزة تختار أنت تفعيلها. <b>لا شيء يعمل تلقائياً</b>.</p>
  </div>
  <h2 style="color:var(--ok);font-size:14px;margin:10px 0">🟢 مجاني بالكامل (${free.length})</h2>
  ${free.map(renderCard).join("")}
  <h2 style="color:var(--warn);font-size:14px;margin:10px 0">🟡 بمفتاحك الشخصي (${keyed.length})</h2>
  ${keyed.map(renderCard).join("")}
  <h2 style="color:var(--bad);font-size:14px;margin:10px 0">🔴 على نفقتك (${paid.length})</h2>
  ${paid.map(renderCard).join("")}`;
};
