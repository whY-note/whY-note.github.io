"""Wooden turntable with a smoked acrylic dust cover, editable in Blender."""
import math
import struct
import zlib
from pathlib import Path
import bpy
from mathutils import Vector


def make_record_player(location=(.20, 1.30, 1.115)):
    def material(name, color, roughness=.45, metallic=0, alpha=1):
        mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        rgb = [int(color[i:i+2], 16)/255 for i in (0, 2, 4)]
        rgb = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
        mat.diffuse_color = (*rgb, alpha)
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (*rgb, 1)
        shader.inputs["Roughness"].default_value = roughness
        shader.inputs["Metallic"].default_value = metallic
        shader.inputs["Alpha"].default_value = alpha
        if alpha < 1:
            mat.surface_render_method = "DITHERED"
            mat.use_backface_culling = False
        return mat

    wood = material("Turntable walnut veneer", "95613e", .40)
    black = material("Turntable black metal", "1c2021", .36, .25)
    ribs = material("Turntable grille ribs", "303637", .58, .12)
    silver = material("Turntable brushed aluminium", "b9bdba", .27, .72)
    vinyl = material("Turntable glossy vinyl", "101314", .22, .12)
    grooves = material("Turntable fine grooves", "282e2f", .32, .18)
    red = material("Turntable red label", "c84b3c", .75)
    print_ink = material("Turntable label ink", "f0d8b6", .70)
    glass = material("Turntable smoked acrylic", "b69b7b", .16, alpha=.23)
    edge = material("Turntable acrylic edges", "685444", .24, alpha=.52)

    # A small, packed sRGB grain texture exports identically to the web renderer.
    texture_path = Path(__file__).resolve().parents[2]/"life/models/turntable-wood.png"
    texture_path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 512, 256
    rows = []
    for y in range(height):
        row = bytearray([0])
        for x in range(width):
            warp = y+2.2*math.sin(x/53)+.7*math.sin(x/17)
            tone = 1+.075*math.sin(warp*.73)+.035*math.sin(warp*2.4)+.018*math.sin(warp*7.8)+.07*math.sin(warp*.12)
            noise = (((x*17+y*43+x*y*7)%71)/70-.5)*.025
            row.extend(max(0, min(255, round(channel*(tone+noise)))) for channel in (148, 95, 61))
        rows.append(bytes(row))
    def chunk(kind, data):
        return struct.pack(">I", len(data))+kind+data+struct.pack(">I", zlib.crc32(kind+data)&0xffffffff)
    texture_path.write_bytes(b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))+chunk(b"IDAT", zlib.compress(b"".join(rows), 9))+chunk(b"IEND", b""))
    image = bpy.data.images.load(str(texture_path), check_existing=True)
    image.reload()
    image.pack()
    nodes = wood.node_tree.nodes
    tex = nodes.get("Walnut grain") or nodes.new("ShaderNodeTexImage")
    tex.name = "Walnut grain"
    tex.image = image
    shader = nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (1, 1, 1, 1)
    shader.inputs["Coat Weight"].default_value = .16
    shader.inputs["Coat Roughness"].default_value = .28
    wood.node_tree.links.new(tex.outputs["Color"], shader.inputs["Base Color"])

    root = bpy.data.objects.new("RecordPlayer", None)
    bpy.context.collection.objects.link(root)
    root.location = location
    root["roomLink"] = "music"

    def finish(obj, name, mat, parent=None, bevel=0, smooth=False):
        obj.name = name
        obj.parent = parent or root
        obj.data.materials.append(mat)
        if "NoShadow" in name:
            obj.visible_shadow = False
        for polygon in obj.data.polygons:
            polygon.use_smooth = smooth
        if bevel:
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            mod = obj.modifiers.new("Soft manufactured edge", "BEVEL")
            mod.width = bevel
            mod.segments = 2 if bevel >= .006 else 1
            obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        return obj

    def box(name, centre, size, mat, parent=None, bevel=0):
        bpy.ops.mesh.primitive_cube_add(size=1, location=centre)
        obj = bpy.context.object
        obj.dimensions = size
        return finish(obj, name, mat, parent, bevel)

    def cylinder(name, centre, radius, depth, mat, segments=32, direction=(0,0,1), bevel=0):
        bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=depth, location=centre)
        obj = finish(bpy.context.object, name, mat, bevel=bevel, smooth=True)
        obj.rotation_euler = Vector(direction).to_track_quat("Z", "Y").to_euler()
        return obj

    def rod(name, start, end, radius, mat, parent=None, segments=10):
        start, end = Vector(start), Vector(end)
        obj = cylinder(name, (start+end)/2, radius, (end-start).length, mat, segments, end-start)
        obj.parent = parent or root
        return obj

    def rings(name, centre, radii, thickness, mat):
        vertices, faces = [], []
        major, minor = 64, 3
        for radius in radii:
            offset = len(vertices)
            for i in range(major):
                theta = i*2*math.pi/major
                for j in range(minor):
                    phi = j*2*math.pi/minor
                    r = radius+thickness*math.cos(phi)
                    vertices.append((centre[0]+r*math.cos(theta), centre[1]+r*math.sin(theta), centre[2]+thickness*math.sin(phi)))
            for i in range(major):
                for j in range(minor):
                    faces.append(tuple(offset+k for k in (i*minor+j, ((i+1)%major)*minor+j, ((i+1)%major)*minor+(j+1)%minor, i*minor+(j+1)%minor)))
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices, [], faces)
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        return finish(obj, name, mat, smooth=True)

    def vinyl_lines():
        # Flat, very fine annuli read as etched grooves without raised ridges.
        vertices, faces = [], []
        segments = 64
        for i in range(16):
            radius = .104+i*.0118
            offset = len(vertices)
            for r in (radius-.00015, radius+.00015):
                for j in range(segments):
                    angle = 2*math.pi*j/segments
                    vertices.append((-.12+r*math.cos(angle), -.008+r*math.sin(angle), .25015))
            for j in range(segments):
                following = (j+1)%segments
                faces.append(tuple(offset+k for k in (j, segments+j, segments+following, following)))
        mesh = bpy.data.meshes.new("Etched vinyl grooves")
        mesh.from_pydata(vertices, [], faces)
        obj = bpy.data.objects.new("Turntable vinyl grooves NoShadow", mesh)
        bpy.context.collection.objects.link(obj)
        finish(obj, "Turntable vinyl grooves NoShadow", grooves)

    for x in (-.41, .41):
        for y in (-.23, .23):
            cylinder("Turntable rubber foot", (x,y,.012), .023, .022, black, 16)
    box("Turntable walnut case", (0,0,.112), (1.02,.60,.19), wood, bevel=.018)
    box("Turntable front grille", (0,-.306,.113), (.944,.022,.154), black, bevel=.008)
    # Merge the horizontal grille slats into one mesh to keep draw calls small.
    vertices, faces = [], []
    for i in range(15):
        z = .048+i*.009
        offset = len(vertices)
        vertices.extend((x,y,z+dz) for dz in (-.0015,.0015) for y in (-.320,-.326) for x in (-.460,.460))
        faces.extend(tuple(offset+k for k in face) for face in [(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)])
    mesh = bpy.data.meshes.new("Horizontal speaker slats")
    mesh.from_pydata(vertices, [], faces)
    obj = bpy.data.objects.new("Turntable horizontal grille slats", mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, "Turntable horizontal grille slats", ribs)

    disc = Vector((-.12,-.008,.246))
    cylinder("Turntable platter underlay", (-.12,-.008,.215), .317, .010, black, 64)
    cylinder("Turntable silver platter", (-.12,-.008,.231), .314, .027, silver, 64, bevel=.002)
    cylinder("Turntable black record", disc, .304, .008, vinyl, 64)
    vinyl_lines()
    cylinder("Turntable red centre label", (-.12,-.008,.2515), .090, .002, red, 48)
    rings("Turntable label border NoShadow", (-.12,-.008,.253), [.078], .00055, print_ink)
    for i, width in enumerate((.052,.067,.039)):
        box("Turntable label typography NoShadow", (-.12,.027+i*.007,.2532), (width,.0018,.0006), print_ink)
    cylinder("Turntable silver spindle", (-.12,-.008,.261), .006, .022, silver, 12)

    box("Turntable tonearm mounting plate", (.35,.155,.214), (.157,.160,.012), black, bevel=.004)
    cylinder("Turntable tonearm pedestal", (.35,.16,.247), .028, .060, black, 24)
    cylinder("Turntable tonearm gimbal", (.35,.16,.286), .026, .045, silver, 24, (1,0,0))
    rod("Turntable counterweight shaft", (.35,.16,.286), (.386,.231,.286), .008, silver)
    cylinder("Turntable rear counterweight", (.385,.228,.286), .031, .052, black, 24, (.036,.071,0))
    rod("Turntable tonearm", (.35,.16,.286), (.242,-.058,.280), .007, black, segments=16)
    rod("Turntable bent tonearm", (.242,-.058,.280), (.126,-.174,.267), .007, black, segments=16)
    shell = box("Turntable headshell", (.122,-.178,.268), (.033,.060,.012), black, bevel=.002)
    shell.rotation_euler.z = -.65
    box("Turntable cartridge", (.122,-.178,.257), (.024,.032,.014), black, bevel=.002)
    rod("Turntable stylus NoShadow", (.122,-.178,.252), (.122,-.178,.250), .0012, silver, segments=6)
    rod("Turntable cueing lever", (.39,.105,.237), (.418,.060,.269), .0035, silver)
    box("Turntable arm rest", (.34,.045,.239), (.014,.018,.047), black, bevel=.002)
    box("Turntable dial metal plate", (.367,-.203,.211), (.147,.142,.006), silver, bevel=.002)
    box("Turntable dial inset", (.367,-.203,.215), (.135,.130,.004), black, bevel=.002)
    cylinder("Turntable speed knob", (.365,-.226,.231), .023, .026, silver, 24, bevel=.002)
    cylinder("Turntable knob black cap", (.365,-.226,.246), .019, .004, black, 24)
    box("Turntable knob pointer NoShadow", (.365,-.216,.2485), (.002,.011,.001), print_ink)
    cylinder("Turntable power button", (.365,-.161,.222), .010, .012, black, 16)

    lid = bpy.data.objects.new("TurntableDustCover", None)
    bpy.context.collection.objects.link(lid)
    lid.parent = root
    lid.location = (0,.296,.214)
    lid.rotation_euler.x = 0
    lid["openAngle"] = math.radians(-70)
    # Five connected thin panes; the underside remains open like the reference.
    vertices = [(x,y,z) for z in (0,.105) for y in (0,-.604) for x in (-.520,.520)]
    faces = [(4,5,7,6),(0,2,3,1),(0,4,6,2),(1,3,7,5),(2,6,7,3),(0,1,5,4)]
    # The lower face would close the box: omit it to expose the turntable below.
    faces.remove((0,2,3,1))
    faces = [tuple(reversed(face)) for face in faces]
    mesh = bpy.data.meshes.new("Thin smoked acrylic panels")
    mesh.from_pydata(vertices, [], faces)
    obj = bpy.data.objects.new("Turntable acrylic panels NoShadow", mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, "Turntable acrylic panels NoShadow", glass, lid)
    for a,b in ((0,1),(0,2),(1,3),(2,3),(4,5),(4,6),(5,7),(6,7),(0,4),(1,5),(2,6),(3,7)):
        rod("Turntable acrylic rim NoShadow", vertices[a], vertices[b], .0016, edge, lid, 8)
    for x in (-.37,.37):
        box("Turntable rear hinge", (x,.288,.220), (.055,.030,.035), black, bevel=.002)
        cylinder("Turntable hinge pin", (x,.298,.233), .009, .062, silver, 16, (1,0,0))
    bpy.ops.object.select_all(action="DESELECT")
    return root
