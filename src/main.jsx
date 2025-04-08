import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_iRbWfZltl26EGPtA6vOt_BdurUE5b_M",
  authDomain: "queue-d0180.firebaseapp.com",
  projectId: "queue-d0180",
  storageBucket: "queue-d0180.firebasestorage.app",
  messagingSenderId: "58702351087",
  appId: "1:58702351087:web:27d35f0af2b47b0698a91a",
  measurementId: "G-70HZWEXT73"
};

// Initialize Firebase
try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
