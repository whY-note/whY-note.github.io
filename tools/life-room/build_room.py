"""Rebuild the editable Life Room and its web model with Blender 4.5 LTS.

  blender --background --python tools/life-room/build_room.py

Coordinates are Blender's Z-up metres. glTF export handles Y-up conversion.
Interactive parent names are the contract with life/room.js.
"""
import bpy
import math
import random
import sys
from pathlib import Path
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_teacup import make_teacup
from build_lamp import make_desk_lamp
from build_record_player import make_record_player
from build_curtain_hangers import make_curtain_hangers
from build_curtain_tiebacks import make_curtain_tiebacks

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "life" / "models"
OUTPUT.mkdir(parents=True, exist_ok=True)
random.seed(21)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for block in list(bpy.data.materials):
    bpy.data.materials.remove(block)


def material(name, hex_color, roughness=.75, metallic=0, emission=0):
    color = tuple(int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4))
    # Blender shader colors are linear; author the palette in sRGB.
    color = tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in color)
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    if emission:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = emission
    return mat


wall = material("Room plaster", "c9c0ad")
walnut = material("Walnut", "79533c", .48)
wood_dark = material("End grain", "513b2e")
oak = material("Light oak", "b98c5e", .65)
paper = material("Ivory paper", "f1e8d3")
cream = material("Linen", "e8d8b7")
curtain_fabric = material("Curtain linen", "ebd0b0", roughness=.98)
curtain_shader = curtain_fabric.node_tree.nodes.get("Principled BSDF")
curtain_shader.inputs["Sheen Weight"].default_value = .20
curtain_shader.inputs["Sheen Roughness"].default_value = .85
brass = material("Brushed brass", "b8924b", .4, .65)
green = material("Forest green", "405b47")
leaf = material("Leaves", "75895a")
leaf_light = material("Young leaves", "94a575")
clay = material("Terracotta", "b5785c")
blue = material("Dusty blue", "668c96")
ink = material("Ink", "293b35")
vinyl = material("Vinyl", "242c2a", .35)
sky = material("Sky", "bdcfd0", emission=.25)
sun_mat = material("Late afternoon sun", "ffe1a2", emission=.8)
glass_green = material("Ceramic green", "86977b", .32)
floor_materials = [material(f"Oak plank {i}", c) for i, c in enumerate(
    ["b58c63", "bb9169", "c39a71", "b88d61", "bf956d", "c69c74"])]


