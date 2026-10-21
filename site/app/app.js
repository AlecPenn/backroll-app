import { priceJob, priceSide, sideFlags, variance, freshRates, DEFAULT_RATES } from "./engine.js";

// ---------- storage ----------
const KEY = "backroll.v1";
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      s.rates = mergeRates(freshRates(), s.rates || {});
      s.profile = s.profile || {};
      s.jobs = s.jobs || [];
      return s;
    }
  } catch (e) { /* storage blocked or corrupt — start fresh */ }
  return { jobs: [], rates: freshRates(), profile: {} };
}
// Keep any new default rates added in later versions, while preserving the painter's edits.
function mergeRates(base, saved) {
  for (const k of Object.keys(saved)) {
    if (base[k] && typeof base[k] === "object" && typeof saved[k] === "object" && !Array.isArray(saved[k])) base[k] = mergeRates(base[k], saved[k]);
    else base[k] = saved[k];
  }
  return base;
}
let state = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const money2 = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hrs = (n) => (Math.round(n * 10) / 10).toFixed(1);
const uid = () => Math.random().toString(36).slice(2, 10);
const job = (id) => state.jobs.find((j) => j.id === id);
const seg = (name, value, options, wrap = false) =>
  `<div class="seg${wrap ? " wrap" : ""}" role="group" data-seg="${name}">` +
  options.map(([v, label]) => `<button type="button" data-val="${esc(v)}" aria-pressed="${String(value) === String(v)}">${esc(label)}</button>`).join("") +
  `</div>`;
const numIn = (name, value, label, hint = "", step = "any") =>
  `<label>${esc(label)}${hint ? ` <span class="hint">${esc(hint)}</span>` : ""}<input type="number" inputmode="decimal" min="0" step="${step}" name="${name}" value="${value ?? ""}"></label>`;
const isPlaceholder = (r) => r && r.source === "placeholder";

function placeholdersInUse() {
  let n = 0;
  const walk = (o) => { for (const v of Object.values(o)) { if (v && typeof v === "object") { if ("source" in v && v.source === "placeholder") n++; else walk(v); } } };
  walk(state.rates);
  return n;
}

