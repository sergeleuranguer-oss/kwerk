document.addEventListener("DOMContentLoaded", function () {
  const galleryContainer = document.getElementById("gallery-container");
  const filterLinks = document.querySelectorAll(".filter-menu a");
  const btnMore = document.querySelector(".btn-more");

  const availableFilters = ["all", "messine", "madeleine", "haussmann", "saint-honore"];
  const urlFilter = new URLSearchParams(window.location.search).get("filter");
  let currentFilter = availableFilters.includes(urlFilter) ? urlFilter : "all";
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
      img.src = path;
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

  // Set initial active filter based on URL param if present
  filterLinks.forEach((link) => {
    const filter = link.getAttribute("data-filter");
    if (filter === currentFilter) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  filterLinks.forEach((link) => {
    link.addEventListener("click", () => {
      document
        .querySelector(".filter-menu .active")
        ?.classList.remove("active");
      link.classList.add("active");

      currentFilter = link.getAttribute("data-filter");
      page = 0;
      galleryContainer.innerHTML = "";
      loadImages();
    });
  });

  btnMore.addEventListener("click", loadImages);

  // Initial load
  loadImages();
});
