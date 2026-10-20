// Modo edición para la docente: editar textos, cargar videos y agregar enlaces.
// Lo carga guia.js solo para las cuentas de GUIA_ADMINS; las reglas de Firestore
// impiden que cualquier otra cuenta guarde cambios.
(function () {
  'use strict';

  var C = window.GuiaContent;
  var body = document.body;
  var api = null, draft = null, active = null, savedRange = null, dirty = false, bar = null, dlg = null;

  function clone(o) { return JSON.parse(JSON.stringify(o || {})); }
  function blocks() { return document.querySelectorAll('[data-edit]'); }
  function idOf(el) { return el.getAttribute('data-edit'); }

  // HTML del bloque sin los videos/enlaces agregados debajo
  function blockHtml(el) {
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.media-extra'), function (n) { n.remove(); });
    return C.sanitize(c.innerHTML);
  }

  function setDirty(v) {
    dirty = v;
    var n = Object.keys(draft.blocks).length + Object.keys(draft.videos).length +
      Object.keys(draft.extras).reduce(function (a, k) { return a + draft.extras[k].length; }, 0);
    bar.querySelector('.ed-status').textContent = dirty ? 'Hay cambios sin guardar' : (n ? n + ' ediciones publicadas' : 'Sin ediciones');
    bar.querySelector('[data-ed="save"]').disabled = !dirty;
  }

  function onInput(e) {
    var el = e.target.closest('[data-edit]');
    if (!el || el.hasAttribute('data-locked')) return;
    var id = idOf(el), html = blockHtml(el);
    if (html === C.sanitize(C.original[id])) delete draft.blocks[id];
    else draft.blocks[id] = html;
    setDirty(true);
  }

  function onKey(e) {
    var el = e.target.closest && e.target.closest('[data-edit]');
    if (!el) return;
    if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); document.execCommand('bold'); }
  }
  function onPaste(e) {
    if (!e.target.closest('[data-edit]')) return;
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  }
  function onFocus(e) {
    var el = e.target.closest && e.target.closest('[data-edit]');
    if (!el) return;
    if (active) active.classList.remove('is-active');
    active = el;
    el.classList.add('is-active');
    bar.querySelector('.ed-where').textContent = describe(el);
    var sec = el.closest('section[id]');
    if (sec) bar.querySelector('.ed-jump').value = sec.id;
  }
  function describe(el) {
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > 46 ? t.slice(0, 46) + '…' : t;
  }
  // En modo edición los enlaces no navegan: se editan
  function onClick(e) {
    var a = e.target.closest('[data-edit] a');
    if (a && body.classList.contains('edit-mode')) e.preventDefault();
    var act = e.target.closest('[data-edit-action]');
    if (!act) return;
    e.preventDefault();
    if (act.getAttribute('data-edit-action') === 'remove-extra') {
      var ref = act.getAttribute('data-ref').split(':'), list = draft.extras[ref[0]] || [];
      list.splice(Number(ref[1]), 1);
      if (!list.length) delete draft.extras[ref[0]];
      C.apply(draft, { onlyMedia: true });
      setDirty(true);
    } else if (act.getAttribute('data-edit-action') === 'video') {
      editVideo(act.getAttribute('data-ref'));
    }
  }

  function keepSelection() {
    var sel = window.getSelection();
    savedRange = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  }
  function restoreSelection() {
    if (!savedRange) return false;
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
    return true;
  }

  // ---- Ventana para cargar enlaces y videos ----
  function ask(opts) {
    return new Promise(function (resolve) {
      dlg.querySelector('.ed-dlg__title').textContent = opts.title;
      dlg.querySelector('.ed-dlg__hint').textContent = opts.hint || '';
      var url = dlg.querySelector('[name="url"]'), title = dlg.querySelector('[name="title"]');
      url.value = opts.url || '';
      title.value = opts.label || '';
      dlg.querySelector('.ed-dlg__label-row').hidden = !opts.withTitle;
      dlg.querySelector('[data-ed="remove"]').hidden = !opts.removable;
      var err = dlg.querySelector('.ed-dlg__error');
      err.textContent = '';
      dlg.onsubmit = function (e) {
        e.preventDefault();
        var u = url.value.trim();
        if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
        if (!C.safeUrl(u) || !/\./.test(u)) { err.textContent = 'Revisá el enlace: tiene que empezar con https://'; return; }
        dlg.close();
        resolve({ url: u, title: title.value.trim() });
      };
      dlg.querySelector('[data-ed="remove"]').onclick = function () { dlg.close(); resolve({ remove: true }); };
      dlg.querySelector('[data-ed="cancel"]').onclick = function () { dlg.close(); resolve(null); };
      dlg.oncancel = function () { resolve(null); };
      dlg.showModal();
      url.focus();
    });
  }

  function addLink() {
    keepSelection();
    if (!active || !savedRange || savedRange.collapsed || !active.contains(savedRange.commonAncestorContainer)) {
      api.flash('Primero seleccioná con el mouse el texto que querés convertir en enlace.', 4000);
      return;
    }
    ask({ title: 'Agregar enlace', hint: 'Pegá la dirección. El texto seleccionado se va a convertir en enlace.' }).then(function (r) {
      if (!r || r.remove) return;
      active.focus();
      restoreSelection();
      document.execCommand('createLink', false, r.url);
      onInput({ target: active });
    });
  }

  function addMedia() {
    if (!active) { api.flash('Hacé clic en el bloque debajo del cual querés agregar el video o enlace.', 4000); return; }
    var id = idOf(active);
    ask({ title: 'Agregar video o enlace', withTitle: true, hint: 'YouTube, Vimeo, Loom y Google Drive se muestran como reproductor. Cualquier otro enlace aparece como tarjeta.' }).then(function (r) {
      if (!r || r.remove) return;
      (draft.extras[id] = draft.extras[id] || []).push({ url: r.url, title: r.title });
      C.apply(draft, { onlyMedia: true });
      setDirty(true);
    });
  }

  function editVideo(vid) {
    var v = draft.videos[vid];
    ask({ title: 'Video demostrativo ' + vid.replace('video', ''), url: v && v.url, removable: !!v,
      hint: 'Pegá el enlace de YouTube, Vimeo, Loom o Google Drive (compartido como "Cualquier persona con el enlace").' }).then(function (r) {
      if (!r) return;
      if (r.remove) delete draft.videos[vid];
      else draft.videos[vid] = { url: r.url };
      C.apply(draft, { onlyMedia: true });
      setDirty(true);
    });
  }

  function resetBlock() {
    if (!active) return;
    var id = idOf(active);
    delete draft.blocks[id];
    C.apply(draft);
    setDirty(true);
    api.flash('Volvió el texto original de ese bloque.');
  }

  function save() {
    var btn = bar.querySelector('[data-ed="save"]');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    api.backend.saveContent(draft, api.user.email).then(function () {
      C.cache(draft);
      setDirty(false);
      api.flash('Publicado. Los alumnos ya ven los cambios.', 4000);
    }, function () {
      btn.disabled = false;
      api.flash('No se pudo guardar. Revisá la conexión, o que tu email esté en las reglas de Firestore.', 6000);
    }).then(function () { btn.textContent = 'Guardar y publicar'; });
  }

  function stop() {
    if (dirty && !window.confirm('Tenés cambios sin guardar. ¿Salir y descartarlos?')) return;
    if (dirty) C.apply(C.saved()); // descartar lo no guardado
    dirty = false;
    body.classList.remove('edit-mode');
    Array.prototype.forEach.call(blocks(), function (el) { el.removeAttribute('contenteditable'); el.classList.remove('is-active'); });
    document.removeEventListener('input', onInput, true);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('paste', onPaste, true);
    document.removeEventListener('focusin', onFocus, true);
    document.removeEventListener('click', onClick, true);
    window.removeEventListener('beforeunload', warn);
    bar.hidden = true;
    active = null;
  }
  function warn(e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } }

  // ---- Secciones: saber dónde estás y saltar a otra ----
  function sectionOptions() {
    return Array.prototype.map.call(document.querySelectorAll('section[id]'), function (sec) {
      var h = sec.querySelector('h1, h2'), eyebrow = sec.querySelector('h2') && sec.querySelector('h2').previousElementSibling;
      var t = (h ? h.textContent : sec.id).replace(/\s+/g, ' ').trim();
      var pre = eyebrow && /CAPÍTULO|ANEXO/.test(eyebrow.textContent) ? eyebrow.textContent.split('·')[0].trim().replace('CAPÍTULO', 'Cap.').replace('ANEXO', 'Anexo') + ' · ' : '';
      return '<option value="' + sec.id + '">' + (pre + t).replace(/</g, '&lt;') + '</option>';
    }).join('');
  }
  function currentSection() {
    var cur = null;
    Array.prototype.forEach.call(document.querySelectorAll('section[id]'), function (sec) { if (sec.getClientRects().length && sec.getBoundingClientRect().top <= 140) cur = sec; });
    return cur;
  }
  function syncSection() {
    var sec = currentSection(), sel = bar && bar.querySelector('.ed-jump');
    if (sec && sel && document.activeElement !== sel) sel.value = sec.id;
  }

  // ---- Barra movible (la posición se recuerda en este navegador) ----
  var POS_KEY = 'guia-prompting-st:barra-edicion';
  function placeBar(pos) {
    if (!pos) { bar.style.left = bar.style.top = ''; bar.classList.remove('is-moved'); return; }
    var r = bar.getBoundingClientRect();
    var x = Math.min(Math.max(8, pos.x), window.innerWidth - r.width - 8);
    var y = Math.min(Math.max(8, pos.y), window.innerHeight - r.height - 8);
    bar.classList.add('is-moved');
    bar.style.left = x + 'px';
    bar.style.top = y + 'px';
  }
  function makeDraggable() {
    var grip = bar.querySelector('.ed-grip'), start = null;
    grip.addEventListener('pointerdown', function (e) {
      var r = bar.getBoundingClientRect();
      start = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      grip.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    grip.addEventListener('pointermove', function (e) {
      if (start) placeBar({ x: e.clientX - start.dx, y: e.clientY - start.dy });
    });
    grip.addEventListener('pointerup', function () {
      if (!start) return;
      start = null;
      try { localStorage.setItem(POS_KEY, JSON.stringify({ x: parseFloat(bar.style.left), y: parseFloat(bar.style.top) })); } catch (e) {}
    });
    grip.addEventListener('dblclick', function () {
      placeBar(null);
      try { localStorage.removeItem(POS_KEY); } catch (e) {}
    });
    window.addEventListener('resize', function () { if (bar.classList.contains('is-moved')) placeBar({ x: parseFloat(bar.style.left), y: parseFloat(bar.style.top) }); });
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch (e) {}
    if (saved) requestAnimationFrame(function () { placeBar(saved); });
  }

  function build() {
    bar = document.createElement('div');
    bar.className = 'ed-bar';
    bar.setAttribute('data-noprint', '');
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Edición de la guía');
    bar.innerHTML =
      '<span class="ed-grip" title="Arrastrá para mover la barra · doble clic para volver a su lugar" aria-hidden="true">⠿</span>' +
      '<div class="ed-bar__info"><strong>Modo edición</strong><select class="ed-jump" aria-label="Ir a una sección">' + sectionOptions() + '</select>' +
      '<span class="ed-where">Hacé clic en un texto para editarlo</span></div>' +
      '<div class="ed-bar__tools">' +
      '<button type="button" data-ed="bold" title="Negrita (Ctrl+B)"><b>N</b></button>' +
      '<button type="button" data-ed="link">Enlace</button>' +
      '<button type="button" data-ed="media">＋ Video o enlace debajo</button>' +
      '<button type="button" data-ed="reset">Texto original</button>' +
      '</div>' +
      '<div class="ed-bar__save"><span class="ed-status"></span>' +
      '<button type="button" class="ed-primary" data-ed="save" disabled>Guardar y publicar</button>' +
      '<button type="button" data-ed="exit">Salir</button></div>';
    document.body.appendChild(bar);
    makeDraggable();
    bar.querySelector('.ed-jump').addEventListener('change', function (e) {
      // En la vista de curso cada capítulo es una pantalla: se navega con el enlace
      if (document.getElementById(e.target.value)) location.hash = e.target.value;
    });
    var t = null;
    window.addEventListener('scroll', function () { if (!t) t = setTimeout(function () { t = null; syncSection(); }, 150); }, { passive: true });
    // mousedown en la barra no debe quitar la selección del texto
    bar.addEventListener('mousedown', function (e) { if (e.target.closest('button')) { keepSelection(); e.preventDefault(); } });
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ed]');
      if (!b) return;
      var a = b.getAttribute('data-ed');
      if (a === 'bold') { restoreSelection(); document.execCommand('bold'); if (active) onInput({ target: active }); }
      if (a === 'link') addLink();
      if (a === 'media') addMedia();
      if (a === 'reset') resetBlock();
      if (a === 'save') save();
      if (a === 'exit') stop();
    });

    dlg = document.createElement('dialog');
    dlg.className = 'ed-dlg';
    dlg.setAttribute('data-noprint', '');
    dlg.innerHTML =
      '<form method="dialog"><h2 class="ed-dlg__title"></h2><p class="ed-dlg__hint"></p>' +
      '<label class="ed-dlg__row">Enlace<input name="url" type="text" inputmode="url" spellcheck="false" placeholder="https://" autocomplete="off"></label>' +
      '<label class="ed-dlg__row ed-dlg__label-row">Título (opcional)<input name="title" type="text" maxlength="140" autocomplete="off"></label>' +
      '<p class="ed-dlg__error" role="alert"></p>' +
      '<div class="ed-dlg__actions"><button type="button" class="ed-danger" data-ed="remove">Quitar video</button>' +
      '<span></span><button type="button" data-ed="cancel">Cancelar</button><button type="submit" class="ed-primary">Aceptar</button></div></form>';
    document.body.appendChild(dlg);
  }

  window.GuiaEditor = {
    start: function (opts) {
      api = opts;
      if (!bar) build();
      draft = clone(C.current());
      draft.blocks = draft.blocks || {}; draft.videos = draft.videos || {}; draft.extras = draft.extras || {};
      body.classList.add('edit-mode');
      Array.prototype.forEach.call(blocks(), function (el) {
        if (!el.hasAttribute('data-locked')) el.setAttribute('contenteditable', 'true');
      });
      document.addEventListener('input', onInput, true);
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('paste', onPaste, true);
      document.addEventListener('focusin', onFocus, true);
      document.addEventListener('click', onClick, true);
      window.addEventListener('beforeunload', warn);
      bar.hidden = false;
      syncSection();
      setDirty(false);
      api.flash('Modo edición: hacé clic en cualquier texto para cambiarlo.', 4000);
    },
    stop: stop,
    isDirty: function () { return dirty; }
  };
})();
