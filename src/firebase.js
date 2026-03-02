// Import Firebase core
import { initializeApp } from "firebase/app";

// 🔥 Import Firestore
import { getFirestore } from "firebase/firestore";

// 🔥 Import Authentication (optional but recommended)
import { getAuth } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAiN5VyUnqxRzedlMZbthqEASSU0TNBG0M",
  authDomain: "ecofy-732f2.firebaseapp.com",
  projectId: "ecofy-732f2",
  storageBucket: "ecofy-732f2.firebasestorage.app",
  messagingSenderId: "929059068325",
  appId: "1:929059068325:web:988057e76dd281fec7704c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export Firestore
export const db = getFirestore(app);

// ✅ Export Auth (for login/register)
export const auth = getAuth(app);