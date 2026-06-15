import {
  db,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "./firebase.js";

import { state } from "./state.js";
import { onPageLoaded } from "./navigation.js";
import { mostrarModal } from "./ui.js";

let unsubscribeSessao = null;
let sessaoAtual = null;

function campanhaSelecionadaId() {
  return document.getElementById("sessaoCampanhaSelect")?.value || "";
}

function preencherCampanhasSessao() {
  const select = document.getElementById("sessaoCampanhaSelect");

  if (!select) return;

  select.innerHTML = "";

  const campanhas = state.minhasCampanhas || [];

  if (campanhas.length === 0) {
    select.innerHTML = `<option value="">Nenhuma campanha encontrada</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma campanha</option>`;

  campanhas.forEach((campanha) => {
    const option = document.createElement("option");
    option.value = campanha.id;
    option.textContent = campanha.nome || "Campanha sem nome";
    select.appendChild(option);
  });
}

function carregarRoteiroSessao() {
  if (unsubscribeSessao) {
    unsubscribeSessao();
    unsubscribeSessao = null;
  }

  const campanhaId = campanhaSelecionadaId();

  limparCampos();

  if (!campanhaId) return;

  unsubscribeSessao = onSnapshot(doc(db, "sessoes", campanhaId), (snapshot) => {
    if (!snapshot.exists()) {
      sessaoAtual = null;
      limparCampos();
      return;
    }

    sessaoAtual = {
      id: snapshot.id,
      ...snapshot.data()
    };

    preencherCampos(sessaoAtual.roteiro || {});
  });
}

export function pararSessao() {
  if (unsubscribeSessao) {
    unsubscribeSessao();
    unsubscribeSessao = null;
  }

  sessaoAtual = null;
}

function limparCampos() {
  const campos = [
    "sessaoTitulo",
    "sessaoResumo",
    "sessaoCenas",
    "sessaoObjetivos",
    "sessaoNotas",
    "sessaoEventos"
  ];

  campos.forEach((id) => {
    const campo = document.getElementById(id);

    if (campo) {
      campo.value = "";
    }
  });
}

function preencherCampos(roteiro) {
  const mapa = {
    sessaoTitulo: roteiro.titulo || "",
    sessaoResumo: roteiro.resumo || "",
    sessaoCenas: roteiro.cenas || "",
    sessaoObjetivos: roteiro.objetivos || "",
    sessaoNotas: roteiro.notas || "",
    sessaoEventos: roteiro.eventos || ""
  };

  Object.entries(mapa).forEach(([id, valor]) => {
    const campo = document.getElementById(id);

    if (campo && campo.value !== valor) {
      campo.value = valor;
    }
  });
}

async function salvarRoteiroSessao() {
  const campanhaId = campanhaSelecionadaId();

  if (!campanhaId) {
    await mostrarModal("Selecione uma campanha primeiro.", "Campo obrigatório");
    return;
  }

  const roteiro = {
    titulo: document.getElementById("sessaoTitulo")?.value.trim() || "",
    resumo: document.getElementById("sessaoResumo")?.value.trim() || "",
    cenas: document.getElementById("sessaoCenas")?.value.trim() || "",
    objetivos: document.getElementById("sessaoObjetivos")?.value.trim() || "",
    notas: document.getElementById("sessaoNotas")?.value.trim() || "",
    eventos: document.getElementById("sessaoEventos")?.value.trim() || ""
  };

  await setDoc(doc(db, "sessoes", campanhaId), {
    campanhaId,
    roteiro,
    atualizadoEm: serverTimestamp()
  }, { merge: true });

  await mostrarModal("Roteiro salvo com sucesso.", "Roteiro atualizado", "success");
}

export function initSessao() {
  onPageLoaded((pagina) => {
    if (pagina !== "sessao") {
      pararSessao();
      return;
    }

    pararSessao();
    preencherCampanhasSessao();

    document.getElementById("sessaoCampanhaSelect")?.addEventListener("change", carregarRoteiroSessao);
    document.getElementById("btnSalvarRoteiroSessao")?.addEventListener("click", salvarRoteiroSessao);
  });
}
