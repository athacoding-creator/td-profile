export type AttendanceEventRecord = {
  event_id: string;
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
  events: { id: string; title: string }[],
) {
  const eventNames = new Map(events.map((event) => [event.id, event.title]));

  return filterAttendanceByEvent(attendance, eventId).map((record, index) => ({
    record,
    number: index + 1,
    eventName: eventNames.get(record.event_id) ?? "-",
  }));
}