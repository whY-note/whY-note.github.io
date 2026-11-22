"""Soft linen bands wrapping the gathered curtain folds."""
import math
import bpy


def make_curtain_tiebacks(window):
    fabric = bpy.data.materials.get("Curtain tieback linen")
    if fabric is None:
        fabric = bpy.data.materials.new("Curtain tieback linen")
        # A slightly deeper shade of the curtain's warm apricot linen.
        srgb = [int("d9bc9c"[i:i+2], 16) / 255 for i in (0, 2, 4)]
        color = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055)**2.4 for c in srgb]
        fabric.diffuse_color = (*color, 1)
        fabric.use_nodes = True
        shader = fabric.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (*color, 1)
        shader.inputs["Roughness"].default_value = .98
        shader.inputs["Sheen Weight"].default_value = .20
        shader.inputs["Sheen Roughness"].default_value = .85

    for side in (-1, 1):
        centre = -2.03 + side * 1.40
        # Follow the actual offset of the tied fabric at this height.
        centre += side * .065 * (1 - (2.09 - 1.39) / 2.23)
        segments = 16
        vertices, faces = [], []
        for row in range(3):
            v = row / 2
            for i in range(segments):
                theta = i * 2 * math.pi / segments
                c, s = math.cos(theta), math.sin(theta)
                # Rounded rectangular cross section hugs the gathered cloth
                # without projecting beyond it like a rigid straight bar.
                x = math.copysign(abs(c)**(2 / 3), c)
                y = math.copysign(abs(s)**(2 / 3), s)
                radius_x = .066 + .0015 * math.sin(v * math.pi)
                radius_y = .027 + .001 * math.sin(v * math.pi)
                sag = -.006 * max(0, -s)**2
                z = 2.09 + (v - .5) * .068 + sag + side * .003 * x
                vertices.append((centre + radius_x * x, 1.53 + radius_y * y, z))
        for row in range(2):
            for i in range(segments):
                a = row * segments + i
                b = row * segments + (i + 1) % segments
                faces.append((a, b, b + segments, a + segments))
        mesh = bpy.data.meshes.new("Wrapped linen band")
        mesh.from_pydata(vertices, [], faces)
        mesh.materials.append(fabric)
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        obj = bpy.data.objects.new(f"Curtain fabric tieback {side:+d}", mesh)
        bpy.context.collection.objects.link(obj)
        obj.parent = window
        thickness = obj.modifiers.new("Sewn fabric thickness", "SOLIDIFY")
        thickness.thickness = .003
        thickness.offset = 0
