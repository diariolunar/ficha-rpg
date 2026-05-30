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

import { state, setRacas, setRacaSelecionada } from "./state.js";
import { onPageLoaded, navegarPara } from "./navigation.js";
import { mostrarModal, confirmarModal } from "./ui.js";

let unsubscribeRacas = null;
let unsubscribeClasses = null;
let unsubscribeElementos = null;
let unsubscribeHabilidades = null;

let classesDisponiveis = [];
let elementosDisponiveis = [];
let habilidadesDisponiveis = [];

let classesSugeridasSelecionadas = [];
let elementosAfinsSelecionados = [];
let restricoesClasseSelecionadas = [];

let editClassesSugeridasSelecionadas = [];
let editElementosAfinsSelecionados = [];
let editRestricoesClasseSelecionadas = [];

let importacaoRacasPendentes = [];
let buscaRacasAtual = "";

export function iniciarRacas() {
  pararRacas();

  const racasRef = collection(db, "racas");
  const racasQuery = query(racasRef, orderBy("nome", "asc"));

  unsubscribeRacas = onSnapshot(
    racasQuery,
    (snapshot) => {
      const racas = [];

      snapshot.forEach((documento) => {
        racas.push({
          id: documento.id,
          ...documento.data()
        });
      });

      setRacas(racas);
      sincronizarRacaSelecionada();
      renderizarRacas();
    },
    (erro) => {
      console.error("Erro ao carregar raças:", erro);
    }
  );

  carregarOpcoesRelacionadasRaca();
}

export function pararRacas() {
  if (unsubscribeRacas) {
    unsubscribeRacas();
    unsubscribeRacas = null;
  }

  if (unsubscribeClasses) {
    unsubscribeClasses();
    unsubscribeClasses = null;
  }

  if (unsubscribeElementos) {
    unsubscribeElementos();
    unsubscribeElementos = null;
  }

  if (unsubscribeHabilidades) {
    unsubscribeHabilidades();
    unsubscribeHabilidades = null;
  }
}

function sincronizarRacaSelecionada() {
  if (!state.racaSelecionada) return;

  const atualizada = state.racasDisponiveis.find((raca) => raca.id === state.racaSelecionada.id);

  if (atualizada) {
    setRacaSelecionada(atualizada);
  }
}

function carregarOpcoesRelacionadasRaca() {
  const classesQuery = query(collection(db, "classes"), orderBy("nome", "asc"));
  const elementosQuery = query(collection(db, "elementos"), orderBy("nome", "asc"));
  const habilidadesQuery = query(collection(db, "habilidades"), orderBy("nome", "asc"));

  unsubscribeClasses = onSnapshot(
    classesQuery,
    (snapshot) => {
      classesDisponiveis = [];

      snapshot.forEach((documento) => {
        classesDisponiveis.push({
          id: documento.id,
          ...documento.data()
        });
      });

      preencherSelectClassesSugeridas();
      preencherSelectRestricoesClasse();
      preencherSelectEditClassesSugeridas();
      preencherSelectEditRestricoesClasse();
    },
    (erro) => {
      console.error("Erro ao carregar classes para raças:", erro);
    }
  );

  unsubscribeElementos = onSnapshot(
    elementosQuery,
    (snapshot) => {
      elementosDisponiveis = [];

      snapshot.forEach((documento) => {
        elementosDisponiveis.push({
          id: documento.id,
          ...documento.data()
        });
      });

      preencherSelectElementosAfins();
      preencherSelectEditElementosAfins();
    },
    (erro) => {
      console.error("Erro ao carregar elementos para raças:", erro);
    }
  );

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

      preencherSelectHabilidadeExclusivaRaca();
      preencherSelectEditHabilidadeExclusivaRaca();
    },
    (erro) => {
      console.error("Erro ao carregar habilidades para raças:", erro);
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

function abrirModalCadastroRaca() {
  fecharModalCadastroRaca();

  classesSugeridasSelecionadas = [];
  elementosAfinsSelecionados = [];
  restricoesClasseSelecionadas = [];

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalCadastroRaca";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Cadastrar Raça</h3>
          <p>Preencha as informações abaixo e salve para adicionar esta raça à lista.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalCadastroRaca">×</button>
      </div>

      <div class="crud-form-body">
        ${montarFormularioCadastroRaca()}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalCadastroRaca")?.addEventListener("click", fecharModalCadastroRaca);
  document.getElementById("cancelarCadastroRaca")?.addEventListener("click", fecharModalCadastroRaca);
  document.getElementById("salvarRaca")?.addEventListener("click", salvarRaca);

  document.getElementById("adicionarClasseSugerida")?.addEventListener("click", () => {
    adicionarSelecionado(
      "selectClassesSugeridas",
      classesSugeridasSelecionadas,
      renderizarClassesSugeridasSelecionadas
    );
  });

  document.getElementById("adicionarElementoAfim")?.addEventListener("click", () => {
    adicionarSelecionado(
      "selectElementosAfins",
      elementosAfinsSelecionados,
      renderizarElementosAfinsSelecionados
    );
  });

  document.getElementById("adicionarRestricaoClasse")?.addEventListener("click", () => {
    adicionarSelecionadoEspecial(
      "selectRestricoesClasse",
      restricoesClasseSelecionadas,
      renderizarRestricoesClasseSelecionadas
    );
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalCadastroRaca();
    }
  });

  preencherSelectClassesSugeridas();
  preencherSelectElementosAfins();
  preencherSelectRestricoesClasse();
  preencherSelectHabilidadeExclusivaRaca();

  renderizarClassesSugeridasSelecionadas();
  renderizarElementosAfinsSelecionados();
  renderizarRestricoesClasseSelecionadas();
}

