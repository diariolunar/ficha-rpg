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

import { state, setClasses, setClasseSelecionada } from "./state.js";
import { onPageLoaded, navegarPara } from "./navigation.js";
import { mostrarModal, confirmarModal } from "./ui.js";

let unsubscribeClasses = null;
let unsubscribeHabilidades = null;
let unsubscribeSubclasses = null;

let habilidadesDisponiveis = [];
let subclassesDisponiveis = [];

let subclassesSelecionadas = [];
let editSubclassesSelecionadas = [];

export function iniciarClasses() {
  pararClasses();

  const classesRef = collection(db, "classes");
  const classesQuery = query(classesRef, orderBy("nome", "asc"));

  unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
    const classes = [];

    snapshot.forEach((documento) => {
      classes.push({
        id: documento.id,
        ...documento.data()
      });
    });

    setClasses(classes);
    sincronizarClasseSelecionada();
    renderizarClasses();
  }, (erro) => {
    console.error("Erro ao carregar classes:", erro);
  });

  carregarOpcoesRelacionadasClasse();
}

export function pararClasses() {
  if (unsubscribeClasses) {
    unsubscribeClasses();
    unsubscribeClasses = null;
  }

  if (unsubscribeHabilidades) {
    unsubscribeHabilidades();
    unsubscribeHabilidades = null;
  }

  if (unsubscribeSubclasses) {
    unsubscribeSubclasses();
    unsubscribeSubclasses = null;
  }
}

function sincronizarClasseSelecionada() {
  if (!state.classeSelecionada) return;

  const atualizada = state.classesDisponiveis.find((classe) => classe.id === state.classeSelecionada.id);

  if (atualizada) {
    setClasseSelecionada(atualizada);
  }
}

function carregarOpcoesRelacionadasClasse() {
  const habilidadesQuery = query(collection(db, "habilidades"), orderBy("nome", "asc"));
  const subclassesQuery = query(collection(db, "subclasses"), orderBy("nome", "asc"));

  unsubscribeHabilidades = onSnapshot(habilidadesQuery, (snapshot) => {
    habilidadesDisponiveis = [];

    snapshot.forEach((documento) => {
      habilidadesDisponiveis.push({
        id: documento.id,
        ...documento.data()
      });
    });

    preencherSelectHabilidadesClasse();
    preencherSelectHabilidadesClasseEdicao();
  }, (erro) => {
    console.error("Erro ao carregar habilidades para classes:", erro);
  });

  unsubscribeSubclasses = onSnapshot(subclassesQuery, (snapshot) => {
    subclassesDisponiveis = [];

    snapshot.forEach((documento) => {
      subclassesDisponiveis.push({
        id: documento.id,
        ...documento.data()
      });
    });

    preencherSelectSubclassesClasse();
    preencherSelectSubclassesClasseEdicao();
  }, (erro) => {
    console.error("Erro ao carregar subclasses para classes:", erro);
  });
}

function numeroCampo(id) {
  return Number(document.getElementById(id)?.value) || 0;
}

function textoCampo(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function valorCampo(id) {
  return document.getElementById(id)?.value || "";
}

function textoSelectSelecionado(id) {
  const select = document.getElementById(id);

  if (!select || !select.selectedOptions[0]) return "";

  return select.selectedOptions[0].textContent;
}

async function salvarClasse() {
  if (!state.usuarioAtual) {
    await mostrarModal("Você precisa estar logado.", "Acesso necessário");
    return;
  }

  if (state.dadosUsuarioAtual?.tipo !== "mestre") {
    await mostrarModal("Apenas o Mestre pode cadastrar classes.", "Permissão negada");
    return;
  }

  const nome = textoCampo("classeNome");

  if (!nome) {
    await mostrarModal("Digite o nome da classe.", "Campo obrigatório");
    return;
  }

  const habilidadeExclusivaId = valorCampo("classeHabilidadeExclusiva");
  const habilidadeExclusivaNome = textoSelectSelecionado("classeHabilidadeExclusiva");

  const classe = {
    nome,
    hpPorNivel: numeroCampo("classeHpPorNivel"),
    manaPorNivel: numeroCampo("classeManaPorNivel"),
    atributoPrincipal: valorCampo("classeAtributoPrincipal"),
    atributoSecundario: valorCampo("classeAtributoSecundario"),
    tipoDano: textoCampo("classeTipoDano"),
    tipoDefesa: textoCampo("classeTipoDefesa"),
    armasPermitidas: textoCampo("classeArmasPermitidas"),
    armadurasPermitidas: textoCampo("classeArmadurasPermitidas"),
    habilidadeExclusiva: habilidadeExclusivaId
      ? {
          id: habilidadeExclusivaId,
          nome: habilidadeExclusivaNome
        }
      : null,
    vantagens: textoCampo("classeVantagens"),
    desvantagens: textoCampo("classeDesvantagens"),
    subclassesDisponiveis: subclassesSelecionadas,
    criadoPor: state.usuarioAtual.uid,
    criadoEm: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "classes"), classe);

    limparFormularioClasse();

    await mostrarModal("Classe salva no Firebase.", "Cadastro realizado", "success");
  } catch (erro) {
    console.error("Erro ao salvar classe:", erro);
    await mostrarModal("Erro ao salvar classe. Verifique as regras do Firestore.", "Erro", "danger");
  }
}

