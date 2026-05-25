import {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc
} from "./firebase.js";

import { state, setCampanhas } from "./state.js";
import { onPageLoaded } from "./navigation.js";

let unsubscribeCampanhasMestre = null;
let unsubscribeParticipacoesJogador = null;

function gerarCodigoCampanha() {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numeros = "0123456789";
  let codigo = "RPG-";

  for (let i = 0; i < 3; i++) {
    codigo += letras[Math.floor(Math.random() * letras.length)];
  }

  for (let i = 0; i < 3; i++) {
    codigo += numeros[Math.floor(Math.random() * numeros.length)];
  }

  return codigo;
}

export function iniciarCampanhas() {
  pararCampanhas();

  if (state.dadosUsuarioAtual?.tipo === "mestre") {
    carregarCampanhasDoMestre();
  } else {
    carregarCampanhasDoJogador();
  }
}

export function pararCampanhas() {
  if (unsubscribeCampanhasMestre) {
    unsubscribeCampanhasMestre();
    unsubscribeCampanhasMestre = null;
  }

  if (unsubscribeParticipacoesJogador) {
    unsubscribeParticipacoesJogador();
    unsubscribeParticipacoesJogador = null;
  }
}

async function criarCampanha() {
  if (!state.usuarioAtual) {
    alert("Você precisa estar logado.");
    return;
  }

  if (state.dadosUsuarioAtual?.tipo !== "mestre") {
    alert("Apenas o Mestre pode criar campanhas.");
    return;
  }

  const nome = document.getElementById("campanhaNome").value.trim();
  const descricao = document.getElementById("campanhaDescricao").value.trim();

  if (!nome) {
    alert("Digite o nome da campanha.");
    return;
  }

  const codigoEntrada = gerarCodigoCampanha();

  try {
    const campanhaRef = await addDoc(collection(db, "campanhas"), {
      nome,
      descricao,
      codigoEntrada,
      mestreId: state.usuarioAtual.uid,
      mestreNome: state.dadosUsuarioAtual.nome || state.usuarioAtual.email,
      criadoEm: serverTimestamp()
    });

    await setDoc(doc(db, "participantesCampanha", `${campanhaRef.id}_${state.usuarioAtual.uid}`), {
      campanhaId: campanhaRef.id,
      usuarioId: state.usuarioAtual.uid,
      usuarioNome: state.dadosUsuarioAtual.nome || state.usuarioAtual.email,
      usuarioEmail: state.usuarioAtual.email,
      tipo: "mestre",
      entrouEm: serverTimestamp()
    });

    document.getElementById("campanhaNome").value = "";
    document.getElementById("campanhaDescricao").value = "";

    alert(`Campanha criada com sucesso. Código: ${codigoEntrada}`);
  } catch (erro) {
    console.error("Erro ao criar campanha:", erro);
    alert("Erro ao criar campanha.");
  }
}

async function entrarEmCampanha() {
  if (!state.usuarioAtual) {
    alert("Você precisa estar logado.");
    return;
  }

  const codigo = document.getElementById("codigoCampanhaEntrada").value.trim().toUpperCase();

  if (!codigo) {
    alert("Digite o código da campanha.");
    return;
  }

  try {
    const campanhasRef = collection(db, "campanhas");
    const consulta = query(campanhasRef, where("codigoEntrada", "==", codigo));
    const resultado = await getDocs(consulta);

    if (resultado.empty) {
      alert("Nenhuma campanha encontrada com esse código.");
      return;
    }

    const campanhaDoc = resultado.docs[0];
    const campanha = campanhaDoc.data();

    await setDoc(doc(db, "participantesCampanha", `${campanhaDoc.id}_${state.usuarioAtual.uid}`), {
      campanhaId: campanhaDoc.id,
      usuarioId: state.usuarioAtual.uid,
      usuarioNome: state.dadosUsuarioAtual.nome || state.usuarioAtual.email,
      usuarioEmail: state.usuarioAtual.email,
      tipo: state.dadosUsuarioAtual.tipo || "jogador",
      mestreId: campanha.mestreId,
      entrouEm: serverTimestamp()
    });

    document.getElementById("codigoCampanhaEntrada").value = "";

    alert(`Você entrou na campanha: ${campanha.nome}`);
  } catch (erro) {
    console.error("Erro ao entrar na campanha:", erro);
    alert("Erro ao entrar na campanha.");
  }
}

