/* Módulo TSR — fórmulas puras (sem DOM). Testadas em tests/renal.test.js
 * Unidades: fluxos de TSR contínua em cc/h; Qb/Qd em mL/min; Na/HCO3 em mEq/L (= mmol/L).
 * @author: João Gouveia
 */
(function (root) {
  "use strict";

  /* ---------- Soluções (composição; confirmar com o RCM em caso de mudança de fornecedor) ---------- */
  const SOLUTIONS = {
    prismasol4: { nome: "Prismasol 4", Na: 140, K: 4, Cl: 113.5, Mg: 0.5, Ca: 1.75, HCO3: 32, lactato: 3, glicose: 6.1, fosfato: 0, citrato: 0 },
    hemosolB0: { nome: "Hemosol B0", Na: 140, K: 0, Cl: 109.5, Mg: 0.5, Ca: 1.75, HCO3: 32, lactato: 3, glicose: 0, fosfato: 0, citrato: 0 },
    regiocit: { nome: "Regiocit", Na: 140, K: 0, Cl: 86, Mg: 0, Ca: 0, HCO3: 0, lactato: 0, glicose: 0, fosfato: 0, citrato: 18 },
    biphozyl: { nome: "Biphozyl", Na: 140, K: 4, Cl: 122, Mg: 0.75, Ca: 0, HCO3: 22, lactato: 0, glicose: 0, fosfato: 1, citrato: 0 },
  };

  const BAG_ML = 5000; // volume do saco
  const NAHCO3_84_MEQ_L = 1000; // NaHCO3 8,4% = 1 mEq/mL
  const NACL_20_MEQ_L = 3422; // NaCl 20% = 200 g/L ÷ 58,44 = 3,42 mEq/mL
  const NACL_09_MEQ_L = 154;
  const NACL_3_MEQ_L = 513;

  /* ---------- Dose de efluente e fração de filtração ---------- */
  /**
   * @param {object} p  pbs, pre, dial, post, uf (cc/h); qb (mL/min); hct (%); weight (kg)
   */
  function effluent(p) {
    const { pbs = 0, pre = 0, dial = 0, post = 0, uf = 0, qb, hct, weight } = p;
    const total = pbs + pre + dial + post + uf;
    const qbh = qb * 60;
    const qp = qbh * (1 - hct / 100);
    const convective = pbs + pre + post + uf;
    const ff = qp + pbs + pre > 0 ? (convective / (qp + pbs + pre)) * 100 : NaN;
    // Fator de pré-diluição (fluxo plasmático): a pré-diluição reduz a dose efetiva
    const predil = qp + pbs + pre > 0 ? qp / (qp + pbs + pre) : NaN;
    const dose = weight > 0 ? total / weight : NaN;
    const doseCorr = weight > 0 ? (total * predil) / weight : NaN;
    return { total, dose, ff, qp, predil, doseCorr };
  }

  /* ---------- Citrato ---------- */

  // Tabela do serviço (dose de citrato 3 mmol/L de sangue)
  const CITRATE_TABLE = [
    { weight: 50, qb: 100, dialysate: 1000, postFilter: 200, effDose: 37 },
    { weight: 60, qb: 110, dialysate: 1000, postFilter: 400, effDose: 37 },
    { weight: 70, qb: 120, dialysate: 1200, postFilter: 500, effDose: 35 },
    { weight: 80, qb: 130, dialysate: 1300, postFilter: 500, effDose: 33 },
    { weight: 90, qb: 140, dialysate: 1400, postFilter: 500, effDose: 31 },
    { weight: 100, qb: 150, dialysate: 1500, postFilter: 600, effDose: 31 },
    { weight: 110, qb: 160, dialysate: 1600, postFilter: 700, effDose: 30 },
    { weight: 120, qb: 170, dialysate: 1700, postFilter: 800, effDose: 30 },
    { weight: 130, qb: 180, dialysate: 1800, postFilter: 1000, effDose: 30 },
  ];

  /** Débito de Regiocit (PBS, cc/h) para uma dose de citrato (mmol/L de sangue). */
  function citratePbs(qb, dose = 3, citrateConc = SOLUTIONS.regiocit.citrato) {
    return (dose * qb * 60) / citrateConc;
  }

  /** Linha da tabela mais próxima do peso. null se < 45 kg. outOfRange se > 135 kg. */
  function citrateSettings(weight) {
    if (!(weight >= 45)) return null;
    let best = CITRATE_TABLE[0];
    for (const row of CITRATE_TABLE) if (Math.abs(weight - row.weight) < Math.abs(weight - best.weight)) best = row;
    return { ...best, pbs: citratePbs(best.qb), outOfRange: weight > 135 };
  }

  /** Ajuste da dose de citrato pelo Ca2+ pós-filtro (alvo 0,25–0,35 mmol/L). delta em mmol/L. */
  function citrateAdjust(caPost) {
    if (!(caPost > 0)) return null;
    let delta;
    if (caPost > 0.45) delta = 0.3;
    else if (caPost > 0.4) delta = 0.2;
    else if (caPost > 0.35) delta = 0.1;
    else if (caPost >= 0.25) delta = 0;
    else if (caPost >= 0.2) delta = -0.1;
    else if (caPost >= 0.15) delta = -0.2;
    else delta = -0.3;
    return { delta };
  }

  /** Ajuste da compensação de cálcio pelo Ca2+ sistémico (alvo 1,0–1,3 mmol/L). pct em %. */
  function calciumAdjust(cai) {
    if (!(cai > 0)) return null;
    let pct, bolus = false;
    if (cai < 0.75) { pct = 10; bolus = true; }
    else if (cai < 0.8) pct = 10;
    else if (cai < 1.0) pct = 5;
    else if (cai <= 1.3) pct = 0;
    else if (cai <= 1.45) pct = -5;
    else pct = -10;
    return { pct, bolus };
  }

  /** Relação Ca total / Ca2+ (Ca total em mg/dL; 1 mmol/L = 4,008 mg/dL). */
  function caRatio(caTotalMgDl, cai) {
    if (!(caTotalMgDl > 0) || !(cai > 0)) return NaN;
    return caTotalMgDl / 4.008 / cai;
  }

  /**
   * Equilíbrio ácido-base na técnica com citrato.
   * Devolve { level, code, text }.
   * Regra de segurança: em acidose não se recomenda ↑Qb sem excluir acumulação (CaT/Ca2+).
   */
  function citrateAcidBase({ ph, hco3, ratio }) {
    const hasRatio = Number.isFinite(ratio);
    if (hasRatio && ratio > 2.5) {
      return {
        level: "danger",
        code: "accumulation",
        text:
          "CaT/Ca²⁺ > 2,5: acumulação de citrato provável. Suspender a anticoagulação com citrato e manter a técnica com heparina ou sem anticoagulação. Não aumentar o Qb.",
      };
    }
    if (!Number.isFinite(ph) || !Number.isFinite(hco3)) {
      return { level: "info", code: "missing", text: "Introduzir pH e HCO₃⁻." };
    }
    if (ph > 7.45 && hco3 > 26) {
      return {
        level: "warn",
        code: "alkalosis",
        text:
          "Alcalose metabólica (excesso de citrato metabolizado em HCO₃⁻): ↓ Qb em 10–20% (reduz a carga de citrato) ou ↑ dialisante/efluente em ~25% (aumenta a remoção de HCO₃⁻). Ureia/creatinina elevadas → preferir ↑ dialisante; normais ou baixas → preferir ↓ Qb.",
      };
    }
    if (ph < 7.35 && hco3 < 22) {
      if (!hasRatio) {
        return {
          level: "danger",
          code: "acidosis-unknown",
          text:
            "Acidose metabólica: introduzir o Ca total para calcular CaT/Ca²⁺ antes de qualquer ajuste. Se houver acumulação de citrato, aumentar o Qb agrava o quadro. Avaliar também lactato e anion gap.",
        };
      }
      return {
        level: "warn",
        code: "acidosis",
        text:
          "Acidose metabólica com CaT/Ca²⁺ ≤ 2,5 (citrato perdido no efluente; função hepática preservada): ↑ Qb em 10–20% (preferível, não compromete a dose) ou ↓ dialisante/efluente em ~25%. Excluir outras causas (lactato, anion gap).",
      };
    }
    return { level: "ok", code: "normal", text: "Sem alteração ácido-base atribuível ao citrato. Manter vigilância." };
  }

  /* ---------- Bicarbonato nos sacos ---------- */
  /** Volume de NaHCO3 8,4% (mL) para levar o saco de baseHco3 a target; e Na final. */
  function bagBicarbonate(target, baseHco3, baseNa = 140, bagMl = BAG_ML) {
    if (!(target > baseHco3)) return null;
    const vol = (bagMl * (target - baseHco3)) / (NAHCO3_84_MEQ_L - target);
    const naFinal = (baseNa * bagMl + NAHCO3_84_MEQ_L * vol) / (bagMl + vol);
    return { vol, naFinal };
  }

  /* ---------- Sódio ---------- */
  /** NaCl 20% (mL) para levar o saco de baseNa a target (balanço exato, inclui volume adicionado). */
  function bagNaCl20(target, baseNa = 140, bagMl = BAG_ML) {
    if (!(target > baseNa)) return null;
    return { vol: (bagMl * (target - baseNa)) / (NACL_20_MEQ_L - target) };
  }

  /** Volume (mL) a trocar num litro de NaCl 0,9% por NaCl 20% para obter a concentração alvo. */
  function hypertonicRecipe(targetMeqL = NACL_3_MEQ_L, bagMl = 1000) {
    return (bagMl * (targetMeqL - NACL_09_MEQ_L)) / (NACL_20_MEQ_L - NACL_09_MEQ_L);
  }

  /** Perfusão de NaCl 3% (cc/h) para que o Na efetivo das soluções seja target. flow = dialisante + reposição. */
  function hyperNaInfusion(target, flow, baseNa = 140, infNa = NACL_3_MEQ_L) {
    if (!(target > baseNa) || !(target < infNa) || !(flow > 0)) return NaN;
    return ((target - baseNa) / (infNa - target)) * flow;
  }

  /** Diluição dos sacos com água para baixar o Na. */
  function hypoNaBag(target, baseNa = 140, bagMl = BAG_ML) {
    if (!(target > 0) || !(target < baseNa)) return null;
    const add = bagMl * (baseNa / target - 1); // água a acrescentar
    const replace = bagMl * (1 - target / baseNa); // solução a retirar e repor com água
    const factor = target / baseNa; // fator de diluição de todos os solutos
    return { add, replace, factor, mustReplace: add > 1000 };
  }

  /** Perfusão de Dx5% (cc/h) para Na efetivo target; carga de glicose (g/h). */
  function hypoNaInfusion(target, flow, baseNa = 140) {
    if (!(target > 0) || !(target < baseNa) || !(flow > 0)) return null;
    const rate = ((baseNa - target) / target) * flow;
    return { rate, glucoseGh: rate * 0.05 };
  }

  /* ---------- Heparina no circuito (sem indicação sistémica) ---------- */
  /** Titulação por aPTTr com alvo 1,5–2,0 (configurável). */
  function heparinCircuitTitration(apttr, weight, target = [1.5, 2.0]) {
    if (!(apttr > 0)) return null;
    const w = weight > 0 ? weight : NaN;
    if (apttr < target[0]) return { action: "up", uKgH: 10, uH: 10 * w, recheckH: 4 };
    if (apttr <= target[1]) return { action: "keep", recheckH: 12 };
    return { action: "down", uKgH: 5, uH: 5 * w, recheckH: 4 };
  }

  /* ---------- Hemodiálise: depuração difusiva ---------- */
  /**
   * Equação de Michaels (contracorrente): depuração difusiva da ureia (mL/min).
   * K nunca excede Qb. KoA in vivo tende a ser inferior ao do fabricante.
   */
  function michaels(qb, qd, koa) {
    if (!(qb > 0) || !(qd > 0) || !(koa > 0)) return NaN;
    if (Math.abs(qb - qd) < 1e-9) return (qb * koa) / (qb + koa);
    const z = (koa / qb) * (1 - qb / qd);
    const ez = Math.exp(z);
    return (qb * (ez - 1)) / (ez - qb / qd);
  }

  /** Dose dialítica single-pool simplificada (sem geração de ureia nem UF). */
  function dialysisDose({ qb, qd, koa, hours, weight, vFactor = 0.55 }) {
    const K = michaels(qb, qd, koa); // mL/min
    const ktL = (K * 60 * hours) / 1000;
    const V = vFactor * weight;
    const ktv = V > 0 ? ktL / V : NaN;
    const urr = Number.isFinite(ktv) ? (1 - Math.exp(-ktv)) * 100 : NaN;
    return { K, ktL, V, ktv, urr };
  }

  /** Classificação de UF (mL/kg/h). */
  function ufClass(ufKgH) {
    if (!Number.isFinite(ufKgH)) return null;
    if (ufKgH <= 10) return "ok";
    if (ufKgH <= 13) return "high";
    return "excessive";
  }

  const api = {
    SOLUTIONS, CITRATE_TABLE, BAG_ML,
    effluent, citratePbs, citrateSettings, citrateAdjust, calciumAdjust, caRatio, citrateAcidBase,
    bagBicarbonate, bagNaCl20, hypertonicRecipe, hyperNaInfusion, hypoNaBag, hypoNaInfusion,
    heparinCircuitTitration, michaels, dialysisDose, ufClass,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else ((root.UCI = root.UCI || {}).calc = root.UCI.calc || {}).renal = api;
})(typeof window !== "undefined" ? window : globalThis);
