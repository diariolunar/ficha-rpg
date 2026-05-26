import {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from "./firebase.js";

import { state, setPersonagens } from "./state.js";
import { onPageLoaded } from "./navigation.js";
import { buscarRacaPorId, preencherSelectRacas, atualizarPreviewRaca } from "./racas.js";
import { buscarCampanhaPorId, preencherSelectCampanhas } from "./campanhas.js";
import { abrirFichaPersonagem } from "./ficha.js";
import { mostrarModal, confirmarModal } from "./ui.js";

let unsubscribePersonagens = null;
let unsubscribePersonagensCriadosPeloMestre = null;
let unsubscribeClassesPersonagem = null;
let unsubscribeSubclassesPersonagem = null;
let unsubscribeElementosPersonagem = null;
let unsubscribeHabilidadesPersonagem = null;
let unsubscribeItensPersonagem = null;
let unsubscribePetsPersonagem = null;

let classesDisponiveisPersonagem = [];
let subclassesDisponiveisPersonagem = [];
let elementosDisponiveisPersonagem = [];
let habilidadesDisponiveisPersonagem = [];
let itensDisponiveisPersonagem = [];
let petsDisponiveisPersonagem = [];

let habilidadesIniciaisSelecionadas = [];
let itensIniciaisSelecionados = [];

let personagemEmEdicao = null;
let personagensPorCampanhaDoMestre = [];
let personagensCriadosPeloMestre = [];

export function iniciarPersonagens() {
  pararPersonagens();

  const personagensRef = collection(db, "personagens");

  if (state.dadosUsuarioAtual?.tipo === "mestre") {
    const consultaCampanhasMestre = query(
      personagensRef,
      where("mestreId", "==", state.usuarioAtual.uid)
    );

    const consultaCriadosPeloMestre = query(
      personagensRef,
      where("donoId", "==", state.usuarioAtual.uid)
    );

    unsubscribePersonagens = onSnapshot(
      consultaCampanhasMestre,
      (snapshot) => {
        personagensPorCampanhaDoMestre = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        atualizarListaPersonagensCombinada();
      },
      (erro) => {
        console.error("Erro ao carregar personagens das campanhas do mestre:", erro);
      }
    );

    unsubscribePersonagensCriadosPeloMestre = onSnapshot(
      consultaCriadosPeloMestre,
      (snapshot) => {
        personagensCriadosPeloMestre = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        atualizarListaPersonagensCombinada();
      },
      (erro) => {
        console.error("Erro ao carregar personagens criados pelo mestre:", erro);
      }
    );
  } else {
    const consulta = query(
      personagensRef,
      where("donoId", "==", state.usuarioAtual.uid)
    );

    unsubscribePersonagens = onSnapshot(
      consulta,
      (snapshot) => {
        const personagens = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        personagens.sort((a, b) => {
          return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
        });

        setPersonagens(personagens);
        renderizarPersonagens();
        renderizarTabelaMestre();
        atualizarContadorPersonagens();
      },
      (erro) => {
        console.error("Erro ao carregar personagens:", erro);
      }
    );
  }

  carregarOpcoesPersonagem();
}

function atualizarListaPersonagensCombinada() {
  const mapa = new Map();

  [...personagensPorCampanhaDoMestre, ...personagensCriadosPeloMestre].forEach((personagem) => {
    mapa.set(personagem.id, personagem);
  });

  const personagens = Array.from(mapa.values());

  personagens.sort((a, b) => {
    return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
  });

  setPersonagens(personagens);
  renderizarPersonagens();
  renderizarTabelaMestre();
  atualizarContadorPersonagens();
}

export function pararPersonagens() {
  if (unsubscribePersonagens) {
    unsubscribePersonagens();
    unsubscribePersonagens = null;
  }

  if (unsubscribePersonagensCriadosPeloMestre) {
    unsubscribePersonagensCriadosPeloMestre();
    unsubscribePersonagensCriadosPeloMestre = null;
  }

  if (unsubscribeClassesPersonagem) {
    unsubscribeClassesPersonagem();
    unsubscribeClassesPersonagem = null;
  }

  if (unsubscribeSubclassesPersonagem) {
    unsubscribeSubclassesPersonagem();
    unsubscribeSubclassesPersonagem = null;
  }

  if (unsubscribeElementosPersonagem) {
    unsubscribeElementosPersonagem();
    unsubscribeElementosPersonagem = null;
  }

  if (unsubscribeHabilidadesPersonagem) {
    unsubscribeHabilidadesPersonagem();
    unsubscribeHabilidadesPersonagem = null;
  }

  if (unsubscribeItensPersonagem) {
    unsubscribeItensPersonagem();
    unsubscribeItensPersonagem = null;
  }

  if (unsubscribePetsPersonagem) {
    unsubscribePetsPersonagem();
    unsubscribePetsPersonagem = null;
  }

  personagensPorCampanhaDoMestre = [];
  personagensCriadosPeloMestre = [];
}

function carregarOpcoesPersonagem() {
  unsubscribeClassesPersonagem = onSnapshot(
    query(collection(db, "classes"), orderBy("nome", "asc")),
    (snapshot) => {
      classesDisponiveisPersonagem = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      preencherSelectClassesPersonagem();
      preencherSelectSubclassesPersonagem();
      atualizarPreviewPersonagem();
    },
    (erro) => {
      console.error("Erro ao carregar classes para personagens:", erro);
    }
  );

  unsubscribeSubclassesPersonagem = onSnapshot(
    query(collection(db, "subclasses"), orderBy("nome", "asc")),
    (snapshot) => {
      subclassesDisponiveisPersonagem = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      preencherSelectSubclassesPersonagem();
      atualizarPreviewPersonagem();
    },
    (erro) => {
      console.error("Erro ao carregar subclasses para personagens:", erro);
    }
  );

  unsubscribeElementosPersonagem = onSnapshot(
    query(collection(db, "elementos"), orderBy("nome", "asc")),
    (snapshot) => {
      elementosDisponiveisPersonagem = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      preencherSelectElementosPersonagem();
      atualizarPreviewPersonagem();
    },
    (erro) => {
      console.error("Erro ao carregar elementos para personagens:", erro);
    }
  );

  unsubscribeHabilidadesPersonagem = onSnapshot(
    query(collection(db, "habilidades"), orderBy("nome", "asc")),
    (snapshot) => {
      habilidadesDisponiveisPersonagem = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      preencherSelectHabilidadesPersonagem();
    },
    (erro) => {
      console.error("Erro ao carregar habilidades para personagens:", erro);
    }
  );

  unsubscribeItensPersonagem = onSnapshot(
    query(collection(db, "itens"), orderBy("nome", "asc")),
    (snapshot) => {
      itensDisponiveisPersonagem = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      preencherSelectItensPersonagem();
    },
    (erro) => {
      console.error("Erro ao carregar itens para personagens:", erro);
    }
  );

  unsubscribePetsPersonagem = onSnapshot(
    query(collection(db, "pets"), orderBy("nome", "asc")),
    (snapshot) => {
      petsDisponiveisPersonagem = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      preencherSelectPetsPersonagem();
      atualizarPreviewPersonagem();
    },
    (erro) => {
      console.error("Erro ao carregar pets para personagens:", erro);
    }
  );
}

function abrirModalCriacaoPersonagem() {
  fecharModalPersonagem();

  personagemEmEdicao = null;
  habilidadesIniciaisSelecionadas = [];
  itensIniciaisSelecionados = [];

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Criar Personagem</h3>
          <p>Escolha raça, classe, subclasse, elemento, pet, habilidades e itens iniciais.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        ${montarFormularioPersonagem()}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  vincularEventosFormularioPersonagem();

  preencherSelectCampanhas();
  preencherSelectRacas();
  preencherSelectClassesPersonagem();
  preencherSelectSubclassesPersonagem();
  preencherSelectElementosPersonagem();
  preencherSelectPetsPersonagem();
  preencherSelectHabilidadesPersonagem();
  preencherSelectItensPersonagem();

  renderizarHabilidadesIniciais();
  renderizarItensIniciais();
  atualizarPreviewPersonagem();

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalPersonagem();
    }
  });
}