function fecharModalCadastroRaca() {
  const overlay = document.getElementById("modalCadastroRaca");

  if (overlay) {
    overlay.remove();
  }
}

function montarFormularioCadastroRaca() {
  return `
    <div class="crud-form-content">
      <div class="form-grid">
        <label>
          Nome da Raça
          <input type="text" id="racaNome" placeholder="Ex: Humano, Elfo, Anão, Orc..." />
        </label>

        <label>
          HP Base
          <input type="number" id="racaHpBase" placeholder="Ex: 100" />
        </label>

        <label>
          Mana Base
          <input type="number" id="racaManaBase" placeholder="Ex: 80" />
        </label>

        <label>
          Força Física
          <input type="number" id="racaForcaFisica" placeholder="Ex: 10" />
        </label>

        <label>
          Força Mágica
          <input type="number" id="racaForcaMagica" placeholder="Ex: 10" />
        </label>

        <label>
          Defesa Física
          <input type="number" id="racaDefesaFisica" placeholder="Ex: 10" />
        </label>

        <label>
          Defesa Mágica
          <input type="number" id="racaDefesaMagica" placeholder="Ex: 10" />
        </label>

        <label>
          Velocidade
          <input type="number" id="racaVelocidade" placeholder="Ex: 10" />
        </label>

        <label>
          Resistência
          <input type="number" id="racaResistencia" placeholder="Ex: 10" />
        </label>

        <label>
          Bônus de Carisma
          <input type="text" id="racaCarismaBonus" placeholder="Ex: +2 em diplomacia" />
        </label>

        <label>
          Fator Medo
          <input type="text" id="racaFatorMedoBonus" placeholder="Ex: +1 contra intimidação" />
        </label>
      </div>

      <label>
        Habilidade Exclusiva
        <select id="racaHabilidadeExclusiva">
          <option value="">Carregando habilidades...</option>
        </select>
      </label>

      <label>
        Vantagens
        <textarea id="racaVantagens" placeholder="Ex: Visão noturna, afinidade mágica, resistência natural..."></textarea>
      </label>

      <label>
        Desvantagens
        <textarea id="racaDesvantagens" placeholder="Ex: Fraqueza contra luz, baixa resistência física..."></textarea>
      </label>

      <div class="multi-select-box">
        <label>
          Classes Sugeridas
          <select id="selectClassesSugeridas">
            <option value="">Carregando classes...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="adicionarClasseSugerida">Adicionar classe</button>

        <div id="listaClassesSugeridasSelecionadas" class="selected-list">
          <span class="empty-selection">Nenhuma classe sugerida selecionada.</span>
        </div>
      </div>

      <div class="multi-select-box">
        <label>
          Elementos Afins
          <select id="selectElementosAfins">
            <option value="">Carregando elementos...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="adicionarElementoAfim">Adicionar elemento</button>

        <div id="listaElementosAfinsSelecionados" class="selected-list">
          <span class="empty-selection">Nenhum elemento afim selecionado.</span>
        </div>
      </div>

      <div class="multi-select-box">
        <label>
          Restrições de Classes
          <select id="selectRestricoesClasse">
            <option value="">Carregando classes...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="adicionarRestricaoClasse">Adicionar restrição</button>

        <div id="listaRestricoesClasseSelecionadas" class="selected-list">
          <span class="empty-selection">Nenhuma restrição de classe selecionada.</span>
        </div>
      </div>

      <div class="action-row">
        <button class="secondary-btn" type="button" id="cancelarCadastroRaca">Cancelar</button>
        <button class="primary-btn" type="button" id="salvarRaca">Salvar raça</button>
      </div>
    </div>
  `;
}
async function salvarRaca() {
  if (!state.usuarioAtual) {
    await mostrarModal("Você precisa estar logado.", "Acesso necessário");
    return;
  }

  if (state.dadosUsuarioAtual?.tipo !== "mestre") {
    await mostrarModal("Apenas o Mestre pode cadastrar raças.", "Permissão negada");
    return;
  }

  const nome = textoCampo("racaNome");

  if (!nome) {
    await mostrarModal("Digite o nome da raça.", "Campo obrigatório");
    return;
  }

  const jaExiste = state.racasDisponiveis.some((raca) => {
    return normalizarTexto(raca.nome || "") === normalizarTexto(nome);
  });

  if (jaExiste) {
    await mostrarModal(`A raça "${nome}" já existe no sistema.`, "Raça duplicada", "danger");
    return;
  }

  const habilidadeExclusivaId = valorCampo("racaHabilidadeExclusiva");
  const habilidadeExclusivaNome = textoSelectSelecionado("racaHabilidadeExclusiva");

  const raca = {
    nome,
    hpBase: numeroCampo("racaHpBase"),
    manaBase: numeroCampo("racaManaBase"),
    forcaFisica: numeroCampo("racaForcaFisica"),
    forcaMagica: numeroCampo("racaForcaMagica"),
    defesaFisica: numeroCampo("racaDefesaFisica"),
    defesaMagica: numeroCampo("racaDefesaMagica"),
    velocidade: numeroCampo("racaVelocidade"),
    resistencia: numeroCampo("racaResistencia"),
    carismaBonus: textoCampo("racaCarismaBonus"),
    fatorMedoBonus: textoCampo("racaFatorMedoBonus"),
    habilidadeExclusiva: habilidadeExclusivaId
      ? {
          id: habilidadeExclusivaId,
          nome: habilidadeExclusivaNome
        }
      : null,
    vantagens: textoCampo("racaVantagens"),
    desvantagens: textoCampo("racaDesvantagens"),
    classesSugeridas: classesSugeridasSelecionadas,
    elementosAfins: elementosAfinsSelecionados,
    restricoesClasse: restricoesClasseSelecionadas,
    criadoPor: state.usuarioAtual.uid,
    criadoEm: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "racas"), raca);

    await mostrarModal("Raça cadastrada com sucesso.", "Cadastro realizado", "success");

    fecharModalCadastroRaca();
  } catch (erro) {
    console.error("Erro ao cadastrar raça:", erro);
    await mostrarModal("Erro ao cadastrar raça.", "Erro", "danger");
  }
}

