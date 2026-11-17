import { describe, expect, it } from "vitest";
import {
  filterAttendanceByEvent,
  prepareAttendanceExport,
  prepareAttendanceExportByProgram,
} from "./attendanceExport";

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

  it("keeps the selected event name on every exported attendance row", () => {
    const attendees = [
      { id: "a1", event_id: "event-1" },
      { id: "a2", event_id: "event-2" },
    ];

    expect(prepareAttendanceExport(attendees, "event-2", [
      { id: "event-1", title: "Kajian A" },
      { id: "event-2", title: "Kajian B" },
    ])).toEqual([
      { record: { id: "a2", event_id: "event-2" }, number: 1, eventName: "Kajian B" },
    ]);
  });

  it("does not prepare an all-events download without a selected event", () => {
    const attendees = [{ id: "a1", event_id: "event-1" }];
    expect(prepareAttendanceExport(attendees, "", [{ id: "event-1", title: "Kajian A" }])).toEqual([]);
  });

  it("exports every attendance row from all events in the selected program", () => {
    const attendees = [
      { id: "a1", event_id: "event-1" },
      { id: "a2", event_id: "event-2" },
      { id: "a3", event_id: "event-3" },
    ];

    expect(prepareAttendanceExportByProgram(attendees, "program-ngaji", [
      { id: "event-1", title: "Ngaji Asyik #1", program_id: "program-ngaji" },
      { id: "event-2", title: "Ngaji Asyik #2", program_id: "program-ngaji" },
      { id: "event-3", title: "AMIDA #1", program_id: "program-amida" },
    ])).toEqual([
      { record: { id: "a1", event_id: "event-1" }, number: 1, eventName: "Ngaji Asyik #1" },
      { record: { id: "a2", event_id: "event-2" }, number: 2, eventName: "Ngaji Asyik #2" },
    ]);
  });
});
