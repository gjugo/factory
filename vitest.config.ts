import os from 'node:os';
import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

// Kept apart from vite.config.ts, whose root is client/, so tests in server/, shared/ and scripts/ are found too.
export default defineConfig({
  test: {
    root: '.',
    include: ['{client,server,shared,scripts}/**/*.test.{ts,tsx}'],
    // e2e/ is Playwright's (npm run test:e2e): it needs a browser and a running demo office.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    environment: 'node',
    // Anything a test imports must never see a live office's state (~/.factory, or cubefarm's) or its ports.
    // Previews tests probe ports: keep them clear of the live offices' preview ranges (factory 6700+, cubefarm 6300+).
    env: { SWARM_HOME: path.join(os.tmpdir(), `factory-vitest-${process.pid}`), SWARM_PORT: '0', SWARM_PREVIEW_PORT: '9300' },
  },
});
