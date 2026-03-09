const carousel = document.getElementById("univers-carousel");
const slides = Array.from(carousel.children);

// On duplique tout le contenu pour l’effet seamless
slides.forEach((slide) => {
  const clone = slide.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  carousel.appendChild(clone);
});

let scrollStep = 1; // px à chaque tick
let interval = 12; // ms entre chaque tick
let totalWidth = 0;

// Calculer la largeur d’un “tour complet”
for (let i = 0; i < slides.length; i++) {
  totalWidth +=
    slides[i].offsetWidth + parseInt(getComputedStyle(carousel).gap || 0);
}

function autoScroll() {
  carousel.scrollLeft += scrollStep;
  // Si on a fait un tour complet sur la 1ère “moitié”, on revient au début “en avance”
  if (carousel.scrollLeft >= totalWidth) {
    carousel.scrollLeft -= totalWidth;
  }
}

let timer = setInterval(autoScroll, interval);

// Ajuste la largeur au resize (utile si responsive/gap change)
window.addEventListener("resize", () => {
  totalWidth = 0;
  for (let i = 0; i < slides.length; i++) {
    totalWidth +=
      slides[i].offsetWidth + parseInt(getComputedStyle(carousel).gap || 0);
  }
});
