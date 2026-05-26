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
      atualizarContadorRacas();
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

function carregarOpcoesRelacionadasRaca() {
  unsubscribeClasses = onSnapshot(query(collection(db, "classes"), orderBy("nome", "asc")), (snapshot) => {
    classesDisponiveis = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    preencherSelectClassesRaca();
    preencherSelectClassesRacaEdicao();
  });

  unsubscribeElementos = onSnapshot(query(collection(db, "elementos"), orderBy("nome", "asc")), (snapshot) => {
    elementosDisponiveis = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    preencherSelectElementosRaca();
    preencherSelectElementosRacaEdicao();
  });

  unsubscribeHabilidades = onSnapshot(query(collection(db, "habilidades"), orderBy("nome", "asc")), (snapshot) => {
    habilidadesDisponiveis = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    preencherSelectHabilidadesRaca();
    preencherSelectHabilidadesRacaEdicao();
  });
}

function sincronizarRacaSelecionada() {
  if (!state.racaSelecionada) return;

  const atualizada = state.racasDisponiveis.find((raca) => raca.id === state.racaSelecionada.id);

  if (atualizada) {
    setRacaSelecionada(atualizada);
  }
}

export function buscarRacaPorId(id) {
  return state.racasDisponiveis.find((raca) => raca.id === id) || null;
}

