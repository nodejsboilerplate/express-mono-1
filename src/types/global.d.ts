import "vitest";

declare module "vitest" {
  interface TestTags {
    tags: "apis/user" | "services/user";
  }
}
