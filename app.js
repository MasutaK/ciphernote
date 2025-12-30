document.addEventListener("DOMContentLoaded", () => {
  // ==================== ELEMENTS DOM ====================
  const textarea = document.getElementById("textarea");
  const passwordInput = document.getElementById("passwordInput");
  const generateLink = document.getElementById("generateLink");
  const shareLink = document.getElementById("shareLink");
  const previewSection = document.getElementById("previewSection");
  const notePreview = document.getElementById("notePreview");
  const backButton = document.getElementById("backButton");
  const editorSection = document.getElementById("editorSection");
  const themeToggle = document.getElementById("themeToggle");
  const messageBox = document.getElementById("message");

  // Function to show message in DOM
  function showMessage(text, duration = 10000) {
    messageBox.textContent = text;
    messageBox.classList.remove("hidden");
    messageBox.classList.add("show");

    setTimeout(() => {
      messageBox.classList.remove("show");
      setTimeout(() => messageBox.classList.add("hidden"), 500); // correspond à la transition CSS
    }, duration);
  }

  // ==================== THEME TOGGLE ====================
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  });

  // ==================== ENCRYPTION / DECRYPTION ====================
  async function getKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode("CipherNoteSalt"),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptMessage(message, password) {
    const key = await getKey(password);
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(message)
    );
    return btoa(String.fromCharCode(...iv)) + ":" + btoa(String.fromCharCode(...new Uint8Array(cipher)));
  }

  async function decryptMessage(data, password) {
    const key = await getKey(password);
    const [ivStr, cipherStr] = data.split(":");
    const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0));
    const cipher = Uint8Array.from(atob(cipherStr), c => c.charCodeAt(0));
    const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return new TextDecoder().decode(dec);
  }

  // ==================== GENERATE LINK ====================
  generateLink.addEventListener("click", async () => {
    const message = textarea.value;
    const password = passwordInput.value;
    if (!message || !password) return showMessage("Please enter note and password");

    const encrypted = await encryptMessage(message, password);
    const url = `${location.origin}${location.pathname}#${encodeURIComponent(encrypted)}`;

    // Mettre le lien dans l'input readonly
    shareLink.value = url;

    // Copier automatiquement dans le presse-papiers
    shareLink.select();
    shareLink.setSelectionRange(0, 99999); // mobile support
    document.execCommand("copy");
    showMessage("Link copied to clipboard!");
  });

  // ==================== CHECK URL HASH ====================
  async function checkHash() {
    const hash = decodeURIComponent(location.hash.slice(1));
    if (!hash) return;

    const password = prompt("Enter password to decrypt note:");
    if (!password) return;

    try {
      const decrypted = await decryptMessage(hash, password);
      showNoteDecrypted(marked.parse(decrypted));
    } catch (e) {
      showMessage("Failed to decrypt. Wrong password?");
      location.hash = "";
    }
  }

  // ==================== SHOW NOTE ====================
  function showNoteDecrypted(content) {
    editorSection.hidden = true;
    notePreview.innerHTML = content;
    previewSection.hidden = false;
  }

  // ==================== BACK BUTTON ====================
  backButton.addEventListener("click", () => {
    previewSection.hidden = true;
    editorSection.hidden = false;
    textarea.value = "";
    passwordInput.value = "";
    shareLink.value = "";
    window.location.hash = "";
  });

  // ==================== INIT ====================
  checkHash();
});
