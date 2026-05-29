import {
  db,
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  onSnapshot,
  query,
  orderBy
} from "./firebase.js";

import { state } from "./state.js";
import { onPageLoaded } from "./navigation.js";
import { mostrarModal } from "./ui.js";

let personagemFichaAtual = null;
let historicoD20 = [];
let habilidadesCatalogoFicha = [];
let itensCatalogoFicha = [];

let unsubscribeHabilidadesFicha = null;
let unsubscribeItensFicha = null;

export function initFicha() {
  aplicarEstilosFicha();
  iniciarCatalogosFicha();

  onPageLoaded((pagina) => {
    if (pagina === "ficha") {
      renderizarTelaFicha();
    }
  });
}

function iniciarCatalogosFicha() {
  if (!unsubscribeHabilidadesFicha) {
    unsubscribeHabilidadesFicha = onSnapshot(
      query(collection(db, "habilidades"), orderBy("nome", "asc")),
      (snapshot) => {
        habilidadesCatalogoFicha = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        if (document.getElementById("fichaPersonagemPage")) {
          renderizarTelaFicha();
        }
      },
      (erro) => {
        console.error("Erro ao carregar habilidades da ficha:", erro);
      }
    );
  }

  if (!unsubscribeItensFicha) {
    unsubscribeItensFicha = onSnapshot(
      query(collection(db, "itens"), orderBy("nome", "asc")),
      (snapshot) => {
        itensCatalogoFicha = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        if (document.getElementById("fichaPersonagemPage")) {
          renderizarTelaFicha();
        }
      },
      (erro) => {
        console.error("Erro ao carregar itens da ficha:", erro);
      }
    );
  }
}

export function abrirFichaPersonagem(personagem) {
  personagemFichaAtual = personagem;

  aplicarEstilosFicha();
  fecharFichaPersonagem();

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalFichaPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal ficha-modal-restaurada">
      <div class="crud-form-header">
        <div>
          <h3>${escapeHtml(personagem.nome || "Ficha do Personagem")}</h3>
          <p>${escapeHtml(personagem.raca?.nome || personagem.racaNome || "Raça não informada")} • ${escapeHtml(personagem.classe?.nome || personagem.classeNome || "Classe não informada")} • Nível ${personagem.nivel || 1}</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharFichaPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        ${montarFichaModal(personagem)}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharFichaPersonagem")?.addEventListener("click", fecharFichaPersonagem);
  document.getElementById("salvarStatusFichaModal")?.addEventListener("click", () => salvarStatusFicha("modal"));
  document.getElementById("rolarD20FichaModal")?.addEventListener("click", () => rolarD20("modal"));

  overlay.querySelectorAll(".usar-habilidade-ficha").forEach((botao) => {
    botao.addEventListener("click", () => usarHabilidadeFicha(botao.dataset.habilidadeId, "modal"));
  });

  overlay.querySelectorAll(".usar-item-ficha").forEach((botao) => {
    botao.addEventListener("click", () => usarItemFicha(botao.dataset.itemId, "modal"));
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharFichaPersonagem();
    }
  });
}

function renderizarTelaFicha() {
  aplicarEstilosFicha();

  const select = document.getElementById("selecionarPersonagemFicha");

  if (!select) return;

  const personagens = obterPersonagensDisponiveis();

  select.innerHTML = "";

  if (!personagens.length) {
    select.innerHTML = `<option value="">Nenhum personagem criado</option>`;
    personagemFichaAtual = null;
    limparFicha();
    return;
  }

  select.innerHTML = `<option value="">Selecione um personagem</option>`;

  personagens.forEach((personagem) => {
    const option = document.createElement("option");
    option.value = personagem.id;
    option.textContent = personagem.nome || "Personagem sem nome";
    select.appendChild(option);
  });

  if (!personagemFichaAtual) {
    personagemFichaAtual = personagens[0];
  } else {
    const atualizado = personagens.find((personagem) => personagem.id === personagemFichaAtual.id);
    personagemFichaAtual = atualizado || personagens[0];
  }

  select.value = personagemFichaAtual.id;

  select.onchange = () => {
    const selecionado = personagens.find((personagem) => personagem.id === select.value);

    personagemFichaAtual = selecionado || null;

    if (personagemFichaAtual) {
      preencherFicha(personagemFichaAtual);
    } else {
      limparFicha();
    }
  };

  preencherFicha(personagemFichaAtual);

  document.getElementById("salvarStatusFicha")?.addEventListener("click", () => salvarStatusFicha("pagina"));
  document.getElementById("rolarD20Ficha")?.addEventListener("click", () => rolarD20("pagina"));

  document.querySelectorAll(".usar-habilidade-ficha").forEach((botao) => {
    botao.addEventListener("click", () => usarHabilidadeFicha(botao.dataset.habilidadeId, "pagina"));
  });

  document.querySelectorAll(".usar-item-ficha").forEach((botao) => {
    botao.addEventListener("click", () => usarItemFicha(botao.dataset.itemId, "pagina"));
  });
}

