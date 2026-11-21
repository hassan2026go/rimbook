/* rimbook ai-suggest.js - اقتراحات ذكية بدون AI خارجي (قواعد) */

function generateSuggestions(){
  const suggestions = [];
  const now = new Date();
  const today = iso(now);
  const pid = RB.data.activeProject;
  const tasks = RB.all("task").filter(t => !pid || t.project === pid);
  const open = tasks.filter(t => !t.done);
  const late = open.filter(t => t.due && t.due < today);
  const upcoming = open.filter(t => t.due && t.due === today);
  const events = dayEvents(today);
  /* مهام متأخرة */
  if(late.length > 0){
    suggestions.push({
      icon: "⚠️",
      text: `لديك ${late.length} ${late.length === 1 ? "مهمة متأخرة" : "مهام متأخرة"}`,
      action: () => { taskFilter = "open"; go("tasks"); },
      actionText: "عرض"
    });
  }

  /* مهام اليوم */
  if(upcoming.length > 0){
    suggestions.push({
      icon: "📌",
      text: `${upcoming.length} مهمة مستحقة اليوم`,
      action: () => go("tasks"),
      actionText: "عرض"
    });
  }

  /* مواعيد قريبة */
  const nextEvent = events.find(e => e.t && new Date(`${today}T${e.t}`) > now);
  if(nextEvent){
    const diff = Math.round((new Date(`${today}T${nextEvent.t}`) - now) / 60000);
    if(diff <= 120){
      suggestions.push({
        icon: "⏰",
        text: `${nextEvent.title} بعد ${diff < 60 ? diff + " دقيقة" : Math.round(diff/60) + " ساعة"}`,
        action: () => go("agenda"),
        actionText: "التفاصيل"
      });
    }
  }

  /* رصيد متأخر */
  const L = ledgerTotals();
  if(L.rem > 0 && L.rem > 100){
    suggestions.push({
      icon: "💰",
      text: `رصيدك المستحق: ${L.rem} ${getBaseSymbol()}`,
      action: () => go("ledger"),
      actionText: "متابعة"
    });
  }

  /* فواتير معلقة */
  const unpaidInvs = (RB.data.invoices || []).filter(i => !i.paid && (!pid || i.project === pid));
  if(unpaidInvs.length > 0){
    suggestions.push({
      icon: "🧾",
      text: `${unpaidInvs.length} فاتورة معلقة`,
      action: () => go("projects"),
      actionText: "عرض"
    });
  }

  /* انجاز ممتاز */
  if(tasks.length > 5 && open.length === 0){
    suggestions.push({
      icon: "🎉",
      text: "أنجزت كل المهام! عمل رائع",
      action: () => {},
      actionText: ""
    });
  }

  /* فترات طويلة بلا ملاحظات */
  const lastNote = RB.all("note").slice(-1)[0];
  if(lastNote){
    const daysSince = Math.floor((now - new Date(lastNote.created || lastNote.d)) / 864e5);
    if(daysSince > 5){
      suggestions.push({
        icon: "📝",
        text: `لم تكتب ملاحظة منذ ${daysSince} أيام`,
        action: () => go("notes"),
        actionText: "اكتب"
      });
    }
  }

  return suggestions;
}

function suggestionsCard(){
  const s = generateSuggestions();
  if(!s.length) return "";
  return `<div class=card style="background:linear-gradient(135deg,rgba(34,211,238,.1),rgba(139,92,246,.1));border:1px solid var(--ac)">
    <b>🤖 اقتراحات ذكية</b>
    ${s.slice(0, 4).map(x => `<div class=item style="border:none;padding:6px 0">
      <span>${x.icon} ${esc(x.text)}</span>
      ${x.actionText ? `<button onclick="(${x.action})()" style="padding:4px 10px;font-size:11px">${x.actionText}</button>` : ""}
    </div>`).join("")}
  </div>`;
}
