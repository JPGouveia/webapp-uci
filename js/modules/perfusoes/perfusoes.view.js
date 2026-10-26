/* Módulo Perfusões — interface
 * @author: João Gouveia
 */
(function () {
  "use strict";

  const { numField, selectField, tabs, val, sel, setText, setHTML, alertBox, esc } = UCI.ui;
  const { fmt, fmtSmart, parseNum } = UCI.num;
  const P = UCI.calc.perfusoes;
  const { DRUGS, GRUPOS, byId } = UCI.data.drugs;

  UCI.state = UCI.state || {}; // estado em memória (não persiste; sem dados de doentes guardados)

  const AMOUNT_LABEL = { mg: "mg", mcg: "µg", U: "U" };
  const concUnit = (u) => `${AMOUNT_LABEL[u] || u}/cc`;
  /** Concentração legível: mg/cc < 0,1 passa a µg/cc (ex. isoprenalina 20 µg/cc). */
  const concText = (conc, u) =>
    u === "mg" && conc > 0 && conc < 0.1 ? `${fmtSmart(conc * 1000)} µg/cc` : `${fmtSmart(conc)} ${concUnit(u)}`;

  function compatibleUnits(drugUnit) {
    const base = drugUnit === "U" ? ["U", "mU"] : ["mcg", "mg"];
    return P.DOSE_UNITS.filter((u) => base.includes(u.split("/")[0]));
  }

  function drugOptions(selected) {
    const groups = GRUPOS.map((g) => {
      const opts = DRUGS.filter((d) => d.grupo === g && d.calculadora !== false)
        .map((d) => `<option value="${d.id}"${d.id === selected ? " selected" : ""}>${d.nome}</option>`)
        .join("");
      return `<optgroup label="${g}">${opts}</optgroup>`;
    }).join("");
    return `${groups}<optgroup label="Outro"><option value="custom"${selected === "custom" ? " selected" : ""}>Outro fármaco (personalizado)</option></optgroup>`;
  }

  function validadoBadge(d) {
    if (!d) return "";
    return d.validado ? "" : `<span class="badge badge-warn">diluição por validar</span>`;
  }

  /* ======================= Calculadora ======================= */
  function renderCalc(el) {
    const saved = UCI.state.drugId;
    const initial = saved === "custom" || (byId(saved) && byId(saved).calculadora !== false) ? saved : "noradrenalina";
    el.innerHTML = `
      <h2>Calculadora de perfusões</h2>
      <p class="section-description">Dose ↔ ritmo (cc/h).</p>

      <div class="grid-2">
        <div class="card">
          <h3>Fármaco e diluição</h3>
          <label class="field" for="pDrug">
            <span class="field-label">Fármaco</span>
            <select id="pDrug">${drugOptions(initial)}</select>
          </label>
          <div id="pBadge" style="margin:-2px 0 10px"></div>
          ${numField("pWeight", "Peso", { unit: "kg", value: UCI.state.weight ?? "", placeholder: "kg" })}
          <div class="fields-2">
            ${numField("pAmount", "Quantidade", { unit: "" })}
            ${numField("pVolume", "Volume final", { unit: "cc" })}
          </div>
          <div class="fields-2">
            ${selectField("pDrugUnit", "Unidade do fármaco", [["mg", "mg"], ["mcg", "µg"], ["U", "U"]], { placeholder: null })}
            <label class="field" for="pDoseUnit">
              <span class="field-label">Unidade da dose</span>
              <select id="pDoseUnit"></select>
            </label>
          </div>
          <ul class="results-list">
            <li><span>Concentração</span><strong id="pConc">–</strong></li>
            <li><span>Diluente</span><strong id="pDiluent">–</strong></li>
            <li><span>Bólus / indução</span><strong id="pBolus">–</strong></li>
          </ul>
        </div>

        <div class="card">
          <h3>Cálculo</h3>
          <div class="fields-2">
            ${numField("pDose", "Dose", { unit: "" })}
            ${numField("pRate", "Ritmo", { unit: "cc/h" })}
          </div>
          <div class="big-result"><span class="value" id="pBig">–</span><span class="unit" id="pBigUnit"></span></div>
          <ul class="results-list" id="pAlt"></ul>
          <div id="pRange" class="alert" hidden></div>
          <p class="hint" id="pRef"></p>
          <ul class="notes" id="pNotes"></ul>
        </div>
      </div>

      <div class="card">
        <h3>Tabela rápida <span class="muted" id="pTableTitle" style="font-weight:400;font-size:0.9rem"></span></h3>
        <div class="table-wrapper"><table>
          <thead><tr><th>Dose</th><th class="num">Ritmo (cc/h)</th><th class="num" id="pTableAltHead"></th></tr></thead>
          <tbody id="pTable"></tbody>
        </table></div>
        <p class="hint" id="pTableHint"></p>
      </div>`;

    const $ = (id) => el.querySelector(`#${id}`);
    let last = "dose"; // último campo editado (dose ou ritmo)

    function currentDrug() {
      const id = sel(el, "pDrug");
      return id === "custom" ? null : byId(id);
    }

    function fillDoseUnits(drugUnit, selected) {
      const units = compatibleUnits(drugUnit);
      const pick = units.includes(selected) ? selected : units[0];
      $("pDoseUnit").innerHTML = units.map((u) => `<option value="${u}"${u === pick ? " selected" : ""}>${P.unitLabel(u)}</option>`).join("");
    }

    function loadDrug() {
      const d = currentDrug();
      UCI.state.drugId = sel(el, "pDrug");
      if (d) {
        $("pAmount").value = String(d.quantidade).replace(".", ",");
        $("pVolume").value = d.volume;
        $("pDrugUnit").value = d.unidade;
        fillDoseUnits(d.unidade, d.doseUnit);
        $("pDose").value = "";
        $("pRate").value = "";
        $("pDrugUnit").disabled = true;
      } else {
        $("pDrugUnit").disabled = false;
        fillDoseUnits(sel(el, "pDrugUnit"), sel(el, "pDoseUnit"));
      }
      setHTML(el, "pBadge", validadoBadge(d));
      last = "dose";
    }

    function update() {
      const d = currentDrug();
      const w = val(el, "pWeight");
      if (Number.isFinite(w)) UCI.state.weight = w;
      const amount = val(el, "pAmount");
      const volume = val(el, "pVolume");
      const drugUnit = sel(el, "pDrugUnit");
      const doseUnit = sel(el, "pDoseUnit");
      const conc = amount > 0 && volume > 0 ? amount / volume : NaN;
      const perKg = doseUnit.includes("/kg/");
      const uLabel = P.unitLabel(doseUnit);

      el.querySelector('label[for="pAmount"] .field-label').textContent = `Quantidade (${AMOUNT_LABEL[drugUnit]})`;
      el.querySelector('label[for="pDose"] .unit').textContent = uLabel;
      setText(el, "pConc", Number.isFinite(conc) ? concText(conc, drugUnit) : "–");
      setText(el, "pDiluent", d ? d.diluente : "—");

      let dose = val(el, "pDose");
      let rate = val(el, "pRate");
      const needW = perKg && !(w > 0);

      if (last === "dose") {
        rate = P.doseToRate(dose, doseUnit, conc, drugUnit, w);
        $("pRate").value = Number.isFinite(rate) ? fmtSmart(rate).replace(/ /g, "") : "";
      } else {
        dose = P.rateToDose(rate, doseUnit, conc, drugUnit, w);
        $("pDose").value = Number.isFinite(dose) ? fmtSmart(dose).replace(/ /g, "") : "";
      }

      // Resultado principal = o valor calculado
      if (last === "dose") {
        setText(el, "pBig", Number.isFinite(rate) ? fmt(rate, rate < 10 ? 2 : 1) : "–");
        setText(el, "pBigUnit", "cc/h");
      } else {
        setText(el, "pBig", Number.isFinite(dose) ? fmtSmart(dose) : "–");
        setText(el, "pBigUnit", uLabel);
      }

      // Conversões
      const alts = [];
      const altList = d && d.altUnits ? d.altUnits : [];
      const defaults = drugUnit === "U" ? ["U/h", "U/kg/h"] : ["mcg/kg/min", "mcg/min", "mg/h"];
      const units = [...new Set(altList.length ? altList : defaults)].filter((u) => u !== doseUnit && compatibleUnits(drugUnit).includes(u));
      for (const u of units.slice(0, 3)) {
        const v = P.convertDose(dose, doseUnit, u, w);
        if (Number.isFinite(v)) alts.push(`<li><span>Equivale a</span><strong>${fmtSmart(v)} ${P.unitLabel(u)}</strong></li>`);
      }
      setHTML(el, "pAlt", alts.join(""));

      // Intervalo de referência
      if (needW) {
        alertBox(el, "pRange", "Introduzir o peso (dose expressa por kg).", "info");
      } else if (d && d.doseUnit === doseUnit && Number.isFinite(dose)) {
        const st = P.rangeStatus(dose, d);
        const ref = `${fmtSmart(d.dose[0])}–${fmtSmart(d.dose[1])} ${uLabel}`;
        const msg = {
          ok: [`Dentro do intervalo de referência (${ref}).`, "ok"],
          low: [`Abaixo do intervalo de referência (${ref}).`, "info"],
          high: [`Acima do intervalo de referência (${ref}). Confirmar.`, "warn"],
          danger: [`Dose muito elevada (> ${fmtSmart(d.alertaAcima)} ${uLabel}). Confirmar prescrição.`, "danger"],
        }[st];
        alertBox(el, "pRange", msg[0], msg[1]);
      } else {
        alertBox(el, "pRange", "");
      }

      setText(el, "pRef", d ? `Intervalo de referência: ${fmtSmart(d.dose[0])}–${fmtSmart(d.dose[1])} ${P.unitLabel(d.doseUnit)}.` : "");
      setText(el, "pBolus", d && d.bolus ? d.bolus : "–");
      setHTML(el, "pNotes", d ? d.notas.map((n) => `<li>${esc(n)}</li>`).join("") : "");

      // Tabela rápida
      const tableDoses = d && d.doseUnit === doseUnit ? d.tabela : null;
      setText(el, "pTableTitle", d ? `· ${d.nome}${perKg && w > 0 ? ` · ${fmt(w, 0)} kg` : ""}` : "");
      const altU = perKg ? doseUnit.replace("/kg", "") : null;
      setText(el, "pTableAltHead", altU ? P.unitLabel(altU) : "");
      if (!tableDoses) {
        setHTML(el, "pTable", `<tr><td colspan="3" class="muted">Disponível para os fármacos da biblioteca, na unidade de dose habitual.</td></tr>`);
        setText(el, "pTableHint", "");
      } else if (needW) {
        setHTML(el, "pTable", `<tr><td colspan="3" class="muted">Introduzir o peso.</td></tr>`);
        setText(el, "pTableHint", "");
      } else {
        const closest = Number.isFinite(dose) ? tableDoses.reduce((a, b) => (Math.abs(b - dose) < Math.abs(a - dose) ? b : a)) : null;
        setHTML(
          el,
          "pTable",
          tableDoses
            .map((x) => {
              const r = P.doseToRate(x, doseUnit, conc, drugUnit, w);
              const alt = altU ? P.convertDose(x, doseUnit, altU, w) : NaN;
              return `<tr class="${x === closest ? "row-active" : ""}"><td>${fmtSmart(x)} ${uLabel}</td><td class="num">${fmt(r, r < 10 ? 2 : 1)}</td><td class="num">${altU ? fmtSmart(alt) : ""}</td></tr>`;
            })
            .join("")
        );
        setText(el, "pTableHint", `Concentração ${concText(conc, drugUnit)} (${fmtSmart(amount)} ${AMOUNT_LABEL[drugUnit]} em ${fmt(volume, 0)} cc).`);
      }
    }

    el.addEventListener("input", (e) => {
      if (e.target.id === "pDose") last = "dose";
      else if (e.target.id === "pRate") last = "rate";
      update();
    });
    el.addEventListener("change", (e) => {
      if (e.target.id === "pDrug") loadDrug();
      if (e.target.id === "pDrugUnit") fillDoseUnits(sel(el, "pDrugUnit"), sel(el, "pDoseUnit"));
      update();
    });

    loadDrug();
    update();
  }

  /* ======================= Biblioteca de diluições ======================= */
  function renderLibrary(el) {
    const rows = GRUPOS.map((g) => {
      const ds = DRUGS.filter((d) => d.grupo === g);
      return `
        <tr class="group-row"><th colspan="5">${g}</th></tr>
        ${ds
          .map((d) => {
            const conc = d.quantidade / d.volume;
            return `<tr class="drug-row">
              <td class="c-name"><a href="${d.calculadora === false ? `#/perfusoes/${d.id}` : "#/perfusoes/calculadora"}" data-drug="${d.id}">${d.nome}</a></td>
              <td class="c-dil">${fmtSmart(d.quantidade)} ${AMOUNT_LABEL[d.unidade]} / ${d.volume} cc <span class="muted">(${esc(d.diluente)})</span></td>
              <td class="num c-conc">${concText(conc, d.unidade)}</td>
              <td class="c-dose"><span class="lib-label">Dose de referência: </span>${fmtSmart(d.dose[0])}–${fmtSmart(d.dose[1])} ${P.unitLabel(d.doseUnit)}${d.bolus ? `<br><small class="muted">Bólus: ${esc(d.bolus)}</small>` : ""}</td>
              <td class="c-badge">${validadoBadge(d)}</td>
            </tr>`;
          })
          .join("")}`;
    }).join("");

    el.innerHTML = `
      <h2>Diluições padrão</h2>
      <p class="section-description">Biblioteca de perfusões contínuas (adulto). Toque num fármaco para abrir a calculadora.</p>
      ${DRUGS.some((d) => !d.validado)
        ? `<div class="alert alert-warn">As diluições marcadas <strong>por validar</strong> têm de ser confirmadas com as diluições em uso no serviço (ficheiro <code>js/modules/perfusoes/drugs.js</code>).</div>`
        : ""}
      <div class="card" style="margin-top:14px">
        <div class="table-wrapper"><table class="lib-table">
          <thead><tr><th>Fármaco</th><th>Diluição</th><th class="num">Concentração</th><th>Dose de referência</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;

    el.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-drug]");
      if (a) UCI.state.drugId = a.dataset.drug;
    });
  }

  /* ======================= Heparina ======================= */
  function heparinWeightTableHTML(prefix) {
    return P.HEPARIN_WEIGHT_TABLE.map(
      (r, i) => `<tr data-i="${i}">
        <td>${r.label}</td>
        <td class="num">${r.bolusUkg === "intensidade" ? "80 ou 40 U/kg*" : "—"}</td>
        <td class="num">${r.stopMin ? `${r.stopMin} min` : "—"}</td>
        <td class="num">${r.deltaUkgH > 0 ? "+" : ""}${r.deltaUkgH === 0 ? "0" : fmt(r.deltaUkgH, 0)} U/kg/h</td>
        <td>${r.repeat}</td>
      </tr>`
    ).join("");
  }

  function renderHeparin(el) {
    el.innerHTML = `
      <h2>Heparina não fracionada</h2>
      <p class="section-description">Objetivo: <strong>aPTT 51–70 s</strong>.</p>

      <div class="card">
        <h3>Doente e seringa</h3>
        <div class="fields-2">
          ${numField("hW", "Peso", { unit: "kg", value: UCI.state.weight != null && Number.isFinite(UCI.state.weight) ? String(UCI.state.weight).replace(".", ",") : "" })}
          ${selectField("hHigh", "Alta intensidade? (TVP, TEP, trombo intracardíaco)", [["sim", "Sim"], ["nao", "Não"]])}
          ${numField("hU", "Heparina na seringa", { unit: "U", value: "25000" })}
          ${numField("hVol", "Volume da seringa", { unit: "cc", value: "50" })}
        </div>
        <ul class="results-list"><li><span>Concentração</span><strong id="hConc">–</strong></li></ul>
      </div>

      <div style="margin-top:18px">
      ${tabs("hep", [
        ["inicio", "Início", `
          <div class="card">
            <h3>Dose inicial</h3>
            <ul class="results-list">
              <li><span>Bólus 80 U/kg</span><strong id="hiBolus">–</strong></li>
              <li><span>Perfusão 18 U/kg/h</span><strong id="hiRate">–</strong></li>
              <li><span>Próximo aPTT</span><strong>6 h após o início</strong></li>
            </ul>
          </div>`],
        ["ajuste", "Ajuste por aPTT", `
          <div class="grid-2">
            <div class="card">
              <h3>Dados</h3>
              ${numField("haRate", "Perfusão atual", { unit: "cc/h" })}
              ${numField("haAptt", "aPTT", { unit: "s" })}
              <label class="checkbox"><input type="checkbox" id="haBleed" /> Hemorragia</label>
            </div>
            <div class="card">
              <h3>Recomendação</h3>
              <ul class="results-list">
                <li><span>Linha</span><strong id="haRow">–</strong></li>
                <li><span>Bólus</span><strong id="haBolus">–</strong></li>
                <li><span>Parar a perfusão</span><strong id="haStop">–</strong></li>
                <li><span>Dose</span><strong id="haDose">–</strong></li>
                <li><span>Programar a</span><strong id="haNew">–</strong></li>
                <li><span>Próximo aPTT</span><strong id="haRepeat">–</strong></li>
              </ul>
              <div id="haAlert" class="alert" hidden></div>
            </div>
          </div>
          <div class="card">
            <h3>Esquema de ajuste</h3>
            <div class="table-wrapper"><table>
              <thead><tr><th>aPTT (s)</th><th class="num">Bólus</th><th class="num">Parar</th><th class="num">Alteração</th><th>Próximo aPTT</th></tr></thead>
              <tbody id="haTable">${heparinWeightTableHTML()}</tbody>
            </table></div>
            <ul class="notes">
              <li>* Bólus de 80 U/kg se alta intensidade (TVP, TEP, trombo intracardíaco); 40 U/kg nos restantes casos.</li>
            </ul>
          </div>`],
      ])}
      </div>`;

    const $ = (id) => el.querySelector(`#${id}`);
    const fill = (ids, v) => ids.forEach((id) => setText(el, id, v));

    function update() {
      const w = val(el, "hW");
      if (Number.isFinite(w) && w > 0) UCI.state.weight = w;
      const conc = val(el, "hU") / val(el, "hVol");
      const high = sel(el, "hHigh") === "sim" ? true : sel(el, "hHigh") === "nao" ? false : null;
      setText(el, "hConc", Number.isFinite(conc) && conc > 0 ? `${fmt(conc, 0)} U/cc` : "–");

      /* Início */
      const ini = P.heparinInitial(w, conc);
      setText(el, "hiBolus", ini ? `${fmt(ini.bolusU, 0)} U (${fmtSmart(ini.bolusMl)} cc a ${fmt(conc, 0)} U/cc)` : "introduzir peso");
      setText(el, "hiRate", ini ? `${fmt(ini.rateMlH, 1)} cc/h (${fmt(ini.uH, 0)} U/h)` : "–");

      /* Ajuste por peso */
      const a = P.heparinWeightAdjust(val(el, "haAptt"), { weight: w, currentMlH: val(el, "haRate"), conc, highIntensity: high, bleeding: $("haBleed").checked });
      el.querySelectorAll("#haTable tr").forEach((tr) => tr.classList.toggle("row-active", !!a && Number(tr.dataset.i) === a.row.index));
      if (!a) {
        fill(["haRow", "haBolus", "haStop", "haDose", "haNew", "haRepeat"], "–");
        alertBox(el, "haAlert", $("haBleed").checked ? "Hemorragia: suspender a perfusão e reavaliar (decisão médica)." : "", "danger");
      } else if (a.bleeding) {
        setText(el, "haRow", a.row.label);
        fill(["haBolus", "haStop", "haDose", "haNew"], "—");
        setText(el, "haRepeat", "após reavaliação");
        alertBox(el, "haAlert", a.notes.join("<br>"), "danger");
      } else {
        setText(el, "haRow", a.row.label);
        setText(el, "haBolus", a.row.bolusUkg === "intensidade" ? (Number.isFinite(a.bolusU) ? `${fmt(a.bolusU, 0)} U (${fmtSmart(a.bolusMl)} cc) — ${a.bolusUkg} U/kg` : Number.isFinite(a.bolusUkg) ? "introduzir peso" : "definir intensidade") : "Não");
        setText(el, "haStop", a.stopMin ? `${a.stopMin} min` : "Não");
        setText(el, "haDose", Number.isFinite(a.doseAtual) ? `${fmt(a.doseAtual, 1)} → ${fmt(a.doseNova, 1)} U/kg/h` : `${a.deltaUkgH > 0 ? "+" : ""}${fmt(a.deltaUkgH, 0)} U/kg/h`);
        setText(el, "haNew", Number.isFinite(a.newMlH) ? `${fmt(a.newMlH, 1)} cc/h (${fmt(a.newUH, 0)} U/h)` : !(w > 0) ? "introduzir peso" : "introduzir ritmo atual");
        setText(el, "haRepeat", a.repeat);
        const level = a.notes.length ? "warn" : a.row.index === 2 ? "ok" : a.stopMin ? "warn" : "info";
        alertBox(el, "haAlert", [a.action, ...a.notes].join("<br>"), level);
      }

    }
    UCI.ui.live(el, update);
  }

  /* ======================= Soluções salinas hipertónicas ======================= */
  function renderSaline(el) {
    el.innerHTML = `
      <h2>Soluções salinas hipertónicas</h2>
      <p class="section-description">Preparação de uma solução de NaCl com a concentração pretendida a partir das soluções disponíveis.</p>
      <div class="grid-2">
        <div class="card">
          <h3>Solução pretendida</h3>
          <div class="fields-2">
            ${numField("sVol", "Volume final", { unit: "cc", value: "500" })}
            ${numField("sTarget", "NaCl pretendido", { unit: "%", value: "3" })}
          </div>
          <h4>Soluções disponíveis</h4>
          <div class="fields-2">
            ${numField("sLow", "Menos concentrada (NaCl)", { unit: "%", value: "0,9" })}
            ${numField("sHigh", "Mais concentrada (NaCl)", { unit: "%", value: "20" })}
          </div>
          ${numField("sAmp", "Volume de cada ampola da solução mais concentrada", { unit: "cc", value: "20" })}
          <p class="hint">Atalhos: <a href="#" data-pct="3">3%</a> · <a href="#" data-pct="5">5%</a> · <a href="#" data-pct="7.5">7,5%</a> · <a href="#" data-pct="10">10%</a></p>
        </div>
        <div class="card">
          <h3>Preparação</h3>
          <div id="sHow" class="alert alert-info">–</div>
          <ul class="results-list">
            <li><span id="sLowLabel">NaCl 0,9%</span><strong id="sLowVol">–</strong></li>
            <li><span id="sHighLabel">NaCl 20%</span><strong id="sHighVol">–</strong></li>
            <li><span>Equivale a</span><strong id="sAmps">–</strong></li>
            <li><span>Concentração final (volumes arredondados)</span><strong id="sReal">–</strong></li>
            <li><span>Na⁺ (= Cl⁻)</span><strong id="sMmol">–</strong></li>
            <li><span>Na⁺ total na solução</span><strong id="sTotal">–</strong></li>
            <li><span>Osmolaridade teórica</span><strong id="sOsm">–</strong></li>
          </ul>
          <div id="sAlert" class="alert" hidden></div>
          <p class="formula">Volume da solução mais concentrada = V<sub>final</sub> × (% pretendida − % menor) / (% maior − % menor)</p>
        </div>
      </div>`;

    el.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-pct]");
      if (!a) return;
      e.preventDefault();
      el.querySelector("#sTarget").value = a.dataset.pct.replace(".", ",");
      el.querySelector("#sTarget").dispatchEvent(new Event("input", { bubbles: true }));
    });

    UCI.ui.live(el, () => {
      const vol = val(el, "sVol"), target = val(el, "sTarget"), low = val(el, "sLow"), high = val(el, "sHigh"), amp = val(el, "sAmp");
      const pct = (x) => `${fmtSmart(x)}%`;
      setText(el, "sLowLabel", Number.isFinite(low) ? `NaCl ${pct(low)}` : "Solução menos concentrada");
      setText(el, "sHighLabel", Number.isFinite(high) ? `NaCl ${pct(high)}` : "Solução mais concentrada");
      const r = P.saltMix(vol, target, low, high);
      if (!r) {
        ["sLowVol", "sHighVol", "sAmps", "sReal", "sMmol", "sTotal", "sOsm"].forEach((id) => setText(el, id, "–"));
        el.querySelector("#sHow").innerHTML = "Introduzir o volume final e uma concentração entre as das duas soluções disponíveis.";
        alertBox(el, "sAlert", "");
        return;
      }
      el.querySelector("#sHow").innerHTML =
        `Num saco de <strong>${fmt(r.lowR + r.highR, 0)} cc de NaCl ${pct(low)}</strong>, retirar <strong>${fmt(r.highR, 0)} cc</strong> e adicionar <strong>${fmt(r.highR, 0)} cc de NaCl ${pct(high)}</strong>.<br>` +
        `Em alternativa: misturar ${fmt(r.lowR, 0)} cc de NaCl ${pct(low)} com ${fmt(r.highR, 0)} cc de NaCl ${pct(high)}.`;
      setText(el, "sLowVol", `${fmt(r.lowR, 0)} cc`);
      setText(el, "sHighVol", `${fmt(r.highR, 0)} cc`);
      const a = P.ampoules(r.highR, amp);
      setText(el, "sAmps", a ? `${a.full} ampola${a.full === 1 ? "" : "s"} de ${fmt(amp, 0)} cc${a.rest ? ` + ${a.rest} cc` : ""}` : "–");
      setText(el, "sReal", `${fmt(r.realPct, 2)}%`);
      setText(el, "sMmol", `${fmt(r.mmolL, 0)} mmol/L`);
      setText(el, "sTotal", `${fmt(r.naMmol, 0)} mmol`);
      setText(el, "sOsm", `${fmt(r.mOsm, 0)} mOsm/L`);
      alertBox(el, "sAlert", target > 3 ? "Concentrações acima de 3%: administrar por via central." : "", "warn");
    });
  }

  /* ======================= Vancomicina ======================= */
  function renderVanco(el) {
    const clsOpts = P.VANCO_CLASSES.map((c) => [c.id, c.label]);
    const initRows = P.VANCO_CLASSES.map(
      (c, i) => `<tr data-i="${i}"><td>${c.label}</td><td class="num">${fmt(c.mgDay / 1000, c.mgDay % 1000 ? 1 : 0)} g/dia</td><td class="num">${fmt(P.vancoRate(c.mgDay), 1)} cc/h</td></tr>`
    ).join("");
    const adjRows = P.VANCO_LEVELS.map(
      (r, i) => `<tr data-i="${i}"><td>${r.label}</td><td>${
        r.deltaMgDay === null ? "Parar 6 h e repetir doseamento"
        : r.deltaMgDay === 0 ? "Manter a dose"
        : r.deltaMgDay === -500 ? "Diminuir 500 mg/dia (−2,1 cc/h); se 500 mg/dia → 250 mg/dia; se 250 mg/dia → parar 6 h e repetir"
        : `Aumentar ${r.deltaMgDay} mg/dia (+${fmt(r.deltaMgDay / 24 / P.VANCO_MG_ML, 1)} cc/h)`
      }</td><td>${r.recheck}</td></tr>`
    ).join("");

    el.innerHTML = `
      <h2>Vancomicina em perfusão contínua</h2>
      <p class="section-description">500 mg/50 cc (SF ou Dx5%). Objetivo: <strong>20–25 µg/mL</strong>.</p>

      <div class="card">
        <h3>Doente</h3>
        <div class="fields-2">
          ${numField("vW", "Peso", { unit: "kg", value: UCI.state.weight != null && Number.isFinite(UCI.state.weight) ? String(UCI.state.weight).replace(".", ",") : "" })}
          ${selectField("vCls", "Depuração de creatinina", clsOpts)}
        </div>
        <h4>Cockcroft-Gault (opcional)</h4>
        <div class="fields-2">
          ${numField("vAge", "Idade", { unit: "anos" })}
          ${numField("vCr", "Creatinina", { unit: "mg/dL" })}
          ${selectField("vSex", "Sexo", [["m", "Masculino"], ["f", "Feminino"]], { placeholder: null })}
        </div>
        <ul class="results-list"><li><span>Depuração estimada</span><strong id="vCrCl">–</strong></li></ul>
      </div>

      <div style="margin-top:18px">
      ${tabs("vanco", [
        ["inicio", "Início", `
          <div class="card">
            <h3>Prescrição inicial</h3>
            <ul class="results-list">
              <li><span>Dose de carga (em 1 h)</span><strong id="viLoad">–</strong></li>
              <li><span>Perfusão contínua</span><strong id="viDose">–</strong></li>
              <li><span>Programar a</span><strong id="viRate">–</strong></li>
              <li><span>Doseamento</span><strong>12 h após o início da perfusão</strong></li>
            </ul>
            <div class="table-wrapper" style="margin-top:12px"><table>
              <thead><tr><th>Depuração de creatinina</th><th class="num">Dose diária</th><th class="num">Débito</th></tr></thead>
              <tbody id="viTable">${initRows}</tbody>
            </table></div>
          </div>`],
        ["ajuste", "Ajuste por níveis", `
          <div class="grid-2">
            <div class="card">
              <h3>Dados</h3>
              ${numField("vaLevel", "Nível sérico", { unit: "µg/mL" })}
              ${numField("vaRate", "Perfusão atual", { unit: "cc/h" })}
            </div>
            <div class="card">
              <h3>Recomendação</h3>
              <ul class="results-list">
                <li><span>Nível</span><strong id="vaRow">–</strong></li>
                <li><span>Dose</span><strong id="vaDose">–</strong></li>
                <li><span>Programar a</span><strong id="vaNew">–</strong></li>
                <li><span>Novo doseamento</span><strong id="vaRecheck">–</strong></li>
              </ul>
              <div id="vaAlert" class="alert" hidden></div>
            </div>
          </div>
          <div class="card">
            <div class="table-wrapper"><table>
              <thead><tr><th>Nível (µg/mL)</th><th>Acerto de dose</th><th>Novo doseamento</th></tr></thead>
              <tbody id="vaTable">${adjRows}</tbody>
            </table></div>
          </div>`],
      ])}
      </div>`;

    UCI.ui.live(el, () => {
      const w = val(el, "vW");
      if (Number.isFinite(w) && w > 0) UCI.state.weight = w;

      // Função renal: escolha manual tem prioridade; senão, Cockcroft-Gault
      const crcl = P.cockcroftGault(val(el, "vAge"), w, val(el, "vCr"), sel(el, "vSex") === "f");
      const cgCls = P.vancoClass(crcl);
      setText(el, "vCrCl", Number.isFinite(crcl) ? `${fmt(crcl, 0)} mL/min` : "–");
      const clsId = sel(el, "vCls") || cgCls;

      const ini = P.vancoInitial(w, clsId);
      setText(el, "viLoad", Number.isFinite(ini.loadMg) ? `${fmt(ini.loadMg / 1000, ini.loadMg % 1000 ? 1 : 0)} g` : "introduzir peso");
      setText(el, "viDose", ini.cls ? `${fmt(ini.mgDay, 0)} mg/dia (${ini.cls.label})` : "definir a depuração de creatinina");
      setText(el, "viRate", ini.cls ? `${fmt(ini.rateCcH, 1)} cc/h` : "–");
      const iIdx = ini.cls ? P.VANCO_CLASSES.indexOf(ini.cls) : -1;
      el.querySelectorAll("#viTable tr").forEach((tr) => tr.classList.toggle("row-active", Number(tr.dataset.i) === iIdx));

      const a = P.vancoAdjust(val(el, "vaLevel"), val(el, "vaRate"));
      el.querySelectorAll("#vaTable tr").forEach((tr) => tr.classList.toggle("row-active", !!a && Number(tr.dataset.i) === a.row.index));
      if (!a) {
        ["vaRow", "vaDose", "vaNew", "vaRecheck"].forEach((id) => setText(el, id, "–"));
        alertBox(el, "vaAlert", "");
        return;
      }
      setText(el, "vaRow", `${a.row.label} µg/mL`);
      setText(el, "vaDose", Number.isFinite(a.newMgDay) && a.newMgDay !== a.currentMgDay ? `${fmt(a.currentMgDay, 0)} → ${fmt(a.newMgDay, 0)} mg/dia` : Number.isFinite(a.currentMgDay) ? `${fmt(a.currentMgDay, 0)} mg/dia` : "–");
      setText(el, "vaNew", a.stopH ? `parar ${a.stopH} h` : Number.isFinite(a.newCcH) ? `${fmt(a.newCcH, 1)} cc/h` : "introduzir perfusão atual");
      setText(el, "vaRecheck", a.recheck);
      alertBox(el, "vaAlert", a.action, a.stopH ? "danger" : a.row.deltaMgDay === 0 ? "ok" : "warn");
    });
  }

  UCI.registerModule({
    id: "perfusoes",
    title: "Perfusões",
    short: "Perfusões",
    icon: "💉",
    description: "Calculadora, diluições, heparina, vancomicina e NaCl hipertónico.",
    groups: [
      {
        title: "",
        sections: [
          { id: "calculadora", title: "Calculadora", render: renderCalc },
          { id: "diluicoes", title: "Diluições padrão", render: renderLibrary },
          { id: "heparina", title: "Heparina (HNF)", render: renderHeparin },
          { id: "vancomicina", title: "Vancomicina", render: renderVanco },
          { id: "salina", title: "Soluções salinas hipertónicas", render: renderSaline },
        ],
      },
    ],
  });
})();
