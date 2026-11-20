/* rimbook sync.js - Google Drive + مشاركة + WebRTC */

function getGDriveClientId(){ return RB.data.settings.gdriveClientId || ""; }
const GDRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GDRIVE_FILE = "rimbook-backup.json";
let gToken = null, gTokenExp = 0;

function loadGapi(){
  return new Promise((res, rej) => {
    if(window.google && window.google.accounts) return res();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function gdriveAuth(){
  if(gToken && Date.now() < gTokenExp) return gToken;
  const CLIENT_ID = getGDriveClientId();
  if(!CLIENT_ID){
    toast("⚠️ فعّل Google Drive وأدخل Client ID من الإضافات");
    throw new Error("CLIENT_ID missing");
  }
  await loadGapi();
  return new Promise((res, rej) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: GDRIVE_SCOPE,
      callback: r => {
        if(r.error){ rej(r); return; }
        gToken = r.access_token;
        gTokenExp = Date.now() + (r.expires_in*1000) - 60000;
        res(gToken);
      }
    });
    client.requestAccessToken();
  });
}

async function gdriveUpload(){
  try {
    const tok = await gdriveAuth();
    const content = JSON.stringify(RB.data);
    const boundary = "----rimbook" + Date.now();
    const meta = { name: GDRIVE_FILE, mimeType: "application/json" };
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
    const q = encodeURIComponent(`name='${GDRIVE_FILE}' and trashed=false`);
    const list = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
      headers: { Authorization: "Bearer " + tok }
    }).then(r => r.json());
    let url, method;
    if(list.files && list.files.length){
      url = `https://www.googleapis.com/upload/drive/v3/files/${list.files[0].id}?uploadType=multipart`;
      method = "PATCH";
    } else {
      url = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
      method = "POST";
    }
    const r = await fetch(url, { method, headers: { Authorization: "Bearer " + tok, "Content-Type": `multipart/related; boundary=${boundary}` }, body });
    if(!r.ok) throw new Error("فشل الرفع: " + r.status);
    toast("✅ تم الرفع إلى Drive");
  } catch (e) { console.error(e); }
}

async function gdriveDownload(){
  try {
    const tok = await gdriveAuth();
    const q = encodeURIComponent(`name='${GDRIVE_FILE}' and trashed=false`);
    const list = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
      headers: { Authorization: "Bearer " + tok }
    }).then(r => r.json());
    if(!list.files || !list.files.length) return toast("لا يوجد ملف على Drive");
    const id = list.files[0].id;
    const data = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
      headers: { Authorization: "Bearer " + tok }
    }).then(r => r.json());
    RB.replace(data); render(); toast("✅ تم التنزيل");
  } catch (e) { console.error(e); }
}

async function shareFileWhatsApp(){
  const content = JSON.stringify(RB.data, null, 1);
  const file = new File([new Blob([content], { type: "application/json" })], `rimbook-${new Date().toISOString().slice(0,10)}.json`, { type: "application/json" });
  if(navigator.canShare && navigator.canShare({ files: [file] })){
    try { await navigator.share({ files: [file], title: "rimbook backup" }); toast("✅ تمت المشاركة"); return; }
    catch(e){ if(e.name === "AbortError") return; }
  }
  dl(file.name, content, "application/json");
  setTimeout(() => {
    const phone = RB.data.settings.managerPhone.replace(/\D/g,"");
    open(phone ? `https://wa.me/${phone}` : "https://wa.me/", "_blank");
    toast("📥 أرفق الملف في واتساب");
  }, 500);
}

async function shareCsvWhatsApp(){ csvW(); setTimeout(()=>toast("📥 أرفق CSV"), 300); }

