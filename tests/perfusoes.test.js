// Testes do motor de perfusões e do nomograma de heparina.
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../js/modules/perfusoes/perfusoes.calc.js");
const { DRUGS } = require("../js/modules/perfusoes/drugs.js");

const close = (a, b, tol = 0.01, msg) => assert.ok(Math.abs(a - b) <= tol, msg || `${a} ≉ ${b}`);

test("noradrenalina 8 mg/50 mL, 0,1 µg/kg/min, 70 kg → 2,625 mL/h", () => {
  // 0,1 × 70 × 60 = 420 µg/h = 0,42 mg/h ; conc 0,16 mg/mL → 2,625 mL/h
  close(P.doseToRate(0.1, "mcg/kg/min", 8 / 50, "mg", 70), 2.625);
});

test("ida e volta dose ↔ ritmo para todos os fármacos da biblioteca", () => {
  for (const d of DRUGS) {
    const conc = d.quantidade / d.volume;
    for (const dose of d.tabela) {
      const rate = P.doseToRate(dose, d.doseUnit, conc, d.unidade, 80);
      assert.ok(Number.isFinite(rate) && rate > 0, `${d.id} ${dose}`);
      close(P.rateToDose(rate, d.doseUnit, conc, d.unidade, 80), dose, 1e-9, `${d.id}`);
    }
    for (const alt of d.altUnits || []) {
      assert.ok(Number.isFinite(P.convertDose(d.tabela[0], d.doseUnit, alt, 80)), `${d.id} → ${alt}`);
    }
    assert.ok(d.dose[0] < d.dose[1], `${d.id}: intervalo`);
  }
});

test("ritmos em seringa (≤ 50 mL) são práticos: 0,1–60 mL/h em toda a tabela rápida, 80 kg", () => {
  for (const d of DRUGS.filter((x) => x.volume <= 50)) {
    const conc = d.quantidade / d.volume;
    const lo = P.doseToRate(Math.min(...d.tabela), d.doseUnit, conc, d.unidade, 80);
    const hi = P.doseToRate(Math.max(...d.tabela), d.doseUnit, conc, d.unidade, 80);
    assert.ok(lo >= 0.1, `${d.id}: mínimo ${lo.toFixed(2)} mL/h`);
    assert.ok(hi <= 60, `${d.id}: máximo ${hi.toFixed(1)} mL/h`);
  }
});

test("diluições do serviço (2026-10-26)", () => {
  const exp = { noradrenalina: [10, 50], adrenalina: [5, 50], vasopressina: [40, 50], dobutamina: [250, 50], dopamina: [400, 50],
    milrinona: [10, 50], levosimendan: [12.5, 500], dni: [50, 50], nitroprussiato: [50, 50], labetalol: [200, 40], esmolol: [2500, 250],
    urapidil: [100, 50], amiodarona: [600, 50], propofol: [1000, 50], midazolam: [150, 50], dexmedetomidina: [1000, 250],
    fentanil: [500, 50], remifentanil: [5, 50], morfina: [50, 50], cetamina: [500, 50], rocuronio: [500, 50], cisatracurio: [150, 50],
    insulina: [50, 50], heparina: [25000, 50], furosemida: [100, 50], isoprenalina: [1, 50],
    alfentanilo: [15, 50], tiopental: [2000, 50], atracurio: [500, 50], vancomicina: [500, 50] };
  assert.equal(DRUGS.length, Object.keys(exp).length);
  for (const d of DRUGS) {
    assert.deepEqual([d.quantidade, d.volume], exp[d.id], d.id);
    assert.equal(d.validado, true, d.id);
  }
  assert.ok(!DRUGS.find((d) => d.id === "nitroglicerina"));
});

test("todos os fármacos têm fonte e diluente; intervalo dentro da tabela coerente", () => {
  for (const d of DRUGS) {
    assert.ok(d.fonte && d.fonte.length > 3, `${d.id}: fonte`);
    assert.ok(d.diluente, `${d.id}: diluente`);
    if (d.alertaAcima) assert.ok(d.alertaAcima >= d.dose[1], `${d.id}: alerta abaixo do máximo`);
  }
  const fen = DRUGS.find((d) => d.id === "fentanil");
  assert.equal(fen.dose[1], 1.5);
  assert.equal(P.rangeStatus(2, fen), "high");
  assert.equal(P.rangeStatus(1.2, fen), "ok");
  const levo = DRUGS.find((d) => d.id === "levosimendan");
  close(levo.quantidade / levo.volume, 0.025);
});

