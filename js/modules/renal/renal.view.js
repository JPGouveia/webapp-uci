/* Módulo TSR (antigo RenalCalc) — interface
 * @author: João Gouveia
 */
(function () {
  "use strict";

  const { numField, selectField, results, tabs, val, sel, setText, setHTML, alertBox, live } = UCI.ui;
  const { fmt } = UCI.num;
  const R = UCI.calc.renal;
  const P = UCI.calc.perfusoes;
  const S = R.SOLUTIONS;

  UCI.state = UCI.state || {};
  const weightValue = () => (UCI.state.weight != null && Number.isFinite(UCI.state.weight) ? String(UCI.state.weight).replace(".", ",") : "");
  const keepWeight = (w) => { if (Number.isFinite(w) && w > 0) UCI.state.weight = w; };
  const dash = (v) => (v ? String(v).replace(".", ",") : "–");

  /* ======================= Composição das soluções ======================= */
  function renderSolutions(el) {
    const cols = ["prismasol4", "hemosolB0", "regiocit", "biphozyl"];
    const rows = [
      ["Na⁺ (mmol/L)", "Na"], ["K⁺ (mmol/L)", "K"], ["Cl⁻ (mmol/L)", "Cl"], ["Ca²⁺ (mmol/L)", "Ca"],
      ["Mg²⁺ (mmol/L)", "Mg"], ["HCO₃⁻ (mmol/L)", "HCO3"], ["Lactato (mmol/L)", "lactato"],
      ["Fosfato HPO₄²⁻ (mmol/L)", "fosfato"], ["Citrato (mmol/L)", "citrato"], ["Glicose (mmol/L)", "glicose"],
    ];
    el.innerHTML = `
      <h2>Composição das soluções</h2>
      <p class="section-description">Soluções de diálise e reposição para técnicas contínuas.</p>
      <div class="card">
        <div class="table-wrapper"><table>
          <thead><tr><th>Componente</th>${cols.map((c) => `<th class="num">${S[c].nome}</th>`).join("")}</tr></thead>
          <tbody>${rows.map(([t, k]) => `<tr><td>${t}</td>${cols.map((c) => `<td class="num">${dash(S[c][k])}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>
        <p class="hint">Mg²⁺ 0,5 mmol/L = 1,0 mEq/L. Glicose do Prismasol 4: 6,1 mmol/L (110 mg/dL).</p>
      </div>
      <div class="card">
        <h3>Escolha da solução</h3>
        <ul class="plain">
          <li><strong>Prismasol 4</strong>: preferível (heparina ou sem anticoagulação).</li>
          <li><strong>Hemosol B0</strong>: se hipercaliémia (sem K⁺).</li>
          <li><strong>Biphozyl</strong>: sem cálcio — técnica com citrato ou hipercalcémia; contém fosfato.</li>
          <li><strong>Regiocit</strong>: solução de citrato pré-bomba (PBS) na anticoagulação regional.</li>
        </ul>
      </div>`;
  }

  /* ======================= Dose de efluente & FF ======================= */
  function renderEffluent(el) {
    el.innerHTML = `
      <h2>Dose de efluente e fração de filtração</h2>
      <p class="section-description">Cálculo da dose dialítica entregue e da FF.</p>
      <div class="grid-2">
        <div class="card">
          <h3>Fluxos</h3>
          <div class="fields-2">
            ${numField("eP", "PBS", { unit: "cc/h", value: "0" })}
            ${numField("ePre", "Reposição pré-filtro", { unit: "cc/h", value: "1000" })}
            ${numField("eD", "Dialisante", { unit: "cc/h", value: "1000" })}
            ${numField("ePost", "Reposição pós-filtro", { unit: "cc/h", value: "500" })}
            ${numField("eUf", "Perda de fluidos (UF)", { unit: "cc/h", value: "20" })}
            ${numField("eQb", "Qb", { unit: "mL/min", value: "150" })}
          </div>
          <div class="fields-2">
            ${numField("eHct", "Hematócrito", { unit: "%", value: "35" })}
            ${numField("eW", "Peso", { unit: "kg", value: weightValue() || "70" })}
          </div>
        </div>
        <div class="card">
          <h3>Resultados</h3>
          ${results([
            ["Efluente total (cc/h)", "eTot"],
            ["Dose de efluente (mL/kg/h)", "eDose"],
            ["Dose corrigida para pré-diluição (mL/kg/h)", "eDoseC"],
            ["Fração de filtração (%)", "eFF"],
          ])}
          <div id="eAlert" class="alert" hidden></div>
          <p class="formula">Dose = (PBS + pré + dialisante + pós + UF) / peso</p>
          <p class="formula">Dose corrigida = dose × Q<sub>p</sub> / (Q<sub>p</sub> + PBS + pré), Q<sub>p</sub> = Qb × 60 × (1 − Htc)</p>
          <p class="formula">FF = (PBS + pré + pós + UF) / (Q<sub>p</sub> + PBS + pré)</p>
          <p class="hint">KDIGO: dose entregue de 20–25 mL/kg/h (prescrever ~25–30 para compensar interrupções). Manter FF &lt; 25%.</p>
          <figure class="figure"><img src="assets/img/hdfvvc.webp" alt="Esquema do circuito de HDFVVC: acesso, PBS, pré-filtro, filtro, pós-filtro, dialisante, efluente e retorno" loading="lazy" /></figure>
        </div>
      </div>`;

    live(el, () => {
      const w = val(el, "eW");
      keepWeight(w);
      const r = R.effluent({
        pbs: val(el, "eP") || 0, pre: val(el, "ePre") || 0, dial: val(el, "eD") || 0,
        post: val(el, "ePost") || 0, uf: val(el, "eUf") || 0, qb: val(el, "eQb"), hct: val(el, "eHct"), weight: w,
      });
      setText(el, "eTot", fmt(r.total, 0));
      setText(el, "eDose", fmt(r.dose, 1));
      setText(el, "eDoseC", fmt(r.doseCorr, 1));
      setText(el, "eFF", fmt(r.ff, 1));
      const msgs = [];
      if (r.ff > 25) msgs.push("FF > 25%: risco aumentado de coagulação do filtro. Considerar ↑Qb, passar reposição para pré-filtro ou ↑dialisante em vez de convecção.");
      if (r.doseCorr < 20) msgs.push("Dose corrigida &lt; 20 mL/kg/h.");
      alertBox(el, "eAlert", msgs.join("<br>"), r.ff > 25 ? "danger" : "warn");
    });
  }

  /* ======================= Anticoagulação ======================= */
  function renderAnticoag(el) {
    const yn = [["yes", "Sim"], ["no", "Não"]];
    el.innerHTML = `
      <h2>Anticoagulação na HDFVVC</h2>
      <p class="section-description">Escolha da estratégia e prescrição inicial.</p>

      <div class="card">
        <h3>Escolha da estratégia</h3>
        ${numField("aW", "Peso", { unit: "kg", value: weightValue() })}
        ${selectField("aSys", "Condição que necessite de anticoagulação sistémica?", yn)}
        ${selectField("aCit", "Contraindicação ao citrato?", yn)}
        <div class="info-box"><strong>Contraindicações relativas ao citrato</strong>
          <ul><li>Insuficiência hepática aguda ou crónica agudizada</li><li>Choque não controlado (lactato &gt; 4 mmol/L)</li><li>Falência mitocondrial (causas genéticas, tóxicas…)</li></ul>
        </div>
        ${selectField("aBleed", "Risco hemorrágico / alteração da coagulação significativa?", yn)}
        <div id="aRec" class="alert alert-info">Preencher os três campos.</div>
      </div>

      <div class="card" id="blkCit" hidden>
        <h3>HDFVVC com anticoagulação regional com citrato</h3>
        <div class="safety-box"><p><strong>Antes de iniciar:</strong> Ca²⁺ &lt; 1,0 mmol/L → cloreto de cálcio 1 g IV; Mg &lt; 1,5 mg/dL → sulfato de magnésio 1,5 g IV.</p></div>
        <div id="citPresc" style="margin-top:12px"></div>
      </div>

      <div class="card" id="blkHep" hidden>
        <h3>HDFVVC com heparina não fracionada</h3>
        ${selectField("hMode", "Objetivo da heparina", [["circuit", "Só anticoagulação do circuito"], ["systemic", "Indicação sistémica (esquema por peso do serviço)"]], { placeholder: null })}
        <div id="hepPresc"></div>
        <h4>Ajuste</h4>
        <div id="hepCircuit">
          ${numField("hApttr", "aPTTr (razão)", {})}
          <div id="hepCircRes" class="alert" hidden></div>
          <p class="hint">Alvo do circuito: aPTTr 1,5–2,0 (ajustável em <code>renal.calc.js</code>).</p>
        </div>
        <div id="hepSystemic" hidden>
          <div class="fields-2">
            ${numField("hAptt", "aPTT", { unit: "s" })}
            ${numField("hRate", "Ritmo atual", { unit: "cc/h" })}
          </div>
          ${selectField("hHigh", "Alta intensidade? (TVP, TEP, trombo intracardíaco)", [["sim", "Sim"], ["nao", "Não"]])}
          <div id="hepSysRes" class="alert" hidden></div>
          <p class="hint">Objetivo aPTT 51–70 s · seringa 25 000 U/50 mL (500 U/mL). Esquema completo em <a href="#/perfusoes/heparina">Perfusões › Heparina (HNF)</a>.</p>
        </div>
        <label class="checkbox"><input type="checkbox" id="hBleedNow" /> Hemorragia ativa</label>
        <div class="info-box"><strong>Contraindicações</strong>
          <ul><li>Hemorragia ativa</li><li>Coagulopatia significativa (INR &gt; 2,4; aPTT &gt; 60 s; plaquetas &lt; 60 000/µL)</li><li>Trombocitopenia induzida pela heparina (HIT)</li><li>Traumatismo craniano ou hemorragia intracraniana recente</li><li>Cirurgia major nas últimas 24–48 h</li></ul>
        </div>
      </div>

      <div class="card" id="blkNone" hidden>
        <h3>HDFVVC sem anticoagulação</h3>
        <div id="nonePresc"></div>
        <p class="hint">Risco hemorrágico muito elevado com contraindicação ao citrato. Privilegiar pré-diluição e Qb elevado.</p>
      </div>

      <div class="card" id="blkMon" hidden>
        <h3>Monitorização e reavaliação</h3>
        <div id="monGeneric"></div>
        <div id="monCitrate" hidden>
          ${tabs("mon", [
            ["cit", "Ajuste de citrato", `
              <p class="hint">Alvo Ca²⁺ pós-filtro: <strong>0,25–0,35 mmol/L</strong></p>
              ${numField("mCaPost", "Ca²⁺ pós-filtro", { unit: "mmol/L" })}
              ${numField("mCitDose", "Dose de citrato atual", { unit: "mmol/L", value: "3", hint: "Opcional — para calcular a nova dose." })}
              <div id="mCitRes" class="alert" hidden></div>`],
            ["ca", "Ajuste de cálcio", `
              <p class="hint">Alvo Ca²⁺ sistémico: <strong>1,0–1,3 mmol/L</strong></p>
              ${numField("mCaSys", "Ca²⁺ sistémico", { unit: "mmol/L" })}
              ${numField("mCaRate", "Compensação de cálcio atual", { unit: "% ou cc/h", hint: "Opcional — para calcular o novo valor." })}
              <div id="mCaRes" class="alert" hidden></div>`],
            ["ab", "Ácido-base", `
              <p class="hint">Avaliação ácido-base e relação Ca total / Ca²⁺ na técnica com citrato.</p>
              <div class="fields-2">
                ${numField("mCaT", "Ca total", { unit: "mg/dL" })}
                ${numField("mCaI", "Ca²⁺ sistémico", { unit: "mmol/L" })}
                ${numField("mPh", "pH", {})}
                ${numField("mHco3", "HCO₃⁻", { unit: "mmol/L" })}
              </div>
              <ul class="results-list"><li><span>Relação Ca total / Ca²⁺</span><strong id="mRatio">–</strong></li></ul>
              <div id="mAbRes" class="alert" hidden></div>`],
          ])}
        </div>
      </div>`;

    const $ = (id) => el.querySelector(`#${id}`);

    function flowsHTML(w, withPre) {
      if (!(w > 0)) return `<p class="muted">Introduzir o peso para calcular os fluxos.</p>`;
      const e1 = w * 25, e2 = w * 30;
      const r = (a, b) => `${fmt(a, 0)}–${fmt(b, 0)} cc/h`;
      return `<ul class="plain">
        <li>Qb: <strong>150–300 mL/min</strong></li>
        <li>Dose de efluente alvo: <strong>${r(e1, e2)}</strong> (25–30 mL/kg/h)</li>
        <li>Dialisante (≈ 2/3): <strong>${r((e1 * 2) / 3, (e2 * 2) / 3)}</strong></li>
        <li>${withPre ? "Reposição pré-filtro" : "Reposição pós-filtro"} (≈ 1/3): <strong>${r(e1 / 3, e2 / 3)}</strong></li>
        <li>Perda de fluidos: <strong>0–150 cc/h</strong>, conforme volémia e hemodinâmica</li>
        <li>Soluções: Prismasol 4 (preferível); Hemosol B0 se hipercaliémia; Biphozyl se hipercalcémia</li>
      </ul>`;
    }

    function update() {
      const w = val(el, "aW");
      keepWeight(w);
      const sys = sel(el, "aSys"), cit = sel(el, "aCit"), bleed = sel(el, "aBleed");
      let strategy = null, rec = "Preencher os três campos.";
      if (sys && cit && bleed) {
        if (sys === "yes") { strategy = "heparin-sys"; rec = "Heparina não fracionada (o doente necessita de anticoagulação sistémica)."; }
        else if (cit === "no") { strategy = "citrate"; rec = "Anticoagulação regional com citrato (sem contraindicação identificada)."; }
        else if (bleed === "yes") { strategy = "none"; rec = "Sem anticoagulação (citrato contraindicado e risco hemorrágico elevado)."; }
        else { strategy = "heparin"; rec = "Heparina não fracionada (citrato contraindicado, sem risco hemorrágico elevado)."; }
      }
      const recEl = $("aRec");
      recEl.className = `alert ${strategy ? "alert-ok" : "alert-info"}`;
      recEl.innerHTML = strategy ? `<strong>Recomendação:</strong> ${rec}` : rec;

      $("blkCit").hidden = strategy !== "citrate";
      $("blkHep").hidden = !(strategy === "heparin" || strategy === "heparin-sys");
      $("blkNone").hidden = strategy !== "none";
      $("blkMon").hidden = !strategy;

      // Modo da heparina acompanha a decisão (pode ser alterado manualmente)
      if (strategy && strategy !== update.lastStrategy && strategy.startsWith("heparin")) {
        $("hMode").value = strategy === "heparin-sys" ? "systemic" : "circuit";
      }
      update.lastStrategy = strategy;

      /* --- Citrato --- */
      if (strategy === "citrate") {
        const s = R.citrateSettings(w);
        if (!s) {
          setHTML(el, "citPresc", `<p class="muted">Introduzir um peso ≥ 45 kg. Fora da tabela: ajustar manualmente.</p>`);
        } else {
          setHTML(el, "citPresc", `
            <p><strong>Prescrição inicial</strong> (dose de citrato 3 mmol/L; linha da tabela: ${s.weight} kg)</p>
            <ul class="results-list">
              <li><span>Bomba de sangue (Qb)</span><strong>${s.qb} mL/min</strong></li>
              <li><span>PBS — Regiocit (citrato 18 mmol/L)</span><strong>${fmt(s.pbs, 0)} cc/h</strong></li>
              <li><span>Dialisante</span><strong>${s.dialysate} cc/h</strong></li>
              <li><span>Reposição pós-filtro</span><strong>${s.postFilter} cc/h</strong></li>
              <li><span>Compensação de cálcio inicial</span><strong>100%</strong></li>
              <li><span>Dose de efluente aproximada</span><strong>${s.effDose} mL/kg/h</strong></li>
            </ul>
            <p class="hint">PBS = dose de citrato × Qb × 60 / 18 (= Qb × 10 cc/h a 3 mmol/L). Dialisante e reposição <strong>sem cálcio</strong> (Biphozyl), com compensação de Ca²⁺ separada. A dose de efluente da tabela já está corrigida para a pré-diluição pelo PBS.</p>
            ${s.outOfRange ? `<div class="alert alert-warn">Peso &gt; 135 kg: fora da tabela; valores da última linha (130 kg). Ajustar manualmente.</div>` : ""}`);
        }
      }

      /* --- Heparina --- */
      if (strategy && strategy.startsWith("heparin")) {
        const mode = sel(el, "hMode");
        const bleedingNow = $("hBleedNow").checked;
        $("hepCircuit").hidden = mode !== "circuit";
        $("hepSystemic").hidden = mode !== "systemic";
        const doseTxt = mode === "circuit"
          ? `<ul class="plain"><li>Bólus: <strong>500–1000 U IV</strong></li><li>Perfusão: <strong>5–10 U/kg/h</strong>${w > 0 ? ` = <strong>${fmt(5 * w, 0)}–${fmt(10 * w, 0)} U/h</strong> (${fmt((5 * w) / 500, 1)}–${fmt((10 * w) / 500, 1)} cc/h a 500 U/mL)` : ""}; habitualmente ≈ 500 U/h</li></ul>`
          : (() => {
              const ini = P.heparinInitial(w);
              return ini
                ? `<ul class="plain"><li>Bólus 80 U/kg: <strong>${fmt(ini.bolusU, 0)} U</strong> (${fmt(ini.bolusMl, 1)} mL a 500 U/mL)</li><li>Perfusão 18 U/kg/h: <strong>${fmt(ini.rateMlH, 1)} cc/h</strong> (${fmt(ini.uH, 0)} U/h)</li><li>Primeiro aPTT 6 h após o início; alvo 51–70 s</li></ul>`
                : `<ul class="plain"><li>Esquema por peso: bólus 80 U/kg + 18 U/kg/h (introduzir o peso).</li></ul>`;
            })();
        setHTML(el, "hepPresc", `<p><strong>Heparina</strong></p>${doseTxt}<p><strong>Fluxos (ajustados ao peso)</strong></p>${flowsHTML(w, false)}`);

        if (bleedingNow) {
          alertBox(el, "hepCircRes", "Hemorragia: suspender a heparina; reavaliar aPTT em 4 h e a estratégia de anticoagulação.", "danger");
          alertBox(el, "hepSysRes", "Hemorragia: suspender a heparina e reavaliar (decisão médica).", "danger");
        } else if (mode === "circuit") {
          const t = R.heparinCircuitTitration(val(el, "hApttr"), w);
          if (!t) alertBox(el, "hepCircRes", "");
          else if (t.action === "keep") alertBox(el, "hepCircRes", "aPTTr no alvo (1,5–2,0): manter a dose. Reavaliar em 12 h.", "ok");
          else {
            const dir = t.action === "up" ? "aPTTr &lt; 1,5: aumentar" : "aPTTr &gt; 2,0: reduzir";
            alertBox(el, "hepCircRes", `${dir} a perfusão para ${t.uKgH} U/kg/h${Number.isFinite(t.uH) ? ` (≈ ${fmt(t.uH, 0)} U/h = ${fmt(t.uH / 500, 1)} cc/h)` : ""}. Reavaliar aPTTr em ${t.recheckH} h.`, "warn");
          }
        } else {
          const hi = sel(el, "hHigh");
          const r = P.heparinWeightAdjust(val(el, "hAptt"), { weight: w, currentMlH: val(el, "hRate"), highIntensity: hi === "sim" ? true : hi === "nao" ? false : null });
          if (!r) alertBox(el, "hepSysRes", "");
          else {
            const parts = [`aPTT ${r.row.label} s: ${r.action}`];
            if (r.row.bolusUkg === "intensidade" && Number.isFinite(r.bolusU)) parts.push(`Bólus ${r.bolusUkg} U/kg = ${fmt(r.bolusU, 0)} U (${fmt(r.bolusMl, 1)} mL).`);
            if (Number.isFinite(r.newMlH)) parts.push(`Dose ${fmt(r.doseAtual, 1)} → ${fmt(r.doseNova, 1)} U/kg/h: programar a <strong>${fmt(r.newMlH, 1)} cc/h</strong>.`);
            else parts.push(w > 0 ? "Introduzir o ritmo atual para calcular o novo ritmo." : "Introduzir o peso.");
            parts.push(`Próximo aPTT: ${r.repeat}.`);
            parts.push(...r.notes);
            alertBox(el, "hepSysRes", parts.join("<br>"), r.row.index === 2 && !r.notes.length ? "ok" : "warn");
          }
        }
      }

      /* --- Sem anticoagulação --- */
      if (strategy === "none") setHTML(el, "nonePresc", flowsHTML(w, true));

      /* --- Monitorização --- */
      $("monCitrate").hidden = strategy !== "citrate";
      const mon = {
        citrate: `<ul class="plain">
          <li>Ca²⁺ pós-filtro: aos 10 min, aos 60 min, depois 3/3 h até ao alvo e depois 6/6 h.</li>
          <li>Ca²⁺ sistémico: 1 h após o início, 3/3 h até ao alvo e depois 6/6 h.</li>
          <li>Ca total e relação CaT/Ca²⁺: 8/8 h na fase inicial e sempre que haja suspeita de acumulação; depois diário.</li>
          <li><strong>Suspeitar de acumulação de citrato</strong> se: acidose metabólica com AG elevado; necessidades crescentes de cálcio (compensação &gt; 150% é sinal de alerta); relação CaT/Ca²⁺ a subir. Se CaT/Ca²⁺ &gt; 2,5 → suspender o citrato.</li>
        </ul>`,
        heparin: `<ul class="plain">
          <li>aPTT 6 h após o início e após cada ajuste (no alvo: no dia seguinte).</li>
          <li>Hemorragia, plaquetas e Hb diariamente (excluir HIT se as plaquetas descerem).</li>
          <li>Pressões do circuito e duração do filtro.</li>
          <li>Reavaliar a necessidade de heparina pelo menos a cada 24 h.</li>
        </ul>`,
        none: `<ul class="plain">
          <li>Pressões do circuito (TMP, queda de pressão no filtro) e coágulos no filtro/linhas.</li>
          <li>Registar a duração média dos filtros.</li>
          <li>Otimizar posição do cateter e Qb para prolongar a vida do filtro.</li>
          <li>Reavaliar diariamente a possibilidade de iniciar anticoagulação.</li>
        </ul>`,
      };
      setHTML(el, "monGeneric", strategy ? mon[strategy.startsWith("heparin") ? "heparin" : strategy] : "");

      if (strategy === "citrate") updateCitrateMonitoring();
    }

    function updateCitrateMonitoring() {
      // Citrato
      const ca = val(el, "mCaPost");
      const c = R.citrateAdjust(ca);
      if (!c) alertBox(el, "mCitRes", "");
      else {
        const cur = val(el, "mCitDose");
        const txt = c.delta === 0 ? "Manter a dose de citrato." : `${c.delta > 0 ? "Aumentar" : "Diminuir"} a dose de citrato em ${fmt(Math.abs(c.delta), 1)} mmol/L.`;
        const nova = Number.isFinite(cur) && c.delta !== 0 ? ` Nova dose: ${fmt(cur + c.delta, 1)} mmol/L.` : "";
        alertBox(el, "mCitRes", txt + nova, c.delta === 0 ? "ok" : "warn");
      }
      // Cálcio
      const cai = val(el, "mCaSys");
      const k = R.calciumAdjust(cai);
      if (!k) alertBox(el, "mCaRes", "");
      else {
        let txt = k.pct === 0 ? "Manter a compensação de cálcio." : `${k.pct > 0 ? "Aumentar" : "Diminuir"} a compensação de cálcio em ${Math.abs(k.pct)}%.`;
        if (k.bolus) txt = `Administrar 1 g de cloreto de cálcio em 15 min e aumentar a compensação de cálcio em ${k.pct}%.`;
        const cur = val(el, "mCaRate");
        if (Number.isFinite(cur) && cur > 0 && k.pct !== 0) txt += ` Novo valor: ${fmt(cur * (1 + k.pct / 100), 1)} (a partir de ${fmt(cur, 1)}).`;
        alertBox(el, "mCaRes", txt, k.pct === 0 ? "ok" : k.bolus ? "danger" : "warn");
      }
      // Ácido-base
      const ratio = R.caRatio(val(el, "mCaT"), val(el, "mCaI"));
      setText(el, "mRatio", fmt(ratio, 2));
      const ab = R.citrateAcidBase({ ph: val(el, "mPh"), hco3: val(el, "mHco3"), ratio });
      alertBox(el, "mAbRes", ab.text, ab.level);
    }

    live(el, update);
  }

  /* ======================= Bicarbonato nos sacos ======================= */
  function renderHco3(el) {
    el.innerHTML = `
      <h2>Ajuste de HCO₃⁻ nas soluções</h2>
      <p class="section-description">Volume de NaHCO₃ 8,4% (1 mEq/mL) a adicionar a um saco de 5 L.</p>
      <div class="grid-2">
        <div class="card">
          <h3>Objetivo</h3>
          ${numField("bT", "HCO₃⁻ pretendido no saco", { unit: "mmol/L", value: "40" })}
          <p class="hint">Prismasol 4 / Hemosol B0: 32 mmol/L · Biphozyl: 22 mmol/L · Saco de 5 L · Frasco de NaHCO₃ 8,4%: 100 mL (1 mEq/mL).</p>
        </div>
        <div class="card">
          <h3>NaHCO₃ 8,4% a adicionar por saco</h3>
          ${results([
            ["Prismasol / Hemosol", "bP"], ["→ Na⁺ final no saco", "bPNa"],
            ["Biphozyl", "bB"], ["→ Na⁺ final no saco", "bBNa"],
          ])}
          <div class="alert alert-warn">O NaHCO₃ também aumenta o Na⁺ do saco. Nas soluções com cálcio (Prismasol/Hemosol), concentrações elevadas de HCO₃⁻ aumentam o risco de precipitação de carbonato de cálcio: adicionar imediatamente antes de usar e inspecionar o saco.</div>
          <p class="formula">V = V<sub>saco</sub> × (alvo − base) / (1000 − alvo)</p>
        </div>
      </div>`;
    live(el, () => {
      const t = val(el, "bT");
      const p = R.bagBicarbonate(t, S.prismasol4.HCO3), b = R.bagBicarbonate(t, S.biphozyl.HCO3);
      setText(el, "bP", p ? `${fmt(p.vol, 0)} mL` : "N/A");
      setText(el, "bPNa", p ? `${fmt(p.naFinal, 0)} mmol/L` : "–");
      setText(el, "bB", b ? `${fmt(b.vol, 0)} mL` : "N/A");
      setText(el, "bBNa", b ? `${fmt(b.naFinal, 0)} mmol/L` : "–");
    });
  }

  /* ======================= Hipernatrémia ======================= */
  function renderHyperNa(el) {
    const recipe = R.hypertonicRecipe();
    el.innerHTML = `
      <h2>Correção de hipernatrémia</h2>
      <p class="section-description">Na⁺ efetivo das soluções próximo do Na⁺ do doente, para correção <strong>≤ 8–10 mmol/L em 24 h</strong>.</p>
      ${numField("nPat", "Na⁺ atual do doente (opcional)", { unit: "mmol/L" })}
      <div id="nSug" class="alert alert-info" hidden></div>
      <div style="margin-top:14px">
      ${tabs("hyper", [
        ["sacos", "Ajuste dos sacos (NaCl 20%)", `
          <div class="grid-2">
            <div class="card">
              <h3>Na⁺ pretendido nos sacos</h3>
              ${numField("nBagT", "Na⁺ pretendido no saco", { unit: "mmol/L", value: "155" })}
              <p class="hint">Solução base: Na⁺ 140 mmol/L · saco de 5 L · ampola de NaCl 20%: 20 mL (3,42 mEq/mL).</p>
            </div>
            <div class="card">
              <h3>Resultado</h3>
              ${results([["NaCl 20% a adicionar por saco", "nBagV"], ["Equivale a", "nBagA"]])}
              <p class="hint">Adicionar a todos os sacos (dialisante e reposição) e rotular.</p>
            </div>
          </div>`],
        ["perf", "Perfusão de NaCl 3%", `
          <div class="grid-2">
            <div class="card">
              <h3>Perfusão de NaCl 3%</h3>
              ${numField("nPerfT", "Na⁺ efetivo pretendido", { unit: "mmol/L", value: "160" })}
              ${numField("nFlow", "Dialisante + reposição", { unit: "cc/h", value: "1500" })}
            </div>
            <div class="card">
              <h3>Resultado</h3>
              ${results([["Perfusão de NaCl 3%", "nPerfR"]])}
              <p class="hint"><strong>Preparação do NaCl 3% (513 mmol/L):</strong> saco de NaCl 0,9% 1 L → retirar <strong>${fmt(recipe, 0)} mL</strong> e adicionar <strong>${fmt(recipe, 0)} mL</strong> de NaCl 20%.</p>
              <p class="hint">Administrar no circuito (pós-filtro) ou por via sistémica.</p>
            </div>
          </div>`],
      ])}
      </div>
      <div class="safety-box">
        <p>• Monitorizar a natrémia a cada <strong>2 horas</strong>.</p>
        <p>• A perfusão externa não é contabilizada pelo monitor: <strong>aumentar a perda de fluidos</strong> no mesmo volume para manter o balanço.</p>
        <p>• Reavaliar e ajustar a prescrição pelo menos a cada <strong>24 horas</strong>.</p>
      </div>`;
    live(el, () => {
      const pat = val(el, "nPat");
      alertBox(el, "nSug", Number.isFinite(pat) && pat > 145 ? `Sugestão: Na⁺ efetivo das soluções ≈ <strong>${fmt(pat - 8, 0)} mmol/L</strong> (Na⁺ do doente − 8), para limitar a descida a ~8 mmol/L em 24 h.` : "", "info");
      const bag = R.bagNaCl20(val(el, "nBagT"));
      setText(el, "nBagV", bag ? `${fmt(bag.vol, 0)} mL` : "N/A");
      setText(el, "nBagA", bag ? `${fmt(bag.vol / 20, 1)} ampolas de 20 mL` : "–");
      const r = R.hyperNaInfusion(val(el, "nPerfT"), val(el, "nFlow"));
      setText(el, "nPerfR", Number.isFinite(r) ? `${fmt(r, 0)} cc/h` : "N/A");
    });
  }

  /* ======================= Hiponatrémia ======================= */
  function renderHypoNa(el) {
    el.innerHTML = `
      <h2>Correção de hiponatrémia</h2>
      <p class="section-description">Correção alvo <strong>≤ 10–12 mmol/L em 24 h</strong> e <strong>≤ 18 mmol/L em 48 h</strong>; <strong>≤ 8 mmol/L em 24 h</strong> se alto risco de desmielinização osmótica.</p>
      ${numField("oPat", "Na⁺ atual do doente (opcional)", { unit: "mmol/L" })}
      <div id="oSug" class="alert alert-info" hidden></div>
      <div style="margin-top:14px">
      ${tabs("hypo", [
        ["sacos", "Diluição dos sacos", `
          <div class="grid-2">
            <div class="card">
              <h3>Na⁺ pretendido nos sacos</h3>
              ${numField("oBagT", "Na⁺ pretendido no saco", { unit: "mmol/L", value: "120" })}
              ${selectField("oSol", "Solução", [["prismasol4", "Prismasol 4"], ["hemosolB0", "Hemosol B0"], ["biphozyl", "Biphozyl"]], { placeholder: null })}
              <p class="hint">Saco de 5 L · usar água para preparações injetáveis.</p>
            </div>
            <div class="card">
              <h3>Resultado</h3>
              ${results([["Opção A — água a adicionar ao saco", "oAdd"], ["Opção B — retirar e repor com água", "oRep"]])}
              <div id="oAlert" class="alert" hidden></div>
              <h4>Composição após diluição</h4>
              <ul class="results-list" id="oComp"></ul>
            </div>
          </div>`],
        ["perf", "Perfusão de Dx5%", `
          <div class="grid-2">
            <div class="card">
              <h3>Perfusão de dextrose 5%</h3>
              ${numField("oPerfT", "Na⁺ efetivo pretendido", { unit: "mmol/L", value: "115" })}
              ${numField("oFlow", "Dialisante + reposição", { unit: "cc/h", value: "2000" })}
            </div>
            <div class="card">
              <h3>Resultado</h3>
              ${results([["Perfusão de Dx5%", "oPerfR"], ["Carga de glicose", "oGlu"]])}
              <p class="hint">Administrar no circuito (pós-filtro) ou por via sistémica. Vigiar glicemia.</p>
            </div>
          </div>`],
      ])}
      </div>
      <div class="safety-box">
        <p>• Alto risco de desmielinização osmótica: Na⁺ ≤ 105 mmol/L, alcoolismo, desnutrição, hipocaliémia, doença hepática avançada.</p>
        <p>• Monitorizar a natrémia a cada <strong>2 horas</strong>.</p>
        <p>• Perfusões externas não são contabilizadas pelo monitor: <strong>aumentar a perda de fluidos</strong> no mesmo volume.</p>
        <p>• Reavaliar e ajustar a prescrição pelo menos a cada <strong>24 horas</strong>.</p>
      </div>`;
    live(el, () => {
      const pat = val(el, "oPat");
      alertBox(el, "oSug", Number.isFinite(pat) && pat < 135 ? `Sugestão: Na⁺ efetivo das soluções ≈ <strong>${fmt(pat + 8, 0)} mmol/L</strong> (Na⁺ do doente + 8; usar + 6 se alto risco).` : "", "info");

      const b = R.hypoNaBag(val(el, "oBagT"));
      setText(el, "oAdd", b ? `${fmt(b.add, 0)} mL` : "N/A");
      setText(el, "oRep", b ? `${fmt(b.replace, 0)} mL` : "N/A");
      alertBox(el, "oAlert", b && b.mustReplace ? "Mais de 1 L a adicionar: usar a opção B (retirar do saco e repor com igual volume de água)." : "", "warn");
      const sol = S[sel(el, "oSol")];
      if (b && sol) {
        const comp = [["Na⁺", "Na"], ["K⁺", "K"], ["HCO₃⁻", "HCO3"], ["Ca²⁺", "Ca"], ["Mg²⁺", "Mg"]].filter(([, k]) => sol[k] > 0);
        setHTML(el, "oComp", comp.map(([t, k]) => `<li><span>${t}</span><strong>${fmt(sol[k] * b.factor, sol[k] < 5 ? 2 : 0)} mmol/L</strong></li>`).join("") + `<li><span>Todos os solutos são diluídos</span><strong>× ${fmt(b.factor, 2)}</strong></li>`);
      } else setHTML(el, "oComp", "");

      const p = R.hypoNaInfusion(val(el, "oPerfT"), val(el, "oFlow"));
      setText(el, "oPerfR", p ? `${fmt(p.rate, 0)} cc/h` : "N/A");
      setText(el, "oGlu", p ? `${fmt(p.glucoseGh, 1)} g/h (${fmt(p.glucoseGh * 24, 0)} g/dia)` : "–");
    });
  }

  /* ======================= SLED / HD convencional (partilhado) ======================= */
  function dialysisSection(el, kind) {
    const sled = kind === "sled";
    const p = sled ? "s" : "h";
    el.innerHTML = `
      <h2>${sled ? "SLED (AutoFlow)" : "Hemodiálise convencional"}</h2>
      <p class="section-description">${sled ? "Prescrição de SLED com AutoFlow: UF, depuração estimada e dose dialítica." : "Prescrição de HD intermitente: UF e dose dialítica."}</p>
      <div class="grid-2">
        <div class="card">
          <h3>Prescrição</h3>
          <div class="fields-2">
            ${sled
              ? `${numField(`${p}W`, "Peso", { unit: "kg", value: weightValue() })}
                 ${numField(`${p}Uf`, "UF total alvo", { unit: "mL" })}`
              : `${numField(`${p}Wpre`, "Peso pré-HD", { unit: "kg" })}
                 ${numField(`${p}Wdry`, "Peso seco / alvo", { unit: "kg" })}`}
            ${numField(`${p}T`, "Duração", { unit: "h", value: sled ? "8" : "4" })}
            ${numField(`${p}Qb`, "Qb", { unit: "mL/min", value: sled ? "200" : "300" })}
            ${sled ? numField(`${p}Af`, "Fator AutoFlow (Qd/Qb)", { value: "1,2" }) : numField(`${p}Qd`, "Qd", { unit: "mL/min", value: "500" })}
            ${numField(`${p}Koa`, "KoA ureia do dialisador", { unit: "mL/min", value: "1000" })}
          </div>
          ${sled ? selectField(`${p}Risk`, "Risco hemodinâmico", [["normal", "Habitual"], ["alto", "Alto"]], { placeholder: null }) : ""}
          <h4>Banho</h4>
          <div class="fields-2">
            ${numField(`${p}Na`, "Na⁺ no banho", { unit: "mmol/L", value: "140" })}
            ${numField(`${p}K`, "K⁺ no banho", { unit: "mmol/L", value: sled ? "3" : "2" })}
            ${numField(`${p}Hco3`, "HCO₃⁻ no banho", { unit: "mmol/L", value: "32" })}
            ${numField(`${p}NaPt`, "Na⁺ do doente", { unit: "mmol/L", placeholder: "opcional" })}
          </div>
          <p class="hint">KoA: consultar a ficha técnica do dialisador; o KoA in vivo é geralmente inferior ao do fabricante, pelo que a depuração calculada é uma estimativa por excesso.</p>
        </div>
        <div class="card">
          <h3>Resultados</h3>
          ${results([
            ...(sled ? [] : [["UF total", `${p}rUf`]]),
            ["UF/h", `${p}rUfH`], ["UF/kg/h", `${p}rUfKg`],
            ...(sled ? [["Qd (AutoFlow)", `${p}rQd`]] : []),
            ["Depuração da ureia K (Michaels)", `${p}rK`], ["Kt", `${p}rKt`], ["V (0,55 × peso)", `${p}rV`],
            ["Kt/V estimado", `${p}rKtv`], ["Redução estimada da ureia", `${p}rUrr`],
            ["ΔNa (banho − doente)", `${p}rDNa`],
          ])}
          <div id="${p}Err" class="alert alert-danger" hidden></div>
          <div id="${p}Msg" class="alert" hidden></div>
          <p class="formula">K = Qb × (e<sup>z</sup> − 1) / (e<sup>z</sup> − Qb/Qd), z = KoA/Qb × (1 − Qb/Qd) · Kt/V single-pool sem geração de ureia nem UF.</p>
        </div>
      </div>`;

    live(el, () => {
      const v = (id) => val(el, `${p}${id}`);
      const T = v("T"), qb = v("Qb"), koa = v("Koa"), naB = v("Na"), kB = v("K"), hco3B = v("Hco3");
      let w, ufMl, qd;
      const err = [];
      if (sled) {
        w = v("W"); ufMl = v("Uf"); keepWeight(w);
        qd = qb * v("Af");
        if (!(T >= 6 && T <= 12)) err.push("Duração entre 6 e 12 h.");
        if (!(qb >= 100 && qb <= 400)) err.push("Qb entre 100 e 400 mL/min.");
        if (!(v("Af") >= 1 && v("Af") <= 2)) err.push("Fator AutoFlow entre 1,0 e 2,0.");
        if (!(ufMl >= 0)) err.push("UF total ≥ 0 mL.");
      } else {
        const pre = v("Wpre"), dry = v("Wdry");
        w = dry; ufMl = (pre - dry) * 1000; qd = v("Qd");
        if (!(pre >= 40 && pre <= 200) || !(dry >= 40 && dry <= 200)) err.push("Pesos entre 40 e 200 kg.");
        if (pre < dry) err.push("O peso seco não pode ser superior ao peso pré-HD.");
        if (!(T >= 2 && T <= 6)) err.push("Duração entre 2 e 6 h.");
        if (!(qb >= 150 && qb <= 600)) err.push("Qb entre 150 e 600 mL/min.");
        if (!(qd >= 300 && qd <= 800)) err.push("Qd entre 300 e 800 mL/min.");
      }
      if (!(w >= 40 && w <= 200)) err.push("Peso entre 40 e 200 kg.");
      if (!(koa >= 300 && koa <= 2000)) err.push("KoA entre 300 e 2000 mL/min.");
      if (!(naB >= 125 && naB <= 150)) err.push("Na⁺ do banho entre 125 e 150 mmol/L.");
      if (!(kB >= 0 && kB <= 5)) err.push("K⁺ do banho entre 0 e 5 mmol/L.");
      if (!(hco3B >= 24 && hco3B <= 40)) err.push("HCO₃⁻ do banho entre 24 e 40 mmol/L.");

      const ids = ["rUf", "rUfH", "rUfKg", "rQd", "rK", "rKt", "rV", "rKtv", "rUrr", "rDNa"];
      if (err.length) {
        ids.forEach((id) => setText(el, `${p}${id}`, "–"));
        alertBox(el, `${p}Err`, [...new Set(err)].join("<br>"), "danger");
        alertBox(el, `${p}Msg`, "");
        return;
      }
      alertBox(el, `${p}Err`, "");

      const ufH = ufMl / T, ufKg = ufH / (sled ? w : v("Wpre"));
      const d = R.dialysisDose({ qb, qd, koa, hours: T, weight: w });
      setText(el, `${p}rUf`, `${fmt(ufMl, 0)} mL`);
      setText(el, `${p}rUfH`, `${fmt(ufH, 0)} cc/h`);
      setText(el, `${p}rUfKg`, `${fmt(ufKg, 1)} mL/kg/h`);
      setText(el, `${p}rQd`, `${fmt(qd, 0)} mL/min`);
      setText(el, `${p}rK`, `${fmt(d.K, 0)} mL/min (${fmt((d.K * 60) / 1000, 1)} L/h)`);
      setText(el, `${p}rKt`, `${fmt(d.ktL, 1)} L`);
      setText(el, `${p}rV`, `${fmt(d.V, 1)} L`);
      setText(el, `${p}rKtv`, fmt(d.ktv, 2));
      setText(el, `${p}rUrr`, `${fmt(d.urr, 0)}%`);
      const naPt = v("NaPt");
      const dNa = Number.isFinite(naPt) ? naB - naPt : NaN;
      setText(el, `${p}rDNa`, Number.isFinite(dNa) ? `${dNa > 0 ? "+" : ""}${fmt(dNa, 0)} mmol/L` : "–");

      const msgs = [];
      let level = "ok";
      const uc = R.ufClass(ufKg);
      if (uc === "ok") msgs.push(sled && sel(el, `${p}Risk`) === "alto" ? "UF ≤ 10 mL/kg/h; em risco hemodinâmico alto, considerar UF mais baixa." : "UF ≤ 10 mL/kg/h: bem tolerada na maioria dos doentes.");
      else if (uc === "high") { msgs.push("UF 10–13 mL/kg/h: limite superior — vigiar hipotensão."); level = "warn"; }
      else { msgs.push("UF &gt; 13 mL/kg/h: excessiva — reduzir UF total ou prolongar a sessão."); level = "danger"; }
      if (sled && sel(el, `${p}Risk`) === "alto" && uc !== "ok") level = "danger";

      if (d.ktv < 1.2) { msgs.push("Kt/V &lt; 1,2: dose provavelmente insuficiente."); if (level === "ok") level = "warn"; }
      else if (!sled && d.ktv > 1.8) msgs.push("Kt/V elevado.");
      else msgs.push("Kt/V adequado.");

      if (Number.isFinite(dNa) && Math.abs(dNa) > 4) {
        msgs.push(dNa > 0 ? "Banho com Na⁺ &gt; doente + 4: tendência para subir o Na⁺." : "Banho com Na⁺ &lt; doente − 4: tendência para baixar o Na⁺ (risco se hiponatrémia crónica).");
        if (level === "ok") level = "warn";
      }
      if (kB <= 2) { msgs.push("K⁺ do banho ≤ 2 mmol/L: risco de hipocaliémia e arritmias — vigiar K⁺."); if (level === "ok") level = "warn"; }
      else if (kB >= 4) msgs.push("K⁺ do banho ≥ 4 mmol/L: útil em hipocaliémia; cautela se hipercaliémia.");

      alertBox(el, `${p}Msg`, msgs.join("<br>"), level);
    });
  }

  UCI.registerModule({
    id: "renal",
    title: "Técnicas de Substituição Renal",
    short: "TSR",
    icon: "🩸",
    description: "HDFVVC, SLED e HD convencional.",
    groups: [
      {
        title: "Técnicas contínuas",
        sections: [
          { id: "solucoes", title: "Composição das soluções", render: renderSolutions },
          { id: "efluente", title: "Dose de efluente e FF", render: renderEffluent },
          { id: "anticoagulacao", title: "Anticoagulação", render: renderAnticoag },
          { id: "bicarbonato", title: "Ajuste de HCO₃⁻", render: renderHco3 },
          { id: "hipernatremia", title: "Hipernatrémia", render: renderHyperNa },
          { id: "hiponatremia", title: "Hiponatrémia", render: renderHypoNa },
        ],
      },
      {
        title: "Técnicas intermitentes",
        sections: [
          { id: "sled", title: "SLED", render: (el) => dialysisSection(el, "sled") },
          { id: "hd", title: "HD convencional", render: (el) => dialysisSection(el, "hd") },
        ],
      },
    ],
  });
})();
