# Slide interattiva — Regressione lineare

Pagina web statica (HTML/CSS/JS) con Reveal.js, Plotly.js e KaTeX.

## Apertura locale

Metodo consigliato (serve i file via HTTP locale per evitare blocchi CORS):

```bash
npx serve .
```

oppure

```bash
python3 -m http.server 8000
```

poi apri `http://localhost:8000` (o `http://localhost:3000` con `serve`).

In alternativa, apri direttamente `index.html` nel browser (doppio clic). Alcune funzioni potrebbero richiedere un server locale.

## Hosting su GitHub Pages

1. Crea un repository GitHub e carica `index.html` e `README.md` nella root.
2. In **Settings → Pages**, seleziona il branch (es. `main`) e la cartella `/ (root)`.
3. Salva: il sito sarà su `https://<utente>.github.io/<repo>/`.

Non sono richiesti build step: tutto è caricato da CDN.

## Interazione

- Click sullo scatterplot aggiunge un punto `(x, y)`.
- Slider `a` e `b` modificano la retta e aggiornano la superficie MSE.
- Pulsante **Ottimizza** calcola i coefficienti dei minimi quadrati.
- Pulsante **Reset** ripristina la situazione iniziale.
- Drag sul grafico 3D ruota la superficie MSE.
