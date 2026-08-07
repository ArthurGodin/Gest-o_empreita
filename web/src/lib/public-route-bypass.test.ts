import { describe, expect, it } from "vitest";
import { shouldBypassAuthRefresh } from "./public-route-bypass";

describe("public route auth refresh bypass", () => {
  it.each(["/demo", "/demo/", "/demo/arquitetura"])(
    "bypasses auth refresh for %s",
    (pathname) => {
      expect(shouldBypassAuthRefresh(pathname)).toBe(true);
    },
  );

  it.each([
    "/",
    "/demonstracao",
    "/demo-maliciosa",
    "/app/demonstracao",
    "/app",
  ])("keeps auth refresh for %s", (pathname) => {
    expect(shouldBypassAuthRefresh(pathname)).toBe(false);
  });
});
