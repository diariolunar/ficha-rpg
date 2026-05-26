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
import { mostrarModal, confirmarModal } from "./ui.js";

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
  const racasQuery = query(racasRef, orderBy("nome", "asc"));

  unsubscribeRacas = onSnapshot(
    racasQuery,
    (snapshot) => {
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
      atualizarContadorRacas();
    },
    (erro) => {
      console.error("Erro ao carregar raças:", erro);
    }
  );

  carregarOpcoesRelacionadasRaca();
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

function carregarOpcoesRelacionadasRaca() {
  unsubscribeClasses = onSnapshot(
    query(collection(db, "classes"), orderBy("nome", "asc")),
    (snapshot) => {
      classesDisponiveis = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      preencherSelectClassesRaca();
      preencherSelectClassesRacaEdicao();
    },
    (erro) => {
      console.error("Erro ao carregar classes para raças:", erro);
    }
  );

  unsubscribeElementos = onSnapshot(
    query(collection(db, "elementos"), orderBy("nome", "asc")),
    (snapshot) => {
      elementosDisponiveis = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      preencherSelectElementosRaca();
      preencherSelectElementosRacaEdicao();
    },
    (erro) => {
      console.error("Erro ao carregar elementos para raças:", erro);
    }
  );

  unsubscribeHabilidades = onSnapshot(
    query(collection(db, "habilidades"), orderBy("nome", "asc")),
    (snapshot) => {
      habilidadesDisponiveis = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      preencherSelectHabilidadesRaca();
      preencherSelectHabilidadesRacaEdicao();
    },
    (erro) => {
      console.error("Erro ao carregar habilidades para raças:", erro);
    }
  );
}

function sincronizarRacaSelecionada() {
  if (!state.racaSelecionada) return;

  const atualizada = state.racasDisponiveis.find((raca) => raca.id === state.racaSelecionada.id);

  if (atualizada) {
    setRacaSelecionada(atualizada);
  }
}

export function buscarRacaPorId(id) {
  return state.racasDisponiveis.find((raca) => raca.id === id) || null;
}

