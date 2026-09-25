/**
 * Smoke: static game data (app/data/*).
 *
 * Every data table loads, IDs are unique, and the cross-references the game
 * logic relies on actually resolve. Catches a typo'd ID in a content edit
 * before a player hits it.
 */
import { describe, it, expect } from 'vitest';
import { factions, controllableFactions, isValidFactionId } from '@/app/data/factions';
import { districts } from '@/app/data/districts';
import { powers, getPowerById } from '@/app/data/powers';
import { origins, deities, getDeityById, initializeCharacterFromOrigin } from '@/app/data/new-origins';
import { attributes } from '@/app/data/attributes';
import { actions } from '@/app/data/actions';
import { encounterTemplates } from '@/app/data/encounter-templates';
import { goalDefinitions } from '@/app/data/goals';
import { items } from '@/app/data/items';
import { npcs } from '@/app/data/npcs';

const tables: Record<string, { id: string }[]> = {
  factions, districts, powers, origins, deities, attributes, actions,
  encounterTemplates, goalDefinitions, items, npcs,
};

describe('smoke: static data', () => {
  it.each(Object.keys(tables))('%s loads with unique ids', (name) => {
    const rows = tables[name];
    expect(rows.length).toBeGreaterThan(0);
    const ids = rows.map((r) => r.id);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('there are controllable factions to fight over', () => {
    expect(controllableFactions.length).toBeGreaterThanOrEqual(2);
  });

  it('district adjacency points at real districts', () => {
    const ids = new Set(districts.map((d) => d.id));
    for (const d of districts) {
      for (const adj of d.adjacent ?? []) expect(ids, `${d.id} → ${adj}`).toContain(adj);
    }
  });

  it('origins reference real powers, factions, attributes and deities', () => {
    // Origins may also grant the origin-only attributes (resolve, might, …)
    // that character creation seeds alongside the main attributes table.
    const baseAttributes = Object.keys(
      initializeCharacterFromOrigin({ ...origins[0], startingAttributes: {} }, 'smoke').attributes,
    );
    const knownAttributes = new Set([...attributes.map((a) => a.id), ...baseAttributes]);

    for (const o of origins) {
      for (const p of o.startingPowers) expect(getPowerById(p), `${o.id} power ${p}`).toBeDefined();
      for (const r of o.startingFactionRep) expect(isValidFactionId(r.factionId), `${o.id} faction ${r.factionId}`).toBe(true);
      for (const a of Object.keys(o.startingAttributes)) expect(knownAttributes, `${o.id} attribute ${a}`).toContain(a);
      for (const d of o.deityOptions ?? []) expect(getDeityById(d), `${o.id} deity ${d}`).toBeDefined();
      if (o.requiresDeitySelection) expect(o.deityOptions?.length, `${o.id} deityOptions`).toBeGreaterThan(0);
    }
  });

  it('every origin can create a character', () => {
    for (const o of origins) {
      const c = initializeCharacterFromOrigin(o, 'Smoke', o.deityOptions?.[0]);
      expect(c.powers).toEqual(o.startingPowers);
      expect(c.alignmentValue === null).toBe(!o.requiresDeitySelection);
    }
  });
});
