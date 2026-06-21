import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resuelve el alias "@/*" -> "src/*" desde tsconfig.json de forma nativa.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Los tests de integración levantan un contenedor Postgres (Testcontainers),
    // que tarda unos segundos en arrancar la primera vez.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
