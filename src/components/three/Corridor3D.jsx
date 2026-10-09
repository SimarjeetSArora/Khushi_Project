import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CONTROLLERS, JUNCTIONS, P, occupancy } from '../../engine/corridor'
import { CORRIDOR_CAR } from './carGeometry'
import { C3, Controls, FitCamera, Label3D } from './common'

// World layout: each corridor runs along x; the three controllers sit side by side along z.
const JX = [-27, 3, 33]
const ENTRY = -48
const EXIT = 48.5
const LANE_Z = [-13, 0, 13]
const CAR = 1.55 // spacing between queued cars (cars are 1.3 long)
const MAX_Q = 140
const MAX_MOVE = 90
const MAX_SIDE = 30
// Car motion is physical: each drawn car has a speed, accelerates gently up to a top speed, brakes
// smoothly into its spot, and never teleports. All rates scale with the simulation speed (1× / 10× / 60×).
const FREE_FLOW = 1.2 // world units per simulated second (≈ link length / free-flow time)
const ACCEL_TIME = 0.35 // real seconds to reach top speed, never shorter even at 60×
const GHOST_LIFE = 0.8 // real seconds a departing car keeps driving before it fades out
const GHOST_DIST = 7 // …or until it has driven this far (just across the junction / past signal D)

const LANDSCAPE = [0, 40, 44]
const PORTRAIT = [0, 122, 26]

const tmp = new THREE.Object3D()
const put = (mesh, i, x, y, z, rotY = 0, scale = 1) => {
  tmp.position.set(x, y, z)
  tmp.rotation.set(0, rotY, 0)
  tmp.scale.setScalar(scale)
  tmp.updateMatrix()
  mesh.setMatrixAt(i, tmp.matrix)
}

// kind: 0 queued (grey), 1 moving (blue), 2 side street (green)
const KIND_MAX = [MAX_Q, MAX_MOVE, MAX_SIDE]

