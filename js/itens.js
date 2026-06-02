import { criarCadastroCrud } from "./cadastroCrud.js";
import { onPageLoaded } from "./navigation.js";

let intervaloCondicionalItens = null;

const categoriasItem = [
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
];

const subcategoriasPorCategoria = {
  arma: [
    { valor: "espada", nome: "Espada" },
    { valor: "arco", nome: "Arco" },
    { valor: "adaga", nome: "Adaga" },
    { valor: "machado", nome: "Machado" },
    { valor: "lanca", nome: "Lança" },
    { valor: "cajado", nome: "Cajado" },
    { valor: "varinha", nome: "Varinha" },
    { valor: "martelo", nome: "Martelo" },
    { valor: "arma_de_fogo", nome: "Arma de Fogo" },
    { valor: "escudo", nome: "Escudo" }
  ],

  armadura: [
    { valor: "leve", nome: "Armadura Leve" },
    { valor: "media", nome: "Armadura Média" },
    { valor: "pesada", nome: "Armadura Pesada" },
    { valor: "manto", nome: "Manto" },
    { valor: "elmo", nome: "Elmo" },
    { valor: "luvas", nome: "Luvas" },
    { valor: "botas", nome: "Botas" },
    { valor: "escudo_defensivo", nome: "Escudo Defensivo" }
  ],

  consumivel: [
    { valor: "pocao", nome: "Poção" },
    { valor: "elixir", nome: "Elixir" },
    { valor: "comida", nome: "Comida" },
    { valor: "pergaminho", nome: "Pergaminho" },
    { valor: "bomba", nome: "Bomba" },
    { valor: "antidoto", nome: "Antídoto" }
  ],

  acessorio: [
    { valor: "anel", nome: "Anel" },
    { valor: "colar", nome: "Colar" },
    { valor: "brinco", nome: "Brinco" },
    { valor: "pulseira", nome: "Pulseira" },
    { valor: "amuleto", nome: "Amuleto" },
    { valor: "cinto", nome: "Cinto" }
  ],

  artefato: [
    { valor: "reliquia", nome: "Relíquia" },
    { valor: "item_lendario", nome: "Item Lendário" },
    { valor: "objeto_sagrado", nome: "Objeto Sagrado" },
    { valor: "objeto_amaldicoado", nome: "Objeto Amaldiçoado" }
  ],

  material: [
    { valor: "minerio", nome: "Minério" },
    { valor: "erva", nome: "Erva" },
    { valor: "pele", nome: "Pele" },
    { valor: "osso", nome: "Osso" },
    { valor: "cristal", nome: "Cristal" },
    { valor: "fragmento", nome: "Fragmento" },
    { valor: "madeira", nome: "Madeira" },
    { valor: "tecido", nome: "Tecido" }
  ],

  runa: [
    { valor: "runa_ataque", nome: "Runa de Ataque" },
    { valor: "runa_defesa", nome: "Runa de Defesa" },
    { valor: "runa_suporte", nome: "Runa de Suporte" },
    { valor: "runa_magica", nome: "Runa Mágica" },
    { valor: "runa_elemental", nome: "Runa Elemental" }
  ],

  chave: [
    { valor: "chave_comum", nome: "Chave Comum" },
    { valor: "chave_masmorra", nome: "Chave de Masmorra" },
    { valor: "chave_evento", nome: "Chave de Evento" },
    { valor: "chave_lendaria", nome: "Chave Lendária" }
  ],

  missao: [
    { valor: "item_missao", nome: "Item de Missão" },
    { valor: "documento", nome: "Documento" },
    { valor: "prova", nome: "Prova" },
    { valor: "entrega", nome: "Entrega" }
  ],

  farm: [
    { valor: "recurso_comum", nome: "Recurso Comum" },
    { valor: "recurso_raro", nome: "Recurso Raro" },
    { valor: "drop_monstro", nome: "Drop de Monstro" },
    { valor: "drop_boss", nome: "Drop de Boss" }
  ],

  especial: [
    { valor: "unico", nome: "Único" },
    { valor: "evento", nome: "Evento" },
    { valor: "presente", nome: "Presente" },
    { valor: "customizado", nome: "Customizado" }
  ]
};

const todasSubcategorias = Object.values(subcategoriasPorCategoria).flat();

