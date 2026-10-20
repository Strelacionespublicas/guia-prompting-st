# Guía práctica de prompting · ST Relaciones Públicas

Cuaderno de trabajo web del curso de Claude y Codex. Los alumnos leen la guía, ingresan con Google, completan los ejercicios y marcan los capítulos terminados. La docente sigue el avance de cada alumno y puede editar textos, videos y enlaces desde la misma página.

- **Sitio:** https://guia-prompting-st.netlify.app
- **Panel de seguimiento:** https://guia-prompting-st.netlify.app/admin.html
- **Firebase:** proyecto `guia-de-prompting` (login con Google y base de datos Firestore)

## Qué hay en cada carpeta

| Carpeta / archivo | Qué es |
|---|---|
| `site/` | **El sitio que se publica en Netlify.** HTML, CSS y JS sin build: se sube la carpeta tal cual. |
| `site/js/firebase-config.js` | Conexión con Firebase y emails de las cuentas docentes. |
| `site/guia-practica-de-prompting.pdf` | El PDF descargable de la guía (se genera con `npm run pdf`). |
| `src/` | Código que se compila a `site/js/backend.js` (Firebase) y `site/js/pdf-avance.js` (PDF "Mi avance"). |
| `scripts/` | Generar el PDF y marcar campos o bloques editables nuevos en la guía. |
| `firestore.rules` | Reglas de seguridad de Firestore. Se copian a mano en la consola de Firebase. |
| `CONFIGURAR-LOGIN.md` | Paso a paso de Firebase y uso del modo edición. |
| `project/` | Exportación original de Claude Design (referencia de diseño). |

## Tareas frecuentes

**Publicar cambios:** se publican solos. Netlify está conectado a este repositorio y cada cambio que entra en `main` sale online en un minuto (base y publish directory: `site`, sin comando de build).

**Regenerar el PDF después de editar la guía** (incluye las ediciones publicadas desde la web):

```
npm install
npm run pdf
```

**Después de cambiar algo en `src/`:** `npm run build`.

**Agregar una cuenta docente:** sumar el email en `site/js/firebase-config.js` (`GUIA_ADMINS`) y en `firestore.rules` (función `isAdmin`), y publicar las reglas en Firebase.

## Probar en local

```
npm install
npm run emulators          # Firebase local (necesita Java)
cd site && python3 -m http.server 8765
```

Con un `firebase-config.js` cuyo `projectId` empiece con `demo-`, el sitio usa los emuladores en vez del proyecto real.
