/* UCI·Calc — utilitários partilhados (núcleo)
 * Funciona em scripts clássicos (file:// e http) e em Node (testes).
 * @author: João Gouveia
 */
(function (root) {
  "use strict";

  const UCI = (root.UCI = root.UCI || {});

  /* ---------- Números ---------- */

  /** Converte texto ("1,5", "1.5", " 2 ") em número; NaN se inválido. */
  function parseNum(raw) {
    if (raw === null || raw === undefined) return NaN;
    const s = String(raw).trim().replace(/\s/g, "").replace(",", ".");
    if (s === "" || s === "-" || s === ".") return NaN;
    const v = Number(s);
    return Number.isFinite(v) ? v : NaN;
  }

  /** Formata número em pt-PT (vírgula decimal). Devolve "–" se não finito. */
  function fmt(value, decimals = 1) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "–";
    const fixed = (Math.round(value * 10 ** decimals) / 10 ** decimals).toFixed(decimals);
    const [int, dec] = fixed.split(".");
    const intSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, " "); // espaço fino
    return dec ? `${intSep},${dec}` : intSep;
  }

  /** Formata com número de decimais adaptado à grandeza (útil em doses). */
  function fmtSmart(value) {
    if (!Number.isFinite(value)) return "–";
    const a = Math.abs(value);
    if (a === 0) return "0";
    const d = a < 0.1 ? 3 : a < 10 ? 2 : a < 100 ? 1 : 0;
    const s = fmt(value, d);
    return d ? s.replace(/,?0+$/, "") : s; // sem zeros à direita: 0,050 → 0,05
  }

  const isNum = (v) => typeof v === "number" && Number.isFinite(v);

  UCI.num = { parseNum, fmt, fmtSmart, isNum };

  /* ---------- DOM / UI (apenas no browser) ---------- */
  if (typeof document === "undefined") return;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /**
   * Campo numérico. Usa type=text + inputmode=decimal para aceitar vírgula
   * em todos os browsers (iOS incluído).
   */
  function numField(id, label, opts = {}) {
    const { value = "", unit, placeholder = "", hint = "" } = opts;
    return `
      <label class="field" for="${id}">
        <span class="field-label">${label}</span>
        <span class="input-wrap${unit !== undefined ? " has-unit" : ""}">
          <input id="${id}" type="text" inputmode="decimal" autocomplete="off"
                 value="${esc(value)}" placeholder="${esc(placeholder)}" />
          ${unit !== undefined ? `<span class="unit">${unit}</span>` : ""}
        </span>
        ${hint ? `<small class="field-hint">${hint}</small>` : ""}
      </label>`;
  }

  /** Campo de escolha. options: [[valor, texto], ...] */
  function selectField(id, label, options, opts = {}) {
    const { value = "", placeholder = "— selecionar —" } = opts;
    const opt = options
      .map(([v, t]) => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${t}</option>`)
      .join("");
    return `
      <label class="field" for="${id}">
        <span class="field-label">${label}</span>
        <select id="${id}">${placeholder !== null ? `<option value="">${placeholder}</option>` : ""}${opt}</select>
      </label>`;
  }

  /** Lista de resultados. rows: [[texto, id], ...] */
  function results(rows) {
    return `<ul class="results-list">${rows
      .map(([t, id]) => `<li><span>${t}</span><strong id="${id}">–</strong></li>`)
      .join("")}</ul>`;
  }

  /** Separadores dentro de uma secção. tabs: [[id, texto, html], ...] */
  function tabs(groupId, list) {
    const btns = list
      .map(([id, t], i) => `<button type="button" class="tab-btn${i === 0 ? " active" : ""}" data-tab="${groupId}-${id}">${t}</button>`)
      .join("");
    const panels = list
      .map(([id, , html], i) => `<div class="tab-panel${i === 0 ? " active" : ""}" id="tab-${groupId}-${id}">${html}</div>`)
      .join("");
    return `<div class="tabs" role="tablist">${btns}</div>${panels}`;
  }

  function bindTabs(root) {
    root.querySelectorAll(".tabs").forEach((bar) => {
      bar.addEventListener("click", (e) => {
        const btn = e.target.closest(".tab-btn");
        if (!btn) return;
        const name = btn.dataset.tab;
        bar.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
        const prefix = name.split("-")[0];
        root.querySelectorAll(`.tab-panel[id^="tab-${prefix}-"]`).forEach((p) =>
          p.classList.toggle("active", p.id === `tab-${name}`)
        );
      });
    });
  }

  /** Lê valor numérico de um input dentro de root. */
  function val(root, id) {
    const el = root.querySelector(`#${id}`);
    return el ? parseNum(el.value) : NaN;
  }

  function sel(root, id) {
    const el = root.querySelector(`#${id}`);
    return el ? el.value : "";
  }

  function setText(root, id, text) {
    const el = root.querySelector(`#${id}`);
    if (el) el.textContent = text;
  }

  function setHTML(root, id, html) {
    const el = root.querySelector(`#${id}`);
    if (el) el.innerHTML = html;
  }

  /** Mostra/esconde um aviso. level: "warn" | "danger" | "ok" | "info" */
  function alertBox(root, id, html, level = "warn") {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    if (!html) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.className = `alert alert-${level}`;
    el.innerHTML = html;
  }

  /**
   * Liga recálculo automático a qualquer alteração dentro de root
   * e corre uma primeira vez.
   */
  function live(root, fn) {
    root.addEventListener("input", fn);
    root.addEventListener("change", fn);
    fn();
  }

  UCI.ui = { esc, numField, selectField, results, tabs, bindTabs, val, sel, setText, setHTML, alertBox, live };
})(typeof window !== "undefined" ? window : globalThis);
