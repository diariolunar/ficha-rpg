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

function numeroCampo(id) {
  return Number(document.getElementById(id)?.value) || 0;
}

function textoCampo(id) {
  return document.getElementById(id)?.value.trim() || "";
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

  const nome = textoCampo("racaNome");

  if (!nome) {
    alert("Digite o nome da raça.");
    return;
  }

  const raca = {
    nome,
    hpBase: numeroCampo("racaHpBase"),
    manaBase: numeroCampo("racaManaBase"),
    forcaFisica: numeroCampo("racaForcaFisica"),
    forcaMagica: numeroCampo("racaForcaMagica"),
    defesaFisica: numeroCampo("racaDefesaFisica"),
    defesaMagica: numeroCampo("racaDefesaMagica"),
    velocidade: numeroCampo("racaVelocidade"),
    resistencia: numeroCampo("racaResistencia"),
    carisma: numeroCampo("racaCarisma"),
    fatorMedo: numeroCampo("racaFatorMedo"),
    vantagens: textoCampo("racaVantagens"),
    desvantagens: textoCampo("racaDesvantagens"),
    classesSugeridas: textoCampo("racaClassesSugeridas"),
    elementosAfins: textoCampo("racaElementosAfins"),
    habilidadeExclusiva: textoCampo("racaHabilidadeExclusiva"),
    restricaoClasse: textoCampo("racaRestricaoClasse"),
    criadoPor: state.usuarioAtual.uid,
    criadoEm: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "racas"), raca);

    limparFormularioRaca();

    alert("Raça salva no Firebase.");
  } catch (erro) {
    console.error("Erro ao salvar raça:", erro);
    alert("Erro ao salvar raça. Verifique as regras do Firestore.");
  }
}

function limparFormularioRaca() {
  const campos = [
    "racaNome",
    "racaHpBase",
    "racaManaBase",
    "racaForcaFisica",
    "racaForcaMagica",
    "racaDefesaFisica",
    "racaDefesaMagica",
    "racaVelocidade",
    "racaResistencia",
    "racaCarisma",
    "racaFatorMedo",
    "racaVantagens",
    "racaDesvantagens",
    "racaClassesSugeridas",
    "racaElementosAfins",
    "racaHabilidadeExclusiva",
    "racaRestricaoClasse"
  ];

  campos.forEach((id) => {
    const campo = document.getElementById(id);

    if (campo) {
      campo.value = "";
    }
  });
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
      <b>${raca.nome}</b>
      <br>
      HP: ${raca.hpBase ?? raca.hp ?? 0} |
      Mana: ${raca.manaBase ?? raca.mana ?? 0} |
      Força Física: ${raca.forcaFisica ?? raca.forca ?? 0} |
      Força Mágica: ${raca.forcaMagica ?? 0} |
      Defesa Física: ${raca.defesaFisica ?? raca.defesa ?? 0} |
      Defesa Mágica: ${raca.defesaMagica ?? 0} |
      Velocidade: ${raca.velocidade ?? 0} |
      Resistência: ${raca.resistencia ?? 0} |
      Carisma: ${raca.carisma ?? 0} |
      Fator Medo: ${raca.fatorMedo ?? 0}
      <br>
      <small>
        <b>Vantagens/Bônus:</b> ${raca.vantagens || "Não informado"}<br>
        <b>Desvantagens/Penalidades:</b> ${raca.desvantagens || "Não informado"}<br>
        <b>Classes Sugeridas:</b> ${raca.classesSugeridas || "Não informado"}<br>
        <b>Elementos Afins:</b> ${raca.elementosAfins || "Não informado"}<br>
        <b>Habilidade Exclusiva:</b> ${raca.habilidadeExclusiva || "Não informado"}<br>
        <b>Restrição de Classe:</b> ${raca.restricaoClasse || "Não informado"}
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

  document.getElementById("previewHp").textContent = raca?.hpBase ?? raca?.hp ?? 0;
  document.getElementById("previewMana").textContent = raca?.manaBase ?? raca?.mana ?? 0;
  document.getElementById("previewForcaFisica").textContent = raca?.forcaFisica ?? raca?.forca ?? 0;
  document.getElementById("previewForcaMagica").textContent = raca?.forcaMagica ?? 0;
  document.getElementById("previewDefesaFisica").textContent = raca?.defesaFisica ?? raca?.defesa ?? 0;
  document.getElementById("previewDefesaMagica").textContent = raca?.defesaMagica ?? 0;
  document.getElementById("previewVelocidade").textContent = raca?.velocidade ?? 0;
  document.getElementById("previewResistencia").textContent = raca?.resistencia ?? 0;
  document.getElementById("previewCarisma").textContent = raca?.carisma ?? 0;
  document.getElementById("previewFatorMedo").textContent = raca?.fatorMedo ?? 0;

  document.getElementById("previewVantagens").textContent = raca?.vantagens || "Nenhuma raça selecionada.";
  document.getElementById("previewDesvantagens").textContent = raca?.desvantagens || "Nenhuma raça selecionada.";
  document.getElementById("previewClassesSugeridas").textContent = raca?.classesSugeridas || "Nenhuma raça selecionada.";
  document.getElementById("previewElementosAfins").textContent = raca?.elementosAfins || "Nenhuma raça selecionada.";
  document.getElementById("previewHabilidadeExclusiva").textContent = raca?.habilidadeExclusiva || "Nenhuma raça selecionada.";
  document.getElementById("previewRestricaoClasse").textContent = raca?.restricaoClasse || "Nenhuma raça selecionada.";
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