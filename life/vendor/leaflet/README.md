# Leaflet 1.9.4

Locally hosted browser distribution from the official npm package:
https://www.npmjs.com/package/leaflet/v/1.9.4

Source: https://github.com/Leaflet/Leaflet/tree/v1.9.4

License: BSD-2-Clause, retained in `LICENSE`.

The travel atlas uses custom CSS markers. The upstream control and default marker
images are retained so the distributed stylesheet's asset references resolve.
Map tiles are loaded separately from OpenStreetMap with visible attribution;
the JavaScript library itself does not require an external CDN at runtime.