export function preencherSelectRacas() {
  const select = document.getElementById("personagemRaca");

  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = "";

  if (!state.racasDisponiveis || state.racasDisponiveis.length === 0) {
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

function textoCampo(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function numeroCampo(id) {
  return Number(document.getElementById(id)?.value) || 0;
}

function valorCampo(id) {
  return document.getElementById(id)?.value || "";
}

function textoSelectSelecionado(id) {
  const select = document.getElementById(id);

  if (!select || !select.selectedOptions[0]) return "";

  return select.selectedOptions[0].textContent;
}

function habilidadeSelecionada(idSelect) {
  const id = valorCampo(idSelect);

  if (!id) return null;

  return {
    id,
    nome: textoSelectSelecionado(idSelect)
  };
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

  document.getElementById("fecharModalCadastroRaca").addEventListener("click", fecharModalCadastroRaca);
  document.getElementById("cancelarCadastroRaca").addEventListener("click", fecharModalCadastroRaca);
  document.getElementById("salvarRaca").addEventListener("click", salvarRaca);

  document.getElementById("adicionarClasseSugerida").addEventListener("click", () => {
    adicionarSelecionado("selectClassesSugeridas", classesSugeridasSelecionadas, renderizarClassesSugeridas);
  });

  document.getElementById("adicionarElementoAfim").addEventListener("click", () => {
    adicionarSelecionado("selectElementosAfins", elementosAfinsSelecionados, renderizarElementosAfins);
  });

  document.getElementById("adicionarRestricaoClasse").addEventListener("click", () => {
    adicionarSelecionado("selectRestricaoClasse", restricoesClasseSelecionadas, renderizarRestricoesClasse);
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharModalCadastroRaca();
    }
  });

  preencherSelectClassesRaca();
  preencherSelectElementosRaca();
  preencherSelectHabilidadesRaca();
  renderizarClassesSugeridas();
  renderizarElementosAfins();
  renderizarRestricoesClasse();
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
        <label>Nome da Raça<input type="text" id="racaNome" placeholder="Ex: Humano, Elfo, Orc..." /></label>
        <label>HP Base<input type="number" id="racaHpBase" placeholder="Ex: 30" /></label>
        <label>Mana Base<input type="number" id="racaManaBase" placeholder="Ex: 50" /></label>
        <label>Força Física<input type="number" id="racaForcaFisica" placeholder="Ex: 2" /></label>
        <label>Força Mágica<input type="number" id="racaForcaMagica" placeholder="Ex: 2" /></label>
        <label>Defesa Física<input type="number" id="racaDefesaFisica" placeholder="Ex: 2" /></label>
        <label>Defesa Mágica<input type="number" id="racaDefesaMagica" placeholder="Ex: 2" /></label>
        <label>Velocidade<input type="number" id="racaVelocidade" placeholder="Ex: 2" /></label>
        <label>Resistência<input type="number" id="racaResistencia" placeholder="Ex: 2" /></label>
      </div>

      <label>Carisma<input type="text" id="racaCarisma" placeholder="Ex: +2 em teste de persuasão" /></label>
      <label>Fator Medo<input type="text" id="racaFatorMedo" placeholder="Ex: +1 em intimidação" /></label>

      <label>Vantagens/Bônus<textarea id="racaVantagens" placeholder="Descreva as vantagens da raça..."></textarea></label>
      <label>Desvantagens/Penalidades<textarea id="racaDesvantagens" placeholder="Descreva as penalidades da raça..."></textarea></label>

      <div class="multi-select-box">
        <label>
          Classes Sugeridas
          <select id="selectClassesSugeridas">
            <option value="">Carregando classes...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="adicionarClasseSugerida">Adicionar</button>

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

        <button class="secondary-btn" type="button" id="adicionarElementoAfim">Adicionar</button>

        <div id="listaElementosAfinsSelecionados" class="selected-list">
          <span class="empty-selection">Nenhum elemento afim selecionado.</span>
        </div>
      </div>

      <label>
        Habilidade Exclusiva
        <select id="racaHabilidadeExclusiva">
          <option value="">Carregando habilidades...</option>
        </select>
      </label>

      <div class="multi-select-box">
        <label>
          Restrição de Classe
          <select id="selectRestricaoClasse">
            <option value="">Carregando classes...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="adicionarRestricaoClasse">Adicionar</button>

        <div id="listaRestricaoClasseSelecionadas" class="selected-list">
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

  try {
    await addDoc(collection(db, "racas"), {
      nome,
      hpBase: numeroCampo("racaHpBase"),
      manaBase: numeroCampo("racaManaBase"),
      forcaFisica: numeroCampo("racaForcaFisica"),
      forcaMagica: numeroCampo("racaForcaMagica"),
      defesaFisica: numeroCampo("racaDefesaFisica"),
      defesaMagica: numeroCampo("racaDefesaMagica"),
      velocidade: numeroCampo("racaVelocidade"),
      resistencia: numeroCampo("racaResistencia"),
      carismaBonus: textoCampo("racaCarisma"),
      fatorMedoBonus: textoCampo("racaFatorMedo"),
      vantagens: textoCampo("racaVantagens"),
      desvantagens: textoCampo("racaDesvantagens"),
      classesSugeridas: classesSugeridasSelecionadas,
      elementosAfins: elementosAfinsSelecionados,
      habilidadeExclusiva: habilidadeSelecionada("racaHabilidadeExclusiva"),
      restricoesClasse: restricoesClasseSelecionadas,
      criadoPor: state.usuarioAtual.uid,
      criadoEm: serverTimestamp()
    });

    await mostrarModal("Raça salva com sucesso.", "Cadastro realizado", "success");

    fecharModalCadastroRaca();
    renderizarRacas();
  } catch (erro) {
    console.error("Erro ao salvar raça:", erro);
    await mostrarModal("Erro ao salvar raça.", "Erro", "danger");
  }
}

async function salvarEdicaoRaca() {
  if (!state.racaSelecionada) {
    await mostrarModal("Nenhuma raça selecionada.", "Erro", "danger");
    return;
  }

  const nome = textoCampo("editRacaNome");

  if (!nome) {
    await mostrarModal("Digite o nome da raça.", "Campo obrigatório");
    return;
  }

  const jaExiste = state.racasDisponiveis.some((raca) => {
    const mesmoNome = normalizarTexto(raca.nome || "") === normalizarTexto(nome);
    const outroRegistro = raca.id !== state.racaSelecionada.id;

    return mesmoNome && outroRegistro;
  });

  if (jaExiste) {
    await mostrarModal(`Já existe outra raça chamada "${nome}".`, "Raça duplicada", "danger");
    return;
  }

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
    carismaBonus: textoCampo("editRacaCarisma"),
    fatorMedoBonus: textoCampo("editRacaFatorMedo"),
    vantagens: textoCampo("editRacaVantagens"),
    desvantagens: textoCampo("editRacaDesvantagens"),
    classesSugeridas: editClassesSugeridasSelecionadas,
    elementosAfins: editElementosAfinsSelecionados,
    habilidadeExclusiva: habilidadeSelecionada("editRacaHabilidadeExclusiva"),
    restricoesClasse: editRestricoesClasseSelecionadas,
    atualizadoEm: serverTimestamp()
  };

  try {
    await updateDoc(doc(db, "racas", state.racaSelecionada.id), dadosAtualizados);

    setRacaSelecionada({
      ...state.racaSelecionada,
      ...dadosAtualizados
    });

    await mostrarModal("Raça atualizada com sucesso.", "Alterações salvas", "success");
    renderizarDetalheRaca(false);
  } catch (erro) {
    console.error("Erro ao editar raça:", erro);
    await mostrarModal("Erro ao editar raça.", "Erro", "danger");
  }
}

async function excluirRaca() {
  if (!state.racaSelecionada) {
    await mostrarModal("Nenhuma raça selecionada.", "Erro", "danger");
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Excluir raça",
    mensagem: `Tem certeza que deseja excluir a raça "${state.racaSelecionada.nome}"? Essa ação não pode ser desfeita.`,
    confirmarTexto: "Excluir",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "racas", state.racaSelecionada.id));

    setRacaSelecionada(null);

    await mostrarModal("Raça excluída com sucesso.", "Exclusão concluída", "success");
    navegarPara("cadastrosRacas");
  } catch (erro) {
    console.error("Erro ao excluir raça:", erro);
    await mostrarModal("Erro ao excluir raça.", "Erro", "danger");
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
          <h3>Importar Raças em Massa</h3>
          <p>Cole várias raças seguindo o modelo. Separe uma raça da outra usando uma linha com três traços: ---</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalImportacaoRacas">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Texto para importação
            <textarea id="textoImportacaoRacas" rows="18" placeholder="Raça: Elfo
HP Base: 40
Mana Base: 100
Força Física: 2
Força Mágica: 5
Defesa Física: 2
Defesa Mágica: 4
Velocidade: 5
Resistência: 3
Carisma: +2 em testes sociais
Fator Medo: Nenhum
Vantagens/Bônus: Alta afinidade mágica.
Desvantagens/Penalidades: Baixa resistência física.
Classes Sugeridas: Todas
Elementos Afins: Luz, Água
Habilidade Exclusiva: Visão Élfica
Restrição de Classe: Nenhuma

---

Raça: Orc
HP Base: 80
Mana Base: 10
Força Física: 7
Força Mágica: 1
Defesa Física: 6
Defesa Mágica: 1
Velocidade: 2
Resistência: 7
Carisma: -2 em diplomacia
Fator Medo: +3 em intimidação
Vantagens/Bônus: Grande força bruta.
Desvantagens/Penalidades: Baixa afinidade mágica.
Classes Sugeridas: Guerreiro, Bárbaro
Elementos Afins: Terra, Fogo
Habilidade Exclusiva:
Restrição de Classe: Mago"></textarea>
          </label>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarImportacaoRacas">Cancelar</button>
            <button class="primary-btn" type="button" id="analisarImportacaoRacas">Analisar texto</button>
          </div>

          <div id="previewImportacaoRacas" class="list-card" style="display:none;">
            <h3>Prévia da importação</h3>
            <div id="listaPreviewImportacaoRacas" class="resource-list"></div>

            <div class="action-row">
              <button class="secondary-btn" type="button" id="limparPreviewImportacaoRacas">Revisar texto</button>
              <button class="primary-btn" type="button" id="confirmarImportacaoRacas">Cadastrar todos</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalImportacaoRacas").addEventListener("click", fecharModalImportacaoRacas);
  document.getElementById("cancelarImportacaoRacas").addEventListener("click", fecharModalImportacaoRacas);
  document.getElementById("analisarImportacaoRacas").addEventListener("click", analisarImportacaoRacas);
  document.getElementById("limparPreviewImportacaoRacas").addEventListener("click", limparPreviewImportacaoRacas);
  document.getElementById("confirmarImportacaoRacas").addEventListener("click", confirmarImportacaoRacas);

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

async function analisarImportacaoRacas() {
  const texto = document.getElementById("textoImportacaoRacas")?.value.trim() || "";

  if (!texto) {
    await mostrarModal("Cole o texto com as raças antes de analisar.", "Campo obrigatório");
    return;
  }

  const resultado = interpretarTextoRacas(texto);

  if (resultado.erros.length > 0 && resultado.racas.length === 0) {
    await mostrarModal(resultado.erros.join("\n"), "Não foi possível importar", "danger");
    return;
  }

  importacaoRacasPendentes = resultado.racas;
  renderizarPreviewImportacaoRacas(resultado.erros);
}

function interpretarTextoRacas(texto) {
  const blocos = texto
    .split(/\n\s*---\s*\n/g)
    .map((bloco) => bloco.trim())
    .filter(Boolean);

  const racas = [];
  const erros = [];
  const nomesNoTexto = new Set();

  blocos.forEach((bloco, index) => {
    const campos = extrairCamposDoBloco(bloco);
    const numero = index + 1;

    const nome = buscarCampo(campos, ["raça", "raca", "nome", "nome da raça", "nome da raca"]);

    if (!nome) {
      erros.push(`Bloco ${numero}: nome da raça não encontrado.`);
      return;
    }

    const nomeNormalizado = normalizarTexto(nome);

    if (nomesNoTexto.has(nomeNormalizado)) {
      erros.push(`Bloco ${numero}: a raça "${nome}" está repetida no texto e foi ignorada.`);
      return;
    }

    nomesNoTexto.add(nomeNormalizado);

    const jaExiste = state.racasDisponiveis.some((raca) => {
      return normalizarTexto(raca.nome || "") === nomeNormalizado;
    });

    if (jaExiste) {
      erros.push(`Bloco ${numero}: a raça "${nome}" já existe no sistema e foi ignorada.`);
      return;
    }

    const habilidadeNome = buscarCampo(campos, ["habilidade exclusiva"]);
    const habilidade = habilidadeNome ? encontrarPorNome(habilidadesDisponiveis, habilidadeNome) : null;

    const raca = {
      nome,
      hpBase: numeroTexto(buscarCampo(campos, ["hp base", "hp"])),
      manaBase: numeroTexto(buscarCampo(campos, ["mana base", "mana"])),
      forcaFisica: numeroTexto(buscarCampo(campos, ["força física", "forca fisica"])),
      forcaMagica: numeroTexto(buscarCampo(campos, ["força mágica", "forca magica"])),
      defesaFisica: numeroTexto(buscarCampo(campos, ["defesa física", "defesa fisica"])),
      defesaMagica: numeroTexto(buscarCampo(campos, ["defesa mágica", "defesa magica"])),
      velocidade: numeroTexto(buscarCampo(campos, ["velocidade"])),
      resistencia: numeroTexto(buscarCampo(campos, ["resistência", "resistencia"])),
      carismaBonus: buscarCampo(campos, ["carisma"]) || "",
      fatorMedoBonus: buscarCampo(campos, ["fator medo", "fator de medo"]) || "",
      vantagens: buscarCampo(campos, ["vantagens/bônus", "vantagens/bonus", "vantagens", "bônus", "bonus"]) || "",
      desvantagens: buscarCampo(campos, ["desvantagens/penalidades", "desvantagens", "penalidades"]) || "",
      classesSugeridas: interpretarListaRelacionada(
        buscarCampo(campos, ["classes sugeridas", "classe sugerida"]),
        classesDisponiveis,
        true,
        false
      ),
      elementosAfins: interpretarListaRelacionada(
        buscarCampo(campos, ["elementos afins", "elemento afim"]),
        elementosDisponiveis,
        true,
        false
      ),
      habilidadeExclusiva: habilidade
        ? {
            id: habilidade.id,
            nome: habilidade.nome
          }
        : null,
      restricoesClasse: interpretarListaRelacionada(
        buscarCampo(campos, ["restrição de classe", "restricao de classe", "restrições de classe", "restricoes de classe"]),
        classesDisponiveis,
        false,
        true
      ),
      criadoPor: state.usuarioAtual?.uid || "",
      criadoEm: serverTimestamp()
    };

    racas.push(raca);

    if (habilidadeNome && !habilidade) {
      erros.push(`Bloco ${numero}: habilidade exclusiva "${habilidadeNome}" não encontrada. A raça será cadastrada sem habilidade exclusiva.`);
    }
  });

  return {
    racas,
    erros
  };
}

function extrairCamposDoBloco(bloco) {
  const campos = {};
  const linhas = bloco.split("\n").map((linha) => linha.trim()).filter(Boolean);

  linhas.forEach((linha) => {
    const separador = linha.indexOf(":");

    if (separador === -1) return;

    const chave = normalizarTexto(linha.slice(0, separador));
    const valor = linha.slice(separador + 1).trim();

    campos[chave] = valor;
  });

  return campos;
}

function buscarCampo(campos, nomesPossiveis) {
  for (const nome of nomesPossiveis) {
    const chave = normalizarTexto(nome);

    if (campos[chave] !== undefined) {
      return campos[chave];
    }
  }

  return "";
}

function numeroTexto(valor) {
  if (!valor) return 0;

  const numero = Number(String(valor).replace(",", ".").replace(/[^\d.-]/g, ""));

  return Number.isFinite(numero) ? numero : 0;
}

function interpretarListaRelacionada(texto, listaDisponivel, permitirTodas, permitirNenhuma) {
  if (!texto) return [];

  const valorNormalizado = normalizarTexto(texto);

  if (permitirTodas && valorNormalizado === "todas") {
    return [{ id: "__ALL__", nome: "Todas" }];
  }

  if (permitirNenhuma && valorNormalizado === "nenhuma") {
    return [{ id: "__NONE__", nome: "Nenhuma" }];
  }

  return texto
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((nome) => {
      const encontrado = encontrarPorNome(listaDisponivel, nome);

      if (encontrado) {
        return {
          id: encontrado.id,
          nome: encontrado.nome
        };
      }

      return {
        id: "",
        nome
      };
    })
    .filter((item) => item.nome);
}

function encontrarPorNome(lista, nome) {
  const nomeNormalizado = normalizarTexto(nome);

  return lista.find((item) => normalizarTexto(item.nome || "") === nomeNormalizado) || null;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function renderizarPreviewImportacaoRacas(erros = []) {
  const preview = document.getElementById("previewImportacaoRacas");
  const lista = document.getElementById("listaPreviewImportacaoRacas");

  if (!preview || !lista) return;

  preview.style.display = "block";
  lista.innerHTML = "";

  if (erros.length > 0) {
    const aviso = document.createElement("div");
    aviso.classList.add("detail-section");
    aviso.innerHTML = `
      <h4>Avisos encontrados</h4>
      <p>${erros.map((erro) => escapeHtml(erro)).join("<br>")}</p>
    `;

    lista.appendChild(aviso);
  }

  if (importacaoRacasPendentes.length === 0) {
    lista.innerHTML += "<p>Nenhuma raça válida encontrada.</p>";
    return;
  }

  importacaoRacasPendentes.forEach((raca) => {
    const card = document.createElement("div");
    card.classList.add("resource-card");

    card.innerHTML = `
      <div class="resource-card-header">
        <h4>${escapeHtml(raca.nome)}</h4>
        <span>Raça</span>
      </div>

      <div class="resource-card-stats">
        <span>HP: <b>${raca.hpBase}</b></span>
        <span>Mana: <b>${raca.manaBase}</b></span>
        <span>Força Física: <b>${raca.forcaFisica}</b></span>
        <span>Força Mágica: <b>${raca.forcaMagica}</b></span>
        <span>Defesa Física: <b>${raca.defesaFisica}</b></span>
        <span>Defesa Mágica: <b>${raca.defesaMagica}</b></span>
        <span>Velocidade: <b>${raca.velocidade}</b></span>
        <span>Resistência: <b>${raca.resistencia}</b></span>
      </div>

      <p><b>Classes Sugeridas:</b> ${formatarListaObjetos(raca.classesSugeridas)}</p>
      <p><b>Elementos Afins:</b> ${formatarListaObjetos(raca.elementosAfins)}</p>
      <p><b>Restrição de Classe:</b> ${formatarListaObjetos(raca.restricoesClasse)}</p>
      <p><b>Habilidade Exclusiva:</b> ${raca.habilidadeExclusiva?.nome || "Não informado"}</p>
    `;

    lista.appendChild(card);
  });
}

function limparPreviewImportacaoRacas() {
  const preview = document.getElementById("previewImportacaoRacas");

  if (preview) {
    preview.style.display = "none";
  }

  importacaoRacasPendentes = [];
}

async function confirmarImportacaoRacas() {
  if (!state.usuarioAtual) {
    await mostrarModal("Você precisa estar logado.", "Acesso necessário");
    return;
  }

  if (state.dadosUsuarioAtual?.tipo !== "mestre") {
    await mostrarModal("Apenas o Mestre pode importar raças.", "Permissão negada");
    return;
  }

  if (importacaoRacasPendentes.length === 0) {
    await mostrarModal("Nenhuma raça foi analisada para cadastro.", "Importação vazia");
    return;
  }

  const racasSemDuplicidade = importacaoRacasPendentes.filter((raca) => {
    return !state.racasDisponiveis.some((existente) => {
      return normalizarTexto(existente.nome || "") === normalizarTexto(raca.nome || "");
    });
  });

  const ignoradas = importacaoRacasPendentes.length - racasSemDuplicidade.length;

  if (racasSemDuplicidade.length === 0) {
    await mostrarModal(
      "Todas as raças analisadas já existem no sistema. Nenhum cadastro foi realizado.",
      "Importação cancelada",
      "danger"
    );
    return;
  }

  const mensagemConfirmacao = ignoradas > 0
    ? `Foram encontradas ${ignoradas} raça(s) que já existem no sistema e serão ignoradas. Deseja cadastrar as ${racasSemDuplicidade.length} raça(s) restante(s)?`
    : `Deseja cadastrar ${racasSemDuplicidade.length} raça(s) agora?`;

  const confirmar = await confirmarModal({
    titulo: "Confirmar importação",
    mensagem: mensagemConfirmacao,
    confirmarTexto: "Cadastrar",
    cancelarTexto: "Cancelar",
    tipo: "success"
  });

  if (!confirmar) return;

  try {
    const cadastros = racasSemDuplicidade.map((raca) => {
      return addDoc(collection(db, "racas"), {
        ...raca,
        criadoPor: state.usuarioAtual.uid,
        criadoEm: serverTimestamp()
      });
    });

    await Promise.all(cadastros);

    await mostrarModal(
      `${racasSemDuplicidade.length} raça(s) cadastrada(s) com sucesso.`,
      "Importação concluída",
      "success"
    );

    fecharModalImportacaoRacas();
    renderizarRacas();
  } catch (erro) {
    console.error("Erro ao importar raças:", erro);
    await mostrarModal("Erro ao importar raças.", "Erro", "danger");
  }
}

function preencherSelectClassesRaca() {
  preencherSelectGenerico("selectClassesSugeridas", classesDisponiveis, "Nenhuma classe cadastrada", true, false);
  preencherSelectGenerico("selectRestricaoClasse", classesDisponiveis, "Nenhuma classe cadastrada", false, true);
}

function preencherSelectClassesRacaEdicao() {
  preencherSelectGenerico("editSelectClassesSugeridas", classesDisponiveis, "Nenhuma classe cadastrada", true, false);
  preencherSelectGenerico("editSelectRestricaoClasse", classesDisponiveis, "Nenhuma classe cadastrada", false, true);
}

function preencherSelectElementosRaca() {
  preencherSelectGenerico("selectElementosAfins", elementosDisponiveis, "Nenhum elemento cadastrado", true, false);
}

function preencherSelectElementosRacaEdicao() {
  preencherSelectGenerico("editSelectElementosAfins", elementosDisponiveis, "Nenhum elemento cadastrado", true, false);
}

function preencherSelectHabilidadesRaca() {
  preencherSelectGenerico("racaHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada", false, false);
}

function preencherSelectHabilidadesRacaEdicao() {
  preencherSelectGenerico("editRacaHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada", false, false);
}

function preencherSelectGenerico(selectId, lista, mensagemVazia, permitirTodas = false, permitirNenhuma = false) {
  const select = document.getElementById(selectId);

  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = `<option value="">Selecione uma opção</option>`;

  if (permitirTodas) {
    select.innerHTML += `<option value="__ALL__">Todas</option>`;
  }

  if (permitirNenhuma) {
    select.innerHTML += `<option value="__NONE__">Nenhuma</option>`;
  }

  if (!Array.isArray(lista) || lista.length === 0) {
    if (!permitirTodas && !permitirNenhuma) {
      select.innerHTML = `<option value="">${mensagemVazia}</option>`;
    }

    return;
  }

  lista.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.nome || "Sem nome";
    select.appendChild(option);
  });

  if (valorAtual) {
    select.value = valorAtual;
  }
}

