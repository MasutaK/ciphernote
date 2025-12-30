// ========== THEME ==========
const themeToggle = document.getElementById("themeToggle");
const html = document.documentElement;

const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  html.setAttribute("data-theme", savedTheme);
}

themeToggle.addEventListener("click", () => {
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

// ========== CRYPTO ==========
async function encrypt(text, password) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );

  return btoa(JSON.stringify({
    iv: Array.from(iv),
    salt: Array.from(salt),
    data: Array.from(new Uint8Array(encrypted))
  }));
}

async function decrypt(payload, password) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const obj = JSON.parse(atob(payload));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new Uint8Array(obj.salt), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(obj.iv) },
    key,
    new Uint8Array(obj.data)
  );

  return dec.decode(decrypted);
}

// ========== UI ==========
const markdownInput = document.getElementById("markdownInput");
const passwordInput = document.getElementById("passwordInput");
const generateLink = document.getElementById("generateLink");
const shareLink = document.getElementById("shareLink");

const viewerSection = document.getElementById("viewerSection");
const editorSection = document.getElementById("editorSection");
const output = document.getElementById("markdownOutput");

// Generate link
generateLink.addEventListener("click", async () => {
  if (!markdownInput.value || !passwordInput.value) {
    alert("Markdown et mot de passe requis.");
    return;
  }

  const encrypted = await encrypt(markdownInput.value, passwordInput.value);
  const url = `${location.origin}${location.pathname}#${encrypted}`;
  shareLink.value = url;
});

// Load from URL
(async function () {
  if (!location.hash) return;

  editorSection.hidden = true;
  viewerSection.hidden = false;

  const password = prompt("Password to decrypt the note: ");
  if (!password) return;

  try {
    const decrypted = await decrypt(location.hash.substring(1), password);
    output.innerHTML = marked.parse(decrypted);
  } catch {
    output.textContent = "❌ Unable to decrypt the note.";
  }
})();
