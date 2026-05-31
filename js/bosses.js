import { criarCadastroCrud } from "./cadastroCrud.js";
import { onPageLoaded } from "./navigation.js";

let abaBossAtiva = "todos";
let observerListaBosses = null;

const crud = criarCadastroCrud({
  colecao: "bosses",
  nomeSingular: "Boss",
  nomePlural: "Bosses",
  paginaLista: "cadastrosBosses",
  paginaDetalhe: "cadastrosBossDetalhe",
  formContainerId: "formBosses",
  listaId: "listaBosses",
  detalheContainerId: "bossDetalheContainer",
  botaoSalvarId: "salvarBoss",

  camposPrincipais: [
    "categoriaBoss",
    "titulo",
    "tipo",
    "rankNivelAmeaca",
    "hp",
    "mana",
    "fatorMedo"
  ],

  camposResumo: [
    "categoriaBoss",
    "titulo",
    "rankNivelAmeaca",
    "hp",
    "mana"
  ],

  camposCard: [
    "ultimate",
    "condicaoVitoria",
    "xpRecompensa"
  ],

  campos: [
    {
      nome: "nome",
      label: "Nome do Boss",
      tipo: "text",
      placeholder: "Ex: Dragão Ancestral, Rei Devorador..."
    },
    {
      nome: "categoriaBoss",
      label: "Divisão do Boss",
      tipo: "select",
      opcoes: [
        { valor: "historia", nome: "Boss de História" },
        { valor: "farm", nome: "Boss de Farm" }
      ]
    },
    {
      nome: "titulo",
      label: "Título",
      tipo: "text",
      placeholder: "Ex: O Senhor das Cinzas, A Rainha do Abismo..."
    },
    {
      nome: "tipo",
      label: "Tipo",
      tipo: "text",
      placeholder: "Ex: Dragão, Demônio, Lorde Vampiro, Deus antigo..."
    },
    {
      nome: "rankNivelAmeaca",
      label: "Rank / Nível de Ameaça",
      tipo: "text",
      placeholder: "Ex: Rank S, Nível 20, Ameaça Mundial..."
    },
    {
      nome: "hp",
      label: "HP",
      tipo: "number",
      placeholder: "Ex: 500"
    },
    {
      nome: "mana",
      label: "Mana",
      tipo: "number",
      placeholder: "Ex: 300"
    },
    {
      nome: "forcaFisica",
      label: "Força Física",
      tipo: "number",
      placeholder: "Ex: 30"
    },
    {
      nome: "forcaMagica",
      label: "Força Mágica",
      tipo: "number",
      placeholder: "Ex: 40"
    },
    {
      nome: "defesaFisica",
      label: "Defesa Física",
      tipo: "number",
      placeholder: "Ex: 25"
    },
    {
      nome: "defesaMagica",
      label: "Defesa Mágica",
      tipo: "number",
      placeholder: "Ex: 35"
    },
    {
      nome: "velocidade",
      label: "Velocidade",
      tipo: "number",
      placeholder: "Ex: 18"
    },
    {
      nome: "resistencia",
      label: "Resistência",
      tipo: "number",
      placeholder: "Ex: 40"
    },
    {
      nome: "fatorMedo",
      label: "Fator Medo",
      tipo: "text",
      placeholder: "Ex: +5 em testes de intimidação/terror"
    },
    {
      nome: "inteligencia",
      label: "Inteligência",
      tipo: "text",
      placeholder: "Ex: Estratégica, Genial, Instintiva..."
    },
    {
      nome: "fasesCombate",
      label: "Fases de Combate",
      tipo: "textarea",
      placeholder: "Explique as fases do boss e quando mudam..."
    },
    {
      nome: "ataques",
      label: "Ataques",
      tipo: "textarea",
      placeholder: "Liste ataques comuns, especiais e padrões..."
    },
    {
      nome: "habilidadesEspeciais",
      label: "Habilidades Especiais",
      tipo: "multi",
      colecao: "habilidades",
      mensagemVazia: "Nenhuma habilidade cadastrada"
    },
    {
      nome: "ultimate",
      label: "Ultimate",
      tipo: "textarea",
      placeholder: "Descreva a habilidade suprema do boss..."
    },
    {
      nome: "invocacoes",
      label: "Invocações",
      tipo: "multi",
      colecao: "monstros",
      mensagemVazia: "Nenhum monstro cadastrado"
    },
    {
      nome: "fraquezas",
      label: "Fraquezas",
      tipo: "textarea",
      placeholder: "Ex: Luz, gelo, armas sagradas, ponto fraco..."
    },
    {
      nome: "resistencias",
      label: "Resistências",
      tipo: "textarea",
      placeholder: "Ex: Trevas, fogo, veneno, dano físico..."
    },
    {
      nome: "condicaoVitoria",
      label: "Condição de Vitória",
      tipo: "textarea",
      placeholder: "Ex: Destruir núcleo, sobreviver 5 turnos, zerar HP..."
    },
    {
      nome: "drops",
      label: "Drops",
      tipo: "textarea",
      placeholder: "Ex: Artefato lendário, runas, partes raras..."
    },
    {
      nome: "xpRecompensa",
      label: "XP / Recompensa",
      tipo: "textarea",
      placeholder: "Ex: 5000 XP, item único, avanço de história..."
    }
  ]
});

