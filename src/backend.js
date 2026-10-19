// Conexión con Firebase: login con Google y guardado del avance de cada alumno.
// Se compila con `npm run build` a site/js/backend.js (el sitio no necesita build en Netlify).
import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, GoogleAuthProvider, onAuthStateChanged,
  signInWithPopup, signInWithRedirect, signInWithCredential, getRedirectResult, signOut, browserLocalPersistence, setPersistence
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, collection, getDocs, serverTimestamp
} from 'firebase/firestore/lite';

const config = window.GUIA_FIREBASE_CONFIG;
const ready = !!(config && config.apiKey && config.projectId);
let auth, db;

if (ready) {
  const app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  // Proyectos "demo-*" en localhost usan los emuladores locales (solo para pruebas)
  if (config.projectId.startsWith('demo-') && location.hostname === 'localhost') {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
  }
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  getRedirectResult(auth).catch(() => {});
}

const emulated = ready && config.projectId.startsWith('demo-') && location.hostname === 'localhost';
const userRef = (uid) => doc(db, 'users', uid);

const backend = {
  ready,
  onUser(cb) {
    if (!ready) { cb(null); return; }
    onAuthStateChanged(auth, (u) => cb(u && { uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' }));
  },
  async signIn() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
        await signInWithRedirect(auth, provider);
      } else if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        throw e;
      }
    }
  },
  signOut() { return signOut(auth); },
  async load(uid) {
    const snap = await getDoc(userRef(uid));
    return snap.exists() ? snap.data() : null;
  },
  // patch se fusiona con lo guardado (los mapas fields/progress se combinan, no se pisan)
  save(uid, patch, isNew) {
    const data = { ...patch, updatedAt: serverTimestamp() };
    if (isNew) data.createdAt = serverTimestamp();
    return setDoc(userRef(uid), data, { merge: true });
  },
  async listUsers() {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
};

// Solo para pruebas automáticas contra el emulador: el emulador acepta credenciales de Google sin firmar.
if (emulated) {
  backend.emulatorSignIn = (email, name) => signInWithCredential(auth, GoogleAuthProvider.credential(
    JSON.stringify({ sub: email, email, name, email_verified: true })));
}

window.GuiaBackend = backend;
window.dispatchEvent(new Event('guia-backend'));
