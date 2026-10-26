# Demo 

<div style="height: 3rem"></div>

```txt src=prompts/02-regressione.md
```

--- 

<div class="slide regression-slide">
  <header class="slide-header"><h1>Regressione lineare</h1></header>
  <div class="regression-panels">
    <div class="regression-panel">
      <h2>scatterplot</h2>
      <div class="regression-equation" id="reg-line"></div>
      <div class="regression-plot">
        <canvas id="reg-scatter" data-prevent-swipe tabindex="0" aria-label="Scatterplot: clic o tocco per aggiungere un punto, sul punto per eliminarlo. Da tastiera usa le frecce e Invio per aggiungere, Canc per eliminare il punto più vicino."></canvas>
        <span class="reg-axis reg-x" data-reg-math="x"></span><span class="reg-axis reg-y" data-reg-math="y"></span>
      </div>
      <p class="regression-hint">Tocca per aggiungere · Tocca un punto per eliminarlo</p>
      <div class="regression-controls">
        <label for="reg-a"><span data-reg-math="a"></span><input id="reg-a" type="range" min="-2" max="3" step="any" value="-0.4"><output id="reg-a-value" for="reg-a"></output></label>
        <label for="reg-b"><span data-reg-math="b"></span><input id="reg-b" type="range" min="-4" max="8" step="any" value="6"><output id="reg-b-value" for="reg-b"></output></label>
      </div>
      <button id="reg-optimize" type="button">Ottimizza</button>
    </div>
    <div class="regression-panel regression-loss">
      <div id="reg-mse" class="regression-equation"></div>
      <div class="regression-surface-wrap">
        <canvas id="reg-surface" data-prevent-swipe tabindex="0" aria-label="Superficie MSE: trascina per ruotare, oppure usa le frecce della tastiera."></canvas>
        <span class="reg-axis" id="reg-axis-a" data-reg-math="a"></span>
        <span class="reg-axis" id="reg-axis-b" data-reg-math="b"></span>
        <span class="reg-axis" id="reg-axis-mse" data-reg-math="MSE"></span>
      </div>
      <p class="regression-hint">Trascina per ruotare · Il punto rosso indica i valori degli slider</p>
      <p id="reg-status" role="status" aria-live="polite"></p>
    </div>
  </div>
  <footer class="regression-footer"><button id="reg-reset" type="button">Reset</button></footer>
</div>

