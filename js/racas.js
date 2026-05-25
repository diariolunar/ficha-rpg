import {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from "./firebase.js";

import { state, setRacas, setRacaSelecionada } from "./state.js";
import { onPageLoaded, navegarPara } from "./navigation.js";

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

let editClassesSugeridasSelecionadas = [];
let editElementosAfinsSelecionados = [];
let editRestricoesClasseSelecionadas = [];

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
    sincronizarRacaSelecionada();
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

function sincronizarRacaSelecionada() {
  if (!state.racaSelecionada) return;

  const atualizada = state.racasDisponiveis.find((raca) => raca.id === state.racaSelecionada.id);

  if (atualizada) {
    setRacaSelecionada(atualizada);
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
    preencherSelectClassesRacaEdicao();
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
    preencherSelectElementosRacaEdicao();
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
    preencherSelectHabilidadesRacaEdicao();
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

function getNumeroRaca(raca, campoNovo, campoAntigo = null) {
  if (!raca) return 0;

  if (raca[campoNovo] !== undefined && raca[campoNovo] !== null) {
    return raca[campoNovo];
  }

  if (campoAntigo && raca[campoAntigo] !== undefined && raca[campoAntigo] !== null) {
    return raca[campoAntigo];
  }

  return 0;
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

async function salvarEdicaoRaca() {
  if (!state.racaSelecionada) {
    alert("Nenhuma raça selecionada.");
    return;
  }

  const nome = textoCampo("editRacaNome");

  if (!nome) {
    alert("Digite o nome da raça.");
    return;
  }

  const habilidadeExclusivaId = valorSelect("editRacaHabilidadeExclusiva");
  const habilidadeExclusivaNome = textoSelectSelecionado("editRacaHabilidadeExclusiva");

  const dadosAtualizados = {
    nome,
    hpBase: numeroCampo("editRacaHpBase"),
    manaBase: numeroCampo("editRacaManaBase"),
    forcaFisica: numeroCampo("editRacaForcaFisica"),
    forcaMagica: numeroCampo("editRacaForcaMagica"),
    defesaFisica: numeroCampo("editRacaDefesaFisica"),
    defesaMagica: numeroCampo("editRacaDefesaMagica"),
    velocidade: numeroCampo("editRacaVelocidade"),
    resistencia: numeroCampo("editRacaResistencia"),

    carismaBonus: textoCampo("editRacaCarismaBonus"),
    fatorMedoBonus: textoCampo("editRacaFatorMedoBonus"),

    vantagens: textoCampo("editRacaVantagens"),
    desvantagens: textoCampo("editRacaDesvantagens"),

    classesSugeridas: editClassesSugeridasSelecionadas,
    elementosAfins: editElementosAfinsSelecionados,
    restricoesClasse: editRestricoesClasseSelecionadas,

    habilidadeExclusiva: habilidadeExclusivaId
      ? {
          id: habilidadeExclusivaId,
          nome: habilidadeExclusivaNome
        }
      : null,

    atualizadoEm: serverTimestamp()
  };

  try {
    await updateDoc(doc(db, "racas", state.racaSelecionada.id), dadosAtualizados);

    setRacaSelecionada({
      ...state.racaSelecionada,
      ...dadosAtualizados
    });

    alert("Raça atualizada com sucesso.");
    renderizarDetalheRaca(false);
  } catch (erro) {
    console.error("Erro ao editar raça:", erro);
    alert("Erro ao editar raça.");
  }
}

async function excluirRaca() {
  if (!state.racaSelecionada) {
    alert("Nenhuma raça selecionada.");
    return;
  }

  const confirmar = confirm(`Tem certeza que deseja excluir a raça "${state.racaSelecionada.nome}"? Essa ação não pode ser desfeita.`);

  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "racas", state.racaSelecionada.id));

    setRacaSelecionada(null);

    alert("Raça excluída com sucesso.");
    navegarPara("cadastrosRacas");
  } catch (erro) {
    console.error("Erro ao excluir raça:", erro);
    alert("Erro ao excluir raça.");
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
    listaRacas.innerHTML = "<p>Nenhuma raça cadastrada ainda.</p>";
    return;
  }

  state.racasDisponiveis.forEach((raca) => {
    const card = document.createElement("div");
    card.classList.add("resource-card");

    card.innerHTML = `
      <div class="resource-card-header">
        <h4>${raca.nome}</h4>
        <span>Raça</span>
      </div>

      <div class="resource-card-stats">
        <span>HP: <b>${getNumeroRaca(raca, "hpBase", "hp")}</b></span>
        <span>Mana: <b>${getNumeroRaca(raca, "manaBase", "mana")}</b></span>
        <span>F. Física: <b>${getNumeroRaca(raca, "forcaFisica", "forca")}</b></span>
        <span>F. Mágica: <b>${getNumeroRaca(raca, "forcaMagica")}</b></span>
        <span>D. Física: <b>${getNumeroRaca(raca, "defesaFisica", "defesa")}</b></span>
        <span>D. Mágica: <b>${getNumeroRaca(raca, "defesaMagica")}</b></span>
      </div>

      <p><b>Carisma:</b> ${raca.carismaBonus || "Não informado"}</p>
      <p><b>Fator Medo:</b> ${raca.fatorMedoBonus || "Não informado"}</p>

      <div class="action-row">
        <button class="secondary-btn visualizar-raca">Visualizar</button>
        <button class="primary-btn editar-raca">Editar</button>
        <button class="small-btn danger excluir-raca">Excluir</button>
      </div>
    `;

    card.querySelector(".visualizar-raca").addEventListener("click", () => {
      setRacaSelecionada(raca);
      navegarPara("cadastrosRacaDetalhe");
    });

    card.querySelector(".editar-raca").addEventListener("click", () => {
      setRacaSelecionada(raca);
      navegarPara("cadastrosRacaDetalhe");
      setTimeout(() => {
        renderizarDetalheRaca(true);
      }, 300);
    });

    card.querySelector(".excluir-raca").addEventListener("click", async () => {
      setRacaSelecionada(raca);
      await excluirRaca();
    });

    listaRacas.appendChild(card);
  });
}

export function renderizarDetalheRaca(modoEdicao = false) {
  const container = document.getElementById("racaDetalheContainer");

  if (!container) return;

  const raca = state.racaSelecionada;

  if (!raca) {
    container.innerHTML = `
      <div class="form-card">
        <h3>Nenhuma raça selecionada</h3>
        <p>Volte para a lista de raças e selecione uma opção.</p>
        <button class="secondary-btn" id="voltarListaRacas">Voltar para raças</button>
      </div>
    `;

    document.getElementById("voltarListaRacas").addEventListener("click", () => {
      navegarPara("cadastrosRacas");
    });

    return;
  }

  if (modoEdicao) {
    renderizarFormularioEdicaoRaca(container, raca);
    return;
  }

  container.innerHTML = `
    <div class="detail-card">
      <h3>${raca.nome}</h3>
      <p class="detail-subtitle">Raça cadastrada pelo Mestre</p>

      <div class="detail-grid">
        <div class="detail-item">
          <span>HP Base</span>
          <strong>${getNumeroRaca(raca, "hpBase", "hp")}</strong>
        </div>

        <div class="detail-item">
          <span>Mana Base</span>
          <strong>${getNumeroRaca(raca, "manaBase", "mana")}</strong>
        </div>

        <div class="detail-item">
          <span>Força Física</span>
          <strong>${getNumeroRaca(raca, "forcaFisica", "forca")}</strong>
        </div>

        <div class="detail-item">
          <span>Força Mágica</span>
          <strong>${getNumeroRaca(raca, "forcaMagica")}</strong>
        </div>

        <div class="detail-item">
          <span>Defesa Física</span>
          <strong>${getNumeroRaca(raca, "defesaFisica", "defesa")}</strong>
        </div>

        <div class="detail-item">
          <span>Defesa Mágica</span>
          <strong>${getNumeroRaca(raca, "defesaMagica")}</strong>
        </div>

        <div class="detail-item">
          <span>Velocidade</span>
          <strong>${getNumeroRaca(raca, "velocidade")}</strong>
        </div>

        <div class="detail-item">
          <span>Resistência</span>
          <strong>${getNumeroRaca(raca, "resistencia")}</strong>
        </div>
      </div>

      <div class="detail-section">
        <h4>Carisma</h4>
        <p>${raca.carismaBonus || "Não informado"}</p>
      </div>

      <div class="detail-section">
        <h4>Fator Medo</h4>
        <p>${raca.fatorMedoBonus || "Não informado"}</p>
      </div>

      <div class="detail-section">
        <h4>Vantagens / Bônus</h4>
        <p>${raca.vantagens || "Não informado"}</p>
      </div>

      <div class="detail-section">
        <h4>Desvantagens / Penalidades</h4>
        <p>${raca.desvantagens || "Não informado"}</p>
      </div>

      <div class="detail-section">
        <h4>Classes Sugeridas</h4>
        <p>${formatarListaObjetos(raca.classesSugeridas)}</p>
      </div>

      <div class="detail-section">
        <h4>Elementos Afins</h4>
        <p>${formatarListaObjetos(raca.elementosAfins)}</p>
      </div>

      <div class="detail-section">
        <h4>Habilidade Exclusiva</h4>
        <p>${raca.habilidadeExclusiva?.nome || "Não informado"}</p>
      </div>

      <div class="detail-section">
        <h4>Restrição de Classe</h4>
        <p>${formatarListaObjetos(raca.restricoesClasse)}</p>
      </div>

      <div class="action-row">
        <button class="secondary-btn" id="voltarListaRacas">Voltar</button>
        <button class="primary-btn" id="abrirEdicaoRaca">Editar raça</button>
        <button class="small-btn danger" id="excluirRacaDetalhe">Excluir raça</button>
      </div>
    </div>
  `;

  document.getElementById("voltarListaRacas").addEventListener("click", () => {
    navegarPara("cadastrosRacas");
  });

  document.getElementById("abrirEdicaoRaca").addEventListener("click", () => {
    renderizarDetalheRaca(true);
  });

  document.getElementById("excluirRacaDetalhe").addEventListener("click", excluirRaca);
}

function renderizarFormularioEdicaoRaca(container, raca) {
  editClassesSugeridasSelecionadas = Array.isArray(raca.classesSugeridas) ? [...raca.classesSugeridas] : [];
  editElementosAfinsSelecionados = Array.isArray(raca.elementosAfins) ? [...raca.elementosAfins] : [];
  editRestricoesClasseSelecionadas = Array.isArray(raca.restricoesClasse) ? [...raca.restricoesClasse] : [];

  container.innerHTML = `
    <div class="form-card edit-panel">
      <h3>Editar Raça</h3>

      <div class="form-grid">
        <label>
          Nome da raça
          <input type="text" id="editRacaNome" value="${escapeHtml(raca.nome || "")}" />
        </label>

        <label>
          HP Base
          <input type="number" id="editRacaHpBase" value="${getNumeroRaca(raca, "hpBase", "hp")}" />
        </label>

        <label>
          Mana Base
          <input type="number" id="editRacaManaBase" value="${getNumeroRaca(raca, "manaBase", "mana")}" />
        </label>

        <label>
          Força Física
          <input type="number" id="editRacaForcaFisica" value="${getNumeroRaca(raca, "forcaFisica", "forca")}" />
        </label>

        <label>
          Força Mágica
          <input type="number" id="editRacaForcaMagica" value="${getNumeroRaca(raca, "forcaMagica")}" />
        </label>

        <label>
          Defesa Física
          <input type="number" id="editRacaDefesaFisica" value="${getNumeroRaca(raca, "defesaFisica", "defesa")}" />
        </label>

        <label>
          Defesa Mágica
          <input type="number" id="editRacaDefesaMagica" value="${getNumeroRaca(raca, "defesaMagica")}" />
        </label>

        <label>
          Velocidade
          <input type="number" id="editRacaVelocidade" value="${getNumeroRaca(raca, "velocidade")}" />
        </label>

        <label>
          Resistência
          <input type="number" id="editRacaResistencia" value="${getNumeroRaca(raca, "resistencia")}" />
        </label>
      </div>

      <div class="form-grid">
        <label>
          Modificador de Carisma
          <input type="text" id="editRacaCarismaBonus" value="${escapeHtml(raca.carismaBonus || "")}" />
        </label>

        <label>
          Modificador de Fator Medo
          <input type="text" id="editRacaFatorMedoBonus" value="${escapeHtml(raca.fatorMedoBonus || "")}" />
        </label>
      </div>

      <label>
        Vantagens / Bônus
        <textarea id="editRacaVantagens">${escapeHtml(raca.vantagens || "")}</textarea>
      </label>

      <label>
        Desvantagens / Penalidades
        <textarea id="editRacaDesvantagens">${escapeHtml(raca.desvantagens || "")}</textarea>
      </label>

      <div class="multi-select-box">
        <label>
          Classes Sugeridas
          <select id="editSelectClassesSugeridas">
            <option value="">Carregando classes...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="editAdicionarClasseSugerida">Adicionar classe sugerida</button>

        <div id="editListaClassesSugeridasSelecionadas" class="selected-list"></div>
      </div>

      <div class="multi-select-box">
        <label>
          Elementos Afins
          <select id="editSelectElementosAfins">
            <option value="">Carregando elementos...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="editAdicionarElementoAfim">Adicionar elemento afim</button>

        <div id="editListaElementosAfinsSelecionados" class="selected-list"></div>
      </div>

      <label>
        Habilidade Exclusiva
        <select id="editRacaHabilidadeExclusiva">
          <option value="">Carregando habilidades...</option>
        </select>
      </label>

      <div class="multi-select-box">
        <label>
          Restrição de Classe
          <select id="editSelectRestricaoClasse">
            <option value="">Carregando classes...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="editAdicionarRestricaoClasse">Adicionar restrição</button>

        <div id="editListaRestricoesClasseSelecionadas" class="selected-list"></div>
      </div>

      <div class="action-row">
        <button class="secondary-btn" id="cancelarEdicaoRaca">Cancelar</button>
        <button class="primary-btn" id="salvarEdicaoRaca">Salvar alterações</button>
      </div>
    </div>
  `;

  preencherSelectClassesRacaEdicao();
  preencherSelectElementosRacaEdicao();
  preencherSelectHabilidadesRacaEdicao();

  const habilidade = document.getElementById("editRacaHabilidadeExclusiva");

  if (habilidade && raca.habilidadeExclusiva?.id) {
    habilidade.value = raca.habilidadeExclusiva.id;
  }

  renderizarSelecionadosRacaEdicao();

  document.getElementById("editAdicionarClasseSugerida").addEventListener("click", () => {
    adicionarSelecionado("editSelectClassesSugeridas", editClassesSugeridasSelecionadas, renderizarSelecionadosRacaEdicao);
  });

  document.getElementById("editAdicionarElementoAfim").addEventListener("click", () => {
    adicionarSelecionado("editSelectElementosAfins", editElementosAfinsSelecionados, renderizarSelecionadosRacaEdicao);
  });

  document.getElementById("editAdicionarRestricaoClasse").addEventListener("click", () => {
    adicionarSelecionado("editSelectRestricaoClasse", editRestricoesClasseSelecionadas, renderizarSelecionadosRacaEdicao);
  });

  document.getElementById("cancelarEdicaoRaca").addEventListener("click", () => {
    renderizarDetalheRaca(false);
  });

  document.getElementById("salvarEdicaoRaca").addEventListener("click", salvarEdicaoRaca);
}

function escapeHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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

function preencherSelectClassesRacaEdicao() {
  preencherSelectGenerico("editSelectClassesSugeridas", classesDisponiveis, "Nenhuma classe cadastrada");
  preencherSelectGenerico("editSelectRestricaoClasse", classesDisponiveis, "Nenhuma classe cadastrada");
}

function preencherSelectElementosRacaEdicao() {
  preencherSelectGenerico("editSelectElementosAfins", elementosDisponiveis, "Nenhum elemento cadastrado");
}

function preencherSelectHabilidadesRacaEdicao() {
  preencherSelectGenerico("editRacaHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada");
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

function renderizarListaSelecionada(containerId, lista, mensagemVazia, callbackRemover) {
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
      callbackRemover(item.id);
    });

    container.appendChild(chip);
  });
}

