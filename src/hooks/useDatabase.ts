import { useState, useEffect, useCallback, useRef } from 'react'
import type { UserData } from '../types'

const useDatabase = (user: string | null, initialData: UserData) => {
  const [data, setData] = useState<UserData>(initialData)
  const [loading, setLoading] = useState(true)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch data
  useEffect(() => {
    if (!user) return
    
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/data?user=${user}`)
        if (response.ok) {
          const cloudData = await response.json()
          if (cloudData) {
            setData(cloudData)
          } else {
            // First time user, use initialData but save it to KV
            setData(initialData)
            saveToCloud(initialData)
          }
        }
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const saveToCloud = async (updatedData: UserData) => {
    if (!user) return
    try {
      await fetch(`/api/data?user=${user}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      })
    } catch (error) {
      console.error('Save error:', error)
    }
  }

  const updateData = useCallback((newData: UserData) => {
    setData(newData)
    
    // Debounce saving
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveToCloud(newData)
    }, 1000) // 1 second debounce
  }, [user])

  return { data, setData: updateData, loading }
}

export default useDatabase
