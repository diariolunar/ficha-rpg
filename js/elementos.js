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

  camposPrincipais: ["descricao"],
  camposResumo: ["descricao"],
  camposCard: ["descricao"],

  campos: [
    {
      nome: "nome",
      label: "Nome do Elemento",
      tipo: "text",
      placeholder: "Ex: Fogo, Água, Gelo, Trevas..."
    },
    {
      nome: "descricao",
      label: "Descrição",
      tipo: "textarea",
      placeholder: "Descreva o elemento, suas características, usos e efeitos."
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