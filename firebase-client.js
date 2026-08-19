import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAr6RQOZIOzeT-1sZW0fQHHUXUjKl-fGFs",
  authDomain: "pirulin-app.firebaseapp.com",
  projectId: "pirulin-app",
  storageBucket: "pirulin-app.firebasestorage.app",
  messagingSenderId: "812688280796",
  appId: "1:812688280796:web:5f04e6cb9212c54d7d3819"
};

const ALLOWED_USERS = new Map([
  ["mateofoulkes@gmail.com", "Mateo"],
  ["danifernandez.sn@gmail.com", "Dani"]
]);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const state = {
  app,
  auth,
  db,
  user: null,
  person: null,
  ready: false
};

window.PirulinFirebase = state;

function loginElements() {
  return {
    login: document.getElementById("login"),
    button: document.getElementById("googleLogin")
  };
}

function ensureStatusNode() {
  const { button } = loginElements();
  if (!button) return null;
  let node = document.getElementById("firebaseLoginStatus");
  if (!node) {
    node = document.createElement("div");
    node.id = "firebaseLoginStatus";
    node.style.cssText = "margin-top:12px;font:700 12px/1.35 Nunito,system-ui,sans-serif;color:#747b88;text-align:center;min-height:16px";
    button.insertAdjacentElement("afterend", node);
  }
  return node;
}

function setLoginStatus(message, isError = false) {
  const node = ensureStatusNode();
  if (!node) return;
  node.textContent = message || "";
  node.style.color = isError ? "#e84f58" : "#747b88";
}

function setMockCurrentUser(person) {
  if (!person) return;
  try {
    // The approved v51 mockup keeps currentUser in its classic-script global lexical scope.
    // We only ever inject one of the two hard-coded allowed display names.
    window.eval(`currentUser=${JSON.stringify(person)}; if(typeof updateUserUI==='function') updateUserUI();`);
  } catch (error) {
    console.warn("Pirulín: no pude sincronizar currentUser del mockup todavía", error);
  }
}

function showApp(user, person) {
  const { login } = loginElements();
  if (login) login.classList.add("hidden");
  state.user = user;
  state.person = person;
  state.ready = true;
  setMockCurrentUser(person);
  window.dispatchEvent(new CustomEvent("pirulin-auth-changed", {
    detail: { signedIn: true, uid: user.uid, email: user.email, person }
  }));
}

function showLogin(message = "") {
  const { login } = loginElements();
  if (login) login.classList.remove("hidden");
  state.user = null;
  state.person = null;
  state.ready = true;
  if (message) setLoginStatus(message, true);
  window.dispatchEvent(new CustomEvent("pirulin-auth-changed", {
    detail: { signedIn: false }
  }));
}

async function validateUser(user) {
  const email = (user?.email || "").toLowerCase();
  const person = ALLOWED_USERS.get(email);
  if (!person) {
    await signOut(auth);
    throw new Error("Esta cuenta no tiene acceso a Pirulín.");
  }
  return person;
}

async function doGoogleLogin() {
  const { button } = loginElements();
  if (button) button.disabled = true;
  setLoginStatus("Abriendo Google…");
  try {
    const result = await signInWithPopup(auth, provider);
    const person = await validateUser(result.user);
    setLoginStatus("");
    showApp(result.user, person);
  } catch (error) {
    console.error("Pirulín Google Sign-In", error);
    const code = error?.code || "";
    if (code === "auth/popup-closed-by-user") {
      setLoginStatus("Inicio de sesión cancelado.");
    } else if (code === "auth/popup-blocked") {
      setLoginStatus("Chrome bloqueó la ventana de Google. Permití pop-ups para Pirulín.", true);
    } else if (code === "auth/unauthorized-domain") {
      setLoginStatus("Falta autorizar este dominio en Firebase Authentication.", true);
    } else {
      setLoginStatus(error?.message || "No pude iniciar sesión con Google.", true);
    }
  } finally {
    if (button) button.disabled = false;
  }
}

function installLoginHook() {
  const { button } = loginElements();
  if (!button || button.dataset.firebaseHooked === "1") return;
  button.dataset.firebaseHooked = "1";

  // Capture phase prevents the mockup's simulated login handler from firing.
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    doGoogleLogin();
  }, true);

  document.querySelectorAll(".mock-note").forEach(node => node.remove());
}

function bootWhenMockupReady() {
  if (document.getElementById("googleLogin")) {
    installLoginHook();
    return;
  }
  const observer = new MutationObserver(() => {
    if (document.getElementById("googleLogin")) {
      observer.disconnect();
      installLoginHook();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

bootWhenMockupReady();

onAuthStateChanged(auth, async user => {
  if (!user) {
    showLogin();
    return;
  }
  try {
    const person = await validateUser(user);
    showApp(user, person);
  } catch (error) {
    console.warn(error);
    showLogin(error.message);
  }
});
