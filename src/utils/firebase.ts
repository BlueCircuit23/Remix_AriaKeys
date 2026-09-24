import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';

// Configuration from environment or safe defaults for AI Studio apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForAriaKeysAtelier99",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ariakeys-atelier.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ariakeys-atelier",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ariakeys-atelier.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.warn("Popup sign-in error, trying redirect...", error);
    try {
      await signInWithRedirect(auth, googleProvider);
      return null;
    } catch (redirectError) {
      console.error("Google sign-in failed:", redirectError);
      throw redirectError;
    }
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  }
}
