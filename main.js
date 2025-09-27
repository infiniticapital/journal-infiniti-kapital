// main.js

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCuS-0g97JluGH6FTF5JBmwaW7d5aJ3WWw",
  authDomain: "journal-infiniti-kapital.firebaseapp.com",
  projectId: "journal-infiniti-kapital",
  storageBucket: "journal-infiniti-kapital.firebasestorage.app",
  messagingSenderId: "78211615687",
  appId: "1:78211615687:web:02b05ba83acd46c8c6e7e2",
  measurementId: "G-D0ERFPMLGQ"
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