test("conversões", () => {
  close(P.convertDose(0.1, "mcg/kg/min", "mcg/min", 70), 7);
  close(P.convertDose(1, "mg/min", "mg/h"), 60);
  close(P.convertDose(37.5, "mg/h", "mg/24h"), 900);
  close(P.convertDose(0.03, "U/min", "U/h"), 1.8);
  assert.throws(() => P.convertDose(1, "U/h", "mg/h"));
});

test("unidades incompatíveis falham", () => {
  assert.throws(() => P.doseToRate(1, "mg/h", 1, "U"));
});

/* ---- Esquema por peso (atalho «HNF perfusão») ---- */
test("HNF por peso: início 70 kg, 25 000 U/50 mL", () => {
  const r = P.heparinInitial(70, 500);
  assert.equal(r.bolusU, 5600); close(r.bolusMl, 11.2); close(r.rateMlH, 2.5); // 70×18/500 = 2,52 → 2,5
  assert.equal(P.heparinInitial(73).bolusU, 5800); // 5840 → centenas
});

test("HNF por peso: ajustes (70 kg a 2,5 mL/h → dose atual 17,9 U/kg/h)", () => {
  const o = { weight: 70, currentMlH: 2.5, conc: 500 };
  const a = P.heparinWeightAdjust(60, o);
  close(a.doseAtual, 17.9); close(a.doseNova, 17.9); close(a.newMlH, 2.5); assert.equal(a.repeat, "dia seguinte");
  const b = P.heparinWeightAdjust(45, o);
  close(b.doseNova, 19.9); close(b.newMlH, 2.8); assert.equal(b.bolusU, 0);
  const c = P.heparinWeightAdjust(35, { ...o, highIntensity: true });
  assert.equal(c.bolusU, 5600); close(c.doseNova, 21.9); close(c.newMlH, 3.1);
  assert.equal(P.heparinWeightAdjust(35, { ...o, highIntensity: false }).bolusU, 2800);
  assert.ok(Number.isNaN(P.heparinWeightAdjust(35, o).bolusU)); // intensidade por definir
  const d = P.heparinWeightAdjust(100, o);
  assert.equal(d.stopMin, 30); close(d.newMlH, 2.2);
  const e = P.heparinWeightAdjust(130, o);
  assert.equal(e.stopMin, 60); close(e.newMlH, 1.9);
  assert.equal(P.heparinWeightAdjust(120, o).stopMin, 30);
});

test("HNF por peso: limiares contínuos (sem lacunas do atalho)", () => {
  const cases = [[40.9, 4], [41, 2], [50.995, 2], [51, 0], [70.995, 0], [71, -2], [80.995, -2], [81, -2], [120.5, -4]];
  for (const [aptt, delta] of cases) assert.equal(P.heparinWeightAdjust(aptt).deltaUkgH, delta, `aPTT ${aptt}`);
});

test("HNF por peso: hemorragia suspende", () => {
  const r = P.heparinWeightAdjust(60, { weight: 70, currentMlH: 2.5, bleeding: true });
  assert.equal(r.bleeding, true); assert.equal(r.newMlH, undefined);
});

/* ---- Tabela de perfusões do serviço e textos ---- */
test("doses da tabela do serviço", () => {
  const by = (id) => DRUGS.find((d) => d.id === id);
  assert.deepEqual([by("noradrenalina").doseUnit, ...by("noradrenalina").dose], ["mcg/min", 1, 100]);
  assert.deepEqual(by("midazolam").dose, [0.03, 0.2]);
  assert.deepEqual(by("propofol").dose, [0.5, 4]);
  assert.deepEqual([by("amiodarona").doseUnit, ...by("amiodarona").dose], ["mcg/kg/min", 5, 20]);
  assert.deepEqual([by("remifentanil").doseUnit, ...by("remifentanil").dose], ["mcg/kg/min", 0.01, 0.2]);
  assert.equal(by("atracurio").bolus, "0,3–0,6 mg/kg");
  // folha "Noradrenalina" do ficheiro do serviço: 10 mg/50 → 2 µg/min = 0,6 cc/h; 180 µg/min = 54 cc/h
  close(P.doseToRate(2, "mcg/min", 10 / 50, "mg"), 0.6);
  close(P.doseToRate(180, "mcg/min", 10 / 50, "mg"), 54);
});

test("textos visíveis: sem mL, sem G5 e sem fontes nas notas", () => {
  for (const d of DRUGS) {
    const txt = [d.diluente, d.bolus || "", ...d.notas].join(" ");
    // volumes em cc; exceções: unidades laboratoriais (µg/mL nos níveis, mL/min na depuração)
    assert.ok(!/\bG5\b/.test(txt) && !/\bmL\b/.test(txt.replace(/µg\/mL|mL\/min/g, "")), `${d.id}: ${txt}`);
    assert.ok(!/SSC|PADIS|ESICM|ESC |ERC|RCM/.test(d.notas.join(" ")), `${d.id}: fonte nas notas`);
  }
});