async function adicionarSelecionado(selectId, listaSelecionada, renderCallback) {
  const select = document.getElementById(selectId);

  if (!select || !select.value) {
    await mostrarModal("Selecione uma opção primeiro.", "Campo obrigatório");
    return;
  }

  const id = select.value;
  const nome = select.selectedOptions[0].textContent;

  if (id === "__ALL__") {
    listaSelecionada.length = 0;
    listaSelecionada.push({ id: "__ALL__", nome: "Todas" });
    renderCallback();
    return;
  }

  if (id === "__NONE__") {
    listaSelecionada.length = 0;
    listaSelecionada.push({ id: "__NONE__", nome: "Nenhuma" });
    renderCallback();
    return;
  }

  const temOpcaoEspecial = listaSelecionada.some((item) => item.id === "__ALL__" || item.id === "__NONE__");

  if (temOpcaoEspecial) {
    await mostrarModal("Remova a opção especial antes de selecionar opções específicas.", "Seleção inválida");
    return;
  }

  const jaExiste = listaSelecionada.some((item) => item.id === id);

  if (jaExiste) {
    await mostrarModal("Essa opção já foi adicionada.", "Opção repetida");
    return;
  }

  listaSelecionada.push({ id, nome });
  renderCallback();
}

function removerSelecionado(listaSelecionada, id, renderCallback) {
  const index = listaSelecionada.findIndex((item) => item.id === id);

  if (index >= 0) {
    listaSelecionada.splice(index, 1);
  }

  renderCallback();
}

