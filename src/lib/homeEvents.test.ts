import { describe, expect, it } from "vitest";
import { sortHomeEvents } from "./homeEvents";

describe("home event ordering", () => {
  const now = new Date("2026-11-27T12:00:00.000Z");

  it("shows the nearest upcoming events before events that already started", () => {
    const events = [
      { id: "past-old", starts_at: "2026-11-25T12:00:00.000Z" },
      { id: "upcoming-later", starts_at: "2026-11-30T12:00:00.000Z" },
      { id: "past-recent", starts_at: "2026-11-27T08:00:00.000Z" },
      { id: "upcoming-nearest", starts_at: "2026-11-28T12:00:00.000Z" },
    ];

    expect(sortHomeEvents(events, now).map((event) => event.id)).toEqual([
      "upcoming-nearest",
      "upcoming-later",
      "past-recent",
      "past-old",
    ]);
  });

  it("does not let pinned or source-array order override the time order", () => {
    const events = [
      { id: "later", starts_at: "2026-11-30T12:00:00.000Z", is_pinned: true },
      { id: "nearest", starts_at: "2026-11-28T12:00:00.000Z", is_pinned: false },
    ];

    expect(sortHomeEvents(events, now).map((event) => event.id)).toEqual(["nearest", "later"]);
  });
});
