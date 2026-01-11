const $ = (id) => document.getElementById(id);

function n(id) {
  const el = $(id);
  if (!el) return 0;
  return Math.max(0, Math.floor(Number(el.value || 0)));
}
function fmt(x) { return (Math.floor(x) || 0).toLocaleString("fr-FR"); }

function readInv() {
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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* -------------------- CRAFT -------------------- */

function expandNeeds(itemId, qtyOutput, needs) {
  const item = RUST.items.find(i => i.id === itemId);
  if (!item) return;

  const out = item.output || 1;
  const craftsNeeded = Math.ceil(qtyOutput / out);

  for (const [k, v] of Object.entries(item.recipe)) {
    const sub = RUST.items.find(i => i.id === k);
    if (sub) expandNeeds(k, v * craftsNeeded, needs);
    else needs[k] = (needs[k] || 0) + v * craftsNeeded;
  }
}

function solveItem(itemId, inv) {
  const item = RUST.items.find(i => i.id === itemId);
  const out = item.output || 1;

  let lo = 0;
  let hi = 100000;

  function canCraft(crafts) {
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

function renderCard(sol) {
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

function render() {
  const inv = readInv();
  const cardsEl = $("cards");
  if (!cardsEl) return;
  cardsEl.innerHTML = RUST.items.map(it => renderCard(solveItem(it.id, inv))).join("");
}

/* -------------------- OBJECTIF -------------------- */

function requirementsForTarget(itemId, targetQty, useStock, inv) {
  const item = RUST.items.find(i => i.id === itemId);
  if (!item) return null;

  const target = Math.max(0, Math.floor(Number(targetQty || 0)));
  const needs = {};
  expandNeeds(itemId, target, needs);

  const needExplosivesTotal = needs.explosives || 0;
  const invExplosives = useStock ? inv.explosives : 0;
  const makeExplosives = Math.max(0, needExplosivesTotal - invExplosives);

  const gpDirectTotal = needs.gunpowder || 0;
  const gpForExplosives = makeExplosives * RUST.explosive.gunpowder;
  const gpTotal = gpDirectTotal + gpForExplosives;

  const invGP = useStock ? inv.gunpowder : 0;
  const gpToMake = Math.max(0, gpTotal - invGP);

  const sulfurDirectOther = needs.sulfur || 0;
  const sulfurKeep = (makeExplosives * RUST.explosive.sulfur) + sulfurDirectOther;

  const sulfurConvert = gpToMake * RUST.gunpowder.sulfur;
  const charcoalNeed = gpToMake * RUST.gunpowder.charcoal;

  const lowgradeNeed = (needs.lowgrade || 0) + makeExplosives * RUST.explosive.lowgrade;
  const metalfragsNeed = (needs.metalfrags || 0) + makeExplosives * RUST.explosive.metalfrags;

  function missing(total, have) { return Math.max(0, total - (useStock ? have : 0)); }

  const totalSulfurNeed = sulfurKeep + sulfurConvert;

  return {
    item,
    target,
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
    }
  };
}

function optLine(label, total, miss) {
  if (!total) return "";
  const missPart = (miss && miss > 0) ? ` — <span class="bad">manque ${fmt(miss)}</span>` : ` — <span class="good">OK</span>`;
  return `<li>${label}: <b>${fmt(total)}</b>${missPart}</li>`;
}

function renderGoal() {
  const inv = readInv();
  const itemSel = $("goal-item");
  const qtyEl = $("goal-qty");
  const useStockEl = $("goal-use-stock");
  const out = $("goal-result");
  if (!itemSel || !qtyEl || !useStockEl || !out) return;

  const req = requirementsForTarget(itemSel.value, Number(qtyEl.value || 0), useStockEl.checked, inv);
  if (!req) return;

  const t = req.totals;
  const m = req.missing;

  out.innerHTML = `
    <div><b>Objectif :</b> ${fmt(req.target)} ${escapeHtml(req.item.unit)} (${escapeHtml(req.item.name)})</div>

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
  `;
}

function setupGoal() {
  const sel = $("goal-item");
  if (!sel) return;

  sel.innerHTML = RUST.items.map(it => `<option value="${it.id}">${escapeHtml(it.name)}</option>`).join("");
  if (RUST.items.some(it => it.id === "rocket")) sel.value = "rocket";

  $("goal-calc")?.addEventListener("click", renderGoal);
  sel.addEventListener("change", renderGoal);
  $("goal-qty")?.addEventListener("input", renderGoal);
  $("goal-use-stock")?.addEventListener("change", renderGoal);

  renderGoal();
}

/* -------------------- TABS -------------------- */

function setupTabs() {
  const buttons = document.querySelectorAll(".nav-btn[data-target]");
  const panes = document.querySelectorAll(".tab-pane");

  function activateTab(targetId) {
    buttons.forEach(b => b.classList.toggle("is-active", b.dataset.target === targetId));
    panes.forEach(p => p.classList.toggle("is-active", p.id === targetId));

    try { localStorage.setItem("lulu_active_tab", targetId); } catch (e) { }
    if (targetId) history.replaceState(null, "", `#${targetId}`);
  }

  buttons.forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.target)));

  const fromHash = (location.hash || "").replace("#", "");
  let initial = fromHash;
  if (!initial) {
    try { initial = localStorage.getItem("lulu_active_tab"); } catch (e) { }
  }
  if (!initial) initial = "tab-craft";

  const exists = [...panes].some(p => p.id === initial);
  activateTab(exists ? initial : "tab-craft");
}

