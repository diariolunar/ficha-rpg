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

        if (document.getElementById(config.formContainerId)) {
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
        multiselectsCadastro = criarEstadoMultiselect();
        renderizarFormularioCadastro();
        renderizarLista();
      }

      if (pagina === config.paginaDetalhe) {
        renderizarDetalhe(false);
      }
    });
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
    const container = document.getElementById(config.formContainerId);

    if (!container) return;

    container.innerHTML = montarFormulario({
      prefixo: "",
      titulo: `Cadastrar ${config.nomeSingular}`,
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

    const botoes = modoEdicao
      ? `
        <div class="action-row">
          <button class="secondary-btn" type="button" id="${prefixo}Cancelar">Cancelar</button>
          <button class="primary-btn" type="button" id="${botaoId}">${botaoTexto}</button>
        </div>
      `
      : `<button class="primary-btn" type="button" id="${botaoId}">${botaoTexto}</button>`;

    return `
      <div class="form-card">
        <h3>${titulo}</h3>
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
          dados[campo.nome] = {
            id: "__ALL__",
            nome: "Todas"
          };
          return;
        }

        if (select.value === "__NONE__") {
          dados[campo.nome] = {
            id: "__NONE__",
            nome: "Nenhuma"
          };
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

    try {
      await addDoc(collection(db, config.colecao), {
        ...dados,
        criadoPor: state.usuarioAtual.uid,
        criadoEm: serverTimestamp()
      });

      multiselectsCadastro = criarEstadoMultiselect();
      renderizarFormularioCadastro();

      await mostrarModal(`${config.nomeSingular} salvo com sucesso.`, "Cadastro realizado", "success");
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
          <span>${config.nomeSingular}</span>
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
      return `<span>Tipo: <b>${config.nomeSingular}</b></span>`;
    }

    return camposResumo
      .map((campoNome) => {
        const campo = config.campos.find((item) => item.nome === campoNome);
        const valor = formatarValor(registro[campoNome]);
        return `<span>${campo?.label || campoNome}: <b>${valor}</b></span>`;
      })
      .join("");
  }

  function montarDescricaoCard(registro) {
    const campos = config.camposCard || [];

    return campos
      .map((campoNome) => {
        const campo = config.campos.find((item) => item.nome === campoNome);
        return `<p><b>${campo?.label || campoNome}:</b> ${formatarValor(registro[campoNome])}</p>`;
      })
      .join("");
  }

  function renderizarDetalhe(modoEdicao = false) {
    const container = document.getElementById(config.detalheContainerId);

    if (!container) return;

    if (!registroSelecionado) {
      container.innerHTML = `
        <div class="form-card">
          <h3>Nenhum registro selecionado</h3>
          <p>Volte para a lista e selecione uma opção.</p>
          <button class="secondary-btn" id="voltarLista">Voltar</button>
        </div>
      `;

      document.getElementById("voltarLista").addEventListener("click", () => {
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
        <p class="detail-subtitle">${config.nomeSingular} cadastrado pelo Mestre</p>

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

    document.getElementById("voltarLista").addEventListener("click", () => {
      navegarPara(config.paginaLista);
    });

    document.getElementById("abrirEdicao").addEventListener("click", () => {
      renderizarDetalhe(true);
    });

    document.getElementById("excluirItem").addEventListener("click", excluir);
  }

  function montarItensDetalhe(registro) {
    const camposPrincipais = config.camposPrincipais || [];

    return camposPrincipais
      .map((campoNome) => {
        const campo = config.campos.find((item) => item.nome === campoNome);
        return `
          <div class="detail-item">
            <span>${campo?.label || campoNome}</span>
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
            <h4>${campo.label}</h4>
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
      return valor.map((item) => item.nome || item).join(", ");
    }

    if (typeof valor === "object") {
      return valor.nome || "Não informado";
    }

    const campoComOpcao = config.campos.find((campo) => {
      return campo.opcoes?.some((opcao) => opcao.valor === valor);
    });

    if (campoComOpcao) {
      const opcao = campoComOpcao.opcoes.find((item) => item.valor === valor);
      return opcao?.nome || valor;
    }

    return escapeHtml(valor);
  }

  function escapeHtml(texto) {
    return String(texto)
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