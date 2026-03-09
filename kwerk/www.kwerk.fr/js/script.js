// Ouverture/fermeture du menu latéral
const burger = document.querySelector(".menu-icon");
const sideMenu = document.getElementById("sideMenu");
const closeBtn = document.getElementById("closeMenu");

// Tous les sous-menus (extension à droite)
const allSubmenus = document.querySelectorAll(".submenu-panel");

// Tous les liens du menu principal
const menuLinks = document.querySelectorAll(".side-menu-links li");

// Helper pour fermer tous les sous-menus
function closeAllSubmenus() {
  allSubmenus.forEach((sm) => sm.classList.remove("active"));
  document.querySelector(".side-menu-links").classList.remove("inactive");
  menuLinks.forEach((li) => li.classList.remove("active"));
}

// Ouvre le menu latéral
burger.addEventListener("click", (e) => {
  e.stopPropagation();
  sideMenu.classList.add("active");
  closeAllSubmenus();
});

// Ferme le menu latéral + sous-menus
closeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  sideMenu.classList.remove("active");
  closeAllSubmenus();
});

// Ouvre un sous-menu (extension a droite)
menuLinks.forEach((li, idx) => {
  li.addEventListener("click", function (e) {
    const targetId = this.dataset.submenu;
    if (!targetId) return; // Ignore si pas de sous-menu

    // Ferme tous les sous-menus d'abord
    closeAllSubmenus();

    // Marque ce lien comme actif et grise les autres
    this.classList.add("active");
    document.querySelector(".side-menu-links").classList.add("inactive");

    // Affiche le bon sous-menu via l'id cible
    const panel = document.getElementById(targetId);
    if (panel) panel.classList.add("active");
  });
});

// Ferme les sous-menus si on clique à l'extérieur du menu
window.addEventListener("click", function (e) {
  if (
    sideMenu.classList.contains("active") &&
    !sideMenu.contains(e.target) &&
    !e.target.classList.contains("submenu-panel") &&
    !e.target.closest(".submenu-panel")
  ) {
    sideMenu.classList.remove("active");
    closeAllSubmenus();
  }
});

// (Optionnel) Ferme le sous-menu si on clique dessus (par exemple sur le fond ou un bouton retour)
// document.querySelectorAll('.submenu-panel').forEach(panel => {
//   panel.addEventListener('click', function(e) {
//     // Si tu veux fermer au clic à l'intérieur du sous-menu, décommente ce bloc
//     // closeAllSubmenus();
//   });
// });

// FORM CONTACT //

const contactBtn = document.querySelectorAll(
  ".contact-btn , .contact-btn-mobile, .footer-contact-btn, .contact-btn-mobile-sticky"
);
const contactFormPanel = document.getElementById("sideContactForm");
const closeContactFormBtn = document.getElementById("closeContactForm");

// Ouvre le contact form, ferme le menu/sous-menu si ouvert
contactBtn.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    // Ferme menu et sous-menus si ouvert
    document.getElementById("sideMenu").classList.remove("active");
    document
      .querySelectorAll(".submenu-panel")
      .forEach((sm) => sm.classList.remove("active"));
    document.querySelector(".side-menu-links").classList.remove("inactive");
    document
      .querySelectorAll(".side-menu-links li")
      .forEach((li) => li.classList.remove("active"));
    // Affiche le contact form
    contactFormPanel.classList.add("active");
  });
});

// Ferme le contact form
closeContactFormBtn.addEventListener("click", (e) => {
  e.preventDefault();
  contactFormPanel.classList.remove("active");
});
document.querySelectorAll(".close-submenu").forEach(function (btn) {
  btn.addEventListener("click", function () {
    // Trouve le parent .submenu-panel et le ferme
    btn.closest(".submenu-panel").classList.remove("active");
  });
});

document.querySelectorAll(".carousel-img").forEach(function (carousel) {
  const images = carousel.querySelectorAll("img");
  let currentIdx = 0;
  let timer = null;
  let isAnimating = false;

  function show(newIdx) {
    if (isAnimating) return; // Évite les conflits d'animation

    isAnimating = true;
    const currentImg = images[currentIdx];
    const newImg = images[newIdx];

    // Retire toutes les classes
    images.forEach((img) => {
      img.classList.remove("active", "previous", "entering", "exiting");
    });

    // Nouvelle image entre depuis la droite
    newImg.classList.add("entering");

    // Attendre que l'image soit arrivée au centre (25% de 2s = 0.5s)
    setTimeout(() => {
      // Image actuelle sort vers la gauche
      if (currentImg) {
        currentImg.classList.add("exiting");
      }
    }, 500); // L'image précédente commence à sortir quand la nouvelle arrive

    // Après les animations complètes
    setTimeout(() => {
      images.forEach((img) => {
        img.classList.remove("entering", "exiting");
      });
      newImg.classList.add("active");
      if (currentImg) {
        currentImg.classList.add("previous");
      }
      isAnimating = false;
    }, 2500); // 2s pour l'entrée + 0.5s de marge

    currentIdx = newIdx;
  }

  function next() {
    const nextIdx = (currentIdx + 1) % images.length;
    show(nextIdx);
  }

  // Initialisation
  images[0].classList.add("active");

  // Timing ajusté : 2s d'entrée + 3s de pause + 1s de sortie = cycle de 6s
  timer = setInterval(next, 6000);

  // Pause au hover
  carousel.addEventListener("mouseenter", () => {
    clearInterval(timer);
  });

  carousel.addEventListener("mouseleave", () => {
    if (!isAnimating) {
      timer = setInterval(next, 6000);
    }
  });
});

