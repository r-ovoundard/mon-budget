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
  void toast.offsetWidth; // relance l'animation si une notification est déjà visible
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* =========================================================
   BUDGET MENSUEL
   ========================================================= */
const budgetForm = document.getElementById('budget-form');
const budgetInput = document.getElementById('budget-input');

budgetInput.value = appSettings.budget || '';

budgetForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = Number(budgetInput.value);

  if (!Number.isFinite(value) || value < 0) {
    showToast('Entrez un montant valide.', 'error');
    return;
  }

  appSettings.budget = Math.round(value * 100) / 100;
  saveSettings();
  showToast(value > 0 ? 'Budget enregistré' : 'Budget retiré');
});

/* =========================================================
   RÉPARTITION CONSEILLÉE
   ========================================================= */
const sliderRows = document.querySelectorAll('.slider-row');
const splitTotal = document.getElementById('split-total');
const splitTotalValue = document.getElementById('split-total-value');

// Met à jour la couleur de la piste et le pourcentage affiché
function updateSlider(row) {
  const input = row.querySelector('input');
  const output = row.querySelector('output');
  input.style.setProperty('--fill', `${input.value}%`);
  output.textContent = `${input.value} %`;
  output.classList.remove('tick');
  void output.offsetWidth;
  output.classList.add('tick');
}

function currentSplit() {
  const split = {};
  sliderRows.forEach((row) => {
    split[row.dataset.category] = Number(row.querySelector('input').value);
  });
  return split;
}

function updateTotal() {
  const total = Object.values(currentSplit()).reduce((a, b) => a + b, 0);
  splitTotalValue.textContent = `${total} %`;
  splitTotal.classList.toggle('invalid', total !== 100);
  return total;
}

function fillSliders(split) {
  sliderRows.forEach((row) => {
    row.querySelector('input').value = split[row.dataset.category];
    updateSlider(row);
  });
  updateTotal();
}

sliderRows.forEach((row) => {
  const input = row.querySelector('input');

  // "input" : pendant qu'on fait glisser
  input.addEventListener('input', () => {
    updateSlider(row);
    updateTotal();
  });

  // "change" : quand on relâche. On n'enregistre que si le total fait 100 %
  input.addEventListener('change', () => {
    if (updateTotal() === 100) {
      appSettings.recommended = currentSplit();
      saveSettings();
      showToast('Répartition enregistrée');
    } else {
      showToast('Ajustez les curseurs pour atteindre 100 %.', 'error');
    }
  });
});

document.getElementById('split-reset').addEventListener('click', () => {
  appSettings.recommended = { ...DEFAULT_SETTINGS.recommended };
  saveSettings();
  fillSliders(appSettings.recommended);
  showToast('Répartition par défaut rétablie');
});

fillSliders(appSettings.recommended);
/* =========================================================
   COULEURS DES CATÉGORIES
   ========================================================= */
const colorInputs = document.querySelectorAll('.swatch input[type="color"]');

function fillColors() {
  colorInputs.forEach((input) => {
    input.value = appSettings.colors[input.dataset.category];
  });
}

colorInputs.forEach((input) => {
  // "input" : la page change de couleur en direct pendant qu'on choisit
  input.addEventListener('input', () => {
    appSettings.colors[input.dataset.category] = input.value;
    applySettings();
  });

  // "change" : on enregistre quand le sélecteur se ferme
  input.addEventListener('change', () => {
    saveSettings();
    showToast('Couleur enregistrée');
  });
});

document.getElementById('colors-reset').addEventListener('click', () => {
  appSettings.colors = { ...DEFAULT_SETTINGS.colors };
  applySettings();
  saveSettings();
  fillColors();
  showToast('Couleurs par défaut rétablies');
});

fillColors();

/* =========================================================
   ANIMATIONS
   ========================================================= */
const animationsToggle = document.getElementById('animations-toggle');
animationsToggle.checked = appSettings.animations;

animationsToggle.addEventListener('change', () => {
  appSettings.animations = animationsToggle.checked;
  applySettings();
  saveSettings();
  showToast(appSettings.animations ? 'Animations activées' : 'Animations réduites');
});
/* =========================================================
   DONNÉES : EXPORT, IMPORT, EFFACEMENT
   ========================================================= */
const EXPENSES_KEY = 'monbudget-depenses'; // même clé que la page Dépenses

function readExpenses() {
  try {
    const data = JSON.parse(localStorage.getItem(EXPENSES_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// --- Export : un fichier .json avec les dépenses ET les paramètres
document.getElementById('export-json').addEventListener('click', () => {
  const backup = {
    app: 'MonBudget',
    exportedAt: new Date().toISOString(),
    expenses: readExpenses(),
    settings: appSettings,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `monbudget-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  showToast('Sauvegarde téléchargée');
});

// --- Import : on vérifie le fichier avant de remplacer quoi que ce soit
const importInput = document.getElementById('import-json');

importInput.addEventListener('change', async () => {
  const file = importInput.files[0];
  if (!file) return;

  try {
    const backup = JSON.parse(await file.text());
    const valid = Array.isArray(backup.expenses) && backup.expenses.every(
      (e) => e && typeof e.id === 'string' && typeof e.date === 'string' && Number.isFinite(e.amount),
    );
    if (!valid) throw new Error('Format invalide');

    localStorage.setItem(EXPENSES_KEY, JSON.stringify(backup.expenses));

    if (backup.settings) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings));
      Object.assign(appSettings, loadSettings()); // complète avec les valeurs par défaut
      applySettings();
      budgetInput.value = appSettings.budget || '';
      fillSliders(appSettings.recommended);
      fillColors();
      animationsToggle.checked = appSettings.animations;
    }

    showToast(`${backup.expenses.length} dépense(s) importée(s)`);
  } catch {
    showToast('Fichier invalide : choisissez une sauvegarde MonBudget.', 'error');
  }

  importInput.value = ''; // permet de réimporter le même fichier
});

// --- Effacement : avec la fenêtre de confirmation
const confirmDialog = document.getElementById('confirm-dialog');

document.getElementById('clear-data').addEventListener('click', () => {
  confirmDialog.returnValue = ''; // évite de réutiliser la réponse précédente
  confirmDialog.showModal();
});

// Un clic sur le fond flouté ferme la fenêtre
confirmDialog.addEventListener('click', (event) => {
  if (event.target === confirmDialog) confirmDialog.close('cancel');
});

confirmDialog.addEventListener('close', () => {
  if (confirmDialog.returnValue !== 'confirm') return;
  localStorage.removeItem(EXPENSES_KEY);
  showToast('Toutes les dépenses ont été effacées');
});