import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  signedDiaryPhotoUrl: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/supabase/storage", () => ({
  signedDiaryPhotoUrl: mocks.signedDiaryPhotoUrl,
}));

const PHOTO_ID = "10000000-0000-4000-8000-000000000001";
const PROJECT_ID = "20000000-0000-4000-8000-000000000002";
const VALID_TOKEN = "a".repeat(43);

interface QuoteResult {
  data:
    | Array<{
        share_token: string | null;
        status: string;
      }>
    | null;
  error: unknown;
}

function adminClient({
  photo = {
    data: {
      storage_path: `${PROJECT_ID}/diary/photo.webp`,
      project_id: PROJECT_ID,
    },
    error: null,
  },
  quotes = {
    data: [{ share_token: VALID_TOKEN, status: "approved" }],
    error: null,
  } as QuoteResult,
}: {
  photo?: {
    data: { storage_path: string; project_id: string } | null;
    error: unknown;
  };
  quotes?: QuoteResult;
} = {}) {
  const photoMaybeSingle = vi.fn().mockResolvedValue(photo);
  const photoQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: photoMaybeSingle,
  };
  photoQuery.select.mockReturnValue(photoQuery);
  photoQuery.eq.mockReturnValue(photoQuery);

  const quotesFinal = Promise.resolve(quotes);
  const quoteQuery = {
    select: vi.fn(),
    eq: vi.fn(),
  };
  quoteQuery.select.mockReturnValue(quoteQuery);
  quoteQuery.eq
    .mockReturnValueOnce(quoteQuery)
    .mockReturnValueOnce(quotesFinal);

  const from = vi.fn((table: string) => {
    if (table === "diary_photos") return photoQuery;
    if (table === "quotes") return quoteQuery;
    throw new Error(`unexpected_table:${table}`);
  });

  return { client: { from }, photoQuery, quoteQuery };
}

async function request(token = VALID_TOKEN, id = PHOTO_ID) {
  return GET(new Request("https://prumo.test"), {
    params: Promise.resolve({ token, id }),
  });
}

describe("public diary photo route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signedDiaryPhotoUrl.mockResolvedValue({
      ok: true,
      url: "https://storage.test/signed-photo",
    });
  });

  it("redirects an approved proposal to a short-lived signed photo", async () => {
    const admin = adminClient();
    mocks.createAdminClient.mockReturnValue(admin.client);

    const response = await request();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://storage.test/signed-photo",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(admin.quoteQuery.eq).toHaveBeenNthCalledWith(
      2,
      "status",
      "approved",
    );
    expect(mocks.signedDiaryPhotoUrl).toHaveBeenCalledWith(
      `${PROJECT_ID}/diary/photo.webp`,
      300,
    );
  });

  it("accepts the matching approved token among multiple proposals", async () => {
    const admin = adminClient({
      quotes: {
        data: [
          { share_token: "b".repeat(43), status: "approved" },
          { share_token: VALID_TOKEN, status: "approved" },
        ],
        error: null,
      },
    });
    mocks.createAdminClient.mockReturnValue(admin.client);

    await expect(request()).resolves.toMatchObject({ status: 307 });
  });

  it.each([
    {
      name: "token incorreto",
      quotes: {
        data: [{ share_token: "b".repeat(43), status: "approved" }],
        error: null,
      },
    },
    {
      name: "proposta fora do estado publico",
      quotes: {
        data: [{ share_token: VALID_TOKEN, status: "sent" }],
        error: null,
      },
    },
    {
      name: "erro ao consultar propostas",
      quotes: { data: null, error: { code: "database_error" } },
    },
  ])("returns a uniform 404 for $name", async ({ quotes }) => {
    const admin = adminClient({ quotes });
    mocks.createAdminClient.mockReturnValue(admin.client);

    const response = await request();

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("not found");
    expect(mocks.signedDiaryPhotoUrl).not.toHaveBeenCalled();
  });

  it("returns the same 404 when the photo or signed file is absent", async () => {
    const missingPhoto = adminClient({
      photo: { data: null, error: null },
    });
    mocks.createAdminClient.mockReturnValueOnce(missingPhoto.client);

    const photoResponse = await request();
    expect(photoResponse.status).toBe(404);

    const missingFile = adminClient();
    mocks.createAdminClient.mockReturnValueOnce(missingFile.client);
    mocks.signedDiaryPhotoUrl.mockResolvedValueOnce({
      ok: false,
      error: "not_found",
    });

    const fileResponse = await request();
    expect(fileResponse.status).toBe(404);
  });

  it("rejects malformed identifiers before touching the database", async () => {
    const response = await request("unsafe token", "not-a-uuid");

    expect(response.status).toBe(404);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });
});
