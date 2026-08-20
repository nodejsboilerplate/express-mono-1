/**
 * This file code is mainly for grpc database server only.
 *
 * from grpc code will sent via metadata and the client of this grpc server will match the error code
 * and send the error resopnse to the front client.
 * can send custom error codes but have limitations that have to use system-error events
 */
import { DatabaseError } from "pg";
import { DrizzleQueryError } from "drizzle-orm/errors";

/**
 * These codes are primarily for automatically handle the unhandled exceptions.
 * Dont modify here custom codes.
 * custom codes should defined seperately in system-error events
 */
export enum DRIZZLE_ERROR_ENUM {
  DUP_ENTRY = "DUP_ENTRY",
  FK_VIOLATION = "FK_VIOLATION",
  NOT_NULL_VIOLATION = "NOT_NULL_VIOLATION",
  CHECK_VIOLATION = "CHECK_VIOLATION",
  STRING_TOO_LONG = "STRING_TOO_LONG",
  NUMERIC_OUT_OF_RANGE = "NUMERIC_OUT_OF_RANGE",
  INVALID_DATETIME = "INVALID_DATETIME",
  INVALID_TEXT_REPRESENTATION = "INVALID_TEXT_REPRESENTATION",
  UNDEFINED_COLUMN = "UNDEFINED_COLUMN",
  UNDEFINED_TABLE = "UNDEFINED_TABLE",
  SERIALIZATION_FAILURE = "SERIALIZATION_FAILURE",
  DEADLOCK_DETECTED = "DEADLOCK_DETECTED",
  TOO_MANY_CONNECTIONS = "TOO_MANY_CONNECTIONS",
  QUERY_TIMEOUT = "QUERY_TIMEOUT",
  UNKNOWN = "UNKNOWN",
}

export const DrizzleErrorCodes: Record<DRIZZLE_ERROR_ENUM, string> = {
  DUP_ENTRY: "23505",
  FK_VIOLATION: "23503",
  NOT_NULL_VIOLATION: "23502",
  CHECK_VIOLATION: "23514",
  STRING_TOO_LONG: "22001",
  NUMERIC_OUT_OF_RANGE: "22003",
  INVALID_DATETIME: "22007",
  INVALID_TEXT_REPRESENTATION: "22P02",
  UNDEFINED_COLUMN: "42703",
  UNDEFINED_TABLE: "42P01",
  SERIALIZATION_FAILURE: "40001",
  DEADLOCK_DETECTED: "40P01",
  TOO_MANY_CONNECTIONS: "53300",
  QUERY_TIMEOUT: "57014",
  UNKNOWN: "UNKNOWN",
};

export type DrizzleErrorInfo = {
  code?: string;
  message: string;
};

export type DrizzleErrorType = {
  [key: string]: DrizzleErrorInfo;
};

export const CustomDrizzleErrorMessage: DrizzleErrorType = {
  [DrizzleErrorCodes.DUP_ENTRY]: {
    code: DrizzleErrorCodes.DUP_ENTRY,
    message: "Duplicate entry, already exists.",
  },
  [DrizzleErrorCodes.FK_VIOLATION]: {
    code: DrizzleErrorCodes.FK_VIOLATION,
    message: "Referenced record does not exist.",
  },
  [DrizzleErrorCodes.NOT_NULL_VIOLATION]: {
    code: DrizzleErrorCodes.NOT_NULL_VIOLATION,
    message: "A required field is missing.",
  },
  [DrizzleErrorCodes.CHECK_VIOLATION]: {
    code: DrizzleErrorCodes.CHECK_VIOLATION,
    message: "Value violates a constraint.",
  },
  [DrizzleErrorCodes.STRING_TOO_LONG]: {
    code: DrizzleErrorCodes.STRING_TOO_LONG,
    message: "Value is too long for this field.",
  },
  [DrizzleErrorCodes.NUMERIC_OUT_OF_RANGE]: {
    code: DrizzleErrorCodes.NUMERIC_OUT_OF_RANGE,
    message: "Numeric value is out of range.",
  },
  [DrizzleErrorCodes.INVALID_DATETIME]: {
    code: DrizzleErrorCodes.INVALID_DATETIME,
    message: "Invalid date/time format.",
  },
  [DrizzleErrorCodes.INVALID_TEXT_REPRESENTATION]: {
    code: DrizzleErrorCodes.INVALID_TEXT_REPRESENTATION,
    message: "Invalid input syntax for this field.",
  },
  [DrizzleErrorCodes.UNDEFINED_COLUMN]: {
    code: DrizzleErrorCodes.UNDEFINED_COLUMN,
    message: "Referenced column does not exist.",
  },
  [DrizzleErrorCodes.UNDEFINED_TABLE]: {
    code: DrizzleErrorCodes.UNDEFINED_TABLE,
    message: "Referenced table does not exist.",
  },
  [DrizzleErrorCodes.SERIALIZATION_FAILURE]: {
    code: DrizzleErrorCodes.SERIALIZATION_FAILURE,
    message: "Transaction conflict, please retry.",
  },
  [DrizzleErrorCodes.DEADLOCK_DETECTED]: {
    code: DrizzleErrorCodes.DEADLOCK_DETECTED,
    message: "Deadlock detected, please retry.",
  },
  [DrizzleErrorCodes.TOO_MANY_CONNECTIONS]: {
    code: DrizzleErrorCodes.TOO_MANY_CONNECTIONS,
    message: "Too many connections, please try again later.",
  },
  [DrizzleErrorCodes.QUERY_TIMEOUT]: {
    code: DrizzleErrorCodes.QUERY_TIMEOUT,
    message: "Query timed out.",
  },
  [DrizzleErrorCodes.UNKNOWN]: {
    message: "Database error occurred.",
  },
};

/**
 * Normalizes complex Drizzle/Database errors into a human-readable format.
 *
 * Drizzle often wraps driver-level errors (like Postgres errors) inside
 * a 'cause' property. This function unwraps that hierarchy to find the
 * root database code.
 *
 * @param error - The caught exception from a Drizzle query.
 * @returns {DrizzleErrorInfo | null} - Standardized error info or null if not a DB error.
 */
export const getFromattedDrizzleError = (
  error: any
): DrizzleErrorInfo | null => {
  if (error?.code === "ECONNREFUSED") {
    return { code: error?.code, message: "Could not reach the database." };
  }
  if (error instanceof DrizzleQueryError) {
    if (error.cause instanceof DatabaseError) {
      const code = error.cause.code;
      if (code) {
        return (
          CustomDrizzleErrorMessage[code]! ??
          CustomDrizzleErrorMessage[DrizzleErrorCodes.UNKNOWN]
        );
      }
    }
  } else if (error instanceof CustomDbError) {
    return { message: error.message, code: error.code };
  }

  return null;
};

/**
 * A custom exception class for manually throwing database-related
 * business logic errors (e.g., 'Invalid Row State').
 */
export class CustomDbError extends DatabaseError {
  constructor(message: string, code: string) {
    super(message, 0, "error");
    this.code = code;
  }
}
