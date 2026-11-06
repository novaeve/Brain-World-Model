"use strict";

const SERIES = {
  "v0@30000": "var(--prev)",
  "v1@10000": "var(--cajal-3)",
  "v1@20000": "var(--cajal-2)",
  "v1@30000": "var(--cajal)",
};
const fmt = (v) => (v == null ? "–" : v.toFixed(3));
const el = (tag, attrs = {}, html = "") => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Opponents of one metric, strongest first; the strongest is the kill line (solid), the rest dashed.
function lines(bench, metric) {
  const by = Object.fromEntries(bench.methods.map((m) => [m.id, m]));
  return metric.opponents
    .map((id) => ({ name: by[id].name + (by[id].note ? ` (${by[id].note.split("，")[0]})` : ""), short: by[id].name, v: by[id].scores[metric.key] }))
    .filter((k) => k.v != null)
    .sort((a, b) => b.v - a.v)
    .map((k, i) => ({ ...k, dash: i > 0 }));
}

function panel(bench, metric) {
  const series = bench.methods.filter((m) => m.id in SERIES);
  const kills = lines(bench, metric).slice(0, 2);
  const vals = series.map((m) => m.scores[metric.key]).concat(kills.map((k) => k.v));
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 0.06) * 50) / 50);
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
    const above = v >= kills[0].v;
    svg += `<rect x="${x}" y="${top}" width="${w}" height="${y(lo) - top}" rx="3" style="fill:${SERIES[m.id]}"><title>${esc(m.name + " " + m.note)}：${fmt(v)}${above ? "，越过最强对手" : "，低于最强对手"}</title></rect>`;
    svg += `<text class="val" x="${x + w / 2}" y="${top - 3}" text-anchor="middle">${fmt(v).slice(1)}</text>`;
    svg += `<text class="tk" x="${x + w / 2}" y="${H - 16}" text-anchor="middle">${m.name.replace("Cajal ", "")}</text><text class="tk" x="${x + w / 2}" y="${H - 5}" text-anchor="middle">${m.note.replace(" 步", "")}</text>`;
  });
  kills.forEach((k) => {
    svg += `<line class="kl${k.dash ? " dash" : ""}" x1="${L}" x2="${W - R}" y1="${y(k.v)}" y2="${y(k.v)}"><title>${esc(k.name)} ${fmt(k.v)}</title></line>`;
  });
  const keys = kills.map((k) => `<span class="kk"><i class="${k.dash ? "dash" : ""}"></i>${esc(k.short)} ${fmt(k.v)}</span>`).join("");
  const p = el("div", { class: "panel" });
  p.innerHTML = `<h3>${metric.task}<span>${metric.label}</span></h3><div class="kills">${keys}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(metric.task + metric.label)}">${svg}</svg>`;
  return p;
}

function renderBench(bench) {
  document.getElementById("bench-legend").innerHTML =
    bench.methods.filter((m) => m.id in SERIES).map((m) => `<span><i style="background:${SERIES[m.id]}"></i>${esc(m.name)} ${esc(m.note)}</span>`).join("") +
    `<span><i class="ln"></i>最强对手</span><span><i class="ln dash"></i>第二强对手</span>`;
  const grid = document.getElementById("kill-grid");
  bench.metrics.forEach((m) => grid.appendChild(panel(bench, m)));

  const tasks = [...new Set(bench.metrics.map((m) => m.task))];
  const best = Object.fromEntries(bench.metrics.map((m) => [m.key, Math.max(...bench.methods.map((x) => x.scores[m.key] ?? -1))]));
  const head = `<thead><tr><th rowspan="2">方法</th>${tasks.map((t) => `<th colspan="${bench.metrics.filter((m) => m.task === t).length}">${t}</th>`).join("")}</tr><tr>${bench.metrics.map((m) => `<th>${m.label}</th>`).join("")}</tr></thead>`;
  const body = bench.methods.map((x) => {
    const sw = `<span class="dot" style="background:${SERIES[x.id] || "var(--ml)"}"></span>`;
    return `<tr class="${x.kind}"><td>${sw}${esc(x.name)}<small>${esc(x.note)}</small></td>${bench.metrics.map((m) => {
      const v = x.scores[m.key];
      return `<td class="${v != null && v === best[m.key] ? "best" : ""}">${fmt(v)}</td>`;
    }).join("")}</tr>`;
  }).join("");
  document.getElementById("bench-table").innerHTML = head + `<tbody>${body}</tbody>`;
  document.getElementById("bench-foot").textContent =
    bench.eval_sets.map((e) => `${e.name}（${e.cells.toLocaleString()} 个细胞）：${e.use}`).join("；") + `。每列最好成绩加粗；更新于 ${bench.updated}。`;
}

