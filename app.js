const $ = (id) => document.getElementById(id);

function n(id){ return Math.max(0, Math.floor(Number($(id).value || 0))); }
function fmt(x){ return (Math.floor(x) || 0).toLocaleString("fr-FR"); }

function readInv(){
  return {
    sulfur: n("sulfur"),
    charcoal: n("charcoal"),
    gunpowder: n("gunpowder"),
    explosives: n("explosives"),
    lowgrade: n("lowgrade"),
    metalfrags: n("metalfrags"),
    pipes: n("pipes"),
    cloth: n("cloth"),
    techtrash: n("techtrash"),
    rope: n("rope"),
    smallstash: n("smallstash"),
    spring: n("spring"),
    hqm: n("hqm"),
  };
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Décompose un craft en besoins (gère sous-crafts + output x2 etc.)
function expandNeeds(itemId, qtyOutput, needs){
  const item = RUST.items.find(i => i.id === itemId);
  if (!item) return;

  const out = item.output || 1;
  const craftsNeeded = Math.ceil(qtyOutput / out);

  for (const [k, v] of Object.entries(item.recipe)){
    const sub = RUST.items.find(i => i.id === k);
    if (sub){
      expandNeeds(k, v * craftsNeeded, needs);
    } else {
      needs[k] = (needs[k] || 0) + v * craftsNeeded;
    }
  }
}

// ---- MAX craftable (comme tes cards) ----
function solveItem(itemId, inv){
  const item = RUST.items.find(i => i.id === itemId);
  const out = item.output || 1;

  // On cherche en "crafts" entiers pour respecter output (x2…)
  let lo = 0;
  let hi = 100000;

  function canCraft(crafts){
    const qtyOutput = crafts * out;
    const needs = {};
    expandNeeds(itemId, qtyOutput, needs);

    const needExplosives = needs.explosives || 0;
    const makeExplosives = Math.max(0, needExplosives - inv.explosives);

    const gpDirect = needs.gunpowder || 0;
    const gpForExplosives = makeExplosives * RUST.explosive.gunpowder;
    const gpTotal = gpDirect + gpForExplosives;
    const gpToMake = Math.max(0, gpTotal - inv.gunpowder);

    const sulfurDirectForExplosives = makeExplosives * RUST.explosive.sulfur;
    const sulfurDirectOther = needs.sulfur || 0;
    const sulfurDirect = sulfurDirectForExplosives + sulfurDirectOther;

    const sulfurForGP = gpToMake * RUST.gunpowder.sulfur;
    const charcoalForGP = gpToMake * RUST.gunpowder.charcoal;

    const lowgradeNeed = (needs.lowgrade || 0) + makeExplosives * RUST.explosive.lowgrade;
    const metalfragsNeed = (needs.metalfrags || 0) + makeExplosives * RUST.explosive.metalfrags;

    return (
      inv.sulfur >= (sulfurDirect + sulfurForGP) &&
      inv.charcoal >= charcoalForGP &&
      inv.lowgrade >= lowgradeNeed &&
      inv.metalfrags >= metalfragsNeed &&
      inv.pipes >= (needs.pipes || 0) &&
      inv.cloth >= (needs.cloth || 0) &&
      inv.techtrash >= (needs.techtrash || 0) &&
      inv.rope >= (needs.rope || 0) &&
      inv.smallstash >= (needs.smallstash || 0)
    );
  }

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (canCraft(mid)) lo = mid;
    else hi = mid - 1;
  }

  const crafts = lo;
  const craftable = crafts * out;

  const needs = {};
  expandNeeds(itemId, craftable, needs);

  const needExplosives = needs.explosives || 0;
  const makeExplosives = Math.max(0, needExplosives - inv.explosives);

  const gpDirect = needs.gunpowder || 0;
  const gpForExplosives = makeExplosives * RUST.explosive.gunpowder;
  const gpTotal = gpDirect + gpForExplosives;
  const gpToMake = Math.max(0, gpTotal - inv.gunpowder);

  const sulfurDirectForExplosives = makeExplosives * RUST.explosive.sulfur;
  const sulfurDirectOther = needs.sulfur || 0;
  const sulfurDirect = sulfurDirectForExplosives + sulfurDirectOther;

  const sulfurForGP = gpToMake * RUST.gunpowder.sulfur;
  const charcoalForGP = gpToMake * RUST.gunpowder.charcoal;

  const lowgradeNeed = (needs.lowgrade || 0) + makeExplosives * RUST.explosive.lowgrade;
  const metalfragsNeed = (needs.metalfrags || 0) + makeExplosives * RUST.explosive.metalfrags;

  const costs = {
    crafts,
    output: out,
    gunpowderToMake: gpToMake,
    explosivesToMake: makeExplosives,
    sulfurKeep: sulfurDirect,
    sulfurConvert: sulfurForGP,
    charcoal: charcoalForGP,
    lowgrade: lowgradeNeed,
    metalfrags: metalfragsNeed,
    pipes: needs.pipes || 0,
    cloth: needs.cloth || 0,
    techtrash: needs.techtrash || 0,
    rope: needs.rope || 0,
    smallstash: needs.smallstash || 0
  };

  return { item, craftable, costs };
}

