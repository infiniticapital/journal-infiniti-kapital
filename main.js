// main.js  (usar con <script type="module" src="main.js"></script>)

// ==============================
// 1) IMPORTS (SDK v10 por CDN)
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==============================
// 2) CONFIG (tu proyecto)
//    Nota: storageBucket corregido a .appspot.com
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyCuS-0g97JluGH6FTF5JBmwaW7d5aJ3WWw",
  authDomain: "journal-infiniti-kapital.firebaseapp.com",
  projectId: "journal-infiniti-kapital",
  storageBucket: "journal-infiniti-kapital.appspot.com",
  messagingSenderId: "78211615687",
  appId: "1:78211615687:web:02b05ba83acd46c8c6e7e2",
  measurementId: "G-D0ERFPMLGQ",
};

// ==============================
// 3) INIT
// ==============================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==============================
// 4) HELPERS UI
// ==============================
const $ = (sel) => document.querySelector(sel);
const safe = (el, fn) => el && fn(el);

function toast(msg) {
  // Puedes cambiar esto por un toast bonito; de momento alert.
  alert(msg);
}

function niceAuthError(e) {
  const msg = e?.code || e?.message || String(e);
  if (msg.includes("auth/configuration-not-found"))
    return "Authentication no está inicializado o el proveedor no está habilitado.";
  if (msg.includes("auth/operation-not-allowed"))
    return "El proveedor Email/Password está deshabilitado en Firebase.";
  if (msg.includes("auth/invalid-api-key"))
    return "API key inválida. Verifica tu firebaseConfig.";
  if (msg.includes("auth/unauthorized-domain"))
    return "Agrega tu dominio en Authentication → Authorized domains.";
  if (msg.includes("auth/network-request-failed"))
    return "Fallo de red. Revisa conexión o bloqueadores.";
  if (msg.includes("auth/email-already-in-use"))
    return "Este correo ya está registrado.";
  if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password"))
    return "Credenciales inválidas. Revisa email/contraseña.";
  if (msg.includes("auth/user-not-found"))
    return "No existe un usuario con ese correo.";
  return e.message || msg;
}

function closeLoginModal() {
  const modal = $("#modal-login");
  if (modal) modal.style.display = "none";
}

// ==============================
// 5) FIRESTORE: ensureUserDoc
//    Crea /users/{uid} si no existe
// ==============================
async function ensureUserDoc(db, user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || "",
      name: user.displayName || "",
      createdAt: serverTimestamp(),
    });
  }
}

// ==============================
// 6) AUTH: Crear Cuenta / Entrar / Salir
// ==============================
async function doRegister() {
  try {
    const email = $("#login-email")?.value?.trim() || "";
    const pass = $("#login-pass")?.value || "";
    const name = $("#login-name")?.value?.trim() || ""; // opcional

    if (!email || !pass) return toast("Completa email y contraseña.");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    // set displayName si se ingresó
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }

    await ensureUserDoc(db, cred.user);
    toast("Cuenta creada. ¡Bienvenido!");
    closeLoginModal();
  } catch (e) {
    console.error(e);
    toast(niceAuthError(e));
  }
}

async function doLogin() {
  try {
    const email = $("#login-email")?.value?.trim() || "";
    const pass = $("#login-pass")?.value || "";
    if (!email || !pass) return toast("Completa email y contraseña.");

    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await ensureUserDoc(db, cred.user);
    toast("Sesión iniciada.");
    closeLoginModal();
  } catch (e) {
    console.error(e);
    toast(niceAuthError(e));
  }
}

async function doLogout() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error(e);
    toast("No se pudo cerrar sesión.");
  }
}

// ==============================
// 7) AUTH STATE & ROLE
// ==============================
onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      // Garantizar doc del usuario
      await ensureUserDoc(db, user);

      // Obtener claims (role)
      const idTok = await user.getIdTokenResult(true);
      const role = idTok.claims?.role || "user";
      document.body.classList.add("is-auth");
      document.body.classList.toggle("is-admin", role === "admin");
      document.body.dataset.role = role;

      // Actualizar nombre en UI
      safe($(".user-name"), (el) => (el.textContent = user.displayName || user.email || "Usuario"));

      // Mensaje de bienvenida
      safe($("#welcome-message"), (el) => {
        el.textContent = "Tu sesión está activa. Tus operaciones se guardarán en la nube.";
      });

      // Mostrar botón logout, ocultar “Acceder”
      safe($("#btn-logout"), (el) => el.classList.remove("hidden"));
      safe($("#btn-open-login"), (el) => el.classList.add("hidden"));
    } else {
      // Estado invitado
      document.body.classList.remove("is-auth", "is-admin");
      delete document.body.dataset.role;

      safe($(".user-name"), (el) => (el.textContent = "Invitado"));
      safe($("#welcome-message"), (el) => {
        el.textContent = "Inicia sesión para guardar tus operaciones en la nube.";
      });

      safe($("#btn-logout"), (el) => el.classList.add("hidden"));
      safe($("#btn-open-login"), (el) => el.classList.remove("hidden"));
    }
  } catch (e) {
    console.error("onAuthStateChanged error:", e);
    toast("Ocurrió un problema con la sesión.");
  }
});

// ==============================
// 8) EVENT LISTENERS (si existen)
// ==============================
safe($("#btn-register"), (el) => el.addEventListener("click", doRegister));
safe($("#btn-login"), (el) => el.addEventListener("click", doLogin));
safe($("#btn-logout"), (el) => el.addEventListener("click", doLogout));
safe($("#btn-open-login"), (el) =>
  el.addEventListener("click", () => {
    const modal = $("#modal-login");
    if (modal) modal.style.display = "flex";
  })
);

// Cerrar modal si clic fuera del contenido (opcional)
window.addEventListener("click", (e) => {
  const modal = $("#modal-login");
  if (!modal) return;
  if (e.target === modal) modal.style.display = "none";
});

// ==============================
// 9) DEBUG opcional: test Firestore
//    (Descomenta para probar que tienes permisos)
// ==============================
// async function testWrite() {
//   const u = auth.currentUser;
//   if (!u) return toast("No hay sesión.");
//   const r = doc(db, "users", u.uid, "trades", "demo");
//   await setDoc(r, { at: serverTimestamp(), note: "hello" }, { merge: true });
//   toast("Escritura OK en /users/{uid}/trades/demo");
// }
// window._testWrite = testWrite; // desde consola: _testWrite()
