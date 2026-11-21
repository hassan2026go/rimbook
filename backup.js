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
    if (typeof ATT_DB === "undefined") throw new Error("قاعدة المرفقات غير متاحة");
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
      if (!(typeof ATT_DB !== "undefined" ? ATT_DB : null)) throw new Error("قاعدة المرفقات غير متاحة");
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

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function concatBytes(parts) {
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) { out.set(part, offset); offset += part.length; }
    return out;
  }
  function u16(value) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
  function u32(value) { return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }
  function buildStoredZip(files) {
    const encoder = new TextEncoder(), local = [], central = [];
    let offset = 0;
    for (const file of files) {
      const name = encoder.encode(file.name), data = file.data;
      const crc = crc32(data), size = data.length, flags = 0x0800;
      const header = concatBytes([
        u32(0x04034b50),u16(20),u16(flags),u16(0),u16(0),u16(0),
        u32(crc),u32(size),u32(size),u16(name.length),u16(0),name
      ]);
      local.push(header, data);
      const directory = concatBytes([
        u32(0x02014b50),u16(20),u16(20),u16(flags),u16(0),u16(0),u16(0),
        u32(crc),u32(size),u32(size),u16(name.length),u16(0),u16(0),
        u16(0),u16(0),u32(0),u32(offset),name
      ]);
      central.push(directory);
      offset += header.length + data.length;
    }
    const centralBytes = concatBytes(central), localBytes = concatBytes(local);
    const end = concatBytes([
      u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),
      u32(centralBytes.length),u32(localBytes.length),u16(0)
    ]);
    return concatBytes([localBytes, centralBytes, end]);
  }
  function parseStoredZip(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const decoder = new TextDecoder();
    const files = new Map();
    let offset = 0;
    while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
      const flags = view.getUint16(offset + 6, true);
      const method = view.getUint16(offset + 8, true);
      const expectedCrc = view.getUint32(offset + 14, true);
      const size = view.getUint32(offset + 18, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      if ((flags & 8) || method !== 0) throw new Error("ملف ZIP مضغوط أو يستخدم واصف بيانات غير مدعوم");
      const nameStart = offset + 30;
      const dataStart = nameStart + nameLength + extraLength;
      const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
      const data = bytes.slice(dataStart, dataStart + size);
      if (data.length !== size || crc32(data) !== expectedCrc) throw new Error("تلف في أحد ملفات ZIP");
      files.set(name, data);
      offset = dataStart + size;
    }
    if (!files.has("rimbook-backup.json")) throw new Error("ملف بيانات Rimbook غير موجود داخل ZIP");
    return files;
  }

  window.backupZip = async function () {
    try {
      const payload = await collectRimbookBackup();
      const encoder = new TextEncoder();
      const attachments = [];
      const files = [];
      for (const item of payload.attachments) {
        const path = "attachments/" + item.aid + ".bin";
        const binary = atob(item.base64);
        const data = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
        files.push({ name: path, data });
        attachments.push({ aid:item.aid, name:item.name, type:item.type, size:item.size, path });
      }
      const manifest = {
        format: FORMAT, version: VERSION, createdAt: payload.createdAt,
        appData: payload.appData, attachments
      };
      files.unshift({ name:"rimbook-backup.json", data:encoder.encode(JSON.stringify(manifest)) });
      const zip = buildStoredZip(files);
      dl("rimbook-full-backup-" + fileDate() + ".zip", new Blob([zip], {type:"application/zip"}), "application/zip");
      toast("تم إنشاء ملف ZIP كامل يضم البيانات و" + attachments.length + " مرفقاً");
    } catch (e) { toastError(e.message || "تعذر إنشاء ZIP"); }
  };

  window.restoreZip = async function (input) {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const files = parseStoredZip(new Uint8Array(await file.arrayBuffer()));
      const decoder = new TextDecoder();
      const manifest = JSON.parse(decoder.decode(files.get("rimbook-backup.json")));
      if (!manifest || manifest.format !== FORMAT || !manifest.appData || !Array.isArray(manifest.attachments)) {
        throw new Error("بنية نسخة ZIP غير صالحة");
      }
      const attachments = [];
      for (const item of manifest.attachments) {
        const bytes = files.get(item.path);
        if (!bytes) throw new Error("مرفق مفقود داخل ZIP: " + (item.name || item.aid));
        attachments.push({
          aid:item.aid, name:item.name, type:item.type, size:bytes.length,
          base64:bytesToBase64(bytes)
        });
      }
      if (!confirm("ستُستبدل بيانات المفكرة الحالية بمحتويات ملف ZIP الكامل. هل تريد المتابعة؟")) return;
      const result = await restoreRimbookBackup({
        format:FORMAT, version:manifest.version, createdAt:manifest.createdAt,
        appData:manifest.appData, attachments
      });
      toast("تمت استعادة نسخة ZIP والبيانات و" + result.attachments + " مرفقاً");
    } catch (e) { toastError(e.message || "ملف ZIP غير صالح"); }
    finally { input.value = ""; }
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
