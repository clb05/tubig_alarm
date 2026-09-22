import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { io } from 'socket.io-client'
import { defaultThresholds, mockFloodData } from '../data/mockFloodData'
import type { FloodData, FloodLevel, Thresholds } from '../types'

type FloodDataContextValue = FloodData & {
  data: FloodData
  isLoading: boolean
  isDemo: boolean
  isRefreshing: boolean
  refresh: () => Promise<void>
  thresholds: Thresholds
  setThresholds: (thresholds: Thresholds) => void
  smsRecipients: string[]
  setSmsRecipients: (recipients: string[]) => void
}

const FloodDataContext = createContext<FloodDataContextValue | null>(null)

const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

function asLevel(value: unknown): FloodLevel {
  const level = Number(value)
  return [0, 1, 2, 3, 4].includes(level) ? (level as FloodLevel) : 0
}

function normalizeData(latest: any, history: any, status: any): FloodData {
  const latestItem = latest?.reading ?? latest?.data ?? latest
  const historyItems = Array.isArray(history) ? history : history?.history ?? history?.readings ?? []
  const statusData = status?.status ?? status?.data ?? status
  const location = latestItem?.location ?? statusData?.location ?? mockFloodData.location
  const normalizedHistory = historyItems.map((item: any, index: number) => ({
    id: String(item.id ?? item._id ?? `reading-${index}`),
    level: asLevel(item.level ?? item.currentLevel),
    lat: Number.isFinite(Number(item.lat)) ? Number(item.lat) : undefined,
    lng: Number.isFinite(Number(item.lng)) ? Number(item.lng) : undefined,
    timestamp: item.timestamp ?? item.createdAt ?? new Date().toISOString(),
    smsSent: Boolean(item.smsSent),
  }))
  const currentLevel = asLevel(latestItem?.level ?? latestItem?.currentLevel ?? statusData?.currentLevel)
  return {
    currentLevel,
    lastReadingAt: latestItem?.timestamp ?? latestItem?.lastReadingAt ?? new Date().toISOString(),
    lastLevelChangeAt: latestItem?.lastLevelChangeAt ?? statusData?.lastLevelChangeAt ?? new Date().toISOString(),
    deviceOnline: Boolean(statusData?.deviceOnline ?? statusData?.online ?? false),
    deviceLastSeenAt: statusData?.lastSeenAt ?? latestItem?.receivedAt ?? latestItem?.timestamp ?? new Date().toISOString(),
    location: {
      lat: Number(location?.lat ?? latestItem?.lat ?? mockFloodData.location.lat),
      lng: Number(location?.lng ?? latestItem?.lng ?? mockFloodData.location.lng),
    },
    history: normalizedHistory,
    levelReadings: normalizedHistory
      .slice()
      .reverse()
      .map((item: { timestamp: string; level: FloodLevel }) => ({ timestamp: item.timestamp, level: item.level })),
  }
}

async function getJson(path: string) {
  const response = await fetch(`${apiBase}${path}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

export function FloodDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FloodData>(mockFloodData)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [thresholds, setThresholdsState] = useState<Thresholds>(() => {
    try {
      return JSON.parse(localStorage.getItem('flood-alert-thresholds') ?? 'null') ?? defaultThresholds
    } catch {
      return defaultThresholds
    }
  })
  const [smsRecipients, setSmsRecipientsState] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('flood-alert-recipients') ?? 'null') ?? ['+63 917 555 0198', '+63 905 242 1184']
    } catch {
      return ['+63 917 555 0198', '+63 905 242 1184']
    }
  })

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      const [latest, history, status] = await Promise.all([
        getJson('/api/readings/latest'),
        getJson('/api/readings/history'),
        getJson('/api/device/status'),
      ])
      setData(normalizeData(latest, history, status))
      setIsDemo(false)
    } catch {
      setIsDemo(true)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const socket = io(apiBase || undefined, {
      transports: ['polling', 'websocket'],
    })
    const onReading = (reading: any) => {
      setData((previous) => {
        const nextReading = {
          id: String(reading.id ?? `live-${Date.now()}`),
          level: asLevel(reading.level ?? reading.currentLevel),
          lat: Number.isFinite(Number(reading.lat)) ? Number(reading.lat) : undefined,
          lng: Number.isFinite(Number(reading.lng)) ? Number(reading.lng) : undefined,
          timestamp: reading.timestamp ?? new Date().toISOString(),
          smsSent: Boolean(reading.smsSent),
        }
        const nextLocation = {
          lat: nextReading.lat ?? previous.location.lat,
          lng: nextReading.lng ?? previous.location.lng,
        }
        return {
          ...previous,
          currentLevel: nextReading.level,
          lastReadingAt: nextReading.timestamp,
          lastLevelChangeAt: nextReading.level === previous.currentLevel ? previous.lastLevelChangeAt : nextReading.timestamp,
          deviceOnline: true,
          deviceLastSeenAt: reading.receivedAt ?? new Date().toISOString(),
          location: nextLocation,
          history: [nextReading, ...previous.history].slice(0, 100),
          levelReadings: [...previous.levelReadings, { timestamp: nextReading.timestamp, level: nextReading.level }].slice(-48),
        }
      })
      setIsDemo(false)
    }
    const onStatus = (status: any) => {
      setData((previous) => ({
        ...previous,
        deviceOnline: Boolean(status.deviceOnline ?? status.online),
        deviceLastSeenAt: status.lastSeenAt ?? previous.deviceLastSeenAt,
      }))
    }
    socket.on('reading:new', onReading)
    socket.on('device:status', onStatus)
    return () => {
      socket.off('reading:new', onReading)
      socket.off('device:status', onStatus)
      socket.disconnect()
    }
  }, [])

  const value = useMemo(
    () => ({
      ...data,
      data,
      isLoading,
      isDemo,
      isRefreshing,
      refresh,
      thresholds,
      setThresholds: (next: Thresholds) => {
        setThresholdsState(next)
        localStorage.setItem('flood-alert-thresholds', JSON.stringify(next))
      },
      smsRecipients,
      setSmsRecipients: (next: string[]) => {
        setSmsRecipientsState(next)
        localStorage.setItem('flood-alert-recipients', JSON.stringify(next))
      },
    }),
    [data, isLoading, isDemo, isRefreshing, thresholds, smsRecipients],
  )

  return <FloodDataContext.Provider value={value}>{children}</FloodDataContext.Provider>
}

export function useFloodData() {
  const context = useContext(FloodDataContext)
  if (!context) throw new Error('useFloodData must be used inside FloodDataProvider')
  return context
}