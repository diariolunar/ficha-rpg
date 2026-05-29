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

import { state, setCampanhas, setPersonagens } from "./state.js";
import { onPageLoaded } from "./navigation.js";
import { mostrarModal, confirmarModal } from "./ui.js";

let unsubscribeCampanhas = null;
let unsubscribeCampanhasCriadasPor = null;
let unsubscribeCampanhasEmail = null;

let unsubscribePersonagensCampanhas = null;
let unsubscribePersonagensCampanhasExtras = null;

let campanhaSelecionadaEdicao = null;
let campanhaSelecionadaRolagem = null;

let campanhasPorMestreId = [];
let campanhasPorCriadoPor = [];
let campanhasPorEmail = [];

let personagensPorCampanhaMestre = [];
let personagensCriadosPeloUsuario = [];

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

function ordenarCampanhas(a, b) {
  const dataA = converterDataOrdenacao(a.criadoEm || a.atualizadoEm);
  const dataB = converterDataOrdenacao(b.criadoEm || b.atualizadoEm);

  if (dataA !== dataB) {
    return dataB - dataA;
  }

  return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
}

function ordenarPersonagens(a, b) {
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

  if (unsubscribePersonagensCampanhas) {
    unsubscribePersonagensCampanhas();
    unsubscribePersonagensCampanhas = null;
  }

  if (unsubscribePersonagensCampanhasExtras) {
    unsubscribePersonagensCampanhasExtras();
    unsubscribePersonagensCampanhasExtras = null;
  }

  campanhasPorMestreId = [];
  campanhasPorCriadoPor = [];
  campanhasPorEmail = [];
  personagensPorCampanhaMestre = [];
  personagensCriadosPeloUsuario = [];
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

    await mostrarModal("Você entrou na campanha com sucesso.", "Campanha vinculada", "success");

    fecharModalEntradaCampanha();
  } catch (erro) {
    console.error("Erro ao entrar na campanha:", erro);
    await mostrarModal("Erro ao entrar na campanha.", "Erro", "danger");
  }
}

