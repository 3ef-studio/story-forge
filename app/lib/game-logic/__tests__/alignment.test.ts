import { describe, it, expect } from 'vitest';
import {
  getAlignmentTier,
  getAlignmentModifiers,
  applyAlignmentDelta,
  updateAlignmentValue,
  getAlignmentLabel,
  inferActionTags,
  type AlignmentDeltaInput,
} from '../alignment';
import { getDeityById } from '@/app/data/new-origins';

const AURELION = getDeityById('aurelion')!;
const THAL_VARA = getDeityById('thal_vara')!;
const TYPHOS = getDeityById('typhos')!;
const NYX_MORA = getDeityById('nyx_mora')!;

function baseInput(overrides: Partial<AlignmentDeltaInput> = {}): AlignmentDeltaInput {
  return {
    actionTags: [],
    outcome: 'partial', // no outcome modifier, isolates the effect under test
    collateral: false,
    deceptionUsed: false,
    ...overrides,
  };
}

describe('getAlignmentTier', () => {
  it('returns neutral for null (non-divine origins)', () => {
    expect(getAlignmentTier(null)).toBe('neutral');
  });

  it('classifies boundary values correctly', () => {
    expect(getAlignmentTier(100)).toBe('aligned');
    expect(getAlignmentTier(70)).toBe('aligned');
    expect(getAlignmentTier(69)).toBe('neutral');
    expect(getAlignmentTier(40)).toBe('neutral');
    expect(getAlignmentTier(39)).toBe('drifting');
    expect(getAlignmentTier(20)).toBe('drifting');
    expect(getAlignmentTier(19)).toBe('severed');
    expect(getAlignmentTier(0)).toBe('severed');
  });
});

describe('getAlignmentModifiers', () => {
  it('gives aligned tier a discount and success bonus', () => {
    const mods = getAlignmentModifiers(80);
    expect(mods).toMatchObject({ tier: 'aligned', energyCostMod: -1, successMod: 1, advancedPowersDisabled: false });
  });

  it('gives neutral tier no modifiers', () => {
    const mods = getAlignmentModifiers(50);
    expect(mods).toMatchObject({ tier: 'neutral', energyCostMod: 0, successMod: 0, advancedPowersDisabled: false });
  });

  it('gives drifting tier a minor penalty', () => {
    const mods = getAlignmentModifiers(25);
    expect(mods).toMatchObject({ tier: 'drifting', energyCostMod: 1, successMod: -1, advancedPowersDisabled: false });
  });

  it('gives severed tier a severe penalty and disables advanced powers', () => {
    const mods = getAlignmentModifiers(5);
    expect(mods).toMatchObject({ tier: 'severed', energyCostMod: 2, successMod: -2, advancedPowersDisabled: true });
  });
});

describe('applyAlignmentDelta', () => {
  it('returns 0 when there is no patron deity', () => {
    const delta = applyAlignmentDelta(baseInput({ actionTags: ['protect_civilians'] }), null);
    expect(delta).toBe(0);
  });

  it('rewards favored actions (+3 each) and punishes forbidden actions (-5 each)', () => {
    const favored = applyAlignmentDelta(baseInput({ actionTags: ['protect_civilians', 'heroic'] }), AURELION);
    expect(favored).toBe(6); // 2 favored tags * 3

    const forbidden = applyAlignmentDelta(baseInput({ actionTags: ['deception', 'cruelty'] }), AURELION);
    expect(forbidden).toBe(-10); // 2 forbidden tags * -5
  });

  it('applies deity-specific collateral-damage reactions', () => {
    expect(applyAlignmentDelta(baseInput({ collateral: true }), AURELION)).toBe(-8);
    expect(applyAlignmentDelta(baseInput({ collateral: true }), THAL_VARA)).toBe(-8);
    expect(applyAlignmentDelta(baseInput({ collateral: true }), TYPHOS)).toBe(2);
    expect(applyAlignmentDelta(baseInput({ collateral: true }), NYX_MORA)).toBe(0); // neutral on collateral
  });

  it('applies deity-specific deception reactions', () => {
    expect(applyAlignmentDelta(baseInput({ deceptionUsed: true }), AURELION)).toBe(-6);
    expect(applyAlignmentDelta(baseInput({ deceptionUsed: true }), NYX_MORA)).toBe(3);
    expect(applyAlignmentDelta(baseInput({ deceptionUsed: true }), THAL_VARA)).toBe(0);
    expect(applyAlignmentDelta(baseInput({ deceptionUsed: true }), TYPHOS)).toBe(0);
  });

  it('applies deity-specific reactions to protecting civilians', () => {
    expect(applyAlignmentDelta(baseInput({ playerProtectedCivilians: true }), AURELION)).toBe(5);
    expect(applyAlignmentDelta(baseInput({ playerProtectedCivilians: true }), THAL_VARA)).toBe(3);
    expect(applyAlignmentDelta(baseInput({ playerProtectedCivilians: true }), TYPHOS)).toBe(0);
    expect(applyAlignmentDelta(baseInput({ playerProtectedCivilians: true }), NYX_MORA)).toBe(0);
  });

  it('applies deity-specific reactions to acting lawfully', () => {
    expect(applyAlignmentDelta(baseInput({ playerActedLawfully: true }), THAL_VARA)).toBe(4);
    expect(applyAlignmentDelta(baseInput({ playerActedLawfully: true }), TYPHOS)).toBe(-2);
    expect(applyAlignmentDelta(baseInput({ playerActedLawfully: true }), AURELION)).toBe(0);
  });

  it('applies a small outcome modifier (+1 success, -1 failure, 0 partial)', () => {
    expect(applyAlignmentDelta(baseInput({ outcome: 'success' }), NYX_MORA)).toBe(1);
    expect(applyAlignmentDelta(baseInput({ outcome: 'failure' }), NYX_MORA)).toBe(-1);
    expect(applyAlignmentDelta(baseInput({ outcome: 'partial' }), NYX_MORA)).toBe(0);
  });

  it('scales and rounds the total delta by driftRate', () => {
    // 2 favored tags = +6 base; driftRate 0.5 -> 3
    const input = baseInput({ actionTags: ['protect_civilians', 'heroic'] });
    expect(applyAlignmentDelta(input, AURELION, 0.5)).toBe(3);
    // driftRate 1.5 -> 9
    expect(applyAlignmentDelta(input, AURELION, 1.5)).toBe(9);
  });

  it('combines multiple simultaneous effects additively before rounding', () => {
    const input = baseInput({
      actionTags: ['protect_civilians'], // +3 (favored)
      collateral: true, // -8
      outcome: 'failure', // -1
    });
    expect(applyAlignmentDelta(input, AURELION)).toBe(3 - 8 - 1);
  });
});

