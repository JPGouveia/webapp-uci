# UCI·Calc

Ferramentas de apoio à decisão em Medicina Intensiva para uso interno do Serviço de Medicina Intensiva da ULS Almada-Seixal. Funciona no browser do computador e do telemóvel, e pode ser instalada como app (PWA) com funcionamento offline.

> Apoio à decisão. Não substitui o juízo clínico nem os protocolos em vigor.

## Módulos

| Módulo | Secções |
|---|---|
| **Perfusões** | Calculadora dose ↔ cc/h com tabela rápida · Diluições padrão · Heparina (HNF): dose inicial e ajuste por aPTT pelo esquema por peso do serviço · Vancomicina em perfusão contínua (início e ajuste por níveis) · Soluções salinas hipertónicas |
| **TSR** (antigo RenalCalc) | Soluções · Dose de efluente e FF · Anticoagulação (citrato / heparina / sem) · HCO₃⁻ nos sacos · Hipernatrémia · Hiponatrémia · SLED · HD convencional |

## Usar

- **Sem instalar nada:** abrir `index.html` no browser (duplo clique). Tudo funciona, exceto o modo offline/instalação.
- **Servidor local:** `npm start` (ou `python3 -m http.server 8080`) e abrir http://localhost:8080.
- **Telemóvel / equipa:** publicar com GitHub Pages (ver abaixo). No iPhone: Safari → Partilhar → *Adicionar ao ecrã principal*.

## Estrutura

```
index.html                 página única (shell)
manifest.webmanifest       PWA
sw.js                      service worker (offline) — incrementar VERSION a cada alteração
css/style.css              estilos (tema escuro)
js/core/util.js            números pt-PT, campos, separadores, alertas
js/core/app.js             registo de módulos, menu, router (#/modulo/secção)
js/modules/<módulo>/
    <módulo>.calc.js       fórmulas puras (sem DOM) — testadas em Node
    <módulo>.view.js       interface; chama UCI.registerModule({...})
    drugs.js               (perfusões) biblioteca de fármacos e diluições
tests/*.test.js            testes das fórmulas
assets/                    imagens e ícones
```

## Acrescentar um módulo

1. Criar `js/modules/<id>/<id>.calc.js` com as fórmulas (padrão UMD, ver os existentes).
2. Criar `js/modules/<id>/<id>.view.js` com `UCI.registerModule({ id, title, short, icon, description, groups: [{ title, sections: [{ id, title, render(el) {…} }] }] })`.
3. Acrescentar os `<script>` em `index.html` (a ordem define a ordem no menu) e os ficheiros na lista `FILES` de `sw.js`.
4. Escrever testes em `tests/<id>.test.js` e correr `npm test`.

Utilitários úteis em `render(el)`: `UCI.ui.numField`, `selectField`, `results`, `tabs`, `val`, `setText`, `alertBox`, `live(el, update)` (recalcula a cada alteração). O peso introduzido numa secção fica disponível nas outras (`UCI.state.weight`, só em memória — nada é guardado).

## Validar diluições

As diluições em `js/modules/perfusoes/drugs.js` marcadas `validado: false` são propostas iniciais e aparecem na app com a etiqueta **diluição por validar**. Depois de confirmar com o serviço, corrigir os valores e mudar para `validado: true`.

## Testes

```bash
npm test        # node --test (Node ≥ 18, sem dependências)
```

## Publicar (GitHub Pages)

```bash
git init && git add . && git commit -m "UCI·Calc v0.2.0"
git branch -M main
git remote add origin https://github.com/<utilizador>/webapp-uci.git
git push -u origin main
# GitHub → Settings → Pages → Source: main / root
```

Para manter o acesso restrito ao serviço, usar um repositório privado. Atenção: o GitHub Pages a partir de repositórios privados exige plano pago e, mesmo assim, o site publicado fica público, salvo em GitHub Enterprise. Em alternativa, alojar num servidor interno do hospital.

---
© 2025–2026 João Gouveia · SMI, ULS Almada-Seixal
