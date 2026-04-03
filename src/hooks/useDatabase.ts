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

const useDatabase = (user: string | null, initialData: UserData) => {
  const initialDataRef = useRef<UserData>(initialData)
  const [data, setData] = useState<UserData>(initialData)
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
      console.error('Save error:', error)
    }
  }, [user])

  // Flush any pending save immediately (called on visibility change / beforeunload)
  const flushSave = useCallback(() => {
    if (pendingSaveRef.current) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      const dataToSave = pendingSaveRef.current
      saveToCloud(dataToSave)
    }
  }, [saveToCloud])

  // Listen for page hide / visibility change so we flush before mobile pull-to-refresh unloads page
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave()
    }
    const handleBeforeUnload = () => flushSave()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handleBeforeUnload)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handleBeforeUnload)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [flushSave])

  // Fetch data — only re-runs when user changes
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/data?user=${user.toLowerCase()}`)
        if (!cancelled && response.ok) {
          const cloudData = await response.json()
          if (cloudData) {
            // Merge: ensure new fields (dailyLogs) exist even for old data
            setData({ ...initialDataRef.current, ...cloudData })
          } else {
            setData(initialDataRef.current)
            saveToCloud(initialDataRef.current)
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Fetch error:', error)
          setData(initialDataRef.current)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [user, saveToCloud])

  const updateData = useCallback((newData: UserData) => {
    setData(newData)
    pendingSaveRef.current = newData

    // Debounce 400ms, but flushSave will fire immediately if page hides
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveToCloud(newData)
    }, 400)
  }, [saveToCloud])

  return { data, setData: updateData, loading }
}

export { DEFAULT_DATA }
export default useDatabase