async function salvarEdicaoClasse() {
  if (!state.classeSelecionada) {
    await mostrarModal("Nenhuma classe selecionada.", "Erro", "danger");
    return;
  }

  const nome = textoCampo("editClasseNome");

  if (!nome) {
    await mostrarModal("Digite o nome da classe.", "Campo obrigatório");
    return;
  }

  const habilidadeExclusivaId = valorCampo("editClasseHabilidadeExclusiva");
  const habilidadeExclusivaNome = textoSelectSelecionado("editClasseHabilidadeExclusiva");

  const dadosAtualizados = {
    nome,
    hpPorNivel: numeroCampo("editClasseHpPorNivel"),
    manaPorNivel: numeroCampo("editClasseManaPorNivel"),
    atributoPrincipal: valorCampo("editClasseAtributoPrincipal"),
    atributoSecundario: valorCampo("editClasseAtributoSecundario"),
    tipoDano: textoCampo("editClasseTipoDano"),
    tipoDefesa: textoCampo("editClasseTipoDefesa"),
    armasPermitidas: textoCampo("editClasseArmasPermitidas"),
    armadurasPermitidas: textoCampo("editClasseArmadurasPermitidas"),
    habilidadeExclusiva: habilidadeExclusivaId
      ? {
          id: habilidadeExclusivaId,
          nome: habilidadeExclusivaNome
        }
      : null,
    vantagens: textoCampo("editClasseVantagens"),
    desvantagens: textoCampo("editClasseDesvantagens"),
    subclassesDisponiveis: editSubclassesSelecionadas,
    atualizadoEm: serverTimestamp()
  };

  try {
    await updateDoc(doc(db, "classes", state.classeSelecionada.id), dadosAtualizados);

    setClasseSelecionada({
      ...state.classeSelecionada,
      ...dadosAtualizados
    });

    await mostrarModal("Classe atualizada com sucesso.", "Alterações salvas", "success");
    renderizarDetalheClasse(false);
  } catch (erro) {
    console.error("Erro ao editar classe:", erro);
    await mostrarModal("Erro ao editar classe.", "Erro", "danger");
  }
}

async function excluirClasse() {
  if (!state.classeSelecionada) {
    await mostrarModal("Nenhuma classe selecionada.", "Erro", "danger");
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Excluir classe",
    mensagem: `Tem certeza que deseja excluir a classe "${state.classeSelecionada.nome}"? Essa ação não pode ser desfeita.`,
    confirmarTexto: "Excluir",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "classes", state.classeSelecionada.id));

    setClasseSelecionada(null);

    await mostrarModal("Classe excluída com sucesso.", "Exclusão concluída", "success");
    navegarPara("cadastrosClasses");
  } catch (erro) {
    console.error("Erro ao excluir classe:", erro);
    await mostrarModal("Erro ao excluir classe.", "Erro", "danger");
  }
}

function limparFormularioClasse() {
  const campos = [
    "classeNome",
    "classeHpPorNivel",
    "classeManaPorNivel",
    "classeAtributoPrincipal",
    "classeAtributoSecundario",
    "classeTipoDano",
    "classeTipoDefesa",
    "classeArmasPermitidas",
    "classeArmadurasPermitidas",
    "classeHabilidadeExclusiva",
    "classeVantagens",
    "classeDesvantagens"
  ];

  campos.forEach((id) => {
    const campo = document.getElementById(id);

    if (campo) {
      campo.value = "";
    }
  });

  subclassesSelecionadas = [];
  renderizarSubclassesSelecionadasClasse();
}

