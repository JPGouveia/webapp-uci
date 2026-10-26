/* Módulo Perfusões — fórmulas puras (sem DOM). Testadas em tests/perfusoes.test.js
 * @author: João Gouveia
 */
(function (root) {
  "use strict";

  /* ---------- Unidades ---------- */
  // Unidade de dose: "<quantidade>[/kg]/<tempo>", ex. "mcg/kg/min", "mg/h", "U/min", "mg/24h"
  const AMOUNT_TO_BASE = { mcg: { base: "mass", f: 1 }, mg: { base: "mass", f: 1000 }, g: { base: "mass", f: 1e6 }, U: { base: "U", f: 1 }, mU: { base: "U", f: 0.001 } };
  const TIME_PER_HOUR = { min: 60, h: 1, "24h": 1 / 24 };

  const DOSE_UNITS = ["mcg/kg/min", "mcg/min", "mcg/kg/h", "mcg/h", "mg/kg/h", "mg/h", "mg/min", "mg/24h", "U/kg/h", "U/h", "U/min", "mU/kg/min"];

  const LABEL = { mcg: "µg", mg: "mg", g: "g", U: "U", mU: "mU" };

  function parseDoseUnit(u) {
    const parts = u.split("/");
    const amount = parts[0];
    const perKg = parts.length === 3 && parts[1] === "kg";
    const time = parts[parts.length - 1];
    if (!AMOUNT_TO_BASE[amount] || !TIME_PER_HOUR[time]) throw new Error(`Unidade inválida: ${u}`);
    return { amount, perKg, time };
  }

  /** Rótulo legível: "mcg/kg/min" → "µg/kg/min" */
  function unitLabel(u) {
    return u.replace(/^(mcg|mg|g|U|mU)/, (m) => LABEL[m]);
  }

  /** Fator: (unidade de quantidade da dose) → (unidade de quantidade do fármaco). */
  function amountFactor(from, to) {
    const a = AMOUNT_TO_BASE[from], b = AMOUNT_TO_BASE[to];
    if (!a || !b || a.base !== b.base) throw new Error(`Unidades incompatíveis: ${from} → ${to}`);
    return a.f / b.f;
  }

  /**
   * Dose → ritmo (cc/h).
   * @param dose número na unidade doseUnit
   * @param doseUnit ex. "mcg/kg/min"
   * @param conc concentração do fármaco (drugUnit por cc)
   * @param drugUnit "mg" | "mcg" | "U"
   * @param weight kg (obrigatório se unidade /kg)
   */
  function doseToRate(dose, doseUnit, conc, drugUnit, weight) {
    const u = parseDoseUnit(doseUnit);
    if (!(conc > 0) || !Number.isFinite(dose)) return NaN;
    if (u.perKg && !(weight > 0)) return NaN;
    const perHour = dose * (u.perKg ? weight : 1) * TIME_PER_HOUR[u.time]; // em u.amount / h
    return (perHour * amountFactor(u.amount, drugUnit)) / conc;
  }

  /** Ritmo (cc/h) → dose na unidade doseUnit. */
  function rateToDose(rate, doseUnit, conc, drugUnit, weight) {
    const u = parseDoseUnit(doseUnit);
    if (!(conc > 0) || !Number.isFinite(rate)) return NaN;
    if (u.perKg && !(weight > 0)) return NaN;
    const perHourDrug = rate * conc; // drugUnit / h
    const perHour = perHourDrug / amountFactor(u.amount, drugUnit);
    return perHour / TIME_PER_HOUR[u.time] / (u.perKg ? weight : 1);
  }

  /** Converte uma dose entre unidades (ex. µg/kg/min → mg/h). */
  function convertDose(dose, fromUnit, toUnit, weight) {
    // usa concentração fictícia de 1 unidade/cc na unidade "from"
    const from = parseDoseUnit(fromUnit);
    const rate = doseToRate(dose, fromUnit, 1, from.amount, weight);
    return rateToDose(rate, toUnit, 1, from.amount, weight);
  }

  /** Classificação face ao intervalo de referência do fármaco. */
  function rangeStatus(dose, drug) {
    if (!Number.isFinite(dose) || !drug) return null;
    if (drug.alertaAcima && dose > drug.alertaAcima) return "danger";
    if (drug.dose && dose > drug.dose[1]) return "high";
    if (drug.dose && dose < drug.dose[0]) return "low";
    return "ok";
  }

  const HEPARIN_INFUSION_U_ML = 500; // seringa padrão do serviço: 25 000 U / 50 cc

  /* ---------- Heparina não fracionada: esquema por peso do serviço ----------
   * Fonte: atalho «HNF perfusão» do serviço (esquema tipo Raschke).
   * Início: bólus 80 U/kg (arredondado às centenas) + perfusão 18 U/kg/h.
   * Alvo: aPTT 51–70 s. Ajustes em U/kg/h sobre a dose atual (calculada a partir do ritmo).
   * Limiares tornados contínuos (o atalho deixava sem resposta 50,99–51 e 70,99–71).
   */
  const HEP_W_BOLUS_U_KG = 80;
  const HEP_W_INFUSION_U_KG_H = 18;
  const HEPARIN_WEIGHT_TABLE = [
    { below: 41, label: "< 41", bolusUkg: "intensidade", stopMin: 0, deltaUkgH: +4, repeat: "6 h", action: "Bólus e aumentar 4 U/kg/h." },
    { below: 51, label: "41–50", bolusUkg: 0, stopMin: 0, deltaUkgH: +2, repeat: "6 h", action: "Aumentar 2 U/kg/h." },
    { below: 71, label: "51–70 (alvo)", bolusUkg: 0, stopMin: 0, deltaUkgH: 0, repeat: "dia seguinte", action: "Em alvo: manter a dose." },
    { below: 81, label: "71–80", bolusUkg: 0, stopMin: 0, deltaUkgH: -2, repeat: "dia seguinte", action: "Diminuir 2 U/kg/h." },
    { below: 120.0001, label: "81–120", bolusUkg: 0, stopMin: 30, deltaUkgH: -2, repeat: "6 h após retomar", action: "Parar 30 min e retomar com −2 U/kg/h." },
    { below: Infinity, label: "> 120", bolusUkg: 0, stopMin: 60, deltaUkgH: -4, repeat: "6 h após retomar", action: "Parar 1 h e retomar com −4 U/kg/h." },
  ];

  const round1 = (x) => Math.round(x * 10) / 10;
  const round100 = (x) => Math.round(x / 100) * 100;

  /** Dose inicial por peso. conc em U/cc (seringa). */
  function heparinInitial(weight, conc = HEPARIN_INFUSION_U_ML) {
    if (!(weight > 0) || !(conc > 0)) return null;
    const bolusU = round100(weight * HEP_W_BOLUS_U_KG);
    const rateMlH = round1((weight * HEP_W_INFUSION_U_KG_H) / conc);
    return { bolusU, bolusMl: bolusU / conc, rateMlH, uH: rateMlH * conc, uKgH: HEP_W_INFUSION_U_KG_H, repeat: "6 h" };
  }

  /**
   * Ajuste por aPTT (esquema por peso).
   * @param o weight (kg), currentMlH, conc (U/cc), highIntensity (true = TVP/TEP/trombo intracardíaco → bólus 80 U/kg; false → 40 U/kg; null = por definir), bleeding
   */
  function heparinWeightAdjust(aptt, o = {}) {
    const { weight, currentMlH, conc = HEPARIN_INFUSION_U_ML, highIntensity = null, bleeding = false } = o;
    if (!(aptt > 0)) return null;
    const idx = HEPARIN_WEIGHT_TABLE.findIndex((r) => aptt < r.below);
    const row = { ...HEPARIN_WEIGHT_TABLE[idx], index: idx };
    const res = { row, action: row.action, stopMin: row.stopMin, deltaUkgH: row.deltaUkgH, repeat: row.repeat, notes: [] };

    if (bleeding) {
      res.bleeding = true;
      res.notes.push("Hemorragia: suspender a perfusão e reavaliar (decisão médica). O esquema não se aplica.");
      return res;
    }

    // Bólus
    let bolusUkg = row.bolusUkg;
    if (bolusUkg === "intensidade") {
      if (highIntensity === true) bolusUkg = 80;
      else if (highIntensity === false) bolusUkg = 40;
      else { bolusUkg = NaN; res.notes.push("Definir se a indicação é de alta intensidade (TVP, TEP, trombo intracardíaco): bólus de 80 U/kg; caso contrário, 40 U/kg."); }
    }
    res.bolusUkg = bolusUkg;
    res.bolusU = weight > 0 && Number.isFinite(bolusUkg) ? round100(bolusUkg * weight) : NaN;
    res.bolusMl = res.bolusU / conc;

    // Dose atual → nova
    if (weight > 0 && conc > 0 && Number.isFinite(currentMlH) && currentMlH >= 0) {
      res.doseAtual = round1((currentMlH * conc) / weight);
      const nova = res.doseAtual + row.deltaUkgH;
      res.doseNova = Math.max(0, nova);
      if (nova <= 0) res.notes.push("O ajuste levaria a dose a ≤ 0 U/kg/h: reavaliar a prescrição.");
      res.newMlH = round1((res.doseNova * weight) / conc);
      res.newUH = res.newMlH * conc;
    }
    return res;
  }

  /* ---------- Vancomicina em perfusão contínua (protocolo HGO) ----------
   * Seringa 500 mg/50 cc (10 mg/cc). Carga: 1 g se ≤ 65 kg, 1,5 g se > 65 kg, em 1 h.
   * Perfusão pela depuração de creatinina; níveis 12 h após o início; alvo 20–25 µg/mL.
   * Nota: no protocolo a coluna «Débito» diz mg/h, mas os valores são cc/h (ex. 2 g/dia → 8,3 cc/h).
   */
  const VANCO_MG_ML = 10;
  const VANCO_CLASSES = [
    { id: "gt50", label: "> 50 mL/min", mgDay: 2000 },
    { id: "20-50", label: "20–50 mL/min", mgDay: 1500 },
    { id: "10-20", label: "10–20 mL/min", mgDay: 1000 },
    { id: "lt10", label: "< 10 mL/min", mgDay: 500 },
    { id: "hfvvc", label: "HFVVC", mgDay: 1000 },
  ];
  const VANCO_LEVELS = [
    { below: 15, label: "< 15", deltaMgDay: 500, recheck: "após 6 h" },
    { below: 20, label: "15–20", deltaMgDay: 250, recheck: "após 6–12 h" },
    { below: 25.0001, label: "20–25 (alvo)", deltaMgDay: 0, recheck: "após 12–24 h" },
    { below: 30.0001, label: "25–30", deltaMgDay: -500, recheck: "após 6–12 h" },
    { below: Infinity, label: "> 30", deltaMgDay: null, stopH: 6, recheck: "após 6 h" },
  ];

  /** Classe de função renal a partir da depuração de creatinina (mL/min). */
  function vancoClass(crcl) {
    if (!(crcl >= 0)) return null;
    if (crcl > 50) return "gt50";
    if (crcl >= 20) return "20-50";
    if (crcl >= 10) return "10-20";
    return "lt10";
  }

  /** Cockcroft-Gault (mL/min). creat em mg/dL. */
  function cockcroftGault(age, weight, creat, female) {
    if (!(age > 0) || !(weight > 0) || !(creat > 0)) return NaN;
    return (((140 - age) * weight) / (72 * creat)) * (female ? 0.85 : 1);
  }

  const vancoRate = (mgDay, conc = VANCO_MG_ML) => mgDay / 24 / conc;

  function vancoInitial(weight, classId, conc = VANCO_MG_ML) {
    const cls = VANCO_CLASSES.find((c) => c.id === classId);
    const res = { loadMg: weight > 0 ? (weight > 65 ? 1500 : 1000) : NaN };
    if (cls) Object.assign(res, { cls, mgDay: cls.mgDay, rateCcH: vancoRate(cls.mgDay, conc) });
    return res;
  }

  /**
   * Ajuste pelo nível sérico (µg/mL). currentCcH opcional: a dose diária atual é
   * aproximada aos 250 mg (as doses do protocolo são múltiplos de 250 mg).
   */
  function vancoAdjust(level, currentCcH, conc = VANCO_MG_ML) {
    if (!(level >= 0)) return null;
    const idx = VANCO_LEVELS.findIndex((r) => level < r.below);
    const row = { ...VANCO_LEVELS[idx], index: idx };
    const res = { row, recheck: row.recheck, stopH: row.stopH || 0 };
    const hasRate = Number.isFinite(currentCcH) && currentCcH > 0;
    if (hasRate) {
      res.currentMgDayExact = currentCcH * conc * 24;
      res.currentMgDay = Math.round(res.currentMgDayExact / 250) * 250;
    }

    if (row.deltaMgDay === null) {
      res.action = "Parar 6 h e repetir o doseamento.";
      return res;
    }
    if (row.deltaMgDay === -500 && hasRate && res.currentMgDay <= 250) {
      res.stopH = 6; res.recheck = "após 6 h";
      res.action = "Dose atual 250 mg/dia: parar 6 h e repetir o doseamento.";
      return res;
    }
    if (row.deltaMgDay === -500 && hasRate && res.currentMgDay <= 500) {
      res.action = "Dose atual 500 mg/dia: diminuir para 250 mg/dia.";
      res.newMgDay = 250;
    } else {
      res.action = row.deltaMgDay === 0 ? "Manter a dose."
        : `${row.deltaMgDay > 0 ? "Aumentar" : "Diminuir"} a dose ${Math.abs(row.deltaMgDay)} mg/dia (${row.deltaMgDay > 0 ? "+" : "−"}${(Math.abs(row.deltaMgDay) / 24 / conc).toFixed(1).replace(".", ",")} cc/h).`;
      if (hasRate) res.newMgDay = res.currentMgDay + row.deltaMgDay;
    }
    if (Number.isFinite(res.newMgDay)) res.newCcH = vancoRate(res.newMgDay, conc);
    return res;
  }

  /** Ampolas inteiras + resto (cc) para um volume. */
  function ampoules(volume, ampVol) {
    if (!(volume > 0) || !(ampVol > 0)) return null;
    const full = Math.floor(volume / ampVol + 1e-9);
    return { full, rest: Math.round(volume - full * ampVol) };
  }

  /* ---------- Soluções salinas: mistura de duas concentrações ----------
   * Volume da solução mais concentrada = Vfinal × (alvo − baixa) / (alta − baixa)  (% p/v)
   */
  const NACL_MW = 58.44;
  function saltMix(finalVol, target, low = 0.9, high = 20) {
    if (!(finalVol > 0) || !(low >= 0) || !(high > low) || !(target > low) || !(target < high)) return null;
    const highVol = (finalVol * (target - low)) / (high - low);
    // Volumes para preparação: arredondados ao cc (mínimo 1 cc); concentração real recalculada
    const highR = Math.max(1, Math.round(highVol));
    const lowR = Math.round(finalVol) - highR;
    const realPct = (lowR * low + highR * high) / (lowR + highR);
    const mmolL = (realPct * 10 * 1000) / NACL_MW; // % p/v → g/L → mmol/L
    return {
      highVol, lowVol: finalVol - highVol, // exatos
      highR, lowR, realPct, // arredondados (usar nas instruções)
      mmolL, mOsm: 2 * mmolL, naMmol: (mmolL * (lowR + highR)) / 1000,
    };
  }

  const api = {
    DOSE_UNITS, parseDoseUnit, unitLabel, amountFactor, doseToRate, rateToDose, convertDose, rangeStatus,
    HEPARIN_INFUSION_U_ML,
    HEPARIN_WEIGHT_TABLE, HEP_W_BOLUS_U_KG, HEP_W_INFUSION_U_KG_H, heparinInitial, heparinWeightAdjust,
    saltMix, ampoules,
    VANCO_MG_ML, VANCO_CLASSES, VANCO_LEVELS, vancoClass, cockcroftGault, vancoRate, vancoInitial, vancoAdjust,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else ((root.UCI = root.UCI || {}).calc = root.UCI.calc || {}).perfusoes = api;
})(typeof window !== "undefined" ? window : globalThis);
