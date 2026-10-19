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