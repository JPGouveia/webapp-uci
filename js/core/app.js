/* UCI·Calc — registo de módulos, navegação e router (hash)
 *
 * Para acrescentar um módulo:
 *   1. criar js/modules/<id>/<id>.calc.js (fórmulas puras, testáveis em Node)
 *   2. criar js/modules/<id>/<id>.view.js que chama UCI.registerModule({...})
 *   3. acrescentar os <script> em index.html e os ficheiros em sw.js
 *
 * Estrutura de um módulo:
 *   {
 *     id: "renal", title: "Técnicas de Substituição Renal", short: "TSR",
 *     icon: "💧", description: "…",
 *     groups: [
 *       { title: "Técnicas contínuas", sections: [
 *           { id: "solucoes", title: "Composição das soluções", render(el) { … } }
 *       ]}
 *     ]
 *   }
 * @author: João Gouveia
 */
(function () {
  "use strict";

  const UCI = (window.UCI = window.UCI || {});
  const modules = [];

  UCI.registerModule = function (mod) {
    modules.push(mod);
  };

  UCI.config = {
    appName: "UCI·Calc",
    subtitle: "Ferramentas de apoio em Medicina Intensiva",
    footer: "Serviço de Medicina Intensiva<br>ULS Almada-Seixal<br>© 2025–2026 JG",
    disclaimer: "Apoio à decisão para uso interno. Não substitui o juízo clínico nem os protocolos em vigor.",
  };

  /* ---------- Router ---------- */

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "");
    const [modId, secId] = h.split("/");
    return { modId: modId || "", secId: secId || "" };
  }

  function findSection(mod, secId) {
    for (const g of mod.groups) for (const s of g.sections) if (s.id === secId) return { group: g, section: s };
    return null;
  }

  function firstSection(mod) {
    return mod.groups[0].sections[0];
  }

  /* ---------- Navegação ---------- */

  function buildNav() {
    const nav = document.getElementById("nav");
    nav.innerHTML =
      `<a class="nav-home" href="#/">Início</a>` +
      modules
        .map(
          (m) => `
        <div class="nav-module" data-module="${m.id}">
          <button type="button" class="nav-module-btn" data-module="${m.id}">
            <span class="nav-icon" aria-hidden="true">${m.icon || "•"}</span>${m.title}
          </button>
          <div class="nav-module-body">
            ${m.groups
              .map(
                (g) => `
              ${g.title ? `<div class="nav-group-title">${g.title}</div>` : ""}
              ${g.sections.map((s) => `<a class="nav-link" href="#/${m.id}/${s.id}" data-sec="${m.id}/${s.id}">${s.title}</a>`).join("")}`
              )
              .join("")}
          </div>
        </div>`
        )
        .join("");

    nav.addEventListener("click", (e) => {
      const btn = e.target.closest(".nav-module-btn");
      if (btn) {
        const wrap = btn.parentElement;
        const open = wrap.classList.contains("open");
        nav.querySelectorAll(".nav-module").forEach((w) => w.classList.remove("open"));
        if (!open) wrap.classList.add("open");
        return;
      }
      if (e.target.closest("a")) closeDrawer();
    });
  }

  function updateNav(modId, secId) {
    document.querySelectorAll(".nav-link").forEach((a) =>
      a.classList.toggle("active", a.dataset.sec === `${modId}/${secId}`)
    );
    document.querySelectorAll(".nav-module").forEach((w) => {
      if (w.dataset.module === modId) w.classList.add("open");
    });
    document.querySelector(".nav-home").classList.toggle("active", !modId);
  }

  /* ---------- Drawer (telemóvel) ---------- */

  function openDrawer() {
    document.body.classList.add("drawer-open");
    document.getElementById("menuBtn").setAttribute("aria-expanded", "true");
  }
  function closeDrawer() {
    document.body.classList.remove("drawer-open");
    document.getElementById("menuBtn").setAttribute("aria-expanded", "false");
  }

  /* ---------- Render ---------- */

  function renderHome(view) {
    document.title = UCI.config.appName;
    document.getElementById("topTitle").textContent = UCI.config.appName;
    view.innerHTML = `
      <section class="section">
        <h2>${UCI.config.appName}</h2>
        <p class="section-description">${UCI.config.subtitle}</p>
        <div class="module-grid">
          ${modules
            .map(
              (m) => `
            <a class="module-card" href="#/${m.id}/${firstSection(m).id}">
              <span class="module-icon" aria-hidden="true">${m.icon || "•"}</span>
              <span class="module-title">${m.title}</span>
              <span class="module-desc">${m.description || ""}</span>
            </a>`
            )
            .join("")}
        </div>
        <p class="hint">${UCI.config.disclaimer}</p>
      </section>`;
  }

  function renderSection(view, mod, found) {
    const { group, section } = found;
    document.title = `${section.title} · ${UCI.config.appName}`;
    document.getElementById("topTitle").textContent = mod.short || mod.title;
    view.innerHTML = `
      <section class="section">
        <nav class="crumbs"><a href="#/">Início</a> › <span>${mod.title}</span>${group.title ? ` › <span>${group.title}</span>` : ""}</nav>
        <div id="sectionBody"></div>
      </section>`;
    const body = view.querySelector("#sectionBody");
    try {
      section.render(body);
      UCI.ui.bindTabs(body);
    } catch (err) {
      console.error(err);
      body.innerHTML = `<div class="alert alert-danger">Erro ao abrir esta secção: ${UCI.ui.esc(err.message)}</div>`;
    }
  }

  function route() {
    const view = document.getElementById("view");
    const { modId, secId } = parseHash();
    const mod = modules.find((m) => m.id === modId);

    if (!mod) {
      renderHome(view);
      updateNav("", "");
    } else {
      let found = findSection(mod, secId);
      if (!found) {
        location.replace(`#/${mod.id}/${firstSection(mod).id}`);
        return;
      }
      renderSection(view, mod, found);
      updateNav(mod.id, found.section.id);
    }
    document.getElementById("main").scrollTop = 0;
    window.scrollTo(0, 0);
  }

  /* ---------- Arranque ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("appName").textContent = UCI.config.appName;
    document.getElementById("appSubtitle").textContent = UCI.config.subtitle;
    document.getElementById("footerNote").innerHTML = UCI.config.footer;

    buildNav();
    document.getElementById("menuBtn").addEventListener("click", () =>
      document.body.classList.contains("drawer-open") ? closeDrawer() : openDrawer()
    );
    document.getElementById("scrim").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => e.key === "Escape" && closeDrawer());

    window.addEventListener("hashchange", route);
    route();

    // PWA: só funciona servido por http(s) (GitHub Pages, servidor local).
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW:", e));
    }
  });
})();
