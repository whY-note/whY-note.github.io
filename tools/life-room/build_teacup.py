"""Editable white porcelain / gilt teacup and matching saucer for Life Room."""
import math
import bpy


def make_teacup(location=(-1.01, 1.19, 1.304), height_scale=.85, overall_scale=.90):
    def mat(name, color, roughness, metallic=0, coat=0):
        material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        rgb = [int(color[i:i+2], 16)/255 for i in (0, 2, 4)]
        rgb = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
        material.diffuse_color = (*rgb, 1)
        material.use_nodes = True
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (*rgb, 1)
        shader.inputs["Roughness"].default_value = roughness
        shader.inputs["Metallic"].default_value = metallic
        shader.inputs["Coat Weight"].default_value = coat
        shader.inputs["Coat Roughness"].default_value = .16
        return material

    porcelain = mat("Cup white porcelain", "f7f4ee", .19, coat=.28)
    gold = mat("Cup gilt", "c59b47", .28, metallic=.60)
    brown = mat("Cup dark decorative band", "50321d", .27, metallic=.10, coat=.15)
    tea = mat("Cup amber tea", "946318", .20, coat=.18)
    root = bpy.data.objects.new("TeaCup", None)
    bpy.context.collection.objects.link(root)
    root.location = location
    # Scale the complete set about its base so it stays on the desktop.
    root.scale = (overall_scale,)*3
    curves = []

    def mesh(name, vertices, faces, materials, indices=None):
        data = bpy.data.meshes.new(name)
        data.from_pydata(vertices, [], faces)
        data.update()
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.parent = root
        for material in materials:
            data.materials.append(material)
        for i, polygon in enumerate(data.polygons):
            polygon.use_smooth = True
            if indices is not None:
                polygon.material_index = indices[i]
        if name.endswith("NoShadow"):
            obj.visible_shadow = False
        return obj

    def lathe(name, profile, materials, flip=False, segments=64):
        # Profile entries: radius, height, material of the following strip.
        vertices, rings, faces, indices = [], [], [], []
        for radius, z, _ in profile:
            if radius == 0:
                rings.append([len(vertices)]*segments)
                vertices.append((0, 0, z))
            else:
                rings.append(list(range(len(vertices), len(vertices)+segments)))
                vertices.extend((radius*math.cos(2*math.pi*j/segments), radius*math.sin(2*math.pi*j/segments), z) for j in range(segments))
        for i in range(len(rings)-1):
            for j in range(segments):
                a,b = rings[i][j], rings[i][(j+1)%segments]
                c,d = rings[i+1][(j+1)%segments], rings[i+1][j]
                face = (a,c,d) if a == b else (a,b,c) if c == d else (a,b,c,d)
                faces.append(tuple(reversed(face)) if flip else face)
                indices.append(profile[i][2])
        return mesh(name, vertices, faces, materials, indices)

    def ring(name, radius, z, thickness, material):
        vertices, faces = [], []
        major, minor = 64, 6
        for i in range(major):
            theta = 2*math.pi*i/major
            for j in range(minor):
                phi = 2*math.pi*j/minor
                r = radius+thickness*math.cos(phi)
                vertices.append((r*math.cos(theta),r*math.sin(theta),z+thickness*math.sin(phi)))
        for i in range(major):
            for j in range(minor):
                faces.append((i*minor+j,((i+1)%major)*minor+j,((i+1)%major)*minor+(j+1)%minor,i*minor+(j+1)%minor))
        return mesh(name,vertices,faces,[material])

    def tube(name, points, radius, material, bezier=False, cyclic=False):
        data = bpy.data.curves.new(name,"CURVE")
        data.dimensions = "3D"
        data.resolution_u = 4
        data.bevel_depth = radius
        data.bevel_resolution = 1
        data.use_fill_caps = True
        spline = data.splines.new("BEZIER" if bezier else "POLY")
        if bezier:
            spline.bezier_points.add(len(points)-1)
            for point,co in zip(spline.bezier_points,points):
                point.co = co
                point.handle_left_type = point.handle_right_type = "AUTO"
        else:
            spline.points.add(len(points)-1)
            for point,co in zip(spline.points,points):
                point.co = (*co,1)
        spline.use_cyclic_u = cyclic
        obj = bpy.data.objects.new(name,data)
        bpy.context.collection.objects.link(obj)
        obj.parent = root
        data.materials.append(material)
        if name.endswith("NoShadow"):
            obj.visible_shadow = False
        curves.append(obj)
        return obj

    # White shallow dish with a raised, dark-brown and gold decorated border.
    plate_profile = [
        (0,.010,0),(.070,.010,0),(.082,.012,0),(.105,.016,0),
        (.130,.024,0),(.160,.036,0),(.181,.047,1),(.188,.0505,1),
        (.204,.0585,1),(.212,.062,0),(.215,.060,0),(.215,.054,0),
        (.205,.049,0),(.181,.038,0),(.150,.025,0),(.115,.011,0),
        (.090,.003,0),(.065,.001,0),(.052,.004,0),(0,.004,0)
    ]
    lathe("Porcelain saucer",plate_profile,[porcelain,brown],flip=True)
    ring("Saucer outer gold rim",.212,.0625,.0018,gold)
    ring("Saucer inner gold rim",.181,.0475,.00135,gold)
    ring("Saucer cup well",.079,.012,.0010,gold)

    # A small raised foot and a flared, genuinely hollow porcelain bowl.
    lathe("Porcelain cup foot",[
        (0,.017,0),(.058,.017,0),(.066,.020,0),(.068,.027,0),
        (.065,.040,0),(.058,.052,0),(.056,.061,0),(0,.061,0)
    ],[porcelain])
    ring("Cup foot gold rim",.066,.021,.00145,gold)
    outer = [(.055,.057),(.067,.060),(.071,.073),(.079,.102),
             (.089,.150),(.105,.218),(.1205,.268),(.123,.276),
             (.1275,.290),(.130,.298),(.131,.303)]

    def cup_radius(z):
        for (r0,z0),(r1,z1) in zip(outer,outer[1:]):
            if z <= z1:
                return r0+(r1-r0)*(z-z0)/(z1-z0)
        return outer[-1][0]

    profile = [(0,.057,0)]+[(r,z,1 if .268<=z<.298 else 0) for r,z in outer]
    profile += [(.127,.307,0),(.123,.302,0),(.120,.294,0),
                (.115,.276,0),(.111,.264,0),(.098,.218,0),
                (.082,.150,0),(.070,.103,0),(.062,.083,0),(.055,.078,0),(0,.078,0)]
    lathe("Hollow flared porcelain cup",profile,[porcelain,brown])
    ring("Cup fine upper gold lip",.1285,.3055,.00135,gold)
    ring("Cup decorative band upper edge",.1305,.298,.0012,gold)
    ring("Cup decorative band lower edge",.1213,.268,.00115,gold)

    handle = [(.122,0,.273),(.165,0,.305),(.202,0,.303),
              (.229,0,.282),(.236,0,.251),(.222,0,.223),
              (.185,0,.191),(.143,0,.157),(.105,0,.113),(.079,0,.094)]
    tube("Curved porcelain handle",handle,.010,porcelain,bezier=True)
    for side in (-1,1):
        tube("Handle fine gold line NoShadow",[(x,side*.009,z) for x,_,z in handle],.0013,gold,bezier=True)
    lathe("Amber tea surface",[(0,.266,0),(.103,.266,0),(.1115,.2675,0)],[tea],flip=True)

    # Delicate repeating gilt vines and paired leaves, modelled in relief.
    cup_vine = []
    for i in range(18*16):
        theta = i*2*math.pi/(18*16)
        z = .282+.004*math.sin(18*theta)
        radius = cup_radius(z)+.00085
        cup_vine.append((radius*math.cos(theta),radius*math.sin(theta),z))
    tube("Cup gold vine NoShadow",cup_vine,.0007,gold,cyclic=True)

    def leaves(name, count, on_plate):
        vertices, faces = [], []
        for i in range(count):
            theta = (i+.5)*2*math.pi/count
            for arm in (-1,1):
                points = []
                path = [(j/8,1) for j in range(9)]+[(j/8,-1) for j in range(7,0,-1)]
                for t,side in path:
                    arc = arm*.007*t+side*.0028*math.sin(math.pi*t)
                    if on_plate:
                        r = .186+.018*t
                        z = .047+(r-.181)*.5+.0008
                    else:
                        z = .273+.020*t
                        r = cup_radius(z)+.0009
                    a = theta+arc/r
                    points.append((r*math.cos(a),r*math.sin(a),z))
                face = tuple(range(len(vertices),len(vertices)+len(points)))
                vertices.extend(points)
                faces.append(tuple(reversed(face)) if on_plate else face)
        mesh(name,vertices,faces,[gold])

    leaves("Cup gold leaf ornament NoShadow",18,False)
    plate_vine = []
    for i in range(24*12):
        theta = i*2*math.pi/(24*12)
        radius = .195+.003*math.sin(theta*24)
        z = .047+(radius-.181)*.5+.0008
        plate_vine.append((radius*math.cos(theta),radius*math.sin(theta),z))
    tube("Saucer gold vine NoShadow",plate_vine,.0007,gold,cyclic=True)
    leaves("Saucer gold leaf ornament NoShadow",24,True)

    # Export standard meshes, keeping the individual parts editable in Blender.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in curves:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = curves[0]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.select_all(action="DESELECT")
    # Shorten the cup, handle and tea together; leave the matching saucer intact.
    for obj in root.children:
        if obj.type == "MESH" and not (obj.name.startswith("Saucer ") or obj.name == "Porcelain saucer"):
            for vertex in obj.data.vertices:
                vertex.co.z = .017+(vertex.co.z-.017)*height_scale
            obj.data.update()
    return root
