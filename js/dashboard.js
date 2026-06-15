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
  definirTexto("contadorCampanhas", state.minhasCampanhas.length);
  definirTexto("contadorPersonagens", state.personagens.length);
  definirTexto("contadorRacas", state.racasDisponiveis.length);
  definirTexto("contadorRecursos", totaisCatalogo.habilidades + totaisCatalogo.itens);

  const tipoConta = state.dadosUsuarioAtual?.tipo || "jogador";
  definirTexto("dashboardTipoConta", tipoConta.toUpperCase());
  definirTexto("dashboardMembroDesde", formatarDataConta(obterCriacaoConta()));
  definirTexto("dashboardUltimoAcesso", formatarDataConta(state.usuarioAtual?.metadata?.lastSignInTime));
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
