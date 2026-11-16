export type AttendanceEventRecord = {
  event_id: string;
};

export function filterAttendanceByEvent<T extends AttendanceEventRecord>(
  attendance: T[],
  eventId: string,
) {
  return eventId ? attendance.filter((record) => record.event_id === eventId) : attendance;
}