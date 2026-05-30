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

  camposPrincipais: [
    "categoria",
    "subcategoria",
    "raridade",
    "nivelRequerido",
    "valor",
    "durabilidade",
    "peso"
  ],

  camposResumo: [
    "categoria",
    "subcategoria",
    "raridade",
    "nivelRequerido",
    "valor"
  ],

  camposCard: [
    "efeitoPrincipal",
    "bonusAtributo",
    "metodoObtencao"
  ],

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
      tipo: "select",
      opcoes: [
        { valor: "arma", nome: "Arma" },
        { valor: "armadura", nome: "Armadura" },
        { valor: "consumivel", nome: "Consumível" },
        { valor: "acessorio", nome: "Acessório" },
        { valor: "artefato", nome: "Artefato" },
        { valor: "material", nome: "Material" },
        { valor: "runa", nome: "Runa" },
        { valor: "chave", nome: "Chave" },
        { valor: "missao", nome: "Missão" },
        { valor: "farm", nome: "Farm" },
        { valor: "especial", nome: "Especial" }
      ]
    },
    {
      nome: "subcategoria",
      label: "Subcategoria",
      tipo: "text",
      placeholder: "Ex: Espada, Escudo, Poção, Anel, Pergaminho, Fragmento, Recurso raro..."
    },
    {
      nome: "raridade",
      label: "Raridade",
      tipo: "text",
      placeholder: "Ex: Comum, Incomum, Raro, Épico, Lendário, Mítico, Único..."
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