function abrirModalEdicaoPersonagem(personagem) {
  fecharModalPersonagem();

  personagemEmEdicao = personagem;
  habilidadesIniciaisSelecionadas = Array.isArray(personagem.habilidadesIniciais)
    ? [...personagem.habilidadesIniciais]
    : [];

  itensIniciaisSelecionados = Array.isArray(personagem.itensIniciais)
    ? [...personagem.itensIniciais]
    : [];

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Editar Personagem</h3>
          <p>Atualize as informações principais do personagem.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        ${montarFormularioPersonagem(personagem)}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  vincularEventosFormularioPersonagem();

  preencherSelectCampanhas();
  preencherSelectRacas();
  preencherSelectClassesPersonagem();
  preencherSelectSubclassesPersonagem();
  preencherSelectElementosPersonagem();
  preencherSelectPetsPersonagem();
  preencherSelectHabilidadesPersonagem();
  preencherSelectItensPersonagem();

  preencherValoresEdicaoPersonagem(personagem);

  renderizarHabilidadesIniciais();
  renderizarItensIniciais();
  atualizarPreviewPersonagem();

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalPersonagem();
    }
  });
}

function preencherValoresEdicaoPersonagem(personagem) {
  setCampoValor("personagemNome", personagem.nome || "");
  setCampoValor("personagemNivel", personagem.nivel || 1);
  setCampoValor("personagemCampanha", personagem.campanhaId || "");
  setCampoValor("personagemRaca", personagem.racaId || personagem.raca?.id || "");

  preencherSelectClassesPersonagem();

  setCampoValor("personagemClasse", personagem.classeId || personagem.classe?.id || "");

  preencherSelectSubclassesPersonagem();

  setCampoValor("personagemSubclasse", personagem.subclasseId || personagem.subclasse?.id || "");
  setCampoValor("personagemElemento", personagem.elementoId || personagem.elemento?.id || "");
  setCampoValor("personagemPet", personagem.pet?.id || "");
  setCampoValor("personagemHistoria", personagem.historia || "");
}

function setCampoValor(id, valor) {
  const campo = document.getElementById(id);

  if (campo) {
    campo.value = valor;
  }
}

function fecharModalPersonagem() {
  const overlay = document.getElementById("modalPersonagem");

  if (overlay) {
    overlay.remove();
  }

  personagemEmEdicao = null;
}

