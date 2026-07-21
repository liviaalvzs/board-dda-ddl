import { useState, useEffect } from 'react'
import { getDelayedThresholdDays } from '@/services/app-settings'

let cachedThreshold: number = 7
let fetched = false

export function useDelayedThreshold() {
  const [threshold, setThreshold] = useState<number>(cachedThreshold)
  const [loading, setLoading] = useState(!fetched)

  useEffect(() => {
    if (fetched) return
    getDelayedThresholdDays()
      .then((days) => {
        cachedThreshold = days
        fetched = true
        setThreshold(days)
      })
      .catch(() => {
        fetched = true
      })
      .finally(() => setLoading(false))
  }, [])

  return { threshold, loading }
}
