import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getTrapDifficulty,
  perceptionCheck,
  disarmCheck,
  TRAP_DIFFICULTY_VALUES,
  TRAP_DAMAGE,
} from '../trap';

// trapRoll() internally does Math.floor(Math.random() * 25) + 1 -> range [1, 25].
// Mocking Math.random to a fixed value lets us pin the roll exactly, since none of
// the exported check functions accept a seed/roll parameter.
function mockRoll(roll: number) {
  // random value that floor(random*25)+1 === roll, i.e. random in [ (roll-1)/25, roll/25 )
  const random = (roll - 1) / 25;
  vi.spyOn(Math, 'random').mockReturnValue(random);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getTrapDifficulty', () => {
  it('maps depth to difficulty tier: 1=EASY, 2-3=NORMAL, 4+=HARD', () => {
    expect(getTrapDifficulty(1)).toBe('EASY');
    expect(getTrapDifficulty(0)).toBe('EASY');
    expect(getTrapDifficulty(2)).toBe('NORMAL');
    expect(getTrapDifficulty(3)).toBe('NORMAL');
    expect(getTrapDifficulty(4)).toBe('HARD');
    expect(getTrapDifficulty(10)).toBe('HARD');
  });
});

describe('TRAP_DIFFICULTY_VALUES / TRAP_DAMAGE tables', () => {
  it('match the documented DCs and damage values', () => {
    expect(TRAP_DIFFICULTY_VALUES).toEqual({ EASY: 25, NORMAL: 50, HARD: 75 });
    expect(TRAP_DAMAGE).toEqual({ EASY: 10, NORMAL: 25, HARD: 50 });
  });
});

describe('perceptionCheck', () => {
  it('succeeds when attribute + roll meets the DC exactly', () => {
    mockRoll(1);
    const result = perceptionCheck(49, 'NORMAL'); // 49 + 1 = 50 = DC
    expect(result.success).toBe(true);
    expect(result.total).toBe(50);
    expect(result.difficulty).toBe(50);
  });

  it('fails when attribute + roll falls just short of the DC', () => {
    mockRoll(1);
    const result = perceptionCheck(48, 'NORMAL'); // 48 + 1 = 49 < 50
    expect(result.success).toBe(false);
  });

  it('a high roll can push a low attribute over an EASY DC', () => {
    mockRoll(25);
    const result = perceptionCheck(0, 'EASY'); // 0 + 25 = 25 = DC
    expect(result.success).toBe(true);
  });

  it('even a maximum roll cannot save a very low attribute against HARD', () => {
    mockRoll(25);
    const result = perceptionCheck(0, 'HARD'); // 0 + 25 = 25 < 75
    expect(result.success).toBe(false);
  });
});

describe('disarmCheck', () => {
  it('uses the average of intelligence and agility, floored', () => {
    mockRoll(1);
    // avg(51, 50) = floor(50.5) = 50; 50 + 1 = 51 >= 50
    const result = disarmCheck(51, 50, 'NORMAL');
    expect(result.attributeValue).toBe(50);
    expect(result.success).toBe(true);
  });

  it('fails a HARD trap for a modest disarm attempt', () => {
    mockRoll(1);
    const result = disarmCheck(40, 40, 'HARD'); // avg 40 + 1 = 41 < 75
    expect(result.success).toBe(false);
  });
});
