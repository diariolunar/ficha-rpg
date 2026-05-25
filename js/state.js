export const state = {
  usuarioAtual: null,
  dadosUsuarioAtual: null,
  minhasCampanhas: [],
  racasDisponiveis: [],
  personagens: [],
  personagemAberto: null,
  racaSelecionada: null
};

export function setUsuario(usuario, dados) {
  state.usuarioAtual = usuario;
  state.dadosUsuarioAtual = dados;
}

export function limparUsuario() {
  state.usuarioAtual = null;
  state.dadosUsuarioAtual = null;
  state.minhasCampanhas = [];
  state.racasDisponiveis = [];
  state.personagens = [];
  state.personagemAberto = null;
  state.racaSelecionada = null;
}

export function setCampanhas(campanhas) {
  state.minhasCampanhas = campanhas;
}

export function setRacas(racas) {
  state.racasDisponiveis = racas;
}

export function setPersonagens(personagens) {
  state.personagens = personagens;
}

export function setPersonagemAberto(personagem) {
  state.personagemAberto = personagem;
}

export function setRacaSelecionada(raca) {
  state.racaSelecionada = raca;
}