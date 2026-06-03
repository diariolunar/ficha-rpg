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

import { state } from "./state.js";
import { onPageLoaded, navegarPara } from "./navigation.js";
import { mostrarModal, confirmarModal } from "./ui.js";

export function criarCadastroCrud(config) {
  let registros = [];
  let registroSelecionado = null;
  let unsubscribePrincipal = null;

  const unsubscribesRelacionados = [];
  const opcoesRelacionadas = {};

  let multiselectsCadastro = {};
  let multiselectsEdicao = {};

  let cadastroModalAberto = false;
  let detalheEmEdicao = false;
  let importacaoModalAberta = false;

  let formularioCadastroSujo = false;
  let formularioEdicaoSujo = false;
  let formularioImportacaoSujo = false;

  let importacaoPendentes = [];

  const abrirCadastroId = config.abrirCadastroId || `abrirCadastro${capitalizar(config.colecao)}`;
  const abrirImportacaoId = config.abrirImportacaoId || `abrirImportacao${capitalizar(config.colecao)}`;
  const formContainerId = config.formContainerId;

  function iniciar() {
    parar();

    aplicarEstilosCrudVisual();

    const ref = collection(db, config.colecao);
    const consulta = query(ref, orderBy(config.campoOrdenacao || "nome", "asc"));

    unsubscribePrincipal = onSnapshot(
      consulta,
      (snapshot) => {
        registros = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        sincronizarSelecionado();
        renderizarLista();

        if (
          registroSelecionado &&
          document.getElementById(config.detalheContainerId) &&
          !detalheEmEdicao
        ) {
          renderizarDetalhe(false);
        }
      },
      (erro) => {
        console.error(`Erro ao carregar ${config.colecao}:`, erro);
      }
    );

    carregarRelacionados();
  }

  function parar() {
    if (unsubscribePrincipal) {
      unsubscribePrincipal();
      unsubscribePrincipal = null;
    }

    unsubscribesRelacionados.forEach((unsubscribe) => unsubscribe());
    unsubscribesRelacionados.length = 0;
  }

  function carregarRelacionados() {
    const colecoes = new Set();

    config.campos.forEach((campo) => {
      if ((campo.tipo === "select" || campo.tipo === "multi") && campo.colecao) {
        colecoes.add(campo.colecao);
      }
    });

    colecoes.forEach((nomeColecao) => {
      const consulta = query(collection(db, nomeColecao), orderBy("nome", "asc"));

      const unsubscribe = onSnapshot(
        consulta,
        (snapshot) => {
          opcoesRelacionadas[nomeColecao] = snapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data()
          }));

          if (
            cadastroModalAberto &&
            document.getElementById(formContainerId) &&
            !formularioCadastroSujo
          ) {
            renderizarFormularioCadastro();
          }

          if (
            registroSelecionado &&
            document.getElementById(config.detalheContainerId) &&
            !detalheEmEdicao
          ) {
            renderizarDetalhe(false);
          }
        },
        (erro) => {
          console.error(`Erro ao carregar opções de ${nomeColecao}:`, erro);
        }
      );

      unsubscribesRelacionados.push(unsubscribe);
    });
  }

  function sincronizarSelecionado() {
    if (!registroSelecionado) return;

    const atualizado = registros.find((item) => item.id === registroSelecionado.id);

    if (atualizado) {
      registroSelecionado = atualizado;
    }
  }

  function init() {
    aplicarEstilosCrudVisual();

    onPageLoaded((pagina) => {
      if (pagina === config.paginaLista) {
        cadastroModalAberto = false;
        detalheEmEdicao = false;
        importacaoModalAberta = false;
        formularioCadastroSujo = false;
        formularioEdicaoSujo = false;
        formularioImportacaoSujo = false;
        multiselectsCadastro = criarEstadoMultiselect();

        vincularBotaoAbrirCadastro();
        vincularBotaoAbrirImportacao();
        renderizarLista();
      }

      if (pagina === config.paginaDetalhe) {
        renderizarDetalhe(false);
      }
    });
  }

  function vincularBotaoAbrirCadastro() {
    const botao = document.getElementById(abrirCadastroId);

    if (!botao) return;

    botao.onclick = abrirModalCadastro;
  }

  function vincularBotaoAbrirImportacao() {
    const botao = document.getElementById(abrirImportacaoId);

    if (!botao) return;

    botao.onclick = abrirModalImportacao;
  }

  function abrirModalCadastro() {
    fecharModalCadastro();

    cadastroModalAberto = true;
    formularioCadastroSujo = false;
    multiselectsCadastro = criarEstadoMultiselect();

    const overlay = document.createElement("div");
    overlay.className = "crud-form-overlay";
    overlay.id = "crudFormOverlay";

    overlay.innerHTML = `
      <div class="crud-form-modal">
        <div class="crud-form-header">
          <div>
            <h3>Cadastrar ${escapeHtml(config.nomeSingular)}</h3>
            <p>Preencha as informações abaixo e salve para adicionar este registro à lista.</p>
          </div>

          <button class="crud-form-close" type="button" id="fecharCadastroModal">×</button>
        </div>

        <div class="crud-form-body" id="${formContainerId}"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("fecharCadastroModal")?.addEventListener("click", tentarFecharModalCadastro);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        tentarFecharModalCadastro();
      }
    });

    renderizarFormularioCadastro();
  }

  async function tentarFecharModalCadastro() {
    if (formularioCadastroSujo) {
      const confirmar = await confirmarSaidaSemSalvar("Sair do cadastro");

      if (!confirmar) return;
    }

    fecharModalCadastro();
  }

  function fecharModalCadastro() {
    const overlay = document.getElementById("crudFormOverlay");

    if (overlay) {
      overlay.remove();
    }

    cadastroModalAberto = false;
    formularioCadastroSujo = false;
    multiselectsCadastro = criarEstadoMultiselect();
  }

  function criarEstadoMultiselect() {
    const estado = {};

    config.campos.forEach((campo) => {
      if (campo.tipo === "multi") {
        estado[campo.nome] = [];
      }
    });

    return estado;
  }

  function renderizarFormularioCadastro() {
    const container = document.getElementById(formContainerId);

    if (!container) return;

    container.innerHTML = montarFormulario({
      prefixo: "",
      titulo: "",
      botaoId: config.botaoSalvarId,
      botaoTexto: `Salvar ${config.nomeSingular.toLowerCase()}`,
      valores: {},
      multiselects: multiselectsCadastro,
      modoEdicao: false
    });

    vincularEventosFormulario({
      prefixo: "",
      botaoSalvarId: config.botaoSalvarId,
      multiselects: multiselectsCadastro,
      onSalvar: salvar
    });

    observarAlteracoesFormulario(container, () => {
      formularioCadastroSujo = true;
    });
  }

  function montarFormulario({ prefixo, titulo, botaoId, botaoTexto, valores, multiselects, modoEdicao }) {
    const camposHtml = montarCamposFormulario(prefixo, valores, multiselects);
    const tituloHtml = titulo ? `<h3>${escapeHtml(titulo)}</h3>` : "";

    const botoes = modoEdicao
      ? `
        <div class="action-row">
          <button class="secondary-btn" type="button" id="${prefixo}Cancelar">Cancelar</button>
          <button class="primary-btn" type="button" id="${botaoId}">${botaoTexto}</button>
        </div>
      `
      : `
        <div class="action-row">
          <button class="secondary-btn" type="button" id="cancelarCadastroModal">Cancelar</button>
          <button class="primary-btn" type="button" id="${botaoId}">${botaoTexto}</button>
        </div>
      `;

    return `
      <div class="crud-form-content">
        ${tituloHtml}
        ${camposHtml}
        ${botoes}
      </div>
    `;
  }

  function montarCamposFormulario(prefixo, valores, multiselects) {
    let html = "";
    let grupoAtual = null;
    let camposGrupo = [];

    const fecharGrupo = () => {
      if (!grupoAtual || camposGrupo.length === 0) return;

      html += montarGrupoVisual(grupoAtual, camposGrupo.join(""));
      grupoAtual = null;
      camposGrupo = [];
    };

    config.campos.forEach((campo) => {
      const grupo = campo.grupo || "";

      if (!grupo) {
        fecharGrupo();
        html += montarCampo(campo, prefixo, valores, multiselects);
        return;
      }

      if (grupoAtual && grupoAtual !== grupo) {
        fecharGrupo();
      }

      grupoAtual = grupo;
      camposGrupo.push(montarCampo(campo, prefixo, valores, multiselects));
    });

    fecharGrupo();

    return html;
  }

  function montarGrupoVisual(nomeGrupo, conteudo) {
    const titulo = obterTituloGrupoVisual(nomeGrupo);
    const classe = obterClasseGrupoVisual(nomeGrupo);

    return `
      <div class="crud-field-group ${classe}">
        ${titulo ? `<h4>${escapeHtml(titulo)}</h4>` : ""}
        <div class="crud-field-grid">
          ${conteudo}
        </div>
      </div>
    `;
  }

  function obterTituloGrupoVisual(nomeGrupo) {
    const titulos = {
      atributos: "Atributos"
    };

    return titulos[nomeGrupo] || "";
  }

  function obterClasseGrupoVisual(nomeGrupo) {
    const classes = {
      atributos: "crud-attribute-group"
    };

    return classes[nomeGrupo] || "";
  }

  function montarCampo(campo, prefixo, valores, multiselects) {
    const id = `${prefixo}${campo.nome}`;
    const valor = valores[campo.nome] ?? "";

    if (campo.tipo === "textarea") {
      return `
        <label>
          ${escapeHtml(campo.label)}
          <textarea id="${id}" placeholder="${escapeHtml(campo.placeholder || "")}">${escapeHtml(valor)}</textarea>
        </label>
      `;
    }

    if (campo.tipo === "number") {
      return `
        <label>
          ${escapeHtml(campo.label)}
          <input type="number" id="${id}" value="${valor || ""}" placeholder="${escapeHtml(campo.placeholder || "")}" />
        </label>
      `;
    }

    if (campo.tipo === "select") {
      return `
        <label>
          ${escapeHtml(campo.label)}
          <select id="${id}">
            ${montarOptions(campo, valor?.id || valor || "")}
          </select>
        </label>
      `;
    }

    if (campo.tipo === "multi") {
      const selectId = `${id}Select`;
      const addId = `${id}Adicionar`;
      const listaId = `${id}Lista`;

      return `
        <div class="multi-select-box">
          <label>
            ${escapeHtml(campo.label)}
            <select id="${selectId}">
              ${montarOptions(campo, "")}
            </select>
          </label>

          <button class="secondary-btn" type="button" id="${addId}">Adicionar</button>

          <div id="${listaId}" class="selected-list">
            ${montarChips(multiselects[campo.nome] || [], "Nenhuma opção selecionada.")}
          </div>
        </div>
      `;
    }

    return `
      <label>
        ${escapeHtml(campo.label)}
        <input type="text" id="${id}" value="${escapeHtml(valor)}" placeholder="${escapeHtml(campo.placeholder || "")}" />
      </label>
    `;
  }

  function aplicarFiltroOpcoesRelacionadas(campo, lista) {
    if (!campo.filtro) return lista;

    const filtros = Array.isArray(campo.filtro) ? campo.filtro : [campo.filtro];

    return lista.filter((item) => {
      return filtros.every((filtro) => {
        const valorItem = item[filtro.campo];

        if (Array.isArray(filtro.valor)) {
          return filtro.valor.includes(valorItem);
        }

        return valorItem === filtro.valor;
      });
    });
  }

  function montarOptions(campo, valorSelecionado) {
    const opcoes = [`<option value="">Selecione</option>`];

    if (campo.permitirTodas) {
      const selected = valorSelecionado === "__ALL__" ? "selected" : "";
      opcoes.push(`<option value="__ALL__" ${selected}>Todas</option>`);
    }

    if (campo.permitirNenhuma) {
      const selected = valorSelecionado === "__NONE__" ? "selected" : "";
      opcoes.push(`<option value="__NONE__" ${selected}>Nenhuma</option>`);
    }

    if (campo.opcoes && campo.opcoes.length > 0) {
      campo.opcoes.forEach((opcao) => {
        const selected = opcao.valor === valorSelecionado ? "selected" : "";
        opcoes.push(`<option value="${escapeHtml(opcao.valor)}" ${selected}>${escapeHtml(opcao.nome)}</option>`);
      });

      return opcoes.join("");
    }

    const listaOriginal = opcoesRelacionadas[campo.colecao] || [];
    const lista = aplicarFiltroOpcoesRelacionadas(campo, listaOriginal);

    if (!lista.length && !campo.permitirTodas && !campo.permitirNenhuma) {
      return `<option value="">${escapeHtml(campo.mensagemVazia || "Nenhuma opção cadastrada")}</option>`;
    }

    lista.forEach((item) => {
      const selected = item.id === valorSelecionado ? "selected" : "";
      opcoes.push(`<option value="${escapeHtml(item.id)}" ${selected}>${escapeHtml(item.nome || "Sem nome")}</option>`);
    });

    return opcoes.join("");
  }

  function montarChips(lista, mensagemVazia) {
    if (!lista || !lista.length) {
      return `<span class="empty-selection">${escapeHtml(mensagemVazia)}</span>`;
    }

    return lista
      .map((item) => {
        return `
          <span class="selected-chip" data-id="${escapeHtml(item.id)}">
            ${escapeHtml(item.nome)}
            <button type="button" title="Remover">×</button>
          </span>
        `;
      })
      .join("");
  }

  function vincularEventosFormulario({ prefixo, botaoSalvarId, multiselects, onSalvar }) {
    config.campos.forEach((campo) => {
      if (campo.tipo !== "multi") return;

      const baseId = `${prefixo}${campo.nome}`;
      const select = document.getElementById(`${baseId}Select`);
      const botao = document.getElementById(`${baseId}Adicionar`);
      const lista = document.getElementById(`${baseId}Lista`);

      if (botao && select) {
        botao.addEventListener("click", async () => {
          await adicionarMulti(campo, select, multiselects);
          marcarFormularioComoSujo(prefixo);
          renderizarListaMulti(campo, prefixo, multiselects);
        });
      }

      if (lista) {
        lista.addEventListener("click", (event) => {
          const botaoRemover = event.target.closest("button");

          if (!botaoRemover) return;

          const chip = event.target.closest(".selected-chip");

          if (!chip) return;

          removerMulti(campo.nome, chip.dataset.id, multiselects);
          marcarFormularioComoSujo(prefixo);
          renderizarListaMulti(campo, prefixo, multiselects);
        });
      }
    });

    const botaoSalvar = document.getElementById(botaoSalvarId);

    if (botaoSalvar) {
      botaoSalvar.addEventListener("click", onSalvar);
    }

    const botaoCancelarModal = document.getElementById("cancelarCadastroModal");

    if (botaoCancelarModal) {
      botaoCancelarModal.addEventListener("click", tentarFecharModalCadastro);
    }

    const botaoCancelar = document.getElementById(`${prefixo}Cancelar`);

    if (botaoCancelar) {
      botaoCancelar.addEventListener("click", tentarCancelarEdicaoDetalhe);
    }
  }

  async function adicionarMulti(campo, select, multiselects) {
    if (!select.value) {
      await mostrarModal("Selecione uma opção primeiro.", "Campo obrigatório");
      return;
    }

    const id = select.value;
    const nome = select.selectedOptions[0].textContent;
    const lista = multiselects[campo.nome] || [];

    if (id === "__ALL__") {
      multiselects[campo.nome] = [{ id: "__ALL__", nome: "Todas" }];
      return;
    }

    if (id === "__NONE__") {
      multiselects[campo.nome] = [{ id: "__NONE__", nome: "Nenhuma" }];
      return;
    }

    const temTodasOuNenhuma = lista.some((item) => item.id === "__ALL__" || item.id === "__NONE__");

    if (temTodasOuNenhuma) {
      await mostrarModal("Remova a opção especial antes de selecionar opções específicas.", "Seleção inválida");
      return;
    }

    const jaExiste = lista.some((item) => item.id === id);

    if (jaExiste) {
      await mostrarModal("Essa opção já foi adicionada.", "Opção repetida");
      return;
    }

    lista.push({ id, nome });
    multiselects[campo.nome] = lista;
  }

  function removerMulti(nomeCampo, id, multiselects) {
    multiselects[nomeCampo] = (multiselects[nomeCampo] || []).filter((item) => item.id !== id);
  }

  function renderizarListaMulti(campo, prefixo, multiselects) {
    const lista = document.getElementById(`${prefixo}${campo.nome}Lista`);

    if (!lista) return;

    lista.innerHTML = montarChips(multiselects[campo.nome] || [], "Nenhuma opção selecionada.");
  }
    function marcarFormularioComoSujo(prefixo) {
    if (prefixo === "edit") {
      formularioEdicaoSujo = true;
      return;
    }

    formularioCadastroSujo = true;
  }

  function observarAlteracoesFormulario(container, callback) {
    if (!container) return;

    const marcar = () => callback();

    container.querySelectorAll("input, textarea, select").forEach((campo) => {
      campo.addEventListener("input", marcar);
      campo.addEventListener("change", marcar);
    });
  }

  async function confirmarSaidaSemSalvar(titulo) {
    return confirmarModal({
      titulo,
      mensagem: "Existem alterações não salvas. Tem certeza que deseja sair e perder o que foi preenchido?",
      confirmarTexto: "Sair sem salvar",
      cancelarTexto: "Continuar editando",
      tipo: "danger"
    });
  }

  async function tentarCancelarEdicaoDetalhe() {
    if (formularioEdicaoSujo) {
      const confirmar = await confirmarSaidaSemSalvar("Cancelar edição");

      if (!confirmar) return;
    }

    formularioEdicaoSujo = false;
    renderizarDetalhe(false);
  }

  function pegarDadosFormulario(prefixo, multiselects) {
    const dados = {};

    config.campos.forEach((campo) => {
      const id = `${prefixo}${campo.nome}`;

      if (campo.tipo === "multi") {
        dados[campo.nome] = multiselects[campo.nome] || [];
        return;
      }

      if (campo.tipo === "select") {
        const select = document.getElementById(id);

        if (!select || !select.value) {
          dados[campo.nome] = null;
          return;
        }

        if (select.value === "__ALL__") {
          dados[campo.nome] = { id: "__ALL__", nome: "Todas" };
          return;
        }

        if (select.value === "__NONE__") {
          dados[campo.nome] = { id: "__NONE__", nome: "Nenhuma" };
          return;
        }

        if (campo.colecao) {
          dados[campo.nome] = {
            id: select.value,
            nome: select.selectedOptions[0].textContent
          };
        } else {
          dados[campo.nome] = select.value;
        }

        return;
      }

      if (campo.tipo === "number") {
        dados[campo.nome] = Number(document.getElementById(id)?.value) || 0;
        return;
      }

      dados[campo.nome] = document.getElementById(id)?.value.trim() || "";
    });

    return dados;
  }

  async function salvar() {
    if (!state.usuarioAtual) {
      await mostrarModal("Você precisa estar logado.", "Acesso necessário");
      return;
    }

    if (state.dadosUsuarioAtual?.tipo !== "mestre") {
      await mostrarModal(`Apenas o Mestre pode cadastrar ${config.nomePlural.toLowerCase()}.`, "Permissão negada");
      return;
    }

    const dados = pegarDadosFormulario("", multiselectsCadastro);

    if (!dados.nome) {
      await mostrarModal(`Digite o nome de ${config.nomeSingular.toLowerCase()}.`, "Campo obrigatório");
      return;
    }

    const duplicado = registros.some((registro) => {
      return normalizarTexto(registro.nome || "") === normalizarTexto(dados.nome || "");
    });

    if (duplicado) {
      await mostrarModal(`${config.nomeSingular} "${dados.nome}" já existe no sistema.`, "Registro duplicado", "danger");
      return;
    }

    try {
      await addDoc(collection(db, config.colecao), {
        ...dados,
        criadoPor: state.usuarioAtual.uid,
        criadoEm: serverTimestamp()
      });

      multiselectsCadastro = criarEstadoMultiselect();
      formularioCadastroSujo = false;

      await mostrarModal(`${config.nomeSingular} salvo com sucesso.`, "Cadastro realizado", "success");

      fecharModalCadastro();
      renderizarLista();
    } catch (erro) {
      console.error(`Erro ao salvar ${config.nomeSingular}:`, erro);
      await mostrarModal(`Erro ao salvar ${config.nomeSingular}.`, "Erro", "danger");
    }
  }

  async function salvarEdicao() {
    if (!registroSelecionado) {
      await mostrarModal("Nenhum registro selecionado.", "Erro", "danger");
      return;
    }

    const dados = pegarDadosFormulario("edit", multiselectsEdicao);

    if (!dados.nome) {
      await mostrarModal(`Digite o nome de ${config.nomeSingular.toLowerCase()}.`, "Campo obrigatório");
      return;
    }

    const duplicado = registros.some((registro) => {
      const mesmoNome = normalizarTexto(registro.nome || "") === normalizarTexto(dados.nome || "");
      const outroRegistro = registro.id !== registroSelecionado.id;

      return mesmoNome && outroRegistro;
    });

    if (duplicado) {
      await mostrarModal(`Já existe outro registro chamado "${dados.nome}".`, "Registro duplicado", "danger");
      return;
    }

    try {
      await updateDoc(doc(db, config.colecao, registroSelecionado.id), {
        ...dados,
        atualizadoEm: serverTimestamp()
      });

      registroSelecionado = {
        ...registroSelecionado,
        ...dados
      };

      formularioEdicaoSujo = false;

      await mostrarModal(`${config.nomeSingular} atualizado com sucesso.`, "Alterações salvas", "success");

      renderizarDetalhe(false);
    } catch (erro) {
      console.error(`Erro ao editar ${config.nomeSingular}:`, erro);
      await mostrarModal(`Erro ao editar ${config.nomeSingular}.`, "Erro", "danger");
    }
  }

  async function excluir() {
    if (!registroSelecionado) {
      await mostrarModal("Nenhum registro selecionado.", "Erro", "danger");
      return;
    }

    const confirmar = await confirmarModal({
      titulo: `Excluir ${config.nomeSingular}`,
      mensagem: `Tem certeza que deseja excluir “${registroSelecionado.nome}”? Essa ação não pode ser desfeita.`,
      confirmarTexto: "Excluir",
      cancelarTexto: "Cancelar",
      tipo: "danger"
    });

    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, config.colecao, registroSelecionado.id));

      registroSelecionado = null;

      await mostrarModal(`${config.nomeSingular} excluído com sucesso.`, "Exclusão concluída", "success");

      navegarPara(config.paginaLista);
    } catch (erro) {
      console.error(`Erro ao excluir ${config.nomeSingular}:`, erro);
      await mostrarModal(`Erro ao excluir ${config.nomeSingular}.`, "Erro", "danger");
    }
  }

  function abrirModalImportacao() {
    fecharModalImportacao();

    importacaoPendentes = [];

    const overlay = document.createElement("div");
    overlay.className = "crud-form-overlay";
    overlay.id = `modalImportacao${capitalizar(config.colecao)}`;

    overlay.innerHTML = `
      <div class="crud-form-modal">
        <div class="crud-form-header">
          <div>
            <h3>Importar ${escapeHtml(config.nomePlural)} em Massa</h3>
            <p>Cole vários registros seguindo o modelo. Separe um cadastro do outro usando uma linha com três traços: ---</p>
          </div>

          <button class="crud-form-close" type="button" id="fecharImportacaoCrud">×</button>
        </div>

        <div class="crud-form-body">
          <div class="crud-form-content">
            <label>
              Texto para importação
              <textarea id="textoImportacaoCrud" rows="18" placeholder="Cole aqui os registros seguindo o modelo..."></textarea>
            </label>

            <div class="detail-section">
              <h4>Modelo esperado</h4>
              <p>${montarModeloImportacaoHtml()}</p>
            </div>

            <div class="action-row">
              <button class="secondary-btn" type="button" id="cancelarImportacaoCrud">Cancelar</button>
              <button class="primary-btn" type="button" id="analisarImportacaoCrud">Analisar texto</button>
            </div>

            <div id="previewImportacaoCrud" class="list-card" style="display:none;">
              <h3>Prévia da importação</h3>

              <div id="listaPreviewImportacaoCrud" class="resource-list"></div>

              <div class="action-row">
                <button class="secondary-btn" type="button" id="limparPreviewImportacaoCrud">Revisar texto</button>
                <button class="primary-btn" type="button" id="confirmarImportacaoCrud">Cadastrar todos</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    importacaoModalAberta = true;
    formularioImportacaoSujo = false;

    document.getElementById("fecharImportacaoCrud")?.addEventListener("click", tentarFecharModalImportacao);
    document.getElementById("cancelarImportacaoCrud")?.addEventListener("click", tentarFecharModalImportacao);
    document.getElementById("analisarImportacaoCrud")?.addEventListener("click", analisarImportacao);
    document.getElementById("limparPreviewImportacaoCrud")?.addEventListener("click", limparPreviewImportacao);
    document.getElementById("confirmarImportacaoCrud")?.addEventListener("click", confirmarImportacao);

    const textoImportacao = document.getElementById("textoImportacaoCrud");

    if (textoImportacao) {
      textoImportacao.addEventListener("input", () => {
        formularioImportacaoSujo = true;
      });
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        tentarFecharModalImportacao();
      }
    });
  }

  async function tentarFecharModalImportacao() {
    if (formularioImportacaoSujo || importacaoPendentes.length > 0) {
      const confirmar = await confirmarSaidaSemSalvar("Sair da importação");

      if (!confirmar) return;
    }

    fecharModalImportacao();
  }

  function fecharModalImportacao() {
    const overlay = document.getElementById(`modalImportacao${capitalizar(config.colecao)}`);

    if (overlay) {
      overlay.remove();
    }

    importacaoModalAberta = false;
    formularioImportacaoSujo = false;
    importacaoPendentes = [];
  }

  async function analisarImportacao() {
    const texto = document.getElementById("textoImportacaoCrud")?.value.trim() || "";

    if (!texto) {
      await mostrarModal("Cole o texto antes de analisar.", "Campo obrigatório");
      return;
    }

    const resultado = interpretarTextoImportacao(texto);

    if (resultado.erros.length > 0 && resultado.registros.length === 0) {
      await mostrarModal(resultado.erros.join("\n"), "Não foi possível importar", "danger");
      return;
    }

    importacaoPendentes = resultado.registros;
    formularioImportacaoSujo = true;

    renderizarPreviewImportacao(resultado.erros);
  }

  function interpretarTextoImportacao(texto) {
    const blocos = texto
      .split(/\n\s*---\s*\n/g)
      .map((bloco) => bloco.trim())
      .filter(Boolean);

    const registrosEncontrados = [];
    const erros = [];
    const nomesNoTexto = new Set();

    blocos.forEach((bloco, index) => {
      const camposTexto = extrairCamposDoBloco(bloco);
      const numero = index + 1;

      const nome = buscarCampoImportacao(camposTexto, [
        "nome",
        config.campos.find((campo) => campo.nome === "nome")?.label || "nome"
      ]);

      if (!nome) {
        erros.push(`Bloco ${numero}: nome não encontrado.`);
        return;
      }

      const nomeNormalizado = normalizarTexto(nome);

      if (nomesNoTexto.has(nomeNormalizado)) {
        erros.push(`Bloco ${numero}: "${nome}" está repetido no texto e foi ignorado.`);
        return;
      }

      nomesNoTexto.add(nomeNormalizado);

      const jaExiste = registros.some((registro) => {
        return normalizarTexto(registro.nome || "") === nomeNormalizado;
      });

      if (jaExiste) {
        erros.push(`Bloco ${numero}: "${nome}" já existe no sistema e foi ignorado.`);
        return;
      }

      const registro = {};

      config.campos.forEach((campo) => {
        const valor = buscarCampoImportacao(camposTexto, [campo.label, campo.nome]);

        if (campo.nome === "nome") {
          registro[campo.nome] = nome;
          return;
        }

        if (campo.tipo === "number") {
          registro[campo.nome] = numeroTexto(valor);
          return;
        }

        if (campo.tipo === "select") {
          registro[campo.nome] = interpretarValorSelect(campo, valor, erros, numero);
          return;
        }

        if (campo.tipo === "multi") {
          registro[campo.nome] = interpretarValorMulti(campo, valor, erros, numero);
          return;
        }

        registro[campo.nome] = valor || "";
      });

      registrosEncontrados.push(registro);
    });

    return {
      registros: registrosEncontrados,
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

  function buscarCampoImportacao(campos, nomesPossiveis) {
    for (const nome of nomesPossiveis) {
      const chave = normalizarTexto(nome);

      if (campos[chave] !== undefined) {
        return campos[chave];
      }
    }

    return "";
  }

  function interpretarValorSelect(campo, valor, erros, numeroBloco) {
    if (!valor) return null;

    const valorNormalizado = normalizarTexto(valor);

    if (campo.permitirTodas && valorNormalizado === "todas") {
      return { id: "__ALL__", nome: "Todas" };
    }

    if (campo.permitirNenhuma && valorNormalizado === "nenhuma") {
      return { id: "__NONE__", nome: "Nenhuma" };
    }

    if (campo.opcoes && campo.opcoes.length > 0) {
      const encontrado = campo.opcoes.find((opcao) => {
        return normalizarTexto(opcao.nome) === valorNormalizado || normalizarTexto(opcao.valor) === valorNormalizado;
      });

      if (encontrado) {
        return encontrado.valor;
      }

      erros.push(`Bloco ${numeroBloco}: opção "${valor}" não encontrada no campo "${campo.label}".`);
      return "";
    }

    if (campo.colecao) {
      const listaOriginal = opcoesRelacionadas[campo.colecao] || [];
      const lista = aplicarFiltroOpcoesRelacionadas(campo, listaOriginal);
      const encontrado = encontrarPorNome(lista, valor);

      if (encontrado) {
        return {
          id: encontrado.id,
          nome: encontrado.nome
        };
      }

      erros.push(`Bloco ${numeroBloco}: "${valor}" não encontrado no campo "${campo.label}".`);
      return null;
    }

    return valor;
  }

  function interpretarValorMulti(campo, valor, erros, numeroBloco) {
    if (!valor) return [];

    const valorNormalizado = normalizarTexto(valor);

    if (campo.permitirTodas && valorNormalizado === "todas") {
      return [{ id: "__ALL__", nome: "Todas" }];
    }

    if (campo.permitirNenhuma && valorNormalizado === "nenhuma") {
      return [{ id: "__NONE__", nome: "Nenhuma" }];
    }

    return valor
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((nome) => {
        if (campo.opcoes && campo.opcoes.length > 0) {
          const encontrado = campo.opcoes.find((opcao) => {
            return normalizarTexto(opcao.nome) === normalizarTexto(nome) || normalizarTexto(opcao.valor) === normalizarTexto(nome);
          });

          if (encontrado) {
            return {
              id: encontrado.valor,
              nome: encontrado.nome
            };
          }

          erros.push(`Bloco ${numeroBloco}: opção "${nome}" não encontrada no campo "${campo.label}".`);
          return null;
        }

        if (campo.colecao) {
          const listaOriginal = opcoesRelacionadas[campo.colecao] || [];
          const lista = aplicarFiltroOpcoesRelacionadas(campo, listaOriginal);
          const encontrado = encontrarPorNome(lista, nome);

          if (encontrado) {
            return {
              id: encontrado.id,
              nome: encontrado.nome
            };
          }

          erros.push(`Bloco ${numeroBloco}: "${nome}" não encontrado no campo "${campo.label}".`);
          return {
            id: "",
            nome
          };
        }

        return {
          id: "",
          nome
        };
      })
      .filter(Boolean);
  }

  function renderizarPreviewImportacao(erros = []) {
    const preview = document.getElementById("previewImportacaoCrud");
    const lista = document.getElementById("listaPreviewImportacaoCrud");

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

    if (importacaoPendentes.length === 0) {
      lista.innerHTML += "<p>Nenhum registro válido encontrado.</p>";
      return;
    }

    importacaoPendentes.forEach((registro) => {
      const card = document.createElement("div");
      card.classList.add("resource-card");

      card.innerHTML = `
        <div class="resource-card-header">
          <h4>${escapeHtml(registro.nome || "Sem nome")}</h4>
          <span>${escapeHtml(config.nomeSingular)}</span>
        </div>

        <div class="resource-card-stats">
          ${montarResumoCard(registro)}
        </div>

        ${montarDescricaoCard(registro)}
      `;

      lista.appendChild(card);
    });
  }

  function limparPreviewImportacao() {
    const preview = document.getElementById("previewImportacaoCrud");

    if (preview) {
      preview.style.display = "none";
    }

    importacaoPendentes = [];
  }

  async function confirmarImportacao() {
    if (!state.usuarioAtual) {
      await mostrarModal("Você precisa estar logado.", "Acesso necessário");
      return;
    }

    if (state.dadosUsuarioAtual?.tipo !== "mestre") {
      await mostrarModal(`Apenas o Mestre pode importar ${config.nomePlural.toLowerCase()}.`, "Permissão negada");
      return;
    }

    if (importacaoPendentes.length === 0) {
      await mostrarModal("Nenhum registro foi analisado para cadastro.", "Importação vazia");
      return;
    }

    const registrosSemDuplicidade = importacaoPendentes.filter((pendente) => {
      return !registros.some((existente) => {
        return normalizarTexto(existente.nome || "") === normalizarTexto(pendente.nome || "");
      });
    });

    const ignorados = importacaoPendentes.length - registrosSemDuplicidade.length;

    if (registrosSemDuplicidade.length === 0) {
      await mostrarModal(
        "Todos os registros analisados já existem no sistema. Nenhum cadastro foi realizado.",
        "Importação cancelada",
        "danger"
      );
      return;
    }

    const mensagemConfirmacao = ignorados > 0
      ? `Foram encontrados ${ignorados} registro(s) que já existem no sistema e serão ignorados. Deseja cadastrar os ${registrosSemDuplicidade.length} restante(s)?`
      : `Deseja cadastrar ${registrosSemDuplicidade.length} registro(s) agora?`;

    const confirmar = await confirmarModal({
      titulo: "Confirmar importação",
      mensagem: mensagemConfirmacao,
      confirmarTexto: "Cadastrar",
      cancelarTexto: "Cancelar",
      tipo: "success"
    });

    if (!confirmar) return;

    try {
      const cadastros = registrosSemDuplicidade.map((registro) => {
        return addDoc(collection(db, config.colecao), {
          ...registro,
          criadoPor: state.usuarioAtual.uid,
          criadoEm: serverTimestamp()
        });
      });

      await Promise.all(cadastros);

      await mostrarModal(
        `${registrosSemDuplicidade.length} registro(s) cadastrado(s) com sucesso.`,
        "Importação concluída",
        "success"
      );

      formularioImportacaoSujo = false;

      fecharModalImportacao();
      renderizarLista();
    } catch (erro) {
      console.error(`Erro ao importar ${config.nomePlural}:`, erro);
      await mostrarModal(`Erro ao importar ${config.nomePlural}.`, "Erro", "danger");
    }
  }

  function montarModeloImportacaoHtml() {
    const linhas = config.campos.map((campo) => {
      return `${campo.label}: ${exemploCampo(campo)}`;
    });

    linhas.push("---");

    const campoNome = config.campos.find((campo) => campo.nome === "nome");

    if (campoNome) {
      linhas.push(`${campoNome.label}: Outro exemplo`);
    }

    return linhas.map((linha) => escapeHtml(linha)).join("<br>");
  }

  function exemploCampo(campo) {
    if (campo.nome === "nome") return `Exemplo de ${config.nomeSingular}`;

    if (campo.tipo === "number") return "10";

    if (campo.tipo === "textarea") return "Descrição do campo.";

    if (campo.tipo === "select") {
      if (campo.opcoes && campo.opcoes.length > 0) return campo.opcoes[0].nome;
      if (campo.permitirTodas) return "Todas";
      if (campo.permitirNenhuma) return "Nenhuma";
      return "Nome de um cadastro existente";
    }

    if (campo.tipo === "multi") {
      if (campo.permitirTodas) return "Todas";
      if (campo.permitirNenhuma) return "Nenhuma";
      return "Nome 1, Nome 2";
    }

    return "Texto";
  }

  function renderizarLista() {
    const lista = document.getElementById(config.listaId);

    if (!lista) return;

    lista.innerHTML = "";

    if (!registros.length) {
      lista.innerHTML = `<p>Nenhum registro cadastrado ainda.</p>`;
      return;
    }

    registros.forEach((registro) => {
      const card = document.createElement("div");
      card.classList.add("resource-card");

      card.innerHTML = `
        <div class="resource-card-header">
          <h4>${escapeHtml(registro.nome || "Sem nome")}</h4>
          <span>${escapeHtml(config.nomeSingular)}</span>
        </div>

        <div class="resource-card-stats">
          ${montarResumoCard(registro)}
        </div>

        ${montarDescricaoCard(registro)}

        <div class="action-row">
          <button class="secondary-btn visualizar-item">Visualizar</button>
          <button class="primary-btn editar-item">Editar</button>
          <button class="small-btn danger excluir-item">Excluir</button>
        </div>
      `;

      card.querySelector(".visualizar-item").addEventListener("click", () => {
        registroSelecionado = registro;
        navegarPara(config.paginaDetalhe);
      });

      card.querySelector(".editar-item").addEventListener("click", () => {
        registroSelecionado = registro;
        navegarPara(config.paginaDetalhe);

        setTimeout(() => {
          renderizarDetalhe(true);
        }, 300);
      });

      card.querySelector(".excluir-item").addEventListener("click", async () => {
        registroSelecionado = registro;
        await excluir();
      });

      lista.appendChild(card);
    });
  }

  function montarResumoCard(registro) {
    const camposResumo = config.camposResumo || [];

    if (!camposResumo.length) {
      return `<span>Tipo: <b>${escapeHtml(config.nomeSingular)}</b></span>`;
    }

    return camposResumo
      .map((campoNome) => {
        const campo = config.campos.find((item) => item.nome === campoNome);
        const valor = formatarValor(registro[campoNome]);

        return `<span>${escapeHtml(campo?.label || campoNome)}: <b>${valor}</b></span>`;
      })
      .join("");
  }

  function montarDescricaoCard(registro) {
    const campos = config.camposCard || [];

    return campos
      .map((campoNome) => {
        const campo = config.campos.find((item) => item.nome === campoNome);

        return `<p><b>${escapeHtml(campo?.label || campoNome)}:</b> ${formatarValor(registro[campoNome])}</p>`;
      })
      .join("");
  }

  function renderizarDetalhe(modoEdicao = false) {
    const container = document.getElementById(config.detalheContainerId);

    if (!container) return;

    detalheEmEdicao = Boolean(modoEdicao);

    if (!modoEdicao) {
      formularioEdicaoSujo = false;
    }

    if (!registroSelecionado) {
      container.innerHTML = `
        <div class="form-card">
          <h3>Nenhum registro selecionado</h3>
          <p>Volte para a lista e selecione uma opção.</p>
          <button class="secondary-btn" id="voltarLista">Voltar</button>
        </div>
      `;

      document.getElementById("voltarLista")?.addEventListener("click", () => {
        navegarPara(config.paginaLista);
      });

      return;
    }

    if (modoEdicao) {
      renderizarFormularioEdicao(container);
      return;
    }

    container.innerHTML = `
      <div class="detail-card">
        <h3>${escapeHtml(registroSelecionado.nome || "Sem nome")}</h3>
        <p class="detail-subtitle">${escapeHtml(config.nomeSingular)} cadastrado pelo Mestre</p>

        <div class="detail-grid">
          ${montarItensDetalhe(registroSelecionado)}
        </div>

        ${montarSecoesDetalhe(registroSelecionado)}

        <div class="action-row">
          <button class="secondary-btn" id="voltarLista">Voltar</button>
          <button class="primary-btn" id="abrirEdicao">Editar</button>
          <button class="small-btn danger" id="excluirItem">Excluir</button>
        </div>
      </div>
    `;

    document.getElementById("voltarLista")?.addEventListener("click", () => {
      navegarPara(config.paginaLista);
    });

    document.getElementById("abrirEdicao")?.addEventListener("click", () => {
      renderizarDetalhe(true);
    });

    document.getElementById("excluirItem")?.addEventListener("click", excluir);
  }

  function montarItensDetalhe(registro) {
    const camposPrincipais = config.camposPrincipais || [];

    return camposPrincipais
      .map((campoNome) => {
        const campo = config.campos.find((item) => item.nome === campoNome);

        return `
          <div class="detail-item">
            <span>${escapeHtml(campo?.label || campoNome)}</span>
            <strong>${formatarValor(registro[campoNome])}</strong>
          </div>
        `;
      })
      .join("");
  }

  function montarSecoesDetalhe(registro) {
    const camposSecao = config.campos
      .filter((campo) => !(config.camposPrincipais || []).includes(campo.nome))
      .filter((campo) => campo.nome !== "nome");

    return camposSecao
      .map((campo) => {
        return `
          <div class="detail-section">
            <h4>${escapeHtml(campo.label)}</h4>
            <p>${formatarValor(registro[campo.nome])}</p>
          </div>
        `;
      })
      .join("");
  }

  function renderizarFormularioEdicao(container) {
    multiselectsEdicao = criarEstadoMultiselect();

    config.campos.forEach((campo) => {
      if (campo.tipo === "multi") {
        multiselectsEdicao[campo.nome] = Array.isArray(registroSelecionado[campo.nome])
          ? [...registroSelecionado[campo.nome]]
          : [];
      }
    });

    container.innerHTML = montarFormulario({
      prefixo: "edit",
      titulo: `Editar ${config.nomeSingular}`,
      botaoId: "salvarEdicaoCrud",
      botaoTexto: "Salvar alterações",
      valores: registroSelecionado,
      multiselects: multiselectsEdicao,
      modoEdicao: true
    });

    vincularEventosFormulario({
      prefixo: "edit",
      botaoSalvarId: "salvarEdicaoCrud",
      multiselects: multiselectsEdicao,
      onSalvar: salvarEdicao
    });

    observarAlteracoesFormulario(container, () => {
      formularioEdicaoSujo = true;
    });
  }

  function formatarValor(valor) {
    if (valor === null || valor === undefined || valor === "") {
      return "Não informado";
    }

    if (typeof valor === "number") {
      return String(valor);
    }

    if (Array.isArray(valor)) {
      if (!valor.length) return "Não informado";
      return escapeHtml(valor.map((item) => item.nome || item).join(", "));
    }

    if (typeof valor === "object") {
      return escapeHtml(valor.nome || "Não informado");
    }

    const campoComOpcao = config.campos.find((campo) => {
      return campo.opcoes?.some((opcao) => opcao.valor === valor);
    });

    if (campoComOpcao) {
      const opcao = campoComOpcao.opcoes.find((item) => item.valor === valor);
      return escapeHtml(opcao?.nome || valor);
    }

    return escapeHtml(valor);
  }

  function encontrarPorNome(lista, nome) {
    const nomeNormalizado = normalizarTexto(nome);

    return lista.find((item) => normalizarTexto(item.nome || "") === nomeNormalizado) || null;
  }

  function numeroTexto(valor) {
    if (!valor) return 0;

    const numero = Number(String(valor).replace(",", ".").replace(/[^\d.-]/g, ""));

    return Number.isFinite(numero) ? numero : 0;
  }

  function normalizarTexto(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function escapeHtml(texto) {
    return String(texto ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function capitalizar(texto) {
    return String(texto || "").charAt(0).toUpperCase() + String(texto || "").slice(1);
  }

  function aplicarEstilosCrudVisual() {
    if (document.getElementById("crudVisualStyles")) return;

    const style = document.createElement("style");
    style.id = "crudVisualStyles";

    style.textContent = `
      .crud-field-group {
        margin: 18px 0;
        padding: 0;
      }

      .crud-field-group h4 {
        margin: 0 0 12px;
        font-size: 15px;
        font-weight: 900;
        color: rgba(255,255,255,0.86);
      }

      .crud-field-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px 22px;
      }

      .crud-field-grid label,
      .crud-field-grid .multi-select-box {
        margin: 0;
      }

      .crud-attribute-group {
        margin-top: 10px;
        margin-bottom: 22px;
      }

      @media (max-width: 900px) {
        .crud-field-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .crud-field-grid {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  return {
    iniciar,
    parar,
    init
  };
}