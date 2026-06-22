import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The API uses NestJS decorators; enable legacy decorator transform so test
  // files that import decorated classes (guards, services) load under esbuild.
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
  test: {
    include: ['{apps,packages,tests}/**/*.{test,spec}.ts'],
    environment: 'node',
  },
});