function carregarCampanhasDoMestre() {
  const campanhasRef = collection(db, "campanhas");
  const consulta = query(campanhasRef, where("mestreId", "==", state.usuarioAtual.uid));

  unsubscribeCampanhasMestre = onSnapshot(consulta, (snapshot) => {
    const campanhas = [];

    snapshot.forEach((documento) => {
      campanhas.push({
        id: documento.id,
        ...documento.data()
      });
    });

    setCampanhas(campanhas);
    renderizarCampanhas();
    preencherSelectCampanhas();
    atualizarContadorCampanhas();
  });
}

function carregarCampanhasDoJogador() {
  const participantesRef = collection(db, "participantesCampanha");
  const consulta = query(participantesRef, where("usuarioId", "==", state.usuarioAtual.uid));

  unsubscribeParticipacoesJogador = onSnapshot(consulta, async (snapshot) => {
    const campanhas = [];

    for (const participacaoDoc of snapshot.docs) {
      const participacao = participacaoDoc.data();
      const campanhaRef = doc(db, "campanhas", participacao.campanhaId);
      const campanhaSnap = await getDoc(campanhaRef);

      if (campanhaSnap.exists()) {
        campanhas.push({
          id: campanhaSnap.id,
          ...campanhaSnap.data()
        });
      }
    }

    setCampanhas(campanhas);
    renderizarCampanhas();
    preencherSelectCampanhas();
    atualizarContadorCampanhas();
  });
}

export function renderizarCampanhas() {
  const lista = document.getElementById("listaCampanhas");

  if (!lista) return;

  lista.innerHTML = "";

  if (state.minhasCampanhas.length === 0) {
    lista.innerHTML = state.dadosUsuarioAtual?.tipo === "mestre"
      ? "<p>Nenhuma campanha criada ainda.</p>"
      : "<p>Você ainda não entrou em nenhuma campanha.</p>";
    return;
  }

  state.minhasCampanhas.forEach((campanha) => {
    const card = document.createElement("div");
    card.classList.add("campaign-card");

    if (state.dadosUsuarioAtual?.tipo === "mestre") {
      card.innerHTML = `
        <h3>${campanha.nome}</h3>
        <p>${campanha.descricao || "Sem descrição."}</p>
        <p><b>Mestre:</b> ${campanha.mestreNome || "Não informado"}</p>
        <span class="campaign-code">${campanha.codigoEntrada}</span>
      `;
    } else {
      card.innerHTML = `
        <h3>${campanha.nome}</h3>
        <p>${campanha.descricao || "Sem descrição."}</p>
        <p><b>Mestre:</b> ${campanha.mestreNome || "Não informado"}</p>
      `;
    }

    lista.appendChild(card);
  });
}

export function preencherSelectCampanhas() {
  const select = document.getElementById("personagemCampanha");

  if (!select) return;

  select.innerHTML = "";

  if (state.minhasCampanhas.length === 0) {
    select.innerHTML = `<option value="">Nenhuma campanha disponível</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma campanha</option>`;

  state.minhasCampanhas.forEach((campanha) => {
    const option = document.createElement("option");
    option.value = campanha.id;
    option.textContent = campanha.nome;
    select.appendChild(option);
  });
}

export function buscarCampanhaPorId(id) {
  return state.minhasCampanhas.find((campanha) => campanha.id === id) || null;
}

function atualizarContadorCampanhas() {
  const contador = document.getElementById("contadorCampanhas");

  if (contador) {
    contador.textContent = state.minhasCampanhas.length;
  }
}

export function initCampanhas() {
  onPageLoaded(() => {
    const btnCriarCampanha = document.getElementById("btnCriarCampanha");
    const btnEntrarCampanha = document.getElementById("btnEntrarCampanha");

    if (btnCriarCampanha) {
      btnCriarCampanha.addEventListener("click", criarCampanha);
    }

    if (btnEntrarCampanha) {
      btnEntrarCampanha.addEventListener("click", entrarEmCampanha);
    }

    renderizarCampanhas();
    preencherSelectCampanhas();
    atualizarContadorCampanhas();
  });
}