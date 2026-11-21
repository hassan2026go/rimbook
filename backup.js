/* Rimbook full backup — includes local records and IndexedDB attachments.
   One backup format is shared by local export, encrypted export, Google Drive and device transfer. */
(function () {
  "use strict";
  const FORMAT = "rimbook-full-backup";
  const VERSION = 1;
  const fileDate = () => iso(new Date());
  const toastError = message => toast("تعذر إكمال النسخ الاحتياطي: " + message);

  function bytesToBase64(bytes) {
    let binary = "";
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode(...bytes.subarray(i, i + step));
    }
    return btoa(binary);
  }
  function base64ToBlob(base64, type) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: type || "application/octet-stream" });
  }

  window.collectRimbookBackup = async function () {
    if (!window.ATT_DB) throw new Error("قاعدة المرفقات غير متاحة");
    const appData = JSON.parse(JSON.stringify(RB.data));
    const refs = new Map();
    (appData.items || []).forEach(item => (item.attachments || []).forEach(att => {
      if (att && att.aid) refs.set(String(att.aid), att);
    }));
    const attachments = [];
    for (const [aid, meta] of refs) {
      const stored = await ATT_DB.get(aid);
      if (!stored || !stored.blob) throw new Error("المرفق غير موجود: " + (meta.name || aid));
      const bytes = new Uint8Array(await stored.blob.arrayBuffer());
      attachments.push({
        aid, name: stored.name || meta.name || aid,
        type: stored.type || meta.type || "application/octet-stream",
        size: bytes.byteLength, base64: bytesToBase64(bytes)
      });
    }
    return {
      format: FORMAT, version: VERSION, createdAt: new Date().toISOString(),
      appData, attachments
    };
  };

  window.restoreRimbookBackup = async function (payload) {
    if (payload && payload.format === FORMAT) {
      if (!payload.appData || !Array.isArray(payload.appData.items) || !Array.isArray(payload.attachments)) {
        throw new Error("بنية ملف النسخة غير صالحة");
      }
      if (!window.ATT_DB) throw new Error("قاعدة المرفقات غير متاحة");
      for (const item of payload.attachments) {
        if (!item || !item.aid || typeof item.base64 !== "string") throw new Error("بيانات مرفق غير صالحة");
        const blob = base64ToBlob(item.base64, item.type);
        await ATT_DB.put(item.aid, { name: item.name || item.aid, type: item.type || blob.type, size: blob.size, blob });
      }
      if (!RB.replace(payload.appData)) throw new Error("تعذر استبدال بيانات التطبيق");
      render();
      return { legacy: false, attachments: payload.attachments.length };
    }
    // Backward compatibility: accept all previous JSON backups.
    if (payload && Array.isArray(payload.items)) {
      if (!RB.replace(payload)) throw new Error("تعذر استعادة النسخة القديمة");
      render();
      return { legacy: true, attachments: 0 };
    }
    throw new Error("ملف النسخة غير معروف أو تالف");
  };

  window.backupLocal = async function () {
    try {
      const payload = await collectRimbookBackup();
      const content = JSON.stringify(payload);
      dl("rimbook-full-backup-" + fileDate() + ".json", content, "application/json");
      toast("تم إنشاء نسخة كاملة تشمل البيانات والمرفقات (" + payload.attachments.length + ")");
    } catch (e) { toastError(e.message || "خطأ غير معروف"); }
  };

  window.restoreLocal = async function (input) {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!confirm("ستُستبدل بيانات المفكرة الحالية بمحتويات النسخة. هل تريد المتابعة؟")) return;
      const result = await restoreRimbookBackup(payload);
      toast(result.legacy ? "تمت استعادة النسخة القديمة؛ المرفقات غير مشمولة فيها." : "تمت استعادة البيانات و" + result.attachments + " مرفقاً.");
    } catch (e) { toastError(e.message || "ملف غير صالح"); }
    finally { input.value = ""; }
  };

  window.backupEncrypted = async function () {
    const pass = prompt("كلمة سر التشفير (6 أحرف على الأقل). احتفظ بها؛ لا يمكن استعادتها.");
    if (!pass || pass.length < 6) return toast("كلمة السر يجب أن تكون 6 أحرف على الأقل");
    try {
      const payload = await collectRimbookBackup();
      const encrypted = await encryptData(payload, pass);
      const blob = new Blob([encrypted], { type: "application/octet-stream" });
      const file = new File([blob], "rimbook-encrypted-" + fileDate() + ".rbe", { type: "application/octet-stream" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: "Rimbook encrypted backup" });
      else dl(file.name, blob, "application/octet-stream");
      toast("تم إنشاء نسخة مشفرة تشمل المرفقات");
    } catch (e) { toastError(e.message || "فشل التشفير"); }
  };

  window.restoreEncrypted = async function (input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const pass = prompt("كلمة سر فك التشفير:");
    if (!pass) return;
    try {
      const payload = await decryptData(new Uint8Array(await file.arrayBuffer()), pass);
      if (!confirm("ستُستبدل بيانات المفكرة الحالية بمحتويات النسخة المشفرة. هل تريد المتابعة؟")) return;
      const result = await restoreRimbookBackup(payload);
      toast(result.legacy ? "تمت استعادة النسخة المشفرة القديمة." : "تم فك التشفير واستعادة البيانات والمرفقات.");
    } catch (e) { toast("فشل فك التشفير أو استعادة النسخة: تحقق من كلمة السر وسلامة الملف."); }
    finally { input.value = ""; }
  };

  window.gdriveUpload = async function () {
    try {
      const token = await gdriveAuth();
      const payload = await collectRimbookBackup();
      const content = JSON.stringify(payload);
      const boundary = "----rimbook" + Date.now();
      const meta = { name: GDRIVE_FILE, mimeType: "application/json" };
      const body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(meta) + "\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" +
        content + "\r\n--" + boundary + "--";
      const query = encodeURIComponent("name='" + GDRIVE_FILE + "' and trashed=false");
      const listing = await fetch("https://www.googleapis.com/drive/v3/files?q=" + query + "&fields=files(id)", {
        headers: { Authorization: "Bearer " + token }
      }).then(r => { if (!r.ok) throw new Error("تعذر البحث في Drive"); return r.json(); });
      const existing = listing.files && listing.files[0];
      const url = existing
        ? "https://www.googleapis.com/upload/drive/v3/files/" + existing.id + "?uploadType=multipart"
        : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      const response = await fetch(url, {
        method: existing ? "PATCH" : "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "multipart/related; boundary=" + boundary },
        body
      });
      if (!response.ok) throw new Error("فشل رفع النسخة إلى Drive: " + response.status);
      toast("تم رفع النسخة الكاملة والمرفقات إلى Google Drive");
    } catch (e) { toastError(e.message || "تعذر الاتصال بـ Google Drive"); }
  };

  window.gdriveDownload = async function () {
    try {
      const token = await gdriveAuth();
      const query = encodeURIComponent("name='" + GDRIVE_FILE + "' and trashed=false");
      const listing = await fetch("https://www.googleapis.com/drive/v3/files?q=" + query + "&fields=files(id)", {
        headers: { Authorization: "Bearer " + token }
      }).then(r => { if (!r.ok) throw new Error("تعذر البحث في Drive"); return r.json(); });
      if (!listing.files || !listing.files.length) return toast("لا توجد نسخة على Google Drive");
      const response = await fetch("https://www.googleapis.com/drive/v3/files/" + listing.files[0].id + "?alt=media", {
        headers: { Authorization: "Bearer " + token }
      });
      if (!response.ok) throw new Error("تعذر تنزيل النسخة");
      const payload = await response.json();
      if (!confirm("ستُستبدل بيانات المفكرة الحالية بالنسخة الموجودة على Google Drive. هل تريد المتابعة؟")) return;
      const result = await restoreRimbookBackup(payload);
      toast(result.legacy ? "تم تنزيل النسخة القديمة." : "تم تنزيل واستعادة البيانات و" + result.attachments + " مرفقاً.");
    } catch (e) { toastError(e.message || "تعذر تنزيل النسخة"); }
  };

  async function shareFullBackup(target) {
    try {
      const payload = await collectRimbookBackup();
      const content = JSON.stringify(payload);
      const file = new File([content], "rimbook-full-backup-" + fileDate() + ".json", { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Rimbook full backup" }); return; }
        catch (e) { if (e.name === "AbortError") return; }
      }
      dl(file.name, content, "application/json");
      if (target === "whatsapp") {
        const phone = String(RB.data.settings.managerPhone || "").replace(/\D/g, "");
        setTimeout(() => window.open(phone ? "https://wa.me/" + phone : "https://wa.me/", "_blank"), 500);
      }
      toast("تم تجهيز نسخة كاملة للمشاركة");
    } catch (e) { toastError(e.message || "تعذر تجهيز النسخة"); }
  }
  window.shareFileWhatsApp = () => shareFullBackup("whatsapp");
  window.shareViaAny = () => shareFullBackup("any");
})();
