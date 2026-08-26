import "dotenv/config";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "child_process";

export default async function setup() {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.NODE_ENV = "test";

  execSync("pnpm db:generate && pnpm db:migrate", { stdio: "inherit" });

  return async () => {
    await container.stop();
  };
}
