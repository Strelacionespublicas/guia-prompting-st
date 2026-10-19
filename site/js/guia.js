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

  var state = { current: -1, maxIdx: -1, maxPct: 0, bookmark: null, last: null, bannerTarget: null };
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
    var doc = document.documentElement, max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    state.current = currentIndex();
    state.maxIdx = Math.max(state.maxIdx, state.current);
    state.maxPct = Math.max(state.maxPct, pct);
    $('progress-bar').style.width = pct.toFixed(1) + '%';
    if (!drawer.hidden) renderDrawer();
    if (state.current >= 0) {
      state.last = { idx: state.current, delta: offsetIn(state.current) };
      save({ maxIdx: state.maxIdx, maxPct: state.maxPct, last: state.last });
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
    closeMenu();
    setTimeout(function () { window.print(); }, 50);
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
    var p = { maxIdx: state.maxIdx, maxPct: Math.round(state.maxPct * 10) / 10 };
    if (state.bookmark) p.bookmark = state.bookmark;
    if (state.last) p.last = state.last;
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
      stats: { done: doneCount(), total: TOTAL, maxPct: Math.round(state.maxPct), at: Date.now() },
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
    var local = { maxIdx: state.maxIdx, maxPct: state.maxPct };
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

  function onUser(u) {
    loaded = false;
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
      loaded = true;
      setEditable(true);
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
    'print': printPdf,
    'resume': function () {
      var a = state.bannerAction, t = state.bannerTarget;
      hideBanner();
      if (a) a(); else if (t) goTo(t);
    },
    'dismiss-banner': hideBanner,
    'login': function () { closeDrawer(false); login(); },
    'logout': logout,
    'account-menu': function () { if (menu.hidden) openMenu(); else closeMenu(); },
    'copy': copyPrompt
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
  window.addEventListener('beforeprint', function () { closeMenu(); });

  // ---- Inicio ----
  buildFields();
  setEditable(false);
  var saved = load();
  state.maxIdx = typeof saved.maxIdx === 'number' ? saved.maxIdx : -1;
  state.maxPct = saved.maxPct || 0;
  state.bookmark = saved.bookmark || null;
  state.last = saved.last || null;
  var resumeFrom = saved.bookmark || saved.last;
  if (resumeFrom && resumeFrom.idx > 0 && !location.hash) {
    showBanner((saved.bookmark ? 'Marcaste hasta: ' : 'La última vez llegaste a: ') + label(resumeFrom.idx), resumeFrom);
  }
  startBackend();
  setTimeout(track, 300);
})();
