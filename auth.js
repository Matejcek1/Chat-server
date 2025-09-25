// auth.js
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import { auth, db, imgbbApiKey } from "./firebase.js";

// DOM elementi
const loginContainer = document.getElementById("login-container");
const registerContainer = document.getElementById("register-container");
const chatContainer = document.getElementById("chat-container");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");

// 🔄 Preklop
window.showRegister = () => {
  loginContainer.classList.add("hidden");
  registerContainer.classList.remove("hidden");
};
window.showLogin = () => {
  registerContainer.classList.add("hidden");
  loginContainer.classList.remove("hidden");
};

// 🔑 Prijava
window.login = () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  signInWithEmailAndPassword(auth, email, password)
    .catch(err => loginError.textContent = err.message);
};

// 🆕 Registracija
window.register = async () => {
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const username = document.getElementById("register-username").value.trim();

  if (!email || !password || !username) {
    registerError.textContent = "Izpolni vsa polja.";
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCred.user, { displayName: username });

    await set(ref(db, "users/" + userCred.user.uid), {
      username,
      email
    });

    registerError.textContent = "";
  } catch (err) {
    registerError.textContent = err.message;
  }
};

// 🚪 Odjava
window.logout = () => {
  signOut(auth).then(() => location.reload());
};

// 🔐 Avtentikacija
onAuthStateChanged(auth, user => {
  if (user) {
    loginContainer.classList.add("hidden");
    registerContainer.classList.add("hidden");
    chatContainer.classList.remove("hidden");
  } else {
    chatContainer.classList.add("hidden");
    loginContainer.classList.remove("hidden");
  }
});
