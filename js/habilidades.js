import { criarCadastroCrud } from "./cadastroCrud.js";
import { setTotalCatalogoDashboard } from "./dashboard.js";
import { onPageLoaded } from "./navigation.js";

let intervaloCondicionalHabilidades = null;

const categoriasHabilidade = [
  { valor: "ativa", nome: "Ativa" },
  { valor: "passiva", nome: "Passiva" },
  { valor: "raca_classe_subclasse", nome: "Exclusiva de Raça/Classe/Subclasse" },
  { valor: "monstro", nome: "Exclusiva de Monstros" },
  { valor: "ultimate", nome: "Ultimate" }
];

const ranks = [
  { valor: "baixo", nome: "Baixo" },
  { valor: "medio", nome: "Médio" },
  { valor: "alto", nome: "Alto" },
  { valor: "especial", nome: "Especial" },
  { valor: "lendario", nome: "Lendário" }
];

const simNao = [
  { valor: "nao", nome: "Não" },
  { valor: "sim", nome: "Sim" }
];

const crud = criarCadastroCrud({
  colecao: "habilidades",
  nomeSingular: "Habilidade",
  nomePlural: "Habilidades",
  paginaLista: "cadastrosHabilidades",
  paginaDetalhe: "cadastrosHabilidadeDetalhe",
  formContainerId: "formHabilidades",
  listaId: "listaHabilidades",
  detalheContainerId: "habilidadeDetalheContainer",
  botaoSalvarId: "salvarHabilidade",
  onRegistrosChange: (registros) => {
    setTotalCatalogoDashboard("habilidades", registros.length);
  },

  camposPrincipais: [
    "categoria",
    "rankNivel",
    "custoManaEnergia",
    "cooldown"
  ],

  camposResumo: [
    "categoria",
    "rankNivel",
    "custoManaEnergia",
    "danoBase"
  ],

  camposCard: [
    "descricao",
    "efeitoSecundario"
  ],

  campos: [
    {
      nome: "nome",
      label: "Nome da Habilidade",
      tipo: "text",
      placeholder: "Ex: Crítico, Invisibilidade, Bola de Fogo..."
    },
    {
      nome: "categoria",
      label: "Categoria",
      tipo: "select",
      opcoes: categoriasHabilidade
    },
    {
      nome: "rankNivel",
      label: "Rank / Nível",
      tipo: "select",
      opcoes: ranks
    },
    {
      nome: "custoManaEnergia",
      label: "Custo de Mana / Energia",
      tipo: "number",
      placeholder: "Ex: 10"
    },
    {
      nome: "cooldown",
      label: "Cooldown (Turnos)",
      tipo: "number",
      placeholder: "Ex: 2"
    },
    {
      nome: "alcance",
      label: "Alcance",
      tipo: "text",
      placeholder: "Ex: Corpo a corpo, 10 metros, campo inteiro..."
    },
    {
      nome: "areaEfeito",
      label: "Área de Efeito",
      tipo: "text",
      placeholder: "Ex: Cone, círculo, linha reta, alvo único..."
    },
    {
      nome: "danoBase",
      label: "Dano Base",
      tipo: "number",
      placeholder: "Ex: 20"
    },
    {
      nome: "descricao",
      label: "Descrição",
      tipo: "textarea",
      placeholder: "Descreva o funcionamento da habilidade, escalamento, uso narrativo e regras especiais."
    },
    {
      nome: "efeitoSecundario",
      label: "Efeito Secundário",
      tipo: "textarea",
      placeholder: "Ex: Aplica queimadura, reduz defesa, empurra o alvo..."
    },
    {
      nome: "duracao",
      label: "Duração",
      tipo: "text",
      placeholder: "Ex: Instantânea, 2 turnos, até o fim da rodada..."
    },
    {
      nome: "condicaoUso",
      label: "Condição de Uso",
      tipo: "textarea",
      placeholder: "Ex: Só pode usar com arma equipada, exige D20 acima de 15..."
    },
    {
      nome: "podeEvoluir",
      label: "Pode Evoluir?",
      tipo: "select",
      opcoes: simNao
    },
    {
      nome: "evolucao",
      label: "Evolução",
      tipo: "textarea",
      placeholder: "Explique como a habilidade evolui..."
    }
  ]
});

export function iniciarHabilidades() {
  crud.iniciar();
}

export function pararHabilidades() {
  crud.parar();
  pararControleCondicionalHabilidades();
}

export function initHabilidades() {
  crud.init();

  onPageLoaded((pagina) => {
    if (pagina === "cadastrosHabilidades" || pagina === "cadastrosHabilidadeDetalhe") {
      iniciarControleCondicionalHabilidades();
    }
  });
}

function iniciarControleCondicionalHabilidades() {
  pararControleCondicionalHabilidades();

  aplicarCondicionalEvolucao();

  intervaloCondicionalHabilidades = setInterval(() => {
    aplicarCondicionalEvolucao();
  }, 300);
}

function pararControleCondicionalHabilidades() {
  if (intervaloCondicionalHabilidades) {
    clearInterval(intervaloCondicionalHabilidades);
    intervaloCondicionalHabilidades = null;
  }
}

function aplicarCondicionalEvolucao() {
  aplicarCondicionalCampo({
    selectId: "podeEvoluir",
    campoId: "evolucao",
    valorEsperado: "sim"
  });

  aplicarCondicionalCampo({
    selectId: "editpodeEvoluir",
    campoId: "editevolucao",
    valorEsperado: "sim"
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