function montarFormularioPersonagem(personagem = null) {
  const modoEdicao = Boolean(personagem);

  return `
    <div class="crud-form-content">
      <div class="form-grid">
        <label>
          Nome do personagem
          <input type="text" id="personagemNome" placeholder="Ex: Kael" />
        </label>

        <label>
          Nível
          <input type="number" id="personagemNivel" value="1" min="1" />
        </label>

        <label>
          Campanha
          <select id="personagemCampanha">
            <option value="">Nenhuma campanha</option>
          </select>
        </label>

        <label>
          Raça
          <select id="personagemRaca">
            <option value="">Carregando raças...</option>
          </select>
        </label>

        <label>
          Classe
          <select id="personagemClasse">
            <option value="">Carregando classes...</option>
          </select>
        </label>

        <label>
          Subclasse
          <select id="personagemSubclasse">
            <option value="">Selecione uma classe primeiro</option>
          </select>
        </label>

        <label>
          Elemento
          <select id="personagemElemento">
            <option value="">Carregando elementos...</option>
          </select>
        </label>

        <label>
          Pet
          <select id="personagemPet">
            <option value="">Carregando pets...</option>
          </select>
        </label>
      </div>

      <div class="base-preview character-preview">
        <div class="preview-title-row">
          <div>
            <h4>Prévia do Personagem</h4>
            <p>Os valores abaixo são calculados a partir da raça, classe e nível.</p>
          </div>
        </div>

        <div class="preview-grid">
          <span>HP Inicial <b id="previewHpFinal">0</b></span>
          <span>Mana Inicial <b id="previewManaFinal">0</b></span>
          <span>Força Física <b id="previewForcaFisica">0</b></span>
          <span>Força Mágica <b id="previewForcaMagica">0</b></span>
          <span>Defesa Física <b id="previewDefesaFisica">0</b></span>
          <span>Defesa Mágica <b id="previewDefesaMagica">0</b></span>
          <span>Velocidade <b id="previewVelocidade">0</b></span>
          <span>Resistência <b id="previewResistencia">0</b></span>
        </div>

        <div class="preview-section-grid">
          <div class="preview-section">
            <h5>Identidade</h5>
            <p><strong>Raça:</strong> <span id="previewRacaNome">Nenhuma raça selecionada.</span></p>
            <p><strong>Classe:</strong> <span id="previewClasseNome">Nenhuma classe selecionada.</span></p>
            <p><strong>Subclasse:</strong> <span id="previewSubclasseNome">Nenhuma subclasse selecionada.</span></p>
            <p><strong>Elemento:</strong> <span id="previewElementoNome">Nenhum elemento selecionado.</span></p>
            <p><strong>Pet:</strong> <span id="previewPetNome">Nenhum pet selecionado.</span></p>
          </div>

          <div class="preview-section">
            <h5>Classe</h5>
            <p><strong>Atributo Principal:</strong> <span id="previewAtributoPrincipal">Não informado</span></p>
            <p><strong>Atributo Secundário:</strong> <span id="previewAtributoSecundario">Não informado</span></p>
            <p><strong>Tipo de Dano:</strong> <span id="previewTipoDano">Nenhuma classe selecionada.</span></p>
            <p><strong>Tipo de Defesa:</strong> <span id="previewTipoDefesa">Nenhuma classe selecionada.</span></p>
            <p><strong>Habilidade Exclusiva:</strong> <span id="previewHabilidadeClasse">Nenhuma classe selecionada.</span></p>
            <p><strong>Vantagens:</strong> <span id="previewVantagensClasse">Nenhuma classe selecionada.</span></p>
          </div>

          <div class="preview-section">
            <h5>Raça</h5>
            <p><strong>Carisma:</strong> <span id="previewCarismaBonus">Nenhuma raça selecionada.</span></p>
            <p><strong>Fator Medo:</strong> <span id="previewFatorMedoBonus">Nenhuma raça selecionada.</span></p>
            <p><strong>Habilidade Exclusiva:</strong> <span id="previewHabilidadeRaca">Nenhuma raça selecionada.</span></p>
            <p><strong>Vantagens:</strong> <span id="previewVantagensRaca">Nenhuma raça selecionada.</span></p>
            <p><strong>Restrições de Classe:</strong> <span id="previewRestricoesClasse">Não informado</span></p>
          </div>
        </div>
      </div>

      <div class="multi-select-box">
        <label>
          Habilidades iniciais
          <select id="selectHabilidadesIniciais">
            <option value="">Carregando habilidades...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="adicionarHabilidadeInicial">Adicionar habilidade</button>

        <div id="listaHabilidadesIniciaisSelecionadas" class="selected-list">
          <span class="empty-selection">Nenhuma habilidade inicial selecionada.</span>
        </div>
      </div>

      <div class="multi-select-box">
        <label>
          Itens iniciais
          <select id="selectItensIniciais">
            <option value="">Carregando itens...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="adicionarItemInicial">Adicionar item</button>

        <div id="listaItensIniciaisSelecionados" class="selected-list">
          <span class="empty-selection">Nenhum item inicial selecionado.</span>
        </div>
      </div>

      <label>
        História / descrição do personagem
        <textarea id="personagemHistoria" placeholder="Escreva a história, aparência ou detalhes importantes..."></textarea>
      </label>

      <div class="action-row">
        <button class="secondary-btn" type="button" id="cancelarPersonagem">Cancelar</button>
        <button class="primary-btn" type="button" id="salvarPersonagem">
          ${modoEdicao ? "Salvar alterações" : "Criar personagem"}
        </button>
      </div>
    </div>
  `;
}

function vincularEventosFormularioPersonagem() {
  document.getElementById("fecharModalPersonagem")?.addEventListener("click", fecharModalPersonagem);
  document.getElementById("cancelarPersonagem")?.addEventListener("click", fecharModalPersonagem);
  document.getElementById("salvarPersonagem")?.addEventListener("click", salvarPersonagem);

  document.getElementById("adicionarHabilidadeInicial")?.addEventListener("click", async () => {
    await adicionarSelecionado(
      "selectHabilidadesIniciais",
      habilidadesIniciaisSelecionadas,
      renderizarHabilidadesIniciais
    );
  });

  document.getElementById("adicionarItemInicial")?.addEventListener("click", async () => {
    await adicionarSelecionado(
      "selectItensIniciais",
      itensIniciaisSelecionados,
      renderizarItensIniciais
    );
  });

  const camposPreview = [
    "personagemNivel",
    "personagemRaca",
    "personagemClasse",
    "personagemSubclasse",
    "personagemElemento",
    "personagemPet"
  ];

  camposPreview.forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      if (id === "personagemRaca") {
        preencherSelectClassesPersonagem();
        preencherSelectSubclassesPersonagem();
      }

      if (id === "personagemClasse") {
        preencherSelectSubclassesPersonagem();
      }

      const raca = buscarRacaPorId(valorCampo("personagemRaca"));
      atualizarPreviewRaca(raca);
      atualizarPreviewPersonagem();
    });
  });
}

function buscarPorId(lista, id) {
  return lista.find((item) => item.id === id) || null;
}

function buscarClassePorId(id) {
  return buscarPorId(classesDisponiveisPersonagem, id);
}

function buscarSubclassePorId(id) {
  return buscarPorId(subclassesDisponiveisPersonagem, id);
}

function buscarElementoPorId(id) {
  return buscarPorId(elementosDisponiveisPersonagem, id);
}

function buscarPetPorId(id) {
  return buscarPorId(petsDisponiveisPersonagem, id);
}

