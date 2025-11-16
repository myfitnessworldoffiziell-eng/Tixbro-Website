// Authentication Logic for Tixbro
import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Register new company
export async function registerCompany(email, password, companyData) {
    try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Store company data in Firestore
        await setDoc(doc(db, "companies", user.uid), {
            companyName: companyData.companyName,
            contactPerson: companyData.contactPerson,
            phone: companyData.phone,
            email: email,
            address: companyData.address,
            createdAt: new Date().toISOString(),
            accountType: 'company',
            verified: false,
            totalRevenue: 0,
            totalTicketsSold: 0
        });

        return { success: true, userId: user.uid };
    } catch (error) {
        console.error("Registration error:", error);
        return { success: false, error: error.message };
    }
}

// Login company
export async function loginCompany(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get company data
        const companyDoc = await getDoc(doc(db, "companies", user.uid));

        if (!companyDoc.exists()) {
            throw new Error("Company profile not found");
        }

        return {
            success: true,
            userId: user.uid,
            companyData: companyDoc.data()
        };
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: error.message };
    }
}

// Logout
export async function logout() {
    try {
        await signOut(auth);
        window.location.href = '/index.html';
        return { success: true };
    } catch (error) {
        console.error("Logout error:", error);
        return { success: false, error: error.message };
    }
}

// Check if user is logged in
export function checkAuth(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Get company data
            const companyDoc = await getDoc(doc(db, "companies", user.uid));
            if (companyDoc.exists()) {
                callback({
                    isLoggedIn: true,
                    userId: user.uid,
                    companyData: companyDoc.data()
                });
            } else {
                callback({ isLoggedIn: false });
            }
        } else {
            callback({ isLoggedIn: false });
        }
    });
}

// Get current user
export function getCurrentUser() {
    return auth.currentUser;
}
