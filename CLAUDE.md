# Contexto para Claude

Sitio estático (sin framework) de la "Guía práctica de prompting" de ST Relaciones Públicas. Dueña: Stella (docente). Público: alumnos del curso de Claude y Codex, muchos sin conocimientos técnicos. Todo el texto de la interfaz va en español argentino con voseo.

Mapa del sitio para reutilizar en próximas guías: `docs/mapa-del-sitio.md`. Guiones de los videos: `docs/guiones-videos.md`.

## Cómo trabajamos (lo aprendido en las iteraciones)
- **Nada se publica sin el OK de Stella.** Cada cambio va en una rama, se prueba con los emuladores en compu y celular, se le mandan capturas, y recién con su OK se hace fast-forward a `main` y push. Decir siempre qué está implementado, qué se probó y qué falta.
- **Primero el plan o el mapa, después construir.** Ante un pedido grande, proponer el plan (con el método IDEA de la guía) y esperar aprobación. Construir sin mapa obligó a reordenar la guía varias veces.
- **No inventar** precios, videos, enlaces, testimonios ni resultados de pruebas. Datos de herramientas, planes y precios: verificarlos en fuentes actuales, citarlas y escribir "Revisado en <mes año>" con "verificalo en la ayuda oficial".
- **Contenido:** con la voz de Stella, nunca copiando textos de terceros (las ideas se reescriben); ejemplos no técnicos y un mismo caso a lo largo de la guía (el turnero del centro de estética). Más contenido no es mejor: priorizar experiencia (videos, examen, interacción) antes que capítulos nuevos.
- **De la documentación técnica** (por ejemplo, la de Claude Code), quedarse solo con lo útil para alumnos sin conocimientos técnicos y decir qué se dejó afuera.
- **Lo que no se puede romper:** el avance y las respuestas guardadas de los alumnos (ids estables, índices de `CHAPTERS`), los 17 módulos que piden las reglas para el certificado, y los certificados ya emitidos (quien tiene uno lo conserva).
- **Revisar los casos borde de cuentas:** navegadores compartidos, cierre de sesión, otro dispositivo. Un examen no debe revelar las respuestas al desaprobar.
- **Piezas para redes:** carruseles en HTML renderizados con Playwright, con el diseño de los anteriores (en el scratchpad de la sesión): PNG 1080×1350 para Instagram, PDF para LinkedIn y textos por red. En Instagram el llamado es "Comentá GUÍA" (respuesta automática de ManyChat); en LinkedIn, "link en el primer comentario". Indicar el objetivo de cada pieza.

## Arquitectura
- `site/` se publica tal cual en Cloudflare Pages (proyecto `guia-prompting-st`, dominio propio `guia.strelacionespublicas.com.ar`, DNS en Hostinger con CNAME a `guia-prompting-st.pages.dev`; tiene que figurar también en los dominios autorizados de Firebase Auth): cada push a `main` en GitHub se despliega solo (build output directory: `site`, sin comando de build; encabezados en `site/_headers`). Antes estaba en Netlify, que se dejó porque el plan gratis pasó a créditos y pausó los deploys; Vercel Hobby no permite uso comercial. No hay secretos en el repo: los datos de los alumnos viven en Firestore. Los bundles de `src/` se compilan con `npm run build` y se commitean en `site/js/`.
- Firebase (`guia-de-prompting`): Auth con Google + Firestore lite.
  - `users/{uid}`: `profile`, `progress` (incluye `finished` por capítulo), `fields` (respuestas por id de campo), `stats`.
  - `content/guia`: ediciones de la docente (`blocks`, `videos`, `extras`), lectura pública.
  - `certificates/{código ST-XXXX-XXXX}`: certificados emitidos (`uid`, `name`, `issuedAt`), lectura pública por código para `verificar.html`, que es la URL de "Mostrar credencial" en LinkedIn. Solo se crean con los 17 capítulos terminados.
  - Examen final: módulo propio (`#examen`, sección después del glosario, `data-noprint`), al final de `CHAPTERS` con cuarto elemento `'exam'`; no entra en `FINISHABLE` ni en los optativos y se muestra después del glosario en Mi curso, la barra lateral y el índice. Adentro están las preguntas (`#evaluacion`), la tarjeta del certificado y "Seguí con ST". Al aprobar por primera vez se abre solo el diálogo del certificado.
  - Preguntas del examen: 10 situaciones en `QUIZ` (`guia.js`), se aprueba con 8. El resultado va en `users/{uid}.progress.quiz` (`{ score, total, ok, at }`); un aprobado no se pierde al repetirla. Al desaprobar no se muestran las respuestas correctas, solo qué repasar. `certReady()` exige los 17 capítulos y la evaluación aprobada; quien ya tenía `certificate` lo conserva. El control es del navegador: las reglas de Firestore siguen pidiendo solo `finishedCount >= 17`. El panel muestra el puntaje y lo suma al CSV.
  - El avance local (`localStorage`) tiene dueño (`owner` = uid): el avance sin cuenta se suma a la primera cuenta que ingresa, pero el de otra cuenta no se hereda. Cualquier cierre de sesión limpia el navegador y recarga. Un certificado registrado que no está en la cuenta se descarta al ingresar, y si el código ya es de otra persona (`permission-denied` al registrarlo) se genera uno nuevo. Cada persona tiene un solo código: volver a descargar mantiene el mismo, para que el enlace de LinkedIn siga funcionando.
  - Las reglas están en `firestore.rules`; la docente las pega a mano en la consola.
