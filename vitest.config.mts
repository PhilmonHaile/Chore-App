import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  // tsconfig keeps JSX for Next.js; tests need it compiled.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Component tests opt in with a `// @vitest-environment jsdom` comment.
    environment: "node",
  },
});
