// Genera site/guia-practica-de-prompting.pdf (A4, con número de página) a partir de site/index.html.
// Volver a correrlo cada vez que cambie el contenido de la guía:  npm run pdf
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const SITE = path.join(__dirname, '..', 'site');
const OUT = path.join(SITE, 'guia-practica-de-prompting.pdf');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  // El PDF de base va sin login: la configuración de Firebase no se carga
  if (url === '/js/firebase-config.js') {
    res.writeHead(200, { 'content-type': TYPES['.js'] });
    return res.end('window.GUIA_FIREBASE_CONFIG = null;');
  }
  const file = path.join(SITE, url === '/' ? 'index.html' : url);
  if (!file.startsWith(SITE) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const footer = `<div style="width:100%;font:8px Helvetica,Arial,sans-serif;color:#6F7A7C;padding:0 15mm;display:flex;justify-content:space-between">
  <span>Guía práctica de prompting · ST Relaciones Públicas</span>
  <span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

server.listen(0, async () => {
  const { port } = server.address();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: OUT,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: footer,
      margin: { top: '16mm', right: '15mm', bottom: '18mm', left: '15mm' },
      tagged: true,
      outline: true
    });
    console.log('PDF generado:', path.relative(process.cwd(), OUT), Math.round(fs.statSync(OUT).size / 1024) + ' KB');
  } finally {
    await browser.close();
    server.close();
  }
});
