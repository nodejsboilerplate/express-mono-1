import "dotenv/config"
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schemas/index.ts",
  out: "./src/database/migrations",
  verbose: true,
  strict: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!
  },
  migrations: {
    schema: "public",
  },
  introspect: {
    casing: "preserve",
  },
});
