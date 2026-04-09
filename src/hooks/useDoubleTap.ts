import { useRef } from 'react'

export function useDoubleTap(options: {
  onFirstTap?: () => void
  onDoubleTap: () => void
  delayMs?: number
}): () => void {
  const { onFirstTap, onDoubleTap, delayMs = 500 } = options
  const lastTapRef = useRef(0)

  return () => {
    const now = Date.now()
    if (now - lastTapRef.current < delayMs) {
      lastTapRef.current = 0
      onDoubleTap()
    } else {
      lastTapRef.current = now
      onFirstTap?.()
    }
  }
}
