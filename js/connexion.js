/* =========================================================
   ÉLÉMENTS DE LA PAGE
   ========================================================= */
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');
const rememberInput = document.getElementById('remember');
const loginAlert = document.getElementById('login-alert');
const loginBtn = document.getElementById('login-btn');
const authCard = document.getElementById('auth-card');
const toggleBtn = document.getElementById('toggle-password');

/* =========================================================
   AFFICHER / MASQUER LE MOT DE PASSE
   ========================================================= */
toggleBtn.addEventListener('click', () => {
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  toggleBtn.classList.toggle('visible', show);
  toggleBtn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');

  // Rejoue le clignement à chaque clic
  toggleBtn.classList.remove('blink');
  void toggleBtn.offsetWidth;
  toggleBtn.classList.add('blink');

  passwordInput.focus();
});

/* =========================================================
   VALIDATION
   ========================================================= */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(input, errorElement, message) {
  errorElement.textContent = message;
  input.closest('.float-field').classList.toggle('invalid', Boolean(message));
}

function validateLogin() {
  let valid = true;

  if (!EMAIL_PATTERN.test(emailInput.value.trim())) {
    setFieldError(emailInput, emailError, 'Entrez une adresse email valide.');
    valid = false;
  } else {
    setFieldError(emailInput, emailError, '');
  }

  if (!passwordInput.value) {
    setFieldError(passwordInput, passwordError, 'Entrez votre mot de passe.');
    valid = false;
  } else {
    setFieldError(passwordInput, passwordError, '');
  }

  return valid;
}

// L'erreur d'un champ disparaît dès qu'on le corrige
emailInput.addEventListener('input', () => setFieldError(emailInput, emailError, ''));
passwordInput.addEventListener('input', () => setFieldError(passwordInput, passwordError, ''));

function wobbleCard() {
  authCard.classList.remove('wobble');
  void authCard.offsetWidth;
  authCard.classList.add('wobble');
}

/* =========================================================
   CARTE QUI S'INCLINE EN 3D SELON LA SOURIS
   ========================================================= */
const canAnimate = appSettings.animations
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canAnimate) {
  authCard.addEventListener('pointermove', (event) => {
    const rect = authCard.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5; // de -0,5 à 0,5
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    authCard.style.transform = `rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
  });

  authCard.addEventListener('pointerleave', () => {
    authCard.style.transform = '';
  });
}
/* =========================================================
   CONNEXION
   ========================================================= */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginAlert.textContent = '';
  loginAlert.classList.remove('info');

  if (!validateLogin()) {
    wobbleCard();
    return;
  }

  loginBtn.classList.add('is-loading');

  try {
    // On attend au moins 700 ms pour que l'animation de chargement soit visible
    await Promise.all([
      loginUser(emailInput.value, passwordInput.value, rememberInput.checked),
      wait(700),
    ]);

    loginBtn.classList.replace('is-loading', 'is-success');
    await wait(900); // le temps de voir la coche se dessiner
        window.location.href = getReturnPage();
  } catch (error) {
    loginBtn.classList.remove('is-loading');
    loginAlert.textContent = error.message;
    wobbleCard();
  }
});

/* =========================================================
   MOT DE PASSE OUBLIÉ
   Direction la page Contact, avec la demande déjà rédigée.
   ========================================================= */
document.getElementById('forgot-link').addEventListener('click', (event) => {
  event.preventDefault();

  // On emmène l'email déjà tapé jusqu'à la page Contact
  const params = new URLSearchParams({ motif: 'mot-de-passe' });
  const email = emailInput.value.trim();
  if (email) params.set('email', email);

  window.location.href = `contact.html?${params}`;
});
/* =========================================================
   DÉJÀ CONNECTÉ : direction le tableau de bord
   ========================================================= */
// On attend la réponse du serveur avant de décider
getCurrentUser().then((user) => {
  if (user) window.location.replace(getReturnPage());
});
/* =========================================================
   MESSAGE SELON LA PAGE DEMANDÉE
   ========================================================= */
const PAGE_NAMES = {
  'depenses.html': 'vos dépenses',
  'stats.html': 'vos statistiques',
  'parametres.html': 'vos paramètres',
  'profil.html': 'votre profil',
};

const wantedPage = new URLSearchParams(window.location.search).get('retour');
if (PAGE_NAMES[wantedPage]) {
  loginAlert.classList.add('info');
  loginAlert.textContent = `Connectez-vous pour accéder à ${PAGE_NAMES[wantedPage]}.`;
}