function obterPersonagensDisponiveis() {
  if (!Array.isArray(state.personagens)) return [];

  if (state.dadosUsuarioAtual?.tipo === "mestre") {
    return [...state.personagens].sort(ordenarPersonagens);
  }

  return state.personagens
    .filter((personagem) => personagem.donoId === state.usuarioAtual?.uid)
    .sort(ordenarPersonagens);
}

function ordenarPersonagens(a, b) {
  return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
}

function limparFicha() {
  setText("fichaNomePersonagem", "Nenhum personagem aberto");
  setText("fichaDescricaoPersonagem", "Abra um personagem para visualizar a ficha.");
  setText("fichaCampanhaPersonagem", "Campanha: --");

  atualizarBarra("barraHpFicha", 0);
  atualizarBarra("barraManaFicha", 0);
  atualizarBarra("barraFomeFicha", 0);
  atualizarBarra("barraFadigaFicha", 0);

  setText("fichaHpTexto", "0/0");
  setText("fichaManaTexto", "0/0");
  setText("fichaFomeTexto", "0%");
  setText("fichaFadigaTexto", "0%");

  setValue("fichaHpAtual", 0);
  setValue("fichaHpMax", 0);
  setValue("fichaManaAtual", 0);
  setValue("fichaManaMax", 0);
  setValue("fichaFome", 0);
  setValue("fichaFadiga", 0);

  setHtml("fichaIdentidadeLista", `<li>Abra um personagem criado para ver os dados aqui.</li>`);
  setHtml("fichaAtributosLista", `<li>Abra um personagem criado para ver os atributos aqui.</li>`);
  setHtml("fichaRacaLista", `<li>Abra um personagem criado para ver os dados da raça aqui.</li>`);
  setHtml("fichaClasseLista", `<li>Abra um personagem criado para ver os dados da classe aqui.</li>`);
  setHtml("fichaHabilidadesLista", `<p>Nenhuma habilidade carregada.</p>`);
  setHtml("fichaItensLista", `<p>Nenhum item carregado.</p>`);
  setHtml("fichaPetConteudo", `<p>Nenhum pet carregado.</p>`);
  setHtml("fichaHistoriaTexto", "Nenhuma história carregada.");
}

function preencherFicha(personagem) {
  if (!personagem) {
    limparFicha();
    return;
  }

  const hpAtual = Number(personagem.hpAtual || 0);
  const hpMax = Number(personagem.hpMax || 0);
  const manaAtual = Number(personagem.manaAtual || 0);
  const manaMax = Number(personagem.manaMax || 0);
  const fome = Number(personagem.fome || 0);
  const fadiga = Number(personagem.fadiga || 0);

  setText("fichaNomePersonagem", personagem.nome || "Personagem sem nome");
  setText(
    "fichaDescricaoPersonagem",
    `${personagem.raca?.nome || personagem.racaNome || "Raça não informada"} • ${personagem.classe?.nome || personagem.classeNome || "Classe não informada"} • Nível ${personagem.nivel || 1}`
  );
  setText("fichaCampanhaPersonagem", `Campanha: ${personagem.campanhaNome || "Sem campanha"}`);

  atualizarBarra("barraHpFicha", calcularPercentual(hpAtual, hpMax));
  atualizarBarra("barraManaFicha", calcularPercentual(manaAtual, manaMax));
  atualizarBarra("barraFomeFicha", limitarNumero(fome, 0, 100));
  atualizarBarra("barraFadigaFicha", limitarNumero(fadiga, 0, 100));

  setText("fichaHpTexto", `${hpAtual}/${hpMax}`);
  setText("fichaManaTexto", `${manaAtual}/${manaMax}`);
  setText("fichaFomeTexto", `${fome}%`);
  setText("fichaFadigaTexto", `${fadiga}%`);

  setValue("fichaHpAtual", hpAtual);
  setValue("fichaHpMax", hpMax);
  setValue("fichaManaAtual", manaAtual);
  setValue("fichaManaMax", manaMax);
  setValue("fichaFome", fome);
  setValue("fichaFadiga", fadiga);

  setHtml("fichaIdentidadeLista", montarIdentidade(personagem));
  setHtml("fichaAtributosLista", montarAtributos(personagem));
  setHtml("fichaRacaLista", montarRaca(personagem));
  setHtml("fichaClasseLista", montarClasse(personagem));
  setHtml("fichaHabilidadesLista", montarHabilidades(personagem));
  setHtml("fichaItensLista", montarItens(personagem));
  setHtml("fichaPetConteudo", montarPet(personagem));
  setHtml("fichaHistoriaTexto", escapeHtml(personagem.historia || "Nenhuma história cadastrada."));

  document.querySelectorAll(".usar-habilidade-ficha").forEach((botao) => {
    botao.addEventListener("click", () => usarHabilidadeFicha(botao.dataset.habilidadeId, "pagina"));
  });

  document.querySelectorAll(".usar-item-ficha").forEach((botao) => {
    botao.addEventListener("click", () => usarItemFicha(botao.dataset.itemId, "pagina"));
  });
}

