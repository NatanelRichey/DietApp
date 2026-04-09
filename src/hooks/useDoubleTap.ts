import { useRef, useCallback } from 'react'

export function useDoubleTap(options: {
  onFirstTap?: () => void
  onDoubleTap: () => void
  delayMs?: number
}): () => void {
  const { onFirstTap, onDoubleTap, delayMs = 600 } = options
  // Keep handlers in refs so the returned callback never needs to change identity
  const onFirstTapRef = useRef(onFirstTap)
  const onDoubleTapRef = useRef(onDoubleTap)
  onFirstTapRef.current = onFirstTap
  onDoubleTapRef.current = onDoubleTap

  const lastTapRef = useRef(0)

  return useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < delayMs) {
      lastTapRef.current = 0
      onDoubleTapRef.current()
    } else {
      lastTapRef.current = now
      onFirstTapRef.current?.()
    }
  }, [delayMs]) // delayMs won't change, so this callback is effectively stable
}
