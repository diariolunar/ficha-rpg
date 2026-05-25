import {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "./firebase.js";

import { state, setRacas } from "./state.js";
import { onPageLoaded } from "./navigation.js";

let unsubscribeRacas = null;

export function iniciarRacas() {
  pararRacas();

  const racasRef = collection(db, "racas");
  const racasQuery = query(racasRef, orderBy("criadoEm", "desc"));

  unsubscribeRacas = onSnapshot(racasQuery, (snapshot) => {
    const racas = [];

    snapshot.forEach((documento) => {
      racas.push({
        id: documento.id,
        ...documento.data()
      });
    });

    setRacas(racas);
    renderizarRacas();
    preencherSelectRacas();
    atualizarContadorRacas();
  }, (erro) => {
    console.error("Erro ao carregar raças:", erro);
  });
}

export function pararRacas() {
  if (unsubscribeRacas) {
    unsubscribeRacas();
    unsubscribeRacas = null;
  }
}

async function salvarRaca() {
  if (!state.usuarioAtual) {
    alert("Você precisa estar logado.");
    return;
  }

  if (state.dadosUsuarioAtual?.tipo !== "mestre") {
    alert("Apenas o Mestre pode cadastrar raças.");
    return;
  }

  const nome = document.getElementById("racaNome").value.trim();
  const hp = Number(document.getElementById("racaHp").value) || 0;
  const mana = Number(document.getElementById("racaMana").value) || 0;
  const forca = Number(document.getElementById("racaForca").value) || 0;
  const defesa = Number(document.getElementById("racaDefesa").value) || 0;
  const velocidade = Number(document.getElementById("racaVelocidade").value) || 0;
  const vantagens = document.getElementById("racaVantagens").value.trim();
  const desvantagens = document.getElementById("racaDesvantagens").value.trim();

  if (!nome) {
    alert("Digite o nome da raça.");
    return;
  }

  try {
    await addDoc(collection(db, "racas"), {
      nome,
      hp,
      mana,
      forca,
      defesa,
      velocidade,
      vantagens,
      desvantagens,
      criadoPor: state.usuarioAtual.uid,
      criadoEm: serverTimestamp()
    });

    document.getElementById("racaNome").value = "";
    document.getElementById("racaHp").value = "";
    document.getElementById("racaMana").value = "";
    document.getElementById("racaForca").value = "";
    document.getElementById("racaDefesa").value = "";
    document.getElementById("racaVelocidade").value = "";
    document.getElementById("racaVantagens").value = "";
    document.getElementById("racaDesvantagens").value = "";

    alert("Raça salva no Firebase.");
  } catch (erro) {
    console.error("Erro ao salvar raça:", erro);
    alert("Erro ao salvar raça. Verifique as regras do Firestore.");
  }
}

export function renderizarRacas() {
  const listaRacas = document.getElementById("listaRacas");

  if (!listaRacas) return;

  listaRacas.innerHTML = "";

  if (state.racasDisponiveis.length === 0) {
    listaRacas.innerHTML = "<li>Nenhuma raça cadastrada ainda.</li>";
    return;
  }

  state.racasDisponiveis.forEach((raca) => {
    const item = document.createElement("li");

    item.innerHTML = `
      <b>${raca.nome}</b> — 
      HP: ${raca.hp || 0}, 
      Mana: ${raca.mana || 0}, 
      Força: ${raca.forca || 0}, 
      Defesa: ${raca.defesa || 0}, 
      Velocidade: ${raca.velocidade || 0}.
      <br>
      <small>
        <b>Vantagens:</b> ${raca.vantagens || "Não informado"} |
        <b>Desvantagens:</b> ${raca.desvantagens || "Não informado"}
      </small>
    `;

    listaRacas.appendChild(item);
  });
}

export function preencherSelectRacas() {
  const select = document.getElementById("personagemRaca");

  if (!select) return;

  select.innerHTML = "";

  if (state.racasDisponiveis.length === 0) {
    select.innerHTML = `<option value="">Nenhuma raça cadastrada</option>`;
    atualizarPreviewRaca(null);
    return;
  }

  select.innerHTML = `<option value="">Selecione uma raça</option>`;

  state.racasDisponiveis.forEach((raca) => {
    const option = document.createElement("option");
    option.value = raca.id;
    option.textContent = raca.nome;
    select.appendChild(option);
  });
}

export function buscarRacaPorId(id) {
  return state.racasDisponiveis.find((raca) => raca.id === id) || null;
}

export function atualizarPreviewRaca(raca) {
  const previewHp = document.getElementById("previewHp");

  if (!previewHp) return;

  document.getElementById("previewHp").textContent = raca?.hp || 0;
  document.getElementById("previewMana").textContent = raca?.mana || 0;
  document.getElementById("previewForca").textContent = raca?.forca || 0;
  document.getElementById("previewDefesa").textContent = raca?.defesa || 0;
  document.getElementById("previewVelocidade").textContent = raca?.velocidade || 0;
  document.getElementById("previewVantagens").textContent = raca?.vantagens || "Nenhuma raça selecionada.";
  document.getElementById("previewDesvantagens").textContent = raca?.desvantagens || "Nenhuma raça selecionada.";
}

function atualizarContadorRacas() {
  const contador = document.getElementById("contadorRacas");

  if (contador) {
    contador.textContent = state.racasDisponiveis.length;
  }
}

export function initRacas() {
  onPageLoaded(() => {
    const botaoSalvarRaca = document.getElementById("salvarRaca");

    if (botaoSalvarRaca) {
      botaoSalvarRaca.addEventListener("click", salvarRaca);
      renderizarRacas();
    }

    const selectRaca = document.getElementById("personagemRaca");

    if (selectRaca) {
      preencherSelectRacas();

      selectRaca.addEventListener("change", () => {
        const raca = buscarRacaPorId(selectRaca.value);
        atualizarPreviewRaca(raca);
      });
    }

    atualizarContadorRacas();
  });
}