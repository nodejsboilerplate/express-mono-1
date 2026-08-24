import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: true,
    globalSetup: "./src/tests/setup.ts",
    tags: [
      {
        name: "apis/user",
        description: "Tests written for user apis.",
      },
      {
        name: "services/user",
        description: "Tests written for user services.",
      },
    ],
  },
});
