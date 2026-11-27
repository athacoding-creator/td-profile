import { describe, expect, it } from "vitest";
import { buildAttendancePointSummary } from "./pointSummary";

describe("attendance point summary", () => {
  it("sums selected-program points separately from total points", () => {
    const rows = buildAttendancePointSummary(
      [
        { user_id: "ahmad", event_id: "ngaji-1", points_awarded: 10, profiles: { full_name: "Ahmad" } },
        { user_id: "ahmad", event_id: "amida-1", points_awarded: 20, profiles: { full_name: "Ahmad" } },
        { user_id: "siti", event_id: "amida-1", points_awarded: 20, profiles: { full_name: "Siti" } },
      ],
      new Map([
        ["ngaji-1", "ngaji"],
        ["amida-1", "amida"],
      ]),
      "ngaji",
    );

    expect(rows).toEqual([
      {
        userId: "ahmad",
        username: "Ahmad",
        programPoints: 10,
        totalPoints: 30,
        programAttendance: 1,
        totalAttendance: 2,
      },
    ]);
  });

  it("ignores attendance records without a user and keeps users sorted by selected points", () => {
    const rows = buildAttendancePointSummary(
      [
        { user_id: null, event_id: "ngaji-1", points_awarded: 100 },
        { user_id: "budi", event_id: "ngaji-1", points_awarded: 10, profiles: { full_name: "Budi" } },
        { user_id: "andi", event_id: "ngaji-1", points_awarded: 20, profiles: { full_name: "Andi" } },
      ],
      new Map([["ngaji-1", "ngaji"]]),
      "ngaji",
    );

    expect(rows.map((row) => row.username)).toEqual(["Andi", "Budi"]);
  });

  it("returns every user's total points when no program is selected", () => {
    const rows = buildAttendancePointSummary(
      [
        { user_id: "ahmad", event_id: "ngaji-1", points_awarded: 10, profiles: { full_name: "Ahmad" } },
        { user_id: "ahmad", event_id: "amida-1", points_awarded: 20, profiles: { full_name: "Ahmad" } },
        { user_id: "siti", event_id: "amida-1", points_awarded: 15, profiles: { full_name: "Siti" } },
      ],
      new Map([
        ["ngaji-1", "ngaji"],
        ["amida-1", "amida"],
      ]),
      "",
    );

    expect(rows.map((row) => [row.username, row.totalPoints])).toEqual([["Ahmad", 30], ["Siti", 15]]);
  });
});
