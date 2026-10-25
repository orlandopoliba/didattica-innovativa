/* One Markdown file = one horizontal position; --- = a vertical slide. */

// An empty fence such as ```css [] src=styles.css is filled with that file,
// so the code shown on a slide always matches the code that runs.
async function includeSources(markdown) {
  const pattern = /^```(\w+)(.*?)\s+src=(\S+)[ \t]*\n```[ \t]*$/gm;
  const sources = await Promise.all(Array.from(markdown.matchAll(pattern), async ([, , , src]) => {
    const response = await fetch(src, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Impossibile caricare ${src}.`);
    return (await response.text()).trimEnd();
  }));
  let index = 0;
  return markdown.replace(pattern, (match, lang, options) => {
    const code = sources[index++];
    const fence = '`'.repeat(Math.max(3, ...Array.from(code.matchAll(/`+/g), m => m[0].length + 1)));
    return `${fence}${lang}${options}\n${code}\n${fence}`;
  });
}

// Turn each .code-tabs box into one tab per code block, labelled by language.
function initializeCodeTabs() {
  const labels = { html: 'HTML', css: 'CSS', js: 'JavaScript' };
  document.querySelectorAll('.code-tabs').forEach((box, boxIndex) => {
    const panels = Array.from(box.querySelectorAll(':scope > pre'));
    const bar = document.createElement('div');
    bar.className = 'code-tabs-bar';
    bar.setAttribute('role', 'tablist');
    const tabs = panels.map((panel, index) => {
      const lang = panel.querySelector('code').classList[0];
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.textContent = labels[lang] || lang;
      tab.id = `code-tab-${boxIndex}-${index}`;
      tab.setAttribute('role', 'tab');
      panel.id = `code-panel-${boxIndex}-${index}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      tab.setAttribute('aria-controls', panel.id);
      tab.addEventListener('click', () => select(index));
      return tab;
    });
    const select = index => tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    bar.addEventListener('keydown', event => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      const index = (tabs.indexOf(document.activeElement) + step + tabs.length) % tabs.length;
      select(index);
      tabs[index].focus();
    });
    bar.append(...tabs);
    box.prepend(bar);
    select(0);
  });
}

(async () => {
  const loading = document.getElementById('loading');
  try {
    const response = await fetch('slide/index.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Elenco slide non disponibile: esegui python3 present.py build.');
    const files = await response.json();
    if (!Array.isArray(files) || !files.length) throw new Error('La cartella slide/ è vuota.');
    const contents = await Promise.all(files.map(async file => {
      const response = await fetch(`slide/${encodeURIComponent(file)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Impossibile caricare ${file}.`);
      return includeSources(await response.text());
    }));
    const slides = document.querySelector('.slides');
    contents.forEach(content => {
      const section = document.createElement('section');
      section.setAttribute('data-markdown', '');
      section.setAttribute('data-separator', '(?!)');
      section.setAttribute('data-separator-vertical', '^---\\s*$');
      const template = document.createElement('textarea');
      template.setAttribute('data-template', '');
      template.textContent = content;
      section.append(template);
      slides.append(section);
    });
    await Reveal.initialize({
      plugins: [RevealMarkdown, RevealHighlight], hash: true, disableLayout: true,
      center: false, transition: 'none', controls: false, progress: true,
      // Native vertical scrolling is needed for long slides and the TLC editor.
      touch: false, scrollActivationWidth: 760, scrollSnap: 'mandatory', overview: false,
      keyboardCondition: event => !event.target.closest('input, button, textarea, select, [contenteditable], #density-chart, .regression-slide canvas')
    });
    window.initializeTLC();
    window.initializeRegression();
    initializeCodeTabs();
    // disableLayout also disables Reveal's automatic breakpoint detection.
    // Keep the live nodes when leaving scroll view: Reveal normally restores
    // an HTML snapshot, which would discard the simulator's event listeners.
    const structure = Array.from(slides.children, section => ({
      section, children: Array.from(section.children).filter(child => child.tagName === 'SECTION')
    }));
    const mobile = window.matchMedia('(max-width: 760px)');
    const updateView = () => {
      if (mobile.matches === Reveal.isScrollView()) return;
      const state = Reveal.getState();
      Reveal.toggleScrollView(mobile.matches);
      if (!mobile.matches) {
        structure.forEach(({ section, children }) => {
          if (children.length) section.replaceChildren(...children);
        });
        slides.replaceChildren(...structure.map(({ section }) => section));
        Reveal.sync();
        Reveal.setState(state);
      }
    };
    mobile.addEventListener('change', updateView);
    updateView();
    // Own vertical gestures outside interactive controls so nested scrolling
    // cannot trap a swipe in the TLC slide (including when it reaches an edge).
    let scrollGesture;
    slides.addEventListener('touchstart', event => {
      scrollGesture = null;
      if (!Reveal.isScrollView() || event.touches.length !== 1 ||
          event.target.closest('button, input, select, textarea, pre, #density-chart, [data-prevent-swipe]')) return;
      const section = event.target.closest('section') ||
        event.target.closest('.scroll-page')?.querySelector('section');
      if (section) scrollGesture = {
        section, x: event.touches[0].clientX, y: event.touches[0].clientY,
        lastY: event.touches[0].clientY, edgeDistance: 0, vertical: false, advanced: false
      };
    }, { passive: true });
    slides.addEventListener('touchmove', event => {
      if (event.touches.length !== 1) { scrollGesture = null; return; }
      if (!scrollGesture) return;
      const { section, x, y } = scrollGesture;
      const delta = y - event.touches[0].clientY;
      if (!scrollGesture.vertical && Math.abs(delta) <= Math.abs(x - event.touches[0].clientX)) return;
      if (!event.cancelable) return;
      event.preventDefault();
      scrollGesture.vertical = true;
      if (scrollGesture.advanced) return;
      const step = scrollGesture.lastY - event.touches[0].clientY;
      scrollGesture.lastY = event.touches[0].clientY;
      const maxScroll = Math.max(0, section.scrollHeight - section.clientHeight);
      const before = Math.max(0, Math.min(maxScroll, section.scrollTop));
      const after = Math.max(0, Math.min(maxScroll, before + step));
      section.scrollTop = after;
      const remainder = step - (after - before);
      if (!remainder) scrollGesture.edgeDistance = 0;
      else {
        if (Math.sign(remainder) !== Math.sign(scrollGesture.edgeDistance)) scrollGesture.edgeDistance = 0;
        scrollGesture.edgeDistance += remainder;
      }
      if (Math.abs(scrollGesture.edgeDistance) >= 45) {
        scrollGesture.advanced = true;
        const pages = Array.from(slides.querySelectorAll('.scroll-page'));
        const page = section.closest('.scroll-page');
        const index = pages.indexOf(page);
        const viewport = Reveal.getViewportElement();
        const height = viewport.clientHeight;
        const offset = page.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
        // Reveal gives each fragment one additional viewport of scroll space.
        // Visit those steps before moving to the following Markdown slide.
        const step = Math.round(-offset / height);
        const direction = scrollGesture.edgeDistance > 0 ? 1 : -1;
        const lastStep = Math.max(0, Math.round(page.offsetHeight / height) - 1);
        let target;
        if (step + direction >= 0 && step + direction <= lastStep) {
          target = viewport.scrollTop + offset + (step + direction) * height;
        } else {
          const next = pages[index + direction];
          if (next) target = viewport.scrollTop + next.getBoundingClientRect().top - viewport.getBoundingClientRect().top +
            (direction < 0 ? Math.max(0, next.offsetHeight - height) : 0);
        }
        if (target !== undefined) viewport.scrollTo({
          top: target,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
        });
      }
    }, { passive: false });
    const endScrollGesture = () => { scrollGesture = null; };
    slides.addEventListener('touchend', endScrollGesture, { passive: true });
    slides.addEventListener('touchcancel', endScrollGesture, { passive: true });
    loading.remove();
  } catch (error) {
    loading.textContent = `Presentazione non caricata. ${error.message} Avvia il server con python3 present.py.`;
    console.error(error);
  }
})();
