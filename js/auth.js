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
   CADENAS SUR LES PAGES RÉSERVÉES (quand on est déconnecté)
   ========================================================= */
const PROTECTED_PAGES = ['depenses.html', 'stats.html', 'parametres.html', 'profil.html'];

function lockProtectedLinks() {
  document.querySelectorAll('.navbar nav a').forEach((link) => {
    if (PROTECTED_PAGES.includes(link.getAttribute('href'))) {
      link.classList.add('nav-locked');
      link.title = 'Connexion requise'; // petite bulle au survol
    }
  });
}
/* =========================================================
   CONFIRMATION AVANT LA DÉCONNEXION
   Renvoie une promesse : true si l'utilisateur confirme, false sinon.
   ========================================================= */
function confirmLogout() {
  return new Promise((resolve) => {
    let dialog = document.getElementById('logout-dialog');

    // La fenêtre est créée une seule fois, puis réutilisée
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'logout-dialog';
      dialog.className = 'modal';
      dialog.innerHTML = `
        <form method="dialog">
          <span class="modal-icon logout-wave" aria-hidden="true">👋</span>
          <h3>Se déconnecter ?</h3>
          <p>Vous devrez saisir à nouveau votre email et votre mot de passe pour revenir.</p>
          <div class="modal-actions">
            <button value="cancel" class="btn-soft">Rester connecté</button>
            <button value="confirm" class="btn-shine">Se déconnecter</button>
          </div>
        </form>
      `;
      document.body.append(dialog);

      // Un clic sur le fond flouté = "Rester connecté"
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close('cancel');
      });
    }

    dialog.returnValue = ''; // oublie la réponse précédente
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.showModal();
  });
}
/* =========================================================
   MENU : "Bonjour, Prénom" + Déconnexion quand on est connecté
   ========================================================= */
async function renderAuthNav() {
  const user = await getCurrentUser();
  const navAuth = document.querySelector('.nav-auth');
   if (!navAuth) return;

  // Déconnecté : on garde Connexion / Inscription et on pose les cadenas
  if (!user) {
    lockProtectedLinks();
    return;
  }

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
    if (!(await confirmLogout())) return; // "Rester connecté" : on ne fait rien
    await logoutUser();
    window.location.href = 'connexion.html';
  });

  navAuth.replaceChildren(greeting, logoutBtn);
}

// auth.js est dans le <head> : on attend que le menu existe
document.addEventListener('DOMContentLoaded', renderAuthNav);
/* =========================================================
   BOUTON "← RETOUR"
   Ajouté automatiquement en haut des pages intérieures.
   ========================================================= */
const PAGES_WITHOUT_BACK = ['index.html', 'connexion.html', 'inscription.html'];

function goBack() {
  // D'où vient-on ? (document.referrer = l'adresse de la page précédente)
  let previousPage = null;
  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) {
      previousPage = referrer.pathname.split('/').pop() || 'index.html';
    }
  } catch {
    // pas de page précédente (lien direct, favori, nouvel onglet)
  }

  // Page précédente du site (hors Connexion/Inscription) : on y retourne.
  // Sinon : tableau de bord, pour ne jamais sortir de l'application.

    // On revient en arrière, sauf vers Connexion (elle renverrait ici : boucle),
  // et seulement si l'onglet a bien une page précédente
  if (previousPage && previousPage !== 'connexion.html' && window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = 'index.html';
  }
}

function renderBackButton() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const main = document.querySelector('main');
  if (PAGES_WITHOUT_BACK.includes(page) || !main) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'back-btn';
  button.setAttribute('aria-label', 'Revenir à la page précédente');
  button.innerHTML = '<span class="back-arrow" aria-hidden="true">←</span><span>Retour</span>';
  button.addEventListener('click', goBack);

  main.prepend(button); // tout en haut du contenu de la page
}

document.addEventListener('DOMContentLoaded', renderBackButton);
/* =========================================================
   PIED DE PAGE
   Ajouté automatiquement en bas de toutes les pages.
   ========================================================= */
// ⚠ Remplace TON-PSEUDO par ton nom d'utilisateur GitHub
   const GITHUB_URL = 'https://github.com/r-ovoundard/mon-budget';

async function renderFooter() {
  if (document.querySelector('.site-footer')) return; // déjà présent

  const user = await getCurrentUser();
  const year = new Date().getFullYear();

  // La colonne "Compte" change selon qu'on est connecté ou non
  const accountLinks = user
    ? `<li><a href="profil.html">Mon profil</a></li>
       <li><a href="#" data-action="logout">Déconnexion</a></li>`
    : `<li><a href="connexion.html">Connexion</a></li>
       <li><a href="inscription.html">Inscription</a></li>`;

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="index.html" class="logo">💸 Mon<span>Budget</span></a>
        <p>L'application qui aide les étudiants à suivre leurs dépenses et à garder le contrôle de leur budget.</p>
      </div>

      <div class="footer-col">
        <h4>Application</h4>
        <ul>
          <li><a href="index.html">Tableau de bord</a></li>
          <li><a href="depenses.html">Dépenses</a></li>
          <li><a href="stats.html">Statistiques</a></li>
          <li><a href="parametres.html">Paramètres</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Compte</h4>
        <ul>${accountLinks}</ul>
      </div>

      <div class="footer-col">
        <h4>Informations</h4>
        <ul>
          <li><a href="conditions.html">Conditions d'utilisation</a></li>
          <li><a href="${GITHUB_URL}" target="_blank" rel="noopener">Code source sur GitHub</a></li>
                    <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <span>© ${year} MonBudget · Projet étudiant</span>
      <button type="button" class="to-top">
        Haut de page <span class="to-top-arrow" aria-hidden="true">↑</span>
      </button>
    </div>
  `;

  document.body.append(footer);

  // "Haut de page" : remontée en douceur (instantanée si les animations sont coupées)
  footer.querySelector('.to-top').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: appSettings.animations ? 'smooth' : 'auto' });
  });

  // "Déconnexion" dans le pied de page
  const logoutLink = footer.querySelector('[data-action="logout"]');
  if (logoutLink) {
      logoutLink.addEventListener('click', async (event) => {
      event.preventDefault();
      if (!(await confirmLogout())) return;
      await logoutUser();
      window.location.href = 'connexion.html';
    });
  }

  // Le pied de page apparaît quand il arrive à l'écran
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      footer.classList.add('visible');
      observer.disconnect();
    }
  }, { threshold: 0.15 });
  observer.observe(footer);
}

document.addEventListener('DOMContentLoaded', renderFooter);