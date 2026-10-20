// Contenido editado por la docente: textos, videos demostrativos y videos/enlaces agregados.
// Se aplica sobre la guía para todos los visitantes. La edición vive en js/editor.js.
(function () {
  'use strict';

  var CACHE_KEY = 'guia-prompting-st:contenido';
  var ALLOWED = { A: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, SPAN: 1, BR: 1, CODE: 1, SUP: 1, SUB: 1, MARK: 1, SMALL: 1 };
  var original = {}; // id -> HTML original de cada bloque editable
  var current = { blocks: {}, videos: {}, extras: {} };

  Array.prototype.forEach.call(document.querySelectorAll('[data-edit]'), function (el) {
    original[el.getAttribute('data-edit')] = el.innerHTML;
  });

  function safeUrl(u) {
    u = String(u || '').trim();
    return /^(https?:\/\/|mailto:|#)/i.test(u) ? u : '';
  }

  // Deja solo formato básico y enlaces seguros. Lo demás se convierte en texto.
  function sanitize(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = String(html || '');
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) return;
        if (n.nodeType !== 1 || !ALLOWED[n.tagName]) {
          if (n.nodeType === 1 && /^(DIV|P)$/.test(n.tagName)) n.insertAdjacentHTML('beforebegin', '<br>');
          walk(n);
          while (n.firstChild && n.nodeType === 1) node.insertBefore(n.firstChild, n);
          node.removeChild(n);
          return;
        }
        Array.prototype.slice.call(n.attributes).forEach(function (a) {
          var keep = (a.name === 'href' && n.tagName === 'A' && safeUrl(a.value)) ||
            (a.name === 'style' && !/url\(|expression|javascript:/i.test(a.value));
          if (!keep) n.removeAttribute(a.name);
        });
        if (n.tagName === 'A' && !/^#/.test(n.getAttribute('href') || '')) {
          n.setAttribute('target', '_blank');
          n.setAttribute('rel', 'noopener');
        }
        walk(n);
      });
    })(tpl.content);
    return tpl.innerHTML.replace(/(<br>)+$/, '');
  }

  // Minuto de un enlace: "245", "4m5s", "1h2m3s" o "4:05" → segundos
  function seconds(v) {
    if (!v) return 0;
    v = decodeURIComponent(v);
    if (/^\d+$/.test(v)) return +v;
    if (/^\d+(:\d{1,2}){1,2}$/.test(v)) return v.split(':').reduce(function (a, b) { return a * 60 + +b; }, 0);
    var m = v.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
    return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
  }
  function param(url, names) {
    for (var i = 0; i < names.length; i++) {
      var m = url.match(new RegExp('[?&#]' + names[i] + '=([^&#]+)', 'i'));
      if (m) return seconds(m[1]);
    }
    return 0;
  }
  // Convierte enlaces de YouTube, Vimeo, Loom y Google Drive en reproductores.
  // Un mismo video largo sirve para varios capítulos: el enlace puede traer el minuto de inicio
  // (?t=4m05s, como lo copia YouTube en "Compartir → Empezar en") y, si se quiere, el de fin (&end=9:10).
  function embedOf(url) {
    var m, start = param(url, ['t', 'start']), end = param(url, ['end']);
    if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i))) {
      var q = [];
      if (start) q.push('start=' + start);
      if (end > start) q.push('end=' + end);
      return { src: 'https://www.youtube-nocookie.com/embed/' + m[1] + (q.length ? '?' + q.join('&') : ''), name: 'YouTube' };
    }
    if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i))) return { src: 'https://player.vimeo.com/video/' + m[1] + (start ? '#t=' + start + 's' : ''), name: 'Vimeo' };
    if ((m = url.match(/loom\.com\/(?:share|embed)\/([\w]+)/i))) return { src: 'https://www.loom.com/embed/' + m[1], name: 'Loom' };
    if ((m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/i))) return { src: 'https://drive.google.com/file/d/' + m[1] + '/preview', name: 'Google Drive' };
    return null;
  }
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; } }

  function mediaEl(item, removeAttr) {
    var url = safeUrl(item.url);
    if (!url) return null;
    var emb = embedOf(url), box = document.createElement('div');
    box.className = 'media' + (emb ? ' media--video' : ' media--link');
    if (emb) {
      var frame = document.createElement('div');
      frame.className = 'media__frame';
      var ifr = document.createElement('iframe');
      ifr.src = emb.src;
      ifr.title = item.title || 'Video';
      ifr.loading = 'lazy';
      ifr.allow = 'accelerometer; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      ifr.setAttribute('allowfullscreen', '');
      ifr.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.appendChild(ifr);
      box.appendChild(frame);
    }
    var a = document.createElement('a');
    a.className = 'media__link';
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    var t = document.createElement('strong');
    t.textContent = item.title || (emb ? 'Ver video en ' + emb.name : hostOf(url));
    var u = document.createElement('span');
    u.className = 'media__url';
    u.textContent = url;
    a.appendChild(t); a.appendChild(u);
    box.appendChild(a);
    if (removeAttr) {
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'edit-only media__remove';
      rm.setAttribute('data-edit-action', 'remove-extra');
      rm.setAttribute('data-ref', removeAttr);
      rm.textContent = 'Quitar';
      box.appendChild(rm);
    }
    return box;
  }

  function videoBoxes() { return document.querySelectorAll('div[id^="video"]'); }
  function linkCell(box) {
    var cells = box.querySelectorAll('td[data-edit]');
    for (var i = 0; i < cells.length; i++) if (/\[Agregar enlace/.test(original[cells[i].getAttribute('data-edit')] || '')) return cells[i];
    return null;
  }

  function apply(c, opts) {
    c = c || {};
    current = { blocks: c.blocks || {}, videos: c.videos || {}, extras: c.extras || {} };
    var onlyMedia = opts && opts.onlyMedia;

    if (!onlyMedia) {
      Object.keys(original).forEach(function (id) {
        var el = document.querySelector('[data-edit="' + id + '"]');
        if (!el) return;
        var html = id in current.blocks ? sanitize(current.blocks[id]) : original[id];
        if (el.innerHTML !== html) el.innerHTML = html;
      });
    }

    // Videos demostrativos (las 7 cajas con "[Agregar enlace del video]")
    Array.prototype.forEach.call(videoBoxes(), function (box) {
      var vid = box.id, v = current.videos[vid], cell = linkCell(box);
      var old = box.querySelector(':scope > .media');
      if (old) old.remove();
      if (v && safeUrl(v.url)) {
        var m = mediaEl({ url: v.url, title: v.title });
        m.contentEditable = 'false';
        box.insertBefore(m, box.children[2] || null);
        if (cell) {
          cell.innerHTML = '';
          var a = document.createElement('a');
          a.href = safeUrl(v.url); a.target = '_blank'; a.rel = 'noopener';
          a.textContent = 'Abrir el video ↗';
          cell.appendChild(a);
          cell.setAttribute('data-locked', '');
        }
      } else if (cell) {
        cell.removeAttribute('data-locked');
        if (!onlyMedia || cell.querySelector('a')) cell.innerHTML = cell.getAttribute('data-edit') in current.blocks ? sanitize(current.blocks[cell.getAttribute('data-edit')]) : original[cell.getAttribute('data-edit')];
      }
      var btn = box.querySelector('.video-edit');
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'edit-only video-edit';
        btn.setAttribute('data-edit-action', 'video');
        btn.setAttribute('data-ref', vid);
        box.appendChild(btn);
      }
      btn.textContent = v && v.url ? 'Cambiar o quitar video' : '＋ Cargar video';
      // Sin enlace, el recuadro no se muestra a los alumnos (en modo edición sí, para cargarlo)
      box.classList.toggle('video-ready', !!(v && safeUrl(v.url)));
    });

    // Tabla de videos del índice: solo los que ya están cargados; sin ninguno, se oculta entera
    var anyVideo = false;
    Array.prototype.forEach.call(document.querySelectorAll('#indice a[href^="#video"]'), function (a) {
      var v = current.videos[a.getAttribute('href').slice(1)], ok = !!(v && safeUrl(v.url));
      var row = a.closest('tr');
      if (row) row.classList.toggle('video-row-pending', !ok);
      anyVideo = anyVideo || ok;
    });
    document.body.classList.toggle('has-videos', anyVideo);

    // Videos y enlaces agregados debajo de un bloque
    Array.prototype.forEach.call(document.querySelectorAll('.media-extra'), function (n) { n.remove(); });
    Object.keys(current.extras).forEach(function (id) {
      var el = document.querySelector('[data-edit="' + id + '"]');
      var list = current.extras[id] || [];
      if (!el || !list.length) return;
      var wrap = document.createElement('div');
      wrap.className = 'media-extra';
      wrap.contentEditable = 'false';
      list.forEach(function (item, i) {
        var m = mediaEl(item, id + ':' + i);
        if (m) wrap.appendChild(m);
      });
      if (/^(TD|TH|LI|DD)$/.test(el.tagName)) el.appendChild(wrap);
      else el.parentNode.insertBefore(wrap, el.nextSibling);
    });
  }

  function cached() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; }
  }
  function cache(c) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ blocks: c.blocks || {}, videos: c.videos || {}, extras: c.extras || {} })); } catch (e) {}
  }

  // Aplicar enseguida lo último conocido; guia.js trae la versión al día desde Firebase
  var last = cached();
  if (last) apply(last);

  window.GuiaContent = {
    original: original,
    sanitize: sanitize,
    embedOf: embedOf,
    safeUrl: safeUrl,
    apply: apply,
    cache: cache,
    current: function () { return current; },
    saved: function () { return cached() || {}; },
    load: function (c) { cache(c || {}); apply(c || {}); }
  };
})();
