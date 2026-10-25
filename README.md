# Un esempio di strumento pedagogico alternativo

Presentazione Reveal.js con slide Markdown e un simulatore interattivo del Teorema del Limite Centrale. Tutte le librerie sono locali: dopo il download del progetto non serve una connessione Internet.

## Avvio

Dalla cartella del progetto, con Python 3:

```sh
python3 present.py
```

Apri <http://localhost:8000>. Per provarla da smartphone sulla stessa rete, apri `http://IP-DEL-COMPUTER:8000`. Puoi cambiare porta con `--port 8080`. Il server si ferma con Ctrl+C. È necessario il server: il doppio clic su `index.html` non consente il caricamento dei Markdown.

## Slide interattiva: Regressione lineare

Apri <http://localhost:8000/#/6> per andare direttamente alla regressione (`slide/07-regressione.md`). La slide usa `regression.js`, `regression.css` e il KaTeX locale: funziona anche offline dopo il download. Per GitHub Pages includi anche questi due nuovi file e aggiorna l’elenco con `python3 present.py build`; il link relativo è `#/6` nell’ordine attuale.

- Clicca o tocca lo scatterplot per aggiungere dati; clicca o tocca un punto per eliminarlo. Le linee tratteggiate indicano gli scarti verticali dalla retta.
- Gli slider modificano i coefficienti, la retta, il MSE e il punto rosso sulla superficie. I cinque dati iniziali sono `(1, 2), (3, 3.8), (5, 4.2), (7, 7.4), (9, 8)`; la retta iniziale ha `a = −0.4`, `b = 6`.
- **Ottimizza** calcola la soluzione esatta dei minimi quadrati e anima il passaggio per 900 ms. È un’interpolazione verso la soluzione, non una discesa del gradiente. La preferenza di sistema per ridurre le animazioni viene rispettata.
- Gli assi dello scatterplot restano nell’intervallo `[0, 10]`. Gli intervalli iniziali dei coefficienti sono `a ∈ [−2, 3]`, `b ∈ [−4, 8]`; si ampliano soltanto se Ottimizza deve raggiungere una soluzione esterna. La superficie rappresenta gli intervalli correnti degli slider; l’asse MSE si adatta ai dati.
- Trascina la superficie con mouse o dito per ruotarla. Il punto rosso rimane visibile anche quando la superficie lo coprirebbe. La sua altezza è il MSE corrente.
- **Reset** ripristina dati, coefficienti, intervalli e vista 3D. Senza dati il MSE è non definito e Ottimizza è disabilitato. Con un solo punto o ascisse tutte uguali il minimo non è unico: viene scelta la retta orizzontale alla media delle ordinate.

Su smartphone i pannelli si dispongono uno sotto l’altro. Scorri fuori dai grafici per raggiungere tutti i controlli; i gesti sui grafici e sugli slider non cambiano slide. Da tastiera, Tab raggiunge grafici e controlli: nello scatterplot le frecce spostano il cursore, Maiusc aumenta il passo, Invio aggiunge e Canc elimina il punto vicino. Sulla superficie le frecce ruotano la vista.

Verifiche dedicate: `node --test tests/regression.test.cjs`; per i controlli desktop e touch, `node tests/regression-browser.cjs /percorso/al/modulo/playwright` (richiede Chromium installato da Playwright).

## Scrivere e ordinare le slide

Modifica direttamente i file in `slide/`:

- `01-title.md`: titolo della presentazione.
- `02-tlc.md`: struttura HTML del simulatore, inclusi tutti i suoi div.
- `03-next_slide.md`: contenuto segnaposto e un esempio di approfondimento verticale.

L’ordine segue i nomi dei file, con ordinamento numerico naturale: 2 precede 10. Per aggiungere una slide crea un altro file `.md`; per riordinare rinominalo; per rimuoverlo cancellalo. Con il server `present.py` basta ricaricare la pagina, senza aggiornare elenchi a mano. I file devono trovarsi direttamente in `slide/`.

