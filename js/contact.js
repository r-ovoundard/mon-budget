/* =========================================================
   PAGE CONTACT
   ========================================================= */
const contactCanAnimate = appSettings.animations
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const contactNameInput = document.getElementById('contact-name');
const contactEmailInput = document.getElementById('contact-email');
const contactMessageInput = document.getElementById('contact-message');
const contactBtn = document.getElementById('contact-btn');

/* =========================================================
   TITRE QUI SE "DÉCODE"
   Des caractères au hasard, puis les vraies lettres se fixent
   une à une, de gauche à droite.
   ========================================================= */
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$€';

function scrambleText(element) {
  const finalText = element.dataset.text;
  if (!contactCanAnimate) {
    element.textContent = finalText;
    return;
  }

  const steps = 30;
  let step = 0;

  const timer = setInterval(() => {
    step += 1;
    const revealed = Math.floor((step / steps) * finalText.length);

    element.textContent = [...finalText].map((char, index) => {
      if (index < revealed || char === ' ' || char === '-') return char;
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }).join('');

    if (step >= steps) {
      clearInterval(timer);
      element.textContent = finalText;
    }
  }, 40);
}

scrambleText(document.querySelector('.scramble'));

/* =========================================================
   PASTILLES : ONDE QUI PART DU POINT DE CLIC
   ========================================================= */
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('pointerdown', (event) => {
    if (!contactCanAnimate) return;

    const rect = chip.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

    chip.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});

/* =========================================================
   MINI-ANNEAU QUI COMPTE LES CARACTÈRES
   ========================================================= */
const MAX_CHARS = 1000;
const COUNTER_LENGTH = 94.25; // périmètre du cercle : 2 × π × 15
const charCounter = document.getElementById('char-counter');
const counterValue = document.getElementById('counter-value');
const counterText = document.getElementById('counter-text');

function updateCounter() {
  const length = contactMessageInput.value.length;
  const ratio = length / MAX_CHARS;

  counterValue.style.strokeDashoffset = COUNTER_LENGTH * (1 - ratio);
  counterText.textContent = `${length} / ${MAX_CHARS}`;
  charCounter.classList.toggle('warn', ratio >= 0.8 && ratio < 1);
  charCounter.classList.toggle('limit', ratio >= 1);
}

contactMessageInput.addEventListener('input', updateCounter);
updateCounter();

/* =========================================================
   BOUTON MAGNÉTIQUE : il suit légèrement la souris
   ========================================================= */
if (contactCanAnimate) {
  contactBtn.addEventListener('pointermove', (event) => {
    const rect = contactBtn.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    contactBtn.style.transform = `translate(${x * 0.25}px, ${y * 0.4}px)`;
  });

  contactBtn.addEventListener('pointerleave', () => {
    contactBtn.style.transform = '';
  });
}

/* =========================================================
   ACCORDÉON DES QUESTIONS FRÉQUENTES
   ========================================================= */
document.querySelectorAll('.faq-item').forEach((item) => {
  const question = item.querySelector('.faq-question');
  question.addEventListener('click', () => {
    const isOpen = item.classList.toggle('open');
    question.setAttribute('aria-expanded', String(isOpen));
  });
});

/* =========================================================
   CONNECTÉ : NOM ET EMAIL PRÉ-REMPLIS
   ========================================================= */
getCurrentUser().then((user) => {
  if (!user) return;
  contactNameInput.value = `${user.firstName} ${user.lastName}`;
  contactEmailInput.value = user.email;
});
/* =========================================================
   ENVOI DU MESSAGE AVEC FORMSPREE
   Formspree reçoit le message et te le transfère par email.
   ========================================================= */
// ⚠ Remplace par l'adresse de TON formulaire Formspree
const FORMSPREE_URL = 'https://formspree.io/f/xnpjybba';

const SUBJECT_LABELS = {
  question: 'Question',
  bug: 'Signalement de bug',
  idee: 'Idée / suggestion',
  autre: 'Autre',
};

const contactForm = document.getElementById('contact-form');
const contactError = document.getElementById('contact-error');
const contactSuccess = document.getElementById('contact-success');
const successName = document.getElementById('success-name');
const websiteInput = document.getElementById('contact-website');
const paperPlane = document.getElementById('paper-plane');
const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Affiche un message d'erreur, et met le champ concerné en rouge
function setContactError(input, message) {
  contactError.textContent = message;
  document.querySelectorAll('.cfield.invalid').forEach((field) => field.classList.remove('invalid'));
  if (input) {
    const field = input.closest('.cfield');
    void field.offsetWidth; // rejoue le tremblement
    field.classList.add('invalid');
    input.focus();
  }
}