function montarFichaModal(personagem) {
  const hpAtual = Number(personagem.hpAtual || 0);
  const hpMax = Number(personagem.hpMax || 0);
  const manaAtual = Number(personagem.manaAtual || 0);
  const manaMax = Number(personagem.manaMax || 0);
  const fome = Number(personagem.fome || 0);
  const fadiga = Number(personagem.fadiga || 0);

  return `
    <div class="sheet-layout sheet-layout-modal">
      <section class="sheet-card sheet-profile-card">
        <div class="sheet-avatar">🧙</div>

        <h3>${escapeHtml(personagem.nome || "Personagem sem nome")}</h3>
        <p>${escapeHtml(personagem.raca?.nome || personagem.racaNome || "Raça não informada")} • ${escapeHtml(personagem.classe?.nome || personagem.classeNome || "Classe não informada")} • Nível ${personagem.nivel || 1}</p>

        <span class="sheet-pill">Campanha: ${escapeHtml(personagem.campanhaNome || "Sem campanha")}</span>
      </section>

      <section class="sheet-card sheet-status-card">
        <h3>Status principais</h3>

        ${montarStatusLinha("HP", hpAtual, hpMax, calcularPercentual(hpAtual, hpMax))}
        ${montarStatusLinha("Mana", manaAtual, manaMax, calcularPercentual(manaAtual, manaMax))}
        ${montarStatusLinha("Fome", fome, 100, limitarNumero(fome, 0, 100), true)}
        ${montarStatusLinha("Fadiga", fadiga, 100, limitarNumero(fadiga, 0, 100), true)}

        <div class="sheet-status-editor">
          <label>
            HP Atual
            <input type="number" id="fichaHpAtualModal" value="${hpAtual}" />
          </label>

          <label>
            HP Máximo
            <input type="number" id="fichaHpMaxModal" value="${hpMax}" />
          </label>

          <label>
            Mana Atual
            <input type="number" id="fichaManaAtualModal" value="${manaAtual}" />
          </label>

          <label>
            Mana Máxima
            <input type="number" id="fichaManaMaxModal" value="${manaMax}" />
          </label>

          <label>
            Fome
            <input type="number" id="fichaFomeModal" value="${fome}" />
          </label>

          <label>
            Fadiga
            <input type="number" id="fichaFadigaModal" value="${fadiga}" />
          </label>
        </div>

        <button class="primary-btn" type="button" id="salvarStatusFichaModal">Salvar status</button>
      </section>

      <section class="sheet-card sheet-dice-card">
        <h3>Rolagem de D20</h3>

        <label>
          Bônus
          <input type="number" id="bonusD20FichaModal" value="0" />
        </label>

        <button class="primary-btn" type="button" id="rolarD20FichaModal">Rolar D20</button>

        <div class="dice-result-box">
          <span>Resultado:</span>
          <strong id="resultadoD20FichaModal">--</strong>
        </div>

        <div class="dice-history">
          <h4>Últimos 2 resultados:</h4>
          <div id="historicoD20FichaModal">
            ${montarHistoricoD20()}
          </div>
        </div>
      </section>
    </div>

    <div class="sheet-grid-lower sheet-grid-modal">
      <section class="sheet-card">
        <h3>Identidade</h3>
        <ul>${montarIdentidade(personagem)}</ul>
      </section>

      <section class="sheet-card">
        <h3>Atributos</h3>
        <ul>${montarAtributos(personagem)}</ul>
      </section>

      <section class="sheet-card">
        <h3>Raça</h3>
        <ul>${montarRaca(personagem)}</ul>
      </section>

      <section class="sheet-card">
        <h3>Classe</h3>
        <ul>${montarClasse(personagem)}</ul>
      </section>

      <section class="sheet-card">
        <h3>Habilidades</h3>
        ${montarHabilidades(personagem)}
      </section>

      <section class="sheet-card">
        <h3>Itens</h3>
        ${montarItens(personagem)}
      </section>

      <section class="sheet-card">
        <h3>Pet</h3>
        ${montarPet(personagem)}
      </section>

      <section class="sheet-card">
        <h3>Condições / Status</h3>
        ${montarCondicoes(personagem)}
      </section>

      <section class="sheet-card">
        <h3>História / Descrição</h3>
        <p>${escapeHtml(personagem.historia || "Nenhuma história cadastrada.")}</p>
      </section>
    </div>
  `;
}

function montarStatusLinha(label, atual, maximo, percentual, porcentagem = false) {
  return `
    <div class="sheet-status-row">
      <span>${escapeHtml(label)}</span>
      <div class="sheet-status-bar">
        <div style="width:${percentual}%"></div>
      </div>
      <strong>${escapeHtml(atual)}${porcentagem ? "%" : `/${escapeHtml(maximo)}`}</strong>
    </div>
  `;
}

