/* =========================================================
   PAGE CONDITIONS D'UTILISATION
   ========================================================= */

/* ---------- Barre de progression de lecture ---------- */
const progressBar = document.getElementById('reading-progress');

function updateProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 1;
  progressBar.style.setProperty('--progress', progress.toFixed(4));
}

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();

/* ---------- Sections qui apparaissent au défilement ----------
   IntersectionObserver : le navigateur nous prévient quand
   un élément entre dans l'écran (sans calcul de notre part) */
const legalContent = document.querySelector('.legal-content');
const legalSections = legalContent.querySelectorAll('section');
const tocLinks = document.querySelectorAll('.toc a');

legalContent.classList.add('reveal-ready');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target); // une seule fois suffit
    }
  });
}, { threshold: 0.12 });

legalSections.forEach((section) => revealObserver.observe(section));

/* ---------- Sommaire : la partie en cours de lecture s'allume ----------
   rootMargin : on ne regarde qu'une bande au milieu de l'écran */
const spyObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      tocLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

legalSections.forEach((section) => spyObserver.observe(section));