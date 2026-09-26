import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocked OpenAI boundary ---
// generateSeed()'s only external dependency is generateJSONCompletion(). By mocking it we can
// feed canned "model responses" (valid, malformed, schema-violating, structurally-invalid,
// personalization-leaking) straight into the real Zod schema + validateSeedStructure() +
// sanitizeText() pipeline, with zero network calls and zero cost. This is the eval harness
// referenced in docs/TESTING.md's priority list — it does not require exporting the internal
// schema; it observes generateSeed()'s behavior through its public contract.
const { mockGenerateJSONCompletion } = vi.hoisted(() => ({
  mockGenerateJSONCompletion: vi.fn(),
}));

vi.mock('@/app/lib/openai', () => ({
  generateJSONCompletion: mockGenerateJSONCompletion,
}));

import { generateSeed, buildSeedInput } from '../encounter-seed-generator';

const INPUT = buildSeedInput('warehouse_raid', 'combat', 'combat', 5, 'industrial', ['syndicate'], 'neutral');

/** A fully schema-valid seed response, used as a base to mutate per test. */
function validSeedResponse(overrides: Record<string, unknown> = {}) {
  return {
    title: 'A Tense Standoff',
    situationSummary: 'Gang members block a warehouse loading dock, clearly expecting trouble.',
    openingStyle: 'action',
    stakeType: 'collateral_risk',
    seedHooks: ['warehouse district'],
    choices: [
      { id: 'choice_1', genericLabel: 'Storm the entrance', approach: 'direct' },
      { id: 'choice_2', genericLabel: 'Slip through the back', approach: 'subtle' },
      { id: 'choice_3', genericLabel: 'Try to talk them down', approach: 'diplomatic' },
      { id: 'choice_4', genericLabel: 'Set up a diversion first', approach: 'tactical' },
    ],
    outcomes: [
      {
        choiceId: 'choice_1',
        successChance: 0.6,
        successResult: { description: 'You break through cleanly.', xpGain: 40, factionChanges: [{ factionId: 'syndicate', change: -10 }] },
        failureResult: { description: 'They push back hard.', xpGain: 15, factionChanges: [{ factionId: 'syndicate', change: -5 }], hpLoss: 10 },
      },
      {
        choiceId: 'choice_2',
        successChance: 0.7,
        successResult: { description: 'Nobody sees you coming.', xpGain: 35, factionChanges: [{ factionId: 'syndicate', change: -5 }] },
        failureResult: { description: 'You are spotted.', xpGain: 10, factionChanges: [] },
      },
      {
        choiceId: 'choice_3',
        successChance: 0.5,
        successResult: { description: 'They stand down.', xpGain: 30, factionChanges: [{ factionId: 'syndicate', change: 5 }] },
        failureResult: { description: 'Talks break down.', xpGain: 10, factionChanges: [] },
      },
      {
        choiceId: 'choice_4',
        successChance: 0.65,
        successResult: {
          description: 'The diversion works perfectly.',
          xpGain: 45,
          factionChanges: [{ factionId: 'syndicate', change: -8 }],
          attributeGrowth: [{ attributeId: 'intelligence', amount: 1 }],
        },
        failureResult: { description: 'The diversion fizzles.', xpGain: 12, factionChanges: [] },
      },
    ],
    tags: ['warehouse', 'gang'],
    ...overrides,
  };
}

beforeEach(() => {
  mockGenerateJSONCompletion.mockReset();
});

describe('generateSeed — accepted responses', () => {
  it('accepts a fully valid, schema-conforming response', async () => {
    mockGenerateJSONCompletion.mockResolvedValueOnce(JSON.stringify(validSeedResponse()));
    const seed = await generateSeed(INPUT);
    expect(seed).not.toBeNull();
    expect(seed!.title).toBe('A Tense Standoff');
    expect(seed!.choices).toHaveLength(4);
    expect(seed!.outcomes).toHaveLength(4);
    expect(seed!.category).toBe(INPUT.encounterType);
    expect(seed!.difficulty).toBe(INPUT.difficulty);
    expect(seed!.involvedFactions).toEqual(INPUT.involvedFactions);
  });

  it('strips HTML/script tag markup and control characters from every text field', async () => {
    // sanitizeText() strips tag markup (the < ... > delimiters) via a regex, not tag *contents* —
    // this is sufficient for its purpose since the sanitized string only ever flows into JSON
    // consumed by React (which escapes on render), not into raw HTML. Confirmed by observation:
    // '<script>alert(1)</script>X' becomes 'alert(1)X', not 'X'.
    const withInjection = validSeedResponse({
      title: '<script>alert(1)</script>Ambush at the Docks',
      situationSummary: 'They wait in the shadows.\x07 <b>Ready for a fight.</b> padding padding',
    });
    mockGenerateJSONCompletion.mockResolvedValueOnce(JSON.stringify(withInjection));
    const seed = await generateSeed(INPUT);
    expect(seed).not.toBeNull();
    expect(seed!.title).not.toContain('<script>');
    expect(seed!.title).not.toContain('</script>');
    expect(seed!.title).toContain('Ambush at the Docks');
    expect(seed!.situationSummary).not.toContain('<b>');
    expect(seed!.situationSummary).not.toContain('\x07');
  });
});

