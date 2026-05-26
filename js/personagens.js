import {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy
} from "./firebase.js";

import { state, setPersonagens } from "./state.js";
import { onPageLoaded } from "./navigation.js";
import { buscarRacaPorId, preencherSelectRacas, atualizarPreviewRaca } from "./racas.js";
import { buscarCampanhaPorId, preencherSelectCampanhas } from "./campanhas.js";
import { abrirFichaPersonagem } from "./ficha.js";
import { mostrarModal } from "./ui.js";

let unsubscribePersonagens = null;
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

let modalCriacaoPersonagemAberto = false;

export function iniciarPersonagens() {
  pararPersonagens();

  const personagensRef = collection(db, "personagens");

  const consulta = state.dadosUsuarioAtual?.tipo === "mestre"
    ? query(personagensRef, where("mestreId", "==", state.usuarioAtual.uid))
    : query(personagensRef, where("donoId", "==", state.usuarioAtual.uid));

  unsubscribePersonagens = onSnapshot(consulta, (snapshot) => {
    const personagens = [];

    snapshot.forEach((documento) => {
      personagens.push({
        id: documento.id,
        ...documento.data()
      });
    });

    setPersonagens(personagens);
    renderizarPersonagens();
    renderizarTabelaMestre();
    atualizarContadorPersonagens();
  });

  carregarOpcoesPersonagem();
}

export function pararPersonagens() {
  if (unsubscribePersonagens) {
    unsubscribePersonagens();
    unsubscribePersonagens = null;
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
}

function carregarOpcoesPersonagem() {
  unsubscribeClassesPersonagem = onSnapshot(query(collection(db, "classes"), orderBy("nome", "asc")), (snapshot) => {
    classesDisponiveisPersonagem = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    preencherSelectClassesPersonagem();
    preencherSelectSubclassesPersonagem();
    atualizarPreviewPersonagem();
  });

  unsubscribeSubclassesPersonagem = onSnapshot(query(collection(db, "subclasses"), orderBy("nome", "asc")), (snapshot) => {
    subclassesDisponiveisPersonagem = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    preencherSelectSubclassesPersonagem();
    atualizarPreviewPersonagem();
  });

  unsubscribeElementosPersonagem = onSnapshot(query(collection(db, "elementos"), orderBy("nome", "asc")), (snapshot) => {
    elementosDisponiveisPersonagem = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    preencherSelectElementosPersonagem();
    atualizarPreviewPersonagem();
  });

  unsubscribeHabilidadesPersonagem = onSnapshot(query(collection(db, "habilidades"), orderBy("nome", "asc")), (snapshot) => {
    habilidadesDisponiveisPersonagem = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    preencherSelectHabilidadesPersonagem();
  });

  unsubscribeItensPersonagem = onSnapshot(query(collection(db, "itens"), orderBy("nome", "asc")), (snapshot) => {
    itensDisponiveisPersonagem = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    preencherSelectItensPersonagem();
  });

  unsubscribePetsPersonagem = onSnapshot(query(collection(db, "pets"), orderBy("nome", "asc")), (snapshot) => {
    petsDisponiveisPersonagem = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    preencherSelectPetsPersonagem();
    atualizarPreviewPersonagem();
  });
}

function abrirModalCriacaoPersonagem() {
  fecharModalCriacaoPersonagem();

  modalCriacaoPersonagemAberto = true;
  habilidadesIniciaisSelecionadas = [];
  itensIniciaisSelecionados = [];

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalCriacaoPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Criar Personagem</h3>
          <p>Escolha raça, classe, subclasse, elemento, pet, habilidades e itens iniciais.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalCriacaoPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        ${montarFormularioCriacaoPersonagem()}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalCriacaoPersonagem").addEventListener("click", fecharModalCriacaoPersonagem);
  document.getElementById("cancelarCriacaoPersonagem").addEventListener("click", fecharModalCriacaoPersonagem);
  document.getElementById("btnCriarPersonagem").addEventListener("click", criarPersonagem);

  document.getElementById("adicionarHabilidadeInicial").addEventListener("click", async () => {
    await adicionarSelecionado(
      "selectHabilidadesIniciais",
      habilidadesIniciaisSelecionadas,
      renderizarHabilidadesIniciais
    );
  });

  document.getElementById("adicionarItemInicial").addEventListener("click", async () => {
    await adicionarSelecionado(
      "selectItensIniciais",
      itensIniciaisSelecionados,
      renderizarItensIniciais
    );
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalCriacaoPersonagem();
    }
  });

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
  vincularEventosPreviewPersonagem();
}

