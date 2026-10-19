/* =========================================================
   TABLEAU DE BORD
   Applique la répartition des Paramètres à la barre et à la légende.
   ========================================================= */
function applyDashboardSplit() {
  const split = appSettings.recommended;
  const categoryOf = (element) => Object.keys(split).find((key) => element.classList.contains(key));

  document.querySelectorAll('.budget-bar .seg').forEach((seg) => {
    const value = split[categoryOf(seg)];
    seg.style.width = `${value}%`;
    seg.textContent = `${value} %`;
    seg.style.display = value === 0 ? 'none' : ''; // une catégorie à 0 % disparaît
  });

  document.querySelectorAll('.legend li').forEach((item) => {
    const value = split[categoryOf(item.querySelector('.dot'))];
    item.querySelector('em').textContent = `(${value} %)`;
  });
}

// Tout de suite avec le cache, puis à nouveau avec les réglages du serveur
applyDashboardSplit();
settingsReady.then(applyDashboardSplit);
/* =========================================================
   ACCUEIL PERSONNALISÉ
   Déconnecté : invitation à s'inscrire
   Connecté   : résumé du mois en cours
   ========================================================= */
const homePanel = document.getElementById('home-panel');
const homeEuro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const HOME_CATEGORIES = {
  logement: 'Logement',
  alimentation: 'Alimentation',
  etudes: 'Études',
  transport: 'Transport',
  loisirs: 'Loisirs',
  divers: 'Divers',
};
const RING_LENGTH = 326.73; // périmètre du cercle de l'anneau : 2 × π × 52

// Empêche qu'un texte contenant du HTML (prénom, description) soit interprété
function homeEscape(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Mois en cours au format AAAA-MM, à l'heure locale
function homeMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/* ---------- Compteur animé ---------- */
function homeCount(element, target, format) {
  if (!appSettings.animations) {
    element.textContent = format(target);
    return;
  }
  const start = performance.now();
  const duration = 1200;
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    element.textContent = format(target * (1 - Math.pow(1 - progress, 3)));
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------- Déconnecté : invitation ---------- */
function renderGuestPanel() {
  homePanel.innerHTML = `
    <div class="home-guest">
      <div class="home-guest-text">
        <span class="home-kicker">✨ Gratuit pour les étudiants</span>
        <h2>Suivez vos dépenses, gardez le contrôle</h2>
        <p>Créez votre compte en 30 secondes et retrouvez votre budget, vos statistiques et vos conseils, où que vous soyez.</p>
        <div class="home-actions">
          <a href="inscription.html" class="btn-shine">Créer mon compte</a>
          <a href="connexion.html" class="btn-soft">J'ai déjà un compte</a>
        </div>
      </div>
      <ul class="home-features">
        <li>
          <span class="home-feature-icon">🧾</span>
          <div><strong>Notez vos dépenses</strong><p>En quelques secondes, classées par catégorie.</p></div>
        </li>
        <li>
          <span class="home-feature-icon">📊</span>
          <div><strong>Visualisez votre mois</strong><p>Graphiques et comparaison avec la répartition conseillée.</p></div>
        </li>
        <li>
          <span class="home-feature-icon">🎯</span>
          <div><strong>Respectez votre budget</strong><p>Une alerte dès que vous le dépassez.</p></div>
        </li>
      </ul>
    </div>
  `;
}

/* ---------- Connecté : résumé du mois ---------- */
function renderUserPanel(user, expenses) {
  const month = homeMonthKey();
  const ofMonth = expenses.filter((e) => e.date.startsWith(month));
  const total = ofMonth.reduce((sum, e) => sum + e.amount, 0);
  const budget = appSettings.budget;
  const hasBudget = budget > 0;
  const left = budget - total;
  const isOver = hasBudget && left < 0;
  const percent = hasBudget ? Math.round((total / budget) * 100) : 0;

  const monthName = new Date().toLocaleDateString('fr-FR', { month: 'long' });

  // Les 3 dépenses les plus récentes (tous mois confondus)
  const recent = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .slice(0, 3);

  const recentHtml = recent.length
    ? recent.map((e) => `
        <li>
          <span class="dot ${e.category}"></span>
          <span class="home-recent-name">${homeEscape(e.description || HOME_CATEGORIES[e.category])}</span>
          <strong>${homeEuro.format(e.amount)}</strong>
        </li>`).join('')
    : '<li class="home-empty">Aucune dépense pour le moment.</li>';

  homePanel.innerHTML = `
    <div class="home-user">
      <div class="home-hello">
        <div>
          <h2>Bonjour, ${homeEscape(user.firstName)} 👋</h2>
          <p>Voici votre mois de ${monthName}.</p>
        </div>
        <a href="depenses.html" class="btn-shine">+ Ajouter une dépense</a>
      </div>

      <div class="home-grid">
        <div class="home-ring-card">
          <div class="ring-wrap">
            <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#4f8cff"/>
                  <stop offset="100%" stop-color="#7c5cff"/>
                </linearGradient>
              </defs>
              <circle class="ring-track" cx="60" cy="60" r="52"/>
              <circle class="ring-value ${isOver ? 'is-over' : ''}" id="ring-value" cx="60" cy="60" r="52"/>
            </svg>
            <div class="ring-center">
              ${hasBudget
                ? `<strong>${percent} %</strong><span>du budget</span>`
                : '<span>Pas de budget</span><a href="parametres.html" class="auth-link">Définir mon budget</a>'}
            </div>
          </div>
        </div>

        <div class="home-figures">
          <div class="home-figure">
            <span>Dépensé ce mois</span>
            <strong id="home-total">0,00 €</strong>
          </div>
          <div class="home-figure">
            <span>${isOver ? 'Dépassement' : 'Reste à dépenser'}</span>
            <strong class="${isOver ? 'is-over' : ''}">
              ${hasBudget ? homeEuro.format(Math.abs(left)) : '—'}
            </strong>
          </div>
          <div class="home-figure">
            <span>Dépenses ce mois</span>
            <strong id="home-count">0</strong>
          </div>
        </div>

        <div class="home-recent">
          <h3>Dernières dépenses</h3>
          <ul>${recentHtml}</ul>
          <a href="stats.html" class="auth-link">Voir mes statistiques →</a>
        </div>
      </div>
    </div>
  `;

  // Chiffres qui défilent
  homeCount(document.getElementById('home-total'), total, homeEuro.format);
  homeCount(document.getElementById('home-count'), ofMonth.length, (n) => String(Math.round(n)));

  // L'anneau : on attend une image, puis on le "remplit" pour que la transition se joue
  const ring = document.getElementById('ring-value');
  const fill = hasBudget ? Math.min(total / budget, 1) : 0;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    ring.style.strokeDashoffset = RING_LENGTH * (1 - fill);
  }));
}

/* ---------- Démarrage ---------- */
async function initHome() {
  const user = await getCurrentUser();

  if (!user) {
    renderGuestPanel();
  } else {
    try {
      const data = await apiRequest('expenses.php');
      await settingsReady; // le budget de l'utilisateur
      renderUserPanel(user, data.expenses);
    } catch {
      renderGuestPanel(); // serveur injoignable : on reste sur l'invitation
    }
  }

  homePanel.hidden = false;
}

document.addEventListener('DOMContentLoaded', initHome);