export function renderizarClasses() {
  const listaClasses = document.getElementById("listaClasses");

  if (!listaClasses) return;

  listaClasses.innerHTML = "";

  if (state.classesDisponiveis.length === 0) {
    listaClasses.innerHTML = "<p>Nenhuma classe cadastrada ainda.</p>";
    return;
  }

  state.classesDisponiveis.forEach((classe) => {
    const card = document.createElement("div");
    card.classList.add("resource-card");

    card.innerHTML = `
      <div class="resource-card-header">
        <h4>${escapeHtml(classe.nome || "Sem nome")}</h4>
        <span>Classe</span>
      </div>

      <div class="resource-card-stats">
        <span>HP/Nível: <b>${classe.hpPorNivel || 0}</b></span>
        <span>Mana/Nível: <b>${classe.manaPorNivel || 0}</b></span>
        <span>Dano: <b>${classe.tipoDano || "—"}</b></span>
        <span>Defesa: <b>${classe.tipoDefesa || "—"}</b></span>
      </div>

      <p><b>Atributo Principal:</b> ${formatarAtributo(classe.atributoPrincipal)}</p>
      <p><b>Atributo Secundário:</b> ${formatarAtributo(classe.atributoSecundario)}</p>
      <p><b>Habilidade Exclusiva:</b> ${classe.habilidadeExclusiva?.nome || "Não informado"}</p>
      <p><b>Subclasses Disponíveis:</b> ${formatarListaObjetos(classe.subclassesDisponiveis)}</p>

      <div class="action-row">
        <button class="secondary-btn visualizar-classe">Visualizar</button>
        <button class="primary-btn editar-classe">Editar</button>
        <button class="small-btn danger excluir-classe">Excluir</button>
      </div>
    `;

    card.querySelector(".visualizar-classe").addEventListener("click", () => {
      setClasseSelecionada(classe);
      navegarPara("cadastrosClasseDetalhe");
    });

    card.querySelector(".editar-classe").addEventListener("click", () => {
      setClasseSelecionada(classe);
      navegarPara("cadastrosClasseDetalhe");
      setTimeout(() => {
        renderizarDetalheClasse(true);
      }, 300);
    });

    card.querySelector(".excluir-classe").addEventListener("click", async () => {
      setClasseSelecionada(classe);
      await excluirClasse();
    });

    listaClasses.appendChild(card);
  });
}

export function renderizarDetalheClasse(modoEdicao = false) {
  const container = document.getElementById("classeDetalheContainer");

  if (!container) return;

  const classe = state.classeSelecionada;

  if (!classe) {
    container.innerHTML = `
      <div class="form-card">
        <h3>Nenhuma classe selecionada</h3>
        <p>Volte para a lista de classes e selecione uma opção.</p>
        <button class="secondary-btn" id="voltarListaClasses">Voltar para classes</button>
      </div>
    `;

    document.getElementById("voltarListaClasses").addEventListener("click", () => {
      navegarPara("cadastrosClasses");
    });

    return;
  }

  if (modoEdicao) {
    renderizarFormularioEdicaoClasse(container, classe);
    return;
  }

  container.innerHTML = `
    <div class="detail-card">
      <h3>${escapeHtml(classe.nome || "Sem nome")}</h3>
      <p class="detail-subtitle">Classe cadastrada pelo Mestre</p>

      <div class="detail-grid">
        <div class="detail-item">
          <span>HP por Nível</span>
          <strong>${classe.hpPorNivel || 0}</strong>
        </div>

        <div class="detail-item">
          <span>Mana por Nível</span>
          <strong>${classe.manaPorNivel || 0}</strong>
        </div>

        <div class="detail-item">
          <span>Atributo Principal</span>
          <strong>${formatarAtributo(classe.atributoPrincipal)}</strong>
        </div>

        <div class="detail-item">
          <span>Atributo Secundário</span>
          <strong>${formatarAtributo(classe.atributoSecundario)}</strong>
        </div>

        <div class="detail-item">
          <span>Tipo de Dano</span>
          <strong>${classe.tipoDano || "Não informado"}</strong>
        </div>

        <div class="detail-item">
          <span>Tipo de Defesa</span>
          <strong>${classe.tipoDefesa || "Não informado"}</strong>
        </div>
      </div>

      <div class="detail-section">
        <h4>Armas Permitidas</h4>
        <p>${classe.armasPermitidas || "Não informado"}</p>
      </div>

      <div class="detail-section">
        <h4>Armaduras Permitidas</h4>
        <p>${classe.armadurasPermitidas || "Não informado"}</p>
      </div>

      <div class="detail-section">
        <h4>Habilidade Exclusiva</h4>
        <p>${classe.habilidadeExclusiva?.nome || "Não informado"}</p>
      </div>

      <div class="detail-section">
        <h4>Vantagens</h4>
        <p>${classe.vantagens || "Não informado"}</p>
      </div>

      <div class="detail-section">
        <h4>Desvantagens</h4>
        <p>${classe.desvantagens || "Não informado"}</p>
      </div>

      <div class="detail-section">
        <h4>Subclasses Disponíveis</h4>
        <p>${formatarListaObjetos(classe.subclassesDisponiveis)}</p>
      </div>

      <div class="action-row">
        <button class="secondary-btn" id="voltarListaClasses">Voltar</button>
        <button class="primary-btn" id="abrirEdicaoClasse">Editar classe</button>
        <button class="small-btn danger" id="excluirClasseDetalhe">Excluir classe</button>
      </div>
    </div>
  `;

  document.getElementById("voltarListaClasses").addEventListener("click", () => {
    navegarPara("cadastrosClasses");
  });

  document.getElementById("abrirEdicaoClasse").addEventListener("click", () => {
    renderizarDetalheClasse(true);
  });

  document.getElementById("excluirClasseDetalhe").addEventListener("click", excluirClasse);
}

