import { useState, useEffect, useCallback } from 'react'
import {
  getDelayedThresholdDays,
  getStageThresholds,
  type StageThreshold,
} from '@/services/app-settings'

let cachedThreshold: number = 7
let cachedStageThresholds: Record<string, StageThreshold> = {}
let fetched = false

export function invalidateThresholdCache() {
  fetched = false
  cachedStageThresholds = {}
}

export function useDelayedThreshold() {
  const [threshold, setThreshold] = useState<number>(cachedThreshold)
  const [stageThresholds, setStageThresholds] =
    useState<Record<string, StageThreshold>>(cachedStageThresholds)
  const [loading, setLoading] = useState(!fetched)

  useEffect(() => {
    if (fetched) return
    Promise.all([getDelayedThresholdDays(), getStageThresholds()])
      .then(([days, stages]) => {
        cachedThreshold = days
        cachedStageThresholds = stages
        fetched = true
        setThreshold(days)
        setStageThresholds(stages)
      })
      .catch(() => {
        fetched = true
      })
      .finally(() => setLoading(false))
  }, [])

  const getThresholdForStage = useCallback(
    (stageId: string): StageThreshold => {
      const stage = stageThresholds[stageId]
      if (stage) return stage
      const attentionDays = Math.max(1, Math.floor(threshold / 2))
      return { attention: attentionDays, delayed: threshold }
    },
    [stageThresholds, threshold],
  )

  return { threshold, stageThresholds, getThresholdForStage, loading }
}
