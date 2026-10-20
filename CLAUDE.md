# Contexto para Claude

Sitio estático (sin framework) de la "Guía práctica de prompting" de ST Relaciones Públicas. Dueña: Stella (docente). Público: alumnos del curso de Claude y Codex, muchos sin conocimientos técnicos. Todo el texto de la interfaz va en español argentino con voseo.

## Arquitectura
- `site/` se publica tal cual en Netlify (proyecto `guia-prompting-st`, dominio propio `guia.strelacionespublicas.com.ar`, DNS en Hostinger con CNAME a `guia-prompting-st.netlify.app`; tiene que figurar también en los dominios autorizados de Firebase Auth): cada push a `main` en GitHub se despliega solo (base y publish directory: `site`, sin comando de build). El repositorio tiene que seguir siendo público: en el plan gratis de Netlify, un repo privado bloquea los deploys de commits cuyo autor no es la titular de la cuenta (por ejemplo, los de Claude). No hay secretos en el repo: los datos de los alumnos viven en Firestore. Los bundles de `src/` se compilan con `npm run build` y se commitean en `site/js/`.
- Firebase (`guia-de-prompting`): Auth con Google + Firestore lite.
  - `users/{uid}`: `profile`, `progress` (incluye `finished` por capítulo), `fields` (respuestas por id de campo), `stats`.
  - `content/guia`: ediciones de la docente (`blocks`, `videos`, `extras`), lectura pública.
  - `certificates/{código ST-XXXX-XXXX}`: certificados emitidos (`uid`, `name`, `issuedAt`), lectura pública por código para `verificar.html`, que es la URL de "Mostrar credencial" en LinkedIn. Solo se crean con los 17 capítulos terminados.
  - Las reglas están en `firestore.rules`; la docente las pega a mano en la consola.
- `site/js/guia.js`: lectura, índice, marcador, capítulos terminados, campos, copiar prompts, PDF "Mi avance", sesión.
- `site/js/contenido.js`: aplica las ediciones de la docente (para todos). `site/js/editor.js`: modo edición (solo admins).
- `site/js/admin.js` + `admin.html`: panel de seguimiento.

## Cuidados
- Los ids `data-field` (respuestas) y `data-edit` (bloques editables) de `site/index.html` son estables: no renumerarlos. Si se agrega contenido, correr `scripts/marcar-editables.py` (agrega ids nuevos sin tocar los existentes). `scripts/marcar-campos.py` solo corre sobre HTML sin campos marcados.
- Tras cambiar contenido o estilos de impresión, regenerar el PDF con `npm run pdf` (requiere red para traer las ediciones desde Firestore).
- Seguir los tokens del design system de ST (`site/css/tokens.css`): petróleo #012C3D, coral #F8444F, Inter (títulos) y Karla (texto).
- Probar con los emuladores (`npm run emulators`, proyecto `demo-guia`); `GuiaBackend.emulatorSignIn(email, nombre)` existe solo en ese modo.