function montarIdentidade(personagem) {
  return `
    <li><strong>Nome:</strong> ${escapeHtml(personagem.nome || "Não informado")}</li>
    <li><strong>Jogador:</strong> ${escapeHtml(personagem.donoNome || "Não informado")}</li>
    <li><strong>Campanha:</strong> ${escapeHtml(personagem.campanhaNome || "Sem campanha")}</li>
    <li><strong>Raça:</strong> ${escapeHtml(personagem.raca?.nome || personagem.racaNome || "Não informada")}</li>
    <li><strong>Classe:</strong> ${escapeHtml(personagem.classe?.nome || personagem.classeNome || "Não informada")}</li>
    <li><strong>Subclasse:</strong> ${escapeHtml(personagem.subclasse?.nome || personagem.subclasseNome || "Não informada")}</li>
    <li><strong>Elemento:</strong> ${escapeHtml(personagem.elemento?.nome || personagem.elementoNome || "Não informado")}</li>
  `;
}

function montarAtributos(personagem) {
  return `
    <li><strong>Força Física:</strong> ${escapeHtml(personagem.forcaFisica || 0)}</li>
    <li><strong>Força Mágica:</strong> ${escapeHtml(personagem.forcaMagica || 0)}</li>
    <li><strong>Defesa Física:</strong> ${escapeHtml(personagem.defesaFisica || 0)}</li>
    <li><strong>Defesa Mágica:</strong> ${escapeHtml(personagem.defesaMagica || 0)}</li>
    <li><strong>Velocidade:</strong> ${escapeHtml(personagem.velocidade || 0)}</li>
    <li><strong>Resistência:</strong> ${escapeHtml(personagem.resistencia || 0)}</li>
    <li><strong>Carisma:</strong> ${escapeHtml(personagem.carismaBonus || "Não informado")}</li>
    <li><strong>Fator Medo:</strong> ${escapeHtml(personagem.fatorMedoBonus || "Não informado")}</li>
  `;
}

function montarRaca(personagem) {
  return `
    <li><strong>Raça:</strong> ${escapeHtml(personagem.raca?.nome || personagem.racaNome || "Não informada")}</li>
    <li><strong>Vantagens:</strong> ${escapeHtml(personagem.vantagensRaca || "Não informado")}</li>
    <li><strong>Desvantagens:</strong> ${escapeHtml(personagem.desvantagensRaca || "Não informado")}</li>
    <li><strong>Habilidade Exclusiva:</strong> ${escapeHtml(personagem.habilidadeExclusivaRaca?.nome || "Não informado")}</li>
    <li><strong>Classes Sugeridas:</strong> ${escapeHtml(formatarValor(personagem.classesSugeridas))}</li>
    <li><strong>Elementos Afins:</strong> ${escapeHtml(formatarValor(personagem.elementosAfins))}</li>
    <li><strong>Restrições:</strong> ${escapeHtml(formatarValor(personagem.restricoesClasse))}</li>
  `;
}

function montarClasse(personagem) {
  return `
    <li><strong>Classe:</strong> ${escapeHtml(personagem.classe?.nome || personagem.classeNome || "Não informada")}</li>
    <li><strong>Tipo de Dano:</strong> ${escapeHtml(personagem.classe?.tipoDano || "Não informado")}</li>
    <li><strong>Tipo de Defesa:</strong> ${escapeHtml(personagem.classe?.tipoDefesa || "Não informado")}</li>
    <li><strong>Atributo Principal:</strong> ${escapeHtml(formatarAtributo(personagem.classe?.atributoPrincipal))}</li>
    <li><strong>Atributo Secundário:</strong> ${escapeHtml(formatarAtributo(personagem.classe?.atributoSecundario))}</li>
    <li><strong>Habilidade Exclusiva:</strong> ${escapeHtml(personagem.habilidadeExclusivaClasse?.nome || "Não informado")}</li>
    <li><strong>Vantagens:</strong> ${escapeHtml(personagem.vantagensClasse || "Não informado")}</li>
    <li><strong>Desvantagens:</strong> ${escapeHtml(personagem.desvantagensClasse || "Não informado")}</li>
  `;
}

