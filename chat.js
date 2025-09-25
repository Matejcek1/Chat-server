// chat.js
import { ref, push, onChildAdded, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import { auth, db, imgbbApiKey } from "./firebase.js";

// DOM elementi
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");
const imageUpload = document.getElementById("image-upload");

// ========================
// /komande sistem
// ========================
let commands = {
  "/help": "Na voljo so ukazi: /help, /ping, /clear, /clearchat, /add, /time, /date, /about, /joke",
  "/ping": "Pong! 🏓",
  "/clear": "Sporočila so bila počistena (lokalno).",
  "/clearchat": "Vsa sporočila so bila izbrisana iz baze.",
  "/about": "To je community klepet, narejen z Firebase 🔥"
};

// 🔄 Naloži custom komande iz Firebase
const commandsRef = ref(db, "commands");
onValue(commandsRef, snap => {
  const data = snap.val();
  if (data) {
    commands = { ...commands, ...data };
  }
});

// Pošlji sistemsko sporočilo v Firebase
async function sendSystemMessage(msg) {
  const msgRef = ref(db, "messages");
  await push(msgRef, {
    uid: "SYSTEM",
    username: "🛠 Sistem",
    photoURL: "default.png",
    text: msg,
    time: Date.now()
  });
}

// ========================
// Rank sistem po UID
// ========================
const ranks = {
  "6cj4FBOSY5dG3xq9LPw73JigLsj2": { label: "⭐ Owner", color: "gold" },
  "UID_ADMIN": { label: "🛡️ Admin", color: "red" },
  "UID_MOD": { label: "🔧 Mod", color: "blue" }
};

// ========================
// Funkcija za obdelavo ukazov
// ========================
async function handleCommand(input) {
  if (input.startsWith("/add ")) {
    const parts = input.split(" ");
    if (parts.length >= 3) {
      const cmd = parts[1];
      const descMatch = input.match(/"(.*?)"/);
      const desc = descMatch ? descMatch[1] : null;

      if (cmd && desc) {
        await set(ref(db, "commands/" + cmd), desc);
        await sendSystemMessage(`Nov ukaz ${cmd} dodan: ${desc}`);
      } else {
        await sendSystemMessage("Uporaba: /add /ukaz \"opis ukaza\"");
      }
    } else {
      await sendSystemMessage("Uporaba: /add /ukaz \"opis ukaza\"");
    }
    return true;
  }

  if (input === "/clear") {
    chatBox.innerHTML = "";
    await sendSystemMessage(commands[input]);
    return true;
  }

  if (input === "/clearchat") {
    // 🔒 samo Owner lahko izbriše globalni chat
    if (auth.currentUser.uid === "6cj4FBOSY5dG3xq9LPw73JigLsj2") {
      await set(ref(db, "messages"), null); // pobriše vse v bazi
      await sendSystemMessage("⭐ Owner je počistil ves klepet za vse.");
    } else {
      await sendSystemMessage("⛔ Nimaš dovoljenja za uporabo /clearchat");
    }
    return true;
  }

  if (input === "/time") {
    const now = new Date();
    await sendSystemMessage("Trenutni čas je: " + now.toLocaleTimeString());
    return true;
  }

  if (input === "/date") {
    const now = new Date();
    await sendSystemMessage("Današnji datum je: " + now.toLocaleDateString());
    return true;
  }

  if (input === "/joke") {
    const jokes = [
      "Zakaj računalnik nikoli ne laže? Ker ima vedno resnične bite. 💾",
      "Programerji sovražijo naravo... preveč bugov 🐞",
      "Kaj reče HTML element drugemu? 'Brez tebe sem brez stila.' 🎨"
    ];
    const random = jokes[Math.floor(Math.random() * jokes.length)];
    await sendSystemMessage(random);
    return true;
  }

  if (commands[input]) {
    await sendSystemMessage(commands[input]);
    return true;
  }

  return false;
}

// 📩 Pošiljanje sporočila
window.sendMessage = async () => {
  const text = messageInput.value.trim();
  if (!text) return;

  if (await handleCommand(text)) {
    messageInput.value = "";
    return;
  }

  const msgRef = ref(db, "messages");
  await push(msgRef, {
    uid: auth.currentUser.uid,
    username: auth.currentUser.displayName || "Anonimnež",
    photoURL: auth.currentUser.photoURL || "default.png", // 🔹 shrani profilko
    text,
    time: Date.now()
  });

  messageInput.value = "";
};

// ⬆️ Naloži sliko
imageUpload.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
    method: "POST",
    body: formData
  });
  const data = await res.json();

  const msgRef = ref(db, "messages");
  await push(msgRef, {
    uid: auth.currentUser.uid,
    username: auth.currentUser.displayName || "Anonimnež",
    photoURL: auth.currentUser.photoURL || "default.png",
    image: data.data.url,
    time: Date.now()
  });
});

// 📡 Prikaz sporočil (profilka vedno levo)
const msgRef = ref(db, "messages");
onChildAdded(msgRef, snap => {
  const msg = snap.val();

  const wrapper = document.createElement("div");
  wrapper.classList.add("chat-message");

  // Profilna slika vedno levo
  const avatar = document.createElement("img");
  avatar.src = msg.photoURL || "default.png";
  avatar.classList.add("chat-avatar");

  // Vsebina
  const content = document.createElement("div");
  content.classList.add("chat-content");

  // Ranki po UID
  let username = msg.username;
  if (ranks[msg.uid]) {
    const { label, color } = ranks[msg.uid];
    username = `<span style="color: ${color}; font-weight: bold;">${msg.username} ${label}</span>`;
  }

  if (msg.text) {
    content.innerHTML = `${username}: ${msg.text}`;
  }
  if (msg.image) {
    content.innerHTML = `<b>${username}:</b><br><img src="${msg.image}" class="chat-image" onclick="openImage(this.src)">`;
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(content);

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// ↩️ Enter = pošlji
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    window.sendMessage();
  }
});
