import { criarCadastroCrud } from "./cadastroCrud.js";

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
  camposPrincipais: ["especie", "rank", "hp", "mana", "lealdade", "inteligencia"],
  camposResumo: ["especie", "rank", "hp", "mana"],
  camposCard: ["tipoSuporte", "elementoAfim"],
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
      tipo: "text",
      placeholder: "Ex: Comum, Raro, Rank C, Rank A..."
    },
    {
      nome: "hp",
      label: "HP",
      tipo: "number",
      placeholder: "Ex: 60"
    },
    {
      nome: "mana",
      label: "Mana",
      tipo: "number",
      placeholder: "Ex: 20"
    },
    {
      nome: "forcaFisica",
      label: "Força Física",
      tipo: "number",
      placeholder: "Ex: 5"
    },
    {
      nome: "forcaMagica",
      label: "Força Mágica",
      tipo: "number",
      placeholder: "Ex: 3"
    },
    {
      nome: "defesaFisica",
      label: "Defesa Física",
      tipo: "number",
      placeholder: "Ex: 4"
    },
    {
      nome: "defesaMagica",
      label: "Defesa Mágica",
      tipo: "number",
      placeholder: "Ex: 2"
    },
    {
      nome: "velocidade",
      label: "Velocidade",
      tipo: "number",
      placeholder: "Ex: 8"
    },
    {
      nome: "resistencia",
      label: "Resistência",
      tipo: "number",
      placeholder: "Ex: 5"
    },
    {
      nome: "lealdade",
      label: "Lealdade",
      tipo: "text",
      placeholder: "Ex: Baixa, Média, Alta, Absoluta..."
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
      tipo: "text",
      placeholder: "Ex: Ataque, defesa, cura, rastreio, montaria..."
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
      nome: "evolucao",
      label: "Evolução",
      tipo: "textarea",
      placeholder: "Explique como o pet evolui..."
    },
    {
      nome: "metodoObtencao",
      label: "Método de Obtenção",
      tipo: "textarea",
      placeholder: "Ex: Domado, invocado, comprado, recompensa de missão..."
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
}

export function initPets() {
  crud.init();
}