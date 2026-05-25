export const state = {
  usuarioAtual: null,
  dadosUsuarioAtual: null,
  minhasCampanhas: [],
  racasDisponiveis: [],
  classesDisponiveis: [],
  personagens: [],
  personagemAberto: null,
  racaSelecionada: null,
  classeSelecionada: null
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
  state.classesDisponiveis = [];
  state.personagens = [];
  state.personagemAberto = null;
  state.racaSelecionada = null;
  state.classeSelecionada = null;
}

export function setCampanhas(campanhas) {
  state.minhasCampanhas = campanhas;
}

export function setRacas(racas) {
  state.racasDisponiveis = racas;
}

export function setClasses(classes) {
  state.classesDisponiveis = classes;
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

export function setClasseSelecionada(classe) {
  state.classeSelecionada = classe;
}