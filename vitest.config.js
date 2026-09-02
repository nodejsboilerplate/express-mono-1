import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["src/tests/**/*.test.ts"],
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
      {
        name: "services/auth",
        description: "Tests written for auth services.",
      },
    ],
  },
});
