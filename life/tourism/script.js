/* The same saved coordinates power the map and the server-rendered city list. */
(() => {
  const places = JSON.parse(document.getElementById("tourism-data").textContent);
  const cards = [...document.querySelectorAll("[data-place-index]")];
  const notice = document.getElementById("map-notice");
  const reset = document.getElementById("reset-map");
  const coordinates = document.getElementById("selected-coordinates");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const markers = [];
  let map;

  function showNotice(message) {
    notice.textContent = message;
    notice.hidden = false;
  }

  function selectPlace(index, move = true) {
    const place = places[index];
    if (!place) return;
    const chineseName = document.getElementById("selected-name-zh");
    chineseName.textContent = place.country_code === "CN" ? place.name_zh || "" : "";
    chineseName.hidden = !chineseName.textContent;
    document.getElementById("selected-name").textContent = place.name;
    document.getElementById("selected-country").textContent = place.country;
    document.getElementById("selected-lat").textContent = `${place.coordinates[0].toFixed(4)}°`;
    document.getElementById("selected-lng").textContent = `${place.coordinates[1].toFixed(4)}°`;
    coordinates.hidden = false;
    cards.forEach((card) => card.setAttribute("aria-pressed", String(Number(card.dataset.placeIndex) === index)));
    markers.forEach((marker, markerIndex) => {
      const element = marker.getElement();
      element?.classList.toggle("is-active", markerIndex === index);
      element?.setAttribute("aria-pressed", String(markerIndex === index));
      marker.setZIndexOffset(markerIndex === index ? 1000 : 0);
    });
    if (map && move) {
      map.flyTo(place.coordinates, place.zoom ?? 8, { animate: !reducedMotion.matches, duration: 0.8 });
      markers[index].openTooltip();
    }
    if (move && window.matchMedia("(max-width: 760px)").matches) {
      document.querySelector(".travel-map-shell").scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
    }
  }

  function showAll() {
    if (!map) return;
    markers.forEach((marker) => marker.closeTooltip());
    if (places.length) {
      map.fitBounds(places.map((place) => place.coordinates), { padding: [40, 40], maxZoom: 5, animate: !reducedMotion.matches });
    } else {
      map.fitWorld({ animate: false });
    }
  }

  // These controls still show saved details if Leaflet or the base map fails.
  cards.forEach((card) => card.addEventListener("click", () => selectPlace(Number(card.dataset.placeIndex))));

  try {
    if (!window.L) throw new Error("Leaflet unavailable");
    const L = window.L;
    map = L.map("tourism-map", {
      minZoom: 1,
      maxZoom: 18,
      scrollWheelZoom: false,
      worldCopyJump: true,
      zoomAnimation: !reducedMotion.matches,
      fadeAnimation: !reducedMotion.matches,
      markerZoomAnimation: !reducedMotion.matches,
      inertia: !reducedMotion.matches
    });
    // Keep the original tile colours in both site themes, including map labels.
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    let failedTiles = 0;
    tiles.on("tileerror", () => {
      failedTiles += 1;
      if (failedTiles >= 3) showNotice("The base map is temporarily unavailable. Saved place markers and the place list still work.");
    });
    tiles.on("tileload", () => { failedTiles = 0; notice.hidden = true; });
    tiles.addTo(map);

    places.forEach((place, index) => {
      const mapLabel = place.country_code === "CN"
        ? `${place.name_zh || place.name}，中国`
        : `${place.name}, ${place.country}`;
      const marker = L.marker(place.coordinates, {
        icon: L.divIcon({ className: "travel-marker", iconSize: [40, 40], iconAnchor: [20, 20] }),
        title: mapLabel,
        keyboard: true,
        riseOnHover: true
      }).addTo(map);
      const label = document.createElement("span");
      label.textContent = mapLabel;
      marker.bindTooltip(label, { direction: "top", offset: [0, -12] });
      marker.on("click", () => selectPlace(index));
      markers.push(marker);
    });
    reset.hidden = false;
    reset.addEventListener("click", showAll);
    showAll();
    if (places.length) selectPlace(0, false);
  } catch (error) {
    map = undefined;
    reset.hidden = true;
    showNotice("The interactive map is temporarily unavailable. Select a place in the list to view its details and coordinates.");
    console.warn("Travel map could not start:", error);
  }
})();