// ---------- routing ----------
function route() {
  const h = location.hash.replace(/^#\/?/, "").split("/");
  const view = $("#view");
  if (h[0] === "job" && job(h[1])) {
    if (h[2] === "side") view.innerHTML = sideView(job(h[1]), Number(h[3]));
    else if (h[2] === "proposal") view.innerHTML = proposalView(job(h[1]));
    else view.innerHTML = jobView(job(h[1]));
  } else if (h[0] === "settings") view.innerHTML = settingsView();
  else view.innerHTML = listView();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

// ---------- views ----------
function listView() {
  const ph = placeholdersInUse();
  const jobs = [...state.jobs].sort((a, b) => b.createdAt - a.createdAt);
  return `
    <h1>Estimates</h1>
    <p class="muted">Walk each side of the house. Backroll turns it into hours and a price.</p>
    ${ph ? `<div class="flags"><b>${ph} starter rates are placeholders.</b> Prices are only as good as the rates. <a href="#/settings">Set your rates</a>.</div>` : ""}
    <div class="row" style="margin:16px 0 20px"><button class="btn block" data-action="new-job">+ New estimate</button></div>
    <div class="list">
      ${jobs.length ? jobs.map((j) => {
        const p = priceJob(j, state.rates);
        return `<a class="card" href="#/job/${j.id}">
          <div class="card-top"><b>${esc(j.address || "Untitled job")}</b><span class="mono">${p.sides.length ? money(p.price) : "—"}</span></div>
          <div class="muted small">${esc(j.customer || "")}${j.customer ? " · " : ""}${p.sides.length} side${p.sides.length === 1 ? "" : "s"} · ${hrs(p.hours)} hrs${p.ready ? "" : " · needs attention"}</div>
        </a>`;
      }).join("") : `<div class="empty">No estimates yet.</div>`}
    </div>`;
}

function jobView(j) {
  const p = priceJob(j, state.rates);
  const v = variance(p.hours, j.actualHours);
  const quick = ["Front", "Back", "Left", "Right", "Garage"].filter((n) => !j.sides.some((s) => s.name === n));
  return `
    <a class="crumb" href="#/">← All estimates</a>
    <h1>${esc(j.address || "New estimate")}</h1>
    <div class="grid2">
      <label>Address<input name="address" value="${esc(j.address)}" placeholder="123 Main St" data-job-field></label>
      <label>Customer<input name="customer" value="${esc(j.customer)}" placeholder="Name" data-job-field></label>
    </div>
    <div class="legend">Crew size</div>
    ${seg("crewSize", j.crewSize || 2, [[1, "1"], [2, "2"], [3, "3"], [4, "4"]])}

    <h2>Sides</h2>
    ${j.sides.map((s, i) => {
      const r = priceSide(s, state.rates);
      const f = sideFlags(s);
      return `<a class="card" href="#/job/${j.id}/side/${i}" style="display:block;text-decoration:none;color:var(--ink)">
        <div class="card-top"><b>${esc(s.name)}</b><span class="mono">${hrs(r.hours)} hrs</span></div>
        <div class="muted small">${r.area ? Math.round(r.area) + " sq ft" : "No size yet"}${s.condition ? ` · condition ${s.condition}` : ""}${s.access ? ` · ${esc(state.rates.access[s.access]?.label.toLowerCase() || "")}` : ""}${f.length ? ` · <span style="color:var(--caution)">${f.length} to fix</span>` : ""}</div>
      </a>`;
    }).join("") || `<p class="muted">No sides yet. Start with the front.</p>`}
    <div class="row" style="margin:8px 0">
      ${quick.map((n) => `<button class="btn ghost" data-action="add-side" data-name="${n}">+ ${n}</button>`).join("")}
      <button class="btn ghost" data-action="add-side" data-name="">+ Other</button>
    </div>

    ${p.sides.length ? `
    <div class="total">
      <div class="muted small">Price before tax</div>
      <div class="price">${money(p.price)}</div>
      <div class="sub"><span>${hrs(p.hours)} crew hrs · ${hrs(p.crewDays)} days with ${j.crewSize || 2} · ${p.paintGal} gal paint${p.primerGal ? ` · ${p.primerGal} primer` : ""}</span><span class="margin">${p.marginPct}%</span></div>
    </div>
    ${p.flags.length ? `<div class="flags"><b>Not ready to send</b><ul>${p.flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      ${p.flags.some((f) => f.startsWith("Only")) ? `<label style="margin:10px 0 0;display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" style="width:22px;min-height:22px" data-action="partial-ok" ${j.partialOk ? "checked" : ""}> This job doesn't cover all sides</label>` : ""}</div>`
      : `<div class="ok">Every side priced. Ready to send.</div>`}

    <h2>Where the price comes from</h2>
    <table>
      <tr><td>Labor <span class="muted small">${hrs(p.hours)} hrs × ${money2(state.rates.labor.loadedCostPerHour.value)}</span></td><td class="n">${money(p.cost.labor)}</td></tr>
      <tr><td>Materials <span class="muted small">paint, primer, sundries</span></td><td class="n">${money(p.cost.materials)}</td></tr>
      ${p.cost.equipment ? `<tr><td>Lift rental <span class="muted small">${p.liftDays} day${p.liftDays > 1 ? "s" : ""}</span></td><td class="n">${money(p.cost.equipment)}</td></tr>` : ""}
      <tr><td>Overhead <span class="muted small">${hrs(p.hours)} hrs × ${money2(state.rates.business.overheadPerHour.value)}</span></td><td class="n">${money(p.cost.overhead)}</td></tr>
      <tr><td>Risk allowance <span class="muted small">${state.rates.business.riskPct.value}% of cost</span></td><td class="n">${money(p.cost.risk)}</td></tr>
      <tr class="sum"><td>Your cost</td><td class="n">${money(p.cost.total)}</td></tr>
      <tr><td>Profit <span class="muted small">${state.rates.business.targetMarginPct.value}% of the price — not a markup on cost</span></td><td class="n" style="color:var(--profit)">${money(p.profit)}</td></tr>
      <tr class="sum"><td>Price</td><td class="n">${money(p.price)}</td></tr>
    </table>

    <h2>Hours by side</h2>
    ${p.sides.map(({ side, result }) => `
      <div class="card">
        <div class="card-top"><b>${esc(side.name)}</b><span class="mono">${hrs(result.hours)} hrs</span></div>
        <table>${result.lines.map((l) => `<tr><td>${esc(l.label)}<details class="explain"><summary>how</summary><p>${esc(l.detail)}</p></details></td><td class="n">${hrs(l.hours)}</td></tr>`).join("")}</table>
      </div>`).join("")}

    <div class="row no-print" style="margin-top:20px">
      <a class="btn" href="#/job/${j.id}/proposal">Customer proposal</a>
    </div>

    <h2>After the job</h2>
    <p class="muted small">Log the real crew hours. Backroll shows how close the estimate was so your rates get sharper.</p>
    <div class="grid2">${numIn("actualHours", j.actualHours, "Actual crew hours")}<div></div></div>
    <div id="variance">${varianceHtml(v)}</div>
    ` : ""}

    <div class="row" style="margin-top:32px"><button class="btn danger" data-action="delete-job">Delete estimate</button></div>`;
}

function varianceHtml(v) {
  if (!v) return "";
  const over = v.diff > 0;
  return `<div class="${over ? "flags" : "ok"}" style="${over ? "" : ""}"><b>${over ? "Over" : "Under"} by ${hrs(Math.abs(v.diff))} hrs (${Math.abs(v.pct)}%).</b> ${over ? "The job took longer than estimated — check which rates ran slow." : "The crew beat the estimate."}</div>`;
}

function sideView(j, i) {
  const s = j.sides[i];
  if (!s) { location.hash = `#/job/${j.id}`; return ""; }
  const R = state.rates;
  const r = priceSide(s, R);
  const flags = sideFlags(s);
  return `
    <a class="crumb" href="#/job/${j.id}">← ${esc(j.address || "Estimate")}</a>
    <label>Side name<input name="name" value="${esc(s.name)}" data-side-field></label>
    ${i > 0 ? `<button class="btn ghost block" data-action="copy-prev" style="margin:-4px 0 18px">Copy settings from ${esc(j.sides[i - 1].name)}</button>` : ""}

    <h2>Size</h2>
    <div class="grid2">${numIn("lengthFt", s.lengthFt, "Wall length", "ft")}${numIn("gableSqft", s.gableSqft, "Gable", "sq ft, if any")}</div>
    <div class="legend">Stories</div>
    ${seg("stories", s.stories, [[1, "1"], [2, "2"], [3, "3"]])}
    ${numIn("deductSqft", s.deductSqft, "Subtract", "sq ft — big openings like a garage door or porch you're not painting")}

    <h2>Surface</h2>
    <div class="legend">Siding</div>
    ${seg("siding", s.siding, Object.entries(R.siding).map(([k, v]) => [k, v.label.split(" (")[0]]), true)}
    <div class="legend">Condition</div>
    <div class="cond" role="group" data-seg="condition">
      ${[1, 2, 3, 4].map((c) => `<button type="button" data-val="${c}" aria-pressed="${s.condition === c}">${c}</button>`).join("")}
    </div>
    <p class="cond-desc">${s.condition ? esc(R.condition[s.condition].label) + ` — scrape ${Math.round(R.condition[s.condition].scrapeShare * 100)}% of the wall` : "1 = sound, 4 = peeling everywhere"}</p>

    <h2>Access</h2>
    ${seg("access", s.access, Object.entries(R.access).map(([k, v]) => [k, v.label]), true)}

    <h2>Paint</h2>
    ${seg("method", s.method || "sprayBackroll", Object.entries(R.body).map(([k, v]) => [k, v.label]))}
    <div class="legend">Coats</div>
    ${seg("coats", s.coats || 2, [[1, "1"], [2, "2"], [3, "3"]])}

    <h2>Prep</h2>
    ${seg("wash", s.wash === false ? "no" : "yes", [["yes", "Power wash"], ["no", "No wash"]])}
    <div class="legend">Prime</div>
    ${seg("prime", s.prime || "none", [["none", "None"], ["spot", "Spot (scraped areas)"], ["full", "Full side"]])}
    ${numIn("caulkLnft", s.caulkLnft, "Caulk", "lin ft")}

    <h2>Trim</h2>
    <div class="grid2">
      ${numIn("windows", s.windows, "Windows", "", "1")}
      ${numIn("doors", s.doors, "Doors", "", "1")}
      ${numIn("garageDoors", s.garageDoors, "Garage doors", "", "1")}
      ${numIn("fasciaLnft", s.fasciaLnft, "Fascia & soffit", "lin ft")}
    </div>

    <div class="row" style="margin-top:24px"><button class="btn danger" data-action="delete-side">Remove this side</button></div>

    <div class="sticky-foot"><div class="inner">
      <div><div class="hrs" id="live-hrs">${hrs(r.hours)} hrs</div><div class="muted small" id="live-flags">${flags.length ? `${flags.length} to fix` : `${Math.round(r.area)} sq ft · ${r.gallons} gal`}</div></div>
      <a class="btn" href="#/job/${j.id}">Done</a>
    </div></div>`;
}

function settingsView() {
  const R = state.rates;
  const ph = placeholdersInUse();
  const badge = (r) => isPlaceholder(r) ? `<span class="badge ph">placeholder</span>` : `<span class="badge src">${esc(r.source || "")}</span>`;
  const valRow = (path, r) => `
    <div class="rate"><div class="rate-head"><span>${esc(r.label)}</span>${badge(r)}</div>
      <label><span class="hint">${esc(r.unit)}</span><input type="number" inputmode="decimal" step="any" data-rate="${path}.value" value="${r.value}"></label></div>`;
  const pairRow = (path, r, a = "first", b = "more", la = "1st coat", lb = "Each more") => `
    <div class="rate"><div class="rate-head"><span>${esc(r.label)}</span>${badge(r)}</div>
      <div class="grid2"><label><span class="hint">${la}, ${esc(r.unit)}</span><input type="number" inputmode="decimal" step="any" data-rate="${path}.${a}" value="${r[a]}"></label>
      <label><span class="hint">${lb}, ${esc(r.unit)}</span><input type="number" inputmode="decimal" step="any" data-rate="${path}.${b}" value="${r[b]}"></label></div></div>`;
  const factorRow = (path, r, field = "factor", hint = "× slower (1.00 = baseline)") => `
    <div class="rate"><div class="rate-head"><span>${esc(r.label)}</span>${badge(r)}</div>
      <label><span class="hint">${hint}</span><input type="number" inputmode="decimal" step="any" data-rate="${path}.${field}" value="${r[field]}"></label></div>`;
  return `
    <a class="crumb" href="#/">← All estimates</a>
    <h1>Your rates</h1>
    <p class="muted">Every price comes from these numbers. ${ph ? `<b style="color:var(--caution)">${ph} are still placeholders</b> — replace them with what your crew actually does.` : "All set from real numbers."} Changing a rate marks it as yours.</p>

    <h2>Business</h2>
    <label>Company name on proposals<input data-profile="company" value="${esc(state.profile.company)}" placeholder="Your Painting Co."></label>
    <label>Phone on proposals<input data-profile="phone" value="${esc(state.profile.phone)}" placeholder="(608) 555-0100" inputmode="tel"></label>
    ${valRow("labor.loadedCostPerHour", R.labor.loadedCostPerHour)}
    ${valRow("business.overheadPerHour", R.business.overheadPerHour)}
    ${valRow("business.riskPct", R.business.riskPct)}
    ${valRow("business.targetMarginPct", R.business.targetMarginPct)}
    ${valRow("business.storyHeightFt", R.business.storyHeightFt)}

    <h2>Body paint speed</h2>
    ${Object.keys(R.body).map((k) => pairRow(`body.${k}`, R.body[k])).join("")}

    <h2>Siding</h2>
    ${Object.keys(R.siding).map((k) => factorRow(`siding.${k}`, R.siding[k])).join("")}

    <h2>Condition — share of wall to scrape</h2>
    ${[1, 2, 3, 4].map((c) => factorRow(`condition.${c}`, { ...R.condition[c], label: `${c}: ${R.condition[c].label}` }, "scrapeShare", "share of wall, 0 to 1")).join("")}

    <h2>Prep</h2>
    ${Object.keys(R.prep).map((k) => valRow(`prep.${k}`, R.prep[k])).join("")}

    <h2>Height</h2>
    ${[1, 2, 3].map((k) => factorRow(`height.${k}`, R.height[k])).join("")}

    <h2>Access</h2>
    ${Object.keys(R.access).map((k) => factorRow(`access.${k}`, R.access[k]) + `<div style="margin:-4px 0 8px">${numIn("", R.access[k].setupHrs, "Set-up hours per side").replace('name=""', `data-rate="access.${k}.setupHrs"`)}</div>`).join("")}
    ${valRow("access.lift", { ...R.access.lift, value: R.access.lift.rentalPerDay, unit: "$/day rental", label: "Lift rental" }).replace("access.lift.value", "access.lift.rentalPerDay")}

    <h2>Trim</h2>
    ${Object.keys(R.trim).map((k) => pairRow(`trim.${k}`, R.trim[k])).join("")}

    <h2>Materials</h2>
    ${Object.keys(R.materials).map((k) => valRow(`materials.${k}`, R.materials[k])).join("")}

    <div class="row" style="margin-top:28px"><button class="btn danger" data-action="reset-rates">Reset all rates to starter values</button></div>`;
}

function proposalView(j) {
  const p = priceJob(j, state.rates);
  const R = state.rates;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const scope = (s) => {
    const bits = [];
    if (s.wash !== false) bits.push("power wash");
    if (s.condition >= 2) bits.push("scrape and sand loose and failing paint");
    if (s.prime === "spot") bits.push("spot-prime bare areas");
    if (s.prime === "full") bits.push("prime the full surface");
    if (s.caulkLnft) bits.push("caulk gaps and joints");
    bits.push(`apply ${s.coats || 2} coat${(s.coats || 2) > 1 ? "s" : ""} to the ${(R.siding[s.siding]?.label || "siding").split(" (")[0].toLowerCase()}`);
    const trim = [];
    if (s.windows) trim.push(`${s.windows} window${s.windows > 1 ? "s" : ""}`);
    if (s.doors) trim.push(`${s.doors} door${s.doors > 1 ? "s" : ""}`);
    if (s.garageDoors) trim.push(`${s.garageDoors} garage door${s.garageDoors > 1 ? "s" : ""}`);
    if (s.fasciaLnft) trim.push("fascia and soffit");
    if (trim.length) bits.push(`paint ${trim.join(", ")}`);
    return bits.join("; ");
  };
  return `
    <div class="no-print row" style="margin-bottom:16px;justify-content:space-between">
      <a class="crumb" href="#/job/${j.id}">← Back to estimate</a>
      <button class="btn" data-action="print">Print / save PDF</button>
    </div>
    <p class="muted small no-print">This is a proposal, not a contract. Wisconsin has specific rules for home-improvement contracts and deposits — check them before taking money.</p>
    ${p.flags.length ? `<div class="flags no-print"><b>Heads up:</b> this estimate still has ${p.flags.length} item${p.flags.length > 1 ? "s" : ""} to fix. Check before sending.</div>` : ""}
    <div class="proposal">
      <div class="p-head">
        <div><h1>${esc(state.profile.company || "Your Painting Co.")}</h1><div class="muted small">${esc(state.profile.phone || "")}</div></div>
        <div style="text-align:right" class="small">Exterior painting proposal<br>${today}</div>
      </div>
      <p><b>Prepared for:</b> ${esc(j.customer || "—")}<br><b>Property:</b> ${esc(j.address || "—")}</p>
      <h2>Scope of work</h2>
      <table>${j.sides.map((s) => `<tr><td><b>${esc(s.name)}</b><br><span class="small">${esc(scope(s).charAt(0).toUpperCase() + scope(s).slice(1))}.</span></td></tr>`).join("")}</table>
      <h2>Price</h2>
      <table>
        <tr><td>Labor, materials and equipment for the scope above</td><td class="n p-total">${money(p.price)}</td></tr>
      </table>
      <p class="small muted" style="margin-top:20px">Price is before any applicable sales tax. Work not listed above is not included. Hidden damage found during prep (rot, failed substrate) will be discussed before any added work.</p>
      <p class="small" style="margin-top:28px">Accepted by: ____________________________ &nbsp; Date: ____________</p>
    </div>`;
}

// ---------- events ----------
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-action], [data-seg] button");
  if (!t) return;
  const h = location.hash.replace(/^#\/?/, "").split("/");
  const j = h[0] === "job" ? job(h[1]) : null;

  if (t.matches("[data-seg] button")) {
    const field = t.parentElement.dataset.seg;
    let val = t.dataset.val;
    if (/^\d+(\.\d+)?$/.test(val)) val = Number(val);
    if (field === "wash") val = val === "yes";
    if (h[2] === "side" && j) j.sides[Number(h[3])][field] = val;
    else if (j) j[field] = val;
    save();
    const y = window.scrollY; route(); window.scrollTo(0, y);
    return;
  }

  const a = t.dataset.action;
  if (a === "new-job") {
    const id = uid();
    state.jobs.push({ id, address: "", customer: "", crewSize: 2, sides: [], createdAt: Date.now() });
    save(); location.hash = `#/job/${id}`;
  } else if (a === "add-side" && j) {
    const prev = j.sides[j.sides.length - 1];
    const base = prev ? { siding: prev.siding, method: prev.method, coats: prev.coats, stories: prev.stories, wash: prev.wash, prime: prev.prime } : { method: "sprayBackroll", coats: 2, wash: true, prime: "none" };
    j.sides.push({ name: t.dataset.name || `Side ${j.sides.length + 1}`, ...base });
    save(); location.hash = `#/job/${j.id}/side/${j.sides.length - 1}`;
  } else if (a === "copy-prev" && j) {
    const i = Number(h[3]); const prev = j.sides[i - 1];
    const keep = { name: j.sides[i].name, lengthFt: j.sides[i].lengthFt, gableSqft: j.sides[i].gableSqft, deductSqft: j.sides[i].deductSqft, windows: j.sides[i].windows, doors: j.sides[i].doors, garageDoors: j.sides[i].garageDoors, fasciaLnft: j.sides[i].fasciaLnft };
    j.sides[i] = { ...prev, ...keep };
    save(); route();
  } else if (a === "delete-side" && j) {
    if (confirm("Remove this side?")) { j.sides.splice(Number(h[3]), 1); save(); location.hash = `#/job/${j.id}`; }
  } else if (a === "delete-job" && j) {
    if (confirm("Delete this estimate? This can't be undone.")) { state.jobs = state.jobs.filter((x) => x.id !== j.id); save(); location.hash = "#/"; }
  } else if (a === "partial-ok" && j) {
    j.partialOk = t.checked; save(); route();
  } else if (a === "reset-rates") {
    if (confirm("Reset every rate to the starter values? Your own numbers will be lost.")) { state.rates = freshRates(); save(); route(); }
  } else if (a === "print") {
    window.print();
  }
});

