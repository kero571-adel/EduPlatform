// /lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// القيم مباشرة (Hardcoded) - مؤقتاً لحد ما نضبط الـ .env.local
const firebaseConfig = {
  apiKey: "AIzaSyCMGtMppsoppcrUNv7Y98A9H4NztWWTUyE",
  authDomain: "teacherdashboard-c9be8.firebaseapp.com",
  projectId: "teacherdashboard-c9be8",
  storageBucket: "teacherdashboard-c9be8.firebasestorage.app",
  messagingSenderId: "353096482799",
  appId: "1:353096482799:web:6c398cbe39801552e0801a",
};

// Initialize Firebase - بطريقة آمنة
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth persistence
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence)
    .then(() => console.log("✅ Auth persistence configured: LOCAL"))
    .catch((error) => console.error("❌ Error:", error.code, error.message));
}

// Helpers
export const isFirebaseInitialized = () => !!app?.name;
export const getFirebaseEnv = () => ({
  projectId: firebaseConfig.projectId,
  isProduction: process.env.NODE_ENV === "production",
  initialized: isFirebaseInitialized(),
});
export async function configureAuthPersistence() {
  if (typeof window !== "undefined") {
    try {
      await setPersistence(auth, browserLocalPersistence);
      console.log("✅ Auth persistence configured: LOCAL");
    } catch (error) {
      console.error("❌ Persistence error:", error.code, error.message);
    }
  }
}
export { app };
