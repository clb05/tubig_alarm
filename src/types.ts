export type FloodLevel = 0 | 1 | 2 | 3 | 4

export type FloodReading = {
  id: string
  level: FloodLevel
  timestamp: string
  smsSent: boolean
}

export type LevelReading = {
  timestamp: string
  level: FloodLevel
}

export type FloodData = {
  currentLevel: FloodLevel
  lastReadingAt: string
  lastLevelChangeAt: string
  deviceOnline: boolean
  deviceLastSeenAt: string
  location: {
    lat: number
    lng: number
  }
  history: FloodReading[]
  levelReadings: LevelReading[]
}

export type Thresholds = {
  sensor1: number
  sensor2: number
  sensor3: number
  sensor4: number
}

export type FloodStatus = {
  level: FloodLevel
  label: string
  shortLabel: string
  color: string
  softColor: string
  textColor: string
  iconColor: string
}