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

    await mostrarModal("Classe salva com sucesso.", "Cadastro realizado", "success");

    fecharModalCadastroClasse();
    renderizarClasses();
  } catch (erro) {
    console.error("Erro ao salvar classe:", erro);
    await mostrarModal("Erro ao salvar classe.", "Erro", "danger");
  }
}

async function salvarEdicaoClasse() {
  if (!state.classeSelecionada) {
    await mostrarModal("Nenhuma classe selecionada.", "Erro", "danger");
    return;
  }

  const nome = textoCampo("editClasseNome");

  if (!nome) {
    await mostrarModal("Digite o nome da classe.", "Campo obrigatório");
    return;
  }

  const jaExiste = state.classesDisponiveis.some((classe) => {
    const mesmoNome = normalizarTexto(classe.nome || "") === normalizarTexto(nome);
    const outroRegistro = classe.id !== state.classeSelecionada.id;

    return mesmoNome && outroRegistro;
  });

  if (jaExiste) {
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
    await updateDoc(doc(db, "classes", state.classeSelecionada.id), dadosAtualizados);

    setClasseSelecionada({
      ...state.classeSelecionada,
      ...dadosAtualizados
    });

    await mostrarModal("Classe atualizada com sucesso.", "Alterações salvas", "success");
    renderizarDetalheClasse(false);
  } catch (erro) {
    console.error("Erro ao editar classe:", erro);
    await mostrarModal("Erro ao editar classe.", "Erro", "danger");
  }
}

