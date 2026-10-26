// Testes das fórmulas de TSR. Correr: npm test  (ou: node --test tests/)
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../js/modules/renal/renal.calc.js");

const close = (a, b, tol = 0.5, msg) => assert.ok(Math.abs(a - b) <= tol, msg || `${a} ≉ ${b}`);

test("efluente e FF (valores por defeito da app antiga)", () => {
  const r = R.effluent({ pbs: 0, pre: 1000, dial: 1000, post: 500, uf: 20, qb: 150, hct: 35, weight: 70 });
  assert.equal(r.total, 2520);
  close(r.dose, 36, 0.01);
  // Qp = 150*60*0,65 = 5850 ; FF = 1520/(5850+1000) = 22,19%
  close(r.ff, 22.19, 0.01);
  close(r.doseCorr, 36 * 5850 / 6850, 0.01);
});

test("PBS do citrato = Qb × 10 mL/h a 3 mmol/L", () => {
  assert.equal(R.citratePbs(120), 1200);
  assert.equal(R.citratePbs(100, 3.3), 1100);
});

test("tabela de citrato: peso mais próximo e PBS", () => {
  const s = R.citrateSettings(73);
  assert.equal(s.weight, 70); assert.equal(s.qb, 120); assert.equal(s.pbs, 1200); assert.equal(s.outOfRange, false);
  assert.equal(R.citrateSettings(40), null);
  assert.equal(R.citrateSettings(150).outOfRange, true);
});

test("tabela de citrato é coerente com a dose de efluente indicada (corrigida para pré-diluição pelo Qb)", () => {
  for (const row of R.CITRATE_TABLE) {
    const pbs = R.citratePbs(row.qb);
    const tot = pbs + row.dialysate + row.postFilter;
    const corr = (tot * (row.qb * 60)) / (row.qb * 60 + pbs) / row.weight;
    close(corr, row.effDose, 1.6, `peso ${row.weight}: ${corr.toFixed(1)} vs ${row.effDose}`);
  }
});

test("ajuste do citrato pelo Ca pós-filtro: sem lacunas", () => {
  const cases = [[0.5, 0.3], [0.45, 0.2], [0.41, 0.2], [0.405, 0.2], [0.4, 0.1], [0.355, 0.1], [0.35, 0], [0.25, 0], [0.245, -0.1], [0.2, -0.1], [0.19, -0.2], [0.15, -0.2], [0.14, -0.3]];
  for (const [ca, d] of cases) assert.equal(R.citrateAdjust(ca).delta, d, `Ca ${ca}`);
  assert.equal(R.citrateAdjust(0), null);
});

test("ajuste do Ca sistémico: sem lacunas (0,795, 0,995, 1,305)", () => {
  const cases = [[0.7, 10, true], [0.75, 10, false], [0.795, 10, false], [0.8, 5, false], [0.995, 5, false], [1.0, 0], [1.3, 0], [1.305, -5], [1.45, -5], [1.5, -10]];
  for (const [c, pct, bolus] of cases) {
    const r = R.calciumAdjust(c);
    assert.equal(r.pct, pct, `Ca ${c}`);
    if (bolus !== undefined) assert.equal(r.bolus, bolus);
  }
});

test("relação CaT/Ca2+", () => {
  close(R.caRatio(8.016, 1.0), 2.0, 0.001);
  assert.ok(Number.isNaN(R.caRatio(NaN, 1)));
});

test("ácido-base: acidose sem CaT não recomenda ↑Qb", () => {
  const r = R.citrateAcidBase({ ph: 7.25, hco3: 18, ratio: NaN });
  assert.equal(r.code, "acidosis-unknown");
  assert.equal(R.citrateAcidBase({ ph: 7.25, hco3: 18, ratio: 2.7 }).code, "accumulation");
  assert.equal(R.citrateAcidBase({ ph: 7.25, hco3: 18, ratio: 2.1 }).code, "acidosis");
  assert.equal(R.citrateAcidBase({ ph: 7.5, hco3: 30, ratio: NaN }).code, "alkalosis");
  assert.equal(R.citrateAcidBase({ ph: 7.4, hco3: 24, ratio: 2 }).code, "normal");
});

test("bicarbonato no saco: volume exato e Na final", () => {
  const r = R.bagBicarbonate(40, 32);
  close(r.vol, 41.67, 0.01);
  close(r.naFinal, 147.1, 0.05);
  assert.equal(R.bagBicarbonate(30, 32), null);
});

test("NaCl 20% no saco", () => {
  close(R.bagNaCl20(155).vol, 22.96, 0.01);
});

test("receita NaCl 3% = trocar ~110 mL", () => {
  close(R.hypertonicRecipe(), 109.9, 0.1);
  // a receita antiga (105 mL) dá ~497 mEq/L
  close((895 * 154 + 105 * 3422) / 1000, 497.1, 0.1);
});

test("perfusão NaCl 3% para Na efetivo 160 com 1500 mL/h", () => {
  close(R.hyperNaInfusion(160, 1500), 85.0, 0.1); // 20/353 × 1500
});

test("diluição com água: acrescentar vs substituir", () => {
  const r = R.hypoNaBag(110);
  close(r.add, 1363.6, 0.1);
  close(r.replace, 1071.4, 0.1); // a app antiga dava 364 mL
  assert.equal(r.mustReplace, true);
  // verificação: substituir 'replace' mL por água dá Na alvo
  close(140 * (5000 - r.replace) / 5000, 110, 1e-9);
});

test("perfusão Dx5% e carga de glicose", () => {
  const r = R.hypoNaInfusion(115, 2000);
  close(r.rate, 434.8, 0.1);
  close(r.glucoseGh, 21.7, 0.1);
});

test("Michaels: K nunca excede Qb e valores plausíveis", () => {
  const k1 = R.michaels(200, 240, 1000);
  assert.ok(k1 < 200);
  close(k1, 177, 2);
  const k2 = R.michaels(300, 500, 1000);
  close(k2, 262, 3);
  close(R.michaels(200, 200, 1000), 200 * 1000 / 1200, 1e-9);
});

test("dose dialítica HD 4h", () => {
  const d = R.dialysisDose({ qb: 300, qd: 500, koa: 1000, hours: 4, weight: 70 });
  close(d.ktv, d.ktL / (0.55 * 70), 1e-9);
  assert.ok(d.ktv > 1.2 && d.ktv < 2);
});

test("heparina no circuito: intervalo-alvo 1,5–2,0", () => {
  assert.equal(R.heparinCircuitTitration(1.2, 70).action, "up");
  assert.equal(R.heparinCircuitTitration(1.7, 70).action, "keep");
  assert.equal(R.heparinCircuitTitration(2.4, 70).action, "down");
  assert.equal(R.heparinCircuitTitration(1.2, 70).uH, 700);
});
