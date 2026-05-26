import {
  db,
  doc,
  updateDoc,
  serverTimestamp
} from "./firebase.js";

import { mostrarModal } from "./ui.js";

let personagemFichaAtual = null;
let abaFichaAtual = "resumo";

export function initFicha() {
  aplicarEstilosFicha();
}

export function abrirFichaPersonagem(personagem) {
  personagemFichaAtual = personagem;
  abaFichaAtual = "resumo";

  aplicarEstilosFicha();
  fecharFichaPersonagem();

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay ficha-overlay";
  overlay.id = "modalFichaPersonagem";

  overlay.innerHTML = `
    <div class="ficha-shell">
      <div class="ficha-topbar">
        <div class="ficha-title-block">
          <span class="ficha-kicker">Ficha do personagem</span>
          <h3>${escapeHtml(personagem.nome || "Ficha do Personagem")}</h3>
          <p>
            ${escapeHtml(personagem.raca?.nome || personagem.racaNome || "Raça não informada")}
            <span>•</span>
            ${escapeHtml(personagem.classe?.nome || personagem.classeNome || "Classe não informada")}
            <span>•</span>
            Nível ${personagem.nivel || 1}
          </p>
        </div>

        <button class="ficha-close" type="button" id="fecharFichaPersonagem">×</button>
      </div>

      <div class="ficha-tabs">
        <button class="ficha-tab active" data-aba="resumo">Resumo</button>
        <button class="ficha-tab" data-aba="atributos">Atributos</button>
        <button class="ficha-tab" data-aba="habilidades">Habilidades</button>
        <button class="ficha-tab" data-aba="itens">Itens</button>
        <button class="ficha-tab" data-aba="pet">Pet</button>
        <button class="ficha-tab" data-aba="historia">História</button>
      </div>

      <div class="ficha-content" id="fichaConteudo">
        ${montarConteudoAba(personagem, abaFichaAtual)}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharFichaPersonagem")?.addEventListener("click", fecharFichaPersonagem);

  document.querySelectorAll(".ficha-tab").forEach((botao) => {
    botao.addEventListener("click", () => {
      trocarAbaFicha(botao.dataset.aba);
    });
  });

  vincularEventosFicha();

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharFichaPersonagem();
    }
  });
}

function trocarAbaFicha(aba) {
  if (!personagemFichaAtual) return;

  abaFichaAtual = aba;

  document.querySelectorAll(".ficha-tab").forEach((botao) => {
    botao.classList.toggle("active", botao.dataset.aba === aba);
  });

  const conteudo = document.getElementById("fichaConteudo");

  if (conteudo) {
    conteudo.innerHTML = montarConteudoAba(personagemFichaAtual, aba);
  }

  vincularEventosFicha();
}

function vincularEventosFicha() {
  document.getElementById("salvarStatusFicha")?.addEventListener("click", salvarStatusFicha);
}

function fecharFichaPersonagem() {
  const overlay = document.getElementById("modalFichaPersonagem");

  if (overlay) {
    overlay.remove();
  }
}

function montarConteudoAba(personagem, aba) {
  if (aba === "atributos") {
    return montarAbaAtributos(personagem);
  }

  if (aba === "habilidades") {
    return montarAbaHabilidades(personagem);
  }

  if (aba === "itens") {
    return montarAbaItens(personagem);
  }

  if (aba === "pet") {
    return montarAbaPet(personagem);
  }

  if (aba === "historia") {
    return montarAbaHistoria(personagem);
  }

  return montarAbaResumo(personagem);
}

function montarAbaResumo(personagem) {
  const hpPercentual = calcularPercentual(personagem.hpAtual, personagem.hpMax);
  const manaPercentual = calcularPercentual(personagem.manaAtual, personagem.manaMax);
  const fomePercentual = limitarNumero(Number(personagem.fome || 0), 0, 100);
  const fadigaPercentual = limitarNumero(Number(personagem.fadiga || 0), 0, 100);

  return `
    <div class="ficha-grid ficha-grid-resumo">
      <section class="ficha-card ficha-card-status">
        <div class="ficha-card-header">
          <div>
            <span>Status</span>
            <h4>Condição atual</h4>
          </div>
        </div>

        <div class="ficha-status-list">
          ${montarBarraStatus("HP", personagem.hpAtual || 0, personagem.hpMax || 0, hpPercentual)}
          ${montarBarraStatus("Mana", personagem.manaAtual || 0, personagem.manaMax || 0, manaPercentual)}
          ${montarBarraStatus("Fome", personagem.fome || 0, 100, fomePercentual)}
          ${montarBarraStatus("Fadiga", personagem.fadiga || 0, 100, fadigaPercentual)}
        </div>

        <div class="ficha-status-editor">
          <label>
            HP Atual
            <input type="number" id="fichaHpAtual" value="${personagem.hpAtual || 0}" />
          </label>

          <label>
            HP Máximo
            <input type="number" id="fichaHpMax" value="${personagem.hpMax || 0}" />
          </label>

          <label>
            Mana Atual
            <input type="number" id="fichaManaAtual" value="${personagem.manaAtual || 0}" />
          </label>

          <label>
            Mana Máxima
            <input type="number" id="fichaManaMax" value="${personagem.manaMax || 0}" />
          </label>

          <label>
            Fome
            <input type="number" id="fichaFome" value="${personagem.fome || 0}" />
          </label>

          <label>
            Fadiga
            <input type="number" id="fichaFadiga" value="${personagem.fadiga || 0}" />
          </label>
        </div>

        <button class="primary-btn ficha-save-btn" type="button" id="salvarStatusFicha">Salvar status</button>
      </section>

      <section class="ficha-card">
        <div class="ficha-card-header">
          <div>
            <span>Identidade</span>
            <h4>Dados principais</h4>
          </div>
        </div>

        <div class="ficha-info-grid">
          ${montarInfo("Jogador", personagem.donoNome || "Não informado")}
          ${montarInfo("Campanha", personagem.campanhaNome || "Sem campanha")}
          ${montarInfo("Raça", personagem.raca?.nome || personagem.racaNome || "Não informada")}
          ${montarInfo("Classe", personagem.classe?.nome || personagem.classeNome || "Não informada")}
          ${montarInfo("Subclasse", personagem.subclasse?.nome || personagem.subclasseNome || "Não informada")}
          ${montarInfo("Elemento", personagem.elemento?.nome || personagem.elementoNome || "Não informado")}
        </div>
      </section>

      <section class="ficha-card">
        <div class="ficha-card-header">
          <div>
            <span>Resumo</span>
            <h4>Características</h4>
          </div>
        </div>

        <div class="ficha-section">
          <h5>Carisma</h5>
          <p>${escapeHtml(personagem.carismaBonus || "Não informado")}</p>
        </div>

        <div class="ficha-section">
          <h5>Fator Medo</h5>
          <p>${escapeHtml(personagem.fatorMedoBonus || "Não informado")}</p>
        </div>

        <div class="ficha-section">
          <h5>Habilidade da Raça</h5>
          <p>${escapeHtml(personagem.habilidadeExclusivaRaca?.nome || "Não informado")}</p>
        </div>

        <div class="ficha-section">
          <h5>Habilidade da Classe</h5>
          <p>${escapeHtml(personagem.habilidadeExclusivaClasse?.nome || "Não informado")}</p>
        </div>
      </section>
    </div>
  `;
}

function montarAbaAtributos(personagem) {
  return `
    <div class="ficha-grid ficha-grid-duas">
      <section class="ficha-card">
        <div class="ficha-card-header">
          <div>
            <span>Atributos</span>
            <h4>Valores principais</h4>
          </div>
        </div>

        <div class="ficha-info-grid ficha-atributos-grid">
          ${montarInfo("Força Física", personagem.forcaFisica || 0)}
          ${montarInfo("Força Mágica", personagem.forcaMagica || 0)}
          ${montarInfo("Defesa Física", personagem.defesaFisica || 0)}
          ${montarInfo("Defesa Mágica", personagem.defesaMagica || 0)}
          ${montarInfo("Velocidade", personagem.velocidade || 0)}
          ${montarInfo("Resistência", personagem.resistencia || 0)}
        </div>
      </section>

      <section class="ficha-card">
        <div class="ficha-card-header">
          <div>
            <span>Vantagens</span>
            <h4>Bônus e penalidades</h4>
          </div>
        </div>

        <div class="ficha-section">
          <h5>Vantagens da Raça</h5>
          <p>${escapeHtml(personagem.vantagensRaca || "Não informado")}</p>
        </div>

        <div class="ficha-section">
          <h5>Desvantagens da Raça</h5>
          <p>${escapeHtml(personagem.desvantagensRaca || "Não informado")}</p>
        </div>

        <div class="ficha-section">
          <h5>Vantagens da Classe</h5>
          <p>${escapeHtml(personagem.vantagensClasse || "Não informado")}</p>
        </div>

        <div class="ficha-section">
          <h5>Desvantagens da Classe</h5>
          <p>${escapeHtml(personagem.desvantagensClasse || "Não informado")}</p>
        </div>
      </section>
    </div>
  `;
}

function montarAbaHabilidades(personagem) {
  return `
    <section class="ficha-card">
      <div class="ficha-card-header">
        <div>
          <span>Habilidades</span>
          <h4>Lista de habilidades</h4>
        </div>
      </div>

      ${montarHabilidades(personagem)}
    </section>
  `;
}

function montarAbaItens(personagem) {
  return `
    <section class="ficha-card">
      <div class="ficha-card-header">
        <div>
          <span>Inventário</span>
          <h4>Itens iniciais</h4>
        </div>
      </div>

      ${montarItens(personagem)}
    </section>
  `;
}

function montarAbaPet(personagem) {
  return `
    <section class="ficha-card">
      <div class="ficha-card-header">
        <div>
          <span>Pet</span>
          <h4>Companheiro vinculado</h4>
        </div>
      </div>

      ${montarPet(personagem)}
    </section>
  `;
}

function montarAbaHistoria(personagem) {
  return `
    <section class="ficha-card">
      <div class="ficha-card-header">
        <div>
          <span>Narrativa</span>
          <h4>História e descrição</h4>
        </div>
      </div>

      <div class="ficha-section">
        <p>${escapeHtml(personagem.historia || "Nenhuma história cadastrada.")}</p>
      </div>
    </section>
  `;
}

function montarInfo(label, valor) {
  return `
    <div class="ficha-info">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(valor)}</strong>
    </div>
  `;
}

function montarHabilidades(personagem) {
  const habilidades = [];

  if (personagem.habilidadeExclusivaRaca) {
    habilidades.push({
      ...personagem.habilidadeExclusivaRaca,
      origem: "Raça"
    });
  }

  if (personagem.habilidadeExclusivaClasse) {
    habilidades.push({
      ...personagem.habilidadeExclusivaClasse,
      origem: "Classe"
    });
  }

  if (Array.isArray(personagem.habilidadesIniciais)) {
    personagem.habilidadesIniciais.forEach((habilidade) => {
      habilidades.push({
        ...habilidade,
        origem: "Inicial"
      });
    });
  }

  if (!habilidades.length) {
    return `<p class="ficha-empty">Nenhuma habilidade cadastrada para este personagem.</p>`;
  }

  return `
    <div class="ficha-resource-grid">
      ${habilidades
        .map((habilidade) => {
          return `
            <div class="ficha-mini-card">
              <div>
                <h5>${escapeHtml(habilidade.nome || "Habilidade sem nome")}</h5>
                <span>${escapeHtml(habilidade.origem || "Habilidade")}</span>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function montarItens(personagem) {
  const itens = Array.isArray(personagem.itensIniciais)
    ? personagem.itensIniciais
    : [];

  if (!itens.length) {
    return `<p class="ficha-empty">Nenhum item cadastrado para este personagem.</p>`;
  }

  return `
    <div class="ficha-resource-grid">
      ${itens
        .map((item) => {
          return `
            <div class="ficha-mini-card">
              <div>
                <h5>${escapeHtml(item.nome || "Item sem nome")}</h5>
                <span>Item</span>
              </div>
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
    return `<p class="ficha-empty">Nenhum pet vinculado a este personagem.</p>`;
  }

  return `
    <div class="ficha-info-grid">
      ${montarInfo("Nome", pet.nome || "Sem nome")}
      ${montarInfo("Espécie", pet.especie || "Não informado")}
      ${montarInfo("Rank", pet.rank || "Não informado")}
      ${montarInfo("Elemento Afim", pet.elementoAfim || "Não informado")}
    </div>

    <div class="ficha-section">
      <h5>Habilidades</h5>
      <p>${escapeHtml(formatarValor(pet.habilidades))}</p>
    </div>

    <div class="ficha-section">
      <h5>Bônus ao Dono</h5>
      <p>${escapeHtml(pet.bonusDono || "Não informado")}</p>
    </div>
  `;
}

async function salvarStatusFicha() {
  if (!personagemFichaAtual) {
    await mostrarModal("Nenhum personagem selecionado.", "Erro", "danger");
    return;
  }

  const hpMax = numeroCampo("fichaHpMax");
  const manaMax = numeroCampo("fichaManaMax");

  const hpAtual = limitarNumero(numeroCampo("fichaHpAtual"), 0, hpMax);
  const manaAtual = limitarNumero(numeroCampo("fichaManaAtual"), 0, manaMax);
  const fome = limitarNumero(numeroCampo("fichaFome"), 0, 100);
  const fadiga = limitarNumero(numeroCampo("fichaFadiga"), 0, 100);

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

    const conteudo = document.getElementById("fichaConteudo");

    if (conteudo) {
      conteudo.innerHTML = montarConteudoAba(personagemFichaAtual, abaFichaAtual);
      vincularEventosFicha();
    }
  } catch (erro) {
    console.error("Erro ao salvar status da ficha:", erro);
    await mostrarModal("Erro ao salvar status da ficha.", "Erro", "danger");
  }
}

function montarBarraStatus(label, atual, maximo, percentual) {
  return `
    <div class="ficha-status-line">
      <div class="ficha-status-head">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(atual)}/${escapeHtml(maximo)}</strong>
      </div>

      <div class="ficha-status-bar">
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

function numeroCampo(id) {
  return Number(document.getElementById(id)?.value) || 0;
}

function limitarNumero(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
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

function escapeHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function aplicarEstilosFicha() {
  if (document.getElementById("fichaPersonagemStyles")) return;

  const style = document.createElement("style");
  style.id = "fichaPersonagemStyles";

  style.textContent = `
    .ficha-overlay {
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: hidden;
    }

    .ficha-shell {
      width: min(1180px, 96vw);
      max-height: 92vh;
      background:
        radial-gradient(circle at 70% 0%, rgba(255,255,255,0.07), transparent 34%),
        linear-gradient(145deg, rgba(24,24,24,0.98), rgba(9,9,9,0.98));
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 28px;
      box-shadow: 0 28px 90px rgba(0,0,0,0.72);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      color: #f4f4f5;
    }

    .ficha-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      padding: 26px 32px 22px;
      border-bottom: 1px solid rgba(255,255,255,0.10);
      flex-shrink: 0;
    }

    .ficha-title-block {
      min-width: 0;
    }

    .ficha-title-block .ficha-kicker {
      display: block;
      margin-bottom: 6px;
      color: rgba(255,255,255,0.46);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .ficha-title-block h3 {
      margin: 0;
      font-size: clamp(26px, 4vw, 38px);
      line-height: 1;
      letter-spacing: -0.04em;
      color: #fff;
    }

    .ficha-title-block p {
      margin: 10px 0 0;
      color: rgba(255,255,255,0.62);
      font-size: 16px;
      font-weight: 600;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .ficha-close {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.08);
      color: #fff;
      font-size: 34px;
      line-height: 1;
      cursor: pointer;
      transition: 0.2s ease;
      flex-shrink: 0;
    }

    .ficha-close:hover {
      background: rgba(255,255,255,0.14);
      transform: translateY(-1px);
    }

    .ficha-tabs {
      display: flex;
      gap: 10px;
      padding: 16px 32px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      overflow-x: auto;
      flex-shrink: 0;
    }

    .ficha-tabs::-webkit-scrollbar {
      height: 6px;
    }

    .ficha-tabs::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.16);
      border-radius: 999px;
    }

    .ficha-tab {
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.045);
      color: rgba(255,255,255,0.68);
      border-radius: 999px;
      padding: 10px 16px;
      font-weight: 800;
      font-size: 13px;
      white-space: nowrap;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .ficha-tab:hover {
      color: #fff;
      background: rgba(255,255,255,0.08);
    }

    .ficha-tab.active {
      color: #fff;
      background: linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08));
      border-color: rgba(255,255,255,0.24);
      box-shadow: 0 10px 24px rgba(0,0,0,0.26);
    }

    .ficha-content {
      padding: 26px 32px 34px;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;
    }

    .ficha-content::-webkit-scrollbar {
      width: 8px;
    }

    .ficha-content::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.16);
      border-radius: 999px;
    }

    .ficha-grid {
      display: grid;
      gap: 22px;
      width: 100%;
      min-width: 0;
    }

    .ficha-grid-resumo {
      grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.1fr) minmax(280px, 1fr);
      align-items: start;
    }

    .ficha-grid-duas {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }

    .ficha-card {
      min-width: 0;
      background:
        linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025));
      border: 1px solid rgba(255,255,255,0.11);
      border-radius: 24px;
      padding: 24px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }

    .ficha-card-status {
      position: sticky;
      top: 0;
    }

    .ficha-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 14px;
    }

    .ficha-card-header span {
      display: block;
      margin-bottom: 5px;
      color: rgba(255,255,255,0.42);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .ficha-card-header h4 {
      margin: 0;
      color: #fff;
      font-size: 24px;
      line-height: 1.05;
      letter-spacing: -0.035em;
    }

    .ficha-status-list {
      display: grid;
      gap: 16px;
      margin-bottom: 22px;
    }

    .ficha-status-line {
      display: grid;
      gap: 8px;
    }

    .ficha-status-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: rgba(255,255,255,0.78);
      font-size: 14px;
      font-weight: 800;
    }

    .ficha-status-head strong {
      color: #fff;
    }

    .ficha-status-bar {
      height: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .ficha-status-bar div {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(255,255,255,0.92), rgba(255,255,255,0.42));
      box-shadow: 0 0 18px rgba(255,255,255,0.16);
      transition: width 0.3s ease;
    }

    .ficha-status-editor {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-top: 18px;
    }

    .ficha-status-editor label {
      display: grid;
      gap: 7px;
      color: rgba(255,255,255,0.72);
      font-size: 13px;
      font-weight: 800;
    }

    .ficha-status-editor input {
      min-width: 0;
      width: 100%;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.42);
      color: #fff;
      padding: 12px 13px;
      font-size: 14px;
      outline: none;
    }

    .ficha-status-editor input:focus {
      border-color: rgba(255,255,255,0.32);
    }

    .ficha-save-btn {
      width: 100%;
      margin-top: 18px;
    }

    .ficha-info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .ficha-atributos-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .ficha-info {
      min-width: 0;
      border-radius: 18px;
      background: rgba(255,255,255,0.055);
      border: 1px solid rgba(255,255,255,0.10);
      padding: 16px;
    }

    .ficha-info span {
      display: block;
      margin-bottom: 8px;
      color: rgba(255,255,255,0.46);
      font-size: 13px;
      font-weight: 800;
    }

    .ficha-info strong {
      display: block;
      color: #fff;
      font-size: 20px;
      line-height: 1.15;
      word-break: break-word;
    }

    .ficha-section {
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 16px;
      margin-top: 16px;
    }

    .ficha-section:first-of-type {
      border-top: 0;
      padding-top: 0;
      margin-top: 0;
    }

    .ficha-section h5 {
      margin: 0 0 8px;
      color: #fff;
      font-size: 15px;
    }

    .ficha-section p {
      margin: 0;
      color: rgba(255,255,255,0.68);
      line-height: 1.6;
      font-size: 14px;
      word-break: break-word;
    }

    .ficha-resource-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }

    .ficha-mini-card {
      border-radius: 18px;
      padding: 16px;
      background: rgba(255,255,255,0.055);
      border: 1px solid rgba(255,255,255,0.10);
    }

    .ficha-mini-card h5 {
      margin: 0 0 8px;
      color: #fff;
      font-size: 17px;
    }

    .ficha-mini-card span {
      color: rgba(255,255,255,0.48);
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .ficha-empty {
      margin: 0;
      color: rgba(255,255,255,0.58);
      font-weight: 700;
    }

    @media (max-width: 1080px) {
      .ficha-grid-resumo {
        grid-template-columns: 1fr 1fr;
      }

      .ficha-card-status {
        position: static;
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 760px) {
      .ficha-overlay {
        padding: 10px;
      }

      .ficha-shell {
        width: 100%;
        max-height: 94vh;
        border-radius: 20px;
      }

      .ficha-topbar {
        padding: 22px;
      }

      .ficha-tabs {
        padding: 14px 22px;
      }

      .ficha-content {
        padding: 20px;
      }

      .ficha-grid-resumo,
      .ficha-grid-duas,
      .ficha-info-grid,
      .ficha-atributos-grid,
      .ficha-status-editor {
        grid-template-columns: 1fr;
      }

      .ficha-title-block h3 {
        font-size: 28px;
      }

      .ficha-card-header h4 {
        font-size: 22px;
      }
    }
  `;

  document.head.appendChild(style);
}