export function iniciarBosses() {
  crud.iniciar();
}

export function pararBosses() {
  crud.parar();

  if (observerListaBosses) {
    observerListaBosses.disconnect();
    observerListaBosses = null;
  }
}

export function initBosses() {
  crud.init();

  onPageLoaded((pagina) => {
    if (pagina === "cadastrosBosses") {
      aplicarEstilosAbasBosses();
      vincularAbasBosses();
      observarListaBosses();
      aplicarFiltroAbaBosses();
    }
  });
}

function vincularAbasBosses() {
  document.querySelectorAll(".boss-tab-button").forEach((botao) => {
    botao.addEventListener("click", () => {
      abaBossAtiva = botao.dataset.bossTab || "todos";
      atualizarVisualAbasBosses();
      aplicarFiltroAbaBosses();
    });
  });

  atualizarVisualAbasBosses();
}

function atualizarVisualAbasBosses() {
  document.querySelectorAll(".boss-tab-button").forEach((botao) => {
    const ativo = botao.dataset.bossTab === abaBossAtiva;
    botao.classList.toggle("active", ativo);
  });
}

function observarListaBosses() {
  const lista = document.getElementById("listaBosses");

  if (!lista) return;

  if (observerListaBosses) {
    observerListaBosses.disconnect();
    observerListaBosses = null;
  }

  observerListaBosses = new MutationObserver(() => {
    aplicarFiltroAbaBosses();
  });

  observerListaBosses.observe(lista, {
    childList: true,
    subtree: true
  });
}

function aplicarFiltroAbaBosses() {
  const lista = document.getElementById("listaBosses");

  if (!lista) return;

  const cards = Array.from(lista.querySelectorAll(".resource-card"));
  const avisoExistente = lista.querySelector(".boss-tab-empty-state");

  if (avisoExistente) {
    avisoExistente.remove();
  }

  if (!cards.length) return;

  let visiveis = 0;

  cards.forEach((card) => {
    const texto = normalizarTexto(card.textContent || "");
    const categoria = identificarCategoriaBoss(texto);

    const deveMostrar =
      abaBossAtiva === "todos" ||
      abaBossAtiva === categoria;

    card.style.display = deveMostrar ? "" : "none";

    if (deveMostrar) {
      visiveis += 1;
    }
  });

  if (visiveis === 0) {
    const aviso = document.createElement("div");
    aviso.className = "empty-state boss-tab-empty-state";

    aviso.innerHTML = `
      <h3>Nenhum boss encontrado nesta aba.</h3>
      <p>Cadastre um boss nesta divisão ou altere o filtro para visualizar outros registros.</p>
    `;

    lista.appendChild(aviso);
  }
}

function identificarCategoriaBoss(textoNormalizado) {
  if (
    textoNormalizado.includes("boss de historia") ||
    textoNormalizado.includes("divisao do boss historia") ||
    textoNormalizado.includes("categoria boss historia")
  ) {
    return "historia";
  }

  if (
    textoNormalizado.includes("boss de farm") ||
    textoNormalizado.includes("divisao do boss farm") ||
    textoNormalizado.includes("categoria boss farm")
  ) {
    return "farm";
  }

  return "outro";
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function aplicarEstilosAbasBosses() {
  if (document.getElementById("bossTabsStyles")) return;

  const style = document.createElement("style");
  style.id = "bossTabsStyles";

  style.textContent = `
    .boss-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
      padding: 8px;
      border-radius: 18px;
      background: rgba(255,255,255,0.035);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .boss-tab-button {
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.045);
      color: rgba(255,255,255,0.72);
      border-radius: 14px;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 900;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .boss-tab-button:hover {
      background: rgba(255,255,255,0.08);
      color: #fff;
      transform: translateY(-1px);
    }

    .boss-tab-button.active {
      color: #fff;
      background: linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.07));
      border-color: rgba(255,255,255,0.24);
      box-shadow: 0 10px 28px rgba(0,0,0,0.24);
    }

    @media (max-width: 640px) {
      .boss-tabs {
        display: grid;
        grid-template-columns: 1fr;
      }

      .boss-tab-button {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}