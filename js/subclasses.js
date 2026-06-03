import { criarCadastroCrud } from "./cadastroCrud.js";

const atributos = [
  { valor: "forca", nome: "Força" },
  { valor: "magia", nome: "Magia" },
  { valor: "defesa", nome: "Defesa" },
  { valor: "velocidade", nome: "Velocidade" },
  { valor: "resistencia", nome: "Resistência" }
];

const estilosCombate = [
  { valor: "corpo_a_corpo", nome: "Corpo a Corpo" },
  { valor: "longa_distancia", nome: "Longa Distância" },
  { valor: "magico", nome: "Mágico" },
  { valor: "suporte", nome: "Suporte" },
  { valor: "controle", nome: "Controle" },
  { valor: "defensivo", nome: "Defensivo" },
  { valor: "furtivo", nome: "Furtivo" },
  { valor: "invocacao", nome: "Invocação" },
  { valor: "hibrido", nome: "Híbrido" }
];

const crud = criarCadastroCrud({
  colecao: "subclasses",
  nomeSingular: "Subclasse",
  nomePlural: "Subclasses",
  paginaLista: "cadastrosSubclasses",
  paginaDetalhe: "cadastrosSubclasseDetalhe",
  formContainerId: "formSubclasses",
  listaId: "listaSubclasses",
  detalheContainerId: "subclasseDetalheContainer",
  botaoSalvarId: "salvarSubclasse",

  camposPrincipais: [
    "classeBase",
    "atributoFavorecido",
    "tipoDanoFavorecido",
    "estiloCombate"
  ],

  camposResumo: [
    "classeBase",
    "atributoFavorecido",
    "tipoDanoFavorecido"
  ],

  camposCard: [
    "funcaoEspecializada",
    "estiloCombate"
  ],

  campos: [
    {
      nome: "nome",
      label: "Nome da Subclasse",
      tipo: "text",
      placeholder: "Ex: Feiticeiro, Invocador, Berserker..."
    },
    {
      nome: "classeBase",
      label: "Classe Base",
      tipo: "select",
      colecao: "classes",
      mensagemVazia: "Nenhuma classe cadastrada"
    },
    {
      nome: "requisitoAcesso",
      label: "Requisito de Acesso",
      tipo: "textarea",
      placeholder: "Ex: Nível mínimo, atributo específico, missão concluída..."
    },
    {
      nome: "atributoFavorecido",
      label: "Atributo Favorecido",
      tipo: "select",
      opcoes: atributos
    },
    {
      nome: "funcaoEspecializada",
      label: "Função Especializada",
      tipo: "textarea",
      placeholder: "Ex: Controle de área, dano explosivo, suporte, invocação..."
    },
    {
      nome: "bonusAtributo",
      label: "Bônus de Atributo",
      tipo: "textarea",
      placeholder: "Ex: +2 em Magia, +1 em Defesa por nível..."
    },
    {
      nome: "habilidadeExclusiva",
      label: "Habilidade Exclusiva",
      tipo: "select",
      colecao: "habilidades",
      filtro: {
        campo: "categoria",
        valor: "raca_classe_subclasse"
      },
      mensagemVazia: "Nenhuma habilidade exclusiva de raça/classe/subclasse cadastrada"
    },
    {
      nome: "passivasExclusivas",
      label: "Passivas Exclusivas",
      tipo: "multi",
      colecao: "habilidades",
      filtro: {
        campo: "categoria",
        valor: "passiva"
      },
      mensagemVazia: "Nenhuma habilidade passiva cadastrada"
    },
    {
      nome: "tipoDanoFavorecido",
      label: "Tipo de Dano Favorecido",
      tipo: "text",
      placeholder: "Ex: Físico, Mágico, Fogo, Sangue..."
    },
    {
      nome: "elementosCompativeis",
      label: "Elementos Compatíveis",
      tipo: "multi",
      colecao: "elementos",
      mensagemVazia: "Nenhum elemento cadastrado"
    },
    {
      nome: "estiloCombate",
      label: "Estilo de Combate",
      tipo: "select",
      opcoes: estilosCombate
    }
  ]
});

export function iniciarSubclasses() {
  crud.iniciar();
}

export function pararSubclasses() {
  crud.parar();
}

export function initSubclasses() {
  crud.init();
}