<div class="slide">
    <header class="slide-header">
      <h1>Legge di una media campionaria</h1>
    </header>
    <div class="quadrants">
      <div class="panel density-panel" aria-labelledby="density-title">
        <h2 id="density-title">f.d.p. di <span data-latex="X">X</span></h2>
        <div class="population-stats">
          <span id="population-mean" class="formula" data-latex="\mu = \mathbb{E}[X] = 0.500"></span>
          <span id="population-sd" class="formula" data-latex="\sigma = \sqrt{\mathrm{Var}(X)} = 0.289"></span>
        </div>
        <div class="chart-wrap density-wrap">
          <svg id="density-chart" role="group" aria-label="Editor della densità di probabilità" aria-describedby="editor-help" tabindex="0">
            <g class="grid-layer"></g>
            <path class="density-area"></path>
            <path class="density-line"></path>
            <g class="axis-layer"></g>
            <g class="sample-layer"></g>
            <g class="handle-layer"></g>
          </svg>
          <button id="delete-point" class="delete-point" type="button" disabled title="Seleziona un vertice interno da eliminare" aria-label="Elimina il vertice interno selezionato">Elimina punto</button>
        </div>
        <div class="sampling-controls">
          <label for="sample-size"><span data-latex="n =">n =</span> <output id="sample-size-value" for="sample-size">1</output></label>
          <input id="sample-size" type="range" min="1" max="50" step="1" value="1" aria-label="Numerosità del campione">
          <button id="sample-button" class="primary-button" type="button" aria-describedby="sampling-help">Campiona</button>
        </div>
        <p class="hint" id="editor-help">Tocca per aggiungere un punto. Trascina i punti e gli estremi.</p>
      </div>
      <div class="panel data-panel" aria-labelledby="data-title">
        <div class="panel-heading">
          <h2 id="data-title">dati <span data-latex="x_1,\dots,x_n">x₁,…,xₙ</span></h2>
          <span id="data-count" class="small-label">0 valori</span>
        </div>
        <div class="data-body">
          <div id="sample-grid" class="sample-grid" role="list" aria-label="Valori dell’ultimo campione"></div>
          <p id="sample-empty" class="empty-message">Un campione, <span data-latex="n">n</span> osservazioni.</p>
        </div>
        <p id="sampling-help" class="hint">Premi Campiona. Tieni premuto per ripetere.</p>
      </div>
      <div class="panel mean-panel" aria-labelledby="mean-title">
        <h2 id="mean-title">media campionaria</h2>
        <div class="sample-statistics">
          <div class="statistic">
            <span class="statistic-label">Media dei dati</span>
            <div id="sample-mean" class="formula" data-display="true" data-latex="\overline{x}_n = \text{—}"></div>
          </div>
          <div class="statistic">
            <span class="statistic-label">Media standardizzata</span>
            <div id="sample-z" class="formula" data-display="true" data-latex="\frac{\overline{x}_n - \mu}{\sigma/\sqrt{n}} = \text{—}"></div>
          </div>
        </div>
      </div>
      <div class="panel histogram-panel" aria-labelledby="histogram-title">
        <div class="histogram-heading">
          <h2 id="histogram-title">densità di frequenze relative</h2>
          <span id="repetition-count" class="small-label">0 campioni</span>
        </div>
        <div class="view-controls" role="group" aria-label="Quantità rappresentata nell’istogramma">
          <button type="button" id="view-means" aria-pressed="false">Medie</button>
          <button type="button" id="view-standardized" aria-pressed="true">Medie standardizzate</button>
        </div>
        <div class="chart-wrap histogram-wrap">
          <svg id="histogram-chart" role="img" aria-label="Densità di frequenze relative delle medie standardizzate">
            <g class="grid-layer"></g>
            <g class="bar-layer"></g>
            <path class="theory-line" hidden></path>
            <g class="axis-layer"></g>
            <g class="rug-layer"></g>
            <circle class="latest-mean" r="4" hidden></circle>
          </svg>
          <p id="histogram-empty" class="chart-empty">Ogni campione aggiunge una media.</p>
        </div>
        <div class="theory-controls">
          <button id="theory-button" type="button" aria-pressed="false">Densità teorica</button>
          <span id="theory-description" class="hint" hidden>Normale <span id="theory-formula" data-latex="\mathcal{N}(0,1)"></span> · approssimazione</span>
        </div>
      </div>
    </div>
    <footer class="slide-footer">
      <button id="reset-button" type="button">Reset</button>
    </footer>
    <p id="status" class="visually-hidden" role="status" aria-live="polite"></p>
</div>