function renderizarSelecionadosRaca() {
  renderizarListaSelecionada(
    "listaClassesSugeridasSelecionadas",
    classesSugeridasSelecionadas,
    "Nenhuma classe sugerida selecionada.",
    (id) => removerSelecionado(classesSugeridasSelecionadas, id, renderizarSelecionadosRaca)
  );

  renderizarListaSelecionada(
    "listaElementosAfinsSelecionados",
    elementosAfinsSelecionados,
    "Nenhum elemento afim selecionado.",
    (id) => removerSelecionado(elementosAfinsSelecionados, id, renderizarSelecionadosRaca)
  );

  renderizarListaSelecionada(
    "listaRestricoesClasseSelecionadas",
    restricoesClasseSelecionadas,
    "Nenhuma restrição de classe selecionada.",
    (id) => removerSelecionado(restricoesClasseSelecionadas, id, renderizarSelecionadosRaca)
  );
}

function renderizarSelecionadosRacaEdicao() {
  renderizarListaSelecionada(
    "editListaClassesSugeridasSelecionadas",
    editClassesSugeridasSelecionadas,
    "Nenhuma classe sugerida selecionada.",
    (id) => removerSelecionado(editClassesSugeridasSelecionadas, id, renderizarSelecionadosRacaEdicao)
  );

  renderizarListaSelecionada(
    "editListaElementosAfinsSelecionados",
    editElementosAfinsSelecionados,
    "Nenhum elemento afim selecionado.",
    (id) => removerSelecionado(editElementosAfinsSelecionados, id, renderizarSelecionadosRacaEdicao)
  );

  renderizarListaSelecionada(
    "editListaRestricoesClasseSelecionadas",
    editRestricoesClasseSelecionadas,
    "Nenhuma restrição de classe selecionada.",
    (id) => removerSelecionado(editRestricoesClasseSelecionadas, id, renderizarSelecionadosRacaEdicao)
  );
}

