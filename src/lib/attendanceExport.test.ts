import { describe, expect, it } from "vitest";
import { filterAttendanceByEvent } from "./attendanceExport";

describe("attendance export event selection", () => {
  it("exports only attendees belonging to the selected event", () => {
    const attendees = [
      { id: "a1", event_id: "event-1" },
      { id: "a2", event_id: "event-2" },
      { id: "a3", event_id: "event-1" },
    ];

    expect(filterAttendanceByEvent(attendees, "event-1")).toEqual([
      { id: "a1", event_id: "event-1" },
      { id: "a3", event_id: "event-1" },
    ]);
  });

  it("keeps all attendees when no event is selected", () => {
    const attendees = [{ id: "a1", event_id: "event-1" }, { id: "a2", event_id: "event-2" }];
    expect(filterAttendanceByEvent(attendees, "")).toEqual(attendees);
  });
});