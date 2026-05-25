import { onPageLoaded } from "./navigation.js";

export function initBosses() {
  onPageLoaded((pagina) => {
    if (pagina !== "cadastrosBosses") return;

    const botaoSalvarBoss = document.getElementById("salvarBoss");

    if (botaoSalvarBoss) {
      botaoSalvarBoss.addEventListener("click", () => {
        alert("Cadastro de Bosses ainda será conectado ao Firebase.");
      });
    }
  });
}