describe('updateAlignmentValue', () => {
  it('passes through null unchanged (non-divine origins)', () => {
    expect(updateAlignmentValue(null, 10)).toBeNull();
  });

  it('clamps to [0, 100]', () => {
    expect(updateAlignmentValue(98, 10)).toBe(100);
    expect(updateAlignmentValue(5, -20)).toBe(0);
    expect(updateAlignmentValue(50, 10)).toBe(60);
  });
});

describe('getAlignmentLabel', () => {
  it('returns Unbound when value or deityId is missing', () => {
    expect(getAlignmentLabel(null, 'aurelion')).toBe('Unbound');
    expect(getAlignmentLabel(80, null)).toBe('Unbound');
  });

  it('builds a tier-specific label with the deity name', () => {
    expect(getAlignmentLabel(80, 'aurelion')).toBe("Aurelion's Chosen");
    expect(getAlignmentLabel(50, 'aurelion')).toBe("Aurelion's Servant");
    expect(getAlignmentLabel(25, 'aurelion')).toBe("Aurelion's Wayward");
    expect(getAlignmentLabel(5, 'aurelion')).toBe("Aurelion's Forsaken");
  });
});

describe('inferActionTags', () => {
  it('infers tags from choice-text keywords', () => {
    expect(inferActionTags({ choiceText: 'Protect the civilians' })).toContain('protect_civilians');
    expect(inferActionTags({ choiceText: 'Lie to the guard' })).toContain('deception');
    expect(inferActionTags({ choiceText: 'Call the police to arrest him' })).toContain('lawful');
    expect(inferActionTags({ choiceText: 'Smash through the wall' })).toContain('property_destruction');
    expect(inferActionTags({ choiceText: 'Threaten to intimidate them' })).toContain('intimidation');
    expect(inferActionTags({ choiceText: 'Try to negotiate calmly' })).toContain('de_escalation');
    expect(inferActionTags({ choiceText: 'Sneak through the shadows' })).toContain('stealth');
    expect(inferActionTags({ choiceText: 'A brave sacrifice' })).toContain('heroic');
    expect(inferActionTags({ choiceText: 'Reveal the honest truth' })).toContain('truth_telling');
  });

  it('infers tags from approach type', () => {
    expect(inferActionTags({ approachType: 'aggressive' })).toContain('direct_confrontation');
    expect(inferActionTags({ approachType: 'diplomatic' })).toContain('diplomatic');
    expect(inferActionTags({ approachType: 'stealth' })).toContain('stealth');
  });

  it('returns an empty array when nothing matches', () => {
    expect(inferActionTags({ choiceText: 'zzz nonsense qqq' })).toEqual([]);
  });

  it('can combine tags from both text and approach', () => {
    const tags = inferActionTags({ choiceText: 'Protect the civilians', approachType: 'diplomatic' });
    expect(tags).toContain('protect_civilians');
    expect(tags).toContain('diplomatic');
  });
});
