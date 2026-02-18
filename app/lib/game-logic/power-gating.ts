/**
 * Power Gating System (MVP)
 *
 * When alignment falls below 20 (severed), advanced powers are disabled.
 * This is a lightweight check that can be integrated into power usage flows.
 */

import { getAlignmentTier } from './alignment'

/**
 * Powers tagged as "advanced" - these require alignment to use
 * Default: all powers are "basic" unless explicitly listed here
 */
const ADVANCED_POWER_IDS = new Set<string>([
  // High-tier offensive powers
  'energy_blast',
  'fire_manipulation',
  'ice_manipulation',
  'lightning_strike',
  // High-tier defensive powers
  'force_field',
  'invulnerability',
  // High-tier utility powers
  'teleportation',
  'time_manipulation',
  'reality_warp',
  // High-tier mental powers
  'mind_control',
  'mass_telepathy',
])

/**
 * Check if a power is considered "advanced"
 */
export function isAdvancedPower(powerId: string): boolean {
  return ADVANCED_POWER_IDS.has(powerId)
}

/**
 * Check if a power can be used given current alignment
 * Returns { canUse: boolean, reason?: string }
 */
export function canUsePower(
  powerId: string,
  alignmentValue: number | null
): { canUse: boolean; reason?: string } {
  // Non-divine origins (null alignment) have no restrictions
  if (alignmentValue === null) {
    return { canUse: true }
  }

  // Basic powers are always available
  if (!isAdvancedPower(powerId)) {
    return { canUse: true }
  }

  // Advanced powers require alignment >= 20
  const tier = getAlignmentTier(alignmentValue)
  if (tier === 'severed') {
    return {
      canUse: false,
      reason: 'Your patron has withdrawn. Advanced abilities fail.',
    }
  }

  return { canUse: true }
}

/**
 * Get a list of disabled powers for the current alignment
 */
export function getDisabledPowers(
  playerPowerIds: string[],
  alignmentValue: number | null
): string[] {
  if (alignmentValue === null || alignmentValue >= 20) {
    return []
  }

  return playerPowerIds.filter((powerId) => isAdvancedPower(powerId))
}

/**
 * Get warning message for a power if alignment is drifting
 */
export function getPowerWarning(
  powerId: string,
  alignmentValue: number | null
): string | null {
  if (alignmentValue === null) return null
  if (!isAdvancedPower(powerId)) return null

  const tier = getAlignmentTier(alignmentValue)
  if (tier === 'drifting') {
    return 'This power may become unreliable if your alignment drops further.'
  }

  return null
}
