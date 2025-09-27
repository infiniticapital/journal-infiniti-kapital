// main.js

// 1. CONFIGURACIÓN DE FIREBASE
// Esta parte ya la tenías bien
const firebaseConfig = {
    apiKey: "AIzaSyCUS-Bg9Z7i...", // Tu API Key
    authDomain: "journal-infiniti-kapital.firebaseapp.com",
    projectId: "journal-infiniti-kapital",
    storageBucket: "journal-infiniti-kapital.firebaseio.com",
    messagingSenderId: "78211615687",
    appId: "1:78211615687:web:82b05b3ad3dcd6c8e7e2",
    measurementId: "G-D0E8FPMLGQ"
};

// 2. INICIALIZACIÓN DE FIREBASE (Esta parte faltaba)
// Importa las funciones necesarias desde el SDK que instalaste
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Inicializa Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("Firebase conectado y listo!");


// 3. LÓGICA DEL JOURNAL (Esta parte también faltaba)
const entriesCollection = collection(db, 'entries');

// Se ejecuta cuando el HTML ha cargado completamente
window.addEventListener('DOMContentLoaded', async () => {
    console.log('Obteniendo entradas de la base de datos...');
    try {
        const querySnapshot = await getDocs(entriesCollection);
        
        if (querySnapshot.empty) {
            console.log("No se encontraron entradas en la base de datos.");
            return;
        }

        querySnapshot.forEach((doc) => {
            // Aquí va la lógica para mostrar cada entrada en tu página
            console.log(`Entrada encontrada: ${doc.id} => Título: ${doc.data().title}`);
        });

    } catch (error) {
        console.error("Error obteniendo las entradas: ", error);
    }
});