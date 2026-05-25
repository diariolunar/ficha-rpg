import { criarCadastroCrud } from "./cadastroCrud.js";

const crud = criarCadastroCrud({
  colecao: "itens",
  nomeSingular: "Item",
  nomePlural: "Itens",
  paginaLista: "cadastrosItens",
  paginaDetalhe: "cadastrosItemDetalhe",
  formContainerId: "formItens",
  listaId: "listaItens",
  detalheContainerId: "itemDetalheContainer",
  botaoSalvarId: "salvarItem",
  camposPrincipais: ["categoria", "raridade", "nivelRequerido", "valor", "durabilidade", "peso"],
  camposResumo: ["categoria", "raridade", "nivelRequerido", "valor"],
  camposCard: ["efeitoPrincipal", "bonusAtributo"],
  campos: [
    {
      nome: "nome",
      label: "Nome do Item",
      tipo: "text",
      placeholder: "Ex: Espada Flamejante, Manto Lunar..."
    },
    {
      nome: "categoria",
      label: "Categoria",
      tipo: "text",
      placeholder: "Ex: Arma, Armadura, Consumível, Runa, Artefato..."
    },
    {
      nome: "raridade",
      label: "Raridade",
      tipo: "text",
      placeholder: "Ex: Comum, Raro, Épico, Lendário..."
    },
    {
      nome: "nivelRequerido",
      label: "Nível Requerido",
      tipo: "number",
      placeholder: "Ex: 5"
    },
    {
      nome: "classeCompativel",
      label: "Classe Compatível",
      tipo: "multi",
      colecao: "classes",
      permitirTodas: true,
      mensagemVazia: "Nenhuma classe cadastrada"
    },
    {
      nome: "racaCompativel",
      label: "Raça Compatível",
      tipo: "multi",
      colecao: "racas",
      permitirTodas: true,
      mensagemVazia: "Nenhuma raça cadastrada"
    },
    {
      nome: "elementoVinculado",
      label: "Elemento Vinculado",
      tipo: "select",
      colecao: "elementos",
      mensagemVazia: "Nenhum elemento cadastrado"
    },
    {
      nome: "efeitoPrincipal",
      label: "Efeito Principal",
      tipo: "textarea",
      placeholder: "Explique o principal efeito do item..."
    },
    {
      nome: "bonusAtributo",
      label: "Bônus de Atributo",
      tipo: "textarea",
      placeholder: "Ex: +2 Força Física, +10 Mana, +1 Defesa Mágica..."
    },
    {
      nome: "penalidade",
      label: "Penalidade",
      tipo: "textarea",
      placeholder: "Ex: Reduz velocidade, aumenta custo de mana..."
    },
    {
      nome: "duracao",
      label: "Duração",
      tipo: "text",
      placeholder: "Ex: Instantâneo, 3 turnos, permanente..."
    },
    {
      nome: "cooldown",
      label: "Cooldown",
      tipo: "text",
      placeholder: "Ex: 1 turno, 1 sessão, uso único..."
    },
    {
      nome: "custoUso",
      label: "Custo de Uso",
      tipo: "text",
      placeholder: "Ex: 10 mana, 1 carga, consome HP..."
    },
    {
      nome: "peso",
      label: "Peso",
      tipo: "number",
      placeholder: "Ex: 2"
    },
    {
      nome: "durabilidade",
      label: "Durabilidade",
      tipo: "number",
      placeholder: "Ex: 100"
    },
    {
      nome: "valor",
      label: "Valor",
      tipo: "number",
      placeholder: "Ex: 500"
    },
    {
      nome: "metodoObtencao",
      label: "Método de Obtenção",
      tipo: "textarea",
      placeholder: "Ex: Loja, drop de monstro, recompensa de missão..."
    }
  ]
});

export function iniciarItens() {
  crud.iniciar();
}

export function pararItens() {
  crud.parar();
}

export function initItens() {
  crud.init();
}