/* =========================================================
   DONNÉES
   Les dépenses sont enregistrées dans le localStorage du
   navigateur : elles restent après fermeture de la page.
   ========================================================= */
const STORAGE_KEY = 'monbudget-depenses';

const CATEGORIES = {
  logement: 'Logement',
  alimentation: 'Alimentation',
  etudes: 'Études',
  transport: 'Transport',
  loisirs: 'Loisirs',
  divers: 'Divers',
};

function loadExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return []; // données illisibles : on repart de zéro plutôt que de planter
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

let expenses = loadExpenses();
let editingId = null; // dépense en cours de modification (utilisé à l'étape 7)

/* =========================================================
   OUTILS
   ========================================================= */
const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// Date du jour au format AAAA-MM-JJ, à l'heure locale (et non UTC)
function today() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function formatDate(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('fr-FR');
}

// Empêche qu'une description contenant du HTML soit interprétée par la page
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* =========================================================
   ÉLÉMENTS DE LA PAGE
   ========================================================= */
const form = document.getElementById('expense-form');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const descriptionInput = document.getElementById('description');
const errorText = document.getElementById('form-error');
const submitBtn = document.getElementById('submit-btn');
const list = document.getElementById('expense-list');
const emptyState = document.getElementById('empty-state');

dateInput.value = today();

/* =========================================================
   AFFICHAGE
   Chaque étape suivante ajoute sa fonction dans "renderers"
   (et ses filtres dans "filters") : render() les appelle toutes.
   ========================================================= */
const renderers = [];
const filters = [];

function render() {
  renderers.forEach((fn) => fn());
}

function getVisibleExpenses() {
  return filters
    .reduce((result, keep) => result.filter(keep), [...expenses])
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function renderList() {
  const visible = getVisibleExpenses();

  list.innerHTML = visible.map((expense, index) => `
    <tr data-id="${expense.id}" style="animation-delay: ${index * 40}ms">
      <td>${formatDate(expense.date)}</td>
      <td>${escapeHTML(expense.description || '—')}</td>
      <td>
        <span class="badge">
          <span class="dot ${expense.category}"></span>${CATEGORIES[expense.category]}
        </span>
      </td>
      <td class="right amount">${euro.format(expense.amount)}</td>
      <td class="right">
        <div class="actions">
          <button type="button" class="icon-btn edit">Modifier</button>
          <button type="button" class="icon-btn delete">Supprimer</button>
        </div>
      </td>
    </tr>
  `).join('');

  emptyState.hidden = visible.length > 0;
  emptyState.textContent = expenses.length
    ? 'Aucune dépense ne correspond à vos filtres.'
    : 'Aucune dépense pour le moment. Ajoutez-en une ci-dessus !';
}

renderers.push(renderList);

/* =========================================================
   FORMULAIRE
   ========================================================= */
function showError(message, field) {
  errorText.textContent = message;
  field.classList.remove('invalid');
  void field.offsetWidth; // force le navigateur à rejouer l'animation de tremblement
  field.classList.add('invalid');
  field.focus();
}

function clearErrors() {
  errorText.textContent = '';
  form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
}

form.addEventListener('submit', (event) => {
  event.preventDefault(); // empêche le rechargement de la page
  clearErrors();

  const amount = Number(amountInput.value);
  if (!amountInput.value || !Number.isFinite(amount) || amount <= 0) {
    return showError('Entrez un montant supérieur à 0.', amountInput);
  }
  if (!CATEGORIES[categoryInput.value]) {
    return showError('Choisissez une catégorie.', categoryInput);
  }
  if (!dateInput.value) {
    return showError('Choisissez une date.', dateInput);
  }

  const data = {
    amount: Math.round(amount * 100) / 100,
    category: categoryInput.value,
    date: dateInput.value,
    description: descriptionInput.value.trim(),
  };

  if (editingId) {
    expenses = expenses.map((e) => (e.id === editingId ? { ...e, ...data } : e));
    stopEditing(); // défini à l'étape 7
  } else {
    expenses.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: Date.now(),
      ...data,
    });
  }

  saveExpenses();
  form.reset();
  dateInput.value = today();
  render();
});

// Le premier affichage attend que tout le fichier soit lu,
// pour inclure les fonctions ajoutées aux étapes suivantes
document.addEventListener('DOMContentLoaded', render);