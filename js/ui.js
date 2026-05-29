export function mostrarModal(mensagem, titulo = "Aviso", tipo = "info") {
  return new Promise((resolve) => {
    const modalExistente = document.querySelector(".app-modal-overlay");

    if (modalExistente) {
      modalExistente.remove();
    }

    const overlay = document.createElement("div");
    overlay.className = "app-modal-overlay";

    overlay.innerHTML = `
      <div class="app-modal">
        <div class="app-modal-icon ${tipo}">
          ${tipo === "danger" ? "!" : tipo === "success" ? "✓" : "i"}
        </div>

        <h3>${titulo}</h3>
        <p>${mensagem}</p>

        <div class="app-modal-actions">
          <button class="primary-btn" id="modalOkButton">Entendi</button>
        </div>
      </div>
    `;

    aplicarEstilosModal(overlay);

    document.body.appendChild(overlay);

    const botao = document.getElementById("modalOkButton");

    botao.addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });
  });
}

export function confirmarModal({
  titulo = "Confirmar ação",
  mensagem = "Tem certeza que deseja continuar?",
  confirmarTexto = "Confirmar",
  cancelarTexto = "Cancelar",
  tipo = "danger"
}) {
  return new Promise((resolve) => {
    const modalExistente = document.querySelector(".app-modal-overlay");

    if (modalExistente) {
      modalExistente.remove();
    }

    const overlay = document.createElement("div");
    overlay.className = "app-modal-overlay";

    overlay.innerHTML = `
      <div class="app-modal">
        <div class="app-modal-icon ${tipo}">
          ${tipo === "danger" ? "!" : tipo === "success" ? "✓" : "i"}
        </div>

        <h3>${titulo}</h3>
        <p>${mensagem}</p>

        <div class="app-modal-actions">
          <button class="secondary-btn" id="modalCancelButton">${cancelarTexto}</button>
          <button class="small-btn danger" id="modalConfirmButton">${confirmarTexto}</button>
        </div>
      </div>
    `;

    aplicarEstilosModal(overlay);

    document.body.appendChild(overlay);

    document.getElementById("modalCancelButton").addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });

    document.getElementById("modalConfirmButton").addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });
  });
}

export function protegerModalContraCliqueFora(overlay, fecharCallback) {
  if (!overlay) return;

  overlay.dataset.protegerCliqueFora = "true";

  overlay.addEventListener("click", async (event) => {
    if (event.target !== overlay) return;

    event.preventDefault();
    event.stopPropagation();

    const confirmarSaida = await confirmarModal({
      titulo: "Sair sem salvar?",
      mensagem: "Deseja realmente sair? As informações não salvas serão perdidas.",
      confirmarTexto: "Sair",
      cancelarTexto: "Continuar editando",
      tipo: "danger"
    });

    if (!confirmarSaida) return;

    if (typeof fecharCallback === "function") {
      fecharCallback();
      return;
    }

    overlay.remove();
  });
}

function aplicarEstilosModal(overlay) {
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0, 0, 0, 0.68)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";
  overlay.style.padding = "20px";

  const modal = overlay.querySelector(".app-modal");

  modal.style.width = "100%";
  modal.style.maxWidth = "430px";
  modal.style.background = "var(--surface)";
  modal.style.border = "1px solid var(--border)";
  modal.style.borderRadius = "22px";
  modal.style.padding = "26px";
  modal.style.boxShadow = "0 24px 70px rgba(0, 0, 0, 0.45)";
  modal.style.textAlign = "center";

  const icon = overlay.querySelector(".app-modal-icon");

  icon.style.width = "54px";
  icon.style.height = "54px";
  icon.style.borderRadius = "50%";
  icon.style.display = "flex";
  icon.style.alignItems = "center";
  icon.style.justifyContent = "center";
  icon.style.margin = "0 auto 14px";
  icon.style.fontSize = "28px";
  icon.style.fontWeight = "bold";

  if (icon.classList.contains("danger")) {
    icon.style.background = "#3f1d1d";
    icon.style.color = "#fca5a5";
    icon.style.border = "1px solid #7f1d1d";
  } else if (icon.classList.contains("success")) {
    icon.style.background = "#14351f";
    icon.style.color = "#86efac";
    icon.style.border = "1px solid #166534";
  } else {
    icon.style.background = "#2c2244";
    icon.style.color = "var(--purple-soft)";
    icon.style.border = "1px solid #4c3578";
  }

  const title = overlay.querySelector(".app-modal h3");
  title.style.margin = "0 0 10px";
  title.style.fontSize = "22px";

  const paragraph = overlay.querySelector(".app-modal p");
  paragraph.style.margin = "0";
  paragraph.style.color = "var(--muted)";
  paragraph.style.lineHeight = "1.5";

  const actions = overlay.querySelector(".app-modal-actions");
  actions.style.display = "flex";
  actions.style.flexWrap = "wrap";
  actions.style.justifyContent = "center";
  actions.style.gap = "10px";
  actions.style.marginTop = "22px";
}