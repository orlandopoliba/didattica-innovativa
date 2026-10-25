# Fase di pianificazione 

Non scrivere subito codice.
Devi prima pormi delle domande con un approccio socratico per estrarre informazioni da me ed essere sicuro di aver colto cosa voglio realizzare.
Fa' in modo che sia semplice rispondere alle domande, a scelta multipla con opzioni proposte da te e con un campo aperto per risposte che non hai previsto. 
Limita il numero di domande al massimo a 5 -- seleziona le più importanti.
Puoi anche porre meno domande se sono già chiari i dettagli di ciò che voglio realizzare. 

# Obiettivo 

Voglio realizzare una slide interattiva per spiegare la regressione lineare da aggiungere nella slide dal titolo "Regressione lineare". 

# Struttura

Le slide devono essere una pagina web statica, realizzata in html, css, javascript. 
Puoi utilizzare Reveal.js.
Nel README.md scrivi come aprire le slide.
Fa' in modo che le slide possano essere hostate su un sito come GitHub Pages. 
Fa' in modo che si possa interagire con le slide anche da smartphone con touch (a volte non funziona con Reveal.js).

# Stile 

Minimalista. 
Titolo e contenuto.

# Contenuto

Titolo: "Regressione lineare"

La slide deve essere strutturata nel seguente modo. 
La slide deve essere divisa in 2 parti uguali separate verticalmente: l, r. 

Nella parte l, deve essere posizionato un grafico interattivo. 
Il sottotitolo del quadrante è "scatterplot". 
I sottotitoli devono essere centrati.
Il grafico interattivo rappresenta uno scatterplot.
Il grafico è interattivo in questo senso: di default, sono posizionati 5 punti che rappresentano dati $(x_i,y_i)$. 
Cliccando sul grafico, vengono aggiunti nuovi dati. 
Sul grafico è rappresentata una retta di equazione $y=ax + b$.
Sotto il grafico, uno sotto l'altro, ci sono due slider, labeled $a$ e $b$ (in LaTeX, come tutte le formule della slide), che permettono di modificare i valori di questi parametri.
Sotto i due slider, centrato verticalmente, c'è il tasto "Ottimizza", che calcola i coefficienti della retta di regressione lineare. 

Nella parte r, deve essere posizionato un altro grafico interattivo. 
Sopra il grafico, una formula: 
\[
MSE(a,b) = \frac{1}{n} \sum_{i=1}^n (a x_i + b - y_i)^2 = {valore misurato sui dati e con lo slider}
\]
Sotto la formula, un grafico 3d. 
Facendo drag sul grafico, lo si può ruotare per vedere il grafico da altri punti di vista. 
Il grafico rappresenta la funzione $MSE$, come funzione di $a$ e $b$, come una superficie. 
Inoltre rappresenta il punto corrispondente alla selezione degli slider. 
Viene aggiornato in base ai dati inseriti e in base ai valori sugli slider.

Sotto tutto, disponi, centrato, un tasto "Reset". 
Resetta la slide alla situazione default. 
