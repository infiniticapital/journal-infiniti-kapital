// auth.js  —  Plug & Play Auth + Roles + Admin Panel
// --------------------------------------------------
// Requisitos: Firestore Rules con campo "role" (admin/user) según te compartí.

// === 0) Imports Firebase (CDN ESM) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// === 1) Configuración Firebase (usa la tuya) ===
const firebaseConfig = {
  apiKey: "AIzaSyCUS-Bg9Z7i...",        // <- tu API key
  authDomain: "journal-infiniti-kapital.firebaseapp.com",
  projectId: "journal-infiniti-kapital",
  storageBucket: "journal-infiniti-kapital.appspot.com",
  messagingSenderId: "78211615687",
  appId: "1:78211615687:web:82b05b3ad3dcd6c8e7e2",
  measurementId: "G-D0E8FPMLGQ"
};

// === 2) Init ===
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// === 3) Utiles DOM (crea si no hay) ===
function ensureEl(tag, attrs = {}, parent = document.body) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "text") el.textContent = v;
    else el.setAttribute(k, v);
  });
  parent.appendChild(el);
  return el;
}

function byId(id) { return document.getElementById(id); }

// Header: nombre/rol (crea placeholders si no existen)
if (!byId("user-name")) {
  const hdr = document.querySelector(".user-name") || ensureEl("div", { class: "user-name" }, document.body);
  hdr.id = "user-name";
}
if (!byId("user-role")) {
  const badge = ensureEl("span", { id: "user-role", style: "margin-left:6px;opacity:.8" }, byId("user-name").parentElement || document.body);
  badge.textContent = "Invitado";
}

// Botón logout si no existe
if (!byId("btn-logout")) {
  const btn = ensureEl("button", { id: "btn-logout", style: "display:none;margin-left:10px" }, document.body);
  btn.textContent = "Salir";
}

// Menú/Admin container (si existen se usan)
const menuAdmin = byId("menu-admin");
let adminContent = byId("admin-content");
if (!adminContent) {
  // crea contenedor oculto si no existe
  adminContent = ensureEl("section", { id: "admin-content", style: "display:none;padding:16px" }, document.body);
}

