import {
  db,
  auth,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebase.js";

document.body.classList.add("deslogado");

let usuarioAtual = null;
let dadosUsuarioAtual = null;
let inscricaoRacas = null;
let inscricaoCampanhasMestre = null;
let inscricaoParticipacoesJogador = null;

const tabLogin = document.getElementById("tabLogin");
const tabCadastro = document.getElementById("tabCadastro");
const loginForm = document.getElementById("loginForm");
const cadastroForm = document.getElementById("cadastroForm");
const authMensagem = document.getElementById("authMensagem");

const btnLogin = document.getElementById("btnLogin");
const btnCadastro = document.getElementById("btnCadastro");
const btnSair = document.getElementById("btnSair");

const usuarioNome = document.getElementById("usuarioNome");
const usuarioTipo = document.getElementById("usuarioTipo");

const contadorCampanhas = document.getElementById("contadorCampanhas");
const contadorRacas = document.getElementById("contadorRacas");

function mostrarMensagemAuth(mensagem) {
  if (authMensagem) {
    authMensagem.textContent = mensagem;
  }
}

if (tabLogin && tabCadastro) {
  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabCadastro.classList.remove("active");
    loginForm.classList.remove("hidden");
    cadastroForm.classList.add("hidden");
    mostrarMensagemAuth("");
  });

  tabCadastro.addEventListener("click", () => {
    tabCadastro.classList.add("active");
    tabLogin.classList.remove("active");
    cadastroForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    mostrarMensagemAuth("");
  });
}

if (btnCadastro) {
  btnCadastro.addEventListener("click", async () => {
    const nome = document.getElementById("cadastroNome").value.trim();
    const email = document.getElementById("cadastroEmail").value.trim();
    const senha = document.getElementById("cadastroSenha").value;
    const tipo = document.getElementById("cadastroTipo").value;

    if (!nome || !email || !senha) {
      mostrarMensagemAuth("Preencha nome, e-mail e senha.");
      return;
    }

    if (senha.length < 6) {
      mostrarMensagemAuth("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    try {
      const credencial = await createUserWithEmailAndPassword(auth, email, senha);
      const uid = credencial.user.uid;

      await setDoc(doc(db, "usuarios", uid), {
        nome,
        email,
        tipo,
        criadoEm: serverTimestamp()
      });

      document.getElementById("cadastroNome").value = "";
      document.getElementById("cadastroEmail").value = "";
      document.getElementById("cadastroSenha").value = "";
      document.getElementById("cadastroTipo").value = "jogador";

      mostrarMensagemAuth("Conta criada com sucesso.");
    } catch (erro) {
      console.error("Erro ao criar conta:", erro);

      if (erro.code === "auth/email-already-in-use") {
        mostrarMensagemAuth("Esse e-mail já está em uso.");
      } else if (erro.code === "auth/invalid-email") {
        mostrarMensagemAuth("E-mail inválido.");
      } else {
        mostrarMensagemAuth("Erro ao criar conta. Tente novamente.");
      }
    }
  });
}

if (btnLogin) {
  btnLogin.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;

    if (!email || !senha) {
      mostrarMensagemAuth("Digite e-mail e senha.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      mostrarMensagemAuth("");
    } catch (erro) {
      console.error("Erro ao entrar:", erro);

      if (erro.code === "auth/invalid-email") {
        mostrarMensagemAuth("E-mail inválido.");
      } else if (erro.code === "auth/invalid-credential") {
        mostrarMensagemAuth("E-mail ou senha incorretos.");
      } else {
        mostrarMensagemAuth("Erro ao entrar. Verifique e-mail e senha.");
      }
    }
  });
}

if (btnSair) {
  btnSair.addEventListener("click", async () => {
    await signOut(auth);
  });
}

onAuthStateChanged(auth, async (usuario) => {
  if (usuario) {
    usuarioAtual = usuario;

    const usuarioRef = doc(db, "usuarios", usuario.uid);
    const usuarioSnap = await getDoc(usuarioRef);

    if (usuarioSnap.exists()) {
      dadosUsuarioAtual = usuarioSnap.data();
    } else {
      dadosUsuarioAtual = {
        nome: usuario.email,
        email: usuario.email,
        tipo: "jogador"
      };
    }

    if (usuarioNome) {
      usuarioNome.textContent = dadosUsuarioAtual.nome || usuario.email;
    }

    if (usuarioTipo) {
      usuarioTipo.textContent = dadosUsuarioAtual.tipo || "jogador";
    }

    document.body.classList.remove("deslogado");
    document.body.classList.add("logado");

    controlarPermissoesPorTipo();
    carregarRacasDoFirebase();
    carregarCampanhas();
    abrirPagina("dashboard");
  } else {
    usuarioAtual = null;
    dadosUsuarioAtual = null;

    cancelarInscricoesFirebase();

    document.body.classList.remove("logado");
    document.body.classList.add("deslogado");
  }
});