function abrirModalImportacaoRacas() {
  fecharModalImportacaoRacas();

  importacaoRacasPendentes = [];

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalImportacaoRacas";

  overlay.innerHTML = `
    <div class="crud-form-modal">
      <div class="crud-form-header">
        <div>
          <h3>Importar Raças</h3>
          <p>Cole um texto com várias raças. O sistema tentará identificar os campos automaticamente.</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalImportacaoRacas">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Texto para importação
            <textarea id="textoImportacaoRacas" placeholder="Nome da Raça: Elfo
HP Base: 80
Mana Base: 120
Força Física: 6
Força Mágica: 14
Defesa Física: 7
Defesa Mágica: 12
Velocidade: 13
Resistência: 8
Bônus de Carisma: +2 em diplomacia
Fator Medo: Baixo
Habilidade Exclusiva: Visão Etérea
Vantagens: Afinidade mágica e sentidos aguçados
Desvantagens: Baixa resistência física
Classes Sugeridas: Mago, Arqueiro
Elementos Afins: Luz, Vento
Restrições de Classes: Ladino"></textarea>
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarImportacaoRacas">Cancelar</button>
            <button class="secondary-btn" type="button" id="analisarImportacaoRacas">Analisar texto</button>
            <button class="primary-btn" type="button" id="salvarImportacaoRacas">Salvar importação</button>
          </div>

          <div id="previewImportacaoRacas" class="import-preview">
            <p>Nenhuma raça analisada ainda.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalImportacaoRacas")?.addEventListener("click", fecharModalImportacaoRacas);
  document.getElementById("cancelarImportacaoRacas")?.addEventListener("click", fecharModalImportacaoRacas);
  document.getElementById("analisarImportacaoRacas")?.addEventListener("click", analisarImportacaoRacas);
  document.getElementById("salvarImportacaoRacas")?.addEventListener("click", salvarImportacaoRacas);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalImportacaoRacas();
    }
  });
}

function fecharModalImportacaoRacas() {
  const overlay = document.getElementById("modalImportacaoRacas");

  if (overlay) {
    overlay.remove();
  }

  importacaoRacasPendentes = [];
}

function analisarImportacaoRacas() {
  const texto = document.getElementById("textoImportacaoRacas")?.value || "";
  const preview = document.getElementById("previewImportacaoRacas");

  if (!preview) return;

  importacaoRacasPendentes = extrairRacasDoTexto(texto);

  if (!importacaoRacasPendentes.length) {
    preview.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma raça identificada.</h3>
        <p>Confira se o texto tem nomes e campos separados por dois-pontos.</p>
      </div>
    `;
    return;
  }

  preview.innerHTML = `
    <div class="import-preview-list">
      ${importacaoRacasPendentes
        .map((raca, index) => {
          return `
            <div class="import-preview-card">
              <strong>${index + 1}. ${escapeHtml(raca.nome || "Raça sem nome")}</strong>
              <p>
                HP: ${raca.hpBase || 0} •
                Mana: ${raca.manaBase || 0} •
                Velocidade: ${raca.velocidade || 0}
              </p>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function extrairRacasDoTexto(texto) {
  const blocos = texto
    .split(/\n\s*\n/g)
    .map((bloco) => bloco.trim())
    .filter(Boolean);

  return blocos
    .map((bloco) => extrairRacaDoBloco(bloco))
    .filter((raca) => raca.nome);
}

function extrairRacaDoBloco(bloco) {
  const linhas = bloco
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  const raca = {
    nome: "",
    hpBase: 0,
    manaBase: 0,
    forcaFisica: 0,
    forcaMagica: 0,
    defesaFisica: 0,
    defesaMagica: 0,
    velocidade: 0,
    resistencia: 0,
    carismaBonus: "",
    fatorMedoBonus: "",
    habilidadeExclusiva: null,
    vantagens: "",
    desvantagens: "",
    classesSugeridas: [],
    elementosAfins: [],
    restricoesClasse: []
  };

  linhas.forEach((linha, index) => {
    const partes = linha.split(":");

    if (partes.length < 2) {
      if (index === 0 && !raca.nome) {
        raca.nome = linha.replace(/^[-•\d.]+\s*/, "").trim();
      }

      return;
    }

    const chave = normalizarTexto(partes.shift());
    const valor = partes.join(":").trim();

    if (["nome da raca", "nome da raça", "nome", "raca", "raça"].includes(chave)) {
      raca.nome = valor;
      return;
    }

    if (["hp base", "hp"].includes(chave)) {
      raca.hpBase = Number(valor.replace(",", ".")) || 0;
      return;
    }

    if (["mana base", "mana"].includes(chave)) {
      raca.manaBase = Number(valor.replace(",", ".")) || 0;
      return;
    }

    if (["forca fisica", "força física", "forca física", "força fisica"].includes(chave)) {
      raca.forcaFisica = Number(valor.replace(",", ".")) || 0;
      return;
    }

    if (["forca magica", "força mágica", "forca mágica", "força magica"].includes(chave)) {
      raca.forcaMagica = Number(valor.replace(",", ".")) || 0;
      return;
    }

    if (["defesa fisica", "defesa física"].includes(chave)) {
      raca.defesaFisica = Number(valor.replace(",", ".")) || 0;
      return;
    }

    if (["defesa magica", "defesa mágica"].includes(chave)) {
      raca.defesaMagica = Number(valor.replace(",", ".")) || 0;
      return;
    }

    if (["velocidade"].includes(chave)) {
      raca.velocidade = Number(valor.replace(",", ".")) || 0;
      return;
    }

    if (["resistencia", "resistência"].includes(chave)) {
      raca.resistencia = Number(valor.replace(",", ".")) || 0;
      return;
    }

    if (["bonus de carisma", "bônus de carisma", "carisma"].includes(chave)) {
      raca.carismaBonus = valor;
      return;
    }

    if (["fator medo", "fator de medo"].includes(chave)) {
      raca.fatorMedoBonus = valor;
      return;
    }

    if (["habilidade exclusiva", "habilidade"].includes(chave)) {
      raca.habilidadeExclusiva = valor ? { id: gerarIdTemporario(valor), nome: valor } : null;
      return;
    }

    if (["vantagens"].includes(chave)) {
      raca.vantagens = valor;
      return;
    }

    if (["desvantagens"].includes(chave)) {
      raca.desvantagens = valor;
      return;
    }

    if (["classes sugeridas", "classes"].includes(chave)) {
      raca.classesSugeridas = extrairListaTexto(valor);
      return;
    }

    if (["elementos afins", "elementos"].includes(chave)) {
      raca.elementosAfins = extrairListaTexto(valor);
      return;
    }

    if (["restricoes de classes", "restrições de classes", "restricao de classe", "restrição de classe", "restricoes", "restrições"].includes(chave)) {
      raca.restricoesClasse = extrairListaTexto(valor);
    }
  });

  return raca;
}

