import { useState, useEffect, useCallback, useRef } from 'react'
import type { UserData } from '../types'

const useDatabase = (user: string | null, initialData: UserData) => {
  // Capture initialData once on mount so it never triggers re-runs
  const initialDataRef = useRef<UserData>(initialData)
  const [data, setData] = useState<UserData>(initialData)
  const [loading, setLoading] = useState(true)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveToCloud = useCallback(async (updatedData: UserData) => {
    if (!user) return
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

  // Fetch data — only re-runs when `user` changes, not on every render
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
            setData(cloudData)
          } else {
            // First time user — seed with defaults and save
            setData(initialDataRef.current)
            saveToCloud(initialDataRef.current)
          }
        }
      } catch (error) {
        if (!cancelled) console.error('Fetch error:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => { cancelled = true }
  }, [user, saveToCloud]) // initialData intentionally excluded — captured by ref

  const updateData = useCallback((newData: UserData) => {
    setData(newData)

    // Debounce save — waits 1s after last change before syncing
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveToCloud(newData)
    }, 1000)
  }, [saveToCloud])

  return { data, setData: updateData, loading }
}

export default useDatabase
