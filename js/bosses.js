import { criarCadastroCrud } from "./cadastroCrud.js";
import { onPageLoaded } from "./navigation.js";

let abaBossAtiva = "todos";
let intervaloFiltroBosses = null;
let intervaloCondicionalBosses = null;

const ranksBoss = [
  { valor: "baixo", nome: "Baixo" },
  { valor: "medio", nome: "Médio" },
  { valor: "alto", nome: "Alto" },
  { valor: "elite", nome: "Elite" },
  { valor: "rank_c", nome: "Rank C" },
  { valor: "rank_b", nome: "Rank B" },
  { valor: "rank_a", nome: "Rank A" },
  { valor: "rank_s", nome: "Rank S" },
  { valor: "mundial", nome: "Ameaça Mundial" },
  { valor: "divino", nome: "Divino" }
];

const divisoesBoss = [
  { valor: "historia", nome: "Boss de História" },
  { valor: "farm", nome: "Boss de Farm" }
];

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
    "turnosReaparecimentoFarm",
    "titulo",
    "tipo",
    "rankNivelAmeaca",
    "hp",
    "mana",
    "fatorMedo"
  ],

  camposResumo: [
    "categoriaBoss",
    "turnosReaparecimentoFarm",
    "titulo",
    "rankNivelAmeaca",
    "hp",
    "mana"
  ],

  camposCard: [
    "historia",
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
      opcoes: divisoesBoss
    },
    {
      nome: "turnosReaparecimentoFarm",
      label: "Turnos para reaparecer",
      tipo: "number",
      placeholder: "Ex: 5. Usado apenas para Boss de Farm."
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
      tipo: "select",
      opcoes: ranksBoss
    },
    {
      nome: "historia",
      label: "História",
      tipo: "textarea",
      placeholder: "Conte a origem, importância narrativa e papel desse boss na campanha..."
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
      nome: "forca",
      label: "Força",
      tipo: "number",
      placeholder: "Ex: 30"
    },
    {
      nome: "magia",
      label: "Magia",
      tipo: "number",
      placeholder: "Ex: 40"
    },
    {
      nome: "defesa",
      label: "Defesa",
      tipo: "number",
      placeholder: "Ex: 25"
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
      filtro: {
        campo: "categoria",
        valor: "monstro"
      },
      mensagemVazia: "Nenhuma habilidade exclusiva de monstros cadastrada"
    },
    {
      nome: "ultimate",
      label: "Ultimate",
      tipo: "select",
      colecao: "habilidades",
      filtro: {
        campo: "categoria",
        valor: "ultimate"
      },
      mensagemVazia: "Nenhuma habilidade ultimate cadastrada"
    },
    {
      nome: "invocacoes",
      label: "Invocações",
      tipo: "multi",
      colecao: "monstros",
      filtro: {
        campo: "categoriaMonstro",
        valor: "minion"
      },
      mensagemVazia: "Nenhum monstro Minion cadastrado"
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
      placeholder: "Ex: Trevas, veneno, dano físico..."
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

  if (intervaloFiltroBosses) {
    clearInterval(intervaloFiltroBosses);
    intervaloFiltroBosses = null;
  }

  pararControleCondicionalBosses();
}

export function initBosses() {
  crud.init();

  onPageLoaded((pagina) => {
    if (pagina === "cadastrosBosses" || pagina === "cadastrosBossDetalhe") {
      aplicarEstilosAbasBosses();
      vincularAbasBosses();
      iniciarFiltroSeguroBosses();
      iniciarControleCondicionalBosses();
      aplicarFiltroAbaBosses();
    }
  });
}

function iniciarControleCondicionalBosses() {
  pararControleCondicionalBosses();

  aplicarCondicionalRespawnBoss();

  intervaloCondicionalBosses = setInterval(() => {
    aplicarCondicionalRespawnBoss();
  }, 300);
}

function pararControleCondicionalBosses() {
  if (intervaloCondicionalBosses) {
    clearInterval(intervaloCondicionalBosses);
    intervaloCondicionalBosses = null;
  }
}

function aplicarCondicionalRespawnBoss() {
  aplicarCondicionalCampo({
    selectId: "categoriaBoss",
    campoId: "turnosReaparecimentoFarm",
    valorEsperado: "farm"
  });

  aplicarCondicionalCampo({
    selectId: "editcategoriaBoss",
    campoId: "editturnosReaparecimentoFarm",
    valorEsperado: "farm"
  });
}

