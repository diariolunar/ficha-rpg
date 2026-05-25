const paginas = {
  dashboard: "pages/dashboard.html",
  campanhas: "pages/campanhas.html",
  mestre: "pages/mestre.html",
  personagens: "pages/personagens.html",
  ficha: "pages/ficha.html",
  sessao: "pages/sessao.html",

  cadastrosRacas: "pages/cadastros/racas.html",
  cadastrosRacaDetalhe: "pages/cadastros/raca-detalhe.html",

  cadastrosClasses: "pages/cadastros/classes.html",
  cadastrosClasseDetalhe: "pages/cadastros/classe-detalhe.html",

  cadastrosSubclasses: "pages/cadastros/subclasses.html",
  cadastrosSubclasseDetalhe: "pages/cadastros/subclasse-detalhe.html",

  cadastrosElementos: "pages/cadastros/elementos.html",
  cadastrosElementoDetalhe: "pages/cadastros/elemento-detalhe.html",

  cadastrosHabilidades: "pages/cadastros/habilidades.html",
  cadastrosHabilidadeDetalhe: "pages/cadastros/habilidade-detalhe.html",

  cadastrosItens: "pages/cadastros/itens.html",
  cadastrosItemDetalhe: "pages/cadastros/item-detalhe.html",

  cadastrosPets: "pages/cadastros/pets.html",
  cadastrosPetDetalhe: "pages/cadastros/pet-detalhe.html",

  cadastrosMonstros: "pages/cadastros/monstros.html",
  cadastrosMonstroDetalhe: "pages/cadastros/monstro-detalhe.html",

  cadastrosBosses: "pages/cadastros/bosses.html",
  cadastrosBossDetalhe: "pages/cadastros/boss-detalhe.html"
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

    if (!resposta.ok) {
      throw new Error(`Página não encontrada: ${paginas[paginaId]}`);
    }

    const html = await resposta.text();

    appContent.innerHTML = html;
    paginaAtual = paginaId;

    atualizarEstadoMenu(paginaId);

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

function atualizarEstadoMenu(paginaId) {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.remove("active");
  });

  document.querySelectorAll(".dropdown-item").forEach((button) => {
    button.classList.remove("active");
  });

  const botaoAtivo = document.querySelector(`[data-page="${paginaId}"]`);

  if (botaoAtivo) {
    botaoAtivo.classList.add("active");
  }

  const dropdown = document.querySelector(".sidebar-dropdown");
  const dropdownToggle = document.getElementById("cadastrosDropdownButton");

  if (paginaId.startsWith("cadastros")) {
    if (dropdown) {
      dropdown.classList.add("open");
    }

    if (dropdownToggle) {
      dropdownToggle.classList.add("active");
    }
  } else {
    if (dropdownToggle) {
      dropdownToggle.classList.remove("active");
    }
  }
}

function alternarDropdownCadastros() {
  const dropdown = document.querySelector(".sidebar-dropdown");

  if (dropdown) {
    dropdown.classList.toggle("open");
  }
}

export function initNavigation() {
  document.querySelectorAll(".nav-btn[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const paginaId = button.getAttribute("data-page");
      navegarPara(paginaId);
    });
  });

  document.querySelectorAll(".dropdown-item[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const paginaId = button.getAttribute("data-page");
      navegarPara(paginaId);
    });
  });

  const dropdownButton = document.getElementById("cadastrosDropdownButton");

  if (dropdownButton) {
    dropdownButton.addEventListener("click", alternarDropdownCadastros);
  }

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