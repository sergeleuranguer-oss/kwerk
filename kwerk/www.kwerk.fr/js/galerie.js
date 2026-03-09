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

  // Mélanger les images "all" si ce n'est pas déjà fait côté PHP
  if (!images.all || images.all.length === 0) {
    images.all = shuffle([
      ...images.messine,
      ...images.madeleine,
      ...images.haussmann,
      ...images["saint-honore"],
    ]);
  }

  function renderGrid(imagesToShow) {
    const grid = document.createElement("div");
    grid.className = "gallery-grid";

    imagesToShow.forEach((src, index) => {
      const img = document.createElement("img");
      img.src = src;
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
