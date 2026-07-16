import { describe, expect, it } from "vitest";
import {
  countProjectsByStatus,
  filterProjects,
  parseProjectListStatusFilter,
  type ProjectListFilterItem,
} from "./project-list-filter";

const projects = [
  project("Reforma da cozinha", "in_progress", "Jo\u00e3o Lima"),
  project("Cobertura colonial", "planning", "Maria Santos"),
  project("Pintura externa", "paused", "Construtora Horizonte"),
  project("Calhas e rufos", "completed", "Jo\u00e3o Lima"),
] satisfies ProjectListFilterItem[];

describe("project list filter", () => {
  it("filters by status", () => {
    expect(filterProjects(projects, { status: "paused", query: "" })).toEqual([
      projects[2],
    ]);
  });

  it("combines text and status filters", () => {
    expect(
      filterProjects(projects, { status: "completed", query: "joao" }),
    ).toEqual([projects[3]]);
  });

  it("finds names regardless of accents", () => {
    expect(
      filterProjects(projects, { status: "all", query: "Joao" }).map(
        (item) => item.name,
      ),
    ).toEqual(["Reforma da cozinha", "Calhas e rufos"]);
  });

  it("counts every status from the source list", () => {
    expect(countProjectsByStatus(projects)).toMatchObject({
      all: 4,
      planning: 1,
      in_progress: 1,
      paused: 1,
      completed: 1,
      cancelled: 0,
    });
  });

  it("sanitizes unknown URL status values", () => {
    expect(parseProjectListStatusFilter("planning")).toBe("planning");
    expect(parseProjectListStatusFilter("anything")).toBe("all");
    expect(parseProjectListStatusFilter(null)).toBe("all");
  });
});

function project(
  name: string,
  status: ProjectListFilterItem["status"],
  customerName: string,
): ProjectListFilterItem {
  return { name, status, customer: { name: customerName } };
}