function extrairListaTexto(valor) {
  return valor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((nome) => ({ id: gerarIdTemporario(nome), nome }));
}
async function salvarImportacaoRacas() {
  if (!importacaoRacasPendentes.length) {
    await mostrarModal("Analise o texto antes de salvar a importação.", "Importação vazia");
    return;
  }

  try {
    let salvas = 0;
    let ignoradas = 0;

    for (const raca of importacaoRacasPendentes) {
      const existe = state.racasDisponiveis.some((item) => {
        return normalizarTexto(item.nome || "") === normalizarTexto(raca.nome || "");
      });

      if (existe) {
        ignoradas += 1;
        continue;
      }

      await addDoc(collection(db, "racas"), {
        ...raca,
        criadoPor: state.usuarioAtual?.uid || "",
        criadoEm: serverTimestamp()
      });

      salvas += 1;
    }

    await mostrarModal(
      `Importação concluída. Raças salvas: ${salvas}. Ignoradas por já existirem: ${ignoradas}.`,
      "Importação salva",
      "success"
    );

    fecharModalImportacaoRacas();
  } catch (erro) {
    console.error("Erro ao importar raças:", erro);
    await mostrarModal("Erro ao salvar importação de raças.", "Erro", "danger");
  }
}

function preencherSelectClassesSugeridas() {
  const select = document.getElementById("selectClassesSugeridas");

  if (!select) return;

  select.innerHTML = "";

  if (!classesDisponiveis.length) {
    select.innerHTML = `<option value="">Nenhuma classe cadastrada</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma classe</option>`;
  select.innerHTML += `<option value="__ALL__">Todas</option>`;

  classesDisponiveis.forEach((classe) => {
    const option = document.createElement("option");
    option.value = classe.id;
    option.textContent = classe.nome || "Sem nome";
    select.appendChild(option);
  });
}

function preencherSelectElementosAfins() {
  const select = document.getElementById("selectElementosAfins");

  if (!select) return;

  select.innerHTML = "";

  if (!elementosDisponiveis.length) {
    select.innerHTML = `<option value="">Nenhum elemento cadastrado</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione um elemento</option>`;
  select.innerHTML += `<option value="__ALL__">Todos</option>`;

  elementosDisponiveis.forEach((elemento) => {
    const option = document.createElement("option");
    option.value = elemento.id;
    option.textContent = elemento.nome || "Sem nome";
    select.appendChild(option);
  });
}

function preencherSelectRestricoesClasse() {
  const select = document.getElementById("selectRestricoesClasse");

  if (!select) return;

  select.innerHTML = "";

  select.innerHTML = `<option value="">Selecione uma restrição</option>`;
  select.innerHTML += `<option value="__NONE__">Nenhuma</option>`;

  if (!classesDisponiveis.length) {
    return;
  }

  classesDisponiveis.forEach((classe) => {
    const option = document.createElement("option");
    option.value = classe.id;
    option.textContent = classe.nome || "Sem nome";
    select.appendChild(option);
  });
}

function preencherSelectHabilidadeExclusivaRaca() {
  const select = document.getElementById("racaHabilidadeExclusiva");

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

function preencherSelectEditClassesSugeridas() {
  const select = document.getElementById("editSelectClassesSugeridas");

  if (!select) return;

  select.innerHTML = "";

  if (!classesDisponiveis.length) {
    select.innerHTML = `<option value="">Nenhuma classe cadastrada</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma classe</option>`;
  select.innerHTML += `<option value="__ALL__">Todas</option>`;

  classesDisponiveis.forEach((classe) => {
    const option = document.createElement("option");
    option.value = classe.id;
    option.textContent = classe.nome || "Sem nome";
    select.appendChild(option);
  });
}

function preencherSelectEditElementosAfins() {
  const select = document.getElementById("editSelectElementosAfins");

  if (!select) return;

  select.innerHTML = "";

  if (!elementosDisponiveis.length) {
    select.innerHTML = `<option value="">Nenhum elemento cadastrado</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione um elemento</option>`;
  select.innerHTML += `<option value="__ALL__">Todos</option>`;

  elementosDisponiveis.forEach((elemento) => {
    const option = document.createElement("option");
    option.value = elemento.id;
    option.textContent = elemento.nome || "Sem nome";
    select.appendChild(option);
  });
}

function preencherSelectEditRestricoesClasse() {
  const select = document.getElementById("editSelectRestricoesClasse");

  if (!select) return;

  select.innerHTML = "";

  select.innerHTML = `<option value="">Selecione uma restrição</option>`;
  select.innerHTML += `<option value="__NONE__">Nenhuma</option>`;

  if (!classesDisponiveis.length) {
    return;
  }

  classesDisponiveis.forEach((classe) => {
    const option = document.createElement("option");
    option.value = classe.id;
    option.textContent = classe.nome || "Sem nome";
    select.appendChild(option);
  });
}

function preencherSelectEditHabilidadeExclusivaRaca() {
  const select = document.getElementById("editRacaHabilidadeExclusiva");

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

function adicionarSelecionado(selectId, lista, renderCallback) {
  const select = document.getElementById(selectId);

  if (!select || !select.value) {
    mostrarModal("Selecione uma opção primeiro.", "Campo obrigatório");
    return;
  }

  const id = select.value;
  const nome = select.selectedOptions[0].textContent;

  if (id === "__ALL__") {
    lista.splice(0, lista.length, { id: "__ALL__", nome });
    renderCallback();
    return;
  }

  if (lista.some((item) => item.id === "__ALL__")) {
    mostrarModal("Remova a opção Todas antes de selecionar opções específicas.", "Seleção inválida");
    return;
  }

  if (lista.some((item) => item.id === id)) {
    mostrarModal("Essa opção já foi adicionada.", "Opção repetida");
    return;
  }

  lista.push({ id, nome });
  renderCallback();
}

function adicionarSelecionadoEspecial(selectId, lista, renderCallback) {
  const select = document.getElementById(selectId);

  if (!select || !select.value) {
    mostrarModal("Selecione uma opção primeiro.", "Campo obrigatório");
    return;
  }

  const id = select.value;
  const nome = select.selectedOptions[0].textContent;

  if (id === "__NONE__") {
    lista.splice(0, lista.length, { id: "__NONE__", nome: "Nenhuma" });
    renderCallback();
    return;
  }

  if (lista.some((item) => item.id === "__NONE__")) {
    mostrarModal("Remova a opção Nenhuma antes de selecionar restrições específicas.", "Seleção inválida");
    return;
  }

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

function renderizarClassesSugeridasSelecionadas() {
  renderizarListaSelecionada(
    "listaClassesSugeridasSelecionadas",
    classesSugeridasSelecionadas,
    "Nenhuma classe sugerida selecionada.",
    (id) => removerSelecionado(classesSugeridasSelecionadas, id, renderizarClassesSugeridasSelecionadas)
  );
}

function renderizarElementosAfinsSelecionados() {
  renderizarListaSelecionada(
    "listaElementosAfinsSelecionados",
    elementosAfinsSelecionados,
    "Nenhum elemento afim selecionado.",
    (id) => removerSelecionado(elementosAfinsSelecionados, id, renderizarElementosAfinsSelecionados)
  );
}

function renderizarRestricoesClasseSelecionadas() {
  renderizarListaSelecionada(
    "listaRestricoesClasseSelecionadas",
    restricoesClasseSelecionadas,
    "Nenhuma restrição de classe selecionada.",
    (id) => removerSelecionado(restricoesClasseSelecionadas, id, renderizarRestricoesClasseSelecionadas)
  );
}

function renderizarEditClassesSugeridasSelecionadas() {
  renderizarListaSelecionada(
    "editListaClassesSugeridasSelecionadas",
    editClassesSugeridasSelecionadas,
    "Nenhuma classe sugerida selecionada.",
    (id) => removerSelecionado(editClassesSugeridasSelecionadas, id, renderizarEditClassesSugeridasSelecionadas)
  );
}

function renderizarEditElementosAfinsSelecionados() {
  renderizarListaSelecionada(
    "editListaElementosAfinsSelecionados",
    editElementosAfinsSelecionados,
    "Nenhum elemento afim selecionado.",
    (id) => removerSelecionado(editElementosAfinsSelecionados, id, renderizarEditElementosAfinsSelecionados)
  );
}

function renderizarEditRestricoesClasseSelecionadas() {
  renderizarListaSelecionada(
    "editListaRestricoesClasseSelecionadas",
    editRestricoesClasseSelecionadas,
    "Nenhuma restrição de classe selecionada.",
    (id) => removerSelecionado(editRestricoesClasseSelecionadas, id, renderizarEditRestricoesClasseSelecionadas)
  );
}
function renderizarRacas() {
  aplicarEstilosBuscaRacas();

  const lista = document.getElementById("listaRacas");

  if (!lista) return;

  const racasFiltradas = filtrarRacas(state.racasDisponiveis, buscaRacasAtual);

  lista.innerHTML = "";

  if (!state.racasDisponiveis.length) {
    lista.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma raça cadastrada ainda.</h3>
        <p>Clique em cadastrar para adicionar a primeira raça.</p>
      </div>
    `;
    return;
  }

  if (!racasFiltradas.length) {
    lista.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma raça encontrada.</h3>
        <p>Tente buscar por outro nome, vantagem, desvantagem, classe, elemento ou restrição.</p>
      </div>
    `;
    return;
  }

  racasFiltradas.forEach((raca) => {
    const card = document.createElement("div");
    card.className = "resource-card";
    card.dataset.searchText = normalizarTexto(montarTextoBuscaRaca(raca));

    card.innerHTML = `
      <div class="resource-card-header">
        <div>
          <h4>${escapeHtml(raca.nome || "Raça sem nome")}</h4>
          <p>
            HP: ${raca.hpBase || 0}
            • Mana: ${raca.manaBase || 0}
            • Velocidade: ${raca.velocidade || 0}
          </p>
        </div>

        <span>Raça</span>
      </div>

      <div class="resource-card-info">
        <div class="resource-card-line">
          <strong>Classes Sugeridas</strong>
          <span>${escapeHtml(formatarListaObjetos(raca.classesSugeridas))}</span>
        </div>

        <div class="resource-card-line">
          <strong>Elementos Afins</strong>
          <span>${escapeHtml(formatarListaObjetos(raca.elementosAfins))}</span>
        </div>

        <div class="resource-card-line">
          <strong>Restrições</strong>
          <span>${escapeHtml(formatarListaObjetos(raca.restricoesClasse))}</span>
        </div>
      </div>

      <div class="action-row">
        <button class="secondary-btn ver-raca">Visualizar</button>
        <button class="secondary-btn editar-raca">Editar</button>
        <button class="small-btn danger excluir-raca">Excluir</button>
      </div>
    `;

    card.querySelector(".ver-raca").addEventListener("click", () => {
      setRacaSelecionada(raca);
      navegarPara("cadastrosRacaDetalhe");
    });

    card.querySelector(".editar-raca").addEventListener("click", () => {
      setRacaSelecionada(raca);
      navegarPara("cadastrosRacaDetalhe");
      setTimeout(() => renderizarRacaDetalhe(true), 100);
    });

    card.querySelector(".excluir-raca").addEventListener("click", async () => {
      await excluirRaca(raca);
    });

    lista.appendChild(card);
  });
}

function filtrarRacas(lista, termo) {
  const busca = normalizarTexto(termo);

  if (!busca) return lista;

  return lista.filter((raca) => {
    return normalizarTexto(montarTextoBuscaRaca(raca)).includes(busca);
  });
}

function montarTextoBuscaRaca(raca) {
  return [
    raca.nome,
    raca.hpBase,
    raca.manaBase,
    raca.forcaFisica,
    raca.forcaMagica,
    raca.defesaFisica,
    raca.defesaMagica,
    raca.velocidade,
    raca.resistencia,
    raca.carismaBonus,
    raca.fatorMedoBonus,
    raca.habilidadeExclusiva?.nome,
    raca.vantagens,
    raca.desvantagens,
    formatarListaObjetos(raca.classesSugeridas),
    formatarListaObjetos(raca.elementosAfins),
    formatarListaObjetos(raca.restricoesClasse)
  ].join(" ");
}

export function renderizarRacaDetalhe(modoEdicao = false) {
  const container = document.getElementById("racaDetalheContainer");

  if (!container) return;

  const raca = state.racaSelecionada;

  if (!raca) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma raça selecionada.</h3>
        <p>Volte para a lista e escolha uma raça para visualizar.</p>
      </div>
    `;
    return;
  }

  if (modoEdicao) {
    editClassesSugeridasSelecionadas = Array.isArray(raca.classesSugeridas)
      ? [...raca.classesSugeridas]
      : [];

    editElementosAfinsSelecionados = Array.isArray(raca.elementosAfins)
      ? [...raca.elementosAfins]
      : [];

    editRestricoesClasseSelecionadas = Array.isArray(raca.restricoesClasse)
      ? [...raca.restricoesClasse]
      : [];

    container.innerHTML = `
      <div class="detail-card">
        <div class="crud-form-content">
          <h3>Editar Raça</h3>

          <div class="form-grid">
            <label>
              Nome da Raça
              <input type="text" id="editRacaNome" value="${escapeHtml(raca.nome || "")}" />
            </label>

            <label>
              HP Base
              <input type="number" id="editRacaHpBase" value="${raca.hpBase || 0}" />
            </label>

            <label>
              Mana Base
              <input type="number" id="editRacaManaBase" value="${raca.manaBase || 0}" />
            </label>

            <label>
              Força Física
              <input type="number" id="editRacaForcaFisica" value="${raca.forcaFisica || 0}" />
            </label>

            <label>
              Força Mágica
              <input type="number" id="editRacaForcaMagica" value="${raca.forcaMagica || 0}" />
            </label>

            <label>
              Defesa Física
              <input type="number" id="editRacaDefesaFisica" value="${raca.defesaFisica || 0}" />
            </label>

            <label>
              Defesa Mágica
              <input type="number" id="editRacaDefesaMagica" value="${raca.defesaMagica || 0}" />
            </label>

            <label>
              Velocidade
              <input type="number" id="editRacaVelocidade" value="${raca.velocidade || 0}" />
            </label>

            <label>
              Resistência
              <input type="number" id="editRacaResistencia" value="${raca.resistencia || 0}" />
            </label>

            <label>
              Bônus de Carisma
              <input type="text" id="editRacaCarismaBonus" value="${escapeHtml(raca.carismaBonus || "")}" />
            </label>

            <label>
              Fator Medo
              <input type="text" id="editRacaFatorMedoBonus" value="${escapeHtml(raca.fatorMedoBonus || "")}" />
            </label>
          </div>

          <label>
            Habilidade Exclusiva
            <select id="editRacaHabilidadeExclusiva">
              <option value="">Carregando habilidades...</option>
            </select>
          </label>

          <label>
            Vantagens
            <textarea id="editRacaVantagens">${escapeHtml(raca.vantagens || "")}</textarea>
          </label>

          <label>
            Desvantagens
            <textarea id="editRacaDesvantagens">${escapeHtml(raca.desvantagens || "")}</textarea>
          </label>

          <div class="multi-select-box">
            <label>
              Classes Sugeridas
              <select id="editSelectClassesSugeridas">
                <option value="">Carregando classes...</option>
              </select>
            </label>

            <button class="secondary-btn" type="button" id="editAdicionarClasseSugerida">Adicionar classe</button>

            <div id="editListaClassesSugeridasSelecionadas" class="selected-list">
              <span class="empty-selection">Nenhuma classe sugerida selecionada.</span>
            </div>
          </div>

          <div class="multi-select-box">
            <label>
              Elementos Afins
              <select id="editSelectElementosAfins">
                <option value="">Carregando elementos...</option>
              </select>
            </label>

            <button class="secondary-btn" type="button" id="editAdicionarElementoAfim">Adicionar elemento</button>

            <div id="editListaElementosAfinsSelecionados" class="selected-list">
              <span class="empty-selection">Nenhum elemento afim selecionado.</span>
            </div>
          </div>

          <div class="multi-select-box">
            <label>
              Restrições de Classes
              <select id="editSelectRestricoesClasse">
                <option value="">Carregando classes...</option>
              </select>
            </label>

            <button class="secondary-btn" type="button" id="editAdicionarRestricaoClasse">Adicionar restrição</button>

            <div id="editListaRestricoesClasseSelecionadas" class="selected-list">
              <span class="empty-selection">Nenhuma restrição de classe selecionada.</span>
            </div>
          </div>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarEdicaoRaca">Cancelar</button>
            <button class="primary-btn" type="button" id="salvarEdicaoRaca">Salvar alterações</button>
          </div>
        </div>
      </div>
    `;

    preencherSelectEditClassesSugeridas();
    preencherSelectEditElementosAfins();
    preencherSelectEditRestricoesClasse();
    preencherSelectEditHabilidadeExclusivaRaca();

    const selectHabilidade = document.getElementById("editRacaHabilidadeExclusiva");

    if (selectHabilidade && raca.habilidadeExclusiva?.id) {
      selectHabilidade.value = raca.habilidadeExclusiva.id;
    }

    renderizarEditClassesSugeridasSelecionadas();
    renderizarEditElementosAfinsSelecionados();
    renderizarEditRestricoesClasseSelecionadas();

    document.getElementById("editAdicionarClasseSugerida")?.addEventListener("click", () => {
      adicionarSelecionado(
        "editSelectClassesSugeridas",
        editClassesSugeridasSelecionadas,
        renderizarEditClassesSugeridasSelecionadas
      );
    });

    document.getElementById("editAdicionarElementoAfim")?.addEventListener("click", () => {
      adicionarSelecionado(
        "editSelectElementosAfins",
        editElementosAfinsSelecionados,
        renderizarEditElementosAfinsSelecionados
      );
    });

    document.getElementById("editAdicionarRestricaoClasse")?.addEventListener("click", () => {
      adicionarSelecionadoEspecial(
        "editSelectRestricoesClasse",
        editRestricoesClasseSelecionadas,
        renderizarEditRestricoesClasseSelecionadas
      );
    });

    document.getElementById("cancelarEdicaoRaca")?.addEventListener("click", () => {
      renderizarRacaDetalhe(false);
    });

    document.getElementById("salvarEdicaoRaca")?.addEventListener("click", salvarEdicaoRaca);

    return;
  }
    container.innerHTML = `
    <div class="detail-card">
      <div class="detail-header">
        <div>
          <span>Raça</span>
          <h3>${escapeHtml(raca.nome || "Raça sem nome")}</h3>
        </div>

        <div class="action-row">
          <button class="secondary-btn" id="voltarListaRacas">Voltar</button>
          <button class="secondary-btn" id="editarRaca">Editar</button>
          <button class="small-btn danger" id="excluirRaca">Excluir</button>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-field">
          <span>HP Base</span>
          <strong>${raca.hpBase || 0}</strong>
        </div>

        <div class="detail-field">
          <span>Mana Base</span>
          <strong>${raca.manaBase || 0}</strong>
        </div>

        <div class="detail-field">
          <span>Força Física</span>
          <strong>${raca.forcaFisica || 0}</strong>
        </div>

        <div class="detail-field">
          <span>Força Mágica</span>
          <strong>${raca.forcaMagica || 0}</strong>
        </div>

        <div class="detail-field">
          <span>Defesa Física</span>
          <strong>${raca.defesaFisica || 0}</strong>
        </div>

        <div class="detail-field">
          <span>Defesa Mágica</span>
          <strong>${raca.defesaMagica || 0}</strong>
        </div>

        <div class="detail-field">
          <span>Velocidade</span>
          <strong>${raca.velocidade || 0}</strong>
        </div>

        <div class="detail-field">
          <span>Resistência</span>
          <strong>${raca.resistencia || 0}</strong>
        </div>

        <div class="detail-field">
          <span>Bônus de Carisma</span>
          <strong>${escapeHtml(raca.carismaBonus || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Fator Medo</span>
          <strong>${escapeHtml(raca.fatorMedoBonus || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Habilidade Exclusiva</span>
          <strong>${escapeHtml(raca.habilidadeExclusiva?.nome || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Vantagens</span>
          <strong>${escapeHtml(raca.vantagens || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Desvantagens</span>
          <strong>${escapeHtml(raca.desvantagens || "Não informado")}</strong>
        </div>

        <div class="detail-field">
          <span>Classes Sugeridas</span>
          <strong>${escapeHtml(formatarListaObjetos(raca.classesSugeridas))}</strong>
        </div>

        <div class="detail-field">
          <span>Elementos Afins</span>
          <strong>${escapeHtml(formatarListaObjetos(raca.elementosAfins))}</strong>
        </div>

        <div class="detail-field">
          <span>Restrições de Classe</span>
          <strong>${escapeHtml(formatarListaObjetos(raca.restricoesClasse))}</strong>
        </div>
      </div>
    </div>
  `;

  document.getElementById("voltarListaRacas")?.addEventListener("click", () => {
    navegarPara("cadastrosRacas");
  });

  document.getElementById("editarRaca")?.addEventListener("click", () => {
    renderizarRacaDetalhe(true);
  });

  document.getElementById("excluirRaca")?.addEventListener("click", async () => {
    await excluirRaca(raca);
    navegarPara("cadastrosRacas");
  });
}

async function salvarEdicaoRaca() {
  const raca = state.racaSelecionada;

  if (!raca) {
    await mostrarModal("Nenhuma raça selecionada.", "Erro", "danger");
    return;
  }

  const nome = textoCampo("editRacaNome");

  if (!nome) {
    await mostrarModal("Digite o nome da raça.", "Campo obrigatório");
    return;
  }

  const existeOutraRaca = state.racasDisponiveis.some((item) => {
    return item.id !== raca.id && normalizarTexto(item.nome || "") === normalizarTexto(nome);
  });

  if (existeOutraRaca) {
    await mostrarModal(`Já existe outra raça chamada "${nome}".`, "Raça duplicada", "danger");
    return;
  }

  const habilidadeExclusivaId = valorCampo("editRacaHabilidadeExclusiva");
  const habilidadeExclusivaNome = textoSelectSelecionado("editRacaHabilidadeExclusiva");

  const dadosAtualizados = {
    nome,
    hpBase: numeroCampo("editRacaHpBase"),
    manaBase: numeroCampo("editRacaManaBase"),
    forcaFisica: numeroCampo("editRacaForcaFisica"),
    forcaMagica: numeroCampo("editRacaForcaMagica"),
    defesaFisica: numeroCampo("editRacaDefesaFisica"),
    defesaMagica: numeroCampo("editRacaDefesaMagica"),
    velocidade: numeroCampo("editRacaVelocidade"),
    resistencia: numeroCampo("editRacaResistencia"),
    carismaBonus: textoCampo("editRacaCarismaBonus"),
    fatorMedoBonus: textoCampo("editRacaFatorMedoBonus"),
    habilidadeExclusiva: habilidadeExclusivaId
      ? {
          id: habilidadeExclusivaId,
          nome: habilidadeExclusivaNome
        }
      : null,
    vantagens: textoCampo("editRacaVantagens"),
    desvantagens: textoCampo("editRacaDesvantagens"),
    classesSugeridas: editClassesSugeridasSelecionadas,
    elementosAfins: editElementosAfinsSelecionados,
    restricoesClasse: editRestricoesClasseSelecionadas,
    atualizadoEm: serverTimestamp()
  };

  try {
    await updateDoc(doc(db, "racas", raca.id), dadosAtualizados);

    setRacaSelecionada({
      ...raca,
      ...dadosAtualizados
    });

    await mostrarModal("Raça atualizada com sucesso.", "Alterações salvas", "success");

    renderizarRacaDetalhe(false);
  } catch (erro) {
    console.error("Erro ao editar raça:", erro);
    await mostrarModal("Erro ao editar raça.", "Erro", "danger");
  }
}

async function excluirRaca(raca) {
  const confirmar = await confirmarModal({
    titulo: "Excluir raça",
    mensagem: `Tem certeza que deseja excluir a raça “${raca.nome}”? Essa ação não pode ser desfeita.`,
    confirmarTexto: "Excluir",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "racas", raca.id));

    if (state.racaSelecionada?.id === raca.id) {
      setRacaSelecionada(null);
    }

    await mostrarModal("Raça excluída com sucesso.", "Exclusão concluída", "success");
  } catch (erro) {
    console.error("Erro ao excluir raça:", erro);
    await mostrarModal("Erro ao excluir raça.", "Erro", "danger");
  }
}

function vincularBuscaRacas() {
  const input = document.getElementById("buscaRacas");

  if (!input) return;

  buscaRacasAtual = input.value || "";

  input.oninput = () => {
    buscaRacasAtual = input.value || "";
    renderizarRacas();
  };
}

function aplicarEstilosBuscaRacas() {
  if (document.getElementById("racasBuscaStyles")) return;

  const style = document.createElement("style");
  style.id = "racasBuscaStyles";

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

export function buscarRacaPorId(id) {
  return state.racasDisponiveis.find((raca) => raca.id === id) || null;
}

export function preencherSelectRacas(selectId = "personagemRaca", valorAtual = "") {
  const select = document.getElementById(selectId);

  if (!select) return;

  select.innerHTML = "";

  if (!state.racasDisponiveis.length) {
    select.innerHTML = `<option value="">Nenhuma raça cadastrada</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma raça</option>`;

  state.racasDisponiveis.forEach((raca) => {
    const option = document.createElement("option");
    option.value = raca.id;
    option.textContent = raca.nome || "Sem nome";
    select.appendChild(option);
  });

  if (valorAtual) {
    select.value = valorAtual;
  }
}

export function atualizarPreviewRaca(raca) {
  const preview = document.getElementById("previewRacaNome");

  if (!preview || !raca) return;

  preview.textContent = raca.nome || "Nenhuma raça selecionada.";
}

export function initRacas() {
  onPageLoaded((pagina) => {
    if (pagina === "cadastrosRacas") {
      aplicarEstilosBuscaRacas();
      vincularBuscaRacas();
      renderizarRacas();

      document.getElementById("abrirCadastroRacas")?.addEventListener("click", abrirModalCadastroRaca);
      document.getElementById("abrirImportacaoRacas")?.addEventListener("click", abrirModalImportacaoRacas);
    }

    if (pagina === "cadastrosRacaDetalhe") {
      renderizarRacaDetalhe(false);
    }
  });
}