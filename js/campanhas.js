import {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  getDocs
} from "./firebase.js";

import { state, setCampanhas } from "./state.js";
import { onPageLoaded } from "./navigation.js";
import { mostrarModal, confirmarModal } from "./ui.js";

let unsubscribeCampanhas = null;
let unsubscribeCampanhasCriadasPor = null;
let unsubscribeCampanhasEmail = null;

let campanhaSelecionadaEdicao = null;

let campanhasPorMestreId = [];
let campanhasPorCriadoPor = [];
let campanhasPorEmail = [];

export function iniciarCampanhas() {
  pararCampanhas();

  if (!state.usuarioAtual || !state.dadosUsuarioAtual) return;

  const campanhasRef = collection(db, "campanhas");

  if (state.dadosUsuarioAtual.tipo === "mestre") {
    const consultaMestreId = query(
      campanhasRef,
      where("mestreId", "==", state.usuarioAtual.uid)
    );

    const consultaCriadoPor = query(
      campanhasRef,
      where("criadoPor", "==", state.usuarioAtual.uid)
    );

    const consultaEmail = query(
      campanhasRef,
      where("mestreEmail", "==", state.usuarioAtual.email)
    );

    unsubscribeCampanhas = onSnapshot(
      consultaMestreId,
      (snapshot) => {
        campanhasPorMestreId = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        atualizarListaCampanhasCombinada();
      },
      (erro) => {
        console.error("Erro ao carregar campanhas por mestreId:", erro);
      }
    );

    unsubscribeCampanhasCriadasPor = onSnapshot(
      consultaCriadoPor,
      (snapshot) => {
        campanhasPorCriadoPor = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        atualizarListaCampanhasCombinada();
      },
      (erro) => {
        console.error("Erro ao carregar campanhas por criadoPor:", erro);
      }
    );

    unsubscribeCampanhasEmail = onSnapshot(
      consultaEmail,
      (snapshot) => {
        campanhasPorEmail = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        atualizarListaCampanhasCombinada();
      },
      (erro) => {
        console.error("Erro ao carregar campanhas por e-mail:", erro);
      }
    );

    return;
  }

  const consultaJogador = query(
    campanhasRef,
    where("jogadoresIds", "array-contains", state.usuarioAtual.uid)
  );

  unsubscribeCampanhas = onSnapshot(
    consultaJogador,
    (snapshot) => {
      const campanhas = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      campanhas.sort(ordenarCampanhas);

      setCampanhas(campanhas);
      renderizarCampanhas();
      preencherSelectCampanhas();
      atualizarContadorCampanhas();
    },
    (erro) => {
      console.error("Erro ao carregar campanhas do jogador:", erro);
    }
  );
}

function atualizarListaCampanhasCombinada() {
  const mapa = new Map();

  [
    ...campanhasPorMestreId,
    ...campanhasPorCriadoPor,
    ...campanhasPorEmail
  ].forEach((campanha) => {
    mapa.set(campanha.id, campanha);
  });

  const campanhas = Array.from(mapa.values());

  campanhas.sort(ordenarCampanhas);

  setCampanhas(campanhas);
  renderizarCampanhas();
  preencherSelectCampanhas();
  atualizarContadorCampanhas();
}

function ordenarCampanhas(a, b) {
  const dataA = converterDataOrdenacao(a.criadoEm || a.atualizadoEm);
  const dataB = converterDataOrdenacao(b.criadoEm || b.atualizadoEm);

  if (dataA !== dataB) {
    return dataB - dataA;
  }

  return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
}

function converterDataOrdenacao(valor) {
  if (!valor) return 0;

  if (typeof valor.toMillis === "function") {
    return valor.toMillis();
  }

  if (valor.seconds) {
    return valor.seconds * 1000;
  }

  const data = new Date(valor).getTime();

  return Number.isFinite(data) ? data : 0;
}

