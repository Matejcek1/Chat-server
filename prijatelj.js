import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, remove, update, push } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDi0cyCHR3zKZVRvcr9HAysD2hMxrveaPE",
  authDomain: "chat-server-6a818.firebaseapp.com",
  databaseURL: "https://chat-server-6a818-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "chat-server-6a818",
  storageBucket: "chat-server-6a818.appspot.com",
  messagingSenderId: "26169957151",
  appId: "1:26169957151:web:78adf687a38d764732ae2a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const searchInfo = document.getElementById("search-info");
const friendRequests = document.getElementById("friend-requests");
const friendList = document.getElementById("friend-list");

let currentUser = null;

// Helper: escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Check the current user status
onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "index.html";
    return;
  }
  currentUser = user;
  document.body.classList.remove("loading");
  loadFriendRequests();
  loadFriends();
});

// Function to search for users based on the input
window.searchUsers = async function () {
  const term = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";
  searchInfo.textContent = "";

  if (!term) {
    searchInfo.textContent = "⚠️ Vnesi uporabniško ime.";
    return;
  }

  try {
    const snapshot = await get(ref(db, "users"));
    const users = snapshot.val();
    let count = 0;

    for (const uid in users) {
      const u = users[uid];
      if (
        uid !== currentUser.uid &&
        u.username &&
        u.username.toLowerCase().includes(term)
      ) {
        const li = document.createElement("li");
        li.innerHTML = `<span>${escapeHtml(u.username)}</span>`;
        const btn = document.createElement("button");
        btn.classList.add("btn");
        btn.textContent = "➕ Pošlji prošnjo";
        btn.onclick = () => sendRequest(uid, u.username);
        li.appendChild(btn);
        searchResults.appendChild(li);
        count++;
      }
    }

    searchInfo.textContent = count > 0 ? `Najdeno: ${count}` : "Uporabnik ne obstaja";
    if (count === 0) {
      searchResults.innerHTML = "<li>🔍 Ni najdenih uporabnikov.</li>";
    }
  } catch (error) {
    console.error(error);
    searchInfo.textContent = "❌ Napaka pri iskanju.";
  }
};

// Function to send a friend request
async function sendRequest(toUid, username) {
  const myUid = currentUser.uid;
  if (toUid === myUid) return;
  try {
    await set(ref(db, `friend_requests/${toUid}/${myUid}`), true);
    alert(`✅ Prošnja poslana uporabniku ${username}`);
  } catch (err) {
    alert("❌ Napaka pri pošiljanju prošnje.");
  }
}

// Function to load friend requests
function loadFriendRequests() {
  const myUid = currentUser.uid;
  onValue(ref(db, `friend_requests/${myUid}`), async snapshot => {
    friendRequests.innerHTML = "";
    const requests = snapshot.val();
    if (!requests) {
      friendRequests.innerHTML = "<li>Ni prošenj.</li>";
      return;
    }
    const usersSnap = await get(ref(db, "users"));
    const users = usersSnap.val() || {};
    for (const fromUid in requests) {
      const username = users[fromUid]?.username || fromUid;
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(username)}</span>`;
      const actions = document.createElement("div");
      actions.classList.add("action-row");

      const acceptBtn = document.createElement("button");
      acceptBtn.classList.add("btn");
      acceptBtn.textContent = "✔ Sprejmi";
      acceptBtn.onclick = () => acceptRequest(fromUid);

      const rejectBtn = document.createElement("button");
      rejectBtn.classList.add("btn", "red");
      rejectBtn.textContent = "✖ Zavrni";
      rejectBtn.onclick = () => rejectRequest(fromUid);

      actions.appendChild(acceptBtn);
      actions.appendChild(rejectBtn);
      li.appendChild(actions);
      friendRequests.appendChild(li);
    }
  });
}

// Function to accept a friend request
async function acceptRequest(fromUid) {
  const myUid = currentUser.uid;
  const updates = {
    [`friends/${myUid}/${fromUid}`]: true,
    [`friends/${fromUid}/${myUid}`]: true,
    [`friend_requests/${myUid}/${fromUid}`]: null
  };
  try {
    await update(ref(db), updates);
    alert("✅ Prošnja potrjena");
  } catch (err) {
    alert("❌ Napaka pri potrjevanju prošnje.");
  }
}

// Function to reject a friend request
async function rejectRequest(fromUid) {
  const myUid = currentUser.uid;
  try {
    await remove(ref(db, `friend_requests/${myUid}/${fromUid}`));
    alert("❌ Prošnja zavrnjena");
  } catch (err) {
    alert("❌ Napaka pri zavrnitvi prošnje.");
  }
}

// Function to load the list of friends
function loadFriends() {
  const myUid = currentUser.uid;
  onValue(ref(db, `friends/${myUid}`), async snapshot => {
    friendList.innerHTML = "";
    const data = snapshot.val();
    if (!data) {
      friendList.innerHTML = "<li>Ni prijateljev.</li>";
      return;
    }
    const allUsersSnap = await get(ref(db, "users"));
    const allUsers = allUsersSnap.val() || {};
    for (const uid in data) {
      const name = allUsers[uid]?.username || uid;
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(name)}</span>`;

      const messageContainer = document.createElement("div");
      messageContainer.classList.add("message-input");
      const msgInput = document.createElement("input");
      msgInput.placeholder = "💬 Sporočilo...";
      msgInput.type = "text";
      const sendBtn = document.createElement("button");
      sendBtn.classList.add("btn");
      sendBtn.textContent = "Pošlji";
      sendBtn.onclick = () => {
        sendMessage(uid, msgInput.value);
        msgInput.value = "";
      };
      messageContainer.appendChild(msgInput);
      messageContainer.appendChild(sendBtn);

      const removeBtn = document.createElement("button");
      removeBtn.classList.add("btn", "red");
      removeBtn.textContent = "🗑 Odstrani";
      removeBtn.onclick = () => removeFriend(uid, name);

      const actions = document.createElement("div");
      actions.classList.add("action-row");
      actions.appendChild(messageContainer);
      actions.appendChild(removeBtn);

      li.appendChild(actions);
      friendList.appendChild(li);
    }
  });
}

// Function to remove a friend
async function removeFriend(friendUid, username) {
  const myUid = currentUser.uid;
  const confirmation = confirm(`Ali res želiš odstraniti prijatelja "${username}"?`);
  if (!confirmation) return;
  const updates = {
    [`friends/${myUid}/${friendUid}`]: null,
    [`friends/${friendUid}/${myUid}`]: null
  };
  try {
    await update(ref(db), updates);
    alert(`🗑 Uporabnik "${username}" odstranjen iz prijateljev.`);
  } catch (err) {
    alert("❌ Napaka pri odstranjevanju prijatelja.");
  }
}

// Function to send a message to a friend
async function sendMessage(toUid, message) {
  if (!message.trim()) return;
  try {
    const msgRef = ref(db, `messages/${currentUser.uid}/${toUid}`);
    await push(msgRef, {
      text: message,
      timestamp: Date.now()
    });
    alert("💬 Sporočilo poslano!");
  } catch (err) {
    alert("❌ Napaka pri pošiljanju sporočila.");
  }
}