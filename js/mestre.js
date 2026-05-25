import {
  db,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp
} from "./firebase.js";

import { state } from "./state.js";
import { onPageLoaded } from "./navigation.js";
import { abrirFichaPersonagem } from "./ficha.js";
import { mostrarModal, confirmarModal } from "./ui.js";

let personagensMestre = [];
let monstrosDisponiveis = [];
let bossesDisponiveis = [];
let sessaoAtual = null;

let unsubscribePersonagens = null;
let unsubscribeMonstros = null;
let unsubscribeBosses = null;
let unsubscribeSessao = null;

function campanhaSelecionadaId() {
  return document.getElementById("mestreCampanhaSelect")?.value || "";
}

function valorAjuste() {
  return Number(document.getElementById("mestreValorAjuste")?.value) || 0;
}

function clamp(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function preencherCampanhasMestre() {
  const select = document.getElementById("mestreCampanhaSelect");

  if (!select) return;

  select.innerHTML = "";

  const campanhas = state.minhasCampanhas || [];

  if (campanhas.length === 0) {
    select.innerHTML = `<option value="">Nenhuma campanha encontrada</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma campanha</option>`;

  campanhas.forEach((campanha) => {
    const option = document.createElement("option");
    option.value = campanha.id;
    option.textContent = campanha.nome || "Campanha sem nome";
    select.appendChild(option);
  });
}

function carregarPersonagensDaCampanha() {
  if (unsubscribePersonagens) {
    unsubscribePersonagens();
    unsubscribePersonagens = null;
  }

  const campanhaId = campanhaSelecionadaId();

  personagensMestre = [];
  renderizarPersonagensMestre();

  if (!campanhaId) return;

  const consulta = query(
    collection(db, "personagens"),
    where("campanhaId", "==", campanhaId)
  );

  unsubscribePersonagens = onSnapshot(consulta, (snapshot) => {
    personagensMestre = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    renderizarPersonagensMestre();
  });
}

function carregarSessaoCampanha() {
  if (unsubscribeSessao) {
    unsubscribeSessao();
    unsubscribeSessao = null;
  }

  const campanhaId = campanhaSelecionadaId();

  sessaoAtual = null;
  renderizarSessaoMestre();

  if (!campanhaId) return;

  unsubscribeSessao = onSnapshot(doc(db, "sessoes", campanhaId), (snapshot) => {
    if (snapshot.exists()) {
      sessaoAtual = {
        id: snapshot.id,
        ...snapshot.data()
      };
    } else {
      sessaoAtual = null;
    }

    renderizarSessaoMestre();
    renderizarInimigosSessao();
  });
}

function carregarMonstrosEBosses() {
  if (!unsubscribeMonstros) {
    unsubscribeMonstros = onSnapshot(query(collection(db, "monstros"), orderBy("nome", "asc")), (snapshot) => {
      monstrosDisponiveis = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      preencherSelectMonstros();
    });
  }

  if (!unsubscribeBosses) {
    unsubscribeBosses = onSnapshot(query(collection(db, "bosses"), orderBy("nome", "asc")), (snapshot) => {
      bossesDisponiveis = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      preencherSelectBosses();
    });
  }
}

function preencherSelectMonstros() {
  const select = document.getElementById("selectMonstroSessao");

  if (!select) return;

  select.innerHTML = "";

  if (monstrosDisponiveis.length === 0) {
    select.innerHTML = `<option value="">Nenhum monstro cadastrado</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione um monstro</option>`;

  monstrosDisponiveis.forEach((monstro) => {
    const option = document.createElement("option");
    option.value = monstro.id;
    option.textContent = monstro.nome || "Sem nome";
    select.appendChild(option);
  });
}

function preencherSelectBosses() {
  const select = document.getElementById("selectBossSessao");

  if (!select) return;

  select.innerHTML = "";

  if (bossesDisponiveis.length === 0) {
    select.innerHTML = `<option value="">Nenhum boss cadastrado</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione um boss</option>`;

  bossesDisponiveis.forEach((boss) => {
    const option = document.createElement("option");
    option.value = boss.id;
    option.textContent = boss.nome || "Sem nome";
    select.appendChild(option);
  });
}

function renderizarSessaoMestre() {
  const rodada = document.getElementById("mestreRodadaAtual");
  const turno = document.getElementById("mestreTurnoAtual");
  const status = document.getElementById("mestreStatusSessao");

  if (!rodada || !turno || !status) return;

  if (!campanhaSelecionadaId()) {
    rodada.textContent = "0";
    turno.textContent = "0";
    status.textContent = "Nenhuma campanha selecionada.";
    return;
  }

  if (!sessaoAtual) {
    rodada.textContent = "0";
    turno.textContent = "0";
    status.textContent = "Sessão ainda não iniciada.";
    return;
  }

  rodada.textContent = sessaoAtual.rodada || 0;
  turno.textContent = sessaoAtual.turno || 0;
  status.textContent = sessaoAtual.ativa ? "Em andamento" : "Encerrada";
}

function renderizarPersonagensMestre() {
  const tabela = document.getElementById("tabelaPersonagensMestre");

  if (!tabela) return;

  tabela.innerHTML = "";

  if (!campanhaSelecionadaId()) {
    tabela.innerHTML = `
      <tr>
        <td colspan="8">Selecione uma campanha para carregar os personagens.</td>
      </tr>
    `;
    return;
  }

  if (personagensMestre.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="8">Nenhum personagem encontrado nesta campanha.</td>
      </tr>
    `;
    return;
  }

  personagensMestre.forEach((personagem) => {
    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${personagem.nome || "Sem nome"}</td>
      <td>${personagem.donoNome || "Não informado"}</td>
      <td>${personagem.hpAtual ?? 0}/${personagem.hpMax ?? 0}</td>
      <td>${personagem.manaAtual ?? 0}/${personagem.manaMax ?? 0}</td>
      <td>${personagem.fome || 0}%</td>
      <td>${personagem.fadiga || 0}%</td>
      <td>${personagem.condicao || "Normal"}</td>
      <td>
        <div class="action-row">
          <button class="small-btn hp-menos">-HP</button>
          <button class="small-btn hp-mais">+HP</button>
          <button class="small-btn mana-menos">-Mana</button>
          <button class="small-btn mana-mais">+Mana</button>
          <button class="small-btn fome-mais">+Fome</button>
          <button class="small-btn fadiga-mais">+Fadiga</button>
          <button class="secondary-btn abrir-ficha">Ficha</button>
          <button class="small-btn danger possessao">Possessão</button>
        </div>
      </td>
    `;

    linha.querySelector(".hp-menos").addEventListener("click", () => ajustarPersonagem(personagem, "hpAtual", -valorAjuste(), 0, personagem.hpMax || 0));
    linha.querySelector(".hp-mais").addEventListener("click", () => ajustarPersonagem(personagem, "hpAtual", valorAjuste(), 0, personagem.hpMax || 0));
    linha.querySelector(".mana-menos").addEventListener("click", () => ajustarPersonagem(personagem, "manaAtual", -valorAjuste(), 0, personagem.manaMax || 0));
    linha.querySelector(".mana-mais").addEventListener("click", () => ajustarPersonagem(personagem, "manaAtual", valorAjuste(), 0, personagem.manaMax || 0));
    linha.querySelector(".fome-mais").addEventListener("click", () => ajustarPersonagem(personagem, "fome", valorAjuste(), 0, 100));
    linha.querySelector(".fadiga-mais").addEventListener("click", () => ajustarPersonagem(personagem, "fadiga", valorAjuste(), 0, 100));
    linha.querySelector(".abrir-ficha").addEventListener("click", () => abrirFichaPersonagem(personagem));
    linha.querySelector(".possessao").addEventListener("click", () => ativarPossessao(personagem));

    tabela.appendChild(linha);
  });
}

async function ajustarPersonagem(personagem, campo, variacao, minimo, maximo) {
  const valorAtual = Number(personagem[campo]) || 0;
  const novoValor = clamp(valorAtual + variacao, minimo, maximo);

  await updateDoc(doc(db, "personagens", personagem.id), {
    [campo]: novoValor,
    atualizadoEm: serverTimestamp()
  });
}

async function ativarPossessao(personagem) {
  const confirmar = await confirmarModal({
    titulo: "Ativar possessão",
    mensagem: `Deseja assumir o controle da ficha de “${personagem.nome}”?`,
    confirmarTexto: "Assumir controle",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  await updateDoc(doc(db, "personagens", personagem.id), {
    posse: {
      ativa: true,
      mestreId: state.usuarioAtual.uid,
      mestreNome: state.dadosUsuarioAtual?.nome || state.usuarioAtual.email,
      iniciadaEm: new Date().toISOString()
    },
    atualizadoEm: serverTimestamp()
  });

  abrirFichaPersonagem({
    ...personagem,
    posse: {
      ativa: true,
      mestreId: state.usuarioAtual.uid
    }
  });
}

async function iniciarSessao() {
  const campanhaId = campanhaSelecionadaId();

  if (!campanhaId) {
    await mostrarModal("Selecione uma campanha primeiro.", "Campo obrigatório");
    return;
  }

  await setDoc(doc(db, "sessoes", campanhaId), {
    campanhaId,
    ativa: true,
    rodada: 1,
    turno: 1,
    inimigos: sessaoAtual?.inimigos || [],
    atualizadoEm: serverTimestamp()
  }, { merge: true });

  await mostrarModal("Sessão iniciada.", "Sessão", "success");
}

async function encerrarSessao() {
  const campanhaId = campanhaSelecionadaId();

  if (!campanhaId) {
    await mostrarModal("Selecione uma campanha primeiro.", "Campo obrigatório");
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Encerrar sessão",
    mensagem: "Deseja encerrar a sessão atual?",
    confirmarTexto: "Encerrar",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  await setDoc(doc(db, "sessoes", campanhaId), {
    ativa: false,
    atualizadoEm: serverTimestamp()
  }, { merge: true });

  await mostrarModal("Sessão encerrada.", "Sessão", "success");
}

async function proximoTurno() {
  const campanhaId = campanhaSelecionadaId();

  if (!campanhaId) {
    await mostrarModal("Selecione uma campanha primeiro.", "Campo obrigatório");
    return;
  }

  const turnoAtual = sessaoAtual?.turno || 0;
  const rodadaAtual = sessaoAtual?.rodada || 1;

  const novoTurno = turnoAtual + 1;
  const novaRodada = novoTurno > Math.max(personagensMestre.length, 1)
    ? rodadaAtual + 1
    : rodadaAtual;

  const turnoFinal = novoTurno > Math.max(personagensMestre.length, 1)
    ? 1
    : novoTurno;

  await setDoc(doc(db, "sessoes", campanhaId), {
    campanhaId,
    ativa: true,
    rodada: novaRodada,
    turno: turnoFinal,
    atualizadoEm: serverTimestamp()
  }, { merge: true });

  await aplicarFomeFadiga(false);
  await reduzirCooldownsPersonagens();

  await mostrarModal("Turno avançado.", "Turno", "success");
}

async function aplicarFomeFadiga(exibirModal = true) {
  const fome = Number(document.getElementById("fomePorTurno")?.value) || 0;
  const fadiga = Number(document.getElementById("fadigaPorTurno")?.value) || 0;

  const atualizacoes = personagensMestre.map((personagem) => {
    return updateDoc(doc(db, "personagens", personagem.id), {
      fome: clamp((personagem.fome || 0) + fome, 0, 100),
      fadiga: clamp((personagem.fadiga || 0) + fadiga, 0, 100),
      atualizadoEm: serverTimestamp()
    });
  });

  await Promise.all(atualizacoes);

  if (exibirModal) {
    await mostrarModal("Fome e fadiga aplicadas aos personagens.", "Atualização realizada", "success");
  }
}

async function reduzirCooldownsPersonagens() {
  const atualizacoes = personagensMestre.map((personagem) => {
    const cooldowns = personagem.cooldowns || {};
    const novosCooldowns = {};

    Object.entries(cooldowns).forEach(([id, valor]) => {
      const novoValor = Math.max(0, Number(valor) - 1);

      if (novoValor > 0) {
        novosCooldowns[id] = novoValor;
      }
    });

    return updateDoc(doc(db, "personagens", personagem.id), {
      cooldowns: novosCooldowns,
      atualizadoEm: serverTimestamp()
    });
  });

  await Promise.all(atualizacoes);
}

async function adicionarInimigo(tipo) {
  const campanhaId = campanhaSelecionadaId();

  if (!campanhaId) {
    await mostrarModal("Selecione uma campanha primeiro.", "Campo obrigatório");
    return;
  }

  const selectId = tipo === "monstro" ? "selectMonstroSessao" : "selectBossSessao";
  const lista = tipo === "monstro" ? monstrosDisponiveis : bossesDisponiveis;
  const id = document.getElementById(selectId)?.value;

  if (!id) {
    await mostrarModal("Selecione uma opção primeiro.", "Campo obrigatório");
    return;
  }

  const base = lista.find((item) => item.id === id);

  if (!base) {
    await mostrarModal("Registro não encontrado.", "Erro", "danger");
    return;
  }

  const inimigos = Array.isArray(sessaoAtual?.inimigos) ? [...sessaoAtual.inimigos] : [];

  inimigos.push({
    instanciaId: `${tipo}-${id}-${Date.now()}`,
    tipo,
    origemId: id,
    nome: base.nome || "Sem nome",
    hpMax: base.hp || 0,
    hpAtual: base.hp || 0,
    manaMax: base.mana || 0,
    manaAtual: base.mana || 0,
    dados: base
  });

  await setDoc(doc(db, "sessoes", campanhaId), {
    campanhaId,
    inimigos,
    atualizadoEm: serverTimestamp()
  }, { merge: true });

  await mostrarModal(`${tipo === "monstro" ? "Monstro" : "Boss"} adicionado à sessão.`, "Inimigo adicionado", "success");
}

function renderizarInimigosSessao() {
  const lista = document.getElementById("listaInimigosSessao");

  if (!lista) return;

  const inimigos = sessaoAtual?.inimigos || [];

  lista.innerHTML = "";

  if (!campanhaSelecionadaId()) {
    lista.innerHTML = "<p>Nenhuma campanha selecionada.</p>";
    return;
  }

  if (inimigos.length === 0) {
    lista.innerHTML = "<p>Nenhum inimigo adicionado à sessão.</p>";
    return;
  }

  inimigos.forEach((inimigo) => {
    const card = document.createElement("div");
    card.classList.add("resource-card");

    card.innerHTML = `
      <div class="resource-card-header">
        <h4>${inimigo.nome}</h4>
        <span>${inimigo.tipo}</span>
      </div>

      <div class="resource-card-stats">
        <span>HP: <b>${inimigo.hpAtual}/${inimigo.hpMax}</b></span>
        <span>Mana: <b>${inimigo.manaAtual}/${inimigo.manaMax}</b></span>
      </div>

      <div class="action-row">
        <button class="small-btn hp-inimigo-menos">-HP</button>
        <button class="small-btn hp-inimigo-mais">+HP</button>
        <button class="small-btn danger remover-inimigo">Remover</button>
      </div>
    `;

    card.querySelector(".hp-inimigo-menos").addEventListener("click", () => ajustarInimigo(inimigo.instanciaId, "hpAtual", -valorAjuste()));
    card.querySelector(".hp-inimigo-mais").addEventListener("click", () => ajustarInimigo(inimigo.instanciaId, "hpAtual", valorAjuste()));
    card.querySelector(".remover-inimigo").addEventListener("click", () => removerInimigo(inimigo.instanciaId));

    lista.appendChild(card);
  });
}

async function ajustarInimigo(instanciaId, campo, variacao) {
  const campanhaId = campanhaSelecionadaId();
  const inimigos = Array.isArray(sessaoAtual?.inimigos) ? [...sessaoAtual.inimigos] : [];

  const atualizados = inimigos.map((inimigo) => {
    if (inimigo.instanciaId !== instanciaId) return inimigo;

    const maximo = campo === "hpAtual" ? inimigo.hpMax : inimigo.manaMax;

    return {
      ...inimigo,
      [campo]: clamp((inimigo[campo] || 0) + variacao, 0, maximo || 99999)
    };
  });

  await setDoc(doc(db, "sessoes", campanhaId), {
    inimigos: atualizados,
    atualizadoEm: serverTimestamp()
  }, { merge: true });
}

async function removerInimigo(instanciaId) {
  const campanhaId = campanhaSelecionadaId();

  const confirmar = await confirmarModal({
    titulo: "Remover inimigo",
    mensagem: "Deseja remover este inimigo da sessão?",
    confirmarTexto: "Remover",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  const inimigos = (sessaoAtual?.inimigos || []).filter((inimigo) => inimigo.instanciaId !== instanciaId);

  await setDoc(doc(db, "sessoes", campanhaId), {
    inimigos,
    atualizadoEm: serverTimestamp()
  }, { merge: true });
}

async function deletarColecao(nomeColecao) {
  const snapshot = await getDocs(collection(db, nomeColecao));

  const exclusoes = snapshot.docs.map((documento) => {
    return deleteDoc(doc(db, nomeColecao, documento.id));
  });

  await Promise.all(exclusoes);
}

async function limparTodosDados() {
  if (!state.usuarioAtual || state.dadosUsuarioAtual?.tipo !== "mestre") {
    await mostrarModal("Apenas o Mestre pode limpar os dados do sistema.", "Permissão negada", "danger");
    return;
  }

  const primeiraConfirmacao = await confirmarModal({
    titulo: "Limpar todos os dados",
    mensagem: "Esta ação apagará campanhas, personagens dos jogadores, raças, classes, subclasses, elementos, habilidades, itens, pets, monstros, bosses e sessões. Deseja continuar?",
    confirmarTexto: "Continuar",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!primeiraConfirmacao) return;

  const segundaConfirmacao = await confirmarModal({
    titulo: "Confirmação final",
    mensagem: "Essa ação não pode ser desfeita. Confirma que deseja apagar TODOS os dados de jogo do sistema?",
    confirmarTexto: "Apagar tudo",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!segundaConfirmacao) return;

  try {
    const colecoes = [
      "personagens",
      "campanhas",
      "sessoes",
      "racas",
      "classes",
      "subclasses",
      "elementos",
      "habilidades",
      "itens",
      "pets",
      "monstros",
      "bosses"
    ];

    for (const nomeColecao of colecoes) {
      await deletarColecao(nomeColecao);
    }

    await mostrarModal("Todos os dados de jogo foram apagados com sucesso.", "Limpeza concluída", "success");
  } catch (erro) {
    console.error("Erro ao limpar dados:", erro);
    await mostrarModal("Erro ao limpar os dados do sistema. Verifique as permissões do Firestore.", "Erro", "danger");
  }
}

export function initMestre() {
  onPageLoaded((pagina) => {
    if (pagina !== "mestre") return;

    preencherCampanhasMestre();
    carregarMonstrosEBosses();

    const selectCampanha = document.getElementById("mestreCampanhaSelect");

    if (selectCampanha) {
      selectCampanha.addEventListener("change", () => {
        carregarPersonagensDaCampanha();
        carregarSessaoCampanha();
      });
    }

    document.getElementById("btnIniciarSessaoMestre")?.addEventListener("click", iniciarSessao);
    document.getElementById("btnEncerrarSessaoMestre")?.addEventListener("click", encerrarSessao);
    document.getElementById("btnProximoTurno")?.addEventListener("click", proximoTurno);
    document.getElementById("btnAplicarFomeFadiga")?.addEventListener("click", () => aplicarFomeFadiga(true));
    document.getElementById("btnAdicionarMonstroSessao")?.addEventListener("click", () => adicionarInimigo("monstro"));
    document.getElementById("btnAdicionarBossSessao")?.addEventListener("click", () => adicionarInimigo("boss"));
    document.getElementById("btnLimparTodosDados")?.addEventListener("click", limparTodosDados);
  });
}