export function pararCampanhas() {
  if (unsubscribeCampanhas) {
    unsubscribeCampanhas();
    unsubscribeCampanhas = null;
  }

  if (unsubscribeCampanhasCriadasPor) {
    unsubscribeCampanhasCriadasPor();
    unsubscribeCampanhasCriadasPor = null;
  }

  if (unsubscribeCampanhasEmail) {
    unsubscribeCampanhasEmail();
    unsubscribeCampanhasEmail = null;
  }

  campanhasPorMestreId = [];
  campanhasPorCriadoPor = [];
  campanhasPorEmail = [];
}

function gerarCodigoCampanha() {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "RPG-";

  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }

  return codigo;
}

function textoCampo(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function abrirModalCriacaoCampanha() {
  fecharModalCriacaoCampanha();

  if (state.dadosUsuarioAtual?.tipo !== "mestre") {
    mostrarModal("Apenas contas de Mestre podem criar campanhas.", "Permissão negada");
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalCriacaoCampanha";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Nova campanha</h3>
          <p>Preencha os dados abaixo para criar uma nova campanha.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalCriacaoCampanha">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Nome da campanha
            <input type="text" id="campanhaNome" placeholder="Ex: A Queda de Valdrin" />
          </label>

          <label>
            Descrição da campanha
            <textarea id="campanhaDescricao" placeholder="Descreva a proposta, cenário ou objetivo da campanha..."></textarea>
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarCriacaoCampanha">Cancelar</button>
            <button class="primary-btn" type="button" id="btnCriarCampanha">Criar campanha</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalCriacaoCampanha")?.addEventListener("click", fecharModalCriacaoCampanha);
  document.getElementById("cancelarCriacaoCampanha")?.addEventListener("click", fecharModalCriacaoCampanha);
  document.getElementById("btnCriarCampanha")?.addEventListener("click", criarCampanha);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalCriacaoCampanha();
    }
  });
}

function fecharModalCriacaoCampanha() {
  const overlay = document.getElementById("modalCriacaoCampanha");

  if (overlay) {
    overlay.remove();
  }
}

function abrirModalEntradaCampanha() {
  fecharModalEntradaCampanha();

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalEntradaCampanha";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Entrar em campanha</h3>
          <p>Digite o código fornecido pelo Mestre para entrar em uma campanha.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalEntradaCampanha">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Código da campanha
            <input type="text" id="codigoEntrarCampanha" placeholder="Ex: RPG-ABC123" />
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarEntradaCampanha">Cancelar</button>
            <button class="primary-btn" type="button" id="btnEntrarCampanha">Entrar na campanha</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalEntradaCampanha")?.addEventListener("click", fecharModalEntradaCampanha);
  document.getElementById("cancelarEntradaCampanha")?.addEventListener("click", fecharModalEntradaCampanha);
  document.getElementById("btnEntrarCampanha")?.addEventListener("click", entrarCampanha);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalEntradaCampanha();
    }
  });
}

function fecharModalEntradaCampanha() {
  const overlay = document.getElementById("modalEntradaCampanha");

  if (overlay) {
    overlay.remove();
  }
}

async function criarCampanha() {
  if (!state.usuarioAtual) {
    await mostrarModal("Você precisa estar logado.", "Acesso necessário");
    return;
  }

  if (state.dadosUsuarioAtual?.tipo !== "mestre") {
    await mostrarModal("Apenas contas de Mestre podem criar campanhas.", "Permissão negada");
    return;
  }

  const nome = textoCampo("campanhaNome");
  const descricao = textoCampo("campanhaDescricao");

  if (!nome) {
    await mostrarModal("Digite o nome da campanha.", "Campo obrigatório");
    return;
  }

  const codigo = gerarCodigoCampanha();

  try {
    await addDoc(collection(db, "campanhas"), {
      nome,
      descricao,
      codigo,
      mestreId: state.usuarioAtual.uid,
      criadoPor: state.usuarioAtual.uid,
      mestreNome: state.dadosUsuarioAtual.nome || state.usuarioAtual.email,
      mestreEmail: state.usuarioAtual.email,
      jogadoresIds: [],
      jogadores: [],
      criadoEm: serverTimestamp()
    });

    await mostrarModal(
      `Campanha criada com sucesso. Código da campanha: ${codigo}`,
      "Campanha criada",
      "success"
    );

    fecharModalCriacaoCampanha();
    renderizarCampanhas();
  } catch (erro) {
    console.error("Erro ao criar campanha:", erro);
    await mostrarModal("Erro ao criar campanha.", "Erro", "danger");
  }
}

