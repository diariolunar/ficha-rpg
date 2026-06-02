import { criarCadastroCrud } from "./cadastroCrud.js";

const categoriasMonstro = [
  { valor: "minion", nome: "Minion" },
  { valor: "comum", nome: "Monstro Comum" }
];

const ranksMonstro = [
  { valor: "baixo", nome: "Baixo" },
  { valor: "medio", nome: "Médio" },
  { valor: "alto", nome: "Alto" },
  { valor: "elite", nome: "Elite" },
  { valor: "rank_c", nome: "Rank C" },
  { valor: "rank_b", nome: "Rank B" },
  { valor: "rank_a", nome: "Rank A" },
  { valor: "rank_s", nome: "Rank S" }
];

const crud = criarCadastroCrud({
  colecao: "monstros",
  nomeSingular: "Monstro",
  nomePlural: "Monstros",
  paginaLista: "cadastrosMonstros",
  paginaDetalhe: "cadastrosMonstroDetalhe",
  formContainerId: "formMonstros",
  listaId: "listaMonstros",
  detalheContainerId: "monstroDetalheContainer",
  botaoSalvarId: "salvarMonstro",

  camposPrincipais: [
    "categoriaMonstro",
    "tipo",
    "rankNivelAmeaca",
    "hp",
    "mana",
    "fatorMedo",
    "inteligencia"
  ],

  camposResumo: [
    "categoriaMonstro",
    "tipo",
    "rankNivelAmeaca",
    "hp",
    "mana"
  ],

  camposCard: [
    "descricao",
    "xpRecompensa"
  ],

  campos: [
    {
      nome: "nome",
      label: "Nome do Monstro",
      tipo: "text",
      placeholder: "Ex: Devorador de Ossos, Lobo Sombrio..."
    },
    {
      nome: "categoriaMonstro",
      label: "Categoria do Monstro",
      tipo: "select",
      opcoes: categoriasMonstro
    },
    {
      nome: "tipo",
      label: "Tipo",
      tipo: "text",
      placeholder: "Ex: Morto-vivo, Besta, Demônio, Aberração..."
    },
    {
      nome: "rankNivelAmeaca",
      label: "Rank / Nível de Ameaça",
      tipo: "select",
      opcoes: ranksMonstro
    },
    {
      nome: "hp",
      label: "HP",
      tipo: "number",
      placeholder: "Ex: 120"
    },
    {
      nome: "mana",
      label: "Mana",
      tipo: "number",
      placeholder: "Ex: 40"
    },
    {
      nome: "forca",
      label: "Força",
      tipo: "number",
      placeholder: "Ex: 10"
    },
    {
      nome: "magia",
      label: "Magia",
      tipo: "number",
      placeholder: "Ex: 4"
    },
    {
      nome: "defesa",
      label: "Defesa",
      tipo: "number",
      placeholder: "Ex: 8"
    },
    {
      nome: "velocidade",
      label: "Velocidade",
      tipo: "number",
      placeholder: "Ex: 6"
    },
    {
      nome: "resistencia",
      label: "Resistência",
      tipo: "number",
      placeholder: "Ex: 7"
    },
    {
      nome: "fatorMedo",
      label: "Fator Medo",
      tipo: "text",
      placeholder: "Ex: +2 em testes de intimidação"
    },
    {
      nome: "inteligencia",
      label: "Inteligência",
      tipo: "text",
      placeholder: "Ex: Baixa, Instintiva, Estratégica..."
    },
    {
      nome: "ataques",
      label: "Ataques",
      tipo: "textarea",
      placeholder: "Liste ataques comuns, dano e efeitos..."
    },
    {
      nome: "habilidades",
      label: "Habilidades",
      tipo: "multi",
      colecao: "habilidades",
      filtro: {
        campo: "categoria",
        valor: "monstro"
      },
      mensagemVazia: "Nenhuma habilidade exclusiva de monstros cadastrada"
    },
    {
      nome: "fraquezas",
      label: "Fraquezas",
      tipo: "textarea",
      placeholder: "Ex: Fogo, luz, armas sagradas..."
    },
    {
      nome: "resistencias",
      label: "Resistências",
      tipo: "textarea",
      placeholder: "Ex: Veneno, trevas, dano físico..."
    },
    {
      nome: "comportamentoCombate",
      label: "Comportamento em Combate",
      tipo: "textarea",
      placeholder: "Explique como o monstro age em combate..."
    },
    {
      nome: "descricao",
      label: "Descrição",
      tipo: "textarea",
      placeholder: "Descreva aparência, origem, ambiente, comportamento fora de combate e detalhes narrativos..."
    },
    {
      nome: "drops",
      label: "Drops",
      tipo: "textarea",
      placeholder: "Ex: Presas, couro, runas, ouro, item raro..."
    },
    {
      nome: "xpRecompensa",
      label: "XP / Recompensa",
      tipo: "textarea",
      placeholder: "Ex: 100 XP, ouro, item especial..."
    }
  ]
});

export function iniciarMonstros() {
  crud.iniciar();
}

export function pararMonstros() {
  crud.parar();
}

export function initMonstros() {
  crud.init();
}