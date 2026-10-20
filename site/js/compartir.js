// Certificado de finalización dibujado en canvas, con el diseño del modelo aprobado por Stella.
// Un solo dibujo sirve para el PDF A4 (vía jsPDF) y para la imagen PNG que se publica en LinkedIn.
// Las coordenadas están en "puntos de diseño" de una hoja A4 apaisada de 1170×827.
(function () {
  'use strict';

  var W = 1170, H = 827, PANEL = 344;
  var PETROL = '#012C3D', CORAL = '#F15946', CELESTE = '#4FC4E8', TEXT = '#2C3E50', MUTED = '#6F7A7C';
  var PAPER = '#FBFBF8', FOOTER = '#F5F5F0', HAIR = '#E2E5E3';
  var INTER = 'Inter, Helvetica, Arial, sans-serif', KARLA = 'Karla, Helvetica, Arial, sans-serif';

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(['800 40px Inter', '700 20px Inter', '600 18px Inter', '400 20px Karla', '700 20px Karla']
      .map(function (f) { return document.fonts.load(f).catch(function () {}); }));
  }

  // Texto con espaciado entre letras (em) y alineación; devuelve el ancho dibujado
  function text(ctx, str, x, y, font, color, spacingEm, align) {
    ctx.font = font;
    ctx.fillStyle = color;
    var size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)[1]), sp = (spacingEm || 0) * size;
    var width = 0, chars = Array.from(str);
    chars.forEach(function (c) { width += ctx.measureText(c).width + sp; });
    width -= sp;
    if (!sp) width = ctx.measureText(str).width;
    var cx = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
    ctx.textAlign = 'left';
    if (!sp) { ctx.fillText(str, cx, y); return width; }
    chars.forEach(function (c) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + sp; });
    return width;
  }
  // Tamaño de letra para que un texto ocupe un ancho dado (respeta el espaciado)
  function fitSize(ctx, str, weight, family, spacingEm, targetWidth) {
    var s = 100;
    ctx.font = weight + ' ' + s + 'px ' + family;
    var w = 0;
    Array.from(str).forEach(function (c) { w += ctx.measureText(c).width + spacingEm * s; });
    w -= spacingEm * s;
    return s * targetWidth / w;
  }

  // Sello "COMPLETADO": anillo, disco coral y escarapela con tilde
  function seal(ctx, cx, cy) {
    ctx.strokeStyle = CORAL; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 59, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = CORAL;
    ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.fill();
    var ix = cx, iy = cy - 11;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(ix, iy, 8.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ix - 3.8, iy + 0.2); ctx.lineTo(ix - 1, iy + 3); ctx.lineTo(ix + 4, iy - 2.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ix - 5, iy + 7); ctx.lineTo(ix - 6.5, iy + 17); ctx.lineTo(ix, iy + 13.5); ctx.lineTo(ix + 6.5, iy + 17); ctx.lineTo(ix + 5, iy + 7); ctx.stroke();
    text(ctx, 'COMPLETADO', cx, cy + 20, '700 7.6px ' + INTER, '#fff', 0.16, 'center');
  }

  function draw(d, assets, scale) {
    var c = document.createElement('canvas');
    c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    var ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    ctx.textBaseline = 'alphabetic';

    // ---- Panel izquierdo ----
    ctx.fillStyle = PETROL; ctx.fillRect(0, 0, PANEL, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, PANEL, H); ctx.clip();
    ctx.strokeStyle = 'rgba(79,196,232,0.28)'; ctx.lineWidth = 1;
    [115, 178].forEach(function (r) { ctx.beginPath(); ctx.arc(291, 53, r, 0, Math.PI * 2); ctx.stroke(); });
    ctx.restore();
    if (assets.logo) ctx.drawImage(assets.logo, 46, 59, 155, 155 * assets.logo.height / assets.logo.width);

    var s17 = fitSize(ctx, '17', '800', INTER, -0.04, 116);
    text(ctx, '17', 46, 438, '800 ' + s17 + 'px ' + INTER, CELESTE, -0.04);
    var sCap = fitSize(ctx, 'capítulos y anexos', '600', INTER, 0, 163);
    text(ctx, 'capítulos y anexos', 46, 480, '600 ' + sCap + 'px ' + INTER, '#fff');
    text(ctx, 'completados', 46, 505, '600 ' + sCap + 'px ' + INTER, '#fff');
    ctx.fillStyle = CORAL; ctx.fillRect(46, 537, 41, 3);
    var sCua = fitSize(ctx, 'Cuaderno de trabajo del curso', '400', KARLA, 0, 211);
    text(ctx, 'Cuaderno de trabajo del curso', 46, 567, '400 ' + sCua + 'px ' + KARLA, 'rgba(255,255,255,0.78)');
    text(ctx, 'Claude y Codex.', 46, 592, '400 ' + sCua + 'px ' + KARLA, 'rgba(255,255,255,0.78)');
    var sLab = fitSize(ctx, 'CÓDIGO DE CERTIFICADO', '700', INTER, 0.18, 178);
    text(ctx, 'CÓDIGO DE CERTIFICADO', 46, 740, '700 ' + sLab + 'px ' + INTER, CELESTE, 0.18);
    var sCode = fitSize(ctx, 'ST-1JFG-925K', '800', INTER, 0.06, 158);
    text(ctx, d.code, 46, 770, '800 ' + sCode + 'px ' + INTER, '#fff', 0.06);

    // ---- Hoja derecha ----
    ctx.fillStyle = PAPER; ctx.fillRect(PANEL, 0, W - PANEL, H);
    ctx.fillStyle = FOOTER; ctx.fillRect(PANEL, 775, W - PANEL, H - 775);
    ctx.fillStyle = HAIR; ctx.fillRect(PANEL, 775, W - PANEL, 1);
    var X = 415, R = 1094;

    var sEye = fitSize(ctx, 'CERTIFICADO DE FINALIZACIÓN', '700', INTER, 0.28, 308);
    text(ctx, 'CERTIFICADO DE FINALIZACIÓN', X, 85, '700 ' + sEye + 'px ' + INTER, CORAL, 0.28);
    seal(ctx, 1034, 127);

    var sSe = fitSize(ctx, 'Se certifica que', '400', KARLA, 0, 143);
    text(ctx, 'Se certifica que', X, 198, '400 ' + sSe + 'px ' + KARLA, TEXT);

    // Nombre: mismo tamaño que el modelo; se achica solo si no entra
    var sName = fitSize(ctx, 'Stella Torres', '800', INTER, -0.025, 395);
    var maxName = R - X;
    var sFit = fitSize(ctx, d.name, '800', INTER, -0.025, maxName);
    text(ctx, d.name, X, 280, '800 ' + Math.min(sName, sFit) + 'px ' + INTER, PETROL, -0.025);
    ctx.fillStyle = HAIR; ctx.fillRect(540, 313, R - 540, 1);
    ctx.fillStyle = CORAL; ctx.fillRect(X, 312, 125, 3);

    var sBody = fitSize(ctx, 'digitales con Claude y Codex, aunque no seas programador.', '400', KARLA, 0, 562);
    var fBody = '400 ' + sBody + 'px ' + KARLA, fBold = '700 ' + sBody + 'px ' + INTER;
    var x1 = X;
    x1 += text(ctx, 'completó la ', x1, 369, fBody, TEXT);
    x1 += text(ctx, 'Guía práctica de prompting', x1, 369, fBold, PETROL);
    text(ctx, ': cómo crear herramientas', x1, 369, fBody, TEXT);
    text(ctx, 'digitales con Claude y Codex, aunque no seas programador.', X, 401, fBody, TEXT);

    // Firma y fecha
    if (assets.firma && d.withSignature !== false) {
      // La firma conserva sus proporciones y apoya sobre la línea (la cruza apenas, como una firma real)
      var f = assets.firma;
      if (f.width / f.height < 2) ctx.drawImage(f, 432, 578, 290, 106); // firma manuscrita escaneada: así está en el modelo
      else { var k = Math.min(300 / f.width, 104 / f.height); ctx.drawImage(f, 428, 686 - f.height * k, f.width * k, f.height * k); }
    }
    ctx.fillStyle = PETROL;
    ctx.fillRect(X, 673, 311, 1.2);
    ctx.fillRect(784, 673, R - 784, 1.2);
    var sSig = fitSize(ctx, 'Stella Torres', '700', INTER, 0, 79);
    text(ctx, d.signer, X, 695, '700 ' + sSig + 'px ' + INTER, PETROL);
    var sRole = fitSize(ctx, 'Docente · ST Relaciones Públicas', '400', KARLA, 0, 198);
    text(ctx, d.signerRole, X, 721, '400 ' + sRole + 'px ' + KARLA, MUTED);
    var sDate = fitSize(ctx, '20 de octubre de 2026', '700', INTER, 0, 222);
    text(ctx, d.date, 784, 661, '700 ' + sDate + 'px ' + INTER, PETROL);
    text(ctx, 'Fecha de emisión', 784, 695, '700 ' + sSig + 'px ' + INTER, PETROL);
    text(ctx, d.place, 784, 721, '400 ' + sRole + 'px ' + KARLA, MUTED);

    // Pie: dónde verificar
    var sFoot = sRole * 0.95, fFoot = '400 ' + sFoot + 'px ' + KARLA;
    var fx = X + text(ctx, 'Verificá este certificado en ', X, 804, fFoot, MUTED);
    var linkW = text(ctx, d.verifyLabel, fx, 804, '700 ' + sFoot + 'px ' + KARLA, PETROL);
    text(ctx, d.copyright, R, 804, fFoot, MUTED, 0, 'right');
    c.verifyBox = { x: fx, y: 790, w: linkW, h: 18 }; // para el enlace clickeable del PDF
    return c;
  }

  function assets() {
    return Promise.all([loadImage('assets/logo-blanco.png'), loadImage('assets/firma.png'), loadFonts()])
      .then(function (r) { return { logo: r[0], firma: r[1] }; });
  }

  window.GuiaCompartir = {
    W: W, H: H,
    // d: { name, code, date, place, signer, signerRole, verifyLabel, copyright }
    canvas: function (d, scale) { return assets().then(function (a) { return draw(d, a, scale || 2); }); },
    imagen: function (d) {
      return this.canvas(d, 2).then(function (canvas) {
        return new Promise(function (resolve, reject) {
          canvas.toBlob(function (b) { if (b) resolve(b); else reject(new Error('png')); }, 'image/png');
        });
      });
    }
  };
})();
