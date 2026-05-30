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
  let importacaoPendentes = [];
  let buscaAtual = "";

  const abrirCadastroId = config.abrirCadastroId || `abrirCadastro${capitalizar(config.colecao)}`;
  const abrirImportacaoId = config.abrirImportacaoId || `abrirImportacao${capitalizar(config.colecao)}`;
  const formContainerId = config.formContainerId;

  function iniciar() {
    parar();

    const ref = collection(db, config.colecao);
    const consulta = query(ref, orderBy(config.campoOrdenacao || "nome", "asc"));

    unsubscribePrincipal = onSnapshot(
      consulta,
      (snapshot) => {
        registros = [];

        snapshot.forEach((documento) => {
          registros.push({
            id: documento.id,
            ...documento.data()
          });
        });

        sincronizarSelecionado();
        renderizarLista();
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

      const unsubscribe = onSnapshot(consulta, (snapshot) => {
        opcoesRelacionadas[nomeColecao] = [];

        snapshot.forEach((documento) => {
          opcoesRelacionadas[nomeColecao].push({
            id: documento.id,
            ...documento.data()
          });
        });

        if (cadastroModalAberto && document.getElementById(formContainerId)) {
          renderizarFormularioCadastro();
        }

        if (registroSelecionado && document.getElementById(config.detalheContainerId)) {
          renderizarDetalhe(false);
        }
      });

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
    onPageLoaded((pagina) => {
      if (pagina === config.paginaLista) {
        cadastroModalAberto = false;
        multiselectsCadastro = criarEstadoMultiselect();
        aplicarEstilosBuscaCadastro();
        vincularBotaoAbrirCadastro();
        vincularBotaoAbrirImportacao();
        vincularBuscaLista();
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

    botao.addEventListener("click", abrirModalCadastro);
  }

  function vincularBotaoAbrirImportacao() {
    const botao = document.getElementById(abrirImportacaoId);

    if (!botao) return;

    botao.addEventListener("click", abrirModalImportacao);
  }

  function abrirModalCadastro() {
    fecharModalCadastro();

    cadastroModalAberto = true;
    multiselectsCadastro = criarEstadoMultiselect();

    const overlay = document.createElement("div");
    overlay.className = "crud-form-overlay";
    overlay.id = "crudFormOverlay";

    overlay.innerHTML = `
      <div class="crud-form-modal">
        <div class="crud-form-header">
          <div>
            <h3>Cadastrar ${config.nomeSingular}</h3>
            <p>Preencha as informações abaixo e salve para adicionar este registro à lista.</p>
          </div>

          <button class="crud-form-close" type="button" id="fecharCadastroModal">×</button>
        </div>

        <div class="crud-form-body" id="${formContainerId}"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("fecharCadastroModal")?.addEventListener("click", fecharModalCadastro);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        fecharModalCadastro();
      }
    });

    renderizarFormularioCadastro();
  }

  function fecharModalCadastro() {
    const overlay = document.getElementById("crudFormOverlay");

    if (overlay) {
      overlay.remove();
    }

    cadastroModalAberto = false;
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
  }

  function montarFormulario({ prefixo, titulo, botaoId, botaoTexto, valores, multiselects, modoEdicao }) {
    const camposHtml = config.campos.map((campo) => montarCampo(campo, prefixo, valores, multiselects)).join("");
    const tituloHtml = titulo ? `<h3>${titulo}</h3>` : "";

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

  function montarCampo(campo, prefixo, valores, multiselects) {
    const id = `${prefixo}${campo.nome}`;
    const valor = valores[campo.nome] ?? "";

    if (campo.tipo === "textarea") {
      return `
        <label>
          ${campo.label}
          <textarea id="${id}" placeholder="${campo.placeholder || ""}">${escapeHtml(valor)}</textarea>
        </label>
      `;
    }

    if (campo.tipo === "number") {
      return `
        <label>
          ${campo.label}
          <input type="number" id="${id}" value="${valor || ""}" placeholder="${campo.placeholder || ""}" />
        </label>
      `;
    }

    if (campo.tipo === "select") {
      return `
        <label>
          ${campo.label}
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
            ${campo.label}
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
        ${campo.label}
        <input type="text" id="${id}" value="${escapeHtml(valor)}" placeholder="${campo.placeholder || ""}" />
      </label>
    `;
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
        opcoes.push(`<option value="${opcao.valor}" ${selected}>${opcao.nome}</option>`);
      });

      return opcoes.join("");
    }

    const lista = opcoesRelacionadas[campo.colecao] || [];

    if (!lista.length && !campo.permitirTodas && !campo.permitirNenhuma) {
      return `<option value="">${campo.mensagemVazia || "Nenhuma opção cadastrada"}</option>`;
    }

    lista.forEach((item) => {
      const selected = item.id === valorSelecionado ? "selected" : "";
      opcoes.push(`<option value="${item.id}" ${selected}>${escapeHtml(item.nome || "Sem nome")}</option>`);
    });

    return opcoes.join("");
  }

  function montarChips(lista, mensagemVazia) {
    if (!lista || !lista.length) {
      return `<span class="empty-selection">${mensagemVazia}</span>`;
    }

    return lista
      .map((item) => {
        return `
          <span class="selected-chip" data-id="${item.id}">
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
      botaoCancelarModal.addEventListener("click", fecharModalCadastro);
    }

    const botaoCancelar = document.getElementById(`${prefixo}Cancelar`);

    if (botaoCancelar) {
      botaoCancelar.addEventListener("click", () => {
        renderizarDetalhe(false);
      });
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

      const campoElemento = document.getElementById(id);

      if (!campoElemento) {
        dados[campo.nome] = "";
        return;
      }

      if (campo.tipo === "number") {
        dados[campo.nome] = Number(campoElemento.value) || 0;
        return;
      }

      dados[campo.nome] = campoElemento.value.trim();
    });

    return dados;
  }

  async function salvar() {
    const dados = pegarDadosFormulario("", multiselectsCadastro);

    if (!dados.nome) {
      await mostrarModal(`Digite o nome de ${config.nomeSingular.toLowerCase()}.`, "Campo obrigatório");
      return;
    }

    try {
      await addDoc(collection(db, config.colecao), {
        ...dados,
        criadoPor: state.usuarioAtual?.uid || "",
        criadoEm: serverTimestamp()
      });

      await mostrarModal(`${config.nomeSingular} cadastrado com sucesso.`, "Cadastro realizado", "success");

      fecharModalCadastro();
    } catch (erro) {
      console.error(`Erro ao cadastrar ${config.nomeSingular}:`, erro);
      await mostrarModal(`Erro ao cadastrar ${config.nomeSingular.toLowerCase()}.`, "Erro", "danger");
    }
  }

  function renderizarLista() {
    aplicarEstilosBuscaCadastro();

    const lista = document.getElementById(config.listaId);

    if (!lista) return;

    const registrosFiltrados = filtrarRegistros(registros, buscaAtual);

    lista.innerHTML = "";

    if (!registros.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <h3>Nenhum ${config.nomeSingular.toLowerCase()} cadastrado ainda.</h3>
          <p>Clique em cadastrar para adicionar o primeiro registro.</p>
        </div>
      `;
      return;
    }

    if (!registrosFiltrados.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <h3>Nenhum resultado encontrado.</h3>
          <p>Tente buscar por outro nome, tipo, categoria ou informação cadastrada.</p>
        </div>
      `;
      return;
    }

    registrosFiltrados.forEach((registro) => {
      const card = document.createElement("div");
      card.className = "resource-card";
      card.dataset.searchText = normalizarTextoBusca(montarTextoBuscaRegistro(registro));

      const nome = registro.nome || `${config.nomeSingular} sem nome`;
      const camposResumo = config.camposResumo || config.camposPrincipais || [];

      card.innerHTML = `
        <div class="resource-card-header">
          <div>
            <h4>${escapeHtml(nome)}</h4>
            <p>${montarResumoRegistro(registro, camposResumo)}</p>
          </div>

          <span>${escapeHtml(config.nomeSingular)}</span>
        </div>

        ${montarCamposCard(registro)}

        <div class="action-row">
          <button class="secondary-btn ver-detalhe">Visualizar</button>
          <button class="secondary-btn editar-registro">Editar</button>
          <button class="small-btn danger excluir-registro">Excluir</button>
        </div>
      `;

      card.querySelector(".ver-detalhe")?.addEventListener("click", () => {
        registroSelecionado = registro;
        navegarPara(config.paginaDetalhe);
      });

      card.querySelector(".editar-registro")?.addEventListener("click", () => {
        registroSelecionado = registro;
        navegarPara(config.paginaDetalhe);
        setTimeout(() => renderizarDetalhe(true), 100);
      });

      card.querySelector(".excluir-registro")?.addEventListener("click", async () => {
        await excluir(registro);
      });

      lista.appendChild(card);
    });
  }

  function montarResumoRegistro(registro, camposResumo) {
    if (!camposResumo.length) {
      return "Sem resumo cadastrado.";
    }

    const partes = camposResumo
      .map((nomeCampo) => {
        const campo = obterCampo(nomeCampo);
        const valor = registro[nomeCampo];

        if (valor === null || valor === undefined || valor === "") return "";

        return `${campo?.label || nomeCampo}: ${formatarValor(valor)}`;
      })
      .filter(Boolean);

    return partes.length ? partes.join(" • ") : "Sem resumo cadastrado.";
  }

  function montarCamposCard(registro) {
    const camposCard = config.camposCard || [];

    if (!camposCard.length) return "";

    const linhas = camposCard
      .map((nomeCampo) => {
        const campo = obterCampo(nomeCampo);
        const valor = registro[nomeCampo];

        if (valor === null || valor === undefined || valor === "") return "";

        return `
          <div class="resource-card-line">
            <strong>${escapeHtml(campo?.label || nomeCampo)}</strong>
            <span>${escapeHtml(formatarValor(valor))}</span>
          </div>
        `;
      })
      .filter(Boolean)
      .join("");

    if (!linhas) return "";

    return `
      <div class="resource-card-info">
        ${linhas}
      </div>
    `;
  }

  function renderizarDetalhe(modoEdicao = false) {
    const container = document.getElementById(config.detalheContainerId);

    if (!container) return;

    if (!registroSelecionado) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Nenhum ${config.nomeSingular.toLowerCase()} selecionado.</h3>
          <p>Volte para a lista e escolha um registro para visualizar.</p>
        </div>
      `;
      return;
    }

    if (modoEdicao) {
      multiselectsEdicao = criarEstadoMultiselect();

      config.campos.forEach((campo) => {
        if (campo.tipo === "multi") {
          multiselectsEdicao[campo.nome] = Array.isArray(registroSelecionado[campo.nome])
            ? [...registroSelecionado[campo.nome]]
            : [];
        }
      });

      container.innerHTML = `
        <div class="detail-card">
          ${montarFormulario({
            prefixo: "edit",
            titulo: `Editar ${config.nomeSingular}`,
            botaoId: "salvarEdicaoRegistro",
            botaoTexto: "Salvar alterações",
            valores: registroSelecionado,
            multiselects: multiselectsEdicao,
            modoEdicao: true
          })}
        </div>
      `;

      vincularEventosFormulario({
        prefixo: "edit",
        botaoSalvarId: "salvarEdicaoRegistro",
        multiselects: multiselectsEdicao,
        onSalvar: salvarEdicao
      });

      return;
    }

    container.innerHTML = `
      <div class="detail-card">
        <div class="detail-header">
          <div>
            <span>${escapeHtml(config.nomeSingular)}</span>
            <h3>${escapeHtml(registroSelecionado.nome || `${config.nomeSingular} sem nome`)}</h3>
          </div>

          <div class="action-row">
            <button class="secondary-btn" id="voltarListaRegistro">Voltar</button>
            <button class="secondary-btn" id="editarRegistro">Editar</button>
            <button class="small-btn danger" id="excluirRegistro">Excluir</button>
          </div>
        </div>

        <div class="detail-grid">
          ${montarDetalhesRegistro(registroSelecionado)}
        </div>
      </div>
    `;

    document.getElementById("voltarListaRegistro")?.addEventListener("click", () => {
      navegarPara(config.paginaLista);
    });

    document.getElementById("editarRegistro")?.addEventListener("click", () => {
      renderizarDetalhe(true);
    });

    document.getElementById("excluirRegistro")?.addEventListener("click", async () => {
      await excluir(registroSelecionado);
      navegarPara(config.paginaLista);
    });
  }

  function montarDetalhesRegistro(registro) {
    return config.campos
      .map((campo) => {
        const valor = registro[campo.nome];

        return `
          <div class="detail-field">
            <span>${escapeHtml(campo.label)}</span>
            <strong>${escapeHtml(formatarValor(valor))}</strong>
          </div>
        `;
      })
      .join("");
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

    try {
      await updateDoc(doc(db, config.colecao, registroSelecionado.id), {
        ...dados,
        atualizadoEm: serverTimestamp()
      });

      registroSelecionado = {
        ...registroSelecionado,
        ...dados
      };

      await mostrarModal(`${config.nomeSingular} atualizado com sucesso.`, "Alterações salvas", "success");

      renderizarDetalhe(false);
    } catch (erro) {
      console.error(`Erro ao editar ${config.nomeSingular}:`, erro);
      await mostrarModal(`Erro ao editar ${config.nomeSingular.toLowerCase()}.`, "Erro", "danger");
    }
  }

  async function excluir(registro) {
    const confirmar = await confirmarModal({
      titulo: `Excluir ${config.nomeSingular}`,
      mensagem: `Tem certeza que deseja excluir “${registro.nome || config.nomeSingular}”? Essa ação não pode ser desfeita.`,
      confirmarTexto: "Excluir",
      cancelarTexto: "Cancelar",
      tipo: "danger"
    });

    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, config.colecao, registro.id));

      await mostrarModal(`${config.nomeSingular} excluído com sucesso.`, "Exclusão concluída", "success");

      if (registroSelecionado?.id === registro.id) {
        registroSelecionado = null;
      }
    } catch (erro) {
      console.error(`Erro ao excluir ${config.nomeSingular}:`, erro);
      await mostrarModal(`Erro ao excluir ${config.nomeSingular.toLowerCase()}.`, "Erro", "danger");
    }
  }

  function abrirModalImportacao() {
    fecharModalImportacao();

    importacaoPendentes = [];

    const overlay = document.createElement("div");
    overlay.className = "crud-form-overlay";
    overlay.id = "crudImportacaoOverlay";

    overlay.innerHTML = `
      <div class="crud-form-modal">
        <div class="crud-form-header">
          <div>
            <h3>Importar ${config.nomePlural}</h3>
            <p>Cole um texto com vários registros. O sistema tentará identificar os campos automaticamente.</p>
          </div>

          <button class="crud-form-close" type="button" id="fecharImportacaoModal">×</button>
        </div>

        <div class="crud-form-body">
          <div class="crud-form-content">
            <label>
              Texto para importação
              <textarea id="textoImportacaoCrud" placeholder="${escapeHtml(montarModeloImportacao())}"></textarea>
            </label>

            <div class="action-row">
              <button class="secondary-btn" type="button" id="cancelarImportacaoCrud">Cancelar</button>
              <button class="secondary-btn" type="button" id="analisarImportacaoCrud">Analisar texto</button>
              <button class="primary-btn" type="button" id="salvarImportacaoCrud">Salvar importação</button>
            </div>

            <div id="previewImportacaoCrud" class="import-preview">
              <p>Nenhum registro analisado ainda.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("fecharImportacaoModal")?.addEventListener("click", fecharModalImportacao);
    document.getElementById("cancelarImportacaoCrud")?.addEventListener("click", fecharModalImportacao);
    document.getElementById("analisarImportacaoCrud")?.addEventListener("click", analisarImportacao);
    document.getElementById("salvarImportacaoCrud")?.addEventListener("click", salvarImportacao);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        fecharModalImportacao();
      }
    });
  }

  function fecharModalImportacao() {
    const overlay = document.getElementById("crudImportacaoOverlay");

    if (overlay) {
      overlay.remove();
    }

    importacaoPendentes = [];
  }

  function montarModeloImportacao() {
    const linhas = config.campos.map((campo) => `${campo.label}:`);

    return `${config.nomeSingular} 1\n${linhas.join("\n")}\n\n${config.nomeSingular} 2\n${linhas.join("\n")}`;
  }

  function analisarImportacao() {
    const texto = document.getElementById("textoImportacaoCrud")?.value || "";
    const preview = document.getElementById("previewImportacaoCrud");

    if (!preview) return;

    importacaoPendentes = extrairRegistrosImportacao(texto);

    if (!importacaoPendentes.length) {
      preview.innerHTML = `
        <div class="empty-state">
          <h3>Nenhum registro identificado.</h3>
          <p>Confira se o texto tem nomes e campos separados por dois-pontos.</p>
        </div>
      `;
      return;
    }

    preview.innerHTML = `
      <div class="import-preview-list">
        ${importacaoPendentes
          .map((item, index) => {
            return `
              <div class="import-preview-card">
                <strong>${index + 1}. ${escapeHtml(item.nome || `${config.nomeSingular} sem nome`)}</strong>
                <p>${escapeHtml(montarResumoRegistro(item, config.camposResumo || config.camposPrincipais || []))}</p>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function extrairRegistrosImportacao(texto) {
    const blocos = texto
      .split(/\n\s*\n/g)
      .map((bloco) => bloco.trim())
      .filter(Boolean);

    return blocos
      .map((bloco) => extrairRegistroBloco(bloco))
      .filter((registro) => registro.nome);
  }
    function extrairRegistroBloco(bloco) {
    const linhas = bloco
      .split("\n")
      .map((linha) => linha.trim())
      .filter(Boolean);

    const registro = {};

    config.campos.forEach((campo) => {
      registro[campo.nome] = campo.tipo === "number" ? 0 : campo.tipo === "multi" ? [] : "";
    });

    linhas.forEach((linha, index) => {
      const partes = linha.split(":");

      if (partes.length < 2) {
        if (index === 0 && !registro.nome) {
          registro.nome = linha.replace(/^[-•\d.]+\s*/, "").trim();
        }

        return;
      }

      const chave = normalizarTextoBusca(partes.shift());
      const valor = partes.join(":").trim();

      const campoEncontrado = config.campos.find((campo) => {
        const labelNormalizada = normalizarTextoBusca(campo.label);
        const nomeNormalizado = normalizarTextoBusca(campo.nome);

        return chave === labelNormalizada || chave === nomeNormalizado;
      });

      if (!campoEncontrado) return;

      if (campoEncontrado.tipo === "number") {
        registro[campoEncontrado.nome] = Number(valor.replace(",", ".")) || 0;
        return;
      }

      if (campoEncontrado.tipo === "multi") {
        registro[campoEncontrado.nome] = valor
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((nome) => ({ id: gerarIdTemporario(nome), nome }));
        return;
      }

      if (campoEncontrado.tipo === "select" && campoEncontrado.colecao) {
        registro[campoEncontrado.nome] = valor
          ? { id: gerarIdTemporario(valor), nome: valor }
          : null;
        return;
      }

      registro[campoEncontrado.nome] = valor;
    });

    return registro;
  }

  async function salvarImportacao() {
    if (!importacaoPendentes.length) {
      await mostrarModal("Analise o texto antes de salvar a importação.", "Importação vazia");
      return;
    }

    try {
      for (const registro of importacaoPendentes) {
        const existe = registros.some((item) => {
          return normalizarTextoBusca(item.nome) === normalizarTextoBusca(registro.nome);
        });

        if (existe) continue;

        await addDoc(collection(db, config.colecao), {
          ...registro,
          criadoPor: state.usuarioAtual?.uid || "",
          criadoEm: serverTimestamp()
        });
      }

      await mostrarModal("Importação concluída com sucesso.", "Importação salva", "success");
      fecharModalImportacao();
    } catch (erro) {
      console.error(`Erro ao importar ${config.nomePlural}:`, erro);
      await mostrarModal("Erro ao salvar importação.", "Erro", "danger");
    }
  }

  function vincularBuscaLista() {
    const lista = document.getElementById(config.listaId);

    if (!lista) return;

    const inputId = lista.dataset.searchInput;

    if (!inputId) return;

    const input = document.getElementById(inputId);

    if (!input) return;

    buscaAtual = input.value || "";

    input.oninput = () => {
      buscaAtual = input.value || "";
      renderizarLista();
    };
  }

  function filtrarRegistros(lista, termo) {
    const busca = normalizarTextoBusca(termo);

    if (!busca) return lista;

    return lista.filter((registro) => {
      return normalizarTextoBusca(montarTextoBuscaRegistro(registro)).includes(busca);
    });
  }

  function montarTextoBuscaRegistro(registro) {
    const partes = [];

    config.campos.forEach((campo) => {
      partes.push(campo.label);
      partes.push(campo.nome);
      partes.push(formatarValor(registro[campo.nome]));
    });

    partes.push(registro.nome || "");

    return partes.join(" ");
  }

  function aplicarEstilosBuscaCadastro() {
    if (document.getElementById("cadastroBuscaStyles")) return;

    const style = document.createElement("style");
    style.id = "cadastroBuscaStyles";

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

  function obterCampo(nomeCampo) {
    return config.campos.find((campo) => campo.nome === nomeCampo) || null;
  }

  function formatarValor(valor) {
    if (valor === null || valor === undefined || valor === "") {
      return "Não informado";
    }

    if (Array.isArray(valor)) {
      if (!valor.length) return "Não informado";

      return valor.map((item) => {
        if (typeof item === "object") {
          return item.nome || item.id || "Item";
        }

        return item;
      }).join(", ");
    }

    if (typeof valor === "object") {
      return valor.nome || valor.id || "Não informado";
    }

    if (typeof valor === "string") {
      const mapa = {
        historia: "Boss de História",
        farm: "Boss de Farm",
        arma: "Arma",
        armadura: "Armadura",
        consumivel: "Consumível",
        acessorio: "Acessório",
        artefato: "Artefato",
        material: "Material",
        runa: "Runa",
        chave: "Chave",
        missao: "Missão",
        especial: "Especial"
      };

      return mapa[valor] || valor;
    }

    return String(valor);
  }

  function normalizarTextoBusca(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function gerarIdTemporario(nome) {
    return normalizarTextoBusca(nome)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `temp-${Date.now()}`;
  }

  function capitalizar(texto) {
    const textoLimpo = String(texto || "");

    return textoLimpo.charAt(0).toUpperCase() + textoLimpo.slice(1);
  }

  function escapeHtml(texto) {
    return String(texto ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  return {
    iniciar,
    parar,
    init
  };
}