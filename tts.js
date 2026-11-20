/* rimbook tts.js - Text to Speech + Speech to Text */

function speakText(text, lang){
  if(!("speechSynthesis" in window)) return toast("القراءة الصوتية غير مدعومة");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang || "ar-SA";
  u.rate = 1; u.pitch = 1;
  u.onstart = () => toast("🔊 يقرأ...");
  u.onerror = () => toast("❌ خطأ في القراءة");
  speechSynthesis.speak(u);
}

function stopSpeak(){ speechSynthesis.cancel(); }

async function transcribeAudio(audioBlob, language){
  /* يستخدم OpenAI Whisper إن توفر المفتاح */
  const cfg = RB.data.settings;
  if(!cfg.openaiKey) {
    toast("⚠️ يحتاج مفتاح OpenAI لتحويل الصوت إلى نص");
    return null;
  }
  const fd = new FormData();
  fd.append("file", audioBlob, "audio.webm");
  fd.append("model", "whisper-1");
  if(language) fd.append("language", language);
  try {
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + cfg.openaiKey },
      body: fd
    });
    if(!r.ok) throw new Error("فشل");
    const data = await r.json();
    return data.text;
  } catch(e){
    toast("❌ فشل التحويل");
    return null;
  }
}

/* زر القراءة الصوتية للملاحظات */
function noteSpeakBtn(note){
  return `<button onclick='speakText(${JSON.stringify(note.body)})' title="اقرأ">🔊</button>`;
}
