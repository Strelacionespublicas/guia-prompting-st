// Página pública de verificación de certificados (verificar.html?c=ST-XXXX-XXXX).
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var code = (new URLSearchParams(location.search).get('c') || '').trim().toUpperCase();

  function show(id) {
    ['loading', 'ok', 'bad'].forEach(function (s) { $(s).hidden = s !== id; });
  }
  function notFound() {
    $('vf-input').value = code;
    show('bad');
  }

  function verify(backend) {
    if (!/^ST-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) { notFound(); return; }
    backend.getCertificate(code).then(function (c) {
      if (!c) { notFound(); return; }
      $('vf-name').textContent = c.name;
      $('vf-date').textContent = new Date(c.issuedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
      $('vf-code').textContent = code;
      document.title = 'Certificado de ' + c.name + ' — Guía práctica de prompting';
      show('ok');
    }, notFound);
  }

  $('vf-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('vf-input').value.trim().toUpperCase();
    if (v) location.search = '?c=' + encodeURIComponent(v);
  });

  function start() {
    var b = window.GuiaBackend;
    if (!b || !b.ready) { notFound(); return; }
    verify(b);
  }
  if (window.GuiaBackend) start();
  else window.addEventListener('guia-backend', start, { once: true });
})();
