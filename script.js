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

if (botaoSalvarRaca) {
  botaoSalvarRaca.addEventListener("click", () => {
    const nome = document.getElementById("racaNome").value;
    const hp = document.getElementById("racaHp").value;
    const mana = document.getElementById("racaMana").value;
    const forca = document.getElementById("racaForca").value;
    const defesa = document.getElementById("racaDefesa").value;
    const velocidade = document.getElementById("racaVelocidade").value;
    const vantagens = document.getElementById("racaVantagens").value;
    const desvantagens = document.getElementById("racaDesvantagens").value;

    if (!nome) {
      alert("Digite o nome da raça.");
      return;
    }

    const item = document.createElement("li");

    item.innerHTML = `
      <b>${nome}</b> — 
      HP: ${hp || 0}, 
      Mana: ${mana || 0}, 
      Força: ${forca || 0}, 
      Defesa: ${defesa || 0}, 
      Velocidade: ${velocidade || 0}.
      <br>
      <small>
        <b>Vantagens:</b> ${vantagens || "Não informado"} |
        <b>Desvantagens:</b> ${desvantagens || "Não informado"}
      </small>
    `;

    listaRacas.appendChild(item);

    document.getElementById("racaNome").value = "";
    document.getElementById("racaHp").value = "";
    document.getElementById("racaMana").value = "";
    document.getElementById("racaForca").value = "";
    document.getElementById("racaDefesa").value = "";
    document.getElementById("racaVelocidade").value = "";
    document.getElementById("racaVantagens").value = "";
    document.getElementById("racaDesvantagens").value = "";

    alert("Raça cadastrada na demonstração. Depois vamos salvar isso no Firebase.");
  });
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
