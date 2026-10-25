# Fase di pianificazione 

Non scrivere subito codice.
Devi prima pormi delle domande con un approccio socratico per estrarre informazioni da me ed essere sicuro di aver colto cosa voglio realizzare.
Fa' in modo che sia semplice rispondere alle domande, a scelta multipla con opzioni proposte da te e con un campo aperto per risposte che non hai previsto. 
Limita il numero di domande al massimo a 5 -- seleziona le più importanti.
Puoi anche porre meno domande se sono già chiari i dettagli di ciò che voglio realizzare. 

# Obiettivo 

Voglio realizzare una slide interattiva per spiegare il Teorema del Limite Centrale.  

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

Titolo: "Legge di una media campionaria"

La slide deve essere strutturata nel seguente modo. 
La slide deve essere divisa in 4 quadranti uguali: tl, tr, bl, br.

Nel quadrante tl, deve essere posizionato un grafico interattivo. 
Il sottotitolo del quadrante è "f.d.p. di $X$". 
I sottotitoli devono essere centrati.
Il grafico interattivo rappresenta una funzione di densità di probabilità. 
Il grafico è interattivo in questo senso: di default, è un grafico di una densità uniforme.
Trascinando la curva della densità e i suoi estremi, se ne può modificare la forma. 
Puoi utilizzare una curva parametrizzata semplice da integrare. 
Va bene anche utilizzare una affine a tratti: quando si clicca si aggiunge un punto.
Trascinando i punti aggiunti, viene modificata la curva spezzata.
Modifiche al grafico della densità resettano la slide.
Sopra il grafico, scrivi due formule $\mu \mathbb{E}[X] = {valore atteso ottenuto dal grafico}$ e $\sigma = \sqrt{\mathrm{Var}(X)} = {deviazione standard ottenuta dal grafico}$. 
Tutte le formule nella slide devono essere scritte in LaTeX.
Sotto il grafico, c'è uno slider $n$ che parte da 1 e arriva a 50. 
A destra dello slider, un bottone "Campiona".
Se viene cliccato questo pulsante, vengono generati $n$ dati estratti da un campione $X_1,\dots,X_n$ di variabili aleatorie i.i.d. a $X$. 
Se viene tenuto premuto il tasto "Campiona", vengono generati 100 campioni di $n$ dati al secondo, aggiornando il resto della slide.
I dati estratti vengono mostrati nel grafico della densità come punti sull'asse x. 
Usa una trasparenza per i punti, in modo che le regioni più dense osservino più dati.

Nel quadrante bl, vengono rappresentati i dati estratti. 
Il sottotitolo del quadrante è "dati $x_1,\dots,x_n$".
Qui vengono rappresentati gli $n$ valori estratti, disposti sempre in una griglia 10x5 (se $n < 50$, il resto degli spazi non è occupato).

Nel quadrante tr, viene rappresentato il valore della media calcolata sui dati. 
Sottotitolo del quadrante "media campionaria" 
Qui due formule semplici: $\overline x_n = {valore della media calcolata sui dati}$ e $\frac{\overline x_n - \mu}{\sigma/\sqrt{n}} = {valore standardizzato}$.

Nel quadrante br, viene rappresentato un grafico con una densità di frequenze relative. 
Sottotitolo della slide "densità di frequenze relative del campione".
Questo grafico divide l'asse x in bin.
Sull'asse x vengono posizionati i valori di $\overline x_n$ ottenuti ogni volta dal tasto "Campiona". 
Vengono aggiornate le barre che rappresentano le densità di frequenze relative.
Sotto il grafico, c'è un bottone "Densità teorica".
Questa mostra la curva del grafico della f.d.p. di una normale standard. 

Sotto tutto, disponi, centrato, un tasto "Reset". 
Resetta la slide alla situazione default. 