async function sharePdfReport(){
  const pid = RB.data.activeProject;
  let days=0, ot=0, due=0, rec=0;
  RB.all("work").filter(e=>!pid||e.project===pid).forEach(e=>{
    if(e.k==="work") days++; ot+=e.ot||0; due+=e.due||0; rec+=e.rec||0;
  });
  const proj = activeProj();
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>rimbook report</title>
  <style>body{font-family:system-ui,Tahoma;padding:20px;max-width:600px;margin:auto;color:#111}
  h1{color:#2563eb;border-bottom:2px solid #2563eb;padding-bottom:8px}
  table{width:100%;border-collapse:collapse;margin:10px 0}
  th,td{border:1px solid #ccc;padding:6px;text-align:right}th{background:#f3f4f6}.muted{color:#666;font-size:12px}</style></head><body>
  <h1>📋 تقرير rimbook</h1>
  ${proj?`<p><b>📁 ${proj.name}</b></p>`:""}
  <p><b>📅 ${new Date().toLocaleDateString("ar")}</b></p>
  <table>
    <tr><th>أيام</th><td>${days}</td></tr>
    <tr><th>إضافي</th><td>${ot}</td></tr>
    <tr><th>واصل</th><td>${rec} ${RB.data.settings.currency}</td></tr>
    <tr><th>متبقي</th><td><b style="color:#f43f5e">${due-rec} ${RB.data.settings.currency}</b></td></tr>
  </table>
  <h2>الحركات</h2>
  <table><tr><th>التاريخ</th><th>النوع</th><th>البيان</th><th>واصل</th><th>مستحق</th></tr>
  ${RB.all("work").map(e=>`<tr><td>${e.d}</td><td>${e.k}</td><td>${e.ds||""}</td><td>${e.rec||0}</td><td>${e.due||0}</td></tr>`).join("")}</table>
  <p class=muted>${RB.data.profile.about.replace(/\n/g,"<br>")}</p>
  </body></html>`;
  const file = new File([new Blob([html], { type: "text/html" })], `rimbook-report-${new Date().toISOString().slice(0,10)}.html`, { type: "text/html" });
  if(navigator.canShare && navigator.canShare({ files: [file] })){
    try { await navigator.share({ files: [file], title: "rimbook report" }); return; } catch(e){}
  }
  const w = window.open("", "_blank");
  w.document.write(html); w.document.close();
  setTimeout(() => w.print(), 500);
}

async function shareViaAny(){
  const content = JSON.stringify(RB.data, null, 1);
  const file = new File([new Blob([content], { type: "application/json" })], `rimbook-${new Date().toISOString().slice(0,10)}.json`, { type: "application/json" });
  if(navigator.canShare && navigator.canShare({ files: [file] })){
    try { await navigator.share({ files: [file], title: "rimbook backup" }); return; }
    catch(e){ if(e.name === "AbortError") return; }
  }
  dl(file.name, content, "application/json");
  toast("📥 تم التحميل");
}

/* WebRTC */
const rtc = { pc: null, dc: null };
async function rtcInit(){
  rtc.pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  rtc.dc = rtc.pc.createDataChannel("rimbook");
  rtc.dc.onopen = () => { rtc.dc.send(JSON.stringify(RB.data)); toast("✅ أرسلنا البيانات"); };
  rtc.dc.onmessage = e => {
    try { RB.replace(JSON.parse(e.data)); render(); toast("✅ استقبلنا البيانات"); } catch(_){}
  };
}
async function rtcCreateOffer(){
  if(!rtc.pc) await rtcInit();
  const offer = await rtc.pc.createOffer();
  await rtc.pc.setLocalDescription(offer);
  await new Promise(r => setTimeout(r, 1500));
  const code = btoa(JSON.stringify(rtc.pc.localDescription));
  try { await navigator.clipboard.writeText(code); } catch(_){}
  alert("كود الاتصال (أرسله للجهاز الآخر):\n\n" + code);
}
async function rtcAcceptOffer(){
  const code = prompt("الصق كود الاتصال:");
  if(!code) return;
  try {
    const desc = JSON.parse(atob(code));
    if(!rtc.pc) await rtcInit();
    await rtc.pc.setRemoteDescription(desc);
    const answer = await rtc.pc.createAnswer();
    await rtc.pc.setLocalDescription(answer);
    await new Promise(r => setTimeout(r, 1500));
    const answerCode = btoa(JSON.stringify(rtc.pc.localDescription));
    try { await navigator.clipboard.writeText(answerCode); } catch(_){}
    alert("أرسل كود الرد:\n\n" + answerCode);
  } catch(e){ alert("كود غير صالح"); }
}
async function rtcAcceptAnswer(){
  const code = prompt("الصق كود الرد:");
  if(!code) return;
  try {
    const desc = JSON.parse(atob(code));
    await rtc.pc.setRemoteDescription(desc);
    toast("⏳ جاري الاتصال...");
  } catch(e){ alert("كود غير صالح"); }
    }