// Le rouge disparaît dès qu'on corrige le champ
[contactNameInput, contactEmailInput, contactMessageInput].forEach((input) => {
  input.addEventListener('input', () => input.closest('.cfield').classList.remove('invalid'));
});

/* ---------- L'avion en papier ---------- */
function launchPlane() {
  // Navigateur trop ancien ou animations coupées : pas d'avion
  if (!contactCanAnimate || !CSS.supports('offset-path', 'path("M 0 0 L 1 1")')) return;

  const rect = contactBtn.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;
  const endX = window.innerWidth + 80; // sort de l'écran à droite…
  const endY = -80;                     // …et en haut

  // Courbe de Bézier : l'avion monte, redescend un peu, puis s'envole
  paperPlane.style.offsetPath = `path("M ${startX} ${startY} C ${startX + 140} ${startY - 180}, ${window.innerWidth * 0.55} ${startY + 60}, ${endX} ${endY}")`;

  paperPlane.classList.remove('flying');
  void paperPlane.offsetWidth;
  paperPlane.classList.add('flying');
}

paperPlane.addEventListener('animationend', () => paperPlane.classList.remove('flying'));

/* ---------- Envoi ---------- */
contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setContactError(null, '');

  const name = contactNameInput.value.trim();
  const email = contactEmailInput.value.trim();
  const message = contactMessageInput.value.trim();
  const subject = contactForm.querySelector('input[name="subject"]:checked')?.value || 'autre';

  // Vérifications avant l'envoi
  if (name.length < 2) return setContactError(contactNameInput, 'Entrez votre nom.');
  if (!CONTACT_EMAIL_PATTERN.test(email)) return setContactError(contactEmailInput, 'Entrez une adresse email valide.');
  if (message.length < 10) return setContactError(contactMessageInput, 'Votre message est trop court (10 caractères minimum).');

  contactBtn.disabled = true;

  try {
    const response = await fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name,
        email,                                             // Formspree s'en sert pour "Répondre"
        sujet: SUBJECT_LABELS[subject],
        message,
        _subject: `MonBudget – ${SUBJECT_LABELS[subject]}`, // objet de l'email que tu reçois
        _gotcha: websiteInput.value,                       // champ piège : rempli = robot, message ignoré
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.errors?.[0]?.message || "L'envoi a échoué. Réessayez dans un instant.");
    }

    launchPlane();
    successName.textContent = name.split(' ')[0];

    // On laisse l'avion décoller avant d'afficher la carte de remerciement
    setTimeout(() => {
      contactForm.hidden = true;
      contactSuccess.hidden = false;
    }, contactCanAnimate ? 700 : 0);
  } catch (error) {
    // TypeError : pas de connexion Internet
    setContactError(null, error instanceof TypeError
      ? 'Impossible de joindre le service. Vérifiez votre connexion Internet.'
      : error.message);
  } finally {
    contactBtn.disabled = false;
    contactBtn.style.transform = '';
  }
});

/* ---------- "Envoyer un autre message" ---------- */
document.getElementById('contact-again').addEventListener('click', () => {
  contactMessageInput.value = '';
  updateCounter();
  contactSuccess.hidden = true;
  contactForm.hidden = false;
  contactMessageInput.focus();
});
/* =========================================================
   MOT DE PASSE OUBLIÉ : DEMANDE DÉJÀ RÉDIGÉE
   (quand on arrive depuis le lien de la page Connexion)
   ========================================================= */
const contactParams = new URLSearchParams(window.location.search);

if (contactParams.get('motif') === 'mot-de-passe') {
  contactForm.querySelector('input[name="subject"][value="autre"]').checked = true;

  contactMessageInput.value =
    "Bonjour, j'ai oublié le mot de passe de mon compte MonBudget. "
    + "Pouvez-vous m'aider à le réinitialiser ? Merci.";
  updateCounter();

  const email = contactParams.get('email');
  if (email) contactEmailInput.value = email;

  contactNameInput.focus(); // il ne reste qu'à écrire son nom
}