export function preencherSelectRacas() {
  const select = document.getElementById("personagemRaca");

  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = "";

  if (!state.racasDisponiveis || state.racasDisponiveis.length === 0) {
    select.innerHTML = `<option value="">Nenhuma raça cadastrada</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma raça</option>`;

  state.racasDisponiveis.forEach((raca) => {
    const option = document.createElement("option");
    option.value = raca.id;
    option.textContent = raca.nome || "Sem nome";
    select.appendChild(option);
  });

  if (valorAtual) {
    select.value = valorAtual;
  }
}

function textoCampo(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function numeroCampo(id) {
  return Number(document.getElementById(id)?.value) || 0;
}

function valorCampo(id) {
  return document.getElementById(id)?.value || "";
}

function textoSelectSelecionado(id) {
  const select = document.getElementById(id);

  if (!select || !select.selectedOptions[0]) return "";

  return select.selectedOptions[0].textContent;
}

function habilidadeSelecionada(idSelect) {
  const id = valorCampo(idSelect);

  if (!id) return null;

  return {
    id,
    nome: textoSelectSelecionado(idSelect)
  };
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function abrirModalCadastroRaca() {
  fecharModalCadastroRaca();

  classesSugeridasSelecionadas = [];
  elementosAfinsSelecionados = [];
  restricoesClasseSelecionadas = [];

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalCadastroRaca";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Cadastrar Raça</h3>
          <p>Preencha as informações abaixo e salve para adicionar esta raça à lista.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalCadastroRaca">×</button>
      </div>

      <div class="crud-form-body">
        ${montarFormularioCadastroRaca()}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalCadastroRaca")?.addEventListener("click", fecharModalCadastroRaca);
  document.getElementById("cancelarCadastroRaca")?.addEventListener("click", fecharModalCadastroRaca);
  document.getElementById("salvarRaca")?.addEventListener("click", salvarRaca);

  document.getElementById("adicionarClasseSugerida")?.addEventListener("click", () => {
    adicionarSelecionado("selectClassesSugeridas", classesSugeridasSelecionadas, renderizarClassesSugeridas);
  });

  document.getElementById("adicionarElementoAfim")?.addEventListener("click", () => {
    adicionarSelecionado("selectElementosAfins", elementosAfinsSelecionados, renderizarElementosAfins);
  });

  document.getElementById("adicionarRestricaoClasse")?.addEventListener("click", () => {
    adicionarSelecionado("selectRestricaoClasse", restricoesClasseSelecionadas, renderizarRestricoesClasse);
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalCadastroRaca();
    }
  });

  preencherSelectClassesRaca();
  preencherSelectElementosRaca();
  preencherSelectHabilidadesRaca();

  renderizarClassesSugeridas();
  renderizarElementosAfins();
  renderizarRestricoesClasse();
}

function fecharModalCadastroRaca() {
  const overlay = document.getElementById("modalCadastroRaca");

  if (overlay) {
    overlay.remove();
  }
}

function montarFormularioCadastroRaca() {
  return `
    <div class="crud-form-content">
      <div class="form-grid">
        <label>
          Nome da Raça
          <input type="text" id="racaNome" placeholder="Ex: Humano, Elfo, Orc..." />
        </label>

        <label>
          HP Base
          <input type="number" id="racaHpBase" placeholder="Ex: 30" />
        </label>

        <label>
          Mana Base
          <input type="number" id="racaManaBase" placeholder="Ex: 50" />
        </label>

        <label>
          Força Física
          <input type="number" id="racaForcaFisica" placeholder="Ex: 2" />
        </label>

        <label>
          Força Mágica
          <input type="number" id="racaForcaMagica" placeholder="Ex: 2" />
        </label>

        <label>
          Defesa Física
          <input type="number" id="racaDefesaFisica" placeholder="Ex: 2" />
        </label>

        <label>
          Defesa Mágica
          <input type="number" id="racaDefesaMagica" placeholder="Ex: 2" />
        </label>

        <label>
          Velocidade
          <input type="number" id="racaVelocidade" placeholder="Ex: 2" />
        </label>

        <label>
          Resistência
          <input type="number" id="racaResistencia" placeholder="Ex: 2" />
        </label>
      </div>

      <label>
        Carisma
        <input type="text" id="racaCarisma" placeholder="Ex: +2 em teste de persuasão" />
      </label>

      <label>
        Fator Medo
        <input type="text" id="racaFatorMedo" placeholder="Ex: +1 em intimidação" />
      </label>

      <label>
        Vantagens/Bônus
        <textarea id="racaVantagens" placeholder="Descreva as vantagens da raça..."></textarea>
      </label>

      <label>
        Desvantagens/Penalidades
        <textarea id="racaDesvantagens" placeholder="Descreva as penalidades da raça..."></textarea>
      </label>

      <div class="multi-select-box">
        <label>
          Classes Sugeridas
          <select id="selectClassesSugeridas">
            <option value="">Carregando classes...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="adicionarClasseSugerida">Adicionar</button>

        <div id="listaClassesSugeridasSelecionadas" class="selected-list">
          <span class="empty-selection">Nenhuma classe sugerida selecionada.</span>
        </div>
      </div>

      <div class="multi-select-box">
        <label>
          Elementos Afins
          <select id="selectElementosAfins">
            <option value="">Carregando elementos...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="adicionarElementoAfim">Adicionar</button>

        <div id="listaElementosAfinsSelecionados" class="selected-list">
          <span class="empty-selection">Nenhum elemento afim selecionado.</span>
        </div>
      </div>

      <label>
        Habilidade Exclusiva
        <select id="racaHabilidadeExclusiva">
          <option value="">Carregando habilidades...</option>
        </select>
      </label>

      <div class="multi-select-box">
        <label>
          Restrição de Classe
          <select id="selectRestricaoClasse">
            <option value="">Carregando classes...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="adicionarRestricaoClasse">Adicionar</button>

        <div id="listaRestricaoClasseSelecionadas" class="selected-list">
          <span class="empty-selection">Nenhuma restrição de classe selecionada.</span>
        </div>
      </div>

      <div class="action-row">
        <button class="secondary-btn" type="button" id="cancelarCadastroRaca">Cancelar</button>
        <button class="primary-btn" type="button" id="salvarRaca">Salvar raça</button>
      </div>
    </div>
  `;
}

async function salvarRaca() {
  if (!state.usuarioAtual) {
    await mostrarModal("Você precisa estar logado.", "Acesso necessário");
    return;
  }

  if (state.dadosUsuarioAtual?.tipo !== "mestre") {
    await mostrarModal("Apenas o Mestre pode cadastrar raças.", "Permissão negada");
    return;
  }

  const nome = textoCampo("racaNome");

  if (!nome) {
    await mostrarModal("Digite o nome da raça.", "Campo obrigatório");
    return;
  }

  const jaExiste = state.racasDisponiveis.some((raca) => {
    return normalizarTexto(raca.nome || "") === normalizarTexto(nome);
  });

  if (jaExiste) {
    await mostrarModal(`A raça "${nome}" já existe no sistema.`, "Raça duplicada", "danger");
    return;
  }

  try {
    await addDoc(collection(db, "racas"), {
      nome,
      hpBase: numeroCampo("racaHpBase"),
      manaBase: numeroCampo("racaManaBase"),
      forcaFisica: numeroCampo("racaForcaFisica"),
      forcaMagica: numeroCampo("racaForcaMagica"),
      defesaFisica: numeroCampo("racaDefesaFisica"),
      defesaMagica: numeroCampo("racaDefesaMagica"),
      velocidade: numeroCampo("racaVelocidade"),
      resistencia: numeroCampo("racaResistencia"),
      carismaBonus: textoCampo("racaCarisma"),
      fatorMedoBonus: textoCampo("racaFatorMedo"),
      vantagens: textoCampo("racaVantagens"),
      desvantagens: textoCampo("racaDesvantagens"),
      classesSugeridas: classesSugeridasSelecionadas,
      elementosAfins: elementosAfinsSelecionados,
      habilidadeExclusiva: habilidadeSelecionada("racaHabilidadeExclusiva"),
      restricoesClasse: restricoesClasseSelecionadas,
      criadoPor: state.usuarioAtual.uid,
      criadoEm: serverTimestamp()
    });

    await mostrarModal("Raça salva com sucesso.", "Cadastro realizado", "success");

    fecharModalCadastroRaca();
    renderizarRacas();
  } catch (erro) {
    console.error("Erro ao salvar raça:", erro);
    await mostrarModal("Erro ao salvar raça.", "Erro", "danger");
  }
}

async function salvarEdicaoRaca() {
  if (!state.racaSelecionada) {
    await mostrarModal("Nenhuma raça selecionada.", "Erro", "danger");
    return;
  }

  const nome = textoCampo("editRacaNome");

  if (!nome) {
    await mostrarModal("Digite o nome da raça.", "Campo obrigatório");
    return;
  }

  const jaExiste = state.racasDisponiveis.some((raca) => {
    const mesmoNome = normalizarTexto(raca.nome || "") === normalizarTexto(nome);
    const outroRegistro = raca.id !== state.racaSelecionada.id;

    return mesmoNome && outroRegistro;
  });

  if (jaExiste) {
    await mostrarModal(`Já existe outra raça chamada "${nome}".`, "Raça duplicada", "danger");
    return;
  }

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
    carismaBonus: textoCampo("editRacaCarisma"),
    fatorMedoBonus: textoCampo("editRacaFatorMedo"),
    vantagens: textoCampo("editRacaVantagens"),
    desvantagens: textoCampo("editRacaDesvantagens"),
    classesSugeridas: editClassesSugeridasSelecionadas,
    elementosAfins: editElementosAfinsSelecionados,
    habilidadeExclusiva: habilidadeSelecionada("editRacaHabilidadeExclusiva"),
    restricoesClasse: editRestricoesClasseSelecionadas,
    atualizadoEm: serverTimestamp()
  };

  try {
    await updateDoc(doc(db, "racas", state.racaSelecionada.id), dadosAtualizados);

    setRacaSelecionada({
      ...state.racaSelecionada,
      ...dadosAtualizados
    });

    await mostrarModal("Raça atualizada com sucesso.", "Alterações salvas", "success");
    renderizarDetalheRaca(false);
  } catch (erro) {
    console.error("Erro ao editar raça:", erro);
    await mostrarModal("Erro ao editar raça.", "Erro", "danger");
  }
}

async function excluirRaca() {
  if (!state.racaSelecionada) {
    await mostrarModal("Nenhuma raça selecionada.", "Erro", "danger");
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Excluir raça",
    mensagem: `Tem certeza que deseja excluir a raça "${state.racaSelecionada.nome}"? Essa ação não pode ser desfeita.`,
    confirmarTexto: "Excluir",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "racas", state.racaSelecionada.id));

    setRacaSelecionada(null);

    await mostrarModal("Raça excluída com sucesso.", "Exclusão concluída", "success");
    navegarPara("cadastrosRacas");
  } catch (erro) {
    console.error("Erro ao excluir raça:", erro);
    await mostrarModal("Erro ao excluir raça.", "Erro", "danger");
  }
}