const raridades = [
  { valor: "comum", nome: "Comum" },
  { valor: "incomum", nome: "Incomum" },
  { valor: "raro", nome: "Raro" },
  { valor: "epico", nome: "Épico" },
  { valor: "lendario", nome: "Lendário" },
  { valor: "mitico", nome: "Mítico" },
  { valor: "unico", nome: "Único" }
];

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
      opcoes: categoriasItem
    },
    {
      nome: "subcategoria",
      label: "Subcategoria",
      tipo: "select",
      opcoes: todasSubcategorias
    },
    {
      nome: "raridade",
      label: "Raridade",
      tipo: "select",
      opcoes: raridades
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
      nome: "bonusHp",
      label: "Bônus de HP",
      tipo: "number",
      placeholder: "Aceita positivo ou negativo. Ex: 10 ou -5"
    },
    {
      nome: "bonusMana",
      label: "Bônus de Mana",
      tipo: "number",
      placeholder: "Aceita positivo ou negativo. Ex: 10 ou -5"
    },
    {
      nome: "bonusForca",
      label: "Bônus de Força",
      tipo: "number",
      placeholder: "Aceita positivo ou negativo. Ex: 2 ou -1"
    },
    {
      nome: "bonusMagia",
      label: "Bônus de Magia",
      tipo: "number",
      placeholder: "Aceita positivo ou negativo. Ex: 2 ou -1"
    },
    {
      nome: "bonusDefesa",
      label: "Bônus de Defesa",
      tipo: "number",
      placeholder: "Aceita positivo ou negativo. Ex: 2 ou -1"
    },
    {
      nome: "bonusVelocidade",
      label: "Bônus de Velocidade",
      tipo: "number",
      placeholder: "Aceita positivo ou negativo. Ex: 2 ou -1"
    },
    {
      nome: "bonusResistencia",
      label: "Bônus de Resistência",
      tipo: "number",
      placeholder: "Aceita positivo ou negativo. Ex: 2 ou -1"
    },

    {
      nome: "penalidade",
      label: "Penalidade",
      tipo: "textarea",
      placeholder: "Ex: Reduz velocidade, aumenta custo de mana..."
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
  pararControleSubcategoriaItens();
}

export function initItens() {
  crud.init();

  onPageLoaded((pagina) => {
    if (pagina === "cadastrosItens" || pagina === "cadastrosItemDetalhe") {
      iniciarControleSubcategoriaItens();
    }
  });
}

function iniciarControleSubcategoriaItens() {
  pararControleSubcategoriaItens();

  aplicarFiltroSubcategoriaItem();

  intervaloCondicionalItens = setInterval(() => {
    aplicarFiltroSubcategoriaItem();
  }, 300);
}

function pararControleSubcategoriaItens() {
  if (intervaloCondicionalItens) {
    clearInterval(intervaloCondicionalItens);
    intervaloCondicionalItens = null;
  }
}

function aplicarFiltroSubcategoriaItem() {
  aplicarFiltroSubcategoria({
    categoriaId: "categoria",
    subcategoriaId: "subcategoria"
  });

  aplicarFiltroSubcategoria({
    categoriaId: "editcategoria",
    subcategoriaId: "editsubcategoria"
  });
}

function aplicarFiltroSubcategoria({ categoriaId, subcategoriaId }) {
  const categoria = document.getElementById(categoriaId);
  const subcategoria = document.getElementById(subcategoriaId);

  if (!categoria || !subcategoria) return;

  const categoriaAtual = categoria.value;
  const valorAtual = subcategoria.value;
  const opcoes = subcategoriasPorCategoria[categoriaAtual] || [];

  subcategoria.innerHTML = "";

  if (!categoriaAtual || opcoes.length === 0) {
    subcategoria.innerHTML = `<option value="">Selecione uma categoria primeiro</option>`;
    return;
  }

  subcategoria.innerHTML = `<option value="">Selecione uma subcategoria</option>`;

  opcoes.forEach((opcao) => {
    const option = document.createElement("option");
    option.value = opcao.valor;
    option.textContent = opcao.nome;
    subcategoria.appendChild(option);
  });

  const aindaExiste = opcoes.some((opcao) => opcao.valor === valorAtual);

  if (aindaExiste) {
    subcategoria.value = valorAtual;
  }

  if (!categoria.dataset.subcategoriaVinculada) {
    categoria.dataset.subcategoriaVinculada = "true";

    categoria.addEventListener("change", () => {
      subcategoria.value = "";
      aplicarFiltroSubcategoria({
        categoriaId,
        subcategoriaId
      });
    });
  }
}