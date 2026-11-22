/* Configure content here. Use "#" for collections that are not ready yet. */
const ROOM_LINKS = {
  worldMap: "#",
  notes: "#",
  travelAlbum: "#",
  reflection: "/life/reflection/",
  music: "#"
};

(() => {
  const labels = { reflection: "感悟", notes: "笔记", travelAlbum: "旅游相册", worldMap: "世界地图", music: "音乐收藏" };
  const stage = document.getElementById("scene-wrap");
  const status = document.getElementById("loading-status");
  const statusText = document.getElementById("loading-text");
  const toast = document.getElementById("link-toast");
  const menu = document.getElementById("content-menu");
  const canvas = document.getElementById("room-canvas");
  menu.open = false;
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.open) {
      menu.open = false;
      menu.querySelector("summary").focus();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function activate(key) {
    const target = ROOM_LINKS[key];
    if (!target || target === "#") {
      showToast(`${labels[key] || "这个角落"}还在整理中，稍后再来看看。`);
      return;
    }
    window.location.assign(target);
  }

  document.querySelectorAll("[data-room-link]").forEach((link) => {
    const key = link.dataset.roomLink;
    const target = ROOM_LINKS[key] || "#";
    link.href = target;
    if (target === "#") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        menu.open = false;
        activate(key);
      });
    }
  });

  function unavailable(message) {
    stage.classList.remove("is-ready");
    stage.classList.add("has-error");
    stage.setAttribute("aria-busy", "false");
    document.querySelector(".scene-toolbar").hidden = true;
    menu.open = true;
    canvas.tabIndex = -1;
    status.hidden = false;
    statusText.textContent = message;
  }

  // The clock also runs when WebGL is unavailable, keeping the poster in sync.
  const daylightReady = import("./room-daylight.js").then(({ createShundeDaylightClock }) => {
    const clock = createShundeDaylightClock((state, { immediate }) => {
      stage.classList.toggle("is-night", state.mode === "night");
      stage.dispatchEvent(new CustomEvent("roomdaylightchange", { detail: { state, immediate } }));
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clock.pause();
      else clock.refresh(true);
    });
    window.addEventListener("pagehide", (event) => {
      if (event.persisted) clock.pause();
      else clock.dispose();
    });
    window.addEventListener("pageshow", (event) => { if (event.persisted) clock.refresh(true); });
  }).catch((error) => console.warn("Room daylight clock could not start:", error));

  if (!HTMLScriptElement.supports?.("importmap")) {
    unavailable("当前浏览器暂不支持三维房间，可通过“内容”菜单继续浏览。");
    return;
  }

  daylightReady.then(() => import("./room.js"))
    .then(({ initialiseRoom }) => initialiseRoom({ activate, unavailable }))
    .catch((error) => {
      console.error("Life Room could not start:", error);
      unavailable("三维房间暂时未能打开，可通过“内容”菜单继续浏览。");
    });
})();