// === 4) Modal de Acceso (inyecta si no existe) ===
function injectLoginModal() {
  if (byId("login-modal")) return;

  const modal = document.createElement("div");
  modal.id = "login-modal";
  modal.style.cssText = `
    display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;
    align-items:center;justify-content:center;padding:16px;
  `;
  modal.innerHTML = `
    <div style="background:#0f172a;border:1px solid #d4af37;border-radius:12px;padding:20px;max-width:420px;width:100%;color:#e5e7eb">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="margin:0;color:#d4af37">Acceso</h3>
        <button id="btn-login-close" style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer">✕</button>
      </div>
      <label>Email</label>
      <input id="login-email" type="email" placeholder="tu@correo.com" style="width:100%;padding:10px;margin:6px 0 12px;background:#111827;border:1px solid #334155;border-radius:8px;color:#e5e7eb">
      <label>Contraseña</label>
      <input id="login-pass" type="password" placeholder="••••••••" style="width:100%;padding:10px;margin:6px 0 16px;background:#111827;border:1px solid #334155;border-radius:8px;color:#e5e7eb">
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="btn-register" style="background:#334155;border:none;color:#fff;padding:10px 14px;border-radius:8px;cursor:pointer">Crear cuenta</button>
        <button id="btn-cancel"   style="background:#334155;border:none;color:#fff;padding:10px 14px;border-radius:8px;cursor:pointer">Cancelar</button>
        <button id="btn-login"    style="background:#d4af37;border:none;color:#0f172a;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:600">Entrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
injectLoginModal();

// Botón para abrir modal si no existe ya en tu UI
if (!byId("btn-open-login")) {
  const opener = ensureEl("button", { id: "btn-open-login", style: "position:fixed;right:16px;bottom:16px;border-radius:50%;width:56px;height:56px;background:#d4af37;border:none;cursor:pointer;z-index:9999" });
  opener.title = "Acceder / Crear cuenta";
  opener.textContent = "+";
  opener.addEventListener("click", () => toggleLogin(true));
}

// === 5) UI Helpers ===
function toggleLogin(show) {
  const m = byId("login-modal");
  if (m) m.style.display = show ? "flex" : "none";
}
function setUserHeader(name = "Invitado", role = "Invitado") {
  byId("user-name").textContent = name;
  byId("user-role").textContent = role;
}
function setAdminVisible(visible) {
  if (menuAdmin) menuAdmin.style.display = visible ? "" : "none";
  adminContent.style.display = visible ? "" : "none";
  if (visible) renderAdminPanel(); // pintar tabla si es Admin
}

// === 6) Registro/Login/Logout ===
async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email || "",
      displayName: user.displayName || (user.email ? user.email.split("@")[0] : "Usuario"),
      role: "user",
      createdAt: serverTimestamp()
    });
  }
  return (await getDoc(ref)).data();
}

async function handleRegister() {
  const email = byId("login-email").value.trim();
  const pass  = byId("login-pass").value;
  if (!email || !pass) return alert("Completa email y contraseña.");

  const { user } = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(user, { displayName: email.split("@")[0] });
  await ensureUserDoc(user);
  alert("Cuenta creada. Sesión iniciada.");
  toggleLogin(false);
}

async function handleLogin() {
  const email = byId("login-email").value.trim();
  const pass  = byId("login-pass").value;
  if (!email || !pass) return alert("Completa email y contraseña.");

  await signInWithEmailAndPassword(auth, email, pass);
  toggleLogin(false);
}

async function handleLogout() {
  await signOut(auth);
}

// Wire up modal buttons
byId("btn-register")?.addEventListener("click", () => handleRegister().catch(e => alert(e.message)));
byId("btn-login")?.addEventListener("click", () => handleLogin().catch(e => alert(e.message)));
byId("btn-cancel")?.addEventListener("click", () => toggleLogin(false));
byId("btn-login-close")?.addEventListener("click", () => toggleLogin(false));
byId("btn-logout")?.addEventListener("click", () => handleLogout().catch(e => alert(e.message)));

// === 7) Admin Panel (lista usuarios + cambio de rol) ===
async function renderAdminPanel() {
  adminContent.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h2 style="margin:0;color:#d4af37">Panel de Administración</h2>
      <button id="btn-refresh-users" style="background:#334155;border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer">Actualizar</button>
    </div>
    <div style="overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:12px">
      <table style="width:100%;border-collapse:collapse">
        <thead style="background:rgba(255,255,255,.04)">
          <tr>
            <th style="text-align:left;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">UID</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">Nombre</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">Email</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">Rol</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">Acciones</th>
          </tr>
        </thead>
        <tbody id="users-tbody"></tbody>
      </table>
    </div>
  `;

  const tbody = byId("users-tbody");
  tbody.innerHTML = `<tr><td style="padding:10px" colspan="5">Cargando…</td></tr>`;
  const q = await getDocs(collection(db, "users"));
  tbody.innerHTML = "";

  q.forEach(snap => {
    const data = snap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06)">${snap.id}</td>
      <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06)">${data.displayName || "—"}</td>
      <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06)">${data.email || "—"}</td>
      <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06)">
        <select data-uid="${snap.id}" class="role-select" style="background:#0b1220;color:#e5e7eb;border:1px solid #334155;border-radius:6px;padding:6px">
          <option value="user"  ${data.role === "user"  ? "selected" : ""}>user</option>
          <option value="admin" ${data.role === "admin" ? "selected" : ""}>admin</option>
        </select>
      </td>
      <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06)">
        <button class="btn-save-role" data-uid="${snap.id}" style="background:#d4af37;color:#0f172a;border:none;padding:6px 10px;border-radius:8px;cursor:pointer">Guardar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  adminContent.querySelectorAll(".btn-save-role").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const uid = e.currentTarget.getAttribute("data-uid");
      const sel = adminContent.querySelector(`.role-select[data-uid="${uid}"]`);
      const newRole = sel.value;
      try {
        await updateDoc(doc(db, "users", uid), { role: newRole });
        alert("Rol actualizado.");
      } catch (err) {
        alert("No se pudo actualizar el rol: " + err.message);
      }
    });
  });

  byId("btn-refresh-users")?.addEventListener("click", renderAdminPanel);
}

// === 8) Auth State ===
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setUserHeader("Invitado", "Invitado");
    setAdminVisible(false);
    byId("btn-logout").style.display = "none";
    return;
  }

  try {
    const data = await ensureUserDoc(user);
    setUserHeader(user.displayName || (user.email ? user.email.split("@")[0] : "Usuario"), data.role === "admin" ? "Admin" : "Usuario");
    byId("btn-logout").style.display = "";

    // Mostrar/ocultar panel Admin
    setAdminVisible(data.role === "admin");
  } catch (err) {
    console.error(err);
    alert("Error cargando perfil: " + err.message);
  }
});
