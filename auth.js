// auth.js — Multiusuario + Roles + Panel Admin (primer usuario = admin)
// Cargar así: <script type="module" src="auth.js"></script>

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, getDocs, query, limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// ==== CONFIG FIREBASE (TUYA, CORREGIDA) ====
const firebaseConfig = {
  apiKey: "AIzaSyCuS-0g97JluGH6FTF5JBmwaW7d5aJ3WWw",
  authDomain: "journal-infiniti-kapital.firebaseapp.com",
  projectId: "journal-infiniti-kapital",
  storageBucket: "journal-infiniti-kapital.appspot.com", // <- CORRECTO (.appspot.com)
  messagingSenderId: "78211615687",
  appId: "1:78211615687:web:02b05ba83acd46c8c6e7e2",
  measurementId: "G-D0ERFPMLGQ"
};

// ==== Init (evita doble inicialización) ====
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ==== Helpers DOM ====
const $ = (id) => document.getElementById(id);
function ensureEl(tag, attrs={}, parent=document.body){
  const el=document.createElement(tag);
  for (const k in attrs){ k==="text" ? el.textContent=attrs[k] : el.setAttribute(k,attrs[k]); }
  parent.appendChild(el);
  return el;
}

// Placeholders header si faltan en tu UI
if (!$("user-name")) (ensureEl("span",{id:"user-name",text:"Invitado"}, document.body));
if (!$("user-role")) (ensureEl("span",{id:"user-role",text:"Invitado"}, document.body));
if (!$("btn-logout")) {
  const b=ensureEl("button",{id:"btn-logout"},document.body);
  b.style.display="none"; b.textContent="Salir";
  b.onclick=()=>signOut(auth);
}

// Contenedor Admin si no existe
let adminContent = $("admin-content") || ensureEl("section",{id:"admin-content",style:"display:none;padding:16px"}, document.body);
const menuAdmin  = $("menu-admin");

// ==== Modal de acceso (inyecta si no está) ====
function injectLoginModal(){
  if ($("login-modal")) return;
  const m = document.createElement("div");
  m.id="login-modal";
  m.style.cssText="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;padding:16px";
  m.innerHTML=`
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
    </div>`;
  document.body.appendChild(m);

  // Botón flotante si no tienes uno en tu UI
  if (!$("btn-open-login")){
    const opener = ensureEl("button",{id:"btn-open-login"},document.body);
    Object.assign(opener.style,{position:"fixed",right:"16px",bottom:"16px",width:"56px",height:"56px",borderRadius:"50%",background:"#d4af37",border:"none",cursor:"pointer",zIndex:"9999"});
    opener.title="Acceder / Crear cuenta"; opener.textContent="+";
    opener.onclick=()=>toggleLogin(true);
  }

  $("btn-login-close").onclick=() => toggleLogin(false);
  $("btn-cancel").onclick    =() => toggleLogin(false);
  $("btn-register").onclick  =() => handleRegister().catch(e=>alert(e.message));
  $("btn-login").onclick     =() => handleLogin().catch(e=>alert(e.message));
}
injectLoginModal();
function toggleLogin(show){ const m=$("login-modal"); if(m) m.style.display=show?"flex":"none"; }

// ==== User doc helpers ====
async function usersCount(){
  // No necesitamos el total exacto; con saber si hay alguno basta
  const snap = await getDocs(query(collection(db,"users"), limit(1)));
  return snap.empty ? 0 : 1;
}

async function ensureUserDocAndRole(user){
  const ref  = doc(db,"users",user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()){
    const isFirst = (await usersCount()) === 0;
    const role = isFirst ? "admin" : "user";
    await setDoc(ref,{
      email: user.email || "",
      displayName: user.displayName || (user.email?user.email.split("@")[0]:"Usuario"),
      role,
      createdAt: serverTimestamp()
    });
    return { role, email: user.email, displayName: user.displayName };
  }
  return snap.data();
}

// ==== Registro / Login / Logout ====
async function handleRegister(){
  const email = $("login-email").value.trim();
  const pass  = $("login-pass").value;
  if(!email||!pass) return alert("Completa email y contraseña.");
  const { user } = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(user, { displayName: email.split("@")[0] });
  await ensureUserDocAndRole(user);
  alert("Cuenta creada. Sesión iniciada."); toggleLogin(false);
}

async function handleLogin(){
  const email = $("login-email").value.trim();
  const pass  = $("login-pass").value;
  if(!email||!pass) return alert("Completa email y contraseña.");
  await signInWithEmailAndPassword(auth, email, pass);
  toggleLogin(false);
}

// ==== Panel Admin (listar y cambiar rol) ====
async function renderAdminPanel(){
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
  const tbody = $("users-tbody");
  tbody.innerHTML = `<tr><td style="padding:10px" colspan="5">Cargando…</td></tr>`;
  const q = await getDocs(collection(db,"users"));
  tbody.innerHTML = "";
  q.forEach(snap=>{
    const u = snap.data();
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06)">${snap.id}</td>
      <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06)">${u.displayName||"—"}</td>
      <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06)">${u.email||"—"}</td>
      <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06)">
        <select data-uid="${snap.id}" class="role-select" style="background:#0b1220;color:#e5e7eb;border:1px solid #334155;border-radius:6px;padding:6px">
          <option value="user"  ${u.role==="user"?"selected":""}>user</option>
          <option value="admin" ${u.role==="admin"?"selected":""}>admin</option>
        </select>
      </td>
      <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06)">
        <button class="btn-save-role" data-uid="${snap.id}" style="background:#d4af37;color:#0f172a;border:none;padding:6px 10px;border-radius:8px;cursor:pointer">Guardar</button>
      </td>`;
    tbody.appendChild(tr);
  });
  adminContent.querySelectorAll(".btn-save-role").forEach(btn=>{
    btn.onclick = async (e)=>{
      const uid=e.currentTarget.getAttribute("data-uid");
      const sel=adminContent.querySelector(`.role-select[data-uid="${uid}"]`);
      try{ await updateDoc(doc(db,"users",uid),{role:sel.value}); alert("Rol actualizado."); }
      catch(err){ alert("No se pudo actualizar el rol: "+err.message); }
    };
  });
  $("btn-refresh-users").onclick=renderAdminPanel;
}

function setHeader(name, role){ $("user-name").textContent=name; $("user-role").textContent=role; }
function setAdminVisible(v){
  if (menuAdmin) menuAdmin.style.display = v ? "" : "none";
  adminContent.style.display = v ? "" : "none";
  if (v) renderAdminPanel();
}

// ==== Auth state ====
onAuthStateChanged(auth, async (user)=>{
  if (!user){
    setHeader("Invitado","Invitado");
    setAdminVisible(false);
    $("btn-logout").style.display="none";
    return;
  }
  try{
    const data = await ensureUserDocAndRole(user);
    const role = data.role==="admin" ? "Admin" : "Usuario";
    setHeader(user.displayName || (user.email?user.email.split("@")[0]:"Usuario"), role);
    $("btn-logout").style.display="";
    setAdminVisible(data.role==="admin");
  }catch(err){
    console.error(err);
    alert("Error cargando perfil: "+err.message);
  }
});

// ==== Botón logout global si existe ====
$("btn-logout")?.addEventListener("click", ()=>signOut(auth));