async function iniciarSessaoCampanha(campanha) {
  if (!podeControlarCampanha(campanha)) {
    await mostrarModal("Você não tem permissão para iniciar esta campanha.", "Permissão negada", "danger");
    return;
  }

  const personagens = obterPersonagensDaCampanha(campanha);

  if (!personagens.length) {
    await mostrarModal(
      "Nenhum personagem está vinculado a esta campanha. Vincule pelo menos um personagem antes de iniciar a sessão.",
      "Sem personagens",
      "danger"
    );
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Iniciar sessão",
    mensagem: `Deseja iniciar a sessão da campanha “${campanha.nome}”? A ordem de turno será criada com os personagens vinculados.`,
    confirmarTexto: "Iniciar",
    cancelarTexto: "Cancelar",
    tipo: "success"
  });

  if (!confirmar) return;

  const ordemTurnos = criarOrdemTurnos(personagens);
  const primeiro = ordemTurnos[0] || null;

  try {
    await updateDoc(doc(db, "campanhas", campanha.id), {
      status: "ativa",
      sessaoAtiva: true,
      rodadaAtual: 1,
      turnoAtual: 1,
      turnoIndice: 0,
      ordemTurnos,
      personagemTurnoId: primeiro?.personagemId || "",
      personagemTurnoNome: primeiro?.nome || "",
      personagemTurnoDonoId: primeiro?.donoId || "",
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
    await updateDoc(doc(db, "campanhas", campanha.id), {
      status: "encerrada",
      sessaoAtiva: false,
      personagemTurnoId: "",
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

  const ordemAtual = Array.isArray(campanha.ordemTurnos) ? campanha.ordemTurnos : [];

  if (!ordemAtual.length) {
    await mostrarModal("A campanha não possui ordem de turnos. Reinicie a sessão para criar uma ordem.", "Sem ordem de turnos", "danger");
    return;
  }

  const indiceAtual = Number(campanha.turnoIndice ?? 0);
  let proximoIndice = indiceAtual + 1;
  let proximaRodada = Number(campanha.rodadaAtual || 1);

  if (proximoIndice >= ordemAtual.length) {
    proximoIndice = 0;
    proximaRodada += 1;
  }

  const proximoTurno = ordemAtual[proximoIndice];

  try {
    await updateDoc(doc(db, "campanhas", campanha.id), {
      rodadaAtual: proximaRodada,
      turnoAtual: proximoIndice + 1,
      turnoIndice: proximoIndice,
      personagemTurnoId: proximoTurno?.personagemId || "",
      personagemTurnoNome: proximoTurno?.nome || "",
      personagemTurnoDonoId: proximoTurno?.donoId || "",
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
  const ordemTurnos = Array.isArray(campanha.ordemTurnos) ? campanha.ordemTurnos : [];
  const primeiro = ordemTurnos[0] || null;

  try {
    await updateDoc(doc(db, "campanhas", campanha.id), {
      rodadaAtual: proximaRodada,
      turnoAtual: primeiro ? 1 : 0,
      turnoIndice: primeiro ? 0 : -1,
      personagemTurnoId: primeiro?.personagemId || "",
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

function criarOrdemTurnos(personagens) {
  return personagens
    .map((personagem) => ({
      personagemId: personagem.id,
      nome: personagem.nome || "Personagem sem nome",
      donoId: personagem.donoId || "",
      donoNome: personagem.donoNome || "",
      velocidade: Number(personagem.velocidade || 0),
      hpAtual: Number(personagem.hpAtual || 0),
      hpMax: Number(personagem.hpMax || 0),
      manaAtual: Number(personagem.manaAtual || 0),
      manaMax: Number(personagem.manaMax || 0)
    }))
    .sort((a, b) => {
      if (b.velocidade !== a.velocidade) {
        return b.velocidade - a.velocidade;
      }

      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
    });
}

function abrirModalRolagemSessao(campanha) {
  fecharModalRolagemSessao();

  campanhaSelecionadaRolagem = campanha;

  const personagens = obterPersonagensDisponiveisParaRolagem(campanha);

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
    if (event.target === overlay) {
      fecharModalRolagemSessao();
    }
  });
}

function fecharModalRolagemSessao() {
  const overlay = document.getElementById("modalRolagemSessao");

  if (overlay) {
    overlay.remove();
  }

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

  const personagens = obterPersonagensDisponiveisParaRolagem(campanhaSelecionadaRolagem);
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

function obterPersonagensDisponiveisParaRolagem(campanha) {
  const personagens = obterPersonagensDaCampanha(campanha);

  if (state.dadosUsuarioAtual?.tipo === "mestre") {
    return personagens;
  }

  return personagens.filter((personagem) => personagem.donoId === state.usuarioAtual.uid);
}

function obterPersonagensDaCampanha(campanha) {
  if (!Array.isArray(state.personagens)) return [];

  return state.personagens
    .filter((personagem) => personagem.campanhaId === campanha.id)
    .sort(ordenarPersonagens);
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

    const podeEditar = podeControlarCampanha(campanha);
    const sessaoAtiva = campanha.status === "ativa" || campanha.sessaoAtiva === true;
    const statusTexto = obterTextoStatusCampanha(campanha);
    const statusClasse = obterClasseStatusCampanha(campanha);
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
        <span><b>Código</b>${escapeHtml(campanha.codigo || "Sem código")}</span>
      </div>

      <div class="campaign-characters-panel">
        <div class="campaign-section-title">
          <span>Personagens da campanha</span>
          <strong>${personagens.length}</strong>
        </div>

        ${montarPersonagensCampanha(personagens, campanha)}
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

    vincularEventosCardCampanha(card, campanha);

    lista.appendChild(card);
  });
}

function vincularEventosCardCampanha(card, campanha) {
  const botaoIniciar = card.querySelector(".iniciar-sessao-campanha");
  const botaoPausar = card.querySelector(".pausar-sessao-campanha");
  const botaoEncerrar = card.querySelector(".encerrar-sessao-campanha");
  const botaoAvancarTurno = card.querySelector(".avancar-turno-campanha");
  const botaoAvancarRodada = card.querySelector(".avancar-rodada-campanha");
  const botaoEditar = card.querySelector(".editar-campanha");
  const botaoExcluir = card.querySelector(".excluir-campanha");
  const botaoRolar = card.querySelector(".rolar-d20-sessao");

  if (botaoIniciar) {
    botaoIniciar.addEventListener("click", () => iniciarSessaoCampanha(campanha));
  }

  if (botaoPausar) {
    botaoPausar.addEventListener("click", () => pausarSessaoCampanha(campanha));
  }

  if (botaoEncerrar) {
    botaoEncerrar.addEventListener("click", () => encerrarSessaoCampanha(campanha));
  }

  if (botaoAvancarTurno) {
    botaoAvancarTurno.addEventListener("click", () => avancarTurnoCampanha(campanha));
  }

  if (botaoAvancarRodada) {
    botaoAvancarRodada.addEventListener("click", () => avancarRodadaCampanha(campanha));
  }

  if (botaoEditar) {
    botaoEditar.addEventListener("click", () => abrirEdicaoCampanha(campanha));
  }

  if (botaoExcluir) {
    botaoExcluir.addEventListener("click", () => excluirCampanha(campanha));
  }

  if (botaoRolar) {
    botaoRolar.addEventListener("click", () => abrirModalRolagemSessao(campanha));
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

  return `
    <div class="campaign-character-grid">
      ${personagens
        .map((personagem) => {
          const turnoAtual = campanha.personagemTurnoId === personagem.id;

          return `
            <div class="campaign-character-card ${turnoAtual ? "active-turn" : ""}">
              <div>
                <strong>${escapeHtml(personagem.nome || "Personagem sem nome")}</strong>
                <span>${escapeHtml(personagem.donoNome || "Jogador não informado")}</span>
              </div>

              <div class="campaign-character-stats">
                <span>HP ${Number(personagem.hpAtual || 0)}/${Number(personagem.hpMax || 0)}</span>
                <span>Mana ${Number(personagem.manaAtual || 0)}/${Number(personagem.manaMax || 0)}</span>
                <span>Vel. ${Number(personagem.velocidade || 0)}</span>
              </div>
            </div>
          `;
        })
        .join("")}
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

  return `
    <div class="session-history-list">
      ${historico
        .slice(0, 8)
        .map((evento) => {
          return `
            <div class="session-history-item">
              <p>${escapeHtml(evento.texto || "Evento sem descrição.")}</p>
              <span>${escapeHtml(evento.criadoEmTexto || "")}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function montarBotoesControleSessao(campanha, sessaoAtiva) {
  if (sessaoAtiva) {
    return `
      <button class="secondary-btn rolar-d20-sessao">Rolar D20</button>
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

function obterTextoStatusCampanha(campanha) {
  if (campanha.status === "ativa" || campanha.sessaoAtiva === true) {
    return "Sessão ativa";
  }

  if (campanha.status === "pausada") {
    return "Sessão pausada";
  }

  if (campanha.status === "encerrada") {
    return "Sessão encerrada";
  }

  return "Aguardando início";
}

function obterClasseStatusCampanha(campanha) {
  if (campanha.status === "ativa" || campanha.sessaoAtiva === true) {
    return "session-active";
  }

  if (campanha.status === "pausada") {
    return "session-paused";
  }

  if (campanha.status === "encerrada") {
    return "session-ended";
  }

  return "session-waiting";
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

    .campaign-characters-panel,
    .campaign-turn-panel,
    .campaign-history-panel {
      display: grid;
      gap: 14px;
      padding: 18px;
      border-radius: 20px;
      background: rgba(255,255,255,0.035);
      border: 1px solid rgba(255,255,255,0.08);
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
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
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

    .campaign-character-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .campaign-character-stats span {
      padding: 6px 9px;
      border-radius: 999px;
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.78);
      font-size: 12px;
      font-weight: 800;
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
      .campaign-session-stats {
        grid-template-columns: 1fr;
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