Ogni file occupa una posizione **orizzontale**. Una riga `---` separa le slide **verticali** all’interno dello stesso file:

```markdown
# Titolo

Un paragrafo con **grassetto** e *corsivo*.

- Un punto
- Un altro punto

---

## Approfondimento verticale

Altro contenuto.
```

Puoi inserire HTML direttamente nel Markdown. Nel TLC modifica liberamente testi e struttura, conservando gli `id`, gli attributi `data-*` e le classi utilizzate da `app.js` e `styles.css`. Le formule statiche sono negli attributi `data-latex`; quelle calcolate sono in `app.js`. Il simulatore TLC può essere presente una sola volta, perché i controlli hanno identificatori univoci. Per immagini e link locali usa percorsi relativi a `index.html`, per esempio `immagini/esempio.png`.

I `div` delle slide di contenuto ereditano font, dimensione e interlinea della slide. Per far apparire un testo al passo successivo aggiungi `class="fragment"`:

```html
<div class="fragment"><strong>Problema:</strong> Non sono uno sviluppatore Front-End.</div>
```

Su desktop premi Spazio o freccia destra; su smartphone fai un gesto verso l’alto. Ogni passo rivela un frammento prima di cambiare slide. Dentro un blocco HTML usa `<strong>` per il grassetto: `**testo**` non viene interpretato come Markdown.

## Navigazione e smartphone

Le frecce destra/sinistra cambiano file; su/giù passano tra le slide dello stesso file. I pulsanti di navigazione sullo schermo sono nascosti. L’indirizzo conserva la posizione della slide e può essere condiviso.

Fino a 760 px di larghezza la presentazione passa alla modalità verticale di Reveal.js: scorri con il dito per passare da una slide all’altra, comprese le slide che su desktop sono organizzate in verticale. Un gesto verticale passa alla slide successiva o precedente, con aggancio alla pagina intera (`scrollSnap: mandatory`), una slide alla volta. I piccoli movimenti sotto 45 px non cambiano slide.

Il testo si adatta alla larghezza e i pannelli TLC diventano una colonna. La slide TLC scorre al suo interno per rendere raggiungibili tutti i pannelli; arrivato in fondo, continua il gesto verso l’alto per almeno 45 px, oppure fai un nuovo gesto, per passare alla slide successiva. In cima, il gesto verso il basso torna alla precedente. I gesti sul grafico modificano la densità; la pressione prolungata su Campiona genera campioni. Anche su desktop le slide più lunghe della finestra sono scorrevoli. Il passaggio tra layout mobile e desktop conserva i dati e i controlli del simulatore.

## Pubblicazione statica

Prima di pubblicare, dopo aver aggiunto, rimosso o rinominato file:

```sh
python3 present.py build
```

Il comando aggiorna `slide/index.json`, l’elenco necessario sui server statici. Non compila i contenuti: puoi continuare a modificare il testo Markdown direttamente. Pubblica `index.html`, `presentation.js`, `presentation.css`, `app.js`, `math.js`, `styles.css`, `regression.js`, `regression.css`, `slide/`, `assets/` e `vendor/`, mantenendo la struttura. Su GitHub Pages puoi pubblicare dalla radice del branch. Python serve solo in locale, non sull’hosting.

Per verificare esattamente la versione statica: esegui il build, poi `python3 -m http.server 8080` e apri <http://localhost:8080>. I percorsi relativi supportano anche siti pubblicati sotto il percorso di un repository.

## Struttura tecnica

- `presentation.js` carica l’elenco e inizializza Reveal.js e il simulatore dopo la conversione Markdown.
- `presentation.css` gestisce layout della presentazione e navigazione; `styles.css` lo stile del TLC.
- `app.js` gestisce interazioni e grafici TLC; `math.js` contiene i calcoli.
- `present.py` serve il progetto e genera l’elenco per l’hosting statico, senza dipendenze Python aggiuntive.
- `vendor/` contiene Reveal.js 5.2.1, il plugin Markdown e KaTeX con le rispettive licenze.

