/* =========================================================
   COMPTES ET SESSION – VERSION SERVEUR (PHP + MySQL)
   Les comptes sont enregistrés dans la base de données.
   Le serveur se souvient de l'utilisateur grâce à un cookie de session.
   ========================================================= */

// Envoie une requête à l'API PHP et renvoie la réponse.
// En cas de problème, lance une erreur avec le message du serveur.
async function apiRequest(path, options = {}) {
  const response = await fetch(`api/${path}`, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : {},
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'same-origin', // envoie le cookie de session
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Le serveur ne répond pas correctement. Est-il lancé ?');
  }

  if (!response.ok || !data.ok) {
    const error = new Error(data.error || 'Erreur du serveur.');
    error.field = data.field;     // le champ du formulaire en cause
    error.status = response.status;
    throw error;
  }

  return data;
}

/* ---------- Inscription ---------- */
async function createAccount(name, email, password, profile = {}) {
  const data = await apiRequest('register.php', {
    method: 'POST',
    body: {
      firstName: name,
      lastName: profile.lastName || '',
      email,
      phone: profile.phone || '',
      address: profile.address || '',
      password,
    },
  });
  return data.user;
}

/* ---------- Connexion ---------- */
async function loginUser(email, password, remember) {
  const data = await apiRequest('login.php', {
    method: 'POST',
    body: { email, password, remember },
  });
  return data.user;
}

/* ---------- Qui est connecté ? ----------
   Une seule question au serveur par page, même si plusieurs scripts la posent */
let currentUserPromise = null;

function getCurrentUser() {
  if (!currentUserPromise) {
    currentUserPromise = apiRequest('me.php')
      .then((data) => data.user)
      .catch(() => null); // serveur injoignable : on considère que personne n'est connecté
  }
  return currentUserPromise;
}

/* ---------- Déconnexion ---------- */
async function logoutUser() {
  try {
    await apiRequest('logout.php', { method: 'POST' });
  } finally {
    currentUserPromise = Promise.resolve(null);
  }
}

/* =========================================================
   REDIRECTIONS
   ========================================================= */

// Envoie vers la page Connexion en se souvenant de la page demandée
function redirectToLogin() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  window.location.replace(`connexion.html?retour=${encodeURIComponent(page)}`);
}

// Page où renvoyer l'utilisateur après la connexion.
// Seuls les noms de pages du site sont acceptés (ex : "stats.html") :
// un lien piégé ne peut pas envoyer l'utilisateur vers un autre site.
function getReturnPage() {
  const target = new URLSearchParams(window.location.search).get('retour');
  return target && /^[a-z-]+\.html$/.test(target) ? target : 'index.html';
}
/* =========================================================
   MENU : "Bonjour, Prénom" + Déconnexion quand on est connecté
   ========================================================= */
async function renderAuthNav() {
  const user = await getCurrentUser();
  const navAuth = document.querySelector('.nav-auth');
  if (!user || !navAuth) return;

  const firstName = user.firstName;

  // textContent (et non innerHTML) : un nom contenant du HTML ne sera jamais interprété
    // Le "Bonjour, Prénom" devient un lien vers la page Profil
  const greeting = document.createElement('a');
  greeting.href = 'profil.html';
  greeting.className = 'nav-user';
  const avatar = document.createElement('span');
  avatar.className = 'nav-avatar';
  avatar.textContent = firstName.charAt(0).toUpperCase();
  greeting.append(avatar, `Bonjour, ${firstName}`);

  const logoutBtn = document.createElement('button');
  logoutBtn.type = 'button';
  logoutBtn.className = 'btn-ghost';
  logoutBtn.textContent = 'Déconnexion';
  logoutBtn.addEventListener('click', async () => {
    await logoutUser();
    window.location.href = 'connexion.html';
  });

  navAuth.replaceChildren(greeting, logoutBtn);
}

// auth.js est dans le <head> : on attend que le menu existe
document.addEventListener('DOMContentLoaded', renderAuthNav);