function montarHabilidades(personagem) {
  const habilidades = obterHabilidadesDoPersonagem(personagem);

  if (!habilidades.length) {
    return `<p>Nenhuma habilidade cadastrada para este personagem.</p>`;
  }

  return `
    <div class="sheet-mini-list">
      ${habilidades
        .map((habilidade) => {
          const custo = obterCustoManaHabilidade(habilidade);
          const cooldown = obterCooldownHabilidade(habilidade);
          const restante = obterCooldownRestante(personagem, habilidade.id);

          return `
            <div class="sheet-mini-card">
              <strong>${escapeHtml(habilidade.nome || "Habilidade sem nome")}</strong>
              <span>Mana: ${custo} • Cooldown: ${cooldown} ${restante > 0 ? `• Restante: ${restante}` : ""}</span>
              <button class="secondary-btn usar-habilidade-ficha" type="button" data-habilidade-id="${habilidade.id}">
                Usar habilidade
              </button>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function montarItens(personagem) {
  const inventario = obterInventarioPersonagem(personagem);

  if (!inventario.length) {
    return `<p>Nenhum item cadastrado para este personagem.</p>`;
  }

  return `
    <div class="sheet-mini-list">
      ${inventario
        .map((item) => {
          return `
            <div class="sheet-mini-card">
              <strong>${escapeHtml(item.nome || "Item sem nome")}</strong>
              <span>Quantidade: ${Number(item.quantidade || 1)} • ${escapeHtml(item.efeitoPrincipal || "Sem efeito automático descrito")}</span>
              <button class="secondary-btn usar-item-ficha" type="button" data-item-id="${item.id}">
                Usar item
              </button>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function montarPet(personagem) {
  const pet = personagem.pet;

  if (!pet) {
    return `<p>Nenhum pet vinculado a este personagem.</p>`;
  }

  return `
    <ul>
      <li><strong>Nome:</strong> ${escapeHtml(pet.nome || "Não informado")}</li>
      <li><strong>Espécie:</strong> ${escapeHtml(pet.especie || "Não informado")}</li>
      <li><strong>Rank:</strong> ${escapeHtml(pet.rank || "Não informado")}</li>
      <li><strong>Elemento Afim:</strong> ${escapeHtml(pet.elementoAfim || "Não informado")}</li>
      <li><strong>Habilidades:</strong> ${escapeHtml(formatarValor(pet.habilidades))}</li>
      <li><strong>Bônus ao Dono:</strong> ${escapeHtml(pet.bonusDono || "Não informado")}</li>
    </ul>
  `;
}

function montarCondicoes(personagem) {
  const condicoes = Array.isArray(personagem.condicoes) ? personagem.condicoes : [];

  if (!condicoes.length) {
    return `<p>Nenhuma condição ativa.</p>`;
  }

  return `
    <div class="sheet-condition-list">
      ${condicoes.map((condicao) => `<span>${escapeHtml(condicao)}</span>`).join("")}
    </div>
  `;
}

async function usarHabilidadeFicha(habilidadeId, origem) {
  if (!personagemFichaAtual) {
    await mostrarModal("Nenhum personagem selecionado.", "Erro", "danger");
    return;
  }

  const habilidade = obterHabilidadesDoPersonagem(personagemFichaAtual).find((item) => item.id === habilidadeId);

  if (!habilidade) {
    await mostrarModal("Habilidade não encontrada.", "Erro", "danger");
    return;
  }

  const custoMana = obterCustoManaHabilidade(habilidade);
  const cooldown = obterCooldownHabilidade(habilidade);
  const cooldownRestante = obterCooldownRestante(personagemFichaAtual, habilidade.id);
  const manaAtual = Number(personagemFichaAtual.manaAtual || 0);

  if (cooldownRestante > 0) {
    await mostrarModal(`Essa habilidade ainda está em cooldown por ${cooldownRestante} turno(s).`, "Cooldown ativo", "danger");
    return;
  }

  if (manaAtual < custoMana) {
    await mostrarModal(
      `Mana insuficiente. Necessário: ${custoMana}. Mana atual: ${manaAtual}.`,
      "Mana insuficiente",
      "danger"
    );
    return;
  }

  const novaMana = manaAtual - custoMana;
  const cooldowns = {
    ...(personagemFichaAtual.cooldownsHabilidades || {})
  };

  if (cooldown > 0) {
    cooldowns[habilidade.id] = cooldown;
  }

  try {
    await updateDoc(doc(db, "personagens", personagemFichaAtual.id), {
      manaAtual: novaMana,
      cooldownsHabilidades: cooldowns,
      atualizadoEm: serverTimestamp()
    });

    personagemFichaAtual = {
      ...personagemFichaAtual,
      manaAtual: novaMana,
      cooldownsHabilidades: cooldowns
    };

    await mostrarModal("Habilidade usada com sucesso.", "Ação registrada", "success");

    if (origem === "modal") {
      fecharFichaPersonagem();
      abrirFichaPersonagem(personagemFichaAtual);
    } else {
      preencherFicha(personagemFichaAtual);
    }
  } catch (erro) {
    console.error("Erro ao usar habilidade:", erro);
    await mostrarModal("Erro ao usar habilidade.", "Erro", "danger");
  }
}

async function usarItemFicha(itemId, origem) {
  if (!personagemFichaAtual) {
    await mostrarModal("Nenhum personagem selecionado.", "Erro", "danger");
    return;
  }

  const inventario = obterInventarioPersonagem(personagemFichaAtual);
  const itemInventario = inventario.find((item) => item.id === itemId);

  if (!itemInventario) {
    await mostrarModal("Item não encontrado no inventário.", "Erro", "danger");
    return;
  }

  const itemCompleto = completarItem(itemInventario);
  const resultado = aplicarEfeitoItem(personagemFichaAtual, itemCompleto);
  const novoInventario = consumirItemInventario(inventario, itemCompleto.id);

  try {
    await updateDoc(doc(db, "personagens", personagemFichaAtual.id), {
      ...resultado.atualizacao,
      inventario: novoInventario,
      atualizadoEm: serverTimestamp()
    });

    personagemFichaAtual = {
      ...personagemFichaAtual,
      ...resultado.atualizacao,
      inventario: novoInventario
    };

    await mostrarModal(resultado.descricao, "Item usado", "success");

    if (origem === "modal") {
      fecharFichaPersonagem();
      abrirFichaPersonagem(personagemFichaAtual);
    } else {
      preencherFicha(personagemFichaAtual);
    }
  } catch (erro) {
    console.error("Erro ao usar item:", erro);
    await mostrarModal("Erro ao usar item.", "Erro", "danger");
  }
}

async function salvarStatusFicha(origem) {
  if (!personagemFichaAtual) {
    await mostrarModal("Nenhum personagem selecionado.", "Erro", "danger");
    return;
  }

  const sufixo = origem === "modal" ? "Modal" : "";

  const hpMax = numeroCampo(`fichaHpMax${sufixo}`);
  const manaMax = numeroCampo(`fichaManaMax${sufixo}`);

  const hpAtual = limitarNumero(numeroCampo(`fichaHpAtual${sufixo}`), 0, hpMax);
  const manaAtual = limitarNumero(numeroCampo(`fichaManaAtual${sufixo}`), 0, manaMax);
  const fome = limitarNumero(numeroCampo(`fichaFome${sufixo}`), 0, 100);
  const fadiga = limitarNumero(numeroCampo(`fichaFadiga${sufixo}`), 0, 100);

  try {
    await updateDoc(doc(db, "personagens", personagemFichaAtual.id), {
      hpAtual,
      hpMax,
      manaAtual,
      manaMax,
      fome,
      fadiga,
      atualizadoEm: serverTimestamp()
    });

    personagemFichaAtual = {
      ...personagemFichaAtual,
      hpAtual,
      hpMax,
      manaAtual,
      manaMax,
      fome,
      fadiga
    };

    await mostrarModal("Status atualizado com sucesso.", "Alterações salvas", "success");

    if (origem === "modal") {
      fecharFichaPersonagem();
      abrirFichaPersonagem(personagemFichaAtual);
      return;
    }

    preencherFicha(personagemFichaAtual);
  } catch (erro) {
    console.error("Erro ao salvar status da ficha:", erro);
    await mostrarModal("Erro ao salvar status da ficha.", "Erro", "danger");
  }
}

function rolarD20(origem) {
  const sufixo = origem === "modal" ? "Modal" : "";

  const bonus = Number(document.getElementById(`bonusD20Ficha${sufixo}`)?.value) || 0;
  const dado = Math.floor(Math.random() * 20) + 1;
  const total = dado + bonus;

  const resultado = {
    dado,
    bonus,
    total
  };

  historicoD20.unshift(resultado);
  historicoD20 = historicoD20.slice(0, 2);

  setText(`resultadoD20Ficha${sufixo}`, total);
  setHtml(`historicoD20Ficha${sufixo}`, montarHistoricoD20());
}

function montarHistoricoD20() {
  if (!historicoD20.length) {
    return `<p>Nenhum dado rolado ainda.</p>`;
  }

  return historicoD20
    .map((item) => {
      return `
        <p>
          D20: <strong>${item.dado}</strong>
          ${item.bonus >= 0 ? "+" : ""}${item.bonus}
          =
          <strong>${item.total}</strong>
        </p>
      `;
    })
    .join("");
}

function obterHabilidadesDoPersonagem(personagem) {
  const habilidades = [];

  if (personagem.habilidadeExclusivaRaca) habilidades.push(personagem.habilidadeExclusivaRaca);
  if (personagem.habilidadeExclusivaClasse) habilidades.push(personagem.habilidadeExclusivaClasse);

  if (Array.isArray(personagem.habilidadesIniciais)) {
    personagem.habilidadesIniciais.forEach((habilidade) => habilidades.push(habilidade));
  }

  const mapa = new Map();

  habilidades.forEach((habilidade) => {
    const completa = completarHabilidade(habilidade);
    if (completa?.id) mapa.set(completa.id, completa);
  });

  return Array.from(mapa.values());
}

function completarHabilidade(habilidade) {
  if (!habilidade) return null;

  const catalogo = habilidadesCatalogoFicha.find((item) => item.id === habilidade.id);

  return {
    ...catalogo,
    ...habilidade,
    id: habilidade.id || catalogo?.id || "",
    nome: habilidade.nome || catalogo?.nome || "Habilidade sem nome"
  };
}

function obterCustoManaHabilidade(habilidade) {
  return numeroDeCampos(habilidade, [
    "custoManaEnergia",
    "custoMana",
    "custoDeMana",
    "custo",
    "mana",
    "custoEnergia"
  ]);
}

function obterCooldownHabilidade(habilidade) {
  return numeroDeCampos(habilidade, [
    "cooldown",
    "recarga",
    "tempoRecarga",
    "turnosCooldown"
  ]);
}

function obterCooldownRestante(personagem, habilidadeId) {
  const cooldowns = personagem.cooldownsHabilidades || {};
  return Number(cooldowns[habilidadeId] || 0);
}

function obterInventarioPersonagem(personagem) {
  if (Array.isArray(personagem.inventario) && personagem.inventario.length > 0) {
    return personagem.inventario.map((item) => completarItem(item));
  }

  if (Array.isArray(personagem.itensIniciais)) {
    return personagem.itensIniciais.map((item) => completarItem({
      ...item,
      quantidade: item.quantidade || 1
    }));
  }

  return [];
}

function completarItem(item) {
  if (!item) return null;

  const catalogo = itensCatalogoFicha.find((itemCatalogo) => itemCatalogo.id === item.id);

  return {
    ...catalogo,
    ...item,
    id: item.id || catalogo?.id || "",
    nome: item.nome || catalogo?.nome || "Item sem nome",
    quantidade: Number(item.quantidade || 1)
  };
}

function consumirItemInventario(inventario, itemId) {
  return inventario
    .map((item) => {
      if (item.id !== itemId) return item;

      return {
        ...item,
        quantidade: Number(item.quantidade || 1) - 1
      };
    })
    .filter((item) => Number(item.quantidade || 0) > 0);
}

function aplicarEfeitoItem(personagem, item) {
  const efeitoTexto = normalizarTexto(`${item.efeitoPrincipal || ""} ${item.categoria || ""} ${item.nome || ""}`);

  const valor = numeroDeCampos(item, [
    "valorEfeito",
    "cura",
    "recuperacao",
    "bonus",
    "quantidadeEfeito",
    "efeitoValor"
  ]) || 10;

  const atualizacao = {};
  const descricoes = [];

  if (efeitoTexto.includes("hp") || efeitoTexto.includes("vida") || efeitoTexto.includes("cura")) {
    const hpMax = Number(personagem.hpMax || 0);
    const hpAtual = Number(personagem.hpAtual || 0);
    const novoHp = Math.min(hpMax, hpAtual + valor);
    atualizacao.hpAtual = novoHp;
    descricoes.push(`Recuperou ${novoHp - hpAtual} de HP.`);
  }

  if (efeitoTexto.includes("mana")) {
    const manaMax = Number(personagem.manaMax || 0);
    const manaAtual = Number(personagem.manaAtual || 0);
    const novaMana = Math.min(manaMax, manaAtual + valor);
    atualizacao.manaAtual = novaMana;
    descricoes.push(`Recuperou ${novaMana - manaAtual} de Mana.`);
  }

  if (efeitoTexto.includes("fome")) {
    const fomeAtual = Number(personagem.fome || 0);
    const novaFome = Math.max(0, fomeAtual - valor);
    atualizacao.fome = novaFome;
    descricoes.push(`Reduziu ${fomeAtual - novaFome} de Fome.`);
  }

  if (efeitoTexto.includes("fadiga") || efeitoTexto.includes("cansaço") || efeitoTexto.includes("cansaco")) {
    const fadigaAtual = Number(personagem.fadiga || 0);
    const novaFadiga = Math.max(0, fadigaAtual - valor);
    atualizacao.fadiga = novaFadiga;
    descricoes.push(`Reduziu ${fadigaAtual - novaFadiga} de Fadiga.`);
  }

  if (descricoes.length === 0) {
    descricoes.push("O efeito foi registrado, mas nenhum efeito automático foi identificado.");
  }

  return {
    atualizacao,
    descricao: descricoes.join(" ")
  };
}

function numeroDeCampos(objeto, campos) {
  for (const campo of campos) {
    const valor = objeto?.[campo];

    if (valor === undefined || valor === null || valor === "") continue;

    const numero = Number(String(valor).replace(",", ".").replace(/[^\d.-]/g, ""));

    if (Number.isFinite(numero)) return numero;
  }

  return 0;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function formatarValor(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "Não informado";
  }

  if (Array.isArray(valor)) {
    if (!valor.length) return "Não informado";
    return valor.map((item) => item.nome || item).join(", ");
  }

  if (typeof valor === "object") {
    return valor.nome || "Não informado";
  }

  return String(valor);
}

function calcularPercentual(atual, maximo) {
  const atualNumero = Number(atual) || 0;
  const maximoNumero = Number(maximo) || 0;

  if (maximoNumero <= 0) return 0;

  return Math.max(0, Math.min(100, Math.round((atualNumero / maximoNumero) * 100)));
}

function numeroCampo(id) {
  return Number(document.getElementById(id)?.value) || 0;
}

function limitarNumero(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function atualizarBarra(id, percentual) {
  const barra = document.getElementById(id);

  if (barra) {
    barra.style.width = `${limitarNumero(percentual, 0, 100)}%`;
  }
}

function setText(id, texto) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.textContent = texto;
  }
}

function setHtml(id, html) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.innerHTML = html;
  }
}

