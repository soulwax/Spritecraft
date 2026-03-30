import { describe, expect, test } from "bun:test";

import { activityVariant } from "./studio-activity-strip";

describe("activityVariant", () => {
  test("maps loading activity to warning badges", () => {
    expect(activityVariant("loading")).toBe("warning");
  });

  test("maps error activity to destructive badges", () => {
    expect(activityVariant("error")).toBe("destructive");
  });

  test("maps success and idle activity to stable badge variants", () => {
    expect(activityVariant("success")).toBe("success");
    expect(activityVariant("idle")).toBe("default");
  });
});
