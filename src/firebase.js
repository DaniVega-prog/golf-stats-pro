import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBwO2lKSqOWa2rfXd7WQcCSBPVJflimen8",
  authDomain: "golf-stats-pro.firebaseapp.com",
  projectId: "golf-stats-pro",
  storageBucket: "golf-stats-pro.firebasestorage.app",
  messagingSenderId: "454452456568",
  appId: "1:454452456568:web:9f5d257a47d7262aa8518d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
