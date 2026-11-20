/* rimbook crypto.js - تشفير end-to-end (AES-GCM) */

async function deriveKey(password, salt){
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false, ["encrypt", "decrypt"]
  );
}

async function encryptData(data, password){
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(data))
  );
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  return combined;
}

async function decryptData(buffer, password){
  const salt = buffer.slice(0, 16);
  const iv = buffer.slice(16, 28);
  const encrypted = buffer.slice(28);
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function backupEncrypted(){
  const pass = prompt("كلمة سر التشفير (احفظها جيداً، لا يمكن استعادتها):");
  if(!pass || pass.length < 6) return toast("⚠️ كلمة السر 6 أحرف على الأقل");
  try {
    const encrypted = await encryptData(RB.data, pass);
    const blob = new Blob([encrypted], { type: "application/octet-stream" });
    const file = new File([blob], `rimbook-encrypted-${iso(new Date())}.rbe`, { type: "application/octet-stream" });
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({ files:[file], title:"rimbook مشفّر" });
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
    }
    toast("✅ نسخة مشفّرة");
  } catch(e){ toast("❌ فشل التشفير"); }
}

async function restoreEncrypted(input){
  const f = input.files[0]; if(!f) return;
  const pass = prompt("كلمة سر فك التشفير:");
  if(!pass) return;
  try {
    const buf = await f.arrayBuffer();
    const data = await decryptData(new Uint8Array(buf), pass);
    RB.replace(data); render();
    toast("✅ استعادة ناجحة");
  } catch(e){ toast("❌ كلمة سر خاطئة أو ملف تالف"); }
    }
