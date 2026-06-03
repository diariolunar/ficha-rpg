import { criarCadastroCrud } from "./cadastroCrud.js";
import { onPageLoaded } from "./navigation.js";

let intervaloCondicionalPets = null;

const ranksPet = [
  { valor: "comum", nome: "Comum" },
  { valor: "incomum", nome: "Incomum" },
  { valor: "raro", nome: "Raro" },
  { valor: "epico", nome: "Épico" },
  { valor: "lendario", nome: "Lendário" },
  { valor: "mitico", nome: "Mítico" }
];

const niveisLealdade = [
  { valor: "baixa", nome: "Baixa" },
  { valor: "media", nome: "Média" },
  { valor: "alta", nome: "Alta" },
  { valor: "absoluta", nome: "Absoluta" }
];

const tiposSuporte = [
  { valor: "ataque", nome: "Ataque" },
  { valor: "defesa", nome: "Defesa" },
  { valor: "cura", nome: "Cura" },
  { valor: "rastreio", nome: "Rastreio" },
  { valor: "montaria", nome: "Montaria" },
  { valor: "suporte", nome: "Suporte" },
  { valor: "utilidade", nome: "Utilidade" }
];

const simNao = [
  { valor: "nao", nome: "Não" },
  { valor: "sim", nome: "Sim" }
];

const crud = criarCadastroCrud({
  colecao: "pets",
  nomeSingular: "Pet",
  nomePlural: "Pets",
  paginaLista: "cadastrosPets",
  paginaDetalhe: "cadastrosPetDetalhe",
  formContainerId: "formPets",
  listaId: "listaPets",
  detalheContainerId: "petDetalheContainer",
  botaoSalvarId: "salvarPet",

  camposPrincipais: [
    "especie",
    "rank",
    "hp",
    "mana",
    "lealdade",
    "inteligencia"
  ],

  camposResumo: [
    "especie",
    "rank",
    "hp",
    "mana"
  ],

  camposCard: [
    "tipoSuporte",
    "elementoAfim"
  ],

  campos: [
    {
      nome: "nome",
      label: "Nome do Pet",
      tipo: "text",
      placeholder: "Ex: Corvo Lunar, Lobo de Cinzas..."
    },
    {
      nome: "especie",
      label: "Espécie",
      tipo: "text",
      placeholder: "Ex: Ave, Lobo, Espírito, Dragão pequeno..."
    },
    {
      nome: "rank",
      label: "Rank",
      tipo: "select",
      opcoes: ranksPet
    },
    {
      nome: "hp",
      label: "HP",
      tipo: "number",
      grupo: "atributos",
      placeholder: "Ex: 60"
    },
    {
      nome: "mana",
      label: "Mana",
      tipo: "number",
      grupo: "atributos",
      placeholder: "Ex: 20"
    },
    {
      nome: "forca",
      label: "Força",
      tipo: "number",
      grupo: "atributos",
      placeholder: "Ex: 5"
    },
    {
      nome: "magia",
      label: "Magia",
      tipo: "number",
      grupo: "atributos",
      placeholder: "Ex: 3"
    },
    {
      nome: "defesa",
      label: "Defesa",
      tipo: "number",
      grupo: "atributos",
      placeholder: "Ex: 4"
    },
    {
      nome: "velocidade",
      label: "Velocidade",
      tipo: "number",
      grupo: "atributos",
      placeholder: "Ex: 8"
    },
    {
      nome: "resistencia",
      label: "Resistência",
      tipo: "number",
      grupo: "atributos",
      placeholder: "Ex: 5"
    },
    {
      nome: "lealdade",
      label: "Lealdade",
      tipo: "select",
      opcoes: niveisLealdade
    },
    {
      nome: "inteligencia",
      label: "Inteligência",
      tipo: "text",
      placeholder: "Ex: Instintiva, Treinada, Inteligente..."
    },
    {
      nome: "tipoSuporte",
      label: "Tipo de Suporte",
      tipo: "select",
      opcoes: tiposSuporte
    },
    {
      nome: "habilidades",
      label: "Habilidades",
      tipo: "multi",
      colecao: "habilidades",
      mensagemVazia: "Nenhuma habilidade cadastrada"
    },
    {
      nome: "bonusDono",
      label: "Bônus ao Dono",
      tipo: "textarea",
      placeholder: "Ex: +2 em percepção, +1 em defesa, bônus elemental..."
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
      placeholder: "Explique como o pet evolui..."
    },
    {
      nome: "elementoAfim",
      label: "Elemento Afim",
      tipo: "select",
      colecao: "elementos",
      mensagemVazia: "Nenhum elemento cadastrado"
    }
  ]
});

export function iniciarPets() {
  crud.iniciar();
}

export function pararPets() {
  crud.parar();
  pararControleCondicionalPets();
}

export function initPets() {
  crud.init();

  onPageLoaded((pagina) => {
    if (pagina === "cadastrosPets" || pagina === "cadastrosPetDetalhe") {
      iniciarControleCondicionalPets();
    }
  });
}

function iniciarControleCondicionalPets() {
  pararControleCondicionalPets();

  aplicarCondicionalEvolucaoPet();

  intervaloCondicionalPets = setInterval(() => {
    aplicarCondicionalEvolucaoPet();
  }, 300);
}

function pararControleCondicionalPets() {
  if (intervaloCondicionalPets) {
    clearInterval(intervaloCondicionalPets);
    intervaloCondicionalPets = null;
  }
}

function aplicarCondicionalEvolucaoPet() {
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