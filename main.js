// ===== 1) IMPORTS DESDE CDN (modular v9+) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, setDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===== 2) CONFIG EXACTA (ajústala con tu consola Firebase) =====
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "journal-infiniti-kapital.firebaseapp.com",
  projectId: "journal-infiniti-kapital",
  storageBucket: "journal-infiniti-kapital.appspot.com",   // FIX
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID",
  measurementId: "TU_MEASUREMENT_ID"
};

// ===== 3) INIT =====
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
console.log("✅ Firebase inicializado");

// ===== 4) TEST WRITE + READ =====
async function writeTest() {
  const ref = doc(collection(db, "entries"), "fb-healthcheck");
  await setDoc(ref, {
    title: "Ping OK",
    ts: serverTimestamp()
  });
  console.log("Escritura OK");
}

async function readEntries() {
  const snap = await getDocs(collection(db, "entries"));
  if (snap.empty) {
    console.log("No hay entradas en 'entries'.");
  } else {
    snap.forEach(d => console.log("Entrada:", d.id, d.data()));
  }
}

document.getElementById("test-fb")?.addEventListener("click", async () => {
  try {
    await writeTest();
    await readEntries();
    alert("Firestore conectado ✅ (ver consola y pestaña Network)");
  } catch (e) {
    console.error("❌ Firebase ERROR:", e);
    alert("Firebase ERROR: " + (e?.message || e));
  }
});

// Ejecuta lectura al cargar
window.addEventListener("DOMContentLoaded", readEntries);
