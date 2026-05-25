import {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where
} from "./firebase.js";

import { state, setPersonagens } from "./state.js";
import { onPageLoaded } from "./navigation.js";
import { buscarRacaPorId, preencherSelectRacas, atualizarPreviewRaca } from "./racas.js";
import { buscarCampanhaPorId, preencherSelectCampanhas } from "./campanhas.js";
import { abrirFichaPersonagem } from "./ficha.js";

let unsubscribePersonagens = null;

export function iniciarPersonagens() {
  pararPersonagens();

  const personagensRef = collection(db, "personagens");

  const consulta = state.dadosUsuarioAtual?.tipo === "mestre"
    ? query(personagensRef, where("mestreId", "==", state.usuarioAtual.uid))
    : query(personagensRef, where("donoId", "==", state.usuarioAtual.uid));

  unsubscribePersonagens = onSnapshot(consulta, (snapshot) => {
    const personagens = [];

    snapshot.forEach((documento) => {
      personagens.push({
        id: documento.id,
        ...documento.data()
      });
    });

    setPersonagens(personagens);
    renderizarPersonagens();
    renderizarTabelaMestre();
    atualizarContadorPersonagens();
  });
}

export function pararPersonagens() {
  if (unsubscribePersonagens) {
    unsubscribePersonagens();
    unsubscribePersonagens = null;
  }
}

async function criarPersonagem() {
  if (!state.usuarioAtual) {
    alert("Você precisa estar logado.");
    return;
  }

  const nome = document.getElementById("personagemNome").value.trim();
  const campanhaId = document.getElementById("personagemCampanha").value;
  const racaId = document.getElementById("personagemRaca").value;
  const classe = document.getElementById("personagemClasse").value.trim();
  const subclasse = document.getElementById("personagemSubclasse").value.trim();
  const elemento = document.getElementById("personagemElemento").value.trim();
  const historia = document.getElementById("personagemHistoria").value.trim();

  if (!nome) {
    alert("Digite o nome do personagem.");
    return;
  }

  if (!campanhaId) {
    alert("Selecione uma campanha.");
    return;
  }

  if (!racaId) {
    alert("Selecione uma raça.");
    return;
  }

  const campanha = buscarCampanhaPorId(campanhaId);
  const raca = buscarRacaPorId(racaId);

  if (!campanha || !raca) {
    alert("Campanha ou raça não encontrada.");
    return;
  }

  try {
    await addDoc(collection(db, "personagens"), {
      nome,
      donoId: state.usuarioAtual.uid,
      donoNome: state.dadosUsuarioAtual.nome || state.usuarioAtual.email,
      donoEmail: state.usuarioAtual.email,
      campanhaId,
      campanhaNome: campanha.nome,
      mestreId: campanha.mestreId,
      racaId,
      racaNome: raca.nome,

      classe,
      subclasse,
      elemento,
      historia,

      hpMax: raca.hpBase ?? raca.hp ?? 0,
      hpAtual: raca.hpBase ?? raca.hp ?? 0,
      manaMax: raca.manaBase ?? raca.mana ?? 0,
      manaAtual: raca.manaBase ?? raca.mana ?? 0,

      forcaFisica: raca.forcaFisica ?? raca.forca ?? 0,
      forcaMagica: raca.forcaMagica ?? 0,
      defesaFisica: raca.defesaFisica ?? raca.defesa ?? 0,
      defesaMagica: raca.defesaMagica ?? 0,
      velocidade: raca.velocidade ?? 0,
      resistencia: raca.resistencia ?? 0,

      carismaBonus: raca.carismaBonus || "",
      fatorMedoBonus: raca.fatorMedoBonus || "",

      fome: 0,
      fadiga: 0,

      vantagens: raca.vantagens || "",
      desvantagens: raca.desvantagens || "",
      classesSugeridas: raca.classesSugeridas || [],
      elementosAfins: raca.elementosAfins || [],
      habilidadeExclusiva: raca.habilidadeExclusiva || null,
      restricoesClasse: raca.restricoesClasse || [],

      criadoEm: serverTimestamp()
    });

    document.getElementById("personagemNome").value = "";
    document.getElementById("personagemCampanha").value = "";
    document.getElementById("personagemRaca").value = "";
    document.getElementById("personagemClasse").value = "";
    document.getElementById("personagemSubclasse").value = "";
    document.getElementById("personagemElemento").value = "";
    document.getElementById("personagemHistoria").value = "";

    atualizarPreviewRaca(null);

    alert("Personagem criado com sucesso.");
  } catch (erro) {
    console.error("Erro ao criar personagem:", erro);
    alert("Erro ao criar personagem.");
  }
}

