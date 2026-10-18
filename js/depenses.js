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
/* =========================================================
   RÉSUMÉ DU MOIS
   ========================================================= */
const statTotal = document.getElementById('stat-total');
const statCount = document.getElementById('stat-count');
const statTop = document.getElementById('stat-top');

function currentMonth() {
  return today().slice(0, 7); // AAAA-MM
}

// Met à jour un chiffre et joue l'animation "rebond" s'il a changé
function setStat(element, value) {
  if (element.textContent === value) return;
  element.textContent = value;
  element.classList.remove('bump');
  void element.offsetWidth;
  element.classList.add('bump');
}

function renderSummary() {
  const month = currentMonth();
  const ofMonth = expenses.filter((e) => e.date.startsWith(month));
  const total = ofMonth.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = {};
  for (const e of ofMonth) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }
  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  setStat(statTotal, euro.format(total));
  setStat(statCount, String(ofMonth.length));
  setStat(statTop, top ? CATEGORIES[top[0]] : '—');
}

renderers.push(renderSummary);
/* =========================================================
   MODIFIER ET SUPPRIMER
   Un seul écouteur sur le tableau gère tous les boutons,
   même ceux des lignes créées plus tard.
   ========================================================= */
function startEditing(id) {
  const expense = expenses.find((e) => e.id === id);
  if (!expense) return;

  editingId = id;
  amountInput.value = expense.amount;
  categoryInput.value = expense.category;
  dateInput.value = expense.date;
  descriptionInput.value = expense.description;
  submitBtn.textContent = 'Enregistrer';
  form.classList.add('is-editing');
  clearErrors();

  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  amountInput.focus({ preventScroll: true });
}

function stopEditing() {
  editingId = null;
  submitBtn.textContent = 'Ajouter';
  form.classList.remove('is-editing');
}

list.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const row = button.closest('tr');
  const id = row.dataset.id;

  if (button.classList.contains('edit')) {
    startEditing(id);
  }

  if (button.classList.contains('delete')) {
    if (!confirm('Supprimer cette dépense ?')) return;
    if (editingId === id) {
      stopEditing();
      form.reset();
      dateInput.value = today();
    }
    // On attend la fin de l'animation avant de retirer la dépense
    row.classList.add('removing');
    row.addEventListener('animationend', () => {
      expenses = expenses.filter((e) => e.id !== id);
      saveExpenses();
      render();
    }, { once: true });
  }
});

// Échap annule la modification en cours
form.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && editingId) {
    stopEditing();
    form.reset();
    dateInput.value = today();
    clearErrors();
  }
});
/* =========================================================
   FILTRES ET RECHERCHE
   ========================================================= */
const filterMonth = document.getElementById('filter-month');
const filterCategory = document.getElementById('filter-category');
const filterSearch = document.getElementById('filter-search');

filterMonth.value = currentMonth(); // par défaut : le mois en cours

filters.push(
  (e) => !filterMonth.value || e.date.startsWith(filterMonth.value),
  (e) => !filterCategory.value || e.category === filterCategory.value,
  (e) => e.description.toLowerCase().includes(filterSearch.value.trim().toLowerCase()),
);

filterMonth.addEventListener('change', renderList);
filterCategory.addEventListener('change', renderList);
filterSearch.addEventListener('input', renderList); // filtre à chaque lettre tapée