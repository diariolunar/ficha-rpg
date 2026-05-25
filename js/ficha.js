import {
  db,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "./firebase.js";

import { state, setPersonagemAberto } from "./state.js";
import { navegarPara, onPageLoaded } from "./navigation.js";
import { mostrarModal, confirmarModal } from "./ui.js";

let unsubscribeFicha = null;

export function abrirFichaPersonagem(personagem) {
  setPersonagemAberto(personagem);
  navegarPara("ficha");
}

function calcularPercentual(atual, maximo) {
  if (!maximo || maximo <= 0) return 0;
  return Math.max(0, Math.min(100, (atual / maximo) * 100));
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
    resistencia: "Resistência",
    carisma: "Carisma",
    fatorMedo: "Fator Medo"
  };

  return mapa[valor] || "Não informado";
}

function nomeDoObjeto(objeto, fallback = "Não informado") {
  if (!objeto) return fallback;

  if (typeof objeto === "string") return objeto;

  return objeto.nome || fallback;
}

function montarListaHabilidades(personagem) {
  const habilidades = [];

  if (personagem.habilidadeExclusivaRaca?.nome) {
    habilidades.push({
      ...personagem.habilidadeExclusivaRaca,
      origem: "Raça"
    });
  }

  if (personagem.habilidadeExclusivaClasse?.nome) {
    habilidades.push({
      ...personagem.habilidadeExclusivaClasse,
      origem: "Classe"
    });
  }

  (personagem.habilidadesIniciais || []).forEach((habilidade) => {
    habilidades.push({
      ...habilidade,
      origem: "Inicial"
    });
  });

  if (habilidades.length === 0) {
    return "<li>Nenhuma habilidade adicionada.</li>";
  }

  return habilidades.map((habilidade) => {
    const cooldownAtual = personagem.cooldowns?.[habilidade.id] || 0;

    return `
      <li>
        <b>${habilidade.nome}</b> <small>(${habilidade.origem})</small>
        ${cooldownAtual > 0 ? `<br><small>Cooldown: ${cooldownAtual} turno(s)</small>` : ""}
        <br>
        <button class="small-btn usar-habilidade" data-id="${habilidade.id}" data-nome="${habilidade.nome}">Usar habilidade</button>
      </li>
    `;
  }).join("");
}

function montarListaItens(personagem) {
  const itens = personagem.itensIniciais || [];

  if (itens.length === 0) {
    return "<li>Nenhum item adicionado.</li>";
  }

  return itens.map((item) => {
    return `
      <li>
        <b>${item.nome}</b>
        <br>
        <button class="small-btn usar-item" data-id="${item.id}" data-nome="${item.nome}">Usar item</button>
      </li>
    `;
  }).join("");
}

async function usarHabilidade(id, nome) {
  const personagem = state.personagemAberto;

  if (!personagem?.id) return;

  const cooldownAtual = personagem.cooldowns?.[id] || 0;

  if (cooldownAtual > 0) {
    await mostrarModal(`A habilidade "${nome}" ainda está em cooldown por ${cooldownAtual} turno(s).`, "Cooldown ativo");
    return;
  }

  const custoPadrao = 0;
  const cooldownPadrao = 1;

  if ((personagem.manaAtual || 0) < custoPadrao) {
    await mostrarModal("Mana insuficiente para usar esta habilidade.", "Mana insuficiente", "danger");
    return;
  }

  const confirmar = await confirmarModal({
    titulo: "Usar habilidade",
    mensagem: `Deseja usar a habilidade "${nome}"?`,
    confirmarTexto: "Usar",
    cancelarTexto: "Cancelar",
    tipo: "info"
  });

  if (!confirmar) return;

  const novosCooldowns = {
    ...(personagem.cooldowns || {}),
    [id]: cooldownPadrao
  };

  await updateDoc(doc(db, "personagens", personagem.id), {
    manaAtual: Math.max(0, (personagem.manaAtual || 0) - custoPadrao),
    cooldowns: novosCooldowns,
    ultimaAcao: `Usou a habilidade ${nome}`,
    atualizadoEm: serverTimestamp()
  });

  await mostrarModal(`Habilidade "${nome}" usada.`, "Ação registrada", "success");
}

async function usarItem(id, nome) {
  const personagem = state.personagemAberto;

  if (!personagem?.id) return;

  const confirmar = await confirmarModal({
    titulo: "Usar item",
    mensagem: `Deseja usar o item "${nome}"?`,
    confirmarTexto: "Usar",
    cancelarTexto: "Cancelar",
    tipo: "info"
  });

  if (!confirmar) return;

  await updateDoc(doc(db, "personagens", personagem.id), {
    ultimaAcao: `Usou o item ${nome}`,
    atualizadoEm: serverTimestamp()
  });

  await mostrarModal(`Item "${nome}" usado.`, "Ação registrada", "success");
}