export function renderizarPersonagens() {
  const lista = document.getElementById("listaPersonagens");

  if (!lista) return;

  lista.innerHTML = "";

  const personagensDoUsuario = state.dadosUsuarioAtual?.tipo === "mestre"
    ? state.personagens
    : state.personagens.filter((personagem) => personagem.donoId === state.usuarioAtual.uid);

  if (personagensDoUsuario.length === 0) {
    lista.innerHTML = "<p>Nenhum personagem criado ainda.</p>";
    return;
  }

  personagensDoUsuario.forEach((personagem) => {
    const card = document.createElement("div");
    card.classList.add("character-created-card");

    card.innerHTML = `
      <h3>${personagem.nome}</h3>
      <p><b>Jogador:</b> ${personagem.donoNome || "Não informado"}</p>
      <p><b>Campanha:</b> ${personagem.campanhaNome || "Não informada"}</p>
      <p><b>Raça:</b> ${personagem.racaNome || "Não informada"}</p>
      <p><b>Classe:</b> ${personagem.classe || "Não informada"}</p>
      <p><b>HP:</b> ${personagem.hpAtual}/${personagem.hpMax} | <b>Mana:</b> ${personagem.manaAtual}/${personagem.manaMax}</p>
      <button class="secondary-btn">Abrir ficha</button>
    `;

    card.querySelector("button").addEventListener("click", () => {
      abrirFichaPersonagem(personagem);
    });

    lista.appendChild(card);
  });
}

export function renderizarTabelaMestre() {
  const tabela = document.getElementById("tabelaPersonagensMestre");

  if (!tabela) return;

  tabela.innerHTML = "";

  if (state.personagens.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="8">Nenhum personagem encontrado nas suas campanhas.</td>
      </tr>
    `;
    return;
  }

  state.personagens.forEach((personagem) => {
    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${personagem.nome}</td>
      <td>${personagem.donoNome || "Não informado"}</td>
      <td>${personagem.hpAtual}/${personagem.hpMax}</td>
      <td>${personagem.manaAtual}/${personagem.manaMax}</td>
      <td>${personagem.fome || 0}%</td>
      <td>${personagem.fadiga || 0}%</td>
      <td>Normal</td>
      <td><button class="small-btn danger">Possessão</button></td>
    `;

    tabela.appendChild(linha);
  });
}

function atualizarContadorPersonagens() {
  const contador = document.getElementById("contadorPersonagens");

  if (contador) {
    contador.textContent = state.personagens.length;
  }
}

export function initPersonagens() {
  onPageLoaded((pagina) => {
    if (pagina === "personagens") {
      preencherSelectCampanhas();
      preencherSelectRacas();
      renderizarPersonagens();

      const selectRaca = document.getElementById("personagemRaca");

      if (selectRaca) {
        selectRaca.addEventListener("change", () => {
          const raca = buscarRacaPorId(selectRaca.value);
          atualizarPreviewRaca(raca);
        });
      }

      const btnCriarPersonagem = document.getElementById("btnCriarPersonagem");

      if (btnCriarPersonagem) {
        btnCriarPersonagem.addEventListener("click", criarPersonagem);
      }
    }

    if (pagina === "mestre") {
      renderizarTabelaMestre();
    }

    if (pagina === "dashboard") {
      atualizarContadorPersonagens();
    }
  });
}