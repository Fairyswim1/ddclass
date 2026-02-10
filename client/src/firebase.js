import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyAg5m6knxZzeMMsW3sddl0yrZADgPx8jhg",
    authDomain: "ddclass-c4dff.firebaseapp.com",
    projectId: "ddclass-c4dff",
    storageBucket: "ddclass-c4dff.firebasestorage.app",
    messagingSenderId: "437919090699",
    appId: "1:437919090699:web:9548f09efb0de2ef285f0e",
    measurementId: "G-NQQHB9HVYQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, googleProvider, db };
