"use strict";

const SERIES = {
  "Cajal@10000": "var(--cajal-3)",
  "Cajal@20000": "var(--cajal-2)",
  "Cajal@30000": "var(--cajal)",
  "v0@10000": "var(--prev-2)",
  "v0@16000": "var(--prev)",
};
const fmt = (v) => (v == null ? "–" : v.toFixed(3));
const el = (tag, attrs = {}, html = "") => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function lines(bench, metric) {
  const by = Object.fromEntries(bench.methods.map((m) => [m.id, m]));
  if (metric.task === "整合") return [{ name: "PCA", v: by["PCA (unintegrated)"].scores[metric.key], dash: false }];
  return [
    { name: "XGBoost", v: by.XGBoost.scores[metric.key], dash: false },
    { name: "逻辑回归", v: by.LogReg.scores[metric.key], dash: true },
  ];
}

function panel(bench, metric) {
  const series = bench.methods.filter((m) => m.id in SERIES);
  const kills = lines(bench, metric);
  const vals = series.map((m) => m.scores[metric.key]).concat(kills.map((k) => k.v));
  const lo = Math.floor((Math.min(...vals) - 0.06) * 50) / 50;
  const hi = Math.ceil((Math.max(...vals) + 0.03) * 50) / 50;
  const W = 260, H = 170, L = 30, R = 6, T = 8, B = 30;
  const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const bw = (W - L - R) / series.length;
  let svg = "";
  for (let t = 0; t <= 4; t++) {
    const v = lo + ((hi - lo) * t) / 4;
    svg += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tk" x="${L - 4}" y="${y(v) + 3}" text-anchor="end">${v.toFixed(2)}</text>`;
  }
  series.forEach((m, i) => {
    const v = m.scores[metric.key];
    const x = L + i * bw + bw * 0.18, w = bw * 0.64, top = y(v);
    const above = kills.every((k) => v >= k.v);
    svg += `<rect x="${x}" y="${top}" width="${w}" height="${y(lo) - top}" rx="3" style="fill:${SERIES[m.id]}"><title>${esc(m.name + " " + m.note)}：${fmt(v)}${above ? "，越过斩杀线" : "，未全部越过"}</title></rect>`;
    svg += `<text class="val" x="${x + w / 2}" y="${top - 3}" text-anchor="middle">${fmt(v).slice(1)}</text>`;
    svg += `<text class="tk" x="${x + w / 2}" y="${H - 16}" text-anchor="middle">${m.id.startsWith("v0") ? "v0" : "C"}</text><text class="tk" x="${x + w / 2}" y="${H - 5}" text-anchor="middle">${m.note.replace(" 步", "")}</text>`;
  });
  kills.forEach((k) => {
    svg += `<line class="kl${k.dash ? " dash" : ""}" x1="${L}" x2="${W - R}" y1="${y(k.v)}" y2="${y(k.v)}"><title>${k.name} ${fmt(k.v)}</title></line>`;
  });
  const keys = kills.map((k) => `<span class="kk"><i class="ln${k.dash ? " dash" : ""}"></i>${k.name} ${fmt(k.v)}</span>`).join("");
  const p = el("div", { class: "panel" });
  p.innerHTML = `<h3>${metric.task}<span>${metric.label}</span></h3><div class="kills">${keys}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(metric.task + metric.label)}">${svg}</svg>`;
  return p;
}