function cancelarInscricoesFirebase() {
  if (inscricaoRacas) {
    inscricaoRacas();
    inscricaoRacas = null;
  }

  if (inscricaoCampanhasMestre) {
    inscricaoCampanhasMestre();
    inscricaoCampanhasMestre = null;
  }

  if (inscricaoParticipacoesJogador) {
    inscricaoParticipacoesJogador();
    inscricaoParticipacoesJogador = null;
  }
}

function controlarPermissoesPorTipo() {
  const tipo = dadosUsuarioAtual?.tipo;

  const botaoCadastros = document.querySelector('[data-page="cadastros"]');
  const botaoMestre = document.querySelector('[data-page="mestre"]');
  const botaoSessao = document.querySelector('[data-page="sessao"]');
  const areaCriarCampanha = document.querySelector(".mestre-only");

  if (tipo === "mestre") {
    if (botaoCadastros) botaoCadastros.style.display = "block";
    if (botaoMestre) botaoMestre.style.display = "block";
    if (botaoSessao) botaoSessao.style.display = "block";
    if (areaCriarCampanha) areaCriarCampanha.style.display = "block";
  } else {
    if (botaoCadastros) botaoCadastros.style.display = "none";
    if (botaoMestre) botaoMestre.style.display = "none";
    if (botaoSessao) botaoSessao.style.display = "none";
    if (areaCriarCampanha) areaCriarCampanha.style.display = "none";
  }
}

const navButtons = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");
const pageTargetButtons = document.querySelectorAll("[data-page-target]");

function abrirPagina(pageId) {
  pages.forEach((page) => {
    page.classList.remove("active-page");
  });

  navButtons.forEach((button) => {
    button.classList.remove("active");
  });

  const page = document.getElementById(pageId);
  const navButton = document.querySelector(`[data-page="${pageId}"]`);

  if (page) {
    page.classList.add("active-page");
  }

  if (navButton) {
    navButton.classList.add("active");
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const pageId = button.getAttribute("data-page");
    abrirPagina(pageId);
  });
});

pageTargetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const pageId = button.getAttribute("data-page-target");
    abrirPagina(pageId);
  });
});

function gerarCodigoCampanha() {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numeros = "0123456789";
  let codigo = "RPG-";

  for (let i = 0; i < 3; i++) {
    codigo += letras[Math.floor(Math.random() * letras.length)];
  }

  for (let i = 0; i < 3; i++) {
    codigo += numeros[Math.floor(Math.random() * numeros.length)];
  }

  return codigo;
}

const btnCriarCampanha = document.getElementById("btnCriarCampanha");
const btnEntrarCampanha = document.getElementById("btnEntrarCampanha");
const listaCampanhas = document.getElementById("listaCampanhas");

async function criarCampanha() {
  if (!usuarioAtual) {
    alert("Você precisa estar logado.");
    return;
  }

  if (dadosUsuarioAtual?.tipo !== "mestre") {
    alert("Apenas o Mestre pode criar campanhas.");
    return;
  }

  const nome = document.getElementById("campanhaNome").value.trim();
  const descricao = document.getElementById("campanhaDescricao").value.trim();

  if (!nome) {
    alert("Digite o nome da campanha.");
    return;
  }

  const codigoEntrada = gerarCodigoCampanha();

  try {
    const campanhaRef = await addDoc(collection(db, "campanhas"), {
      nome,
      descricao,
      codigoEntrada,
      mestreId: usuarioAtual.uid,
      mestreNome: dadosUsuarioAtual.nome || usuarioAtual.email,
      criadoEm: serverTimestamp()
    });

    await setDoc(doc(db, "participantesCampanha", `${campanhaRef.id}_${usuarioAtual.uid}`), {
      campanhaId: campanhaRef.id,
      usuarioId: usuarioAtual.uid,
      usuarioNome: dadosUsuarioAtual.nome || usuarioAtual.email,
      usuarioEmail: usuarioAtual.email,
      tipo: "mestre",
      entrouEm: serverTimestamp()
    });

    document.getElementById("campanhaNome").value = "";
    document.getElementById("campanhaDescricao").value = "";

    alert(`Campanha criada com sucesso. Código: ${codigoEntrada}`);
  } catch (erro) {
    console.error("Erro ao criar campanha:", erro);
    alert("Erro ao criar campanha.");
  }
}

