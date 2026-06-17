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

import { state, setCampanhas, setPersonagens } from "./state.js";
import { onPageLoaded } from "./navigation.js";
import { mostrarModal, confirmarModal } from "./ui.js";
import { atualizarDashboard } from "./dashboard.js";

let unsubscribeCampanhas = null;
let unsubscribeCampanhasCriadasPor = null;
let unsubscribeCampanhasEmail = null;
let unsubscribePersonagensCampanhas = null;
let unsubscribePersonagensCampanhasExtras = null;
let unsubscribeHabilidadesCatalogo = null;
let unsubscribeItensCatalogo = null;
let unsubscribeMonstrosCatalogo = null;
let unsubscribeBossesCatalogo = null;
let unsubscribePetsCatalogo = null;

let campanhaSelecionadaEdicao = null;
let campanhaSelecionadaRolagem = null;
let campanhaSelecionadaAcao = null;
let personagemSelecionadoAcao = null;

let campanhasPorMestreId = [];
let campanhasPorCriadoPor = [];
let campanhasPorEmail = [];
let personagensPorCampanhaMestre = [];
let personagensCriadosPeloUsuario = [];

let habilidadesCatalogo = [];
let itensCatalogo = [];
let monstrosCatalogo = [];
let bossesCatalogo = [];
let petsCatalogo = [];

const CONDICOES_PADRAO = [
  "Envenenado",
  "Queimando",
  "Atordoado",
  "Inconsciente",
  "Fortalecido",
  "Enfraquecido",
  "Paralisado",
  "Sangrando",
  "Cego",
  "Silenciado",
  "Protegido",
  "Lento"
];

const XP_BASE_POR_NIVEL = 100;
const ATRIBUTOS_LEVEL_UP = [
  "forcaFisica",
  "forcaMagica",
  "defesaFisica",
  "defesaMagica",
  "velocidade",
  "resistencia"
];

const STATUS_PERSONAGEM_CAMPANHA = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recusado: "Recusado"
};

const TIPOS_HISTORICO_CAMPANHA = [
  "sistema",
  "jogador",
  "personagem",
  "batalha",
  "turno",
  "dado",
  "dano",
  "cura",
  "ataque",
  "habilidade",
  "item",
  "pet",
  "condicao",
  "recompensa",
  "resumo",
  "boss"
];

export function iniciarCampanhas() {
  pararCampanhas();

  if (!state.usuarioAtual || !state.dadosUsuarioAtual) return;

  iniciarEscutaCatalogosCampanha();

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
  } else {
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

  iniciarEscutaPersonagensCampanhas();
}

function iniciarEscutaCatalogosCampanha() {
  unsubscribeHabilidadesCatalogo = onSnapshot(
    query(collection(db, "habilidades"), orderBy("nome", "asc")),
    (snapshot) => {
      habilidadesCatalogo = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      renderizarCampanhas();
    },
    (erro) => {
      console.error("Erro ao carregar catálogo de habilidades:", erro);
    }
  );

  unsubscribeItensCatalogo = onSnapshot(
    query(collection(db, "itens"), orderBy("nome", "asc")),
    (snapshot) => {
      itensCatalogo = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      renderizarCampanhas();
    },
    (erro) => {
      console.error("Erro ao carregar catálogo de itens:", erro);
    }
  );

  unsubscribeMonstrosCatalogo = onSnapshot(
    query(collection(db, "monstros"), orderBy("nome", "asc")),
    (snapshot) => {
      monstrosCatalogo = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      renderizarCampanhas();
    },
    (erro) => {
      console.error("Erro ao carregar catálogo de monstros:", erro);
    }
  );

  unsubscribeBossesCatalogo = onSnapshot(
    query(collection(db, "bosses"), orderBy("nome", "asc")),
    (snapshot) => {
      bossesCatalogo = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      renderizarCampanhas();
    },
    (erro) => {
      console.error("Erro ao carregar catálogo de bosses:", erro);
    }
  );

  unsubscribePetsCatalogo = onSnapshot(
    query(collection(db, "pets"), orderBy("nome", "asc")),
    (snapshot) => {
      petsCatalogo = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      renderizarCampanhas();
    },
    (erro) => {
      console.error("Erro ao carregar catálogo de pets:", erro);
    }
  );
}

function iniciarEscutaPersonagensCampanhas() {
  const personagensRef = collection(db, "personagens");

  if (state.dadosUsuarioAtual?.tipo === "mestre") {
    const consultaPorMestre = query(
      personagensRef,
      where("mestreId", "==", state.usuarioAtual.uid)
    );

    const consultaCriadosPeloMestre = query(
      personagensRef,
      where("donoId", "==", state.usuarioAtual.uid)
    );

    unsubscribePersonagensCampanhas = onSnapshot(
      consultaPorMestre,
      (snapshot) => {
        personagensPorCampanhaMestre = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        atualizarPersonagensCampanhas();
      },
      (erro) => {
        console.error("Erro ao carregar personagens do mestre para campanhas:", erro);
      }
    );

    unsubscribePersonagensCampanhasExtras = onSnapshot(
      consultaCriadosPeloMestre,
      (snapshot) => {
        personagensCriadosPeloUsuario = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        atualizarPersonagensCampanhas();
      },
      (erro) => {
        console.error("Erro ao carregar personagens criados pelo mestre:", erro);
      }
    );

    return;
  }

  const consultaDoJogador = query(
    personagensRef,
    where("donoId", "==", state.usuarioAtual.uid)
  );

  unsubscribePersonagensCampanhas = onSnapshot(
    consultaDoJogador,
    (snapshot) => {
      const personagens = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      personagens.sort(ordenarPersonagens);

      setPersonagens(personagens);
      renderizarCampanhas();
    },
    (erro) => {
      console.error("Erro ao carregar personagens do jogador para campanhas:", erro);
    }
  );
}

function atualizarPersonagensCampanhas() {
  const mapa = new Map();

  [
    ...personagensPorCampanhaMestre,
    ...personagensCriadosPeloUsuario
  ].forEach((personagem) => {
    mapa.set(personagem.id, personagem);
  });

  const personagens = Array.from(mapa.values()).sort(ordenarPersonagens);

  setPersonagens(personagens);
  renderizarCampanhas();
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

  const campanhas = Array.from(mapa.values()).sort(ordenarCampanhas);

  setCampanhas(campanhas);
  renderizarCampanhas();
  preencherSelectCampanhas();
  atualizarContadorCampanhas();
}

function atualizarCampanhaLocal(campanhaAtualizada) {
  if (!campanhaAtualizada?.id) return;

  const mapa = new Map();

  (state.minhasCampanhas || []).forEach((campanha) => {
    mapa.set(campanha.id, campanha);
  });

  mapa.set(campanhaAtualizada.id, campanhaAtualizada);

  const campanhas = Array.from(mapa.values()).sort(ordenarCampanhas);

  setCampanhas(campanhas);
  renderizarCampanhas();
  preencherSelectCampanhas();
  atualizarContadorCampanhas();
}

function ordenarCampanhas(a, b) {
  const dataA = converterDataOrdenacao(a.criadoEm || a.atualizadoEm);
  const dataB = converterDataOrdenacao(b.criadoEm || b.atualizadoEm);

  if (dataA !== dataB) return dataB - dataA;

  return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
}

function ordenarPersonagens(a, b) {
  return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
}

function converterDataOrdenacao(valor) {
  if (!valor) return 0;

  if (typeof valor.toMillis === "function") return valor.toMillis();

  if (valor.seconds) return valor.seconds * 1000;

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

  if (unsubscribePersonagensCampanhas) {
    unsubscribePersonagensCampanhas();
    unsubscribePersonagensCampanhas = null;
  }

  if (unsubscribePersonagensCampanhasExtras) {
    unsubscribePersonagensCampanhasExtras();
    unsubscribePersonagensCampanhasExtras = null;
  }

  if (unsubscribeHabilidadesCatalogo) {
    unsubscribeHabilidadesCatalogo();
    unsubscribeHabilidadesCatalogo = null;
  }

  if (unsubscribeItensCatalogo) {
    unsubscribeItensCatalogo();
    unsubscribeItensCatalogo = null;
  }

  if (unsubscribeMonstrosCatalogo) {
    unsubscribeMonstrosCatalogo();
    unsubscribeMonstrosCatalogo = null;
  }

  if (unsubscribeBossesCatalogo) {
    unsubscribeBossesCatalogo();
    unsubscribeBossesCatalogo = null;
  }

  if (unsubscribePetsCatalogo) {
    unsubscribePetsCatalogo();
    unsubscribePetsCatalogo = null;
  }

  campanhasPorMestreId = [];
  campanhasPorCriadoPor = [];
  campanhasPorEmail = [];
  personagensPorCampanhaMestre = [];
  personagensCriadosPeloUsuario = [];
  habilidadesCatalogo = [];
  itensCatalogo = [];
  monstrosCatalogo = [];
  bossesCatalogo = [];
  petsCatalogo = [];
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

function valorCampo(id) {
  return document.getElementById(id)?.value || "";
}

function numeroCampo(id) {
  return Number(document.getElementById(id)?.value) || 0;
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
    if (event.target === overlay) fecharModalCriacaoCampanha();
  });
}

function fecharModalCriacaoCampanha() {
  const overlay = document.getElementById("modalCriacaoCampanha");

  if (overlay) overlay.remove();
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
    if (event.target === overlay) fecharModalEntradaCampanha();
  });
}

function fecharModalEntradaCampanha() {
  const overlay = document.getElementById("modalEntradaCampanha");

  if (overlay) overlay.remove();
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
      status: "aguardando",
      sessaoAtiva: false,
      rodadaAtual: 0,
      turnoAtual: 0,
      turnoIndice: -1,
      ordemTurnos: [],
      personagemTurnoId: "",
      personagemTurnoNome: "",
      personagemTurnoDonoId: "",
      ultimoResultadoD20: null,
      personagensAprovados: [],
      personagensPendentes: [],
      sessoesCampanha: [],
      batalhasSessao: [],
      batalhaAtivaId: "",
      bossesHistoricosMortos: [],
      bossesFarmCooldown: {},
      historicoSessao: [
        criarEventoSessaoTexto("Campanha criada. Aguardando o Mestre iniciar a sessão.")
      ],
      mensagemSessao: "Campanha criada. Aguardando o Mestre iniciar a sessão.",
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
      historicoSessao: adicionarEventoHistorico(
        campanha,
        `${state.dadosUsuarioAtual.nome || state.usuarioAtual.email} entrou na campanha.`
      ),
      atualizadoEm: serverTimestamp()
    });

    const campanhaAtualizada = {
      id: campanhaDoc.id,
      ...campanha,
      jogadoresIds,
      jogadores
    };
    const personagensVinculados = await vincularPersonagensDoJogadorCampanha(
      campanhaAtualizada,
      state.usuarioAtual.uid,
      { somenteLivres: true, statusCampanha: "pendente" }
    );

    atualizarCampanhaLocal(campanhaAtualizada);
    preencherSelectCampanhas();

    await mostrarModal(
      personagensVinculados.length
        ? `Você entrou na campanha com sucesso. ${personagensVinculados.length} personagem(ns) livre(s) também foram vinculados.`
        : "Você entrou na campanha com sucesso. Agora vincule um personagem a esta campanha pela tela de Personagens.",
      "Campanha vinculada",
      "success"
    );

    fecharModalEntradaCampanha();
  } catch (erro) {
    console.error("Erro ao entrar na campanha:", erro);
    await mostrarModal("Erro ao entrar na campanha.", "Erro", "danger");
  }
}

function abrirModalVincularJogadorCampanha(campanha) {
  fecharModalAcaoPersonagem();

  campanhaSelecionadaAcao = campanha;

  const jogadores = Array.isArray(campanha.jogadores) ? campanha.jogadores : [];

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Vincular jogador</h3>
          <p>Adicione à campanha um jogador que já tenha conta cadastrada no sistema.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <div class="campaign-summary-box">
            <h4>Jogadores vinculados</h4>
            ${
              jogadores.length
                ? jogadores.map((jogador) => `<p>${escapeHtml(jogador.nome || jogador.email || "Jogador")}</p>`).join("")
                : "<p>Nenhum jogador vinculado ainda.</p>"
            }
          </div>

          <label>
            E-mail do jogador
            <input type="email" id="emailJogadorVinculoCampanha" placeholder="jogador@email.com" />
          </label>

          <label class="campaign-checkbox-line">
            <input type="checkbox" id="vincularPersonagensJogadorCampanha" checked />
            Vincular personagens livres deste jogador à campanha
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarVinculoJogadorCampanha">Vincular jogador</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("confirmarVinculoJogadorCampanha")?.addEventListener("click", salvarVinculoJogadorCampanha);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

async function salvarVinculoJogadorCampanha() {
  if (!campanhaSelecionadaAcao) {
    await mostrarModal("Nenhuma campanha selecionada.", "Erro", "danger");
    return;
  }

  if (!podeControlarCampanha(campanhaSelecionadaAcao)) {
    await mostrarModal("Apenas o Mestre desta campanha pode vincular jogadores.", "Permissão negada", "danger");
    return;
  }

  const email = textoCampo("emailJogadorVinculoCampanha").toLowerCase();

  if (!email) {
    await mostrarModal("Digite o e-mail do jogador.", "Campo obrigatório", "danger");
    return;
  }

  try {
    const usuarioEncontrado = await buscarUsuarioPorEmail(email);

    if (!usuarioEncontrado) {
      await mostrarModal("Nenhuma conta foi encontrada com esse e-mail. O jogador precisa criar uma conta antes.", "Jogador não encontrado", "danger");
      return;
    }

    if (usuarioEncontrado.id === state.usuarioAtual.uid) {
      await mostrarModal("Você é o Mestre desta campanha.", "Vínculo não necessário");
      return;
    }

    const jogadoresIds = Array.isArray(campanhaSelecionadaAcao.jogadoresIds)
      ? [...campanhaSelecionadaAcao.jogadoresIds]
      : [];
    const jogadores = Array.isArray(campanhaSelecionadaAcao.jogadores)
      ? [...campanhaSelecionadaAcao.jogadores]
      : [];

    const jogador = {
      id: usuarioEncontrado.id,
      nome: usuarioEncontrado.nome || usuarioEncontrado.email,
      email: usuarioEncontrado.email
    };
    const jaEstavaVinculado = jogadoresIds.includes(usuarioEncontrado.id);

    if (!jaEstavaVinculado) {
      jogadoresIds.push(usuarioEncontrado.id);
      jogadores.push(jogador);
    }

    const deveVincularPersonagens = document.getElementById("vincularPersonagensJogadorCampanha")?.checked !== false;
    const personagensVinculados = deveVincularPersonagens
      ? await vincularPersonagensDoJogadorCampanha(campanhaSelecionadaAcao, usuarioEncontrado.id, { somenteLivres: true, statusCampanha: "aprovado" })
      : [];
    const texto = jaEstavaVinculado
      ? `${jogador.nome || jogador.email} já estava vinculado. ${personagensVinculados.length} personagem(ns) foram associados à campanha.`
      : `${jogador.nome || jogador.email} foi vinculado à campanha pelo Mestre. ${personagensVinculados.length} personagem(ns) foram associados à campanha.`;

    await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
      jogadoresIds,
      jogadores,
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, texto, "jogador"),
      mensagemSessao: texto,
      atualizadoEm: serverTimestamp()
    });

    atualizarCampanhaLocal({
      ...campanhaSelecionadaAcao,
      jogadoresIds,
      jogadores,
      mensagemSessao: texto,
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, texto, "jogador")
    });

    await mostrarModal(
      personagensVinculados.length
        ? `Jogador vinculado com sucesso. ${personagensVinculados.length} personagem(ns) agora aparecem na campanha.`
        : "Jogador vinculado, mas nenhum personagem livre desse jogador foi encontrado. O jogador pode vincular um personagem pela tela Personagens.",
      "Campanha atualizada",
      "success"
    );
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao vincular jogador:", erro);
    await mostrarModal("Erro ao vincular jogador. Verifique o e-mail e as permissões do Firestore.", "Erro", "danger");
  }
}

async function buscarUsuarioPorEmail(email) {
  const usuariosRef = collection(db, "usuarios");
  const consulta = query(usuariosRef, where("email", "==", email));
  let resultado = await getDocs(consulta);

  if (resultado.empty) {
    const emailOriginal = textoCampo("emailJogadorVinculoCampanha");

    if (emailOriginal && emailOriginal !== email) {
      resultado = await getDocs(query(usuariosRef, where("email", "==", emailOriginal)));
    }
  }

  if (resultado.empty) return null;

  const usuarioDoc = resultado.docs[0];

  return {
    id: usuarioDoc.id,
    ...usuarioDoc.data()
  };
}

async function vincularPersonagensDoJogadorCampanha(campanha, jogadorId, opcoes = {}) {
  if (!campanha?.id || !jogadorId) return [];

  const personagensRef = collection(db, "personagens");
  const resultado = await getDocs(query(personagensRef, where("donoId", "==", jogadorId)));
  const personagens = resultado.docs.map((personagemDoc) => ({
    id: personagemDoc.id,
    ...personagemDoc.data()
  }));
  const somenteLivres = opcoes.somenteLivres !== false;
  const statusCampanha = opcoes.statusCampanha || "pendente";
  const vinculaveis = personagens.filter((personagem) => {
    if (personagem.campanhaId === campanha.id) return false;
    if (!somenteLivres) return true;

    return !personagem.campanhaId || personagem.campanhaNome === "Sem campanha";
  });
  const atualizados = [];

  for (const personagem of vinculaveis) {
    const personagemAtualizado = {
      ...personagem,
      campanhaId: campanha.id,
      campanhaNome: campanha.nome || "Campanha",
      mestreId: campanha.mestreId || campanha.criadoPor || state.usuarioAtual.uid,
      statusCampanha,
      aprovadoCampanha: statusCampanha === "aprovado",
      aprovadoCampanhaEmTexto: statusCampanha === "aprovado" ? new Date().toLocaleString("pt-BR") : "",
      atualizadoEmTexto: new Date().toLocaleString("pt-BR")
    };

    await updateDoc(doc(db, "personagens", personagem.id), {
      campanhaId: personagemAtualizado.campanhaId,
      campanhaNome: personagemAtualizado.campanhaNome,
      mestreId: personagemAtualizado.mestreId,
      statusCampanha: personagemAtualizado.statusCampanha,
      aprovadoCampanha: personagemAtualizado.aprovadoCampanha,
      aprovadoCampanhaEmTexto: personagemAtualizado.aprovadoCampanhaEmTexto,
      atualizadoEm: serverTimestamp()
    });

    atualizados.push(personagemAtualizado);
  }

  if (atualizados.length) {
    atualizarPersonagensLocais(atualizados);
  }

  return atualizados;
}

function atualizarPersonagensLocais(personagensAtualizados) {
  const mapa = new Map();

  (state.personagens || []).forEach((personagem) => {
    mapa.set(personagem.id, personagem);
  });

  personagensAtualizados.forEach((personagem) => {
    mapa.set(personagem.id, {
      ...(mapa.get(personagem.id) || {}),
      ...personagem
    });
  });

  const personagens = Array.from(mapa.values()).sort(ordenarPersonagens);

  setPersonagens(personagens);
  renderizarCampanhas();
}

