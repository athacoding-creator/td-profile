import { describe, expect, it } from "vitest";
import { getCurriculumProgramIds, isCurriculumEvent } from "./classListing";

describe("curriculum class listing", () => {
  it("includes episode programs and excludes single-session programs", () => {
    expect(
      getCurriculumProgramIds([
        { id: "curriculum", category: "episode" },
        { id: "regular", category: "single" },
      ]),
    ).toEqual(["curriculum"]);
  });

  it("includes a curriculum event even when its event type is Kajian", () => {
    expect(isCurriculumEvent({ program_id: "curriculum" }, new Set(["curriculum"]))).toBe(true);
    expect(isCurriculumEvent({ program_id: "regular" }, new Set(["curriculum"]))).toBe(false);
    expect(isCurriculumEvent({ program_id: null }, new Set(["curriculum"]))).toBe(false);
  });
});