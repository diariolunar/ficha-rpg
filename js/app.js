import { initNavigation, onPageLoaded } from "./navigation.js";
import { aplicarPermissoes } from "./permissions.js";

import { initAuth, onLogin, onLogout } from "./auth.js";

import { initRacas, iniciarRacas, pararRacas } from "./racas.js";
import { initCampanhas, iniciarCampanhas, pararCampanhas } from "./campanhas.js";
import { initPersonagens, iniciarPersonagens, pararPersonagens } from "./personagens.js";
import { initFicha } from "./ficha.js";
import { initDice } from "./dice.js";
import { initBosses } from "./bosses.js";

function iniciarApp() {
  initNavigation();

  initRacas();
  initCampanhas();
  initPersonagens();
  initFicha();
  initDice();
  initBosses();

  onPageLoaded(() => {
    aplicarPermissoes();
  });

  onLogin(() => {
    iniciarRacas();
    iniciarCampanhas();
    iniciarPersonagens();
  });

  onLogout(() => {
    pararRacas();
    pararCampanhas();
    pararPersonagens();
  });

  initAuth();
}

iniciarApp();