async function iniciarSessaoCampanha(campanha) {
  if (!podeControlarCampanha(campanha)) {
    await mostrarModal("Você não tem permissão para iniciar esta campanha.", "Permissão negada", "danger");
    return;
  }

  const todosPersonagens = obterTodosPersonagensDaCampanha(campanha);
  const personagens = obterPersonagensDaCampanha(campanha);

  if (!personagens.length) {
    const pendentes = todosPersonagens.filter((personagem) => obterStatusPersonagemCampanha(personagem, campanha) === "pendente");

    await mostrarModal(
      pendentes.length
        ? `Nenhum personagem aprovado para iniciar. Aprove pelo menos um dos ${pendentes.length} personagem(ns) pendente(s).`
        : "Nenhum personagem está vinculado a esta campanha. Vincule pelo menos um personagem antes de iniciar a sessão.",
      "Sem personagens",
      "danger"
    );
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Iniciar sessão",
    mensagem: `Deseja iniciar a sessão da campanha “${campanha.nome}”?`,
    confirmarTexto: "Iniciar",
    cancelarTexto: "Cancelar",
    tipo: "success"
  });

  if (!confirmar) return;

  const bossesFarmCooldown = obterBossesFarmCooldown(campanha);
  const sessaoAtualId = `sessao-${Date.now()}`;
  const sessaoRegistro = {
    id: sessaoAtualId,
    status: "ativa",
    rodadaInicial: 1,
    participantesIds: personagens.map((personagem) => personagem.id),
    iniciadaEmTexto: new Date().toLocaleString("pt-BR")
  };
  const ordemTurnos = criarOrdemTurnos(personagens, {
    ...campanha,
    bossesFarmCooldown
  });
  const primeiro = ordemTurnos[0] || null;

  if (!primeiro) {
    await mostrarModal("Nenhuma entidade viva foi encontrada para montar a ordem de turnos.", "Sem turnos", "danger");
    return;
  }

  try {
    await updateDoc(doc(db, "campanhas", campanha.id), {
      status: "ativa",
      sessaoAtiva: true,
      rodadaAtual: 1,
      turnoAtual: 1,
      turnoIndice: 0,
      ordemTurnos,
      sessaoAtualId,
      sessoesCampanha: [sessaoRegistro, ...(Array.isArray(campanha.sessoesCampanha) ? campanha.sessoesCampanha : [])],
      personagemTurnoId: primeiro?.tipo === "personagem" ? primeiro.personagemId : "",
      entidadeTurnoId: primeiro?.entidadeId || "",
      entidadeTurnoTipo: primeiro?.tipo || "",
      personagemTurnoNome: primeiro?.nome || "",
      personagemTurnoDonoId: primeiro?.donoId || "",
      bossesFarmCooldown,
      mensagemSessao: primeiro
        ? `Sessão iniciada. Turno de ${primeiro.nome}.`
        : "Sessão iniciada pelo Mestre.",
      historicoSessao: adicionarEventoHistorico(
        campanha,
        primeiro
          ? `Sessão iniciada. Primeiro turno: ${primeiro.nome}.`
          : "Sessão iniciada pelo Mestre."
      ),
      iniciadaEm: campanha.iniciadaEm || serverTimestamp(),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Sessão iniciada. Os jogadores já podem acompanhar a campanha.", "Sessão ativa", "success");
  } catch (erro) {
    console.error("Erro ao iniciar sessão:", erro);
    await mostrarModal("Erro ao iniciar sessão.", "Erro", "danger");
  }
}

async function pausarSessaoCampanha(campanha) {
  if (!podeControlarCampanha(campanha)) {
    await mostrarModal("Você não tem permissão para pausar esta campanha.", "Permissão negada", "danger");
    return;
  }

  try {
    await updateDoc(doc(db, "campanhas", campanha.id), {
      status: "pausada",
      sessaoAtiva: false,
      mensagemSessao: "Sessão pausada pelo Mestre.",
      historicoSessao: adicionarEventoHistorico(campanha, "Sessão pausada pelo Mestre."),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Sessão pausada.", "Campanha pausada", "success");
  } catch (erro) {
    console.error("Erro ao pausar sessão:", erro);
    await mostrarModal("Erro ao pausar sessão.", "Erro", "danger");
  }
}

async function encerrarSessaoCampanha(campanha) {
  if (!podeControlarCampanha(campanha)) {
    await mostrarModal("Você não tem permissão para encerrar esta campanha.", "Permissão negada", "danger");
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Encerrar sessão",
    mensagem: `Deseja encerrar a sessão da campanha “${campanha.nome}”?`,
    confirmarTexto: "Encerrar",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  try {
    const sessoesCampanha = Array.isArray(campanha.sessoesCampanha)
      ? campanha.sessoesCampanha.map((sessao) => {
          if (sessao.id !== campanha.sessaoAtualId) return sessao;

          return {
            ...sessao,
            status: "encerrada",
            encerradaEmTexto: new Date().toLocaleString("pt-BR")
          };
        })
      : [];

    await updateDoc(doc(db, "campanhas", campanha.id), {
      status: "encerrada",
      sessaoAtiva: false,
      sessaoAtualId: "",
      sessoesCampanha,
      personagemTurnoId: "",
      entidadeTurnoId: "",
      entidadeTurnoTipo: "",
      personagemTurnoNome: "",
      personagemTurnoDonoId: "",
      mensagemSessao: "Sessão encerrada pelo Mestre.",
      historicoSessao: adicionarEventoHistorico(campanha, "Sessão encerrada pelo Mestre."),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Sessão encerrada.", "Campanha encerrada", "success");
  } catch (erro) {
    console.error("Erro ao encerrar sessão:", erro);
    await mostrarModal("Erro ao encerrar sessão.", "Erro", "danger");
  }
}

async function avancarTurnoCampanha(campanha) {
  if (!podeControlarCampanha(campanha)) {
    await mostrarModal("Você não tem permissão para avançar o turno.", "Permissão negada", "danger");
    return;
  }

  const ordemAtual = criarOrdemTurnosCampanha(campanha);

  if (!ordemAtual.length) {
    await mostrarModal("A campanha não possui entidades vivas para a ordem de turnos.", "Sem ordem de turnos", "danger");
    return;
  }

  await reduzirCooldownsDaEntidadeTurno(campanha);

  const { proximoIndice, proximaRodada, proximoTurno } = calcularProximoTurnoCampanha(campanha, ordemAtual);
  const bossesFarmCooldown = reduzirCooldownsBossesFarmCampanha(campanha);

  try {
    await updateDoc(doc(db, "campanhas", campanha.id), {
      rodadaAtual: proximaRodada,
      turnoAtual: proximoIndice + 1,
      turnoIndice: proximoIndice,
      ordemTurnos: ordemAtual,
      personagemTurnoId: proximoTurno?.tipo === "personagem" ? proximoTurno.personagemId : "",
      entidadeTurnoId: proximoTurno?.entidadeId || "",
      entidadeTurnoTipo: proximoTurno?.tipo || "",
      personagemTurnoNome: proximoTurno?.nome || "",
      personagemTurnoDonoId: proximoTurno?.donoId || "",
      bossesFarmCooldown,
      mensagemSessao: `Turno de ${proximoTurno?.nome || "personagem não definido"}.`,
      historicoSessao: adicionarEventoHistorico(
        campanha,
        `Turno avançado. Agora é a vez de ${proximoTurno?.nome || "personagem não definido"}.`
      ),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Turno avançado.", "Turno atualizado", "success");
  } catch (erro) {
    console.error("Erro ao avançar turno:", erro);
    await mostrarModal("Erro ao avançar turno.", "Erro", "danger");
  }
}

async function avancarRodadaCampanha(campanha) {
  if (!podeControlarCampanha(campanha)) {
    await mostrarModal("Você não tem permissão para avançar a rodada.", "Permissão negada", "danger");
    return;
  }

  const proximaRodada = Number(campanha.rodadaAtual || 0) + 1;
  const ordemTurnos = criarOrdemTurnosCampanha(campanha);
  const primeiro = ordemTurnos[0] || null;
  const bossesFarmCooldown = reduzirCooldownsBossesFarmCampanha(campanha);

  for (const personagem of obterPersonagensDaCampanha(campanha)) {
    await reduzirCooldownsDoPersonagem(personagem.id);
    await reduzirCondicoesDoPersonagem(personagem.id);

    for (const pet of obterPetsPersonagemCampanha(personagem)) {
      await reduzirCooldownsDoPet(personagem.id, pet.id);
    }
  }

  try {
    await updateDoc(doc(db, "campanhas", campanha.id), {
      rodadaAtual: proximaRodada,
      turnoAtual: primeiro ? 1 : 0,
      turnoIndice: primeiro ? 0 : -1,
      ordemTurnos,
      bossesFarmCooldown,
      personagemTurnoId: primeiro?.tipo === "personagem" ? primeiro.personagemId : "",
      entidadeTurnoId: primeiro?.entidadeId || "",
      entidadeTurnoTipo: primeiro?.tipo || "",
      personagemTurnoNome: primeiro?.nome || "",
      personagemTurnoDonoId: primeiro?.donoId || "",
      mensagemSessao: primeiro
        ? `Rodada ${proximaRodada} iniciada. Turno de ${primeiro.nome}.`
        : `Rodada ${proximaRodada} iniciada.`,
      historicoSessao: adicionarEventoHistorico(
        campanha,
        primeiro
          ? `Rodada ${proximaRodada} iniciada. Turno de ${primeiro.nome}.`
          : `Rodada ${proximaRodada} iniciada.`
      ),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal(`Rodada ${proximaRodada} iniciada.`, "Rodada avançada", "success");
  } catch (erro) {
    console.error("Erro ao avançar rodada:", erro);
    await mostrarModal("Erro ao avançar rodada.", "Erro", "danger");
  }
}

function criarOrdemTurnos(personagens, campanha = null) {
  return obterEntidadesCombate(campanha, personagens)
    .filter((entidade) => Number(entidade.hpAtual ?? entidade.hp ?? 1) > 0)
    .map((entidade) => ({
      entidadeId: entidade.entidadeId,
      tipo: entidade.tipo,
      personagemId: entidade.tipo === "personagem" ? entidade.id : entidade.personagemId || "",
      donoId: entidade.donoId || "",
      donoNome: entidade.donoNome || "",
      nome: entidade.nome || "Entidade sem nome",
      velocidade: Number(entidade.velocidade || 0),
      hpAtual: Number(entidade.hpAtual || 0),
      hpMax: Number(entidade.hpMax || 0),
      manaAtual: Number(entidade.manaAtual || 0),
      manaMax: Number(entidade.manaMax || 0)
    }))
    .sort((a, b) => {
      if (b.velocidade !== a.velocidade) return b.velocidade - a.velocidade;

      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
    });
}

function criarOrdemTurnosCampanha(campanha, personagensBase = null) {
  return criarOrdemTurnos(personagensBase || obterPersonagensDaCampanha(campanha), campanha);
}

function obterEntidadeTurnoAtualId(campanha) {
  if (campanha?.entidadeTurnoId) return campanha.entidadeTurnoId;
  if (campanha?.personagemTurnoId) return `personagem:${campanha.personagemTurnoId}`;

  const ordem = Array.isArray(campanha?.ordemTurnos) ? campanha.ordemTurnos : [];
  const indice = Number(campanha?.turnoIndice ?? -1);

  return ordem[indice]?.entidadeId || "";
}

function calcularProximoTurnoCampanha(campanha, ordemTurnos) {
  const entidadeAtualId = obterEntidadeTurnoAtualId(campanha);
  const indiceAtualNaOrdem = ordemTurnos.findIndex((turno) => turno.entidadeId === entidadeAtualId);
  let proximaRodada = Number(campanha.rodadaAtual || 1);
  let proximoIndice = 0;

  if (indiceAtualNaOrdem >= 0) {
    proximoIndice = indiceAtualNaOrdem + 1;

    if (proximoIndice >= ordemTurnos.length) {
      proximoIndice = 0;
      proximaRodada += 1;
    }
  } else {
    const indiceSalvo = Number(campanha.turnoIndice ?? 0);
    proximoIndice = Math.min(Math.max(indiceSalvo, 0), ordemTurnos.length - 1);

    if (indiceSalvo >= ordemTurnos.length) {
      proximoIndice = 0;
      proximaRodada += 1;
    }
  }

  return {
    proximoIndice,
    proximaRodada,
    proximoTurno: ordemTurnos[proximoIndice] || null
  };
}

function montarAtualizacaoOrdemTurnos(campanha, personagensBase = null) {
  const ordemTurnos = criarOrdemTurnosCampanha(campanha, personagensBase);
  const entidadeAtualId = obterEntidadeTurnoAtualId(campanha);
  let turnoIndice = ordemTurnos.findIndex((turno) => turno.entidadeId === entidadeAtualId);

  if (turnoIndice < 0) {
    const indiceSalvo = Number(campanha.turnoIndice ?? 0);
    turnoIndice = ordemTurnos.length
      ? Math.min(Math.max(indiceSalvo, 0), ordemTurnos.length - 1)
      : -1;
  }

  const turnoAtual = turnoIndice >= 0 ? ordemTurnos[turnoIndice] : null;

  return {
    ordemTurnos,
    turnoAtual: turnoAtual ? turnoIndice + 1 : 0,
    turnoIndice,
    personagemTurnoId: turnoAtual?.tipo === "personagem" ? turnoAtual.personagemId : "",
    entidadeTurnoId: turnoAtual?.entidadeId || "",
    entidadeTurnoTipo: turnoAtual?.tipo || "",
    personagemTurnoNome: turnoAtual?.nome || "",
    personagemTurnoDonoId: turnoAtual?.donoId || ""
  };
}

function abrirModalRolagemSessao(campanha) {
  fecharModalRolagemSessao();

  campanhaSelecionadaRolagem = campanha;

  const personagens = obterPersonagensDisponiveisParaAcao(campanha);

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalRolagemSessao";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Rolar D20 na sessão</h3>
          <p>O resultado será registrado no histórico da campanha.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalRolagemSessao">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Personagem
            <select id="rolagemPersonagemSessao">
              ${montarOptionsPersonagensRolagem(personagens)}
            </select>
          </label>

          <label>
            Motivo da rolagem
            <input type="text" id="rolagemMotivoSessao" placeholder="Ex: ataque, defesa, percepção..." />
          </label>

          <label>
            Bônus
            <input type="number" id="rolagemBonusSessao" value="0" />
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarRolagemSessao">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarRolagemSessao">Rolar D20</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalRolagemSessao")?.addEventListener("click", fecharModalRolagemSessao);
  document.getElementById("cancelarRolagemSessao")?.addEventListener("click", fecharModalRolagemSessao);
  document.getElementById("confirmarRolagemSessao")?.addEventListener("click", rolarD20Sessao);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalRolagemSessao();
  });
}

function fecharModalRolagemSessao() {
  const overlay = document.getElementById("modalRolagemSessao");

  if (overlay) overlay.remove();

  campanhaSelecionadaRolagem = null;
}

function montarOptionsPersonagensRolagem(personagens) {
  if (!personagens.length) {
    return `<option value="">Nenhum personagem disponível</option>`;
  }

  return personagens
    .map((personagem) => {
      return `<option value="${personagem.id}">${escapeHtml(personagem.nome || "Personagem sem nome")}</option>`;
    })
    .join("");
}

async function rolarD20Sessao() {
  if (!campanhaSelecionadaRolagem) {
    await mostrarModal("Nenhuma campanha selecionada.", "Erro", "danger");
    return;
  }

  const personagens = obterPersonagensDisponiveisParaAcao(campanhaSelecionadaRolagem);
  const personagemId = valorCampo("rolagemPersonagemSessao");
  const personagem = personagens.find((item) => item.id === personagemId);

  if (!personagem) {
    await mostrarModal("Selecione um personagem para a rolagem.", "Campo obrigatório");
    return;
  }

  const motivo = textoCampo("rolagemMotivoSessao") || "Rolagem de D20";
  const bonus = numeroCampo("rolagemBonusSessao");
  const dado = Math.floor(Math.random() * 20) + 1;
  const total = dado + bonus;

  const texto = `${personagem.nome || "Personagem"} rolou D20 para ${motivo}: ${dado}${bonus >= 0 ? " +" : " "}${bonus} = ${total}.`;

  const resultado = {
    personagemId: personagem.id,
    personagemNome: personagem.nome || "Personagem sem nome",
    donoId: personagem.donoId || "",
    motivo,
    dado,
    bonus,
    total,
    criadoEmTexto: new Date().toLocaleString("pt-BR")
  };

  try {
    await updateDoc(doc(db, "campanhas", campanhaSelecionadaRolagem.id), {
      ultimoResultadoD20: resultado,
      mensagemSessao: texto,
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaRolagem, texto, "dado"),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal(`Resultado: ${total}`, "D20 rolado", "success");
    fecharModalRolagemSessao();
  } catch (erro) {
    console.error("Erro ao registrar rolagem:", erro);
    await mostrarModal("Erro ao registrar rolagem.", "Erro", "danger");
  }
}

function abrirModalUsarHabilidade(campanha, personagem) {
  fecharModalAcaoPersonagem();

  campanhaSelecionadaAcao = campanha;
  personagemSelecionadoAcao = personagem;

  const habilidades = obterHabilidadesDoPersonagem(personagem);
  const primeiraHabilidade = habilidades[0] || null;
  const modoSugerido = obterModoEfeitoHabilidade(primeiraHabilidade);
  const valorSugerido = obterValorEfeitoHabilidade(primeiraHabilidade);

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Usar habilidade</h3>
          <p>${escapeHtml(personagem.nome || "Personagem")}</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Habilidade
            <select id="habilidadeUsadaSessao">
              ${
                habilidades.length
                  ? habilidades.map((habilidade) => {
                      const custo = obterCustoManaHabilidade(habilidade);
                      const cooldown = obterCooldownHabilidade(habilidade);
                      const restante = obterCooldownRestante(personagem, habilidade.id);
                      const extra = restante > 0 ? ` — em cooldown: ${restante}` : ` — Mana: ${custo} — CD: ${cooldown}`;
                      return `<option value="${habilidade.id}">${escapeHtml(habilidade.nome || "Habilidade")}${extra}</option>`;
                    }).join("")
                  : `<option value="">Nenhuma habilidade disponível</option>`
              }
            </select>
          </label>

          <label>
            Alvo
            <select id="habilidadeAlvoSessao">
              <option value="">Apenas registrar uso</option>
              ${montarOptionsEntidadesAlvo(campanha)}
            </select>
          </label>

          <div class="form-grid">
            <label>
              Efeito automático
              <select id="habilidadeModoSessao">
                <option value="" ${!modoSugerido ? "selected" : ""}>Apenas registrar</option>
                <option value="dano" ${modoSugerido === "dano" ? "selected" : ""}>Aplicar dano</option>
                <option value="cura" ${modoSugerido === "cura" ? "selected" : ""}>Aplicar cura</option>
              </select>
            </label>

            <label>
              Valor
              <input type="number" id="habilidadeValorSessao" value="${valorSugerido}" min="0" />
            </label>
          </div>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarUsoHabilidade">Usar habilidade</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("confirmarUsoHabilidade")?.addEventListener("click", usarHabilidadeSelecionada);
  document.getElementById("habilidadeUsadaSessao")?.addEventListener("change", atualizarCamposHabilidadeSelecionada);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

function atualizarCamposHabilidadeSelecionada() {
  const habilidadeId = valorCampo("habilidadeUsadaSessao");
  const habilidade = obterHabilidadesDoPersonagem(personagemSelecionadoAcao).find((item) => item.id === habilidadeId);
  const modo = obterModoEfeitoHabilidade(habilidade);
  const valor = obterValorEfeitoHabilidade(habilidade);
  const campoModo = document.getElementById("habilidadeModoSessao");
  const campoValor = document.getElementById("habilidadeValorSessao");

  if (campoModo) campoModo.value = modo;
  if (campoValor) campoValor.value = valor;
}

async function usarHabilidadeSelecionada() {
  if (!campanhaSelecionadaAcao || !personagemSelecionadoAcao) {
    await mostrarModal("Nenhuma ação selecionada.", "Erro", "danger");
    return;
  }

  const habilidadeId = valorCampo("habilidadeUsadaSessao");
  const habilidade = obterHabilidadesDoPersonagem(personagemSelecionadoAcao).find((item) => item.id === habilidadeId);
  const alvoId = valorCampo("habilidadeAlvoSessao");
  const modoEfeito = valorCampo("habilidadeModoSessao");
  const valorEfeito = Math.max(0, numeroCampo("habilidadeValorSessao"));

  if (!habilidade) {
    await mostrarModal("Selecione uma habilidade válida.", "Campo obrigatório");
    return;
  }

  const custoMana = obterCustoManaHabilidade(habilidade);
  const cooldown = obterCooldownHabilidade(habilidade);
  const cooldownRestante = obterCooldownRestante(personagemSelecionadoAcao, habilidade.id);
  const manaAtual = Number(personagemSelecionadoAcao.manaAtual || 0);

  if (cooldownRestante > 0) {
    await mostrarModal(`Essa habilidade ainda está em cooldown por ${cooldownRestante} turno(s).`, "Cooldown ativo", "danger");
    return;
  }

  if (manaAtual < custoMana) {
    await mostrarModal(
      `Mana insuficiente. Necessário: ${custoMana}. Mana atual: ${manaAtual}.`,
      "Mana insuficiente",
      "danger"
    );
    return;
  }

  const novaMana = manaAtual - custoMana;
  const cooldowns = {
    ...(personagemSelecionadoAcao.cooldownsHabilidades || {})
  };

  if (cooldown > 0) {
    cooldowns[habilidade.id] = cooldown;
  }

  const texto = `${personagemSelecionadoAcao.nome || "Personagem"} usou ${habilidade.nome || "uma habilidade"} e gastou ${custoMana} de Mana.`;
  let resultadoAlvo = null;
  const alvo = alvoId && modoEfeito && valorEfeito > 0
    ? obterEntidadesCombate(campanhaSelecionadaAcao).find((entidade) => entidade.entidadeId === alvoId)
    : null;

  if (alvoId && modoEfeito && valorEfeito > 0 && !alvo) {
    await mostrarModal("Alvo da habilidade não encontrado.", "Erro", "danger");
    return;
  }

  try {
    await updateDoc(doc(db, "personagens", personagemSelecionadoAcao.id), {
      manaAtual: novaMana,
      cooldownsHabilidades: cooldowns,
      atualizadoEm: serverTimestamp()
    });

    if (alvo) {
      resultadoAlvo = await aplicarAtualizacaoHpAlvo(campanhaSelecionadaAcao, alvo, modoEfeito, valorEfeito);
    }

    const textoFinal = `${texto}${montarTextoResultadoHp(resultadoAlvo)}`;

    await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
      mensagemSessao: textoFinal,
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, textoFinal, "habilidade"),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Habilidade usada com sucesso.", "Ação registrada", "success");
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao usar habilidade:", erro);
    await mostrarModal("Erro ao usar habilidade.", "Erro", "danger");
  }
}

function abrirModalUsarItem(campanha, personagem) {
  fecharModalAcaoPersonagem();

  campanhaSelecionadaAcao = campanha;
  personagemSelecionadoAcao = personagem;

  const inventario = obterInventarioPersonagem(personagem);

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Usar item</h3>
          <p>${escapeHtml(personagem.nome || "Personagem")}</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Item
            <select id="itemUsadoSessao">
              ${
                inventario.length
                  ? inventario.map((item) => {
                      return `<option value="${item.id}">${escapeHtml(item.nome || "Item")} — Qtde: ${Number(item.quantidade || 1)}</option>`;
                    }).join("")
                  : `<option value="">Nenhum item no inventário</option>`
              }
            </select>
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarUsoItem">Usar item</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("confirmarUsoItem")?.addEventListener("click", usarItemSelecionado);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

async function usarItemSelecionado() {
  if (!campanhaSelecionadaAcao || !personagemSelecionadoAcao) {
    await mostrarModal("Nenhuma ação selecionada.", "Erro", "danger");
    return;
  }

  const itemId = valorCampo("itemUsadoSessao");
  const inventario = obterInventarioPersonagem(personagemSelecionadoAcao);
  const itemInventario = inventario.find((item) => item.id === itemId);

  if (!itemInventario) {
    await mostrarModal("Selecione um item válido.", "Campo obrigatório");
    return;
  }

  const itemCompleto = completarItem(itemInventario);
  const resultado = aplicarEfeitoItem(personagemSelecionadoAcao, itemCompleto);
  const novoInventario = consumirItemInventario(inventario, itemInventario.id);

  const texto = `${personagemSelecionadoAcao.nome || "Personagem"} usou ${itemCompleto.nome || "um item"}. ${resultado.descricao}`;

  try {
    await updateDoc(doc(db, "personagens", personagemSelecionadoAcao.id), {
      ...resultado.atualizacao,
      inventario: novoInventario,
      atualizadoEm: serverTimestamp()
    });

    await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
      mensagemSessao: texto,
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, texto, "item"),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Item usado com sucesso.", "Ação registrada", "success");
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao usar item:", erro);
    await mostrarModal("Erro ao usar item.", "Erro", "danger");
  }
}

function abrirModalCondicao(campanha, personagem, modo) {
  fecharModalAcaoPersonagem();

  campanhaSelecionadaAcao = campanha;
  personagemSelecionadoAcao = personagem;

  const condicoesAtuais = normalizarCondicoesPersonagem(personagem);

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  const opcoes = modo === "remover"
    ? condicoesAtuais
    : CONDICOES_PADRAO;

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>${modo === "remover" ? "Remover condição" : "Aplicar condição"}</h3>
          <p>${escapeHtml(personagem.nome || "Personagem")}</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Condição
            <select id="condicaoSelecionada">
              ${
                opcoes.length
                  ? opcoes.map((condicao) => {
                      const nomeCondicao = obterNomeCondicaoCampanha(condicao);
                      return `<option value="${escapeHtml(nomeCondicao)}">${escapeHtml(rotuloCondicaoCampanha(condicao))}</option>`;
                    }).join("")
                  : `<option value="">Nenhuma condição disponível</option>`
              }
            </select>
          </label>

          ${
            modo === "remover"
              ? ""
              : `
                <div class="form-grid">
                  <label>
                    Duração em turnos
                    <input type="number" id="condicaoDuracaoTurnos" value="0" min="0" />
                  </label>

                  <label>
                    Origem
                    <input type="text" id="condicaoOrigem" placeholder="Ex: Magia, veneno, item..." />
                  </label>
                </div>
              `
          }

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarCondicao">
              ${modo === "remover" ? "Remover" : "Aplicar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("confirmarCondicao")?.addEventListener("click", () => salvarCondicaoPersonagem(modo));

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

async function salvarCondicaoPersonagem(modo) {
  if (!campanhaSelecionadaAcao || !personagemSelecionadoAcao) {
    await mostrarModal("Nenhuma ação selecionada.", "Erro", "danger");
    return;
  }

  const condicao = valorCampo("condicaoSelecionada");

  if (!condicao) {
    await mostrarModal("Selecione uma condição.", "Campo obrigatório");
    return;
  }

  const condicoesAtuais = normalizarCondicoesPersonagem(personagemSelecionadoAcao);
  const duracao = Math.max(0, numeroCampo("condicaoDuracaoTurnos"));
  const origem = textoCampo("condicaoOrigem");

  let novasCondicoes = [...condicoesAtuais];

  if (modo === "remover") {
    novasCondicoes = novasCondicoes.filter((item) => obterNomeCondicaoCampanha(item) !== condicao);
  } else if (!novasCondicoes.some((item) => obterNomeCondicaoCampanha(item) === condicao)) {
    novasCondicoes.push({
      nome: condicao,
      duracao,
      origem,
      aplicadoEmTexto: new Date().toLocaleString("pt-BR")
    });
  }

  const texto = modo === "remover"
    ? `${condicao} foi removido de ${personagemSelecionadoAcao.nome || "Personagem"}.`
    : `${personagemSelecionadoAcao.nome || "Personagem"} recebeu a condição ${condicao}${duracao > 0 ? ` por ${duracao} turno(s)` : ""}.`;

  try {
    await updateDoc(doc(db, "personagens", personagemSelecionadoAcao.id), {
      condicoes: novasCondicoes,
      atualizadoEm: serverTimestamp()
    });

    await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
      mensagemSessao: texto,
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, texto, "condicao"),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Condição atualizada com sucesso.", "Status atualizado", "success");
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao atualizar condição:", erro);
    await mostrarModal("Erro ao atualizar condição.", "Erro", "danger");
  }
}

function normalizarCondicoesPersonagem(personagem) {
  const condicoes = Array.isArray(personagem?.condicoes) ? personagem.condicoes : [];

  return condicoes
    .filter(Boolean)
    .map((condicao) => {
      if (typeof condicao === "object") {
        return {
          nome: condicao.nome || condicao.condicao || "Condição",
          duracao: Number(condicao.duracao ?? condicao.turnos ?? 0) || 0,
          origem: condicao.origem || "",
          aplicadoEmTexto: condicao.aplicadoEmTexto || condicao.criadoEmTexto || ""
        };
      }

      return {
        nome: String(condicao),
        duracao: 0,
        origem: "",
        aplicadoEmTexto: ""
      };
    });
}

function obterNomeCondicaoCampanha(condicao) {
  if (typeof condicao === "object") return condicao.nome || condicao.condicao || "Condição";
  return String(condicao || "");
}

function rotuloCondicaoCampanha(condicao) {
  const normalizada = typeof condicao === "object"
    ? condicao
    : { nome: String(condicao || "") };
  const partes = [normalizada.nome || "Condição"];
  const duracao = Number(normalizada.duracao || 0);

  if (duracao > 0) partes.push(`${duracao}t`);
  if (normalizada.origem) partes.push(normalizada.origem);

  return partes.join(" • ");
}

async function reduzirCondicoesDoPersonagem(personagemId) {
  const personagem = state.personagens.find((item) => item.id === personagemId);

  if (!personagem || !Array.isArray(personagem.condicoes)) return;

  let alterou = false;
  const condicoes = normalizarCondicoesPersonagem(personagem)
    .map((condicao) => {
      const duracao = Number(condicao.duracao || 0);

      if (duracao <= 0) return condicao;

      alterou = true;

      return {
        ...condicao,
        duracao: Math.max(0, duracao - 1),
        expirada: duracao - 1 <= 0
      };
    })
    .filter((condicao) => !condicao.expirada)
    .map(({ expirada, ...condicao }) => condicao);

  if (!alterou) return;

  await updateDoc(doc(db, "personagens", personagemId), {
    condicoes,
    atualizadoEm: serverTimestamp()
  });
}

function fecharModalAcaoPersonagem() {
  const overlay = document.getElementById("modalAcaoPersonagem");

  if (overlay) overlay.remove();

  campanhaSelecionadaAcao = null;
  personagemSelecionadoAcao = null;
}

function obterPersonagensDisponiveisParaAcao(campanha) {
  const personagens = obterPersonagensDaCampanha(campanha);

  if (state.dadosUsuarioAtual?.tipo === "mestre") return personagens;

  return personagens.filter((personagem) => personagem.donoId === state.usuarioAtual.uid);
}

function obterTodosPersonagensDaCampanha(campanha) {
  if (!Array.isArray(state.personagens)) return [];

  return state.personagens
    .filter((personagem) => personagem.campanhaId === campanha.id)
    .sort(ordenarPersonagens);
}

function obterPersonagensDaCampanha(campanha) {
  return obterTodosPersonagensDaCampanha(campanha)
    .filter((personagem) => personagemAprovadoParaCampanha(personagem, campanha));
}

function obterStatusPersonagemCampanha(personagem, campanha = null) {
  const status = String(personagem?.statusCampanha || "").toLowerCase();

  if (STATUS_PERSONAGEM_CAMPANHA[status]) return status;

  if (personagem?.aprovadoCampanha === true) return "aprovado";
  if (campanha && Array.isArray(campanha.personagensPendentes) && campanha.personagensPendentes.includes(personagem?.id)) return "pendente";
  if (campanha && Array.isArray(campanha.personagensAprovados) && campanha.personagensAprovados.includes(personagem?.id)) return "aprovado";

  return personagem?.campanhaId ? "aprovado" : "pendente";
}

function personagemAprovadoParaCampanha(personagem, campanha = null) {
  return obterStatusPersonagemCampanha(personagem, campanha) === "aprovado";
}

function rotuloStatusPersonagemCampanha(status) {
  return STATUS_PERSONAGEM_CAMPANHA[status] || "Pendente";
}

function criarEventoSessaoTexto(texto, tipo = "sistema") {
  return {
    tipo,
    texto,
    criadoEmTexto: new Date().toLocaleString("pt-BR")
  };
}

function adicionarEventoHistorico(campanha, texto, tipo = "sistema") {
  const historico = Array.isArray(campanha.historicoSessao)
    ? [...campanha.historicoSessao]
    : [];

  historico.unshift(criarEventoSessaoTexto(texto, tipo));

  return historico.slice(0, 30);
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

  if (!podeControlarCampanha(campanha)) {
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

function podeControlarCampanha(campanha) {
  return (
    state.dadosUsuarioAtual?.tipo === "mestre" &&
    (
      campanha.mestreId === state.usuarioAtual.uid ||
      campanha.criadoPor === state.usuarioAtual.uid ||
      campanha.mestreEmail === state.usuarioAtual.email
    )
  );
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
    if (event.target === overlay) fecharModalEdicaoCampanha();
  });
}

function fecharModalEdicaoCampanha() {
  const overlay = document.getElementById("modalEdicaoCampanha");

  if (overlay) overlay.remove();

  campanhaSelecionadaEdicao = null;
}

export function buscarCampanhaPorId(id) {
  return state.minhasCampanhas.find((campanha) => campanha.id === id) || null;
}

export function preencherSelectCampanhas() {
  const selects = [
    document.getElementById("personagemCampanha"),
    document.getElementById("vincularCampanhaSelect"),
    document.getElementById("mestreCampanhaSelect"),
    document.getElementById("sessaoCampanhaSelect")
  ];

  selects.forEach((select) => {
    if (!select) return;

    const valorAtual = select.value;
    const idSelect = select.id;

    select.innerHTML = "";

    if (idSelect === "personagemCampanha" || idSelect === "vincularCampanhaSelect") {
      select.innerHTML = `<option value="">Nenhuma campanha</option>`;
    } else {
      select.innerHTML = `<option value="">Selecione uma campanha</option>`;
    }

    if (!state.minhasCampanhas || state.minhasCampanhas.length === 0) {
      if (idSelect !== "personagemCampanha" && idSelect !== "vincularCampanhaSelect") {
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

    if (valorAtual) select.value = valorAtual;
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

    const podeEditar = podeControlarCampanha(campanha);
    const sessaoAtiva = campanha.status === "ativa" || campanha.sessaoAtiva === true;
    const statusTexto = obterTextoStatusCampanha(campanha);
    const statusClasse = obterClasseStatusCampanha(campanha);
    const todosPersonagens = obterTodosPersonagensDaCampanha(campanha);
    const personagens = obterPersonagensDaCampanha(campanha);
    const ehMeuTurno = campanha.personagemTurnoDonoId === state.usuarioAtual?.uid;

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

      <div class="campaign-session-panel ${statusClasse}">
        <div>
          <span>Status da sessão</span>
          <strong>${escapeHtml(statusTexto)}</strong>
          <p>${escapeHtml(campanha.mensagemSessao || "Aguardando movimentação da campanha.")}</p>
          ${
            ehMeuTurno && sessaoAtiva
              ? `<div class="turno-alerta-jogador">É a sua vez de agir.</div>`
              : ""
          }
        </div>

        <div class="campaign-session-stats">
          <span><b>Rodada</b>${Number(campanha.rodadaAtual || 0)}</span>
          <span><b>Turno</b>${Number(campanha.turnoAtual || 0)}</span>
          <span><b>Vez de</b>${escapeHtml(campanha.personagemTurnoNome || "Não definido")}</span>
        </div>
      </div>

      <div class="campaign-info-grid">
        <span><b>Mestre</b>${escapeHtml(campanha.mestreNome || "Não informado")}</span>
        <span><b>Jogadores</b>${Array.isArray(campanha.jogadores) ? campanha.jogadores.length : 0}</span>
        <span><b>Aprovados</b>${personagens.length}/${todosPersonagens.length}</span>
        <span><b>Código</b>${escapeHtml(campanha.codigo || "Sem código")}</span>
      </div>

      ${montarLobbyCampanha(campanha, todosPersonagens, personagens)}

      <div class="campaign-characters-panel">
        <div class="campaign-section-title">
          <span>Personagens da campanha</span>
          <strong>${personagens.length}/${todosPersonagens.length}</strong>
        </div>

        ${montarPersonagensCampanha(todosPersonagens, campanha)}
      </div>

      <div class="campaign-characters-panel">
        <div class="campaign-section-title">
          <span>Batalhas e encontros</span>
          <strong>${obterBatalhasCampanha(campanha).length}</strong>
        </div>

        ${montarBatalhasCampanha(campanha, personagens)}
      </div>

      <div class="campaign-characters-panel">
        <div class="campaign-section-title">
          <span>Monstros e bosses da campanha</span>
          <strong>${obterInimigosCampanha(campanha).length}</strong>
        </div>

        ${montarInimigosCampanha(campanha)}
      </div>

      <div class="campaign-turn-panel">
        <div class="campaign-section-title">
          <span>Ordem de turno</span>
          <strong>${Array.isArray(campanha.ordemTurnos) ? campanha.ordemTurnos.length : 0}</strong>
        </div>

        ${montarOrdemTurnos(campanha)}
      </div>

      <div class="campaign-history-panel">
        <div class="campaign-section-title">
          <span>Histórico da sessão</span>
          <strong>${Array.isArray(campanha.historicoSessao) ? campanha.historicoSessao.length : 0}</strong>
        </div>

        ${montarHistoricoSessao(campanha)}
      </div>

      <div class="action-row campaign-actions">
        ${
          podeEditar
            ? montarBotoesControleSessao(campanha, sessaoAtiva)
            : montarBotoesJogadorSessao(campanha, sessaoAtiva, personagens)
        }
      </div>
    `;

    vincularEventosCardCampanha(card, campanha, todosPersonagens);

    lista.appendChild(card);
  });
}

function vincularEventosCardCampanha(card, campanha, personagens) {
  const botaoIniciar = card.querySelector(".iniciar-sessao-campanha");
  const botaoPausar = card.querySelector(".pausar-sessao-campanha");
  const botaoEncerrar = card.querySelector(".encerrar-sessao-campanha");
  const botaoAvancarTurno = card.querySelector(".avancar-turno-campanha");
  const botaoAvancarRodada = card.querySelector(".avancar-rodada-campanha");
  const botaoEditar = card.querySelector(".editar-campanha");
  const botaoExcluir = card.querySelector(".excluir-campanha");
  const botaoRolar = card.querySelector(".rolar-d20-sessao");
  const botaoVincularJogador = card.querySelector(".vincular-jogador-campanha");
  const botaoCopiarCodigo = card.querySelector(".copiar-codigo-campanha");

  if (botaoIniciar) botaoIniciar.addEventListener("click", () => iniciarSessaoCampanha(campanha));
  if (botaoPausar) botaoPausar.addEventListener("click", () => pausarSessaoCampanha(campanha));
  if (botaoEncerrar) botaoEncerrar.addEventListener("click", () => encerrarSessaoCampanha(campanha));
  if (botaoAvancarTurno) botaoAvancarTurno.addEventListener("click", () => avancarTurnoCampanha(campanha));
  if (botaoAvancarRodada) botaoAvancarRodada.addEventListener("click", () => avancarRodadaCampanha(campanha));
  if (botaoEditar) botaoEditar.addEventListener("click", () => abrirEdicaoCampanha(campanha));
  if (botaoExcluir) botaoExcluir.addEventListener("click", () => excluirCampanha(campanha));
  if (botaoRolar) botaoRolar.addEventListener("click", () => abrirModalRolagemSessao(campanha));
  if (botaoVincularJogador) botaoVincularJogador.addEventListener("click", () => abrirModalVincularJogadorCampanha(campanha));
  if (botaoCopiarCodigo) botaoCopiarCodigo.addEventListener("click", () => copiarCodigoCampanha(campanha));

  card.querySelectorAll(".ataque-alvo-campanha").forEach((botao) => {
    botao.addEventListener("click", () => abrirModalAcaoAlvo(campanha, "dano"));
  });

  card.querySelectorAll(".cura-alvo-campanha").forEach((botao) => {
    botao.addEventListener("click", () => abrirModalAcaoAlvo(campanha, "cura"));
  });

  card.querySelectorAll(".adicionar-monstro-campanha").forEach((botao) => {
    botao.addEventListener("click", () => abrirModalAdicionarCriaturaCampanha(campanha, "monstro"));
  });

  card.querySelectorAll(".adicionar-boss-campanha").forEach((botao) => {
    botao.addEventListener("click", () => abrirModalAdicionarCriaturaCampanha(campanha, "boss"));
  });

  card.querySelectorAll(".criar-boss-campanha").forEach((botao) => {
    botao.addEventListener("click", () => abrirModalCriarBossCampanha(campanha));
  });

  card.querySelectorAll(".criar-batalha-campanha").forEach((botao) => {
    botao.addEventListener("click", () => abrirModalCriarBatalhaCampanha(campanha));
  });

  card.querySelectorAll(".encerrar-batalha-campanha").forEach((botao) => {
    botao.addEventListener("click", () => encerrarBatalhaCampanha(campanha, botao.dataset.batalhaId));
  });

  card.querySelectorAll(".aprovar-personagem-campanha").forEach((botao) => {
    botao.addEventListener("click", () => {
      const personagem = personagens.find((item) => item.id === botao.dataset.personagemId);
      if (personagem) atualizarStatusPersonagemCampanha(campanha, personagem, "aprovado");
    });
  });

  card.querySelectorAll(".recusar-personagem-campanha").forEach((botao) => {
    botao.addEventListener("click", () => {
      const personagem = personagens.find((item) => item.id === botao.dataset.personagemId);
      if (personagem) atualizarStatusPersonagemCampanha(campanha, personagem, "recusado");
    });
  });

  card.querySelectorAll(".remover-personagem-campanha").forEach((botao) => {
    botao.addEventListener("click", () => {
      const personagem = personagens.find((item) => item.id === botao.dataset.personagemId);
      if (personagem) removerPersonagemDaCampanha(campanha, personagem);
    });
  });

  card.querySelectorAll(".remover-jogador-campanha").forEach((botao) => {
    botao.addEventListener("click", () => removerJogadorCampanha(campanha, botao.dataset.jogadorId));
  });

  card.querySelectorAll(".ataque-inimigo-campanha").forEach((botao) => {
    botao.addEventListener("click", () => {
      abrirModalAtaqueInimigo(campanha, botao.dataset.entidadeId);
    });
  });

  card.querySelectorAll(".aplicar-recompensas-campanha").forEach((botao) => {
    botao.addEventListener("click", () => abrirModalRecompensasCombate(campanha));
  });

  card.querySelectorAll(".resumo-sessao-campanha").forEach((botao) => {
    botao.addEventListener("click", () => abrirModalResumoSessao(campanha));
  });

  card.querySelectorAll(".exportar-historico-campanha").forEach((botao) => {
    botao.addEventListener("click", () => exportarHistoricoSessao(campanha));
  });

  card.querySelectorAll(".usar-habilidade-pet-campanha").forEach((botao) => {
    botao.addEventListener("click", () => {
      const personagem = personagens.find((item) => item.id === botao.dataset.personagemId);
      if (personagem) abrirModalUsarHabilidadePetCampanha(campanha, personagem, botao.dataset.petId);
    });
  });

  card.querySelectorAll(".usar-habilidade-campanha").forEach((botao) => {
    botao.addEventListener("click", () => {
      const personagem = personagens.find((item) => item.id === botao.dataset.personagemId);
      if (personagem) abrirModalUsarHabilidade(campanha, personagem);
    });
  });

  card.querySelectorAll(".usar-item-campanha").forEach((botao) => {
    botao.addEventListener("click", () => {
      const personagem = personagens.find((item) => item.id === botao.dataset.personagemId);
      if (personagem) abrirModalUsarItem(campanha, personagem);
    });
  });

  card.querySelectorAll(".aplicar-condicao-campanha").forEach((botao) => {
    botao.addEventListener("click", () => {
      const personagem = personagens.find((item) => item.id === botao.dataset.personagemId);
      if (personagem) abrirModalCondicao(campanha, personagem, "aplicar");
    });
  });

  card.querySelectorAll(".remover-condicao-campanha").forEach((botao) => {
    botao.addEventListener("click", () => {
      const personagem = personagens.find((item) => item.id === botao.dataset.personagemId);
      if (personagem) abrirModalCondicao(campanha, personagem, "remover");
    });
  });

  card.querySelectorAll(".history-filter-btn").forEach((botao) => {
    botao.addEventListener("click", () => filtrarHistoricoCardCampanha(card, botao.dataset.historyFilter || "todos"));
  });
}

function montarLobbyCampanha(campanha, todosPersonagens, personagensAprovados) {
  const jogadores = Array.isArray(campanha.jogadores) ? campanha.jogadores : [];
  const podeMestre = podeControlarCampanha(campanha);
  const pendentes = todosPersonagens.filter((personagem) => obterStatusPersonagemCampanha(personagem, campanha) === "pendente");
  const recusados = todosPersonagens.filter((personagem) => obterStatusPersonagemCampanha(personagem, campanha) === "recusado");
  const semPersonagem = jogadores.filter((jogador) => {
    return !todosPersonagens.some((personagem) => personagem.donoId === jogador.id);
  });
  const pronto = jogadores.length > 0 && personagensAprovados.length > 0 && pendentes.length === 0;

  return `
    <div class="campaign-lobby-panel ${pronto ? "ready" : "waiting"}">
      <div class="campaign-section-title">
        <span>Lobby da campanha</span>
        <strong>${pronto ? "Pronto" : "Preparando"}</strong>
      </div>

      <div class="campaign-readiness-grid">
        <span><b>Jogadores</b>${jogadores.length}</span>
        <span><b>Personagens</b>${todosPersonagens.length}</span>
        <span><b>Aprovados</b>${personagensAprovados.length}</span>
        <span><b>Pendentes</b>${pendentes.length}</span>
        <span><b>Sem personagem</b>${semPersonagem.length}</span>
        <span><b>Recusados</b>${recusados.length}</span>
      </div>

      <div class="campaign-lobby-columns">
        <div>
          <h5>Jogadores</h5>
          ${
            jogadores.length
              ? jogadores.map((jogador) => {
                  const quantidadePersonagens = todosPersonagens.filter((personagem) => personagem.donoId === jogador.id).length;

                  return `
                    <p>
                      <strong>${escapeHtml(jogador.nome || jogador.email || "Jogador")}</strong>
                      <span>${quantidadePersonagens} personagem(ns)</span>
                      ${podeMestre ? `<button class="small-btn danger remover-jogador-campanha" type="button" data-jogador-id="${jogador.id}">Remover</button>` : ""}
                    </p>
                  `;
                }).join("")
              : "<p>Nenhum jogador vinculado.</p>"
          }
        </div>

        <div>
          <h5>Pendências</h5>
          ${
            pendentes.length
              ? pendentes.map((personagem) => `<p><strong>${escapeHtml(personagem.nome || "Personagem")}</strong><span>Aguardando aprovação</span></p>`).join("")
              : "<p>Nenhuma aprovação pendente.</p>"
          }
          ${
            semPersonagem.length
              ? semPersonagem.map((jogador) => `<p><strong>${escapeHtml(jogador.nome || jogador.email || "Jogador")}</strong><span>Sem personagem vinculado</span></p>`).join("")
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function obterBatalhasCampanha(campanha) {
  return Array.isArray(campanha?.batalhasSessao) ? campanha.batalhasSessao : [];
}

function obterBatalhaAtivaCampanha(campanha) {
  return obterBatalhasCampanha(campanha).find((batalha) => batalha.id === campanha.batalhaAtivaId && batalha.status !== "encerrada") || null;
}

function montarBatalhasCampanha(campanha, personagensAprovados) {
  const batalhas = obterBatalhasCampanha(campanha);
  const batalhaAtiva = obterBatalhaAtivaCampanha(campanha);
  const podeMestre = podeControlarCampanha(campanha);

  return `
    <div class="campaign-battle-panel ${batalhaAtiva ? "active" : ""}">
      <div class="campaign-battle-toolbar">
        <div>
          <strong>${escapeHtml(batalhaAtiva?.nome || "Nenhuma batalha ativa")}</strong>
          <span>${batalhaAtiva ? escapeHtml(batalhaAtiva.objetivo || "Encontro em andamento") : "Crie uma batalha para organizar participantes, monstros e histórico."}</span>
        </div>
        ${
          podeMestre
            ? `
              <div class="action-row">
                <button class="secondary-btn criar-batalha-campanha" type="button">Nova batalha</button>
                ${batalhaAtiva ? `<button class="small-btn danger encerrar-batalha-campanha" type="button" data-batalha-id="${batalhaAtiva.id}">Encerrar batalha</button>` : ""}
              </div>
            `
            : ""
        }
      </div>

      <div class="campaign-readiness-grid">
        <span><b>Batalhas</b>${batalhas.length}</span>
        <span><b>Ativa</b>${batalhaAtiva ? "Sim" : "Não"}</span>
        <span><b>Personagens</b>${batalhaAtiva?.personagensIds?.length || personagensAprovados.length}</span>
        <span><b>Inimigos</b>${batalhaAtiva?.inimigosIds?.length || obterInimigosCampanha(campanha).length}</span>
      </div>

      <div class="campaign-battle-list">
        ${
          batalhas.length
            ? batalhas.slice(0, 4).map((batalha) => `
              <div class="campaign-battle-item ${batalha.id === campanha.batalhaAtivaId ? "active" : ""}">
                <strong>${escapeHtml(batalha.nome || "Batalha")}</strong>
                <span>${escapeHtml(batalha.status || "preparando")} • ${escapeHtml(batalha.criadoEmTexto || "")}</span>
              </div>
            `).join("")
            : `<div class="campaign-empty-box">Nenhuma batalha criada ainda.</div>`
        }
      </div>
    </div>
  `;
}

function abrirModalCriarBatalhaCampanha(campanha) {
  fecharModalAcaoPersonagem();

  campanhaSelecionadaAcao = campanha;

  const personagens = obterPersonagensDaCampanha(campanha);
  const inimigos = obterEntidadesCombate(campanha).filter((entidade) => ["monstro", "boss"].includes(entidade.tipo));

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Nova batalha</h3>
          <p>Organize um encontro com personagens aprovados e inimigos atuais da campanha.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Nome da batalha
            <input type="text" id="batalhaNomeCampanha" placeholder="Ex: Emboscada na ponte" />
          </label>

          <label>
            Objetivo / contexto
            <textarea id="batalhaObjetivoCampanha" placeholder="Ex: Impedir a fuga do mensageiro, sobreviver 3 rodadas..."></textarea>
          </label>

          <div class="campaign-summary-box">
            <h4>Personagens participantes</h4>
            ${
              personagens.length
                ? personagens.map((personagem) => `
                  <label class="campaign-checkbox-line">
                    <input type="checkbox" name="batalhaPersonagens" value="${personagem.id}" checked />
                    ${escapeHtml(personagem.nome || "Personagem")}
                  </label>
                `).join("")
                : "<p>Nenhum personagem aprovado disponível.</p>"
            }
          </div>

          <label class="campaign-checkbox-line">
            <input type="checkbox" id="batalhaUsarInimigosAtuais" ${inimigos.length ? "checked" : ""} />
            Usar monstros e bosses atuais como inimigos (${inimigos.length})
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarCriarBatalhaCampanha">Criar batalha</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("confirmarCriarBatalhaCampanha")?.addEventListener("click", salvarBatalhaCampanha);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

async function salvarBatalhaCampanha() {
  if (!campanhaSelecionadaAcao) {
    await mostrarModal("Nenhuma campanha selecionada.", "Erro", "danger");
    return;
  }

  const nome = textoCampo("batalhaNomeCampanha") || `Batalha ${obterBatalhasCampanha(campanhaSelecionadaAcao).length + 1}`;
  const objetivo = textoCampo("batalhaObjetivoCampanha");
  const personagensIds = Array.from(document.querySelectorAll("input[name='batalhaPersonagens']:checked"))
    .map((input) => input.value)
    .filter(Boolean);
  const usarInimigos = document.getElementById("batalhaUsarInimigosAtuais")?.checked === true;
  const inimigosIds = usarInimigos
    ? obterEntidadesCombate(campanhaSelecionadaAcao)
        .filter((entidade) => ["monstro", "boss"].includes(entidade.tipo))
        .map((entidade) => entidade.entidadeId)
    : [];

  if (!personagensIds.length) {
    await mostrarModal("Selecione pelo menos um personagem aprovado para a batalha.", "Campo obrigatório", "danger");
    return;
  }

  const batalha = {
    id: `batalha-${Date.now()}`,
    nome,
    objetivo,
    status: "em andamento",
    personagensIds,
    inimigosIds,
    rodadaInicial: Number(campanhaSelecionadaAcao.rodadaAtual || 0),
    criadoEmTexto: new Date().toLocaleString("pt-BR")
  };
  const batalhasSessao = [batalha, ...obterBatalhasCampanha(campanhaSelecionadaAcao)];
  const texto = `Batalha criada: ${nome}.`;
  const campanhaAtualizada = {
    ...campanhaSelecionadaAcao,
    batalhasSessao,
    batalhaAtivaId: batalha.id,
    mensagemSessao: texto,
    historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, texto, "batalha")
  };

  try {
    await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
      batalhasSessao,
      batalhaAtivaId: batalha.id,
      mensagemSessao: texto,
      historicoSessao: campanhaAtualizada.historicoSessao,
      atualizadoEm: serverTimestamp()
    });

    atualizarCampanhaLocal(campanhaAtualizada);
    await mostrarModal("Batalha criada com sucesso.", "Batalha ativa", "success");
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao criar batalha:", erro);
    await mostrarModal("Erro ao criar batalha.", "Erro", "danger");
  }
}

async function encerrarBatalhaCampanha(campanha, batalhaId) {
  const batalha = obterBatalhasCampanha(campanha).find((item) => item.id === batalhaId);

  if (!batalha) {
    await mostrarModal("Batalha não encontrada.", "Erro", "danger");
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Encerrar batalha",
    mensagem: `Deseja encerrar “${batalha.nome || "Batalha"}”?`,
    confirmarTexto: "Encerrar",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  const batalhasSessao = obterBatalhasCampanha(campanha).map((item) => {
    if (item.id !== batalhaId) return item;

    return {
      ...item,
      status: "encerrada",
      encerradaEmTexto: new Date().toLocaleString("pt-BR")
    };
  });
  const texto = `Batalha encerrada: ${batalha.nome || "Batalha"}.`;
  const campanhaAtualizada = {
    ...campanha,
    batalhasSessao,
    batalhaAtivaId: campanha.batalhaAtivaId === batalhaId ? "" : campanha.batalhaAtivaId,
    mensagemSessao: texto,
    historicoSessao: adicionarEventoHistorico(campanha, texto, "batalha")
  };

  try {
    await updateDoc(doc(db, "campanhas", campanha.id), {
      batalhasSessao,
      batalhaAtivaId: campanhaAtualizada.batalhaAtivaId,
      mensagemSessao: texto,
      historicoSessao: campanhaAtualizada.historicoSessao,
      atualizadoEm: serverTimestamp()
    });

    atualizarCampanhaLocal(campanhaAtualizada);
    await mostrarModal("Batalha encerrada.", "Batalha atualizada", "success");
  } catch (erro) {
    console.error("Erro ao encerrar batalha:", erro);
    await mostrarModal("Erro ao encerrar batalha.", "Erro", "danger");
  }
}

async function atualizarStatusPersonagemCampanha(campanha, personagem, status) {
  if (!podeControlarCampanha(campanha)) {
    await mostrarModal("Apenas o Mestre pode alterar a aprovação de personagens.", "Permissão negada", "danger");
    return;
  }

  const statusNormalizado = STATUS_PERSONAGEM_CAMPANHA[status] ? status : "pendente";
  const aprovado = statusNormalizado === "aprovado";
  const personagensAprovados = new Set(Array.isArray(campanha.personagensAprovados) ? campanha.personagensAprovados : []);
  const personagensPendentes = new Set(Array.isArray(campanha.personagensPendentes) ? campanha.personagensPendentes : []);

  personagensAprovados.delete(personagem.id);
  personagensPendentes.delete(personagem.id);

  if (statusNormalizado === "aprovado") personagensAprovados.add(personagem.id);
  if (statusNormalizado === "pendente") personagensPendentes.add(personagem.id);

  const texto = `${personagem.nome || "Personagem"} foi marcado como ${rotuloStatusPersonagemCampanha(statusNormalizado).toLowerCase()} na campanha.`;
  const personagemAtualizado = {
    ...personagem,
    statusCampanha: statusNormalizado,
    aprovadoCampanha: aprovado,
    aprovadoCampanhaEmTexto: aprovado ? new Date().toLocaleString("pt-BR") : personagem.aprovadoCampanhaEmTexto || ""
  };
  const campanhaAtualizada = {
    ...campanha,
    personagensAprovados: Array.from(personagensAprovados),
    personagensPendentes: Array.from(personagensPendentes),
    mensagemSessao: texto,
    historicoSessao: adicionarEventoHistorico(campanha, texto, "personagem")
  };

  try {
    await updateDoc(doc(db, "personagens", personagem.id), {
      statusCampanha: personagemAtualizado.statusCampanha,
      aprovadoCampanha: personagemAtualizado.aprovadoCampanha,
      aprovadoCampanhaEmTexto: personagemAtualizado.aprovadoCampanhaEmTexto,
      atualizadoEm: serverTimestamp()
    });

    await updateDoc(doc(db, "campanhas", campanha.id), {
      personagensAprovados: campanhaAtualizada.personagensAprovados,
      personagensPendentes: campanhaAtualizada.personagensPendentes,
      mensagemSessao: texto,
      historicoSessao: campanhaAtualizada.historicoSessao,
      atualizadoEm: serverTimestamp()
    });

    atualizarPersonagensLocais([personagemAtualizado]);
    atualizarCampanhaLocal(campanhaAtualizada);
    await mostrarModal("Status do personagem atualizado.", "Campanha atualizada", "success");
  } catch (erro) {
    console.error("Erro ao atualizar personagem na campanha:", erro);
    await mostrarModal("Erro ao atualizar status do personagem.", "Erro", "danger");
  }
}

async function removerPersonagemDaCampanha(campanha, personagem) {
  if (!podeControlarCampanha(campanha)) {
    await mostrarModal("Apenas o Mestre pode remover personagens da campanha.", "Permissão negada", "danger");
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Remover personagem",
    mensagem: `Deseja remover “${personagem.nome || "Personagem"}” desta campanha?`,
    confirmarTexto: "Remover",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  const personagensAprovados = (Array.isArray(campanha.personagensAprovados) ? campanha.personagensAprovados : [])
    .filter((id) => id !== personagem.id);
  const personagensPendentes = (Array.isArray(campanha.personagensPendentes) ? campanha.personagensPendentes : [])
    .filter((id) => id !== personagem.id);
  const texto = `${personagem.nome || "Personagem"} foi removido da campanha.`;
  const personagemAtualizado = {
    ...personagem,
    campanhaId: "",
    campanhaNome: "Sem campanha",
    mestreId: "",
    statusCampanha: "",
    aprovadoCampanha: false,
    aprovadoCampanhaEmTexto: ""
  };
  const campanhaAtualizada = {
    ...campanha,
    personagensAprovados,
    personagensPendentes,
    mensagemSessao: texto,
    historicoSessao: adicionarEventoHistorico(campanha, texto, "personagem")
  };

  try {
    await updateDoc(doc(db, "personagens", personagem.id), {
      campanhaId: "",
      campanhaNome: "Sem campanha",
      mestreId: "",
      statusCampanha: "",
      aprovadoCampanha: false,
      aprovadoCampanhaEmTexto: "",
      atualizadoEm: serverTimestamp()
    });

    await updateDoc(doc(db, "campanhas", campanha.id), {
      personagensAprovados,
      personagensPendentes,
      mensagemSessao: texto,
      historicoSessao: campanhaAtualizada.historicoSessao,
      atualizadoEm: serverTimestamp()
    });

    atualizarPersonagensLocais([personagemAtualizado]);
    atualizarCampanhaLocal(campanhaAtualizada);
    await mostrarModal("Personagem removido da campanha.", "Campanha atualizada", "success");
  } catch (erro) {
    console.error("Erro ao remover personagem da campanha:", erro);
    await mostrarModal("Erro ao remover personagem da campanha.", "Erro", "danger");
  }
}

async function removerJogadorCampanha(campanha, jogadorId) {
  if (!podeControlarCampanha(campanha)) {
    await mostrarModal("Apenas o Mestre pode remover jogadores da campanha.", "Permissão negada", "danger");
    return;
  }

  const jogador = (Array.isArray(campanha.jogadores) ? campanha.jogadores : []).find((item) => item.id === jogadorId);

  if (!jogador) {
    await mostrarModal("Jogador não encontrado.", "Erro", "danger");
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Remover jogador",
    mensagem: `Deseja remover “${jogador.nome || jogador.email || "Jogador"}” e os personagens dele desta campanha?`,
    confirmarTexto: "Remover",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  const personagensDoJogador = obterTodosPersonagensDaCampanha(campanha).filter((personagem) => personagem.donoId === jogadorId);
  const jogadoresIds = (Array.isArray(campanha.jogadoresIds) ? campanha.jogadoresIds : []).filter((id) => id !== jogadorId);
  const jogadores = (Array.isArray(campanha.jogadores) ? campanha.jogadores : []).filter((item) => item.id !== jogadorId);
  const personagensAprovados = (Array.isArray(campanha.personagensAprovados) ? campanha.personagensAprovados : [])
    .filter((id) => !personagensDoJogador.some((personagem) => personagem.id === id));
  const personagensPendentes = (Array.isArray(campanha.personagensPendentes) ? campanha.personagensPendentes : [])
    .filter((id) => !personagensDoJogador.some((personagem) => personagem.id === id));
  const texto = `${jogador.nome || jogador.email || "Jogador"} foi removido da campanha.`;
  const personagensAtualizados = personagensDoJogador.map((personagem) => ({
    ...personagem,
    campanhaId: "",
    campanhaNome: "Sem campanha",
    mestreId: "",
    statusCampanha: "",
    aprovadoCampanha: false,
    aprovadoCampanhaEmTexto: ""
  }));
  const campanhaAtualizada = {
    ...campanha,
    jogadoresIds,
    jogadores,
    personagensAprovados,
    personagensPendentes,
    mensagemSessao: texto,
    historicoSessao: adicionarEventoHistorico(campanha, texto, "jogador")
  };

  try {
    for (const personagem of personagensDoJogador) {
      await updateDoc(doc(db, "personagens", personagem.id), {
        campanhaId: "",
        campanhaNome: "Sem campanha",
        mestreId: "",
        statusCampanha: "",
        aprovadoCampanha: false,
        aprovadoCampanhaEmTexto: "",
        atualizadoEm: serverTimestamp()
      });
    }

    await updateDoc(doc(db, "campanhas", campanha.id), {
      jogadoresIds,
      jogadores,
      personagensAprovados,
      personagensPendentes,
      mensagemSessao: texto,
      historicoSessao: campanhaAtualizada.historicoSessao,
      atualizadoEm: serverTimestamp()
    });

    atualizarPersonagensLocais(personagensAtualizados);
    atualizarCampanhaLocal(campanhaAtualizada);
    await mostrarModal("Jogador removido da campanha.", "Campanha atualizada", "success");
  } catch (erro) {
    console.error("Erro ao remover jogador da campanha:", erro);
    await mostrarModal("Erro ao remover jogador da campanha.", "Erro", "danger");
  }
}

function montarPersonagensCampanha(personagens, campanha) {
  if (!personagens.length) {
    return `
      <div class="campaign-empty-box">
        Nenhum personagem vinculado a esta campanha.
      </div>
    `;
  }

  const podeMestre = podeControlarCampanha(campanha);
  const sessaoAtiva = campanha.status === "ativa" || campanha.sessaoAtiva === true;
  const entidadeTurnoAtualId = obterEntidadeTurnoAtualId(campanha);

  return `
    <div class="campaign-character-grid">
      ${personagens
        .map((personagem) => {
          const statusCampanha = obterStatusPersonagemCampanha(personagem, campanha);
          const aprovadoCampanha = statusCampanha === "aprovado";
          const turnoAtual = entidadeTurnoAtualId === `personagem:${personagem.id}` ||
            entidadeTurnoAtualId.startsWith(`pet:${personagem.id}:`);
          const podeAgir = aprovadoCampanha && (
            podeMestre ||
            (
            sessaoAtiva &&
            turnoAtual &&
            personagem.donoId === state.usuarioAtual?.uid
            )
          );
          const condicoes = Array.isArray(personagem.condicoes) ? personagem.condicoes : [];
          const inventario = obterInventarioPersonagem(personagem);
          const habilidades = obterHabilidadesDoPersonagem(personagem);
          const xpAtual = Number(personagem.xpAtual ?? personagem.xp ?? 0);
          const xpProximoNivel = xpNecessarioParaNivel(personagem.nivel || 1);

          return `
            <div class="campaign-character-card ${turnoAtual ? "active-turn" : ""} status-${statusCampanha}">
              <div>
                <strong>${escapeHtml(personagem.nome || "Personagem sem nome")}</strong>
                <span>${escapeHtml(personagem.donoNome || "Jogador não informado")}</span>
                <small class="campaign-status-pill status-${statusCampanha}">${escapeHtml(rotuloStatusPersonagemCampanha(statusCampanha))}</small>
              </div>

              <div class="campaign-character-stats">
                <span>HP ${Number(personagem.hpAtual || 0)}/${Number(personagem.hpMax || 0)}</span>
                <span>Mana ${Number(personagem.manaAtual || 0)}/${Number(personagem.manaMax || 0)}</span>
                <span>Vel. ${Number(personagem.velocidade || 0)}</span>
                <span>Nível ${Number(personagem.nivel || 1)}</span>
                <span>XP ${xpAtual}/${xpProximoNivel}</span>
                <span>Habs. ${habilidades.length}</span>
                <span>Itens ${inventario.length}</span>
              </div>

              <div class="campaign-condition-list">
                ${
                  condicoes.length
                    ? condicoes.map((condicao) => `<span>${escapeHtml(rotuloCondicaoCampanha(condicao))}</span>`).join("")
                    : `<small>Sem condições</small>`
                }
              </div>

              ${
                montarCooldownsPersonagem(personagem)
              }

              ${
                montarPetsPersonagemCampanha(personagem, campanha, podeAgir)
              }

              <div class="campaign-character-actions">
                ${
                  podeAgir
                    ? `
                      <button class="secondary-btn usar-habilidade-campanha" data-personagem-id="${personagem.id}">Usar habilidade</button>
                      <button class="secondary-btn usar-item-campanha" data-personagem-id="${personagem.id}">Usar item</button>
                    `
                    : ""
                }
                ${
                  podeMestre
                    ? `
                      ${
                        !aprovadoCampanha
                          ? `<button class="secondary-btn aprovar-personagem-campanha" data-personagem-id="${personagem.id}">Aprovar</button>`
                          : ""
                      }
                      ${
                        statusCampanha !== "recusado"
                          ? `<button class="secondary-btn recusar-personagem-campanha" data-personagem-id="${personagem.id}">Recusar</button>`
                          : ""
                      }
                      ${
                        aprovadoCampanha
                          ? `
                            <button class="secondary-btn aplicar-condicao-campanha" data-personagem-id="${personagem.id}">Aplicar status</button>
                            <button class="small-btn danger remover-condicao-campanha" data-personagem-id="${personagem.id}">Remover status</button>
                          `
                          : ""
                      }
                      <button class="small-btn danger remover-personagem-campanha" data-personagem-id="${personagem.id}">Remover da campanha</button>
                    `
                    : ""
                }
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function montarCooldownsPersonagem(personagem) {
  const cooldowns = personagem.cooldownsHabilidades || {};
  const ativos = Object.entries(cooldowns).filter(([, valor]) => Number(valor) > 0);

  if (!ativos.length) {
    return `<div class="campaign-cooldown-list"><small>Sem cooldown ativo</small></div>`;
  }

  return `
    <div class="campaign-cooldown-list">
      ${ativos.map(([id, valor]) => {
        const habilidade = encontrarHabilidadePorId(id);
        return `<span>${escapeHtml(habilidade?.nome || "Habilidade")} CD ${Number(valor)}</span>`;
      }).join("")}
    </div>
  `;
}

function montarOrdemTurnos(campanha) {
  const ordem = Array.isArray(campanha.ordemTurnos) ? campanha.ordemTurnos : [];

  if (!ordem.length) {
    return `
      <div class="campaign-empty-box">
        A ordem de turno será criada quando o Mestre iniciar a sessão.
      </div>
    `;
  }

  return `
    <div class="turn-order-list">
      ${ordem
        .map((turno, index) => {
          const ativo = index === Number(campanha.turnoIndice ?? -1);

          return `
            <div class="turn-order-item ${ativo ? "active" : ""}">
              <span>${index + 1}</span>
              <strong>${escapeHtml(turno.nome || "Personagem")}</strong>
              <small>Vel. ${Number(turno.velocidade || 0)}</small>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function montarHistoricoSessao(campanha) {
  const historico = Array.isArray(campanha.historicoSessao)
    ? campanha.historicoSessao
    : [];

  if (!historico.length) {
    return `
      <div class="campaign-empty-box">
        Nenhum acontecimento registrado ainda.
      </div>
    `;
  }

  const tiposPresentes = Array.from(new Set(historico.map((evento) => evento.tipo || "sistema")));

  return `
    <div class="history-filter-row">
      <button class="history-filter-btn active" type="button" data-history-filter="todos">Todos</button>
      ${tiposPresentes
        .filter((tipo) => TIPOS_HISTORICO_CAMPANHA.includes(tipo))
        .slice(0, 8)
        .map((tipo) => `<button class="history-filter-btn" type="button" data-history-filter="${escapeHtml(tipo)}">${escapeHtml(rotuloTipoHistorico(tipo))}</button>`)
        .join("")}
    </div>

    <div class="session-history-list">
      ${historico
        .slice(0, 12)
        .map((evento) => {
          return `
            <div class="session-history-item" data-history-type="${escapeHtml(evento.tipo || "sistema")}">
              <p>${escapeHtml(evento.texto || "Evento sem descrição.")}</p>
              <span>${escapeHtml(rotuloTipoHistorico(evento.tipo || "sistema"))} • ${escapeHtml(evento.criadoEmTexto || "")}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function rotuloTipoHistorico(tipo) {
  const mapa = {
    sistema: "Sistema",
    jogador: "Jogador",
    personagem: "Personagem",
    batalha: "Batalha",
    turno: "Turno",
    dado: "Dado",
    dano: "Dano",
    cura: "Cura",
    ataque: "Ataque",
    habilidade: "Habilidade",
    item: "Item",
    pet: "Pet",
    condicao: "Condição",
    recompensa: "Recompensa",
    resumo: "Resumo",
    boss: "Boss"
  };

  return mapa[tipo] || "Evento";
}

function filtrarHistoricoCardCampanha(card, filtro) {
  card.querySelectorAll(".history-filter-btn").forEach((botao) => {
    botao.classList.toggle("active", (botao.dataset.historyFilter || "todos") === filtro);
  });

  card.querySelectorAll(".session-history-item").forEach((item) => {
    const tipo = item.dataset.historyType || "sistema";
    item.style.display = filtro === "todos" || tipo === filtro ? "" : "none";
  });
}

function montarBotoesControleSessao(campanha, sessaoAtiva) {
  if (sessaoAtiva) {
    return `
      <button class="secondary-btn rolar-d20-sessao">Rolar D20</button>
      <button class="secondary-btn ataque-alvo-campanha">Aplicar dano</button>
      <button class="secondary-btn cura-alvo-campanha">Aplicar cura</button>
      <button class="secondary-btn adicionar-monstro-campanha">Adicionar monstro</button>
      <button class="secondary-btn adicionar-boss-campanha">Adicionar boss</button>
      <button class="secondary-btn criar-boss-campanha">Criar boss</button>
      <button class="secondary-btn criar-batalha-campanha">Nova batalha</button>
      <button class="secondary-btn vincular-jogador-campanha">Vincular jogador</button>
      <button class="secondary-btn copiar-codigo-campanha">Copiar convite</button>
      <button class="secondary-btn aplicar-recompensas-campanha">Aplicar recompensas</button>
      <button class="secondary-btn resumo-sessao-campanha">Resumo da sessão</button>
      <button class="secondary-btn exportar-historico-campanha">Exportar histórico</button>
      <button class="secondary-btn avancar-turno-campanha">Avançar turno</button>
      <button class="secondary-btn avancar-rodada-campanha">Avançar rodada</button>
      <button class="secondary-btn pausar-sessao-campanha">Pausar sessão</button>
      <button class="small-btn danger encerrar-sessao-campanha">Encerrar sessão</button>
      <button class="secondary-btn editar-campanha">Editar</button>
      <button class="small-btn danger excluir-campanha">Excluir</button>
    `;
  }

  return `
    <button class="primary-btn iniciar-sessao-campanha">Iniciar sessão</button>
    <button class="secondary-btn criar-batalha-campanha">Preparar batalha</button>
    <button class="secondary-btn vincular-jogador-campanha">Vincular jogador</button>
    <button class="secondary-btn copiar-codigo-campanha">Copiar convite</button>
    <button class="secondary-btn editar-campanha">Editar</button>
    <button class="small-btn danger excluir-campanha">Excluir</button>
  `;
}

function montarBotoesJogadorSessao(campanha, sessaoAtiva, personagens) {
  if (sessaoAtiva && personagens.some((personagem) => personagem.donoId === state.usuarioAtual.uid)) {
    return `
      <button class="primary-btn rolar-d20-sessao">Rolar D20</button>
      <span class="campaign-player-message active">
        Sessão ativa. Acompanhe as orientações do Mestre.
      </span>
    `;
  }

  if (sessaoAtiva) {
    return `
      <span class="campaign-player-message active">
        Sessão ativa. Você ainda não possui personagem vinculado a esta campanha.
      </span>
    `;
  }

  return `
    <span class="campaign-player-message">
      Aguardando o Mestre iniciar a sessão.
    </span>
  `;
}

async function copiarCodigoCampanha(campanha) {
  const codigo = campanha.codigo || "";

  if (!codigo) {
    await mostrarModal("Esta campanha não possui código de convite.", "Sem código", "danger");
    return;
  }

  const texto = `Entre na campanha "${campanha.nome || "Campanha"}" usando o código ${codigo}.`;

  try {
    await navigator.clipboard.writeText(texto);
    await mostrarModal("Convite copiado para a área de transferência.", "Convite copiado", "success");
  } catch (erro) {
    console.error("Erro ao copiar convite:", erro);
    await mostrarModal(`Código da campanha: ${codigo}`, "Copie o código manualmente", "success");
  }
}


function obterPetsPersonagemCampanha(personagem) {
  if (Array.isArray(personagem?.pets)) return personagem.pets.filter(Boolean);
  if (personagem?.pet) return [personagem.pet].filter(Boolean);
  return [];
}

function obterInimigosCampanha(campanha) {
  return [
    ...obterMonstrosSessaoCampanha(campanha),
    ...obterBossesSessaoCampanha(campanha)
  ];
}

function obterMonstrosSessaoCampanha(campanha) {
  return Array.isArray(campanha?.monstrosSessao) ? campanha.monstrosSessao : [];
}

function obterBossesSessaoCampanha(campanha) {
  return Array.isArray(campanha?.bossesSessao) ? campanha.bossesSessao : [];
}

function obterEntidadesCombate(campanha, personagensBase = null) {
  const personagens = personagensBase || obterPersonagensDaCampanha(campanha);

  const entidades = [];

  personagens.forEach((personagem) => {
    entidades.push({
      ...personagem,
      tipo: "personagem",
      entidadeId: `personagem:${personagem.id}`,
      hpAtual: Number(personagem.hpAtual || 0),
      hpMax: Number(personagem.hpMax || 0),
      manaAtual: Number(personagem.manaAtual || 0),
      manaMax: Number(personagem.manaMax || 0)
    });

    obterPetsPersonagemCampanha(personagem).forEach((pet) => {
      entidades.push({
        ...pet,
        tipo: "pet",
        entidadeId: `pet:${personagem.id}:${pet.id}`,
        personagemId: personagem.id,
        donoId: personagem.donoId || "",
        donoNome: personagem.donoNome || "",
        donoPersonagemNome: personagem.nome || "",
        hpAtual: Number(pet.hpAtual ?? pet.hp ?? 0),
        hpMax: Number(pet.hpMax ?? pet.hp ?? 0),
        manaAtual: Number(pet.manaAtual ?? pet.mana ?? 0),
        manaMax: Number(pet.manaMax ?? pet.mana ?? 0)
      });
    });
  });

  obterMonstrosSessaoCampanha(campanha).forEach((monstro) => {
    entidades.push({
      ...monstro,
      tipo: "monstro",
      entidadeId: `monstro:${monstro.instanciaId}`,
      hpAtual: Number(monstro.hpAtual ?? monstro.hp ?? 0),
      hpMax: Number(monstro.hpMax ?? monstro.hp ?? 0),
      manaAtual: Number(monstro.manaAtual ?? monstro.mana ?? 0),
      manaMax: Number(monstro.manaMax ?? monstro.mana ?? 0)
    });
  });

  obterBossesSessaoCampanha(campanha).forEach((boss) => {
    entidades.push({
      ...boss,
      tipo: "boss",
      entidadeId: `boss:${boss.instanciaId}`,
      hpAtual: Number(boss.hpAtual ?? boss.hp ?? 0),
      hpMax: Number(boss.hpMax ?? boss.hp ?? 0),
      manaAtual: Number(boss.manaAtual ?? boss.mana ?? 0),
      manaMax: Number(boss.manaMax ?? boss.mana ?? 0)
    });
  });

  return entidades;
}

function montarPetsPersonagemCampanha(personagem, campanha, podeAgir) {
  const pets = obterPetsPersonagemCampanha(personagem);

  if (!pets.length) {
    return `<div class="campaign-pet-list"><small>Sem pets vinculados</small></div>`;
  }

  return `
    <div class="campaign-pet-list">
      ${pets.map((pet) => {
        const hpAtual = Number(pet.hpAtual ?? pet.hp ?? 0);
        const hpMax = Number(pet.hpMax ?? pet.hp ?? 0);
        const manaAtual = Number(pet.manaAtual ?? pet.mana ?? 0);
        const manaMax = Number(pet.manaMax ?? pet.mana ?? 0);

        return `
          <div class="campaign-pet-card">
            <strong>Pet: ${escapeHtml(pet.nome || "Pet sem nome")}</strong>
            <span>HP ${hpAtual}/${hpMax}</span>
            <span>Mana ${manaAtual}/${manaMax}</span>
            ${podeAgir ? `<button class="secondary-btn usar-habilidade-pet-campanha" data-personagem-id="${personagem.id}" data-pet-id="${pet.id}">Ação do pet</button>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function montarInimigosCampanha(campanha) {
  const inimigos = obterInimigosCampanha(campanha);
  const entidadeTurnoAtualId = obterEntidadeTurnoAtualId(campanha);

  if (!inimigos.length) {
    return `
      <div class="campaign-empty-box">
        Nenhum monstro ou boss foi adicionado à campanha ativa.
      </div>
    `;
  }

  return `
    <div class="campaign-character-grid">
      ${inimigos.map((entidade) => {
        const hpAtual = Number(entidade.hpAtual ?? entidade.hp ?? 0);
        const hpMax = Number(entidade.hpMax ?? entidade.hp ?? 0);
        const manaAtual = Number(entidade.manaAtual ?? entidade.mana ?? 0);
        const manaMax = Number(entidade.manaMax ?? entidade.mana ?? 0);
        const tipo = entidade.tipoEntidade || (entidade.categoriaBoss ? "boss" : "monstro");
        const entidadeId = `${tipo}:${entidade.instanciaId || entidade.id || entidade.nome || ""}`;
        const turnoAtual = entidadeTurnoAtualId === entidadeId;
        const categoriaBoss = tipo === "boss" ? normalizarCategoriaBoss(entidade.categoriaBoss) : "";
        const subtituloBoss = tipo === "boss"
          ? `${categoriaBoss === "farm" ? "Boss de Farm" : "Boss de História"} • ${escapeHtml(entidade.rankNivelAmeaca || "Sem rank")}`
          : `Monstro • ${escapeHtml(entidade.rankNivelAmeaca || "Sem rank")}`;

        return `
          <div class="campaign-character-card enemy-card ${turnoAtual ? "active-turn" : ""}">
            <div>
              <strong>${escapeHtml(entidade.nome || "Criatura sem nome")}</strong>
              <span>${subtituloBoss}</span>
            </div>

            <div class="campaign-character-stats">
              <span>HP ${hpAtual}/${hpMax}</span>
              <span>Mana ${manaAtual}/${manaMax}</span>
              <span>Vel. ${Number(entidade.velocidade || 0)}</span>
            </div>

            <div class="campaign-character-actions">
              <button class="secondary-btn ataque-inimigo-campanha" data-entidade-id="${escapeHtml(entidadeId)}">Atacar alvo</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function montarOptionsEntidadesAlvo(campanha) {
  const entidades = obterEntidadesCombate(campanha);

  if (!entidades.length) {
    return `<option value="">Nenhum alvo disponível</option>`;
  }

  return entidades
    .map((entidade) => {
      const tipo = formatarTipoEntidade(entidade.tipo);
      return `<option value="${entidade.entidadeId}">${escapeHtml(tipo)} — ${escapeHtml(entidade.nome || "Sem nome")}</option>`;
    })
    .join("");
}

function formatarTipoEntidade(tipo) {
  const mapa = {
    personagem: "Personagem",
    pet: "Pet",
    monstro: "Monstro",
    boss: "Boss"
  };

  return mapa[tipo] || "Alvo";
}

function rotuloTipoEntidade(tipo) {
  return formatarTipoEntidade(tipo);
}

function abrirModalAcaoAlvo(campanha, modo) {
  fecharModalAcaoPersonagem();

  campanhaSelecionadaAcao = campanha;

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>${modo === "cura" ? "Aplicar cura" : "Aplicar dano"}</h3>
          <p>Selecione um alvo da campanha ativa.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Alvo
            <select id="acaoAlvoEntidade">
              ${montarOptionsEntidadesAlvo(campanha)}
            </select>
          </label>

          <label>
            Valor
            <input type="number" id="acaoAlvoValor" value="0" min="0" />
          </label>

          <label>
            Descrição da ação
            <input type="text" id="acaoAlvoDescricao" placeholder="Ex: Ataque com espada, magia de cura..." />
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarAcaoAlvo">${modo === "cura" ? "Aplicar cura" : "Aplicar dano"}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("confirmarAcaoAlvo")?.addEventListener("click", () => aplicarAcaoEmAlvo(modo));

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

async function aplicarAcaoEmAlvo(modo) {
  if (!campanhaSelecionadaAcao) {
    await mostrarModal("Nenhuma campanha selecionada.", "Erro", "danger");
    return;
  }

  const alvoId = valorCampo("acaoAlvoEntidade");
  const valor = Math.max(0, numeroCampo("acaoAlvoValor"));
  const descricao = textoCampo("acaoAlvoDescricao") || (modo === "cura" ? "cura" : "dano");

  if (!alvoId || valor <= 0) {
    await mostrarModal("Selecione um alvo e informe um valor maior que zero.", "Campo obrigatório", "danger");
    return;
  }

  const alvo = obterEntidadesCombate(campanhaSelecionadaAcao).find((entidade) => entidade.entidadeId === alvoId);

  if (!alvo) {
    await mostrarModal("Alvo não encontrado.", "Erro", "danger");
    return;
  }

  try {
    const resultado = await aplicarAtualizacaoHpAlvo(campanhaSelecionadaAcao, alvo, modo, valor);

    const texto = `${modo === "cura" ? "Cura" : "Dano"} aplicado em ${alvo.nome || "alvo"}: ${valor} ponto(s). Motivo: ${descricao}.${montarTextoResultadoHp(resultado)}`;

    await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
      mensagemSessao: texto,
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, texto, modo === "cura" ? "cura" : "dano"),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal(`${modo === "cura" ? "Cura" : "Dano"} aplicado com sucesso.`, "Ação registrada", "success");
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao aplicar ação no alvo:", erro);
    await mostrarModal("Erro ao aplicar ação no alvo.", "Erro", "danger");
  }
}

async function aplicarAtualizacaoHpAlvo(campanha, alvo, modo, valor) {
  const hpAtual = Number(alvo.hpAtual || 0);
  const hpMax = Number(alvo.hpMax || alvo.hp || 0);
  const novoHp = modo === "cura"
    ? Math.min(hpMax, hpAtual + valor)
    : Math.max(0, hpAtual - valor);
  const resultado = montarResultadoHp(alvo, modo, hpAtual, novoHp, hpMax);

  if (alvo.tipo === "personagem") {
    await updateDoc(doc(db, "personagens", alvo.id), {
      hpAtual: novoHp,
      atualizadoEm: serverTimestamp()
    });

    const personagensAtualizados = obterPersonagensDaCampanha(campanha).map((personagem) => {
      if (personagem.id !== alvo.id) return personagem;
      return { ...personagem, hpAtual: novoHp, hpMax };
    });

    await updateDoc(doc(db, "campanhas", campanha.id), {
      ...montarAtualizacaoOrdemTurnos(campanha, personagensAtualizados),
      atualizadaEm: serverTimestamp()
    });

    return resultado;
  }

  if (alvo.tipo === "pet") {
    const personagem = state.personagens.find((item) => item.id === alvo.personagemId);
    const pets = obterPetsPersonagemCampanha(personagem);
    const novosPets = pets.map((pet) => pet.id === alvo.id ? { ...pet, hpAtual: novoHp, hpMax } : pet);
    const personagensAtualizados = obterPersonagensDaCampanha(campanha).map((personagemCampanha) => {
      if (personagemCampanha.id !== alvo.personagemId) return personagemCampanha;
      return {
        ...personagemCampanha,
        pets: novosPets,
        pet: personagemCampanha.pet?.id === alvo.id ? novosPets.find((pet) => pet.id === alvo.id) || null : personagemCampanha.pet
      };
    });

    await updateDoc(doc(db, "personagens", alvo.personagemId), {
      pets: novosPets,
      pet: novosPets[0] || null,
      atualizadoEm: serverTimestamp()
    });

    await updateDoc(doc(db, "campanhas", campanha.id), {
      ...montarAtualizacaoOrdemTurnos(campanha, personagensAtualizados),
      atualizadaEm: serverTimestamp()
    });

    return resultado;
  }

  if (alvo.tipo === "monstro") {
    const monstrosSessao = obterMonstrosSessaoCampanha(campanha).map((monstro) => {
      if (monstro.instanciaId !== alvo.instanciaId) return monstro;
      return { ...monstro, hpAtual: novoHp, hpMax };
    });
    const campanhaAtualizada = {
      ...campanha,
      monstrosSessao
    };

    await updateDoc(doc(db, "campanhas", campanha.id), {
      monstrosSessao,
      ...montarAtualizacaoOrdemTurnos(campanhaAtualizada),
      atualizadaEm: serverTimestamp()
    });

    return resultado;
  }

  if (alvo.tipo === "boss") {
    const bossesSessao = obterBossesSessaoCampanha(campanha).map((boss) => {
      if (boss.instanciaId !== alvo.instanciaId) return boss;
      return { ...boss, hpAtual: novoHp, hpMax };
    });
    const campanhaAtualizada = {
      ...campanha,
      bossesSessao
    };

    const atualizacoesBoss = montarAtualizacoesBossDerrotado(campanhaAtualizada, alvo, novoHp, bossesSessao);

    await updateDoc(doc(db, "campanhas", campanha.id), {
      bossesSessao,
      ...montarAtualizacaoOrdemTurnos(campanhaAtualizada),
      ...atualizacoesBoss,
      atualizadaEm: serverTimestamp()
    });

    return resultado;
  }

  return resultado;
}

function montarResultadoHp(alvo, modo, hpAnterior, hpAtualizado, hpMax) {
  return {
    alvoNome: alvo?.nome || "alvo",
    modo,
    hpAnterior,
    hpAtual: hpAtualizado,
    hpMax,
    derrotado: modo !== "cura" && hpAnterior > 0 && hpAtualizado <= 0,
    reerguido: modo === "cura" && hpAnterior <= 0 && hpAtualizado > 0
  };
}

function montarTextoResultadoHp(resultado) {
  if (!resultado) return "";

  const partes = [` HP atual de ${resultado.alvoNome}: ${resultado.hpAtual}/${resultado.hpMax}.`];

  if (resultado.derrotado) {
    partes.push(` ${resultado.alvoNome} foi derrotado(a).`);
  }

  if (resultado.reerguido) {
    partes.push(` ${resultado.alvoNome} voltou ao combate.`);
  }

  return partes.join("");
}

function abrirModalAdicionarCriaturaCampanha(campanha, tipo) {
  fecharModalAcaoPersonagem();

  campanhaSelecionadaAcao = campanha;

  const catalogo = tipo === "boss" ? bossesCatalogo : monstrosCatalogo;

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>${tipo === "boss" ? "Adicionar boss" : "Adicionar monstro"}</h3>
          <p>Adicione uma criatura à campanha ativa.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          ${tipo === "boss" ? montarAvisoRegrasBossCampanha(campanha) : ""}

          <label>
            ${tipo === "boss" ? "Boss" : "Monstro"}
            <select id="criaturaCatalogoSessao">
              ${
                catalogo.length
                  ? catalogo.map((item) => `<option value="${item.id}">${escapeHtml(item.nome || "Criatura sem nome")}</option>`).join("")
                  : `<option value="">Nenhum cadastro disponível</option>`
              }
            </select>
          </label>

          <label>
            Quantidade
            <input type="number" id="criaturaQuantidadeSessao" value="1" min="1" />
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarAdicionarCriatura">Adicionar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("confirmarAdicionarCriatura")?.addEventListener("click", () => adicionarCriaturaCampanha(tipo));

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

async function adicionarCriaturaCampanha(tipo) {
  if (!campanhaSelecionadaAcao) {
    await mostrarModal("Nenhuma campanha selecionada.", "Erro", "danger");
    return;
  }

  const catalogo = tipo === "boss" ? bossesCatalogo : monstrosCatalogo;
  const id = valorCampo("criaturaCatalogoSessao");
  const quantidade = Math.max(1, numeroCampo("criaturaQuantidadeSessao"));
  const base = catalogo.find((item) => item.id === id);

  if (!base) {
    await mostrarModal("Selecione uma criatura válida.", "Campo obrigatório", "danger");
    return;
  }

  if (tipo === "boss") {
    const validacaoBoss = validarAdicaoBossNaCampanha(campanhaSelecionadaAcao, base);

    if (!validacaoBoss.ok) {
      await mostrarModal(validacaoBoss.mensagem, validacaoBoss.titulo || "Boss indisponível", "danger");
      return;
    }
  }

  const novos = [];

  for (let i = 0; i < quantidade; i++) {
    const hpMax = Number(base.hpMax || base.hp || 0);
    const manaMax = Number(base.manaMax || base.mana || 0);

    novos.push({
      ...base,
      instanciaId: `${tipo}-${base.id}-${Date.now()}-${i}`,
      catalogoId: base.id,
      tipoEntidade: tipo,
      hpMax,
      hpAtual: hpMax,
      manaMax,
      manaAtual: manaMax,
      categoriaBoss: base.categoriaBoss || (tipo === "boss" ? "historia" : ""),
      turnosReaparecimentoFarm: Number(base.turnosReaparecimentoFarm || 0),
      condicoes: [],
      criadoEmTexto: new Date().toLocaleString("pt-BR")
    });
  }

  const campo = tipo === "boss" ? "bossesSessao" : "monstrosSessao";
  const listaAtual = tipo === "boss" ? obterBossesSessaoCampanha(campanhaSelecionadaAcao) : obterMonstrosSessaoCampanha(campanhaSelecionadaAcao);
  const listaNova = [...listaAtual, ...novos];
  const campanhaAtualizada = {
    ...campanhaSelecionadaAcao,
    [campo]: listaNova
  };

  const texto = `${quantidade} ${tipo === "boss" ? "boss(es)" : "monstro(s)"} adicionado(s) à campanha.`;

  try {
    await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
      [campo]: listaNova,
      ...montarAtualizacaoOrdemTurnos(campanhaAtualizada),
      mensagemSessao: texto,
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, texto, tipo),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Criatura adicionada com sucesso.", "Campanha atualizada", "success");
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao adicionar criatura:", erro);
    await mostrarModal("Erro ao adicionar criatura.", "Erro", "danger");
  }
}

function abrirModalUsarHabilidadePetCampanha(campanha, personagem, petId) {
  fecharModalAcaoPersonagem();

  campanhaSelecionadaAcao = campanha;
  personagemSelecionadoAcao = personagem;

  const pet = obterPetsPersonagemCampanha(personagem).find((item) => item.id === petId);
  const habilidades = obterHabilidadesPetCampanha(pet);
  const primeiraHabilidade = habilidades[0] || null;
  const modoSugerido = obterModoEfeitoHabilidade(primeiraHabilidade);
  const valorSugerido = obterValorEfeitoHabilidade(primeiraHabilidade);

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Ação do pet</h3>
          <p>${escapeHtml(pet?.nome || "Pet")}</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Habilidade do pet
            <select id="habilidadePetSessao">
              ${
                habilidades.length
                  ? habilidades.map((habilidade) => {
                      const custo = obterCustoManaHabilidade(habilidade);
                      const cooldown = obterCooldownHabilidade(habilidade);
                      const restante = obterCooldownRestante(pet || {}, habilidade.id);
                      const extra = restante > 0 ? ` — em cooldown: ${restante}` : ` — Mana: ${custo} — CD: ${cooldown}`;
                      return `<option value="${habilidade.id}">${escapeHtml(habilidade.nome || "Habilidade")}${extra}</option>`;
                    }).join("")
                  : `<option value="">Nenhuma habilidade disponível</option>`
              }
            </select>
          </label>

          <label>
            Alvo opcional
            <select id="alvoPetSessao">
              <option value="">Nenhum alvo direto</option>
              ${montarOptionsEntidadesAlvo(campanha)}
            </select>
          </label>

          <div class="form-grid">
            <label>
              Efeito automático
              <select id="habilidadePetModoSessao">
                <option value="" ${!modoSugerido ? "selected" : ""}>Apenas registrar</option>
                <option value="dano" ${modoSugerido === "dano" ? "selected" : ""}>Aplicar dano</option>
                <option value="cura" ${modoSugerido === "cura" ? "selected" : ""}>Aplicar cura</option>
              </select>
            </label>

            <label>
              Valor
              <input type="number" id="habilidadePetValorSessao" value="${valorSugerido}" min="0" />
            </label>
          </div>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarAcaoPet">Registrar ação</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("confirmarAcaoPet")?.addEventListener("click", () => registrarAcaoPetCampanha(petId));
  document.getElementById("habilidadePetSessao")?.addEventListener("change", () => atualizarCamposHabilidadePetSelecionada(pet));

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

function atualizarCamposHabilidadePetSelecionada(pet) {
  const habilidadeId = valorCampo("habilidadePetSessao");
  const habilidade = obterHabilidadesPetCampanha(pet).find((item) => item.id === habilidadeId);
  const modo = obterModoEfeitoHabilidade(habilidade);
  const valor = obterValorEfeitoHabilidade(habilidade);
  const campoModo = document.getElementById("habilidadePetModoSessao");
  const campoValor = document.getElementById("habilidadePetValorSessao");

  if (campoModo) campoModo.value = modo;
  if (campoValor) campoValor.value = valor;
}

function obterHabilidadesPetCampanha(pet) {
  if (!pet) return [];

  const habilidades = [];

  if (Array.isArray(pet.habilidades)) {
    pet.habilidades.forEach((habilidade) => habilidades.push(habilidade));
  }

  const mapa = new Map();

  habilidades.forEach((habilidade) => {
    const completa = completarHabilidade(habilidade);
    if (completa?.id) mapa.set(completa.id, completa);
  });

  return Array.from(mapa.values());
}

async function registrarAcaoPetCampanha(petId) {
  if (!campanhaSelecionadaAcao || !personagemSelecionadoAcao) {
    await mostrarModal("Nenhuma ação selecionada.", "Erro", "danger");
    return;
  }

  const pet = obterPetsPersonagemCampanha(personagemSelecionadoAcao).find((item) => item.id === petId);
  const habilidade = obterHabilidadesPetCampanha(pet).find((item) => item.id === valorCampo("habilidadePetSessao"));

  if (!pet || !habilidade) {
    await mostrarModal("Selecione uma habilidade válida para o pet.", "Campo obrigatório", "danger");
    return;
  }

  const custoMana = obterCustoManaHabilidade(habilidade);
  const cooldown = obterCooldownHabilidade(habilidade);
  const cooldownRestante = obterCooldownRestante(pet, habilidade.id);
  const manaAtual = Number(pet.manaAtual ?? pet.mana ?? 0);
  const alvoId = valorCampo("alvoPetSessao");
  const modoEfeito = valorCampo("habilidadePetModoSessao");
  const valorEfeito = Math.max(0, numeroCampo("habilidadePetValorSessao"));

  if (cooldownRestante > 0) {
    await mostrarModal(`Essa habilidade do pet ainda está em cooldown por ${cooldownRestante} turno(s).`, "Cooldown ativo", "danger");
    return;
  }

  if (manaAtual < custoMana) {
    await mostrarModal(
      `Mana insuficiente. Necessário: ${custoMana}. Mana atual: ${manaAtual}.`,
      "Mana insuficiente",
      "danger"
    );
    return;
  }

  const cooldowns = {
    ...(pet.cooldownsHabilidades || {})
  };

  if (cooldown > 0) {
    cooldowns[habilidade.id] = cooldown;
  }

  let resultadoAlvo = null;
  const alvo = alvoId
    ? obterEntidadesCombate(campanhaSelecionadaAcao).find((entidade) => entidade.entidadeId === alvoId)
    : null;

  if (alvoId && !alvo) {
    await mostrarModal("Alvo do pet não encontrado.", "Erro", "danger");
    return;
  }

  const petsAtuais = obterPetsPersonagemCampanha(personagemSelecionadoAcao);
  let novosPets = petsAtuais.map((item) => {
    if (item.id !== pet.id) return item;

    return {
      ...item,
      manaAtual: manaAtual - custoMana,
      manaMax: Number(item.manaMax ?? item.mana ?? 0),
      cooldownsHabilidades: cooldowns
    };
  });

  if (alvo && alvo.tipo === "pet" && alvo.personagemId === personagemSelecionadoAcao.id && modoEfeito && valorEfeito > 0) {
    const hpAtual = Number(alvo.hpAtual || 0);
    const hpMax = Number(alvo.hpMax || alvo.hp || 0);
    const novoHp = modoEfeito === "cura"
      ? Math.min(hpMax, hpAtual + valorEfeito)
      : Math.max(0, hpAtual - valorEfeito);

    resultadoAlvo = montarResultadoHp(alvo, modoEfeito, hpAtual, novoHp, hpMax);
    novosPets = novosPets.map((item) => item.id === alvo.id ? { ...item, hpAtual: novoHp, hpMax } : item);
  }

  const petPrincipalAtualizado = personagemSelecionadoAcao.pet?.id
    ? novosPets.find((item) => item.id === personagemSelecionadoAcao.pet.id) || personagemSelecionadoAcao.pet
    : novosPets[0] || null;

  const texto = `${pet.nome || "Pet"} de ${personagemSelecionadoAcao.nome || "Personagem"} usou ${habilidade.nome || "uma habilidade"} e gastou ${custoMana} de Mana.`;

  try {
    await updateDoc(doc(db, "personagens", personagemSelecionadoAcao.id), {
      pets: novosPets,
      pet: petPrincipalAtualizado,
      atualizadoEm: serverTimestamp()
    });

    if (alvo && !(alvo.tipo === "pet" && alvo.personagemId === personagemSelecionadoAcao.id) && modoEfeito && valorEfeito > 0) {
      resultadoAlvo = await aplicarAtualizacaoHpAlvo(campanhaSelecionadaAcao, alvo, modoEfeito, valorEfeito);
    } else if (resultadoAlvo) {
      const personagensAtualizados = obterPersonagensDaCampanha(campanhaSelecionadaAcao).map((personagem) => {
        if (personagem.id !== personagemSelecionadoAcao.id) return personagem;
        return {
          ...personagem,
          pets: novosPets,
          pet: petPrincipalAtualizado
        };
      });

      await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
        ...montarAtualizacaoOrdemTurnos(campanhaSelecionadaAcao, personagensAtualizados),
        atualizadaEm: serverTimestamp()
      });
    }

    const textoFinal = `${texto}${montarTextoResultadoHp(resultadoAlvo)}`;

    await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
      mensagemSessao: textoFinal,
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, textoFinal, "pet"),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Ação do pet registrada.", "Ação registrada", "success");
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao registrar ação do pet:", erro);
    await mostrarModal("Erro ao registrar ação do pet.", "Erro", "danger");
  }
}

function obterTextoStatusCampanha(campanha) {
  if (campanha.status === "ativa" || campanha.sessaoAtiva === true) return "Sessão ativa";
  if (campanha.status === "pausada") return "Sessão pausada";
  if (campanha.status === "encerrada") return "Sessão encerrada";

  return "Aguardando início";
}

function obterClasseStatusCampanha(campanha) {
  if (campanha.status === "ativa" || campanha.sessaoAtiva === true) return "session-active";
  if (campanha.status === "pausada") return "session-paused";
  if (campanha.status === "encerrada") return "session-ended";

  return "session-waiting";
}

function atualizarContadorCampanhas() {
  const contador = document.getElementById("contadorCampanhas");

  if (contador) contador.textContent = state.minhasCampanhas.length;

  atualizarDashboard();
}

function obterHabilidadesDoPersonagem(personagem) {
  const habilidades = [];

  if (personagem.habilidadeExclusivaRaca) habilidades.push(personagem.habilidadeExclusivaRaca);
  if (personagem.habilidadeExclusivaClasse) habilidades.push(personagem.habilidadeExclusivaClasse);

  if (Array.isArray(personagem.habilidadesIniciais)) {
    personagem.habilidadesIniciais.forEach((habilidade) => habilidades.push(habilidade));
  }

  const mapa = new Map();

  habilidades.forEach((habilidade) => {
    const completa = completarHabilidade(habilidade);
    if (completa?.id) mapa.set(completa.id, completa);
  });

  return Array.from(mapa.values());
}

function completarHabilidade(habilidade) {
  if (!habilidade) return null;

  const catalogo = encontrarHabilidadePorId(habilidade.id);

  return {
    ...catalogo,
    ...habilidade,
    id: habilidade.id || catalogo?.id || "",
    nome: habilidade.nome || catalogo?.nome || "Habilidade sem nome"
  };
}

function encontrarHabilidadePorId(id) {
  return habilidadesCatalogo.find((habilidade) => habilidade.id === id) || null;
}

function obterCustoManaHabilidade(habilidade) {
  return numeroDeCampos(habilidade, [
    "custoManaEnergia",
    "custoMana",
    "custoDeMana",
    "custo",
    "mana",
    "custoEnergia"
  ]);
}

function obterCooldownHabilidade(habilidade) {
  return numeroDeCampos(habilidade, [
    "cooldown",
    "recarga",
    "tempoRecarga",
    "turnosCooldown"
  ]);
}

function obterModoEfeitoHabilidade(habilidade) {
  if (!habilidade) return "";

  const texto = normalizarTexto([
    habilidade.tipo,
    habilidade.categoria,
    habilidade.nome,
    habilidade.descricao,
    habilidade.efeito,
    habilidade.efeitoPrincipal,
    habilidade.efeitos
  ].join(" "));

  if (
    texto.includes("cura") ||
    texto.includes("curar") ||
    texto.includes("recupera") ||
    texto.includes("restaura") ||
    texto.includes("regenera")
  ) {
    return "cura";
  }

  if (
    texto.includes("dano") ||
    texto.includes("ataque") ||
    texto.includes("golpe") ||
    texto.includes("causa") ||
    texto.includes("ferimento")
  ) {
    return "dano";
  }

  return "";
}

function obterValorEfeitoHabilidade(habilidade) {
  return numeroDeCampos(habilidade, [
    "valorEfeito",
    "dano",
    "danoBase",
    "cura",
    "recuperacao",
    "quantidadeEfeito",
    "efeitoValor",
    "poder",
    "bonus"
  ]);
}

function obterCooldownRestante(personagem, habilidadeId) {
  const cooldowns = personagem.cooldownsHabilidades || {};
  return Number(cooldowns[habilidadeId] || 0);
}

async function reduzirCooldownsDoPersonagem(personagemId) {
  const personagem = state.personagens.find((item) => item.id === personagemId);

  if (!personagem || !personagem.cooldownsHabilidades) return;

  const novosCooldowns = {};

  Object.entries(personagem.cooldownsHabilidades).forEach(([id, valor]) => {
    const novoValor = Math.max(0, Number(valor || 0) - 1);

    if (novoValor > 0) {
      novosCooldowns[id] = novoValor;
    }
  });

  await updateDoc(doc(db, "personagens", personagemId), {
    cooldownsHabilidades: novosCooldowns,
    atualizadoEm: serverTimestamp()
  });
}

async function reduzirCooldownsDoPet(personagemId, petId) {
  const personagem = state.personagens.find((item) => item.id === personagemId);
  const pets = obterPetsPersonagemCampanha(personagem);
  const pet = pets.find((item) => item.id === petId);

  if (!personagem || !pet || !pet.cooldownsHabilidades) return;

  const novosCooldowns = {};

  Object.entries(pet.cooldownsHabilidades).forEach(([id, valor]) => {
    const novoValor = Math.max(0, Number(valor || 0) - 1);

    if (novoValor > 0) {
      novosCooldowns[id] = novoValor;
    }
  });

  const novosPets = pets.map((item) => {
    if (item.id !== petId) return item;

    return {
      ...item,
      cooldownsHabilidades: novosCooldowns
    };
  });

  await updateDoc(doc(db, "personagens", personagemId), {
    pets: novosPets,
    pet: personagem.pet?.id === petId ? novosPets.find((item) => item.id === petId) || null : personagem.pet || novosPets[0] || null,
    atualizadoEm: serverTimestamp()
  });
}

async function reduzirCooldownsDaEntidadeTurno(campanha) {
  const entidadeAtualId = obterEntidadeTurnoAtualId(campanha);

  if (entidadeAtualId.startsWith("personagem:")) {
    const personagemId = entidadeAtualId.replace("personagem:", "");
    await reduzirCooldownsDoPersonagem(personagemId);
    await reduzirCondicoesDoPersonagem(personagemId);
    return;
  }

  if (entidadeAtualId.startsWith("pet:")) {
    const [, personagemId, petId] = entidadeAtualId.split(":");
    await reduzirCooldownsDoPet(personagemId, petId);
    return;
  }

  if (campanha.personagemTurnoId) {
    await reduzirCooldownsDoPersonagem(campanha.personagemTurnoId);
    await reduzirCondicoesDoPersonagem(campanha.personagemTurnoId);
  }
}

function obterInventarioPersonagem(personagem) {
  if (Array.isArray(personagem.inventario) && personagem.inventario.length > 0) {
    return personagem.inventario.map((item) => completarItem(item)).filter(Boolean);
  }

  if (Array.isArray(personagem.itensIniciais)) {
    return personagem.itensIniciais.map((item) => completarItem({
      ...item,
      quantidade: item.quantidade || 1
    })).filter(Boolean);
  }

  return [];
}

function completarItem(item) {
  if (!item) return null;

  const catalogo = itensCatalogo.find((itemCatalogo) => itemCatalogo.id === item.id);

  return {
    ...catalogo,
    ...item,
    id: item.id || catalogo?.id || "",
    nome: item.nome || catalogo?.nome || "Item sem nome",
    quantidade: Number(item.quantidade || 1)
  };
}

function consumirItemInventario(inventario, itemId) {
  return inventario
    .map((item) => {
      if (item.id !== itemId) return item;

      return {
        ...item,
        quantidade: Number(item.quantidade || 1) - 1
      };
    })
    .filter((item) => Number(item.quantidade || 0) > 0);
}

function aplicarEfeitoItem(personagem, item) {
  const efeitoTexto = normalizarTexto(`${item.efeitoPrincipal || ""} ${item.categoria || ""} ${item.nome || ""}`);

  const valor = numeroDeCampos(item, [
    "valorEfeito",
    "cura",
    "recuperacao",
    "bonus",
    "quantidadeEfeito",
    "efeitoValor"
  ]) || 10;

  const atualizacao = {};
  const descricoes = [];

  if (efeitoTexto.includes("hp") || efeitoTexto.includes("vida") || efeitoTexto.includes("cura")) {
    const hpMax = Number(personagem.hpMax || 0);
    const hpAtual = Number(personagem.hpAtual || 0);
    const novoHp = Math.min(hpMax, hpAtual + valor);
    atualizacao.hpAtual = novoHp;
    descricoes.push(`Recuperou ${novoHp - hpAtual} de HP.`);
  }

  if (efeitoTexto.includes("mana")) {
    const manaMax = Number(personagem.manaMax || 0);
    const manaAtual = Number(personagem.manaAtual || 0);
    const novaMana = Math.min(manaMax, manaAtual + valor);
    atualizacao.manaAtual = novaMana;
    descricoes.push(`Recuperou ${novaMana - manaAtual} de Mana.`);
  }

  if (efeitoTexto.includes("fome")) {
    const fomeAtual = Number(personagem.fome || 0);
    const novaFome = Math.max(0, fomeAtual - valor);
    atualizacao.fome = novaFome;
    descricoes.push(`Reduziu ${fomeAtual - novaFome} de Fome.`);
  }

  if (efeitoTexto.includes("fadiga") || efeitoTexto.includes("cansaço") || efeitoTexto.includes("cansaco")) {
    const fadigaAtual = Number(personagem.fadiga || 0);
    const novaFadiga = Math.max(0, fadigaAtual - valor);
    atualizacao.fadiga = novaFadiga;
    descricoes.push(`Reduziu ${fadigaAtual - novaFadiga} de Fadiga.`);
  }

  if (descricoes.length === 0) {
    descricoes.push("O efeito foi registrado, mas nenhum efeito automático foi identificado.");
  }

  return {
    atualizacao,
    descricao: descricoes.join(" ")
  };
}

function numeroDeCampos(objeto, campos) {
  for (const campo of campos) {
    const valor = objeto?.[campo];

    if (valor === undefined || valor === null || valor === "") continue;

    const numero = Number(String(valor).replace(",", ".").replace(/[^\d.-]/g, ""));

    if (Number.isFinite(numero)) return numero;
  }

  return 0;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}


function abrirModalCriarBossCampanha(campanha) {
  fecharModalAcaoPersonagem();

  campanhaSelecionadaAcao = campanha;

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Criar boss na campanha</h3>
          <p>Crie um boss exclusivo para esta sessão sem depender do catálogo.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <div class="form-grid">
            <label>
              Nome do boss
              <input type="text" id="bossSessaoNome" placeholder="Ex: Guardião da Cripta" />
            </label>

            <label>
              Título
              <input type="text" id="bossSessaoTitulo" placeholder="Ex: O Devorador de Ecos" />
            </label>

            <label>
              Rank / Ameaça
              <input type="text" id="bossSessaoRank" placeholder="Ex: Rank A, Chefe de masmorra..." />
            </label>

            <label>
              HP
              <input type="number" id="bossSessaoHp" value="100" min="1" />
            </label>

            <label>
              Mana
              <input type="number" id="bossSessaoMana" value="0" min="0" />
            </label>

            <label>
              Velocidade
              <input type="number" id="bossSessaoVelocidade" value="0" />
            </label>
          </div>

          <label>
            Ataques
            <textarea id="bossSessaoAtaques" placeholder="Descreva ataques, dano e efeitos..."></textarea>
          </label>

          <label>
            Drops
            <textarea id="bossSessaoDrops" placeholder="Itens, materiais ou recompensas deixadas pelo boss..."></textarea>
          </label>

          <label>
            XP / Recompensa
            <textarea id="bossSessaoXp" placeholder="XP, ouro, avanço narrativo ou recompensa especial..."></textarea>
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarCriarBossSessao">Criar boss</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("confirmarCriarBossSessao")?.addEventListener("click", criarBossDiretoNaCampanha);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

async function criarBossDiretoNaCampanha() {
  if (!campanhaSelecionadaAcao) {
    await mostrarModal("Nenhuma campanha selecionada.", "Erro", "danger");
    return;
  }

  const nome = textoCampo("bossSessaoNome");

  if (!nome) {
    await mostrarModal("Digite o nome do boss.", "Campo obrigatório", "danger");
    return;
  }

  const validacaoBossManual = validarBossHistoriaManualNaCampanha(campanhaSelecionadaAcao, nome);

  if (!validacaoBossManual.ok) {
    await mostrarModal(validacaoBossManual.mensagem, validacaoBossManual.titulo || "Boss indisponível", "danger");
    return;
  }

  const hpMax = Math.max(1, numeroCampo("bossSessaoHp"));
  const manaMax = Math.max(0, numeroCampo("bossSessaoMana"));

  const boss = {
    id: `boss-manual-${Date.now()}`,
    instanciaId: `boss-manual-${Date.now()}`,
    catalogoId: "manual",
    tipoEntidade: "boss",
    categoriaBoss: "historia",
    nome,
    titulo: textoCampo("bossSessaoTitulo"),
    rankNivelAmeaca: textoCampo("bossSessaoRank"),
    hpMax,
    hpAtual: hpMax,
    manaMax,
    manaAtual: manaMax,
    velocidade: numeroCampo("bossSessaoVelocidade"),
    ataques: textoCampo("bossSessaoAtaques"),
    drops: textoCampo("bossSessaoDrops"),
    xpRecompensa: textoCampo("bossSessaoXp"),
    condicoes: [],
    criadoNaSessao: true,
    criadoEmTexto: new Date().toLocaleString("pt-BR")
  };

  const bossesSessao = [...obterBossesSessaoCampanha(campanhaSelecionadaAcao), boss];
  const campanhaAtualizada = {
    ...campanhaSelecionadaAcao,
    bossesSessao
  };
  const texto = `Boss ${boss.nome} criado dentro da campanha ativa.`;

  try {
    await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
      bossesSessao,
      ...montarAtualizacaoOrdemTurnos(campanhaAtualizada),
      mensagemSessao: texto,
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, texto, "boss"),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Boss criado na campanha com sucesso.", "Boss criado", "success");
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao criar boss na campanha:", erro);
    await mostrarModal("Erro ao criar boss na campanha.", "Erro", "danger");
  }
}

function abrirModalAtaqueInimigo(campanha, entidadeId) {
  fecharModalAcaoPersonagem();

  campanhaSelecionadaAcao = campanha;

  const atacante = obterEntidadesCombate(campanha).find((entidade) => {
    return entidade.entidadeId === entidadeId && ["monstro", "boss"].includes(entidade.tipo);
  });

  if (!atacante) {
    mostrarModal("Atacante não encontrado.", "Erro", "danger");
    return;
  }

  const alvos = obterEntidadesCombate(campanha).filter((entidade) => {
    if (entidade.entidadeId === atacante.entidadeId) return false;
    return Number(entidade.hpAtual ?? entidade.hp ?? 0) > 0;
  });

  const danoSugerido = obterDanoSugeridoEntidade(atacante);
  const alvoSugerido = sugerirAlvoAtaqueInimigo(alvos);

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Ataque de ${escapeHtml(atacante.nome || "criatura")}</h3>
          <p>Escolha um alvo específico para receber dano direto no HP.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Alvo
            <select id="ataqueInimigoAlvo">
              ${montarOptionsEntidadesGenericas(alvos, alvoSugerido?.entidadeId)}
            </select>
          </label>

          ${
            alvoSugerido
              ? `<div class="campaign-summary-box"><p><strong>Sugestão:</strong> atacar ${escapeHtml(alvoSugerido.nome || "alvo")} por estar com menor proporção de HP.</p></div>`
              : ""
          }

          <label>
            Dano
            <input type="number" id="ataqueInimigoDano" value="${danoSugerido}" min="1" />
          </label>

          <label>
            Descrição
            <input type="text" id="ataqueInimigoDescricao" value="Ataque de ${escapeHtml(atacante.nome || "criatura")}" />
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarAtaqueInimigo">Atacar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("confirmarAtaqueInimigo")?.addEventListener("click", () => confirmarAtaqueInimigo(atacante));

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

async function confirmarAtaqueInimigo(atacante) {
  if (!campanhaSelecionadaAcao) {
    await mostrarModal("Nenhuma campanha selecionada.", "Erro", "danger");
    return;
  }

  const alvoId = valorCampo("ataqueInimigoAlvo");
  const dano = Math.max(1, numeroCampo("ataqueInimigoDano"));
  const descricao = textoCampo("ataqueInimigoDescricao") || `Ataque de ${atacante.nome || "criatura"}`;
  const alvo = obterEntidadesCombate(campanhaSelecionadaAcao).find((entidade) => entidade.entidadeId === alvoId);

  if (!alvo) {
    await mostrarModal("Selecione um alvo válido.", "Campo obrigatório", "danger");
    return;
  }

  try {
    const resultado = await aplicarAtualizacaoHpAlvo(campanhaSelecionadaAcao, alvo, "dano", dano);

    const texto = `${atacante.nome || "Criatura"} atacou ${alvo.nome || "alvo"} e causou ${dano} de dano. ${descricao}${montarTextoResultadoHp(resultado)}`;

    await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
      mensagemSessao: texto,
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, texto, "ataque"),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Ataque aplicado com sucesso.", "Ataque registrado", "success");
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao aplicar ataque da criatura:", erro);
    await mostrarModal("Erro ao aplicar ataque da criatura.", "Erro", "danger");
  }
}

function obterDanoSugeridoEntidade(entidade) {
  return numeroDeCampos(entidade, [
    "dano",
    "danoBase",
    "forcaFisica",
    "forcaMagica",
    "poder",
    "ataque"
  ]) || 10;
}

function sugerirAlvoAtaqueInimigo(alvos) {
  if (!alvos.length) return null;

  return [...alvos].sort((a, b) => {
    const hpA = Number(a.hpAtual ?? a.hp ?? 0);
    const hpMaxA = Math.max(1, Number(a.hpMax ?? a.hp ?? 1));
    const hpB = Number(b.hpAtual ?? b.hp ?? 0);
    const hpMaxB = Math.max(1, Number(b.hpMax ?? b.hp ?? 1));

    return (hpA / hpMaxA) - (hpB / hpMaxB);
  })[0];
}

function montarOptionsEntidadesGenericas(entidades, selecionadoId = "") {
  if (!entidades.length) {
    return `<option value="">Nenhum alvo disponível</option>`;
  }

  return entidades
    .map((entidade) => {
      const hpAtual = Number(entidade.hpAtual ?? entidade.hp ?? 0);
      const hpMax = Number(entidade.hpMax ?? entidade.hp ?? 0);
      return `<option value="${entidade.entidadeId}" ${entidade.entidadeId === selecionadoId ? "selected" : ""}>${escapeHtml(rotuloTipoEntidade(entidade.tipo))}: ${escapeHtml(entidade.nome || "Sem nome")} — HP ${hpAtual}/${hpMax}</option>`;
    })
    .join("");
}

function abrirModalRecompensasCombate(campanha) {
  fecharModalAcaoPersonagem();

  campanhaSelecionadaAcao = campanha;

  const derrotados = obterInimigosCampanha(campanha).filter((entidade) => Number(entidade.hpAtual ?? entidade.hp ?? 0) <= 0);
  const recompensas = montarResumoRecompensas(derrotados);
  const xpSugerido = calcularXpDerrotados(derrotados);
  const personagens = obterPersonagensDaCampanha(campanha);

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Aplicar recompensas</h3>
          <p>Registre as recompensas do combate no histórico da sessão.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <div class="campaign-summary-box">
            ${
              derrotados.length
                ? `<p><strong>Inimigos derrotados:</strong> ${derrotados.map((item) => escapeHtml(item.nome || "Criatura")).join(", ")}</p>`
                : `<p>Nenhum monstro ou boss derrotado foi identificado automaticamente. Você ainda pode registrar uma recompensa manual.</p>`
            }
          </div>

          <label>
            Recompensas
            <textarea id="recompensasCombateTexto">${escapeHtml(recompensas)}</textarea>
          </label>

          <div class="form-grid">
            <label>
              XP por personagem
              <input type="number" id="recompensasCombateXp" value="${xpSugerido}" min="0" />
            </label>

            <label>
              Receber XP
              <select id="recompensasCombateDestino">
                <option value="todos">Todos os personagens da campanha</option>
                ${personagens.map((personagem) => `<option value="${personagem.id}">${escapeHtml(personagem.nome || "Personagem")}</option>`).join("")}
              </select>
            </label>
          </div>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Cancelar</button>
            <button class="primary-btn" type="button" id="confirmarRecompensasCombate">Aplicar recompensas</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("confirmarRecompensasCombate")?.addEventListener("click", salvarRecompensasCombate);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

function montarResumoRecompensas(derrotados) {
  if (!derrotados.length) return "";

  const linhas = [];

  derrotados.forEach((entidade) => {
    const nome = entidade.nome || "Criatura";
    const xp = entidade.xpRecompensa || entidade.recompensa || "";
    const drops = entidade.drops || "";

    linhas.push(`• ${nome}`);
    if (xp) linhas.push(`  XP/Recompensa: ${xp}`);
    if (drops) linhas.push(`  Drops: ${drops}`);
  });

  return linhas.join("\n");
}

function calcularXpDerrotados(derrotados) {
  return derrotados.reduce((total, entidade) => total + extrairXpEntidade(entidade), 0);
}

function extrairXpEntidade(entidade) {
  return numeroDeCampos(entidade, [
    "xpRecompensa",
    "xp",
    "experiencia",
    "experiência",
    "recompensa"
  ]);
}

async function salvarRecompensasCombate() {
  if (!campanhaSelecionadaAcao) {
    await mostrarModal("Nenhuma campanha selecionada.", "Erro", "danger");
    return;
  }

  const recompensas = textoCampo("recompensasCombateTexto");
  const xp = Math.max(0, numeroCampo("recompensasCombateXp"));
  const destinoXp = valorCampo("recompensasCombateDestino") || "todos";

  if (!recompensas && xp <= 0) {
    await mostrarModal("Informe as recompensas ou um valor de XP.", "Campo obrigatório", "danger");
    return;
  }

  const registro = {
    texto: recompensas || `XP aplicado: ${xp}`,
    xp,
    destinoXp,
    criadoEmTexto: new Date().toLocaleString("pt-BR")
  };

  const recompensasSessao = Array.isArray(campanhaSelecionadaAcao.recompensasSessao)
    ? [registro, ...campanhaSelecionadaAcao.recompensasSessao]
    : [registro];

  let resultadosXp = [];

  try {
    if (xp > 0) {
      resultadosXp = await aplicarXpPersonagensCampanha(campanhaSelecionadaAcao, xp, destinoXp);
    }

    const textoXp = montarTextoResultadosXp(resultadosXp);
    const texto = `Recompensas aplicadas ao fim do combate: ${(recompensas || "Sem descrição").replace(/\n/g, " | ")}${textoXp}`;

    await updateDoc(doc(db, "campanhas", campanhaSelecionadaAcao.id), {
      recompensasSessao,
      mensagemSessao: "Recompensas do combate aplicadas.",
      historicoSessao: adicionarEventoHistorico(campanhaSelecionadaAcao, texto, "recompensa"),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Recompensas registradas com sucesso.", "Recompensas aplicadas", "success");
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao aplicar recompensas:", erro);
    await mostrarModal("Erro ao aplicar recompensas.", "Erro", "danger");
  }
}

async function aplicarXpPersonagensCampanha(campanha, xp, destinoXp) {
  const personagens = obterPersonagensDaCampanha(campanha);
  const destinatarios = destinoXp === "todos"
    ? personagens
    : personagens.filter((personagem) => personagem.id === destinoXp);
  const resultados = [];

  for (const personagem of destinatarios) {
    const resultado = calcularAtualizacaoXpPersonagem(personagem, xp);

    await updateDoc(doc(db, "personagens", personagem.id), {
      ...resultado.atualizacao,
      atualizadoEm: serverTimestamp()
    });

    resultados.push(resultado);
  }

  return resultados;
}

function calcularAtualizacaoXpPersonagem(personagem, xpGanho) {
  const nivelInicial = Math.max(1, Number(personagem.nivel || 1));
  let nivel = nivelInicial;
  let xpAtual = Math.max(0, Number(personagem.xpAtual ?? personagem.xp ?? 0)) + xpGanho;
  const xpTotal = Math.max(0, Number(personagem.xpTotal ?? personagem.xpAcumulado ?? 0)) + xpGanho;
  let niveisGanhos = 0;

  while (xpAtual >= xpNecessarioParaNivel(nivel)) {
    xpAtual -= xpNecessarioParaNivel(nivel);
    nivel += 1;
    niveisGanhos += 1;
  }

  const atualizacao = {
    xpAtual,
    xpTotal,
    xpParaProximoNivel: xpNecessarioParaNivel(nivel)
  };

  if (niveisGanhos > 0) {
    const incrementos = calcularIncrementosLevelUp(personagem, niveisGanhos);

    Object.assign(atualizacao, incrementos, {
      nivel,
      niveisGanhosUltimaRecompensa: niveisGanhos,
      ultimoLevelUpTexto: new Date().toLocaleString("pt-BR")
    });
  }

  return {
    personagemId: personagem.id,
    personagemNome: personagem.nome || "Personagem",
    xpGanho,
    nivelInicial,
    nivelFinal: nivel,
    niveisGanhos,
    xpAtual,
    xpParaProximoNivel: xpNecessarioParaNivel(nivel),
    atualizacao
  };
}

function calcularIncrementosLevelUp(personagem, niveisGanhos) {
  const classe = personagem.classe || {};
  const hpPorNivel = Math.max(1, Number(classe.hpPorNivel ?? 10) || 10);
  const manaPorNivel = Math.max(0, Number(classe.manaPorNivel ?? 5) || 5);
  const hpBonus = hpPorNivel * niveisGanhos;
  const manaBonus = manaPorNivel * niveisGanhos;
  const hpMax = Number(personagem.hpMax || 0) + hpBonus;
  const manaMax = Number(personagem.manaMax || 0) + manaBonus;
  const atualizacao = {
    hpMax,
    hpAtual: Math.min(hpMax, Number(personagem.hpAtual || 0) + hpBonus),
    manaMax,
    manaAtual: Math.min(manaMax, Number(personagem.manaAtual || 0) + manaBonus)
  };

  ATRIBUTOS_LEVEL_UP.forEach((atributo) => {
    atualizacao[atributo] = Number(personagem[atributo] || 0) + niveisGanhos;
  });

  return atualizacao;
}

function xpNecessarioParaNivel(nivel) {
  return Math.max(XP_BASE_POR_NIVEL, Math.max(1, Number(nivel || 1)) * XP_BASE_POR_NIVEL);
}

function montarTextoResultadosXp(resultadosXp) {
  if (!resultadosXp.length) return "";

  return ` XP: ${resultadosXp.map((resultado) => {
    const progresso = `${resultado.xpAtual}/${resultado.xpParaProximoNivel}`;
    const subida = resultado.niveisGanhos > 0
      ? `, subiu para o nível ${resultado.nivelFinal}`
      : "";

    return `${resultado.personagemNome} recebeu ${resultado.xpGanho} XP (${progresso}${subida})`;
  }).join("; ")}.`;
}

function abrirModalResumoSessao(campanha) {
  fecharModalAcaoPersonagem();

  const personagens = obterPersonagensDaCampanha(campanha);
  const inimigos = obterInimigosCampanha(campanha);
  const historico = Array.isArray(campanha.historicoSessao) ? campanha.historicoSessao : [];
  const recompensas = Array.isArray(campanha.recompensasSessao) ? campanha.recompensasSessao : [];

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalAcaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Resumo da sessão</h3>
          <p>${escapeHtml(campanha.nome || "Campanha")}</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalAcaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <div class="session-summary-grid">
            <span><b>Status</b>${escapeHtml(obterTextoStatusCampanha(campanha))}</span>
            <span><b>Rodada</b>${Number(campanha.rodadaAtual || 0)}</span>
            <span><b>Turno</b>${Number(campanha.turnoAtual || 0)}</span>
            <span><b>Personagens</b>${personagens.length}</span>
            <span><b>Inimigos</b>${inimigos.length}</span>
            <span><b>Eventos</b>${historico.length}</span>
          </div>

          <div class="campaign-summary-box">
            <h4>Personagens</h4>
            ${personagens.length ? personagens.map((personagem) => `<p>${escapeHtml(personagem.nome || "Personagem")} — Nível ${Number(personagem.nivel || 1)} — XP ${Number(personagem.xpAtual ?? personagem.xp ?? 0)}/${xpNecessarioParaNivel(personagem.nivel || 1)} — HP ${Number(personagem.hpAtual || 0)}/${Number(personagem.hpMax || 0)} — Mana ${Number(personagem.manaAtual || 0)}/${Number(personagem.manaMax || 0)}</p>`).join("") : "<p>Nenhum personagem vinculado.</p>"}
          </div>

          <div class="campaign-summary-box">
            <h4>Monstros e bosses</h4>
            ${inimigos.length ? inimigos.map((entidade) => `<p>${escapeHtml(rotuloTipoEntidade(entidade.tipo))}: ${escapeHtml(entidade.nome || "Criatura")} — HP ${Number(entidade.hpAtual ?? entidade.hp ?? 0)}/${Number(entidade.hpMax ?? entidade.hp ?? 0)}</p>`).join("") : "<p>Nenhum inimigo na sessão.</p>"}
          </div>

          <div class="campaign-summary-box">
            <h4>Recompensas registradas</h4>
            ${recompensas.length ? recompensas.map((item) => `<p>${escapeHtml(item.texto || "Recompensa")}</p>`).join("") : "<p>Nenhuma recompensa registrada.</p>"}
          </div>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarAcaoPersonagem">Fechar</button>
            <button class="primary-btn" type="button" id="registrarResumoSessao">Registrar resumo no histórico</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("cancelarAcaoPersonagem")?.addEventListener("click", fecharModalAcaoPersonagem);
  document.getElementById("registrarResumoSessao")?.addEventListener("click", () => registrarResumoSessao(campanha));

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fecharModalAcaoPersonagem();
  });
}

async function registrarResumoSessao(campanha) {
  const resumo = gerarTextoResumoSessao(campanha);

  try {
    await updateDoc(doc(db, "campanhas", campanha.id), {
      resumoSessao: resumo,
      registroFinalSessao: resumo,
      historicoSessao: adicionarEventoHistorico(campanha, `Resumo da sessão registrado. ${resumo}`, "resumo"),
      atualizadaEm: serverTimestamp()
    });

    await mostrarModal("Resumo registrado no histórico.", "Resumo salvo", "success");
    fecharModalAcaoPersonagem();
  } catch (erro) {
    console.error("Erro ao registrar resumo:", erro);
    await mostrarModal("Erro ao registrar resumo.", "Erro", "danger");
  }
}

function gerarTextoResumoSessao(campanha) {
  const personagens = obterPersonagensDaCampanha(campanha);
  const inimigos = obterInimigosCampanha(campanha);
  const historico = Array.isArray(campanha.historicoSessao) ? campanha.historicoSessao : [];
  const recompensas = Array.isArray(campanha.recompensasSessao) ? campanha.recompensasSessao : [];

  const linhas = [];

  linhas.push(`Resumo da sessão — ${campanha.nome || "Campanha sem nome"}`);
  linhas.push(`Status: ${obterTextoStatusCampanha(campanha)}`);
  linhas.push(`Rodada: ${Number(campanha.rodadaAtual || 0)} | Turno: ${Number(campanha.turnoAtual || 0)}`);
  linhas.push("");
  linhas.push("Personagens:");
  personagens.forEach((personagem) => {
    linhas.push(`- ${personagem.nome || "Personagem"}: Nível ${Number(personagem.nivel || 1)}, XP ${Number(personagem.xpAtual ?? personagem.xp ?? 0)}/${xpNecessarioParaNivel(personagem.nivel || 1)}, HP ${Number(personagem.hpAtual || 0)}/${Number(personagem.hpMax || 0)}, Mana ${Number(personagem.manaAtual || 0)}/${Number(personagem.manaMax || 0)}`);
  });
  if (!personagens.length) linhas.push("- Nenhum personagem vinculado.");
  linhas.push("");
  linhas.push("Monstros e bosses:");
  inimigos.forEach((entidade) => {
    linhas.push(`- ${rotuloTipoEntidade(entidade.tipo)} ${entidade.nome || "Criatura"}: HP ${Number(entidade.hpAtual ?? entidade.hp ?? 0)}/${Number(entidade.hpMax ?? entidade.hp ?? 0)}`);
  });
  if (!inimigos.length) linhas.push("- Nenhum inimigo na sessão.");
  linhas.push("");
  linhas.push("Recompensas:");
  recompensas.forEach((item) => linhas.push(`- ${item.texto || "Recompensa"}`));
  if (!recompensas.length) linhas.push("- Nenhuma recompensa registrada.");
  linhas.push("");
  linhas.push("Últimos eventos:");
  historico.slice(0, 12).forEach((evento) => {
    linhas.push(`- ${evento.criadoEmTexto || ""} ${evento.texto || "Evento"}`.trim());
  });

  return linhas.join("\n");
}

async function exportarHistoricoSessao(campanha) {
  const historico = Array.isArray(campanha.historicoSessao) ? campanha.historicoSessao : [];
  const resumo = gerarTextoResumoSessao(campanha);
  const linhas = [];

  linhas.push(resumo);
  linhas.push("\n==============================\n");
  linhas.push("Histórico completo da sessão:");

  historico.slice().reverse().forEach((evento) => {
    linhas.push(`[${evento.criadoEmTexto || "sem data"}] ${evento.texto || "Evento sem descrição"}`);
  });

  const conteudo = linhas.join("\n");

  try {
    await updateDoc(doc(db, "campanhas", campanha.id), {
      registroFinalSessao: conteudo,
      exportadoEmTexto: new Date().toLocaleString("pt-BR"),
      atualizadaEm: serverTimestamp()
    });
  } catch (erro) {
    console.error("Erro ao registrar histórico final no banco:", erro);
  }

  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const nomeArquivo = `historico-${normalizarTexto(campanha.nome || "campanha").replace(/[^a-z0-9]+/g, "-") || "campanha"}.txt`;

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  await mostrarModal("Histórico exportado e registro final salvo na campanha.", "Exportação concluída", "success");
}


function normalizarCategoriaBoss(valor) {
  const texto = normalizarTexto(valor);

  if (texto.includes("farm")) return "farm";
  if (texto.includes("historia") || texto.includes("história")) return "historia";

  return valor === "farm" ? "farm" : "historia";
}

function obterChaveBossCatalogo(boss) {
  return String(boss?.catalogoId || boss?.id || boss?.nome || "");
}

function obterNomeNormalizadoBoss(boss) {
  return normalizarTexto(boss?.nome || "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function obterTurnosReaparecimentoBossFarm(boss) {
  return Number(
    boss?.turnosReaparecimentoFarm ??
    boss?.turnosReaparecimento ??
    boss?.turnosRespawn ??
    boss?.cooldownFarm ??
    0
  ) || 0;
}

function obterBossesHistoricosMortos(campanha) {
  return Array.isArray(campanha?.bossesHistoricosMortos) ? campanha.bossesHistoricosMortos : [];
}

function obterBossesFarmCooldown(campanha) {
  return campanha?.bossesFarmCooldown && typeof campanha.bossesFarmCooldown === "object"
    ? campanha.bossesFarmCooldown
    : {};
}

function bossHistoriaJaUsadoNaCampanha(campanha, bossBase) {
  const chave = obterChaveBossCatalogo(bossBase);
  const nomeNormalizado = obterNomeNormalizadoBoss(bossBase);

  const ativo = obterBossesSessaoCampanha(campanha).some((boss) => {
    return normalizarCategoriaBoss(boss.categoriaBoss) === "historia" && (
      obterChaveBossCatalogo(boss) === chave ||
      obterNomeNormalizadoBoss(boss) === nomeNormalizado
    );
  });

  if (ativo) return true;

  return obterBossesHistoricosMortos(campanha).some((boss) => {
    return String(boss.bossId || boss.catalogoId || "") === chave ||
      normalizarTexto(boss.bossNome || "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") === nomeNormalizado;
  });
}

function validarAdicaoBossNaCampanha(campanha, bossBase) {
  const categoria = normalizarCategoriaBoss(bossBase.categoriaBoss);
  const nome = bossBase.nome || "Boss";
  const chave = obterChaveBossCatalogo(bossBase);

  if (categoria === "historia") {
    if (bossHistoriaJaUsadoNaCampanha(campanha, bossBase)) {
      return {
        ok: false,
        titulo: "Boss de História bloqueado",
        mensagem: `O boss de história “${nome}” já existe ou já foi derrotado nesta campanha. Bosses de História só podem ser usados uma vez por campanha.`
      };
    }
  }

  if (categoria === "farm") {
    const cooldown = obterBossesFarmCooldown(campanha)[chave];
    const turnosRestantes = Number(cooldown?.turnosRestantes || 0);

    if (turnosRestantes > 0) {
      return {
        ok: false,
        titulo: "Boss de Farm em recarga",
        mensagem: `O boss de farm “${nome}” ainda precisa aguardar ${turnosRestantes} turno(s) para ser adicionado novamente nesta campanha.`
      };
    }
  }

  return { ok: true };
}

function validarBossHistoriaManualNaCampanha(campanha, nome) {
  const nomeNormalizado = normalizarTexto(nome).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const bossBase = { id: `manual:${nomeNormalizado}`, catalogoId: `manual:${nomeNormalizado}`, nome, categoriaBoss: "historia" };

  if (bossHistoriaJaUsadoNaCampanha(campanha, bossBase)) {
    return {
      ok: false,
      titulo: "Boss de História bloqueado",
      mensagem: `Já existe ou já foi derrotado um boss de história chamado “${nome}” nesta campanha.`
    };
  }

  return { ok: true };
}

function montarAtualizacoesBossDerrotado(campanha, alvo, novoHp, bossesSessaoAtualizados) {
  if (novoHp > 0) return {};

  const categoria = normalizarCategoriaBoss(alvo.categoriaBoss);
  const bossId = obterChaveBossCatalogo(alvo);
  const bossNome = alvo.nome || "Boss";
  const atualizacoes = {
    ordemTurnos: criarOrdemTurnos(obterPersonagensDaCampanha(campanha), {
      ...campanha,
      bossesSessao: bossesSessaoAtualizados
    })
  };

  if (categoria === "historia") {
    const mortos = obterBossesHistoricosMortos(campanha);
    const jaRegistrado = mortos.some((boss) => String(boss.bossId || boss.catalogoId || "") === bossId);

    if (!jaRegistrado) {
      atualizacoes.bossesHistoricosMortos = [
        {
          bossId,
          bossNome,
          instanciaId: alvo.instanciaId || "",
          derrotadoNaRodada: Number(campanha.rodadaAtual || 0),
          derrotadoNoTurno: Number(campanha.turnoAtual || 0),
          derrotadoEmTexto: new Date().toLocaleString("pt-BR")
        },
        ...mortos
      ];
    }
  }

  if (categoria === "farm") {
    const turnos = obterTurnosReaparecimentoBossFarm(alvo);

    if (turnos > 0) {
      atualizacoes.bossesFarmCooldown = {
        ...obterBossesFarmCooldown(campanha),
        [bossId]: {
          bossId,
          bossNome,
          turnosRestantes: turnos,
          turnosOriginais: turnos,
          iniciadoNaRodada: Number(campanha.rodadaAtual || 0),
          iniciadoNoTurno: Number(campanha.turnoAtual || 0),
          iniciadoEmTexto: new Date().toLocaleString("pt-BR")
        }
      };
    }
  }

  return atualizacoes;
}

function reduzirCooldownsBossesFarmCampanha(campanha) {
  const cooldowns = obterBossesFarmCooldown(campanha);
  const atualizados = {};

  Object.entries(cooldowns).forEach(([bossId, dados]) => {
    const restante = Math.max(0, Number(dados?.turnosRestantes || 0) - 1);

    if (restante > 0) {
      atualizados[bossId] = {
        ...dados,
        turnosRestantes: restante
      };
    }
  });

  return atualizados;
}

function montarAvisoRegrasBossCampanha(campanha) {
  const cooldowns = Object.values(obterBossesFarmCooldown(campanha)).filter((item) => Number(item.turnosRestantes || 0) > 0);
  const mortos = obterBossesHistoricosMortos(campanha);

  return `
    <div class="campaign-summary-box boss-campaign-rule-box">
      <h4>Regras de Boss nesta campanha</h4>
      <p><strong>Boss de História:</strong> só pode ser usado uma vez por campanha. Depois de derrotado, fica bloqueado nesta campanha.</p>
      <p><strong>Boss de Farm:</strong> pode voltar, mas apenas depois do número de turnos definido no cadastro.</p>
      ${mortos.length ? `<p><strong>História derrotados:</strong> ${mortos.map((boss) => escapeHtml(boss.bossNome || "Boss")).join(", ")}</p>` : ""}
      ${cooldowns.length ? `<p><strong>Farm em recarga:</strong> ${cooldowns.map((boss) => `${escapeHtml(boss.bossNome || "Boss")} (${Number(boss.turnosRestantes || 0)} turno(s))`).join(", ")}</p>` : ""}
    </div>
  `;
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

    .campaign-session-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 0.85fr);
      gap: 16px;
      padding: 18px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.045);
    }

    .campaign-session-panel span {
      display: block;
      margin-bottom: 6px;
      color: rgba(255,255,255,0.46);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .campaign-session-panel strong {
      display: block;
      color: #fff;
      font-size: 22px;
      line-height: 1.1;
    }

    .campaign-session-panel p {
      margin: 10px 0 0;
      color: rgba(255,255,255,0.64);
      line-height: 1.45;
      font-weight: 600;
    }

    .turno-alerta-jogador {
      margin-top: 14px;
      padding: 14px 16px;
      border-radius: 16px;
      color: #fff;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.18);
      font-weight: 900;
      text-align: center;
    }

    .campaign-session-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .campaign-session-stats span {
      margin: 0;
      padding: 12px;
      border-radius: 14px;
      background: rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.08);
      color: #fff;
      font-size: 15px;
      font-weight: 900;
      text-transform: none;
      letter-spacing: 0;
    }

    .campaign-session-stats b {
      display: block;
      margin-bottom: 5px;
      color: rgba(255,255,255,0.46);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .campaign-session-panel.session-active {
      border-color: rgba(255,255,255,0.24);
      background:
        radial-gradient(circle at 0% 0%, rgba(255,255,255,0.12), transparent 28%),
        rgba(255,255,255,0.06);
    }

    .campaign-session-panel.session-paused {
      border-color: rgba(255,255,255,0.16);
      opacity: 0.9;
    }

    .campaign-session-panel.session-ended {
      opacity: 0.75;
    }

    .campaign-info-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
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

    .campaign-characters-panel,
    .campaign-turn-panel,
    .campaign-history-panel,
    .campaign-lobby-panel {
      display: grid;
      gap: 14px;
      padding: 18px;
      border-radius: 20px;
      background: rgba(255,255,255,0.035);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .campaign-lobby-panel.ready {
      border-color: rgba(125, 211, 252, 0.24);
    }

    .campaign-readiness-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 10px;
    }

    .campaign-readiness-grid span {
      display: grid;
      gap: 5px;
      padding: 12px;
      border-radius: 14px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
      color: #fff;
      font-weight: 900;
      text-align: center;
    }

    .campaign-readiness-grid b {
      color: rgba(255,255,255,0.46);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .campaign-lobby-columns {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .campaign-lobby-columns > div,
    .campaign-battle-panel {
      display: grid;
      gap: 10px;
      padding: 14px;
      border-radius: 16px;
      background: rgba(0,0,0,0.18);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .campaign-lobby-columns h5 {
      margin: 0;
      color: rgba(255,255,255,0.48);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .campaign-lobby-columns p {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 0;
      color: rgba(255,255,255,0.72);
      font-weight: 800;
    }

    .campaign-lobby-columns p span {
      color: rgba(255,255,255,0.46);
      font-size: 12px;
    }

    .campaign-battle-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }

    .campaign-battle-toolbar strong,
    .campaign-battle-item strong {
      color: #fff;
    }

    .campaign-battle-toolbar span,
    .campaign-battle-item span {
      display: block;
      margin-top: 4px;
      color: rgba(255,255,255,0.54);
      font-size: 13px;
      font-weight: 700;
    }

    .campaign-battle-list {
      display: grid;
      gap: 8px;
    }

    .campaign-battle-item {
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .campaign-battle-item.active {
      border-color: rgba(125, 211, 252, 0.3);
      background: rgba(125, 211, 252, 0.08);
    }

    .campaign-section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }

    .campaign-section-title span {
      color: rgba(255,255,255,0.48);
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .campaign-section-title strong {
      color: #fff;
      font-size: 18px;
    }

    .campaign-character-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
    }

    .campaign-character-card {
      display: grid;
      gap: 12px;
      padding: 14px;
      border-radius: 16px;
      background: rgba(0,0,0,0.22);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .campaign-character-card.active-turn {
      border-color: rgba(255,255,255,0.28);
      background: rgba(255,255,255,0.08);
    }

    .campaign-character-card.status-pendente {
      border-color: rgba(255, 209, 102, 0.24);
    }

    .campaign-character-card.status-recusado {
      opacity: 0.72;
      border-color: rgba(255, 99, 99, 0.24);
    }

    .campaign-character-card strong {
      display: block;
      color: #fff;
      font-size: 17px;
    }

    .campaign-character-card span {
      color: rgba(255,255,255,0.58);
      font-size: 13px;
      font-weight: 700;
    }

    .campaign-status-pill {
      display: inline-flex;
      width: max-content;
      margin-top: 8px;
      padding: 5px 8px;
      border-radius: 999px;
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.78);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .campaign-status-pill.status-aprovado {
      background: rgba(125, 211, 252, 0.14);
      color: #dff6ff;
    }

    .campaign-status-pill.status-pendente {
      background: rgba(255, 209, 102, 0.14);
      color: #ffe7a3;
    }

    .campaign-status-pill.status-recusado {
      background: rgba(255, 99, 99, 0.14);
      color: #ffc7c7;
    }

    .campaign-character-stats,
    .campaign-condition-list,
    .campaign-cooldown-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .campaign-character-stats span,
    .campaign-condition-list span,
    .campaign-cooldown-list span {
      padding: 6px 9px;
      border-radius: 999px;
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.78);
      font-size: 12px;
      font-weight: 800;
    }

    .campaign-condition-list small,
    .campaign-cooldown-list small {
      color: rgba(255,255,255,0.46);
      font-weight: 800;
    }

    .campaign-character-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }

    .campaign-character-actions button {
      padding: 9px 11px;
      font-size: 12px;
    }

    .campaign-pet-list {
      display: grid;
      gap: 8px;
    }

    .campaign-pet-list small {
      color: rgba(255,255,255,0.46);
      font-weight: 800;
    }

    .campaign-pet-card {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 10px;
      border-radius: 14px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .campaign-pet-card strong {
      width: 100%;
      font-size: 14px;
    }

    .campaign-pet-card button {
      padding: 8px 10px;
      font-size: 12px;
    }

    .enemy-card {
      border-color: rgba(255,255,255,0.16);
    }

    .turn-order-list {
      display: grid;
      gap: 10px;
    }

    .turn-order-item {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 14px;
      background: rgba(0,0,0,0.22);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .turn-order-item.active {
      border-color: rgba(255,255,255,0.28);
      background: rgba(255,255,255,0.08);
    }

    .turn-order-item span {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      background: rgba(255,255,255,0.12);
      font-weight: 900;
    }

    .turn-order-item strong {
      color: #fff;
      font-size: 15px;
    }

    .turn-order-item small {
      color: rgba(255,255,255,0.56);
      font-weight: 800;
    }

    .session-history-list {
      display: grid;
      gap: 10px;
      max-height: 260px;
      overflow: auto;
      padding-right: 4px;
    }

    .history-filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .history-filter-btn {
      min-height: 34px;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.64);
      font-weight: 900;
      cursor: pointer;
    }

    .history-filter-btn.active {
      background: rgba(255,255,255,0.13);
      color: #fff;
      border-color: rgba(255,255,255,0.2);
    }

    .session-history-item {
      padding: 12px;
      border-radius: 14px;
      background: rgba(0,0,0,0.22);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .session-history-item p {
      margin: 0;
      color: rgba(255,255,255,0.78);
      line-height: 1.45;
      font-weight: 700;
    }

    .session-history-item span {
      display: block;
      margin-top: 6px;
      color: rgba(255,255,255,0.42);
      font-size: 12px;
      font-weight: 800;
    }

    .campaign-empty-box {
      padding: 14px;
      border-radius: 16px;
      background: rgba(0,0,0,0.20);
      border: 1px solid rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.58);
      font-weight: 800;
      text-align: center;
    }

    .campaign-actions {
      justify-content: flex-end;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 18px;
    }

    .campaign-player-message {
      flex: 1;
      display: block;
      padding: 14px 16px;
      border-radius: 16px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.72);
      font-weight: 800;
      text-align: center;
    }

    .campaign-player-message.active {
      color: #fff;
      border-color: rgba(255,255,255,0.18);
      background: rgba(255,255,255,0.08);
    }


    .session-summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .session-summary-grid span,
    .campaign-summary-box {
      display: grid;
      gap: 6px;
      padding: 14px;
      border-radius: 16px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.76);
      font-weight: 800;
    }

    .session-summary-grid b,
    .campaign-summary-box h4 {
      margin: 0;
      color: rgba(255,255,255,0.48);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .campaign-summary-box p {
      margin: 0;
      color: rgba(255,255,255,0.76);
      line-height: 1.45;
      font-weight: 700;
    }

    .campaign-checkbox-line {
      display: flex !important;
      align-items: center;
      gap: 10px;
      color: rgba(255,255,255,0.82);
      font-size: 0.92rem;
      font-weight: 800;
    }

    .campaign-checkbox-line input {
      width: auto;
      accent-color: #f5f5f5;
    }

    @media (max-width: 920px) {
      .campaign-session-panel {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .campaign-card-top {
        display: grid;
      }

      .campaign-role {
        justify-self: start;
      }

      .campaign-info-grid,
      .campaign-session-stats,
      .campaign-readiness-grid,
      .campaign-lobby-columns {
        grid-template-columns: 1fr;
      }

      .campaign-battle-toolbar {
        display: grid;
      }

      .campaign-actions {
        justify-content: stretch;
      }

      .campaign-actions button,
      .campaign-player-message {
        width: 100%;
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
