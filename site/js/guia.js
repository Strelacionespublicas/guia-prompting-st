// Guía práctica de prompting — índice lateral, avance de lectura y marcador.
// El avance se guarda en localStorage (por navegador y dispositivo).
(function () {
  'use strict';

  var KEY = 'guia-prompting-st:v1';
  var LINE = 120; // px desde arriba: a partir de acá una sección cuenta como "actual"
  var CHAPTERS = [
    ['indice', '·', 'Índice'], ['como-usar', '·', 'Cómo usar esta guía'], ['proceso', '·', 'Las 10 etapas'],
    ['cap1', '01', 'Entender qué podemos crear'], ['cap2', '02', 'El método IDEA'], ['cap3', '03', 'Cómo estructurar un buen prompt'],
    ['cap4', '04', 'El contexto'], ['cap5', '05', 'Archivos y referencias'], ['cap6', '06', 'Promptear por voz'],
    ['cap7', '07', 'Trabajar con Claude y Codex'], ['cap8', '08', 'Construir herramientas reales'], ['cap9', '09', 'Iterar y corregir'],
    ['cap10', '10', 'Reducir iteraciones y tokens'], ['cap11', '11', 'Pruebas, seguridad y publicación'], ['cap12', '12', 'Mi proyecto paso a paso'],
    ['checklist', 'A', 'Checklist general'], ['laboratorio', 'B', 'Laboratorio de prompts'], ['glosario', 'C', 'Glosario']
  ];

  var $ = function (id) { return document.getElementById(id); };
  var drawer = $('drawer'), list = $('drawer-list'), banner = $('banner');
  var toggleBtn = document.querySelector('[data-action="toggle-drawer"]');
  var sections = CHAPTERS.map(function (c) { return $(c[0]); });

  var state = { current: -1, maxIdx: -1, maxPct: 0, bookmark: null, bannerTarget: null };
  var flashTimer = null, raf = null, lastFocus = null;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(patch) {
    var saved = load();
    for (var k in patch) saved[k] = patch[k];
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
  }

  function label(i) {
    var c = CHAPTERS[i];
    if (!c) return '';
    if (/\d/.test(c[1])) return 'Capítulo ' + Number(c[1]) + ' · ' + c[2];
    if (c[1] !== '·') return 'Anexo ' + c[1] + ' · ' + c[2];
    return c[2];
  }

  function currentIndex() {
    var idx = -1;
    sections.forEach(function (el, i) { if (el && el.getBoundingClientRect().top <= LINE) idx = i; });
    return idx;
  }
  function offsetIn(idx) {
    return window.scrollY - (sections[idx].getBoundingClientRect().top + window.scrollY);
  }
  function goTo(target) {
    var el = sections[target.idx];
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + (target.delta || 0), behavior: 'smooth' });
  }

  // ---- Índice lateral ----
  var items = CHAPTERS.map(function (c) {
    var a = document.createElement('a');
    a.className = 'drawer-item';
    a.href = '#' + c[0];
    a.innerHTML = '<span class="drawer-item__num"></span><span></span><span class="drawer-item__mark" aria-hidden="true"></span>';
    a.children[0].textContent = c[1];
    a.children[1].textContent = c[2];
    a.addEventListener('click', function () { closeDrawer(false); });
    list.appendChild(a);
    return a;
  });

  function renderDrawer() {
    var bm = state.bookmark ? state.bookmark.idx : -1;
    items.forEach(function (a, i) {
      var mark = a.children[2];
      a.classList.toggle('is-current', i === state.current);
      if (i === state.current) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      mark.textContent = i === bm ? '⚑' : (i <= state.maxIdx ? '✓' : '');
      mark.classList.toggle('is-bookmark', i === bm);
    });
    $('progress-max').style.width = state.maxPct.toFixed(1) + '%';
    $('progress-label').textContent = Math.round(state.maxPct) + ' % leído';
    $('bookmark-text').textContent = state.bookmark
      ? 'Tu marca: ' + label(state.bookmark.idx)
      : 'Usá “Marcar hasta acá” para guardar dónde quedaste.';
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    renderDrawer();
    drawer.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'true');
    drawer.querySelector('[aria-label="Cerrar índice"]').focus();
    var cur = items[state.current];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
  function closeDrawer(restoreFocus) {
    if (drawer.hidden) return;
    drawer.hidden = true;
    toggleBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus !== false && lastFocus) lastFocus.focus();
  }

  // ---- Aviso inferior ----
  function showBanner(text, target) {
    clearTimeout(flashTimer);
    state.bannerTarget = target || null;
    $('banner-text').textContent = text;
    $('banner-resume').hidden = !target;
    banner.hidden = false;
  }
  function hideBanner() { banner.hidden = true; state.bannerTarget = null; }
  function flash(text) {
    showBanner(text, null);
    flashTimer = setTimeout(hideBanner, 3500);
  }

  // ---- Seguimiento de lectura ----
  function track() {
    var doc = document.documentElement, max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    state.current = currentIndex();
    state.maxIdx = Math.max(state.maxIdx, state.current);
    state.maxPct = Math.max(state.maxPct, pct);
    $('progress-bar').style.width = pct.toFixed(1) + '%';
    if (!drawer.hidden) renderDrawer();
    if (state.current >= 0) {
      save({ maxIdx: state.maxIdx, maxPct: state.maxPct, last: { idx: state.current, delta: offsetIn(state.current) } });
    }
  }

  function markHere() {
    var idx = currentIndex();
    if (idx < 0) { flash('Empezá a leer y después marcá hasta dónde llegaste.'); return; }
    state.bookmark = { idx: idx, delta: offsetIn(idx), at: Date.now() };
    save({ bookmark: state.bookmark });
    renderDrawer();
    flash('Guardado. Llegaste hasta: ' + label(idx));
  }

  function printPdf() {
    closeDrawer(false);
    setTimeout(function () { window.print(); }, 50);
  }

  var actions = {
    'toggle-drawer': function () { if (drawer.hidden) openDrawer(); else closeDrawer(); },
    'close-drawer': function () { closeDrawer(); },
    'mark': markHere,
    'print': printPdf,
    'resume': function () { if (state.bannerTarget) goTo(state.bannerTarget); hideBanner(); },
    'dismiss-banner': hideBanner
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (el && actions[el.dataset.action]) actions[el.dataset.action]();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
    // Mantener el foco dentro del índice mientras está abierto
    if (e.key === 'Tab' && !drawer.hidden) {
      var f = drawer.querySelectorAll('a[href],button');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  window.addEventListener('scroll', function () {
    if (!raf) raf = requestAnimationFrame(function () { raf = null; track(); });
  }, { passive: true });

  // ---- Inicio: recuperar avance y ofrecer retomar ----
  var saved = load();
  state.maxIdx = typeof saved.maxIdx === 'number' ? saved.maxIdx : -1;
  state.maxPct = saved.maxPct || 0;
  state.bookmark = saved.bookmark || null;
  var resumeFrom = saved.bookmark || saved.last;
  if (resumeFrom && resumeFrom.idx > 0 && !location.hash) {
    showBanner((saved.bookmark ? 'Marcaste hasta: ' : 'La última vez llegaste a: ') + label(resumeFrom.idx), resumeFrom);
  }
  setTimeout(track, 300);
})();