def group(name, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    return obj


def finish(obj, name, mat, parent=None, bevel=0):
    obj.name = name
    if "NoShadow" in name:
        obj.visible_shadow = False
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    if bevel:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        mod = obj.modifiers.new("Soft edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
    return obj


def box(name, loc, size, mat, parent=None, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = size
    return finish(obj, name, mat, parent, bevel)


def cylinder(name, loc, radius, depth, mat, parent=None, vertices=32, rotation=None, radius_top=None):
    if radius_top is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius_top, depth=depth, location=loc)
    obj = bpy.context.object
    if rotation:
        obj.rotation_euler = rotation
    return finish(obj, name, mat, parent, .006)


def sphere(name, loc, scale, mat, parent=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    return finish(obj, name, mat, parent)


def rod(name, a, b, radius, mat, parent=None):
    a, b = Vector(a), Vector(b)
    obj = cylinder(name, (a+b)/2, radius, (b-a).length, mat, parent, vertices=12)
    obj.rotation_euler = (b-a).to_track_quat("Z", "Y").to_euler()
    return obj


def text(name, body, loc, size, mat, parent=None, rotation=(0, 0, 0), font=None):
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.size = size
    curve.align_x = "CENTER"
    curve.extrude = .0005
    if font:
        curve.font = font
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


# Front-facing layout matching the user's room sketch. The same view metadata
# travels inside the GLB so the browser and the Blender preview stay in sync.
VIEW = dict(wallWidth=7.4, wallHeight=3.8, wallZ=-1.8, eyeHeight=1.84,
            fov=35, panoramaAspect=1.5, wallWidthFraction=.84, wallHeightFraction=.68)
shell = group("RoomShell")
shell["view"] = VIEW
# Walls, ceiling and floor continue past the camera. No miniature-house platform.
for row in range(18):
    x = -3.75 + (row+.5)*7.5/18
    for segment in range(6):
        y = -12 + (segment+.5)*14/6
        box(f"Floorboard {row:02} {segment}", (x, y, .005),
            (7.5/18-.006, 14/6-.006, .09), random.choice(floor_materials), shell, .004)
box("Left wall", (-3.78, -5.05, 1.90), (.16, 13.9, 3.8), wall, shell, 0)
box("Right wall", (3.78, -5.05, 1.90), (.16, 13.9, 3.8), wall, shell, 0)
box("Ceiling", (0, -5.05, 3.85), (7.72, 13.9, .10), wall, shell, 0)
# Window opening: x=-3.38..-.68, z=1.52..3.55.
box("Back wall below window", (0, 1.88, .76), (7.72, .16, 1.52), wall, shell, 0)
box("Back wall above window", (0, 1.88, 3.675), (7.72, .16, .25), wall, shell, 0)
box("Back wall left of window", (-3.62, 1.88, 2.535), (.48, .16, 2.03), wall, shell, 0)
box("Back wall right of window", (1.59, 1.88, 2.535), (4.54, .16, 2.03), wall, shell, 0)
box("Back skirting", (0, 1.76, .13), (7.4, .07, .18), cream, shell, .006)
for x in (-3.66, 3.66):
    box("Side skirting", (x, -5.05, .13), (.07, 13.8, .18), cream, shell, .006)

window = group("Window")
box("WindowSky_NoShadow", (-2.03, 2.04, 2.535), (2.70, .025, 2.03), sky, window, 0)
sphere("Sun_NoShadow", (-3.04, 2.005, 3.25), (.24, .016, .24), sun_mat, window)
rod("Tree trunk_NoShadow", (-.98, 1.99, 1.52), (-1.05, 1.99, 2.96), .043, walnut, window)
for a,b in [((-.99,1.99,1.98),(-2.12,1.99,2.57)),
            ((-1.03,1.99,2.46),(-2.61,1.99,3.04)),
            ((-1.05,1.99,2.78),(-1.78,1.99,3.36))]:
    rod("Tree branch_NoShadow", a, b, .022, walnut, window)
for i in range(30):
    x = random.uniform(-2.91, -.79)
    z = random.uniform(2.16, 3.45)
    obj = sphere("Tree foliage_NoShadow", (x, 1.97, z), (.26, .025, .14), leaf if i%2 else leaf_light, window)
    obj.rotation_euler.y = random.uniform(-.4, .4)
for x in (-3.40, -.66):
    box("Window upright", (x, 1.73, 2.535), (.075, .16, 2.14), oak, window)
for z in (1.50, 3.57):
    box("Window lintel", (-2.03, 1.73, z), (2.82, .16, .075), oak, window)
rod("Curtain pole", (-3.61, 1.52, 3.67), (-.45, 1.52, 3.67), .022, brass, window)
curtains = []
levels = [(1.39,.32), (1.53,.30), (2.09,.11), (2.45,.20), (3.10,.25), (3.62,.31)]


def curtain_width(z):
    # Monotone cubic interpolation keeps the original tied silhouette while
    # rounding the angular transitions between the six profile landmarks.
    slopes = [(b[1]-a[1])/(b[0]-a[0]) for a,b in zip(levels, levels[1:])]
    tangents = [slopes[0]]
    for a,b in zip(slopes, slopes[1:]):
        tangents.append(0 if a*b <= 0 else 2*a*b/(a+b))
    tangents.append(slopes[-1])
    for i in range(len(levels)-1):
        z0,w0 = levels[i]
        z1,w1 = levels[i+1]
        if z <= z1:
            t = (z-z0)/(z1-z0)
            return ((2*t**3-3*t*t+1)*w0 + (t**3-2*t*t+t)*(z1-z0)*tangents[i]
                    + (-2*t**3+3*t*t)*w1 + (t**3-t*t)*(z1-z0)*tangents[i+1])
    return levels[-1][1]


for side in (-1, 1):
    centre = -2.03 + side*1.40
    vertices, faces = [], []
    columns, rows = 64, 48
    for row in range(rows+1):
        v = row/rows
        z = 1.39 + v*2.23
        width = curtain_width(z)
        for i in range(columns+1):
            u = i/columns
            x = centre + (u-.5)*width + side*.065*(1-(z-1.39)/2.23)
            fold = .034*(width/.32)**.65*math.cos(u*6*math.pi + .10*math.sin(v*math.pi))
            hem = .008*math.sin(u*6*math.pi)**2*(1-v)**8
            vertices.append((x, 1.53+fold, z+hem))
    stride = columns+1
    for row in range(rows):
        for col in range(columns):
            a=row*stride+col
            faces.append((a,a+1,a+stride+1,a+stride))
    mesh=bpy.data.meshes.new("Draped linen")
    mesh.from_pydata(vertices, [], faces)
    obj=bpy.data.objects.new("Tied linen curtain", mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent=window
    mesh.materials.append(curtain_fabric)
    uv = mesh.uv_layers.new(name="CurtainUV")
    atlas_start = .02 if side == -1 else .52
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for loop_index in polygon.loop_indices:
            index = mesh.loops[loop_index].vertex_index
            uv.data[loop_index].uv = (atlas_start + .46*(index%stride)/columns, .02 + .96*(index//stride)/rows)
    mod=obj.modifiers.new("Fabric thickness", "SOLIDIFY")
    mod.thickness=.009
    curtains.append(obj)

make_curtain_hangers(window, brass)
make_curtain_tiebacks(window)

# The desk is below the window, with left-to-right lamp / journal / tea.
desk = group("WritingDesk", (-1.87, 1.26, 0))
box("Desk top", (0,0,1.25), (2.65,1.04,.105), walnut, desk, .026)
box("Desk apron", (0,.05,1.08), (2.49,.82,.23), wood_dark, desk)
for x in (-1.17,1.17):
    for y in (-.40,.40):
        box("Desk leg", (x,y,.60), (.10,.10,1.13), walnut, desk, .012)
for x in (-.64,.64):
    box("Drawer front", (x,-.39,1.09), (1.19,.065,.19), walnut, desk, .008)
    rod("Drawer handle", (x-.08,-.437,1.09), (x+.08,-.437,1.09), .012, brass, desk)
for i in range(8):
    box("Desktop grain", (0,-.44+i*.12,1.304), (2.49,.002,.001), oak, desk, 0)

journal = group("Journal", (-1.87,1.06,1.325))
journal["roomLink"] = "reflection"
for x in (-.21,.21):
    box("Journal cloth cover", (x,0,.014), (.42,.48,.025), green, journal, .008)
    pages=box("Journal pages", (x,0,.036), (.40,.46,.025), paper, journal, .004)
    pages.rotation_euler.y = -.065 if x < 0 else .065
    for i in range(7):
        box("Handwritten line", (x,-.15+i*.047,.055), (.27 if i%3 else .20,.003,.001), oak, journal, 0)
rod("Bookmark ribbon", (.06,-.27,.035), (.06,.18,.055), .004, clay, journal)
journal.rotation_euler = (math.radians(13),0,-.06)

# Place the lamp on the left side of the desk.
lamp = make_desk_lamp(target=(journal.location.x, journal.location.y, journal.location.z+.035))

cup = make_teacup()

stool=group("Stool",(desk.location.x,.11,0))
box("Square stool seat",(0,0,.75),(.66,.62,.085),oak,stool,.025)
for x in (-.24,.24):
    for y in (-.22,.22):
        rod("Stool leg",(x*1.12,y*1.12,.045),(x,y,.71),.032,walnut,stool)
for x in (-.25,.25):
    rod("Stool brace",(x,-.23,.29),(x,.23,.29),.018,walnut,stool)

# A connected L-shaped cabinet: tall shelves on the right, low console on left.
cabinet=group("MemoryCabinet",(1.70,1.30,0))
box("Cabinet back",(0,.30,1.24),(1.70,.07,2.21),wood_dark,cabinet)
for x in (-.83,.83):
    box("Cabinet side",(x,0,1.245),(.07,.68,2.23),walnut,cabinet,.005)
# Shelves fit between the uprights; all front edges are on the same plane.
for z in (.165,.84,1.55,2.325):
    box("Cabinet shelf",(0,0,z),(1.59,.68,.07),walnut,cabinet,.005)
box("Lower cubby divider",(0,0,.5025),(.07,.68,.605),walnut,cabinet,.005)
for x in (-.70,.70):
    for y in (-.25,.25):
        box("Cabinet foot",(x,y,.10),(.095,.095,.15),wood_dark,cabinet)

notes=group("Notes",(1.70,1.25,1.59))
notes["roomLink"]="notes"
for i,mat in enumerate([green,clay,blue,cream,green]):
    h=[.48,.53,.46,.50,.54][i]
    box("Notes book spine",(-.40+i*.18,0,h/2),(.13,.36,h),mat,notes,.009)
    for z in (.07,h-.06):
        box("Spine gold rule",(-.40+i*.18,-.184,z),(.10,.005,.009),brass,notes,.001)

album=group("TravelAlbum",(1.70,1.17,.88))
album["roomLink"]="travelAlbum"
box("Album pages",(0,0,.245),(.78,.11,.43),paper,album)
for y in (-.075,.075):
    box("Album cover",(0,y,.245),(.84,.025,.49),clay,album)
box("Album cover label",(0,-.095,.26),(.61,.01,.31),cream,album,.004)
text("Album title","JOURNEYS",(0,-.104,.245),.066,walnut,album,rotation=(math.pi/2,0,0))

record_table=group("RecordTable",(.20,1.30,0))
# The tall cabinet's left upright also supports the console's right end.
# Avoid duplicate overlapping uprights at the L-shaped joint.
box("Record console back",(-.00125,.30,.61),(1.2725,.065,.91),wood_dark,record_table)
box("Record console side",(-.67,0,.62),(.065,.68,.97),walnut,record_table,.005)
for z in (.1675,.61,1.0725):
    box("Record console shelf",(-.00125,0,z),(1.2725,.68,.065),walnut,record_table,.005)
for x in (-.54,.54):
    for y in (-.27,.27):
        box("Record console foot",(x,y,.10),(.085,.085,.15),wood_dark,record_table)

player = make_record_player()

world_map=group("WorldMap",(cabinet.location.x,1.70,3.00))
world_map.scale.x = .90
world_map["roomLink"]="worldMap"
box("Map oak frame",(0,0,0),(1.76,.08,1.05),oak,world_map)
box("Map paper",(0,-.050,0),(1.63,.012,.92),paper,world_map,.003)
for i in range(1,7):
    box("Map longitude",(-.815+i*1.63/7,-.059,0),(.002,.001,.86),cream,world_map,0)
for z in (-.23,0,.23):
    box("Map latitude",(0,-.059,z),(1.56,.001,.002),cream,world_map,0)
# Simplified longitude/latitude coastlines, rather than arbitrary polygon icons.
continents=[
    [(-168,72),(-140,70),(-128,60),(-125,49),(-123,37),(-110,27),(-100,20),(-87,16),(-81,8),(-77,9),(-86,22),(-80,26),(-81,31),(-70,44),(-57,52),(-63,60),(-86,68),(-100,73),(-130,70)],
    [(-54,59),(-30,68),(-20,80),(-44,84),(-62,76)],
    [(-81,12),(-69,10),(-60,5),(-50,0),(-35,-6),(-43,-23),(-52,-34),(-65,-55),(-74,-45),(-76,-25),(-81,-5)],
    [(-17,35),(0,37),(13,32),(33,31),(43,12),(51,12),(42,-6),(34,-22),(20,-35),(10,-20),(9,-4),(-5,5),(-15,12)],
    [(-10,36),(-10,44),(-5,49),(-8,56),(6,58),(10,70),(30,71),(50,67),(90,76),(140,70),(180,66),(170,55),(150,50),(140,38),(130,33),(122,20),(112,8),(104,0),(98,15),(88,22),(78,8),(70,23),(57,26),(49,14),(41,13),(35,30),(29,40),(19,40),(11,44),(0,38)],
    [(113,-22),(119,-17),(130,-12),(141,-15),(153,-27),(146,-39),(128,-34),(114,-35)],
    [(166,-34),(178,-38),(174,-46),(167,-45)],
    [(48,-13),(50,-17),(47,-25),(44,-22)]
]
leaf.use_backface_culling=False
for points in continents:
    mesh=bpy.data.meshes.new("Continent")
    mesh.from_pydata([(lon/180*.78,-.068,lat/90*.40) for lon,lat in points],[],[list(range(len(points)))])
    obj=bpy.data.objects.new("Map continent",mesh)
    bpy.context.collection.objects.link(obj); obj.parent=world_map; mesh.materials.append(leaf)
for lon,lat in [(-100,40),(15,48),(105,30)]:
    sphere("Map travel pin",(lon/180*.78,-.077,lat/90*.40),(.018,.008,.018),clay,world_map)

# Full portrait; retain the frame's top/side edges and its existing border widths.
photo=group("PhotoFrame",(.22,1.71,2.62))
photo_mat=material("Landscape photo","a1b4ac")
image_path=ROOT/"assets/images/life_room/Leslie_poster.png"
image_aspect = 1
if image_path.exists():
    image=bpy.data.images.load(str(image_path))
    image_aspect = image.size[0] / image.size[1]
    texture_width = min(512, image.size[0])
    image.scale(texture_width,max(1,round(texture_width/image_aspect)))
    image.filepath = "//../../assets/images/life_room/Leslie_poster.png"
    image.pack()
    shader=photo_mat.node_tree.nodes.get("Principled BSDF")
    texture=photo_mat.node_tree.nodes.new("ShaderNodeTexImage"); texture.image=image
    photo_mat.node_tree.links.new(texture.outputs["Color"],shader.inputs["Base Color"])
portrait_height = .89 / image_aspect
portrait_centre = .77 - portrait_height / 2
box("Photo frame",(0,0,portrait_centre),(1.14,.075,portrait_height+.26),oak,photo)
box("Photo mat",(0,-.046,portrait_centre),(1.04,.015,portrait_height+.16),paper,photo,.004)
bpy.ops.mesh.primitive_plane_add(size=1,location=(0,-.057,portrait_centre),rotation=(math.pi/2,0,0))
obj=bpy.context.object; obj.scale=(.89,portrait_height,1)
finish(obj,"A landscape memory",photo_mat,photo)

scroll=group("Calligraphy",(3.08,1.71,2.02))
box("Scroll textile",(0,0,0),(.55,.035,2.99),walnut,scroll,.005)
box("Scroll paper",(0,-.026,0),(.44,.012,2.78),paper,scroll,.003)
for z in (-1.52,1.52):
    rod("Scroll rod",(-.32,0,z),(.32,0,z),.025,wood_dark,scroll)
font_path=Path("/System/Library/Fonts/Supplemental/Songti.ttc")
if font_path.exists():
    chinese=bpy.data.fonts.load(str(font_path))
    for i,char in enumerate("且听风吟"):
        text("Calligraphy character",char,(0,-.036,.76-i*.51),.33,ink,scroll,rotation=(math.pi/2,0,0),font=chinese)
box("Red seal",(.12,-.043,-1.06),(.075,.008,.075),clay,scroll,.001)

# Keep helpers in the Blender source, but export only model objects.
scene = bpy.context.scene
scene.world.color = (.5, .5, .5)
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.75, .78, .72, 1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = .65


def area(name, loc, energy, size, color, target):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z", "Y").to_euler()


area("Window sunlight", (-3.1, 2.4, 4), 650, 1.5, (1, .86, .65), (0, -1, .2))
area("Soft studio fill", (1, -4, 3.1), 700, 4, (.91, .95, 1), (0, 1.5, 1.5))
# Match the web camera: frontal 35-degree vertical field of view at 3:2.
distance = max(VIEW["wallWidth"] / (VIEW["wallWidthFraction"] * 2 * VIEW["panoramaAspect"] * math.tan(math.radians(VIEW["fov"] / 2))),
               VIEW["wallHeight"] / (VIEW["wallHeightFraction"] * 2 * math.tan(math.radians(VIEW["fov"] / 2))))
bpy.ops.object.camera_add(location=(0, 1.8-distance, VIEW["eyeHeight"]))
camera = bpy.context.object
camera.name = "PreviewCamera"
camera.rotation_euler = (Vector((0, 1.8, VIEW["eyeHeight"]))-camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "PERSP"
camera.data.sensor_fit = "VERTICAL"
camera.data.sensor_height = 32
camera.data.lens = 16 / math.tan(math.radians(VIEW["fov"] / 2))
scene.camera = camera
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 1500
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.quality = 88
scene.view_settings.view_transform = "AgX"
scene.render.filepath = str(OUTPUT / "room-preview.webp")

# Open the source in a useful material-shaded camera view.
for screen in bpy.data.screens:
    for area_ui in screen.areas:
        if area_ui.type == "VIEW_3D":
            area_ui.spaces.active.region_3d.view_perspective = "CAMERA"
            area_ui.spaces.active.shading.type = "MATERIAL"

# Bake short-range fold occlusion for the real-time material. Local AO avoids
# baking the room's overall darkness into the fabric or freezing direct light.
ao_image = bpy.data.images.new("Curtain fold occlusion", width=512, height=1024, alpha=False)
ao_image.colorspace_settings.name = "Non-Color"
ao_image.generated_color = (1, 1, 1, 1)
fabric_nodes = curtain_fabric.node_tree.nodes
fabric_links = curtain_fabric.node_tree.links
ao_texture = fabric_nodes.new("ShaderNodeTexImage")
ao_texture.name = "Baked curtain fold occlusion"
ao_texture.image = ao_image
fabric_nodes.active = ao_texture
ao_texture.select = True
bake_ao = fabric_nodes.new("ShaderNodeAmbientOcclusion")
bake_ao.inputs["Distance"].default_value = .14
bake_ao.samples = 16
bake_ao.only_local = True
bake_emission = fabric_nodes.new("ShaderNodeEmission")
fabric_links.new(bake_ao.outputs["AO"], bake_emission.inputs["Color"])
fabric_output = fabric_nodes.get("Material Output")
fabric_links.new(bake_emission.outputs[0], fabric_output.inputs["Surface"])
bpy.ops.object.select_all(action="DESELECT")
for obj in curtains:
    obj.select_set(True)
bpy.context.view_layer.objects.active = curtains[0]
scene.render.bake.use_selected_to_active = False
scene.render.bake.margin = 8
scene.cycles.samples = 8
bpy.ops.object.bake(type="EMIT", use_clear=True)
fabric_links.new(curtain_shader.outputs[0], fabric_output.inputs["Surface"])
fabric_nodes.remove(bake_emission)
fabric_nodes.remove(bake_ao)
scene.cycles.samples = 48
ao_image.filepath_raw = str(OUTPUT / "curtain-ao.png")
ao_image.file_format = "PNG"
ao_image.save()
ao_image.pack()
gltf_output = bpy.data.node_groups.get("glTF Material Output")
if gltf_output is None:
    gltf_output = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
    gltf_output.interface.new_socket(name="Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
gltf_settings = fabric_nodes.new("ShaderNodeGroup")
gltf_settings.node_tree = gltf_output
fabric_links.new(ao_texture.outputs["Color"], gltf_settings.inputs["Occlusion"])

bpy.ops.object.select_all(action="DESELECT")
for obj in scene.objects:
    if obj.type not in {"LIGHT", "CAMERA"}:
        obj.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT / "room.glb"), export_format="GLB",
    use_selection=True, export_apply=True, export_extras=True,
    export_cameras=False, export_lights=False, export_animations=False,
    export_image_format="AUTO", export_yup=True,
)
bpy.ops.object.select_all(action="DESELECT")
# Convert just the Chinese lettering to editable meshes so the source is portable
# without embedding an entire system TTC font collection (tens of megabytes).
for obj in list(scene.objects):
    if obj.type == "FONT" and obj.data.font.filepath not in {"", "<builtin>"}:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target="MESH")
        obj.select_set(False)
for curve in list(bpy.data.curves):
    if curve.users == 0:
        bpy.data.curves.remove(curve)
for font in list(bpy.data.fonts):
    if font.filepath not in {"", "<builtin>"}:
        bpy.data.fonts.remove(font, do_unlink=True)
bpy.data.orphans_purge(do_recursive=True)
bpy.ops.file.pack_all()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "room.blend"), compress=True)
bpy.ops.render.render(write_still=True)
print("Life Room assets generated:", OUTPUT)
