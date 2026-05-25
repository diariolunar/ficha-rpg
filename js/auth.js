import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "./firebase.js";

import { setUsuario, limparUsuario } from "./state.js";
import { navegarPara } from "./navigation.js";
import { mostrarModal } from "./ui.js";

const callbacksLogin = [];
const callbacksLogout = [];

export function onLogin(callback) {
  callbacksLogin.push(callback);
}

export function onLogout(callback) {
  callbacksLogout.push(callback);
}

function executarCallbacksLogin() {
  callbacksLogin.forEach((callback) => callback());
}

function executarCallbacksLogout() {
  callbacksLogout.forEach((callback) => callback());
}

function elemento(id) {
  return document.getElementById(id);
}

function mostrarTelaLogin() {
  const authScreen = elemento("authScreen");
  const sidebar = document.querySelector(".sidebar");
  const mainShell = document.querySelector(".main-shell");

  if (authScreen) {
    authScreen.classList.remove("hidden");
  }

  if (sidebar) {
    sidebar.classList.add("hidden");
  }

  if (mainShell) {
    mainShell.classList.add("hidden");
  }
}

function mostrarSistema() {
  const authScreen = elemento("authScreen");
  const sidebar = document.querySelector(".sidebar");
  const mainShell = document.querySelector(".main-shell");

  if (authScreen) {
    authScreen.classList.add("hidden");
  }

  if (sidebar) {
    sidebar.classList.remove("hidden");
  }

  if (mainShell) {
    mainShell.classList.remove("hidden");
  }
}

function mostrarFormularioLogin() {
  const loginForm = elemento("loginForm");
  const cadastroForm = elemento("cadastroForm");
  const tabLogin = elemento("tabLogin");
  const tabCadastro = elemento("tabCadastro");

  if (loginForm) {
    loginForm.classList.remove("hidden");
  }

  if (cadastroForm) {
    cadastroForm.classList.add("hidden");
  }

  if (tabLogin) {
    tabLogin.classList.add("active");
  }

  if (tabCadastro) {
    tabCadastro.classList.remove("active");
  }
}

function mostrarFormularioCadastro() {
  const loginForm = elemento("loginForm");
  const cadastroForm = elemento("cadastroForm");
  const tabLogin = elemento("tabLogin");
  const tabCadastro = elemento("tabCadastro");

  if (loginForm) {
    loginForm.classList.add("hidden");
  }

  if (cadastroForm) {
    cadastroForm.classList.remove("hidden");
  }

  if (tabLogin) {
    tabLogin.classList.remove("active");
  }

  if (tabCadastro) {
    tabCadastro.classList.add("active");
  }
}

function atualizarMensagemAuth(mensagem) {
  const authMensagem = elemento("authMensagem");

  if (authMensagem) {
    authMensagem.textContent = mensagem || "";
  }
}

function atualizarInterfaceUsuario(usuario, dadosUsuario) {
  const usuarioNome = elemento("usuarioNome");
  const usuarioTipo = elemento("usuarioTipo");
  const dashboardTipoConta = elemento("dashboardTipoConta");

  if (usuarioNome) {
    usuarioNome.textContent = dadosUsuario?.nome || usuario?.email || "Usuário";
  }

  if (usuarioTipo) {
    usuarioTipo.textContent = (dadosUsuario?.tipo || "jogador").toUpperCase();
  }

  if (dashboardTipoConta) {
    dashboardTipoConta.textContent = (dadosUsuario?.tipo || "jogador").toUpperCase();
  }
}

async function buscarOuCriarDadosUsuario(usuario) {
  const usuarioRef = doc(db, "usuarios", usuario.uid);
  const usuarioSnapshot = await getDoc(usuarioRef);

  if (usuarioSnapshot.exists()) {
    return usuarioSnapshot.data();
  }

  const dadosPadrao = {
    nome: usuario.email,
    email: usuario.email,
    tipo: "jogador",
    criadoEm: serverTimestamp()
  };

  await setDoc(usuarioRef, dadosPadrao);

  return dadosPadrao;
}

