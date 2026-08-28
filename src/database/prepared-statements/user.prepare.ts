import { usersTable } from "../schemas";
import { createPrepareStatement } from "@/utils";

export const prepareGetUserLoginDataForCache = createPrepareStatement(
  usersTable,
  ["email", "id", "is_verified", "role", "username"],
  { id: "eq", role: "eq" },
  "prepareUserCacheLoginData"
);
