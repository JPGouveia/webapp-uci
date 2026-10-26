# Registo de alterações

## 0.8.1 — 2026-10-26
- Descrições dos módulos na página inicial encurtadas.

## 0.8.0 — 2026-10-26
- Novo separador **Vancomicina** (protocolo HGO de perfusão contínua, 500 mg/50 cc):
  - Início: carga 1 g (≤ 65 kg) ou 1,5 g (> 65 kg) em 1 h; perfusão pela depuração de creatinina (> 50: 2 g/dia; 20–50: 1,5 g/dia; 10–20: 1 g/dia; < 10: 500 mg/dia; HFVVC: 1 g/dia), em cc/h; Cockcroft-Gault opcional; doseamento 12 h após o início.
  - Ajuste pelos níveis (alvo 20–25 µg/mL): < 15 +500 mg/dia; 15–20 +250 mg/dia; 20–25 manter; 25–30 −500 mg/dia (500 → 250 mg/dia; 250 → parar 6 h); > 30 parar 6 h. Dose atual estimada a partir do ritmo (aproximada aos 250 mg).
  - Vancomicina na lista de diluições (abre o separador próprio).
- Textos removidos: «Escreva a dose ou o ritmo…» (calculadora); «Esquema por peso do serviço», nota de arredondamento e nota da dose atual (heparina); nota de arredondamento/excesso de enchimento (soluções salinas).

## 0.7.0 — 2026-10-26
- TSR: volta a usar mL (mL/min, mL/kg/h, mg/mL, volumes em mL); só os débitos horários ficam em cc/h.
- Soluções salinas: instruções de preparação com volumes arredondados ao cc, ampolas inteiras + resto em cc, e concentração final real com os volumes arredondados.
- Bólus uniformizado: na lista de diluições só aparece quando existe; na calculadora aparece sempre (– se não houver). Bólus que estavam nas notas passaram para o campo próprio (milrinona, labetalol, esmolol, urapidilo, cetamina).
- Noradrenalina: retirada a nota base/tartarato.
- Heparina retirada da calculadora (tem separador próprio); na lista de diluições abre o separador da heparina.

## 0.6.0 — 2026-10-26
### Geral
- Unidades de volume em **cc** (cc/h, cc/min, cc) e glicose 5% como **Dx5%** em toda a app.

### Perfusões
- Retirados o selo «diluição do serviço», as fontes dos intervalos de referência e o aviso da página de diluições (as fontes ficam só no código, campo `fonte`, para rastreabilidade).
- Doses da tabela de perfusões do serviço: noradrenalina em µg/min (1–100); dobutamina 2,5–15; dopamina 2,5–20; nitroprussiato 0,5–10; amiodarona 5–20 µg/kg/min; furosemida 2–40 mg/h; midazolam 0,03–0,2 mg/kg/h; propofol 0,5–4 mg/kg/h; isoprenalina 0,6–20 µg/min; remifentanilo 0,01–0,2 µg/kg/min.
- Bólus / indução visível na calculadora e na lista de diluições (amiodarona, furosemida, midazolam, propofol, alfentanilo, tiopental, atracúrio).
- Novos fármacos: alfentanilo 15 mg/50 cc; tiopental 2000 mg/50 cc; atracúrio 500 mg/50 cc.
- Novo separador **Soluções salinas hipertónicas**: volume final e % de NaCl pretendidos a partir de NaCl 0,9% e NaCl 20% (editáveis); indica o volume a retirar/adicionar, n.º de ampolas, mmol/L e osmolaridade teórica.

## 0.5.0 — 2026-10-26
### Heparina
- Retirado o nomograma em papel (aPTT 50–75 s, mL/h fixos). Fica só o esquema por peso do serviço.

### Perfusões — doses e diluentes
- Levosimendan: 12,5 mg/500 mL G5 (0,025 mg/mL).
- Fentanilo: intervalo de referência 0,5–1,5 µg/kg/h (prática do serviço); aviso acima de 1,5 e alerta acima de 3 µg/kg/h.
- Diluentes revistos segundo o RCM (ex.: vasopressina só SF — RCM Reverpleg; nitroprussiato e levosimendan só G5; amiodarona só G5; furosemida só SF).
- Intervalos de dose revistos segundo guidelines, com a fonte visível na app: SSC 2021 (ESICM/SCCM), ESC 2021 IC aguda, ESC 2019 emergências hipertensivas, ESC 2020 FA, ERC 2021, ESICM 2023 ARDS (bloqueio neuromuscular); PADIS e RCM na sedação/analgesia (a ESICM não tem guideline de doses de sedação).
- Alterações de intervalo: noradrenalina até 1 µg/kg/min; adrenalina 0,05–0,5; dobutamina 2–20; dopamina 3–20; DNI 1–10 mg/h; nitroprussiato 0,3–5 (alerta > 10); labetalol 5–20 mg/h de manutenção (titulação até 240 mg/h); urapidilo 5–40 mg/h; amiodarona 25–50 mg/h (máx. 1,2 g/24 h); propofol 0,3–3 mg/kg/h (alerta > 4); cetamina 0,06–0,12 mg/kg/h (analgesia).