async function fazerLogin() {
  const email = elemento("loginEmail")?.value.trim();
  const senha = elemento("loginSenha")?.value;

  atualizarMensagemAuth("");

  if (!email || !senha) {
    await mostrarModal("Preencha e-mail e senha para entrar.", "Campos obrigatórios");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (erro) {
    console.error("Erro ao fazer login:", erro);

    let mensagem = "Não foi possível entrar. Verifique o e-mail e a senha.";

    if (erro.code === "auth/invalid-credential") {
      mensagem = "E-mail ou senha inválidos.";
    }

    if (erro.code === "auth/user-not-found") {
      mensagem = "Usuário não encontrado.";
    }

    if (erro.code === "auth/wrong-password") {
      mensagem = "Senha incorreta.";
    }

    await mostrarModal(mensagem, "Erro no login", "danger");
  }
}

async function criarConta() {
  const nome = elemento("cadastroNome")?.value.trim();
  const email = elemento("cadastroEmail")?.value.trim();
  const senha = elemento("cadastroSenha")?.value;
  const tipo = elemento("cadastroTipo")?.value || "jogador";

  atualizarMensagemAuth("");

  if (!nome || !email || !senha) {
    await mostrarModal("Preencha nome, e-mail e senha para criar a conta.", "Campos obrigatórios");
    return;
  }

  if (senha.length < 6) {
    await mostrarModal("A senha precisa ter pelo menos 6 caracteres.", "Senha muito curta");
    return;
  }

  try {
    const credencial = await createUserWithEmailAndPassword(auth, email, senha);

    await setDoc(doc(db, "usuarios", credencial.user.uid), {
      nome,
      email,
      tipo,
      criadoEm: serverTimestamp()
    });

    await mostrarModal("Conta criada com sucesso.", "Cadastro realizado", "success");
  } catch (erro) {
    console.error("Erro ao criar conta:", erro);

    let mensagem = "Não foi possível criar a conta.";

    if (erro.code === "auth/email-already-in-use") {
      mensagem = "Este e-mail já está em uso.";
    }

    if (erro.code === "auth/invalid-email") {
      mensagem = "E-mail inválido.";
    }

    if (erro.code === "auth/weak-password") {
      mensagem = "A senha é muito fraca.";
    }

    await mostrarModal(mensagem, "Erro no cadastro", "danger");
  }
}

async function sair() {
  try {
    await signOut(auth);
  } catch (erro) {
    console.error("Erro ao sair:", erro);
    await mostrarModal("Não foi possível sair agora.", "Erro", "danger");
  }
}

export function initAuth() {
  mostrarTelaLogin();

  const tabLogin = elemento("tabLogin");
  const tabCadastro = elemento("tabCadastro");
  const btnLogin = elemento("btnLogin");
  const btnCadastro = elemento("btnCadastro");
  const btnSair = elemento("btnSair");

  if (tabLogin) {
    tabLogin.addEventListener("click", mostrarFormularioLogin);
  }

  if (tabCadastro) {
    tabCadastro.addEventListener("click", mostrarFormularioCadastro);
  }

  if (btnLogin) {
    btnLogin.addEventListener("click", fazerLogin);
  }

  if (btnCadastro) {
    btnCadastro.addEventListener("click", criarConta);
  }

  if (btnSair) {
    btnSair.addEventListener("click", sair);
  }

  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
      limparUsuario();
      atualizarInterfaceUsuario(null, null);
      mostrarTelaLogin();
      executarCallbacksLogout();
      return;
    }

    try {
      const dadosUsuario = await buscarOuCriarDadosUsuario(usuario);

      setUsuario(usuario, dadosUsuario);
      atualizarInterfaceUsuario(usuario, dadosUsuario);
      mostrarSistema();
      executarCallbacksLogin();

      navegarPara("dashboard");
    } catch (erro) {
      console.error("Erro ao carregar dados do usuário:", erro);
      await mostrarModal("Não foi possível carregar os dados da conta.", "Erro", "danger");
      await signOut(auth);
    }
  });
}