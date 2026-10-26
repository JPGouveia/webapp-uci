/* Biblioteca de fármacos em perfusão contínua (adulto).
 *
 * DILUIÇÕES (quantidade/volume): as do serviço (validadas em 2026-10-26).
 * DILUENTES: segundo o RCM (resumo das características do medicamento).
 * INTERVALOS DE DOSE: tabela de perfusões do serviço; nos restantes, guidelines
 *   (SSC 2021, ESC, ERC; PADIS e RCM na sedação). O campo `fonte` é só para
 *   rastreabilidade interna e NÃO é mostrado na app.
 * Um fármaco novo deve entrar com `validado: false` até ser confirmado pelo serviço.
 *
 * Campos:
 *   id, nome, grupo
 *   quantidade, unidade ("mg" | "mcg" | "U"), volume (cc), diluente
 *   doseUnit      unidade de prescrição (ver DOSE_UNITS em perfusoes.calc.js)
 *   dose          [mín, máx] intervalo de referência na doseUnit
 *   alertaAcima   valor a partir do qual aparece alerta vermelho (opcional)
 *   tabela        doses para a tabela rápida
 *   altUnits      unidades alternativas mostradas como conversão
 *   bolus         bólus / indução (texto, opcional; omitir se não houver)
 *   calculadora   false = não aparece na calculadora (ex.: heparina, com separador próprio)
 *   fonte         origem do intervalo de dose (interno, não mostrado)
 *   notas         lista de notas curtas
 *   validado      diluição confirmada pelo serviço?
 *
 * @author: João Gouveia
 */
