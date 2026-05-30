import {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from "./firebase.js";

import { state, setClasses, setClasseSelecionada } from "./state.js";
import { onPageLoaded, navegarPara } from "./navigation.js";
import { mostrarModal, confirmarModal } from "./ui.js";

let unsubscribeClasses = null;
let unsubscribeHabilidades = null;
let unsubscribeSubclasses = null;

let habilidadesDisponiveis = [];
let subclassesDisponiveis = [];

let subclassesSelecionadas = [];
let editSubclassesSelecionadas = [];

let importacaoClassesPendentes = [];
let buscaClassesAtual = "";

export function iniciarClasses() {
  pararClasses();

  const classesRef = collection(db, "classes");
  const classesQuery = query(classesRef, orderBy("nome", "asc"));

  unsubscribeClasses = onSnapshot(
    classesQuery,
    (snapshot) => {
      const classes = [];

      snapshot.forEach((documento) => {
        classes.push({
          id: documento.id,
          ...documento.data()
        });
      });

      setClasses(classes);
      sincronizarClasseSelecionada();
      renderizarClasses();
    },
    (erro) => {
      console.error("Erro ao carregar classes:", erro);
    }
  );

  carregarOpcoesRelacionadasClasse();
}

export function pararClasses() {
  if (unsubscribeClasses) {
    unsubscribeClasses();
    unsubscribeClasses = null;
  }

  if (unsubscribeHabilidades) {
    unsubscribeHabilidades();
    unsubscribeHabilidades = null;
  }

  if (unsubscribeSubclasses) {
    unsubscribeSubclasses();
    unsubscribeSubclasses = null;
  }
}

function sincronizarClasseSelecionada() {
  if (!state.classeSelecionada) return;

  const atualizada = state.classesDisponiveis.find((classe) => classe.id === state.classeSelecionada.id);

  if (atualizada) {
    setClasseSelecionada(atualizada);
  }
}

function carregarOpcoesRelacionadasClasse() {
  const habilidadesQuery = query(collection(db, "habilidades"), orderBy("nome", "asc"));
  const subclassesQuery = query(collection(db, "subclasses"), orderBy("nome", "asc"));

  unsubscribeHabilidades = onSnapshot(
    habilidadesQuery,
    (snapshot) => {
      habilidadesDisponiveis = [];

      snapshot.forEach((documento) => {
        habilidadesDisponiveis.push({
          id: documento.id,
          ...documento.data()
        });
      });

      preencherSelectHabilidadesClasse();
      preencherSelectHabilidadesClasseEdicao();
    },
    (erro) => {
      console.error("Erro ao carregar habilidades para classes:", erro);
    }
  );

  unsubscribeSubclasses = onSnapshot(
    subclassesQuery,
    (snapshot) => {
      subclassesDisponiveis = [];

      snapshot.forEach((documento) => {
        subclassesDisponiveis.push({
          id: documento.id,
          ...documento.data()
        });
      });

      preencherSelectSubclassesClasse();
      preencherSelectSubclassesClasseEdicao();
    },
    (erro) => {
      console.error("Erro ao carregar subclasses para classes:", erro);
    }
  );
}

function numeroCampo(id) {
  return Number(document.getElementById(id)?.value) || 0;
}

function textoCampo(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function valorCampo(id) {
  return document.getElementById(id)?.value || "";
}

function textoSelectSelecionado(id) {
  const select = document.getElementById(id);

  if (!select || !select.selectedOptions[0]) return "";

  return select.selectedOptions[0].textContent;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function abrirModalCadastroClasse() {
  fecharModalCadastroClasse();

  subclassesSelecionadas = [];

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalCadastroClasse";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Cadastrar Classe</h3>
          <p>Preencha as informações abaixo e salve para adicionar esta classe à lista.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalCadastroClasse">×</button>
      </div>

      <div class="crud-form-body">
        ${montarFormularioCadastroClasse()}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalCadastroClasse")?.addEventListener("click", fecharModalCadastroClasse);
  document.getElementById("cancelarCadastroClasse")?.addEventListener("click", fecharModalCadastroClasse);
  document.getElementById("salvarClasse")?.addEventListener("click", salvarClasse);

  document.getElementById("adicionarSubclasseDisponivel")?.addEventListener("click", () => {
    adicionarSelecionado(
      "selectSubclassesDisponiveis",
      subclassesSelecionadas,
      renderizarSubclassesSelecionadasClasse
    );
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalCadastroClasse();
    }
  });

  preencherSelectHabilidadesClasse();
  preencherSelectSubclassesClasse();
  renderizarSubclassesSelecionadasClasse();
}

function fecharModalCadastroClasse() {
  const overlay = document.getElementById("modalCadastroClasse");

  if (overlay) {
    overlay.remove();
  }
}

function montarFormularioCadastroClasse() {
  return `
    <div class="crud-form-content">
      <div class="form-grid">
        <label>
          Nome da Classe
          <input type="text" id="classeNome" placeholder="Ex: Mago, Bárbaro, Domador, Espadachim..." />
        </label>

        <label>
          HP por Nível
          <input type="number" id="classeHpPorNivel" placeholder="Ex: 10" />
        </label>

        <label>
          Mana por Nível
          <input type="number" id="classeManaPorNivel" placeholder="Ex: 15" />
        </label>

        <label>
          Atributo Principal
          <select id="classeAtributoPrincipal">
            ${opcoesAtributos("")}
          </select>
        </label>

        <label>
          Atributo Secundário
          <select id="classeAtributoSecundario">
            ${opcoesAtributos("")}
          </select>
        </label>

        <label>
          Tipo de Dano
          <input type="text" id="classeTipoDano" placeholder="Ex: Físico, Mágico, Misto, Elemental..." />
        </label>

        <label>
          Tipo de Defesa
          <input type="text" id="classeTipoDefesa" placeholder="Ex: Defesa física, defesa mágica, evasão..." />
        </label>
      </div>

      <label>
        Armas Permitidas
        <textarea id="classeArmasPermitidas" placeholder="Ex: Espadas leves, cajados, arcos, adagas..."></textarea>
      </label>

      <label>
        Armaduras Permitidas
        <textarea id="classeArmadurasPermitidas" placeholder="Ex: Armaduras leves, mantos mágicos, couro, placas..."></textarea>
      </label>

      <label>
        Habilidade Exclusiva
        <select id="classeHabilidadeExclusiva">
          <option value="">Carregando habilidades...</option>
        </select>
      </label>

      <label>
        Vantagens
        <textarea id="classeVantagens" placeholder="Ex: Bônus em magia, maior controle elemental, pode invocar criaturas..."></textarea>
      </label>

      <label>
        Desvantagens
        <textarea id="classeDesvantagens" placeholder="Ex: Baixa defesa física, restrição de armas pesadas, alto custo de mana..."></textarea>
      </label>

      <div class="multi-select-box">
        <label>
          Subclasses Disponíveis
          <select id="selectSubclassesDisponiveis">
            <option value="">Carregando subclasses...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="adicionarSubclasseDisponivel">Adicionar subclasse</button>

        <div id="listaSubclassesDisponiveisSelecionadas" class="selected-list">
          <span class="empty-selection">Nenhuma subclasse selecionada.</span>
        </div>
      </div>

      <div class="action-row">
        <button class="secondary-btn" type="button" id="cancelarCadastroClasse">Cancelar</button>
        <button class="primary-btn" type="button" id="salvarClasse">Salvar classe</button>
      </div>
    </div>
  `;
}

async function salvarClasse() {
  if (!state.usuarioAtual) {
    await mostrarModal("Você precisa estar logado.", "Acesso necessário");
    return;
  }

  if (state.dadosUsuarioAtual?.tipo !== "mestre") {
    await mostrarModal("Apenas o Mestre pode cadastrar classes.", "Permissão negada");
    return;
  }

  const nome = textoCampo("classeNome");

  if (!nome) {
    await mostrarModal("Digite o nome da classe.", "Campo obrigatório");
    return;
  }

  const jaExiste = state.classesDisponiveis.some((classe) => {
    return normalizarTexto(classe.nome || "") === normalizarTexto(nome);
  });

  if (jaExiste) {
    await mostrarModal(`A classe "${nome}" já existe no sistema.`, "Classe duplicada", "danger");
    return;
  }

  const habilidadeExclusivaId = valorCampo("classeHabilidadeExclusiva");
  const habilidadeExclusivaNome = textoSelectSelecionado("classeHabilidadeExclusiva");

  const classe = {
    nome,
    hpPorNivel: numeroCampo("classeHpPorNivel"),
    manaPorNivel: numeroCampo("classeManaPorNivel"),
    atributoPrincipal: valorCampo("classeAtributoPrincipal"),
    atributoSecundario: valorCampo("classeAtributoSecundario"),
    tipoDano: textoCampo("classeTipoDano"),
    tipoDefesa: textoCampo("classeTipoDefesa"),
    armasPermitidas: textoCampo("classeArmasPermitidas"),
    armadurasPermitidas: textoCampo("classeArmadurasPermitidas"),
    habilidadeExclusiva: habilidadeExclusivaId
      ? {
          id: habilidadeExclusivaId,
          nome: habilidadeExclusivaNome
        }
      : null,
    vantagens: textoCampo("classeVantagens"),
        desvantagens: textoCampo("classeDesvantagens"),
    subclassesDisponiveis: subclassesSelecionadas,
    criadoPor: state.usuarioAtual.uid,
    criadoEm: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "classes"), classe);

    await mostrarModal("Classe cadastrada com sucesso.", "Cadastro realizado", "success");

    fecharModalCadastroClasse();
  } catch (erro) {
    console.error("Erro ao cadastrar classe:", erro);
    await mostrarModal("Erro ao cadastrar classe.", "Erro", "danger");
  }
}