function preencherSelectClassesRaca() {
  preencherSelectGenerico("selectClassesSugeridas", classesDisponiveis, "Nenhuma classe cadastrada", true, false);
  preencherSelectGenerico("selectRestricaoClasse", classesDisponiveis, "Nenhuma classe cadastrada", false, true);
}

function preencherSelectClassesRacaEdicao() {
  preencherSelectGenerico("editSelectClassesSugeridas", classesDisponiveis, "Nenhuma classe cadastrada", true, false);
  preencherSelectGenerico("editSelectRestricaoClasse", classesDisponiveis, "Nenhuma classe cadastrada", false, true);
}

function preencherSelectElementosRaca() {
  preencherSelectGenerico("selectElementosAfins", elementosDisponiveis, "Nenhum elemento cadastrado", true, false);
}

function preencherSelectElementosRacaEdicao() {
  preencherSelectGenerico("editSelectElementosAfins", elementosDisponiveis, "Nenhum elemento cadastrado", true, false);
}

function preencherSelectHabilidadesRaca() {
  preencherSelectGenerico("racaHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada", false, false);
}

function preencherSelectHabilidadesRacaEdicao() {
  preencherSelectGenerico("editRacaHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada", false, false);
}

function preencherSelectGenerico(selectId, lista, mensagemVazia, permitirTodas = false, permitirNenhuma = false) {
  const select = document.getElementById(selectId);

  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = `<option value="">Selecione uma opção</option>`;

  if (permitirTodas) {
    select.innerHTML += `<option value="__ALL__">Todas</option>`;
  }

  if (permitirNenhuma) {
    select.innerHTML += `<option value="__NONE__">Nenhuma</option>`;
  }

  if (!Array.isArray(lista) || lista.length === 0) {
    if (!permitirTodas && !permitirNenhuma) {
      select.innerHTML = `<option value="">${mensagemVazia}</option>`;
    }

    return;
  }

  lista.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.nome || "Sem nome";
    select.appendChild(option);
  });

  if (valorAtual) {
    select.value = valorAtual;
  }
}

