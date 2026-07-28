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

// Auto-open modal if redirected from contact.html
if (sessionStorage.getItem('openContactModal') === '1') {
  sessionStorage.removeItem('openContactModal');
  document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById("sideContactForm");
    if (panel) panel.classList.add("active");
  });
}

// FORM CONTACT //

const contactBtn = document.querySelectorAll(
  ".contact-btn , .contact-btn-mobile, .footer-contact-btn, .contact-btn-mobile-sticky, .side-menu-cta, .cta-final-btn, .nh-cta-btn"
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
    if (isAnimating) return;
    if (newIdx === currentIdx) return;

    isAnimating = true;
    const currentImg = images[currentIdx];
    const newImg = images[newIdx];

    // S'assure que newImg est à sa position "ready" (droite, invisible) sans animation
    // au cas où elle aurait un état résiduel.
    newImg.classList.add("no-transition");
    newImg.classList.remove("active", "past");
    void newImg.offsetWidth; // force reflow
    newImg.classList.remove("no-transition");

    // Lance la transition : newImg entre (droite → centre), currentImg sort (centre → gauche)
    newImg.classList.add("active");
    if (currentImg && currentImg !== newImg) {
      currentImg.classList.remove("active");
      currentImg.classList.add("past");
    }

    // Après la transition (1s), remet currentImg à droite sans animation
    setTimeout(() => {
      if (currentImg && currentImg !== newImg) {
        currentImg.classList.add("no-transition");
        currentImg.classList.remove("past");
        void currentImg.offsetWidth;
        currentImg.classList.remove("no-transition");
      }
      isAnimating = false;
    }, 1100);

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
        // Le hero est une vraie <img> depuis le passage LCP (découverte au parsing
        // + preload) : on change son src. La branche background reste pour tout
        // hero qui serait encore un <div>.
        if (el.tagName === "IMG") {
          el.src = path;
        } else {
          const url = path.startsWith("http") ? path : new URL(path, window.location.href).href;
          el.style.backgroundImage = `url(${url})`;
        }
        el.style.opacity = 1;
      }, fadeDuration);
    }, 10000);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeroSlides);
} else {
  initHeroSlides();
}
