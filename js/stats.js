/* =========================================================
   DONNÉES
   On lit les dépenses enregistrées par la page Dépenses.
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

// Répartition conseillée, la même que sur le tableau de bord (en %)
const RECOMMENDED = {
  logement: 45,
  alimentation: 20,
  etudes: 10,
  transport: 5,
  loisirs: 10,
  divers: 10,
};

function loadExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

const expenses = loadExpenses();

/* =========================================================
   OUTILS
   ========================================================= */
const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function today() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function currentMonth() {
  return today().slice(0, 7); // AAAA-MM
}

// Décale un mois "AAAA-MM" de n mois (ex : -1 = mois précédent)
function shiftMonth(month, n) {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1 + n, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(month) {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m, 0).getDate();
}

function expensesOf(month) {
  return expenses.filter((e) => e.date.startsWith(month));
}

function sum(list) {
  return list.reduce((total, e) => total + e.amount, 0);
}

// Lit une couleur définie dans le CSS, pour que les graphiques suivent la palette
const rootStyle = getComputedStyle(document.documentElement);
function color(name) {
  return rootStyle.getPropertyValue(`--${name}`).trim();
}

/* =========================================================
   COMPTEUR ANIMÉ
   Fait défiler un nombre de sa valeur actuelle vers la nouvelle.
   ========================================================= */
const runningCounters = new WeakMap();

function countUp(element, target, format) {
  cancelAnimationFrame(runningCounters.get(element));
  const start = Number(element.dataset.value) || 0;
  element.dataset.value = target;

  if (reduceMotion) {
    element.textContent = format(target);
    return;
  }

  const duration = 900;
  const startTime = performance.now();

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ralentit en fin de course
    element.textContent = format(start + (target - start) * eased);
    if (progress < 1) runningCounters.set(element, requestAnimationFrame(frame));
  }

  runningCounters.set(element, requestAnimationFrame(frame));
}

function setText(element, text) {
  cancelAnimationFrame(runningCounters.get(element));
  element.dataset.value = 0;
  element.textContent = text;
}

/* =========================================================
   AFFICHAGE
   Chaque étape ajoute sa fonction dans "renderers" ;
   render() les appelle toutes avec le mois choisi.
   ========================================================= */
const periodInput = document.getElementById('period');
periodInput.value = currentMonth();

const renderers = [];

function render() {
  const month = periodInput.value || currentMonth();
  renderers.forEach((fn) => fn(month));
}

periodInput.addEventListener('change', render);

/* =========================================================
   INDICATEURS
   ========================================================= */
const kpiTotal = document.getElementById('kpi-total');
const kpiAverage = document.getElementById('kpi-average');
const kpiTrend = document.getElementById('kpi-trend');
const kpiBiggest = document.getElementById('kpi-biggest');
const kpiBiggestLabel = document.getElementById('kpi-biggest-label');

function renderKpis(month) {
  const current = expensesOf(month);
  const total = sum(current);
  const previousTotal = sum(expensesOf(shiftMonth(month, -1)));

  // Moyenne : sur les jours déjà passés pour le mois en cours, sur tout le mois sinon
  const days = month === currentMonth() ? Number(today().slice(8, 10)) : daysInMonth(month);

  countUp(kpiTotal, total, euro.format);
  countUp(kpiAverage, total / days, euro.format);

  if (previousTotal > 0) {
    const change = Math.round(((total - previousTotal) / previousTotal) * 100);
    kpiTrend.textContent = change >= 0 ? `▲ +${change} %` : `▼ ${change} %`;
    kpiTrend.className = `kpi-value ${change > 0 ? 'trend-up' : 'trend-down'}`;
  } else {
    kpiTrend.textContent = '—';
    kpiTrend.className = 'kpi-value';
  }

  const biggest = current.reduce((max, e) => (!max || e.amount > max.amount ? e : max), null);
  if (biggest) {
    countUp(kpiBiggest, biggest.amount, euro.format);
    kpiBiggestLabel.textContent = biggest.description || CATEGORIES[biggest.category];
  } else {
    setText(kpiBiggest, '—');
    kpiBiggestLabel.textContent = '';
  }
}

renderers.push(renderKpis);

/* =========================================================
   HALO QUI SUIT LA SOURIS SUR LES CARTES
   ========================================================= */
document.querySelectorAll('.kpi').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--y', `${event.clientY - rect.top}px`);
  });
});

// Premier affichage une fois tout le fichier lu (y compris les étapes suivantes)
document.addEventListener('DOMContentLoaded', render);
/* =========================================================
   GRAPHIQUE EN CAMEMBERT
   ========================================================= */
Chart.defaults.color = color('text-muted');
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.animation.duration = reduceMotion ? 0 : 1200;

const categoryKeys = Object.keys(CATEGORIES);
const donutTotal = document.getElementById('donut-total');

const donutChart = new Chart(document.getElementById('donut-chart'), {
  type: 'doughnut',
  data: {
    labels: categoryKeys.map((key) => CATEGORIES[key]),
    datasets: [{
      data: categoryKeys.map(() => 0),
      backgroundColor: categoryKeys.map((key) => color(key)),
      borderColor: color('panel'), // sépare les parts avec la couleur du fond
      borderWidth: 3,
      hoverOffset: 12,             // la part survolée se détache
    }],
  },
  options: {
    maintainAspectRatio: false,
    cutout: '68%',
    animation: {
      animateRotate: true, // se dessine en tournant
      animateScale: true,  // et en grandissant depuis le centre
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: { display: false }, // le détail par catégorie sert de légende
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label} : ${euro.format(ctx.parsed)}`,
        },
      },
    },
  },
});

function renderDonut(month) {
  const current = expensesOf(month);
  donutChart.data.datasets[0].data = categoryKeys.map(
    (key) => sum(current.filter((e) => e.category === key)),
  );
  donutChart.update();
  countUp(donutTotal, sum(current), euro.format);
}

renderers.push(renderDonut);
/* =========================================================
   GRAPHIQUE EN BARRES : 6 DERNIERS MOIS
   ========================================================= */
const euroShort = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function monthLabel(month) {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
}

const barChart = new Chart(document.getElementById('bar-chart'), {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 46,
    }],
  },
  options: {
    maintainAspectRatio: false,
    animation: {
      easing: 'easeOutBack', // la barre dépasse un peu puis se pose
      // Les barres poussent l'une après l'autre
      delay: (ctx) => (ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 90 : 0),
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: color('border') },
        ticks: { callback: (value) => euroShort.format(value) },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${euro.format(ctx.parsed.y)}`,
        },
      },
    },
  },
});

function renderBars(month) {
  // Les 6 mois qui finissent par le mois choisi
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));

  barChart.data.labels = months.map(monthLabel);
  barChart.data.datasets[0].data = months.map((m) => sum(expensesOf(m)));
  // Le mois choisi en violet, les autres en bleu discret
  barChart.data.datasets[0].backgroundColor = months.map(
    (m) => (m === month ? color('accent-2') : 'rgba(79, 140, 255, 0.45)'),
  );
  barChart.update();
}

renderers.push(renderBars);