function renderizarListaSelecionada(containerId, lista, mensagemVazia, callbackRemover) {
  const container = document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = "";

  if (!lista || lista.length === 0) {
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

function renderizarClassesSugeridas() {
  renderizarListaSelecionada(
    "listaClassesSugeridasSelecionadas",
    classesSugeridasSelecionadas,
    "Nenhuma classe sugerida selecionada.",
    (id) => removerSelecionado(classesSugeridasSelecionadas, id, renderizarClassesSugeridas)
  );
}

function renderizarElementosAfins() {
  renderizarListaSelecionada(
    "listaElementosAfinsSelecionados",
    elementosAfinsSelecionados,
    "Nenhum elemento afim selecionado.",
    (id) => removerSelecionado(elementosAfinsSelecionados, id, renderizarElementosAfins)
  );
}

function renderizarRestricoesClasse() {
  renderizarListaSelecionada(
    "listaRestricaoClasseSelecionadas",
    restricoesClasseSelecionadas,
    "Nenhuma restrição de classe selecionada.",
    (id) => removerSelecionado(restricoesClasseSelecionadas, id, renderizarRestricoesClasse)
  );
}

function renderizarEditClassesSugeridas() {
  renderizarListaSelecionada(
    "editListaClassesSugeridasSelecionadas",
    editClassesSugeridasSelecionadas,
    "Nenhuma classe sugerida selecionada.",
    (id) => removerSelecionado(editClassesSugeridasSelecionadas, id, renderizarEditClassesSugeridas)
  );
}

function renderizarEditElementosAfins() {
  renderizarListaSelecionada(
    "editListaElementosAfinsSelecionados",
    editElementosAfinsSelecionados,
    "Nenhum elemento afim selecionado.",
    (id) => removerSelecionado(editElementosAfinsSelecionados, id, renderizarEditElementosAfins)
  );
}

function renderizarEditRestricoesClasse() {
  renderizarListaSelecionada(
    "editListaRestricaoClasseSelecionadas",
    editRestricoesClasseSelecionadas,
    "Nenhuma restrição de classe selecionada.",
    (id) => removerSelecionado(editRestricoesClasseSelecionadas, id, renderizarEditRestricoesClasse)
  );
}

export function atualizarPreviewRaca(raca) {
  const preview = document.getElementById("previewRacaNome");

  if (!preview) return;

  preview.textContent = raca?.nome || "Nenhuma raça selecionada.";
}

function formatarListaObjetos(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return "Não informado";
  }

  return lista.map((item) => item.nome || item).join(", ");
}

export function renderizarRacas() {
  const listaRacas = document.getElementById("listaRacas");

  if (!listaRacas) return;

  listaRacas.innerHTML = "";

  if (!state.racasDisponiveis || state.racasDisponiveis.length === 0) {
    listaRacas.innerHTML = "<p>Nenhuma raça cadastrada ainda.</p>";
    return;
  }

  state.racasDisponiveis.forEach((raca) => {
    const card = document.createElement("div");
    card.classList.add("resource-card");

    card.innerHTML = `
      <div class="resource-card-header">
        <h4>${escapeHtml(raca.nome || "Sem nome")}</h4>
        <span>Raça</span>
      </div>

      <div class="resource-card-stats">
        <span>HP: <b>${raca.hpBase || 0}</b></span>
        <span>Mana: <b>${raca.manaBase || 0}</b></span>
        <span>Velocidade: <b>${raca.velocidade || 0}</b></span>
        <span>Resistência: <b>${raca.resistencia || 0}</b></span>
      </div>

      <p><b>Vantagens:</b> ${raca.vantagens || "Não informado"}</p>
      <p><b>Desvantagens:</b> ${raca.desvantagens || "Não informado"}</p>
      <p><b>Classes Sugeridas:</b> ${formatarListaObjetos(raca.classesSugeridas)}</p>
      <p><b>Elementos Afins:</b> ${formatarListaObjetos(raca.elementosAfins)}</p>
      <p><b>Restrições:</b> ${formatarListaObjetos(raca.restricoesClasse)}</p>

      <div class="action-row">
        <button class="secondary-btn visualizar-raca">Visualizar</button>
        <button class="primary-btn editar-raca">Editar</button>
        <button class="small-btn danger excluir-raca">Excluir</button>
      </div>
    `;

    card.querySelector(".visualizar-raca").addEventListener("click", () => {
      setRacaSelecionada(raca);
      navegarPara("cadastrosRacaDetalhe");
    });

    card.querySelector(".editar-raca").addEventListener("click", () => {
      setRacaSelecionada(raca);
      navegarPara("cadastrosRacaDetalhe");
      setTimeout(() => {
        renderizarDetalheRaca(true);
      }, 300);
    });

    card.querySelector(".excluir-raca").addEventListener("click", async () => {
      setRacaSelecionada(raca);
      await excluirRaca();
    });

    listaRacas.appendChild(card);
  });
}

function renderizarDetalheRaca(modoEdicao = false) {
  const container = document.getElementById("racaDetalheContainer");

  if (!container) return;

  const raca = state.racaSelecionada;

  if (!raca) {
    container.innerHTML = `
      <div class="form-card">
        <h3>Nenhuma raça selecionada</h3>
        <p>Volte para a lista de raças e selecione uma opção.</p>
        <button class="secondary-btn" id="voltarListaRacas">Voltar para raças</button>
      </div>
    `;

    document.getElementById("voltarListaRacas").addEventListener("click", () => {
      navegarPara("cadastrosRacas");
    });

    return;
  }

  if (modoEdicao) {
    renderizarFormularioEdicaoRaca(container, raca);
    return;
  }

  container.innerHTML = `
    <div class="detail-card">
      <h3>${escapeHtml(raca.nome || "Sem nome")}</h3>
      <p class="detail-subtitle">Raça cadastrada pelo Mestre</p>

      <div class="detail-grid">
        <div class="detail-item"><span>HP Base</span><strong>${raca.hpBase || 0}</strong></div>
        <div class="detail-item"><span>Mana Base</span><strong>${raca.manaBase || 0}</strong></div>
        <div class="detail-item"><span>Força Física</span><strong>${raca.forcaFisica || 0}</strong></div>
        <div class="detail-item"><span>Força Mágica</span><strong>${raca.forcaMagica || 0}</strong></div>
        <div class="detail-item"><span>Defesa Física</span><strong>${raca.defesaFisica || 0}</strong></div>
        <div class="detail-item"><span>Defesa Mágica</span><strong>${raca.defesaMagica || 0}</strong></div>
        <div class="detail-item"><span>Velocidade</span><strong>${raca.velocidade || 0}</strong></div>
        <div class="detail-item"><span>Resistência</span><strong>${raca.resistencia || 0}</strong></div>
      </div>

      <div class="detail-section"><h4>Carisma</h4><p>${raca.carismaBonus || "Não informado"}</p></div>
      <div class="detail-section"><h4>Fator Medo</h4><p>${raca.fatorMedoBonus || "Não informado"}</p></div>
      <div class="detail-section"><h4>Vantagens/Bônus</h4><p>${raca.vantagens || "Não informado"}</p></div>
      <div class="detail-section"><h4>Desvantagens/Penalidades</h4><p>${raca.desvantagens || "Não informado"}</p></div>
      <div class="detail-section"><h4>Classes Sugeridas</h4><p>${formatarListaObjetos(raca.classesSugeridas)}</p></div>
      <div class="detail-section"><h4>Elementos Afins</h4><p>${formatarListaObjetos(raca.elementosAfins)}</p></div>
      <div class="detail-section"><h4>Habilidade Exclusiva</h4><p>${raca.habilidadeExclusiva?.nome || "Não informado"}</p></div>
      <div class="detail-section"><h4>Restrição de Classe</h4><p>${formatarListaObjetos(raca.restricoesClasse)}</p></div>

      <div class="action-row">
        <button class="secondary-btn" id="voltarListaRacas">Voltar</button>
        <button class="primary-btn" id="abrirEdicaoRaca">Editar raça</button>
        <button class="small-btn danger" id="excluirRacaDetalhe">Excluir raça</button>
      </div>
    </div>
  `;

  document.getElementById("voltarListaRacas").addEventListener("click", () => {
    navegarPara("cadastrosRacas");
  });

  document.getElementById("abrirEdicaoRaca").addEventListener("click", () => {
    renderizarDetalheRaca(true);
  });

  document.getElementById("excluirRacaDetalhe").addEventListener("click", excluirRaca);
}

function renderizarFormularioEdicaoRaca(container, raca) {
  editClassesSugeridasSelecionadas = Array.isArray(raca.classesSugeridas) ? [...raca.classesSugeridas] : [];
  editElementosAfinsSelecionados = Array.isArray(raca.elementosAfins) ? [...raca.elementosAfins] : [];
  editRestricoesClasseSelecionadas = Array.isArray(raca.restricoesClasse) ? [...raca.restricoesClasse] : [];

  container.innerHTML = `
    <div class="form-card edit-panel">
      <h3>Editar Raça</h3>

      <div class="form-grid">
        <label>Nome da Raça<input type="text" id="editRacaNome" value="${escapeHtml(raca.nome || "")}" /></label>
        <label>HP Base<input type="number" id="editRacaHpBase" value="${raca.hpBase || 0}" /></label>
        <label>Mana Base<input type="number" id="editRacaManaBase" value="${raca.manaBase || 0}" /></label>
        <label>Força Física<input type="number" id="editRacaForcaFisica" value="${raca.forcaFisica || 0}" /></label>
        <label>Força Mágica<input type="number" id="editRacaForcaMagica" value="${raca.forcaMagica || 0}" /></label>
        <label>Defesa Física<input type="number" id="editRacaDefesaFisica" value="${raca.defesaFisica || 0}" /></label>
        <label>Defesa Mágica<input type="number" id="editRacaDefesaMagica" value="${raca.defesaMagica || 0}" /></label>
        <label>Velocidade<input type="number" id="editRacaVelocidade" value="${raca.velocidade || 0}" /></label>
        <label>Resistência<input type="number" id="editRacaResistencia" value="${raca.resistencia || 0}" /></label>
      </div>

      <label>Carisma<input type="text" id="editRacaCarisma" value="${escapeHtml(raca.carismaBonus || "")}" /></label>
      <label>Fator Medo<input type="text" id="editRacaFatorMedo" value="${escapeHtml(raca.fatorMedoBonus || "")}" /></label>
      <label>Vantagens/Bônus<textarea id="editRacaVantagens">${escapeHtml(raca.vantagens || "")}</textarea></label>
      <label>Desvantagens/Penalidades<textarea id="editRacaDesvantagens">${escapeHtml(raca.desvantagens || "")}</textarea></label>

      ${montarMultiEdicao("Classes Sugeridas", "editSelectClassesSugeridas", "editAdicionarClasseSugerida", "editListaClassesSugeridasSelecionadas")}
      ${montarMultiEdicao("Elementos Afins", "editSelectElementosAfins", "editAdicionarElementoAfim", "editListaElementosAfinsSelecionados")}

      <label>
        Habilidade Exclusiva
        <select id="editRacaHabilidadeExclusiva">
          <option value="">Carregando habilidades...</option>
        </select>
      </label>

      ${montarMultiEdicao("Restrição de Classe", "editSelectRestricaoClasse", "editAdicionarRestricaoClasse", "editListaRestricaoClasseSelecionadas")}

      <div class="action-row">
        <button class="secondary-btn" id="cancelarEdicaoRaca">Cancelar</button>
        <button class="primary-btn" id="salvarEdicaoRaca">Salvar alterações</button>
      </div>
    </div>
  `;

  preencherSelectClassesRacaEdicao();
  preencherSelectElementosRacaEdicao();
  preencherSelectHabilidadesRacaEdicao();

  const habilidade = document.getElementById("editRacaHabilidadeExclusiva");

  if (habilidade && raca.habilidadeExclusiva?.id) {
    habilidade.value = raca.habilidadeExclusiva.id;
  }

  renderizarEditClassesSugeridas();
  renderizarEditElementosAfins();
  renderizarEditRestricoesClasse();

  document.getElementById("editAdicionarClasseSugerida").addEventListener("click", () => {
    adicionarSelecionado("editSelectClassesSugeridas", editClassesSugeridasSelecionadas, renderizarEditClassesSugeridas);
  });

  document.getElementById("editAdicionarElementoAfim").addEventListener("click", () => {
    adicionarSelecionado("editSelectElementosAfins", editElementosAfinsSelecionados, renderizarEditElementosAfins);
  });

  document.getElementById("editAdicionarRestricaoClasse").addEventListener("click", () => {
    adicionarSelecionado("editSelectRestricaoClasse", editRestricoesClasseSelecionadas, renderizarEditRestricoesClasse);
  });

  document.getElementById("cancelarEdicaoRaca").addEventListener("click", () => {
    renderizarDetalheRaca(false);
  });

  document.getElementById("salvarEdicaoRaca").addEventListener("click", salvarEdicaoRaca);
}

function montarMultiEdicao(label, selectId, botaoId, listaId) {
  return `
    <div class="multi-select-box">
      <label>
        ${label}
        <select id="${selectId}">
          <option value="">Carregando opções...</option>
        </select>
      </label>

      <button class="secondary-btn" type="button" id="${botaoId}">Adicionar</button>

      <div id="${listaId}" class="selected-list">
        <span class="empty-selection">Nenhuma opção selecionada.</span>
      </div>
    </div>
  `;
}

function preencherSelectClassesRaca() {
  preencherSelectGenerico("selectClassesSugeridas", classesDisponiveis, "Nenhuma classe cadastrada", true, false);
  preencherSelectGenerico("selectRestricaoClasse", classesDisponiveis, "Nenhuma classe cadastrada", false, true);
}

function preencherSelectClassesRacaEdicao() {
  preencherSelectGenerico("editSelectClassesSugeridas", classesDisponiveis, "Nenhuma classe cadastrada", true, false);
  preencherSelectGenerico("editSelectRestricaoClasse", classesDisponiveis, "Nenhuma classe cadastrada", false, true);
}

function preencherSelectElementosRaca() {
  preencherSelectGenerico("selectElementosAfins", elementosDisponiveis, "Nenhum elemento cadastrado", true, false);
}

function preencherSelectElementosRacaEdicao() {
  preencherSelectGenerico("editSelectElementosAfins", elementosDisponiveis, "Nenhum elemento cadastrado", true, false);
}

function preencherSelectHabilidadesRaca() {
  preencherSelectGenerico("racaHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada", false, false);
}

function preencherSelectHabilidadesRacaEdicao() {
  preencherSelectGenerico("editRacaHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada", false, false);
}

function preencherSelectGenerico(selectId, lista, mensagemVazia, permitirTodas = false, permitirNenhuma = false) {
  const select = document.getElementById(selectId);

  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = `<option value="">Selecione uma opção</option>`;

  if (permitirTodas) {
    select.innerHTML += `<option value="__ALL__">Todas</option>`;
  }

  if (permitirNenhuma) {
    select.innerHTML += `<option value="__NONE__">Nenhuma</option>`;
  }

  if (!Array.isArray(lista) || lista.length === 0) {
    if (!permitirTodas && !permitirNenhuma) {
      select.innerHTML = `<option value="">${mensagemVazia}</option>`;
    }

    return;
  }

  lista.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.nome || "Sem nome";
    select.appendChild(option);
  });

  if (valorAtual) {
    select.value = valorAtual;
  }
}

