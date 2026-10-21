# Contexto para Claude

Sitio estático (sin framework) de la "Guía práctica de prompting" de ST Relaciones Públicas. Dueña: Stella (docente). Público: alumnos del curso de Claude y Codex, muchos sin conocimientos técnicos. Todo el texto de la interfaz va en español argentino con voseo.

## Arquitectura
- `site/` se publica tal cual en Cloudflare Pages (proyecto `guia-prompting-st`, dominio propio `guia.strelacionespublicas.com.ar`, DNS en Hostinger con CNAME a `guia-prompting-st.pages.dev`; tiene que figurar también en los dominios autorizados de Firebase Auth): cada push a `main` en GitHub se despliega solo (build output directory: `site`, sin comando de build; encabezados en `site/_headers`). Antes estaba en Netlify, que se dejó porque el plan gratis pasó a créditos y pausó los deploys; Vercel Hobby no permite uso comercial. No hay secretos en el repo: los datos de los alumnos viven en Firestore. Los bundles de `src/` se compilan con `npm run build` y se commitean en `site/js/`.
- Firebase (`guia-de-prompting`): Auth con Google + Firestore lite.
  - `users/{uid}`: `profile`, `progress` (incluye `finished` por capítulo), `fields` (respuestas por id de campo), `stats`.
  - `content/guia`: ediciones de la docente (`blocks`, `videos`, `extras`), lectura pública.
  - `certificates/{código ST-XXXX-XXXX}`: certificados emitidos (`uid`, `name`, `issuedAt`), lectura pública por código para `verificar.html`, que es la URL de "Mostrar credencial" en LinkedIn. Solo se crean con los 17 capítulos terminados.
  - Las reglas están en `firestore.rules`; la docente las pega a mano en la consola.
- `site/js/guia.js`: lectura, índice, marcador, capítulos terminados, campos, copiar prompts, PDF "Mi avance", sesión.
- `site/js/contenido.js`: aplica las ediciones de la docente (para todos). `site/js/editor.js`: modo edición (solo admins).
- `site/js/admin.js` + `admin.html`: panel de seguimiento.

## Laboratorios optativos y diagnóstico
- `CHAPTERS` en `guia.js` termina con los laboratorios optativos (Anexos D a G: `lab-proyecto`, `lab-trabado`, `lab-mejorar`, `lab-publicar`), marcados con un cuarto elemento `'opt'`. No cuentan para el certificado (`FINISHABLE` los excluye: siguen siendo 17), se muestran aparte en Mi curso, la barra lateral y el índice, y se recorren entre ellos. Van al final de `CHAPTERS` para no mover los índices guardados (marcador, último lugar); en el HTML están antes del glosario para que la guía impresa cierre con el glosario.
- Un campo con `data-options="a|b|c"` se muestra como lista desplegable y se guarda como texto, igual que los demás.
- El diagnóstico inicial (`como-usar-dx-*` en "Cómo usar esta guía") arma la recomendación con reglas fijas en `renderDiagnostico()` (no usa IA). La ficha de viabilidad está en el capítulo 1 (`#viabilidad`, campos `cap1-v*`).
- Los ids de campo empiezan con el id de su sección: así los cuenta "Mi curso" como actividades del módulo.

## Captación
- Novedades: consentimiento expreso y revocable, guardado en `users/{uid}.profile.novedades` (`{ acepta, at }`). Se pide en el diálogo del certificado (casilla sin marcar), en el menú de la cuenta y en el bloque "Seguí con ST". El panel muestra ✉, lo suma al CSV y copia los correos de quienes aceptaron. Si cambia el uso de esos datos, actualizar `site/privacidad.html`.
- "Seguí con ST" (`buildSeguir()`): servicios definidos en `window.GUIA_SERVICIOS` (`site/js/firebase-config.js`), con botón a WhatsApp. Se ve al final del glosario y, en el inicio, solo con el certificado listo.

## Cuidados
- Los ids `data-field` (respuestas) y `data-edit` (bloques editables) de `site/index.html` son estables: no renumerarlos. Si se agrega contenido, correr `scripts/marcar-editables.py` (agrega ids nuevos sin tocar los existentes). `scripts/marcar-campos.py` solo corre sobre HTML sin campos marcados.
- Tras cambiar contenido o estilos de impresión, regenerar el PDF con `npm run pdf` (requiere red para traer las ediciones desde Firestore).
- Seguir los tokens del design system de ST (`site/css/tokens.css`): petróleo #012C3D, coral #F8444F, Inter (títulos) y Karla (texto).
- Probar con los emuladores (`npm run emulators`, proyecto `demo-guia`); `GuiaBackend.emulatorSignIn(email, nombre)` existe solo en ese modo.