## 0.4.0 — 2026-10-26
### Perfusões — diluições do serviço
- Todas as diluições (quantidade/volume) passam a ser as do serviço e ficam marcadas como validadas.
- Alterações face às propostas iniciais: noradrenalina 10 mg/50 mL; vasopressina 40 U/50 mL; dopamina 400 mg/50 mL; levosimendan 12,5 mg/50 mL (via central); midazolam 150 mg/50 mL; dexmedetomidina 1000 µg/250 mL; fentanilo 500 µg/50 mL; cisatracúrio 150 mg/50 mL; furosemida 100 mg/50 mL.
- Nitroglicerina substituída por dinitrato de isossorbido (DNI) 50 mg/50 mL (dose em mg/h).
- Novo: isoprenalina 1 mg/50 mL (dose em µg/min).
- Nomes em português: urapidilo, fentanilo, remifentanilo; insulina Actrapid.

## 0.3.0 — 2026-10-26
### Heparina não fracionada
- O esquema por peso do serviço (atalho «HNF perfusão») passa a ser o esquema principal:
  - Início: bólus 80 U/kg (arredondado às centenas) + perfusão 18 U/kg/h; aPTT 6 h depois.
  - Ajuste por aPTT (alvo 51–70 s), em U/kg/h a partir do ritmo atual: < 41 bólus (80 U/kg se TVP/TEP/trombo intracardíaco, 40 U/kg nos restantes) e +4; 41–50 +2; 51–70 manter; 71–80 −2; 81–120 parar 30 min e −2; > 120 parar 1 h e −4.
  - Concentração da seringa editável (predefinição 25 000 U/50 mL).
  - Limiares contínuos: o atalho não dava resposta para aPTT entre 50,99–51 e 70,99–71.
- O nomograma em papel (aPTT 50–75 s, mL/h fixos, regra pós-trombólise) mantém-se num separador de consulta.
- TSR: o modo «indicação sistémica» usa o esquema por peso, com dose inicial e ajuste; a anticoagulação só do circuito mantém 5–10 U/kg/h com aPTTr 1,5–2,0 (confirmado).
- Biblioteca: heparina expressa em U/kg/h.
- Confirmados pelo serviço: Biphozyl e compensação de cálcio inicial de 100% no citrato.

## 0.2.0 — 2026-10-26
Reestruturação em app modular (UCI·Calc). O RenalCalc passa a ser o módulo TSR.

### Novo
- Estrutura modular com menu gerado, router por endereço (#/modulo/secção) e página inicial.
- Navegação em telemóvel (menu lateral deslizante). Antes, abaixo de 900 px, o menu desaparecia.
- PWA: instalável e funciona offline. Ícones.
- Recalcula automaticamente a cada alteração (sem botões «Calcular»). Aceita vírgula decimal em todos os dispositivos.
- Peso partilhado entre secções (só em memória).
- **Módulo Perfusões**: calculadora dose ↔ mL/h com conversões e alerta de intervalo, tabela rápida, biblioteca de 25 fármacos e nomograma de heparina do serviço (aPTT 50–75 s, 500 U/mL).
- Testes automáticos das fórmulas (`npm test`).

### Correções no módulo TSR
- Citrato: a prescrição inicial passa a mostrar o débito de Regiocit (PBS = Qb × 10 mL/h a 3 mmol/L), soluções sem cálcio e compensação de Ca inicial; aviso > 135 kg.
- Citrato, ácido-base: em acidose, deixa de recomendar ↑Qb sem a relação CaT/Ca²⁺ (risco de agravar a acumulação). Valores do flashcard do serviço (Qb 10–20%, efluente ~25%).
- Ajuste do Ca sistémico: eliminados os intervalos sem resposta (ex. 0,795; 0,995; 1,305).
- Acrescentado o alerta de compensação de cálcio > 150%.
- Heparina: dois modos — só circuito (aPTTr alvo 1,5–2,0) e indicação sistémica (nomograma do serviço). Antes só se mantinha a dose com aPTTr exatamente 1,5.
- Hiponatrémia: corrigida a fórmula «retirar e repor com água» (ex. Na 110: 1071 mL; antes 364 mL). Mostra a composição do saco após diluição. Limite de 8 mmol/L/24 h no alto risco de desmielinização osmótica. Carga de glicose da Dx5%.
- Hipernatrémia: receita do NaCl 3% corrigida (trocar 110 mL, não 105 mL — 105 mL dava ~497 mmol/L). Volume de NaCl 20% com balanço exato. Sugestão de Na efetivo a partir do Na do doente.
- HCO₃⁻ nos sacos: volume exato, Na⁺ final do saco e aviso de precipitação com cálcio.
- Perfusões externas (NaCl 3%, Dx5%): aviso para aumentar a perda de fluidos no mesmo volume.
- Dose de efluente corrigida para a pré-diluição.
- Tabela de soluções: Mg em mmol/L (não mEq/L); acrescentados lactato e glicose.
- SLED/HD: depuração pela equação de Michaels (KoA do dialisador). Antes assumia K = Qd, o que podia exceder o Qb e sobrestimar o Kt/V. Fator AutoFlow editável.
- SLED: removida a «carga de HCO₃⁻» (unidades erradas, valores sem significado). O campo de risco hemodinâmico, que existia no código mas não na página, passa a funcionar.
- Contraindicações ao citrato identificadas como relativas; aPTT > 60 s.