async function adicionarSelecionado(selectId, listaSelecionada, renderCallback) {
  const select = document.getElementById(selectId);

  if (!select || !select.value) {
    await mostrarModal("Selecione uma opção primeiro.", "Campo obrigatório");
    return;
  }

  const id = select.value;
  const nome = select.selectedOptions[0].textContent;

  if (id === "__ALL__") {
    listaSelecionada.length = 0;
    listaSelecionada.push({ id: "__ALL__", nome: "Todas" });
    renderCallback();
    return;
  }

  if (id === "__NONE__") {
    listaSelecionada.length = 0;
    listaSelecionada.push({ id: "__NONE__", nome: "Nenhuma" });
    renderCallback();
    return;
  }

  const temOpcaoEspecial = listaSelecionada.some((item) => item.id === "__ALL__" || item.id === "__NONE__");

  if (temOpcaoEspecial) {
    await mostrarModal("Remova a opção especial antes de selecionar opções específicas.", "Seleção inválida");
    return;
  }

  const jaExiste = listaSelecionada.some((item) => item.id === id);

  if (jaExiste) {
    await mostrarModal("Essa opção já foi adicionada.", "Opção repetida");
    return;
  }

  listaSelecionada.push({ id, nome });
  renderCallback();
}

function removerSelecionado(listaSelecionada, id, renderCallback) {
  const index = listaSelecionada.findIndex((item) => item.id === id);

  if (index >= 0) {
    listaSelecionada.splice(index, 1);
  }

  renderCallback();
}

