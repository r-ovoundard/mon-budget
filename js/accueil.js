/* =========================================================
   TABLEAU DE BORD
   Applique la répartition choisie dans les Paramètres
   à la barre et à la légende.
   ========================================================= */
const recommendedSplit = appSettings.recommended;

function categoryOf(element) {
  return Object.keys(recommendedSplit).find((key) => element.classList.contains(key));
}

document.querySelectorAll('.budget-bar .seg').forEach((seg) => {
  const value = recommendedSplit[categoryOf(seg)];
  seg.style.width = `${value}%`;
  seg.textContent = `${value} %`;
  seg.style.display = value === 0 ? 'none' : ''; // une catégorie à 0 % disparaît de la barre
});

document.querySelectorAll('.legend li').forEach((item) => {
  const value = recommendedSplit[categoryOf(item.querySelector('.dot'))];
  item.querySelector('em').textContent = `(${value} %)`;
});