function aplicarCondicionalCampo({ selectId, campoId, valorEsperado }) {
  const select = document.getElementById(selectId);
  const campo = document.getElementById(campoId);

  if (!select || !campo) return;

  const container = campo.closest("label") || campo.parentElement;

  if (!container) return;

  const deveMostrar = select.value === valorEsperado;

  container.style.display = deveMostrar ? "" : "none";

  if (!deveMostrar) {
    campo.value = "";
  }

  if (!select.dataset.condicionalVinculado) {
    select.dataset.condicionalVinculado = "true";

    select.addEventListener("change", () => {
      aplicarCondicionalCampo({
        selectId,
        campoId,
        valorEsperado
      });
    });
  }
}

function vincularAbasBosses() {
  document.querySelectorAll(".boss-tab-button").forEach((botao) => {
    botao.onclick = () => {
      abaBossAtiva = botao.dataset.bossTab || "todos";
      atualizarVisualAbasBosses();
      aplicarFiltroAbaBosses();
    };
  });

  atualizarVisualAbasBosses();
}

function atualizarVisualAbasBosses() {
  document.querySelectorAll(".boss-tab-button").forEach((botao) => {
    botao.classList.toggle("active", botao.dataset.bossTab === abaBossAtiva);
  });
}

function iniciarFiltroSeguroBosses() {
  if (intervaloFiltroBosses) {
    clearInterval(intervaloFiltroBosses);
    intervaloFiltroBosses = null;
  }

  let tentativas = 0;

  intervaloFiltroBosses = setInterval(() => {
    tentativas += 1;
    aplicarFiltroAbaBosses();

    if (tentativas >= 20) {
      clearInterval(intervaloFiltroBosses);
      intervaloFiltroBosses = null;
    }
  }, 250);
}

function aplicarFiltroAbaBosses() {
  const lista = document.getElementById("listaBosses");

  if (!lista) return;

  removerAvisoAbaBoss(lista);

  const cards = Array.from(lista.querySelectorAll(".resource-card"));

  if (!cards.length) return;

  let visiveis = 0;

  cards.forEach((card) => {
    const categoria = identificarCategoriaBoss(card);

    const mostrar =
      abaBossAtiva === "todos" ||
      abaBossAtiva === categoria;

    card.hidden = !mostrar;

    if (mostrar) {
      visiveis += 1;
    }
  });

  if (visiveis === 0) {
    adicionarAvisoAbaBoss(lista);
  }
}

function identificarCategoriaBoss(card) {
  const texto = normalizarTexto(card.textContent || "");

  if (texto.includes("boss de historia")) {
    return "historia";
  }

  if (texto.includes("boss de farm")) {
    return "farm";
  }

  if (texto.includes("categoria boss historia")) {
    return "historia";
  }

  if (texto.includes("categoria boss farm")) {
    return "farm";
  }

  if (texto.includes("divisao do boss historia")) {
    return "historia";
  }

  if (texto.includes("divisao do boss farm")) {
    return "farm";
  }

  return "outro";
}

function adicionarAvisoAbaBoss(lista) {
  if (lista.querySelector(".boss-tab-empty-state")) return;

  const aviso = document.createElement("div");
  aviso.className = "empty-state boss-tab-empty-state";

  aviso.innerHTML = `
    <h3>Nenhum boss encontrado nesta aba.</h3>
    <p>Cadastre um boss nesta divisão ou altere a aba selecionada.</p>
  `;

  lista.appendChild(aviso);
}

function removerAvisoAbaBoss(lista) {
  const aviso = lista.querySelector(".boss-tab-empty-state");

  if (aviso) {
    aviso.remove();
  }
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
    .boss-rule-info {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .boss-rule-card {
      padding: 16px;
      border-radius: 18px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.09);
    }

    .boss-rule-card strong {
      display: block;
      color: #fff;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 900;
    }

    .boss-rule-card p {
      margin: 0;
      color: rgba(255,255,255,0.64);
      line-height: 1.45;
      font-size: 13px;
      font-weight: 700;
    }

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
      .boss-rule-info {
        grid-template-columns: 1fr;
      }

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