function Lane({ sim, frac, simSpeed, z, label, color, names, showNames, highlight, portrait }) {
  const lh = portrait ? 3.8 : 2.4 // label height in world units
  const queued = useRef()
  const moving = useRef()
  const side = useRef()
  const lights = useRef([])
  const blocks = useRef([])
  const fills = useRef([])
  const exitLight = useRef()
  const disp = useRef(new Map()) // vehicle → where it is drawn now
  const ghosts = useRef([]) // vehicles that just left the simulation, driving off

  const fillMats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: C3.good })), [])

  useFrame(({ clock }, rawDt) => {
    const s = sim()
    if (!s || !queued.current) return
    const dt = Math.min(rawDt, 0.05)
    const t = s.t + frac() // fractional sim time, so moving cars advance between steps
    const sp = simSpeed() // simulated seconds per real second
    const cruise = FREE_FLOW * sp // normal driving speed, world units per real second
    const vmax = Math.max(2.5, 1.5 * cruise) // allows catching up after a stop
    const accel = vmax / Math.max(ACCEL_TIME, 3 / sp)
    const brake = 1 / Math.max(0.18, 1.2 / sp) // how early a car eases off before its spot
    const colorAt = 0.4 * cruise // grey ↔ blue switches at this speed, so colour follows motion

    // Where each vehicle should be right now: [vehicle, x, z, rotation, kind, enteringCorridor]
    const targets = []
    JX.forEach((x, j) => {
      const prev = j === 0 ? ENTRY : JX[j - 1] + 1.6
      const room = Math.floor((x - 1.6 - prev) / CAR)
      const q = s.mainQ[j]
      for (let i = 0; i < Math.min(q.length, room); i++) targets.push([q[i], x - 1.6 - (i + 0.5) * CAR, z + 0.6, 0, 0, j === 0])
    })
    for (let i = 0; i < Math.min(s.exitQ.length, 9); i++) targets.push([s.exitQ[i], EXIT - 1.2 - (i + 0.5) * CAR, z + 0.6, 0, 0, false])
    s.link.forEach((l, j) => {
      const start = JX[j] + 1.6
      const end = j < 2 ? JX[j + 1] - 1.6 : EXIT - 1.2
      // Cars on a link line up behind the queue ahead, one car-length apart (the link is ordered front first).
      let limit = end - ((j < 2 ? s.mainQ[j + 1].length : s.exitQ.length) + 0.5) * CAR
      l.forEach(c => {
        const prog = Math.min(1, Math.max(0, 1 - (c.at - t) / P.freeFlow[j]))
        const x = Math.max(start, Math.min(start + prog * (end - start), limit))
        limit = x - CAR
        targets.push([c.v, x, z + 0.6, 0, 1, false])
      })
    })
    JX.forEach((x, j) => {
      const q = s.sideQ[j]
      for (let i = 0; i < Math.min(q.length, 6); i++) targets.push([q[i], x + 0.5, z + 2.4 + i * CAR, Math.PI / 2, 2, false])
    })

    const meshes = [queued.current, moving.current, side.current]
    const count = [0, 0, 0]
    const seen = new Set()
    for (const [v, tx, tz, rot, kind, entering] of targets) {
      seen.add(v)
      let d = disp.current.get(v)
      if (!d) {
        // New cars arrive already rolling: from the corridor start, or down the side street.
        const rolling = entering || kind === 2
        d = { x: entering ? ENTRY - 3 : tx, z: kind === 2 ? tz + 3 : tz, v: rolling ? Math.min(vmax, cruise) : 0, rot, drawn: kind }
        disp.current.set(v, d)
      }
      const dx = tx - d.x
      const dz = tz - d.z
      const dist = Math.hypot(dx, dz)
      const want = Math.min(vmax, dist * brake)
      d.v += Math.max(-2 * accel * dt, Math.min(accel * dt, want - d.v))
      const move = Math.min(dist, Math.max(0, d.v) * dt)
      if (dist > 1e-4) {
        d.x += (dx / dist) * move
        d.z += (dz / dist) * move
      }
      d.rot = rot
      // Colour follows what the car is visibly doing, not the instant the simulation reassigns it.
      if (kind === 2) d.drawn = 2
      else if (kind === 1 && d.v > colorAt) d.drawn = 1
      else if (kind === 0 && d.v < colorAt) d.drawn = 0
      else if (d.drawn === 2) d.drawn = kind
      const k = d.drawn
      if (count[k] < KIND_MAX[k]) put(meshes[k], count[k]++, d.x, 0.02, d.z, rot)
    }
    // Vehicles that left the simulation keep driving (side cars across the corridor, main cars past D).
    for (const [v, d] of disp.current) {
      if (!seen.has(v)) {
        disp.current.delete(v)
        ghosts.current.push({ ...d, v: Math.max(d.v, 0.8 * Math.min(vmax, cruise)), age: 0 })
      }
    }
    ghosts.current = ghosts.current.filter(g => (g.age += dt) < GHOST_LIFE && (g.dist ?? 0) < GHOST_DIST)
    for (const g of ghosts.current) {
      g.v = Math.min(vmax, g.v + accel * dt)
      const stepLen = g.v * dt
      g.dist = (g.dist ?? 0) + stepLen
      if (g.drawn === 2) g.z -= stepLen
      else g.x += stepLen
      const k = g.drawn === 2 ? 2 : 1
      const fade = Math.min(1, (GHOST_LIFE - g.age) / 0.3, (GHOST_DIST - g.dist) / 2.5)
      if (count[k] < KIND_MAX[k]) put(meshes[k], count[k]++, g.x, 0.02, g.z, g.rot, fade)
    }
    // Draw only the cars that exist this frame (unused slots cost nothing).
    meshes.forEach((m, k) => {
      m.count = count[k]
      m.instanceMatrix.needsUpdate = true
    })

    // signals, blocked boxes, storage bars
    const pulse = 0.35 + 0.25 * Math.sin(clock.elapsedTime * 8)
    JX.forEach((_, j) => {
      const ph = s.sig[j].phase
      const col = ph === 'main' ? C3.good : ph === 'side' ? C3.critical : C3.warning
      const m = lights.current[j]?.material
      if (m) { m.color.set(col); m.emissive.set(col) }
      const b = blocks.current[j]
      if (b) { b.visible = s.blocked[j]; b.material.opacity = pulse }
      const f = Math.min(1, occupancy(s, j) / P.storage[j])
      const bar = fills.current[j]
      if (bar) {
        const len = bar.userData.len
        bar.scale.x = Math.max(0.001, f)
        bar.position.x = bar.userData.x0 + (len * f) / 2
        fillMats[j].color.set(f >= 0.95 ? C3.critical : f >= 0.7 ? C3.warning : C3.good)
      }
    })
    if (exitLight.current) {
      const g = s.t % P.exitCycle < s.exitGreen
      exitLight.current.material.color.set(g ? C3.good : C3.critical)
      exitLight.current.material.emissive.set(g ? C3.good : C3.critical)
    }
  })

  const links = [0, 1, 2].map(j => {
    const x0 = JX[j] + 2
    const x1 = (j < 2 ? JX[j + 1] : EXIT) - 2
    return { x0, len: x1 - x0 }
  })

  return (
    <group>
      {/* road and cross streets */}
      <mesh position={[(ENTRY + EXIT) / 2, 0.02, z]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[EXIT - ENTRY + 2, 3.2]} />
        <meshStandardMaterial color={C3.roadMajor} />
      </mesh>
      {JX.map(x => (
        <mesh key={x} position={[x, 0.01, z + 2.5]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.4, 11]} />
          <meshStandardMaterial color={C3.road} />
        </mesh>
      ))}
      {/* cars */}
      <instancedMesh ref={queued} args={[null, null, MAX_Q]} frustumCulled={false}>
        <primitive object={CORRIDOR_CAR} attach="geometry" />
        <meshStandardMaterial color={C3.ink2} vertexColors />
      </instancedMesh>
      <instancedMesh ref={moving} args={[null, null, MAX_MOVE]} frustumCulled={false}>
        <primitive object={CORRIDOR_CAR} attach="geometry" />
        <meshStandardMaterial color={C3.accent} vertexColors />
      </instancedMesh>
      <instancedMesh ref={side} args={[null, null, MAX_SIDE]} frustumCulled={false}>
        <primitive object={CORRIDOR_CAR} attach="geometry" />
        <meshStandardMaterial color={C3.geo} vertexColors />
      </instancedMesh>
      {/* signal poles */}
      {JX.map((x, j) => (
        <group key={x} position={[x - 1.7, 0, z - 1.9]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 2.2]} />
            <meshStandardMaterial color={C3.ink} />
          </mesh>
          <mesh position={[0, 2.35, 0]}>
            <boxGeometry args={[0.5, 0.7, 0.5]} />
            <meshStandardMaterial color={C3.ink} />
          </mesh>
          <mesh ref={el => (lights.current[j] = el)} position={[0, 2.35, 0.27]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color={C3.good} emissive={C3.good} emissiveIntensity={1.2} />
          </mesh>
          {showNames && <Label3D text={`${JUNCTIONS[j]} · ${names[j]}`} position={[1.7, 4.2, 0]} height={lh} />}
        </group>
      ))}
      <group position={[EXIT, 0, z - 1.9]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 2.2]} />
          <meshStandardMaterial color={C3.ink} />
        </mesh>
        <mesh ref={exitLight} position={[0, 2.35, 0]}>
          <sphereGeometry args={[0.24, 16, 16]} />
          <meshStandardMaterial color={C3.good} emissive={C3.good} emissiveIntensity={1.2} />
        </mesh>
        {showNames && <Label3D text="Signal D" position={[0, 4.2, 0]} height={lh} />}
      </group>
      {/* blocked junction boxes */}
      {JX.map((x, j) => (
        <mesh key={x} ref={el => (blocks.current[j] = el)} position={[x, 0.9, z]} visible={false}>
          <boxGeometry args={[2.8, 1.8, 3.4]} />
          <meshStandardMaterial color={C3.critical} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
      {highlight !== null && (
        <mesh position={[JX[highlight], 0.08, z]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[3.4, 3.9, 48]} />
          <meshBasicMaterial color={C3.ink} />
        </mesh>
      )}
      {/* "road ahead" storage bars */}
      {links.map((l, j) => (
        <group key={j}>
          <mesh position={[l.x0 + l.len / 2, 0.06, z - 2.3]}>
            <boxGeometry args={[l.len, 0.12, 0.45]} />
            <meshStandardMaterial color={C3.road} />
          </mesh>
          <mesh ref={el => { if (el) { fills.current[j] = el; el.userData = { x0: l.x0, len: l.len } } }} position={[l.x0, 0.14, z - 2.3]} material={fillMats[j]}>
            <boxGeometry args={[l.len, 0.28, 0.5]} />
          </mesh>
        </group>
      ))}
      <Label3D text={portrait ? label.replace('Local adaptive', 'Adaptive').replace('Fixed timer', 'Fixed') : label} dot={color} position={portrait ? [ENTRY + 9, 2.5, z] : [ENTRY + 7, 2.2, z - 2.6]} height={lh} />
    </group>
  )
}

function Scene({ world, getSpeed, names, highlight }) {
  const { size } = useThree()
  const portrait = size.width / size.height < 1
  return (
    <>
      <hemisphereLight args={['#ffffff', '#d9d7cf', 1.1]} />
      <directionalLight position={[20, 40, 25]} intensity={1.4} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color={C3.land} />
      </mesh>
      <group rotation-y={portrait ? Math.PI / 2 : 0}>
        {CONTROLLERS.map((c, i) => (
          <Lane
            key={c.key}
            sim={() => world.sims[i]}
            frac={() => world.frac ?? 0}
            simSpeed={getSpeed}
            z={LANE_Z[i]}
            label={c.label}
            color={c.key === 'fixed' ? C3.muted : c.key === 'adaptive' ? C3.sig : C3.accent}
            names={names}
            showNames={i === 0}
            highlight={highlight !== null && i > 0 ? highlight : null}
            portrait={portrait}
          />
        ))}
      </group>
      <FitCamera landscape={LANDSCAPE} portrait={PORTRAIT} />
      <Controls />
    </>
  )
}

const Corridor3D = memo(function Corridor3D({ world, getSpeed, names, highlight = null }) {
  return (
    <div className="h-[460px] w-full overflow-hidden rounded-lg bg-land sm:h-[440px] lg:h-[480px]" aria-label="3D view of the three corridors" role="img">
      <Canvas flat camera={{ fov: 42, position: LANDSCAPE }} dpr={[1, 1.5]}>
        <Scene world={world} getSpeed={getSpeed} names={names} highlight={highlight} />
      </Canvas>
    </div>
  )
})

export default Corridor3D
