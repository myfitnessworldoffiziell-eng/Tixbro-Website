// Smart Authentication Redirect System
// Redirects users based on IP address history

import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Get user's IP address using external service
 * @returns {Promise<string>} User's IP address
 */
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error fetching IP:', error);
        // Fallback: check localStorage for returning user indicator
        return null;
    }
}

/**
 * Check if user with this IP exists in Firebase
 * @param {string} ip - User's IP address
 * @returns {Promise<boolean>} True if user exists, false otherwise
 */
async function checkUserExists(ip) {
    if (!ip) {
        // Fallback: check localStorage
        return localStorage.getItem('tixbro_returning_user') === 'true';
    }

    try {
        // Check in users collection
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('lastIP', '==', ip));
        const querySnapshot = await getDocs(q);

        return !querySnapshot.empty;
    } catch (error) {
        console.error('Error checking user existence:', error);
        // Fallback to localStorage
        return localStorage.getItem('tixbro_returning_user') === 'true';
    }
}

/**
 * Handle authentication redirect logic
 * - Returning users (known IP) → Sign In page
 * - New users → Register page
 */
export async function handleAuthRedirect() {
    const authButton = document.getElementById('authButton');

    if (!authButton) {
        console.warn('Auth button not found');
        return;
    }

    authButton.addEventListener('click', async (e) => {
        e.preventDefault();

        // Show loading state
        const originalText = authButton.innerHTML;
        authButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        authButton.style.pointerEvents = 'none';

        try {
            // Get user's IP address
            const userIP = await getUserIP();

            // Check if user exists
            const isReturningUser = await checkUserExists(userIP);

            // Redirect accordingly
            if (isReturningUser) {
                // Returning user → Sign In
                window.location.href = 'login.html?mode=signin';
            } else {
                // New user → Register
                window.location.href = 'login.html?mode=register';
            }
        } catch (error) {
            console.error('Auth redirect error:', error);

            // On error, default to showing both options (login.html)
            window.location.href = 'login.html';
        } finally {
            // Restore button state (in case redirect fails)
            setTimeout(() => {
                authButton.innerHTML = originalText;
                authButton.style.pointerEvents = 'auto';
            }, 500);
        }
    });
}

/**
 * Store user IP after successful registration
 * Call this function after user registers successfully
 * @param {string} userId - User ID from Firebase Auth
 */
export async function storeUserIP(userId) {
    try {
        const userIP = await getUserIP();

        if (userIP && userId) {
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const userRef = doc(db, 'users', userId);

            await updateDoc(userRef, {
                lastIP: userIP,
                lastLogin: new Date().toISOString()
            });

            // Set localStorage flag
            localStorage.setItem('tixbro_returning_user', 'true');
        }
    } catch (error) {
        console.error('Error storing user IP:', error);
    }
}

/**
 * Mark user as returning (alternative to IP tracking)
 * More privacy-friendly approach using localStorage
 */
export function markReturningUser() {
    localStorage.setItem('tixbro_returning_user', 'true');
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleAuthRedirect);
} else {
    handleAuthRedirect();
}
