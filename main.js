// main.js — Firebase por CDN modular v9+ (no rompe la UI)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, setDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⚠️ Rellena con tu configuración EXACTA desde Firebase Console → Project settings
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "journal-infiniti-kapital.firebaseapp.com",
  projectId: "journal-infiniti-kapital",
  storageBucket: "journal-infiniti-kapital.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
  measurementId: "TU_MEASUREMENT_ID"
};

let db = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("✅ Firebase inicializado");
} catch (err) {
  console.error("❌ Error inicializando Firebase:", err);
}

// Lectura inicial (no obligatoria)
window.addEventListener("DOMContentLoaded", async () => {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, "entries"));
    if (snap.empty) {
      console.log("ℹ️ No hay entradas aún en 'entries'.");
    } else {
      snap.forEach(d => console.log("Entrada:", d.id, d.data()));
    }
  } catch (e) {
    console.warn("⚠️ Lectura inicial falló:", e);
  }
});

// Botón de prueba: escritura + lectura
document.getElementById("test-fb")?.addEventListener("click", async () => {
  if (!db) { alert("Firebase no está inicializado. Revisa la consola."); return; }
  try {
    const ref = doc(collection(db, "entries"), "fb-healthcheck");
    await setDoc(ref, { title: "Ping OK", ts: serverTimestamp() });
    console.log("📝 Escritura OK en 'entries/fb-healthcheck'");
    const snap = await getDocs(collection(db, "entries"));
    console.log("📥 Entradas:", snap.docs.map(d => ({ id: d.id, ...d.data() })));
    alert("Firestore OK (mira Console y Network)");
  } catch (e) {
    console.error("❌ Firebase ERROR:", e);
    alert("Firebase ERROR: " + (e?.message || e));
  }
});
