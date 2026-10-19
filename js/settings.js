/* =========================================================
   PARAMÈTRES PARTAGÉS – VERSION SERVEUR
   Chargé dans le <head> de toutes les pages.
   1. on applique tout de suite la copie gardée dans le navigateur (cache)
   2. puis on récupère les paramètres de l'utilisateur sur le serveur
   ========================================================= */
const SETTINGS_KEY = 'monbudget-parametres';

const DEFAULT_SETTINGS = {
  budget: 0,
  recommended: {
    logement: 45,
    alimentation: 20,
    etudes: 10,
    transport: 5,
    loisirs: 10,
    divers: 10,
  },
  colors: {
    logement: '#e76f51',
    alimentation: '#f4a261',
    etudes: '#2a9d8f',
    transport: '#8ab17d',
    loisirs: '#e9c46a',
    divers: '#b5838d',
  },
  animations: true,
};

// Lit le cache du navigateur, complété par les valeurs par défaut
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      recommended: { ...DEFAULT_SETTINGS.recommended, ...saved.recommended },
      colors: { ...DEFAULT_SETTINGS.colors, ...saved.colors },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

// Remplace les couleurs du CSS par celles choisies, et coupe les animations si besoin
function applySettings() {
  const root = document.documentElement;
  for (const [category, value] of Object.entries(appSettings.colors)) {
    root.style.setProperty(`--${category}`, value);
  }
  root.classList.toggle('no-motion', !appSettings.animations);
}

const appSettings = loadSettings();
applySettings();

/* =========================================================
   SYNCHRONISATION AVEC LE SERVEUR
   ========================================================= */

// Met à jour appSettings SANS remplacer ses objets internes :
// les fichiers qui en gardent une référence (ex. RECOMMENDED dans stats.js) restent à jour
function mergeIntoSettings(source) {
  if (typeof source.budget === 'number') appSettings.budget = source.budget;
  if (typeof source.animations === 'boolean') appSettings.animations = source.animations;
  Object.assign(appSettings.recommended, source.recommended || {});
  Object.assign(appSettings.colors, source.colors || {});
}

// Enregistre dans le cache ET sur le serveur
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));

  // apiRequest vient de auth.js ; une erreur serveur n'empêche pas l'appli de marcher
  if (typeof apiRequest === 'function') {
    apiRequest('settings.php', { method: 'PUT', body: appSettings }).catch(() => {});
  }
}

// Promesse "les paramètres du serveur sont arrivés" : les pages peuvent l'attendre
const settingsReady = new Promise((resolve) => {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const data = await apiRequest('settings.php');
        mergeIntoSettings(data.settings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
        applySettings();
      }
    } catch {
      // Serveur injoignable : on garde les réglages du cache
    }
    resolve();
  });
});