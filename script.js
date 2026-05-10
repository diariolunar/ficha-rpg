import {
  db,
  auth,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
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
    abrirPagina("dashboard");
  } else {
    usuarioAtual = null;
    dadosUsuarioAtual = null;

    if (inscricaoRacas) {
      inscricaoRacas();
      inscricaoRacas = null;
    }

    document.body.classList.remove("logado");
    document.body.classList.add("deslogado");
  }
});

function controlarPermissoesPorTipo() {
  const tipo = dadosUsuarioAtual?.tipo;

  const botaoCadastros = document.querySelector('[data-page="cadastros"]');
  const botaoMestre = document.querySelector('[data-page="mestre"]');
  const botaoSessao = document.querySelector('[data-page="sessao"]');

  if (tipo === "mestre") {
    if (botaoCadastros) botaoCadastros.style.display = "block";
    if (botaoMestre) botaoMestre.style.display = "block";
    if (botaoSessao) botaoSessao.style.display = "block";
  } else {
    if (botaoCadastros) botaoCadastros.style.display = "none";
    if (botaoMestre) botaoMestre.style.display = "none";
    if (botaoSessao) botaoSessao.style.display = "none";
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
