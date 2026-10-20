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

// Certificado de finalización: A4 horizontal, con nombre, fecha, firma y código único.
export function crearCertificado(d) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const PW = 297, PH = 210, cx = PW / 2;
  const color = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size); };

  // Marco y franjas de marca
  doc.setFillColor(...PETROL); doc.rect(0, 0, PW, 9, 'F');
  doc.setFillColor(...CORAL); doc.rect(0, 9, PW, 1.6, 'F');
  doc.setDrawColor(...LINE); doc.setLineWidth(0.4); doc.rect(12, 20, PW - 24, PH - 32);
  doc.setFillColor(...SOFT); doc.rect(12, PH - 40, PW - 24, 28, 'F');

  if (d.logo) { try { doc.addImage(d.logo, 'PNG', 24, 28, 20, 13.9); } catch (e) { /* sin logo */ } }
  font('bold', 8.5); color(MUTED);
  doc.text('CURSO CLAUDE Y CODEX · CUADERNO DE TRABAJO', PW - 24, 34, { align: 'right' });

  font('bold', 13); color(CORAL);
  doc.text('CERTIFICADO DE FINALIZACIÓN', cx, 62, { align: 'center', charSpace: 1.2 });
  font('normal', 13); color(TEXT);
  doc.text('Se certifica que', cx, 76, { align: 'center' });

  // Nombre: se achica si es muy largo para que entre en una línea
  const name = clean(d.name || '');
  let size = 34;
  font('bold', size);
  while (doc.getTextWidth(name) > PW - 70 && size > 18) { size -= 1; font('bold', size); }
  color(PETROL); doc.text(name, cx, 94, { align: 'center' });
  doc.setDrawColor(...CORAL); doc.setLineWidth(0.8); doc.line(cx - 30, 100, cx + 30, 100);

  font('normal', 13); color(TEXT);
  doc.text('completó la', cx, 112, { align: 'center' });
  font('bold', 20); color(PETROL);
  doc.text('Guía práctica de prompting', cx, 123, { align: 'center' });
  font('normal', 11); color(MUTED);
  doc.text('Cómo crear herramientas digitales con Claude y Codex, aunque no seas programador.', cx, 131, { align: 'center' });
  doc.text(clean(d.detail || ''), cx, 138, { align: 'center' });

  // Método IDEA como sello visual
  const letters = ['I', 'D', 'E', 'A'], gap = 11, x0 = cx - (gap * 3) / 2;
  font('bold', 15); color(CORAL);
  letters.forEach((l, i) => doc.text(l, x0 + i * gap, 152, { align: 'center' }));

  // Firma, fecha y código
  const by = PH - 26;
  doc.setDrawColor(...PETROL); doc.setLineWidth(0.3); doc.line(30, by - 3, 100, by - 3);
  font('bold', 10.5); color(PETROL); doc.text(clean(d.signer || ''), 30, by + 2);
  font('normal', 9); color(MUTED); doc.text(clean(d.signerRole || ''), 30, by + 7);
  font('bold', 10.5); color(PETROL); doc.text(clean(d.date || ''), PW - 30, by + 2, { align: 'right' });
  font('normal', 9); color(MUTED); doc.text('Código de certificado: ' + clean(d.code || ''), PW - 30, by + 7, { align: 'right' });
  return doc;
}

window.GuiaPdfAvance = crearPdfAvance;
window.GuiaPdfCertificado = crearCertificado;
