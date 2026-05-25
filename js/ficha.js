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

export function renderizarFicha() {
  const personagem = state.personagemAberto;

  const fichaNome = document.getElementById("fichaNome");

  if (!fichaNome) return;

  if (!personagem) {
    return;
  }

  document.getElementById("fichaNome").textContent = personagem.nome;
  document.getElementById("fichaResumo").textContent = `${personagem.classe || "Sem classe"} ${personagem.racaNome || ""}`;
  document.getElementById("fichaCampanha").textContent = `Campanha: ${personagem.campanhaNome || "Não informada"}`;

  document.getElementById("fichaHp").textContent = `${personagem.hpAtual}/${personagem.hpMax}`;
  document.getElementById("fichaMana").textContent = `${personagem.manaAtual}/${personagem.manaMax}`;
  document.getElementById("fichaFome").textContent = `${personagem.fome || 0}%`;
  document.getElementById("fichaFadiga").textContent = `${personagem.fadiga || 0}%`;

  document.getElementById("barraHp").style.width = `${calcularPercentual(personagem.hpAtual, personagem.hpMax)}%`;
  document.getElementById("barraMana").style.width = `${calcularPercentual(personagem.manaAtual, personagem.manaMax)}%`;
  document.getElementById("barraFome").style.width = `${personagem.fome || 0}%`;
  document.getElementById("barraFadiga").style.width = `${personagem.fadiga || 0}%`;

  document.getElementById("fichaDadosExtras").innerHTML = `
    <li><b>Raça:</b> ${personagem.racaNome || "Não informada"}</li>
    <li><b>Classe:</b> ${personagem.classe || "Não informada"}</li>
    <li><b>Subclasse:</b> ${personagem.subclasse || "Não informada"}</li>
    <li><b>Elemento:</b> ${personagem.elemento || "Não informado"}</li>

    <li><b>Força Física:</b> ${personagem.forcaFisica ?? personagem.forca ?? 0}</li>
    <li><b>Força Mágica:</b> ${personagem.forcaMagica ?? 0}</li>
    <li><b>Defesa Física:</b> ${personagem.defesaFisica ?? personagem.defesa ?? 0}</li>
    <li><b>Defesa Mágica:</b> ${personagem.defesaMagica ?? 0}</li>
    <li><b>Velocidade:</b> ${personagem.velocidade ?? 0}</li>
    <li><b>Resistência:</b> ${personagem.resistencia ?? 0}</li>
    <li><b>Carisma:</b> ${personagem.carisma ?? 0}</li>
    <li><b>Fator Medo:</b> ${personagem.fatorMedo ?? 0}</li>

    <li><b>Vantagens/Bônus:</b> ${personagem.vantagens || "Não informado"}</li>
    <li><b>Desvantagens/Penalidades:</b> ${personagem.desvantagens || "Não informado"}</li>
    <li><b>Classes Sugeridas:</b> ${personagem.classesSugeridas || "Não informado"}</li>
    <li><b>Elementos Afins:</b> ${personagem.elementosAfins || "Não informado"}</li>
    <li><b>Habilidade Exclusiva:</b> ${personagem.habilidadeExclusiva || "Não informado"}</li>
    <li><b>Restrição de Classe:</b> ${personagem.restricaoClasse || "Não informado"}</li>
  `;

  document.getElementById("fichaHistoria").textContent = personagem.historia || "Sem história cadastrada.";
}

export function initFicha() {
  onPageLoaded((pagina) => {
    if (pagina === "ficha") {
      renderizarFicha();
    }
  });
}