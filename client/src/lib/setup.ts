import type { AgentLook, SwarmSettings } from '../../../shared/types';

// The first-run setup (/setup): its steps and the POST /api/setup body from what was typed, every field defaulted so
// pressing Next all the way still gives a working office. The CEO keeps the look and colour they already have.

export const SETUP_STEPS = ['Welcome', 'You', 'Your CEO', 'Team changes', 'Ready'] as const;

/** Names the 🎲 buttons suggest, cubefarm's own. */
export const COMPANY_NAMES = ['Pixel & Pine', 'Byte Bakery', 'Night Owl Software', 'Tiny Rocket Co.', 'Moonbeam Works', 'Happy Path Inc.', 'Merge Conflict Ltd.', 'Quokka Labs', 'Blue Kettle Studio', 'Paper Plane Software'];
export const CEO_NAMES = ['Morgan', 'Avery', 'Jordan', 'Riley', 'Quinn', 'Harper', 'Rowan', 'Sasha', 'Casey', 'Jamie', 'Alex', 'Robin'];

/** Another name from the list than the one showing, so every press changes it. */
export function suggestName(list: readonly string[], current: string, random = Math.random): string {
  const rest = list.filter((x) => x !== current.trim());
  return rest[Math.floor(random() * rest.length)] ?? list[0];
}

export interface SetupDraft {
  managerName: string;
  companyName: string;
  ceoName: string;
  scaling: SwarmSettings['scaling'];
}

export interface SetupFallback {
  user: string | null;
  ceo: { name: string; look: AgentLook; color: string } | null;
}

export function setupBody(d: SetupDraft, fallback: SetupFallback) {
  return {
    managerName: d.managerName.trim().slice(0, 40) || fallback.user || 'Boss',
    companyName: d.companyName.trim().slice(0, 60) || 'factory',
    scaling: d.scaling,
    ceoName: d.ceoName.trim().slice(0, 40) || fallback.ceo?.name || 'Morgan',
    ceoLook: fallback.ceo?.look ?? 'masculine',
    ceoColor: fallback.ceo?.color ?? '#3a86ff',
  };
}