function numeroCampo(id, padrao = 0) {
  const valor = Number(document.getElementById(id)?.value);
  return Number.isFinite(valor) && valor > 0 ? valor : padrao;
}

function valorCampo(id) {
  return document.getElementById(id)?.value || "";
}

function textoCampo(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function objetoCompleto(item) {
  if (!item) return null;

  return {
    id: item.id,
    ...item
  };
}

function formatarListaObjetos(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return "Não informado";
  }

  return lista.map((item) => item.nome || item).join(", ");
}

function formatarAtributo(valor) {
  const mapa = {
    forcaFisica: "Força Física",
    forcaMagica: "Força Mágica",
    defesaFisica: "Defesa Física",
    defesaMagica: "Defesa Mágica",
    velocidade: "Velocidade",
    resistencia: "Resistência"
  };

  return mapa[valor] || "Não informado";
}

function classeEstaRestrita(raca, classe) {
  if (!raca || !classe || !Array.isArray(raca.restricoesClasse)) return false;

  const temNenhuma = raca.restricoesClasse.some((restricao) => restricao.id === "__NONE__");

  if (temNenhuma) return false;

  return raca.restricoesClasse.some((restricao) => restricao.id === classe.id);
}

function filtrarClassesPermitidasPorRaca(raca) {
  if (!raca || !Array.isArray(raca.restricoesClasse) || raca.restricoesClasse.length === 0) {
    return classesDisponiveisPersonagem;
  }

  const temNenhuma = raca.restricoesClasse.some((restricao) => restricao.id === "__NONE__");

  if (temNenhuma) {
    return classesDisponiveisPersonagem;
  }

  const idsRestritos = raca.restricoesClasse.map((restricao) => restricao.id);

  return classesDisponiveisPersonagem.filter((classe) => {
    return !idsRestritos.includes(classe.id);
  });
}

function calcularHpInicial(raca, classe, nivel) {
  const hpBase = raca?.hpBase ?? raca?.hp ?? 0;
  const hpClasse = classe?.hpPorNivel ?? 0;

  return hpBase + hpClasse * nivel;
}

function calcularManaInicial(raca, classe, nivel) {
  const manaBase = raca?.manaBase ?? raca?.mana ?? 0;
  const manaClasse = classe?.manaPorNivel ?? 0;

  return manaBase + manaClasse * nivel;
}

