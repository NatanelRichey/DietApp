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
  weekSchedule: {},
  documents: [],
  dailyLogs: {},
  simCart: {
    foodItems: [],
    savedMeals: [],
    dailyLogs: {}
  }
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

// Deep merge: cloud is authoritative for which keys EXIST (deletions).
// Local wins on value conflicts within shared keys (offline edits).
// This prevents deleted plans from reappearing via stale localStorage.
const mergeUserData = (local: UserData, cloud: UserData): UserData => ({
  ...cloud,
  ...local,
  // Cloud's plan list is authoritative: don't restore plans cloud deleted.
  // But if local has edits to an existing plan, keep them.
  dayPlans: Object.fromEntries(
    Object.keys(cloud.dayPlans).map(key => [
      key,
      local.dayPlans?.[key] ? { ...cloud.dayPlans[key], ...local.dayPlans[key] } : cloud.dayPlans[key],
    ])
  ),
  weekSchedule:  { ...cloud.weekSchedule,  ...local.weekSchedule },
  dailyLogs:     { ...cloud.dailyLogs,     ...local.dailyLogs },
  weightHistory: local.weightHistory?.length ? local.weightHistory : (cloud.weightHistory ?? []),
  documents:     local.documents?.length     ? local.documents     : (cloud.documents     ?? []),
  simCart: {
    ...(cloud.simCart ?? {}),
    ...(local.simCart ?? {}),
    foodItems:  local.simCart?.foodItems?.length  ? local.simCart.foodItems  : (cloud.simCart?.foodItems  ?? []),
    savedMeals: local.simCart?.savedMeals?.length ? local.simCart.savedMeals : (cloud.simCart?.savedMeals ?? []),
    dailyLogs:  { ...(cloud.simCart?.dailyLogs ?? {}), ...(local.simCart?.dailyLogs ?? {}) },
  },
})

export type CloudSyncStatus = 'idle' | 'saving' | 'saved' | 'error'

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
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle')
  const pendingSaveRef   = useRef<UserData | null>(null)
  const saveTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Guard: block cloud saves until the initial cloud fetch is complete.
  // Without this, seed-effect setData calls race against the cloud fetch and
  // can overwrite cloud data with partial localStorage data.
  const cloudReadyRef = useRef(false)

  const saveToCloud = useCallback(async (updatedData: UserData) => {
    if (!user) return
    pendingSaveRef.current = null
    setSyncStatus('saving')
    try {
      const res = await fetch(`/api/data?user=${user.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSyncStatus('saved')
      setTimeout(() => setSyncStatus(s => s === 'saved' ? 'idle' : s), 2000)
    } catch (error) {
      console.error('Cloud save error:', error)
      setSyncStatus('error')
    }
  }, [user])

  // Flush pending cloud save immediately (called on visibility change / beforeunload)
  const flushSave = useCallback(() => {
    if (pendingSaveRef.current && cloudReadyRef.current) {
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

  // Fetch from cloud on login; localStorage already provided instant data
  useEffect(() => {
    if (!user) {
      setData(initialDataRef.current)
      setLoading(false)
      cloudReadyRef.current = false
      return
    }

    // Block cloud saves until this fetch completes
    cloudReadyRef.current = false

    // Cancel any debounced saves from the previous state (e.g. seed effects
    // that fired before we got authoritative cloud data)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    pendingSaveRef.current = null

    let cancelled = false

    const local = loadLocal(user)
    setData(local ? { ...initialDataRef.current, ...local } : initialDataRef.current)
    setLoading(!local)

    const fetchData = async () => {
      if (!local) setLoading(true)
      try {
        const response = await fetch(`/api/data?user=${user.toLowerCase()}`)
        if (!cancelled && response.ok) {
          const cloudData = await response.json()
          if (cloudData && typeof cloudData === 'object' && !cloudData.error) {
            const currentLocal = loadLocal(user)
            const merged = currentLocal
              ? mergeUserData(currentLocal, cloudData)
              : { ...initialDataRef.current, ...cloudData }
            if (!cancelled) {
              // Clear any debounced saves queued during the fetch window
              // (seed effects, etc.) — cloud data is the authority
              if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
              pendingSaveRef.current = null

              setData(merged)
              saveLocal(user, merged)
              // Cloud already has its data; only push back if local had extra
              // data not in cloud (detected by merge differing from cloud).
              // Simplified: just allow cloud saves from user actions from here.
            }
          }
        }
      } catch (error) {
        console.error('Cloud fetch error:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
          // Unblock cloud saves now that we have authoritative data
          cloudReadyRef.current = true
        }
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [user, saveToCloud])

  const updateData = useCallback((newData: UserData) => {
    setData(newData)
    if (user) saveLocal(user, newData)

    // Don't queue cloud saves until the initial cloud fetch is done —
    // prevents seed effects from overwriting cloud data with partial local state
    if (!cloudReadyRef.current) return

    pendingSaveRef.current = newData
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveToCloud(newData)
    }, 400)
  }, [saveToCloud, user])

  return { data, setData: updateData, loading, syncStatus }
}

export { DEFAULT_DATA }
export default useDatabase
