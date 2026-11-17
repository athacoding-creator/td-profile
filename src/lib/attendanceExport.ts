export type AttendanceEventRecord = {
  event_id: string;
};

export type AttendanceExportEvent = {
  id: string;
  title: string;
  program_id?: string | null;
};

export function filterAttendanceByEvent<T extends AttendanceEventRecord>(
  attendance: T[],
  eventId: string,
) {
  return eventId ? attendance.filter((record) => record.event_id === eventId) : attendance;
}

export function prepareAttendanceExport<T extends AttendanceEventRecord>(
  attendance: T[],
  eventId: string,
  events: AttendanceExportEvent[],
) {
  if (!eventId) return [];

  const eventNames = new Map(events.map((event) => [event.id, event.title]));

  return filterAttendanceByEvent(attendance, eventId).map((record, index) => ({
    record,
    number: index + 1,
    eventName: eventNames.get(record.event_id) ?? "-",
  }));
}

export function prepareAttendanceExportByProgram<T extends AttendanceEventRecord>(
  attendance: T[],
  programId: string,
  events: AttendanceExportEvent[],
) {
  if (!programId) return [];

  const eventIds = new Set(
    events.filter((event) => event.program_id === programId).map((event) => event.id),
  );
  const eventNames = new Map(events.map((event) => [event.id, event.title]));

  return attendance
    .filter((record) => eventIds.has(record.event_id))
    .map((record, index) => ({
      record,
      number: index + 1,
      eventName: eventNames.get(record.event_id) ?? "-",
    }));
}
