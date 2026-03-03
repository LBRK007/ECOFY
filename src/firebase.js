// Import Firebase core
import { initializeApp } from "firebase/app";

// 🔥 Import Firestore
import { getFirestore } from "firebase/firestore";

// 🔥 Import Authentication (optional but recommended)
import { getAuth } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export Firestore
export const db = getFirestore(app);

// ✅ Export Auth (for login/register)
export const auth = getAuth(app);