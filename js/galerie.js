document.addEventListener("DOMContentLoaded", function () {
  const galleryContainer = document.getElementById("gallery-container");
  const filterLinks = document.querySelectorAll(".filter-menu a");
  const btnMore = document.querySelector(".btn-more");

  // Les chemins d'images sont fournis en absolu (/images/...) puis rendus
  // relatifs (on retire le "/"). Une page EN vit dans /en/, il faut donc
  // remonter d'un cran. Marche en preprod (/kwerk/en/...) comme en prod (/en/...).
  const base = window.location.pathname.includes("/en/") ? "../" : "";

  const availableFilters = ["all", "messine", "madeleine", "saint-honore"];

  // Le filtre voyage dans le hash : galerie.html#madeleine. Une seule page, une
  // URL partageable par adresse, et rien à recharger. L'ancien ?filter= reste lu
  // en secours (liens externes, favoris, pages galerie dupliquées).
  function filterFromUrl() {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, "")).toLowerCase();
    if (availableFilters.includes(hash)) return hash;
    const legacy = new URLSearchParams(window.location.search).get("filter");
    return availableFilters.includes(legacy) ? legacy : "all";
  }

  let currentFilter = filterFromUrl();
  let page = 0;
  const limit = 7;

  function shuffle(array) {
    let currentIndex = array.length,
      randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
    return array;
  }

  // "all" reconstruit automatiquement à partir de toutes les adresses présentes
  // (robuste : pas de clé en dur ; ignore une adresse absente comme haussmann).
  if (!images.all || images.all.length === 0) {
    images.all = shuffle(
      Object.keys(images)
        .filter((k) => k !== "all")
        .reduce((acc, k) => acc.concat(images[k] || []), [])
    );
  }

  function renderGrid(imagesToShow) {
    const grid = document.createElement("div");
    // Lot complet (7) = mosaïque ; lot incomplet = compo dédiée selon le nombre d'images
    grid.className = "gallery-grid" + (imagesToShow.length < 7 ? " gallery-grid--n" + imagesToShow.length : "");

    imagesToShow.forEach((src, index) => {
      const img = document.createElement("img");
      let path = src.startsWith('#') ? src.slice(1) : src;
      if (path.startsWith('/')) path = path.slice(1);
      img.src = base + path;
      img.className = "item-" + ((index % 7) + 1);
      grid.appendChild(img);
    });

    galleryContainer.appendChild(grid);
  }

  function updateBtnMore() {
    const list = images[currentFilter] || [];
    const nextStart = page * limit;
    btnMore.style.display = nextStart >= list.length ? "none" : "";
  }

  function loadImages() {
    const start = page * limit;
    const end = start + limit;
    const list = images[currentFilter] || [];
    const batch = list.slice(start, end);

    if (batch.length > 0) {
      renderGrid(batch);
      page++;
    }
    updateBtnMore();
  }

  function markActive(filter) {
    filterLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-filter") === filter);
    });
  }

  // writeUrl : au clic on inscrit le filtre dans l'URL ; au hashchange non (l'URL
  // est déjà à jour). replaceState plutôt que pushState pour ne pas transformer
  // le bouton Retour en historique de filtres.
  function applyFilter(filter, writeUrl) {
    currentFilter = filter;
    page = 0;
    galleryContainer.innerHTML = "";
    markActive(filter);
    if (writeUrl) {
      // "all" = état par défaut : pas d'ancre, l'URL canonique reste nue.
      const url = filter === "all"
        ? window.location.pathname + window.location.search
        : "#" + filter;
      // replaceState lève une SecurityError si la page est ouverte en file:// —
      // le filtre doit continuer de marcher, seule l'URL ne suit pas.
      try { history.replaceState(null, "", url); } catch (e) {}
    }
    loadImages();
  }

  markActive(currentFilter);

  filterLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      applyFilter(link.getAttribute("data-filter"), true);
    });
  });

  // Lien entrant vers #madeleine, bouton Retour, ou URL éditée à la main.
  window.addEventListener("hashchange", () => {
    const filter = filterFromUrl();
    if (filter !== currentFilter) applyFilter(filter, false);
  });

  btnMore.addEventListener("click", loadImages);

  // Initial load
  loadImages();
});
