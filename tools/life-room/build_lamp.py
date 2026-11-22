"""Editable black spring-balanced desk lamp for Blender and the web model."""
import math
import bpy
from mathutils import Vector


def make_desk_lamp(location=(-2.85, 1.22, 1.304), target=(-1.87, 1.06, 1.36)):
    def material(name, color, roughness, metallic=0, emission=0):
        mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        rgb = [int(color[i:i+2], 16)/255 for i in (0, 2, 4)]
        rgb = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
        mat.diffuse_color = (*rgb, 1)
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (*rgb, 1)
        shader.inputs["Roughness"].default_value = roughness
        shader.inputs["Metallic"].default_value = metallic
        if emission:
            shader.inputs["Emission Color"].default_value = (*rgb, 1)
            shader.inputs["Emission Strength"].default_value = emission
        return mat

    black = material("Lamp satin black metal", "191b1e", .40, .20)
    silver = material("Lamp steel hardware", "b3b4ad", .30, .65)
    spring_steel = material("Lamp dark spring steel", "505458", .38, .55)
    ivory = material("Lamp ivory reflector", "eee8db", .42)
    rubber = material("Lamp cable rubber", "171819", .70)
    bulb = material("Lamp warm bulb", "fff0ce", .32, emission=.6)
    root = bpy.data.objects.new("DeskLamp", None)
    bpy.context.collection.objects.link(root)
    root.location = location
    root.scale = (.9,)*3
    curves = []

    def finish(obj, name, mat, bevel=0, smooth=False):
        obj.name = name
        obj.parent = root
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
            mod = obj.modifiers.new("Small machined edge", "BEVEL")
            mod.width = bevel
            mod.segments = 2
            obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        return obj

    def cylinder(name, centre, radius, depth, mat, direction=(0, 0, 1), segments=24, bevel=.002):
        bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=depth, location=centre)
        obj = finish(bpy.context.object, name, mat, bevel, smooth=True)
        obj.rotation_euler = Vector(direction).to_track_quat("Z", "Y").to_euler()
        return obj

    def rod(name, start, end, radius, mat, segments=12):
        start, end = Vector(start), Vector(end)
        return cylinder(name, (start+end)/2, radius, (end-start).length, mat, end-start, segments, bevel=0)

    def bar(name, start, end):
        start, end = Vector(start), Vector(end)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(start+end)/2)
        obj = bpy.context.object
        obj.dimensions = (.018, .024, (end-start).length)
        finish(obj, name, black, bevel=.002)
        obj.rotation_euler = (end-start).to_track_quat("Z", "Y").to_euler()

    def wire(name, points, radius, mat, bezier=False):
        data = bpy.data.curves.new(name, "CURVE")
        data.dimensions = "3D"
        data.resolution_u = 12
        data.bevel_depth = radius
        data.bevel_resolution = 0
        data.use_fill_caps = True
        spline = data.splines.new("BEZIER" if bezier else "POLY")
        if bezier:
            spline.bezier_points.add(len(points)-1)
            for point, co in zip(spline.bezier_points, points):
                point.co = co
                point.handle_left_type = point.handle_right_type = "AUTO"
        else:
            spline.points.add(len(points)-1)
            for point, co in zip(spline.points, points):
                point.co = (*co, 1)
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.parent = root
        data.materials.append(mat)
        if "NoShadow" in name:
            obj.visible_shadow = False
        curves.append(obj)

    cylinder("Lamp round weighted base", (0, 0, .028), .171, .052, black, segments=48, bevel=.007)
    cylinder("Lamp base swivel", (-.06, 0, .080), .021, .060, black)
    cylinder("Lamp swivel collar", (-.06, 0, .106), .025, .011, black)
    pivots = [Vector((-.06, 0, .130)), Vector((-.23, 0, .510)), Vector((.16, 0, .820))]

    for index, (start, end) in enumerate(zip(pivots, pivots[1:])):
        axis = (end-start).normalized()
        perpendicular = Vector((axis.z, 0, -axis.x))
        for side in (-1, 1):
            offset = perpendicular*.024*side
            bar(f"Lamp parallel arm {index+1}", start+offset, end+offset)
        # Small-diameter coils are actual geometry rather than painted stripes.
        for side in (-1, 1):
            spring_start = start.lerp(end, .15)+Vector((0, side*.025, 0))
            spring_end = start.lerp(end, .55)+Vector((0, side*.025, 0))
            points = []
            for j in range(81):
                t = j/80
                angle = 2*math.pi*9*t
                radius = .0075*min(1, t*12, (1-t)*12)
                co = spring_start.lerp(spring_end, t)+perpendicular*(radius*math.cos(angle))+Vector((0, radius*math.sin(angle), 0))
                points.append(co)
            wire(f"Lamp tension spring {index+1} NoShadow", points, .0018, spring_steel)
            for anchor in (spring_start, spring_end):
                cylinder("Lamp spring anchor", anchor, .006, .012, black, (0, 1, 0), 12, bevel=0)

    for index, point in enumerate(pivots):
        # Shaped triangular joint plates, with exposed silver pivot screws.
        radius = .042 if index < 2 else .035
        vertices = []
        for y in (-.019, .019):
            for angle in (math.pi/2, 7*math.pi/6, 11*math.pi/6):
                vertices.append(point+Vector((radius*math.cos(angle), y, radius*math.sin(angle))))
        mesh = bpy.data.meshes.new("Lamp joint plate")
        mesh.from_pydata(vertices, [], [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)])
        obj = bpy.data.objects.new("Lamp joint plate", mesh)
        bpy.context.collection.objects.link(obj)
        finish(obj, "Lamp triangular joint", black, .004)
        for sign in (-1, 1):
            for offset in (Vector((0, 0, .017)), Vector((-.018, 0, -.012))):
                centre = point+offset+Vector((0, sign*.023, 0))
                cylinder("Lamp silver pivot screw", centre, .007, .007, silver, (0, 1, 0), 12, bevel=.001)
                rod("Lamp screw slot NoShadow", centre+Vector((-.003, sign*.004, 0)), centre+Vector((.003, sign*.004, 0)), .0007, black, 6)

    mouth = Vector((.31, -.025, .650))
    axis = Vector((-.33, .48, .813)).normalized()
    # Keep the head hinge fixed and tilt the opening toward the open journal.
    # This turns the head about 30 degrees from its original orientation.
    head_hinge = mouth+axis*.205
    local_target = (Vector(target)-Vector(location))/.9
    axis = (head_hinge-local_target).normalized()
    mouth = head_hinge-axis*.205
    rotation = axis.to_track_quat("Z", "Y")
    rod("Lamp head hinge", pivots[-1], head_hinge, .014, black)
    # Continuous open shell: white inside, black metal outside, rolled rim.
    profile = [(0, .245, 1), (.055, .245, 1), (.059, .180, 1), (.064, .174, 1),
               (.136, .010, 1), (.139, .002, 0), (.144, 0, 0), (.144, .004, 0),
               (.141, .012, 0), (.070, .178, 0), (.065, .180, 0),
               (.065, .282, 0), (.058, .292, 0), (0, .294, 0)]
    vertices, rings, faces, indices = [], [], [], []
    segments = 48
    for radius, z, _ in profile:
        if radius == 0:
            rings.append([len(vertices)]*segments)
            vertices.append(mouth+rotation@Vector((0, 0, z)))
        else:
            rings.append(list(range(len(vertices), len(vertices)+segments)))
            for j in range(segments):
                angle = 2*math.pi*j/segments
                vertices.append(mouth+rotation@Vector((radius*math.cos(angle), radius*math.sin(angle), z)))
    for i in range(len(rings)-1):
        for j in range(segments):
            a,b = rings[i][j], rings[i][(j+1)%segments]
            c,d = rings[i+1][(j+1)%segments], rings[i+1][j]
            faces.append((a,c,d) if a == b else (a,b,c) if c == d else (a,b,c,d))
            indices.append(profile[i][2])
    mesh = bpy.data.meshes.new("Lamp hollow metal shade")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("Lamp hollow metal shade", mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, "Lamp hollow metal shade", black, smooth=True)
    mesh.materials.append(ivory)
    for polygon, index in zip(mesh.polygons, indices):
        polygon.material_index = index
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=.030, location=mouth+axis*.13)
    light_bulb = finish(bpy.context.object, "Lamp warm bulb NoShadow", bulb, smooth=True)
    light_bulb.scale = (1, 1, 1.4)
    light_bulb.rotation_euler = rotation.to_euler()

    cylinder("Lamp head cable connector", mouth+axis*.298, .011, .018, black, axis, 16, bevel=.001)
    wire("Lamp upper power cable", [pivots[-1]+Vector((-.01,.025,.025)),
         Vector((.12,.05,.945)), Vector((.18,.13,.980)), mouth+axis*.307], .005, rubber, True)
    wire("Lamp base power cable", [Vector((-.06,.02,.09)), Vector((-.15,.06,.017)),
         Vector((-.28,.16,.012)), Vector((-.30,.36,.012))], .004, rubber, True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in curves:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = curves[0]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.select_all(action="DESELECT")
    return root
