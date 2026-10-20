// PDF "Mi avance": resumen de lectura y todas las respuestas del alumno, en A4.
// Se compila con `npm run build` a site/js/pdf-avance.js y se carga solo al pedir la descarga.
import { jsPDF } from 'jspdf';

const PETROL = [1, 44, 61], CORAL = [248, 68, 79], TEXT = [51, 60, 63], MUTED = [111, 122, 124];
const LINE = [221, 225, 219], SOFT = [247, 248, 243], GREEN = [31, 138, 91], TEAL = [42, 111, 136];
const W = 210, H = 297, M = 18, CW = W - M * 2, BOTTOM = H - 18;

// Las fuentes estándar del PDF cubren el español; se quitan emojis y símbolos que no puede dibujar
const EXTRA = '‘’“”–—…•›‹€™';
const clean = (s) => String(s == null ? '' : s).replace(/\r/g, '')
  .split('').filter((c) => c.charCodeAt(0) <= 255 || EXTRA.indexOf(c) >= 0).join('');

export function crearPdfAvance(d) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = M;

  const color = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
  const space = (h) => { if (y + h > BOTTOM) { doc.addPage(); y = M; } };
  const lines = (text, width) => doc.splitTextToSize(clean(text), width);
  const lh = (size, k = 1.4) => size * 0.3528 * k; // alto de línea en mm
  function checkBox(x, top, on) {
    doc.setLineWidth(0.35);
    if (on) { doc.setFillColor(...GREEN); doc.setDrawColor(...GREEN); doc.roundedRect(x, top, 3.6, 3.6, 0.6, 0.6, 'FD'); }
    else { doc.setDrawColor(...TEAL); doc.roundedRect(x, top, 3.6, 3.6, 0.6, 0.6, 'S'); }
    if (on) { doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5); doc.line(x + 0.8, top + 1.9, x + 1.5, top + 2.7); doc.line(x + 1.5, top + 2.7, x + 2.9, top + 1); }
  }

  // ---- Portada / encabezado ----
  if (d.logo) { try { doc.addImage(d.logo, 'PNG', M, y, 15.5, 10.7); } catch (e) { /* sin logo */ } }
  font('bold', 8); color(CORAL);
  doc.text('MI AVANCE · CUADERNO DE TRABAJO', W - M, y + 4, { align: 'right' });
  font('normal', 8); color(MUTED);
  doc.text('Generado el ' + d.date, W - M, y + 8.5, { align: 'right' });
  y += 20;
  font('bold', 22); color(PETROL);
  doc.text('Guía práctica de prompting', M, y); y += 9;
  font('bold', 13); color(TEXT);
  doc.text(clean(d.name || 'Alumno/a'), M, y); y += 5.5;
  font('normal', 10); color(MUTED);
  doc.text(clean(d.email), M, y); y += 4;
  doc.setFillColor(...CORAL); doc.rect(M, y, 18, 1.2, 'F'); y += 8;

  // ---- Indicadores ----
  const stats = [
    [d.finishedCount + ' de ' + d.finishedTotal, 'capítulos terminados'],
    [d.done + ' de ' + d.total, 'espacios completados'],
    [d.checksDone + ' de ' + d.checksTotal, 'casillas tildadas']
  ];
  const bw = (CW - 8) / 3;
  stats.forEach((s, i) => {
    const x = M + i * (bw + 4);
    doc.setFillColor(...SOFT); doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, bw, 20, 2, 2, 'FD');
    font('bold', 16); color(PETROL); doc.text(clean(s[0]), x + 5, y + 9.5);
    font('normal', 8.5); color(MUTED); doc.text(s[1], x + 5, y + 15.5);
  });
  y += 27;
  font('normal', 10); color(TEXT);
  [['Dónde quedaste: ', d.where], ['Tu marca: ', d.bookmark]].forEach((r) => {
    if (!r[1]) return;
    font('bold', 10); doc.text(r[0], M, y);
    const w = doc.getTextWidth(r[0]);
    font('normal', 10); doc.text(clean(r[1]), M + w, y); y += 5.5;
  });
  y += 4;

  // ---- Capítulos ----
  font('bold', 12); color(PETROL); doc.text('Recorrido por la guía', M, y); y += 3;
  doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
  const colW = CW / 2, rowH = 6.2, half = Math.ceil(d.chapters.length / 2);
  space(half * rowH + 4);
  const top = y + 1;
  d.chapters.forEach((c, i) => {
    const x = M + (i < half ? 0 : colW), ry = top + (i % half) * rowH;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(x, ry + rowH, x + colW - 4, ry + rowH);
    checkBox(x, ry + 1.4, c.read);
    font('bold', 8.5); color(TEAL); doc.text(clean(c.num), x + 6, ry + 4.4);
    font('normal', 9); color(c.read ? TEXT : MUTED); doc.text(clean(c.title), x + 13, ry + 4.4);
  });
  y = top + half * rowH + 10;

  // ---- Respuestas ----
  space(20);
  font('bold', 16); color(PETROL); doc.text('Tus respuestas', M, y); y += 6;
  if (!d.sections.some((s) => s.items.length)) {
    font('normal', 10); color(MUTED);
    doc.text('Todavía no completaste ningún espacio. Ingresá a la guía y empezá por el ejercicio del capítulo 1.', M, y);
  }
  d.sections.forEach((sec) => {
    if (!sec.items.length) return;
    space(24);
    y += 4;
    doc.setFillColor(...CORAL); doc.rect(M, y, CW, 0.7, 'F'); y += 6;
    font('bold', 12); color(PETROL); doc.text(clean(sec.title), M, y);
    font('normal', 8.5); color(MUTED);
    doc.text(sec.done + ' de ' + sec.total + ' completados', W - M, y, { align: 'right' }); y += 6;
    sec.items.forEach((it) => {
      const labelLines = lines(it.label, it.kind === 'check' ? CW - 7 : CW);
      if (it.kind === 'check') {
        const h = labelLines.length * lh(9.5);
        space(h + 2);
        checkBox(M, y - 3, true);
        font('normal', 9.5); color(TEXT); doc.text(labelLines, M + 7, y);
        y += h + 1.5;
        return;
      }
      const valueLines = lines(it.value, CW - 4);
      space(labelLines.length * lh(8.5) + Math.min(valueLines.length, 3) * lh(10) + 4);
      font('bold', 8.5); color(TEAL); doc.text(labelLines, M, y);
      y += labelLines.length * lh(8.5) + 0.8;
      font('normal', 10); color(TEXT);
      valueLines.forEach((ln) => { space(lh(10)); doc.text(ln, M + 2, y); y += lh(10); });
      y += 3;
    });
  });

  // ---- Pie con número de página ----
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    font('normal', 7.5); color(MUTED);
    doc.text('Guía práctica de prompting · ST Relaciones Públicas · ' + clean(d.name || ''), M, H - 10);
    doc.text(i + ' / ' + n, W - M, H - 10, { align: 'right' });
  }
  return doc;
}

// Certificado de finalización: el diseño se dibuja en canvas (site/js/compartir.js)
// y acá se arma el PDF A4 apaisado, con el enlace de verificación clickeable.
export function crearCertificadoPdf(canvas, verifyUrl, title) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
  doc.setProperties({ title: title || 'Certificado de finalización', author: 'ST Relaciones Públicas' });
  doc.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
  const k = 297 / 1170, b = canvas.verifyBox;
  if (verifyUrl && b) doc.link(b.x * k, b.y * k, b.w * k, b.h * k, { url: verifyUrl });
  return doc;
}

window.GuiaPdfAvance = crearPdfAvance;
window.GuiaPdfCertificado = crearCertificadoPdf;