async function entrarCampanha() {
  if (!state.usuarioAtual) {
    await mostrarModal("Você precisa estar logado.", "Acesso necessário");
    return;
  }

  const codigo = textoCampo("codigoEntrarCampanha").toUpperCase();

  if (!codigo) {
    await mostrarModal("Digite o código da campanha.", "Campo obrigatório");
    return;
  }

  try {
    const campanhasRef = collection(db, "campanhas");
    const consulta = query(campanhasRef, where("codigo", "==", codigo));
    const resultado = await getDocs(consulta);

    if (resultado.empty) {
      await mostrarModal("Nenhuma campanha encontrada com esse código.", "Código inválido", "danger");
      return;
    }

    const campanhaDoc = resultado.docs[0];
    const campanha = campanhaDoc.data();

    if (campanha.mestreId === state.usuarioAtual.uid || campanha.criadoPor === state.usuarioAtual.uid) {
      await mostrarModal("Você é o Mestre desta campanha.", "Entrada não necessária");
      return;
    }

    const jogadoresIds = Array.isArray(campanha.jogadoresIds) ? campanha.jogadoresIds : [];
    const jogadores = Array.isArray(campanha.jogadores) ? campanha.jogadores : [];

    if (jogadoresIds.includes(state.usuarioAtual.uid)) {
      await mostrarModal("Você já está nessa campanha.", "Campanha já vinculada");
      return;
    }

    jogadoresIds.push(state.usuarioAtual.uid);
    jogadores.push({
      id: state.usuarioAtual.uid,
      nome: state.dadosUsuarioAtual.nome || state.usuarioAtual.email,
      email: state.usuarioAtual.email
    });

    await updateDoc(doc(db, "campanhas", campanhaDoc.id), {
      jogadoresIds,
      jogadores,
      atualizadoEm: serverTimestamp()
    });

    await mostrarModal("Você entrou na campanha com sucesso.", "Campanha vinculada", "success");

    fecharModalEntradaCampanha();
  } catch (erro) {
    console.error("Erro ao entrar na campanha:", erro);
    await mostrarModal("Erro ao entrar na campanha.", "Erro", "danger");
  }
}

async function salvarEdicaoCampanha() {
  if (!campanhaSelecionadaEdicao) {
    await mostrarModal("Nenhuma campanha selecionada.", "Erro", "danger");
    return;
  }

  const nome = textoCampo("editCampanhaNome");
  const descricao = textoCampo("editCampanhaDescricao");

  if (!nome) {
    await mostrarModal("Digite o nome da campanha.", "Campo obrigatório");
    return;
  }

  try {
    await updateDoc(doc(db, "campanhas", campanhaSelecionadaEdicao.id), {
      nome,
      descricao,
      atualizadoEm: serverTimestamp()
    });

    campanhaSelecionadaEdicao = null;

    await mostrarModal("Campanha atualizada com sucesso.", "Alterações salvas", "success");

    fecharModalEdicaoCampanha();
    renderizarCampanhas();
  } catch (erro) {
    console.error("Erro ao editar campanha:", erro);
    await mostrarModal("Erro ao editar campanha.", "Erro", "danger");
  }
}

async function excluirCampanha(campanha) {
  if (state.dadosUsuarioAtual?.tipo !== "mestre") {
    await mostrarModal("Apenas o Mestre pode excluir campanhas.", "Permissão negada");
    return;
  }

  const pertenceAoMestre =
    campanha.mestreId === state.usuarioAtual.uid ||
    campanha.criadoPor === state.usuarioAtual.uid ||
    campanha.mestreEmail === state.usuarioAtual.email;

  if (!pertenceAoMestre) {
    await mostrarModal("Você só pode excluir campanhas criadas por você.", "Permissão negada");
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Excluir campanha",
    mensagem: `Tem certeza que deseja excluir a campanha “${campanha.nome}”? Essa ação não pode ser desfeita.`,
    confirmarTexto: "Excluir",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "campanhas", campanha.id));

    await mostrarModal("Campanha excluída com sucesso.", "Exclusão concluída", "success");
  } catch (erro) {
    console.error("Erro ao excluir campanha:", erro);
    await mostrarModal("Erro ao excluir campanha.", "Erro", "danger");
  }
}

