/* rimbook compare.js - مقارنة شهرية بصرية */

function monthlyData(){
  const months = {};
  const now = new Date();
  for(let i = 5; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    months[key] = {
      key,
      label: d.toLocaleDateString("ar", { month: "short" }),
      due: 0, rec: 0, ot: 0, days: 0, tasks: 0
    };
  }
  const pid = RB.data.activeProject;
  RB.all("work").filter(w => !pid || w.project === pid).forEach(w => {
    const k = w.d.slice(0, 7);
    if(months[k]){
      months[k].due += w.due || 0;
      months[k].rec += w.rec || 0;
      months[k].ot += w.ot || 0;
      if(w.k === "work") months[k].days++;
    }
  });
  RB.all("task").filter(t => t.done && (!pid || t.project === pid)).forEach(t => {
    if(t.created){
      const k = iso(new Date(t.created)).slice(0, 7);
      if(months[k]) months[k].tasks++;
    }
  });
  return Object.values(months);
}

function drawMonthlyChart(){
  const cv = document.getElementById("chartMonthly");
  if(!cv) return;
  const ctx = cv.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = cv.width, H = cv.height;
  cv.style.width = W + "px";
  cv.style.height = H + "px";
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const data = monthlyData();
  const max = Math.max(1, ...data.map(d => Math.max(d.due, d.rec)));
  const padL = 30, padB = 30, padT = 20, padR = 10;
  const cw = W - padL - padR, ch = H - padT - padB;
  const groupW = cw / data.length;
  const bw = groupW * 0.35;

  const cs = getComputedStyle(document.body);
  const accent = cs.getPropertyValue("--ac").trim() || "#22d3ee";
  const ok = cs.getPropertyValue("--ok").trim() || "#10b981";
  const bad = cs.getPropertyValue("--bad").trim() || "#f43f5e";
  const muted = cs.getPropertyValue("--mu").trim() || "#9ca3af";

  ctx.strokeStyle = "#334155"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ch); ctx.lineTo(padL + cw, padT + ch); ctx.stroke();

  data.forEach((d, i) => {
    const x = padL + i * groupW + groupW * 0.15;
    const hDue = (d.due / max) * ch;
    const hRec = (d.rec / max) * ch;
    ctx.fillStyle = bad;
    ctx.fillRect(x, padT + ch - hDue, bw, hDue);
    ctx.fillStyle = ok;
    ctx.fillRect(x + bw + 4, padT + ch - hRec, bw, hRec);
    ctx.fillStyle = muted; ctx.font = "10px system-ui"; ctx.textAlign = "center";
    ctx.fillText(d.label, x + bw + 2, H - 8);
  });

  ctx.textAlign = "left"; ctx.font = "10px system-ui";
  ctx.fillStyle = bad; ctx.fillRect(W - 130, 4, 8, 8);
  ctx.fillStyle = muted; ctx.fillText("مستحق", W - 118, 12);
  ctx.fillStyle = ok; ctx.fillRect(W - 70, 4, 8, 8);
  ctx.fillStyle = muted; ctx.fillText("واصل", W - 58, 12);
}

function monthlyCompareTable(){
  const data = monthlyData();
  return `<div class=card>
    <b>📊 المقارنة الشهرية</b>
    <canvas id=chartMonthly width=400 height=180 style="margin-top:8px"></canvas>
    <table style="width:100%;font-size:12px;margin-top:10px;border-collapse:collapse">
      <tr style="background:var(--in)"><th style="padding:4px">الشهر</th><th>أيام</th><th>إضافي</th><th>مستحق</th><th>واصل</th><th>مهام</th></tr>
      ${data.map(d => `<tr style="border-bottom:1px solid var(--bd)">
        <td style="padding:4px"><b>${d.label}</b></td>
        <td>${d.days}</td><td>${d.ot}</td>
        <td class=hi>${d.due.toFixed(0)}</td>
        <td class=ok>${d.rec.toFixed(0)}</td>
        <td>${d.tasks}</td>
      </tr>`).join("")}
    </table>
  </div>`;
    }
