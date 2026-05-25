import { criarCadastroCrud } from "./cadastroCrud.js";

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
      tipo: "text",
      placeholder: "Ex: Principal, Sub-elemento, Raro, Proibido..."
    },
    {
      nome: "natureza",
      label: "Natureza",
      tipo: "text",
      placeholder: "Ex: Ofensiva, defensiva, suporte, controle..."
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
      placeholder: "Ex: Queimadura, congelamento, sangramento..."
    },
    {
      nome: "statusCausado",
      label: "Status Causado",
      tipo: "textarea",
      placeholder: "Ex: Queimando, congelado, envenenado..."
    },
    {
      nome: "vantagemContra",
      label: "Vantagem Contra",
      tipo: "multi",
      colecao: "elementos",
      mensagemVazia: "Nenhum elemento cadastrado"
    },
    {
      nome: "fraquezaContra",
      label: "Fraqueza Contra",
      tipo: "multi",
      colecao: "elementos",
      mensagemVazia: "Nenhum elemento cadastrado"
    },
    {
      nome: "resistenciaNatural",
      label: "Resistência Natural",
      tipo: "textarea",
      placeholder: "Explique resistências naturais desse elemento..."
    },
    {
      nome: "combinacoesPossiveis",
      label: "Combinações Possíveis",
      tipo: "multi",
      colecao: "elementos",
      mensagemVazia: "Nenhum elemento cadastrado"
    },
    {
      nome: "classesAfins",
      label: "Classes Afins",
      tipo: "multi",
      colecao: "classes",
      mensagemVazia: "Nenhuma classe cadastrada"
    },
    {
      nome: "racasAfins",
      label: "Raças Afins",
      tipo: "multi",
      colecao: "racas",
      mensagemVazia: "Nenhuma raça cadastrada"
    },
    {
      nome: "habilidadesCompativeis",
      label: "Habilidades Compatíveis",
      tipo: "multi",
      colecao: "habilidades",
      mensagemVazia: "Nenhuma habilidade cadastrada"
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
      placeholder: "Ex: Exaustão, dano colateral, perda de controle..."
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