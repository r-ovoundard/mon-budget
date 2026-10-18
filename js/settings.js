/* =========================================================
   PARAMÈTRES PARTAGÉS
   Ce fichier est chargé dans le <head> de TOUTES les pages :
   il lit les réglages et les applique avant l'affichage.
   Ses noms (appSettings, SETTINGS_KEY…) sont différents de ceux
   des autres fichiers JS, car tous partagent le même espace global.
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

// On complète toujours avec les valeurs par défaut,
// au cas où un réglage manque dans ce qui a été enregistré
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

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
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