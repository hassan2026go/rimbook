/* rimbook charts.js - مخططات بدون مكتبات */

function drawCharts(){
  drawTasksChart();
  drawProjectsChart();
}

function drawTasksChart(){
  const cv = document.getElementById("chartTasks");
  if(!cv) return;
  const ctx = cv.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = cv.width, H = cv.height;
  cv.style.width = W + "px";
  cv.style.height = H + "px";
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pid = RB.data.activeProject;
  const tasks = RB.all("task").filter(x=>!pid||x.project===pid);
  const data = [...Array(7)].map((_,i) => {
    const k = iso(new Date(Date.now()-(6-i)*864e5));
    return { d:k, n: tasks.filter(t=>t.done && t.created && iso(new Date(t.created))===k).length };
  });
  const max = Math.max(1, ...data.map(d=>d.n));
  const padL = 24, padB = 24, padT = 10, padR = 10;
  const cw = W - padL - padR, ch = H - padT - padB;
  const bw = cw / data.length * 0.7;
  const gap = cw / data.length;
  const accent = getComputedStyle(document.body).getPropertyValue("--ac").trim() || "#22d3ee";
  const muted = getComputedStyle(document.body).getPropertyValue("--mu").trim() || "#9ca3af";

  ctx.strokeStyle = "#334155"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ch); ctx.lineTo(padL + cw, padT + ch); ctx.stroke();

  data.forEach((d, i) => {
    const h = (d.n / max) * ch;
    const x = padL + i * gap + (gap - bw) / 2;
    const y = padT + ch - h;
    const grad = ctx.createLinearGradient(0, y, 0, padT + ch);
    grad.addColorStop(0, accent); grad.addColorStop(1, accent + "33");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, bw, h);
    ctx.fillStyle = muted; ctx.font = "10px system-ui"; ctx.textAlign = "center";
    ctx.fillText(new Date(d.d).toLocaleDateString("ar",{weekday:"short"}), x + bw/2, H - 6);
    if(d.n > 0){ ctx.fillStyle = accent; ctx.fillText(d.n, x + bw/2, y - 3); }
  });
}

function drawProjectsChart(){
  const cv = document.getElementById("chartProjects");
  if(!cv) return;
  const ctx = cv.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = cv.width, H = cv.height;
  cv.style.width = W + "px";
  cv.style.height = H + "px";
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const projects = RB.data.projects;
  if(!projects.length){
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--mu").trim() || "#9ca3af";
    ctx.font = "12px system-ui"; ctx.textAlign = "center";
    ctx.fillText("لا مشاريع لعرضها", W/2, H/2);
    return;
  }
  const data = projects.map(p => {
    let due = 0, rec = 0;
    RB.all("work").filter(w=>w.project===p.id).forEach(w=>{ due += w.due||0; rec += w.rec||0; });
    return { name: p.name, color: p.color, value: Math.max(due, rec, 1), due, rec };
  });
  const max = Math.max(...data.map(d=>d.value), 1);
  const padL = 60, padR = 10, padT = 10, padB = 10;
  const cw = W - padL - padR, ch = H - padT - padB;
  const rowH = ch / data.length;
  const barH = Math.min(rowH * 0.6, 20);
  const muted = getComputedStyle(document.body).getPropertyValue("--mu").trim() || "#9ca3af";

  data.forEach((d, i) => {
    const y = padT + i * rowH + (rowH - barH) / 2;
    const w = (d.value / max) * cw;
    ctx.fillStyle = d.color || "#22d3ee";
    ctx.fillRect(padL, y, w, barH);
    ctx.fillStyle = muted;
    ctx.font = "10px system-ui"; ctx.textAlign = "right";
    ctx.fillText(d.name.slice(0, 12), padL - 4, y + barH * 0.7);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--tx").trim() || "#fff";
    ctx.textAlign = "left";
    ctx.fillText(d.value.toFixed(0), padL + w + 4, y + barH * 0.7);
  });
    }