function abrirEdicaoCampanha(campanha) {
  fecharModalEdicaoCampanha();

  campanhaSelecionadaEdicao = campanha;

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalEdicaoCampanha";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Editar campanha</h3>
          <p>Atualize as informações principais da campanha.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalEdicaoCampanha">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Nome da campanha
            <input type="text" id="editCampanhaNome" value="${escapeHtml(campanha.nome || "")}" />
          </label>

          <label>
            Descrição da campanha
            <textarea id="editCampanhaDescricao">${escapeHtml(campanha.descricao || "")}</textarea>
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarEdicaoCampanha">Cancelar</button>
            <button class="primary-btn" type="button" id="salvarEdicaoCampanha">Salvar alterações</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalEdicaoCampanha")?.addEventListener("click", fecharModalEdicaoCampanha);
  document.getElementById("cancelarEdicaoCampanha")?.addEventListener("click", fecharModalEdicaoCampanha);
  document.getElementById("salvarEdicaoCampanha")?.addEventListener("click", salvarEdicaoCampanha);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalEdicaoCampanha();
    }
  });
}

function fecharModalEdicaoCampanha() {
  const overlay = document.getElementById("modalEdicaoCampanha");

  if (overlay) {
    overlay.remove();
  }

  campanhaSelecionadaEdicao = null;
}

export function buscarCampanhaPorId(id) {
  return state.minhasCampanhas.find((campanha) => campanha.id === id) || null;
}

export function preencherSelectCampanhas() {
  const selects = [
    document.getElementById("personagemCampanha"),
    document.getElementById("mestreCampanhaSelect"),
    document.getElementById("sessaoCampanhaSelect")
  ];

  selects.forEach((select) => {
    if (!select) return;

    const valorAtual = select.value;
    const idSelect = select.id;

    select.innerHTML = "";

    if (idSelect === "personagemCampanha") {
      select.innerHTML = `<option value="">Nenhuma campanha</option>`;
    } else {
      select.innerHTML = `<option value="">Selecione uma campanha</option>`;
    }

    if (!state.minhasCampanhas || state.minhasCampanhas.length === 0) {
      if (idSelect !== "personagemCampanha") {
        select.innerHTML = `<option value="">Nenhuma campanha disponível</option>`;
      }

      return;
    }

    state.minhasCampanhas.forEach((campanha) => {
      const option = document.createElement("option");
      option.value = campanha.id;
      option.textContent = campanha.nome || "Campanha sem nome";
      select.appendChild(option);
    });

    if (valorAtual) {
      select.value = valorAtual;
    }
  });
}

