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