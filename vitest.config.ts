import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        'coverage/',
        'vitest.config.ts',
        'src/demo.ts', // Interactive demo script
        'src/load-data.ts', // Data loading script
        'src/vectorize.ts', // Vectorization script
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 30000, // 30 seconds for Azure API calls
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': '/workspaces/typescript-cosmosdb-business-intelligence-ai/src'
    }
  },
  esbuild: {
    target: 'node18'
  }
});
