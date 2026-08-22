import { baseConfig } from "@/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { userRelations } from "@/database/relations";

export const pgDb = drizzle(baseConfig.DATABASE_URL, {
  relations: { ...userRelations },
  logger: baseConfig.NODE_ENV !== "production",
  jit: true,
});
