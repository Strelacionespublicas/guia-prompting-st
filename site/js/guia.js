// Guía práctica de prompting — índice lateral, avance de lectura, marcador,
// prompts copiables y ejercicios completables con login de Google.
//
// Sin sesión, el avance se guarda en localStorage (por navegador y dispositivo).
// Con sesión, el avance y las respuestas se guardan además en Firebase (js/backend.js).
(function () {
  'use strict';

  var KEY = 'guia-prompting-st:v1';
  var LINE = 120; // px desde arriba: a partir de acá una sección cuenta como "actual"
  var SAVE_DELAY = 900; // ms sin escribir antes de guardar
  var PROGRESS_DELAY = 8000; // el avance de lectura se sube como mucho cada 8 s
  var ESTADOS = ['', 'Pendiente', 'En curso', 'Listo'];
  var CHAPTERS = [
    ['indice', '·', 'Índice'], ['como-usar', '·', 'Cómo usar esta guía'], ['proceso', '·', 'Las 10 etapas'],
    ['cap1', '01', 'Entender qué podemos crear'], ['cap2', '02', 'El método IDEA'], ['cap3', '03', 'Cómo estructurar un buen prompt'],
    ['cap4', '04', 'El contexto'], ['cap5', '05', 'Archivos y referencias'], ['cap6', '06', 'Promptear por voz'],
    ['cap7', '07', 'Trabajar con Claude y Codex'], ['cap8', '08', 'Construir herramientas reales'], ['cap9', '09', 'Iterar y corregir'],
    ['cap10', '10', 'Reducir iteraciones y tokens'], ['cap11', '11', 'Pruebas, seguridad y publicación'], ['cap12', '12', 'Mi proyecto paso a paso'],
    ['checklist', 'A', 'Checklist general'], ['laboratorio', 'B', 'Laboratorio de prompts'], ['glosario', 'C', 'Glosario']
  ];

  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var body = document.body;
  var drawer = $('drawer'), list = $('drawer-list'), banner = $('banner'), menu = $('account-menu');
  var toggleBtn = document.querySelector('[data-action="toggle-drawer"]');
  var menuBtn = document.querySelector('[data-action="account-menu"]');
  var sections = CHAPTERS.map(function (c) { return $(c[0]); });

  var state = { current: -1, maxIdx: -1, maxPct: 0, bookmark: null, last: null, finished: {}, certificate: null, bannerTarget: null };
  // Capítulos y anexos que se marcan como terminados (todo menos el índice)
  var FINISHABLE = CHAPTERS.filter(function (c) { return c[0] !== 'indice'; });
  var flashTimer = null, raf = null, lastFocus = null;

  // ---- Almacenamiento local ----
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(patch) {
    var saved = load();
    for (var k in patch) saved[k] = patch[k];
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
    if (user) queueProgressSync();
  }

  function label(i) {
    var c = CHAPTERS[i];
    if (!c) return '';
    if (/\d/.test(c[1])) return 'Capítulo ' + Number(c[1]) + ' · ' + c[2];
    if (c[1] !== '·') return 'Anexo ' + c[1] + ' · ' + c[2];
    return c[2];
  }

  // En la vista de curso se ve un capítulo por pantalla: el actual es el que está abierto
  function currentIndex() { return view; }
  function offsetIn(idx) {
    return window.scrollY - (sections[idx].getBoundingClientRect().top + window.scrollY);
  }
  function goTo(target) {
    var el = sections[target.idx];
    if (!el) return;
    if (openIdx(target.idx) !== view) { history.pushState(null, '', '#' + IDS[target.idx]); show(target.idx, true); }
    var top = target.delta > 0 && view >= 0 ? el.getBoundingClientRect().top + window.scrollY + target.delta : 0;
    window.scrollTo({ top: top, behavior: 'instant' });
  }

  // ---- Vista de curso: "Mi curso" con los módulos y un capítulo por pantalla ----
  // Solo cambia la pantalla: al imprimir (y en el PDF de la guía) se ve todo seguido.
  var IDS = CHAPTERS.map(function (c) { return c[0]; });
  var HOME = { '': 1, portada: 1, inicio: 1, indice: 1 };
  var view = -1; // capítulo abierto; -1 = inicio
  body.classList.add('lms');

  function openIdx(i) { return IDS[i] === 'indice' ? -1 : i; } // el índice vive en el inicio
  function show(idx, focus) {
    view = openIdx(idx);
    body.classList.toggle('view-home', view < 0);
    body.classList.toggle('view-chapter', view >= 0);
    sections.forEach(function (s, i) { if (s) s.classList.toggle('is-open', i === view); });
    document.title = (view >= 0 ? label(view) + ' — ' : '') + 'Guía práctica de prompting';
    renderCourse();
    if (focus && view >= 0) {
      var h = sections[view].querySelector('h2');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  }
  function route(e) {
    var h = decodeURIComponent(location.hash.slice(1)), i = IDS.indexOf(h), el;
    if (HOME[h] || i >= 0) {
      show(HOME[h] ? -1 : i, !!e);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if ((el = document.getElementById(h))) {
      // Enlace a algo de adentro de un capítulo (un video, el certificado…): se abre ese capítulo
      var sec = el.closest('main>section[id]');
      show(sec ? IDS.indexOf(sec.id) : -1, false);
      el.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else show(-1);
    track();
  }

  function modStatus(id) {
    if (state.finished[id]) return 'done';
    var f = chapterFields(id);
    return f.done > 0 || (state.last && IDS[state.last.idx] === id) ? 'doing' : 'todo';
  }
  function chipLabel(c) {
    return /\d/.test(c[1]) ? 'Cap. ' + c[1] : (c[1] !== '·' ? 'Anexo ' + c[1] : 'Intro');
  }
  // Próximo paso: donde quedó, si no lo terminó; si no, el primer módulo sin terminar
  function nextStep() {
    var l = state.last && state.last.idx;
    if (l > 0 && !state.finished[IDS[l]]) return l;
    for (var i = 1; i < CHAPTERS.length; i++) if (!state.finished[IDS[i]]) return i;
    return -1;
  }

  // Temas del índice impreso (Intención, Diseño…) para las tarjetas
  var topics = {};
  $$('#indice a[href^="#"]').forEach(function (a) {
    var t = a.nextElementSibling;
    if (t && t.tagName === 'SPAN') topics[a.getAttribute('href').slice(1)] = { title: a.textContent.trim(), tag: t.textContent.trim() };
  });

  var course = null, side = null, sideItems = [];
  function buildCourse() {
    var main = document.querySelector('main');
    course = document.createElement('div');
    course.id = 'curso';
    course.className = 'course';
    course.setAttribute('data-noprint', '');
    course.innerHTML = '<div class="course__head"><div><span class="course__eyebrow">MI CURSO</span><h2 class="course__title">Tu recorrido</h2>' +
      '<p class="course__lead">Avanzá a tu ritmo: abrí un módulo, leelo, completá los ejercicios y marcalo como terminado.</p></div>' +
      '<div class="course__stat"><strong class="js-course-count"></strong><span>de ' + FINISHABLE.length + ' módulos terminados</span>' +
      '<div class="course__bar"><span class="js-course-bar"></span></div></div></div>' +
      '<a class="st-btn st-btn--lg course__go" id="course-go" href="#"></a>';
    [['Para empezar', 0, 3], ['Capítulos', 3, 15], ['Anexos', 15, 18]].forEach(function (g) {
      var h = document.createElement('h3');
      h.className = 'course__group';
      h.textContent = g[0];
      var ol = document.createElement('ol');
      ol.className = 'course__grid';
      for (var i = g[1]; i < g[2]; i++) {
        var c = CHAPTERS[i];
        if (c[0] === 'indice') continue;
        var t = topics[c[0]] || {};
        var li = document.createElement('li');
        li.innerHTML = '<a class="mod" href="#' + c[0] + '"><span class="mod__chip"></span><span class="mod__title"></span>' +
          '<span class="mod__meta"></span><span class="mod__status"></span></a>';
        li.querySelector('.mod__chip').textContent = chipLabel(c) + (t.tag && t.tag !== 'Anexo' ? ' · ' + t.tag : '');
        li.querySelector('.mod__title').textContent = t.title || c[2];
        li.firstChild.setAttribute('data-mod', c[0]);
        ol.appendChild(li);
      }
      course.appendChild(h);
      course.appendChild(ol);
    });
    main.insertBefore(course, main.firstChild);

    // Barra lateral con los módulos (en pantallas anchas)
    side = document.createElement('nav');
    side.className = 'lms-side';
    side.setAttribute('aria-label', 'Módulos del curso');
    side.setAttribute('data-noprint', '');
    side.innerHTML = '<a class="lms-side__home" href="#inicio">← Mi curso</a>' +
      '<div class="lms-side__stat"><span class="js-course-text"></span><div class="course__bar"><span class="js-course-bar"></span></div></div>';
    var ul = document.createElement('ol');
    ul.className = 'lms-side__list';
    FINISHABLE.forEach(function (c) {
      var li = document.createElement('li');
      li.innerHTML = '<a href="#' + c[0] + '"><span class="lms-side__mark" aria-hidden="true"></span><span class="lms-side__num"></span><span></span></a>';
      li.querySelector('.lms-side__num').textContent = c[1] === '·' ? '' : c[1];
      li.querySelector('a').lastChild.textContent = c[2];
      ul.appendChild(li);
      sideItems.push(li.firstChild);
    });
    side.appendChild(ul);
    document.querySelector('header').insertAdjacentElement('afterend', side);

    // Arriba de cada capítulo: volver al curso y en qué módulo estás. Abajo: anterior / siguiente
    FINISHABLE.forEach(function (c, n) {
      var sec = $(c[0]);
      var top = document.createElement('div');
      top.className = 'lms-top';
      top.setAttribute('data-noprint', '');
      top.innerHTML = '<a href="#inicio">← Mi curso</a><span>Módulo ' + (n + 1) + ' de ' + FINISHABLE.length + '</span>';
      sec.insertBefore(top, sec.firstChild);
      var nav = document.createElement('nav');
      nav.className = 'lms-nav';
      nav.setAttribute('aria-label', 'Navegación entre módulos');
      nav.setAttribute('data-noprint', '');
      var prev = FINISHABLE[n - 1], next = FINISHABLE[n + 1];
      nav.innerHTML = (prev ? '<a class="lms-nav__prev" href="#' + prev[0] + '"><small>← Anterior</small><span></span></a>' : '<a class="lms-nav__prev" href="#inicio"><small>← Volver</small><span>Mi curso</span></a>') +
        (next ? '<a class="lms-nav__next" href="#' + next[0] + '"><small>Siguiente →</small><span></span></a>' : '<a class="lms-nav__next" href="#inicio"><small>Terminaste el recorrido</small><span>Volver a Mi curso</span></a>');
      if (prev) nav.querySelector('.lms-nav__prev span').textContent = prev[2];
      if (next) nav.querySelector('.lms-nav__next span').textContent = next[2];
      sec.appendChild(nav);
    });
  }

  function renderCourse() {
    if (!course) return;
    var n = finishedCount(), total = FINISHABLE.length;
    $$('.js-course-count').forEach(function (el) { el.textContent = n; });
    $$('.js-course-text').forEach(function (el) { el.textContent = n + ' de ' + total + ' terminados'; });
    $$('.js-course-bar').forEach(function (el) { el.style.width = (n / total * 100).toFixed(1) + '%'; });
    $$('[data-mod]').forEach(function (a) {
      var id = a.getAttribute('data-mod'), st = modStatus(id), f = chapterActivities(id);
      a.className = 'mod is-' + st;
      a.querySelector('.mod__meta').textContent = f.total ? f.done + ' de ' + f.total + (f.total === 1 ? ' actividad' : ' actividades') : 'Lectura';
      a.querySelector('.mod__status').textContent = st === 'done' ? '✓ Completado' : st === 'doing' ? 'En curso' : 'Pendiente';
    });
    sideItems.forEach(function (a, k) {
      var id = FINISHABLE[k][0];
      a.classList.toggle('is-current', IDS[view] === id);
      if (IDS[view] === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      a.classList.toggle('is-done', !!state.finished[id]);
      a.firstChild.textContent = state.finished[id] ? '✓' : '';
    });
    var go = $('course-go'), next = nextStep(), heroGo = document.querySelector('#portada a[href^="#"]:not(.st-btn)');
    if (heroGo) {
      heroGo.classList.add('hero-go');
      heroGo.textContent = next < 0 ? 'Ver mi recorrido' : (n > 0 || (state.last && state.last.idx > 0) ? 'Continuar el curso →' : 'Empezar el curso →');
      heroGo.setAttribute('href', next < 0 ? '#curso' : '#' + IDS[next]);
    }
    if (next < 0) {
      go.textContent = 'Descargar mi certificado';
      go.setAttribute('href', '#inicio');
      go.setAttribute('data-action', 'certificate');
    } else {
      var started = n > 0 || (state.last && state.last.idx > 0);
      go.textContent = (started ? 'Continuar: ' : 'Empezar el curso: ') + shortLabel(next) + (/\d/.test(CHAPTERS[next][1]) || CHAPTERS[next][1] !== '·' ? ' · ' + CHAPTERS[next][2] : '') + ' →';
      go.setAttribute('href', '#' + IDS[next]);
      go.removeAttribute('data-action');
    }
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
  // El índice es el inicio del curso
  items[0].href = '#inicio';
  items[0].children[0].textContent = '⌂';
  items[0].children[1].textContent = 'Mi curso';

  function renderDrawer() {
    var bm = state.bookmark ? state.bookmark.idx : -1;
    items.forEach(function (a, i) {
      var mark = a.children[2];
      a.classList.toggle('is-current', i === state.current);
      if (i === state.current) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      mark.textContent = i === bm ? '⚑' : (state.finished[CHAPTERS[i][0]] ? '✓' : '');
      mark.classList.toggle('is-bookmark', i === bm);
    });
    $('progress-max').style.width = finishedPct().toFixed(1) + '%';
    $('progress-label').textContent = finishedCount() + ' de ' + FINISHABLE.length + ' terminados';
    $('bookmark-text').textContent = state.bookmark
      ? 'Tu marca: ' + label(state.bookmark.idx)
      : 'Usá “Marcar hasta acá” para guardar dónde quedaste.';
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    closeMenu();
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

  // ---- Menú de la cuenta ----
  function openMenu() { menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); }
  function closeMenu() { if (menu && !menu.hidden) { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } }

  // ---- Aviso inferior ----
  function showBanner(text, target, actionLabel, action) {
    clearTimeout(flashTimer);
    state.bannerTarget = target || null;
    state.bannerAction = action || null;
    $('banner-text').textContent = text;
    var btn = $('banner-resume');
    btn.textContent = actionLabel || 'Continuar leyendo';
    btn.hidden = !(target || action);
    banner.hidden = false;
  }
  function hideBanner() { banner.hidden = true; state.bannerTarget = null; state.bannerAction = null; }
  function flash(text, ms) {
    showBanner(text, null);
    flashTimer = setTimeout(hideBanner, ms || 3500);
  }

  // ---- Seguimiento de lectura ----
  function track() {
    // Barra superior: cuánto leíste del capítulo abierto
    var frac = 0;
    if (view >= 0) {
      var el = sections[view], span = el.offsetHeight - window.innerHeight + 120;
      frac = span > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / span)) : 1;
    }
    var pct = view >= 0 ? (view + frac) / CHAPTERS.length * 100 : 0;
    state.current = currentIndex();
    state.maxIdx = Math.max(state.maxIdx, state.current);
    state.maxPct = Math.max(state.maxPct, pct);
    $('progress-bar').style.width = (frac * 100).toFixed(1) + '%';
    if (!drawer.hidden) renderDrawer();
    if (state.current >= 0) {
      state.last = { idx: state.current, delta: offsetIn(state.current) };
      save({ maxIdx: state.maxIdx, maxPct: state.maxPct, last: state.last });
    }
  }

  // ---- Capítulos terminados (los marca el alumno; el scroll no cuenta) ----
  function finishedCount() {
    return FINISHABLE.filter(function (c) { return state.finished[c[0]]; }).length;
  }
  function finishedPct() { return finishedCount() / FINISHABLE.length * 100; }
  function chapterFields(id) {
    var n = 0, d = 0;
    Object.keys(fields).forEach(function (f) {
      if (f.indexOf(id + '-') !== 0) return;
      n++;
      var v = values[f];
      if (v === true || (typeof v === 'string' && v.trim())) d++;
    });
    return { total: n, done: d };
  }
  // Actividades de un capítulo (cada ficha o ejercicio, no cada casillero): con alguna respuesta cuenta como hecha
  function chapterActivities(id) {
    var acts = {};
    Object.keys(fields).forEach(function (f) {
      if (f.indexOf(id + '-') !== 0) return;
      var host = document.querySelector('[data-field="' + f + '"]');
      var name = ((host && host.getAttribute('data-label')) || f).split(' › ')[1] || f;
      var v = values[f];
      acts[name] = acts[name] || v === true || (typeof v === 'string' && !!v.trim());
    });
    var names = Object.keys(acts);
    return { total: names.length, done: names.filter(function (k) { return acts[k]; }).length };
  }
  function shortLabel(i) {
    var c = CHAPTERS[i];
    return /\d/.test(c[1]) ? 'Capítulo ' + Number(c[1]) : (c[1] !== '·' ? 'Anexo ' + c[1] : c[2]);
  }
  function buildFinishCards() {
    CHAPTERS.forEach(function (c, i) {
      var sec = sections[i];
      if (!sec || c[0] === 'indice') return;
      var card = document.createElement('div');
      card.className = 'finish';
      card.setAttribute('data-noprint', '');
      card.setAttribute('data-finish', c[0]);
      card.innerHTML = '<span class="finish__icon" aria-hidden="true">✓</span>' +
        '<div class="finish__text"><strong></strong><span class="finish__sub"></span></div>' +
        '<button type="button" class="finish__btn" data-action="finish"></button>';
      card.querySelector('button').setAttribute('data-ref', c[0]);
      sec.appendChild(card);
    });
    renderFinish();
  }
  function renderFinish() {
    $$('[data-finish]').forEach(function (card) {
      var id = card.getAttribute('data-finish'), i = CHAPTERS.map(function (c) { return c[0]; }).indexOf(id);
      var f = chapterActivities(id), done = state.finished[id], name = shortLabel(i);
      var reading = f.total === 0;
      card.classList.toggle('is-done', !!done);
      card.querySelector('strong').textContent = done
        ? (reading ? 'Lectura finalizada' : name + ' completado')
        : (reading ? '¿Terminaste de leer esta sección?' : '¿Terminaste ' + (name.indexOf('Anexo') === 0 ? 'este anexo' : 'este capítulo') + '?');
      var sub = done ? 'Lo marcaste el ' + new Date(done).toLocaleDateString('es-AR') + '.' : '';
      if (!reading) sub = 'Empezaste ' + f.done + ' de ' + f.total + (f.total === 1 ? ' actividad' : ' actividades') + '. ' + sub;
      else if (!done) sub = 'Marcala para llevar la cuenta de tu avance.';
      card.querySelector('.finish__sub').textContent = sub.trim();
      var btn = card.querySelector('button');
      btn.textContent = done ? 'Desmarcar' : (reading ? '✓ Marcar lectura finalizada' : '✓ Marcar como completado');
      btn.setAttribute('aria-pressed', done ? 'true' : 'false');
    });
    renderCert();
    renderCourse();
  }
  // ---- Certificado de finalización (al marcar los 17) ----
  function allFinished() { return finishedCount() === FINISHABLE.length; }
  function buildCertCard() {
    var sec = $('glosario');
    if (!sec) return;
    var card = document.createElement('div');
    card.className = 'cert-card';
    card.id = 'certificado';
    card.setAttribute('data-noprint', '');
    card.innerHTML = '<div class="cert-card__seal" aria-hidden="true">🎓</div>' +
      '<div class="cert-card__text"><span class="cert-card__eyebrow">CERTIFICADO DE FINALIZACIÓN</span><strong></strong><span class="cert-card__sub"></span></div>' +
      '<div class="cert-card__actions"><button type="button" class="st-btn st-btn--md" data-action="certificate">Descargar certificado</button>' +
      '<a class="li-btn" data-linkedin="" target="_blank" rel="noopener" hidden><span aria-hidden="true">in</span>Agregar a mi perfil</a>' +
      '<button type="button" class="li-btn li-btn--outline" data-share="" data-action="share-linkedin" hidden><span aria-hidden="true">in</span>Publicar en LinkedIn</button></div>';
    sec.appendChild(card);
  }
  function renderCert() {
    var card = $('certificado'), ready = allFinished(), left = FINISHABLE.length - finishedCount();
    body.classList.toggle('cert-ready', ready);
    if (!card) return;
    card.classList.toggle('is-locked', !ready);
    card.querySelector('strong').textContent = ready ? '¡Completaste toda la guía!' : 'Tu certificado te espera al final del recorrido';
    card.querySelector('.cert-card__sub').textContent = ready
      ? (user ? 'Descargalo con tu nombre, la fecha y un código único.' : 'Ingresá con Google para descargarlo con tu nombre.')
      : 'Te ' + (left === 1 ? 'falta 1 capítulo' : 'faltan ' + left + ' capítulos') + ' por marcar como terminado' + (left === 1 ? '' : 's') + '.';
    card.querySelector('button').hidden = !ready;
    renderHeroCert(ready, left);
    var li = linkedinUrl();
    $$('[data-linkedin]').forEach(function (a) {
      a.hidden = !(ready && li);
      if (li) a.href = li;
    });
    $$('[data-share]').forEach(function (b) { b.hidden = !(ready && li); });
  }

  // Tarjeta del certificado en la portada: motiva desde el inicio y, al terminar, da acceso directo
  function renderHeroCert(ready, left) {
    if (!$('hero-cert')) return;
    var total = FINISHABLE.length, done = total - left;
    $('hero-cert').classList.toggle('is-ready', ready);
    $('hero-cert-name').textContent = (state.certificate && state.certificate.name) || (user && user.name) || 'Tu nombre';
    $('hero-cert-title').textContent = ready ? '¡Tu certificado está listo!' : 'Obtené tu certificado';
    $('hero-cert-sub').textContent = ready
      ? (user ? 'Descargalo y sumalo a tu perfil de LinkedIn.' : 'Ingresá con Google para descargarlo con tu nombre.')
      : 'Completá los ' + total + ' capítulos y sumalo a tu perfil de LinkedIn.';
    $('hero-cert-progress').hidden = ready;
    $('hero-cert-bar').style.width = (done / total * 100) + '%';
    $('hero-cert-count').textContent = done + ' de ' + total + ' capítulos';
    $('hero-cert-actions').hidden = !ready;
  }

  // ---- LinkedIn y verificación pública del certificado ----
  function siteBase() { return (window.GUIA_CERTIFICADO && window.GUIA_CERTIFICADO.dominio) || new URL('./', location.href).href; }
  function verifyUrl(code) { return new URL('verificar.html?c=' + encodeURIComponent(code), siteBase()).href; }
  // Datos que se imprimen en el certificado (PDF e imagen para LinkedIn)
  function certData() {
    var c = state.certificate, conf = window.GUIA_CERTIFICADO || {}, d = new Date(c.at);
    return {
      name: c.name, code: c.code,
      date: d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }),
      place: conf.lugar || 'Argentina',
      signer: conf.firma || 'ST Relaciones Públicas', signerRole: conf.cargo || '',
      verifyLabel: new URL(siteBase()).host + '/verificar',
      copyright: '© ' + d.getFullYear() + ' ' + (conf.razonSocial || 'ST Relaciones Públicas'),
      withSignature: true
    };
  }
  function loadShare() {
    if (!shareLoading) {
      shareLoading = new Promise(function (resolve, reject) {
        var sc = document.createElement('script');
        sc.src = 'js/compartir.js';
        sc.onload = resolve;
        sc.onerror = function () { shareLoading = null; reject(); };
        document.head.appendChild(sc);
      });
    }
    return shareLoading;
  }
  function linkedinUrl() {
    var c = state.certificate;
    if (!c || !c.registered) return '';
    var conf = window.GUIA_CERTIFICADO || {}, d = new Date(c.at);
    var q = {
      startTask: 'CERTIFICATION_NAME',
      name: conf.titulo || 'Guía práctica de prompting · Curso Claude y Codex',
      issueYear: d.getFullYear(), issueMonth: d.getMonth() + 1,
      certUrl: verifyUrl(c.code), certId: c.code
    };
    if (conf.linkedinOrgId) q.organizationId = conf.linkedinOrgId;
    else q.organizationName = conf.organizacion || 'ST Relaciones Públicas';
    return 'https://www.linkedin.com/profile/add?' + Object.keys(q).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
  }
  // Publicación en LinkedIn: LinkedIn no deja elegir la imagen de su aviso automático
  // ("Celebrando un nuevo certificado"), así que damos la imagen del certificado y el texto listo.
  var shareLoading = null;
  function postText() {
    var c = state.certificate;
    return 'Terminé la Guía práctica de prompting del curso de Claude y Codex de ST Relaciones Públicas 🎓\n\n' +
      'Aprendí a pasar de una idea a una herramienta digital con el método IDEA: pensar antes de pedir, documentar antes de construir y validar antes de publicar.\n\n' +
      'Verificá mi certificado: ' + verifyUrl(c.code) + '\n\n#InteligenciaArtificial #Claude #Prompting';
  }
  function shareLinkedIn() {
    closeMenu();
    var c = state.certificate;
    if (!c || !c.registered) { flash('Primero descargá tu certificado.'); return; }
    // Respaldo: el texto queda copiado por si LinkedIn no lo completa solo
    copyText(postText()).catch(function () {});
    // Se abre LinkedIn enseguida (si no, el navegador bloquea la ventana) y la imagen se descarga acá
    window.open('https://www.linkedin.com/feed/?shareActive=true&text=' + encodeURIComponent(postText()), '_blank', 'noopener');
    loadShare().then(function () {
      return window.GuiaCompartir.imagen(certData());
    }).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Certificado-guia-prompting.png';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      showBanner('Se descargó la imagen de tu certificado. En LinkedIn, sumala con el ícono de foto. El texto también quedó copiado, por si necesitás pegarlo.', null);
    }).catch(function () { flash('No se pudo generar la imagen. Probá de nuevo.', 4000); });
  }

  // Registra el certificado en Firestore (lo exige LinkedIn para "Mostrar credencial")
  function registerCertificate() {
    var c = state.certificate;
    return Promise.resolve().then(function () {
      return backend.save(user.uid, { progress: progressPatch() }, isNew);
    }).then(function () {
      isNew = false;
      return backend.saveCertificate(c.code, user.uid, c.name, c.at);
    }).then(function () {
      c.registered = true;
      save({ certificate: c });
      flush();
    });
  }

  var certDlg = null;
  function askName(current) {
    if (!certDlg) {
      certDlg = document.createElement('dialog');
      certDlg.className = 'ed-dlg';
      certDlg.setAttribute('data-noprint', '');
      certDlg.innerHTML = '<form method="dialog"><h2 class="ed-dlg__title">Tu certificado</h2>' +
        '<p class="ed-dlg__hint">Así va a figurar tu nombre en el certificado. Revisalo antes de descargarlo.</p>' +
        '<label class="ed-dlg__row">Nombre y apellido<input name="name" type="text" maxlength="70" autocomplete="name" required></label>' +
        '<div class="ed-dlg__actions"><span></span><button type="button" data-c="cancel">Cancelar</button><button type="submit" class="ed-primary">Descargar</button></div></form>';
      document.body.appendChild(certDlg);
    }
    return new Promise(function (resolve) {
      var input = certDlg.querySelector('[name="name"]');
      input.value = current || '';
      certDlg.onsubmit = function (e) {
        e.preventDefault();
        var v = input.value.replace(/\s+/g, ' ').trim();
        if (v.length < 3) { input.focus(); return; }
        certDlg.close();
        resolve(v);
      };
      certDlg.querySelector('[data-c="cancel"]').onclick = function () { certDlg.close(); resolve(null); };
      certDlg.oncancel = function () { resolve(null); };
      certDlg.showModal();
      input.select();
    });
  }
  function newCode() {
    var a = new Uint32Array(2);
    (window.crypto || window.msCrypto).getRandomValues(a);
    var s = (a[0].toString(36) + a[1].toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, '') + 'XXXXXXXX';
    return 'ST-' + s.slice(0, 4) + '-' + s.slice(4, 8);
  }
  function downloadCertificate() {
    closeMenu();
    closeDrawer(false);
    if (!allFinished()) { flash('El certificado se habilita cuando marcás los ' + FINISHABLE.length + ' capítulos como terminados.', 4500); return; }
    if (!canEdit()) { askLogin(); return; }
    askName((state.certificate && state.certificate.name) || user.name).then(function (name) {
      if (!name) return;
      var c = state.certificate || {};
      state.certificate = { name: name, code: c.code || newCode(), at: c.at || Date.now(), registered: !!(c.registered && c.name === name) };
      save({ certificate: state.certificate });
      flash('Preparando tu certificado…', 6000);
      var reg = state.certificate.registered ? Promise.resolve() : registerCertificate().catch(function () { /* sin verificación pública */ });
      Promise.all([loadPdfLib(), loadShare(), reg]).then(function () {
        return window.GuiaCompartir.canvas(certData(), 3);
      }).then(function (canvas) {
        var doc = window.GuiaPdfCertificado(canvas, state.certificate.registered ? verifyUrl(state.certificate.code) : '',
          'Certificado de finalización · ' + name);
        var who = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
        doc.save('Certificado-guia-prompting-' + who + '.pdf');
        renderCert();
        var li = linkedinUrl();
        if (li) showBanner('¡Felicitaciones! Tu certificado se descargó. ¿Lo sumás a tu perfil de LinkedIn?', null, 'Agregar a mi perfil', function () { window.open(li, '_blank', 'noopener'); });
        else flash('¡Felicitaciones! Tu certificado se descargó.', 4500);
      }).catch(function () { flash('No se pudo generar el certificado. Revisá la conexión y probá de nuevo.', 5000); });
    });
  }

  function toggleFinish(btn) {
    var id = btn.getAttribute('data-ref');
    if (state.finished[id]) delete state.finished[id];
    else state.finished[id] = Date.now();
    save({ finished: state.finished });
    renderFinish();
    renderDrawer();
    if (!state.finished[id]) { flash('Desmarcado.'); return; }
    var ids = CHAPTERS.map(function (c) { return c[0]; }), i = ids.indexOf(id);
    var next = -1;
    for (var j = i + 1; j < CHAPTERS.length; j++) if (!state.finished[CHAPTERS[j][0]]) { next = j; break; }
    var msg = '¡Bien! Llevás ' + finishedCount() + ' de ' + FINISHABLE.length + ' terminados.';
    if (next >= 0) showBanner(msg, { idx: next, delta: 0 }, 'Seguir con ' + shortLabel(next));
    else if (allFinished()) showBanner('¡Terminaste toda la guía! 🎉', null, 'Descargar mi certificado', downloadCertificate);
    else flash(msg, 4500);
  }

  function markHere() {
    var idx = currentIndex();
    if (idx < 0) { flash('Empezá a leer y después marcá hasta dónde llegaste.'); return; }
    state.bookmark = { idx: idx, delta: offsetIn(idx), at: Date.now() };
    save({ bookmark: state.bookmark });
    renderDrawer();
    flash('Guardado. Llegaste hasta: ' + label(idx));
  }

  // ---- PDF "Mi avance" (lectura + respuestas), generado en el navegador ----
  var pdfLib = null;
  function loadPdfLib() {
    if (!pdfLib) {
      pdfLib = import(new URL('js/pdf-avance.js', document.baseURI).href).then(function () { return window.GuiaPdfAvance; });
      // window.GuiaPdfCertificado queda disponible con el mismo módulo
      pdfLib.catch(function () { pdfLib = null; });
    }
    return pdfLib;
  }
  function toDataUrl(src) {
    return fetch(src).then(function (r) { return r.blob(); }).then(function (b) {
      return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); });
    }).catch(function () { return null; });
  }
  function avanceData() {
    var sections = [], byTitle = {}, checksDone = 0, checksTotal = 0;
    Object.keys(fields).forEach(function (id) {
      var host = document.querySelector('[data-field="' + id + '"]');
      var parts = (host.getAttribute('data-label') || id).split(' › ');
      var title = parts.shift();
      var sec = byTitle[title];
      if (!sec) { sec = byTitle[title] = { title: title, items: [], done: 0, total: 0 }; sections.push(sec); }
      var v = values[id], isCheck = fields[id].tagName === 'INPUT';
      sec.total++;
      if (isCheck) checksTotal++;
      if (v === true || (typeof v === 'string' && v.trim())) {
        sec.done++;
        if (isCheck) checksDone++;
        sec.items.push({ label: parts.join(' › '), value: v === true ? '' : v, kind: isCheck ? 'check' : 'text' });
      }
    });
    var at = state.last || state.bookmark;
    return {
      name: user ? user.name : '', email: user ? user.email : '',
      date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      pct: Math.round(finishedPct()), finishedCount: finishedCount(), finishedTotal: FINISHABLE.length, done: doneCount(), total: TOTAL, checksDone: checksDone, checksTotal: checksTotal,
      where: at ? label(at.idx) : '', bookmark: state.bookmark ? label(state.bookmark.idx) : '',
      chapters: FINISHABLE.map(function (c) { return { num: c[1] === '·' ? '' : c[1], title: c[2], read: !!state.finished[c[0]] }; }),
      sections: sections
    };
  }
  function downloadAvance(btn) {
    closeMenu();
    if (!canEdit()) { askLogin(); return; }
    if (btn) btn.setAttribute('aria-busy', 'true');
    flash('Preparando tu PDF…', 6000);
    Promise.all([loadPdfLib(), toDataUrl('assets/logo-coral.png')]).then(function (r) {
      var data = avanceData();
      data.logo = r[1];
      var doc = r[0](data);
      var who = (user.name || 'alumno').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
      doc.save('Mi-avance-guia-prompting-' + who + '.pdf');
      flash('Listo. Tu PDF se descargó.');
    }).catch(function () {
      flash('No se pudo generar el PDF. Revisá la conexión y probá de nuevo.', 5000);
    }).then(function () { if (btn) btn.removeAttribute('aria-busy'); });
  }

  // ---- Copiar prompts ----
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy'));
    });
  }
  function copyPrompt(btn) {
    var box = btn.closest('.prompt-head').nextElementSibling;
    var text = box.innerText.replace(/\n{3,}/g, '\n\n').trim();
    copyText(text).then(function () {
      btn.classList.add('is-done');
      btn.textContent = 'Copiado';
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.classList.remove('is-done'); btn.textContent = 'Copiar'; }, 2000);
    }, function () {
      flash('No se pudo copiar. Seleccioná el texto y copialo a mano.');
    });
  }

  // ---- Campos completables ----
  var fields = {}; // id -> control
  var values = {}; // id -> string | boolean
  var TOTAL = 0;

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }
  function setPrintText(el, v) {
    if (el._print) el._print.textContent = typeof v === 'string' ? v : '';
  }

  function buildFields() {
    $$('[data-field]').forEach(function (host) {
      var id = host.getAttribute('data-field');
      var lbl = host.getAttribute('data-label') || '';
      var ctl;
      TOTAL++;
      if (host.tagName === 'INPUT') {
        ctl = host;
        ctl.addEventListener('click', function (e) { if (!canEdit()) { e.preventDefault(); askLogin(); } });
        ctl.addEventListener('change', function () { onFieldChange(id, ctl.checked); });
        fields[id] = ctl;
        return;
      }
      if (host.getAttribute('data-kind') === 'estado') {
        ctl = document.createElement('select');
        ESTADOS.forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = o; opt.textContent = o || '—';
          ctl.appendChild(opt);
        });
        ctl.addEventListener('mousedown', function (e) { if (!canEdit()) { e.preventDefault(); askLogin(); } });
        ctl.addEventListener('keydown', function (e) { if (!canEdit() && e.key !== 'Tab') { e.preventDefault(); askLogin(); } });
        ctl.addEventListener('change', function () { onFieldChange(id, ctl.value); });
      } else {
        ctl = document.createElement('textarea');
        ctl.rows = 1;
        ctl.spellcheck = true;
        if (host.getAttribute('data-kind') === 'lines') {
          var h = parseInt(host.style.height, 10) || 64;
          host.style.setProperty('--h', h + 'px');
          host.style.height = '';
          host.style.background = '';
          ctl.className = 'field field--lines';
        }
        if (host.tagName === 'TD') host.addEventListener('click', function (e) { if (e.target === host) ctl.focus(); });
        if (host.tagName === 'TD') ctl.style.minHeight = (parseInt(host.style.height, 10) || 40) + 'px';
        ctl.addEventListener('input', function () { autosize(ctl); onFieldChange(id, ctl.value); });
        ctl.addEventListener('focus', function () { if (!canEdit()) askLogin(); });
      }
      ctl.className = ctl.className || 'field';
      ctl.setAttribute('aria-label', lbl.split(' › ').slice(-2).join(' · '));
      host.appendChild(ctl);
      var pr = document.createElement('div');
      pr.className = 'field-print';
      host.appendChild(pr);
      ctl._print = pr;
      fields[id] = ctl;
    });
    $$('.js-total-count').forEach(function (el) { el.textContent = TOTAL; });
  }

  function setEditable(on) {
    Object.keys(fields).forEach(function (id) {
      var c = fields[id];
      if (c.tagName === 'TEXTAREA') {
        c.readOnly = !on;
        if (c.classList.contains('field--lines')) c.placeholder = on ? 'Escribí acá…' : '';
      }
    });
  }

  function applyValues(v) {
    values = v || {};
    Object.keys(fields).forEach(function (id) {
      var c = fields[id], val = values[id];
      if (c.tagName === 'INPUT') c.checked = val === true;
      else {
        c.value = typeof val === 'string' ? val : '';
        setPrintText(c, c.value);
        if (c.tagName === 'TEXTAREA') autosize(c);
      }
    });
    updateCounts();
  }

  function doneCount() {
    var n = 0;
    for (var k in values) if (values[k] === true || (typeof values[k] === 'string' && values[k].trim())) n++;
    return n;
  }
  function updateCounts() {
    var n = doneCount();
    $$('.js-done-count').forEach(function (el) { el.textContent = n; });
    renderFinish();
  }

  var askedAt = 0;
  function askLogin() {
    if (!backend || !backend.ready) return;
    if (Date.now() - askedAt < 1500) return;
    askedAt = Date.now();
    if (user) { flash('Cargando tus respuestas…', 2000); return; }
    showBanner('Ingresá con Google para completar los ejercicios y guardar tus respuestas.', null, 'Ingresar con Google', login);
  }

  // ---- Sesión y guardado en la nube ----
  var backend = null, user = null, loaded = false, isNew = false;
  function canEdit() { return !!(user && loaded); }
  var pending = {}, saveTimer = null, saving = false, progressTimer = null;

  function setAuthClass(name) {
    body.classList.remove('auth-none', 'auth-out', 'auth-in', 'auth-pending');
    body.classList.add(name);
  }

  function setSaveState(kind) {
    var pill = $('save-pill'), txt = $('save-state');
    var map = {
      saving: ['Guardando…', 'Guardando tus cambios…'],
      saved: ['Guardado', 'Todo guardado en tu cuenta.'],
      error: ['Sin conexión', 'No se pudo guardar. Se reintenta solo cuando vuelva la conexión.']
    };
    pill.textContent = map[kind][0];
    pill.className = 'save-pill' + (kind === 'saving' ? ' is-saving' : kind === 'error' ? ' is-error' : '');
    txt.textContent = map[kind][1];
  }

  function onFieldChange(id, v) {
    if (!canEdit()) return;
    values[id] = v;
    pending[id] = v;
    if (fields[id] && fields[id]._print) setPrintText(fields[id], v);
    updateCounts();
    setSaveState('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, SAVE_DELAY);
  }

  function progressPatch() {
    var p = { maxIdx: state.maxIdx, maxPct: Math.round(state.maxPct * 10) / 10,
      finished: state.finished, pct: Math.round(finishedPct()), finishedCount: finishedCount(), finishedTotal: FINISHABLE.length };
    if (state.bookmark) p.bookmark = state.bookmark;
    if (state.last) p.last = state.last;
    if (state.certificate) p.certificate = state.certificate;
    var at = state.last || state.bookmark;
    if (at) p.where = label(at.idx); // texto legible para el panel de seguimiento
    return p;
  }

  function flush() {
    clearTimeout(saveTimer);
    clearTimeout(progressTimer);
    progressTimer = null;
    if (!canEdit() || saving) return;
    var f = pending;
    pending = {};
    var patch = {
      progress: progressPatch(),
      stats: { done: doneCount(), total: TOTAL, pct: Math.round(finishedPct()), at: Date.now() },
      profile: { name: user.name, email: user.email, photo: user.photo }
    };
    if (Object.keys(f).length) patch.fields = f;
    saving = true;
    backend.save(user.uid, patch, isNew).then(function () {
      isNew = false;
      saving = false;
      setSaveState('saved');
      if (Object.keys(pending).length) flush();
    }, function () {
      saving = false;
      for (var k in f) if (!(k in pending)) pending[k] = f[k];
      setSaveState('error');
      saveTimer = setTimeout(flush, 10000);
    });
  }

  function queueProgressSync() {
    if (progressTimer) return;
    progressTimer = setTimeout(flush, PROGRESS_DELAY);
  }

  function mergeProgress(remote) {
    if (!remote) return;
    if (typeof remote.maxIdx === 'number') state.maxIdx = Math.max(state.maxIdx, remote.maxIdx);
    if (typeof remote.maxPct === 'number') state.maxPct = Math.max(state.maxPct, remote.maxPct);
    if (remote.bookmark && (!state.bookmark || (remote.bookmark.at || 0) > (state.bookmark.at || 0))) state.bookmark = remote.bookmark;
    if (!state.last && remote.last) state.last = remote.last;
    if (remote.certificate && !state.certificate) state.certificate = remote.certificate;
    var rf = remote.finished || {};
    for (var id in rf) if (!state.finished[id]) state.finished[id] = rf[id];
    var local = { maxIdx: state.maxIdx, maxPct: state.maxPct, finished: state.finished };
    if (state.certificate) local.certificate = state.certificate;
    if (state.bookmark) local.bookmark = state.bookmark;
    if (state.last) local.last = state.last;
    var saved = load();
    for (var k in local) saved[k] = local[k];
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
  }

  function inAppBrowser() {
    return /Instagram|FBAN|FBAV|FB_IAB|Line\/|WhatsApp|TikTok|musical_ly|Bytedance|Snapchat|LinkedInApp|Twitter/i.test(navigator.userAgent || '');
  }

  function login() {
    if (!backend || !backend.ready) return;
    hideBanner();
    if (inAppBrowser()) {
      showBanner('Google no permite ingresar desde el navegador de esta app. Abrí la guía en Chrome o Safari.', null, 'Copiar enlace', function () {
        copyText(location.href.split('#')[0]).then(function () { flash('Enlace copiado. Pegalo en Chrome o Safari.', 4000); });
      });
      return;
    }
    backend.signIn().catch(function (e) {
      var code = e && e.code || '';
      if (code === 'auth/unauthorized-domain') flash('Este dominio todavía no está autorizado en Firebase.', 5000);
      else if (code === 'auth/network-request-failed') flash('No hay conexión. Probá de nuevo en un momento.', 4000);
      else flash('No se pudo ingresar. Probá de nuevo.', 4000);
    });
  }

  function logout() {
    closeMenu();
    flush();
    backend.signOut().then(function () { flash('Cerraste sesión. Tus respuestas quedaron guardadas en tu cuenta.'); });
  }

  function isAdmin(email) {
    return (window.GUIA_ADMINS || []).some(function (a) { return a.toLowerCase() === String(email || '').toLowerCase(); });
  }
  function editing() { return body.classList.contains('edit-mode'); }
  var editorLoading = null;
  function startEditor() {
    if (!user || !isAdmin(user.email)) return;
    closeMenu();
    closeDrawer(false);
    if (editing()) return;
    if (!editorLoading) {
      editorLoading = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'js/editor.js';
        s.onload = resolve;
        s.onerror = function () { editorLoading = null; reject(); };
        document.head.appendChild(s);
      });
    }
    editorLoading.then(function () {
      window.GuiaEditor.start({ backend: backend, user: user, flash: flash });
    }, function () { flash('No se pudo abrir el editor. Revisá la conexión.'); });
  }

  function onUser(u) {
    loaded = false;
    body.classList.toggle('is-admin', !!(u && isAdmin(u.email)));
    if (!u && editing() && window.GuiaEditor) window.GuiaEditor.stop();
    if (!u) {
      user = null;
      setAuthClass('auth-out');
      setEditable(false);
      applyValues({});
      return;
    }
    user = u;
    $('account-name').textContent = u.name || 'Mi cuenta';
    $('account-email').textContent = u.email;
    $('drawer-user').textContent = u.name || u.email;
    $$('.js-first-name').forEach(function (el) { el.textContent = (u.name || '').split(' ')[0] || 'de nuevo'; });
    var img = $('avatar-img');
    if (u.photo) { img.src = u.photo; img.hidden = false; $('avatar-initial').textContent = ''; }
    else { img.hidden = true; $('avatar-initial').textContent = (u.name || u.email || '?').charAt(0).toUpperCase(); }
    img.onerror = function () { img.hidden = true; $('avatar-initial').textContent = (u.name || u.email || '?').charAt(0).toUpperCase(); };
    setAuthClass('auth-in');
    setEditable(false);
    setSaveState('saved');
    backend.load(u.uid).then(function (data) {
      if (user !== u) return;
      isNew = !data;
      data = data || {};
      var hadBookmark = state.bookmark;
      mergeProgress(data.progress);
      applyValues(data.fields);
      renderFinish();
      loaded = true;
      setEditable(true);
      if (/[?&]editar=1/.test(location.search)) startEditor();
      renderDrawer();
      track();
      flush();
      // Si en este dispositivo no había marca y en la cuenta sí, ofrecer retomar
      if (!hadBookmark && state.bookmark && state.bookmark.idx > 0 && Math.abs(currentIndex() - state.bookmark.idx) > 0) {
        showBanner('Marcaste hasta: ' + label(state.bookmark.idx), state.bookmark);
      } else if (isNew) {
        flash('¡Listo! Ya podés completar los ejercicios. Todo se guarda solo.', 4500);
      }
    }, function () {
      setSaveState('error');
      flash('No se pudieron cargar tus respuestas. Revisá la conexión y recargá la página.', 5000);
    });
  }

  function startBackend() {
    if (!window.GUIA_FIREBASE_CONFIG) { setAuthClass('auth-none'); return; }
    setAuthClass('auth-pending');
    var onReady = function () {
      backend = window.GuiaBackend;
      if (!backend || !backend.ready) { setAuthClass('auth-none'); return; }
      backend.onUser(onUser);
      // Textos, videos y enlaces editados por la docente
      backend.loadContent().then(function (c) { if (window.GuiaContent && !editing()) window.GuiaContent.load(c); }, function () {});
    };
    window.addEventListener('guia-backend', onReady, { once: true });
    var s = document.createElement('script');
    s.type = 'module';
    s.src = 'js/backend.js';
    s.onerror = function () { setAuthClass('auth-none'); };
    document.head.appendChild(s);
  }

  // ---- Eventos ----
  var actions = {
    'toggle-drawer': function () { if (drawer.hidden) openDrawer(); else closeDrawer(); },
    'close-drawer': function () { closeDrawer(); },
    'mark': markHere,
    'pdf-avance': downloadAvance,
    'resume': function () {
      var a = state.bannerAction, t = state.bannerTarget;
      hideBanner();
      if (a) a(); else if (t) goTo(t);
    },
    'dismiss-banner': hideBanner,
    'top': function () { window.scrollTo({ top: 0, behavior: 'smooth' }); },
    'login': function () { closeDrawer(false); login(); },
    'logout': logout,
    'account-menu': function () { if (menu.hidden) openMenu(); else closeMenu(); },
    'copy': copyPrompt,
    'edit-guide': startEditor,
    'finish': toggleFinish,
    'certificate': downloadCertificate,
    'share-linkedin': shareLinkedIn
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (el && actions[el.dataset.action]) actions[el.dataset.action](el);
    if (!e.target.closest('.account')) closeMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDrawer(); closeMenu(); }
    // Mantener el foco dentro del índice mientras está abierto
    if (e.key === 'Tab' && !drawer.hidden) {
      var f = Array.prototype.filter.call(drawer.querySelectorAll('a[href],button'), function (x) { return x.offsetParent; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  window.addEventListener('scroll', function () {
    if (!raf) raf = requestAnimationFrame(function () { raf = null; track(); });
  }, { passive: true });

  // Guardar lo pendiente al salir o al cambiar de pestaña / app
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && user) flush(); });
  window.addEventListener('pagehide', function () { if (user) flush(); });
  window.addEventListener('beforeprint', function () { closeMenu(); closeDrawer(false); });

  // ---- Inicio ----
  buildFields();
  setEditable(false);
  var saved = load();
  state.maxIdx = typeof saved.maxIdx === 'number' ? saved.maxIdx : -1;
  state.maxPct = saved.maxPct || 0;
  state.bookmark = saved.bookmark || null;
  state.last = saved.last || null;
  state.finished = saved.finished || {};
  state.certificate = saved.certificate || null;
  buildFinishCards();
  buildCertCard(); // va después del "¿Terminaste?" del glosario
  buildCourse(); // "Continuar" del inicio reemplaza al aviso de "La última vez llegaste a…"
  renderCert();
  route();
  window.addEventListener('hashchange', route);
  startBackend();
  setTimeout(track, 300);
})();
