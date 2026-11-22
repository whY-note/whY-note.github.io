"""Build real coastline artwork, or update only the map in an existing room.

  blender --background life/models/room.blend --python tools/life-room/build_world_map.py
"""
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(__file__).resolve().parent / "data" / "ne_110m_land.geojson"
A1, A2, A3, A4 = 1.340264, -0.081106, 0.000893, 0.003796


def equal_earth(longitude, latitude):
    """Equal Earth forward projection, with Greenwich at the centre."""
    theta = math.asin(math.sqrt(3) / 2 * math.sin(math.radians(latitude)))
    theta2 = theta * theta
    theta6 = theta2 ** 3
    denominator = A1 + 3 * A2 * theta2 + theta6 * (7 * A3 + 9 * A4 * theta2)
    x = 2 * math.sqrt(3) * math.radians(longitude) * math.cos(theta) / (3 * denominator)
    y = theta * (A1 + A2 * theta2 + theta6 * (A3 + A4 * theta2))
    return x, y


def ink_material(name, colour):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    srgb = [int(colour[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb]
    mat.use_nodes = True
    mat.diffuse_color = (*linear, 1)
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*linear, 1)
    shader.inputs["Roughness"].default_value = .9
    mat.use_backface_culling = False
    return mat


def convert_mesh(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)


def print_map_texture(parent, artwork):
    """Render flat vector artwork to a print without baking room illumination."""
    bpy.context.view_layer.update()
    print_scene = bpy.data.scenes.new("World map print")
    emission_materials = {}
    for source in [bpy.data.objects["Map paper"], *artwork]:
        duplicate = source.copy()
        duplicate.data = source.data.copy()
        duplicate.parent = None
        duplicate.matrix_world = source.matrix_world.copy()
        print_scene.collection.objects.link(duplicate)
        duplicate.data.materials.clear()
        for material in source.data.materials:
            if material.name not in emission_materials:
                ink = bpy.data.materials.new("Print " + material.name)
                ink.use_nodes = True
                nodes = ink.node_tree.nodes
                nodes.clear()
                output = nodes.new("ShaderNodeOutputMaterial")
                emission = nodes.new("ShaderNodeEmission")
                emission.inputs["Color"].default_value = material.diffuse_color
                ink.node_tree.links.new(emission.outputs[0], output.inputs["Surface"])
                emission_materials[material.name] = ink
            duplicate.data.materials.append(emission_materials[material.name])
    camera_data = bpy.data.cameras.new("World map print camera")
    camera = bpy.data.objects.new("World map print camera", camera_data)
    print_scene.collection.objects.link(camera)
    centre = parent.matrix_world.translation
    normal = parent.matrix_world.to_quaternion() @ Vector((0, -1, 0))
    camera.location = centre + normal * 3
    camera.rotation_euler = (centre - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 1.63 * abs(parent.scale.x)
    print_scene.camera = camera
    print_scene.render.engine = "CYCLES"
    print_scene.cycles.samples = 1
    print_scene.cycles.use_denoising = False
    print_scene.render.resolution_x = 2048
    print_scene.render.resolution_y = round(2048 * .92 * abs(parent.scale.z) / (1.63 * abs(parent.scale.x)))
    print_scene.render.resolution_percentage = 100
    print_scene.render.image_settings.file_format = "PNG"
    print_scene.render.image_settings.color_mode = "RGB"
    print_scene.render.dither_intensity = 0
    print_scene.view_settings.view_transform = "Standard"
    texture_path = ROOT / "life" / "models" / "world-map.png"
    print_scene.render.filepath = str(texture_path)
    bpy.ops.render.render(scene=print_scene.name, write_still=True)
    for obj in list(print_scene.objects):
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if isinstance(mesh, bpy.types.Mesh) and mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    bpy.data.scenes.remove(print_scene)
    for material in emission_materials.values():
        if material.users == 0:
            bpy.data.materials.remove(material)
    return texture_path


def make_world_map_artwork(parent):
    # Preserve the frame, backing, transforms and clickable parent.
    prefixes = ("Map continent", "Map longitude", "Map latitude", "Map travel pin",
                "Map Natural Earth", "Map atlas")
    for obj in list(parent.children_recursive):
        if obj.name.startswith(prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)

    data = json.loads(DATA.read_text())
    land_material = ink_material("Map land ink", "ffffff")
    ocean_material = ink_material("Map ocean ink", "87ceeb")
    grid_material = ink_material("Map graticule ink", "65adc7")
    label_material = ink_material("Map caption ink", "426071")
    x_limit = equal_earth(180, 0)[0]
    width = 1.56
    # Compensate the frame's horizontal scale to retain cartographic proportions.
    vertical_scale = abs(parent.scale.x / parent.scale.z)

    def project(longitude, latitude):
        x, y = equal_earth(longitude, latitude)
        return x / x_limit * width / 2, y / x_limit * width / 2 * vertical_scale

    # Fill only the projected world with blue, preserving the paper margins.
    outline = ([project(-180, lat) for lat in range(-90, 91, 3)]
               + [project(180, lat) for lat in range(90, -91, -3)])
    ocean_mesh = bpy.data.meshes.new("Map Natural Earth ocean")
    ocean_mesh.from_pydata([(x, -.058, z) for x, z in outline], [],
                          [list(reversed(range(len(outline))))])
    ocean_mesh.materials.append(ocean_material)
    ocean = bpy.data.objects.new("Map Natural Earth ocean", ocean_mesh)
    bpy.context.collection.objects.link(ocean)
    ocean.parent = parent

    curve = bpy.data.curves.new("Map Natural Earth coastlines", "CURVE")
    curve.dimensions = "2D"
    curve.fill_mode = "FRONT"
    rings = vertices = 0
    for feature in data["features"]:
        geometry = feature["geometry"]
        polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
        for polygon in polygons:
            for ring_index, ring in enumerate(polygon):
                points = [project(*coordinate[:2]) for coordinate in ring]
                if points[0] == points[-1]:
                    points.pop()
                # Opposite winding keeps inland-water rings as holes.
                area = sum(a[0] * b[1] - b[0] * a[1]
                           for a, b in zip(points, points[1:] + points[:1]))
                if (area > 0) != (ring_index == 0):
                    points.reverse()
                spline = curve.splines.new("POLY")
                spline.points.add(len(points) - 1)
                for point, (x, z) in zip(spline.points, points):
                    point.co = (x, z, 0, 1)
                spline.use_cyclic_u = True
                rings += 1
                vertices += len(points)
    land = bpy.data.objects.new("Map Natural Earth land", curve)
    bpy.context.collection.objects.link(land)
    land.parent = parent
    land.location = (0, -.064, 0)
    land.rotation_euler = (math.pi / 2, 0, 0)
    curve.materials.append(land_material)
    convert_mesh(land)

    # Print graticules in front of both land and ocean; negative Y faces the camera.
    # Flat ribbons follow the same projection without heavy tube meshes.
    lines = [[project(lon, lat) for lat in range(-90, 91, 3)] for lon in range(-180, 181, 30)]
    lines += [[project(lon, lat) for lon in range(-180, 181, 3)] for lat in range(-60, 61, 30)]
    grid_vertices, grid_faces = [], []
    for line in lines:
        for a, b in zip(line, line[1:]):
            dx, dz = b[0] - a[0], b[1] - a[1]
            length = math.hypot(dx, dz)
            if length < 1e-10:
                continue
            px, pz = -dz / length * .00045, dx / length * .00045
            offset = len(grid_vertices)
            grid_vertices.extend((x, -.066, z) for x, z in [
                (a[0] - px, a[1] - pz), (b[0] - px, b[1] - pz),
                (b[0] + px, b[1] + pz), (a[0] + px, a[1] + pz)])
            grid_faces.append(tuple(offset + i for i in range(4)))
    grid_mesh = bpy.data.meshes.new("Map Natural Earth graticule")
    grid_mesh.from_pydata(grid_vertices, [], grid_faces)
    grid_mesh.materials.append(grid_material)
    grid = bpy.data.objects.new("Map Natural Earth graticule", grid_mesh)
    bpy.context.collection.objects.link(grid)
    grid.parent = parent

    captions = []
    for name, caption, z, size in [("Map atlas title", "WORLD MAP", .390, .044)]:
        lettering = bpy.data.curves.new(name, "FONT")
        lettering.body = caption
        lettering.size = size
        lettering.align_x = "CENTER"
        lettering.materials.append(label_material)
        obj = bpy.data.objects.new(name, lettering)
        bpy.context.collection.objects.link(obj)
        obj.parent = parent
        obj.location = (0, -.064, z)
        obj.rotation_euler = (math.pi / 2, 0, 0)
        obj.scale.x = 1 / vertical_scale
        convert_mesh(obj)
        captions.append(obj)

    artwork = [ocean, land, grid, *captions]
    texture_path = print_map_texture(parent, artwork)
    for obj in artwork:
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    # A printed poster needs only one UV-mapped quad in the interactive model.
    mesh = bpy.data.meshes.new("Map Natural Earth print")
    mesh.from_pydata([(-.815, -.057, -.46), (.815, -.057, -.46),
                      (.815, -.057, .46), (-.815, -.057, .46)], [], [(0, 1, 2, 3)])
    uv = mesh.uv_layers.new(name="Map print UV")
    for loop, coordinate in zip(uv.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop.uv = coordinate
    image = bpy.data.images.load(str(texture_path), check_existing=False)
    image.filepath = "//world-map.png"
    image.pack()
    material = ink_material("Map printed paper", "f1e8d3")
    nodes = material.node_tree.nodes
    for node in list(nodes):
        if node.type == "TEX_IMAGE":
            nodes.remove(node)
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    material.node_tree.links.new(texture.outputs["Color"], nodes.get("Principled BSDF").inputs["Base Color"])
    for previous in list(bpy.data.images):
        if previous != image and previous.name.startswith("world-map") and previous.users == 0:
            bpy.data.images.remove(previous)
    mesh.materials.append(material)
    poster = bpy.data.objects.new("Map Natural Earth print", mesh)
    bpy.context.collection.objects.link(poster)
    poster.parent = parent

    parent["mapSource"] = "Natural Earth 1:110m land v5.1.2 (public domain)"
    parent["mapProjection"] = "Equal Earth; Greenwich central meridian"
    print("WORLD_MAP_ARTWORK", json.dumps({"rings": rings, "sourceVertices": vertices,
          "projection": "Equal Earth", "webTriangles": 2}))


def update_existing_room():
    scene = bpy.context.scene
    parent = bpy.data.objects.get("WorldMap")
    if not parent or not bpy.data.objects.get("RoomShell"):
        raise RuntimeError("Open life/models/room.blend before running this targeted update.")
    protected = [obj for obj in scene.objects if obj != parent and obj not in set(parent.children_recursive)]
    before = {obj.name: (tuple(v for row in obj.matrix_world for v in row), obj.data)
              for obj in protected}
    make_world_map_artwork(parent)
    bpy.context.view_layer.update()
    for obj in protected:
        assert before[obj.name] == (tuple(v for row in obj.matrix_world for v in row), obj.data), obj.name
    output = ROOT / "life" / "models"
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        if obj.type not in {"LIGHT", "CAMERA"}:
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(output / "room.glb"), export_format="GLB", use_selection=True,
        export_apply=True, export_extras=True, export_cameras=False, export_lights=False,
        export_animations=False, export_image_format="AUTO", export_yup=True)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.file.pack_all()
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(output / "room.blend"), compress=True)
    scene.render.filepath = str(output / "room-preview.webp")
    bpy.ops.render.render(write_still=True)
    print("WORLD_MAP_UPDATED", output)


if __name__ == "__main__":
    update_existing_room()