test("solução salina: construtor de hipertónicos", () => {
  const r = P.saltMix(500, 3, 0.9, 20);
  close(r.highVol, 54.97, 0.01); // valor da folha «Hipertónico»
  close(r.lowVol, 445.03, 0.01);
  close(r.mmolL, 513.3, 0.5); // calculado com os volumes arredondados (55 cc)
  close(P.saltMix(1000, 3).highVol, 109.95, 0.01);
  close(P.saltMix(250, 7.5).highVol, 86.39, 0.01);
  assert.equal(P.saltMix(500, 0.5), null);
  assert.equal(P.saltMix(500, 25), null);
  assert.equal(P.saltMix(0, 3), null);
});

test("solução salina: volumes arredondados ao cc e concentração real", () => {
  const r = P.saltMix(500, 7.5, 0.9, 20); // exato 172,77 cc
  assert.equal(r.highR, 173); assert.equal(r.lowR, 327);
  close(r.realPct, (327 * 0.9 + 173 * 20) / 500, 1e-9);
  assert.ok(Math.abs(r.realPct - 7.5) < 0.02);
  const s = P.saltMix(1000, 3); // exato 109,95 → 110
  assert.equal(s.highR, 110); assert.equal(s.lowR, 890);
  assert.deepEqual(P.ampoules(173, 20), { full: 8, rest: 13 });
  assert.deepEqual(P.ampoules(60, 20), { full: 3, rest: 0 });
});

test("bólus: só preenchido quando existe; heparina fora da calculadora", () => {
  for (const d of DRUGS) if ("bolus" in d) assert.ok(d.bolus && !/^n[ãa]o$/i.test(d.bolus), `${d.id}: bólus «${d.bolus}»`);
  assert.equal(DRUGS.find((d) => d.id === "heparina").calculadora, false);
  assert.ok(!DRUGS.find((d) => d.id === "noradrenalina").notas.some((n) => /tartarato/.test(n)));
});

/* ---- Vancomicina em perfusão contínua ---- */
test("vancomicina: início (carga e perfusão por função renal)", () => {
  assert.equal(P.vancoInitial(60).loadMg, 1000);
  assert.equal(P.vancoInitial(65).loadMg, 1000);
  assert.equal(P.vancoInitial(80).loadMg, 1500);
  const exp = { gt50: 8.3, "20-50": 6.3, "10-20": 4.2, lt10: 2.1, hfvvc: 4.2 }; // débitos do protocolo (cc/h)
  for (const [id, cc] of Object.entries(exp)) close(P.vancoInitial(70, id).rateCcH, cc, 0.05, id);
  assert.equal(P.vancoClass(51), "gt50"); assert.equal(P.vancoClass(50), "20-50");
  assert.equal(P.vancoClass(20), "20-50"); assert.equal(P.vancoClass(19.9), "10-20");
  assert.equal(P.vancoClass(10), "10-20"); assert.equal(P.vancoClass(9), "lt10");
  close(P.cockcroftGault(60, 70, 1, false), 77.78, 0.01);
  close(P.cockcroftGault(60, 70, 1, true), 66.11, 0.01);
});

test("vancomicina: ajuste pelos níveis", () => {
  const a = P.vancoAdjust(12, 8.3); // 1992 mg/dia ≈ 2000
  assert.equal(a.currentMgDay, 2000); assert.equal(a.newMgDay, 2500); close(a.newCcH, 10.4, 0.05); assert.equal(a.recheck, "após 6 h");
  const b = P.vancoAdjust(17, 6.3);
  assert.equal(b.newMgDay, 1750); close(b.newCcH, 7.3, 0.05);
  assert.equal(P.vancoAdjust(22, 6.3).newMgDay, 1500);
  assert.equal(P.vancoAdjust(25, 6.3).row.label, "20–25 (alvo)");
  const c = P.vancoAdjust(27, 8.3); assert.equal(c.newMgDay, 1500); close(c.newCcH, 6.3, 0.05);
  const d = P.vancoAdjust(27, 2.1); assert.equal(d.newMgDay, 250); close(d.newCcH, 1.0, 0.05);
  const e = P.vancoAdjust(28, 1.0); assert.equal(e.stopH, 6); assert.equal(e.newMgDay, undefined);
  const f = P.vancoAdjust(35, 8.3); assert.equal(f.stopH, 6); assert.equal(f.recheck, "após 6 h");
  const g = P.vancoAdjust(12); assert.equal(g.newMgDay, undefined); assert.ok(/500 mg\/dia/.test(g.action));
});
