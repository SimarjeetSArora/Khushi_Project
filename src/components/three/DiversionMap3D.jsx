import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { corridorTrip } from '../../engine/closure'
import { MAP_CAR } from './carGeometry'
import { C3, Controls, FitCamera, Label3D } from './common'

// Gentle hills ("ghat" feel) — deterministic, no randomness.
const height = (x, z) => 0.9 * Math.sin(x * 0.18) * Math.cos(z * 0.22) + 0.6 * Math.sin((x + z) * 0.11) + 0.7

const FROM = [-22, 0]
const TO = [22, 0]
const ROUTES = {
  closed: [FROM, [-11, -0.6], [0, -0.8], [11, -0.6], TO],
  corridor: [FROM, [-15, 6], [-8, 8.5], [0, 8.5], [8, 8.5], [15, 6], TO],
  bypass: [FROM, [-16, -8], [-6, -13], [6, -13], [16, -8], TO],
}
const JUNCTION_T = [0.3, 0.5, 0.7]

const curveOf = pts => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, height(x, z) + 0.25, z)))

function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(64, 44, 80, 56)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const colors = []
    const lo = new THREE.Color('#e4e3d9')
    const hi = new THREE.Color('#d3dccb')
    for (let i = 0; i < pos.count; i++) {
      const y = height(pos.getX(i), pos.getZ(i))
      pos.setY(i, y)
      const c = lo.clone().lerp(hi, Math.min(1, Math.max(0, (y - 0.2) / 1.6)))
      colors.push(c.r, c.g, c.b)
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors flatShading />
    </mesh>
  )
}

function Route({ curve, color, radius, opacity = 1 }) {
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 160, radius, 10, false), [curve, radius])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

// Cars flowing along a route: count follows the share of traffic, speed follows congestion.
// `lift` = radius of the route tube, so cars drive on top of it rather than inside it.
function Flow({ curve, count, speed, color, lift = 0.3, max = 70 }) {
  const ref = useRef()
  const tmp = useMemo(() => new THREE.Object3D(), [])
  // Each car keeps its own progress along the route; integrating speed (rather than time × speed)
  // means changing the split never makes cars jump.
  const progress = useRef(Array.from({ length: max }, (_, i) => (i * 0.6180339) % 1))
  // Cars grow in / shrink out when the split changes, and speed and height ease to new values,
  // so nothing pops or lurches.
  const scales = useRef(new Array(max).fill(0))
  const eased = useRef({ speed, lift })
  useFrame((_, rawDt) => {
    if (!ref.current) return
    const dt = Math.min(rawDt, 0.05)
    const ease = 1 - Math.exp(-dt * 2.5)
    eased.current.speed += (speed - eased.current.speed) * ease
    eased.current.lift += (lift - eased.current.lift) * ease
    const grow = 1 - Math.exp(-dt * 5)
    let drawn = 0
    for (let i = 0; i < max; i++) {
      const sc = (scales.current[i] += ((i < count ? 1 : 0) - scales.current[i]) * grow)
      if (sc < 0.02) continue
      const t = (progress.current[i] = (progress.current[i] + dt * eased.current.speed) % 1)
      const p = curve.getPointAt(t)
      const d = curve.getTangentAt(t)
      tmp.position.set(p.x, p.y + eased.current.lift * 0.85, p.z)
      tmp.rotation.set(0, Math.atan2(-d.z, d.x), 0)
      tmp.scale.setScalar(sc)
      tmp.updateMatrix()
      ref.current.setMatrixAt(drawn++, tmp.matrix)
    }
    ref.current.count = drawn // draw only the cars in use
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, max]} frustumCulled={false}>
      <primitive object={MAP_CAR} attach="geometry" />
      <meshStandardMaterial color={color} vertexColors />
    </instancedMesh>
  )
}

function Barrier({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.35, 0.5, 2.2]} />
        <meshStandardMaterial color={C3.critical} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.37, 0.18, 2.22]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

const LANDSCAPE = [0, 30, 30]
const PORTRAIT = [0, 70, 20]