function vincularAcoesFicha() {
  document.querySelectorAll(".usar-habilidade").forEach((botao) => {
    botao.addEventListener("click", () => {
      usarHabilidade(botao.dataset.id, botao.dataset.nome);
    });
  });

  document.querySelectorAll(".usar-item").forEach((botao) => {
    botao.addEventListener("click", () => {
      usarItem(botao.dataset.id, botao.dataset.nome);
    });
  });
}

export function renderizarFicha() {
  const personagem = state.personagemAberto;

  const fichaNome = document.getElementById("fichaNome");

  if (!fichaNome) return;

  if (!personagem) {
    return;
  }

  const avisoPossessao = document.getElementById("avisoPossessao");

  if (avisoPossessao) {
    if (personagem.posse?.ativa) {
      avisoPossessao.classList.remove("hidden");
    } else {
      avisoPossessao.classList.add("hidden");
    }
  }

  const raca = personagem.raca || null;
  const classe = personagem.classe || null;
  const subclasse = personagem.subclasse || null;
  const elemento = personagem.elemento || null;
  const pet = personagem.pet || null;

  const racaNome = nomeDoObjeto(raca, personagem.racaNome || "Não informada");
  const classeNome = nomeDoObjeto(classe, personagem.classeNome || personagem.classe || "Sem classe");
  const subclasseNome = nomeDoObjeto(subclasse, personagem.subclasseNome || personagem.subclasse || "Não informada");
  const elementoNome = nomeDoObjeto(elemento, personagem.elementoNome || personagem.elemento || "Não informado");

  document.getElementById("fichaNome").textContent = personagem.nome;
  document.getElementById("fichaResumo").textContent = `${classeNome} ${racaNome}`;
  document.getElementById("fichaCampanha").textContent = `Campanha: ${personagem.campanhaNome || "Não informada"}`;

  document.getElementById("fichaHp").textContent = `${personagem.hpAtual}/${personagem.hpMax}`;
  document.getElementById("fichaMana").textContent = `${personagem.manaAtual}/${personagem.manaMax}`;
  document.getElementById("fichaFome").textContent = `${personagem.fome || 0}%`;
  document.getElementById("fichaFadiga").textContent = `${personagem.fadiga || 0}%`;

  document.getElementById("barraHp").style.width = `${calcularPercentual(personagem.hpAtual, personagem.hpMax)}%`;
  document.getElementById("barraMana").style.width = `${calcularPercentual(personagem.manaAtual, personagem.manaMax)}%`;
  document.getElementById("barraFome").style.width = `${personagem.fome || 0}%`;
  document.getElementById("barraFadiga").style.width = `${personagem.fadiga || 0}%`;

  document.getElementById("fichaIdentidade").innerHTML = `
    <li><b>Nível:</b> ${personagem.nivel || 1}</li>
    <li><b>Jogador:</b> ${personagem.donoNome || "Não informado"}</li>
    <li><b>Raça:</b> ${racaNome}</li>
    <li><b>Classe:</b> ${classeNome}</li>
    <li><b>Subclasse:</b> ${subclasseNome}</li>
    <li><b>Elemento:</b> ${elementoNome}</li>
    <li><b>Última ação:</b> ${personagem.ultimaAcao || "Nenhuma ação registrada"}</li>
  `;

  document.getElementById("fichaAtributos").innerHTML = `
    <li><b>Força Física:</b> ${personagem.forcaFisica ?? personagem.forca ?? 0}</li>
    <li><b>Força Mágica:</b> ${personagem.forcaMagica ?? 0}</li>
    <li><b>Defesa Física:</b> ${personagem.defesaFisica ?? personagem.defesa ?? 0}</li>
    <li><b>Defesa Mágica:</b> ${personagem.defesaMagica ?? 0}</li>
    <li><b>Velocidade:</b> ${personagem.velocidade ?? 0}</li>
    <li><b>Resistência:</b> ${personagem.resistencia ?? 0}</li>
    <li><b>Carisma:</b> ${personagem.carismaBonus || "Não informado"}</li>
    <li><b>Fator Medo:</b> ${personagem.fatorMedoBonus || "Não informado"}</li>
  `;

  document.getElementById("fichaRaca").innerHTML = `
    <li><b>Nome:</b> ${racaNome}</li>
    <li><b>Vantagens/Bônus:</b> ${personagem.vantagensRaca || personagem.vantagens || raca?.vantagens || "Não informado"}</li>
    <li><b>Desvantagens/Penalidades:</b> ${personagem.desvantagensRaca || personagem.desvantagens || raca?.desvantagens || "Não informado"}</li>
    <li><b>Classes Sugeridas:</b> ${formatarListaObjetos(personagem.classesSugeridas || raca?.classesSugeridas)}</li>
    <li><b>Elementos Afins:</b> ${formatarListaObjetos(personagem.elementosAfins || raca?.elementosAfins)}</li>
    <li><b>Habilidade Exclusiva:</b> ${personagem.habilidadeExclusivaRaca?.nome || raca?.habilidadeExclusiva?.nome || "Não informado"}</li>
    <li><b>Restrição de Classe:</b> ${formatarListaObjetos(personagem.restricoesClasse || raca?.restricoesClasse)}</li>
  `;

  document.getElementById("fichaClasse").innerHTML = `
    <li><b>Classe:</b> ${classeNome}</li>
    <li><b>Subclasse:</b> ${subclasseNome}</li>
    <li><b>HP por Nível:</b> ${classe?.hpPorNivel ?? "Não informado"}</li>
    <li><b>Mana por Nível:</b> ${classe?.manaPorNivel ?? "Não informado"}</li>
    <li><b>Atributo Principal:</b> ${formatarAtributo(classe?.atributoPrincipal)}</li>
    <li><b>Atributo Secundário:</b> ${formatarAtributo(classe?.atributoSecundario)}</li>
    <li><b>Tipo de Dano:</b> ${classe?.tipoDano || "Não informado"}</li>
    <li><b>Tipo de Defesa:</b> ${classe?.tipoDefesa || "Não informado"}</li>
    <li><b>Armas Permitidas:</b> ${classe?.armasPermitidas || "Não informado"}</li>
    <li><b>Armaduras Permitidas:</b> ${classe?.armadurasPermitidas || "Não informado"}</li>
    <li><b>Habilidade Exclusiva:</b> ${personagem.habilidadeExclusivaClasse?.nome || classe?.habilidadeExclusiva?.nome || "Não informado"}</li>
    <li><b>Vantagens:</b> ${personagem.vantagensClasse || classe?.vantagens || "Não informado"}</li>
    <li><b>Desvantagens:</b> ${personagem.desvantagensClasse || classe?.desvantagens || "Não informado"}</li>
  `;

  document.getElementById("fichaElemento").innerHTML = `
    <li><b>Nome:</b> ${elementoNome}</li>
    <li><b>Tipo:</b> ${elemento?.tipo || "Não informado"}</li>
    <li><b>Natureza:</b> ${elemento?.natureza || "Não informado"}</li>
    <li><b>Dano Base:</b> ${elemento?.danoBase ?? "Não informado"}</li>
    <li><b>Efeito Principal:</b> ${elemento?.efeitoPrincipal || "Não informado"}</li>
    <li><b>Status Causado:</b> ${elemento?.statusCausado || "Não informado"}</li>
    <li><b>Custo de Mana Médio:</b> ${elemento?.custoManaMedio ?? "Não informado"}</li>
    <li><b>Risco/Consequência:</b> ${elemento?.riscoConsequencia || "Não informado"}</li>
  `;

  document.getElementById("fichaHabilidades").innerHTML = montarListaHabilidades(personagem);
  document.getElementById("fichaItens").innerHTML = montarListaItens(personagem);

  document.getElementById("fichaPet").innerHTML = pet
    ? `
      <li><b>Nome:</b> ${pet.nome || "Não informado"}</li>
      <li><b>Espécie:</b> ${pet.especie || "Não informado"}</li>
      <li><b>Rank:</b> ${pet.rank || "Não informado"}</li>
      <li><b>Tipo de Suporte:</b> ${pet.tipoSuporte || "Não informado"}</li>
      <li><b>Elemento Afim:</b> ${pet.elementoAfim?.nome || "Não informado"}</li>
      <li><b>Bônus ao Dono:</b> ${pet.bonusDono || "Não informado"}</li>
    `
    : `<li>Nenhum pet selecionado.</li>`;

  document.getElementById("fichaHistoria").textContent = personagem.historia || "Sem história cadastrada.";

  vincularAcoesFicha();
}

function iniciarEscutaFicha() {
  if (unsubscribeFicha) {
    unsubscribeFicha();
    unsubscribeFicha = null;
  }

  const personagem = state.personagemAberto;

  if (!personagem?.id) {
    renderizarFicha();
    return;
  }

  unsubscribeFicha = onSnapshot(doc(db, "personagens", personagem.id), (snapshot) => {
    if (!snapshot.exists()) return;

    setPersonagemAberto({
      id: snapshot.id,
      ...snapshot.data()
    });

    renderizarFicha();
  });
}

export function initFicha() {
  onPageLoaded((pagina) => {
    if (pagina === "ficha") {
      iniciarEscutaFicha();
    } else if (unsubscribeFicha) {
      unsubscribeFicha();
      unsubscribeFicha = null;
    }
  });
}