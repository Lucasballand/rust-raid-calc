/* app.js — Rust Raid Calc (vanilla)
   - Tabs (hash + localStorage)
   - Craft cards + Objectif
   - Decay
   - Destruction/Raid table + panier
   - Fallback images + debug si data.js ne charge pas
*/

(() => {
  "use strict";

  /* =========================
     HELPERS
     ========================= */
  const $ = (id) => document.getElementById(id);

  const fmt = (x) => (Math.floor(Number(x) || 0)).toLocaleString("fr-FR");

  const escapeHtml = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  const n = (id) => {
    const el = $(id);
    if (!el) return 0;
    return Math.max(0, Math.floor(Number(el.value || 0)));
  };

  const readInv = () => ({
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
  });

  const hasRust = () => !!(window.RUST && Array.isArray(window.RUST.items));

  const RAID_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#121a23"/>
          <stop offset="1" stop-color="#0e151d"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#g)"/>
      <path d="M24 10l12 7v14l-12 7-12-7V17l12-7z" fill="#ffcc66" opacity="0.92"/>
      <path d="M24 18v10" stroke="#0b0f14" stroke-width="3" stroke-linecap="round"/>
      <circle cx="24" cy="33" r="2.4" fill="#0b0f14"/>
    </svg>`
  )}`;

  function ensureImg(imgEl, src, alt = "") {
    if (!imgEl) return;
    imgEl.alt = alt;
    imgEl.loading = "lazy";
    imgEl.src = src || RAID_PLACEHOLDER;
    imgEl.onerror = () => {
      imgEl.onerror = null;
      imgEl.src = RAID_PLACEHOLDER;
    };
  }

  function debugDataMissingUI() {
    console.error(
      "[Rust Raid Calc] window.RUST introuvable. data.js ne charge pas (404) ou contient une erreur de syntaxe."
    );

    // petit message visible (sans casser ton layout)
    const cards = $("cards");
    const raidTbody = $("raid-tbody");
    if (cards) {
      cards.innerHTML = `
        <div class="card" style="padding:14px;">
          <b>Erreur :</b> data.js ne s’est pas chargé.<br>
          Ouvre la console (F12) pour voir le détail.
        </div>
      `;
    }
    if (raidTbody) {
      raidTbody.innerHTML = `
        <tr>
          <td colspan="8" style="padding:14px; color: var(--muted);">
            <b>Erreur :</b> data.js ne s’est pas chargé → table indisponible.
          </td>
        </tr>
      `;
    }
  }

  /* =========================
     DATA ACCESS
     ========================= */
  function itemById(id) {
    return (window.RUST?.items || []).find((x) => x.id === id) || null;
  }

  /* =========================================================
     TABS
     ========================================================= */
  const Tabs = (() => {
    function setupTabs() {
      const buttons = document.querySelectorAll(".nav-btn[data-target]");
      const panes = document.querySelectorAll(".tab-pane");
      if (!buttons.length || !panes.length) return;

      function activateTab(targetId) {
        buttons.forEach((b) => b.classList.toggle("is-active", b.dataset.target === targetId));
        panes.forEach((p) => p.classList.toggle("is-active", p.id === targetId));

        try {
          localStorage.setItem("lulu_active_tab", targetId);
        } catch (_) {}

        if (targetId) history.replaceState(null, "", `#${targetId}`);
      }

      // Click buttons
      buttons.forEach((btn) => btn.addEventListener("click", () => activateTab(btn.dataset.target)));

      // Hash changes (logo href="#tab-craft", back/forward, etc.)
      window.addEventListener("hashchange", () => {
        const h = (location.hash || "").replace("#", "");
        if (h && [...panes].some((p) => p.id === h)) activateTab(h);
      });

      // Initial tab
      const fromHash = (location.hash || "").replace("#", "");
      let initial = fromHash;

      if (!initial) {
        try {
          initial = localStorage.getItem("lulu_active_tab");
        } catch (_) {}
      }
      if (!initial) initial = "tab-craft";

      const exists = [...panes].some((p) => p.id === initial);
      activateTab(exists ? initial : "tab-craft");
    }

    return { setupTabs };
  })();

  /* =========================================================
     CRAFT
     ========================================================= */
  const Craft = (() => {
    // Expand recursive recipe into base needs
    function expandNeeds(itemId, qtyOutput, needs) {
      const item = itemById(itemId);
      if (!item) return;

      const out = item.output || 1;
      const craftsNeeded = Math.ceil(qtyOutput / out);

      for (const [k, v] of Object.entries(item.recipe || {})) {
        const sub = itemById(k);
        if (sub) expandNeeds(k, v * craftsNeeded, needs);
        else needs[k] = (needs[k] || 0) + v * craftsNeeded;
      }
    }

    function canCraft(itemId, crafts, inv) {
      const item = itemById(itemId);
      if (!item) return false;

      const out = item.output || 1;
      const qtyOutput = crafts * out;

      const needs = {};
      expandNeeds(itemId, qtyOutput, needs);

      const needExplosives = needs.explosives || 0;
      const makeExplosives = Math.max(0, needExplosives - inv.explosives);

      const gpDirect = needs.gunpowder || 0;
      const gpForExplosives = makeExplosives * (RUST.explosive?.gunpowder || 0);
      const gpTotal = gpDirect + gpForExplosives;
      const gpToMake = Math.max(0, gpTotal - inv.gunpowder);

      const sulfurDirectForExplosives = makeExplosives * (RUST.explosive?.sulfur || 0);
      const sulfurDirectOther = needs.sulfur || 0;
      const sulfurDirect = sulfurDirectForExplosives + sulfurDirectOther;

      const sulfurForGP = gpToMake * (RUST.gunpowder?.sulfur || 0);
      const charcoalForGP = gpToMake * (RUST.gunpowder?.charcoal || 0);

      const lowgradeNeed = (needs.lowgrade || 0) + makeExplosives * (RUST.explosive?.lowgrade || 0);
      const metalfragsNeed = (needs.metalfrags || 0) + makeExplosives * (RUST.explosive?.metalfrags || 0);

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

    function solveItem(itemId, inv) {
      const item = itemById(itemId);
      if (!item) return null;

      const out = item.output || 1;
      let lo = 0;
      let hi = 100000;

      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (canCraft(itemId, mid, inv)) lo = mid;
        else hi = mid - 1;
      }

      const crafts = lo;
      const craftable = crafts * out;

      const needs = {};
      expandNeeds(itemId, craftable, needs);

      const needExplosives = needs.explosives || 0;
      const makeExplosives = Math.max(0, needExplosives - inv.explosives);

      const gpDirect = needs.gunpowder || 0;
      const gpForExplosives = makeExplosives * (RUST.explosive?.gunpowder || 0);
      const gpTotal = gpDirect + gpForExplosives;
      const gpToMake = Math.max(0, gpTotal - inv.gunpowder);

      const sulfurDirectForExplosives = makeExplosives * (RUST.explosive?.sulfur || 0);
      const sulfurDirectOther = needs.sulfur || 0;
      const sulfurKeep = sulfurDirectForExplosives + sulfurDirectOther;

      const sulfurConvert = gpToMake * (RUST.gunpowder?.sulfur || 0);
      const charcoal = gpToMake * (RUST.gunpowder?.charcoal || 0);

      const lowgrade = (needs.lowgrade || 0) + makeExplosives * (RUST.explosive?.lowgrade || 0);
      const metalfrags = (needs.metalfrags || 0) + makeExplosives * (RUST.explosive?.metalfrags || 0);

      const costs = {
        crafts,
        output: out,
        gunpowderToMake: gpToMake,
        explosivesToMake: makeExplosives,
        sulfurKeep,
        sulfurConvert,
        charcoal,
        lowgrade,
        metalfrags,
        pipes: needs.pipes || 0,
        cloth: needs.cloth || 0,
        techtrash: needs.techtrash || 0,
        rope: needs.rope || 0,
        smallstash: needs.smallstash || 0,
      };

      return { item, craftable, costs };
    }

    function renderCard(sol) {
      if (!sol) return "";
      const { item, craftable, costs } = sol;

      const out = item.output || 1;
      const craftNote = out > 1 ? ` <span class="warn">(craft = x${out})</span>` : "";

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

    function renderAll() {
      const cardsEl = $("cards");
      if (!cardsEl || !hasRust()) return;

      const inv = readInv();
      cardsEl.innerHTML = (RUST.items || []).map((it) => renderCard(solveItem(it.id, inv))).join("");
    }

    function requirementsForTarget(itemId, targetQty, useStock, inv) {
      const item = itemById(itemId);
      if (!item) return null;

      const target = Math.max(0, Math.floor(Number(targetQty || 0)));
      const needs = {};
      expandNeeds(itemId, target, needs);

      const needExplosivesTotal = needs.explosives || 0;
      const invExplosives = useStock ? inv.explosives : 0;
      const makeExplosives = Math.max(0, needExplosivesTotal - invExplosives);

      const gpDirectTotal = needs.gunpowder || 0;
      const gpForExplosives = makeExplosives * (RUST.explosive?.gunpowder || 0);
      const gpTotal = gpDirectTotal + gpForExplosives;

      const invGP = useStock ? inv.gunpowder : 0;
      const gpToMake = Math.max(0, gpTotal - invGP);

      const sulfurDirectOther = needs.sulfur || 0;
      const sulfurKeep = makeExplosives * (RUST.explosive?.sulfur || 0) + sulfurDirectOther;

      const sulfurConvert = gpToMake * (RUST.gunpowder?.sulfur || 0);
      const charcoalNeed = gpToMake * (RUST.gunpowder?.charcoal || 0);

      const lowgradeNeed = (needs.lowgrade || 0) + makeExplosives * (RUST.explosive?.lowgrade || 0);
      const metalfragsNeed = (needs.metalfrags || 0) + makeExplosives * (RUST.explosive?.metalfrags || 0);

      const missing = (total, have) => Math.max(0, total - (useStock ? have : 0));
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
        },
      };
    }

    function optLine(label, total, miss) {
      if (!total) return "";
      const missPart = miss && miss > 0 ? ` — <span class="bad">manque ${fmt(miss)}</span>` : ` — <span class="good">OK</span>`;
      return `<li>${label}: <b>${fmt(total)}</b>${missPart}</li>`;
    }

    function renderGoal() {
      const itemSel = $("goal-item");
      const qtyEl = $("goal-qty");
      const useStockEl = $("goal-use-stock");
      const out = $("goal-result");
      if (!itemSel || !qtyEl || !useStockEl || !out) return;

      const inv = readInv();
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
      if (!sel || !hasRust()) return;

      sel.innerHTML = (RUST.items || [])
        .map((it) => `<option value="${escapeHtml(it.id)}">${escapeHtml(it.name)}</option>`)
        .join("");

      if ((RUST.items || []).some((it) => it.id === "rocket")) sel.value = "rocket";

      on($("goal-calc"), "click", renderGoal);
      on(sel, "change", renderGoal);
      on($("goal-qty"), "input", renderGoal);
      on($("goal-use-stock"), "change", renderGoal);

      renderGoal();
    }

    return { expandNeeds, renderAll, renderGoal, setupGoal };
  })();

  /* =========================================================
     DECAY
     ========================================================= */
  const Decay = (() => {
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

      const materials = RUST.decay.materials;
      const pieces = RUST.decay.pieces;

      const state = {
        locked: true,
        lastTimer: "",
        lastEnd: "",
        syncing: false,
        lastPieceId: "",
      };

      const pad2 = (x) => String(x).padStart(2, "0");
      const safeInt = (v, fallback) => {
        const x = Math.floor(Number(v));
        return Number.isFinite(x) ? x : fallback;
      };

      function formatHMS(totalSeconds) {
        const s = Math.max(0, Math.floor(totalSeconds));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
      }

      const getPiece = (id) => pieces.find((p) => p.id === id) || pieces[0];
      const allowedMatsForPiece = (piece) => Object.keys(piece.maxHpByMat || {});

      function renderPieceOptions() {
        pieceEl.innerHTML = pieces
          .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`)
          .join("");
      }

      function renderMaterialOptions(allowedIds, preferred) {
        const allowed = new Set(allowedIds);
        const allIds = Object.keys(materials);

        matEl.innerHTML = allIds
          .map((id) => {
            const m = materials[id];
            const disabled = allowed.has(id) ? "" : "disabled";
            return `<option value="${escapeHtml(id)}" ${disabled}>${escapeHtml(m.label)}</option>`;
          })
          .join("");

        const chosen = preferred && allowed.has(preferred) ? preferred : allowedIds[0] || allIds[0];
        matEl.value = chosen;
      }

      function setLocked(nextLocked) {
        state.locked = !!nextLocked;
        lockEl.setAttribute("aria-pressed", state.locked ? "true" : "false");
        lockEl.textContent = state.locked ? "🔒" : "🔓";
        lockEl.title = state.locked ? "Déverrouiller PV max" : "Verrouiller PV max";
        maxEl.readOnly = state.locked;
      }

      function compute() {
        if (state.syncing) return;
        state.syncing = true;

        const piece = getPiece(pieceEl.value);
        const allowedMats = allowedMatsForPiece(piece);

        const currentMat = matEl.value;
        const pieceChanged = piece.id !== state.lastPieceId;
        const matValid = allowedMats.includes(currentMat);

        if (pieceChanged || !matValid) {
          const preferred = allowedMats.includes(currentMat)
            ? currentMat
            : piece.defaultMat || allowedMats[0] || "stone";
          renderMaterialOptions(allowedMats, preferred);
          state.lastPieceId = piece.id;
        }

        const matId = matEl.value;
        const mat = materials[matId] || materials.stone;

        const presetMax = piece.maxHpByMat?.[matId];
        const hasPreset = Number.isFinite(presetMax) && presetMax > 0;

        let maxHpUsed = hasPreset ? presetMax : safeInt(maxEl.value, 1);
        if (!state.locked) {
          maxHpUsed = Math.max(1, safeInt(maxEl.value, maxHpUsed));
        } else {
          maxHpUsed = Math.max(1, hasPreset ? presetMax : maxHpUsed);
          maxEl.value = String(maxHpUsed);
        }

        let hp = Math.max(0, safeInt(hpEl.value, 0));
        if (hp > maxHpUsed) {
          hp = maxHpUsed;
          hpEl.value = String(hp);
        }

        if (hintEl) {
          const presetTxt = hasPreset
            ? `Preset: ${piece.label} • ${mat.label} = ${maxHpUsed} PV`
            : `Preset: ${piece.label} • ${mat.label} (PV max manuel)`;
          const lockTxt = state.locked ? "PV max verrouillé" : "PV max override (manuel)";
          hintEl.textContent = `${presetTxt} — decay vanilla: ${mat.decayHours}h — ${lockTxt}`;
        }

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
        `;

        state.syncing = false;
      }

      async function copyText(text) {
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
        } catch (_) {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); } catch (_) {}
          document.body.removeChild(ta);
        }
      }

      renderPieceOptions();
      setLocked(true);

      pieceEl.value = "block";
      const defaultPiece = getPiece(pieceEl.value);
      renderMaterialOptions(allowedMatsForPiece(defaultPiece), defaultPiece.defaultMat || "stone");
      state.lastPieceId = defaultPiece.id;

      on(pieceEl, "change", compute);
      on(matEl, "change", compute);
      on(hpEl, "input", compute);
      on(maxEl, "input", compute);
      on(btnEl, "click", compute);

      on(lockEl, "click", () => {
        setLocked(!state.locked);
        compute();
      });

      on(copyEl, "click", () => copyText(state.lastTimer));
      on(copyEndEl, "click", () => copyText(state.lastEnd));

      compute();
    }

    return { setupDecay };
  })();

  /* =========================================================
     RAID / DESTRUCTION
     ========================================================= */
  const Raid = (() => {
    function setupDestruction() {
      const tbody = $("raid-tbody");
      const searchEl = $("raid-search");
      const sortEl = $("raid-sort");
      const catWrap = document.querySelector(".raid-cats");

      const cartDetails = $("raid-cart");
      const cartCountEl = $("raid-cart-count");
      const cartEmptyEl = $("raid-cart-empty");
      const cartListEl = $("raid-cart-list");
      const cartTotalsEl = $("raid-cart-totals");
      const cartCopyBtn = $("raid-cart-copy");
      const cartClearBtn = $("raid-cart-clear");

      if (!tbody || !searchEl || !sortEl) return;
      if (!RUST?.raid?.targets || !Array.isArray(RUST.raid.targets)) return;

      const state = {
        cat: "all",
        q: "",
        sort: "best_sulfur",
        selected: {}, // targetId -> optionIndex
        cart: {}, // targetId -> { qty, optionIndex }
      };

      function resolveTargetImg(target) {
        if (target?.img) return target.img;
        if (target?.id) return `assets/raid/${target.id}.png`;
        return RAID_PLACEHOLDER;
      }

      function expandNeedsForRaid(itemId, qtyWanted, needs) {
        if (itemId === "sulfur") {
          needs.sulfur = (needs.sulfur || 0) + qtyWanted;
          return;
        }
        if (itemId === "gunpowder") {
          needs.gunpowder = (needs.gunpowder || 0) + qtyWanted;
          return;
        }
        if (itemId === "explosives") {
          needs.explosives = (needs.explosives || 0) + qtyWanted;
          return;
        }

        const it = itemById(itemId);
        if (!it) return;
        Craft.expandNeeds(itemId, qtyWanted, needs);
      }

      function sulfurFromNeeds(needs) {
        const sulfurDirect = needs.sulfur || 0;
        const gp = needs.gunpowder || 0;
        const ex = needs.explosives || 0;

        const sulfurForGP = gp * (RUST.gunpowder?.sulfur || 0);

        const sulfurPerExplosive =
          (RUST.explosive?.sulfur || 0) +
          (RUST.explosive?.gunpowder || 0) * (RUST.gunpowder?.sulfur || 0);

        const sulfurForExplosives = ex * sulfurPerExplosive;

        return sulfurDirect + sulfurForGP + sulfurForExplosives;
      }

      function sulfurCostForPart(part) {
        const needs = {};
        expandNeedsForRaid(part.item, part.qty, needs);
        return sulfurFromNeeds(needs);
      }

      function sulfurCostForOption(option) {
        let s = 0;
        for (const p of option?.parts || []) s += sulfurCostForPart(p);
        return s;
      }

      function bestOptionIndex(target) {
        const opts = target.options || [];
        if (!opts.length) return 0;

        let bestI = 0;
        let bestS = Infinity;
        for (let i = 0; i < opts.length; i++) {
          const s = sulfurCostForOption(opts[i]);
          if (s < bestS) {
            bestS = s;
            bestI = i;
          }
        }
        return bestI;
      }

      function bestSulfur(target) {
        const i = bestOptionIndex(target);
        const opt = (target.options || [])[i];
        return opt ? sulfurCostForOption(opt) : 0;
      }

      function singleToolQtyAndIndex(target, toolId) {
        const opts = target.options || [];
        for (let i = 0; i < opts.length; i++) {
          const parts = opts[i].parts || [];
          if (parts.length === 1 && parts[0].item === toolId) {
            return { qty: parts[0].qty, index: i };
          }
        }
        return { qty: null, index: -1 };
      }

      function setSelected(targetId, optionIndex) {
        state.selected[targetId] = optionIndex;
        renderTable();
      }

      function addToCart(targetId) {
        const target = RUST.raid.targets.find((t) => t.id === targetId);
        if (!target) return;

        const optIndex = state.selected[targetId] ?? bestOptionIndex(target);

        const prev = state.cart[targetId];
        if (prev) {
          prev.qty += 1;
          prev.optionIndex = optIndex;
        } else {
          state.cart[targetId] = { qty: 1, optionIndex: optIndex };
        }

        renderCart();
        if (cartDetails && !cartDetails.open) cartDetails.open = true;
      }

      function decCart(targetId) {
        const it = state.cart[targetId];
        if (!it) return;
        it.qty -= 1;
        if (it.qty <= 0) delete state.cart[targetId];
        renderCart();
      }

      function incCart(targetId) {
        const it = state.cart[targetId];
        if (!it) return;
        it.qty += 1;
        renderCart();
      }

      function clearCart() {
        state.cart = {};
        renderCart();
      }

      async function copyText(text) {
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
        } catch (_) {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); } catch (_) {}
          document.body.removeChild(ta);
        }
      }

      function renderCart() {
        if (!cartCountEl || !cartEmptyEl || !cartListEl || !cartTotalsEl) return;

        const entries = Object.entries(state.cart);
        const count = entries.reduce((a, [, v]) => a + (v.qty || 0), 0);
        cartCountEl.textContent = String(count);

        if (count === 0) {
          cartEmptyEl.style.display = "";
          cartListEl.innerHTML = "";
          cartTotalsEl.innerHTML = "";
          return;
        }

        cartEmptyEl.style.display = "none";

        const totalsParts = { rocket: 0, c4: 0, satchel: 0, explo556: 0 };
        let sulfurTotal = 0;

        cartListEl.innerHTML = entries
          .map(([targetId, v]) => {
            const target = RUST.raid.targets.find((t) => t.id === targetId);
            if (!target) return "";

            const opt = (target.options || [])[v.optionIndex] || (target.options || [])[0];
            const optLabel = opt?.label || "Option";
            const optSulfur = opt ? sulfurCostForOption(opt) : 0;

            sulfurTotal += optSulfur * v.qty;

            for (const p of opt?.parts || []) {
              if (p.item in totalsParts) totalsParts[p.item] += (p.qty || 0) * v.qty;
            }

            return `
              <div style="display:flex; gap:10px; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.06);">
                <div style="display:flex; gap:10px; align-items:center; min-width:0;">
                  <img data-cart-img="${escapeHtml(targetId)}" style="width:36px;height:36px;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.35));" alt="">
                  <div style="min-width:0;">
                    <div style="font-weight:1000; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      ${escapeHtml(target.label)}
                    </div>
                    <div style="color:var(--muted); font-size:12px; margin-top:2px;">
                      ${escapeHtml(optLabel)} • <b>${fmt(optSulfur)}</b> sulfur (x1)
                    </div>
                  </div>
                </div>

                <div style="display:flex; gap:8px; align-items:center; flex:0 0 auto;">
                  <button class="mini-btn" type="button" data-cart-dec="${escapeHtml(targetId)}">−</button>
                  <div style="min-width:28px; text-align:center; font-weight:1000;">${fmt(v.qty)}</div>
                  <button class="mini-btn" type="button" data-cart-inc="${escapeHtml(targetId)}">+</button>
                </div>
              </div>
            `;
          })
          .join("");

        // inject images with fallback
        cartListEl.querySelectorAll("img[data-cart-img]").forEach((img) => {
          const tid = img.getAttribute("data-cart-img");
          const t = RUST.raid.targets.find((x) => x.id === tid);
          ensureImg(img, resolveTargetImg(t), t?.label || "");
        });

        cartTotalsEl.innerHTML = `
          <div style="margin-top:10px;">
            <div style="color:var(--muted); font-size:12px; margin-bottom:6px;">Totaux</div>
            <div class="row"><div class="l">Rockets</div><div class="r">${fmt(totalsParts.rocket)}</div></div>
            <div class="row"><div class="l">C4</div><div class="r">${fmt(totalsParts.c4)}</div></div>
            <div class="row"><div class="l">Satchels</div><div class="r">${fmt(totalsParts.satchel)}</div></div>
            <div class="row"><div class="l">Explo ammo</div><div class="r">${fmt(totalsParts.explo556)}</div></div>
            <div class="row"><div class="l">Sulfur estimé</div><div class="r"><b>${fmt(sulfurTotal)}</b></div></div>
          </div>
        `;
      }

      function rowItemCell(target) {
        return `
          <td class="raid-item">
            <div style="display:flex; gap:10px; align-items:center;">
              <img data-raid-img="${escapeHtml(target.id)}" style="width:36px;height:36px;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.35));" alt="">
              <div style="min-width:0;">
                <span class="raid-name">${escapeHtml(target.label)}</span>
                <span class="raid-sub">${escapeHtml(target.cat)} • ${fmt(target.hp)} HP</span>
              </div>
            </div>
          </td>
        `;
      }

      function renderTable() {
        const q = (state.q || "").trim().toLowerCase();

        let rows = [...RUST.raid.targets];

        if (state.cat !== "all") rows = rows.filter((t) => t.cat === state.cat);

        if (q) {
          rows = rows.filter((t) => {
            const hay = `${t.label} ${t.id} ${t.cat}`.toLowerCase();
            return hay.includes(q);
          });
        }

        // default selected option = best
        for (const t of rows) {
          if (state.selected[t.id] == null) state.selected[t.id] = bestOptionIndex(t);
        }

        // sort
        if (state.sort === "name_asc") {
          rows.sort((a, b) => String(a.label).localeCompare(String(b.label)));
        } else if (state.sort === "hp_desc") {
          rows.sort((a, b) => (b.hp || 0) - (a.hp || 0));
        } else {
          // best_sulfur => tri sur la meilleure option du target
          rows.sort((a, b) => bestSulfur(a) - bestSulfur(b));
        }

        tbody.innerHTML = rows
          .map((t) => {
            const sat = singleToolQtyAndIndex(t, "satchel");
            const roc = singleToolQtyAndIndex(t, "rocket");
            const c4 = singleToolQtyAndIndex(t, "c4");
            const am = singleToolQtyAndIndex(t, "explo556");

            const selectedIdx = state.selected[t.id];
            const bestIdx = bestOptionIndex(t);

            const bestOpt = (t.options || [])[bestIdx];
            const bestS = bestOpt ? sulfurCostForOption(bestOpt) : 0;

            const chipCell = (tool) => {
              if (tool.qty == null) return `<td class="raid-cell"><span style="opacity:.35;">—</span></td>`;
              const isSel = tool.index === selectedIdx ? " is-selected" : "";
              return `
                <td class="raid-cell">
                  <button class="raid-chip${isSel}" type="button"
                    data-sel-target="${escapeHtml(t.id)}"
                    data-sel-opt="${tool.index}">
                    ${fmt(tool.qty)}
                  </button>
                </td>
              `;
            };

            const bestIsSel = bestIdx === selectedIdx ? " is-selected" : "";

            return `
              <tr>
                ${rowItemCell(t)}
                <td><b>${fmt(t.hp)}</b></td>
                ${chipCell(sat)}
                ${chipCell(roc)}
                ${chipCell(c4)}
                ${chipCell(am)}

                <td class="raid-cell">
                  <div class="raid-best">
                    <button class="raid-chip${bestIsSel}" type="button"
                      data-sel-target="${escapeHtml(t.id)}"
                      data-sel-opt="${bestIdx}">
                      ${escapeHtml(bestOpt?.label || "Best")}
                    </button>
                    <div class="raid-sulfur">${fmt(bestS)} sulfur</div>
                  </div>
                </td>

                <td class="raid-cell">
                  <button class="mini-btn raid-add" type="button"
                    data-add-target="${escapeHtml(t.id)}">+</button>
                </td>
              </tr>
            `;
          })
          .join("");

        // inject images with fallback
        tbody.querySelectorAll("img[data-raid-img]").forEach((img) => {
          const tid = img.getAttribute("data-raid-img");
          const t = RUST.raid.targets.find((x) => x.id === tid);
          ensureImg(img, resolveTargetImg(t), t?.label || "");
        });
      }

      // Categories
      if (catWrap) {
        catWrap.querySelectorAll(".raid-pill[data-cat]").forEach((pill) => {
          pill.addEventListener("click", () => {
            const cat = pill.getAttribute("data-cat") || "all";
            state.cat = cat;
            catWrap.querySelectorAll(".raid-pill").forEach((p) => p.classList.toggle("is-active", p === pill));
            renderTable();
          });
        });
      }

      // Filters
      on(searchEl, "input", () => {
        state.q = searchEl.value || "";
        renderTable();
      });

      on(sortEl, "change", () => {
        state.sort = sortEl.value || "best_sulfur";
        renderTable();
      });

      // Table click delegation (chips + add)
      tbody.addEventListener("click", (e) => {
        const btn = e.target?.closest?.("button");
        if (!btn) return;

        const tid = btn.getAttribute("data-sel-target");
        if (tid) {
          const opt = Number(btn.getAttribute("data-sel-opt"));
          if (Number.isFinite(opt)) setSelected(tid, opt);
          return;
        }

        const addTid = btn.getAttribute("data-add-target");
        if (addTid) addToCart(addTid);
      });

      // Cart click delegation (+/-)
      if (cartListEl) {
        cartListEl.addEventListener("click", (e) => {
          const btn = e.target?.closest?.("button");
          if (!btn) return;

          const decId = btn.getAttribute("data-cart-dec");
          if (decId) return decCart(decId);

          const incId = btn.getAttribute("data-cart-inc");
          if (incId) return incCart(incId);
        });
      }

      on(cartClearBtn, "click", clearCart);

      on(cartCopyBtn, "click", () => {
        const entries = Object.entries(state.cart);
        if (!entries.length) return;

        let text = "Panier de raid\n";
        let sulfurTotal = 0;

        const totalsParts = { rocket: 0, c4: 0, satchel: 0, explo556: 0 };

        for (const [targetId, v] of entries) {
          const t = RUST.raid.targets.find((x) => x.id === targetId);
          if (!t) continue;

          const opt = (t.options || [])[v.optionIndex] || (t.options || [])[0];
          const s = opt ? sulfurCostForOption(opt) : 0;
          sulfurTotal += s * v.qty;

          for (const p of opt?.parts || []) {
            if (p.item in totalsParts) totalsParts[p.item] += (p.qty || 0) * v.qty;
          }

          text += `- ${t.label} x${v.qty} — ${opt?.label || "Option"} — ${s} sulfur (x1)\n`;
        }

        text += `\nTotaux\n- Rockets: ${totalsParts.rocket}\n- C4: ${totalsParts.c4}\n- Satchels: ${totalsParts.satchel}\n- Explo ammo: ${totalsParts.explo556}\n`;
        text += `\nSulfur total estimé: ${sulfurTotal}\n`;

        copyText(text);
      });

      renderTable();
      renderCart();
    }

    return { setupDestruction };
  })();

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    if (!hasRust()) {
      debugDataMissingUI();
      return;
    }

    Tabs.setupTabs();

    on($("calc"), "click", () => {
      Craft.renderAll();
      Craft.renderGoal();
    });

    Craft.renderAll();
    Craft.setupGoal();

    Decay.setupDecay();
    Raid.setupDestruction();

    console.log("[Rust Raid Calc] OK — data.js chargé, app.js initialisé.");
  }

  // Safe init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
