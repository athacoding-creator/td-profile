export type AttendancePointRecord = {
  user_id?: string | null;
  event_id: string;
  points_awarded?: number | null;
  profiles?: { full_name?: string | null } | null;
};

export type AttendancePointSummary = {
  userId: string;
  username: string;
  programPoints: number;
  totalPoints: number;
  programAttendance: number;
  totalAttendance: number;
};

export function buildAttendancePointSummary(
  records: readonly AttendancePointRecord[],
  eventProgramById: ReadonlyMap<string, string | null | undefined>,
  selectedProgramId: string,
): AttendancePointSummary[] {
  const summaries = new Map<string, AttendancePointSummary>();

  for (const record of records) {
    if (!record.user_id) continue;

    const existing = summaries.get(record.user_id) ?? {
      userId: record.user_id,
      username: record.profiles?.full_name?.trim() || record.user_id.slice(0, 8),
      programPoints: 0,
      totalPoints: 0,
      programAttendance: 0,
      totalAttendance: 0,
    };
    const points = Number(record.points_awarded ?? 0);
    const isSelectedProgram = Boolean(selectedProgramId) && eventProgramById.get(record.event_id) === selectedProgramId;

    existing.totalPoints += points;
    existing.totalAttendance += 1;
    if (isSelectedProgram) {
      existing.programPoints += points;
      existing.programAttendance += 1;
    }
    summaries.set(record.user_id, existing);
  }

  return [...summaries.values()]
    .filter((summary) => selectedProgramId ? summary.programAttendance > 0 : summary.totalAttendance > 0)
    .sort((a, b) =>
      (selectedProgramId ? b.programPoints - a.programPoints : b.totalPoints - a.totalPoints) ||
      b.totalPoints - a.totalPoints ||
      a.username.localeCompare(b.username, "id"),
    );
}