function abrirModalImportacaoClasses() {
  fecharModalImportacaoClasses();

  importacaoClassesPendentes = [];

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalImportacaoClasses";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Importar Classes</h3>
          <p>Cole um texto com várias classes. O sistema tentará identificar os campos automaticamente.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalImportacaoClasses">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Texto para importação
            <textarea id="textoImportacaoClasses" placeholder="Nome da Classe: Guerreiro
HP por Nível: 15
Mana por Nível: 5
Atributo Principal: Força Física
Atributo Secundário: Resistência
Tipo de Dano: Físico
Tipo de Defesa: Defesa Física
Armas Permitidas: Espadas, machados
Armaduras Permitidas: Armaduras médias e pesadas
Habilidade Exclusiva: Golpe Brutal
Vantagens: Alta resistência
Desvantagens: Baixa mana
Subclasses Disponíveis: Cavaleiro, Berserker"></textarea>
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarImportacaoClasses">Cancelar</button>
            <button class="secondary-btn" type="button" id="analisarImportacaoClasses">Analisar texto</button>
            <button class="primary-btn" type="button" id="salvarImportacaoClasses">Salvar importação</button>
          </div>

          <div id="previewImportacaoClasses" class="import-preview">
            <p>Nenhuma classe analisada ainda.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalImportacaoClasses")?.addEventListener("click", fecharModalImportacaoClasses);
  document.getElementById("cancelarImportacaoClasses")?.addEventListener("click", fecharModalImportacaoClasses);
  document.getElementById("analisarImportacaoClasses")?.addEventListener("click", analisarImportacaoClasses);
  document.getElementById("salvarImportacaoClasses")?.addEventListener("click", salvarImportacaoClasses);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalImportacaoClasses();
    }
  });
}

