import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CONTROLLERS, JUNCTIONS, P, occupancy } from '../../engine/corridor'
import { C3, Controls, FitCamera, Label3D } from './common'

// World layout: each corridor runs along x; the three controllers sit side by side along z.
const JX = [-27, 3, 33]
const ENTRY = -48
const EXIT = 48.5
const LANE_Z = [-13, 0, 13]
const CAR = 1.2 // spacing between queued cars
const MAX_Q = 140
const MAX_MOVE = 70
const MAX_SIDE = 24

const LANDSCAPE = [0, 40, 44]
const PORTRAIT = [0, 122, 26]

const tmp = new THREE.Object3D()
const hide = (mesh, from) => {
  tmp.position.set(0, -50, 0)
  tmp.scale.set(0, 0, 0)
  tmp.updateMatrix()
  for (let i = from; i < mesh.count; i++) mesh.setMatrixAt(i, tmp.matrix)
}
const put = (mesh, i, x, y, z, rotY = 0) => {
  tmp.position.set(x, y, z)
  tmp.rotation.set(0, rotY, 0)
  tmp.scale.set(1, 1, 1)
  tmp.updateMatrix()
  mesh.setMatrixAt(i, tmp.matrix)
}

function Lane({ sim, z, label, color, names, showNames, highlight, portrait }) {
  const lh = portrait ? 3.8 : 2.4 // label height in world units
  const queued = useRef()
  const moving = useRef()
  const side = useRef()
  const lights = useRef([])
  const blocks = useRef([])
  const fills = useRef([])
  const exitLight = useRef()

  const fillMats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: C3.good })), [])

  useFrame(({ clock }) => {
    const s = sim()
    if (!s || !queued.current) return
    // queued cars at each stop line, plus the downstream queue at D
    let qi = 0
    JX.forEach((x, j) => {
      const prev = j === 0 ? ENTRY : JX[j - 1] + 1.6
      const room = Math.floor((x - 1.6 - prev) / CAR)
      const n = Math.min(s.mainQ[j].length, room)
      for (let i = 0; i < n && qi < MAX_Q; i++) put(queued.current, qi++, x - 1.6 - (i + 0.5) * CAR, 0.32, z + 0.6)
    })
    for (let i = 0; i < Math.min(s.exitQ.length, 12) && qi < MAX_Q; i++) put(queued.current, qi++, EXIT - 1.2 - (i + 0.5) * CAR, 0.32, z + 0.6)
    hide(queued.current, qi)
    queued.current.instanceMatrix.needsUpdate = true

    // cars moving along each link
    let mi = 0
    s.link.forEach((l, j) => {
      const start = JX[j] + 1.6
      const tail = (j < 2 ? JX[j + 1] - 1.6 : EXIT - 1.2) - (j < 2 ? s.mainQ[j + 1].length : s.exitQ.length) * CAR - 1
      l.forEach(c => {
        if (mi >= MAX_MOVE) return
        const prog = Math.min(1, Math.max(0, 1 - (c.at - s.t) / P.freeFlow[j]))
        put(moving.current, mi++, start + prog * Math.max(0, tail - start), 0.32, z + 0.6)
      })
    })
    hide(moving.current, mi)
    moving.current.instanceMatrix.needsUpdate = true

    // side-street queues on the cross streets
    let si = 0
    JX.forEach((x, j) => {
      for (let i = 0; i < Math.min(s.sideQ[j].length, 8) && si < MAX_SIDE; i++) put(side.current, si++, x + 0.5, 0.32, z + 2.4 + i * CAR, Math.PI / 2)
    })
    hide(side.current, si)
    side.current.instanceMatrix.needsUpdate = true

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
        <boxGeometry args={[0.95, 0.55, 0.75]} />
        <meshStandardMaterial color={C3.ink2} />
      </instancedMesh>
      <instancedMesh ref={moving} args={[null, null, MAX_MOVE]} frustumCulled={false}>
        <boxGeometry args={[0.95, 0.55, 0.75]} />
        <meshStandardMaterial color={C3.accent} />
      </instancedMesh>
      <instancedMesh ref={side} args={[null, null, MAX_SIDE]} frustumCulled={false}>
        <boxGeometry args={[0.95, 0.55, 0.75]} />
        <meshStandardMaterial color={C3.geo} />
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

function Scene({ world, names, highlight }) {
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

const Corridor3D = memo(function Corridor3D({ world, names, highlight = null }) {
  return (
    <div className="h-[460px] w-full overflow-hidden rounded-lg bg-land sm:h-[440px] lg:h-[480px]" aria-label="3D view of the three corridors" role="img">
      <Canvas flat camera={{ fov: 42, position: LANDSCAPE }} dpr={[1, 2]}>
        <Scene world={world} names={names} highlight={highlight} />
      </Canvas>
    </div>
  )
})

export default Corridor3D
