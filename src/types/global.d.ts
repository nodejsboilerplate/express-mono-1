import "vitest";

declare module "vitest" {
  interface TestTags {
    tags: "apis/user" | "services/user";
  }
}

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
