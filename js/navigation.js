const paginas = {
  dashboard: "pages/dashboard.html",
  campanhas: "pages/campanhas.html",
  mestre: "pages/mestre.html",
  personagens: "pages/personagens.html",
  cadastros: "pages/cadastros.html",
  ficha: "pages/ficha.html",
  sessao: "pages/sessao.html"
};

let paginaAtual = "dashboard";
const callbacksPageLoaded = [];

export function onPageLoaded(callback) {
  callbacksPageLoaded.push(callback);
}

export async function navegarPara(paginaId) {
  const appContent = document.getElementById("appContent");

  if (!appContent || !paginas[paginaId]) return;

  try {
    const resposta = await fetch(paginas[paginaId]);
    const html = await resposta.text();

    appContent.innerHTML = html;
    paginaAtual = paginaId;

    document.querySelectorAll(".nav-btn").forEach((button) => {
      button.classList.remove("active");
    });

    const botaoAtivo = document.querySelector(`[data-page="${paginaId}"]`);

    if (botaoAtivo) {
      botaoAtivo.classList.add("active");
    }

    callbacksPageLoaded.forEach((callback) => callback(paginaId));
  } catch (erro) {
    console.error("Erro ao carregar página:", erro);
    appContent.innerHTML = `
      <section class="page">
        <div class="page-header">
          <h2>Erro</h2>
          <p>Não foi possível carregar esta página.</p>
        </div>
      </section>
    `;
  }
}

export function initNavigation() {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const paginaId = button.getAttribute("data-page");
      navegarPara(paginaId);
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-page-target]");

    if (target) {
      const paginaId = target.getAttribute("data-page-target");
      navegarPara(paginaId);
    }
  });
}

export function getPaginaAtual() {
  return paginaAtual;
}