import { z } from "zod";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().min(5).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type PublicEnvInput = Partial<Record<keyof PublicEnv, unknown>>;

const buildFallback = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "build-placeholder",
});

export function parsePublicEnv(input: PublicEnvInput): {
  data: PublicEnv;
  fieldErrors: Partial<Record<keyof PublicEnv, string[]>>;
} {
  const parsed = publicEnvSchema.safeParse(input);
  if (parsed.success) {
    return { data: parsed.data, fieldErrors: {} };
  }

  function parseField<K extends keyof PublicEnv>(key: K): PublicEnv[K] {
    const fieldResult = publicEnvSchema.shape[key].safeParse(input[key]);
    return fieldResult.success
      ? (fieldResult.data as PublicEnv[K])
      : buildFallback[key];
  }

  return {
    data: {
      NEXT_PUBLIC_SUPABASE_URL: parseField("NEXT_PUBLIC_SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: parseField(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ),
      NEXT_PUBLIC_APP_URL: parseField("NEXT_PUBLIC_APP_URL"),
      NEXT_PUBLIC_META_PIXEL_ID: parseField("NEXT_PUBLIC_META_PIXEL_ID"),
    },
    fieldErrors: parsed.error.flatten().fieldErrors,
  };
}