function setValue(id, valor) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.value = valor;
  }
}

function fecharFichaPersonagem() {
  const overlay = document.getElementById("modalFichaPersonagem");

  if (overlay) {
    overlay.remove();
  }
}

function escapeHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function aplicarEstilosFicha() {
  if (document.getElementById("fichaRestauradaStyles")) return;

  const style = document.createElement("style");
  style.id = "fichaRestauradaStyles";

  style.textContent = `
    .header-select {
      min-width: 280px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.55);
      color: #fff;
      padding: 13px 15px;
      font-size: 14px;
      font-weight: 800;
      outline: none;
    }

    .sheet-layout {
      display: grid;
      grid-template-columns: minmax(260px, 0.8fr) minmax(420px, 1.35fr) minmax(300px, 0.9fr);
      gap: 26px;
      align-items: stretch;
    }

    .sheet-layout-modal {
      grid-template-columns: minmax(240px, 0.8fr) minmax(360px, 1.25fr) minmax(280px, 0.9fr);
    }

    .sheet-grid-lower {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 26px;
      margin-top: 26px;
    }

    .sheet-grid-modal {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .sheet-card {
      min-width: 0;
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.12);
      background:
        radial-gradient(circle at 90% 0%, rgba(255,255,255,0.055), transparent 32%),
        linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02));
      padding: 28px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }

    .sheet-card h3 {
      margin: 0 0 24px;
      color: #fff;
      font-size: 25px;
      line-height: 1.1;
      letter-spacing: -0.04em;
    }

    .sheet-card p,
    .sheet-card li {
      color: rgba(255,255,255,0.72);
      font-size: 16px;
      line-height: 1.55;
    }

    .sheet-card ul {
      margin: 0;
      padding-left: 22px;
    }

    .sheet-card li + li {
      margin-top: 10px;
    }

    .sheet-profile-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 18px;
    }

    .sheet-avatar {
      width: 116px;
      height: 116px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 54px;
      background: linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.035));
      border: 1px solid rgba(255,255,255,0.14);
    }

    .sheet-profile-card h3 {
      margin: 10px 0 0;
      max-width: 260px;
    }

    .sheet-profile-card p {
      margin: 0;
      max-width: 270px;
      font-weight: 700;
    }

    .sheet-pill {
      display: inline-flex;
      max-width: 100%;
      border-radius: 999px;
      padding: 10px 16px;
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.82);
      font-weight: 800;
      font-size: 14px;
    }

    .sheet-status-card {
      display: grid;
      align-content: start;
      gap: 16px;
    }

    .sheet-status-row {
      display: grid;
      grid-template-columns: 82px minmax(120px, 1fr) 70px;
      align-items: center;
      gap: 16px;
    }

    .sheet-status-row span {
      color: rgba(255,255,255,0.82);
      font-size: 18px;
      font-weight: 800;
    }

    .sheet-status-row strong {
      color: #fff;
      font-size: 18px;
      text-align: right;
    }

    .sheet-status-bar {
      height: 13px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255,255,255,0.10);
    }

    .sheet-status-bar div {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.42));
      box-shadow: 0 0 18px rgba(255,255,255,0.18);
      transition: width 0.25s ease;
    }

    .sheet-status-editor {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-top: 10px;
    }

    .sheet-status-editor label,
    .sheet-dice-card label {
      display: grid;
      gap: 9px;
      color: rgba(255,255,255,0.78);
      font-weight: 800;
      font-size: 14px;
    }

    .sheet-status-editor input,
    .sheet-dice-card input {
      width: 100%;
      min-width: 0;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.55);
      color: #fff;
      padding: 13px 15px;
      font-size: 15px;
      outline: none;
    }

    .sheet-dice-card {
      display: grid;
      align-content: start;
      gap: 22px;
    }

    .dice-result-box {
      border-radius: 18px;
      padding: 22px;
      text-align: center;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .dice-result-box span {
      display: block;
      color: rgba(255,255,255,0.58);
      font-size: 18px;
      margin-bottom: 12px;
    }

    .dice-result-box strong {
      color: #fff;
      font-size: 34px;
      letter-spacing: 0.08em;
    }

    .dice-history h4 {
      margin: 0 0 12px;
      color: rgba(255,255,255,0.66);
      font-size: 17px;
    }

    .dice-history p {
      margin: 0;
      border-radius: 14px;
      padding: 13px 15px;
      background: rgba(255,255,255,0.045);
    }

    .dice-history p + p {
      margin-top: 8px;
    }

    .sheet-mini-list {
      display: grid;
      gap: 12px;
    }

    .sheet-mini-card {
      display: grid;
      gap: 8px;
      border-radius: 16px;
      padding: 14px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .sheet-mini-card strong {
      color: #fff;
      font-size: 16px;
    }

    .sheet-mini-card span {
      color: rgba(255,255,255,0.52);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .sheet-mini-card button {
      justify-self: start;
      padding: 9px 12px;
      font-size: 12px;
    }

    .sheet-condition-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .sheet-condition-list span {
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.86);
      border: 1px solid rgba(255,255,255,0.10);
      font-size: 13px;
      font-weight: 800;
    }

    .ficha-modal-restaurada {
      width: min(1180px, 96vw);
      max-height: 92vh;
      overflow: hidden;
    }

    .ficha-modal-restaurada .crud-form-body {
      overflow-y: auto;
      overflow-x: hidden;
    }

    @media (max-width: 1180px) {
      .sheet-layout,
      .sheet-layout-modal {
        grid-template-columns: 1fr;
      }

      .sheet-grid-lower,
      .sheet-grid-modal {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 760px) {
      .header-select {
        width: 100%;
      }

      .sheet-grid-lower,
      .sheet-grid-modal {
        grid-template-columns: 1fr;
      }

      .sheet-status-row {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .sheet-status-row strong {
        text-align: left;
      }

      .sheet-status-editor {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}