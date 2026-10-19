// Panel de seguimiento: lista de alumnos con su avance y sus respuestas.
// Solo funciona para las cuentas de GUIA_ADMINS (y las reglas de Firestore lo exigen).
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var body = document.body;
  var backend = null, users = [], labels = null, order = [];

  function setAuth(name) {
    body.classList.remove('auth-none', 'auth-out', 'auth-in', 'auth-pending');
    body.classList.add(name);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isAdmin(email) {
    return (window.GUIA_ADMINS || []).map(function (e) { return e.toLowerCase(); }).indexOf((email || '').toLowerCase()) >= 0;
  }

  // Etiquetas legibles de cada campo, tomadas de la propia guía (data-label)
  function loadLabels() {
    if (labels) return Promise.resolve(labels);
    return fetch('./', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      labels = {};
      Array.prototype.forEach.call(doc.querySelectorAll('[data-field]'), function (el) {
        var id = el.getAttribute('data-field');
        labels[id] = el.getAttribute('data-label') || id;
        order.push(id);
      });
      return labels;
    });
  }

  function lastActivity(u) {
    if (u.updatedAt && u.updatedAt.toDate) return u.updatedAt.toDate();
    if (u.stats && u.stats.at) return new Date(u.stats.at);
    return null;
  }
  function relTime(d) {
    if (!d) return '—';
    var s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return 'recién';
    if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h';
    if (s < 86400 * 30) { var n = Math.round(s / 86400); return 'hace ' + n + (n === 1 ? ' día' : ' días'); }
    return d.toLocaleDateString('es-AR');
  }
  function filled(v) { return v === true || (typeof v === 'string' && v.trim() !== ''); }
  function doneOf(u) {
    var f = u.fields || {}, n = 0;
    for (var k in f) if (filled(f[k])) n++;
    return n;
  }
  function pct(u) { return Math.round((u.progress && u.progress.maxPct) || 0); }
  function name(u) { return (u.profile && u.profile.name) || (u.profile && u.profile.email) || 'Sin nombre'; }

  function renderStats() {
    var total = order.length || 1;
    var week = Date.now() - 7 * 86400000;
    var active = users.filter(function (u) { var d = lastActivity(u); return d && d.getTime() > week; }).length;
    var avgRead = users.length ? Math.round(users.reduce(function (a, u) { return a + pct(u); }, 0) / users.length) : 0;
    var avgDone = users.length ? Math.round(users.reduce(function (a, u) { return a + doneOf(u); }, 0) / users.length / total * 100) : 0;
    var cards = [[users.length, 'alumnos registrados'], [active, 'activos en los últimos 7 días'], [avgRead + ' %', 'de la guía leída, en promedio'], [avgDone + ' %', 'de los espacios completados, en promedio']];
    $('stats').innerHTML = cards.map(function (c) {
      return '<div class="adm-stat"><div class="adm-stat__num">' + esc(c[0]) + '</div><div class="adm-stat__label">' + esc(c[1]) + '</div></div>';
    }).join('');
  }

  function renderRows() {
    var q = $('search').value.trim().toLowerCase();
    var total = order.length;
    var list = users.filter(function (u) {
      return !q || (name(u) + ' ' + ((u.profile && u.profile.email) || '')).toLowerCase().indexOf(q) >= 0;
    });
    $('empty').hidden = users.length > 0;
    $('rows').innerHTML = list.map(function (u) {
      var done = doneOf(u), p = pct(u);
      var where = (u.progress && u.progress.where) || '—';
      return '<tr tabindex="0" data-id="' + esc(u.id) + '">' +
        '<td><div class="adm-name">' + esc(name(u)) + '</div><div class="adm-email">' + esc(u.profile && u.profile.email) + '</div></td>' +
        '<td><div class="adm-meter"><span style="width:' + p + '%"></span></div><span class="adm-num">' + p + ' %</span></td>' +
        '<td>' + esc(where) + '</td>' +
        '<td><span class="adm-num">' + done + '</span> de ' + total + '</td>' +
        '<td>' + esc(relTime(lastActivity(u))) + '</td></tr>';
    }).join('');
  }

  function openDetail(id) {
    var u = users.filter(function (x) { return x.id === id; })[0];
    if (!u) return;
    $('detail-name').textContent = name(u);
    $('detail-email').textContent = (u.profile && u.profile.email) || '';
    var f = u.fields || {};
    var groups = {}, groupOrder = [];
    order.forEach(function (fid) {
      if (!filled(f[fid])) return;
      var parts = (labels[fid] || fid).split(' › ');
      var g = parts.shift();
      if (!groups[g]) { groups[g] = []; groupOrder.push(g); }
      groups[g].push([parts.join(' › '), f[fid]]);
    });
    var html = '<p class="adm-detail__meta">Leyó el ' + pct(u) + ' % · está en ' + esc((u.progress && u.progress.where) || '—') +
      (u.progress && u.progress.bookmark ? '' : '') + ' · ' + doneOf(u) + ' espacios completados</p>';
    if (!groupOrder.length) html += '<p class="adm-empty">Todavía no completó ningún espacio.</p>';
    groupOrder.forEach(function (g) {
      html += '<h3>' + esc(g) + '</h3><dl>';
      groups[g].forEach(function (it) {
        html += '<dt>' + esc(it[0]) + '</dt><dd>' + (it[1] === true ? '<span class="adm-check">✓ Hecho</span>' : esc(it[1])) + '</dd>';
      });
      html += '</dl>';
    });
    $('detail-body').innerHTML = html;
    $('detail').hidden = false;
    $('detail').querySelector('.adm-detail__close').focus();
  }
  function closeDetail() { $('detail').hidden = true; }

  function csv() {
    var cell = function (v) { v = v === true ? 'Sí' : v === false || v == null ? '' : String(v); return '"' + v.replace(/"/g, '""') + '"'; };
    var head = ['Nombre', 'Email', '% leído', 'Dónde está', 'Espacios completados', 'Última actividad'].concat(order.map(function (id) { return labels[id]; }));
    var lines = [head.map(cell).join(',')];
    users.forEach(function (u) {
      var d = lastActivity(u), f = u.fields || {};
      lines.push([name(u), u.profile && u.profile.email, pct(u), u.progress && u.progress.where, doneOf(u), d ? d.toLocaleString('es-AR') : '']
        .concat(order.map(function (id) { return f[id]; })).map(cell).join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'seguimiento-guia-prompting-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function refresh() {
    $('refresh').disabled = true;
    return Promise.all([loadLabels(), backend.listUsers()]).then(function (r) {
      users = r[1].sort(function (a, b) { return ((lastActivity(b) || 0) - (lastActivity(a) || 0)); });
      renderStats();
      renderRows();
    }).catch(function () {
      $('panel').hidden = true;
      $('msg-denied').hidden = false;
    }).then(function () { $('refresh').disabled = false; });
  }

  function onUser(u) {
    $('msg-denied').hidden = true;
    $('panel').hidden = true;
    if (!u) { setAuth('auth-out'); $('who').textContent = ''; return; }
    setAuth('auth-in');
    $('who').textContent = u.email;
    if (!isAdmin(u.email)) { $('msg-denied').hidden = false; return; }
    $('panel').hidden = false;
    refresh();
  }

  function start() {
    backend = window.GuiaBackend;
    if (!backend || !backend.ready) { setAuth('auth-none'); $('msg-config').hidden = false; return; }
    backend.onUser(onUser);
  }

  $('login').addEventListener('click', function () { backend.signIn().catch(function () {}); });
  $('logout').addEventListener('click', function () { backend.signOut(); });
  $('refresh').addEventListener('click', refresh);
  $('csv').addEventListener('click', csv);
  $('search').addEventListener('input', renderRows);
  $('rows').addEventListener('click', function (e) { var tr = e.target.closest('tr[data-id]'); if (tr) openDetail(tr.dataset.id); });
  $('rows').addEventListener('keydown', function (e) { var tr = e.target.closest('tr[data-id]'); if (tr && e.key === 'Enter') openDetail(tr.dataset.id); });
  $('detail').addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeDetail(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDetail(); });

  if (!window.GUIA_FIREBASE_CONFIG) { setAuth('auth-none'); $('msg-config').hidden = false; return; }
  if (window.GuiaBackend) start();
  else window.addEventListener('guia-backend', start, { once: true });
})();
