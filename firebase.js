// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

// 🔑 Tvoj Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDi0cyCHR3zKZVRvcr9HAysD2hMxrveaPE",
  authDomain: "chat-server-6a818.firebaseapp.com",
  projectId: "chat-server-6a818",
  storageBucket: "chat-server-6a818.appspot.com",
  messagingSenderId: "26169957151",
  appId: "1:26169957151:web:78adf687a38d764732ae2a",
  databaseURL: "https://chat-server-6a818-default-rtdb.europe-west1.firebasedatabase.app"
};

// 🚀 Inicializacija Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// imgbb API ključ (za slike)
export const imgbbApiKey = "de307ee4497c9bbf8fbd4baf653662fa";
