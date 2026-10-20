// Configuración de Firebase (login con Google y guardado del avance).
//
// Mientras esto quede en null, la guía funciona igual pero sin login: el avance de
// lectura se guarda solo en el navegador y los ejercicios no se pueden completar.
//
// Para activarlo: Firebase → Configuración del proyecto → Tus apps → App web →
// copiá el objeto firebaseConfig y pegalo acá. Estos datos no son secretos: la
// seguridad la dan las reglas de Firestore (archivo firestore.rules).
window.GUIA_FIREBASE_CONFIG = {
  apiKey: "AIzaSyA4vTd9gRhoyNt9QdyE8Q_hRIM8N_Kq2Ro",
  authDomain: "guia-de-prompting.firebaseapp.com",
  projectId: "guia-de-prompting",
  storageBucket: "guia-de-prompting.firebasestorage.app",
  messagingSenderId: "654492079484",
  appId: "1:654492079484:web:af400e0c2e6c822af300f9"
};
/* Ejemplo:
window.GUIA_FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "guia-prompting-st.firebaseapp.com",
  projectId: "guia-prompting-st",
  storageBucket: "guia-prompting-st.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
*/

// Cuentas de Google que pueden ver el panel de seguimiento (admin.html).
// Tienen que coincidir con la lista de firestore.rules.
window.GUIA_ADMINS = ['stellamaris.torres@gmail.com'];

// Firma que aparece en el certificado de finalización.
window.GUIA_CERTIFICADO = {
  firma: 'Stella Torres',
  cargo: 'Docente · ST Relaciones Públicas',
  lugar: 'Buenos Aires, Argentina',
  razonSocial: 'ST Relaciones Públicas SAS',
  // Dirección oficial de la guía: la usan el enlace de verificación y LinkedIn
  dominio: 'https://guia.strelacionespublicas.com.ar/',
  // Cómo aparece en LinkedIn ("Licencias y certificaciones")
  titulo: 'Guía práctica de prompting · Curso Claude y Codex',
  organizacion: 'ST Relaciones Públicas',
  // ID numérico de la página de empresa en LinkedIn: si se completa, se muestra el logo de ST
  linkedinOrgId: '76160143'
};
