import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Integration tests talk to the local Supabase stack. `npm run test:integration` resets it first.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
})
