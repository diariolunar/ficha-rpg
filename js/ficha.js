import {
  db,
  doc,
  updateDoc,
  serverTimestamp
} from "./firebase.js";

import { mostrarModal } from "./ui.js";

let personagemFichaAtual = null;

export function initFicha() {
  // Mantém compatibilidade com o app.js.
  // A ficha é aberta diretamente pela função abrirFichaPersonagem().
}

export function abrirFichaPersonagem(personagem) {
  personagemFichaAtual = personagem;

  fecharFichaPersonagem();

  const overlay = document.createElement("div");
  overlay.className = "crud-form-overlay";
  overlay.id = "modalFichaPersonagem";

  overlay.innerHTML = `
    <div class="crud-form-modal ficha-modal">
      <div class="crud-form-header">
        <div>
          <h3>${escapeHtml(personagem.nome || "Ficha do Personagem")}</h3>
          <p>${escapeHtml(personagem.raca?.nome || personagem.racaNome || "Raça não informada")} • ${escapeHtml(personagem.classe?.nome || personagem.classeNome || "Classe não informada")} • Nível ${personagem.nivel || 1}</p>
        </div>

        <button class="crud-form-close" type="button" id="fecharFichaPersonagem">×</button>
      </div>

      <div class="crud-form-body">
        ${montarFichaPersonagem(personagem)}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fecharFichaPersonagem")?.addEventListener("click", fecharFichaPersonagem);
  document.getElementById("salvarStatusFicha")?.addEventListener("click", salvarStatusFicha);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      fecharFichaPersonagem();
    }
  });
}

function fecharFichaPersonagem() {
  const overlay = document.getElementById("modalFichaPersonagem");

  if (overlay) {
    overlay.remove();
  }
}

function montarFichaPersonagem(personagem) {
  const hpPercentual = calcularPercentual(personagem.hpAtual, personagem.hpMax);
  const manaPercentual = calcularPercentual(personagem.manaAtual, personagem.manaMax);
  const fomePercentual = Number(personagem.fome || 0);
  const fadigaPercentual = Number(personagem.fadiga || 0);

  return `
    <div class="ficha-layout">
      <div class="detail-card">
        <h3>Status principais</h3>

        <div class="status-stack">
          ${montarBarraStatus("HP", personagem.hpAtual || 0, personagem.hpMax || 0, hpPercentual)}
          ${montarBarraStatus("Mana", personagem.manaAtual || 0, personagem.manaMax || 0, manaPercentual)}
          ${montarBarraStatus("Fome", personagem.fome || 0, 100, fomePercentual)}
          ${montarBarraStatus("Fadiga", personagem.fadiga || 0, 100, fadigaPercentual)}
        </div>

        <div class="form-grid">
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

        <button class="primary-btn" type="button" id="salvarStatusFicha">Salvar status</button>
      </div>

      <div class="detail-card">
        <h3>Identidade</h3>

        <div class="detail-grid">
          <div class="detail-item"><span>Jogador</span><strong>${escapeHtml(personagem.donoNome || "Não informado")}</strong></div>
          <div class="detail-item"><span>Campanha</span><strong>${escapeHtml(personagem.campanhaNome || "Sem campanha")}</strong></div>
          <div class="detail-item"><span>Raça</span><strong>${escapeHtml(personagem.raca?.nome || personagem.racaNome || "Não informada")}</strong></div>
          <div class="detail-item"><span>Classe</span><strong>${escapeHtml(personagem.classe?.nome || personagem.classeNome || "Não informada")}</strong></div>
          <div class="detail-item"><span>Subclasse</span><strong>${escapeHtml(personagem.subclasse?.nome || personagem.subclasseNome || "Não informada")}</strong></div>
          <div class="detail-item"><span>Elemento</span><strong>${escapeHtml(personagem.elemento?.nome || personagem.elementoNome || "Não informado")}</strong></div>
        </div>
      </div>

      <div class="detail-card">
        <h3>Atributos</h3>

        <div class="detail-grid">
          <div class="detail-item"><span>Força Física</span><strong>${personagem.forcaFisica || 0}</strong></div>
          <div class="detail-item"><span>Força Mágica</span><strong>${personagem.forcaMagica || 0}</strong></div>
          <div class="detail-item"><span>Defesa Física</span><strong>${personagem.defesaFisica || 0}</strong></div>
          <div class="detail-item"><span>Defesa Mágica</span><strong>${personagem.defesaMagica || 0}</strong></div>
          <div class="detail-item"><span>Velocidade</span><strong>${personagem.velocidade || 0}</strong></div>
          <div class="detail-item"><span>Resistência</span><strong>${personagem.resistencia || 0}</strong></div>
        </div>

        <div class="detail-section">
          <h4>Carisma</h4>
          <p>${escapeHtml(personagem.carismaBonus || "Não informado")}</p>
        </div>

        <div class="detail-section">
          <h4>Fator Medo</h4>
          <p>${escapeHtml(personagem.fatorMedoBonus || "Não informado")}</p>
        </div>
      </div>

      <div class="detail-card">
        <h3>Habilidades</h3>
        ${montarHabilidades(personagem)}
      </div>

      <div class="detail-card">
        <h3>Itens</h3>
        ${montarItens(personagem)}
      </div>

      <div class="detail-card">
        <h3>Pet</h3>
        ${montarPet(personagem)}
      </div>

      <div class="detail-card">
        <h3>Vantagens e Desvantagens</h3>

        <div class="detail-section">
          <h4>Vantagens da Raça</h4>
          <p>${escapeHtml(personagem.vantagensRaca || "Não informado")}</p>
        </div>

        <div class="detail-section">
          <h4>Desvantagens da Raça</h4>
          <p>${escapeHtml(personagem.desvantagensRaca || "Não informado")}</p>
        </div>

        <div class="detail-section">
          <h4>Vantagens da Classe</h4>
          <p>${escapeHtml(personagem.vantagensClasse || "Não informado")}</p>
        </div>

        <div class="detail-section">
          <h4>Desvantagens da Classe</h4>
          <p>${escapeHtml(personagem.desvantagensClasse || "Não informado")}</p>
        </div>
      </div>

      <div class="detail-card">
        <h3>História / Descrição</h3>
        <p>${escapeHtml(personagem.historia || "Nenhuma história cadastrada.")}</p>
      </div>
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
    return `<p>Nenhuma habilidade cadastrada para este personagem.</p>`;
  }

  return `
    <div class="resource-list">
      ${habilidades
        .map((habilidade) => {
          return `
            <div class="resource-card">
              <div class="resource-card-header">
                <h4>${escapeHtml(habilidade.nome || "Habilidade sem nome")}</h4>
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
    return `<p>Nenhum item cadastrado para este personagem.</p>`;
  }

  return `
    <div class="resource-list">
      ${itens
        .map((item) => {
          return `
            <div class="resource-card">
              <div class="resource-card-header">
                <h4>${escapeHtml(item.nome || "Item sem nome")}</h4>
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
    return `<p>Nenhum pet vinculado a este personagem.</p>`;
  }

  return `
    <div class="detail-grid">
      <div class="detail-item"><span>Nome</span><strong>${escapeHtml(pet.nome || "Sem nome")}</strong></div>
      <div class="detail-item"><span>Espécie</span><strong>${escapeHtml(pet.especie || "Não informado")}</strong></div>
      <div class="detail-item"><span>Rank</span><strong>${escapeHtml(pet.rank || "Não informado")}</strong></div>
      <div class="detail-item"><span>Elemento Afim</span><strong>${escapeHtml(pet.elementoAfim || "Não informado")}</strong></div>
    </div>

    <div class="detail-section">
      <h4>Habilidades</h4>
      <p>${escapeHtml(formatarValor(pet.habilidades))}</p>
    </div>

    <div class="detail-section">
      <h4>Bônus ao Dono</h4>
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

    abrirFichaPersonagem(personagemFichaAtual);
  } catch (erro) {
    console.error("Erro ao salvar status da ficha:", erro);
    await mostrarModal("Erro ao salvar status da ficha.", "Erro", "danger");
  }
}

function montarBarraStatus(label, atual, maximo, percentual) {
  return `
    <div class="status-line">
      <div>
        <span>${label}</span>
        <strong>${atual}/${maximo}</strong>
      </div>

      <div class="status-bar">
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