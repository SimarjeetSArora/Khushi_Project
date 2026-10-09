/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'

const TooltipContext = createContext({ show: () => {}, hide: () => {} })

export function TooltipProvider({ children }) {
  const [tip, setTip] = useState(null) // { content, x, y }
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })

  const show = useCallback((content, e) => setTip({ content, x: e.clientX, y: e.clientY }), [])
  const hide = useCallback(() => setTip(null), [])

  // Keep the tooltip inside the viewport: flip left/up near the edges.
  useLayoutEffect(() => {
    if (!tip || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    let left = tip.x + 14
    let top = tip.y + 14
    if (left + r.width > window.innerWidth - 8) left = tip.x - r.width - 14
    if (top + r.height > window.innerHeight - 8) top = tip.y - r.height - 14
    setPos({ left, top })
  }, [tip])

  return (
    <TooltipContext.Provider value={{ show, hide }}>
      {children}
      <div
        ref={ref}
        role="tooltip"
        style={pos}
        className={`pointer-events-none fixed z-50 max-w-72 rounded-lg border border-black/10 bg-surface px-2.5 py-1.5 text-xs shadow-lg transition-opacity duration-100 ${tip ? 'opacity-100' : 'opacity-0'}`}
      >
        {tip?.content}
      </div>
    </TooltipContext.Provider>
  )
}

export const useTooltip = () => useContext(TooltipContext)

// Spread onto any element: {...tipHandlers(tooltip, <content/>)}
export const tipHandlers = (tooltip, content) => ({
  onMouseMove: e => tooltip.show(content, e),
  onMouseLeave: tooltip.hide,
})
