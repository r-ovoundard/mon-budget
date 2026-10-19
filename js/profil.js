/* =========================================================
   PAGE PROFIL
   ========================================================= */
const PROFILE_CATEGORIES = {
  logement: 'Logement',
  alimentation: 'Alimentation',
  etudes: 'Études',
  transport: 'Transport',
  loisirs: 'Loisirs',
  divers: 'Divers',
};

const profileEuro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const profileCanAnimate = appSettings.animations
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Éléments ---------- */
const heroAvatar = document.getElementById('hero-avatar');
const heroName = document.getElementById('hero-name');
const heroEmail = document.getElementById('hero-email');
const heroSince = document.getElementById('hero-since');
const statCountEl = document.getElementById('pstat-count');
const statTotalEl = document.getElementById('pstat-total');
const statTopEl = document.getElementById('pstat-top');

/* =========================================================
   NOTIFICATION
   ========================================================= */
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');
const toastIcon = document.getElementById('toast-icon');
let toastTimer;

function showToast(message, type = 'success') {
  toastText.textContent = message;
  toastIcon.textContent = type === 'error' ? '!' : '✓';
  toast.classList.toggle('error', type === 'error');
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* =========================================================
   COMPTEUR ANIMÉ (de 0 jusqu'à la valeur)
   ========================================================= */
function countTo(element, target, format) {
  if (!profileCanAnimate) {
    element.textContent = format(target);
    return;
  }
  const duration = 1200;
  const start = performance.now();
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4); // ralentit en fin de course
    element.textContent = format(target * eased);
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* =========================================================
   AFFICHAGE DU PROFIL
   ========================================================= */
function fillHero(user) {
  heroAvatar.textContent = (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
  heroName.textContent = `${user.firstName} ${user.lastName}`;
  heroEmail.textContent = user.email;
}

function fillStats(stats) {
  // Les cartes basculent vers 0,6 s : on lance les compteurs au même moment
  setTimeout(() => {
    countTo(statCountEl, stats.count, (n) => String(Math.round(n)));
    countTo(statTotalEl, stats.total, profileEuro.format);
  }, profileCanAnimate ? 700 : 0);
  statTopEl.textContent = stats.topCategory ? PROFILE_CATEGORIES[stats.topCategory] : '—';
}

/* =========================================================
   ONGLETS AVEC INDICATEUR QUI GLISSE
   ========================================================= */
const tabBar = document.getElementById('tab-bar');
const tabIndicator = document.getElementById('tab-indicator');
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');

// Place l'indicateur exactement sous l'onglet choisi
function moveIndicator(tab) {
  tabIndicator.style.width = `${tab.offsetWidth}px`;
  tabIndicator.style.transform = `translateX(${tab.offsetLeft - 6}px)`; // 6px = marge intérieure de la barre
}

function openTab(name) {
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    if (active) moveIndicator(tab);
  });
  panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === name));
  tabBar.classList.toggle('is-danger', name === 'danger');
}

tabs.forEach((tab) => tab.addEventListener('click', () => openTab(tab.dataset.tab)));

// Si la fenêtre change de taille, l'indicateur se recale
window.addEventListener('resize', () => moveIndicator(document.querySelector('.tab.active')));

/* =========================================================
   DÉMARRAGE
   ========================================================= */
async function initProfile() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.replace('connexion.html');
    return;
  }

  moveIndicator(document.querySelector('.tab.active'));

  try {
    const data = await apiRequest('account.php');
    fillHero(data.user);
    fillForm(data.user); // défini à l'étape 6
    fillStats(data.stats);

    const since = new Date(data.user.createdAt.replace(' ', 'T'))
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    heroSince.textContent = `Membre depuis ${since}`;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', initProfile);