function renderBench(bench) {
  const leg = document.getElementById("bench-legend");
  leg.innerHTML =
    bench.methods.filter((m) => m.id in SERIES).map((m) => `<span><i style="background:${SERIES[m.id]}"></i>${esc(m.name)} ${esc(m.note)}</span>`).join("") +
    `<span><i class="ln"></i>XGBoost / PCA</span><span><i class="ln dash"></i>逻辑回归</span>`;
  const grid = document.getElementById("kill-grid");
  bench.metrics.forEach((m) => grid.appendChild(panel(bench, m)));

  const tasks = [...new Set(bench.metrics.map((m) => m.task))];
  const best = Object.fromEntries(bench.metrics.map((m) => [m.key, Math.max(...bench.methods.map((x) => x.scores[m.key] ?? -1))]));
  let head = `<thead><tr><th rowspan="2">方法</th>${tasks.map((t) => `<th colspan="${bench.metrics.filter((m) => m.task === t).length}">${t}</th>`).join("")}</tr><tr>${bench.metrics.map((m) => `<th>${m.label}</th>`).join("")}</tr></thead>`;
  let body = bench.methods.map((x) => {
    const sw = SERIES[x.id] ? `<span class="dot" style="background:${SERIES[x.id]}"></span>` : `<span class="dot" style="background:var(--ml)"></span>`;
    return `<tr class="${x.kind}"><td>${sw}${esc(x.name)}<small>${esc(x.note)}</small></td>${bench.metrics.map((m) => {
      const v = x.scores[m.key];
      return `<td class="${v != null && v === best[m.key] ? "best" : ""}">${fmt(v)}</td>`;
    }).join("")}</tr>`;
  }).join("");
  document.getElementById("bench-table").innerHTML = head + `<tbody>${body}</tbody>`;
  const e = bench.eval_set;
  document.getElementById("bench-foot").textContent = `评估集 ${e.name}：${e.cells.toLocaleString()} 个细胞 · ${e.cell_types} 个细胞类型 · ${e.structures} 个脑结构 · ${e.datasets} 个数据集 · ${e.platforms} 个平台。最好成绩加粗；更新于 ${bench.updated}。`;
}

function renderGap(bench) {
  const cajal = bench.methods.filter((m) => m.kind === "model");
  const latest = cajal[cajal.length - 1];
  const rows = bench.metrics.map((m) => {
    const ks = lines(bench, m);
    const top = ks.reduce((a, b) => (b.v > a.v ? b : a));
    return { m, d: latest.scores[m.key] - top.v, ref: top };
  });
  const span = Math.max(...rows.map((r) => Math.abs(r.d))) * 1.15;
  const zero = rows.some((r) => r.d < 0) ? 50 : 6;
  const scale = (100 - zero - 2) / span;
  const box = document.getElementById("gap-bars");
  box.innerHTML = rows.map(({ m, d, ref }) => {
    const left = d >= 0 ? zero : zero + d * scale, width = Math.abs(d) * scale;
    return `<div class="gap-row"><span class="lab"><b>${m.task}</b> ${m.label}</span><div class="gap-track" title="Cajal ${fmt(latest.scores[m.key])} vs ${ref.name} ${fmt(ref.v)}"><span class="zero" style="left:${zero}%"></span><span class="bar${d < 0 ? " neg" : ""}" style="left:${left}%;width:${width}%"></span></div><span class="num">${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(3)}<small>vs ${esc(ref.name)}</small></span></div>`;
  }).join("");
}

function renderNews(news) {
  const posts = news.map((p, i) => ({ ...p, i })).sort((a, b) => (a.date === b.date ? a.i - b.i : a.date < b.date ? 1 : -1));
  const newest = posts.length ? posts[0].date : "";
  document.getElementById("feed").innerHTML = posts.map((p) => `
    <article class="post">
      <div class="side"><time datetime="${p.date}">${p.date}</time>${p.figure ? `<div class="fig"><b>${esc(p.figure)}</b><span>${esc(p.figure_label || "")}</span></div>` : ""}</div>
      <div class="main"><span class="tag">${esc(p.tag)}</span>${p.date === newest ? '<span class="new">最新</span>' : ""}<h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>
    </article>`).join("");
}

function renderCells() {
  const svg = document.getElementById("cells");
  if (!svg) return;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const colors = ["var(--teal)", "var(--peri)", "var(--lilac)", "var(--accent)"];
  const pts = Array.from({ length: 46 }, () => ({ x: 30 + rnd() * 360, y: 30 + rnd() * 300, r: 4 + rnd() * 9, c: colors[Math.floor(rnd() * colors.length)] }));
  let out = "";
  pts.forEach((a, i) => pts.slice(i + 1).forEach((b) => {
    if (Math.hypot(a.x - b.x, a.y - b.y) < 62) out += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="var(--line)" stroke-width="1.2"/>`;
  }));
  pts.forEach((p) => (out += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" style="fill:${p.c};opacity:.78"/>`));
  svg.innerHTML = out;
}

async function main() {
  renderCells();
  const [bench, news] = await Promise.all(["data/benchmark.json", "data/news.json"].map((u) => fetch(u, { cache: "no-cache" }).then((r) => r.json())));
  renderBench(bench);
  renderGap(bench);
  renderNews(news);
  document.getElementById("gen-at").textContent = `Benchmark 更新于 ${bench.updated}`;
}
main().catch((e) => console.error(e));
