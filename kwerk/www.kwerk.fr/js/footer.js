// Attendre que le DOM soit complètement chargé
document.addEventListener("DOMContentLoaded", () => {
  const cols = document.querySelectorAll(".footer-nav-col");

  // Fonction pour masquer tous les liens et désactiver tous les titres
  function hideAllLinks() {
    cols.forEach((col) => {
      const links = col.querySelector(".footer-nav-links");
      const title = col.querySelector(".footer-nav-title");
      if (links) links.classList.remove("show");
      if (title) title.classList.remove("active");
    });
  }

  // Fonction pour afficher les liens d'une colonne spécifique
  function showLinks(targetCol) {
    const links = targetCol.querySelector(".footer-nav-links");
    const title = targetCol.querySelector(".footer-nav-title");

    if (links && title) {
      hideAllLinks(); // Masquer tous les autres d'abord
      links.classList.add("show");
      title.classList.add("active");
    }
  }

  // Ajouter les event listeners pour chaque colonne
  cols.forEach((col) => {
    const title = col.querySelector(".footer-nav-title");
    const links = col.querySelector(".footer-nav-links");

    // Seulement pour les colonnes qui ont des liens
    if (title && links) {
      // Survol du titre
      title.addEventListener("mouseenter", () => {
        showLinks(col);
      });

      // Survol des liens (pour maintenir l'affichage)
      links.addEventListener("mouseenter", () => {
        showLinks(col);
      });

      // Optionnel: masquer quand on quitte la colonne
      col.addEventListener("mouseleave", () => {
        // Décommentez ces lignes si vous voulez masquer au départ de la souris
        // setTimeout(() => {
        //   links.classList.remove("show");
        //   title.classList.remove("active");
        // }, 100);
      });
    }
  });

  // Initialisation : afficher la première colonne avec des liens par défaut
  const firstColWithLinks = Array.from(cols).find((col) =>
    col.querySelector(".footer-nav-links")
  );

  if (firstColWithLinks) {
    showLinks(firstColWithLinks);
  }
});
