// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,  // <--- This was missing!
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCo2jynfrV7E0HDKj034MgMi3m8BsLpYk8",
    authDomain: "timenroll.firebaseapp.com",
    projectId: "timenroll",
    storageBucket: "timenroll.firebasestorage.app",
    messagingSenderId: "556199649948",
    appId: "1:556199649948:web:a53360f2eab0488581c359"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export database functions so other files can use them
export {
    db,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot, // <--- Exporting it here is critical
    writeBatch
};