function fecharModalCriacaoPersonagem() {
  const overlay = document.getElementById("modalCriacaoPersonagem");

  if (overlay) {
    overlay.remove();
  }

  modalCriacaoPersonagemAberto = false;
}

function montarFormularioCriacaoPersonagem() {
  return `
    <div class="crud-form-content">
      <div class="form-grid">
        <label>
          Nome do personagem
          <input type="text" id="personagemNome" placeholder="Ex: Kael" />
        </label>

        <label>
          Nível inicial
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
          Pet inicial
          <select id="personagemPet">
            <option value="">Carregando pets...</option>
          </select>
        </label>
      </div>

      <div class="base-preview character-preview">
        <div class="preview-title-row">
          <div>
            <h4>Prévia do Personagem</h4>
            <p>Os valores abaixo são calculados a partir da raça, classe e nível inicial.</p>
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
        <button class="secondary-btn" type="button" id="cancelarCriacaoPersonagem">Cancelar</button>
        <button class="primary-btn" type="button" id="btnCriarPersonagem">Criar personagem</button>
      </div>
    </div>
  `;
}

function vincularEventosPreviewPersonagem() {
  const camposPreview = [
    "personagemNivel",
    "personagemRaca",
    "personagemClasse",
    "personagemSubclasse",
    "personagemElemento",
    "personagemPet"
  ];

  camposPreview.forEach((id) => {
    const campo = document.getElementById(id);

    if (!campo) return;

    campo.addEventListener("change", () => {
      if (id === "personagemRaca") {
        preencherSelectClassesPersonagem();
        preencherSelectSubclassesPersonagem();
      }

      if (id === "personagemClasse") {
        preencherSelectSubclassesPersonagem();
      }

      const selectRaca = document.getElementById("personagemRaca");

      if (selectRaca) {
        const raca = buscarRacaPorId(selectRaca.value);
        atualizarPreviewRaca(raca);
      }

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
}

function preencherSelectElementosPersonagem() {
  const select = document.getElementById("personagemElemento");

  if (!select) return;

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
}

function preencherSelectPetsPersonagem() {
  const select = document.getElementById("personagemPet");

  if (!select) return;

  select.innerHTML = `<option value="">Nenhum pet inicial</option>`;

  petsDisponiveisPersonagem.forEach((pet) => {
    const option = document.createElement("option");
    option.value = pet.id;
    option.textContent = pet.nome || "Sem nome";
    select.appendChild(option);
  });
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
      ${item.nome}
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

async function criarPersonagem() {
  if (!state.usuarioAtual) {
    await mostrarModal("Você precisa estar logado para criar um personagem.", "Acesso necessário");
    return;
  }

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
    await mostrarModal("Digite o nome do personagem.", "Campo obrigatório");
    return;
  }

  if (!racaId) {
    await mostrarModal("Selecione uma raça.", "Campo obrigatório");
    return;
  }

  if (!classeId) {
    await mostrarModal("Selecione uma classe.", "Campo obrigatório");
    return;
  }

  const campanha = campanhaId ? buscarCampanhaPorId(campanhaId) : null;
  const raca = buscarRacaPorId(racaId);
  const classe = buscarClassePorId(classeId);
  const subclasse = buscarSubclassePorId(subclasseId);
  const elemento = buscarElementoPorId(elementoId);
  const pet = buscarPetPorId(petId);

  if (!raca || !classe) {
    await mostrarModal("Raça ou classe não encontrada. Verifique os cadastros selecionados.", "Erro", "danger");
    return;
  }

  if (campanhaId && !campanha) {
    await mostrarModal("Campanha não encontrada. Escolha outra campanha ou deixe o campo como Nenhuma campanha.", "Erro", "danger");
    return;
  }

  if (classeEstaRestrita(raca, classe)) {
    await mostrarModal(
      `A raça "${raca.nome}" possui restrição para a classe "${classe.nome}".`,
      "Classe restrita",
      "danger"
    );

    preencherSelectClassesPersonagem();
    preencherSelectSubclassesPersonagem();
    atualizarPreviewPersonagem();
    return;
  }

  const hpInicial = calcularHpInicial(raca, classe, nivel);
  const manaInicial = calcularManaInicial(raca, classe, nivel);

  try {
    await addDoc(collection(db, "personagens"), {
      nome,
      nivel,
      donoId: state.usuarioAtual.uid,
      donoNome: state.dadosUsuarioAtual.nome || state.usuarioAtual.email,
      donoEmail: state.usuarioAtual.email,

      campanhaId: campanha?.id || "",
      campanhaNome: campanha?.nome || "Sem campanha",
      mestreId: campanha?.mestreId || "",

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
      hpAtual: hpInicial,
      manaMax: manaInicial,
      manaAtual: manaInicial,

      forcaFisica: raca.forcaFisica ?? raca.forca ?? 0,
      forcaMagica: raca.forcaMagica ?? 0,
      defesaFisica: raca.defesaFisica ?? raca.defesa ?? 0,
      defesaMagica: raca.defesaMagica ?? 0,
      velocidade: raca.velocidade ?? 0,
      resistencia: raca.resistencia ?? 0,

      carismaBonus: raca.carismaBonus || "",
      fatorMedoBonus: raca.fatorMedoBonus || "",

      fome: 0,
      fadiga: 0,

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
      restricoesClasse: raca.restricoesClasse || [],

      criadoEm: serverTimestamp()
    });

    await mostrarModal("Personagem criado com sucesso.", "Cadastro realizado", "success");

    fecharModalCriacaoPersonagem();
    renderizarPersonagens();
  } catch (erro) {
    console.error("Erro ao criar personagem:", erro);
    await mostrarModal("Erro ao criar personagem. Verifique os dados e tente novamente.", "Erro", "danger");
  }
}

export function renderizarPersonagens() {
  const lista = document.getElementById("listaPersonagens");

  if (!lista) return;

  lista.innerHTML = "";

  const personagensDoUsuario = state.dadosUsuarioAtual?.tipo === "mestre"
    ? state.personagens
    : state.personagens.filter((personagem) => personagem.donoId === state.usuarioAtual.uid);

  if (personagensDoUsuario.length === 0) {
    lista.innerHTML = "<p>Nenhum personagem criado ainda.</p>";
    return;
  }

  personagensDoUsuario.forEach((personagem) => {
    const card = document.createElement("div");
    card.classList.add("character-created-card");

    card.innerHTML = `
      <h3>${personagem.nome}</h3>
      <p><b>Jogador:</b> ${personagem.donoNome || "Não informado"}</p>
      <p><b>Campanha:</b> ${personagem.campanhaNome || "Sem campanha"}</p>
      <p><b>Raça:</b> ${personagem.raca?.nome || personagem.racaNome || "Não informada"}</p>
      <p><b>Classe:</b> ${personagem.classe?.nome || personagem.classeNome || personagem.classe || "Não informada"}</p>
      <p><b>Subclasse:</b> ${personagem.subclasse?.nome || personagem.subclasseNome || personagem.subclasse || "Não informada"}</p>
      <p><b>Elemento:</b> ${personagem.elemento?.nome || personagem.elementoNome || personagem.elemento || "Não informado"}</p>
      <p><b>HP:</b> ${personagem.hpAtual}/${personagem.hpMax} | <b>Mana:</b> ${personagem.manaAtual}/${personagem.manaMax}</p>
      <button class="secondary-btn">Abrir ficha</button>
    `;

    card.querySelector("button").addEventListener("click", () => {
      abrirFichaPersonagem(personagem);
    });

    lista.appendChild(card);
  });
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
      <td>${personagem.nome}</td>
      <td>${personagem.donoNome || "Não informado"}</td>
      <td>${personagem.hpAtual}/${personagem.hpMax}</td>
      <td>${personagem.manaAtual}/${personagem.manaMax}</td>
      <td>${personagem.fome || 0}%</td>
      <td>${personagem.fadiga || 0}%</td>
      <td>Normal</td>
      <td><button class="small-btn danger">Possessão</button></td>
    `;

    tabela.appendChild(linha);
  });
}

function atualizarContadorPersonagens() {
  const contador = document.getElementById("contadorPersonagens");

  if (contador) {
    contador.textContent = state.personagens.length;
  }
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