export function renderizarCampanhas() {
  aplicarEstilosCampanhas();

  const lista = document.getElementById("listaCampanhas");

  if (!lista) return;

  lista.innerHTML = "";

  if (!state.minhasCampanhas || state.minhasCampanhas.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma campanha encontrada.</h3>
        <p>Crie uma nova campanha ou entre em uma campanha existente usando um código.</p>
      </div>
    `;
    return;
  }

  state.minhasCampanhas.forEach((campanha) => {
    const card = document.createElement("div");
    card.classList.add("campaign-card", "campaign-card-refinado");

    const podeEditar =
      state.dadosUsuarioAtual?.tipo === "mestre" &&
      (
        campanha.mestreId === state.usuarioAtual.uid ||
        campanha.criadoPor === state.usuarioAtual.uid ||
        campanha.mestreEmail === state.usuarioAtual.email
      );

    card.innerHTML = `
      <div class="campaign-card-top">
        <div>
          <span class="campaign-kicker">
            ${state.dadosUsuarioAtual?.tipo === "mestre" ? "Campanha do Mestre" : "Campanha do Jogador"}
          </span>

          <h4>${escapeHtml(campanha.nome || "Campanha sem nome")}</h4>
          <p>${escapeHtml(campanha.descricao || "Sem descrição.")}</p>
        </div>

        <span class="campaign-role">
          ${state.dadosUsuarioAtual?.tipo === "mestre" ? "Mestre" : "Jogador"}
        </span>
      </div>

      <div class="campaign-info-grid">
        <span><b>Mestre</b>${escapeHtml(campanha.mestreNome || "Não informado")}</span>
        <span><b>Jogadores</b>${Array.isArray(campanha.jogadores) ? campanha.jogadores.length : 0}</span>
        <span><b>Código</b>${escapeHtml(campanha.codigo || "Sem código")}</span>
      </div>

      <div class="action-row campaign-actions">
        ${
          podeEditar
            ? `
              <button class="secondary-btn editar-campanha">Editar</button>
              <button class="small-btn danger excluir-campanha">Excluir</button>
            `
            : ""
        }
      </div>
    `;

    const botaoEditar = card.querySelector(".editar-campanha");
    const botaoExcluir = card.querySelector(".excluir-campanha");

    if (botaoEditar) {
      botaoEditar.addEventListener("click", () => abrirEdicaoCampanha(campanha));
    }

    if (botaoExcluir) {
      botaoExcluir.addEventListener("click", () => excluirCampanha(campanha));
    }

    lista.appendChild(card);
  });
}

function atualizarContadorCampanhas() {
  const contador = document.getElementById("contadorCampanhas");

  if (contador) {
    contador.textContent = state.minhasCampanhas.length;
  }
}

function aplicarEstilosCampanhas() {
  if (document.getElementById("campanhasStyles")) return;

  const style = document.createElement("style");
  style.id = "campanhasStyles";

  style.textContent = `
    .campaign-card-refinado {
      display: grid;
      gap: 18px;
      padding: 24px;
      border-radius: 24px;
      background:
        radial-gradient(circle at 88% 0%, rgba(255,255,255,0.07), transparent 30%),
        linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025));
      border: 1px solid rgba(255,255,255,0.11);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }

    .campaign-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
    }

    .campaign-kicker {
      display: block;
      margin-bottom: 8px;
      color: rgba(255,255,255,0.45);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .campaign-card-top h4 {
      margin: 0;
      color: #fff;
      font-size: 28px;
      line-height: 1;
      letter-spacing: -0.04em;
    }

    .campaign-card-top p {
      margin: 10px 0 0;
      color: rgba(255,255,255,0.62);
      line-height: 1.55;
      font-weight: 600;
    }

    .campaign-role {
      flex-shrink: 0;
      border-radius: 999px;
      padding: 9px 14px;
      color: #fff;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.10);
      font-size: 13px;
      font-weight: 900;
      white-space: nowrap;
    }

    .campaign-info-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .campaign-info-grid span {
      min-width: 0;
      display: grid;
      gap: 6px;
      padding: 14px;
      border-radius: 16px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
      color: #fff;
      font-weight: 800;
      word-break: break-word;
    }

    .campaign-info-grid b {
      color: rgba(255,255,255,0.44);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .campaign-actions {
      justify-content: flex-end;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 18px;
    }

    @media (max-width: 720px) {
      .campaign-card-top {
        display: grid;
      }

      .campaign-role {
        justify-self: start;
      }

      .campaign-info-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function escapeHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function initCampanhas() {
  onPageLoaded((pagina) => {
    if (pagina === "campanhas") {
      renderizarCampanhas();

      document.getElementById("abrirCriacaoCampanha")?.addEventListener("click", abrirModalCriacaoCampanha);
      document.getElementById("abrirEntradaCampanha")?.addEventListener("click", abrirModalEntradaCampanha);
    }

    if (pagina === "dashboard") {
      atualizarContadorCampanhas();
    }
  });
}