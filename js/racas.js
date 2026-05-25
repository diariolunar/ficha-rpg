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
let unsubscribeClasses = null;
let unsubscribeElementos = null;
let unsubscribeHabilidades = null;

let classesDisponiveis = [];
let elementosDisponiveis = [];
let habilidadesDisponiveis = [];

let classesSugeridasSelecionadas = [];
let elementosAfinsSelecionados = [];
let restricoesClasseSelecionadas = [];

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

  carregarOpcoesRelacionadas();
}

export function pararRacas() {
  if (unsubscribeRacas) {
    unsubscribeRacas();
    unsubscribeRacas = null;
  }

  if (unsubscribeClasses) {
    unsubscribeClasses();
    unsubscribeClasses = null;
  }

  if (unsubscribeElementos) {
    unsubscribeElementos();
    unsubscribeElementos = null;
  }

  if (unsubscribeHabilidades) {
    unsubscribeHabilidades();
    unsubscribeHabilidades = null;
  }
}

function carregarOpcoesRelacionadas() {
  const classesQuery = query(collection(db, "classes"), orderBy("nome", "asc"));
  const elementosQuery = query(collection(db, "elementos"), orderBy("nome", "asc"));
  const habilidadesQuery = query(collection(db, "habilidades"), orderBy("nome", "asc"));

  unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
    classesDisponiveis = [];

    snapshot.forEach((documento) => {
      classesDisponiveis.push({
        id: documento.id,
        ...documento.data()
      });
    });

    preencherSelectClassesRaca();
  });

  unsubscribeElementos = onSnapshot(elementosQuery, (snapshot) => {
    elementosDisponiveis = [];

    snapshot.forEach((documento) => {
      elementosDisponiveis.push({
        id: documento.id,
        ...documento.data()
      });
    });

    preencherSelectElementosRaca();
  });

  unsubscribeHabilidades = onSnapshot(habilidadesQuery, (snapshot) => {
    habilidadesDisponiveis = [];

    snapshot.forEach((documento) => {
      habilidadesDisponiveis.push({
        id: documento.id,
        ...documento.data()
      });
    });

    preencherSelectHabilidadesRaca();
  });
}

function numeroCampo(id) {
  return Number(document.getElementById(id)?.value) || 0;
}

