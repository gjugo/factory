import type { AgentLook, SwarmSettings } from '../../../shared/types';

// The first-run setup (/setup): its steps and the POST /api/setup body from what was typed, every field defaulted so
// pressing Next all the way still gives a working office. The CEO keeps the look and colour they already have.

export const SETUP_STEPS = ['Welcome', 'You', 'Your CEO', 'Team changes', 'Ready'] as const;

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