function renderizarFormularioEdicaoClasse(container, classe) {
  editSubclassesSelecionadas = Array.isArray(classe.subclassesDisponiveis)
    ? [...classe.subclassesDisponiveis]
    : [];

  container.innerHTML = `
    <div class="form-card edit-panel">
      <h3>Editar Classe</h3>

      <div class="form-grid">
        <label>
          Nome da Classe
          <input type="text" id="editClasseNome" value="${escapeHtml(classe.nome || "")}" />
        </label>

        <label>
          HP por Nível
          <input type="number" id="editClasseHpPorNivel" value="${classe.hpPorNivel || 0}" />
        </label>

        <label>
          Mana por Nível
          <input type="number" id="editClasseManaPorNivel" value="${classe.manaPorNivel || 0}" />
        </label>

        <label>
          Atributo Principal
          <select id="editClasseAtributoPrincipal">
            ${opcoesAtributos(classe.atributoPrincipal)}
          </select>
        </label>

        <label>
          Atributo Secundário
          <select id="editClasseAtributoSecundario">
            ${opcoesAtributos(classe.atributoSecundario)}
          </select>
        </label>

        <label>
          Tipo de Dano
          <input type="text" id="editClasseTipoDano" value="${escapeHtml(classe.tipoDano || "")}" />
        </label>

        <label>
          Tipo de Defesa
          <input type="text" id="editClasseTipoDefesa" value="${escapeHtml(classe.tipoDefesa || "")}" />
        </label>
      </div>

      <label>
        Armas Permitidas
        <textarea id="editClasseArmasPermitidas">${escapeHtml(classe.armasPermitidas || "")}</textarea>
      </label>

      <label>
        Armaduras Permitidas
        <textarea id="editClasseArmadurasPermitidas">${escapeHtml(classe.armadurasPermitidas || "")}</textarea>
      </label>

      <label>
        Habilidade Exclusiva
        <select id="editClasseHabilidadeExclusiva">
          <option value="">Carregando habilidades...</option>
        </select>
      </label>

      <label>
        Vantagens
        <textarea id="editClasseVantagens">${escapeHtml(classe.vantagens || "")}</textarea>
      </label>

      <label>
        Desvantagens
        <textarea id="editClasseDesvantagens">${escapeHtml(classe.desvantagens || "")}</textarea>
      </label>

      <div class="multi-select-box">
        <label>
          Subclasses Disponíveis
          <select id="editSelectSubclassesDisponiveis">
            <option value="">Carregando subclasses...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="editAdicionarSubclasseDisponivel">Adicionar subclasse</button>

        <div id="editListaSubclassesDisponiveisSelecionadas" class="selected-list"></div>
      </div>

      <div class="action-row">
        <button class="secondary-btn" id="cancelarEdicaoClasse">Cancelar</button>
        <button class="primary-btn" id="salvarEdicaoClasse">Salvar alterações</button>
      </div>
    </div>
  `;

  preencherSelectHabilidadesClasseEdicao();
  preencherSelectSubclassesClasseEdicao();

  const habilidade = document.getElementById("editClasseHabilidadeExclusiva");

  if (habilidade && classe.habilidadeExclusiva?.id) {
    habilidade.value = classe.habilidadeExclusiva.id;
  }

  renderizarSubclassesSelecionadasClasseEdicao();

  document.getElementById("editAdicionarSubclasseDisponivel").addEventListener("click", () => {
    adicionarSelecionado(
      "editSelectSubclassesDisponiveis",
      editSubclassesSelecionadas,
      renderizarSubclassesSelecionadasClasseEdicao
    );
  });

  document.getElementById("cancelarEdicaoClasse").addEventListener("click", () => {
    renderizarDetalheClasse(false);
  });

  document.getElementById("salvarEdicaoClasse").addEventListener("click", salvarEdicaoClasse);
}