function renderizarListaSelecionada(containerId, lista, mensagemVazia, callbackRemover) {
  const container = document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = "";

  if (!lista || lista.length === 0) {
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

function renderizarClassesSugeridas() {
  renderizarListaSelecionada(
    "listaClassesSugeridasSelecionadas",
    classesSugeridasSelecionadas,
    "Nenhuma classe sugerida selecionada.",
    (id) => removerSelecionado(classesSugeridasSelecionadas, id, renderizarClassesSugeridas)
  );
}

function renderizarElementosAfins() {
  renderizarListaSelecionada(
    "listaElementosAfinsSelecionados",
    elementosAfinsSelecionados,
    "Nenhum elemento afim selecionado.",
    (id) => removerSelecionado(elementosAfinsSelecionados, id, renderizarElementosAfins)
  );
}

function renderizarRestricoesClasse() {
  renderizarListaSelecionada(
    "listaRestricaoClasseSelecionadas",
    restricoesClasseSelecionadas,
    "Nenhuma restrição de classe selecionada.",
    (id) => removerSelecionado(restricoesClasseSelecionadas, id, renderizarRestricoesClasse)
  );
}

function renderizarEditClassesSugeridas() {
  renderizarListaSelecionada(
    "editListaClassesSugeridasSelecionadas",
    editClassesSugeridasSelecionadas,
    "Nenhuma classe sugerida selecionada.",
    (id) => removerSelecionado(editClassesSugeridasSelecionadas, id, renderizarEditClassesSugeridas)
  );
}

function renderizarEditElementosAfins() {
  renderizarListaSelecionada(
    "editListaElementosAfinsSelecionados",
    editElementosAfinsSelecionados,
    "Nenhum elemento afim selecionado.",
    (id) => removerSelecionado(editElementosAfinsSelecionados, id, renderizarEditElementosAfins)
  );
}

function renderizarEditRestricoesClasse() {
  renderizarListaSelecionada(
    "editListaRestricaoClasseSelecionadas",
    editRestricoesClasseSelecionadas,
    "Nenhuma restrição de classe selecionada.",
    (id) => removerSelecionado(editRestricoesClasseSelecionadas, id, renderizarEditRestricoesClasse)
  );
}

export function atualizarPreviewRaca(raca) {
  const preview = document.getElementById("previewRacaNome");

  if (!preview) return;

  preview.textContent = raca?.nome || "Nenhuma raça selecionada.";
}

function formatarListaObjetos(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return "Não informado";
  }

  return lista.map((item) => item.nome || item).join(", ");
}

function atualizarContadorRacas() {
  const contador = document.getElementById("contadorRacas");

  if (contador) {
    contador.textContent = state.racasDisponiveis.length;
  }
}

function escapeHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function initRacas() {
  onPageLoaded((pagina) => {
    if (pagina === "cadastrosRacas") {
      renderizarRacas();

      document.getElementById("abrirCadastroRacas")?.addEventListener("click", abrirModalCadastroRaca);
      document.getElementById("abrirImportacaoRacas")?.addEventListener("click", abrirModalImportacaoRacas);
    }

    if (pagina === "cadastrosRacaDetalhe") {
      renderizarDetalheRaca(false);
    }

    if (pagina === "dashboard") {
      atualizarContadorRacas();
    }
  });
}