La sintassi si basa sul [plugin Markdown ufficiale di Reveal.js](https://revealjs.com/markdown/).

## Come usarla

- **Disegna la densità:** la forma iniziale è uniforme su [0,1]. Clicca o tocca all’interno del supporto per aggiungere un vertice. Trascina i vertici, inclusi gli estremi del supporto. L’area viene sempre normalizzata a 1; media e deviazione standard si aggiornano automaticamente. L’asse si adatta al termine dello spostamento degli estremi.
- **Elimina un punto:** seleziona un vertice interno e premi “Elimina punto”. Gli estremi non si possono eliminare.
- **Scegli n:** lo slider va da 1 a 50. Una variazione di n cancella i risultati precedenti e conserva la densità.
- **Campiona:** una pressione genera n osservazioni indipendenti e aggiunge una media all’istogramma. Tieni premuto per ripetere: dopo 350 ms, vengono generati circa 50 campioni al secondo. Il rilascio, l’annullamento del gesto o la perdita del focus fermano la sequenza.
- **Leggi il campione:** punti semitrasparenti sull’asse della densità, valori nella griglia di 10 colonne × 5 righe, media e media standardizzata. I dati sono mostrati con due decimali e le statistiche con tre; i calcoli conservano la precisione completa.
- **Cambia vista:** “Medie” rappresenta le medie originali; “Medie standardizzate” rappresenta `(media − μ) / (σ / √n)`. Il passaggio conserva tutti i campioni.
- **Densità teorica:** mostra o nasconde la normale corrispondente: `N(0,1)` nella vista standardizzata, `N(μ, σ²/n)` nella vista delle medie. È un’approssimazione: il TLC ne descrive il miglioramento al crescere di n, non il numero di ripetizioni. Più ripetizioni rendono più stabile l’istogramma per l’n scelto.
- **Reset:** ripristina uniforme su [0,1], n = 1, risultati vuoti, medie standardizzate e curva teorica nascosta.

Modificare la densità cancella campione e istogramma, mantenendo n. Le selezioni di vista e curva teorica restano attive al cambio di n o di densità. Prima del primo campionamento le statistiche del campione sono vuote.

### Tastiera

Usa Tab per raggiungere i controlli e i vertici della densità. Sui vertici, le frecce modificano posizione e altezza; Maiusc aumenta il passo. `+` o `Insert` aggiungono un punto nel segmento successivo, `Canc` o `Backspace` eliminano un punto interno, `Esc` deseleziona. Sul pulsante Campiona, Spazio o Invio campionano anche a pressione prolungata.

## Calcoli e verifiche

`math.js` contiene il motore numerico, separato dall’interfaccia. Integra esattamente i segmenti lineari per ottenere area e media; per la varianza usa una quadratura a due punti, esatta per l’integrando cubico. Il campionamento inverte la funzione di ripartizione segmento per segmento.

L’istogramma ha 40 bin. L’altezza di ogni barra è `conteggio / (numero di campioni × ampiezza del bin)`, quindi l’area totale è 1. L’intervallo iniziale standardizzato è [−4,4] e si espande per includere tutti i dati; nella vista delle medie viene trasformato con μ e σ/√n. Le tacche sull’asse rappresentano le medie accumulate; il punto evidenziato è l’ultima media.

Per eseguire le verifiche numeriche con Node.js:

```sh
node --test tests/math.test.cjs
```

Le verifiche dell’interfaccia sono in `tests/browser.cjs` e richiedono Playwright con Chromium, solo per lo sviluppo:

```sh
node tests/browser.cjs
```

Se Playwright o Chromium sono già installati in un’altra posizione, passa i percorsi come argomenti:

```sh
node tests/browser.cjs /percorso/al/modulo/playwright /percorso/al/browser/chromium
```

Questi controlli coprono navigazione Reveal.js, Markdown verticale e hosting sotto un percorso, layout desktop e mobile, clic e touch, pressione prolungata, annullamento, modifica della densità, tastiera e reset. Le anteprime vengono salvate nella cartella temporanea del sistema.