- `site/js/guia.js`: lectura, índice, marcador, capítulos terminados, campos, copiar prompts, PDF "Mi avance", sesión.
- `site/js/contenido.js`: aplica las ediciones de la docente (para todos). `site/js/editor.js`: modo edición (solo admins).
- `site/js/admin.js` + `admin.html`: panel de seguimiento.

## Laboratorios optativos y diagnóstico
- `CHAPTERS` en `guia.js` termina con los laboratorios optativos (Anexos D a H: `lab-proyecto`, `lab-trabado`, `lab-mejorar`, `lab-publicar` y la referencia rápida `atajos`), marcados con un cuarto elemento `'opt'`. No cuentan para el certificado (`FINISHABLE` los excluye: siguen siendo 17), se muestran aparte en Mi curso, la barra lateral y el índice, y se recorren entre ellos. Van al final de `CHAPTERS` para no mover los índices guardados (marcador, último lugar); en el HTML están antes del glosario para que la guía impresa cierre con el glosario.
- El Anexo H (`#atajos`) resume atajos de teclado, comandos y hooks de Claude Code para principiantes, tomados de la documentación oficial (octubre 2026). Si cambia Claude Code, revisarlo contra code.claude.com/docs.
- Un campo con `data-options="a|b|c"` se muestra como lista desplegable y se guarda como texto, igual que los demás.
- El diagnóstico inicial (`como-usar-dx-*` en "Cómo usar esta guía") arma la recomendación con reglas fijas en `renderDiagnostico()` (no usa IA). La ficha de viabilidad está en el capítulo 1 (`#viabilidad`, campos `cap1-v*`).
- Los ids de campo empiezan con el id de su sección: así los cuenta "Mi curso" como actividades del módulo.

## Captación
- Novedades: consentimiento expreso y revocable, guardado en `users/{uid}.profile.novedades` (`{ acepta, at }`). Se pide en el diálogo del certificado (casilla sin marcar), en el menú de la cuenta y en el bloque "Seguí con ST". El panel muestra ✉, lo suma al CSV y copia los correos de quienes aceptaron. Si cambia el uso de esos datos, actualizar `site/privacidad.html`.
- Cursos de ST y biblioteca de recursos (`#biblioteca`, en el inicio): la docente los carga desde el modo edición (＋ Agregar curso / recurso, Editar, ↑, Quitar). Se guardan en `content/guia` dentro de `extras` con las claves reservadas `@cursos` y `@recursos` (listas de `{ url, title, texto?, cat? }`), así no hace falta cambiar las reglas. Los recursos se agrupan por `cat`; en los cursos `cat` es la etiqueta (Gratis, Pago…). Sin nada cargado, los alumnos no ven el bloque. No se imprime.
- "Seguí con ST" (`buildSeguir()`): servicios definidos en `window.GUIA_SERVICIOS` (`site/js/firebase-config.js`), con botón a WhatsApp. Se ve al final del módulo del examen y, en el inicio, solo con el certificado listo.

## Formato visual
- Rótulos de recuadro con ícono: clase `rot rot--<ícono>` en el div del rótulo (target, lapiz, tilde, alerta, rayo, info, mic). Listas de "Qué vas a aprender" con tilde: `lista-ok`. Párrafos que empiezan con un rótulo en negrita ("Objetivo.", "Qué juntar."…): `dato dato--<ícono>`. Recuadros que comparan opciones: `tarjetas` en el contenedor. Pasos numerados: `ol.pasos`. Los íconos son SVG en CSS (`--ico`), así que el texto y los ids no cambian. Contenido nuevo: usar estas clases en vez de párrafos largos.

## Cuidados
- Los ids `data-field` (respuestas) y `data-edit` (bloques editables) de `site/index.html` son estables: no renumerarlos. Si se agrega contenido, correr `scripts/marcar-editables.py` (agrega ids nuevos sin tocar los existentes). `scripts/marcar-campos.py` solo corre sobre HTML sin campos marcados.
- Tras cambiar contenido o estilos de impresión, regenerar el PDF con `npm run pdf` (requiere red para traer las ediciones desde Firestore).
- Seguir los tokens del design system de ST (`site/css/tokens.css`): petróleo #012C3D, coral #F8444F, Inter (títulos) y Karla (texto).
- Probar con los emuladores (`npm run emulators`, proyecto `demo-guia`); `GuiaBackend.emulatorSignIn(email, nombre)` existe solo en ese modo.