function textoCampo(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function valorSelect(id) {
  return document.getElementById(id)?.value || "";
}

function textoSelectSelecionado(id) {
  const select = document.getElementById(id);

  if (!select || !select.selectedOptions[0]) return "";

  return select.selectedOptions[0].textContent;
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

  const habilidadeExclusivaId = valorSelect("racaHabilidadeExclusiva");
  const habilidadeExclusivaNome = textoSelectSelecionado("racaHabilidadeExclusiva");

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

    carismaBonus: textoCampo("racaCarismaBonus"),
    fatorMedoBonus: textoCampo("racaFatorMedoBonus"),

    vantagens: textoCampo("racaVantagens"),
    desvantagens: textoCampo("racaDesvantagens"),

    classesSugeridas: classesSugeridasSelecionadas,
    elementosAfins: elementosAfinsSelecionados,
    restricoesClasse: restricoesClasseSelecionadas,

    habilidadeExclusiva: habilidadeExclusivaId
      ? {
          id: habilidadeExclusivaId,
          nome: habilidadeExclusivaNome
        }
      : null,

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
    "racaCarismaBonus",
    "racaFatorMedoBonus",
    "racaVantagens",
    "racaDesvantagens"
  ];

  campos.forEach((id) => {
    const campo = document.getElementById(id);

    if (campo) {
      campo.value = "";
    }
  });

  const habilidade = document.getElementById("racaHabilidadeExclusiva");

  if (habilidade) {
    habilidade.value = "";
  }

  classesSugeridasSelecionadas = [];
  elementosAfinsSelecionados = [];
  restricoesClasseSelecionadas = [];

  renderizarSelecionadosRaca();
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
      Resistência: ${raca.resistencia ?? 0}
      <br>
      <small>
        <b>Carisma:</b> ${raca.carismaBonus || "Não informado"}<br>
        <b>Fator Medo:</b> ${raca.fatorMedoBonus || "Não informado"}<br>
        <b>Vantagens/Bônus:</b> ${raca.vantagens || "Não informado"}<br>
        <b>Desvantagens/Penalidades:</b> ${raca.desvantagens || "Não informado"}<br>
        <b>Classes Sugeridas:</b> ${formatarListaObjetos(raca.classesSugeridas)}<br>
        <b>Elementos Afins:</b> ${formatarListaObjetos(raca.elementosAfins)}<br>
        <b>Habilidade Exclusiva:</b> ${raca.habilidadeExclusiva?.nome || "Não informado"}<br>
        <b>Restrição de Classe:</b> ${formatarListaObjetos(raca.restricoesClasse)}
      </small>
    `;

    listaRacas.appendChild(item);
  });
}

function formatarListaObjetos(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return "Não informado";
  }

  return lista.map((item) => item.nome).join(", ");
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

function preencherSelectClassesRaca() {
  preencherSelectGenerico("selectClassesSugeridas", classesDisponiveis, "Nenhuma classe cadastrada");
  preencherSelectGenerico("selectRestricaoClasse", classesDisponiveis, "Nenhuma classe cadastrada");
}

function preencherSelectElementosRaca() {
  preencherSelectGenerico("selectElementosAfins", elementosDisponiveis, "Nenhum elemento cadastrado");
}

function preencherSelectHabilidadesRaca() {
  preencherSelectGenerico("racaHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada");
}

function preencherSelectGenerico(selectId, lista, mensagemVazia) {
  const select = document.getElementById(selectId);

  if (!select) return;

  select.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    select.innerHTML = `<option value="">${mensagemVazia}</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma opção</option>`;

  lista.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.nome || "Sem nome";
    select.appendChild(option);
  });
}

function adicionarSelecionado(selectId, listaSelecionada, renderCallback) {
  const id = valorSelect(selectId);
  const nome = textoSelectSelecionado(selectId);

  if (!id) {
    alert("Selecione uma opção primeiro.");
    return;
  }

  const jaExiste = listaSelecionada.some((item) => item.id === id);

  if (jaExiste) {
    alert("Essa opção já foi adicionada.");
    return;
  }

  listaSelecionada.push({ id, nome });
  renderCallback();
}

function removerSelecionado(listaSelecionada, id, renderCallback) {
  const index = listaSelecionada.findIndex((item) => item.id === id);

  if (index >= 0) {
    listaSelecionada.splice(index, 1);
  }

  renderCallback();
}

function renderizarListaSelecionada(containerId, lista, mensagemVazia, tipo) {
  const container = document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = "";

  if (!lista || lista.length === 0) {
    container.innerHTML = `<span class="empty-selection">${mensagemVazia}</span>`;
    return;
  }

  lista.forEach((item) => {
    const chip = document.createElement("span");
    chip.classList.add("selected-chip");

    chip.innerHTML = `
      ${item.nome}
      <button type="button" title="Remover">×</button>
    `;

    chip.querySelector("button").addEventListener("click", () => {
      if (tipo === "classeSugerida") {
        removerSelecionado(classesSugeridasSelecionadas, item.id, renderizarSelecionadosRaca);
      }

      if (tipo === "elementoAfim") {
        removerSelecionado(elementosAfinsSelecionados, item.id, renderizarSelecionadosRaca);
      }

      if (tipo === "restricaoClasse") {
        removerSelecionado(restricoesClasseSelecionadas, item.id, renderizarSelecionadosRaca);
      }
    });

    container.appendChild(chip);
  });
}

function renderizarSelecionadosRaca() {
  renderizarListaSelecionada(
    "listaClassesSugeridasSelecionadas",
    classesSugeridasSelecionadas,
    "Nenhuma classe sugerida selecionada.",
    "classeSugerida"
  );

  renderizarListaSelecionada(
    "listaElementosAfinsSelecionados",
    elementosAfinsSelecionados,
    "Nenhum elemento afim selecionado.",
    "elementoAfim"
  );

  renderizarListaSelecionada(
    "listaRestricoesClasseSelecionadas",
    restricoesClasseSelecionadas,
    "Nenhuma restrição de classe selecionada.",
    "restricaoClasse"
  );
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

  document.getElementById("previewCarismaBonus").textContent = raca?.carismaBonus || "Nenhuma raça selecionada.";
  document.getElementById("previewFatorMedoBonus").textContent = raca?.fatorMedoBonus || "Nenhuma raça selecionada.";
  document.getElementById("previewVantagens").textContent = raca?.vantagens || "Nenhuma raça selecionada.";
  document.getElementById("previewDesvantagens").textContent = raca?.desvantagens || "Nenhuma raça selecionada.";
  document.getElementById("previewClassesSugeridas").textContent = formatarListaObjetos(raca?.classesSugeridas);
  document.getElementById("previewElementosAfins").textContent = formatarListaObjetos(raca?.elementosAfins);
  document.getElementById("previewHabilidadeExclusiva").textContent = raca?.habilidadeExclusiva?.nome || "Nenhuma raça selecionada.";
  document.getElementById("previewRestricaoClasse").textContent = formatarListaObjetos(raca?.restricoesClasse);
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
      preencherSelectClassesRaca();
      preencherSelectElementosRaca();
      preencherSelectHabilidadesRaca();
      renderizarSelecionadosRaca();
    }

    const btnAdicionarClasseSugerida = document.getElementById("adicionarClasseSugerida");

    if (btnAdicionarClasseSugerida) {
      btnAdicionarClasseSugerida.addEventListener("click", () => {
        adicionarSelecionado(
          "selectClassesSugeridas",
          classesSugeridasSelecionadas,
          renderizarSelecionadosRaca
        );
      });
    }

    const btnAdicionarElementoAfim = document.getElementById("adicionarElementoAfim");

    if (btnAdicionarElementoAfim) {
      btnAdicionarElementoAfim.addEventListener("click", () => {
        adicionarSelecionado(
          "selectElementosAfins",
          elementosAfinsSelecionados,
          renderizarSelecionadosRaca
        );
      });
    }

    const btnAdicionarRestricaoClasse = document.getElementById("adicionarRestricaoClasse");

    if (btnAdicionarRestricaoClasse) {
      btnAdicionarRestricaoClasse.addEventListener("click", () => {
        adicionarSelecionado(
          "selectRestricaoClasse",
          restricoesClasseSelecionadas,
          renderizarSelecionadosRaca
        );
      });
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