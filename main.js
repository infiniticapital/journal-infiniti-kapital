// main.js

// --- 1. CONFIGURACIÓN DE FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

// Tu configuración personal de Firebase (la que obtuviste de la consola)
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. LÓGICA DEL JOURNAL ---
// (Aquí es donde pondrás el resto de tu código para añadir, borrar y mostrar las entradas del diario, usando las funciones de Firestore)

console.log("Firebase conectado y listo!");

// Ejemplo: Función para obtener y mostrar las entradas cuando la página carga
const entriesCollection = collection(db, 'entries');

window.addEventListener('DOMContentLoaded', async (event) => {
    console.log('La página ha cargado. Obteniendo entradas...');
    const querySnapshot = await getDocs(entriesCollection);
    
    querySnapshot.forEach((doc) => {
        // Aquí pones tu lógica para mostrar cada entrada en la página
        // Por ejemplo, crear un elemento <div> y añadirlo a una lista
        console.log(`${doc.id} => ${doc.data().title}`); 
    });
});

// Aquí irían tus otras funciones: addEntry, deleteEntry, etc.