function renderGap(bench) {
  const latest = bench.methods.find((m) => m.id === "v1@30000");
  const rows = bench.metrics.map((m) => {
    const top = lines(bench, m)[0];
    return { m, d: latest.scores[m.key] - top.v, ref: top };
  });
  const won = rows.filter((r) => r.d >= 0).length;
  document.getElementById("gap-sum").textContent = `Cajal v1（3 万步）在 6 项指标中赢 ${won} 项。`;
  const span = Math.max(...rows.map((r) => Math.abs(r.d))) * 1.15;
  const zero = rows.some((r) => r.d < 0) ? 50 : 6;
  const scale = (100 - zero - 2) / span;
  document.getElementById("gap-bars").innerHTML = rows.map(({ m, d, ref }) => {
    const left = d >= 0 ? zero : zero + d * scale, width = Math.abs(d) * scale;
    return `<div class="gap-row"><span class="lab"><b>${m.task}</b> ${m.label}</span><div class="gap-track" title="Cajal v1 ${fmt(latest.scores[m.key])} vs ${esc(ref.name)} ${fmt(ref.v)}"><span class="zero" style="left:${zero}%"></span><span class="bar${d < 0 ? " neg" : ""}" style="left:${left}%;width:${width}%"></span></div><span class="num">${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(3)}<small>vs ${esc(ref.short)}</small></span></div>`;
  }).join("");
}

const STATUS = { adopted: "已采用", candidate: "候选", dropped: "不采用", running: "进行中" };

function renderExperiments(exps, bench) {
  const keys = bench.metrics.map((m) => m.key);
  const head = `<thead><tr><th>方法</th>${bench.metrics.map((m) => `<th>${m.task}<small>${m.label}</small></th>`).join("")}<th class="v">结论</th></tr></thead>`;
  const cell = (v, r) => {
    if (v == null) return `<td>–</td>`;
    const d = v - r;
    const cls = Math.abs(d) < 0.01 ? "" : d > 0 ? "pos" : "neg";
    return `<td class="${cls}">${fmt(v)}<small>${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(3)}</small></td>`;
  };
  const body = exps.groups.map((g) => {
    const ref = `<tr class="refrow"><td>${esc(g.ref)}<small>参照</small></td>${keys.map((k) => `<td>${fmt(g.ref_scores[k])}</td>`).join("")}<td class="v"></td></tr>`;
    const rows = g.rows.map((r) => `<tr><td>${esc(r.name)}<small>${esc(r.change)}</small></td>${keys.map((k) => cell(r.scores[k], g.ref_scores[k])).join("")}<td class="v"><span class="st ${r.status}">${STATUS[r.status]}</span>${esc(r.verdict)}</td></tr>`).join("");
    return `<tbody><tr class="grp"><td colspan="${keys.length + 2}">${esc(g.title)}</td></tr>${ref}${rows}</tbody>`;
  }).join("");
  document.getElementById("exp-table").innerHTML = head + body;
}

const ma5 = (cs) => cs.map((_, i) => (i < 4 ? null : cs.slice(i - 4, i + 1).reduce((a, c) => a + c[4], 0) / 5));

