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

// 🔐 imgbb API ključ
const imgbbApiKey = "de307ee4497c9bbf8fbd4baf653662fa";

// 🔧 Firebase konfiguracija
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

// 📦 DOM elementi
const loginContainer = document.getElementById("login-container");
const registerContainer = document.getElementById("register-container");
const chatContainer = document.getElementById("chat-container");
const chatBox = document.getElementById("chat-box");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");
const messageInput = document.getElementById("message");
const imageInput = document.getElementById("image-upload");

// 🧑‍💻 Preklop prijava/registracija
window.showRegister = function () {
  loginContainer.classList.add("hidden");
  registerContainer.classList.remove("hidden");
  chatContainer.classList.add("hidden");
  loginError.textContent = "";
  registerError.textContent = "";
};

window.showLogin = function () {
  registerContainer.classList.add("hidden");
  loginContainer.classList.remove("hidden");
  chatContainer.classList.add("hidden");
  loginError.textContent = "";
  registerError.textContent = "";
};

// 🔐 Prijava
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

// 🆕 Registracija
window.register = async function () {
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const username = document.getElementById("register-username").value.trim();
  registerError.textContent = "";

  if (!email || !password || password.length < 6 || !username) {
    registerError.textContent = "Vnesi vse podatke in vsaj 6 znakov gesla.";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: username });
    await set(ref(db, "users/" + userCredential.user.uid), {
      username: username
    });
    registerError.textContent = "";
  } catch (err) {
    registerError.textContent = err.message;
  }
};

// 🔓 Odjava
window.logout = function () {
  signOut(auth)
    .then(() => {
      window.location.href = "index.html";
    })
    .catch(error => console.error("Napaka pri odjavi:", error));
};

// 📨 Pošiljanje sporočila (tekst + slika)
window.sendMessage = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const username = user.displayName || user.email.split("@")[0];
  const messageText = messageInput.value.trim();
  const imageFile = imageInput.files[0];

  if (!messageText && !imageFile) return;

  // Skripta za /clearchat ukaz
  if (messageText === "/clearchat" && username.toLowerCase() === "dajvic") {
    clearChat();
    messageInput.value = "";
    imageInput.value = "";
    return;
  }

  let imageUrl = null;

  if (imageFile) {
    if (imageFile.size > 5 * 1024 * 1024) {
      alert("⚠️ Slika je prevelika (max 5 MB).");
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      imageUrl = result.data.url;
    } catch (err) {
      console.error("Napaka pri nalaganju slike:", err);
      alert("❌ Slike ni bilo mogoče naložiti.");
      return;
    }
  }

  await push(ref(db, "messages"), {
    username,
    message: messageText || null,
    imageUrl: imageUrl || null,
    timestamp: Date.now()
  });

  messageInput.value = "";
  imageInput.value = "";
};

// 🧹 Brisanje vseh sporočil
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

// 🕒 Format časa
function formatTimestamp(ts) {
  const date = new Date(ts);
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// 🔔 Poslušanje sporočil
function listenForMessages() {
  off(ref(db, "messages"));
  chatBox.innerHTML = "";

  const messagesRef = ref(db, "messages");
  onChildAdded(messagesRef, data => {
    const { username, message, timestamp, imageUrl } = data.val();
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

    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = "Slika";
      img.style.maxWidth = "100%";
      img.style.marginTop = "8px";
      img.style.borderRadius = "10px";
      msgDiv.appendChild(img);
    } else if (message) {
      const textDiv = document.createElement("div");
      textDiv.textContent = message;
      msgDiv.appendChild(textDiv);
    }

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// 🔁 Uporabnik se prijavi / odjavi
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

// ⌨️ Enter = pošlji
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
