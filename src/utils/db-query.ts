import {
  and, or, eq, ne, gt, gte, lt, lte,
  isNull, isNotNull, inArray, notInArray,
  like, ilike, notLike, notIlike, between, notBetween,
  SQL
} from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { PgDbClientType } from "@/libs/db.connect";
import type { DrizzleOperator, FilterConditionType, FilterGroup } from "@/types/db";
import type { InferSelectModel } from "drizzle-orm";

function buildSqlFilters(
  table: PgTable,
  filters: FilterGroup<Record<string, unknown>>[]
): SQL[] {
  const sql_filters: SQL[] = [];

  for (const item of filters) {
    for (const [key, value] of Object.entries(item.data)) {
      const column = (table as any)[key];
      if (!column) continue;

      switch (item.type as DrizzleOperator) {
        case "eq":
          if (value !== undefined && value !== null) sql_filters.push(eq(column, value));
          break;
        case "ne":
          if (value !== undefined && value !== null) sql_filters.push(ne(column, value));
          break;
        case "gt":
          if (value !== undefined && value !== null) sql_filters.push(gt(column, value));
          break;
        case "gte":
          if (value !== undefined && value !== null) sql_filters.push(gte(column, value));
          break;
        case "lt":
          if (value !== undefined && value !== null) sql_filters.push(lt(column, value));
          break;
        case "lte":
          if (value !== undefined && value !== null) sql_filters.push(lte(column, value));
          break;
        case "like":
          if (value) sql_filters.push(like(column, value as string));
          break;
        case "ilike":
          if (value) sql_filters.push(ilike(column, value as string));
          break;
        case "notLike":
          if (value) sql_filters.push(notLike(column, value as string));
          break;
        case "notIlike":
          if (value) sql_filters.push(notIlike(column, value as string));
          break;
        case "inArray":
          if (Array.isArray(value) && value.length) sql_filters.push(inArray(column, value));
          break;
        case "notInArray":
          if (Array.isArray(value) && value.length) sql_filters.push(notInArray(column, value));
          break;
        case "between":
          if (Array.isArray(value) && value.length === 2) {
            sql_filters.push(between(column, value[0], value[1]));
          }
          break;
        case "notBetween":
          if (Array.isArray(value) && value.length === 2) {
            sql_filters.push(notBetween(column, value[0], value[1]));
          }
          break;
        case "isNull":
          sql_filters.push(isNull(column));
          break;
        case "isNotNull":
          sql_filters.push(isNotNull(column));
          break;
      }
    }
  }

  return sql_filters;
}

/**
 * Internal implementation. Always returns the raw row array — never
 * unwraps to a single record. Not exported; call through `getDbRecord`.
 */
async function createQuery(
  table: PgTable,
  selects: string[],
  filters: FilterGroup<Record<string, unknown>>[],
  db: PgDbClientType,
  filterConditionType: FilterConditionType
): Promise<Record<string, unknown>[]> {
  const sql_filters = buildSqlFilters(table, filters);

  const selection = Object.fromEntries(
    selects
      .map((key) => [key, (table as any)[key]])
  );

  return await db
    .select(selection)
    .from(table)
    .where(filterConditionType === "AND" ? and(...sql_filters) : or(...sql_filters));
}

/**
 * Retrieves records from a table with full type safety - behaves exactly
 * like Drizzle's own `db.select()...`: always resolves to an array
 * (empty if nothing matched).
 *
 * For a single record, destructure it yourself, same as raw Drizzle:
 * `const [user] = await getDbRecord(...)`.
 *
 * @template TTable - The Drizzle table schema type.
 * @template TKeys - The specific column keys being selected.
 *
 * @param table - The Drizzle table object (e.g., `users`, `posts`).
 * @param selects - Column keys to include in the result.
 * @param filters - Filter groups typed to the table's model.
 * @param db - The Drizzle database client.
 * @param filterConditionType - Combine filters with `"AND"` or `"OR"`. Defaults to `"AND"`.
 *
 * @returns Array of `Pick<Row, TKeys>` - empty array if nothing matched.
 *
 * @example
 * ```typescript
 * // single - destructure, same as raw Drizzle
 * const [user] = await getDbRecord(users, ["id", "email"], [
 *   { type: "eq", data: { id: someId } },
 * ], db);
 * user?.email;
 *
 * // many - use the array directly
 * const admins = await getDbRecord(users, ["id", "email"], [
 *   { type: "eq", data: { role: "ADMIN" } },
 * ], db);
 * admins.map((u) => u.email);
 * ```
 */
export function getDbRecord<
  TTable extends PgTable<any>,
  TKeys extends keyof InferSelectModel<TTable>
>(
  table: TTable,
  selects: TKeys[],
  filters: FilterGroup<InferSelectModel<TTable>>[],
  db: PgDbClientType,
  filterConditionType: FilterConditionType = "AND"
): Promise<Pick<InferSelectModel<TTable>, TKeys>[]> {
  return createQuery(
    table,
    selects as string[],
    filters as unknown as FilterGroup<Record<string, unknown>>[],
    db,
    filterConditionType
  ) as Promise<Pick<InferSelectModel<TTable>, TKeys>[]>;
}