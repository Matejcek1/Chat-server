import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onChildAdded,
  off,
  remove
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDi0cyCHR3zKZVRvcr9HAysD2hMxrveaPE",
  authDomain: "chat-server-6a818.firebaseapp.com",
  projectId: "chat-server-6a818",
  storageBucket: "chat-server-6a818.appspot.com",
  messagingSenderId: "26169957151",
  appId: "1:26169957151:web:78adf687a38d764732ae2a",
  measurementId: "G-6VHMVY0WDS",
  databaseURL: "https://chat-server-6a818-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const analytics = getAnalytics(app);

const loginContainer = document.getElementById("login-container");
const registerContainer = document.getElementById("register-container");
const chatContainer = document.getElementById("chat-container");
const chatBox = document.getElementById("chat-box");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");
const messageInput = document.getElementById("message");

// Prikaže register form
window.showRegister = function () {
  loginContainer.classList.add("hidden");
  registerContainer.classList.remove("hidden");
  chatContainer.classList.add("hidden");
  loginError.textContent = "";
  registerError.textContent = "";
};

// Prikaže login form
window.showLogin = function () {
  registerContainer.classList.add("hidden");
  loginContainer.classList.remove("hidden");
  chatContainer.classList.add("hidden");
  loginError.textContent = "";
  registerError.textContent = "";
};

// Prijava uporabnika
window.login = function () {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  loginError.textContent = "";

  if (!email || !password) {
    loginError.textContent = "Vnesi email in geslo.";
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .catch(err => loginError.textContent = err.message);
};

// ✅ Registracija uporabnika z zapisom v Realtime Database
window.register = async function () {
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const username = document.getElementById("register-username").value.trim();
  registerError.textContent = "";

  if (!email || !password || password.length < 6 || !username) {
    registerError.textContent = "Prosimo, vnesi email, geslo (vsaj 6 znakov) in uporabniško ime.";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: username });

    // ✅ Shrani uporabnika v bazo za iskanje/prijatelje
    await set(ref(db, "users/" + userCredential.user.uid), {
      username: username
    });

    registerError.textContent = "";
  } catch (err) {
    registerError.textContent = err.message;
  }
};

// Odjava z redirectom
window.logout = function () {
  signOut(auth)
    .then(() => {
      window.location.href = "index.html";
    })
    .catch(error => console.error("Napaka pri odjavi:", error));
};

// Pošlji sporočilo
window.sendMessage = function () {
  const message = messageInput.value.trim();
  const user = auth.currentUser;
  if (!message || !user) return;

  const username = user.displayName || user.email.split("@")[0];

  // Posebna ukazna za izbris
  if (message === "/clearchat" && username.toLowerCase() === "dajvic") {
    clearChat();
    messageInput.value = "";
    return;
  }

  push(ref(db, "messages"), {
    username,
    message,
    timestamp: Date.now()
  }).catch(error => {
    console.error("Napaka pri shranjevanju sporočila:", error);
  });

  messageInput.value = "";
};

// Izbriše celoten chat
window.clearChat = function () {
  const messagesRef = ref(db, "messages");
  remove(messagesRef)
    .then(() => {
      chatBox.innerHTML = "";
      const msg = document.createElement("div");
      msg.textContent = "Chat je bil izbrisan.";
      msg.style.color = "#faa61a";
      msg.style.textAlign = "center";
      chatBox.appendChild(msg);
    })
    .catch(console.error);
};

// Oblikovanje timestamp
function formatTimestamp(ts) {
  const date = new Date(ts);
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

let unsubscribeMessages = null;

// Poslušanje novih sporočil
function listenForMessages() {
  if (unsubscribeMessages) {
    off(ref(db, "messages"));
    unsubscribeMessages = null;
  }
  chatBox.innerHTML = "";

  const messagesRef = ref(db, "messages");
  onChildAdded(messagesRef, data => {
    const { username, message, timestamp } = data.val();
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");
    msgDiv.style.textAlign = "left";

    const isOwnerUser = username.toLowerCase() === "dajvic";
    const currentUser = auth.currentUser;
    const isMine = currentUser && currentUser.displayName === username;

    if (isOwnerUser || isMine) {
      msgDiv.classList.add("owner");
    }

    const headerDiv = document.createElement("div");
    headerDiv.classList.add("message-header");
    headerDiv.textContent = username;

    if (isOwnerUser) {
      const badge = document.createElement("span");
      badge.classList.add("owner-rank");
      badge.textContent = "OWNER";
      headerDiv.appendChild(badge);
    }

    if (isMine) {
      const ownerTag = document.createElement("span");
      ownerTag.textContent = "jaz";
      ownerTag.classList.add("owner-tag");
      headerDiv.appendChild(ownerTag);
    }

    const timeSpan = document.createElement("span");
    timeSpan.classList.add("timestamp");
    timeSpan.textContent = formatTimestamp(timestamp);
    headerDiv.appendChild(timeSpan);

    msgDiv.appendChild(headerDiv);

    const textDiv = document.createElement("div");
    textDiv.textContent = message;
    msgDiv.appendChild(textDiv);

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// Spremljanje avtentikacije
onAuthStateChanged(auth, user => {
  document.body.classList.remove("loading");

  if (user) {
    loginContainer.classList.add("hidden");
    registerContainer.classList.add("hidden");
    chatContainer.classList.remove("hidden");
    listenForMessages();
  } else {
    chatContainer.classList.add("hidden");
    loginContainer.classList.remove("hidden");
    registerContainer.classList.add("hidden");
  }
});

// Po Enter pošljemo sporočilo
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
