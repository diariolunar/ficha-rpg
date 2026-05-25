import { onPageLoaded } from "./navigation.js";

let historicoDados = [];

function rolarD20() {
  const bonusInput = document.getElementById("bonusDado");
  const resultadoDado = document.getElementById("resultadoDado");
  const ultimosDados = document.getElementById("ultimosDados");

  if (!bonusInput || !resultadoDado || !ultimosDados) return;

  const bonus = Number(bonusInput.value) || 0;
  const dado = Math.floor(Math.random() * 20) + 1;
  const total = dado + bonus;

  resultadoDado.textContent = total;

  historicoDados.unshift(`D20: ${dado} + bônus ${bonus} = ${total}`);
  historicoDados = historicoDados.slice(0, 2);

  ultimosDados.innerHTML = historicoDados
    .map((resultado) => `<div>${resultado}</div>`)
    .join("");
}

export function initDice() {
  onPageLoaded((pagina) => {
    if (pagina !== "ficha") return;

    const botao = document.getElementById("rolarD20");

    if (botao) {
      botao.addEventListener("click", rolarD20);
    }
  });
}