document.addEventListener("input", (e) => {
  const t = e.target;
  const h = location.hash.replace(/^#\/?/, "").split("/");
  const j = h[0] === "job" ? job(h[1]) : null;

  if (t.matches("[data-job-field]") && j) { j[t.name] = t.value; save(); return; }
  if (t.matches("[data-side-field]") && j) { j.sides[Number(h[3])][t.name] = t.value; save(); return; }
  if (t.matches("[data-profile]")) { state.profile[t.dataset.profile] = t.value; save(); return; }

  if (t.matches("[data-rate]")) {
    const path = t.dataset.rate.split(".");
    const field = path.pop();
    let o = state.rates; for (const k of path) o = o[k];
    const v = parseFloat(t.value);
    if (!isNaN(v)) { o[field] = v; if (o.source === "placeholder" || o.source !== "yours") o.source = "yours"; save(); }
    return;
  }

  if (t.type === "number" && t.name && j) {
    const v = t.value === "" ? undefined : parseFloat(t.value);
    if (h[2] === "side") {
      const s = j.sides[Number(h[3])]; s[t.name] = v; save();
      const r = priceSide(s, state.rates); const f = sideFlags(s);
      $("#live-hrs").textContent = `${hrs(r.hours)} hrs`;
      $("#live-flags").textContent = f.length ? `${f.length} to fix` : `${Math.round(r.area)} sq ft · ${r.gallons} gal`;
    } else if (t.name === "actualHours") {
      j.actualHours = v; save();
      $("#variance").innerHTML = varianceHtml(variance(priceJob(j, state.rates).hours, v));
    }
  }
});

// Re-render the settings badges after editing so "placeholder" flips to "yours".
// Flip the badge in place (a full re-render would steal focus from the next field).
document.addEventListener("change", (e) => {
  if (!e.target.matches("[data-rate]")) return;
  const b = e.target.closest(".rate")?.querySelector(".badge");
  if (b) { b.className = "badge src"; b.textContent = "yours"; }
});

route();
