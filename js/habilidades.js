import { criarCadastroCrud } from "./cadastroCrud.js";

const tiposHabilidade = [
  { valor: "area", nome: "Área" },
  { valor: "turno", nome: "Turno" },
  { valor: "buff", nome: "Buff" },
  { valor: "debuff", nome: "Debuff" },
  { valor: "dano", nome: "Dano" },
  { valor: "defesa", nome: "Defesa" },
  { valor: "invocacao", nome: "Invocação" },
  { valor: "cura", nome: "Cura" },
  { valor: "passiva", nome: "Passiva" },
  { valor: "personalizada", nome: "Personalizada" }
];

const ranks = [
  { valor: "baixo", nome: "Baixo" },
  { valor: "medio", nome: "Médio" },
  { valor: "alto", nome: "Alto" },
  { valor: "especial", nome: "Especial" },
  { valor: "lendario", nome: "Lendário" }
];

const crud = criarCadastroCrud({
  colecao: "habilidades",
  nomeSingular: "Habilidade",
  nomePlural: "Habilidades",
  paginaLista: "cadastrosHabilidades",
  paginaDetalhe: "cadastrosHabilidadeDetalhe",
  formContainerId: "formHabilidades",
  listaId: "listaHabilidades",
  detalheContainerId: "habilidadeDetalheContainer",
  botaoSalvarId: "salvarHabilidade",
  camposPrincipais: ["tipo", "rankNivel", "custoManaEnergia", "cooldown"],
  camposResumo: ["tipo", "rankNivel", "custoManaEnergia", "danoBase"],
  camposCard: ["tipoDano", "efeitoSecundario"],
  campos: [
    {
      nome: "nome",
      label: "Nome da Habilidade",
      tipo: "text",
      placeholder: "Ex: Crítico, Invisibilidade, Bola de Fogo..."
    },
    {
      nome: "tipo",
      label: "Tipo",
      tipo: "select",
      opcoes: tiposHabilidade
    },
    {
      nome: "rankNivel",
      label: "Rank / Nível",
      tipo: "select",
      opcoes: ranks
    },
    {
      nome: "custoManaEnergia",
      label: "Custo de Mana / Energia",
      tipo: "number",
      placeholder: "Ex: 10"
    },
    {
      nome: "cooldown",
      label: "Cooldown",
      tipo: "text",
      placeholder: "Ex: 2 turnos, 1 rodada..."
    },
    {
      nome: "alcance",
      label: "Alcance",
      tipo: "text",
      placeholder: "Ex: Corpo a corpo, 10 metros, campo inteiro..."
    },
    {
      nome: "areaEfeito",
      label: "Área de Efeito",
      tipo: "text",
      placeholder: "Ex: Cone, círculo, linha reta, alvo único..."
    },
    {
      nome: "danoBase",
      label: "Dano Base",
      tipo: "number",
      placeholder: "Ex: 20"
    },
    {
      nome: "escalamento",
      label: "Escalamento",
      tipo: "textarea",
      placeholder: "Ex: Soma Força Mágica, dobra em crítico..."
    },
    {
      nome: "tipoDano",
      label: "Tipo de Dano",
      tipo: "text",
      placeholder: "Ex: Físico, Mágico, Fogo, Veneno..."
    },
    {
      nome: "efeitoSecundario",
      label: "Efeito Secundário",
      tipo: "textarea",
      placeholder: "Ex: Aplica queimadura, reduz defesa, empurra o alvo..."
    },
    {
      nome: "duracao",
      label: "Duração",
      tipo: "text",
      placeholder: "Ex: Instantânea, 2 turnos, até o fim da rodada..."
    },
    {
      nome: "condicaoUso",
      label: "Condição de Uso",
      tipo: "textarea",
      placeholder: "Ex: Só pode usar com arma equipada, exige D20 acima de 15..."
    },
    {
      nome: "vantagem",
      label: "Vantagem",
      tipo: "textarea",
      placeholder: "Explique o benefício da habilidade..."
    },
    {
      nome: "penalidade",
      label: "Penalidade",
      tipo: "textarea",
      placeholder: "Explique o custo, risco ou consequência..."
    },
    {
      nome: "evolucao",
      label: "Evolução",
      tipo: "textarea",
      placeholder: "Explique como a habilidade evolui..."
    }
  ]
});

export function iniciarHabilidades() {
  crud.iniciar();
}

export function pararHabilidades() {
  crud.parar();
}

export function initHabilidades() {
  crud.init();
}