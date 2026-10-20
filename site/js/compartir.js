// Imagen del certificado para publicar en LinkedIn (PNG 1600×1131, mismas proporciones que el PDF).
// La carga guia.js recién cuando el alumno toca "Publicar en LinkedIn".
(function () {
  'use strict';

  var W = 1600, H = 1131;
  var PETROL = '#012C3D', CORAL = '#F8444F', TEXT = '#333C3F', MUTED = '#6F7A7C', LINE = '#DDE1DB', SOFT = '#F7F8F3';

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function fit(ctx, text, maxW, weight, size, family, min) {
    var s = size;
    ctx.font = weight + ' ' + s + 'px ' + family;
    while (ctx.measureText(text).width > maxW && s > min) { s -= 2; ctx.font = weight + ' ' + s + 'px ' + family; }
    return s;
  }

  function spaced(ctx, text, x, y, spacing) {
    // Texto centrado con espaciado entre letras (para los títulos en mayúsculas)
    var chars = text.split(''), total = 0;
    chars.forEach(function (c) { total += ctx.measureText(c).width + spacing; });
    total -= spacing;
    var cx = x - total / 2;
    ctx.textAlign = 'left';
    chars.forEach(function (c) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + spacing; });
    ctx.textAlign = 'center';
  }

  function draw(d, logo) {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d'), cx = W / 2;
    var DISPLAY = 'Inter, Helvetica, Arial, sans-serif', BODY = 'Karla, Helvetica, Arial, sans-serif';

    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PETROL; ctx.fillRect(0, 0, W, 46);
    ctx.fillStyle = CORAL; ctx.fillRect(0, 46, W, 9);
    ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.strokeRect(64, 104, W - 128, H - 168);
    ctx.fillStyle = SOFT; ctx.fillRect(65, H - 214, W - 130, 149);

    if (logo) {
      var lh = 74, lw = logo.width * lh / logo.height;
      ctx.drawImage(logo, 124, 150, lw, lh);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    ctx.fillStyle = MUTED; ctx.font = '700 22px ' + DISPLAY;
    ctx.fillText('CURSO CLAUDE Y CODEX · CUADERNO DE TRABAJO', W - 124, 196);

    ctx.textAlign = 'center';
    ctx.fillStyle = CORAL; ctx.font = '700 34px ' + DISPLAY;
    spaced(ctx, 'CERTIFICADO DE FINALIZACIÓN', cx, 330, 7);
    ctx.fillStyle = TEXT; ctx.font = '400 34px ' + BODY;
    ctx.fillText('Se certifica que', cx, 406);

    fit(ctx, d.name, W - 380, '800', 96, DISPLAY, 52);
    ctx.fillStyle = PETROL;
    ctx.fillText(d.name, cx, 512);
    ctx.fillStyle = CORAL; ctx.fillRect(cx - 160, 546, 320, 6);

    ctx.fillStyle = TEXT; ctx.font = '400 34px ' + BODY;
    ctx.fillText('completó la', cx, 616);
    ctx.fillStyle = PETROL; ctx.font = '700 56px ' + DISPLAY;
    ctx.fillText('Guía práctica de prompting', cx, 684);
    ctx.fillStyle = MUTED; ctx.font = '400 28px ' + BODY;
    ctx.fillText('Cómo crear herramientas digitales con Claude y Codex, aunque no seas programador.', cx, 732);
    ctx.fillText(d.detail, cx, 772);

    ctx.fillStyle = CORAL; ctx.font = '800 40px ' + DISPLAY;
    spaced(ctx, 'IDEA', cx, 846, 44);

    var by = H - 150;
    ctx.strokeStyle = PETROL; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(160, by - 10); ctx.lineTo(540, by - 10); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = PETROL; ctx.font = '700 28px ' + DISPLAY; ctx.fillText(d.signer, 160, by + 26);
    ctx.fillStyle = MUTED; ctx.font = '400 23px ' + BODY; ctx.fillText(d.signerRole, 160, by + 58);
    ctx.textAlign = 'right';
    ctx.fillStyle = PETROL; ctx.font = '700 28px ' + DISPLAY; ctx.fillText(d.date, W - 160, by + 26);
    ctx.fillStyle = MUTED; ctx.font = '400 23px ' + BODY; ctx.fillText('Código: ' + d.code, W - 160, by + 58);
    return c;
  }

  window.GuiaCompartir = {
    // d: { name, detail, signer, signerRole, date, code }
    imagen: function (d) {
      return Promise.all([loadImage('assets/logo-coral.png'), document.fonts ? document.fonts.ready : null]).then(function (r) {
        var canvas = draw(d, r[0]);
        return new Promise(function (resolve, reject) {
          canvas.toBlob(function (b) { if (b) resolve(b); else reject(new Error('png')); }, 'image/png');
        });
      });
    }
  };
})();
