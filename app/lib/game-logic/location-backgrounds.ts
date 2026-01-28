// lib/game-logic/location-backgrounds.ts

const BACKGROUND_MAP: Record<string, string> = {
  downtown: '/images/downtown.png',
  industrial: '/images/industrial.png',
  waterfront: '/images/waterfront.png',
  slums: '/images/slums.png',
  midtown: '/images/midtown.png',
}

const DEFAULT_BACKGROUND = '/images/downtown.png'

export function getLocationBackground(locationId: string): string {
  return BACKGROUND_MAP[locationId] ?? DEFAULT_BACKGROUND
}
