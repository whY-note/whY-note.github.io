/*
 * Replace each "#" with the real page URL when that page is ready.
 * Relative paths, absolute paths, and external https:// URLs are supported.
 */
const ROOM_LINKS = {
  worldMap: "#",
  notes: "/life/kl-divergence/",
  travelAlbum: "#",
  reflection: "#",
  music: "#"
};

(function initialiseRoomLinks() {
  const toast = document.getElementById("link-toast");
  let toastTimer;

  function showPlaceholderMessage(label) {
    if (!toast) return;
    toast.textContent = `${label} 的链接已预留，可在 life/script.js 中配置。`;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  document.querySelectorAll("[data-room-link]").forEach((link) => {
    const key = link.dataset.roomLink;
    const target = ROOM_LINKS[key] || "#";
    link.href = target;

    link.addEventListener("click", (event) => {
      if (target === "#") {
        event.preventDefault();
        showPlaceholderMessage(link.getAttribute("aria-label") || key);
      }

      if (key === "music") {
        link.classList.toggle("is-playing");
      }
    });
  });
})();

(function scaleRoomToViewport() {
  const room = document.getElementById("room");
  const wrap = document.getElementById("scene-wrap");
  if (!room || !wrap) return;

  const ROOM_WIDTH = 1440;
  const ROOM_HEIGHT = 900;
  const NAV_CLEARANCE = 24;

  function scaleRoom() {
    const availableWidth = wrap.clientWidth;
    const availableHeight = Math.max(320, wrap.clientHeight - NAV_CLEARANCE);
    const scale = Math.min(availableWidth / ROOM_WIDTH, availableHeight / ROOM_HEIGHT);
    room.style.transform = `scale(${scale})`;
  }

  scaleRoom();
  window.addEventListener("resize", scaleRoom, { passive: true });
})();

(function animateAmbientDust() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.getElementById("ambient-canvas");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let motes = [];

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    motes = Array.from({ length: Math.min(90, Math.round(width / 16)) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.4 + 0.25,
      alpha: Math.random() * 0.32 + 0.06,
      drift: Math.random() * 0.12 + 0.025,
      phase: Math.random() * Math.PI * 2
    }));
  }

  function draw() {
    context.clearRect(0, 0, width, height);

    motes.forEach((mote) => {
      mote.phase += 0.008;
      mote.y -= mote.drift;
      mote.x += Math.sin(mote.phase) * 0.08;

      if (mote.y < -5) {
        mote.y = height + 5;
        mote.x = Math.random() * width;
      }

      context.beginPath();
      context.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(255, 223, 157, ${mote.alpha})`;
      context.shadowColor = "rgba(255, 214, 133, .45)";
      context.shadowBlur = 7;
      context.fill();
    });

    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize, { passive: true });
})();