// Scroll avec drag and drop pour la section adresses - Version corrigée avec pagination fonctionnelle
function initAdressesCarousel() {
  const carousels = document.querySelectorAll(".adresses-cards-wrap");
  if (!carousels.length) {
    console.warn("Aucun carrousel adresses trouvé");
    return;
  }

  carousels.forEach((wrap) => {
    const adressesCards = wrap.querySelector(".adresses-cards");
    const paginationDot = wrap.querySelector(".adresses-pagination-dot");
    const paginationLine = wrap.querySelector(".adresses-pagination-line");

    if (!adressesCards || !paginationDot || !paginationLine) return;

    let isDown = false;
    let startX;
    let scrollLeft;
    let startMouseX;
    let hasMoved = false;
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    let maxScroll = 0;
    let dotWidth = 0;

    function initPagination() {
      maxScroll = adressesCards.scrollWidth - adressesCards.clientWidth;
      dotWidth = paginationLine.clientWidth - paginationDot.clientWidth;
    }

    function updatePagination() {
      if (maxScroll <= 0) {
        initPagination();
      }

      if (maxScroll > 0 && paginationDot) {
        const scrollPercent = Math.min(adressesCards.scrollLeft / maxScroll, 1);
        const dotPosition = scrollPercent * dotWidth;
        paginationDot.style.left = `${Math.max(0, dotPosition)}px`;
      }
    }

    function setupCarousel() {
      initPagination();
      updatePagination();

      let resizeTimeout;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          initPagination();
          updatePagination();
        }, 250);
      });

      if (isMobile) {
        adressesCards.addEventListener("scroll", updatePagination, {
          passive: true,
        });
        adressesCards.style.scrollBehavior = "smooth";
        adressesCards.style.webkitOverflowScrolling = "touch";
        adressesCards.style.overscrollBehaviorX = "contain";
      } else {
        let suppressClick = false;

        adressesCards.addEventListener("mousedown", (e) => {
          isDown = true;
          hasMoved = false;
          suppressClick = false;
          startX = e.pageX - adressesCards.offsetLeft;
          scrollLeft = adressesCards.scrollLeft;
          startMouseX = e.pageX;
          e.preventDefault();
        });

        document.addEventListener("mouseleave", () => {
          isDown = false;
          adressesCards.classList.remove("dragging");
        });

        document.addEventListener("mouseup", () => {
          isDown = false;
          adressesCards.classList.remove("dragging");
          hasMoved = false;
        });

        document.addEventListener("mousemove", (e) => {
          if (!isDown) return;
          const x = e.pageX - adressesCards.offsetLeft;
          const walk = (x - startX) * 1.5;
          adressesCards.scrollLeft = scrollLeft - walk;
          if (Math.abs(e.pageX - startMouseX) > 5) {
            hasMoved = true;
            adressesCards.classList.add("dragging");
            e.preventDefault();
            suppressClick = true;
          }
          updatePagination();
        });

        adressesCards.addEventListener("scroll", updatePagination, {
          passive: true,
        });

        adressesCards.addEventListener(
          "click",
          (e) => {
            if (suppressClick) {
              e.preventDefault();
              e.stopPropagation();
              suppressClick = false;
            }
          },
          true
        );
      }
    }

    setupCarousel();

    window.addEventListener("load", () => {
      setTimeout(() => {
        initPagination();
        updatePagination();
      }, 100);
    });

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        initPagination();
        updatePagination();
      });
      resizeObserver.observe(adressesCards);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdressesCarousel);
} else {
  initAdressesCarousel();
}

function initHeroSlides() {
  const heroes = document.querySelectorAll(".hero-slideshow[data-hero-slides]");
  heroes.forEach((el) => {
    const raw = el.dataset.heroSlides || "";
    const slides = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (slides.length < 2) return;

    let idx = 0;
    const fadeDuration = 600;
    el.style.opacity = 1;
    setInterval(() => {
      el.style.opacity = 0;
      setTimeout(() => {
        idx = (idx + 1) % slides.length;
        const path = slides[idx];
        const url = path.startsWith("http") ? path : `/${path}`;
        el.style.backgroundImage = `url(${url})`;
        el.style.opacity = 1;
      }, fadeDuration);
    }, 7000);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeroSlides);
} else {
  initHeroSlides();
}
