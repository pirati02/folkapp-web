import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Password hashing deliberately takes ~0.3s per call (350k PBKDF2 iterations).
    testTimeout: 30_000,
  },
});
