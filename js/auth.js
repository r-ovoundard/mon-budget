/* =========================================================
   COMPTES ET SESSION (version sans serveur)
   ⚠ Démonstration : les comptes sont stockés dans le navigateur.
   Une vraie appli vérifierait le mot de passe sur un serveur (PHP…).
   On ne stocke jamais le mot de passe lui-même, seulement son empreinte.
   ========================================================= */
const AUTH_ACCOUNTS_KEY = 'monbudget-comptes';
const AUTH_SESSION_KEY = 'monbudget-session';

function toHex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Un "sel" aléatoire par compte : deux mots de passe identiques
// donnent des empreintes différentes
function randomSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

// Empreinte SHA-256 du sel + mot de passe (impossible à inverser)
async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(salt + password);
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

function getAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(AUTH_ACCOUNTS_KEY));
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function createAccount(name, email, password) {
  const accounts = getAccounts();
  const normalizedEmail = email.trim().toLowerCase();

  if (accounts.some((a) => a.email === normalizedEmail)) {
    throw new Error('Un compte existe déjà avec cet email.');
  }

  const salt = randomSalt();
  const account = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    salt,
    hash: await hashPassword(password, salt),
    createdAt: Date.now(),
  };

  accounts.push(account);
  saveAccounts(accounts);
  return account;
}

async function loginUser(email, password, remember) {
  const account = getAccounts().find((a) => a.email === email.trim().toLowerCase());

  // Même message dans les deux cas : on ne révèle pas si l'email existe
  if (!account || account.hash !== await hashPassword(password, account.salt)) {
    throw new Error('Email ou mot de passe incorrect.');
  }

  const session = JSON.stringify({ id: account.id, name: account.name, email: account.email });
  // "Se souvenir de moi" : localStorage (reste connecté)
  // sinon sessionStorage (déconnecté à la fermeture du navigateur)
  (remember ? localStorage : sessionStorage).setItem(AUTH_SESSION_KEY, session);
  return account;
}

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) || localStorage.getItem(AUTH_SESSION_KEY));
  } catch {
    return null;
  }
}

function logoutUser() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);
}