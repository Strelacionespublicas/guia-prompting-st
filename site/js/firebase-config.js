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
  cargo: 'CEO & Founder de ST Relaciones Públicas® SAS',
  lugar: 'Argentina',
  razonSocial: 'ST Relaciones Públicas SAS',
  // Dirección oficial de la guía: la usan el enlace de verificación y LinkedIn
  dominio: 'https://guia.strelacionespublicas.com.ar/',
  // Cómo aparece en LinkedIn ("Licencias y certificaciones")
  titulo: 'Guía práctica de prompting · Curso Claude y Codex',
  organizacion: 'ST Relaciones Públicas',
  // ID numérico de la página de empresa en LinkedIn: si se completa, se muestra el logo de ST
  linkedinOrgId: '76160143'
};

// Contacto y redes del inicio. Las que queden vacías no se muestran.
window.GUIA_CONTACTO = {
  whatsapp: '5493834070959', // número con código de país, sin + ni espacios. Ej.: 5493834000000
  instagram: 'https://www.instagram.com/strelacionespublicas/',
  linkedin: 'https://www.linkedin.com/company/st-relaciones-publicas/',
  tiktok: 'https://www.tiktok.com/@strelacionespublicas',
  youtube: ''
};

// Servicios de ST que se ofrecen al terminar la guía. Cada botón abre WhatsApp con el mensaje indicado.
window.GUIA_SERVICIOS = [
  { titulo: 'Mentoría 1 a 1', texto: 'Te acompaño a llevar tu proyecto de la idea a una herramienta que funcione, en encuentros personalizados.', mensaje: 'Hola, terminé la Guía práctica de prompting y quiero saber más sobre la mentoría 1 a 1.' },
  { titulo: 'Lo construimos juntos', texto: 'Diseñamos e implementamos tu herramienta: formulario, cotizador, agenda o lo que tu negocio necesite.', mensaje: 'Hola, terminé la Guía práctica de prompting y quiero consultar por la implementación de una herramienta.' },
  { titulo: 'Capacitación para equipos', texto: 'Talleres de IA aplicada para equipos de trabajo, empresas e instituciones.', mensaje: 'Hola, terminé la Guía práctica de prompting y quiero consultar por una capacitación para mi equipo.' }
];
