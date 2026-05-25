import {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  getDocs
} from "./firebase.js";

import { state, setCampanhas } from "./state.js";
import { onPageLoaded } from "./navigation.js";
import { mostrarModal, confirmarModal } from "./ui.js";

let unsubscribeCampanhas = null;
let campanhaSelecionadaEdicao = null;

export function iniciarCampanhas() {
  pararCampanhas();

  if (!state.usuarioAtual || !state.dadosUsuarioAtual) return;

  const campanhasRef = collection(db, "campanhas");

  const consulta = state.dadosUsuarioAtual.tipo === "mestre"
    ? query(
        campanhasRef,
        where("mestreId", "==", state.usuarioAtual.uid),
        orderBy("criadoEm", "desc")
      )
    : query(
        campanhasRef,
        where("jogadoresIds", "array-contains", state.usuarioAtual.uid),
        orderBy("criadoEm", "desc")
      );

  unsubscribeCampanhas = onSnapshot(consulta, (snapshot) => {
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
  }, (erro) => {
    console.error("Erro ao carregar campanhas:", erro);
  });
}

export function pararCampanhas() {
  if (unsubscribeCampanhas) {
    unsubscribeCampanhas();
    unsubscribeCampanhas = null;
  }
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

function limparFormularioCriacao() {
  const nome = document.getElementById("campanhaNome");
  const descricao = document.getElementById("campanhaDescricao");

  if (nome) nome.value = "";
  if (descricao) descricao.value = "";
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
      mestreNome: state.dadosUsuarioAtual.nome || state.usuarioAtual.email,
      mestreEmail: state.usuarioAtual.email,
      jogadoresIds: [],
      jogadores: [],
      criadoEm: serverTimestamp()
    });

    limparFormularioCriacao();

    await mostrarModal(
      `Campanha criada com sucesso. Código da campanha: ${codigo}`,
      "Campanha criada",
      "success"
    );
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

    if (campanha.mestreId === state.usuarioAtual.uid) {
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

    const campoCodigo = document.getElementById("codigoEntrarCampanha");
    if (campoCodigo) campoCodigo.value = "";

    await mostrarModal("Você entrou na campanha com sucesso.", "Campanha vinculada", "success");
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

  if (campanha.mestreId !== state.usuarioAtual.uid) {
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
  campanhaSelecionadaEdicao = campanha;
  renderizarCampanhas();
}

function cancelarEdicaoCampanha() {
  campanhaSelecionadaEdicao = null;
  renderizarCampanhas();
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

    select.innerHTML = "";

    if (!state.minhasCampanhas || state.minhasCampanhas.length === 0) {
      select.innerHTML = `<option value="">Nenhuma campanha disponível</option>`;
      return;
    }

    select.innerHTML = `<option value="">Selecione uma campanha</option>`;

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
  const lista = document.getElementById("listaCampanhas");

  if (!lista) return;

  lista.innerHTML = "";

  if (!state.minhasCampanhas || state.minhasCampanhas.length === 0) {
    lista.innerHTML = "<p>Nenhuma campanha encontrada.</p>";
    return;
  }

  state.minhasCampanhas.forEach((campanha) => {
    const card = document.createElement("div");
    card.classList.add("campaign-card");

    const podeEditar = state.dadosUsuarioAtual?.tipo === "mestre" && campanha.mestreId === state.usuarioAtual.uid;
    const estaEditando = campanhaSelecionadaEdicao?.id === campanha.id;

    if (estaEditando) {
      card.innerHTML = `
        <h3>Editar campanha</h3>

        <label>
          Nome da campanha
          <input type="text" id="editCampanhaNome" value="${escapeHtml(campanha.nome || "")}" />
        </label>

        <label>
          Descrição da campanha
          <textarea id="editCampanhaDescricao">${escapeHtml(campanha.descricao || "")}</textarea>
        </label>

        <div class="action-row">
          <button class="secondary-btn cancelar-edicao-campanha">Cancelar</button>
          <button class="primary-btn salvar-edicao-campanha">Salvar alterações</button>
        </div>
      `;

      card.querySelector(".cancelar-edicao-campanha").addEventListener("click", cancelarEdicaoCampanha);
      card.querySelector(".salvar-edicao-campanha").addEventListener("click", salvarEdicaoCampanha);

      lista.appendChild(card);
      return;
    }

    card.innerHTML = `
      <div class="resource-card-header">
        <div>
          <h4>${escapeHtml(campanha.nome || "Campanha sem nome")}</h4>
          <p>${escapeHtml(campanha.descricao || "Sem descrição.")}</p>
        </div>

        <span>${state.dadosUsuarioAtual?.tipo === "mestre" ? "Mestre" : "Jogador"}</span>
      </div>

      <p><b>Mestre:</b> ${escapeHtml(campanha.mestreNome || "Não informado")}</p>
      <p><b>Jogadores:</b> ${Array.isArray(campanha.jogadores) ? campanha.jogadores.length : 0}</p>

      <div class="campaign-code">
        ${campanha.codigo || "Sem código"}
      </div>

      <div class="action-row">
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

function escapeHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function initCampanhas() {
  onPageLoaded((pagina) => {
    if (pagina === "campanhas") {
      renderizarCampanhas();

      const botaoCriar = document.getElementById("btnCriarCampanha");
      const botaoEntrar = document.getElementById("btnEntrarCampanha");

      if (botaoCriar) {
        botaoCriar.addEventListener("click", criarCampanha);
      }

      if (botaoEntrar) {
        botaoEntrar.addEventListener("click", entrarCampanha);
      }
    }

    if (pagina === "dashboard") {
      atualizarContadorCampanhas();
    }
  });
}