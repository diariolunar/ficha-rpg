import { initNavigation, onPageLoaded } from "./navigation.js";
import { aplicarPermissoes } from "./permissions.js";

import { initAuth, onLogin, onLogout } from "./auth.js";

import { initRacas, iniciarRacas, pararRacas } from "./racas.js";
import { initClasses, iniciarClasses, pararClasses } from "./classes.js";
import { initSubclasses, iniciarSubclasses, pararSubclasses } from "./subclasses.js";
import { initElementos, iniciarElementos, pararElementos } from "./elementos.js";
import { initHabilidades, iniciarHabilidades, pararHabilidades } from "./habilidades.js";

import { initItens, iniciarItens, pararItens } from "./itens.js";
import { initPets, iniciarPets, pararPets } from "./pets.js";
import { initMonstros, iniciarMonstros, pararMonstros } from "./monstros.js";
import { initBosses, iniciarBosses, pararBosses } from "./bosses.js";

import { initCampanhas, iniciarCampanhas, pararCampanhas } from "./campanhas.js";
import { initPersonagens, iniciarPersonagens, pararPersonagens } from "./personagens.js";
import { initFicha } from "./ficha.js";
import { initDice } from "./dice.js";

function iniciarApp() {
  initNavigation();

  initRacas();
  initClasses();
  initSubclasses();
  initElementos();
  initHabilidades();

  initItens();
  initPets();
  initMonstros();
  initBosses();

  initCampanhas();
  initPersonagens();
  initFicha();
  initDice();

  onPageLoaded(() => {
    aplicarPermissoes();
  });

  onLogin(() => {
    iniciarRacas();
    iniciarClasses();
    iniciarSubclasses();
    iniciarElementos();
    iniciarHabilidades();

    iniciarItens();
    iniciarPets();
    iniciarMonstros();
    iniciarBosses();

    iniciarCampanhas();
    iniciarPersonagens();
  });

  onLogout(() => {
    pararRacas();
    pararClasses();
    pararSubclasses();
    pararElementos();
    pararHabilidades();

    pararItens();
    pararPets();
    pararMonstros();
    pararBosses();

    pararCampanhas();
    pararPersonagens();
  });

  initAuth();
}

iniciarApp();