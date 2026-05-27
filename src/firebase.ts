import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB6b-rpI1sfk36hD2y3uLJmD12hF-huZZ0",
  authDomain: "malies-8e5ce.firebaseapp.com",
  projectId: "malies-8e5ce",
  storageBucket: "malies-8e5ce.firebasestorage.app",
  messagingSenderId: "154236719414",
  appId: "1:154236719414:web:f5cee481f3429d69d7e397",
  measurementId: "G-PKLTWHFHLJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
