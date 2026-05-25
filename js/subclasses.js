import { criarCadastroCrud } from "./cadastroCrud.js";

const atributos = [
  { valor: "forcaFisica", nome: "Força Física" },
  { valor: "forcaMagica", nome: "Força Mágica" },
  { valor: "defesaFisica", nome: "Defesa Física" },
  { valor: "defesaMagica", nome: "Defesa Mágica" },
  { valor: "velocidade", nome: "Velocidade" },
  { valor: "resistencia", nome: "Resistência" }
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
  camposPrincipais: ["classeBase", "atributoFavorecido", "tipoDanoFavorecido", "estiloCombate"],
  camposResumo: ["classeBase", "atributoFavorecido", "tipoDanoFavorecido"],
  camposCard: ["funcaoEspecializada", "estiloCombate"],
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
      placeholder: "Ex: +2 em Força Mágica, +1 em Defesa Física por nível..."
    },
    {
      nome: "penalidades",
      label: "Penalidades",
      tipo: "textarea",
      placeholder: "Ex: Reduz velocidade, aumenta custo de mana..."
    },
    {
      nome: "habilidadesExclusivas",
      label: "Habilidades Exclusivas",
      tipo: "multi",
      colecao: "habilidades",
      mensagemVazia: "Nenhuma habilidade cadastrada"
    },
    {
      nome: "passivasExclusivas",
      label: "Passivas Exclusivas",
      tipo: "textarea",
      placeholder: "Liste as passivas exclusivas dessa subclasse..."
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
      tipo: "textarea",
      placeholder: "Ex: Corpo a corpo, longa distância, controle, furtivo..."
    },
    {
      nome: "evolucaoProgressao",
      label: "Evolução / Progressão",
      tipo: "textarea",
      placeholder: "Explique como essa subclasse evolui..."
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