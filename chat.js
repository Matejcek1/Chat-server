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
  remove,
  get
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

// 🔌 Inicijalizacija
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
const profilePicInput = document.getElementById("register-profile-pic");
const navProfilePic = document.getElementById("nav-profile-pic");

// 🔁 Preklop prijava/registracija
window.showRegister = () => {
  loginContainer.classList.add("hidden");
  registerContainer.classList.remove("hidden");
  chatContainer.classList.add("hidden");
  loginError.textContent = "";
  registerError.textContent = "";
};

window.showLogin = () => {
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

// 🆕 Registracija z nalaganjem profilne slike
window.register = async function () {
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const username = document.getElementById("register-username").value.trim();
  const profilePicFile = profilePicInput.files[0];
  registerError.textContent = "";

  if (!email || !password || !username || password.length < 6) {
    registerError.textContent = "Vnesi vse podatke in vsaj 6 znakov gesla.";
    return;
  }

  let profilePicUrl = "default-profile.png"; // privzeta slika

  // Če je izbrana slika, jo naloži na imgbb
  if (profilePicFile) {
    if (profilePicFile.size > 5 * 1024 * 1024) {
      registerError.textContent = "Profilna slika je prevelika (max 5 MB).";
      return;
    }

    const formData = new FormData();
    formData.append("image", profilePicFile);

    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: "POST",
        body: formData
      });

      const result = await res.json();
      profilePicUrl = result.data.url;
    } catch (err) {
      registerError.textContent = "Napaka pri nalaganju slike.";
      return;
    }
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;

    await updateProfile(user, {
      displayName: username,
      photoURL: profilePicUrl
    });

    await set(ref(db, "users/" + user.uid), {
      username,
      profilePic: profilePicUrl
    });

    registerError.textContent = "";
  } catch (err) {
    registerError.textContent = err.message;
  }
};

// 🔓 Odjava
window.logout = function () {
  signOut(auth)
    .then(() => location.href = "index.html")
    .catch(console.error);
};

// 📩 Pošiljanje sporočila (tekst + slika)
window.sendMessage = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const username = user.displayName || user.email.split("@")[0];
  const messageText = messageInput.value.trim();
  const imageFile = imageInput.files[0];

  if (!messageText && !imageFile) return;

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
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: "POST",
        body: formData
      });

      const result = await res.json();
      imageUrl = result.data.url;
    } catch (err) {
      alert("❌ Napaka pri nalaganju slike.");
      return;
    }
  }

  await push(ref(db, "messages"), {
    username,
    message: messageText || null,
    imageUrl: imageUrl || null,
    timestamp: Date.now(),
    uid: user.uid
  });

  messageInput.value = "";
  imageInput.value = "";
};

// 🧹 /clearchat
window.clearChat = function () {
  const messagesRef = ref(db, "messages");
  remove(messagesRef)
    .then(() => {
      chatBox.innerHTML = "<div style='text-align:center; color:orange;'>Chat je bil izbrisan.</div>";
    })
    .catch(console.error);
};

// ⏱️ Format časa
function formatTimestamp(ts) {
  const date = new Date(ts);
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// 🔔 Poslušaj nova sporočila
function listenForMessages() {
  off(ref(db, "messages"));
  chatBox.innerHTML = "";

  const messagesRef = ref(db, "messages");
  onChildAdded(messagesRef, async data => {
    const { username, message, imageUrl, timestamp, uid } = data.val();

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");

    const userSnapshot = await get(ref(db, "users/" + uid));
    const userData = userSnapshot.exists() ? userSnapshot.val() : {};
    const profilePicUrl = userData.profilePic || "default-profile.png";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "10px";
    header.style.marginBottom = "4px";

    const img = document.createElement("img");
    img.src = profilePicUrl;
    img.alt = "pfp";
    img.style.width = "32px";
    img.style.height = "32px";
    img.style.borderRadius = "50%";
    img.style.objectFit = "cover";

    const name = document.createElement("strong");
    name.textContent = username;

    const time = document.createElement("span");
    time.textContent = " • " + formatTimestamp(timestamp);
    time.style.fontSize = "0.85rem";
    time.style.color = "#ccc";

    header.appendChild(img);
    header.appendChild(name);
    header.appendChild(time);

    msgDiv.appendChild(header);

    if (message) {
      const text = document.createElement("div");
      text.textContent = message;
      msgDiv.appendChild(text);
    }

    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "slika";
      image.style.maxWidth = "100%";
      image.style.borderRadius = "10px";
      image.style.marginTop = "6px";
      msgDiv.appendChild(image);
    }

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// 🔁 Avtentikacija
onAuthStateChanged(auth, async user => {
  document.body.classList.remove("loading");

  if (user) {
    loginContainer.classList.add("hidden");
    registerContainer.classList.add("hidden");
    chatContainer.classList.remove("hidden");

    // Prikaži profilno v navigaciji
    if (navProfilePic && user.photoURL) {
      navProfilePic.src = user.photoURL;
    }

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
