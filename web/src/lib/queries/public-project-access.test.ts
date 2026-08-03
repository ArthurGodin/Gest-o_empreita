import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPublicDirectProjectIdentity,
  resolvePublicProjectAccess,
} from "./public-project-access";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

function query(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue(result);
  return builder;
}

function adminClient({
  quote = { data: null, error: null },
  project = { data: null, error: null },
  identity,
}: {
  quote?: { data: unknown; error: unknown };
  project?: { data: unknown; error: unknown };
  identity?: { data: unknown; error: unknown };
} = {}) {
  const quoteQuery = query(quote);
  const projectQuery = query(project);
  const identityQuery = identity ? query(identity) : projectQuery;
  let projectsCall = 0;

  return {
    from: vi.fn((table: string) => {
      if (table === "quotes") return quoteQuery;
      if (table === "projects") {
        projectsCall += 1;
        return projectsCall === 1 ? projectQuery : identityQuery;
      }
      throw new Error(`unexpected_table:${table}`);
    }),
  };
}

function token(seed: string) {
  return seed.padEnd(43, "x");
}

describe("resolvePublicProjectAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not query the database for malformed tokens", async () => {
    await expect(resolvePublicProjectAccess("short")).resolves.toBeNull();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("accepts only approved proposal tokens", async () => {
    mocks.createAdminClient.mockReturnValue(
      adminClient({
        quote: {
          data: { project_id: "project-quote", status: "approved" },
          error: null,
        },
      }),
    );

    await expect(resolvePublicProjectAccess(token("approved"))).resolves.toEqual({
      projectId: "project-quote",
      kind: "quote",
    });
  });

  it("accepts only direct project tokens", async () => {
    mocks.createAdminClient.mockReturnValue(
      adminClient({
        project: {
          data: { id: "project-direct", creation_source: "direct" },
          error: null,
        },
      }),
    );

    await expect(resolvePublicProjectAccess(token("direct"))).resolves.toEqual({
      projectId: "project-direct",
      kind: "project",
    });
  });

  it("fails closed if the same token resolves through both paths", async () => {
    mocks.createAdminClient.mockReturnValue(
      adminClient({
        quote: {
          data: { project_id: "project-quote", status: "approved" },
          error: null,
        },
        project: {
          data: { id: "project-direct", creation_source: "direct" },
          error: null,
        },
      }),
    );

    await expect(resolvePublicProjectAccess(token("collision"))).resolves.toBeNull();
  });

  it("returns only the public identity fields for a direct project", async () => {
    mocks.createAdminClient.mockReturnValue(
      adminClient({
        project: {
          data: { id: "project-direct", creation_source: "direct" },
          error: null,
        },
        identity: {
          data: {
            id: "project-direct",
            name: "Apartamento Leste",
            company: {
              name: "Estúdio Norte",
              logo_url: null,
              business_segment: "interiors",
            },
          },
          error: null,
        },
      }),
    );

    await expect(
      getPublicDirectProjectIdentity(token("identity")),
    ).resolves.toEqual({
      projectId: "project-direct",
      projectName: "Apartamento Leste",
      companyName: "Estúdio Norte",
      companyLogoUrl: null,
      businessSegment: "interiors",
    });
  });
});