function opcoesAtributos(valorSelecionado) {
  const atributos = [
    { valor: "", nome: "Selecione" },
    { valor: "forcaFisica", nome: "Força Física" },
    { valor: "forcaMagica", nome: "Força Mágica" },
    { valor: "defesaFisica", nome: "Defesa Física" },
    { valor: "defesaMagica", nome: "Defesa Mágica" },
    { valor: "velocidade", nome: "Velocidade" },
    { valor: "resistencia", nome: "Resistência" }
  ];

  return atributos
    .map((atributo) => {
      const selected = atributo.valor === valorSelecionado ? "selected" : "";
      return `<option value="${atributo.valor}" ${selected}>${atributo.nome}</option>`;
    })
    .join("");
}

function preencherSelectHabilidadesClasse() {
  preencherSelectGenerico("classeHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada");
}

function preencherSelectHabilidadesClasseEdicao() {
  preencherSelectGenerico("editClasseHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada");
}

function preencherSelectSubclassesClasse() {
  preencherSelectGenerico("selectSubclassesDisponiveis", subclassesDisponiveis, "Nenhuma subclasse cadastrada");
}

function preencherSelectSubclassesClasseEdicao() {
  preencherSelectGenerico("editSelectSubclassesDisponiveis", subclassesDisponiveis, "Nenhuma subclasse cadastrada");
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

async function adicionarSelecionado(selectId, listaSelecionada, renderCallback) {
  const select = document.getElementById(selectId);

  if (!select || !select.value) {
    await mostrarModal("Selecione uma opção primeiro.", "Campo obrigatório");
    return;
  }

  const id = select.value;
  const nome = select.selectedOptions[0].textContent;

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

function renderizarSubclassesSelecionadasClasse() {
  renderizarListaSelecionada(
    "listaSubclassesDisponiveisSelecionadas",
    subclassesSelecionadas,
    "Nenhuma subclasse selecionada.",
    (id) => removerSelecionado(subclassesSelecionadas, id, renderizarSubclassesSelecionadasClasse)
  );
}

function renderizarSubclassesSelecionadasClasseEdicao() {
  renderizarListaSelecionada(
    "editListaSubclassesDisponiveisSelecionadas",
    editSubclassesSelecionadas,
    "Nenhuma subclasse selecionada.",
    (id) => removerSelecionado(editSubclassesSelecionadas, id, renderizarSubclassesSelecionadasClasseEdicao)
  );
}

function formatarListaObjetos(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return "Não informado";
  }

  return lista.map((item) => item.nome).join(", ");
}

function formatarAtributo(valor) {
  const mapa = {
    forcaFisica: "Força Física",
    forcaMagica: "Força Mágica",
    defesaFisica: "Defesa Física",
    defesaMagica: "Defesa Mágica",
    velocidade: "Velocidade",
    resistencia: "Resistência"
  };

  return mapa[valor] || "Não informado";
}

function escapeHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function initClasses() {
  onPageLoaded((pagina) => {
    if (pagina === "cadastrosClasses") {
      const botaoSalvarClasse = document.getElementById("salvarClasse");

      if (botaoSalvarClasse) {
        botaoSalvarClasse.addEventListener("click", salvarClasse);
      }

      const botaoAdicionarSubclasse = document.getElementById("adicionarSubclasseDisponivel");

      if (botaoAdicionarSubclasse) {
        botaoAdicionarSubclasse.addEventListener("click", () => {
          adicionarSelecionado(
            "selectSubclassesDisponiveis",
            subclassesSelecionadas,
            renderizarSubclassesSelecionadasClasse
          );
        });
      }

      preencherSelectHabilidadesClasse();
      preencherSelectSubclassesClasse();
      renderizarSubclassesSelecionadasClasse();
      renderizarClasses();
    }

    if (pagina === "cadastrosClasseDetalhe") {
      renderizarDetalheClasse(false);
    }
  });
}