function preencherSelectClassesPersonagem() {
  const select = document.getElementById("personagemClasse");

  if (!select) return;

  const classeSelecionadaAntes = select.value;
  const raca = buscarRacaPorId(valorCampo("personagemRaca"));
  const classesPermitidas = filtrarClassesPermitidasPorRaca(raca);

  select.innerHTML = "";

  if (classesDisponiveisPersonagem.length === 0) {
    select.innerHTML = `<option value="">Nenhuma classe cadastrada</option>`;
    return;
  }

  if (classesPermitidas.length === 0) {
    select.innerHTML = `<option value="">Nenhuma classe permitida para esta raça</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma classe</option>`;

  classesPermitidas.forEach((classe) => {
    const option = document.createElement("option");
    option.value = classe.id;
    option.textContent = classe.nome || "Sem nome";
    select.appendChild(option);
  });

  const classeAindaPermitida = classesPermitidas.some((classe) => classe.id === classeSelecionadaAntes);

  if (classeAindaPermitida) {
    select.value = classeSelecionadaAntes;
  } else {
    select.value = "";
  }
}

function preencherSelectSubclassesPersonagem() {
  const select = document.getElementById("personagemSubclasse");

  if (!select) return;

  const subclasseSelecionadaAntes = select.value;
  const classe = buscarClassePorId(valorCampo("personagemClasse"));

  select.innerHTML = "";

  if (!classe) {
    select.innerHTML = `<option value="">Selecione uma classe primeiro</option>`;
    return;
  }

  let subclassesPermitidas = subclassesDisponiveisPersonagem;

  if (Array.isArray(classe.subclassesDisponiveis) && classe.subclassesDisponiveis.length > 0) {
    const idsPermitidos = classe.subclassesDisponiveis.map((item) => item.id);
    subclassesPermitidas = subclassesDisponiveisPersonagem.filter((subclasse) => idsPermitidos.includes(subclasse.id));
  }

  if (subclassesPermitidas.length === 0) {
    select.innerHTML = `<option value="">Nenhuma subclasse disponível</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma subclasse</option>`;

  subclassesPermitidas.forEach((subclasse) => {
    const option = document.createElement("option");
    option.value = subclasse.id;
    option.textContent = subclasse.nome || "Sem nome";
    select.appendChild(option);
  });

  const subclasseAindaPermitida = subclassesPermitidas.some((subclasse) => subclasse.id === subclasseSelecionadaAntes);

  if (subclasseAindaPermitida) {
    select.value = subclasseSelecionadaAntes;
  }
}

function preencherSelectElementosPersonagem() {
  const select = document.getElementById("personagemElemento");

  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = "";

  if (elementosDisponiveisPersonagem.length === 0) {
    select.innerHTML = `<option value="">Nenhum elemento cadastrado</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione um elemento</option>`;

  elementosDisponiveisPersonagem.forEach((elemento) => {
    const option = document.createElement("option");
    option.value = elemento.id;
    option.textContent = elemento.nome || "Sem nome";
    select.appendChild(option);
  });

  if (valorAtual) {
    select.value = valorAtual;
  }
}

function preencherSelectPetsPersonagem() {
  const select = document.getElementById("personagemPet");

  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = `<option value="">Nenhum pet</option>`;

  petsDisponiveisPersonagem.forEach((pet) => {
    const option = document.createElement("option");
    option.value = pet.id;
    option.textContent = pet.nome || "Sem nome";
    select.appendChild(option);
  });

  if (valorAtual) {
    select.value = valorAtual;
  }
}

function preencherSelectHabilidadesPersonagem() {
  const select = document.getElementById("selectHabilidadesIniciais");

  if (!select) return;

  select.innerHTML = "";

  if (habilidadesDisponiveisPersonagem.length === 0) {
    select.innerHTML = `<option value="">Nenhuma habilidade cadastrada</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma habilidade</option>`;

  habilidadesDisponiveisPersonagem.forEach((habilidade) => {
    const option = document.createElement("option");
    option.value = habilidade.id;
    option.textContent = habilidade.nome || "Sem nome";
    select.appendChild(option);
  });
}

function preencherSelectItensPersonagem() {
  const select = document.getElementById("selectItensIniciais");

  if (!select) return;

  select.innerHTML = "";

  if (itensDisponiveisPersonagem.length === 0) {
    select.innerHTML = `<option value="">Nenhum item cadastrado</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione um item</option>`;

  itensDisponiveisPersonagem.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.nome || "Sem nome";
    select.appendChild(option);
  });
}

async function adicionarSelecionado(selectId, lista, renderCallback) {
  const select = document.getElementById(selectId);

  if (!select || !select.value) {
    await mostrarModal("Selecione uma opção primeiro.", "Campo obrigatório");
    return;
  }

  const id = select.value;
  const nome = select.selectedOptions[0].textContent;

  if (lista.some((item) => item.id === id)) {
    await mostrarModal("Essa opção já foi adicionada.", "Opção repetida");
    return;
  }

  lista.push({ id, nome });
  renderCallback();
}

function removerSelecionado(lista, id, renderCallback) {
  const index = lista.findIndex((item) => item.id === id);

  if (index >= 0) {
    lista.splice(index, 1);
  }

  renderCallback();
}

function renderizarListaSelecionada(containerId, lista, mensagemVazia, callbackRemover) {
  const container = document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = `<span class="empty-selection">${mensagemVazia}</span>`;
    return;
  }

  lista.forEach((item) => {
    const chip = document.createElement("span");
    chip.classList.add("selected-chip");

    chip.innerHTML = `
      ${escapeHtml(item.nome)}
      <button type="button" title="Remover">×</button>
    `;

    chip.querySelector("button").addEventListener("click", () => {
      callbackRemover(item.id);
    });

    container.appendChild(chip);
  });
}

function renderizarHabilidadesIniciais() {
  renderizarListaSelecionada(
    "listaHabilidadesIniciaisSelecionadas",
    habilidadesIniciaisSelecionadas,
    "Nenhuma habilidade inicial selecionada.",
    (id) => removerSelecionado(habilidadesIniciaisSelecionadas, id, renderizarHabilidadesIniciais)
  );
}

function renderizarItensIniciais() {
  renderizarListaSelecionada(
    "listaItensIniciaisSelecionados",
    itensIniciaisSelecionados,
    "Nenhum item inicial selecionado.",
    (id) => removerSelecionado(itensIniciaisSelecionados, id, renderizarItensIniciais)
  );
}

function atualizarPreviewPersonagem() {
  const previewHpFinal = document.getElementById("previewHpFinal");

  if (!previewHpFinal) return;

  const nivel = numeroCampo("personagemNivel", 1);
  const raca = buscarRacaPorId(valorCampo("personagemRaca"));
  const classe = buscarClassePorId(valorCampo("personagemClasse"));
  const subclasse = buscarSubclassePorId(valorCampo("personagemSubclasse"));
  const elemento = buscarElementoPorId(valorCampo("personagemElemento"));
  const pet = buscarPetPorId(valorCampo("personagemPet"));

  document.getElementById("previewHpFinal").textContent = calcularHpInicial(raca, classe, nivel);
  document.getElementById("previewManaFinal").textContent = calcularManaInicial(raca, classe, nivel);

  document.getElementById("previewForcaFisica").textContent = raca?.forcaFisica ?? raca?.forca ?? 0;
  document.getElementById("previewForcaMagica").textContent = raca?.forcaMagica ?? 0;
  document.getElementById("previewDefesaFisica").textContent = raca?.defesaFisica ?? raca?.defesa ?? 0;
  document.getElementById("previewDefesaMagica").textContent = raca?.defesaMagica ?? 0;
  document.getElementById("previewVelocidade").textContent = raca?.velocidade ?? 0;
  document.getElementById("previewResistencia").textContent = raca?.resistencia ?? 0;

  document.getElementById("previewRacaNome").textContent = raca?.nome || "Nenhuma raça selecionada.";
  document.getElementById("previewClasseNome").textContent = classe?.nome || "Nenhuma classe selecionada.";
  document.getElementById("previewSubclasseNome").textContent = subclasse?.nome || "Nenhuma subclasse selecionada.";
  document.getElementById("previewElementoNome").textContent = elemento?.nome || "Nenhum elemento selecionado.";
  document.getElementById("previewPetNome").textContent = pet?.nome || "Nenhum pet selecionado.";

  document.getElementById("previewCarismaBonus").textContent = raca?.carismaBonus || "Nenhuma raça selecionada.";
  document.getElementById("previewFatorMedoBonus").textContent = raca?.fatorMedoBonus || "Nenhuma raça selecionada.";
  document.getElementById("previewAtributoPrincipal").textContent = formatarAtributo(classe?.atributoPrincipal);
  document.getElementById("previewAtributoSecundario").textContent = formatarAtributo(classe?.atributoSecundario);
  document.getElementById("previewTipoDano").textContent = classe?.tipoDano || "Nenhuma classe selecionada.";
  document.getElementById("previewTipoDefesa").textContent = classe?.tipoDefesa || "Nenhuma classe selecionada.";
  document.getElementById("previewHabilidadeRaca").textContent = raca?.habilidadeExclusiva?.nome || "Nenhuma raça selecionada.";
  document.getElementById("previewHabilidadeClasse").textContent = classe?.habilidadeExclusiva?.nome || "Nenhuma classe selecionada.";
  document.getElementById("previewVantagensRaca").textContent = raca?.vantagens || "Nenhuma raça selecionada.";
  document.getElementById("previewVantagensClasse").textContent = classe?.vantagens || "Nenhuma classe selecionada.";
  document.getElementById("previewRestricoesClasse").textContent = formatarListaObjetos(raca?.restricoesClasse);
}

async function salvarPersonagem() {
  if (personagemEmEdicao) {
    await salvarEdicaoPersonagem();
  } else {
    await criarPersonagem();
  }
}

async function criarPersonagem() {
  if (!state.usuarioAtual) {
    await mostrarModal("Você precisa estar logado para criar um personagem.", "Acesso necessário");
    return;
  }

  const dados = montarDadosPersonagem();

  if (!dados) return;

  try {
    await addDoc(collection(db, "personagens"), {
      ...dados,
      criadoEm: serverTimestamp()
    });

    await mostrarModal("Personagem criado com sucesso.", "Cadastro realizado", "success");

    fecharModalPersonagem();
    renderizarPersonagens();
  } catch (erro) {
    console.error("Erro ao criar personagem:", erro);
    await mostrarModal("Erro ao criar personagem. Verifique os dados e tente novamente.", "Erro", "danger");
  }
}

async function salvarEdicaoPersonagem() {
  if (!personagemEmEdicao) return;

  const dados = montarDadosPersonagem(personagemEmEdicao);

  if (!dados) return;

  try {
    await updateDoc(doc(db, "personagens", personagemEmEdicao.id), {
      ...dados,
      atualizadoEm: serverTimestamp()
    });

    await mostrarModal("Personagem atualizado com sucesso.", "Alterações salvas", "success");

    fecharModalPersonagem();
    renderizarPersonagens();
  } catch (erro) {
    console.error("Erro ao editar personagem:", erro);
    await mostrarModal("Erro ao editar personagem.", "Erro", "danger");
  }
}

function montarDadosPersonagem(personagemExistente = null) {
  const nome = textoCampo("personagemNome");
  const nivel = numeroCampo("personagemNivel", 1);
  const campanhaId = valorCampo("personagemCampanha");
  const racaId = valorCampo("personagemRaca");
  const classeId = valorCampo("personagemClasse");
  const subclasseId = valorCampo("personagemSubclasse");
  const elementoId = valorCampo("personagemElemento");
  const petId = valorCampo("personagemPet");
  const historia = textoCampo("personagemHistoria");

  if (!nome) {
    mostrarModal("Digite o nome do personagem.", "Campo obrigatório");
    return null;
  }

  if (!racaId) {
    mostrarModal("Selecione uma raça.", "Campo obrigatório");
    return null;
  }

  if (!classeId) {
    mostrarModal("Selecione uma classe.", "Campo obrigatório");
    return null;
  }

  const campanha = campanhaId ? buscarCampanhaPorId(campanhaId) : null;
  const raca = buscarRacaPorId(racaId);
  const classe = buscarClassePorId(classeId);
  const subclasse = buscarSubclassePorId(subclasseId);
  const elemento = buscarElementoPorId(elementoId);
  const pet = buscarPetPorId(petId);

  if (!raca || !classe) {
    mostrarModal("Raça ou classe não encontrada. Verifique os cadastros selecionados.", "Erro", "danger");
    return null;
  }

  if (campanhaId && !campanha) {
    mostrarModal("Campanha não encontrada. Escolha outra campanha ou deixe o campo como Nenhuma campanha.", "Erro", "danger");
    return null;
  }

  if (classeEstaRestrita(raca, classe)) {
    mostrarModal(
      `A raça "${raca.nome}" possui restrição para a classe "${classe.nome}".`,
      "Classe restrita",
      "danger"
    );

    preencherSelectClassesPersonagem();
    preencherSelectSubclassesPersonagem();
    atualizarPreviewPersonagem();
    return null;
  }

  const hpInicial = calcularHpInicial(raca, classe, nivel);
  const manaInicial = calcularManaInicial(raca, classe, nivel);

  const hpAtual = personagemExistente?.hpAtual ?? hpInicial;
  const manaAtual = personagemExistente?.manaAtual ?? manaInicial;

  const mestreId = campanha?.mestreId || (
    state.dadosUsuarioAtual?.tipo === "mestre"
      ? state.usuarioAtual.uid
      : personagemExistente?.mestreId || ""
  );

  return {
    nome,
    nivel,
    donoId: personagemExistente?.donoId || state.usuarioAtual.uid,
    donoNome: personagemExistente?.donoNome || state.dadosUsuarioAtual.nome || state.usuarioAtual.email,
    donoEmail: personagemExistente?.donoEmail || state.usuarioAtual.email,

    campanhaId: campanha?.id || "",
    campanhaNome: campanha?.nome || "Sem campanha",
    mestreId,

    raca: objetoCompleto(raca),
    classe: objetoCompleto(classe),
    subclasse: objetoCompleto(subclasse),
    elemento: objetoCompleto(elemento),
    pet: objetoCompleto(pet),

    racaId: raca.id,
    racaNome: raca.nome,
    classeId: classe.id,
    classeNome: classe.nome,
    subclasseId: subclasse?.id || "",
    subclasseNome: subclasse?.nome || "",
    elementoId: elemento?.id || "",
    elementoNome: elemento?.nome || "",

    historia,

    hpMax: hpInicial,
    hpAtual: Math.min(hpAtual, hpInicial),
    manaMax: manaInicial,
    manaAtual: Math.min(manaAtual, manaInicial),

    forcaFisica: raca.forcaFisica ?? raca.forca ?? 0,
    forcaMagica: raca.forcaMagica ?? 0,
    defesaFisica: raca.defesaFisica ?? raca.defesa ?? 0,
    defesaMagica: raca.defesaMagica ?? 0,
    velocidade: raca.velocidade ?? 0,
    resistencia: raca.resistencia ?? 0,

    carismaBonus: raca.carismaBonus || "",
    fatorMedoBonus: raca.fatorMedoBonus || "",

    fome: personagemExistente?.fome ?? 0,
    fadiga: personagemExistente?.fadiga ?? 0,

    vantagensRaca: raca.vantagens || "",
    desvantagensRaca: raca.desvantagens || "",
    vantagensClasse: classe.vantagens || "",
    desvantagensClasse: classe.desvantagens || "",

    habilidadeExclusivaRaca: raca.habilidadeExclusiva || null,
    habilidadeExclusivaClasse: classe.habilidadeExclusiva || null,

    habilidadesIniciais: habilidadesIniciaisSelecionadas,
    itensIniciais: itensIniciaisSelecionados,

    classesSugeridas: raca.classesSugeridas || [],
    elementosAfins: raca.elementosAfins || [],
    restricoesClasse: raca.restricoesClasse || []
  };
}

async function excluirPersonagem(personagem) {
  const confirmar = await confirmarModal({
    titulo: "Excluir personagem",
    mensagem: `Tem certeza que deseja excluir "${personagem.nome}"? Essa ação não pode ser desfeita.`,
    confirmarTexto: "Excluir",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "personagens", personagem.id));
    await mostrarModal("Personagem excluído com sucesso.", "Exclusão concluída", "success");
  } catch (erro) {
    console.error("Erro ao excluir personagem:", erro);
    await mostrarModal("Erro ao excluir personagem.", "Erro", "danger");
  }
}

function abrirModalVincularCampanha(personagem) {
  fecharModalVincularCampanha();

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalVincularCampanha";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Vincular Campanha</h3>
          <p>Escolha uma campanha para o personagem "${escapeHtml(personagem.nome)}".</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalVincularCampanha">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Campanha
            <select id="vincularCampanhaSelect">
              <option value="">Nenhuma campanha</option>
            </select>
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarVinculoCampanha">Cancelar</button>
            <button class="primary-btn" type="button" id="salvarVinculoCampanha">Salvar vínculo</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  preencherSelectCampanhas();

  const selectOriginal = document.getElementById("personagemCampanha");
  const selectVinculo = document.getElementById("vincularCampanhaSelect");

  if (selectOriginal && selectVinculo) {
    selectVinculo.innerHTML = selectOriginal.innerHTML;
    selectVinculo.value = personagem.campanhaId || "";
  }

  document.getElementById("fecharModalVincularCampanha")?.addEventListener("click", fecharModalVincularCampanha);
  document.getElementById("cancelarVinculoCampanha")?.addEventListener("click", fecharModalVincularCampanha);
  document.getElementById("salvarVinculoCampanha")?.addEventListener("click", async () => {
    await salvarVinculoCampanha(personagem);
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalVincularCampanha();
    }
  });
}

