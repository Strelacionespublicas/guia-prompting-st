# Activar el login con Google (Firebase)

Lleva unos 15 minutos y se hace una sola vez. Firebase es gratis para este uso: el plan gratuito alcanza para cientos de alumnos.

Hasta que no se haga, la guía funciona igual que antes: se puede leer, copiar los prompts, marcar hasta dónde se leyó y descargar el PDF. Lo que no aparece es el botón "Ingresar con Google" ni la opción de completar los ejercicios.

## 1. Crear el proyecto

1. Entrá a https://console.firebase.google.com con tu cuenta de Google.
2. **Crear un proyecto** → nombre: `guia-prompting-st` (o el que quieras). Google Analytics no hace falta.

## 2. Activar el ingreso con Google

1. Menú **Compilación → Authentication → Comenzar**.
2. Pestaña **Método de acceso** → **Google** → Habilitar.
3. **Nombre público del proyecto:** poné `Guía práctica de prompting · ST`. Es lo que ve el alumno en la ventana de Google.
4. Elegí tu email de asistencia y guardá.
5. Pestaña **Configuración → Dominios autorizados** → **Agregar dominio**: el de Netlify (por ejemplo `guia-prompting.netlify.app`) y, si lo usás, tu dominio propio.

## 3. Crear la base de datos

1. Menú **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: `southamerica-east1 (São Paulo)`, la más cercana a Argentina.
3. Modo: **producción**.
4. Pestaña **Reglas**: borrá lo que haya, pegá el contenido de `firestore.rules` y reemplazá `tu-cuenta@gmail.com` por la cuenta con la que vas a ver el seguimiento. Si son varias: `['una@gmail.com', 'otra@gmail.com']`. **Publicar**.

## 4. Conectar la guía

1. En Firebase: engranaje ⚙ → **Configuración del proyecto** → abajo, **Tus apps** → ícono **</>** (web) → nombre `guia` → **Registrar app** (sin Hosting).
2. Copiá el bloque `firebaseConfig` que aparece.
3. Abrí `site/js/firebase-config.js` y:
   - reemplazá `window.GUIA_FIREBASE_CONFIG = null;` por `window.GUIA_FIREBASE_CONFIG = { …lo que copiaste… };`
   - en `window.GUIA_ADMINS` poné el mismo email (o emails) que en las reglas.
4. Volvé a subir la carpeta `site` a Netlify.

Si preferís, pasale el bloque `firebaseConfig` a Claude y lo deja configurado.

## 5. Ver el seguimiento

Entrá a `https://tu-sitio.netlify.app/admin.html` con la cuenta docente. Vas a ver:

- cuántos alumnos se registraron y cuántos estuvieron activos en la última semana;
- cuánto leyó cada uno y en qué capítulo está;
- cuántos espacios completó y, haciendo clic en su nombre, todas sus respuestas;
- un botón **Descargar CSV** para abrir todo en Google Sheets o Excel.

## Cosas a saber

- **Instagram, WhatsApp y otras apps:** Google no deja ingresar desde el navegador interno de esas apps. La guía lo detecta y le pide al alumno que la abra en Chrome o Safari, con un botón para copiar el enlace. Conviene avisarlo también cuando compartas el link.
- **Datos personales:** se guarda nombre, email y foto de Google, y lo que cada alumno escribe en la guía. Cada alumno ve solo lo suyo y solo las cuentas docentes ven todo. Vale la pena mencionarlo en la presentación del curso.
- **Si cambia el contenido de la guía:** las respuestas se guardan por casillero. Si se agregan o quitan tablas o ejercicios, hay que volver a marcar los campos con `scripts/marcar-campos.py`, y las respuestas viejas pueden quedar desfasadas. Conviene cerrar el contenido antes de abrir la inscripción.
