document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("pageLoader");
  const progress = document.getElementById("progressBar");
  if (!loader || !progress) return;

  let width = 0;
  const timer = setInterval(() => {
    width += 25;
    if (width > 100) width = 100;
    progress.style.width = width + "%";
    if (width === 100) {
      clearInterval(timer);
      setTimeout(() => {
        loader.classList.add("hidden");
      }, 150);
    }
  }, 80);

  window.addEventListener("load", () => {
    width = 100;
    progress.style.width = "100%";
    setTimeout(() => {
      loader.classList.add("hidden");
    }, 150);
  });
});
