/* eslint-disable react-refresh/only-export-components */
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

// Scene colors (three.js can't read CSS variables; these mirror src/index.css).
export const C3 = {
  land: '#ecebe4',
  road: '#d9d7cf',
  roadMajor: '#bdbbb2',
  lane: '#fcfcfb',
  ink: '#0b0b0b',
  ink2: '#52514e',
  accent: '#2a78d6',
  geo: '#1baf7a',
  sig: '#eb6834',
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
  muted: '#898781',
  water: '#cfe1f3',
}

// Touch screens: leave dragging to page scroll instead of orbiting the scene.
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const on = () => setCoarse(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return coarse
}

// Places the camera for the canvas aspect: landscape looks across, portrait looks down the corridor.
export function FitCamera({ landscape, portrait, target = [0, 0, 0], threshold = 1 }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const p = size.width / size.height < threshold ? portrait : landscape
    camera.position.set(...p)
    camera.lookAt(...target)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height, landscape, portrait, target, threshold])
  return null
}

export function Controls({ target = [0, 0, 0] }) {
  const coarse = useCoarsePointer()
  if (coarse) return null
  return (
    <OrbitControls
      target={target}
      enableZoom={false}
      enablePan={false}
      minPolarAngle={0.25}
      maxPolarAngle={1.25}
      minAzimuthAngle={-0.9}
      maxAzimuthAngle={0.9}
    />
  )
}

// Text label drawn into the scene as a sprite (no DOM overlay, no font download — works offline).
// `height` is in world units; the label always faces the camera and stays on top.
export function Label3D({ text, position, height = 1.4, color = C3.ink, dot }) {
  const { tex, aspect } = useMemo(() => {
    const px = 2 // render at 2× for crisp text
    const fs = 26
    const font = `600 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')
    ctx.font = font
    const pad = 12
    const dotW = dot ? 22 : 0
    const w = Math.ceil(ctx.measureText(text).width + pad * 2 + dotW)
    const h = 42
    c.width = w * px
    c.height = h * px
    ctx.scale(px, px)
    ctx.fillStyle = 'rgba(252,252,251,0.94)'
    ctx.strokeStyle = 'rgba(11,11,11,0.15)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(1, 1, w - 2, h - 2, 9)
    ctx.fill()
    ctx.stroke()
    if (dot) {
      ctx.fillStyle = dot
      ctx.beginPath()
      ctx.arc(pad + 7, h / 2, 7, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.font = font
    ctx.fillStyle = color
    ctx.textBaseline = 'middle'
    ctx.fillText(text, pad + dotW, h / 2 + 1)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return { tex: t, aspect: w / h }
  }, [text, color, dot])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={tex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </sprite>
  )
}
