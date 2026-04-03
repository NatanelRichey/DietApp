import { useState, useEffect, useCallback, useRef } from 'react'
import type { UserData } from '../types'

const DEFAULT_DATA: UserData = {
  weightHistory: [],
  dayPlans: {
    'Typical': {
      type: 'Typical',
      meals: [
        { id: '1', name: 'Breakfast', time: '08:00', calories: 450, completed: false },
        { id: '2', name: 'Lunch', time: '13:00', calories: 700, completed: false },
        { id: '3', name: 'Dinner', time: '19:30', calories: 600, completed: false }
      ],
      guidelines: 'Drink 2L water.'
    }
  },
  activePlanId: 'Typical',
  documents: [],
  dailyLogs: {}
}

// localStorage helpers — primary persistence layer (instant, no network needed)
const localKey = (user: string) => `dietapp_${user.toLowerCase()}`

const saveLocal = (user: string, data: UserData) => {
  try { localStorage.setItem(localKey(user), JSON.stringify(data)) } catch {}
}

const loadLocal = (user: string): UserData | null => {
  try {
    const raw = localStorage.getItem(localKey(user))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const useDatabase = (user: string | null, initialData: UserData) => {
  const initialDataRef = useRef<UserData>(initialData)

  // Seed state from localStorage immediately so there's no blank flash on load
  const [data, setData] = useState<UserData>(() => {
    if (user) {
      const local = loadLocal(user)
      if (local) return { ...initialData, ...local }
    }
    return initialData
  })

  const [loading, setLoading] = useState(true)
  const pendingSaveRef = useRef<UserData | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveToCloud = useCallback(async (updatedData: UserData) => {
    if (!user) return
    pendingSaveRef.current = null
    try {
      await fetch(`/api/data?user=${user.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      })
    } catch (error) {
      console.error('Cloud save error:', error)
    }
  }, [user])

  // Flush pending cloud save immediately (called on visibility change / beforeunload)
  const flushSave = useCallback(() => {
    if (pendingSaveRef.current) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveToCloud(pendingSaveRef.current)
    }
  }, [saveToCloud])

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushSave() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flushSave)
    window.addEventListener('beforeunload', flushSave)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flushSave)
      window.removeEventListener('beforeunload', flushSave)
    }
  }, [flushSave])

  // Fetch from cloud — syncs on login; localStorage already provided instant data
  useEffect(() => {
    if (!user) {
      // Always reset to default on logout so the next user starts clean
      setData(initialDataRef.current)
      setLoading(false)
      return
    }

    let cancelled = false

    // Load this user's localStorage immediately — never show another user's data
    const local = loadLocal(user)
    setData(local ? { ...initialDataRef.current, ...local } : initialDataRef.current)
    setLoading(!local) // only show spinner if we have nothing to show yet

    const fetchData = async () => {
      if (!local) setLoading(true)
      try {
        const response = await fetch(`/api/data?user=${user.toLowerCase()}`)
        if (!cancelled && response.ok) {
          const cloudData = await response.json()
          if (cloudData && typeof cloudData === 'object' && !cloudData.error) {
            const merged = { ...initialDataRef.current, ...cloudData }
            if (!cancelled) {
              setData(merged)
              saveLocal(user, merged) // Keep local cache in sync with cloud
            }
          }
          // If cloudData is null, keep localStorage data (already set above)
        }
      } catch (error) {
        console.error('Cloud fetch error:', error)
        // Keep localStorage data — already loaded above
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [user, saveToCloud])

  const updateData = useCallback((newData: UserData) => {
    setData(newData)
    // Save to localStorage immediately — survives logout, app close, API failures
    if (user) saveLocal(user, newData)
    pendingSaveRef.current = newData
    // Also debounce cloud save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveToCloud(newData)
    }, 400)
  }, [saveToCloud, user])

  return { data, setData: updateData, loading }
}

export { DEFAULT_DATA }
export default useDatabase