async function entrarEmCampanha() {
  if (!usuarioAtual) {
    alert("Você precisa estar logado.");
    return;
  }

  const codigo = document.getElementById("codigoCampanhaEntrada").value.trim().toUpperCase();

  if (!codigo) {
    alert("Digite o código da campanha.");
    return;
  }

  try {
    const campanhasRef = collection(db, "campanhas");
    const consulta = query(campanhasRef, where("codigoEntrada", "==", codigo));
    const resultado = await getDocs(consulta);

    if (resultado.empty) {
      alert("Nenhuma campanha encontrada com esse código.");
      return;
    }

    const campanhaDoc = resultado.docs[0];
    const campanha = campanhaDoc.data();

    await setDoc(doc(db, "participantesCampanha", `${campanhaDoc.id}_${usuarioAtual.uid}`), {
      campanhaId: campanhaDoc.id,
      usuarioId: usuarioAtual.uid,
      usuarioNome: dadosUsuarioAtual.nome || usuarioAtual.email,
      usuarioEmail: usuarioAtual.email,
      tipo: dadosUsuarioAtual.tipo || "jogador",
      mestreId: campanha.mestreId,
      entrouEm: serverTimestamp()
    });

    document.getElementById("codigoCampanhaEntrada").value = "";

    alert(`Você entrou na campanha: ${campanha.nome}`);
  } catch (erro) {
    console.error("Erro ao entrar na campanha:", erro);
    alert("Erro ao entrar na campanha.");
  }
}

function carregarCampanhas() {
  if (!listaCampanhas || !usuarioAtual || !dadosUsuarioAtual) return;

  if (inscricaoCampanhasMestre) {
    inscricaoCampanhasMestre();
    inscricaoCampanhasMestre = null;
  }

  if (inscricaoParticipacoesJogador) {
    inscricaoParticipacoesJogador();
    inscricaoParticipacoesJogador = null;
  }

  listaCampanhas.innerHTML = "<p>Carregando campanhas...</p>";

  if (dadosUsuarioAtual.tipo === "mestre") {
    carregarCampanhasDoMestre();
  } else {
    carregarCampanhasDoJogador();
  }
}

function carregarCampanhasDoMestre() {
  const campanhasRef = collection(db, "campanhas");
  const consulta = query(campanhasRef, where("mestreId", "==", usuarioAtual.uid));

  inscricaoCampanhasMestre = onSnapshot(consulta, (snapshot) => {
    listaCampanhas.innerHTML = "";

    if (contadorCampanhas) {
      contadorCampanhas.textContent = snapshot.size;
    }

    if (snapshot.empty) {
      listaCampanhas.innerHTML = "<p>Nenhuma campanha criada ainda.</p>";
      return;
    }

    snapshot.forEach((documento) => {
      const campanha = documento.data();
      const card = criarCardCampanha(campanha, "mestre");
      listaCampanhas.appendChild(card);
    });
  }, (erro) => {
    console.error("Erro ao carregar campanhas do mestre:", erro);
    listaCampanhas.innerHTML = "<p>Erro ao carregar campanhas.</p>";
  });
}

function carregarCampanhasDoJogador() {
  const participantesRef = collection(db, "participantesCampanha");
  const consulta = query(participantesRef, where("usuarioId", "==", usuarioAtual.uid));

  inscricaoParticipacoesJogador = onSnapshot(consulta, async (snapshot) => {
    listaCampanhas.innerHTML = "";

    if (contadorCampanhas) {
      contadorCampanhas.textContent = snapshot.size;
    }

    if (snapshot.empty) {
      listaCampanhas.innerHTML = "<p>Você ainda não entrou em nenhuma campanha.</p>";
      return;
    }

    for (const participacaoDoc of snapshot.docs) {
      const participacao = participacaoDoc.data();
      const campanhaRef = doc(db, "campanhas", participacao.campanhaId);
      const campanhaSnap = await getDoc(campanhaRef);

      if (campanhaSnap.exists()) {
        const campanha = campanhaSnap.data();
        const card = criarCardCampanha(campanha, "jogador");
        listaCampanhas.appendChild(card);
      }
    }
  }, (erro) => {
    console.error("Erro ao carregar campanhas do jogador:", erro);
    listaCampanhas.innerHTML = "<p>Erro ao carregar campanhas.</p>";
  });
}

function criarCardCampanha(campanha, tipoVisualizacao) {
  const card = document.createElement("div");
  card.classList.add("campaign-card");

  const descricao = campanha.descricao || "Sem descrição.";

  if (tipoVisualizacao === "mestre") {
    card.innerHTML = `
      <h3>${campanha.nome}</h3>
      <p>${descricao}</p>
      <p><b>Mestre:</b> ${campanha.mestreNome || "Não informado"}</p>
      <span class="campaign-code">${campanha.codigoEntrada}</span>
    `;
  } else {
    card.innerHTML = `
      <h3>${campanha.nome}</h3>
      <p>${descricao}</p>
      <p><b>Mestre:</b> ${campanha.mestreNome || "Não informado"}</p>
    `;
  }

  return card;
}

