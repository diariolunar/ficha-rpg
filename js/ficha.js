import { state, setPersonagemAberto } from "./state.js";
import { navegarPara, onPageLoaded } from "./navigation.js";

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

function montarListaSimples(lista, mensagemVazia = "Nenhum item informado.") {
  if (!Array.isArray(lista) || lista.length === 0) {
    return `<li>${mensagemVazia}</li>`;
  }

  return lista.map((item) => `<li>${item.nome || item}</li>`).join("");
}

function nomeDoObjeto(objeto, fallback = "Não informado") {
  if (!objeto) return fallback;

  if (typeof objeto === "string") return objeto;

  return objeto.nome || fallback;
}

export function renderizarFicha() {
  const personagem = state.personagemAberto;

  const fichaNome = document.getElementById("fichaNome");

  if (!fichaNome) return;

  if (!personagem) {
    return;
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

  const habilidadesBase = [];

  if (personagem.habilidadeExclusivaRaca?.nome) {
    habilidadesBase.push({
      nome: `Raça: ${personagem.habilidadeExclusivaRaca.nome}`
    });
  }

  if (personagem.habilidadeExclusivaClasse?.nome) {
    habilidadesBase.push({
      nome: `Classe: ${personagem.habilidadeExclusivaClasse.nome}`
    });
  }

  const habilidades = [
    ...habilidadesBase,
    ...(personagem.habilidadesIniciais || [])
  ];

  document.getElementById("fichaHabilidades").innerHTML = montarListaSimples(
    habilidades,
    "Nenhuma habilidade adicionada."
  );

  document.getElementById("fichaItens").innerHTML = montarListaSimples(
    personagem.itensIniciais,
    "Nenhum item adicionado."
  );

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
}

export function initFicha() {
  onPageLoaded((pagina) => {
    if (pagina === "ficha") {
      renderizarFicha();
    }
  });
}