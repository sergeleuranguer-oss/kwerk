document.addEventListener("DOMContentLoaded", function () {
  const navbar = document.querySelector(".navbar");

  
  function handleScroll() {
    const scrolled = window.scrollY > 10;

    //console.log("isMobile:", isMobile());
    //console.log("scrollY:", window.scrollY);
    //console.log("scrolled:", scrolled);

    if (navbar) {
      navbar.classList.toggle("sticky-navbar", scrolled);
    }

    // Même seuil pour le CTA sticky mobile : sur les pages à hero plein écran,
    // il reste masqué à l'arrivée (cf. .sticky-btn-contact dans footer.css).
    document.body.classList.toggle("is-scrolled", scrolled);
  }

  // 👇 Ajout du listener principal
  window.addEventListener("scroll", handleScroll);

  // 👇 Si resize entre mobile / desktop
  window.addEventListener("resize", handleScroll);

  // 👇 Appel initial pour état de départ
  handleScroll();
});



