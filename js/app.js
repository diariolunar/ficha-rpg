import { initNavigation, onPageLoaded } from "./navigation.js";
import { aplicarPermissoes } from "./permissions.js";

import { initAuth, onLogin, onLogout } from "./auth.js";

import { initRacas, iniciarRacas, pararRacas } from "./racas.js";
import { initClasses, iniciarClasses, pararClasses } from "./classes.js";
import { initSubclasses, iniciarSubclasses, pararSubclasses } from "./subclasses.js";
import { initElementos, iniciarElementos, pararElementos } from "./elementos.js";
import { initHabilidades, iniciarHabilidades, pararHabilidades } from "./habilidades.js";

import { initCampanhas, iniciarCampanhas, pararCampanhas } from "./campanhas.js";
import { initPersonagens, iniciarPersonagens, pararPersonagens } from "./personagens.js";
import { initFicha } from "./ficha.js";
import { initDice } from "./dice.js";
import { initBosses } from "./bosses.js";

function iniciarApp() {
  initNavigation();

  initRacas();
  initClasses();
  initSubclasses();
  initElementos();
  initHabilidades();

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
    iniciarClasses();
    iniciarSubclasses();
    iniciarElementos();
    iniciarHabilidades();

    iniciarCampanhas();
    iniciarPersonagens();
  });

  onLogout(() => {
    pararRacas();
    pararClasses();
    pararSubclasses();
    pararElementos();
    pararHabilidades();

    pararCampanhas();
    pararPersonagens();
  });

  initAuth();
}

iniciarApp();