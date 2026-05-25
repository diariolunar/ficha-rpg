import { criarCadastroCrud } from "./cadastroCrud.js";

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
  camposPrincipais: ["tipo", "rankNivelAmeaca", "hp", "mana", "fatorMedo", "inteligencia"],
  camposResumo: ["tipo", "rankNivelAmeaca", "hp", "mana"],
  camposCard: ["habitat", "xpRecompensa"],
  campos: [
    {
      nome: "nome",
      label: "Nome do Monstro",
      tipo: "text",
      placeholder: "Ex: Devorador de Ossos, Lobo Sombrio..."
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
      tipo: "text",
      placeholder: "Ex: Baixo, Médio, Alto, Rank A, Nível 5..."
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
      nome: "forcaFisica",
      label: "Força Física",
      tipo: "number",
      placeholder: "Ex: 10"
    },
    {
      nome: "forcaMagica",
      label: "Força Mágica",
      tipo: "number",
      placeholder: "Ex: 4"
    },
    {
      nome: "defesaFisica",
      label: "Defesa Física",
      tipo: "number",
      placeholder: "Ex: 8"
    },
    {
      nome: "defesaMagica",
      label: "Defesa Mágica",
      tipo: "number",
      placeholder: "Ex: 3"
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
      mensagemVazia: "Nenhuma habilidade cadastrada"
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
      nome: "habitat",
      label: "Habitat",
      tipo: "textarea",
      placeholder: "Ex: Florestas, cavernas, ruínas, pântanos..."
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