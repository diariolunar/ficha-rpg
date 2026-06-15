import { state } from "./state.js";

export function aplicarPermissoes() {
  const tipo = state.dadosUsuarioAtual?.tipo;

  const elementosMestre = document.querySelectorAll(".mestre-only");
  const botoesMestre = document.querySelectorAll(".mestre-nav");

  if (tipo === "mestre") {
    elementosMestre.forEach((elemento) => {
      elemento.style.display = "";
    });

    botoesMestre.forEach((botao) => {
      botao.style.display = "";
    });
  } else {
    elementosMestre.forEach((elemento) => {
      elemento.style.display = "none";
    });

    botoesMestre.forEach((botao) => {
      botao.style.display = "none";
    });
  }
}