(function (root) {
  "use strict";

  const GRUPOS = [
    "Vasopressores e inotrópicos",
    "Anti-hipertensores e antiarrítmicos",
    "Sedação e analgesia",
    "Bloqueio neuromuscular",
    "Outros",
  ];

  const DRUGS = [
    /* ---- Vasopressores e inotrópicos ---- */
    {
      id: "noradrenalina", nome: "Noradrenalina", grupo: GRUPOS[0],
      quantidade: 10, unidade: "mg", volume: 50, diluente: "Dx5% ou SF",
      doseUnit: "mcg/min", dose: [1, 100],
      tabela: [2, 5, 10, 15, 20, 30, 40, 50, 60, 80, 100],
      altUnits: ["mcg/kg/min"],
      fonte: "ESC 2021 (insuficiência cardíaca aguda: até 1 µg/kg/min); SSC 2021",
      notas: [
        "1.ª linha no choque séptico; associar vasopressina quando a noradrenalina (base) atinge 0,25–0,5 µg/kg/min (ver conversão acima).",
        "Via central; periférica só por período curto, em veia proximal à fossa antecubital.",
      ],
      validado: true,
    },
    {
      id: "adrenalina", nome: "Adrenalina", grupo: GRUPOS[0],
      quantidade: 5, unidade: "mg", volume: 50, diluente: "Dx5% ou SF",
      doseUnit: "mcg/kg/min", dose: [0.05, 0.5], alertaAcima: 1,
      tabela: [0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5],
      altUnits: ["mcg/min"],
      fonte: "ESC 2021 (insuficiência cardíaca aguda); SSC 2021",
      notas: ["Associar ou trocar para adrenalina se disfunção cardíaca com hipoperfusão persistente.", "Hiperlactatemia (efeito β2) não implica necessariamente hipoperfusão."],
      validado: true,
    },
    {
      id: "vasopressina", nome: "Vasopressina", grupo: GRUPOS[0],
      quantidade: 40, unidade: "U", volume: 50, diluente: "SF",
      doseUnit: "U/min", dose: [0.01, 0.03], alertaAcima: 0.03,
      tabela: [0.01, 0.015, 0.02, 0.025, 0.03],
      altUnits: ["U/h"],
      fonte: "SSC 2021; RCM Reverpleg (máx. 0,03 U/min fora de emergência)",
      notas: ["Preparação: 2 cc (40 U) em 48 cc de SF = 0,8 U/cc.", "Dose fixa, não titulada ao peso. Iniciar a 0,01 U/min e aumentar a cada 15–20 min.", "Via central."],
      validado: true,
    },
    {
      id: "dobutamina", nome: "Dobutamina", grupo: GRUPOS[0],
      quantidade: 250, unidade: "mg", volume: 50, diluente: "Dx5% ou SF",
      doseUnit: "mcg/kg/min", dose: [2.5, 15], alertaAcima: 20,
      tabela: [2.5, 5, 7.5, 10, 12.5, 15],
      fonte: "ESC 2021 (insuficiência cardíaca aguda); SSC 2021",
      notas: ["Taquiarritmias e hipotensão (vasodilatação β2)."],
      validado: true,
    },
    {
      id: "dopamina", nome: "Dopamina", grupo: GRUPOS[0],
      quantidade: 400, unidade: "mg", volume: 50, diluente: "Dx5% ou SF",
      doseUnit: "mcg/kg/min", dose: [2.5, 20], alertaAcima: 20,
      tabela: [2.5, 5, 7.5, 10, 15, 20],
      fonte: "ESC 2021 (3–5 µg/kg/min inotrópico; > 5 vasopressor)",
      notas: ["Preferir noradrenalina (mais arritmias com dopamina)."],
      validado: true,
    },
    {
      id: "milrinona", nome: "Milrinona", grupo: GRUPOS[0],
      quantidade: 10, unidade: "mg", volume: 50, diluente: "Dx5% ou SF",
      doseUnit: "mcg/kg/min", dose: [0.375, 0.75], alertaAcima: 0.75,
      tabela: [0.25, 0.375, 0.5, 0.625, 0.75],
      fonte: "ESC 2021 (insuficiência cardíaca aguda)",
      bolus: "25–75 µg/kg em 10–20 min",
      notas: ["Reduzir a dose na insuficiência renal (eliminação renal).", "Bólus geralmente omitido em doentes hipotensos.", "Incompatível com furosemida na mesma via."],
      validado: true,
    },
    {
      id: "levosimendan", nome: "Levosimendan", grupo: GRUPOS[0],
      quantidade: 12.5, unidade: "mg", volume: 500, diluente: "Dx5%",
      doseUnit: "mcg/kg/min", dose: [0.05, 0.2], alertaAcima: 0.2,
      tabela: [0.05, 0.1, 0.15, 0.2],
      fonte: "ESC 2021 (0,1 µg/kg/min, ajustável entre 0,05 e 0,2); RCM",
      notas: ["Perfusão de 24 h. Bólus habitualmente omitido em UCI (hipotensão).", "Metabolito ativo com semivida ~80 h.", "Não sugerido no choque séptico."],
      validado: true,
    },
    {
      id: "isoprenalina", nome: "Isoprenalina", grupo: GRUPOS[0],
      quantidade: 1, unidade: "mg", volume: 50, diluente: "Dx5% ou SF",
      doseUnit: "mcg/min", dose: [0.6, 20], alertaAcima: 20,
      tabela: [0.6, 1, 2, 3, 5, 10, 15, 20],
      altUnits: ["mcg/kg/min"],
      fonte: "ERC 2021 (bradicardia: 5 µg/min); RCM (0,01–0,15 µg/kg/min)",
      notas: ["Bradicardia/BAV sintomático como ponte para pacing; torsades de pointes com bradicardia.", "Taquiarritmias, isquemia miocárdica e hipotensão (efeito β2)."],
      validado: true,
    },

    /* ---- Anti-hipertensores e antiarrítmicos ---- */
    {
      id: "dni", nome: "Dinitrato de isossorbido (DNI)", grupo: GRUPOS[1],
      quantidade: 50, unidade: "mg", volume: 50, diluente: "SF ou Dx5%",
      doseUnit: "mg/h", dose: [1, 10], alertaAcima: 10,
      tabela: [1, 2, 3, 4, 6, 8, 10],
      altUnits: ["mcg/min"],
      fonte: "ESC 2021 (insuficiência cardíaca aguda: iniciar 1 mg/h, até 10 mg/h)",
      notas: ["Usar sistema sem PVC (adsorção).", "Tolerância com perfusão contínua prolongada.", "Contraindicado com inibidores da PDE5 (sildenafil, tadalafil)."],
      validado: true,
    },
    {
      id: "nitroprussiato", nome: "Nitroprussiato de sódio", grupo: GRUPOS[1],
      quantidade: 50, unidade: "mg", volume: 50, diluente: "Dx5% (só Dx5%)",
      doseUnit: "mcg/kg/min", dose: [0.5, 10], alertaAcima: 10,
      tabela: [0.5, 1, 2, 3, 5, 8, 10],
      fonte: "ESC 2021 (IC aguda: 0,3–5 µg/kg/min); ESC 2019 emergências hipertensivas (até 10 µg/kg/min)",
      notas: ["Proteger da luz.", "Aumentar 0,5 µg/kg/min a cada 5 min até ao alvo.", "Risco de toxicidade por cianeto/tiocianato com doses elevadas, perfusões prolongadas ou insuficiência renal/hepática."],
      validado: true,
    },
    {
      id: "labetalol", nome: "Labetalol", grupo: GRUPOS[1],
      quantidade: 200, unidade: "mg", volume: 40, diluente: "puro (5 mg/cc)",
      doseUnit: "mg/h", dose: [5, 20], alertaAcima: 240,
      tabela: [5, 10, 15, 20, 60, 120, 180, 240],
      altUnits: ["mg/min"],
      fonte: "ESC 2019 emergências hipertensivas",
      bolus: "0,25–0,5 mg/kg",
      notas: ["Titulação 2–4 mg/min (120–240 mg/h) até ao alvo; manutenção 5–20 mg/h.", "Contraindicado em bradicardia, BAV, asma, IC descompensada."],
      validado: true,
    },
    {
      id: "esmolol", nome: "Esmolol", grupo: GRUPOS[1],
      quantidade: 2500, unidade: "mg", volume: 250, diluente: "pronto a usar (10 mg/cc)",
      doseUnit: "mcg/kg/min", dose: [50, 300], alertaAcima: 300,
      tabela: [50, 100, 150, 200, 250, 300],
      fonte: "ESC 2019 emergências hipertensivas",
      bolus: "0,5–1 mg/kg",
      notas: ["Semivida ~9 min."],
      validado: true,
    },
    {
      id: "urapidil", nome: "Urapidilo", grupo: GRUPOS[1],
      quantidade: 100, unidade: "mg", volume: 50, diluente: "SF ou Dx5%",
      doseUnit: "mg/h", dose: [5, 40], alertaAcima: 40,
      tabela: [5, 9, 15, 20, 30, 40],
      fonte: "ESC 2019 emergências hipertensivas",
      bolus: "12,5–25 mg",
      notas: ["Dose de manutenção média ~9 mg/h."],
      validado: true,
    },
    {
      id: "amiodarona", nome: "Amiodarona", grupo: GRUPOS[1],
      quantidade: 600, unidade: "mg", volume: 50, diluente: "Dx5% (não usar SF)",
      doseUnit: "mcg/kg/min", dose: [5, 20], alertaAcima: 20,
      tabela: [5, 7.5, 10, 12.5, 15, 20],
      altUnits: ["mg/h", "mg/24h"],
      fonte: "ESC 2020 fibrilhação auricular (carga 5–7 mg/kg em 1–2 h; depois 50 mg/h, máx. 1,2 g/24 h)",
      bolus: "300 mg em 100 cc de Dx5% em 30 min",
      notas: ["Via central (concentração > 2 mg/cc: flebite).", "Confirmar a dose diária total (conversão em mg/24 h).", "Monitorizar QT, função tiroideia e hepática."],
      validado: true,
    },

    /* ---- Sedação e analgesia ---- */
    {
      id: "propofol", nome: "Propofol 2%", grupo: GRUPOS[2],
      quantidade: 1000, unidade: "mg", volume: 50, diluente: "puro (20 mg/cc)",
      doseUnit: "mg/kg/h", dose: [0.5, 4], alertaAcima: 4,
      tabela: [0.5, 1, 1.5, 2, 2.5, 3, 4],
      altUnits: ["mg/h"],
      fonte: "PADIS (5–50 µg/kg/min); RCM (máx. 4 mg/kg/h)",
      bolus: "1–2 mg/kg",
      notas: ["> 4 mg/kg/h ou perfusões prolongadas: risco de síndrome de infusão do propofol (PRIS).", "Aporte lipídico: 1,1 kcal/cc — contabilizar na nutrição.", "Trocar seringa e sistema a cada 12 h."],
      validado: true,
    },
    {
      id: "midazolam", nome: "Midazolam", grupo: GRUPOS[2],
      quantidade: 150, unidade: "mg", volume: 50, diluente: "SF ou Dx5%",
      doseUnit: "mg/kg/h", dose: [0.03, 0.2],
      tabela: [0.03, 0.05, 0.075, 0.1, 0.15, 0.2],
      altUnits: ["mg/h"],
      fonte: "PADIS",
      bolus: "0,03–0,10 mg/kg (lento)",
      notas: ["Acumulação na insuficiência renal (metabolito ativo) e hepática.", "Preferir propofol ou dexmedetomidina a benzodiazepinas."],
      validado: true,
    },
    {
      id: "dexmedetomidina", nome: "Dexmedetomidina", grupo: GRUPOS[2],
      quantidade: 1000, unidade: "mcg", volume: 250, diluente: "SF ou Dx5%",
      doseUnit: "mcg/kg/h", dose: [0.2, 1.4], alertaAcima: 1.4,
      tabela: [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4],
      fonte: "RCM (máx. 1,4 µg/kg/h); PADIS",
      notas: ["Sem bólus (hipotensão/bradicardia).", "Bradicardia e hipotensão dose-dependentes."],
      validado: true,
    },
    {
      id: "fentanil", nome: "Fentanilo", grupo: GRUPOS[2],
      quantidade: 500, unidade: "mcg", volume: 50, diluente: "SF ou Dx5%",
      doseUnit: "mcg/kg/h", dose: [0.5, 1.5], alertaAcima: 3,
      tabela: [0.25, 0.5, 0.75, 1, 1.25, 1.5],
      altUnits: ["mcg/h"],
      fonte: "Prática do serviço (até 1,5 µg/kg/h); PADIS admite 0,7–10 µg/kg/h",
      notas: ["Acima de 1,5 µg/kg/h: fora da prática habitual do serviço — reavaliar analgesia multimodal.", "Lipofílico: acumula em perfusões prolongadas (semivida contexto-dependente)."],
      validado: true,
    },
    {
      id: "remifentanil", nome: "Remifentanilo", grupo: GRUPOS[2],
      quantidade: 5, unidade: "mg", volume: 50, diluente: "SF ou Dx5%",
      doseUnit: "mcg/kg/min", dose: [0.01, 0.2],
      tabela: [0.025, 0.05, 0.075, 0.1, 0.15, 0.2],
      altUnits: ["mcg/kg/h"],
      fonte: "PADIS",
      notas: ["Metabolismo por esterases plasmáticas: sem acumulação na falência renal/hepática.", "Hiperalgesia e ausência de analgesia residual após suspensão."],
      validado: true,
    },
    {
      id: "alfentanilo", nome: "Alfentanilo", grupo: GRUPOS[2],
      quantidade: 15, unidade: "mg", volume: 50, diluente: "SF ou Dx5%",
      doseUnit: "mcg/kg/h", dose: [6, 30],
      tabela: [6, 10, 15, 20, 25, 30],
      altUnits: ["mg/h"],
      bolus: "10–15 µg/kg",
      fonte: "Serviço",
      notas: ["Metabolismo hepático (CYP3A4): interações com macrólidos e azóis."],
      validado: true,
    },
    {
      id: "morfina", nome: "Morfina", grupo: GRUPOS[2],
      quantidade: 50, unidade: "mg", volume: 50, diluente: "SF ou Dx5%",
      doseUnit: "mg/h", dose: [2, 30], alertaAcima: 30,
      tabela: [1, 2, 3, 5, 7.5, 10],
      fonte: "PADIS",
      notas: ["Metabolito ativo (M6G) acumula na insuficiência renal.", "Libertação de histamina: hipotensão."],
      validado: true,
    },
    {
      id: "cetamina", nome: "Cetamina", grupo: GRUPOS[2],
      quantidade: 500, unidade: "mg", volume: 50, diluente: "SF ou Dx5%",
      doseUnit: "mg/kg/h", dose: [0.06, 0.12], alertaAcima: 1,
      tabela: [0.06, 0.1, 0.12, 0.25, 0.5, 1],
      altUnits: ["mcg/kg/min", "mg/h"],
      fonte: "PADIS (adjuvante analgésico: 1–2 µg/kg/min após bólus de 0,5 mg/kg)",
      bolus: "0,5 mg/kg",
      notas: ["Doses superiores (sedação, broncodilatação) estão fora do intervalo analgésico."],
      validado: true,
    },
    {
      id: "tiopental", nome: "Tiopental", grupo: GRUPOS[2],
      quantidade: 2000, unidade: "mg", volume: 50, diluente: "água para injetáveis ou SF",
      doseUnit: "mg/kg/h", dose: [1, 8],
      tabela: [1, 2, 3, 4, 5, 6, 8],
      altUnits: ["mg/h"],
      bolus: "5–12 mg/kg",
      fonte: "Serviço",
      notas: ["Solução muito alcalina: via central exclusiva e linha dedicada (incompatível com muitos fármacos).", "Acumulação e recuperação prolongada em perfusões longas. Hipotensão frequente."],
      validado: true,
    },

    /* ---- Bloqueio neuromuscular ---- */
    {
      id: "rocuronio", nome: "Rocurónio", grupo: GRUPOS[3],
      quantidade: 500, unidade: "mg", volume: 50, diluente: "puro (10 mg/cc)",
      doseUnit: "mg/kg/h", dose: [0.3, 0.6],
      tabela: [0.3, 0.4, 0.5, 0.6],
      altUnits: ["mg/h"],
      fonte: "RCM (manutenção em UCI)",
      notas: ["Não usar perfusão contínua de rotina no ARDS moderado-grave.", "Monitorizar com TOF (alvo 1–2/4). Garantir sedação profunda."],
      validado: true,
    },
    {
      id: "atracurio", nome: "Atracúrio", grupo: GRUPOS[3],
      quantidade: 500, unidade: "mg", volume: 50, diluente: "puro (10 mg/cc)",
      doseUnit: "mcg/kg/min", dose: [5, 10],
      tabela: [5, 6, 7, 8, 9, 10],
      altUnits: ["mg/h"],
      bolus: "0,3–0,6 mg/kg",
      fonte: "Serviço",
      notas: ["Eliminação de Hofmann e por esterases: independente da função renal/hepática.", "Libertação de histamina (hipotensão, broncospasmo). Monitorizar com TOF."],
      validado: true,
    },
    {
      id: "cisatracurio", nome: "Cisatracúrio", grupo: GRUPOS[3],
      quantidade: 150, unidade: "mg", volume: 50, diluente: "SF ou Dx5%",
      doseUnit: "mcg/kg/min", dose: [1, 3], alertaAcima: 10,
      tabela: [1, 1.5, 2, 2.5, 3],
      altUnits: ["mg/h"],
      fonte: "RCM (UCI: média 3 µg/kg/min, intervalo 0,5–10)",
      notas: ["Não usar perfusão contínua de rotina no ARDS moderado-grave.", "Eliminação de Hofmann: independente da função renal/hepática. Monitorizar com TOF."],
      validado: true,
    },

    /* ---- Outros ---- */
    {
      id: "insulina", nome: "Insulina rápida (Actrapid)", grupo: GRUPOS[4],
      quantidade: 50, unidade: "U", volume: 50, diluente: "SF",
      doseUnit: "U/h", dose: [0.5, 10], alertaAcima: 15,
      tabela: [0.5, 1, 2, 3, 4, 6, 8, 10],
      fonte: "Protocolo de insulina do serviço; SSC 2021 (iniciar se glicemia ≥ 180 mg/dL; alvo 144–180 mg/dL)",
      notas: ["Titular pelo protocolo do serviço.", "Monitorizar K⁺ e glicemia capilar."],
      validado: true,
    },
    {
      id: "heparina", nome: "Heparina não fracionada", grupo: GRUPOS[4],
      quantidade: 25000, unidade: "U", volume: 50, diluente: "SF",
      doseUnit: "U/kg/h", dose: [10, 25], alertaAcima: 30,
      tabela: [10, 12, 14, 16, 18, 20, 22, 24],
      altUnits: ["U/h"],
      fonte: "Esquema por peso do serviço",
      bolus: "80 U/kg (ver separador Heparina)",
      notas: ["Concentração do protocolo do serviço (500 U/cc).", "Início: bólus 80 U/kg + 18 U/kg/h; ajustar por aPTT (alvo 51–70 s) em «Heparina (HNF)».", "Anticoagulação só do circuito de TSR: 5–10 U/kg/h."],
      calculadora: false, // tem separador próprio
      validado: true,
    },
    {
      id: "vancomicina", nome: "Vancomicina", grupo: GRUPOS[4],
      quantidade: 500, unidade: "mg", volume: 50, diluente: "SF ou Dx5%",
      doseUnit: "mg/24h", dose: [500, 2000],
      tabela: [250, 500, 1000, 1500, 2000, 2500],
      altUnits: ["mg/h"],
      bolus: "1 g (≤ 65 kg) ou 1,5 g (> 65 kg) em 1 h",
      fonte: "Protocolo HGO — vancomicina em perfusão contínua",
      notas: ["Dose pela depuração de creatinina; ajuste pelos níveis (alvo 20–25 µg/mL) no separador Vancomicina."],
      calculadora: false, // tem separador próprio
      validado: true,
    },
    {
      id: "furosemida", nome: "Furosemida", grupo: GRUPOS[4],
      quantidade: 100, unidade: "mg", volume: 50, diluente: "SF (não usar Dx5%)",
      doseUnit: "mg/h", dose: [2, 40], alertaAcima: 40,
      tabela: [2, 5, 10, 20, 30, 40],
      altUnits: ["mg/24h"],
      fonte: "RCM; ESC 2021 (IC aguda: bólus ou perfusão, ajustar à resposta diurética)",
      bolus: "20–40 mg",
      notas: ["Proteger da luz.", "Precipita em soluções ácidas (glicose). Incompatível com milrinona na mesma via.", "Ototoxicidade com doses elevadas/rápidas."],
      validado: true,
    },
  ];

  const api = { GRUPOS, DRUGS, byId: (id) => DRUGS.find((d) => d.id === id) };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else ((root.UCI = root.UCI || {}).data = root.UCI.data || {}).drugs = api;
})(typeof window !== "undefined" ? window : globalThis);
