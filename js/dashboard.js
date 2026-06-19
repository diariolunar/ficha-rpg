import { onPageLoaded } from "./navigation.js";
import { state } from "./state.js";

const totaisCatalogo = {
  habilidades: 0,
  itens: 0
};

export function initDashboard() {
  onPageLoaded((pagina) => {
    if (pagina === "dashboard") {
      atualizarDashboard();
    }
  });
}

export function setTotalCatalogoDashboard(nome, total) {
  if (!Object.prototype.hasOwnProperty.call(totaisCatalogo, nome)) return;

  totaisCatalogo[nome] = Number(total) || 0;
  atualizarDashboard();
}

export function limparDashboard() {
  totaisCatalogo.habilidades = 0;
  totaisCatalogo.itens = 0;
  atualizarDashboard();
}

export function atualizarDashboard() {
  const campanhas = state.minhasCampanhas || [];
  const personagens = state.personagens || [];

  definirTexto("contadorCampanhas", campanhas.length);
  definirTexto("contadorPersonagens", personagens.length);
  definirTexto("contadorRacas", state.racasDisponiveis.length);
  definirTexto("contadorRecursos", totaisCatalogo.habilidades + totaisCatalogo.itens);

  definirTexto("dashboardCampanhasStatus", `${campanhas.length} ${campanhas.length === 1 ? "cadastrada" : "cadastradas"}`);
  definirTexto("dashboardPersonagensStatus", `${personagens.length} ${personagens.length === 1 ? "cadastrado" : "cadastrados"}`);

  atualizarProximoPasso(campanhas, personagens);

  const tipoConta = state.dadosUsuarioAtual?.tipo || "jogador";
  definirTexto("dashboardTipoConta", tipoConta.toUpperCase());
  definirTexto("dashboardMembroDesde", formatarDataConta(obterCriacaoConta()));
  definirTexto("dashboardUltimoAcesso", formatarDataConta(state.usuarioAtual?.metadata?.lastSignInTime));
}

function atualizarProximoPasso(campanhas, personagens) {
  const ehMestre = state.dadosUsuarioAtual?.tipo === "mestre";
  const campanhaAtiva = campanhas.find((campanha) => campanha.sessaoAtiva === true || campanha.status === "ativa");
  const personagensPendentes = personagens.filter((personagem) => personagem.statusCampanha === "pendente");
  const titulo = document.getElementById("dashboardProximaAcao");
  const descricao = document.getElementById("dashboardProximaDescricao");
  const botao = document.getElementById("dashboardProximaAcaoBtn");

  if (!titulo || !descricao || !botao) return;

  let proximaAcao = {
    titulo: "Abrir suas campanhas",
    descricao: "Escolha uma campanha para continuar.",
    botao: "Ver campanhas",
    pagina: "campanhas"
  };

  if (campanhaAtiva) {
    proximaAcao = {
      titulo: `Continuar ${campanhaAtiva.nome || "sessão ativa"}`,
      descricao: `Rodada ${Number(campanhaAtiva.rodadaAtual || 0)} · Turno ${Number(campanhaAtiva.turnoAtual || 0)}`,
      botao: "Abrir sessão",
      pagina: "campanhas"
    };
  } else if (!campanhas.length) {
    proximaAcao = {
      titulo: ehMestre ? "Crie sua primeira campanha" : "Entre em uma campanha",
      descricao: ehMestre ? "Comece pela campanha e convide os jogadores depois." : "Use o código enviado pelo mestre.",
      botao: ehMestre ? "Criar campanha" : "Entrar em campanha",
      pagina: "campanhas"
    };
  } else if (!personagens.length) {
    proximaAcao = {
      titulo: "Crie seu primeiro personagem",
      descricao: "Depois você poderá vinculá-lo a uma campanha.",
      botao: "Criar personagem",
      pagina: "personagens"
    };
  } else if (ehMestre && personagensPendentes.length) {
    proximaAcao = {
      titulo: `${personagensPendentes.length} ${personagensPendentes.length === 1 ? "personagem aguarda" : "personagens aguardam"} aprovação`,
      descricao: "Revise os participantes antes de iniciar a sessão.",
      botao: "Revisar participantes",
      pagina: "campanhas"
    };
  }

  titulo.textContent = proximaAcao.titulo;
  descricao.textContent = proximaAcao.descricao;
  botao.textContent = proximaAcao.botao;
  botao.setAttribute("data-page-target", proximaAcao.pagina);

  definirTexto(
    "dashboardSessaoStatus",
    campanhaAtiva ? `${campanhaAtiva.nome || "Campanha"} em andamento` : "Nenhuma sessão ativa"
  );
}

function definirTexto(id, valor) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.textContent = valor;
  }
}

function obterCriacaoConta() {
  return state.dadosUsuarioAtual?.criadoEm || state.usuarioAtual?.metadata?.creationTime;
}

function formatarDataConta(valor) {
  if (!valor) return "—";

  const data = converterParaData(valor);

  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(data);
}

function converterParaData(valor) {
  if (typeof valor?.toDate === "function") {
    return valor.toDate();
  }

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  if (typeof valor === "string" || typeof valor === "number") {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  if (typeof valor?.seconds === "number") {
    return new Date(valor.seconds * 1000);
  }

  return null;
}
