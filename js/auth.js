import {
  db,
  auth,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebase.js";

import { setUsuario, limparUsuario } from "./state.js";
import { aplicarPermissoes } from "./permissions.js";
import { navegarPara } from "./navigation.js";

const callbacksLogin = [];
const callbacksLogout = [];

export function onLogin(callback) {
  callbacksLogin.push(callback);
}

export function onLogout(callback) {
  callbacksLogout.push(callback);
}

function mostrarMensagemAuth(mensagem) {
  const authMensagem = document.getElementById("authMensagem");

  if (authMensagem) {
    authMensagem.textContent = mensagem;
  }
}

function alternarAbaAuth(aba) {
  const tabLogin = document.getElementById("tabLogin");
  const tabCadastro = document.getElementById("tabCadastro");
  const loginForm = document.getElementById("loginForm");
  const cadastroForm = document.getElementById("cadastroForm");

  if (aba === "login") {
    tabLogin.classList.add("active");
    tabCadastro.classList.remove("active");
    loginForm.classList.remove("hidden");
    cadastroForm.classList.add("hidden");
  } else {
    tabCadastro.classList.add("active");
    tabLogin.classList.remove("active");
    cadastroForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  }

  mostrarMensagemAuth("");
}

async function criarConta() {
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
}

async function entrar() {
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
}

async function sair() {
  await signOut(auth);
}

export function initAuth() {
  document.body.classList.add("deslogado");

  document.getElementById("tabLogin").addEventListener("click", () => {
    alternarAbaAuth("login");
  });

  document.getElementById("tabCadastro").addEventListener("click", () => {
    alternarAbaAuth("cadastro");
  });

  document.getElementById("btnCadastro").addEventListener("click", criarConta);
  document.getElementById("btnLogin").addEventListener("click", entrar);
  document.getElementById("btnSair").addEventListener("click", sair);

  onAuthStateChanged(auth, async (usuario) => {
    if (usuario) {
      const usuarioRef = doc(db, "usuarios", usuario.uid);
      const usuarioSnap = await getDoc(usuarioRef);

      const dados = usuarioSnap.exists()
        ? usuarioSnap.data()
        : {
            nome: usuario.email,
            email: usuario.email,
            tipo: "jogador"
          };

      setUsuario(usuario, dados);

      document.getElementById("usuarioNome").textContent = dados.nome || usuario.email;
      document.getElementById("usuarioTipo").textContent = dados.tipo || "jogador";

      document.body.classList.remove("deslogado");
      document.body.classList.add("logado");

      aplicarPermissoes();

      callbacksLogin.forEach((callback) => callback());

      navegarPara("dashboard");
    } else {
      limparUsuario();

      document.body.classList.remove("logado");
      document.body.classList.add("deslogado");

      callbacksLogout.forEach((callback) => callback());
    }
  });
}