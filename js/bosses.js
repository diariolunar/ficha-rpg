import { criarCadastroCrud } from "./cadastroCrud.js";
import { onPageLoaded } from "./navigation.js";

let intervaloBosses = null;

const ranksBoss = [
  { valor: "rank_c", nome: "Rank C" },
  { valor: "rank_b", nome: "Rank B" },
  { valor: "rank_a", nome: "Rank A" },
  { valor: "rank_s", nome: "Rank S" },
  { valor: "rank_ss", nome: "Rank SS" },
  { valor: "rank_sss", nome: "Rank SSS" },
  { valor: "mundial", nome: "Ameaça Mundial" }
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
    "titulo",
    "rankNivelAmeaca",
    "hp",
    "mana"
  ],

  camposResumo: [
    "categoriaBoss",
    "rankNivelAmeaca",
    "hp",
    "mana"
  ],

  camposCard: [
    "ultimate",
    "condicaoVitoria"
  ],

  campos: [
    {
      nome: "nome",
      label: "Nome do Boss",
      tipo: "text"
    },

    {
      nome: "categoriaBoss",
      label: "Divisão do Boss",
      tipo: "select",
      opcoes: [
        {
          valor: "historia",
          nome: "Boss de História"
        },
        {
          valor: "farm",
          nome: "Boss de Farm"
        }
      ]
    },

    {
      nome: "turnosReaparecimentoFarm",
      label: "Turnos para Reaparecer",
      tipo: "number"
    },

    {
      nome: "titulo",
      label: "Título",
      tipo: "text"
    },

    {
      nome: "tipo",
      label: "Tipo",
      tipo: "text"
    },

    {
      nome: "rankNivelAmeaca",
      label: "Rank",
      tipo: "select",
      opcoes: ranksBoss
    },

    {
      nome: "hp",
      label: "HP",
      tipo: "number",
      grupo: "atributos"
    },

    {
      nome: "mana",
      label: "Mana",
      tipo: "number",
      grupo: "atributos"
    },

    {
      nome: "forca",
      label: "Força",
      tipo: "number",
      grupo: "atributos"
    },

    {
      nome: "magia",
      label: "Magia",
      tipo: "number",
      grupo: "atributos"
    },

    {
      nome: "defesa",
      label: "Defesa",
      tipo: "number",
      grupo: "atributos"
    },

    {
      nome: "velocidade",
      label: "Velocidade",
      tipo: "number",
      grupo: "atributos"
    },

    {
      nome: "resistencia",
      label: "Resistência",
      tipo: "number",
      grupo: "atributos"
    },

    {
      nome: "fatorMedo",
      label: "Fator Medo",
      tipo: "text"
    },

    {
      nome: "inteligencia",
      label: "Inteligência",
      tipo: "text"
    },

    {
      nome: "historia",
      label: "História",
      tipo: "textarea"
    },

    {
      nome: "fasesCombate",
      label: "Fases de Combate",
      tipo: "textarea"
    },

    {
      nome: "ataques",
      label: "Ataques",
      tipo: "textarea"
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
      mensagemVazia:
        "Nenhuma habilidade exclusiva de monstro cadastrada"
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
      mensagemVazia:
        "Nenhuma ultimate cadastrada"
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
      mensagemVazia:
        "Nenhum minion cadastrado"
    },

    {
      nome: "fraquezas",
      label: "Fraquezas",
      tipo: "textarea"
    },

    {
      nome: "resistencias",
      label: "Resistências",
      tipo: "textarea"
    },

    {
      nome: "condicaoVitoria",
      label: "Condição de Vitória",
      tipo: "textarea"
    },

    {
      nome: "drops",
      label: "Drops",
      tipo: "textarea"
    },

    {
      nome: "xpRecompensa",
      label: "XP / Recompensa",
      tipo: "textarea"
    }
  ]
});

export function iniciarBosses() {
  crud.iniciar();
}

export function pararBosses() {
  crud.parar();

  if (intervaloBosses) {
    clearInterval(intervaloBosses);
    intervaloBosses = null;
  }
}

export function initBosses() {
  crud.init();

  onPageLoaded((pagina) => {
    if (
      pagina === "cadastrosBosses" ||
      pagina === "cadastrosBossDetalhe"
    ) {
      iniciarCondicionaisBoss();
    }
  });
}

function iniciarCondicionaisBoss() {
  if (intervaloBosses) {
    clearInterval(intervaloBosses);
  }

  aplicarCondicionalBoss();

  intervaloBosses = setInterval(() => {
    aplicarCondicionalBoss();
  }, 300);
}

function aplicarCondicionalBoss() {
  controlarCampoFarm(
    "categoriaBoss",
    "turnosReaparecimentoFarm"
  );

  controlarCampoFarm(
    "editcategoriaBoss",
    "editturnosReaparecimentoFarm"
  );
}

function controlarCampoFarm(
  selectId,
  campoId
) {
  const select =
    document.getElementById(selectId);

  const campo =
    document.getElementById(campoId);

  if (!select || !campo) return;

  const container =
    campo.closest("label");

  if (!container) return;

  const mostrar =
    select.value === "farm";

  container.style.display =
    mostrar ? "" : "none";

  if (!mostrar) {
    campo.value = "";
  }

  if (!select.dataset.vinculado) {
    select.dataset.vinculado = "1";

    select.addEventListener(
      "change",
      () => controlarCampoFarm(
        selectId,
        campoId
      )
    );
  }
}