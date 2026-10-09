import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Cartoon car as ONE merged geometry, so thousands can be drawn with instancing.
// Built from side profiles (hood → windscreen → roof → rear window → boot) extruded across the width,
// so it reads as a car from above and from the side. Shading lives in vertex colors and multiplies the
// material color: body and roof take the category color, glass is dark, wheels black, hubcaps light.
// Faces +x (direction of travel); the base sits at y = 0.

function shade(geo, rgb) {
  if (geo.index) geo = geo.toNonIndexed()
  if (geo.attributes.uv) geo.deleteAttribute('uv')
  const n = geo.attributes.position.count
  const c = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) c.set(rgb, i * 3)
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3))
  return geo
}

// Extrude a side profile (points in x/y, car length along x) to a given width, centred on z = 0.
function profile(points, width, bevel) {
  const s = new THREE.Shape()
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  })
  g.translate(0, 0, -(width - bevel * 2) / 2)
  return g
}

export function makeCarGeometry({ length = 1, width = 0.62 } = {}) {
  const L = length
  const W = width
  const h = L / 2
  const r = 0.17 * L // chunky wheels
  const b = 0.035 * L // rounded edges

  // Lower body: boot (rear, -x) → body sides → hood (front, +x), with a slightly raised nose line.
  const body = profile([
    [-h, 0.14 * L], [h, 0.14 * L], [h, 0.3 * L], [h * 0.55, 0.36 * L], [-h * 0.6, 0.36 * L], [-h, 0.32 * L],
  ], W, b)

  // Glass greenhouse: sloped windscreen at the front, sloped rear window at the back.
  const glass = profile([
    [-h * 0.62, 0.35 * L], [h * 0.42, 0.35 * L], [h * 0.12, 0.55 * L], [-h * 0.42, 0.55 * L],
  ], W * 0.86, b * 0.6)

  // Roof slab in body color, sitting on the glass, so from above you see roof + dark front/back glass.
  const roof = profile([
    [-h * 0.44, 0.535 * L], [h * 0.14, 0.535 * L], [h * 0.1, 0.575 * L], [-h * 0.4, 0.575 * L],
  ], W * 0.9, b * 0.5)

  const parts = [shade(body, [1, 1, 1]), shade(glass, [0.12, 0.15, 0.2]), shade(roof, [1.08, 1.08, 1.08])]

  // Headlights (front) and a light bumper strip.
  for (const sz of [-1, 1]) {
    const lamp = new THREE.SphereGeometry(0.055 * L, 6, 4)
    lamp.scale(0.6, 1, 1)
    lamp.translate(h + 0.005 * L, 0.26 * L, sz * W * 0.3)
    parts.push(shade(lamp, [2.6, 2.5, 1.8]))
  }
  const bumper = new THREE.BoxGeometry(0.05 * L, 0.05 * L, W * 0.92)
  bumper.translate(h + 0.01 * L, 0.17 * L, 0)
  parts.push(shade(bumper, [0.35, 0.35, 0.35]))

  // Wheels with hubcaps, slightly outside the body so they read from above.
  for (const sx of [-0.3, 0.3]) {
    for (const sz of [-1, 1]) {
      const z = sz * (W / 2 - 0.02 * L)
      const tyre = new THREE.CylinderGeometry(r, r, 0.14 * L, 10)
      tyre.rotateX(Math.PI / 2)
      tyre.translate(sx * L, r, z)
      parts.push(shade(tyre, [0.06, 0.06, 0.06]))
      const hub = new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.15 * L, 6, 1, false)
      hub.rotateX(Math.PI / 2)
      hub.translate(sx * L, r, z + sz * 0.005 * L)
      parts.push(shade(hub, [1.8, 1.8, 1.8]))
    }
  }

  const merged = mergeGeometries(parts)
  parts.forEach(g => g.dispose())
  return merged
}

// Shared instances (never disposed by React — passed as <primitive>).
export const CORRIDOR_CAR = makeCarGeometry({ length: 1.3, width: 0.78 })
export const MAP_CAR = makeCarGeometry({ length: 1.1, width: 0.62 })
