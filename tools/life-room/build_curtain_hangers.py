"""Brass rings around the curtain pole, with hooks reaching the fabric header."""
import math
import bpy
from mathutils import Vector


def make_curtain_hangers(window, brass):
    for side in (-1, 1):
        centre = -2.03 + side * 1.40
        for index in range(6):
            u = (index + .5) / 6
            x = centre + (u - .5) * .31
            bpy.ops.mesh.primitive_torus_add(
                major_segments=14, minor_segments=4,
                major_radius=.043, minor_radius=.0055,
                location=(x, 1.52, 3.67),
                rotation=(0, math.pi / 2, math.radians(18)),
            )
            ring = bpy.context.object
            ring.name = f"Curtain hanging ring {side:+d} {index + 1}"
            ring.parent = window
            ring.data.materials.append(brass)
            for polygon in ring.data.polygons:
                polygon.use_smooth = True

            # Begin on the lower front arc of the ring. The hook curves down
            # into the existing fabric rather than stopping above its header.
            arc = Vector((.043 * math.cos(-math.pi / 6), -.043 / 2, 0))
            start = ring.location + ring.rotation_euler.to_matrix() @ arc
            fabric_y = 1.53 + .034 * (.31 / .32)**.65 * math.cos(u * 6 * math.pi)
            points = [start, (x, 1.486, 3.618),
                      (x, fabric_y, 3.603), (x, fabric_y + .009, 3.616)]
            curve = bpy.data.curves.new("Bent curtain hook", "CURVE")
            curve.dimensions = "3D"
            curve.resolution_u = 1
            curve.bevel_depth = .0035
            curve.bevel_resolution = 0
            curve.use_fill_caps = True
            spline = curve.splines.new("BEZIER")
            spline.bezier_points.add(len(points) - 1)
            for point, position in zip(spline.bezier_points, points):
                point.co = position
                point.handle_left_type = point.handle_right_type = "AUTO"
            hook = bpy.data.objects.new(f"Curtain hanging hook {side:+d} {index + 1}", curve)
            bpy.context.collection.objects.link(hook)
            hook.parent = window
            hook.data.materials.append(brass)
            bpy.ops.object.select_all(action="DESELECT")
            hook.select_set(True)
            bpy.context.view_layer.objects.active = hook
            bpy.ops.object.convert(target="MESH")
            for polygon in bpy.context.object.data.polygons:
                polygon.use_smooth = True
