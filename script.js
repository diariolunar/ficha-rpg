import {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "./firebase.js";

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
    alert("Erro ao salvar raça. Verifique se o Firestore foi criado em modo de teste.");
  }
}

function carregarRacasDoFirebase() {
  if (!listaRacas) return;

  const racasRef = collection(db, "racas");
  const racasQuery = query(racasRef, orderBy("criadoEm", "desc"));

  onSnapshot(racasQuery, (snapshot) => {
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

carregarRacasDoFirebase();

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
