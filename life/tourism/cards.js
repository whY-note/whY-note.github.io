/* Fit each bilingual name as one line, keeping both languages at one size. */
(() => {
  const titles = [...document.querySelectorAll(".place-card-copy strong")];
  if (!titles.length) return;

  function fitNames() {
    titles.forEach((title) => {
      // Start at the normal size again when a card becomes wider.
      title.style.fontSize = "";
      const available = title.clientWidth;
      const fullWidth = title.scrollWidth;
      if (available > 0 && fullWidth > available) {
        const normalSize = parseFloat(getComputedStyle(title).fontSize);
        const fittedSize = Math.floor(normalSize * (available - 1) / fullWidth * 100) / 100;
        title.style.fontSize = `${fittedSize}px`;
      }
    });
  }

  let pending = false;
  function scheduleFit() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; fitNames(); });
  }

  fitNames();
  document.fonts?.ready.then(scheduleFit);
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(scheduleFit);
    titles.forEach((title) => observer.observe(title.closest(".place-card")));
  } else {
    window.addEventListener("resize", scheduleFit);
  }
})();