function fecharModalVincularCampanha() {
  const overlay = document.getElementById("modalVincularCampanha");

  if (overlay) {
    overlay.remove();
  }
}

async function salvarVinculoCampanha(personagem) {
  const campanhaId = valorCampo("vincularCampanhaSelect");
  const campanha = campanhaId ? buscarCampanhaPorId(campanhaId) : null;

  if (campanhaId && !campanha) {
    await mostrarModal("Campanha não encontrada.", "Erro", "danger");
    return;
  }

  const mestreId = campanha?.mestreId || (
    state.dadosUsuarioAtual?.tipo === "mestre"
      ? state.usuarioAtual.uid
      : ""
  );

  try {
    await updateDoc(doc(db, "personagens", personagem.id), {
      campanhaId: campanha?.id || "",
      campanhaNome: campanha?.nome || "Sem campanha",
      mestreId,
      atualizadoEm: serverTimestamp()
    });

    await mostrarModal("Campanha vinculada com sucesso.", "Alterações salvas", "success");
    fecharModalVincularCampanha();
  } catch (erro) {
    console.error("Erro ao vincular campanha:", erro);
    await mostrarModal("Erro ao vincular campanha.", "Erro", "danger");
  }
}

export function renderizarPersonagens() {
  aplicarEstilosCardsPersonagem();

  const lista = document.getElementById("listaPersonagens");

  if (!lista) return;

  lista.innerHTML = "";

  const personagensDoUsuario = state.dadosUsuarioAtual?.tipo === "mestre"
    ? state.personagens
    : state.personagens.filter((personagem) => personagem.donoId === state.usuarioAtual.uid);

  if (personagensDoUsuario.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <h3>Nenhum personagem criado ainda.</h3>
        <p>Crie um novo personagem para começar a montar sua ficha.</p>
      </div>
    `;
    return;
  }

  personagensDoUsuario.forEach((personagem) => {
    const card = document.createElement("div");
    card.classList.add("character-created-card", "personagem-card-refinado");

    const hpPercentual = calcularPercentual(personagem.hpAtual, personagem.hpMax);
    const manaPercentual = calcularPercentual(personagem.manaAtual, personagem.manaMax);
    const fomePercentual = Number(personagem.fome || 0);
    const fadigaPercentual = Number(personagem.fadiga || 0);

    card.innerHTML = `
      <div class="personagem-card-top">
        <div class="personagem-avatar">
          ${(personagem.nome || "?").charAt(0).toUpperCase()}
        </div>

        <div class="personagem-title">
          <h4>${escapeHtml(personagem.nome || "Sem nome")}</h4>
          <p>${escapeHtml(personagem.campanhaNome || "Sem campanha")}</p>
        </div>

        <span class="personagem-level">Nível ${personagem.nivel || 1}</span>
      </div>

      <div class="personagem-info-grid">
        <span><b>Jogador</b>${escapeHtml(personagem.donoNome || "Não informado")}</span>
        <span><b>Raça</b>${escapeHtml(personagem.raca?.nome || personagem.racaNome || "Não informada")}</span>
        <span><b>Classe</b>${escapeHtml(personagem.classe?.nome || personagem.classeNome || "Não informada")}</span>
        <span><b>Subclasse</b>${escapeHtml(personagem.subclasse?.nome || personagem.subclasseNome || "Não informada")}</span>
        <span><b>Elemento</b>${escapeHtml(personagem.elemento?.nome || personagem.elementoNome || "Não informado")}</span>
      </div>

      <div class="personagem-status-grid">
        ${montarBarraStatus("HP", personagem.hpAtual || 0, personagem.hpMax || 0, hpPercentual)}
        ${montarBarraStatus("Mana", personagem.manaAtual || 0, personagem.manaMax || 0, manaPercentual)}
        ${montarBarraStatus("Fome", personagem.fome || 0, 100, fomePercentual)}
        ${montarBarraStatus("Fadiga", personagem.fadiga || 0, 100, fadigaPercentual)}
      </div>

      <div class="personagem-actions">
        <button class="primary-btn abrir-ficha-personagem">Abrir ficha</button>
        <button class="secondary-btn editar-personagem">Editar</button>
        <button class="secondary-btn vincular-campanha">Vincular campanha</button>
        <button class="small-btn danger excluir-personagem">Excluir</button>
      </div>
    `;

    card.querySelector(".abrir-ficha-personagem").addEventListener("click", () => {
      abrirFichaPersonagem(personagem);
    });

    card.querySelector(".editar-personagem").addEventListener("click", () => {
      abrirModalEdicaoPersonagem(personagem);
    });

    card.querySelector(".vincular-campanha").addEventListener("click", () => {
      abrirModalVincularCampanha(personagem);
    });

    card.querySelector(".excluir-personagem").addEventListener("click", async () => {
      await excluirPersonagem(personagem);
    });

    lista.appendChild(card);
  });
}

function montarBarraStatus(label, atual, maximo, percentual) {
  return `
    <div class="status-line">
      <div>
        <span>${label}</span>
        <strong>${atual}/${maximo}</strong>
      </div>

      <div class="status-bar">
        <div style="width:${percentual}%"></div>
      </div>
    </div>
  `;
}

function calcularPercentual(atual, maximo) {
  const atualNumero = Number(atual) || 0;
  const maximoNumero = Number(maximo) || 0;

  if (maximoNumero <= 0) return 0;

  return Math.max(0, Math.min(100, Math.round((atualNumero / maximoNumero) * 100)));
}

export function renderizarTabelaMestre() {
  const tabela = document.getElementById("tabelaPersonagensMestre");

  if (!tabela) return;

  tabela.innerHTML = "";

  if (state.personagens.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="8">Nenhum personagem encontrado nas suas campanhas.</td>
      </tr>
    `;
    return;
  }

  state.personagens.forEach((personagem) => {
    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${escapeHtml(personagem.nome || "Sem nome")}</td>
      <td>${escapeHtml(personagem.donoNome || "Não informado")}</td>
      <td>${personagem.hpAtual || 0}/${personagem.hpMax || 0}</td>
      <td>${personagem.manaAtual || 0}/${personagem.manaMax || 0}</td>
      <td>${personagem.fome || 0}%</td>
      <td>${personagem.fadiga || 0}%</td>
      <td>Normal</td>
      <td><button class="small-btn danger">Abrir ficha</button></td>
    `;

    linha.querySelector("button").addEventListener("click", () => {
      abrirFichaPersonagem(personagem);
    });

    tabela.appendChild(linha);
  });
}

function atualizarContadorPersonagens() {
  const contador = document.getElementById("contadorPersonagens");

  if (contador) {
    contador.textContent = state.personagens.length;
  }
}

function aplicarEstilosCardsPersonagem() {
  if (document.getElementById("cardsPersonagemStyles")) return;

  const style = document.createElement("style");
  style.id = "cardsPersonagemStyles";

  style.textContent = `
    .character-list {
      display: grid;
      gap: 18px;
    }

    .personagem-card-refinado {
      padding: 24px;
      border-radius: 24px;
      background:
        radial-gradient(circle at 88% 0%, rgba(255,255,255,0.07), transparent 30%),
        linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025));
      border: 1px solid rgba(255,255,255,0.11);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }

    .personagem-card-top {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .personagem-avatar {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      color: #fff;
      font-size: 24px;
      font-weight: 900;
      background: linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.055));
      border: 1px solid rgba(255,255,255,0.14);
    }

    .personagem-title h4 {
      margin: 0;
      color: #fff;
      font-size: 26px;
      line-height: 1;
      letter-spacing: -0.035em;
    }

    .personagem-title p {
      margin: 8px 0 0;
      color: rgba(255,255,255,0.58);
      font-weight: 700;
    }

    .personagem-level {
      border-radius: 999px;
      padding: 9px 14px;
      color: #fff;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.10);
      font-size: 13px;
      font-weight: 900;
      white-space: nowrap;
    }

    .personagem-info-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .personagem-info-grid span {
      min-width: 0;
      display: grid;
      gap: 6px;
      padding: 14px;
      border-radius: 16px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
      color: #fff;
      font-weight: 800;
      word-break: break-word;
    }

    .personagem-info-grid b {
      color: rgba(255,255,255,0.44);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .personagem-status-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 22px;
    }

    .personagem-status-grid .status-line {
      border-radius: 16px;
      padding: 14px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .personagem-status-grid .status-line > div:first-child {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 9px;
      color: rgba(255,255,255,0.72);
      font-weight: 800;
    }

    .personagem-status-grid .status-bar {
      height: 9px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255,255,255,0.08);
    }

    .personagem-status-grid .status-bar div {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.42));
    }

    .personagem-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: flex-end;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 18px;
    }

    @media (max-width: 1080px) {
      .personagem-info-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .personagem-status-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .personagem-card-top {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .personagem-level {
        grid-column: 1 / -1;
        justify-self: start;
      }

      .personagem-info-grid,
      .personagem-status-grid {
        grid-template-columns: 1fr;
      }

      .personagem-actions {
        justify-content: stretch;
      }

      .personagem-actions button {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function escapeHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function initPersonagens() {
  onPageLoaded((pagina) => {
    if (pagina === "personagens") {
      renderizarPersonagens();

      document.getElementById("abrirCriacaoPersonagem")?.addEventListener("click", abrirModalCriacaoPersonagem);
    }

    if (pagina === "mestre") {
      renderizarTabelaMestre();
    }

    if (pagina === "dashboard") {
      atualizarContadorPersonagens();
    }
  });
}