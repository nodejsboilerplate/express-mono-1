import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const environment = process.env.NODE_ENV

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schemas/index.ts",
  out: "./src/database/migrations",
  verbose: true,
  strict: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    schema: environment == "development" ? "dev" : environment == "production" ? "public": environment == "test" ? "test": "undefined",
  },
  introspect: {
    casing: "preserve",
  },
});
