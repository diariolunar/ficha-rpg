# Ficha RPG

Sistema web estático para gerenciar campanhas, personagens, fichas, cadastros base e área do mestre.

## Como rodar localmente

O projeto carrega páginas HTML com `fetch()`, então abra por um servidor local em vez de abrir `index.html` direto pelo navegador.

Com Node.js instalado:

```bash
npx http-server . -p 8000
```

Depois acesse:

```text
http://127.0.0.1:8000
```

O app usa Firebase Authentication e Firestore configurados em `js/firebase.js`.