function renderCard(sol){
  const { item, craftable, costs } = sol;

  const out = item.output || 1;
  const craftNote = out > 1 ? ` <span class="warn">(craft = x${out})</span>` : "";

  const warn = costs.sulfurKeep > 0
    ? `<span class="warn">Garde ${fmt(costs.sulfurKeep)} sulfur</span> (soufre direct)`
    : `<span class="muted">Pas de soufre à garder</span>`;

  const imgHtml = item.img
    ? `<img class="item-img" src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}" loading="lazy"
         onerror="this.style.display='none'; this.parentElement.classList.add('no-img');">`
    : "";

  return `
    <article class="card">
      <div class="card-media ${item.img ? "" : "no-img"}">
        ${imgHtml}
        <div class="media-title">${escapeHtml(item.name)}</div>
      </div>

      <div class="card-body">
        <p class="big">${fmt(craftable)} <span>${escapeHtml(item.unit)}</span>${craftNote}</p>

        <div class="kv">
          <div class="row"><div class="l">Soufre à garder</div><div class="r">${fmt(costs.sulfurKeep)}</div></div>
          <div class="row"><div class="l">Soufre à convertir</div><div class="r">${fmt(costs.sulfurConvert)}</div></div>
          <div class="row"><div class="l">Gunpowder à craft</div><div class="r">${fmt(costs.gunpowderToMake)}</div></div>
          <div class="row"><div class="l">Explosives à craft</div><div class="r">${fmt(costs.explosivesToMake)}</div></div>
        </div>

        <div class="steps">
          ${warn}<br>
          <b>Plan :</b><br>
          1) Craft <b>${fmt(costs.gunpowderToMake)}</b> gunpowder<br>
          2) Craft <b>${fmt(costs.explosivesToMake)}</b> explosives<br>
          3) Craft <b class="good">${fmt(craftable)}</b> ${escapeHtml(item.unit)}<br><br>
          <b>Coûts :</b> sulfur ${fmt(costs.sulfurKeep + costs.sulfurConvert)} • charcoal ${fmt(costs.charcoal)}
          ${costs.lowgrade ? ` • LGF ${fmt(costs.lowgrade)}` : ``}
          ${costs.metalfrags ? ` • metal ${fmt(costs.metalfrags)}` : ``}
          ${costs.pipes ? ` • pipes ${fmt(costs.pipes)}` : ``}
          ${costs.cloth ? ` • cloth ${fmt(costs.cloth)}` : ``}
          ${costs.techtrash ? ` • tech ${fmt(costs.techtrash)}` : ``}
          ${costs.rope ? ` • rope ${fmt(costs.rope)}` : ``}
          ${costs.smallstash ? ` • stash ${fmt(costs.smallstash)}` : ``}
        </div>
      </div>
    </article>
  `;
}

function render(){
  const inv = readInv();
  const cards = RUST.items.map(it => renderCard(solveItem(it.id, inv)));
  $("cards").innerHTML = cards.join("");
}

// ---- OBJECTIF : besoins pour X items ----
function requirementsForTarget(itemId, targetQty, useStock, inv){
  const item = RUST.items.find(i => i.id === itemId);
  if (!item) return null;

  const target = Math.max(0, Math.floor(Number(targetQty || 0)));
  const needs = {};
  expandNeeds(itemId, target, needs);

  // explosifs requis (total)
  const needExplosivesTotal = needs.explosives || 0;
  const invExplosives = useStock ? inv.explosives : 0;
  const makeExplosives = Math.max(0, needExplosivesTotal - invExplosives);

  // GP total = GP direct + GP pour fabriquer les explosifs manquants
  const gpDirectTotal = needs.gunpowder || 0;
  const gpForExplosives = makeExplosives * RUST.explosive.gunpowder;
  const gpTotal = gpDirectTotal + gpForExplosives;

  const invGP = useStock ? inv.gunpowder : 0;
  const gpToMake = Math.max(0, gpTotal - invGP);

  // sulfur direct = sulfur des explosifs à fabriquer + sulfur direct autres recettes
  const sulfurDirectOther = needs.sulfur || 0;
  const sulfurKeep = (makeExplosives * RUST.explosive.sulfur) + sulfurDirectOther;

  // sulfur pour GP manquant
  const sulfurConvert = gpToMake * RUST.gunpowder.sulfur;
  const charcoalNeed = gpToMake * RUST.gunpowder.charcoal;

  // autres ressources (en incluant explosifs à fabriquer)
  const lowgradeNeed = (needs.lowgrade || 0) + makeExplosives * RUST.explosive.lowgrade;
  const metalfragsNeed = (needs.metalfrags || 0) + makeExplosives * RUST.explosive.metalfrags;

  // stocks (optionnels)
  function missing(total, have){ return Math.max(0, total - (useStock ? have : 0)); }

  const totalSulfurNeed = sulfurKeep + sulfurConvert;

  return {
    item,
    target,
    useStock,

    totals: {
      sulfur: totalSulfurNeed,
      sulfurKeep,
      sulfurConvert,
      charcoal: charcoalNeed,
      gunpowderToMake: gpToMake,
      explosivesToMake: makeExplosives,
      lowgrade: lowgradeNeed,
      metalfrags: metalfragsNeed,
      pipes: needs.pipes || 0,
      cloth: needs.cloth || 0,
      techtrash: needs.techtrash || 0,
      rope: needs.rope || 0,
      smallstash: needs.smallstash || 0,
    },

    missing: {
      sulfur: missing(totalSulfurNeed, inv.sulfur),
      charcoal: missing(charcoalNeed, inv.charcoal),
      lowgrade: missing(lowgradeNeed, inv.lowgrade),
      metalfrags: missing(metalfragsNeed, inv.metalfrags),
      pipes: missing(needs.pipes || 0, inv.pipes),
      cloth: missing(needs.cloth || 0, inv.cloth),
      techtrash: missing(needs.techtrash || 0, inv.techtrash),
      rope: missing(needs.rope || 0, inv.rope),
      smallstash: missing(needs.smallstash || 0, inv.smallstash),
      gunpowder: missing(gpTotal, inv.gunpowder), // utile info
      explosives: missing(needExplosivesTotal, inv.explosives), // utile info
    }
  };
}

