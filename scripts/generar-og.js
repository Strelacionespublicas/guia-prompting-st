// Genera las imágenes de vista previa (1200×630) que muestran LinkedIn, WhatsApp, etc.
// al compartir un enlace: site/assets/og-guia.png y site/assets/og-certificado.png.
// Uso: node scripts/generar-og.js
const path = require('path');
const { chromium } = require('playwright');

const SITE = path.join(__dirname, '..', 'site');
const base = 'file://' + SITE + '/';
// El logo va incrustado: una página creada con setContent no puede leer imágenes del disco
const FONT = (n) => 'data:font/woff2;base64,' + require('fs').readFileSync(path.join(SITE, 'fonts', n + '.woff2')).toString('base64');
const LOGO = 'data:image/png;base64,' + require('fs').readFileSync(path.join(SITE, 'assets', 'logo-coral.png')).toString('base64');

const css = `
  @font-face{font-family:Inter;src:url(${FONT('inter')}) format('woff2');font-weight:100 900}
  @font-face{font-family:Karla;src:url(${FONT('karla')}) format('woff2');font-weight:100 900}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{margin:0}
  body{width:1200px;height:630px;overflow:hidden;font-family:Karla,sans-serif}
  .band{position:absolute;left:0;right:0;top:0;height:22px;background:#012C3D;border-bottom:6px solid #F8444F}
`;

const guia = `<!doctype html><html><head><meta charset="utf-8"><base href="${base}"><style>${css}
  body{background:#F7F8F3;position:relative}
  .wrap{position:absolute;inset:70px 72px 56px}
  .eyebrow{font:700 22px/1 Inter;letter-spacing:.14em;color:#D32B36}
  h1{font:800 104px/0.98 Inter;letter-spacing:-.02em;color:#012C3D;margin-top:26px}
  p{font:500 32px/1.3 Inter;color:#14566D;margin-top:26px;max-width:760px}
  .idea{position:absolute;right:0;bottom:0;display:flex;gap:12px}
  .idea b{width:72px;height:72px;border-radius:12px;background:#fff;border:2px solid #DDE1DB;display:flex;align-items:center;justify-content:center;font:800 40px Inter;color:#F8444F}
  .logo{position:absolute;left:0;bottom:0;height:62px}
</style></head><body><div class="band"></div><div class="wrap">
  <div class="eyebrow">CUADERNO DE TRABAJO · CURSO CLAUDE Y CODEX</div>
  <h1>GUÍA PRÁCTICA<br>DE PROMPTING</h1>
  <p>Cómo crear herramientas digitales con Claude y Codex, aunque no seas programador.</p>
  <img class="logo" src="${LOGO}">
  <div class="idea"><b>I</b><b>D</b><b>E</b><b>A</b></div>
</div></body></html>`;

const certificado = `<!doctype html><html><head><meta charset="utf-8"><base href="${base}"><style>${css}
  body{background:#012C3D;position:relative}
  .card{position:absolute;left:330px;top:70px;width:540px;height:382px;background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden;text-align:center}
  .card .top{height:14px;background:#012C3D;border-bottom:4px solid #F8444F}
  .card .e{font:700 13px Inter;letter-spacing:.16em;color:#F8444F;margin-top:56px}
  .card .n{font:800 42px Inter;color:#012C3D;margin-top:18px}
  .card .l{width:70px;height:3px;background:#F8444F;margin:16px auto 0}
  .card .c{font:600 18px Inter;color:#14566D;margin-top:18px}
  .card .i{font:800 18px Inter;letter-spacing:.6em;color:#F8444F;margin-top:20px;padding-left:.6em}
  .card img{position:absolute;left:24px;bottom:20px;height:34px}
  .badge{position:absolute;left:0;right:0;bottom:62px;text-align:center;color:#fff;font:700 30px Inter}
  .badge span{color:#78BDC4;font-weight:600;font-size:22px;display:block;margin-top:8px}
</style></head><body><div class="band"></div>
  <div class="card"><div class="top"></div><div class="e">CERTIFICADO DE FINALIZACIÓN</div><div class="n">Guía práctica de prompting</div><div class="l"></div><div class="c">Curso Claude y Codex · 17 capítulos y anexos</div><div class="i">IDEA</div><img src="${LOGO}"></div>
  <div class="badge">Certificado verificado<span>ST Relaciones Públicas</span></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const [name, html] of [['og-guia', guia], ['og-certificado', certificado]]) {
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(SITE, 'assets', name + '.png') });
    console.log('Generada: site/assets/' + name + '.png');
  }
  await browser.close();
})();