describe('generateSeed — rejected responses (returns null, never throws)', () => {
  it('rejects a response that is not valid JSON', async () => {
    mockGenerateJSONCompletion.mockResolvedValueOnce('{ this is not json');
    await expect(generateSeed(INPUT)).resolves.toBeNull();
  });

  it('rejects a response missing required schema fields entirely', async () => {
    mockGenerateJSONCompletion.mockResolvedValueOnce(JSON.stringify({ title: 'Incomplete' }));
    await expect(generateSeed(INPUT)).resolves.toBeNull();
  });

  it('rejects a successChance outside the 0.1-0.95 bound', async () => {
    const bad = validSeedResponse();
    (bad.outcomes[0] as { successChance: number }).successChance = 1.5;
    mockGenerateJSONCompletion.mockResolvedValueOnce(JSON.stringify(bad));
    await expect(generateSeed(INPUT)).resolves.toBeNull();
  });

  it('rejects an xpGain outside the schema range', async () => {
    const bad = validSeedResponse();
    (bad.outcomes[0].successResult as { xpGain: number }).xpGain = 9999;
    mockGenerateJSONCompletion.mockResolvedValueOnce(JSON.stringify(bad));
    await expect(generateSeed(INPUT)).resolves.toBeNull();
  });

  it('rejects an unknown/invalid faction id in factionChanges', async () => {
    const bad = validSeedResponse();
    (bad.outcomes[0].successResult as { factionChanges: Array<{ factionId: string; change: number }> }).factionChanges = [
      { factionId: 'not_a_real_faction', change: 5 },
    ];
    mockGenerateJSONCompletion.mockResolvedValueOnce(JSON.stringify(bad));
    await expect(generateSeed(INPUT)).resolves.toBeNull();
  });

  it('rejects an unknown/invalid attribute id in requiredAttributes', async () => {
    const bad = validSeedResponse();
    (bad.choices[0] as { requiredAttributes?: Array<{ attributeId: string; minValue: number }> }).requiredAttributes = [
      { attributeId: 'luck', minValue: 10 }, // not in VALID_ATTRIBUTE_IDS
    ];
    mockGenerateJSONCompletion.mockResolvedValueOnce(JSON.stringify(bad));
    await expect(generateSeed(INPUT)).resolves.toBeNull();
  });

  it('rejects a response missing one of the 4 required approach types', async () => {
    const bad = validSeedResponse();
    // duplicate 'direct' instead of including 'tactical'
    (bad.choices[3] as { approach: string }).approach = 'direct';
    mockGenerateJSONCompletion.mockResolvedValueOnce(JSON.stringify(bad));
    await expect(generateSeed(INPUT)).resolves.toBeNull();
  });

  it('rejects a response with a choice/outcome id mismatch', async () => {
    const bad = validSeedResponse();
    (bad.outcomes[3] as { choiceId: string }).choiceId = 'choice_1'; // duplicate, choice_4 now has no outcome
    mockGenerateJSONCompletion.mockResolvedValueOnce(JSON.stringify(bad));
    await expect(generateSeed(INPUT)).resolves.toBeNull();
  });

  it('rejects text containing personalization-leakage phrases meant to stay out of generic seeds', async () => {
    const bad = validSeedResponse({
      situationSummary: 'Since last time, they remember your face and are ready for you now, more than before.',
    });
    mockGenerateJSONCompletion.mockResolvedValueOnce(JSON.stringify(bad));
    await expect(generateSeed(INPUT)).resolves.toBeNull();
  });

  it('rejects fewer than 4 choices', async () => {
    const bad = validSeedResponse();
    bad.choices = bad.choices.slice(0, 3);
    mockGenerateJSONCompletion.mockResolvedValueOnce(JSON.stringify(bad));
    await expect(generateSeed(INPUT)).resolves.toBeNull();
  });

  it('propagates an upstream OpenAI/network failure as null rather than throwing', async () => {
    mockGenerateJSONCompletion.mockRejectedValueOnce(new Error('OpenAI request failed'));
    await expect(generateSeed(INPUT)).resolves.toBeNull();
  });
});

describe('buildSeedInput', () => {
  it('buckets difficulty and sorts involvedFactions for a deterministic cache key', () => {
    const input = buildSeedInput('a1', 'combat', 'combat', 7, 'downtown', ['syndicate', 'guardian_initiative'], 'heroic');
    expect(input.difficultyBucket).toBe('hard'); // > 6
    expect(input.involvedFactions).toEqual(['guardian_initiative', 'syndicate']); // sorted
  });

  it('buckets easy (<=3) and medium (<=6) difficulty correctly', () => {
    expect(buildSeedInput('a', 'combat', 'combat', 3, 'downtown', []).difficultyBucket).toBe('easy');
    expect(buildSeedInput('a', 'combat', 'combat', 6, 'downtown', []).difficultyBucket).toBe('medium');
    expect(buildSeedInput('a', 'combat', 'combat', 7, 'downtown', []).difficultyBucket).toBe('hard');
  });
});