async function excluirClasse() {
  if (!state.classeSelecionada) {
    await mostrarModal("Nenhuma classe selecionada.", "Erro", "danger");
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Excluir classe",
    mensagem: `Tem certeza que deseja excluir a classe "${state.classeSelecionada.nome}"? Essa ação não pode ser desfeita.`,
    confirmarTexto: "Excluir",
    cancelarTexto: "Cancelar",
    tipo: "danger"
  });

  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "classes", state.classeSelecionada.id));

    setClasseSelecionada(null);

    await mostrarModal("Classe excluída com sucesso.", "Exclusão concluída", "success");
    navegarPara("cadastrosClasses");
  } catch (erro) {
    console.error("Erro ao excluir classe:", erro);
    await mostrarModal("Erro ao excluir classe.", "Erro", "danger");
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
          <h3>Importar Classes em Massa</h3>
          <p>Cole várias classes seguindo o modelo. Separe uma classe da outra usando uma linha com três traços: ---</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharModalImportacaoClasses">×</button>
      </div>

      <div class="crud-form-body">
        <div class="crud-form-content">
          <label>
            Texto para importação
            <textarea id="textoImportacaoClasses" rows="18" placeholder="Cole aqui as classes no modelo indicado..."></textarea>
          </label>

          <div class="detail-section">
            <h4>Modelo esperado</h4>
            <p>
              Nome da Classe: Mago<br>
              HP por Nível: 5<br>
              Mana por Nível: 20<br>
              Atributo Principal: Força Mágica<br>
              Atributo Secundário: Defesa Mágica<br>
              Tipo de Dano: Mágico<br>
              Tipo de Defesa: Mágica<br>
              Armas Permitidas: Cajados, grimórios e varinhas.<br>
              Armaduras Permitidas: Mantôs, roupas leves e vestes encantadas.<br>
              Habilidade Exclusiva: Bola de Fogo<br>
              Vantagens: Alta afinidade com magia.<br>
              Desvantagens: Baixa resistência física.<br>
              Subclasses Disponíveis: Feiticeiro, Invocador<br>
              ---<br>
              Nome da Classe: Bárbaro<br>
              HP por Nível: 20
            </p>
          </div>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="cancelarImportacaoClasses">Cancelar</button>
            <button class="primary-btn" type="button" id="analisarImportacaoClasses">Analisar texto</button>
          </div>

          <div id="previewImportacaoClasses" class="list-card" style="display:none;">
            <h3>Prévia da importação</h3>

            <div id="listaPreviewImportacaoClasses" class="resource-list"></div>

            <div class="action-row">
              <button class="secondary-btn" type="button" id="limparPreviewImportacaoClasses">Revisar texto</button>
              <button class="primary-btn" type="button" id="confirmarImportacaoClasses">Cadastrar todos</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharModalImportacaoClasses")?.addEventListener("click", fecharModalImportacaoClasses);
  document.getElementById("cancelarImportacaoClasses")?.addEventListener("click", fecharModalImportacaoClasses);
  document.getElementById("analisarImportacaoClasses")?.addEventListener("click", analisarImportacaoClasses);
  document.getElementById("limparPreviewImportacaoClasses")?.addEventListener("click", limparPreviewImportacaoClasses);
  document.getElementById("confirmarImportacaoClasses")?.addEventListener("click", confirmarImportacaoClasses);

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

async function analisarImportacaoClasses() {
  const texto = document.getElementById("textoImportacaoClasses")?.value.trim() || "";

  if (!texto) {
    await mostrarModal("Cole o texto com as classes antes de analisar.", "Campo obrigatório");
    return;
  }

  const resultado = interpretarTextoClasses(texto);

  if (resultado.erros.length > 0 && resultado.classes.length === 0) {
    await mostrarModal(resultado.erros.join("\n"), "Não foi possível importar", "danger");
    return;
  }

  importacaoClassesPendentes = resultado.classes;
  renderizarPreviewImportacaoClasses(resultado.erros);
}

function interpretarTextoClasses(texto) {
  const blocos = texto
    .split(/\n\s*---\s*\n/g)
    .map((bloco) => bloco.trim())
    .filter(Boolean);

  const classes = [];
  const erros = [];
  const nomesNoTexto = new Set();

  blocos.forEach((bloco, index) => {
    const campos = extrairCamposDoBloco(bloco);
    const numero = index + 1;

    const nome = buscarCampo(campos, ["nome da classe", "classe", "nome"]);

    if (!nome) {
      erros.push(`Bloco ${numero}: nome da classe não encontrado.`);
      return;
    }

    const nomeNormalizado = normalizarTexto(nome);

    if (nomesNoTexto.has(nomeNormalizado)) {
      erros.push(`Bloco ${numero}: a classe "${nome}" está repetida no texto e foi ignorada.`);
      return;
    }

    nomesNoTexto.add(nomeNormalizado);

    const jaExiste = state.classesDisponiveis.some((classe) => {
      return normalizarTexto(classe.nome || "") === nomeNormalizado;
    });

    if (jaExiste) {
      erros.push(`Bloco ${numero}: a classe "${nome}" já existe no sistema e foi ignorada.`);
      return;
    }

    const habilidadeNome = buscarCampo(campos, ["habilidade exclusiva"]);
    const habilidade = habilidadeNome ? encontrarPorNome(habilidadesDisponiveis, habilidadeNome) : null;

    if (habilidadeNome && !habilidade) {
      erros.push(`Bloco ${numero}: habilidade exclusiva "${habilidadeNome}" não encontrada. A classe será cadastrada sem habilidade exclusiva.`);
    }

    const classe = {
      nome,
      hpPorNivel: numeroTexto(buscarCampo(campos, ["hp por nível", "hp por nivel"])),
      manaPorNivel: numeroTexto(buscarCampo(campos, ["mana por nível", "mana por nivel"])),
      atributoPrincipal: interpretarAtributo(buscarCampo(campos, ["atributo principal"]), erros, numero),
      atributoSecundario: interpretarAtributo(buscarCampo(campos, ["atributo secundário", "atributo secundario"]), erros, numero),
      tipoDano: buscarCampo(campos, ["tipo de dano"]) || "",
      tipoDefesa: buscarCampo(campos, ["tipo de defesa"]) || "",
      armasPermitidas: buscarCampo(campos, ["armas permitidas"]) || "",
      armadurasPermitidas: buscarCampo(campos, ["armaduras permitidas"]) || "",
      habilidadeExclusiva: habilidade
        ? {
            id: habilidade.id,
            nome: habilidade.nome
          }
        : null,
      vantagens: buscarCampo(campos, ["vantagens"]) || "",
      desvantagens: buscarCampo(campos, ["desvantagens"]) || "",
      subclassesDisponiveis: interpretarListaSubclasses(
        buscarCampo(campos, ["subclasses disponíveis", "subclasses disponiveis", "subclasse disponível", "subclasse disponivel"]),
        erros,
        numero
      )
    };

    classes.push(classe);
  });

  return {
    classes,
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

function interpretarAtributo(valor, erros, numeroBloco) {
  if (!valor) return "";

  const normalizado = normalizarTexto(valor);

  const mapa = {
    "forca fisica": "forcaFisica",
    "forca magica": "forcaMagica",
    "defesa fisica": "defesaFisica",
    "defesa magica": "defesaMagica",
    velocidade: "velocidade",
    resistencia: "resistencia"
  };

  if (mapa[normalizado]) {
    return mapa[normalizado];
  }

  const valoresValidos = Object.keys(mapa).join(", ");
  erros.push(`Bloco ${numeroBloco}: atributo "${valor}" não reconhecido. Use: ${valoresValidos}.`);

  return "";
}

function interpretarListaSubclasses(texto, erros, numeroBloco) {
  if (!texto) return [];

  return texto
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((nome) => {
      const encontrado = encontrarPorNome(subclassesDisponiveis, nome);

      if (encontrado) {
        return {
          id: encontrado.id,
          nome: encontrado.nome
        };
      }

      erros.push(`Bloco ${numeroBloco}: subclasse "${nome}" não encontrada. Ela aparecerá como texto, mas não ficará vinculada a um cadastro existente.`);

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

function renderizarPreviewImportacaoClasses(erros = []) {
  const preview = document.getElementById("previewImportacaoClasses");
  const lista = document.getElementById("listaPreviewImportacaoClasses");

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

  if (importacaoClassesPendentes.length === 0) {
    lista.innerHTML += "<p>Nenhuma classe válida encontrada.</p>";
    return;
  }

  importacaoClassesPendentes.forEach((classe) => {
    const card = document.createElement("div");
    card.classList.add("resource-card");

    card.innerHTML = `
      <div class="resource-card-header">
        <h4>${escapeHtml(classe.nome)}</h4>
        <span>Classe</span>
      </div>

      <div class="resource-card-stats">
        <span>HP/Nível: <b>${classe.hpPorNivel}</b></span>
        <span>Mana/Nível: <b>${classe.manaPorNivel}</b></span>
        <span>Dano: <b>${escapeHtml(classe.tipoDano || "—")}</b></span>
        <span>Defesa: <b>${escapeHtml(classe.tipoDefesa || "—")}</b></span>
      </div>

      <p><b>Atributo Principal:</b> ${escapeHtml(formatarAtributo(classe.atributoPrincipal))}</p>
      <p><b>Atributo Secundário:</b> ${escapeHtml(formatarAtributo(classe.atributoSecundario))}</p>
      <p><b>Habilidade Exclusiva:</b> ${escapeHtml(classe.habilidadeExclusiva?.nome || "Não informado")}</p>
      <p><b>Subclasses Disponíveis:</b> ${escapeHtml(formatarListaObjetos(classe.subclassesDisponiveis))}</p>
    `;

    lista.appendChild(card);
  });
}

function limparPreviewImportacaoClasses() {
  const preview = document.getElementById("previewImportacaoClasses");

  if (preview) {
    preview.style.display = "none";
  }

  importacaoClassesPendentes = [];
}

async function confirmarImportacaoClasses() {
  if (!state.usuarioAtual) {
    await mostrarModal("Você precisa estar logado.", "Acesso necessário");
    return;
  }

  if (state.dadosUsuarioAtual?.tipo !== "mestre") {
    await mostrarModal("Apenas o Mestre pode importar classes.", "Permissão negada");
    return;
  }

  if (importacaoClassesPendentes.length === 0) {
    await mostrarModal("Nenhuma classe foi analisada para cadastro.", "Importação vazia");
    return;
  }

  const classesSemDuplicidade = importacaoClassesPendentes.filter((classe) => {
    return !state.classesDisponiveis.some((existente) => {
      return normalizarTexto(existente.nome || "") === normalizarTexto(classe.nome || "");
    });
  });

  const ignoradas = importacaoClassesPendentes.length - classesSemDuplicidade.length;

  if (classesSemDuplicidade.length === 0) {
    await mostrarModal(
      "Todas as classes analisadas já existem no sistema. Nenhum cadastro foi realizado.",
      "Importação cancelada",
      "danger"
    );
    return;
  }

  const mensagemConfirmacao = ignoradas > 0
    ? `Foram encontradas ${ignoradas} classe(s) que já existem no sistema e serão ignoradas. Deseja cadastrar as ${classesSemDuplicidade.length} classe(s) restante(s)?`
    : `Deseja cadastrar ${classesSemDuplicidade.length} classe(s) agora?`;

  const confirmar = await confirmarModal({
    titulo: "Confirmar importação",
    mensagem: mensagemConfirmacao,
    confirmarTexto: "Cadastrar",
    cancelarTexto: "Cancelar",
    tipo: "success"
  });

  if (!confirmar) return;

  try {
    const cadastros = classesSemDuplicidade.map((classe) => {
      return addDoc(collection(db, "classes"), {
        ...classe,
        criadoPor: state.usuarioAtual.uid,
        criadoEm: serverTimestamp()
      });
    });

    await Promise.all(cadastros);

    await mostrarModal(
      `${classesSemDuplicidade.length} classe(s) cadastrada(s) com sucesso.`,
      "Importação concluída",
      "success"
    );

    fecharModalImportacaoClasses();
    renderizarClasses();
  } catch (erro) {
    console.error("Erro ao importar classes:", erro);
    await mostrarModal("Erro ao importar classes.", "Erro", "danger");
  }
}

export function renderizarClasses() {
  const listaClasses = document.getElementById("listaClasses");

  if (!listaClasses) return;

  listaClasses.innerHTML = "";

  if (state.classesDisponiveis.length === 0) {
    listaClasses.innerHTML = "<p>Nenhuma classe cadastrada ainda.</p>";
    return;
  }

  state.classesDisponiveis.forEach((classe) => {
    const card = document.createElement("div");
    card.classList.add("resource-card");

    card.innerHTML = `
      <div class="resource-card-header">
        <h4>${escapeHtml(classe.nome || "Sem nome")}</h4>
        <span>Classe</span>
      </div>

      <div class="resource-card-stats">
        <span>HP/Nível: <b>${classe.hpPorNivel || 0}</b></span>
        <span>Mana/Nível: <b>${classe.manaPorNivel || 0}</b></span>
        <span>Dano: <b>${escapeHtml(classe.tipoDano || "—")}</b></span>
        <span>Defesa: <b>${escapeHtml(classe.tipoDefesa || "—")}</b></span>
      </div>

      <p><b>Atributo Principal:</b> ${escapeHtml(formatarAtributo(classe.atributoPrincipal))}</p>
      <p><b>Atributo Secundário:</b> ${escapeHtml(formatarAtributo(classe.atributoSecundario))}</p>
      <p><b>Habilidade Exclusiva:</b> ${escapeHtml(classe.habilidadeExclusiva?.nome || "Não informado")}</p>
      <p><b>Subclasses Disponíveis:</b> ${escapeHtml(formatarListaObjetos(classe.subclassesDisponiveis))}</p>

      <div class="action-row">
        <button class="secondary-btn visualizar-classe">Visualizar</button>
        <button class="primary-btn editar-classe">Editar</button>
        <button class="small-btn danger excluir-classe">Excluir</button>
      </div>
    `;

    card.querySelector(".visualizar-classe").addEventListener("click", () => {
      setClasseSelecionada(classe);
      navegarPara("cadastrosClasseDetalhe");
    });

    card.querySelector(".editar-classe").addEventListener("click", () => {
      setClasseSelecionada(classe);
      navegarPara("cadastrosClasseDetalhe");
      setTimeout(() => {
        renderizarDetalheClasse(true);
      }, 300);
    });

    card.querySelector(".excluir-classe").addEventListener("click", async () => {
      setClasseSelecionada(classe);
      await excluirClasse();
    });

    listaClasses.appendChild(card);
  });
}

export function renderizarDetalheClasse(modoEdicao = false) {
  const container = document.getElementById("classeDetalheContainer");

  if (!container) return;

  const classe = state.classeSelecionada;

  if (!classe) {
    container.innerHTML = `
      <div class="form-card">
        <h3>Nenhuma classe selecionada</h3>
        <p>Volte para a lista de classes e selecione uma opção.</p>
        <button class="secondary-btn" id="voltarListaClasses">Voltar para classes</button>
      </div>
    `;

    document.getElementById("voltarListaClasses")?.addEventListener("click", () => {
      navegarPara("cadastrosClasses");
    });

    return;
  }

  if (modoEdicao) {
    renderizarFormularioEdicaoClasse(container, classe);
    return;
  }

  container.innerHTML = `
    <div class="detail-card">
      <h3>${escapeHtml(classe.nome || "Sem nome")}</h3>
      <p class="detail-subtitle">Classe cadastrada pelo Mestre</p>

      <div class="detail-grid">
        <div class="detail-item"><span>HP por Nível</span><strong>${classe.hpPorNivel || 0}</strong></div>
        <div class="detail-item"><span>Mana por Nível</span><strong>${classe.manaPorNivel || 0}</strong></div>
        <div class="detail-item"><span>Atributo Principal</span><strong>${formatarAtributo(classe.atributoPrincipal)}</strong></div>
        <div class="detail-item"><span>Atributo Secundário</span><strong>${formatarAtributo(classe.atributoSecundario)}</strong></div>
        <div class="detail-item"><span>Tipo de Dano</span><strong>${escapeHtml(classe.tipoDano || "Não informado")}</strong></div>
        <div class="detail-item"><span>Tipo de Defesa</span><strong>${escapeHtml(classe.tipoDefesa || "Não informado")}</strong></div>
      </div>

      <div class="detail-section"><h4>Armas Permitidas</h4><p>${escapeHtml(classe.armasPermitidas || "Não informado")}</p></div>
      <div class="detail-section"><h4>Armaduras Permitidas</h4><p>${escapeHtml(classe.armadurasPermitidas || "Não informado")}</p></div>
      <div class="detail-section"><h4>Habilidade Exclusiva</h4><p>${escapeHtml(classe.habilidadeExclusiva?.nome || "Não informado")}</p></div>
      <div class="detail-section"><h4>Vantagens</h4><p>${escapeHtml(classe.vantagens || "Não informado")}</p></div>
      <div class="detail-section"><h4>Desvantagens</h4><p>${escapeHtml(classe.desvantagens || "Não informado")}</p></div>
      <div class="detail-section"><h4>Subclasses Disponíveis</h4><p>${escapeHtml(formatarListaObjetos(classe.subclassesDisponiveis))}</p></div>

      <div class="action-row">
        <button class="secondary-btn" id="voltarListaClasses">Voltar</button>
        <button class="primary-btn" id="abrirEdicaoClasse">Editar classe</button>
        <button class="small-btn danger" id="excluirClasseDetalhe">Excluir classe</button>
      </div>
    </div>
  `;

  document.getElementById("voltarListaClasses")?.addEventListener("click", () => {
    navegarPara("cadastrosClasses");
  });

  document.getElementById("abrirEdicaoClasse")?.addEventListener("click", () => {
    renderizarDetalheClasse(true);
  });

  document.getElementById("excluirClasseDetalhe")?.addEventListener("click", excluirClasse);
}

function renderizarFormularioEdicaoClasse(container, classe) {
  editSubclassesSelecionadas = Array.isArray(classe.subclassesDisponiveis)
    ? [...classe.subclassesDisponiveis]
    : [];

  container.innerHTML = `
    <div class="form-card edit-panel">
      <h3>Editar Classe</h3>

      <div class="form-grid">
        <label>Nome da Classe<input type="text" id="editClasseNome" value="${escapeHtml(classe.nome || "")}" /></label>
        <label>HP por Nível<input type="number" id="editClasseHpPorNivel" value="${classe.hpPorNivel || 0}" /></label>
        <label>Mana por Nível<input type="number" id="editClasseManaPorNivel" value="${classe.manaPorNivel || 0}" /></label>

        <label>
          Atributo Principal
          <select id="editClasseAtributoPrincipal">
            ${opcoesAtributos(classe.atributoPrincipal)}
          </select>
        </label>

        <label>
          Atributo Secundário
          <select id="editClasseAtributoSecundario">
            ${opcoesAtributos(classe.atributoSecundario)}
          </select>
        </label>

        <label>Tipo de Dano<input type="text" id="editClasseTipoDano" value="${escapeHtml(classe.tipoDano || "")}" /></label>
        <label>Tipo de Defesa<input type="text" id="editClasseTipoDefesa" value="${escapeHtml(classe.tipoDefesa || "")}" /></label>
      </div>

      <label>Armas Permitidas<textarea id="editClasseArmasPermitidas">${escapeHtml(classe.armasPermitidas || "")}</textarea></label>
      <label>Armaduras Permitidas<textarea id="editClasseArmadurasPermitidas">${escapeHtml(classe.armadurasPermitidas || "")}</textarea></label>

      <label>
        Habilidade Exclusiva
        <select id="editClasseHabilidadeExclusiva">
          <option value="">Carregando habilidades...</option>
        </select>
      </label>

      <label>Vantagens<textarea id="editClasseVantagens">${escapeHtml(classe.vantagens || "")}</textarea></label>
      <label>Desvantagens<textarea id="editClasseDesvantagens">${escapeHtml(classe.desvantagens || "")}</textarea></label>

      <div class="multi-select-box">
        <label>
          Subclasses Disponíveis
          <select id="editSelectSubclassesDisponiveis">
            <option value="">Carregando subclasses...</option>
          </select>
        </label>

        <button class="secondary-btn" type="button" id="editAdicionarSubclasseDisponivel">Adicionar subclasse</button>

        <div id="editListaSubclassesDisponiveisSelecionadas" class="selected-list"></div>
      </div>

      <div class="action-row">
        <button class="secondary-btn" id="cancelarEdicaoClasse">Cancelar</button>
        <button class="primary-btn" id="salvarEdicaoClasse">Salvar alterações</button>
      </div>
    </div>
  `;

  preencherSelectHabilidadesClasseEdicao();
  preencherSelectSubclassesClasseEdicao();

  const habilidade = document.getElementById("editClasseHabilidadeExclusiva");

  if (habilidade && classe.habilidadeExclusiva?.id) {
    habilidade.value = classe.habilidadeExclusiva.id;
  }

  renderizarSubclassesSelecionadasClasseEdicao();

  document.getElementById("editAdicionarSubclasseDisponivel")?.addEventListener("click", () => {
    adicionarSelecionado(
      "editSelectSubclassesDisponiveis",
      editSubclassesSelecionadas,
      renderizarSubclassesSelecionadasClasseEdicao
    );
  });

  document.getElementById("cancelarEdicaoClasse")?.addEventListener("click", () => {
    renderizarDetalheClasse(false);
  });

  document.getElementById("salvarEdicaoClasse")?.addEventListener("click", salvarEdicaoClasse);
}

function opcoesAtributos(valorSelecionado) {
  const atributos = [
    { valor: "", nome: "Selecione" },
    { valor: "forcaFisica", nome: "Força Física" },
    { valor: "forcaMagica", nome: "Força Mágica" },
    { valor: "defesaFisica", nome: "Defesa Física" },
    { valor: "defesaMagica", nome: "Defesa Mágica" },
    { valor: "velocidade", nome: "Velocidade" },
    { valor: "resistencia", nome: "Resistência" }
  ];

  return atributos
    .map((atributo) => {
      const selected = atributo.valor === valorSelecionado ? "selected" : "";
      return `<option value="${atributo.valor}" ${selected}>${atributo.nome}</option>`;
    })
    .join("");
}

function preencherSelectHabilidadesClasse() {
  preencherSelectGenerico("classeHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada");
}

function preencherSelectHabilidadesClasseEdicao() {
  preencherSelectGenerico("editClasseHabilidadeExclusiva", habilidadesDisponiveis, "Nenhuma habilidade cadastrada");
}

function preencherSelectSubclassesClasse() {
  preencherSelectGenerico("selectSubclassesDisponiveis", subclassesDisponiveis, "Nenhuma subclasse cadastrada");
}

function preencherSelectSubclassesClasseEdicao() {
  preencherSelectGenerico("editSelectSubclassesDisponiveis", subclassesDisponiveis, "Nenhuma subclasse cadastrada");
}

function preencherSelectGenerico(selectId, lista, mensagemVazia) {
  const select = document.getElementById(selectId);

  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    select.innerHTML = `<option value="">${mensagemVazia}</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione uma opção</option>`;

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

function renderizarSubclassesSelecionadasClasse() {
  renderizarListaSelecionada(
    "listaSubclassesDisponiveisSelecionadas",
    subclassesSelecionadas,
    "Nenhuma subclasse selecionada.",
    (id) => removerSelecionado(subclassesSelecionadas, id, renderizarSubclassesSelecionadasClasse)
  );
}

function renderizarSubclassesSelecionadasClasseEdicao() {
  renderizarListaSelecionada(
    "editListaSubclassesDisponiveisSelecionadas",
    editSubclassesSelecionadas,
    "Nenhuma subclasse selecionada.",
    (id) => removerSelecionado(editSubclassesSelecionadas, id, renderizarSubclassesSelecionadasClasseEdicao)
  );
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

function escapeHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function initClasses() {
  onPageLoaded((pagina) => {
    if (pagina === "cadastrosClasses") {
      renderizarClasses();

      document.getElementById("abrirCadastroClasses")?.addEventListener("click", abrirModalCadastroClasse);
      document.getElementById("abrirImportacaoClasses")?.addEventListener("click", abrirModalImportacaoClasses);
    }

    if (pagina === "cadastrosClasseDetalhe") {
      renderizarDetalheClasse(false);
    }
  });
}