function Scene({ ev, split, statusKey }) {
  const { size } = useThree()
  const narrow = size.width / size.height < 1.3
  const lh = narrow ? 2.6 : 1.9 // label height in world units
  const curves = useMemo(() => Object.fromEntries(Object.entries(ROUTES).map(([k, v]) => [k, curveOf(v)])), [])
  const active = statusKey === 'active'
  const upcoming = statusKey === 'upcoming'
  const total = 70
  // Corridor slows as its share grows (same curve as the trade-off chart).
  const corridorSpeed = 0.05 * (14 / corridorTrip(split))
  const rCorridor = 0.18 + 0.55 * (active ? split : 0.1)
  const rBypass = 0.18 + 0.55 * (active ? 1 - split : 0.1)
  const barrierPts = [0.42, 0.5, 0.58].map(t => curves.closed.getPointAt(t))

  return (
    <>
      <hemisphereLight args={['#ffffff', '#cfcfc4', 1.1]} />
      <directionalLight position={[15, 30, 20]} intensity={1.5} />
      <Terrain />

      <Route curve={curves.closed} color={active ? C3.critical : upcoming ? C3.warning : C3.roadMajor} radius={0.35} opacity={active ? 0.75 : 1} />
      <Route curve={curves.corridor} color={C3.accent} radius={rCorridor} />
      <Route curve={curves.bypass} color={C3.geo} radius={rBypass} />

      {active && barrierPts.map((p, i) => <Barrier key={i} position={[p.x, p.y - 0.2, p.z]} />)}

      {active ? (
        <>
          <Flow curve={curves.corridor} count={Math.round(total * split)} speed={corridorSpeed} color={C3.lane} lift={rCorridor} />
          <Flow curve={curves.bypass} count={Math.round(total * (1 - split))} speed={0.045} color={C3.lane} lift={rBypass} />
        </>
      ) : (
        <Flow curve={curves.closed} count={upcoming || !ev ? 40 : 30} speed={0.07} color={C3.lane} lift={0.35} />
      )}

      {JUNCTION_T.map((t, i) => {
        const p = curves.corridor.getPointAt(t)
        return (
          <group key={t} position={[p.x, p.y, p.z]}>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.55, 0.55, 0.4, 24]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <Label3D text={`${i + 1} · ${ev?.junctions[i] ?? `Junction ${i + 1}`}`} position={[0, 2.4, 0]} height={lh} />
          </group>
        )
      })}
      {[[FROM, 'From'], [TO, 'To']].map(([[x, z], l]) => (
        <group key={l} position={[x, height(x, z), z]}>
          <mesh position={[0, 0.8, 0]}>
            <coneGeometry args={[0.6, 1.4, 20]} />
            <meshStandardMaterial color={C3.ink} />
          </mesh>
          <Label3D text={l} position={[0, 2.6, 0]} height={lh} />
        </group>
      ))}
      {ev && (
        <>
          <Label3D text={`${active ? 'CLOSED' : upcoming ? 'Closing soon' : 'Reopened'}${narrow ? '' : ` · ${ev.closed}`}`} color={C3.critical} position={[0, 3.4, -0.8]} height={lh} />
          <Label3D text={`${narrow ? 'Corridor' : ev.corridor} · ${Math.round(split * 100)}%`} dot={C3.accent} position={[0, 3, 11.5]} height={lh} />
          <Label3D text={`${narrow ? 'Bypass' : ev.bypass} · ${Math.round((1 - split) * 100)}%`} dot={C3.geo} position={[0, 3, -15.5]} height={lh} />
        </>
      )}
      <FitCamera landscape={LANDSCAPE} portrait={PORTRAIT} threshold={1.3} />
      <Controls />
    </>
  )
}

const DiversionMap3D = memo(function DiversionMap3D({ ev, split, statusKey }) {
  return (
    <div className="h-[320px] w-full overflow-hidden rounded-lg bg-land sm:h-[380px]" role="img" aria-label="3D map of the closure, corridor and bypass">
      <Canvas flat camera={{ fov: 40, position: LANDSCAPE }} dpr={[1, 1.5]}>
        <Scene ev={ev} split={split} statusKey={statusKey} />
      </Canvas>
    </div>
  )
})

export default DiversionMap3D
