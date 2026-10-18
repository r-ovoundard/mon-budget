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