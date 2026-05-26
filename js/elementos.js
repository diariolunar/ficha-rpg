import { criarCadastroCrud } from "./cadastroCrud.js";

const tiposElemento = [
  { valor: "primario", nome: "Primário" },
  { valor: "secundario", nome: "Secundário" },
  { valor: "raro", nome: "Raro" },
  { valor: "proibido", nome: "Proibido" },
  { valor: "divino", nome: "Divino" },
  { valor: "demonico", nome: "Demoníaco" },
  { valor: "personalizado", nome: "Personalizado" }
];

const naturezasElemento = [
  { valor: "ofensiva", nome: "Ofensiva" },
  { valor: "defensiva", nome: "Defensiva" },
  { valor: "suporte", nome: "Suporte" },
  { valor: "controle", nome: "Controle" },
  { valor: "cura", nome: "Cura" },
  { valor: "mista", nome: "Mista" }
];

const crud = criarCadastroCrud({
  colecao: "elementos",
  nomeSingular: "Elemento",
  nomePlural: "Elementos",
  paginaLista: "cadastrosElementos",
  paginaDetalhe: "cadastrosElementoDetalhe",
  formContainerId: "formElementos",
  listaId: "listaElementos",
  detalheContainerId: "elementoDetalheContainer",
  botaoSalvarId: "salvarElemento",
  camposPrincipais: ["tipo", "natureza", "danoBase", "custoManaMedio"],
  camposResumo: ["tipo", "natureza", "danoBase", "custoManaMedio"],
  camposCard: ["efeitoPrincipal", "statusCausado"],
  campos: [
    {
      nome: "nome",
      label: "Nome do Elemento",
      tipo: "text",
      placeholder: "Ex: Fogo, Água, Sangue, Gelo..."
    },
    {
      nome: "tipo",
      label: "Tipo",
      tipo: "select",
      opcoes: tiposElemento
    },
    {
      nome: "natureza",
      label: "Natureza",
      tipo: "select",
      opcoes: naturezasElemento
    },
    {
      nome: "danoBase",
      label: "Dano Base",
      tipo: "number",
      placeholder: "Ex: 10"
    },
    {
      nome: "efeitoPrincipal",
      label: "Efeito Principal",
      tipo: "textarea",
      placeholder: "Ex: Queima, congela, paralisa, cura, fortalece..."
    },
    {
      nome: "statusCausado",
      label: "Status Causado",
      tipo: "text",
      placeholder: "Ex: Queimadura, congelamento, veneno..."
    },
    {
      nome: "vantagemContra",
      label: "Vantagem Contra",
      tipo: "textarea",
      placeholder: "Ex: Forte contra gelo, madeira, mortos-vivos..."
    },
    {
      nome: "fraquezaContra",
      label: "Fraqueza Contra",
      tipo: "textarea",
      placeholder: "Ex: Fraco contra água, luz, terra..."
    },
    {
      nome: "resistenciaNatural",
      label: "Resistência Natural",
      tipo: "textarea",
      placeholder: "Ex: Reduz dano de fogo, resiste a veneno..."
    },
    {
      nome: "combinacoesPossiveis",
      label: "Combinações Possíveis",
      tipo: "textarea",
      placeholder: "Ex: Água + Frio = Gelo; Fogo + Ar = Explosão..."
    },
    {
      nome: "custoManaMedio",
      label: "Custo de Mana Médio",
      tipo: "number",
      placeholder: "Ex: 15"
    },
    {
      nome: "riscoConsequencia",
      label: "Risco / Consequência",
      tipo: "textarea",
      placeholder: "Ex: Pode causar exaustão, queimadura no usuário, instabilidade..."
    }
  ]
});

export function iniciarElementos() {
  crud.iniciar();
}

export function pararElementos() {
  crud.parar();
}

export function initElementos() {
  crud.init();
}