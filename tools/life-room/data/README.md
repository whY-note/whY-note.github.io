# World atlas source

`ne_110m_land.geojson` is the unmodified Natural Earth 1:110m land layer from
the publisher's v5.1.2 repository release:

https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_110m_land.geojson

Natural Earth data are public domain:
https://www.naturalearthdata.com/about/terms-of-use/

`../build_world_map.py` projects these real coastline polygons with the Equal Earth
projection, including islands, Antarctica and the inland-water hole. There are no
country boundaries or invented travel pins. The existing frame's horizontal scale
is compensated so the finished printed map retains the projection's proportions.

The vector artwork is rendered without lighting into `life/models/world-map.png`,
then placed on a two-triangle print surface. The source blend packs that image and
the GLB embeds it, retaining the room's existing mobile geometry budget. The print
material responds to the room lights normally; room lighting is not baked into it.
The print uses white land, sky-blue oceans (`#87CEEB`), and an ivory paper margin.
The graticule is printed above both land and ocean, so its lines remain continuous.
The lower source caption is omitted; the data provenance remains documented here.

This data file is a build input. Room visitors use only the exported GLB and do not
fetch geographic data or contact a map provider.
