/* =========================================================
   ÉLÉMENTS DE LA PAGE
   ========================================================= */
const signupForm = document.getElementById('signup-form');
const nameInput = document.getElementById('signup-name');
const lastNameInput = document.getElementById('signup-lastname');
const emailInput = document.getElementById('signup-email');
const phoneInput = document.getElementById('signup-phone');
const addressInput = document.getElementById('signup-address');
const passwordInput = document.getElementById('signup-password');
const confirmInput = document.getElementById('signup-confirm');
const termsInput = document.getElementById('signup-terms');

const nameError = document.getElementById('name-error');
const lastNameError = document.getElementById('lastname-error');
const emailError = document.getElementById('email-error');
const phoneError = document.getElementById('phone-error');
const addressError = document.getElementById('address-error');
const passwordError = document.getElementById('password-error');
const confirmError = document.getElementById('confirm-error');
const termsError = document.getElementById('terms-error');
const signupAlert = document.getElementById('signup-alert');

const signupBtn = document.getElementById('signup-btn');
const authCard = document.getElementById('auth-card');
const toggleBtn = document.getElementById('toggle-password');
const strengthBox = document.getElementById('strength');
const strengthLabel = document.getElementById('strength-label');
const ruleItems = document.querySelectorAll('#rules li');
const matchIcon = document.getElementById('match-icon');

const canAnimate = appSettings.animations
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   AFFICHER / MASQUER LES MOTS DE PASSE
   Un seul œil pour les deux champs : plus simple pour vérifier.
   ========================================================= */
toggleBtn.addEventListener('click', () => {
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  confirmInput.type = show ? 'text' : 'password';
  toggleBtn.classList.toggle('visible', show);
  toggleBtn.setAttribute('aria-label', show ? 'Masquer les mots de passe' : 'Afficher les mots de passe');

  // Rejoue le clignement à chaque clic
  toggleBtn.classList.remove('blink');
  void toggleBtn.offsetWidth;
  toggleBtn.classList.add('blink');
});

/* =========================================================
   FORCE DU MOT DE PASSE ET RÈGLES
   ========================================================= */
const RULES = {
  length: (password) => password.length >= 8,
  upper: (password) => /[A-Z]/.test(password),
  digit: (password) => /\d/.test(password),
  special: (password) => /[^A-Za-z0-9]/.test(password),
};

const LEVEL_NAMES = ['Saisissez un mot de passe', 'Faible', 'Moyen', 'Bon', 'Excellent'];

// Coche ou décoche chaque règle, et renvoie le nombre de règles respectées
function checkRules(password) {
  let score = 0;
  ruleItems.forEach((item) => {
    const ok = RULES[item.dataset.rule](password);
    item.classList.toggle('ok', ok);
    if (ok) score += 1;
  });
  return score;
}

function updateStrength() {
  const password = passwordInput.value;
  const score = checkRules(password);
  // Un mot de passe non vide est au moins "Faible"
  const level = password ? Math.max(score, 1) : 0;
  strengthBox.dataset.level = level;
  strengthLabel.textContent = LEVEL_NAMES[level];
}

// ✓ ou ✕ dans le champ de confirmation
function updateMatch() {
  matchIcon.classList.remove('ok', 'ko');
  if (!confirmInput.value) return;
  matchIcon.classList.add(confirmInput.value === passwordInput.value ? 'ok' : 'ko');
}

/* =========================================================
   ERREURS
   ========================================================= */
function setFieldError(input, errorElement, message) {
  errorElement.textContent = message;
  const field = input.closest('.float-field');
  if (field) field.classList.toggle('invalid', Boolean(message));
}

function wobbleCard() {
  authCard.classList.remove('wobble');
  void authCard.offsetWidth;
  authCard.classList.add('wobble');
}

// Chaque erreur disparaît dès qu'on corrige son champ
nameInput.addEventListener('input', () => setFieldError(nameInput, nameError, ''));
lastNameInput.addEventListener('input', () => setFieldError(lastNameInput, lastNameError, ''));
emailInput.addEventListener('input', () => setFieldError(emailInput, emailError, ''));
phoneInput.addEventListener('input', () => setFieldError(phoneInput, phoneError, ''));
addressInput.addEventListener('input', () => setFieldError(addressInput, addressError, ''));

passwordInput.addEventListener('input', () => {
  setFieldError(passwordInput, passwordError, '');
  updateStrength();
  updateMatch();
});

confirmInput.addEventListener('input', () => {
  setFieldError(confirmInput, confirmError, '');
  updateMatch();
});

termsInput.addEventListener('change', () => {
  termsError.textContent = '';
});

/* =========================================================
   CARTE 3D + REFLET DE VERRE QUI SUIT LA SOURIS
   ========================================================= */
if (canAnimate) {
  authCard.addEventListener('pointermove', (event) => {
    const rect = authCard.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    // Position du reflet
    authCard.style.setProperty('--gx', `${px}px`);
    authCard.style.setProperty('--gy', `${py}px`);

    // Inclinaison : de -0,5 à 0,5 selon la position de la souris
    const x = px / rect.width - 0.5;
    const y = py / rect.height - 0.5;
    authCard.style.transform = `rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
  });

  authCard.addEventListener('pointerleave', () => {
    authCard.style.transform = '';
  });
}