function optLine(label, total, miss){
  if (!total) return "";
  const missPart = (miss && miss > 0) ? ` — <span class="bad">manque ${fmt(miss)}</span>` : ` — <span class="good">OK</span>`;
  return `<li>${label}: <b>${fmt(total)}</b>${missPart}</li>`;
}

function renderGoal(){
  const inv = readInv();
  const itemId = $("goal-item").value;
  const qty = Number($("goal-qty").value || 0);
  const useStock = $("goal-use-stock").checked;

  const req = requirementsForTarget(itemId, qty, useStock, inv);
  if (!req) return;

  const t = req.totals;
  const m = req.missing;

  $("goal-result").innerHTML = `
    <div><b>Objectif :</b> ${fmt(req.target)} ${escapeHtml(req.item.unit)} (${escapeHtml(req.item.name)})</div>
    <div style="margin-top:8px; color: var(--muted);">
      Mode : <b>${useStock ? "avec tes ressources actuelles (manquants)" : "from scratch (totaux)"}</b>
    </div>

    <div style="margin-top:12px;"><b>Plan :</b></div>
    <ol>
      <li><span class="warn">Garder</span> <b>${fmt(t.sulfurKeep)}</b> sulfur</li>
      <li><b>Convertir</b> <b>${fmt(t.sulfurConvert)}</b> sulfur → <b>${fmt(t.gunpowderToMake)}</b> gunpowder</li>
      <li><b>Crafter</b> <b>${fmt(t.explosivesToMake)}</b> explosives</li>
      <li><span class="good">Crafter</span> <b>${fmt(req.target)}</b> ${escapeHtml(req.item.unit)}</li>
    </ol>

    <div><b>Ressources nécessaires :</b></div>
    <ul>
      ${optLine("Sulfur total", t.sulfur, m.sulfur)}
      ${optLine("Charcoal", t.charcoal, m.charcoal)}
      ${optLine("Low Grade", t.lowgrade, m.lowgrade)}
      ${optLine("Metal Frags", t.metalfrags, m.metalfrags)}
      ${optLine("Metal Pipes", t.pipes, m.pipes)}
      ${optLine("Cloth", t.cloth, m.cloth)}
      ${optLine("Tech Trash", t.techtrash, m.techtrash)}
      ${optLine("Rope", t.rope, m.rope)}
      ${optLine("Small Stash", t.smallstash, m.smallstash)}
    </ul>

    <div style="margin-top:10px; font-size:12px; color: var(--muted);">
      Info : explosifs requis (total) = <b>${fmt(t.explosivesToMake + (useStock ? inv.explosives : 0))}</b>,
      gunpowder requis (total) ≈ <b>${fmt(t.gunpowderToMake + (useStock ? inv.gunpowder : 0))}</b>
    </div>
  `;
}

function setupGoal(){
  const sel = $("goal-item");
  sel.innerHTML = RUST.items.map(it => `<option value="${it.id}">${escapeHtml(it.name)}</option>`).join("");
  if (RUST.items.some(it => it.id === "rocket")) sel.value = "rocket";

  $("goal-calc").addEventListener("click", renderGoal);
  $("goal-item").addEventListener("change", renderGoal);
  $("goal-qty").addEventListener("input", renderGoal);
  $("goal-use-stock").addEventListener("change", renderGoal);

  renderGoal();
}

// init
$("calc").addEventListener("click", () => { render(); renderGoal(); });
render();
setupGoal();
