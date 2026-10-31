import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { codeLines, isCode } from './names.ts';

// factory's runtime names and texts say factory and project (#26). cubefarm stays in the comments that cite it as the
// source, and in the few places below that are about cubefarm or about the names from before.
const DIRS = ['server', 'shared', 'client/src', 'bin', 'scripts'];

/** Per file, the snippets a matching line may hold. */
const KEEP: Record<'cubefarm' | 'floor', Record<string, string[]>> = {
  cubefarm: {
    // the demo's neighbour Box of a cubefarm office on the same Upstash account, which factory never counts or touches
    'server/demo.ts': ['cubefarm-n8b0r1'],
    // Settings → Cloud agents, about that other app
    'client/src/pages/settings/cloud-agents.tsx': ['a cubefarm office'],
  },
  floor: {
    // --floors / SWARM_DEMO_FLOORS, deprecated aliases of --projects / SWARM_DEMO_PROJECTS
    'bin/factory.js': ['floors'],
    'server/config.ts': ['--floors', 'SWARM_DEMO_FLOORS'],
    // state files and journals from before the rename (legacyRepo, legacyOps)
    'shared/journal.ts': ['"floor" in', '{ floor,', 'number: floor', 'old.floors', '{ floors,', '?? floors ??', 'project: floor'],
  },
};
const WORDS = { cubefarm: /cubefarm/i, floor: /(?<!Math\.)floor/i };

const files = DIRS.flatMap((dir) => (fs.readdirSync(dir, { recursive: true }) as string[]).map((f) => path.join(dir, f).split(path.sep).join('/'))).filter(isCode);

describe('runtime names', () => {
  for (const word of ['cubefarm', 'floor'] as const) {
    it(`say "${word}" only where it is kept on purpose`, () => {
      const found = files.flatMap((f) =>
        codeLines(f, fs.readFileSync(f, 'utf8'), WORDS[word])
          .filter((l) => !(KEEP[word][f] ?? []).some((s) => l.includes(s)))
          .map((l) => `${f}: ${l}`),
      );
      expect(found).toEqual([]);
    });
  }

  it('reads code, not comments', () => {
    const src = "// the cubefarm office\n/** cubefarm's own */\nconst a = 'factory'; // was cubefarm\nconst url = 'http://x//cubefarm';\n";
    expect(codeLines('a.ts', src, /cubefarm/)).toEqual(["const url = \"http://x//cubefarm\";"]);
    expect(codeLines('a.tsx', 'export const P = () => <p>It\'s cubefarm</p>; // cubefarm', /cubefarm/)).toHaveLength(1);
    expect(codeLines('a.ts', 'const n = Math.floor(x);', WORDS.floor)).toEqual([]);
  });
});
