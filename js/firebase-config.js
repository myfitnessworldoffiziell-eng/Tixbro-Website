// Firebase Configuration for Tixbro
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDAjxpovu7BKkTAfib5DHpZpBX4IWarMu8",
    authDomain: "tixbro-411bd.firebaseapp.com",
    projectId: "tixbro-411bd",
    storageBucket: "tixbro-411bd.firebasestorage.app",
    messagingSenderId: "282722622154",
    appId: "1:282722622154:web:37084f55a365de04283233"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