if (btnCriarCampanha) {
  btnCriarCampanha.addEventListener("click", criarCampanha);
}

if (btnEntrarCampanha) {
  btnEntrarCampanha.addEventListener("click", entrarEmCampanha);
}

const botaoSalvarRaca = document.getElementById("salvarRaca");
const listaRacas = document.getElementById("listaRacas");

async function salvarRacaNoFirebase() {
  if (!usuarioAtual) {
    alert("Você precisa estar logado.");
    return;
  }

  if (dadosUsuarioAtual?.tipo !== "mestre") {
    alert("Apenas o Mestre pode cadastrar raças.");
    return;
  }

  const nome = document.getElementById("racaNome").value.trim();
  const hp = Number(document.getElementById("racaHp").value) || 0;
  const mana = Number(document.getElementById("racaMana").value) || 0;
  const forca = Number(document.getElementById("racaForca").value) || 0;
  const defesa = Number(document.getElementById("racaDefesa").value) || 0;
  const velocidade = Number(document.getElementById("racaVelocidade").value) || 0;
  const vantagens = document.getElementById("racaVantagens").value.trim();
  const desvantagens = document.getElementById("racaDesvantagens").value.trim();

  if (!nome) {
    alert("Digite o nome da raça.");
    return;
  }

  try {
    await addDoc(collection(db, "racas"), {
      nome,
      hp,
      mana,
      forca,
      defesa,
      velocidade,
      vantagens,
      desvantagens,
      criadoPor: usuarioAtual.uid,
      criadoEm: serverTimestamp()
    });

    document.getElementById("racaNome").value = "";
    document.getElementById("racaHp").value = "";
    document.getElementById("racaMana").value = "";
    document.getElementById("racaForca").value = "";
    document.getElementById("racaDefesa").value = "";
    document.getElementById("racaVelocidade").value = "";
    document.getElementById("racaVantagens").value = "";
    document.getElementById("racaDesvantagens").value = "";

    alert("Raça salva no Firebase.");
  } catch (erro) {
    console.error("Erro ao salvar raça:", erro);
    alert("Erro ao salvar raça. Verifique as regras do Firestore.");
  }
}

function carregarRacasDoFirebase() {
  if (!listaRacas) return;

  if (inscricaoRacas) {
    inscricaoRacas();
    inscricaoRacas = null;
  }

  const racasRef = collection(db, "racas");
  const racasQuery = query(racasRef, orderBy("criadoEm", "desc"));

  inscricaoRacas = onSnapshot(racasQuery, (snapshot) => {
    listaRacas.innerHTML = "";

    if (contadorRacas) {
      contadorRacas.textContent = snapshot.size;
    }

    if (snapshot.empty) {
      listaRacas.innerHTML = `
        <li>Nenhuma raça cadastrada ainda.</li>
      `;
      return;
    }

    snapshot.forEach((documento) => {
      const raca = documento.data();

      const item = document.createElement("li");

      item.innerHTML = `
        <b>${raca.nome}</b> — 
        HP: ${raca.hp || 0}, 
        Mana: ${raca.mana || 0}, 
        Força: ${raca.forca || 0}, 
        Defesa: ${raca.defesa || 0}, 
        Velocidade: ${raca.velocidade || 0}.
        <br>
        <small>
          <b>Vantagens:</b> ${raca.vantagens || "Não informado"} |
          <b>Desvantagens:</b> ${raca.desvantagens || "Não informado"}
        </small>
      `;

      listaRacas.appendChild(item);
    });
  }, (erro) => {
    console.error("Erro ao carregar raças:", erro);
    listaRacas.innerHTML = `
      <li>Erro ao carregar raças. Verifique as regras do Firestore.</li>
    `;
  });
}

if (botaoSalvarRaca) {
  botaoSalvarRaca.addEventListener("click", salvarRacaNoFirebase);
}

const botaoRolarD20 = document.getElementById("rolarD20");
const resultadoDado = document.getElementById("resultadoDado");
const ultimosDados = document.getElementById("ultimosDados");

let historicoDados = [];

if (botaoRolarD20) {
  botaoRolarD20.addEventListener("click", () => {
    const bonus = Number(document.getElementById("bonusDado").value) || 0;
    const dado = Math.floor(Math.random() * 20) + 1;
    const total = dado + bonus;

    resultadoDado.textContent = total;

    historicoDados.unshift(`D20: ${dado} + bônus ${bonus} = ${total}`);
    historicoDados = historicoDados.slice(0, 2);

    ultimosDados.innerHTML = historicoDados
      .map((resultado) => `<div>${resultado}</div>`)
      .join("");
  });
}