export function buscarRacaPorId(id) {
  return state.racasDisponiveis.find((raca) => raca.id === id) || null;
}

export function atualizarPreviewRaca(raca) {
  const previewHp = document.getElementById("previewHp");

  if (!previewHp) return;

  document.getElementById("previewHp").textContent = getNumeroRaca(raca, "hpBase", "hp");
  document.getElementById("previewMana").textContent = getNumeroRaca(raca, "manaBase", "mana");
  document.getElementById("previewForcaFisica").textContent = getNumeroRaca(raca, "forcaFisica", "forca");
  document.getElementById("previewForcaMagica").textContent = getNumeroRaca(raca, "forcaMagica");
  document.getElementById("previewDefesaFisica").textContent = getNumeroRaca(raca, "defesaFisica", "defesa");
  document.getElementById("previewDefesaMagica").textContent = getNumeroRaca(raca, "defesaMagica");
  document.getElementById("previewVelocidade").textContent = getNumeroRaca(raca, "velocidade");
  document.getElementById("previewResistencia").textContent = getNumeroRaca(raca, "resistencia");

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
  onPageLoaded((pagina) => {
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

    if (pagina === "cadastrosRacaDetalhe") {
      renderizarDetalheRaca(false);
    }

    atualizarContadorRacas();
  });
}