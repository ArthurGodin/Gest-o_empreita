import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./env-public-core";

describe("parsePublicEnv", () => {
  it("preserves every configured public value during a skipped build", () => {
    const result = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_APP_URL: "https://prumo.example",
      NEXT_PUBLIC_META_PIXEL_ID: "123456789",
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.data).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_APP_URL: "https://prumo.example",
      NEXT_PUBLIC_META_PIXEL_ID: "123456789",
    });
  });

  it("falls back only the invalid field and keeps other integrations intact", () => {
    const result = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "url-invalida",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_APP_URL: "https://prumo.example",
    });

    expect(result.fieldErrors.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(result.data.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "http://127.0.0.1:54321",
    );
    expect(result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("anon-key");
    expect(result.data.NEXT_PUBLIC_APP_URL).toBe("https://prumo.example");
  });

  it("provides build-only defaults when no environment is available", () => {
    const result = parsePublicEnv({});

    expect(result.data.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "http://127.0.0.1:54321",
    );
    expect(result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(
      "build-placeholder",
    );
    expect(result.data.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(result.data.NEXT_PUBLIC_META_PIXEL_ID).toBeUndefined();
  });
});