function fecharModalImportacaoClasses() {
  const overlay = document.getElementById("modalImportacaoClasses");

  if (overlay) {
    overlay.remove();
  }

  importacaoClassesPendentes = [];
}

function analisarImportacaoClasses() {
  const texto = document.getElementById("textoImportacaoClasses")?.value || "";
  const preview = document.getElementById("previewImportacaoClasses");

  if (!preview) return;

  importacaoClassesPendentes = extrairClassesDoTexto(texto);

  if (!importacaoClassesPendentes.length) {
    preview.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma classe identificada.</h3>
        <p>Confira se o texto tem nomes e campos separados por dois-pontos.</p>
      </div>
    `;
    return;
  }

  preview.innerHTML = `
    <div class="import-preview-list">
      ${importacaoClassesPendentes
        .map((classe, index) => {
          return `
            <div class="import-preview-card">
              <strong>${index + 1}. ${escapeHtml(classe.nome || "Classe sem nome")}</strong>
              <p>
                HP/Nível: ${classe.hpPorNivel || 0} •
                Mana/Nível: ${classe.manaPorNivel || 0} •
                Dano: ${escapeHtml(classe.tipoDano || "Não informado")}
              </p>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function extrairClassesDoTexto(texto) {
  const blocos = texto
    .split(/\n\s*\n/g)
    .map((bloco) => bloco.trim())
    .filter(Boolean);

  return blocos
    .map((bloco) => extrairClasseDoBloco(bloco))
    .filter((classe) => classe.nome);
}

function extrairClasseDoBloco(bloco) {
  const linhas = bloco
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  const classe = {
    nome: "",
    hpPorNivel: 0,
    manaPorNivel: 0,
    atributoPrincipal: "",
    atributoSecundario: "",
    tipoDano: "",
    tipoDefesa: "",
    armasPermitidas: "",
    armadurasPermitidas: "",
    habilidadeExclusiva: null,
    vantagens: "",
    desvantagens: "",
    subclassesDisponiveis: []
  };

  linhas.forEach((linha, index) => {
    const partes = linha.split(":");

    if (partes.length < 2) {
      if (index === 0 && !classe.nome) {
        classe.nome = linha.replace(/^[-•\d.]+\s*/, "").trim();
      }

      return;
    }

    const chave = normalizarTexto(partes.shift());
    const valor = partes.join(":").trim();

    if (["nome da classe", "nome", "classe"].includes(chave)) {
      classe.nome = valor;
      return;
    }

    if (["hp por nivel", "hp por nível", "hp"].includes(chave)) {
      classe.hpPorNivel = Number(valor.replace(",", ".")) || 0;
      return;
    }

    if (["mana por nivel", "mana por nível", "mana"].includes(chave)) {
      classe.manaPorNivel = Number(valor.replace(",", ".")) || 0;
      return;
    }

    if (["atributo principal"].includes(chave)) {
      classe.atributoPrincipal = converterAtributoTexto(valor);
      return;
    }

    if (["atributo secundario", "atributo secundário"].includes(chave)) {
      classe.atributoSecundario = converterAtributoTexto(valor);
      return;
    }

    if (["tipo de dano", "dano"].includes(chave)) {
      classe.tipoDano = valor;
      return;
    }

    if (["tipo de defesa", "defesa"].includes(chave)) {
      classe.tipoDefesa = valor;
      return;
    }

    if (["armas permitidas", "armas"].includes(chave)) {
      classe.armasPermitidas = valor;
      return;
    }

    if (["armaduras permitidas", "armaduras"].includes(chave)) {
      classe.armadurasPermitidas = valor;
      return;
    }

    if (["habilidade exclusiva", "habilidade"].includes(chave)) {
      classe.habilidadeExclusiva = valor ? { id: gerarIdTemporario(valor), nome: valor } : null;
      return;
    }

    if (["vantagens"].includes(chave)) {
      classe.vantagens = valor;
      return;
    }

    if (["desvantagens"].includes(chave)) {
      classe.desvantagens = valor;
      return;
    }

    if (["subclasses disponiveis", "subclasses disponíveis", "subclasses"].includes(chave)) {
      classe.subclassesDisponiveis = valor
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((nome) => ({ id: gerarIdTemporario(nome), nome }));
    }
  });

  return classe;
}

async function salvarImportacaoClasses() {
  if (!importacaoClassesPendentes.length) {
    await mostrarModal("Analise o texto antes de salvar a importação.", "Importação vazia");
    return;
  }

  try {
    let salvas = 0;
    let ignoradas = 0;

    for (const classe of importacaoClassesPendentes) {
      const existe = state.classesDisponiveis.some((item) => {
        return normalizarTexto(item.nome || "") === normalizarTexto(classe.nome || "");
      });

      if (existe) {
        ignoradas += 1;
        continue;
      }

      await addDoc(collection(db, "classes"), {
        ...classe,
        criadoPor: state.usuarioAtual?.uid || "",
        criadoEm: serverTimestamp()
      });

      salvas += 1;
    }

    await mostrarModal(
      `Importação concluída. Classes salvas: ${salvas}. Ignoradas por já existirem: ${ignoradas}.`,
      "Importação salva",
      "success"
    );

    fecharModalImportacaoClasses();
  } catch (erro) {
    console.error("Erro ao importar classes:", erro);
    await mostrarModal("Erro ao salvar importação de classes.", "Erro", "danger");
  }
}

function preencherSelectHabilidadesClasse() {
  const select = document.getElementById("classeHabilidadeExclusiva");

  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = `<option value="">Nenhuma habilidade</option>`;

  habilidadesDisponiveis.forEach((habilidade) => {
    const option = document.createElement("option");
    option.value = habilidade.id;
    option.textContent = habilidade.nome || "Sem nome";
    select.appendChild(option);
  });

  if (valorAtual) {
    select.value = valorAtual;
  }
}

function preencherSelectHabilidadesClasseEdicao() {
  const select = document.getElementById("editClasseHabilidadeExclusiva");

  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = `<option value="">Nenhuma habilidade</option>`;

  habilidadesDisponiveis.forEach((habilidade) => {
    const option = document.createElement("option");
    option.value = habilidade.id;
    option.textContent = habilidade.nome || "Sem nome";
    select.appendChild(option);
  });

  if (valorAtual) {
    select.value = valorAtual;
  }
}

function preencherSelectSubclassesClasse() {
  const select = document.getElementById("selectSubclassesDisponiveis");

  if (!select) return;

  select.innerHTML = "";

  if (!subclassesDisponiveis.length) {
    select.innerHTML = `<option value="">Nenhuma subclasse cadastrada</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma subclasse</option>`;

  subclassesDisponiveis.forEach((subclasse) => {
    const option = document.createElement("option");
    option.value = subclasse.id;
    option.textContent = subclasse.nome || "Sem nome";
    select.appendChild(option);
  });
}

function preencherSelectSubclassesClasseEdicao() {
  const select = document.getElementById("editSelectSubclassesDisponiveis");

  if (!select) return;

  select.innerHTML = "";

  if (!subclassesDisponiveis.length) {
    select.innerHTML = `<option value="">Nenhuma subclasse cadastrada</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma subclasse</option>`;

  subclassesDisponiveis.forEach((subclasse) => {
    const option = document.createElement("option");
    option.value = subclasse.id;
    option.textContent = subclasse.nome || "Sem nome";
    select.appendChild(option);
  });
}
function adicionarSelecionado(selectId, lista, renderCallback) {
  const select = document.getElementById(selectId);

  if (!select || !select.value) {
    mostrarModal("Selecione uma opção primeiro.", "Campo obrigatório");
    return;
  }

  const id = select.value;
  const nome = select.selectedOptions[0].textContent;

  if (lista.some((item) => item.id === id)) {
    mostrarModal("Essa opção já foi adicionada.", "Opção repetida");
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

  if (!lista.length) {
    container.innerHTML = `<span class="empty-selection">${mensagemVazia}</span>`;
    return;
  }

  lista.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "selected-chip";

    chip.innerHTML = `
      ${escapeHtml(item.nome || "Sem nome")}
      <button type="button" title="Remover">×</button>
    `;

    chip.querySelector("button").addEventListener("click", () => {
      callbackRemover(item.id);
    });

    container.appendChild(chip);
  });
}

function renderizarSubclassesSelecionadasClasse() {
  renderizarListaSelecionada(
    "listaSubclassesDisponiveisSelecionadas",
    subclassesSelecionadas,
    "Nenhuma subclasse selecionada.",
    (id) => removerSelecionado(subclassesSelecionadas, id, renderizarSubclassesSelecionadasClasse)
  );
}

function renderizarEditSubclassesSelecionadasClasse() {
  renderizarListaSelecionada(
    "editListaSubclassesDisponiveisSelecionadas",
    editSubclassesSelecionadas,
    "Nenhuma subclasse selecionada.",
    (id) => removerSelecionado(editSubclassesSelecionadas, id, renderizarEditSubclassesSelecionadasClasse)
  );
}

function renderizarClasses() {
  aplicarEstilosBuscaClasses();

  const lista = document.getElementById("listaClasses");

  if (!lista) return;

  const classesFiltradas = filtrarClasses(state.classesDisponiveis, buscaClassesAtual);

  lista.innerHTML = "";

  if (!state.classesDisponiveis.length) {
    lista.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma classe cadastrada ainda.</h3>
        <p>Clique em cadastrar para adicionar a primeira classe.</p>
      </div>
    `;
    return;
  }

  if (!classesFiltradas.length) {
    lista.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma classe encontrada.</h3>
        <p>Tente buscar por outro nome, dano, defesa, atributo, habilidade ou subclasse.</p>
      </div>
    `;
    return;
  }

  classesFiltradas.forEach((classe) => {
    const card = document.createElement("div");
    card.className = "resource-card";
    card.dataset.searchText = normalizarTexto(montarTextoBuscaClasse(classe));

    card.innerHTML = `
      <div class="resource-card-header">
        <div>
          <h4>${escapeHtml(classe.nome || "Classe sem nome")}</h4>
          <p>
            HP/Nível: ${classe.hpPorNivel || 0}
            • Mana/Nível: ${classe.manaPorNivel || 0}
            • Dano: ${escapeHtml(classe.tipoDano || "Não informado")}
          </p>
        </div>

        <span>Classe</span>
      </div>

      <div class="resource-card-info">
        <div class="resource-card-line">
          <strong>Atributo Principal</strong>
          <span>${escapeHtml(formatarAtributo(classe.atributoPrincipal))}</span>
        </div>

        <div class="resource-card-line">
          <strong>Atributo Secundário</strong>
          <span>${escapeHtml(formatarAtributo(classe.atributoSecundario))}</span>
        </div>

        <div class="resource-card-line">
          <strong>Habilidade Exclusiva</strong>
          <span>${escapeHtml(classe.habilidadeExclusiva?.nome || "Não informado")}</span>
        </div>
      </div>

      <div class="action-row">
        <button class="secondary-btn ver-classe">Visualizar</button>
        <button class="secondary-btn editar-classe">Editar</button>
        <button class="small-btn danger excluir-classe">Excluir</button>
      </div>
    `;

    card.querySelector(".ver-classe").addEventListener("click", () => {
      setClasseSelecionada(classe);
      navegarPara("cadastrosClasseDetalhe");
    });

    card.querySelector(".editar-classe").addEventListener("click", () => {
      setClasseSelecionada(classe);
      navegarPara("cadastrosClasseDetalhe");
      setTimeout(() => renderizarClasseDetalhe(true), 100);
    });

    card.querySelector(".excluir-classe").addEventListener("click", async () => {
      await excluirClasse(classe);
    });

    lista.appendChild(card);
  });
}

function filtrarClasses(lista, termo) {
  const busca = normalizarTexto(termo);

  if (!busca) return lista;

  return lista.filter((classe) => {
    return normalizarTexto(montarTextoBuscaClasse(classe)).includes(busca);
  });
}

function montarTextoBuscaClasse(classe) {
  return [
    classe.nome,
    classe.hpPorNivel,
    classe.manaPorNivel,
    classe.atributoPrincipal,
    classe.atributoSecundario,
    formatarAtributo(classe.atributoPrincipal),
    formatarAtributo(classe.atributoSecundario),
    classe.tipoDano,
    classe.tipoDefesa,
    classe.armasPermitidas,
    classe.armadurasPermitidas,
    classe.habilidadeExclusiva?.nome,
    classe.vantagens,
    classe.desvantagens,
    formatarListaObjetos(classe.subclassesDisponiveis)
  ].join(" ");
}

export function renderizarClasseDetalhe(modoEdicao = false) {
  const container = document.getElementById("classeDetalheContainer");

  if (!container) return;

  const classe = state.classeSelecionada;

  if (!classe) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma classe selecionada.</h3>
        <p>Volte para a lista e escolha uma classe para visualizar.</p>
      </div>
    `;
    return;
  }

  if (modoEdicao) {
    editSubclassesSelecionadas = Array.isArray(classe.subclassesDisponiveis)
      ? [...classe.subclassesDisponiveis]
      : [];

    container.innerHTML = `
      <div class="detail-card">
        <div class="crud-form-content">
          <h3>Editar Classe</h3>

          <div class="form-grid">
            <label>
              Nome da Classe
              <input type="text" id="editClasseNome" value="${escapeHtml(classe.nome || "")}" />
            </label>

            <label>
              HP por Nível
              <input type="number" id="editClasseHpPorNivel" value="${classe.hpPorNivel || 0}" />
            </label>

            <label>
              Mana por Nível
              <input type="number" id="editClasseManaPorNivel" value="${classe.manaPorNivel || 0}" />
            </label>

            <label>
              Atributo Principal
              <select id="editClasseAtributoPrincipal">
                ${opcoesAtributos(classe.atributoPrincipal || "")}
              </select>
            </label>

            <label>
              Atributo Secundário
              <select id="editClasseAtributoSecundario">
                ${opcoesAtributos(classe.atributoSecundario || "")}
              </select>
            </label>

            <label>
              Tipo de Dano
              <input type="text" id="editClasseTipoDano" value="${escapeHtml(classe.tipoDano || "")}" />
            </label>

            <label>
              Tipo de Defesa
              <input type="text" id="editClasseTipoDefesa" value="${escapeHtml(classe.tipoDefesa || "")}" />
            </label>
          </div>

          <label>
            Armas Permitidas
            <textarea id="editClasseArmasPermitidas">${escapeHtml(classe.armasPermitidas || "")}</textarea>
          </label>

          <label>
            Armaduras Permitidas
            <textarea id="editClasseArmadurasPermitidas">${escapeHtml(classe.armadurasPermitidas || "")}</textarea>
          </label>

          <label>
            Habilidade Exclusiva
            <select id="editClasseHabilidadeExclusiva">
              <option value="">Carregando habilidades...</option>
            </select>
          </label>

          <label>
            Vantagens
            <textarea id="editClasseVantagens">${escapeHtml(classe.vantagens || "")}</textarea>
          </label>

          <label>
            Desvantagens
            <textarea id="editClasseDesvantagens">${escapeHtml(classe.desvantagens || "")}</textarea>
          </label>

          <div class="multi-select-box">
            <label>
              Subclasses Disponíveis
              <select id="editSelectSubclassesDisponiveis">
                <option value="">Carregando subclasses...</option>
              </select>
            </label>

            <button class="secondary-btn" type="button" id="editAdicionarSubclasseDisponivel">Adicionar subclasse</button>

            <div id="editListaSubclassesDisponiveisSelecionadas" class="selected-list">
              <span class="empty-selection">Nenhuma subclasse selecionada.</span>
            </div>
          </div>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarEdicaoClasse">Cancelar</button>
            <button class="primary-btn" type="button" id="salvarEdicaoClasse">Salvar alterações</button>
          </div>
        </div>
      </div>
    `;

    preencherSelectHabilidadesClasseEdicao();
    preencherSelectSubclassesClasseEdicao();

    const selectHabilidade = document.getElementById("editClasseHabilidadeExclusiva");

    if (selectHabilidade && classe.habilidadeExclusiva?.id) {
      selectHabilidade.value = classe.habilidadeExclusiva.id;
    }

    renderizarEditSubclassesSelecionadasClasse();

    document.getElementById("editAdicionarSubclasseDisponivel")?.addEventListener("click", () => {
      adicionarSelecionado(
        "editSelectSubclassesDisponiveis",
        editSubclassesSelecionadas,
        renderizarEditSubclassesSelecionadasClasse
      );
    });

    document.getElementById("cancelarEdicaoClasse")?.addEventListener("click", () => {
      renderizarClasseDetalhe(false);
    });

    document.getElementById("salvarEdicaoClasse")?.addEventListener("click", salvarEdicaoClasse);

    return;
  }
    container.innerHTML = `
    <div class="detail-card">
      <div class="detail-header">
        <div>
          <span>Classe</span>
          <h3>${escapeHtml(classe.nome || "Classe sem nome")}</h3>
        </div>

        <div class="action-row">
          <button class="secondary-btn" id="voltarListaClasses">Voltar</button>
          <button class="secondary-btn" id="editarClasse">Editar</button>
          <button class="small-btn danger" id="excluirClasse">Excluir</button>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-field">
          <span>HP por Nível</span>
          <strong>${classe.hpPorNivel || 0}</strong>
        </div>

        <div class="detail-field">
          <span>Mana por Nível</span>
          <strong>${classe.manaPorNivel || 0}</strong>
        </div>

        <div class="detail-field">
          <span>Atributo Principal</span>
          <strong>${escapeHtml(formatarAtributo(classe.atributoPrincipal))}</strong>
        </div>

        <div class="detail-field">
          <span>Atributo Secundário</span>
          <strong>${escapeHtml(formatarAtributo(classe.atributoSecundario))}</strong>
        </div>

        <div class="detail-field">
          <span>Tipo de Dano</span>
          <strong>${escapeHtml(classe.tipoDano || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Tipo de Defesa</span>
          <strong>${escapeHtml(classe.tipoDefesa || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Armas Permitidas</span>
          <strong>${escapeHtml(classe.armasPermitidas || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Armaduras Permitidas</span>
          <strong>${escapeHtml(classe.armadurasPermitidas || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Habilidade Exclusiva</span>
          <strong>${escapeHtml(classe.habilidadeExclusiva?.nome || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Vantagens</span>
          <strong>${escapeHtml(classe.vantagens || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Desvantagens</span>
          <strong>${escapeHtml(classe.desvantagens || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Subclasses Disponíveis</span>
          <strong>${escapeHtml(formatarListaObjetos(classe.subclassesDisponiveis))}</strong>
        </div>
      </div>
    </div>
  `;

  document.getElementById("voltarListaClasses")?.addEventListener("click", () => {
    navegarPara("cadastrosClasses");
  });

  document.getElementById("editarClasse")?.addEventListener("click", () => {
    renderizarClasseDetalhe(true);
  });

  document.getElementById("excluirClasse")?.addEventListener("click", async () => {
    await excluirClasse(classe);
    navegarPara("cadastrosClasses");
  });
}

async function salvarEdicaoClasse() {
  const classe = state.classeSelecionada;

  if (!classe) {
    await mostrarModal("Nenhuma classe selecionada.", "Erro", "danger");
    return;
  }

  const nome = textoCampo("editClasseNome");

  if (!nome) {
    await mostrarModal("Digite o nome da classe.", "Campo obrigatório");
    return;
  }

  const existeOutraClasse = state.classesDisponiveis.some((item) => {
    return item.id !== classe.id && normalizarTexto(item.nome || "") === normalizarTexto(nome);
  });

  if (existeOutraClasse) {
    await mostrarModal(`Já existe outra classe chamada "${nome}".`, "Classe duplicada", "danger");
    return;
  }

  const habilidadeExclusivaId = valorCampo("editClasseHabilidadeExclusiva");
  const habilidadeExclusivaNome = textoSelectSelecionado("editClasseHabilidadeExclusiva");

  const dadosAtualizados = {
    nome,
    hpPorNivel: numeroCampo("editClasseHpPorNivel"),
    manaPorNivel: numeroCampo("editClasseManaPorNivel"),
    atributoPrincipal: valorCampo("editClasseAtributoPrincipal"),
    atributoSecundario: valorCampo("editClasseAtributoSecundario"),
    tipoDano: textoCampo("editClasseTipoDano"),
    tipoDefesa: textoCampo("editClasseTipoDefesa"),
    armasPermitidas: textoCampo("editClasseArmasPermitidas"),
    armadurasPermitidas: textoCampo("editClasseArmadurasPermitidas"),
    habilidadeExclusiva: habilidadeExclusivaId
      ? {
          id: habilidadeExclusivaId,
          nome: habilidadeExclusivaNome
        }
      : null,
    vantagens: textoCampo("editClasseVantagens"),
    desvantagens: textoCampo("editClasseDesvantagens"),
    subclassesDisponiveis: editSubclassesSelecionadas,
    atualizadoEm: serverTimestamp()
  };

  try {
    await updateDoc(doc(db, "classes", classe.id), dadosAtualizados);

    setClasseSelecionada({
      ...classe,
      ...dadosAtualizados
    });

    await mostrarModal("Classe atualizada com sucesso.", "Alterações salvas", "success");

    renderizarClasseDetalhe(false);
  } catch (erro) {
    console.error("Erro ao editar classe:", erro);
    await mostrarModal("Erro ao editar classe.", "Erro", "danger");
  }
}

async function excluirClasse(classe) {
  const confirmar = await confirmarModal({
    titulo: "Excluir classe",
    mensagem: `Tem certeza que deseja excluir a classe “${classe.nome}”? Essa ação não pode ser desfeita.`,
    confirmarTexto: "Excluir",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "classes", classe.id));

    if (state.classeSelecionada?.id === classe.id) {
      setClasseSelecionada(null);
    }

    await mostrarModal("Classe excluída com sucesso.", "Exclusão concluída", "success");
  } catch (erro) {
    console.error("Erro ao excluir classe:", erro);
    await mostrarModal("Erro ao excluir classe.", "Erro", "danger");
  }
}

function vincularBuscaClasses() {
  const input = document.getElementById("buscaClasses");

  if (!input) return;

  buscaClassesAtual = input.value || "";

  input.oninput = () => {
    buscaClassesAtual = input.value || "";
    renderizarClasses();
  };
}

function aplicarEstilosBuscaClasses() {
  if (document.getElementById("classesBuscaStyles")) return;

  const style = document.createElement("style");
  style.id = "classesBuscaStyles";

  style.textContent = `
    .list-header-with-search {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 18px;
    }

    .list-header-with-search h3 {
      margin-bottom: 6px;
    }

    .list-header-with-search p {
      margin: 0;
      color: var(--muted);
    }

    .search-input {
      width: min(320px, 100%);
      border-radius: 16px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.35);
      color: var(--text);
      padding: 13px 15px;
      font-size: 14px;
      font-weight: 700;
      outline: none;
    }

    .search-input::placeholder {
      color: var(--muted);
    }

    .search-input:focus {
      border-color: var(--purple-soft);
      box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.16);
    }

    .resource-card-info {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .resource-card-line {
      display: grid;
      gap: 5px;
      padding: 12px;
      border-radius: 14px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .resource-card-line strong {
      color: rgba(255,255,255,0.48);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .resource-card-line span {
      color: rgba(255,255,255,0.78);
      line-height: 1.45;
      font-weight: 700;
    }

    @media (max-width: 760px) {
      .list-header-with-search {
        display: grid;
      }

      .search-input {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function opcoesAtributos(valorSelecionado) {
  const opcoes = [
    { valor: "", nome: "Selecione" },
    { valor: "forcaFisica", nome: "Força Física" },
    { valor: "forcaMagica", nome: "Força Mágica" },
    { valor: "defesaFisica", nome: "Defesa Física" },
    { valor: "defesaMagica", nome: "Defesa Mágica" },
    { valor: "velocidade", nome: "Velocidade" },
    { valor: "resistencia", nome: "Resistência" }
  ];

  return opcoes
    .map((opcao) => {
      const selected = opcao.valor === valorSelecionado ? "selected" : "";
      return `<option value="${opcao.valor}" ${selected}>${opcao.nome}</option>`;
    })
    .join("");
}

function converterAtributoTexto(texto) {
  const normalizado = normalizarTexto(texto);

  const mapa = {
    "forca fisica": "forcaFisica",
    "força fisica": "forcaFisica",
    "forca física": "forcaFisica",
    "força física": "forcaFisica",
    "forca magica": "forcaMagica",
    "força magica": "forcaMagica",
    "forca mágica": "forcaMagica",
    "força mágica": "forcaMagica",
    "defesa fisica": "defesaFisica",
    "defesa física": "defesaFisica",
    "defesa magica": "defesaMagica",
    "defesa mágica": "defesaMagica",
    "velocidade": "velocidade",
    "resistencia": "resistencia",
    "resistência": "resistencia"
  };

  return mapa[normalizado] || "";
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

function formatarListaObjetos(lista) {
  if (!Array.isArray(lista) || !lista.length) {
    return "Não informado";
  }

  return lista.map((item) => item.nome || item.id || item).join(", ");
}

function gerarIdTemporario(nome) {
  return normalizarTexto(nome)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `temp-${Date.now()}`;
}

function escapeHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function buscarClassePorId(id) {
  return state.classesDisponiveis.find((classe) => classe.id === id) || null;
}

export function preencherSelectClasses(selectId, valorAtual = "") {
  const select = document.getElementById(selectId);

  if (!select) return;

  select.innerHTML = "";

  if (!state.classesDisponiveis.length) {
    select.innerHTML = `<option value="">Nenhuma classe cadastrada</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma classe</option>`;

  state.classesDisponiveis.forEach((classe) => {
    const option = document.createElement("option");
    option.value = classe.id;
    option.textContent = classe.nome || "Sem nome";
    select.appendChild(option);
  });

  if (valorAtual) {
    select.value = valorAtual;
  }
}

export function initClasses() {
  onPageLoaded((pagina) => {
    if (pagina === "cadastrosClasses") {
      aplicarEstilosBuscaClasses();
      vincularBuscaClasses();
      renderizarClasses();

      document.getElementById("abrirCadastroClasses")?.addEventListener("click", abrirModalCadastroClasse);
      document.getElementById("abrirImportacaoClasses")?.addEventListener("click", abrirModalImportacaoClasses);
    }

    if (pagina === "cadastrosClasseDetalhe") {
      renderizarClasseDetalhe(false);
    }
  });
}