async function adicionarSelecionado(selectId, listaSelecionada, renderCallback) {
  const select = document.getElementById(selectId);

  if (!select || !select.value) {
    await mostrarModal("Selecione uma opção primeiro.", "Campo obrigatório");
    return;
  }

  const id = select.value;
  const nome = select.selectedOptions[0].textContent;

  if (id === "__ALL__") {
    listaSelecionada.length = 0;
    listaSelecionada.push({ id: "__ALL__", nome: "Todas" });
    renderCallback();
    return;
  }

  if (id === "__NONE__") {
    listaSelecionada.length = 0;
    listaSelecionada.push({ id: "__NONE__", nome: "Nenhuma" });
    renderCallback();
    return;
  }

  const temOpcaoEspecial = listaSelecionada.some((item) => item.id === "__ALL__" || item.id === "__NONE__");

  if (temOpcaoEspecial) {
    await mostrarModal("Remova a opção especial antes de selecionar opções específicas.", "Seleção inválida");
    return;
  }

  const jaExiste = listaSelecionada.some((item) => item.id === id);

  if (jaExiste) {
    await mostrarModal("Essa opção já foi adicionada.", "Opção repetida");
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
      ${escapeHtml(item.nome)}
      <button type="button" title="Remover">×</button>
    `;

    chip.querySelector("button").addEventListener("click", () => {
      callbackRemover(item.id);
    });

    container.appendChild(chip);
  });
}

function renderizarClassesSugeridas() {
  renderizarListaSelecionada(
    "listaClassesSugeridasSelecionadas",
    classesSugeridasSelecionadas,
    "Nenhuma classe sugerida selecionada.",
    (id) => removerSelecionado(classesSugeridasSelecionadas, id, renderizarClassesSugeridas)
  );
}

function renderizarElementosAfins() {
  renderizarListaSelecionada(
    "listaElementosAfinsSelecionados",
    elementosAfinsSelecionados,
    "Nenhum elemento afim selecionado.",
    (id) => removerSelecionado(elementosAfinsSelecionados, id, renderizarElementosAfins)
  );
}

function renderizarRestricoesClasse() {
  renderizarListaSelecionada(
    "listaRestricaoClasseSelecionadas",
    restricoesClasseSelecionadas,
    "Nenhuma restrição de classe selecionada.",
    (id) => removerSelecionado(restricoesClasseSelecionadas, id, renderizarRestricoesClasse)
  );
}

function renderizarEditClassesSugeridas() {
  renderizarListaSelecionada(
    "editListaClassesSugeridasSelecionadas",
    editClassesSugeridasSelecionadas,
    "Nenhuma classe sugerida selecionada.",
    (id) => removerSelecionado(editClassesSugeridasSelecionadas, id, renderizarEditClassesSugeridas)
  );
}

function renderizarEditElementosAfins() {
  renderizarListaSelecionada(
    "editListaElementosAfinsSelecionados",
    editElementosAfinsSelecionados,
    "Nenhum elemento afim selecionado.",
    (id) => removerSelecionado(editElementosAfinsSelecionados, id, renderizarEditElementosAfins)
  );
}

function renderizarEditRestricoesClasse() {
  renderizarListaSelecionada(
    "editListaRestricaoClasseSelecionadas",
    editRestricoesClasseSelecionadas,
    "Nenhuma restrição de classe selecionada.",
    (id) => removerSelecionado(editRestricoesClasseSelecionadas, id, renderizarEditRestricoesClasse)
  );
}

export function atualizarPreviewRaca(raca) {
  const preview = document.getElementById("previewRacaNome");

  if (!preview) return;

  preview.textContent = raca?.nome || "Nenhuma raça selecionada.";
}

function formatarListaObjetos(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return "Não informado";
  }

  return lista.map((item) => item.nome || item).join(", ");
}

export function renderizarRacas() {
  const listaRacas = document.getElementById("listaRacas");

  if (!listaRacas) return;

  listaRacas.innerHTML = "";

  if (!state.racasDisponiveis || state.racasDisponiveis.length === 0) {
    listaRacas.innerHTML = "<p>Nenhuma raça cadastrada ainda.</p>";
    return;
  }

  state.racasDisponiveis.forEach((raca) => {
    const card = document.createElement("div");
    card.classList.add("resource-card");

    card.innerHTML = `
      <div class="resource-card-header">
        <h4>${escapeHtml(raca.nome || "Sem nome")}</h4>
        <span>Raça</span>
      </div>

      <div class="resource-card-stats">
        <span>HP: <b>${raca.hpBase || 0}</b></span>
        <span>Mana: <b>${raca.manaBase || 0}</b></span>
        <span>Velocidade: <b>${raca.velocidade || 0}</b></span>
        <span>Resistência: <b>${raca.resistencia || 0}</b></span>
      </div>

      <p><b>Vantagens:</b> ${escapeHtml(raca.vantagens || "Não informado")}</p>
      <p><b>Desvantagens:</b> ${escapeHtml(raca.desvantagens || "Não informado")}</p>
      <p><b>Classes Sugeridas:</b> ${escapeHtml(formatarListaObjetos(raca.classesSugeridas))}</p>
      <p><b>Elementos Afins:</b> ${escapeHtml(formatarListaObjetos(raca.elementosAfins))}</p>
      <p><b>Restrições:</b> ${escapeHtml(formatarListaObjetos(raca.restricoesClasse))}</p>

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

function renderizarDetalheRaca(modoEdicao = false) {
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

    document.getElementById("voltarListaRacas")?.addEventListener("click", () => {
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
      <h3>${escapeHtml(raca.nome || "Sem nome")}</h3>
      <p class="detail-subtitle">Raça cadastrada pelo Mestre</p>

      <div class="detail-grid">
        <div class="detail-item"><span>HP Base</span><strong>${raca.hpBase || 0}</strong></div>
        <div class="detail-item"><span>Mana Base</span><strong>${raca.manaBase || 0}</strong></div>
        <div class="detail-item"><span>Força Física</span><strong>${raca.forcaFisica || 0}</strong></div>
        <div class="detail-item"><span>Força Mágica</span><strong>${raca.forcaMagica || 0}</strong></div>
        <div class="detail-item"><span>Defesa Física</span><strong>${raca.defesaFisica || 0}</strong></div>
        <div class="detail-item"><span>Defesa Mágica</span><strong>${raca.defesaMagica || 0}</strong></div>
        <div class="detail-item"><span>Velocidade</span><strong>${raca.velocidade || 0}</strong></div>
        <div class="detail-item"><span>Resistência</span><strong>${raca.resistencia || 0}</strong></div>
      </div>

      <div class="detail-section"><h4>Carisma</h4><p>${escapeHtml(raca.carismaBonus || "Não informado")}</p></div>
      <div class="detail-section"><h4>Fator Medo</h4><p>${escapeHtml(raca.fatorMedoBonus || "Não informado")}</p></div>
      <div class="detail-section"><h4>Vantagens/Bônus</h4><p>${escapeHtml(raca.vantagens || "Não informado")}</p></div>
      <div class="detail-section"><h4>Desvantagens/Penalidades</h4><p>${escapeHtml(raca.desvantagens || "Não informado")}</p></div>
      <div class="detail-section"><h4>Classes Sugeridas</h4><p>${escapeHtml(formatarListaObjetos(raca.classesSugeridas))}</p></div>
      <div class="detail-section"><h4>Elementos Afins</h4><p>${escapeHtml(formatarListaObjetos(raca.elementosAfins))}</p></div>
      <div class="detail-section"><h4>Habilidade Exclusiva</h4><p>${escapeHtml(raca.habilidadeExclusiva?.nome || "Não informado")}</p></div>
      <div class="detail-section"><h4>Restrição de Classe</h4><p>${escapeHtml(formatarListaObjetos(raca.restricoesClasse))}</p></div>

      <div class="action-row">
        <button class="secondary-btn" id="voltarListaRacas">Voltar</button>
        <button class="primary-btn" id="abrirEdicaoRaca">Editar raça</button>
        <button class="small-btn danger" id="excluirRacaDetalhe">Excluir raça</button>
      </div>
    </div>
  `;

  document.getElementById("voltarListaRacas")?.addEventListener("click", () => {
    navegarPara("cadastrosRacas");
  });

  document.getElementById("abrirEdicaoRaca")?.addEventListener("click", () => {
    renderizarDetalheRaca(true);
  });

  document.getElementById("excluirRacaDetalhe")?.addEventListener("click", excluirRaca);
}

function renderizarFormularioEdicaoRaca(container, raca) {
  editClassesSugeridasSelecionadas = Array.isArray(raca.classesSugeridas) ? [...raca.classesSugeridas] : [];
  editElementosAfinsSelecionados = Array.isArray(raca.elementosAfins) ? [...raca.elementosAfins] : [];
  editRestricoesClasseSelecionadas = Array.isArray(raca.restricoesClasse) ? [...raca.restricoesClasse] : [];

  container.innerHTML = `
    <div class="form-card edit-panel">
      <h3>Editar Raça</h3>

      <div class="form-grid">
        <label>Nome da Raça<input type="text" id="editRacaNome" value="${escapeHtml(raca.nome || "")}" /></label>
        <label>HP Base<input type="number" id="editRacaHpBase" value="${raca.hpBase || 0}" /></label>
        <label>Mana Base<input type="number" id="editRacaManaBase" value="${raca.manaBase || 0}" /></label>
        <label>Força Física<input type="number" id="editRacaForcaFisica" value="${raca.forcaFisica || 0}" /></label>
        <label>Força Mágica<input type="number" id="editRacaForcaMagica" value="${raca.forcaMagica || 0}" /></label>
        <label>Defesa Física<input type="number" id="editRacaDefesaFisica" value="${raca.defesaFisica || 0}" /></label>
        <label>Defesa Mágica<input type="number" id="editRacaDefesaMagica" value="${raca.defesaMagica || 0}" /></label>
        <label>Velocidade<input type="number" id="editRacaVelocidade" value="${raca.velocidade || 0}" /></label>
        <label>Resistência<input type="number" id="editRacaResistencia" value="${raca.resistencia || 0}" /></label>
      </div>

      <label>Carisma<input type="text" id="editRacaCarisma" value="${escapeHtml(raca.carismaBonus || "")}" /></label>
      <label>Fator Medo<input type="text" id="editRacaFatorMedo" value="${escapeHtml(raca.fatorMedoBonus || "")}" /></label>
      <label>Vantagens/Bônus<textarea id="editRacaVantagens">${escapeHtml(raca.vantagens || "")}</textarea></label>
      <label>Desvantagens/Penalidades<textarea id="editRacaDesvantagens">${escapeHtml(raca.desvantagens || "")}</textarea></label>

      ${montarMultiEdicao("Classes Sugeridas", "editSelectClassesSugeridas", "editAdicionarClasseSugerida", "editListaClassesSugeridasSelecionadas")}
      ${montarMultiEdicao("Elementos Afins", "editSelectElementosAfins", "editAdicionarElementoAfim", "editListaElementosAfinsSelecionados")}

      <label>
        Habilidade Exclusiva
        <select id="editRacaHabilidadeExclusiva">
          <option value="">Carregando habilidades...</option>
        </select>
      </label>

      ${montarMultiEdicao("Restrição de Classe", "editSelectRestricaoClasse", "editAdicionarRestricaoClasse", "editListaRestricaoClasseSelecionadas")}

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

  renderizarEditClassesSugeridas();
  renderizarEditElementosAfins();
  renderizarEditRestricoesClasse();

  document.getElementById("editAdicionarClasseSugerida")?.addEventListener("click", () => {
    adicionarSelecionado("editSelectClassesSugeridas", editClassesSugeridasSelecionadas, renderizarEditClassesSugeridas);
  });

  document.getElementById("editAdicionarElementoAfim")?.addEventListener("click", () => {
    adicionarSelecionado("editSelectElementosAfins", editElementosAfinsSelecionados, renderizarEditElementosAfins);
  });

  document.getElementById("editAdicionarRestricaoClasse")?.addEventListener("click", () => {
    adicionarSelecionado("editSelectRestricaoClasse", editRestricoesClasseSelecionadas, renderizarEditRestricoesClasse);
  });

  document.getElementById("cancelarEdicaoRaca")?.addEventListener("click", () => {
    renderizarDetalheRaca(false);
  });

  document.getElementById("salvarEdicaoRaca")?.addEventListener("click", salvarEdicaoRaca);
}

function montarMultiEdicao(label, selectId, botaoId, listaId) {
  return `
    <div class="multi-select-box">
      <label>
        ${label}
        <select id="${selectId}">
          <option value="">Carregando opções...</option>
        </select>
      </label>

      <button class="secondary-btn" type="button" id="${botaoId}">Adicionar</button>

      <div id="${listaId}" class="selected-list">
        <span class="empty-selection">Nenhuma opção selecionada.</span>
      </div>
    </div>
  `;
}

function atualizarContadorRacas() {
  const contador = document.getElementById("contadorRacas");

  if (contador) {
    contador.textContent = state.racasDisponiveis.length;
  }
}

function escapeHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function initRacas() {
  onPageLoaded((pagina) => {
    if (pagina === "cadastrosRacas") {
      renderizarRacas();

      document.getElementById("abrirCadastroRacas")?.addEventListener("click", abrirModalCadastroRaca);
    }

    if (pagina === "cadastrosRacaDetalhe") {
      renderizarDetalheRaca(false);
    }

    if (pagina === "dashboard") {
      atualizarContadorRacas();
    }
  });
}