/* -------------------- DECAY (refacto) -------------------- */

function setupDecay() {
  const pieceEl = $("decay-piece");
  const matEl = $("decay-mat");
  const hpEl = $("decay-hp");
  const maxEl = $("decay-max");
  const lockEl = $("decay-max-lock");
  const btnEl = $("decay-calc");
  const outEl = $("decay-result");
  const copyEl = $("decay-copy");
  const copyEndEl = $("decay-copy-end");
  const hintEl = $("decay-max-hint");

  if (!pieceEl || !matEl || !hpEl || !maxEl || !btnEl || !outEl || !lockEl) return;
  if (!RUST?.decay?.materials || !Array.isArray(RUST?.decay?.pieces)) return;

  const state = {
    locked: true,
    lastTimer: "",
    lastEnd: "",
    syncing: false,
    lastPieceId: "", // ✅ NEW
  };


  const materials = RUST.decay.materials;
  const pieces = RUST.decay.pieces;

  function pad2(x) { return String(x).padStart(2, "0"); }
  function formatHMS(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  }

  function getPiece(id) {
    return pieces.find(p => p.id === id) || pieces[0];
  }

  function allowedMatsForPiece(piece) {
    return Object.keys(piece.maxHpByMat || {});
  }

  function renderPieceOptions() {
    pieceEl.innerHTML = pieces.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`).join("");
  }

  function renderMaterialOptions(allowedIds, preferred) {
    const allowed = new Set(allowedIds);
    const allIds = Object.keys(materials);

    // On affiche tous les matériaux, mais on disable ceux qui ne matchent pas la pièce
    const html = allIds.map(id => {
      const m = materials[id];
      const disabled = allowed.has(id) ? "" : "disabled";
      return `<option value="${escapeHtml(id)}" ${disabled}>${escapeHtml(m.label)}</option>`;
    }).join("");

    matEl.innerHTML = html;

    // Choix : si preferred est autorisé, on garde, sinon on prend le 1er autorisé
    const chosen = (preferred && allowed.has(preferred)) ? preferred : (allowedIds[0] || allIds[0]);
    matEl.value = chosen;
  }

  function setLocked(nextLocked) {
    state.locked = !!nextLocked;
    lockEl.setAttribute("aria-pressed", state.locked ? "true" : "false");
    lockEl.textContent = state.locked ? "🔒" : "🔓";
    lockEl.title = state.locked ? "Déverrouiller PV max" : "Verrouiller PV max";
    maxEl.readOnly = state.locked;
  }

  function safeInt(v, fallback) {
    const x = Math.floor(Number(v));
    return Number.isFinite(x) ? x : fallback;
  }

  function compute() {
    if (state.syncing) return;
    state.syncing = true;

    const piece = getPiece(pieceEl.value);
    const allowedMats = allowedMatsForPiece(piece);

    const currentMat = matEl.value;
    const pieceChanged = piece.id !== state.lastPieceId;
    const matValid = allowedMats.includes(currentMat);

    // ✅ IMPORTANT : si la pièce change, on re-render toujours pour enlever les disabled hérités
    if (pieceChanged || !matValid) {
      const preferred = allowedMats.includes(currentMat)
        ? currentMat
        : (piece.defaultMat || allowedMats[0] || "stone");

      renderMaterialOptions(allowedMats, preferred);
      state.lastPieceId = piece.id;
    }

    const matId = matEl.value;
    const mat = materials[matId] || materials.stone;


    // Preset max HP
    const presetMax = piece.maxHpByMat?.[matId];
    const hasPreset = Number.isFinite(presetMax) && presetMax > 0;

    // max HP utilisé
    let maxHpUsed = hasPreset ? presetMax : safeInt(maxEl.value, 1);
    if (!state.locked) {
      maxHpUsed = Math.max(1, safeInt(maxEl.value, maxHpUsed));
    } else {
      // locked => on applique le preset
      maxHpUsed = Math.max(1, hasPreset ? presetMax : maxHpUsed);
      maxEl.value = String(maxHpUsed);
    }

    // clamp hp
    let hp = Math.max(0, safeInt(hpEl.value, 0));
    if (hp > maxHpUsed) {
      hp = maxHpUsed;
      hpEl.value = String(hp);
    }

    // hint preset
    if (hintEl) {
      const presetTxt = hasPreset
        ? `Preset: ${piece.label} • ${mat.label} = ${maxHpUsed} PV`
        : `Preset: ${piece.label} • ${mat.label} (PV max manuel)`;
      const lockTxt = state.locked ? "PV max verrouillé" : "PV max override (manuel)";
      hintEl.textContent = `${presetTxt} — decay vanilla: ${mat.decayHours}h — ${lockTxt}`;
    }

    // calcul
    if (!Number.isFinite(mat.decayHours) || mat.decayHours <= 0 || maxHpUsed <= 0) {
      outEl.innerHTML = `<b>Erreur :</b> preset invalide.`;
      state.lastTimer = "";
      state.lastEnd = "";
      state.syncing = false;
      return;
    }

    const ratio = Math.min(1, Math.max(0, hp / maxHpUsed));
    const remainingSeconds = ratio * mat.decayHours * 3600;

    const end = new Date(Date.now() + remainingSeconds * 1000);
    const endTime = end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const endDate = end.toLocaleDateString("fr-FR");

    const timer = formatHMS(remainingSeconds);
    const endStr = `${endDate} ${endTime}`;

    state.lastTimer = timer;
    state.lastEnd = endStr;

    outEl.innerHTML = `
      <div><b>Résultat :</b></div>
      <div style="margin-top:8px;">
        Pièce : <b>${escapeHtml(piece.label)}</b> — Matériau : <b>${escapeHtml(mat.label)}</b>
      </div>
      <div style="margin-top:6px;">
        PV : <b>${fmt(hp)}</b> / <b>${fmt(maxHpUsed)}</b>
      </div>
      <div style="margin-top:10px;">
        Temps restant estimé : <b class="good">${escapeHtml(timer)}</b>
      </div>
      <div style="margin-top:6px; color: var(--muted);">
        Heure de fin (si ça continue) : <b>${escapeHtml(endStr)}</b>
      </div>
      <div style="margin-top:10px; font-size:12px; color: var(--muted);">
        Note : estimation “vanilla”. Si le serveur modifie la decay, ça peut diverger.
      </div>
    `;

    state.syncing = false;
  }

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e2) { }
      document.body.removeChild(ta);
    }
  }

  // Init UI
  renderPieceOptions();
  setLocked(true);

  // Default piece
  pieceEl.value = "block";
  const defaultPiece = getPiece(pieceEl.value);
  renderMaterialOptions(allowedMatsForPiece(defaultPiece), defaultPiece.defaultMat || "stone");
  state.lastPieceId = defaultPiece.id; // ✅ NEW

  // Events (une seule fois)
  pieceEl.addEventListener("change", compute);
  matEl.addEventListener("change", compute);
  hpEl.addEventListener("input", compute);
  maxEl.addEventListener("input", compute);
  btnEl.addEventListener("click", compute);

  lockEl.addEventListener("click", () => {
    setLocked(!state.locked);
    compute();
  });

  copyEl?.addEventListener("click", () => copyText(state.lastTimer));
  copyEndEl?.addEventListener("click", () => copyText(state.lastEnd));

  // First compute
  compute();
}

/* -------------------- INIT -------------------- */

function init() {
  setupTabs();

  $("calc")?.addEventListener("click", () => { render(); renderGoal(); });
  render();
  setupGoal();

  setupDecay();
}

init();
