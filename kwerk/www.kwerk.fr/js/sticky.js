document.addEventListener("DOMContentLoaded", function () {
  const navbar = document.querySelector(".navbar");

  
  function handleScroll() {
    const scrolled = window.scrollY > 10;

    //console.log("isMobile:", isMobile());
    //console.log("scrollY:", window.scrollY);
    //console.log("scrolled:", scrolled);

    if (scrolled) {
      navbar.classList.add("sticky-navbar");
    } else {
      navbar.classList.remove("sticky-navbar");
    }
  }

  // 👇 Ajout du listener principal
  window.addEventListener("scroll", handleScroll);

  // 👇 Si resize entre mobile / desktop
  window.addEventListener("resize", handleScroll);

  // 👇 Appel initial pour état de départ
  handleScroll();
});