function kline(series, window) {
  const cs = series.v1, prev = series.v0;
  const W = 340, H = 180, L = 40, R = 6, T = 6, B = 20;
  const all = cs.concat(prev);
  const lo = Math.log10(Math.min(...all.map((c) => c[3])) * 0.97), hi = Math.log10(Math.max(...all.map((c) => c[2])) * 1.03);
  const y = (v) => T + (H - T - B) * (1 - (Math.log10(v) - lo) / (hi - lo));
  const step = (W - L - R) / cs.length, x = (i) => L + step * (i + 0.5);
  let svg = "";
  for (let t = 0; t <= 4; t++) {
    const v = 10 ** (lo + ((hi - lo) * t) / 4);
    const lab = v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(3);
    svg += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tk" x="${L - 4}" y="${y(v) + 3}" text-anchor="end">${lab}</text>`;
  }
  cs.forEach(([s, o, h, l, c], i) => {
    const cls = c <= o ? "down" : "up", bw = Math.max(step * 0.62, 1.5);
    const top = y(Math.max(o, c)), bot = y(Math.min(o, c));
    svg += `<g class="${cls}"><title>v1 ${s}–${s + window} 步　开 ${o} 高 ${h} 低 ${l} 收 ${c}</title><line x1="${x(i)}" x2="${x(i)}" y1="${y(h)}" y2="${y(l)}" stroke-width="1"/><rect x="${x(i) - bw / 2}" y="${top}" width="${bw}" height="${Math.max(bot - top, 1)}"/></g>`;
  });
  const poly = (vals, cls) => `<polyline class="${cls}" points="${vals.map((v, i) => (v == null ? "" : `${x(i)},${y(v)}`)).filter(Boolean).join(" ")}"/>`;
  svg += poly(ma5(prev), "ma0") + poly(ma5(cs), "ma");
  [0, 10000, 20000, 30000].forEach((s) => {
    const i = Math.min(cs.length - 1, Math.round(s / window));
    svg += `<text class="tk" x="${x(i)}" y="${H - 5}" text-anchor="middle">${s / 10000 ? s / 10000 + " 万" : "0"}</text>`;
  });
  const end = (c) => c[c.length - 1][4], f = (v) => (v < 10 ? v.toFixed(3) : v.toFixed(0));
  const p = el("div", { class: "kpanel" });
  p.innerHTML = `<h3>${esc(series.name)}<em>${f(end(cs))}<small>v0 ${f(end(prev))}</small></em></h3><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.name)}：v1 收于 ${f(end(cs))}，v0 收于 ${f(end(prev))}">${svg}</svg>`;
  return p;
}

function renderLoss(loss) {
  const grid = document.getElementById("kline-grid");
  loss.series.forEach((s) => grid.appendChild(kline(s, loss.window)));
}

const SHARE = ["var(--teal)", "var(--kill)", "var(--peri)", "var(--lilac)", "var(--accent)"];

function shareChart(run, tasks) {
  const pts = run.points, W = 460, H = 190, L = 34, R = 8, T = 8, B = 22;
  const x = (s) => L + ((W - L - R) * s) / 30000, y = (v) => T + (H - T - B) * (1 - v);
  let svg = "";
  [0, 0.25, 0.5, 0.75, 1].forEach((v) => (svg += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tk" x="${L - 4}" y="${y(v) + 3}" text-anchor="end">${v * 100}%</text>`));
  const base = pts.map(() => 0);
  tasks.forEach((t, k) => {
    const top = pts.map((p, i) => base[i] + p[k + 1]);
    const d = pts.map((p, i) => `${x(p[0])},${y(top[i])}`).join(" ") + " " + pts.map((p, i) => `${x(p[0])},${y(base[i])}`).reverse().join(" ");
    const mean = pts.filter((p) => p[0] >= 1000).reduce((a, p) => a + p[k + 1], 0) / pts.filter((p) => p[0] >= 1000).length;
    svg += `<polygon points="${d}" style="fill:${SHARE[k]};opacity:.85"><title>${t}：平均 ${(mean * 100).toFixed(1)}%</title></polygon>`;
    top.forEach((v, i) => (base[i] = v));
  });
  [0, 10000, 20000, 30000].forEach((s) => (svg += `<text class="tk" x="${x(s)}" y="${H - 6}" text-anchor="middle">${s ? s / 10000 + " 万" : "0"}</text>`));
  const p = el("div", { class: "kpanel" });
  p.innerHTML = `<h3>${esc(run.name)}</h3><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(run.name)} 各任务梯度份额">${svg}</svg>`;
  return p;
}

function renderOptim(optim) {
  document.getElementById("share-legend").innerHTML = optim.tasks.map((t, k) => `<span><i style="background:${SHARE[k]}"></i>${t}</span>`).join("");
  const grid = document.getElementById("share-grid");
  optim.runs.forEach((r) => grid.appendChild(shareChart(r, optim.tasks)));
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
  const [bench, news, loss, exps, optim] = await Promise.all(["data/benchmark.json", "data/news.json", "data/loss.json", "data/experiments.json", "data/optim.json"].map((u) => fetch(u, { cache: "no-cache" }).then((r) => r.json())));
  renderBench(bench);
  renderGap(bench);
  renderExperiments(exps, bench);
  renderOptim(optim);
  renderLoss(loss);
  renderNews(news);
  document.getElementById("gen-at").textContent = `Benchmark 更新于 ${bench.updated}`;
}
main().catch((e) => console.error(e));
